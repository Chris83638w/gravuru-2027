// Read-only index over the already scoped stores; actions retain each store's own auth/CSRF.
const stop=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
export function crossStoreOrders(stores,{shopDomain,enabled=false}={}){
 const orders=[],errors=[],statuses={};
 for(const store of stores){
  const scope={storeId:store.storeId,apiPrefix:store.apiPrefix,pagePrefix:store.apiPrefix==='/api/workshop/acryl/'?'/werkstatt/acryl/':'/werkstatt/'};
  for(const row of store.workshop.orderIntake.list()){
   if(row.shopDomain!==shopDomain)continue;
   const viewKey=store.storeId+':'+row.id;orders.push({...row,...scope,viewKey});statuses[viewKey]=store.workshop.orderIntake.status(row.id);
  }
  for(const row of store.workshop.orderIntake.errors())if(row.shopDomain===shopDomain)errors.push({...row,...scope});
 }
 orders.sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)||a.viewKey.localeCompare(b.viewKey));
 return {orders,errors,statuses,integration:{enabled,mode:'scoped-stores'}};
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
