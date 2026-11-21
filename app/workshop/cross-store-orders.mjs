// Read-only index over the already scoped stores; actions retain each store's own auth/CSRF.
const stop=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const displayable = row => typeof row.id==='string' && typeof row.product?.name==='string' &&
 typeof row.receivedAt==='string' && Number.isFinite(Date.parse(row.receivedAt)) &&
 (!row.selection || (Array.isArray(row.selection.labels) && row.selection.labels.every(label=>typeof label?.label==='string')));
// #265, ENTSCHEIDUNGEN 3.48/3.51/3.53: Kennzeichen der Fertigungsdatei je Position – „fertig“ | „wird erstellt“ | „bitte prüfen“ mit Grund.
// Es wird bei jedem Lesen aus den vorhandenen Ausgabeaufträgen des Prüfstands abgeleitet und nirgends gespeichert. Eine fertige Datei
// gilt vor einer laufenden, eine laufende vor einer fehlgeschlagenen; `jobId` nennt den Auftrag, der das Kennzeichen bestimmt.
// Ohne Auftrag nennt `missing` den Grund (http.mjs `orderOutputState`).
export function outputStateFromJobs(jobs,missing){
 const first=(...states)=>jobs.find(job=>states.includes(job.status));
 const done=first('completed');if(done)return {state:'fertig',reason:null,jobId:done.id};
 const active=first('queued','running');if(active)return {state:'wird erstellt',reason:null,jobId:active.id};
 const failed=first('failed');
 if(failed)return {state:'bitte prüfen',reason:failed.error||'Die Ausgabe ist fehlgeschlagen.',jobId:failed.id};
 return {state:'bitte prüfen',reason:missing||'Für diese Position gibt es keinen Ausgabeauftrag.',jobId:null};
}
// #265, ENTSCHEIDUNGEN 3.61: Hinweis, solange die zwei Downloads einer Position (PDF und SVG, beide mit Kontur) nicht vorliegen.
// `own` ist der Auftrag der Position mit dem heutigen Rezeptstand, `completed` zählt fertige Ausgaben des Prüfstands. Eine fertige
// Ausgabe ohne Dateinachweis (vor 3.57, oder ein Formprodukt vor 3.61) führt die Dateien nicht; der neue Auftrag entsteht beim
// Öffnen der Ausgaben von selbst – seit 3.61 für jede Produktart, auch für Formprodukte alter Art.
export function missingOrderFilesNote({own=null,completed=0}={}){
 if(['queued','running'].includes(own?.status))return 'PDF und SVG werden für diese Position '+(completed?'neu':'gerade')+' erstellt.';
 if(own?.status==='failed')return 'PDF und SVG ließen sich für diese Position nicht erstellen: '+(own.error||'Die Ausgabe ist fehlgeschlagen.');
 return completed?'Die gespeicherte Ausgabe dieser Position enthält PDF und SVG mit Kontur nicht. Bitte die Ausgabe für diese Position neu erstellen.':null;
}
// Abgelehnte Position (z. B. Preisabweichung): nichts wird automatisch gefertigt; der Grund ist der des Bestelleingangs.
export const rejectedOutputState=row=>({state:'bitte prüfen',reason:row.intakeError||'Die Position wurde nicht übernommen.',jobId:null});
export function crossStoreOrders(stores,{shopDomain,enabled=false}={}){
 const orders=[],errors=[],statuses={},outputStates={};
 for(const store of stores){
  const scope={storeId:store.storeId,apiPrefix:store.apiPrefix,pagePrefix:store.apiPrefix==='/api/workshop/acryl/'?'/werkstatt/acryl/':'/werkstatt/'};
  const intake=store.workshop.orderIntake;
  const onUnreadable=row=>{
   if(row.shopDomain!==shopDomain)return;
   const {orderId,lineId,variantId,quantity}=row;
   const intakeError='Die Position konnte für die Übersicht nicht vollständig gelesen werden.';
   errors.push({...scope,shopDomain,orderId,lineId,variantId,quantity,status:'fehler',overviewReadError:true,intakeError,outputState:rejectedOutputState({intakeError})});
  };
  for(const row of intake.list({onUnreadable})){
   if(row?.shopDomain!==shopDomain)continue;
   let status;
   if(displayable(row)){
    try{status=intake.status(row.id);}catch{/* Keep failures scoped to this position. */}
   }
   if(!status||typeof status!=='object'||Array.isArray(status)){onUnreadable(row);continue;}
   const viewKey=store.storeId+':'+row.id;
   orders.push({...row,...scope,viewKey});
   statuses[viewKey]=status;
   // #265: Die ältere Händler-Laufzeit (22.10.) kennt weder den automatischen Auftrag noch das Kennzeichen; ihre Positionen
   // bleiben ohne Kennzeichen, statt etwas zu behaupten, was dort nicht geschieht. Ein Lesefehler bleibt auf die Position begrenzt.
   if(typeof store.workshop.orderOutputState==='function'){
    try{outputStates[viewKey]=store.workshop.orderOutputState(row);}
    catch{outputStates[viewKey]=outputStateFromJobs([],'Der Stand der Fertigungsdatei konnte nicht gelesen werden.');}
   }
  }
  // The retained October 22 Merchant runtime predates the E3 error list.
  for(const row of intake.errors?.({onUnreadable})??[])if(row.shopDomain===shopDomain)errors.push({...row,...scope,outputState:rejectedOutputState(row)});
 }
 orders.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)||a.viewKey.localeCompare(b.viewKey));
 return {orders,errors,statuses,outputStates,integration:{enabled,mode:'scoped-stores'}};
}
export function createCrossStoreOrders({stores,origin,shopDomain,verifyMerchant,enabled=false}){
 const address=new URL(origin);
 if(!Array.isArray(stores)||!stores.length||stores.length>8||new Set(stores.map(s=>s.storeId)).size!==stores.length||new Set(stores.map(s=>s.apiPrefix)).size!==stores.length||stores.some(s=>!/^[-A-Za-z0-9_]{1,100}$/.test(s.storeId)||!['/api/workshop/','/api/workshop/acryl/'].includes(s.apiPrefix)||s.workshop?.sessionContext?.shopDomain!==shopDomain)||typeof verifyMerchant!=='function')throw Error('Bestellspeicher nicht eindeutig eingerichtet.');
 const pathname='/api/workshop/all-orders';
 return {matches:p=>p===pathname,async handle(req,res,url){
  const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(value));};
  try{
   if(req.method!=='GET')stop(405,'orders_method','Bestellungen hier nur lesen.');
   if(url.pathname!==pathname||url.search)stop(404,'orders_route','Bestellübersicht nicht gefunden.');
   if(req.headers.host!==address.host||req.headers['x-forwarded-proto']!=='https'||(req.headers.origin!==undefined&&req.headers.origin!==origin)||(req.headers['sec-fetch-site']!==undefined&&req.headers['sec-fetch-site']!=='same-origin'))stop(403,'orders_origin','Diese Anfrage ist nicht zulässig.');
   const principal=verifyMerchant(req.headers.authorization,'merchant');
   if(principal?.role!=='merchant'||principal.shopDomain!==shopDomain||!principal.subject)stop(401,'orders_merchant','Bitte bei Shopify anmelden.');
   reply(200,crossStoreOrders(stores,{shopDomain,enabled}));
  }catch(error){reply([401,403,404,405].includes(error.status)?error.status:503,{error:{code:error.code||'orders_unavailable',message:error.status<500?error.message:'Bestellspeicher nicht vollständig erreichbar. Bitte erneut laden.'}});}
 }};
}
