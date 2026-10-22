import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const BASE='/api/configurator-test/';
const endpoints=new Set(['session','sessions','model','cart']);
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const gid=(value,kind)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/[1-9][0-9]{0,19}$').test(value);
const same=(actual,expected)=>typeof actual==='string'&&/^[a-f0-9]{64}$/.test(actual)&&timingSafeEqual(Buffer.from(actual),Buffer.from(expected));
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive'});res.end(JSON.stringify(value));};
async function body(req){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||req.headers['content-encoding']!==undefined)fail(415,'configurator_json','Bitte eine gültige Anfrage senden.');
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>16384)fail(413,'configurator_size','Diese Anfrage ist zu groß.');chunks.push(chunk);}
 try{const data=JSON.parse(Buffer.concat(chunks));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{fail(400,'configurator_json','Die Anfrage ist ungültig.');}
}

// This is an explicitly enabled TEST route, never anonymous merchant API access.
// Existing scoped instances are supplied by the host: no database constructors,
// product enumeration, prices, file paths or manufacturing approval live here.
export function createConfiguratorTestGateway({mode,origin,shopDomain,verifyMerchant,csrfToken,stores,clock=Date.now,ttlMs=30*60*1000,maxSessions=256}){
 let address;try{address=new URL(origin);}catch{}
 if(mode!=='merchant-test-only'||!address||address.origin!==origin||address.protocol!=='https:'||address.username||address.password||!/^[-a-z0-9]+\.myshopify\.com$/.test(shopDomain||'')||typeof verifyMerchant!=='function'||!/^[a-f0-9]{64}$/.test(csrfToken||'')||!Array.isArray(stores)||!stores.length||stores.length>8||!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>30*60*1000||!Number.isSafeInteger(maxSessions)||maxSessions<1||maxSessions>1024)fail(503,'configurator_config','Die geschützte Testanbindung ist nicht eingerichtet.');
 const ids=new Set(),sessions=new Map(),cartContexts=new Map();
 const fixed=stores.map(s=>{
  if(!s||!/^[-a-zA-Z0-9_]{1,100}$/.test(s.storeId||'')||ids.has(s.storeId)||typeof s.registry?.resolve!=='function'||typeof s.workshop?.model!=='function'||typeof s.cart!=='function'||!s.workshop.tenantId||s.workshop.sessionContext?.shopDomain!==shopDomain||!['/api/workshop/','/api/workshop/acryl/'].includes(s.apiPrefix)||!['/_merchant-editor.html','/_merchant-acryl-editor.html'].includes(s.nativeEditorPath)||!['/_merchant-form-editor.html','/_merchant-acryl-form-editor.html'].includes(s.formEditorPath))fail(503,'configurator_stores','Die privaten Datenbereiche sind nicht eindeutig eingerichtet.');
  ids.add(s.storeId);return Object.freeze({...s});
 });
 function resolve(identity){
  if(!gid(identity.shopifyProductId,'Product')||!gid(identity.shopifyVariantId,'ProductVariant'))fail(422,'configurator_ids','Eine eindeutige Shopify-Produkt- und Varianten-ID ist erforderlich.');
  const matches=[];
  for(const store of fixed){
   let binding;try{binding=store.registry.resolve(identity);}catch(error){if(error.code==='shop_binding_active_not_found'&&error.status===404)continue;throw error;}
   if(!binding||binding.storeId!==store.storeId||binding.shopDomain!==shopDomain||binding.tenantId!==store.workshop.tenantId||binding.shopifyProductId!==identity.shopifyProductId||binding.shopifyVariantId!==identity.shopifyVariantId)fail(409,'configurator_scope','Die Produktzuordnung passt nicht zum privaten Datenbereich.');
   matches.push({store,binding:structuredClone(binding)});
  }
  if(matches.length!==1)fail(matches.length?409:404,matches.length?'configurator_duplicate':'configurator_not_bound',matches.length?'Diese Variante ist mehreren Datenbereichen zugeordnet.':'Diese Variante ist noch nicht eindeutig angebunden.');
  return matches[0];
 }
 function active(token,principal){
  const session=typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)?sessions.get(token):null;
  if(!session||session.expiresAt<=clock()||session.subject!==principal.subject)fail(403,'configurator_session','Die private Konfiguratorsitzung ist abgelaufen. Bitte neu öffnen.');
  const current=resolve({shopifyProductId:session.binding.shopifyProductId,shopifyVariantId:session.binding.shopifyVariantId});
  if(current.store!==session.store||!isDeepStrictEqual(current.binding,session.binding))fail(409,'configurator_changed','Die Produktzuordnung wurde geändert. Bitte neu öffnen.');
  return session;
 }
 function modelFor(store,binding){
  const model=store.workshop.model(binding.productId,binding.productRevision);
  if(!model||model.configuration?.id!==binding.productId||model.configuration?.revision!==binding.productRevision||!['form','acryl'].includes(model.key))fail(409,'configurator_model','Das Modell gehört nicht zur festen Produktzuordnung.');
  return model;
 }
 return {
  matches:path=>path.startsWith(BASE),
  async handle(req,res,url){
   try{
    const action=url.pathname.slice(BASE.length);
    if(!endpoints.has(action)||url.search||url.hash)fail(404,'configurator_route','Diese Testfunktion ist nicht verfügbar.');
    if(req.headers.host!==address.host||req.headers['x-forwarded-proto']!=='https'||(req.method==='GET'?req.headers.origin!==undefined&&req.headers.origin!==origin:req.headers.origin!==origin)||(req.headers['sec-fetch-site']!==undefined&&req.headers['sec-fetch-site']!=='same-origin'))fail(403,'configurator_origin','Diese Anfrage ist nicht zulässig.');
    const principal=verifyMerchant(req.headers.authorization,'merchant');
    if(principal?.role!=='merchant'||principal.shopDomain!==shopDomain||!principal.subject)fail(401,'configurator_merchant','Bitte zuerst bei Shopify anmelden.');
    if(action==='session'&&req.method==='GET')return json(res,200,{csrfToken,mode,publicAccess:false,productionReady:false});
    const allowed=action==='model'?'GET':'POST';
    if(req.method!==allowed)fail(405,'configurator_method','Diese Anfrageart ist nicht verfügbar.');
    if(req.method!=='GET'&&!same(req.headers['x-gravuru-csrf'],csrfToken))fail(403,'configurator_csrf','Bitte die Testansicht erneut öffnen.');
    if(action==='sessions'){
     const data=await body(req);
     if(Object.keys(data).sort().join(',')!=='shopifyProductId,shopifyVariantId')fail(422,'configurator_ids','Nur Shopify-Produkt und Variante angeben.');
     const {store,binding}=resolve(data);
     for(const [token,session]of sessions)if(session.expiresAt<=clock())sessions.delete(token);
     for(const [key,context]of cartContexts)if(!context.busy&&context.expiresAt<=clock())cartContexts.delete(key);
     if(sessions.size>=maxSessions)fail(429,'configurator_busy','Bitte kurz warten und erneut öffnen.');
     const model=modelFor(store,binding),editorKind=model.key==='form'?'form':'native';
     const token=randomBytes(32).toString('hex'),expiresAt=clock()+ttlMs;
     const principalKey=JSON.stringify([shopDomain,principal.subject]);
     let cartContext=cartContexts.get(principalKey);
     if(!cartContext){if(cartContexts.size>=maxSessions)fail(429,'configurator_busy','Bitte kurz warten und erneut öffnen.');cartContext={cartId:null,operations:new Map(),busy:false,expiresAt};cartContexts.set(principalKey,cartContext);}else cartContext.expiresAt=expiresAt;
     sessions.set(token,{store,binding,subject:principal.subject,expiresAt,busy:false,cartContext});
     return json(res,201,{token,expiresAt:new Date(expiresAt).toISOString(),binding,editorKind,apiPrefix:store.apiPrefix,editorPath:editorKind==='form'?store.formEditorPath:store.nativeEditorPath,testOnly:true,publicAccess:false,productionReady:false});
    }
    const session=active(req.headers['x-gravuru-configurator'],principal);
    if(action==='model')return json(res,200,modelFor(session.store,session.binding));
    if(session.busy)fail(409,'configurator_busy','Die Warenkorbübergabe läuft bereits.');
    // Claim before reading an asynchronous body: two arriving POSTs must not
    // both pass the same busy check. A second lock also serializes this buyer's
    // different product sessions that share one private cart context.
    session.busy=true;
    const controller=new AbortController(),abort=()=>controller.abort();req.once('aborted',abort);res.once('close',abort);
    let ownsContext=false;
    try{
     const data=await body(req),context=session.cartContext;
     if(context.busy)fail(409,'configurator_busy','Eine andere Warenkorbübergabe läuft bereits.');
     context.busy=true;ownsContext=true;
     const fields=['draftId','expectedRevision','quantity','configId','cartLineId'];
     if(Object.keys(data).some(k=>!fields.includes(k))||typeof req.headers['x-gravuru-draft']!=='string'||!/^[a-f0-9]{64}$/.test(req.headers['x-gravuru-draft']))fail(422,'configurator_cart_fields','Bitte den privaten Entwurf und seine Revision angeben.');
     const key=createHash('sha256').update(JSON.stringify([session.store.storeId,session.binding.bindingId,session.binding.assignmentRevision,...fields.map(k=>data[k]??null),req.headers['x-gravuru-draft']])).digest('hex');
     let operation=context.operations.get(key);
     if(!operation){if(context.operations.size>=256)fail(429,'configurator_busy','Bitte den vorhandenen Testwarenkorb abschließen.');operation={existingCart:!data.cartLineId&&context.cartId?Object.freeze({cartId:context.cartId}):undefined,completed:false};context.operations.set(key,operation);}
     // Retry preserves the ORIGINAL create/add context. The durable handoff
     // journal remains authoritative; this cache never replays a write itself.
     const result=await session.store.cart(session.binding,data,{draftToken:req.headers['x-gravuru-draft'],signal:controller.signal,...(operation.existingCart?{existingCart:operation.existingCart}:{})});
     active(req.headers['x-gravuru-configurator'],principal);
     if(typeof result.cartId!=='string'||!result.cartId.startsWith('gid://shopify/Cart/')||result.cartId.length>2048||/[\x00-\x20\x7f]/.test(result.cartId))fail(503,'configurator_cart_result','Der Testwarenkorb konnte nicht bestätigt werden.');
     if(!operation.completed){context.cartId=result.cartId;operation.completed=true;context.expiresAt=clock()+ttlMs;}
     return json(res,200,{...result,testOnly:true,productionReady:false});
    }finally{session.busy=false;if(ownsContext)session.cartContext.busy=false;req.removeListener('aborted',abort);res.removeListener('close',abort);}
   }catch(error){
    const status=[400,401,403,404,405,409,413,415,422,429,503].includes(error.status)?error.status:503;
    if(!res.headersSent&&!res.destroyed)json(res,status,{error:{code:/^[a-z][a-z0-9_]{0,70}$/.test(error.code||'')?error.code:'configurator_unavailable',message:status===503?'Die Testanbindung ist gerade nicht verfügbar.':status===401?'Bitte zuerst bei Shopify anmelden.':'Die Anfrage konnte nicht bestätigt werden. Bitte die Testansicht erneut öffnen.'},productionReady:false});
   }
  }
 };
}
