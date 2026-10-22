import {createHash} from 'node:crypto';

// These are the two reviewed ux.mjs sources in the combined test release.
// Never replace an older editor wholesale with the newer editor implementation.
const sources=new Map([
  ['c10b4b897421a769f4809a2a5515dc87b613edc8cad352a8658da78a6cf13112','legacy'],
  ['5a43141e43eecc4ffeb1f9856319ff4392b5fa13047d72f4caffb2d35e5cab53','acryl']
]);
const sha=s=>createHash('sha256').update(s).digest('hex');
function replaceOnce(source,before,after){
  if(source.split(before).length!==2)throw Error('Preview price patch anchor differs');
  return source.replace(before,after);
}

export function patchPreviewPrice(source){
  const kind=sources.get(sha(source));
  if(!kind)throw Error('Unreviewed editor source: compare changes before applying');
  let next="import {commercePrice} from './commerce-model.mjs';\n"+source;
  next=replaceOnce(next,
    'const q=quote(config,el.state.objects,el.state.designId,el.state.mOptions,quantity);total=q.totalCents+extra.totalCents;',
    'const q=commercePrice(config,el.state,quantity);total=q.totalCents;');
  next=replaceOnce(next,
    kind==='legacy'?'options=q.unitCents-base-motifs;':'options=(q.listUnitCents??q.unitCents)-base-motifs;',
    'options=(q.listUnitCents??q.unitCents)-extra.unitCents-base-motifs;');
  if(kind==='legacy'){
    next=replaceOnce(next,'let total,base,options=0,motifs=0;','let total,base,options=0,motifs=0,tierLine=\'\';');
    next=replaceOnce(next,
      'options=(q.listUnitCents??q.unitCents)-extra.unitCents-base-motifs;}',
      'options=(q.listUnitCents??q.unitCents)-extra.unitCents-base-motifs;if(q.quantityTier)tierLine=`<p>Mengenstaffel ab ${q.quantityTier.minQuantity} Stück: −${money(q.quantityTierDiscountCents)} je Stück</p>`;}');
    next=replaceOnce(next,'${money(extra.unitCents)}</p><p>Menge:','${money(extra.unitCents)}</p>${tierLine}<p>Menge:');
  }
  return next;
}

export function patchPreviewPhotoLimit(source){
  if(!['96d7c897080a0c3fed63cea32661a5452a3afdcb2fcfe10b4c9cf1ca6c6a07c0','8b4edfca04ddbf5cfe724d8fcae9064bef21fad1d924d8bbc717cce26201f5c4'].includes(sha(source)))throw Error('Unreviewed photo upload source');
  let next=replaceOnce(source,
    "if(image.naturalWidth*image.naturalHeight>40_000_000)throw Error('Bitte ein Bild mit höchstens 40 Megapixeln wählen.');",
    '');
  return next; // Customer limit: 15 MB, enforced by the existing validateUpload.
}
