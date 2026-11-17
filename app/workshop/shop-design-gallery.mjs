import {galleryScope,galleryProcess,galleryTargetAllowed} from './shop-gallery-scope.mjs';
import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {selectedProfile,quote} from '../configurator/variant-m/contract.mjs';
import {physicalGeometry} from '../configurator/variant-m/print-geometry.mjs';
import {productPreview} from './product-preview.mjs';
import {gallerySnapshotCodec} from './shop-gallery-snapshot.mjs';
import {isAllSizesFamily,familyFormatOptions} from '../configurator/variant-m/family-formats.mjs';
import {performance} from 'node:perf_hooks';
import {moduleEnabled} from '../configurator/variant-m/module-profile.mjs';
import {designSearchQuery,designSearchMetadata,matchesDesignSearch} from '../configurator/variant-m/design-search.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const unavailable=()=>fail(409,'shop_gallery_changed','Dieses Design ist nicht mehr verfügbar. Bitte die Designauswahl neu öffnen.');
const requireDesignChoice=config=>{if(!moduleEnabled(config,'designs'))fail(403,'shop_gallery_disabled','Die Designauswahl ist bei diesem Produkt ausgeschaltet.');};
const sameBinding=(a,b)=>['storeId','tenantId','shopDomain','shopifyProductId','shopifyVariantId','productId','productRevision','bindingId','assignmentRevision'].every(k=>a[k]===b[k]);
const optionKey=o=>JSON.stringify(Object.entries(o||{}).sort());
const identity=b=>({shopifyProductId:b.shopifyProductId,shopifyVariantId:b.shopifyVariantId});
const fields=['sid','storeId','productId','productRevision','bindingId','assignmentRevision','shopifyProductId','shopifyVariantId','designId','scope','sourceProductId','sourceProductRevision'];
function hasFamilyGallerySource(config){
 const source=config.familyFormats.source;
 return Boolean(source?.lineId&&source.subcategoryId);
}
function sameFamilyGallery(source,target,sourceConfig,targetConfig){
 if(source.shopifyProductId!==target.shopifyProductId||source.productId!==target.productId||
    !isAllSizesFamily(sourceConfig)||!isAllSizesFamily(targetConfig))return false;
 if(source.productRevision===target.productRevision)return true;
 const from=sourceConfig.familyFormats.source,to=targetConfig.familyFormats.source;
 return hasFamilyGallerySource(sourceConfig)&&from.lineId===to.lineId&&from.subcategoryId===to.subcategoryId;
}

// No catalogue imports or approvals happen here. Customer designs are taken
// only from the fixed, already activated product model. Catalogue target
// approval remains the importer's responsibility, just as for normal entry.
export function createShopDesignGallery({secret,resolve,modelFor,cardFor=modelFor,allowedAssets,checkBinding=()=>{},checkBindings,waitMs=4000,onMeasure=()=>{},previewUrl=null}){
 const cache=new Map();
 const searchIndexes=new WeakMap();
 const searchMetadata=(design,config)=>{let index=searchIndexes.get(config);if(!index){index=new Map();searchIndexes.set(config,index);}if(!index.has(design.id))index.set(design.id,designSearchMetadata(design,config));return index.get(design.id);};
 const previews=new Map(),previewFiles=new Map();let previewBytes=0;
 const previewKey=(b,id)=>JSON.stringify([b.storeId,b.tenantId,b.productId,b.productRevision,b.options,id]);
 const cachedPreview=(b,id)=>previews.get(previewKey(b,id));
 const snapshots=gallerySnapshotCodec(secret);
 const measure=(context,event,values={})=>{try{onMeasure({event,storeId:context.store.storeId,...values});}catch{}};
 const key=createHmac('sha256',secret).update('gravuru-shop-design-target/v1').digest();
 const sign=s=>createHmac('sha256',key).update(s).digest('base64url');
 const issue=(context,binding,designId,scope)=>{
  const extra={sid:context.session.sid,designId,scope,sourceProductId:context.binding.productId,sourceProductRevision:context.binding.productRevision};
  const data=Object.fromEntries(fields.map(k=>[k,Object.hasOwn(extra,k)?extra[k]:binding[k]]));
  const text=Buffer.from(JSON.stringify(data)).toString('base64url');return 'sgt1.'+text+'.'+sign(text);
 };
 function checkScope(context,binding){
  if(binding.storeId!==context.store.storeId||binding.tenantId!==context.store.workshop.tenantId||binding.shopDomain!==context.binding.shopDomain)unavailable();
 }
 function selection(binding,model,designId,prepared){
  const config=model.universal,profile=prepared?.profile??selectedProfile(config,binding.options),design=profile.designs.find(d=>d.id===designId);
  if(!design||design.hidden===true||design.released===false||design.katalog?.fit==='passt nicht')unavailable();
  // The fixed Shopify binding owns the base variant price. The displayed
  // design total additionally includes template motifs if its price rule does.
  const base=quote(config,[],design.id,binding.options),price=quote(config,design.objects,design.id,binding.options),geometry=prepared?.geometry??physicalGeometry(config,{mOptions:binding.options});
  if(!Number.isSafeInteger(binding.unitCents)||base.unitCents!==binding.unitCents||![geometry.width,geometry.height].every(v=>Number.isFinite(v)&&v>0))unavailable();
  return {design,geometry,price};
 }
 function target(context,token){
  if(typeof token!=='string'||token.length>4096)unavailable();
  const parts=token.split('.');if(parts.length!==3||parts[0]!=='sgt1'||!/^[A-Za-z0-9_-]+$/.test(parts[1])||!/^[A-Za-z0-9_-]{43}$/.test(parts[2]))unavailable();
  if(!timingSafeEqual(Buffer.from(sign(parts[1])),Buffer.from(parts[2])))unavailable();
  let input;try{input=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{unavailable();}
  if(!input||Object.keys(input).length!==fields.length||fields.some(k=>!Object.hasOwn(input,k))||input.sid!==context.session.sid||input.storeId!==context.store.storeId)unavailable();
  const current=resolve(identity(input));checkScope(context,current.binding);
  if(current.store!==context.store||!fields.filter(k=>!['sid','designId','scope','sourceProductId','sourceProductRevision'].includes(k)).every(k=>current.binding[k]===input[k]))unavailable();
  const sourceModel=cardFor(context.store,context.binding),targetModel=cardFor(current.store,current.binding);
  requireDesignChoice(sourceModel.universal);
  const source={scope:galleryScope(sourceModel,context.binding),process:galleryProcess(selectedProfile(sourceModel.universal,context.binding.options))};
  const destination={scope:galleryScope(targetModel,current.binding),process:galleryProcess(selectedProfile(targetModel.universal,current.binding.options))};
  if(input.scope!==source.scope.key||input.sourceProductId!==context.binding.productId||input.sourceProductRevision!==context.binding.productRevision)unavailable();
  const model=modelFor(current.store,current.binding);checkBinding(current.store,current.binding,model);
  const selected=selection(current.binding,model,input.designId);
  // Ein Hauptprodukt kann aktive Varianten aus mehreren freigegebenen Ständen enthalten.
  const sameAllSizesProduct=sameFamilyGallery(context.binding,current.binding,sourceModel.universal,targetModel.universal);
  if(sameAllSizesProduct&&current.binding.productRevision!==context.binding.productRevision)requireDesignChoice(targetModel.universal);
  if(!sameAllSizesProduct&&!galleryTargetAllowed(source,destination,selected.design))unavailable();
  return {...current,model,...selected};
 }

 async function build(context,validated){
  const registry=context.store.registry,started=performance.now();
  const candidates=(validated?await registry.listActiveForGallery({onMeasure:values=>measure(context,'shop_gallery_binding_measure',values)}):registry.listActive()).sort((a,b)=>a.productId.localeCompare(b.productId)||a.productRevision-b.productRevision||a.unitCents-b.unitCents||a.shopifyVariantId.localeCompare(b.shopifyVariantId));
  const timings={registryMs:performance.now()-started,modelMs:0,profileMs:0,selectionMs:0,models:0,bindings:candidates.length,cards:0};
  const scopes=new Map(),sources=new Map();let lastKey,model;
  for(let i=0;i<candidates.length;i++){
   if(i%8===0)await new Promise(resolve=>setImmediate(resolve));
   const candidate=candidates[i];
   try{
    checkScope(context,candidate);
    // The registry's gallery snapshot already performs the exact immutable
    // document/binding checks. Legacy registries retain the explicit check.
    const current=validated?{store:context.store,binding:candidate}:resolve(identity(candidate));
    if(current.store!==context.store||!sameBinding(candidate,current.binding))continue;
    const binding=current.binding,key=binding.productId+':'+binding.productRevision;
    if(key!==lastKey){const at=performance.now();model=cardFor(current.store,binding);lastKey=key;timings.modelMs+=performance.now()-at;timings.models++;}
    // These product/revision-isolated galleries use the selected binding below.
    // Warming every variant/design combination creates unreachable global cards.
    if(model.universal.familyFormats?.fixedSize||isAllSizesFamily(model.universal))continue;
    // Availability is checked on every response, including cache hits.
    // A pause/resume or doorbell approval is not a product revision.
    const profileAt=performance.now(),profile=selectedProfile(model.universal,binding.options),scope=galleryScope(model,binding),process=galleryProcess(profile);timings.profileMs+=performance.now()-profileAt;
    sources.set(binding.bindingId,{scope,process,theme:profile.themeId||null});
    if(!scopes.has(scope.key))scopes.set(scope.key,[]);const cards=scopes.get(scope.key);
    // Geometry and the projected profile depend on this immutable binding,
    // not on the design. Do not clone its full design library for every card.
    let geometry;try{geometry=physicalGeometry(model.universal,{mOptions:binding.options});}catch{continue;}
    const prepared={profile,geometry};
    for(let designIndex=0;designIndex<profile.designs.length;designIndex++){
     if(designIndex%32===0)await new Promise(resolve=>setImmediate(resolve));
     const design=profile.designs[designIndex];
     let selected;const at=performance.now();try{selected=selection(binding,model,design.id,prepared);}catch{continue;}finally{timings.selectionMs+=performance.now()-at;}
     const {geometry,price}=selected,dedupe=JSON.stringify([binding.productId,design.id,geometry.width,geometry.height,geometry.shape]);
     cards.push({binding,scope,process,search:searchMetadata(design,model.universal),design:{katalog:{target:design.katalog?.target}},availability:{universal:{doorbell:{schema:model.universal.doorbell?.schema}}},designId:design.id,dedupe,card:{productId:binding.productId,productRevision:binding.productRevision,designId:design.id,productName:model.name,designName:design.name||model.name,themes:design.themes||[],widthMm:geometry.width,heightMm:geometry.height,shape:geometry.shape,unitCents:price.unitCents,currency:price.currency,shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId}});
     timings.cards++;
    }
   }catch(error){if([404,409,422,423].includes(error.status))continue;throw error;}
  }
  measure(context,'shop_gallery_build_measure',{...timings,totalMs:performance.now()-started});return {scopes,sources};
 }
 async function restoreOrBuild(context,revision){
  const storage=context.store.registry.galleryCache,started=performance.now();
  if(storage){
   try{
    const saved=await storage.read(revision),restored=snapshots.decodeLazy(context,revision,saved);
    if(restored){measure(context,'shop_gallery_cache_hit',{ms:performance.now()-started});return restored;}
    measure(context,saved?'shop_gallery_cache_invalid':'shop_gallery_cache_miss');
   }catch{measure(context,'shop_gallery_cache_read_failed');}
  }
  const result=await build(context,true);
  // Never label an in-flight mixed build with a revision that has moved on.
  if(storage&&context.store.registry.galleryRevision()===revision){
   const at=performance.now();
   try{
    const encoded=snapshots.encode(context,revision,result);
    if(await storage.write(revision,encoded)!==false){
     measure(context,'shop_gallery_cache_saved',{ms:performance.now()-at});
     // Audit 17.11.2026: dieselbe schlanke Fassung wie beim Treffer behalten statt aller gebauten Karten im Speicher.
     const slim=snapshots.decodeLazy(context,revision,encoded);if(slim)return slim;
    }
   }
   catch{measure(context,'shop_gallery_cache_write_failed');}
  }
  return result;
 }
 function entryFor(context){
  const revision=context.store.registry.galleryRevision();let entry=cache.get(context.store);
  if(!entry||entry.revision!==revision){
   entry={revision};
   // Defer the cold work so startup/request handling can first return to the event loop.
   entry.promise=new Promise(resolve=>setImmediate(resolve)).then(()=>restoreOrBuild(context,revision));
   entry.promise.catch(()=>{if(cache.get(context.store)===entry)cache.delete(context.store);});
   cache.delete(context.store);if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(context.store,entry);
  }else{cache.delete(context.store);cache.set(context.store,entry);}
  return entry;
 }
 async function cachedCards(context){
  const registry=context.store.registry;
  if(typeof registry.galleryRevision!=='function'||typeof registry.listActiveForGallery!=='function')return build(context,false);
  for(let attempt=0;attempt<2;attempt++){
   const entry=entryFor(context),cards=await entry.promise;
   if(registry.galleryRevision()===entry.revision)return cards;
   if(cache.get(context.store)===entry)cache.delete(context.store);
  }
  unavailable();
 }
 // Startup warming never creates sessions/tokens or changes product data.
 // Catch at the caller; a failed build is discarded and the next call can retry.
 function warm(context){return cachedCards(context);}
 // Türschild-Konfi: die Galerie zeigt die Vorlagen der Ausführung, die der Kunde gerade im Konfi gewählt hat
 // (Form & Größe, Befestigung). Das ist eine andere Shopify-Variante desselben Produktstands.
 function variantBinding(context,own,options){
  const b=context.binding;if(!options)return b;
  // Wie der Konfi selbst normalisieren (Standardfarbe/-befestigung, keine fremden Schlüssel), dann exakt vergleichen.
  let wanted;try{wanted=familyFormatOptions(own.universal,options);}catch{fail(409,'shop_gallery_variant','Diese Ausführung ist im Shop nicht verfügbar. Bitte eine andere Größe oder Befestigung wählen.');}
  const wantedKey=optionKey(wanted);
  if(wantedKey===optionKey(b.options))return b;
  const {registry,workshop}=context.store,intake=workshop.orderIntake;let found;
  if(typeof intake?.bindings==='function'&&typeof registry.resolve==='function'){
   // Like the cart path: inexpensive saved selections identify candidate IDs;
   // only the exact active head supplies authority. Do not validate every
   // unrelated product document in the store when one size/mounting changes.
   if(intake.tenantId!==b.tenantId)unavailable();
   const candidates=new Map();
   const sameRevisionOnly=!hasFamilyGallerySource(own.universal);
   for(const row of intake.bindings()){
    if(row.shopDomain!==b.shopDomain||row.productId!==b.productId||optionKey(row.options)!==wantedKey)continue;
    if(sameRevisionOnly&&row.productRevision!==b.productRevision)continue;
    if(!candidates.has(row.variantId))candidates.set(row.variantId,new Set());
    candidates.get(row.variantId).add(row.productRevision);
   }
   found=[];
   for(const [variantId,revisions] of candidates){
    if(typeof variantId!=='string'||!/^[1-9][0-9]{0,19}$/.test(variantId))unavailable();
    let active;try{active=registry.resolve({shopifyProductId:b.shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+variantId});}catch(error){if(error.status===404&&error.code==='shop_binding_active_not_found')continue;throw error;}
    if(!active||active.storeId!==b.storeId||active.tenantId!==b.tenantId||active.shopDomain!==b.shopDomain||active.shopifyProductId!==b.shopifyProductId||active.shopifyVariantId!=='gid://shopify/ProductVariant/'+variantId||active.productId!==b.productId||!revisions.has(active.productRevision)||optionKey(active.options)!==wantedKey)unavailable();
    found.push(active);
   }
  }else{
   // Legacy adapters without the native saved-selection API keep their checks.
   found=registry.listActive().filter(x=>x.storeId===b.storeId&&x.tenantId===b.tenantId&&x.shopDomain===b.shopDomain&&x.shopifyProductId===b.shopifyProductId&&x.productId===b.productId&&x.productRevision===b.productRevision&&optionKey(x.options)===wantedKey);
  }
  if(found.length!==1)fail(409,'shop_gallery_variant','Diese Ausführung ist im Shop nicht verfügbar. Bitte eine andere Größe oder Befestigung wählen.');
  return found[0];
 }
 async function availableCards(context,sourceModel=null,options=null){
  // Fixed-size products only offer their own approved templates. They need
  // neither a store-wide binding scan nor the 250,000-card warm-up.
  const own=sourceModel,allSizes=own&&isAllSizesFamily(own.universal);
  if(own?.universal.familyFormats?.fixedSize||allSizes){
   const binding=allSizes?variantBinding(context,own,options):context.binding;
   let model=own;
   if(binding.productRevision!==context.binding.productRevision){
    model=cardFor(context.store,binding);
    if(!sameFamilyGallery(context.binding,binding,own.universal,model.universal))unavailable();
    requireDesignChoice(model.universal);
   }
   checkBinding(context.store,binding,model);
   const profile=selectedProfile(model.universal,binding.options),scope=galleryScope(own,context.binding),process=galleryProcess(profile),geometry=physicalGeometry(model.universal,{mOptions:binding.options});
   const source={scope,process,theme:profile.themeId||null},cards=[];
   for(const design of profile.designs){
    let selected;try{selected=selection(binding,model,design.id,{profile,geometry});}catch{continue;}
    cards.push({binding,scope,process,search:searchMetadata(design,model.universal),design,designId:design.id,dedupe:design.id,card:{productId:binding.productId,productRevision:binding.productRevision,designId:design.id,productName:model.name,designName:design.name||model.name,themes:design.themes||[],widthMm:geometry.width,heightMm:geometry.height,shape:geometry.shape,unitCents:selected.price.unitCents,currency:selected.price.currency,shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId}});
   }
   return {cards,source};
  }
  const snapshot=await cachedCards(context),source=snapshot.sources.get(context.binding.bindingId);
  if(!source){
   // Legacy/internal callers may omit the public route's pinned source model.
   // Only a missing source needs this lookup; ordinary cache hits stay model-free.
   const own=cardFor(context.store,context.binding);
   if(own.universal.familyFormats?.fixedSize||isAllSizesFamily(own.universal)){
    const current=resolve(identity(context.binding));checkScope(context,current.binding);
    if(current.store!==context.store||!sameBinding(context.binding,current.binding))unavailable();
    requireDesignChoice(own.universal);
    return availableCards(context,own,options);
   }
   return {cards:[],source:null};
  }
  const cards=(snapshot.scopes.get(source.scope.key)||[]).filter(row=>galleryTargetAllowed(source,row,row.design)),unique=[...new Map(cards.map(row=>[row.binding.bindingId,row])).values()];
  if(checkBindings){const allowed=await checkBindings(context.store,unique);return {cards:cards.filter(row=>allowed.has(row.binding.bindingId)),source};}
  const allowed=new Set();
  for(let i=0;i<unique.length;i++){
   if(i%8===0)await new Promise(resolve=>setImmediate(resolve));
   const row=unique[i];try{checkBinding(context.store,row.binding,row.availability);allowed.add(row.binding.bindingId);}catch(error){if(![404,409,422,423].includes(error.status))throw error;}
  }
  return {cards:cards.filter(row=>allowed.has(row.binding.bindingId)),source};
 }
 const preparing=Symbol('preparing');
 async function boundedCards(context,sourceModel,options){
  let timer;
  try{return await Promise.race([availableCards(context,sourceModel,options),new Promise(resolve=>{timer=setTimeout(()=>resolve(preparing),waitMs);})]);}
  finally{clearTimeout(timer);}
 }
 async function list(context,{page=0,theme='preferred',sourceModel=null,options=null,q=''}={}){
  const query=designSearchQuery(q);
  if(!['preferred','all'].includes(theme))fail(422,'shop_gallery_theme','Dieses Thema gibt es nicht.');
  if(!Number.isSafeInteger(page)||page<0||page>10000)fail(422,'shop_gallery_page','Diese Seite der Designauswahl gibt es nicht.');
  // Public entry supplies its revision-pinned source. Do not defeat the legacy
  // lightweight gallery cache by rebuilding a model for every warm page.
  if(sourceModel)requireDesignChoice(sourceModel.universal);
  if(typeof context.store.registry.listActive!=='function')return {items:[],nextPage:null,total:0};
  const result=await boundedCards(context,sourceModel,options);
  if(result===preparing)return {status:'preparing',message:'Designs werden vorbereitet – bitte gleich noch einmal versuchen.',items:[],nextPage:page,total:null};
  const {cards,source}=result;
  const choices=new Map();
  for(const row of cards){
   const previous=choices.get(row.dedupe);
   if(previous&&row.binding.shopifyVariantId!==context.binding.shopifyVariantId&&(previous.binding.shopifyVariantId===context.binding.shopifyVariantId||previous.card.unitCents<=row.card.unitCents))continue;
   choices.set(row.dedupe,row);
  }
  const rows=[...choices.values()].filter(row=>matchesDesignSearch(row.search,query)),start=page*40;
  rows.sort((a,b)=>a.search.rank-b.search.rank||(!query&&theme==='preferred'&&source?.theme?Number(b.card.themes.includes(source.theme))-Number(a.card.themes.includes(source.theme)):0));
  const items=rows.slice(start,start+40).map(({binding,designId,card})=>({...card,...(previewUrl&&cachedPreview(binding,designId)?{previewUrl:previewUrl(cachedPreview(binding,designId).hash)}:{}),target:issue(context,binding,designId,source.scope.key),current:binding.productId===context.binding.productId&&(binding.shopifyVariantId===context.binding.shopifyVariantId||options!==null&&binding.productRevision===context.binding.productRevision)}));
  return {items,nextPage:start+40<rows.length?page+1:null,total:rows.length,...(source?.theme?{hasTheme:true}:{})};
 }
 function preview(context,token){
  const t=target(context,token),allowed=allowedAssets(t.store,t.binding,t.model),hit=cachedPreview(t.binding,t.design.id);
  for(const example of t.model.universal.localResources.photoExamples||[])if(example.designId===t.design.id&&!allowed.has(example.assetId))unavailable();
  if(hit)return hit.body.toString();
  const model=structuredClone(t.model),assets=t.store.workshop.assets;
  const data=id=>{if(!allowed.has(id))unavailable();return 'data:image/svg+xml;base64,'+assets.read(id).toString('base64');};
  model.universal.localResources.motifs=model.universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
  const examples=(model.universal.localResources.photoExamples||[]).filter(e=>e.designId===t.design.id).map(e=>({...e,url:data(e.assetId)}));
  const result=productPreview(model,{options:t.binding.options,designId:t.design.id,examples,layout:'card',keepout:false,designArea:false}).replace(/href="\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg"/g,(_,id)=>'href="'+data(id)+'"');
  const body=Buffer.from(result),hash=createHash('sha256').update(body).digest('hex');
  previews.set(previewKey(t.binding,t.design.id),{body,hash});previewFiles.set(hash,body);previewBytes+=body.length;
  while(previews.size>1&&(previews.size>256||previewBytes>32*1024*1024)){const [key,old]=previews.entries().next().value;previews.delete(key);previewBytes-=old.body.length;if(![...previews.values()].some(p=>p.hash===old.hash))previewFiles.delete(old.hash);}
  return result;
 }
 function start(context,model,designId,{cardModel=null}={}){
  if(!moduleEnabled(model.universal,'designs'))return null;
  const scope=galleryScope(cardModel||cardFor(context.store,context.binding),context.binding);
  if(!scope)return null;
  const selected=selection(context.binding,model,designId);
  const hit=cachedPreview(context.binding,selected.design.id);
  return {target:issue(context,context.binding,selected.design.id,scope.key),...(previewUrl&&hit?{previewUrl:previewUrl(hit.hash)}:{})};
 }
 return {list,target,preview,warm,start,previewFile:hash=>previewFiles.get(hash)||null};
}
