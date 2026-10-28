import {createHmac,timingSafeEqual} from 'node:crypto';
import {selectedProfile,quote} from '../configurator/variant-m/contract.mjs';
import {physicalGeometry} from '../configurator/variant-m/print-geometry.mjs';
import {productPreview} from './product-preview.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code});};
const unavailable=()=>fail(409,'shop_gallery_changed','Dieses Design ist nicht mehr verfügbar. Bitte die Designauswahl neu öffnen.');
const sameBinding=(a,b)=>['storeId','tenantId','shopDomain','shopifyProductId','shopifyVariantId','productId','productRevision','bindingId','assignmentRevision'].every(k=>a[k]===b[k]);
const identity=b=>({shopifyProductId:b.shopifyProductId,shopifyVariantId:b.shopifyVariantId});
const fields=['sid','storeId','productId','productRevision','bindingId','assignmentRevision','shopifyProductId','shopifyVariantId','designId'];

// No catalogue imports or approvals happen here. Customer designs are taken
// only from the fixed, already activated product model. Catalogue target
// approval remains the importer's responsibility, just as for normal entry.
export function createShopDesignGallery({secret,resolve,modelFor,allowedAssets}){
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
  const model=modelFor(current.store,current.binding),selected=selection(current.binding,model,input.designId);
  return {...current,model,...selected};
 }
 function list(context,{page=0}={}){
  if(!Number.isSafeInteger(page)||page<0||page>10000)fail(422,'shop_gallery_page','Diese Seite der Designauswahl gibt es nicht.');
  if(typeof context.store.registry.listActive!=='function')return {items:[],nextPage:null,total:0};
  const candidates=context.store.registry.listActive().sort((a,b)=>a.productId.localeCompare(b.productId)||a.unitCents-b.unitCents||a.shopifyVariantId.localeCompare(b.shopifyVariantId));
  const choices=new Map();let lastKey,model;
  for(const candidate of candidates){
   try{
    checkScope(context,candidate);const current=resolve(identity(candidate));
    if(current.store!==context.store||!sameBinding(candidate,current.binding))continue;
    const binding=current.binding,key=binding.productId+':'+binding.productRevision;
    if(key!==lastKey){model=modelFor(current.store,binding);lastKey=key;}
    const profile=selectedProfile(model.universal,binding.options);
    for(const design of profile.designs){
     let selected;try{selected=selection(binding,model,design.id);}catch{continue;}
     const {geometry,price}=selected,dedupe=JSON.stringify([binding.productId,design.id,geometry.width,geometry.height,geometry.shape]);
     // One card per design/shape/size. Prefer the exact current variant; other
     // products start at their cheapest explicitly bound option combination.
     if(choices.has(dedupe)&&binding.shopifyVariantId!==context.binding.shopifyVariantId)continue;
     choices.set(dedupe,{target:issue(context.session,binding,design.id),productId:binding.productId,productRevision:binding.productRevision,designId:design.id,productName:model.name,designName:design.name||model.name,widthMm:geometry.width,heightMm:geometry.height,shape:geometry.shape,unitCents:price.unitCents,currency:price.currency,shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId,current:binding.productId===context.binding.productId&&binding.shopifyVariantId===context.binding.shopifyVariantId});
    }
   }catch(error){if([404,409,422,423].includes(error.status))continue;throw error;}
  }
  const items=[...choices.values()],start=page*40;return {items:items.slice(start,start+40),nextPage:start+40<items.length?page+1:null,total:items.length};
 }
 function preview(context,token){
  const t=target(context,token),model=structuredClone(t.model),allowed=allowedAssets(t.store,t.binding,model),assets=t.store.workshop.assets;
  const data=id=>{if(!allowed.has(id))unavailable();return 'data:image/svg+xml;base64,'+assets.read(id).toString('base64');};
  model.universal.localResources.motifs=model.universal.localResources.motifs.map(m=>m.artwork?assets.resource(m.artwork.assetId):m);
  const examples=(model.universal.localResources.photoExamples||[]).filter(e=>e.designId===t.design.id).map(e=>({...e,url:data(e.assetId)}));
  return productPreview(model,{options:t.binding.options,designId:t.design.id,examples,layout:'card',keepout:false,designArea:false}).replace(/href="\/api\/workshop\/design-assets\/([a-f0-9]{64})\/preview\.svg"/g,(_,id)=>'href="'+data(id)+'"');
 }
 return {list,target,preview};
}
