import {createHash} from 'node:crypto';
// The approved import map supplies physical identity; the native design carries
// the explicit catalogue family. No inference from SKU/name/material prefixes.
export function galleryProductGroupSources(workshop,targets){
 const groups=new Map();
 for(const t of targets){
  if(!t.productId||!t.productKey||!t.sizeKey)continue;
  const record=workshop.repository.get(t.productId),design=record.document.config?.profile?.designs?.find(d=>d.id===t.designId);
  const familyId=design?.katalog?.target?.familyId??null;
  const entry={key:'source-'+createHash('sha256').update(JSON.stringify([t.productKey,t.productId])).digest('hex').slice(0,24),productId:t.productId,familyId,sizeKey:t.sizeKey};
  const old=groups.get(t.productId);
  if(old&&(old.familyId!==entry.familyId||old.sizeKey!==entry.sizeKey||old.key!==entry.key))throw Error('Ambiguous product group source');
  groups.set(t.productId,entry);
 }
 return [...groups.values()];
}
