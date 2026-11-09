import {createCustomerDesignImages} from './customer-design-image.mjs';
import {shopStartModel,isAllSizesFamily} from './shop-start-model.mjs';
import {shopWarmManifest} from './shop-warm-manifest.mjs';
import {createPublicDesignPreviewCache} from './public-design-preview-cache.mjs';
import {createPublicDesignPreviews} from './public-design-previews.mjs';
import fs from 'node:fs';
import {createModelSlimmer,surfaceSwapsFrom,DEFAULT_SURFACE_DIR} from './shop-model-slim.mjs';
import {createHash,randomBytes} from 'node:crypto';
import {prepareThemeCart} from './theme-cart.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createAppProxyVerifier} from './shopify-app-proxy.mjs';
import {createShopEntrySessions} from './shop-entry-session.mjs';
import {createShopDesignGallery} from './shop-design-gallery.mjs';
import {withCustomerReadScope} from './customer-read-scope.mjs';
import {shopGalleryModel} from './shop-gallery-model.mjs';
import {queueGalleryPreview} from './shop-gallery-preview-queue.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {customerVectorLogoPreview,VECTOR_LOGO_REQUEST_BYTES} from './customer-vector-logo-media.mjs';
import {loadCartRevision,loadCartRevisionPhoto} from './cart-edit-revision.mjs';
import {CART_CONFIG_ID,CART_LINE_ID} from './cart-configuration.mjs';
import {PAUSED_MESSAGE} from './konfi-status.mjs';
import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {moduleEnabled} from '../configurator/variant-m/module-profile.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';

// Öffentlicher Kundeneinstieg „Jetzt personalisieren“ (SHOP-ENTRY.txt). Shopify ruft über den App-Proxy
// `GET <proxyPath>/start?product=&variant=…&signature=…` auf; die Zuordnung läuft ausschließlich über die
// Binding-Registry {shopifyProductId, shopifyVariantId} (genau ein Treffer über alle Stores). Der Kunde
// bekommt eine kurzlebige signierte Sitzung und die Editorseite auf dem App-Host. Alle API-Routen hier
// lesen nur das gebundene Produkt und schreiben nur private Entwürfe/Prüfstände und den Storefront-
// Warenkorb des vorhandenen Pfads (bound-test-cart → draft-cart-handoff). Keine Händleranmeldung,
// Galerie nur nach Sitzungsprüfung im selben Datenbereich; keine Preise aus dem Browser, keine Fertigungsfreigabe.
const API='/api/shop-entry/';
const PAGE_FILES=['shop-entry-page.mjs','shop-entry-client.mjs','shop-design-switch.mjs','shop-selection-transfer.mjs','shop-warm.mjs'];
const WARM_RUNTIME={'/_merchant-acryl-editor.html':['/_acryl-runtime/lazy/katalog-kern.json']};
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const gid=(value,kind)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/[1-9][0-9]{0,19}$').test(value);
const GALLERY_OPTIONS=['size','color','mounting'];
const optionKey=o=>JSON.stringify(Object.entries(o||{}).sort());
const NOT_BOUND='Dieses Produkt ist noch nicht für den Konfigurator eingerichtet.';
const ERROR_STATUSES=[400,401,403,404,405,409,413,415,422,423,429,502,503];
const headersFor=(type,extra={})=>({'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive',...extra});
const json=(res,status,value)=>{const bytes=Buffer.from(JSON.stringify(value));res.writeHead(status,headersFor('application/json; charset=utf-8',{'Content-Length':bytes.length}));res.end(bytes);};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Die Kundenseite darf nur im eigenen Shop als Fenster über der Produktseite erscheinen (shop-embed.mjs).
const pageCsp=shopDomain=>"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://"+shopDomain;
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

export function createShopEntry({origin,shopDomain,secret,stores,checkoutImage=null,proxyPath,pagePath='/konfigurator/shop/',clock=Date.now,ttlMs,maxAgeSeconds=300,limits={},modelSlimmer,publicPreviewDirectory=null,publicPreviewPrepare=null,logger=event=>console.warn(JSON.stringify(event))}){
 let address;try{address=new URL(origin);}catch{}
 if(!address||address.origin!==origin||address.protocol!=='https:'||address.username||address.password||!/^[-a-z0-9]+\.myshopify\.com$/.test(shopDomain||'')||typeof secret!=='string'||secret.length<16||!Array.isArray(stores)||!stores.length||stores.length>8||
   typeof proxyPath!=='string'||!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(proxyPath)||typeof pagePath!=='string'||!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/$/.test(pagePath)||pagePath.startsWith('/api/')||proxyPath.startsWith('/api/')||proxyPath+'/'===pagePath)
  fail(503,'shop_entry_config','Der Konfigurator-Einstieg ist nicht eingerichtet.');
 // Starts zählen jetzt auch das Vorladen beim Ansehen einer Produktseite (Konfigurator-Fenster).
 const limit={startPerMinute:600,requestsPerMinute:240,draftBytes:100*1024*1024,cartBytes:16*1024,concurrentReviews:2,maxContexts:1024,contextTtlMs:30*60*1000,...limits};
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
 // Nach dem Öffnen nur den Kernkatalog parallel vorwärmen. Das Editor-HTML lädt
 // ausschließlich die iframe-Navigation, damit der Browser es nicht doppelt abruft.
 const warm=Object.fromEntries(fixed.map(s=>[s.storeId,WARM_RUNTIME[s.nativeEditorPath]||[]]));
 const pageHtml=Buffer.from(fs.readFileSync(ui('shop-entry.html'),'utf8').replaceAll('/konfigurator/shop/',pagePath).replace('<meta name="robots"','<meta name="gravuru-warm" content="'+esc(JSON.stringify(warm))+'">\n  <meta name="robots"')),pageFiles=new Map(PAGE_FILES.map(name=>[pagePath+name,fs.readFileSync(ui(name))]));
 const warmPath=pagePath+'warm/',warmHtml=Buffer.from('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Konfigurator vorbereiten</title></head><body><script type="module" src="'+esc(pagePath)+'shop-warm.mjs"></script></body></html>');
 const cartContexts=new Map(),reviewJobs=new Set(),assetIndex=new Map();
 const startPath=proxyPath+'/start';
 const PAGE_CSP=pageCsp(shopDomain);
 // Shop-seitige Module über den App-Proxy; shop-embed.mjs kennt Konfigurator-Host und Proxy-Pfad fest.
 const customerImages=createCustomerDesignImages({origin,shopDomain,secret,stores:fixed});
 const themeFiles=new Map(['theme-cart-ui.mjs','theme-cart-client.mjs','shop-embed.mjs'].map(name=>[proxyPath+'/'+name,name==='shop-embed.mjs'?Buffer.from(fs.readFileSync(ui(name),'utf8').replaceAll('__EDITOR_ORIGIN__',origin).replaceAll('__PROXY_PATH__',proxyPath)):fs.readFileSync(ui(name))]));
 const themeTransfers=new Map(),themePath=proxyPath+'/cart';

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
 function requireDoorbellApproval(store,binding,config){
  const saved=config??store.workshop.repository.get(binding.productId,{revision:binding.productRevision}).document?.config;
  if(saved?.familyFormats?.source?.shopProduct){
   const approved=store.catalogLiveOrders===true&&store.workshop.orderIntake.catalogLiveApproval?.({shopDomain,shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId,productId:binding.productId,productRevision:binding.productRevision});
   if(!approved)fail(404,'shop_entry_catalog_release',NOT_BOUND);
   return;
  }
  if(!isLayeredDoorbell(saved))return;
  const approved=store.doorbellLiveOrders===true&&typeof store.workshop.orderIntake.doorbellLiveApproval==='function'&&store.workshop.orderIntake.doorbellLiveApproval({shopDomain,shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId,productId:binding.productId,productRevision:binding.productRevision});
  if(!approved||typeof approved.id!=='string'||!approved.id)fail(404,'shop_entry_doorbell_unapproved',NOT_BOUND);
 }
 function modelFor(store,binding){
  let model;
  try{model=store.workshop.model(binding.productId,binding.productRevision);}
  catch(error){if(error.status===423)fail(423,'konfi_paused',PAUSED_MESSAGE);throw error;}
  if(!model||model.configuration?.id!==binding.productId||model.configuration?.revision!==binding.productRevision||!['form','acryl'].includes(model.key))fail(409,'shop_entry_model','Das Modell gehört nicht zur festen Produktzuordnung.');
  // Der Formeditor hat eigene Kundenrouten (customer-drafts); er ist im öffentlichen Einstieg noch nicht angebunden.
  if(model.key!=='acryl'||!model.universal)fail(404,'shop_entry_form_pending',NOT_BOUND);
  requireDoorbellApproval(store,binding,model.universal);
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
  requireDoorbellApproval(store,current.binding);
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
 // Schlankes Kundenmodell (shop-model-slim.mjs): Katalog des ausgelieferten Editors einmal über den eigenen Host laden.
 // Eigene Schriften ohne Designbezug liefert der Shop-Einstieg als inhaltsadressierte Datei (unveränderlich, lange zwischenspeicherbar).
 const fontRoute=new RegExp('^'+pagePath+'schriften/([a-f0-9]{64})\\.json$');
 const previewRoute=new RegExp('^'+pagePath+'vorschauen/([a-f0-9]{64})\\.svg$');
 const slimmer=modelSlimmer===undefined?createModelSlimmer({fetchJson:async p=>{const r=await fetch(origin+p,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('http '+r.status);return r.json();},surfaceSwaps:surfaceSwapsFrom(DEFAULT_SURFACE_DIR),fontUrl:hash=>pagePath+'schriften/'+hash+'.json'}):modelSlimmer;
 function presentedModel(model,binding,store,designId=null){
  if(designId&&!moduleEnabled(model.universal,'designs')){
   const profile=selectedProfile(model.universal,binding.options);
   if(designId!==(profile.defaultDesignId||profile.designs[0]?.id))fail(403,'shop_entry_design_disabled','Die Designauswahl ist bei diesem Produkt ausgeschaltet.');
  }
  const copy=shopStartModel(model,designId,{deferFonts:!!slimmer&&!model.universal.doorbell,options:binding.options});
  // `source`: ausgelagerte Schriften lassen sich nach Verdrängung aus dem gespeicherten Modell nachliefern.
  if(slimmer){if(copy.universal.doorbell&&!slimmer.ready())slimmer.load();slimmer.slim(copy.universal,{deferAll:!copy.universal.doorbell,key:copy.configuration?.id&&copy.configuration?.revision?copy.configuration.id+':'+copy.configuration.revision+':fonts':null,source:()=>modelFor(store,binding).universal?.localResources?.fonts});}
  for(const group of copy.universal.profile?.optionGroups||[]){const chosen=binding.options?.[group.id];if(typeof chosen==='string'&&group.values?.some(v=>v.id===chosen))group.defaultValueId=chosen;}
  return copy;
 }
 function publicBinding(binding){return {shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId,productId:binding.productId,productRevision:binding.productRevision,options:structuredClone(binding.options||{})};}
 function cardFor(store,binding){
  // The separately installed legacy runtime has no galleryModel method yet.
  // Its fixed document can use the same lightweight projection, never model().
  const model=typeof store.workshop.galleryModel==='function'?store.workshop.galleryModel(binding.productId,binding.productRevision):shopGalleryModel(store.workshop.repository.get(binding.productId,{revision:binding.productRevision}));
  if(model?.configuration?.id!==binding.productId||model?.configuration?.revision!==binding.productRevision)fail(409,'shop_entry_model','Das Modell gehört nicht zur festen Produktzuordnung.');
  if(model.key!=='acryl'||!model.universal)fail(404,'shop_entry_form_pending',NOT_BOUND);
  return model;
 }
 function checkGalleryBinding(store,binding,model){
  if(store.workshop.konfis?.paused(binding.productId))fail(423,'konfi_paused',PAUSED_MESSAGE);
  requireDoorbellApproval(store,binding,model.universal);
 }
 async function checkGalleryBindings(store,rows){
  const allowed=new Set(),doorbells=[],paused=new Map();
  for(const row of rows){
   const b=row.binding;if(!paused.has(b.productId))paused.set(b.productId,store.workshop.konfis?.paused(b.productId)===true);
   if(paused.get(b.productId))continue;
   if(isLayeredDoorbell(row.availability.universal)){if(store.doorbellLiveOrders===true)doorbells.push(b);}
   else if(row.availability.universal?.familyFormats?.source?.shopProduct){try{requireDoorbellApproval(store,b,row.availability.universal);allowed.add(b.bindingId);}catch(error){if(![404,409,422,423].includes(error.status))throw error;}}
   else allowed.add(b.bindingId);
  }
  if(doorbells.length){
   const intake=store.workshop.orderIntake;
   if(typeof intake.doorbellGalleryApprovals==='function'){
    const approvals=await intake.doorbellGalleryApprovals(doorbells);
    doorbells.forEach((b,i)=>{if(typeof approvals[i]?.id==='string'&&approvals[i].id)allowed.add(b.bindingId);});
   }else for(const b of doorbells){await new Promise(resolve=>setImmediate(resolve));try{requireDoorbellApproval(store,b,{doorbell:{schema:'gravuru-doorbell/v1'}});allowed.add(b.bindingId);}catch(error){if(![404,409,422,423].includes(error.status))throw error;}}
  }
  return allowed;
 }
 const designGallery=createShopDesignGallery({secret,resolve,modelFor,cardFor,allowedAssets,checkBinding:checkGalleryBinding,checkBindings:checkGalleryBindings,onMeasure:logger,previewUrl:hash=>pagePath+'vorschauen/'+hash+'.svg'});
 const renderPublicTemplate=(context,designId)=>{const fresh=createShopDesignGallery({secret,resolve,modelFor,cardFor,allowedAssets,checkBinding:checkGalleryBinding});const start=fresh.start(context,context.model,designId);return fresh.preview(context,start.target);};
 const publicPreviews=publicPreviewDirectory===null?null:createPublicDesignPreviews({cache:createPublicDesignPreviewCache({directory:publicPreviewDirectory,secret}),resolve,modelFor,checkBinding:checkGalleryBinding,gallery:designGallery,renderTemplate:renderPublicTemplate,previewUrl:hash=>pagePath+'vorschauen/'+hash+'.svg'});
 const preparePublicDesignPreviews=ids=>{if(!publicPreviews)throw Error('Öffentlicher Vorschauspeicher ist nicht eingeschaltet.');return publicPreviews.prepare(ids);};
 if(publicPreviewPrepare!==null&&(!publicPreviews||!publicPreviewPrepare||Object.keys(publicPreviewPrepare).length!==2||!gid(publicPreviewPrepare.shopifyProductId,'Product')||!gid(publicPreviewPrepare.shopifyVariantId,'ProductVariant')))fail(503,'public_preview_config','Vorbereitung benötigt genau ein festes Produkt und eine feste Variante.');
 // Explicit server startup preparation, never a customer HTTP write endpoint.
 const publicPreviewPreparation=publicPreviewPrepare===null?null:new Promise(done=>setImmediate(done)).then(()=>preparePublicDesignPreviews(publicPreviewPrepare)).then(result=>{logger({event:'public_preview_prepared',prepared:result.prepared,bytes:result.items.reduce((n,item)=>n+item.bytes,0)});return result;},error=>{logger({event:'public_preview_prepare_failed',code:error.code||'public_preview_prepare'});return {prepared:0,error:error.code||'public_preview_prepare'};});
 // Warm each configured store after startup without creating a customer session.
 // A transient failure is retried on the next gallery request, never unhandled.
 for(const store of fixed)if(typeof store.registry.listActiveForGallery==='function'){
  designGallery.warm({store,binding:{shopDomain}}).catch(error=>logger({event:'shop_gallery_warm_failed',storeId:store.storeId,code:error.code||'shop_gallery_build'}));
 }
 function startParams(params){
  const number=(name,kind)=>{const values=params.getAll(name);if(values.length!==1)fail(422,'shop_entry_ids','Eine eindeutige Shopify-Produkt- und Varianten-ID ist erforderlich.');const v=values[0].replace('gid://shopify/'+kind+'/','');if(!/^[1-9][0-9]{0,19}$/.test(v))fail(422,'shop_entry_ids','Eine eindeutige Shopify-Produkt- und Varianten-ID ist erforderlich.');return 'gid://shopify/'+kind+'/'+v;};
  const optional=(name,test)=>{const values=params.getAll(name);if(!values.length||values[0]==='')return null;if(values.length!==1||!test(values[0]))fail(422,'shop_entry_params','Der Bearbeiten-Verweis ist ungültig.');return values[0];};
  const config=optional('config',v=>CART_CONFIG_ID.test(v)),rev=optional('rev',v=>/^[1-9][0-9]{0,8}$/.test(v)),line=optional('line',v=>v.length<=512&&!/[\x00-\x1f\x7f]/.test(v));
  if((config===null)!==(rev===null)||(line!==null&&config===null))fail(422,'shop_entry_params','Der Bearbeiten-Verweis ist ungültig.');
  // Rücksprung nur als Pfad im Shop (keine fremden Adressen): /products/<handle> o. ä.
  const back=optional('back',v=>v.length<=512&&/^\/(?!\/)[A-Za-z0-9/_.~%-]*(?:\?[A-Za-z0-9=&_.~%-]*)?$/.test(v));
  const embed=optional('embed',v=>v==='1')==='1',ticket=optional('format',v=>v==='json')==='json';
  const toolbar=params.getAll('leiste'),leiste=toolbar.length===1&&['a','b'].includes(toolbar[0])?toolbar[0]:null;
  const presentations=params.getAll('ui'),presentation=presentations.length===1&&presentations[0]==='prio-r15'?'prio-r15':null;
  return {shopifyProductId:number('product','Product'),shopifyVariantId:number('variant','ProductVariant'),config,rev,line,back,embed,ticket,leiste,presentation};
 }
 function start(req,res,url){
  if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
  const proxy=verifyProxy(url.searchParams),input=startParams(url.searchParams);
  // Erst nach gültiger App-Proxy-Signatur zählen: unsignierte Direktaufrufe sollen echte Starts nicht sperren (Review 23.10.).
  // Startkarte (`format=json`, Vorabruf der Produktseite) zählt getrennt: Seitenaufrufe sperren keine echten Starts.
  if(!startLimiter(input.ticket?'ticket':'start'))fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');
  const {store,binding}=resolve({shopifyProductId:input.shopifyProductId,shopifyVariantId:input.shopifyVariantId});
  const startModel=modelFor(store,binding);
  const issued=sessions.issue(binding,{customerId:proxy.customerId});
  const fragment=new URLSearchParams({s:issued.token});
  if(input.config){fragment.set('config',input.config);fragment.set('rev',input.rev);if(input.line)fragment.set('line',input.line);}
  if(input.back)fragment.set('back',input.back);
  if(input.presentation)fragment.set('ui',input.presentation);
  if(input.embed){fragment.set('embed','1');if(input.leiste)fragment.set('leiste',input.leiste);}
  const target=origin+pagePath+'#'+fragment.toString();
  // Startkarte: dieselbe Zieladresse als JSON; die Produktseite öffnet beim Klick direkt den Konfigurator-Host.
  if(input.ticket){
   let assets=null;
   if(!input.config)try{assets=shopWarmManifest(presentedModel(startModel,binding,store).universal,{editorPath:store.nativeEditorPath,pagePath,previews:publicPreviews?.urls(binding)});}catch{/* Warming is optional; the actual start remains authoritative. */}
   return json(res,200,{url:target,expiresAt:issued.expiresAt,...(assets?{warm:{url:origin+warmPath,manifest:assets}}:{})});
  }
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
   const fields=['draftId','expectedRevision','quantity','configId','cartLineId',...(theme?['cartRevision','presentation']:[])];
   if(Object.keys(data).some(k=>!fields.includes(k))||!/^adraft_[a-f0-9-]{36}$/.test(data.draftId||'')||!Number.isSafeInteger(data.expectedRevision)||data.expectedRevision<1||!Number.isSafeInteger(data.quantity)||data.quantity<1||data.quantity>99||
     (data.presentation!==undefined&&data.presentation!=='prio-r15')||
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
   requireDoorbellApproval(store,binding);
   if(binding.shopifyVariantId===selected.shopifyVariantId&&!isDeepStrictEqual(binding,selected))fail(409,'shop_entry_changed','Die Produktzuordnung wurde geändert. Bitte die Produktseite neu öffnen.');

   if(theme){
    for(const [token,t] of themeTransfers)if(t.expiresAt<=clock())themeTransfers.delete(token);
    if(themeTransfers.size>=limit.maxContexts)fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');
    // Nur Darstellungswahl für den Bearbeiten-Link; kein Teil des Preis-/Gestaltungsstands.
    const {presentation,...themeInput}=data;
    const args={workshop:store.workshop,registry:store.registry,shopDomain,proxyPath,...(presentation?{presentation}:{}),...(typeof store.workshop.orderIntake.imageSnapshot==='function'?{customerImageUrl:id=>customerImages.url(store.storeId,id)}:{})};
    const prepared=prepareThemeCart(args,binding,themeInput,{draftToken}),token=randomBytes(32).toString('hex');
    themeTransfers.set(token,{args,binding:structuredClone(binding),input:structuredClone(themeInput),draftToken,sessionToken:req.headers['x-gravuru-shop-session'],customerId:session.customerId,expiresAt:clock()+limit.contextTtlMs});
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
   // The intake distinguishes missing surcharge support from foreign/stale bindings.
   // Preserve that distinction; a generic price-binding mismatch must not be relabelled as extra motifs.
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

 async function themeProxy(req,res,url){
  const proxy=verifyProxy(url.searchParams);
  // Skriptdateien sind öffentlicher, für alle gleicher Code und werden auf jeder Produktseite geladen:
  // nicht auf das Warenkorb-Limit anrechnen (sonst blockieren Seitenaufrufe zahlende Kunden) und kurz zwischenspeichern.
  if(themeFiles.has(url.pathname)){
   if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
   const bytes=themeFiles.get(url.pathname);res.writeHead(200,headersFor('text/javascript; charset=utf-8',{'Content-Length':bytes.length,'Cache-Control':'public, max-age=300'}));return res.end(bytes);
  }
  if(!startLimiter('theme'))fail(429,'shop_entry_busy','Bitte kurz warten und erneut versuchen.');
  if(url.pathname===themePath){
   if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
   const html=Buffer.from(fs.readFileSync(ui('theme-cart.html'),'utf8').replaceAll('__PROXY_PATH__',esc(proxyPath)));
   res.writeHead(200,headersFor('text/html; charset=utf-8',{'Content-Length':html.length,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.shopify.com; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'"}));return res.end(html);
  }
  if(req.headers.origin!==undefined&&req.headers.origin!=='https://'+shopDomain)fail(403,'shop_entry_origin','Diese Anfrage ist nicht zulässig.');
  const token=req.headers['x-gravuru-cart-handoff'],transfer=typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)?themeTransfers.get(token):null;
  if(!transfer||transfer.expiresAt<=clock())fail(403,'theme_cart_expired','Die Warenkorbübergabe ist abgelaufen. Bitte zum Konfigurator zurückkehren und erneut starten.');
  const context=active({headers:{'x-gravuru-shop-session':transfer.sessionToken}});
  if((proxy.customerId??null)!==(context.session.customerId??null))fail(403,'theme_cart_customer','Bitte die Produktseite erneut öffnen.');
  requireDoorbellApproval(context.store,transfer.binding);
  const prepared=prepareThemeCart(transfer.args,transfer.binding,transfer.input,{draftToken:transfer.draftToken});
  if(url.pathname===themePath+'/data'&&req.method==='GET'){
   if(checkoutImage){
    prepared.payload.properties._gravuru_checkout_image=await checkoutImage(prepared.payload.properties._gravuru_bild);
    active({headers:{'x-gravuru-shop-session':transfer.sessionToken}});prepared.resolve();
   }
   return json(res,200,prepared.payload);
  }
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
  pagePath,startPath,preparePublicDesignPreviews,publicPreviewPreparation,
  matches:pathname=>customerImages.matches(pathname)||fontRoute.test(pathname)||previewRoute.test(pathname)||pathname===themePath||pathname===themePath+'/data'||pathname===themePath+'/claim'||themeFiles.has(pathname)||pathname===startPath||pathname===pagePath||pathname===warmPath||pageFiles.has(pathname)||pathname.startsWith(API),
  handle(req,res,url){
   const read=url.pathname===startPath||previewRoute.test(url.pathname)||['model','design-gallery','design-gallery-preview'].some(action=>url.pathname===API+action);
   return read?withCustomerReadScope(()=>handle(req,res,url)):handle(req,res,url);
  }
 });
 async function handle(req,res,url){
   try{
    if(req.headers.host!==address.host||req.headers['x-forwarded-proto']!=='https')fail(403,'shop_entry_host','Diese Anfrage ist nicht zulässig.');
    if(customerImages.matches(url.pathname)){
     if(!['GET','HEAD'].includes(req.method)||url.search)fail(404,'design_image_not_found','Gestaltungsbild nicht gefunden.');
     const bytes=customerImages.read(url.pathname);res.writeHead(200,headersFor('image/png',{'Content-Length':bytes.length,'Cache-Control':'private, max-age=3600'}));return res.end(req.method==='HEAD'?undefined:bytes);
    }
    const pathname=url.pathname;
    const templatePreview=pathname.match(previewRoute);
    if(templatePreview){
     if(!['GET','HEAD'].includes(req.method)||url.search)fail(404,'shop_entry_route','Diese Vorschau gibt es hier nicht.');
     checkOrigin(req,{mutating:false});const bytes=publicPreviews?publicPreviews.read(templatePreview[1]):designGallery.previewFile(templatePreview[1]);
     if(!bytes)fail(404,'shop_entry_route','Diese Vorschau gibt es hier nicht.');
     res.writeHead(200,headersFor('image/svg+xml',{'Content-Length':bytes.length,'Cache-Control':'public, max-age=31536000, immutable','Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"}));return res.end(req.method==='HEAD'?undefined:bytes);
    }
    if(pathname===startPath)return start(req,res,url);
    if(pathname===themePath||pathname===themePath+'/data'||pathname===themePath+'/claim'||themeFiles.has(pathname))return await themeProxy(req,res,url);
    const fontFile=pathname.match(fontRoute);
    if(fontFile){
     if(!['GET','HEAD'].includes(req.method))fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Datei gibt es hier nicht.');
     checkOrigin(req,{mutating:false});
     const bytes=typeof slimmer?.fontFile==='function'?slimmer.fontFile(fontFile[1]):null;
     if(!bytes)fail(404,'shop_entry_route','Diese Datei gibt es hier nicht.');
     res.writeHead(200,headersFor('application/json; charset=utf-8',{'Content-Length':bytes.length,'Cache-Control':'public, max-age=31536000, immutable'}));return res.end(req.method==='HEAD'?undefined:bytes);
    }
    if(pathname===pagePath||pathname===warmPath||pageFiles.has(pathname)){
     if(!['GET','HEAD'].includes(req.method))fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Seite gibt es hier nicht.');
     const script=pageFiles.has(pathname);
     if(script)checkOrigin(req,{mutating:false});
     const bytes=script?pageFiles.get(pathname):pathname===warmPath?warmHtml:pageHtml;
     res.writeHead(200,headersFor(script?'text/javascript; charset=utf-8':'text/html; charset=utf-8',{'Content-Length':bytes.length,'Content-Security-Policy':PAGE_CSP}));return res.end(req.method==='HEAD'?undefined:bytes);
    }
    const action=pathname.slice(API.length);
    if(url.hash)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
    if(action==='model'){
     if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if([...url.searchParams.keys()].some(k=>k!=='design')||url.searchParams.getAll('design').length>1||(url.searchParams.has('design')&&(!url.searchParams.get('design')||url.searchParams.get('design').length>200)))fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:false});
     const context=active(req),model=modelFor(context.store,context.binding);
     allowedAssets(context.store,context.binding,model);
     const presented=presentedModel(model,context.binding,context.store,url.searchParams.get('design'));
     const designId=presented.universal.profile.defaultDesignId||presented.universal.profile.designs[0]?.id;
     let startPreview=null;
     try{startPreview=designGallery.start(context,model,designId);if(publicPreviews&&startPreview){const {previewUrl:oldPublicUrl,...privateStart}=startPreview;const prepared=publicPreviews.attach({items:[{...publicBinding(context.binding),designId,...privateStart}]}).items[0];startPreview={...privateStart,...(prepared.previewUrl?{previewUrl:prepared.previewUrl}:{})};}}catch{/* Products without a gallery still open normally. */}
     return json(res,200,{model:presented,startPreview,binding:publicBinding(context.binding),editorPath:context.store.nativeEditorPath,shopDomain,themeCartPath:themePath,expiresAt:context.session.expiresAt,customerId:context.session.customerId,productionReady:false});
    }
    if(action==='design-gallery'){
     if(req.method!=='GET')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if([...url.searchParams.keys()].some(k=>!['page','theme',...GALLERY_OPTIONS].includes(k))||['page','theme',...GALLERY_OPTIONS].some(k=>url.searchParams.getAll(k).length>1)||GALLERY_OPTIONS.some(k=>url.searchParams.has(k)&&!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(url.searchParams.get(k)))||!['preferred','all'].includes(url.searchParams.get('theme')||'preferred')||!/^\d{1,5}$/.test(url.searchParams.get('page')||'0'))fail(422,'shop_gallery_page','Diese Seite der Designauswahl gibt es nicht.');
     checkOrigin(req,{mutating:false});const context=active(req),sourceModel=cardFor(context.store,context.binding);checkGalleryBinding(context.store,context.binding,sourceModel);
     // Türschild-Konfi: aktuelle Ausführung aus dem Konfi (Form & Größe, Farbe, Befestigung); nur dort ausgewertet.
     const chosen=GALLERY_OPTIONS.filter(k=>url.searchParams.has(k)),options=chosen.length&&isAllSizesFamily(sourceModel.universal)?Object.fromEntries(chosen.map(k=>[k,url.searchParams.get(k)])):null;
     const result=await designGallery.list(context,{page:Number(url.searchParams.get('page')||0),theme:url.searchParams.get('theme')||'preferred',sourceModel,options});
     return withCustomerReadScope(()=>{active(req);return json(res,200,publicPreviews?publicPreviews.attach(result):result);});
    }
    if(action==='customer-vector-logo/preview'){
     if(req.method!=='POST')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:true});const context=active(req),input=await body(req,VECTOR_LOGO_REQUEST_BYTES);
     if(input.productId!==context.session.productId||input.productRevision!==context.session.productRevision)fail(409,'shop_entry_product','Die Logodatei gehört nicht zu diesem Produktstand.');
     const result=await customerVectorLogoPreview(modelFor(context.store,context.binding).universal,input);active(req);
     return json(res,200,result);
    }
    if(action==='design-gallery-preview'){
     if(req.method!=='POST')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:true});const context=active(req),input=await body(req,8192);
     modelFor(context.store,context.binding);
     if(Object.keys(input).length!==1||typeof input.target!=='string')fail(422,'shop_gallery_fields','Bitte ein Design aus der Auswahl wählen.');
     const bytes=await queueGalleryPreview(()=>withCustomerReadScope(()=>{if(req.aborted||res.destroyed)fail(409,'shop_gallery_cancelled','Vorschau abgebrochen.');const current=active(req);return Buffer.from(designGallery.preview(current,input.target));}));
     res.writeHead(200,headersFor('image/svg+xml',{'Content-Length':bytes.length,'Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"}));return res.end(bytes);
    }
    if(action==='design-switch'){
     if(req.method!=='POST')fail(405,'shop_entry_method','Diese Anfrageart ist nicht verfügbar.');
     if(url.search)fail(404,'shop_entry_route','Diese Funktion ist nicht verfügbar.');
     checkOrigin(req,{mutating:true});const context=active(req),input=await body(req,8192);
     modelFor(context.store,context.binding);
     if(Object.keys(input).length!==1||typeof input.target!=='string')fail(422,'shop_gallery_fields','Bitte ein Design aus der Auswahl wählen.');
     const chosen=designGallery.target(context,input.target),issued=sessions.issue(chosen.binding,{customerId:context.session.customerId,expiresAt:context.session.expiresAt});
     return json(res,200,{token:issued.token,expiresAt:issued.expiresAt,designId:chosen.design.id,binding:publicBinding(chosen.binding),widthMm:chosen.geometry.width,heightMm:chosen.geometry.height,unitCents:chosen.price.unitCents,currency:chosen.price.currency,productionReady:false});
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
    // This code covers invalid/stale contracts as well as unsupported prices. Only
    // order-intake can identify a missing surcharge contract; preserve its message.
    const priceUnconfirmed=status===422&&code==='cart_personalization';
    const message=priceUnconfirmed?'Der Preis dieser Gestaltung konnte nicht bestätigt werden. Bitte öffne das Produkt erneut. Deine Gestaltung bleibt erhalten.':status>=500?(status===502?'Der Warenkorb konnte nicht bestätigt werden. Bitte noch einmal auf „In den Warenkorb“ klicken.':'Der Konfigurator ist gerade nicht verfügbar. Bitte später erneut versuchen.'):status===401?'Die Anfrage kommt nicht bestätigt aus dem Shop. Bitte die Produktseite neu öffnen.':(typeof error.message==='string'&&error.message?error.message:'Die Anfrage konnte nicht bestätigt werden.');
    if(res.headersSent||res.destroyed)return;
    if(url.pathname===startPath){const html=Buffer.from(simplePage(status===404?'Noch nicht eingerichtet':'Konfigurator nicht verfügbar',message));res.writeHead(status,headersFor('text/html; charset=utf-8',{'Content-Length':html.length}));return res.end(html);}
    json(res,status,{error:{code,message},productionReady:false});
   }
  }
}
