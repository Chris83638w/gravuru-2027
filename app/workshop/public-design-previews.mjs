import {randomBytes,createHash} from 'node:crypto';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';
import {isAllSizesFamily} from '../configurator/variant-m/family-formats.mjs';
import {previewDigest} from './public-design-preview-cache.mjs';

const fields=['storeId','tenantId','shopDomain','shopifyProductId','shopifyVariantId','productId','productRevision','bindingId','assignmentRevision','options','unitCents'];
const fixedBinding=b=>Object.fromEntries(fields.map(k=>[k,b[k]]));
const unavailable=()=>{throw Object.assign(Error('Öffentliche Vorlage ist nicht mehr freigegeben.'),{status:409,code:'public_preview_changed'});};
const sourceDigest=model=>createHash('sha256').update(JSON.stringify(model)).digest('hex');
const same=(a,b)=>previewDigest(fixedBinding(a))===previewDigest(fixedBinding(b));
// Optional derived previews for the existing own-product gallery. A separate
// legacy scene/shared-font renderer is deliberately left on its private path.
export function createPublicDesignPreviews({cache,resolve,modelFor,checkBinding,gallery,renderTemplate,previewUrl}){
 function current(ids){
  const {store,binding}=resolve(ids);
  if(binding.storeId!==store.storeId||binding.tenantId!==store.workshop.tenantId||binding.shopifyProductId!==ids.shopifyProductId||binding.shopifyVariantId!==ids.shopifyVariantId)unavailable();
  const model=modelFor(store,binding);checkBinding(store,binding,model);
  if(model.configuration?.id!==binding.productId||model.configuration?.revision!==binding.productRevision||model.key!=='acryl')unavailable();
  return {store,binding,model,session:{sid:'template-preparation-'+randomBytes(12).toString('hex')}};
 }
 function choices(context){
  const c=context.model.universal;
  if(!c||c.acrylic||c.doorbell||!(c.familyFormats?.fixedSize||isAllSizesFamily(c)))return [];
  const profile=selectedProfile(c,context.binding.options),designs=[...profile.designs];
  if(profile.themeId)designs.sort((a,b)=>Number(b.themes?.includes(profile.themeId)||false)-Number(a.themes?.includes(profile.themeId)||false));
  const selected=[];
  for(const design of designs){
   // Product models must not contribute customer media to a public cache.
   if((design.objects||[]).some(o=>o.media||o.uploadId||o.customerUploadId||o.uxUploadId||o.uxVectorLogo))continue;
   try{const start=gallery.start(context,context.model,design.id,{cardModel:context.model});if(start)selected.push({designId:design.id,target:start.target});}catch{/* Existing gallery rules own visibility, geometry and price. */}
   if(selected.length===3)break;
  }
  return selected;
 }
 function identity(context,designId){return {renderer:cache.rendererFingerprint,binding:fixedBinding(context.binding),source:sourceDigest(context.model),designId};}
 function lookup(binding,context=current(binding)){if(!same(context.binding,binding))unavailable();
  const source=sourceDigest(context.model),found=new Map();
  for(const row of choices(context)){const id={renderer:cache.rendererFingerprint,binding:fixedBinding(context.binding),source,designId:row.designId},hit=cache.get(id);if(hit)found.set(row.designId,{...hit,url:previewUrl(hit.hash)});}
  return found;
 }
 function urls(binding){try{return [...lookup(binding).values()].map(hit=>hit.url);}catch{return [];}}
 function attach(result){
  const groups=new Map();
  // Only the first three visible cards are speculative candidates. No scans
  // across every variant or every template occur here.
  const items=(result.items||[]).map((item,index)=>{
   const {previewUrl:oldPublicUrl,...privateItem}=item;
   if(index>=3)return privateItem;
   const key=item.shopifyProductId+'|'+item.shopifyVariantId;
   try{if(!groups.has(key)){const context=current(item);groups.set(key,lookup(context.binding,context));}const hit=groups.get(key).get(item.designId);return hit?{...privateItem,previewUrl:hit.url}:privateItem;}catch{return privateItem;}
  });
  return {...result,items};
 }
 function read(hash){
  const hit=cache.read(hash);if(!hit)return null;
  try{const context=current(hit.identity.binding);
   if(!same(context.binding,hit.identity.binding)||previewDigest(identity(context,hit.identity.designId))!==previewDigest(hit.identity))return null;
   // Signed preparation already validated the original selection. The exact
   // current model/resource digest above includes its visibility and module
   // flags; do not repeat the same three geometry/price projections per GET.
   return hit.body;
  }catch{return null;}
 }
 let running=false;
 async function prepare(ids){
  if(running)throw Object.assign(Error('Eine Vorschauvorbereitung läuft bereits.'),{status:409,code:'public_preview_busy'});
  running=true;
  try{const initial=current(ids),basis=previewDigest({binding:fixedBinding(initial.binding),source:sourceDigest(initial.model)}),first=choices(initial),result=[];
   for(const row of first){
    await new Promise(done=>setImmediate(done));
    const context=current(ids);if(previewDigest({binding:fixedBinding(context.binding),source:sourceDigest(context.model)})!==basis)unavailable();
    const id=identity(context,row.designId),old=cache.get(id);
    if(old){result.push({designId:row.designId,url:previewUrl(old.hash),bytes:old.body.length,cached:true});continue;}
    const body=Buffer.from(renderTemplate(context,row.designId));
    // Only self-contained renderer output enters the publicly cacheable path.
    // A future external/private image reference remains on the private fallback.
    const svg=body.toString();
    if(/<(?:script|foreignObject)\b|\son[a-z]+\s*=|<!DOCTYPE|<!ENTITY/i.test(svg)||[...svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)].some(m=>!/^#[-\w:.]+$/.test(m[1])&&!/^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(m[1])))throw Error('Vorschau enthält nichtöffentliche oder externe Ressourcen.');
    const fresh=current(ids);if(previewDigest({binding:fixedBinding(fresh.binding),source:sourceDigest(fresh.model)})!==basis)unavailable();
    const hit=cache.put(id,body);result.push({designId:row.designId,url:previewUrl(hit.hash),bytes:body.length,cached:false});
   }
   return {prepared:result.length,items:result};
  }finally{running=false;}
 }
 return Object.freeze({urls,attach,read,prepare});
}
