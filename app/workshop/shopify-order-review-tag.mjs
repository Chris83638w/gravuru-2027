// #265 Stufe C, ENTSCHEIDUNGEN 3.51/3.57 (2): „Bitte prüfen“ steht nicht nur in der Werkstatt, sondern auch an der
// Shopify-Bestellung. Kleinster Weg: ein Bestell-Tag über die Admin-API, gesetzt, wenn eine Position der Bestellung
// abgelehnt wurde (z. B. Preisabweichung) oder ihr Ausgabeauftrag fehlgeschlagen ist. Entfernt wird nichts automatisch.
// Das Schreiben braucht die Berechtigung `write_orders` – eine neue App-Version, deren Veröffentlichung Chris gesondert
// freigibt. Diese Einheit ist nur vorbereitet: Ohne Client, ohne diese Berechtigung und ohne die ausdrückliche Einstellung
// `orderReviewTags: true` (configurator-integration.mjs) schreibt sie nichts an Shopify.
// Kein Fehler hier erreicht den Bestelleingang, die Antwort an Shopify oder die Fertigung. Protokolliert wird nur ein
// Ereignis mit Zustand und Kurzgrund – nie Bestellnummer, Kunde, Zugangswert oder eine Antwort von Shopify.
export const ORDER_REVIEW_TAG='Gravuru: bitte prüfen';
const API_VERSION='2026-07',SCOPE='write_orders',RECHECK_MS=10*60*1000;
const SCOPES='query GravuruOrderReviewScopes{currentAppInstallation{accessScopes{handle}}}';
const TAG='mutation GravuruOrderReviewTag($id:ID!,$tags:[String!]!){tagsAdd(id:$id,tags:$tags){node{id} userErrors{field message}}}';
const stop=code=>Object.assign(Error(code),{code});
const defaultLog=entry=>console.warn(JSON.stringify(entry));

// Muster wie shopify-checkout-image.mjs: der Admin-Client wird übergeben ({shopDomain,getAccessToken}, im Test `fetchImpl`).
// Rückgabe: `markOrderForReview({shopDomain,orderId})`, das nie wirft und einen Zustand nennt:
// `off` (kein Client) | `ignored` (fremder Shop, ungültige Kennung) | `no-scope` | `tagged` | `known` | `failed`.
export function createShopifyOrderReviewTags({shopDomain,getAccessToken}={},{fetchImpl=fetch,clock=Date.now,log=defaultLog}={}){
 const configured=typeof shopDomain==='string'&&/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)&&typeof getAccessToken==='function';
 // Je Prozess höchstens ein Tag-Aufruf je Bestellung; gleichzeitige Meldungen derselben Bestellung teilen sich einen Aufruf.
 // Nach einem Neustart setzt eine erneute Meldung denselben Tag noch einmal – bei Shopify bleibt es ein Tag.
 const tagged=new Set(),pending=new Map();let scope=null;
 const note=(state,code)=>{try{log({event:'shopify_order_review_tag',state,...(code?{code}:{})});}catch{/* Protokoll ist nie Voraussetzung. */}};
 async function admin(query,variables){
  let token;try{token=await getAccessToken();}catch{throw stop('access');}
  let response;try{response=await fetchImpl('https://'+shopDomain+'/admin/api/'+API_VERSION+'/graphql.json',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables})});}catch{throw stop('network');}
  if(!response.ok)throw stop('http');
  let data;try{data=await response.json();}catch{throw stop('response');}
  if(data?.errors?.length||!data?.data)throw stop('graphql');
  return data.data;
 }
 // Ohne die Berechtigung wird keine Mutation versucht. Ein Nein gilt zehn Minuten, damit die später freigegebene
 // App-Version ohne weiteren Eingriff wirkt; ein Ja gilt für den Prozess.
 async function allowed(){
  if(scope&&(scope.ok||clock()<scope.until))return scope.ok;
  const data=await admin(SCOPES,{}),ok=Boolean(data.currentAppInstallation?.accessScopes?.some(s=>s?.handle===SCOPE));
  scope={ok,until:clock()+RECHECK_MS};if(!ok)note('no-scope');
  return ok;
 }
 async function tag(id){
  try{
   if(!await allowed())return {state:'no-scope'};
   const gid='gid://shopify/Order/'+id,data=await admin(TAG,{id:gid,tags:[ORDER_REVIEW_TAG]});
   if(data.tagsAdd?.userErrors?.length||data.tagsAdd?.node?.id!==gid)throw stop('rejected');
   if(tagged.size>=2048)tagged.delete(tagged.values().next().value);
   tagged.add(id);note('tagged');return {state:'tagged'};
  }catch(error){
   note('failed',['access','network','http','response','graphql','rejected'].includes(error?.code)?error.code:'unexpected');
   return {state:'failed'};
  }
 }
 return async function markOrderForReview({shopDomain:shop,orderId}={}){
  if(!configured)return {state:'off'};
  const id=typeof orderId==='number'&&Number.isSafeInteger(orderId)?String(orderId):orderId;
  if(shop!==shopDomain||typeof id!=='string'||!/^[1-9][0-9]{0,19}$/.test(id))return {state:'ignored'};
  if(tagged.has(id))return {state:'known'};
  if(!pending.has(id)){
   // Nie im laufenden Aufruf: Der Admin-Abruf beginnt frühestens im nächsten Mikrotask.
   const task=Promise.resolve().then(()=>tag(id)).finally(()=>pending.delete(id));
   pending.set(id,task);
  }
  return pending.get(id);
 };
}

// Verdrahtung je Datenspeicher (configurator-integration.mjs) – nur mit der ausdrücklichen Einstellung, sonst gibt es
// diesen Aufruf nicht. `workshop` ist die Werkstatt des Speichers, `review` die Funktion von oben.
// Gemeldet wird eine Bestellung, wenn
//  (1) der Bestelleingang eine ihrer Positionen abgelehnt hat (`errors`, z. B. Preisabweichung),
//  (2) eine angenommene Position gleich nach dem Eingang „bitte prüfen“ trägt (ihr Ausgabeauftrag ließ sich nicht anlegen),
//  (3) später ein Ausgabeauftrag fehlschlägt und die Position damit „bitte prüfen“ trägt.
// (2) und (3) lesen dasselbe abgeleitete Kennzeichen wie die Bestellansicht (`orderOutputState`, http.mjs); die ältere
// Händler-Laufzeit kennt es nicht und meldet nur (1). Der Bestelleingang selbst, seine Antwort und die Fertigung bleiben
// unverändert: Die Rückgabe von `receive` wird unverändert durchgereicht; ausgewertet und gemeldet wird erst danach
// (`setImmediate`), also nach der Antwort an Shopify bzw. nach dem Schritt des Arbeiters, und jeder Fehler wird verschluckt.
export function connectOrderReview({workshop,review}={}){
 const intake=workshop?.orderIntake;
 if(typeof intake?.receive!=='function'||typeof review!=='function')throw Error('Bestelleingang oder Prüfvermerk fehlt.');
 const mark=row=>{
  try{const pending=review({shopDomain:row?.shopDomain,orderId:row?.orderId});if(typeof pending?.then==='function')pending.then(null,()=>{});}
  catch{/* Eingang, Antwort und Fertigung bleiben unverändert. */}
 };
 const later=fn=>{setImmediate(()=>{try{fn();}catch{/* Nichts davon darf Eingang, Antwort oder Fertigung erreichen. */}});};
 const stateKnown=typeof workshop.orderOutputState==='function';
 // Wie die Bestellansicht (cross-store-orders.mjs): Lässt sich der Stand nicht lesen, gilt „bitte prüfen“.
 const needsReview=line=>{try{return workshop.orderOutputState(line).state==='bitte prüfen';}catch{return true;}};
 if(stateKnown&&typeof workshop.exportJobs?.onFailed==='function'&&typeof intake.forSnapshot==='function'){
  workshop.exportJobs.onFailed(job=>later(()=>{for(const line of intake.forSnapshot(job.snapshotId))if(needsReview(line))mark(line);}));
 }
 // Alle übrigen Methoden bleiben die des Bestelleingangs (Prototyp); nur `receive` meldet zusätzlich.
 const reviewed=Object.create(intake);
 reviewed.receive=(raw,headers,config,routing)=>{
  const result=intake.receive(raw,headers,config,routing);
  // Die Bestellung ist hier bereits festgeschrieben; die Antwort bleibt, wie sie ist.
  later(()=>{
   for(const row of Array.isArray(result?.errors)?result.errors:[])mark(row);
   if(stateKnown)for(const line of Array.isArray(result?.lines)?result.lines:[])if(needsReview(line))mark(line);
  });
  return result;
 };
 return reviewed;
}

// Standardmäßig AUS: Nur `enabled === true` (Einstellung `orderReviewTags: true`) legt Client und Aufsatz an. In jedem anderen
// Fall bekommt die Bestellannahme je Speicher genau den bisherigen Bestelleingang, `client` wird nicht einmal aufgerufen und
// kein Beobachter angemeldet – das Aufspielen des Servers allein schreibt nichts an Shopify.
export function orderReviewIntakes({enabled=false,stores,client,options}={}){
 if(enabled!==true)return stores.map(s=>({storeId:s.storeId,intake:s.workshop.orderIntake}));
 const review=createShopifyOrderReviewTags(client(),options);
 return stores.map(s=>({storeId:s.storeId,intake:connectOrderReview({workshop:s.workshop,review})}));
}
