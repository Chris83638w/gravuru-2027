import fs from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {prepareThemeCart} from './theme-cart.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createAppProxyVerifier} from './shopify-app-proxy.mjs';
import {createShopEntrySessions} from './shop-entry-session.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {loadCartRevision,loadCartRevisionPhoto} from './cart-edit-revision.mjs';
import {CART_CONFIG_ID,CART_LINE_ID} from './cart-configuration.mjs';
import {PAUSED_MESSAGE} from './konfi-status.mjs';

// Öffentlicher Kundeneinstieg „Jetzt personalisieren“ (SHOP-ENTRY.txt). Shopify ruft über den App-Proxy
// `GET <proxyPath>/start?product=&variant=…&signature=…` auf; die Zuordnung läuft ausschließlich über die
// Binding-Registry {shopifyProductId, shopifyVariantId} (genau ein Treffer über alle Stores). Der Kunde
// bekommt eine kurzlebige signierte Sitzung und die Editorseite auf dem App-Host. Alle API-Routen hier
// lesen nur das gebundene Produkt und schreiben nur private Entwürfe/Prüfstände und den Storefront-
// Warenkorb des vorhandenen Pfads (bound-test-cart → draft-cart-handoff). Keine Händleranmeldung,
// keine Produktaufzählung, keine Preise aus dem Browser, keine Fertigungsfreigabe.
const API='/api/shop-entry/';
const PAGE_FILES=['shop-entry-page.mjs','shop-entry-client.mjs'];
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const gid=(value,kind)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/[1-9][0-9]{0,19}$').test(value);
const optionKey=o=>JSON.stringify(Object.entries(o||{}).sort());
const NOT_BOUND='Dieses Produkt ist noch nicht für den Konfigurator eingerichtet.';
const ERROR_STATUSES=[400,401,403,404,405,409,413,415,422,423,429,502,503];
const headersFor=(type,extra={})=>({'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive',...extra});
const json=(res,status,value)=>{const bytes=Buffer.from(JSON.stringify(value));res.writeHead(status,headersFor('application/json; charset=utf-8',{'Content-Length':bytes.length}));res.end(bytes);};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PAGE_CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const ui=name=>new URL('./ui/'+name,import.meta.url);

async function body(req,limit){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||req.headers['content-encoding']!==undefined)fail(415,'shop_entry_json','Bitte eine gültige Anfrage senden.');
 const declared=req.headers['content-length'];
 if(declared!==undefined&&(!/^[0-9]+$/.test(declared)||Number(declared)>limit))fail(413,'shop_entry_size','Diese Anfrage ist zu groß.');
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>limit)fail(413,'shop_entry_size','Diese Anfrage ist zu groß.');chunks.push(chunk);}
 try{const data=JSON.parse(Buffer.concat(chunks));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{fail(400,'shop_entry_json','Die Anfrage ist ungültig.');}
}
function simplePage(title,text,{link}={}){
 return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+esc(title)+'</title>'+(link?'<meta http-equiv="refresh" content="0;url='+esc(link)+'">':'')+'<style>body{margin:0;padding:32px 20px;font:16px/1.5 system-ui,sans-serif;color:#243238;background:#fff}main{max-width:560px;margin:0 auto}h1{font-size:20px}a{color:#086354}</style></head><body><main><h1>'+esc(title)+'</h1><p>'+esc(text)+'</p>'+(link?'<p><a href="'+esc(link)+'">Weiter zum Konfigurator</a></p>':'')+'</main></body></html>';
}
// Begrenzung je Fenster (eine Minute). Nur Zählung im Speicher; kein Protokoll von Kunden- oder Adressdaten.
function createWindowLimiter(perMinute,clock){
 const windows=new Map();
 return key=>{const minute=Math.floor(clock()/60000);if(windows.size>4096)windows.clear();const entry=windows.get(key);if(!entry||entry.minute!==minute){windows.set(key,{minute,count:1});return true;}entry.count++;return entry.count<=perMinute;};
}

export function createShopEntry({origin,shopDomain,secret,stores,proxyPath,pagePath='/konfigurator/shop/',clock=Date.now,ttlMs,maxAgeSeconds=300,limits={}}){
 let address;try{address=new URL(origin);}catch{}
 if(!address||address.origin!==origin||address.protocol!=='https:'||address.username||address.password||!/^[-a-z0-9]+\.myshopify\.com$/.test(shopDomain||'')||typeof secret!=='string'||secret.length<16||!Array.isArray(stores)||!stores.length||stores.length>8||
   typeof proxyPath!=='string'||!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(proxyPath)||typeof pagePath!=='string'||!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/$/.test(pagePath)||pagePath.startsWith('/api/')||proxyPath.startsWith('/api/')||proxyPath+'/'===pagePath)
  fail(503,'shop_entry_config','Der Konfigurator-Einstieg ist nicht eingerichtet.');
 const limit={startPerMinute:120,requestsPerMinute:240,draftBytes:100*1024*1024,cartBytes:16*1024,concurrentReviews:2,maxContexts:1024,contextTtlMs:30*60*1000,...limits};
 for(const [key,value] of Object.entries(limit))if(!Number.isSafeInteger(value)||value<1)fail(503,'shop_entry_config','Der Konfigurator-Einstieg ist nicht eingerichtet.');
 const ids=new Set(),fixed=stores.map(s=>{
  const w=s?.workshop;
  if(!s||!/^[-a-zA-Z0-9_]{1,100}$/.test(s.storeId||'')||ids.has(s.storeId)||typeof s.registry?.resolve!=='function'||typeof s.cart!=='function'||typeof w?.model!=='function'||!w.tenantId||w.sessionContext?.shopDomain!==shopDomain||
    typeof w.repository?.get!=='function'||typeof w.assets?.read!=='function'||typeof w.customerDrafts?.acrylicDrafts?.get!=='function'||typeof w.customerDrafts?.acrylicDrafts?.create!=='function'||typeof w.customerDrafts?.acrylicDrafts?.save!=='function'||typeof w.customerDrafts?.review!=='function'||typeof w.customerDrafts?.cartConfigurations?.forDraft!=='function'||typeof w.orderIntake?.bindings!=='function'||
    !['/_merchant-editor.html','/_merchant-acryl-editor.html'].includes(s.nativeEditorPath))fail(503,'shop_entry_stores','Die privaten Datenbereiche sind nicht eindeutig eingerichtet.');
  ids.add(s.storeId);return Object.freeze({...s});
 });
 const verifyProxy=createAppProxyVerifier({shopDomain,secret,clock,maxAgeSeconds});
 const sessions=createShopEntrySessions({secret,clock,...(ttlMs===undefined?{}:{ttlMs})});
 const startLimiter=createWindowLimiter(limit.startPerMinute,clock),requestLimiter=createWindowLimiter(limit.requestsPerMinute,clock);
 // Seite und Skript sind statische Dateien; nur der konfigurierte Seitenpfad wird eingesetzt.
 const pageHtml=Buffer.from(fs.readFileSync(ui('shop-entry.html'),'utf8').replaceAll('/konfigurator/shop/',pagePath)),pageFiles=new Map(PAGE_FILES.map(name=>[pagePath+name,fs.readFileSync(ui(name))]));
 const cartContexts=new Map(),reviewJobs=new Set(),assetIndex=new Map();
 const startPath=proxyPath+'/start';
 const themeTransfers=new Map(),themePath=proxyPath+'/cart',themeFiles=new Map(['theme-cart-ui.mjs','theme-cart-client.mjs'].map(name=>[proxyPath+'/'+name,fs.readFileSync(ui(name))]));

 function resolve(identity){
  if(!gid(identity.shopifyProductId,'Product')||!gid(identity.shopifyVariantId,'ProductVariant'))fail(422,'shop_entry_ids','Eine eindeutige Shopify-Produkt- und Varianten-ID ist erforderlich.');
  const matches=[];
  for(const store of fixed){
   let binding;try{binding=store.registry.resolve(identity);}catch(error){if(error.code==='shop_binding_active_not_found'&&error.status===404)continue;throw error;}
   if(!binding||binding.storeId!==store.storeId||binding.shopDomain!==shopDomain||binding.tenantId!==store.workshop.tenantId||binding.shopifyProductId!==identity.shopifyProductId||binding.shopifyVariantId!==identity.shopifyVariantId)fail(409,'shop_entry_scope','Die Produktzuordnung passt nicht zum privaten Datenbereich.');
   matches.push({store,binding:structuredClone(binding)});
  }
  if(matches.length!==1)fail(matches.length?409:404,matches.length?'shop_entry_duplicate':'shop_entry_not_bound',matches.length?'Diese Variante ist mehreren Datenbereichen zugeordnet.':NOT_BOUND);
  return matches[0];
 }
 function modelFor(store,binding){
  let model;
  try{model=store.workshop.model(binding.productId,binding.productRevision);}
  catch(error){if(error.status===423)fail(423,'konfi_paused',PAUSED_MESSAGE);throw error;}
  if(!model||model.configuration?.id!==binding.productId||model.configuration?.revision!==binding.productRevision||!['form','acryl'].includes(model.key))fail(409,'shop_entry_model','Das Modell gehört nicht zur festen Produktzuordnung.');
  // Der Formeditor hat eigene Kundenrouten (customer-drafts); er ist im öffentlichen Einstieg noch nicht angebunden.
  if(model.key!=='acryl'||!model.universal)fail(404,'shop_entry_form_pending',NOT_BOUND);
  return model;
 }
 // Sitzung prüfen und die Zuordnung erneut auflösen: eine zwischenzeitlich geänderte aktive Zuordnung
 // oder ein anderer Store beenden die Sitzung (wie `active()` im Händlertest-Gateway).
 function active(req){
  const session=sessions.verify(req.headers['x-gravuru-shop-session']);
  if(!requestLimiter(session.sid))fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');
  const store=fixed.find(s=>s.storeId===session.storeId);if(!store)fail(409,'shop_entry_changed','Die Produktzuordnung wurde geändert. Bitte die Produktseite neu öffnen.');
  const current=resolve({shopifyProductId:session.shopifyProductId,shopifyVariantId:session.shopifyVariantId});
  if(current.store!==store||current.binding.productId!==session.productId||current.binding.productRevision!==session.productRevision||current.binding.bindingId!==session.bindingId||current.binding.assignmentRevision!==session.assignmentRevision)fail(409,'shop_entry_changed','Die Produktzuordnung wurde geändert. Bitte die Produktseite neu öffnen.');
  return {session,store,binding:current.binding};
 }
 // Nur Ressourcen, die das Modell dieses Produktstands selbst nennt (Motivgrafiken, Fotomasken, Beispielfotos).
 function allowedAssets(store,binding,model){
  const key=JSON.stringify([store.storeId,binding.productId,binding.productRevision]);
  let set=assetIndex.get(key);
  if(!set){
   set=new Set();const u=model.universal;
   for(const match of JSON.stringify(u).matchAll(/\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg/g))set.add(match[1]);
   for(const d of u.profile?.designs||[])for(const o of d.objects||[])if(/^[a-f0-9]{64}$/.test(o.photoMaskAssetId||''))set.add(o.photoMaskAssetId);
   for(const item of u.localResources?.photoExamples||[])if(/^[a-f0-9]{64}$/.test(item.assetId||''))set.add(item.assetId);
   if(assetIndex.size>=64)assetIndex.delete(assetIndex.keys().next().value);
   assetIndex.set(key,set);
  }
  return set;
 }
 // Die auf der Produktseite gewählte Variante (Befestigung …) ist beim Öffnen vorausgewählt; Preise und
 // Prüfung bleiben beim unveränderten Servermodell (prepareAcrylicReview lädt es selbst erneut).
 function presentedModel(model,binding){
  const copy=structuredClone(model);
  for(const group of copy.universal.profile?.optionGroups||[]){const chosen=binding.options?.[group.id];if(typeof chosen==='string'&&group.values?.some(v=>v.id===chosen))group.defaultValueId=chosen;}
  return copy;
 }
 function publicBinding(binding){return {shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId,productId:binding.productId,productRevision:binding.productRevision,options:structuredClone(binding.options||{})};}
 function startParams(params){
  const number=(name,kind)=>{const values=params.getAll(name);if(values.length!==1)fail(422,'shop_entry_ids','Eine eindeutige Shopify-Produkt- und Varianten-ID ist erforderlich.');const v=values[0].replace('gid://shopify/'+kind+'/','');if(!/^[1-9][0-9]{0,19}$/.test(v))fail(422,'shop_entry_ids','Eine eindeutige Shopify-Produkt- und Varianten-ID ist erforderlich.');return 'gid://shopify/'+kind+'/'+v;};
  const optional=(name,test)=>{const values=params.getAll(name);if(!values.length||values[0]==='')return null;if(values.length!==1||!test(values[0]))fail(422,'shop_entry_params','Der Bearbeiten-Verweis ist ungültig.');return values[0];};
  const config=optional('config',v=>CART_CONFIG_ID.test(v)),rev=optional('rev',v=>/^[1-9][0-9]{0,8}$/.test(v)),line=optional('line',v=>v.length<=512&&!/[\x00-\x1f\x7f]/.test(v));
  if((config===null)!==(rev===null)||(line!==null&&config===null))fail(422,'shop_entry_params','Der Bearbeiten-Verweis ist ungültig.');
  // Rücksprung nur als Pfad im Shop (keine fremden Adressen): /products/<handle> o. ä.
  const back=optional('back',v=>v.length<=512&&/^\/(?!\/)[A-Za-z0-9/_.~%-]*(?:\?[A-Za-z0-9=&_.~%-]*)?$/.test(v));
  return {shopifyProductId:number('product','Product'),shopifyVariantId:number('variant','ProductVariant'),config,rev,line,back};
 }
 function start(req,res,url){
  if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
  const proxy=verifyProxy(url.searchParams),input=startParams(url.searchParams);
  // Erst nach gültiger App-Proxy-Signatur zählen: unsignierte Direktaufrufe sollen echte Starts nicht sperren (Review 23.10.).
  if(!startLimiter('start'))fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');
  const {store,binding}=resolve({shopifyProductId:input.shopifyProductId,shopifyVariantId:input.shopifyVariantId});
  modelFor(store,binding);
  const issued=sessions.issue(binding,{customerId:proxy.customerId});
  const fragment=new URLSearchParams({s:issued.token});
  if(input.config){fragment.set('config',input.config);fragment.set('rev',input.rev);if(input.line)fragment.set('line',input.line);}
  if(input.back)fragment.set('back',input.back);
  const target=origin+pagePath+'#'+fragment.toString();
  // Shopify reicht die Weiterleitung an den Browser durch; Meta-Refresh und Verweis sind der Rückfall.
  const html=Buffer.from(simplePage('Konfigurator wird geöffnet …','Einen Moment – der Konfigurator wird geöffnet.',{link:target}));
  res.writeHead(302,headersFor('text/html; charset=utf-8',{Location:target,'Content-Length':html.length}));res.end(html);
 }
 async function cart(req,res,context,theme=false){
  const {session,store,binding:selected}=context;
  for(const [key,entry]of cartContexts)if(!entry.busy&&entry.expiresAt<=clock())cartContexts.delete(key);
  let cartContext=cartContexts.get(session.sid);
  if(!cartContext){if(cartContexts.size>=limit.maxContexts)fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');cartContext={cartId:null,operations:new Map(),busy:false,expiresAt:clock()+limit.contextTtlMs};cartContexts.set(session.sid,cartContext);}
  if(cartContext.busy)fail(409,'shop_entry_cart_busy','Die Warenkorbübergabe läuft bereits.');
  // Vor dem Lesen des Bodys beanspruchen: zwei gleichzeitige Klicks dürfen nicht beide passieren.
  cartContext.busy=true;cartContext.expiresAt=clock()+limit.contextTtlMs;
  const controller=new AbortController(),abort=()=>controller.abort();req.once('aborted',abort);res.once('close',abort);
  let usedExisting=null;
  try{
   const data=await body(req,limit.cartBytes),draftToken=req.headers['x-gravuru-draft'];
   const fields=['draftId','expectedRevision','quantity','configId','cartLineId',...(theme?['cartRevision']:[])];
   if(Object.keys(data).some(k=>!fields.includes(k))||!/^adraft_[a-f0-9-]{36}$/.test(data.draftId||'')||!Number.isSafeInteger(data.expectedRevision)||data.expectedRevision<1||!Number.isSafeInteger(data.quantity)||data.quantity<1||data.quantity>99||
     (data.configId!==undefined&&(typeof data.configId!=='string'||!CART_CONFIG_ID.test(data.configId)))||(data.cartLineId!==undefined&&(typeof data.cartLineId!=='string'||!(theme&&data.cartLineId==='theme')&&!CART_LINE_ID.test(data.cartLineId)))||(data.cartLineId!==undefined&&data.configId===undefined)||(data.cartRevision!==undefined&&(!Number.isSafeInteger(data.cartRevision)||data.cartRevision<1||data.configId===undefined))||typeof draftToken!=='string'||!/^[a-f0-9]{64}$/.test(draftToken))fail(422,'shop_entry_cart_fields','Bitte die gesicherte Gestaltung, ihren Stand und die Menge angeben.');
   const drafts=store.workshop.customerDrafts,draft=drafts.acrylicDrafts.get(data.draftId,draftToken);
   if(draft.productId!==session.productId||draft.productRevision!==session.productRevision)fail(409,'shop_entry_product','Die gesicherte Gestaltung gehört nicht zu diesem Produkt.');
   const manifest=drafts.review(draft.snapshotId).manifest,options=manifest.selection?.options;
   if(!options||typeof options!=='object')fail(409,'shop_entry_variant','Die gesicherte Ausführung ist nicht bestätigt.');
   // Die im Editor gewählte Ausführung (z. B. Befestigung) bestimmt die Shopify-Variante – ausschließlich über
   // eine aktive Registry-Zuordnung {dieses Shopify-Produkt, Variante}. Ohne genau einen Treffer kein Warenkorb.
   const candidates=store.workshop.orderIntake.bindings().filter(b=>b.shopDomain===shopDomain&&b.productId===session.productId&&b.productRevision===session.productRevision&&optionKey(b.options)===optionKey(options));
   const bindings=[];
   for(const variantId of new Set(candidates.map(b=>b.variantId))){
    let found;try{found=store.registry.resolve({shopifyProductId:session.shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+variantId});}catch(error){if(error.code==='shop_binding_active_not_found'&&error.status===404)continue;throw error;}
    if(found&&found.storeId===store.storeId&&found.shopDomain===shopDomain&&found.productId===session.productId&&found.productRevision===session.productRevision&&isDeepStrictEqual(found.options??{},options))bindings.push(structuredClone(found));
   }
   if(bindings.length!==1)fail(bindings.length?409:404,bindings.length?'shop_entry_variant_duplicate':'shop_entry_variant_unbound',bindings.length?'Diese Ausführung ist im Shop mehrfach zugeordnet.':'Diese Ausführung ist im Shop noch nicht angebunden. Bitte eine andere Ausführung wählen.');
   const binding=bindings[0];
   if(binding.shopifyVariantId===selected.shopifyVariantId&&!isDeepStrictEqual(binding,selected))fail(409,'shop_entry_changed','Die Produktzuordnung wurde geändert. Bitte die Produktseite neu öffnen.');

   if(theme){
    for(const [token,t] of themeTransfers)if(t.expiresAt<=clock())themeTransfers.delete(token);
    if(themeTransfers.size>=limit.maxContexts)fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');
    const args={workshop:store.workshop,registry:store.registry,shopDomain,proxyPath};
    const prepared=prepareThemeCart(args,binding,data,{draftToken}),token=randomBytes(32).toString('hex');
    themeTransfers.set(token,{args,binding:structuredClone(binding),input:structuredClone(data),draftToken,sessionToken:req.headers['x-gravuru-shop-session'],customerId:session.customerId,expiresAt:clock()+limit.contextTtlMs});
    return json(res,200,{handoffUrl:'https://'+shopDomain+themePath+'#handoff='+token,shopDomain,configuration:prepared.payload.configuration,quantity:prepared.payload.quantity,totalCents:prepared.payload.totalCents,mode:'theme',paymentConfirmed:false,productionReady:false});
   }
   const key=createHash('sha256').update(JSON.stringify([store.storeId,binding.bindingId,binding.assignmentRevision,...fields.map(k=>data[k]??null),draftToken])).digest('hex');
   let operation=cartContext.operations.get(key);
   if(!operation){if(cartContext.operations.size>=256)fail(429,'shop_entry_busy','Bitte den vorhandenen Warenkorb abschließen.');operation={existingCart:!data.cartLineId&&cartContext.cartId?Object.freeze({cartId:cartContext.cartId}):undefined,completed:false};cartContext.operations.set(key,operation);}
   usedExisting=operation.existingCart||null;
   const result=await store.cart(binding,{draftId:data.draftId,expectedRevision:data.expectedRevision,quantity:data.quantity,...(data.configId===undefined?{}:{configId:data.configId}),...(data.cartLineId===undefined?{}:{cartLineId:data.cartLineId})},{draftToken,signal:controller.signal,...(operation.existingCart?{existingCart:operation.existingCart}:{})});
   active(req);
   let checkout;try{checkout=new URL(result.checkoutUrl);}catch{}
   if(typeof result.cartId!=='string'||!result.cartId.startsWith('gid://shopify/Cart/')||result.cartId.length>2048||/[\x00-\x20\x7f]/.test(result.cartId)||!checkout||checkout.protocol!=='https:'||checkout.hostname!==shopDomain||checkout.username||checkout.password||result.paymentConfirmed!==false)fail(503,'shop_entry_cart_result','Der Warenkorb konnte nicht bestätigt werden.');
   if(!operation.completed){cartContext.cartId=result.cartId;operation.completed=true;cartContext.expiresAt=clock()+limit.contextTtlMs;}
   return json(res,200,{cartId:result.cartId,checkoutUrl:checkout.href,lineId:result.lineId,...(result.previousLineId?{previousLineId:result.previousLineId}:{}),configuration:result.configuration,quantity:result.quantity,unitCents:result.unitCents,totalCents:result.totalCents,currency:result.currency,mode:result.mode,duplicate:result.duplicate===true,shopifyVariantId:binding.shopifyVariantId,shopDomain,paymentConfirmed:false,productionReady:false});
  }catch(error){
   // Ein nicht mehr gültiger gemerkter Warenkorb (z. B. bereits bestellt) darf den nächsten Versuch nicht blockieren.
   if(usedExisting&&cartContext.cartId===usedExisting.cartId)cartContext.cartId=null;
   // Ohne Preisvertrag der Bindung weist der Bestelleingang kostenpflichtige Zusätze ab (nichts wird kostenlos
   // durchgereicht); der Kunde bekommt dafür eine verständliche Erklärung statt der internen Meldung.
   if(error.code==='order_intake'&&error.status===422&&/Preisbindung/.test(error.message||''))error.message='Diese Gestaltung enthält kostenpflichtige Zusätze (z. B. weitere Motive oder Fotos), die für dieses Produkt im Shop noch nicht freigeschaltet sind. Bitte die Zusätze entfernen oder den Shop kontaktieren.';
   throw error;
  }finally{cartContext.busy=false;req.removeListener('aborted',abort);res.removeListener('close',abort);}
 }
 async function saveDraft(req,res,context,draftId){
  const {session,store}=context,drafts=store.workshop.customerDrafts,token=req.headers['x-gravuru-draft'];
  if(reviewJobs.size>=limit.concurrentReviews)fail(409,'review_busy','Eine Gestaltung wird gerade gesichert. Bitte kurz warten.');
  const job=Symbol('review');reviewJobs.add(job);
  try{
   const data=await body(req,limit.draftBytes),draft=draftId?drafts.acrylicDrafts.get(draftId,token):null,allowed=draft?['input','expectedRevision']:['input'];
   if(Object.keys(data).some(k=>!allowed.includes(k))||!data.input||typeof data.input!=='object'||Array.isArray(data.input))fail(422,'acrylic_draft_fields','Bitte die vollständige Gestaltung übergeben.');
   if(draft&&data.expectedRevision!==draft.revision)fail(409,'stale_customer_draft','Die Gestaltung wurde inzwischen geändert. Bitte erneut sichern.');
   const input=data.input;
   if(input.productId!==session.productId||input.productRevision!==session.productRevision)fail(409,'shop_entry_product','Die Gestaltung gehört nicht zu diesem Produkt.');
   if(draft&&(input.productId!==draft.productId||input.productRevision!==draft.productRevision||input.designId!==draft.designId))fail(409,'acrylic_draft_identity','Produktstand und Design gehören zu diesem festen Entwurf.');
   const repository=store.workshop.repository,record=repository.get(session.productId,{revision:session.productRevision});
   if(record.status==='archived'||repository.get(record.id).status==='archived')fail(422,'acrylic_required','Dieses Produkt ist nicht mehr verfügbar.');
   const config=modelFor(store,context.binding).universal;
   let bundle;try{bundle=await prepareAcrylicReview({record,config,input,assets:store.workshop.assets});}catch(error){if(error.status===422&&!error.code)error.code='shop_entry_draft';throw error;}
   const saved=draft?drafts.acrylicDrafts.save(draft.id,token,data.expectedRevision,bundle):drafts.acrylicDrafts.create(bundle);
   return json(res,draft?200:201,{...saved,photoHints:bundle.manifest.photoHints||[],photoResolution:(bundle.manifest.photoResolution||[]).map(p=>({objectId:p.objectId,grade:p.grade,effectiveDpi:p.effectiveDpi,targetDpi:p.targetDpi}))});
  }finally{reviewJobs.delete(job);}
 }

 function themeProxy(req,res,url){
  const proxy=verifyProxy(url.searchParams);
  if(!startLimiter('theme'))fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');
  if(url.pathname===themePath){
   if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
   const html=Buffer.from(fs.readFileSync(ui('theme-cart.html'),'utf8').replaceAll('__PROXY_PATH__',esc(proxyPath)));
   res.writeHead(200,headersFor('text/html; charset=utf-8',{'Content-Length':html.length,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.shopify.com; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"}));return res.end(html);
  }
  if(themeFiles.has(url.pathname)){
   if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
   const bytes=themeFiles.get(url.pathname);res.writeHead(200,headersFor('text/javascript; charset=utf-8',{'Content-Length':bytes.length}));return res.end(bytes);
  }
  if(req.headers.origin!==undefined&&req.headers.origin!=='https://'+shopDomain)fail(403,'shop_entry_origin','Diese Anfrage ist nicht zulässig.');
  const token=req.headers['x-gravuru-cart-handoff'],transfer=typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)?themeTransfers.get(token):null;
  if(!transfer||transfer.expiresAt<=clock())fail(403,'theme_cart_expired','Die Warenkorbübergabe ist abgelaufen. Bitte zum Konfigurator zurückkehren und erneut starten.');
  const context=active({headers:{'x-gravuru-shop-session':transfer.sessionToken}});
  if((proxy.customerId??null)!==(context.session.customerId??null))fail(403,'theme_cart_customer','Bitte die Produktseite erneut öffnen.');
  const prepared=prepareThemeCart(transfer.args,transfer.binding,transfer.input,{draftToken:transfer.draftToken});
  if(url.pathname===themePath+'/data'&&req.method==='GET')return json(res,200,prepared.payload);
  if(url.pathname===themePath+'/claim'&&req.method==='POST'){
   if(req.headers.origin!=='https://'+shopDomain)fail(403,'shop_entry_origin','Diese Anfrage ist nicht zulässig.');
   return json(res,200,prepared.claim(token));
  }
  fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
 }
 function checkOrigin(req,{mutating}){
  const requestOrigin=req.headers.origin,site=req.headers['sec-fetch-site'];
  if(mutating?requestOrigin!==origin:requestOrigin!==undefined&&requestOrigin!==origin)fail(403,'shop_entry_origin','Diese Anfrage ist nicht zulässig.');
  if(site!==undefined&&site!=='same-origin')fail(403,'shop_entry_origin','Diese Anfrage ist nicht zulässig.');
 }
 return Object.freeze({
  pagePath,startPath,
  matches:pathname=>pathname===themePath||pathname===themePath+'/data'||pathname===themePath+'/claim'||themeFiles.has(pathname)||pathname===startPath||pathname===pagePath||pageFiles.has(pathname)||pathname.startsWith(API),
  async handle(req,res,url){
   try{
    if(req.headers.host!==address.host||req.headers['x-forwarded-proto']!=='https')fail(403,'shop_entry_host','Diese Anfrage ist nicht zulässig.');
    const pathname=url.pathname;
    if(pathname===startPath)return start(req,res,url);
    if(pathname===themePath||pathname===themePath+'/data'||pathname===themePath+'/claim'||themeFiles.has(pathname))return themeProxy(req,res,url);
    if(pathname===pagePath||pageFiles.has(pathname)){
     if(!['GET','HEAD'].includes(req.method))fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Seite gibt es hier nicht.');
     const script=pageFiles.has(pathname);
     if(script)checkOrigin(req,{mutating:false});
     const bytes=script?pageFiles.get(pathname):pageHtml;
     res.writeHead(200,headersFor(script?'text/javascript; charset=utf-8':'text/html; charset=utf-8',{'Content-Length':bytes.length,'Content-Security-Policy':PAGE_CSP}));return res.end(req.method==='HEAD'?undefined:bytes);
    }
    const action=pathname.slice(API.length);
    if(url.hash)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
    if(action==='model'){
     if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:false});
     const context=active(req),model=modelFor(context.store,context.binding);
     allowedAssets(context.store,context.binding,model);
     return json(res,200,{model:presentedModel(model,context.binding),binding:publicBinding(context.binding),editorPath:context.store.nativeEditorPath,shopDomain,themeCartPath:themePath,expiresAt:context.session.expiresAt,customerId:context.session.customerId,productionReady:false});
    }
    const asset=action.match(/^design-assets\/([a-f0-9]{64})\/preview\.svg$/);
    if(asset){
     if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:false});
     const context=active(req),model=modelFor(context.store,context.binding);
     if(!allowedAssets(context.store,context.binding,model).has(asset[1]))fail(404,'shop_entry_asset','Diese Grafik gehört nicht zu diesem Produkt.');
     let bytes;try{bytes=context.store.workshop.assets.read(asset[1]);}catch{fail(404,'shop_entry_asset','Diese Grafik gehört nicht zu diesem Produkt.');}
     res.writeHead(200,headersFor('image/svg+xml',{'Content-Length':bytes.length,'Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'none'; sandbox"}));return res.end(bytes);
    }
    const revision=action.match(/^cart-configurations\/(konfig_[a-f0-9-]{36})\/([1-9][0-9]{0,8})(?:\/photos\/([A-Za-z0-9_-]{1,100}))?$/);
    if(revision){
     if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search&&url.search!=='?edited=1')fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:false});
     const context=active(req),drafts=context.store.workshop.customerDrafts,access={drafts,configId:revision[1],rev:Number(revision[2]),draftToken:req.headers['x-gravuru-draft']};
     const loaded=loadCartRevision({...access,repository:context.store.workshop.repository});
     if(loaded.draft.productId!==context.session.productId||loaded.draft.productRevision!==context.session.productRevision||loaded.editorKind!=='native')fail(404,'cart_private','Diese Gestaltung gehört nicht zu diesem Produkt.');
     if(!revision[3])return json(res,200,loaded);
     const photo=loadCartRevisionPhoto({...access,uploadId:revision[3],edited:url.searchParams.get('edited')==='1'});
     res.writeHead(200,headersFor(photo.contentType,{'Content-Length':photo.bytes.length,'Content-Security-Policy':"default-src 'none'; sandbox"}));return res.end(photo.bytes);
    }
    const draftRoute=action.match(/^acrylic-drafts(?:\/(adraft_[a-f0-9-]{36}))?$/);
    if(draftRoute){
     if(req.method!=='POST')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:true});
     return await saveDraft(req,res,active(req),draftRoute[1]||null);
    }
    if(action==='cart'||action==='theme-cart'){
     if(req.method!=='POST')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:true});
     return await cart(req,res,active(req),action==='theme-cart');
    }
    fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
   }catch(error){
    const status=ERROR_STATUSES.includes(error.status)?error.status:503,code=/^[a-z][a-z0-9_]{0,70}$/.test(error.code||'')?error.code:'shop_entry_unavailable';
    const message=status>=500?(status===502?'Der Warenkorb konnte nicht bestätigt werden. Bitte noch einmal auf „In den Warenkorb“ klicken.':'Der Konfigurator ist gerade nicht verfügbar. Bitte später erneut versuchen.'):status===401?'Die Anfrage kommt nicht bestätigt aus dem Shop. Bitte die Produktseite neu öffnen.':(typeof error.message==='string'&&error.message?error.message:'Die Anfrage konnte nicht bestätigt werden.');
    if(res.headersSent||res.destroyed)return;
    if(url.pathname===startPath){const html=Buffer.from(simplePage(status===404?'Noch nicht eingerichtet':'Konfigurator nicht verfügbar',message));res.writeHead(status,headersFor('text/html; charset=utf-8',{'Content-Length':html.length}));return res.end(html);}
    json(res,status,{error:{code,message},productionReady:false});
   }
  }
 });
}
