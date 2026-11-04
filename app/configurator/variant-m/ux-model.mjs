// Shared UI rules. These do not authorize a Shopify order or a paid download.
import {cleanObject} from './contract.mjs';
export {carryPersonalObjects,mapPersonalObjects} from './field-mapping.mjs';
export const uploadAllowed=(config,kind)=>kind==='photo'?config?.logo?.vectorUpload!==true&&config?.photo?.enabled!==false:kind==='logo'?config?.logo?.enabled!==false:false;
export function photoAvailableForDesign(config,designId){
  if(config?.logo?.vectorUpload===true||config?.photo?.enabled===false)return false;
  if(config?.photoDesignPricing===true)return true;
  const design=config?.profile?.designs?.find(d=>d.id===designId);
  return !design?.importedSource||design.objects.some(o=>o.type==='photoSlot');
}
// Foto-/Logo-Reiter (Chris 22./23.10.2026): Sieht das Produkt oder Verfahren kein Foto vor
// (photoEnabled = config.photo.enabled && process.tools.photo) und hat kein Design des Produkts
// eine Foto- oder Logo-Ebene, verschwindet der Reiter vollständig – unabhängig von der
// Logo-Einstellung. Sonst gilt die bisherige Regel: Reiter sichtbar, solange das gewählte Design
// einen Fotobereich hat oder Logos erlaubt sind (Produkte mit Foto bleiben unverändert).
export const designsHaveUploadLayer=config=>!!config?.profile?.designs?.some(d=>(d.objects||[]).some(o=>o.type==='photoSlot'||o.type==='image'));
export function uploadTabVisible(config,designId,{photoEnabled=true,logoEnabled=true}={}){
  if(logoEnabled&&config?.logo?.enabled===true&&config.logo.vectorUpload===true)return true;
  if(!photoEnabled&&!designsHaveUploadLayer(config))return false;
  return photoAvailableForDesign(config,designId)||logoEnabled;
}
export const UX_UPLOAD_POLICY = Object.freeze({maxFiles:4, priceCents:999, maxBytes:15*1024*1024});
export const visibleObjects = objects => objects.filter(o => !o.uxHidden);
export const uploadObjects = objects => objects.filter(o => !!o.uxUploadId);
export function uploadTarget(objects,kind,replaceId,selectedId){
  if(replaceId)return objects.find(o=>o.id===replaceId&&o.type!=='motif-raster'&&!o.locked);
  if(kind!=='photo')return undefined;
  return objects.find(o=>o.id===selectedId&&o.type==='photoSlot'&&!o.uxUploadId&&!o.uxLocked)
    ||objects.find(o=>o.type==='photoSlot'&&!o.uxUploadId&&!o.uxLocked);
}
export function additionalMotifCount(objects,source) {
  const included=new Map(source.filter(o=>o.type==='motif').map(o=>[o.id,o.motif])),seen=new Set();
  let count=0;
  for(const o of objects.filter(o=>o.type==='motif'&&!o.uxHidden&&!o.uxDecoration&&!o.uxUploadId)){
    const key=o.cSourceId||o.id;
    if(included.get(key)===o.motif&&!seen.has(key))seen.add(key);else count++;
  }
  return count;
}
export function uploadQuote(objects, quantity=1, includeHidden=false, policy={includedCount:0,extraPriceCents:999}, logoPolicy) {
  if (!Number.isInteger(quantity) || quantity<1 || quantity>99) throw Error('Menge: 1 bis 99.');
  const uploads=uploadObjects(objects);
  if (new Set(uploads.map(o=>o.uxUploadId)).size>4) throw Error('Maximal vier Fotos und Logos zusammen.');
  const ids=new Set(uploads.filter(o=>includeHidden||!o.uxHidden).map(o=>o.uxUploadId));
  if(!Number.isSafeInteger(policy.includedCount)||policy.includedCount<0||policy.includedCount>4||!Number.isSafeInteger(policy.extraPriceCents)||policy.extraPriceCents<0)throw Error('Ungültige Fotopreisregel.');
  const photos=new Set(uploads.filter(o=>(includeHidden||!o.uxHidden)&&o.uxUploadKind!=='logo').map(o=>o.uxUploadId));
  if(logoPolicy?.vectorUpload===true){
    if(logoPolicy.enabled!==true||logoPolicy.extraPriceCents!==1299)throw Error('Ungültige Vektorlogo-Preisregel.');
    const logos=new Set(uploads.filter(o=>(includeHidden||!o.uxHidden)&&o.uxUploadKind==='logo').map(o=>o.uxUploadId));
    if([...logos].some(id=>photos.has(id)))throw Error('Eine Datei darf nicht zugleich Foto und Logo sein.');
    const chargedUploads=Math.max(0,photos.size-policy.includedCount),chargedLogos=logos.size,logoUnitCents=chargedLogos*logoPolicy.extraPriceCents;
    const unitCents=chargedUploads*policy.extraPriceCents+logoUnitCents;
    if(!Number.isSafeInteger(unitCents*quantity))throw Error('Ungültiger Uploadpreis.');
    return {count:ids.size,unitCents,totalCents:unitCents*quantity,chargedUploads,chargedLogos,logoUnitCents};
  }
  const charged=ids.size-Math.min(photos.size,policy.includedCount),unitCents=charged*policy.extraPriceCents;
  return {count:ids.size, unitCents,totalCents:unitCents*quantity};
}
export function validateUpload(file, objects, replacingId) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || !Number.isSafeInteger(file.size) || file.size<1 || file.size>UX_UPLOAD_POLICY.maxBytes) throw Error('Bitte JPG, PNG oder WebP bis 15 MB auswählen.');
  if (!replacingId && new Set(uploadObjects(objects).map(o=>o.uxUploadId)).size>=4) throw Error('Du kannst insgesamt vier Fotos oder Logos hinzufügen.');
}
export function pageSlice(items, page=0, size=8) {
  const pages=Math.max(1,Math.ceil(items.length/size)), current=Math.max(0,Math.min(pages-1,page));
  return {items:items.slice(current*size,(current+1)*size),page:current,pages};
}
export function customerDraft(state, profile) {
  const copy={designId:state.designId,width:state.width,height:state.height,objects:state.objects.map(cleanObject),selected:null,showHero:false};
  for(const key of ['mOptions','fkMounting','fkFrame','fkColor','uxDecorationsFor'])if(state[key]!==undefined)copy[key]=structuredClone(state[key]);
  return {schema:'gravuru-customer-design/v2',profileId:profile.id,profileRevision:profile.revision,productId:profile.binding?.productId||null,state:copy};
}
export function canDownloadPurchase(receipt) {
  return receipt?.authenticated===true && receipt?.paid===true && receipt?.format==='png' && typeof receipt?.downloadUrl==='string' && /^https:\/\//.test(receipt.downloadUrl);
}
