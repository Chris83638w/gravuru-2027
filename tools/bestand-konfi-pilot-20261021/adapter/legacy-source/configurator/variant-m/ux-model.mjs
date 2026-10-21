// Shared UI rules. These do not authorize a Shopify order or a paid download.
import {cleanObject} from './contract.mjs';
export const UX_UPLOAD_POLICY = Object.freeze({maxFiles:4, priceCents:999, maxBytes:15*1024*1024});
export const visibleObjects = objects => objects.filter(o => !o.uxHidden);
export const uploadObjects = objects => objects.filter(o => !!o.uxUploadId);
export function additionalMotifCount(objects,source) {
  const included=new Map(source.filter(o=>o.type==='motif').map(o=>[o.id,o.motif])),seen=new Set();
  let count=0;
  for(const o of objects.filter(o=>o.type==='motif'&&!o.uxHidden&&!o.uxDecoration&&!o.uxUploadId)){
    const key=o.cSourceId||o.id;
    if(included.get(key)===o.motif&&!seen.has(key))seen.add(key);else count++;
  }
  return count;
}
export function uploadQuote(objects, quantity=1, includeHidden=false, policy={includedCount:0,extraPriceCents:999}) {
  if (!Number.isInteger(quantity) || quantity<1 || quantity>99) throw Error('Menge: 1 bis 99.');
  const uploads=uploadObjects(objects);
  if (new Set(uploads.map(o=>o.uxUploadId)).size>4) throw Error('Maximal vier Fotos und Logos zusammen.');
  const ids=new Set(uploads.filter(o=>includeHidden||!o.uxHidden).map(o=>o.uxUploadId));
  if(!Number.isSafeInteger(policy.includedCount)||policy.includedCount<0||policy.includedCount>4||!Number.isSafeInteger(policy.extraPriceCents)||policy.extraPriceCents<0)throw Error('Ungültige Fotopreisregel.');
  const photos=new Set(uploads.filter(o=>(includeHidden||!o.uxHidden)&&o.uxUploadKind!=='logo').map(o=>o.uxUploadId));
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

