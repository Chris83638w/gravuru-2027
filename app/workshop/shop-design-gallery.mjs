import {createHmac,timingSafeEqual} from 'node:crypto';
import {selectedProfile,quote} from '../configurator/variant-m/contract.mjs';
import {physicalGeometry} from '../configurator/variant-m/print-geometry.mjs';
import {productPreview} from './product-preview.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const unavailable=()=>fail(409,'shop_gallery_changed','Dieses Design ist nicht mehr verfügbar. Bitte die Designauswahl neu öffnen.');
const sameBinding=(a,b)=>['storeId','tenantId','shopDomain','shopifyProductId','shopifyVariantId','productId','productRevision','bindingId','assignmentRevision'].every(k=>a[k]===b[k]);
const identity=b=>({shopifyProductId:b.shopifyProductId,shopifyVariantId:b.shopifyVariantId});
const fields=['sid','storeId','productId','productRevision','bindingId','assignmentRevision','shopifyProductId','shopifyVariantId','designId'];

const productLine=(model,binding)=>model.galleryProductLine||JSON.stringify(['product',binding.productId]);

// No catalogue imports or approvals happen here. Customer designs are taken
// only from the fixed, already activated product model. Catalogue target
// approval remains the importer's responsibility, just as for normal entry.
export function createShopDesignGallery({secret,resolve,modelFor,cardFor=modelFor,allowedAssets,checkBinding=()=>{},checkBindings,waitMs=4000}){
 const cache=new Map();
 const key=createHmac('sha256',secret).update('gravuru-shop-design-target/v1').digest();
 const sign=s=>createHmac('sha256',key).update(s).digest('base64url');
 const issue=(session,binding,designId)=>{
  const data=Object.fromEntries(fields.map(k=>[k,k==='sid'?session.sid:k==='designId'?designId:binding[k]]));
  const text=Buffer.from(JSON.stringify(data)).toString('base64url');return 'sgt1.'+text+'.'+sign(text);
 };
 function checkScope(context,binding){
  if(binding.storeId!==context.store.storeId||binding.tenantId!==context.store.workshop.tenantId||binding.shopDomain!==context.binding.shopDomain)unavailable();
 }
 function selection(binding,model,designId){
  const config=model.universal,profile=selectedProfile(config,binding.options),design=profile.designs.find(d=>d.id===designId);
  if(!design||design.hidden===true||design.released===false||design.katalog?.fit==='passt nicht')unavailable();
  // The fixed Shopify binding owns the base variant price. The displayed
  // design total additionally includes template motifs if its price rule does.
  const base=quote(config,[],design.id,binding.options),price=quote(config,design.objects,design.id,binding.options),geometry=physicalGeometry(config,{mOptions:binding.options});
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
  if(current.store!==context.store||!fields.filter(k=>!['sid','designId'].includes(k)).every(k=>current.binding[k]===input[k]))unavailable();
  // Re-check source and destination for old signed targets as well. Both
  // preview and selection must obey the same boundary as the card list.
  if(productLine(cardFor(context.store,context.binding),context.binding)!==productLine(cardFor(current.store,current.binding),current.binding))unavailable();
  const model=modelFor(current.store,current.binding);checkBinding(current.store,current.binding,model);
  const selected=selection(current.binding,model,input.designId);
  return {...current,model,...selected};
 }

 async function build(context,validated){
  const registry=context.store.registry;
  const candidates=(validated?await registry.listActiveForGallery():registry.listActive()).sort((a,b)=>a.productId.localeCompare(b.productId)||a.productRevision-b.productRevision||a.unitCents-b.unitCents||a.shopifyVariantId.localeCompare(b.shopifyVariantId));
  const cards=[];let lastKey,model;
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
    if(key!==lastKey){model=cardFor(current.store,binding);lastKey=key;}
    // Availability is checked on every response, including cache hits.
    // A pause/resume or doorbell approval is not a product revision.
    const profile=selectedProfile(model.universal,binding.options);
    for(const design of profile.designs){
     let selected;try{selected=selection(binding,model,design.id);}catch{continue;}
     const {geometry,price}=selected,dedupe=JSON.stringify([binding.productId,design.id,geometry.width,geometry.height,geometry.shape]);
     cards.push({binding,productLine:productLine(model,binding),availability:{universal:{doorbell:{schema:model.universal.doorbell?.schema}}},designId:design.id,dedupe,card:{productId:binding.productId,productRevision:binding.productRevision,designId:design.id,productName:model.name,designName:design.name||model.name,widthMm:geometry.width,heightMm:geometry.height,shape:geometry.shape,unitCents:price.unitCents,currency:price.currency,shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId}});
    }
   }catch(error){if([404,409,422,423].includes(error.status))continue;throw error;}
  }
  return cards;
 }
 function entryFor(context){
  const revision=context.store.registry.galleryRevision();let entry=cache.get(context.store);
  if(!entry||entry.revision!==revision){
   entry={revision};
   // Defer the cold work so startup/request handling can first return to the event loop.
   entry.promise=new Promise(resolve=>setImmediate(resolve)).then(()=>build(context,true));
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
 async function availableCards(context){
  const all=await cachedCards(context);
  // Keep the shared cache unfiltered for startup warming and other source
  // products. Filter before approval checks, deduplication and pagination.
  const source=all.find(row=>row.binding.productId===context.binding.productId&&row.binding.productRevision===context.binding.productRevision);
  const line=source?.productLine??productLine(cardFor(context.store,context.binding),context.binding);
  const cards=all.filter(row=>row.productLine===line),unique=[...new Map(cards.map(row=>[row.binding.bindingId,row])).values()];
  if(checkBindings){const allowed=await checkBindings(context.store,unique);return cards.filter(row=>allowed.has(row.binding.bindingId));}
  const allowed=new Set();
  for(let i=0;i<unique.length;i++){
   if(i%8===0)await new Promise(resolve=>setImmediate(resolve));
   const row=unique[i];try{checkBinding(context.store,row.binding,row.availability);allowed.add(row.binding.bindingId);}catch(error){if(![404,409,422,423].includes(error.status))throw error;}
  }
  return cards.filter(row=>allowed.has(row.binding.bindingId));
 }
 const preparing=Symbol('preparing');
 async function boundedCards(context){
  let timer;
  try{return await Promise.race([availableCards(context),new Promise(resolve=>{timer=setTimeout(()=>resolve(preparing),waitMs);})]);}
  finally{clearTimeout(timer);}
 }
 async function list(context,{page=0}={}){
  if(!Number.isSafeInteger(page)||page<0||page>10000)fail(422,'shop_gallery_page','Diese Seite der Designauswahl gibt es nicht.');
  if(typeof context.store.registry.listActive!=='function')return {items:[],nextPage:null,total:0};
  const cards=await boundedCards(context);
  if(cards===preparing)return {status:'preparing',message:'Designs werden vorbereitet – bitte gleich noch einmal versuchen.',items:[],nextPage:page,total:null};
  const choices=new Map();
  for(const row of cards){
   const previous=choices.get(row.dedupe);
   if(previous&&row.binding.shopifyVariantId!==context.binding.shopifyVariantId&&(previous.binding.shopifyVariantId===context.binding.shopifyVariantId||previous.card.unitCents<=row.card.unitCents))continue;
   choices.set(row.dedupe,row);
  }
  const rows=[...choices.values()],start=page*40;
  const items=rows.slice(start,start+40).map(({binding,designId,card})=>({...card,target:issue(context.session,binding,designId),current:binding.productId===context.binding.productId&&binding.shopifyVariantId===context.binding.shopifyVariantId}));
  return {items,nextPage:start+40<rows.length?page+1:null,total:rows.length};
 }
 function preview(context,token){
  const t=target(context,token),model=structuredClone(t.model),allowed=allowedAssets(t.store,t.binding,model),assets=t.store.workshop.assets;
  const data=id=>{if(!allowed.has(id))unavailable();return 'data:image/svg+xml;base64,'+assets.read(id).toString('base64');};
  model.universal.localResources.motifs=model.universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
  const examples=(model.universal.localResources.photoExamples||[]).filter(e=>e.designId===t.design.id).map(e=>({...e,url:data(e.assetId)}));
  return productPreview(model,{options:t.binding.options,designId:t.design.id,examples,layout:'card',keepout:false,designArea:false}).replace(/href="\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg"/g,(_,id)=>'href="'+data(id)+'"');
 }
 return {list,target,preview,warm};
}
