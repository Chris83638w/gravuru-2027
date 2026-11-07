import {createHash} from 'node:crypto';
// The approved import map supplies physical identity; the native design carries
// the explicit catalogue family. No inference from SKU/name/material prefixes.
export function galleryProductGroupSources(workshop,targets,{onRecord}={}){
 const groups=new Map(),byProduct=new Map();
 for(const t of targets){
  if(!t.productId||!t.productKey||!t.sizeKey)continue;
  if(!byProduct.has(t.productId))byProduct.set(t.productId,[]);
  byProduct.get(t.productId).push(t);
 }
 for(const [productId,rows] of byProduct){
  const record=workshop.repository.get(productId),designs=new Map((record.document.config?.profile?.designs||[]).map(d=>[d.id,d]));
  for(const t of rows){
  const design=designs.get(t.designId);
  const familyId=design?.katalog?.target?.familyId??null;
  const entry={key:'source-'+createHash('sha256').update(JSON.stringify([t.productKey,t.productId])).digest('hex').slice(0,24),productId:t.productId,familyId,sizeKey:t.sizeKey};
  const old=groups.get(t.productId);
  if(old&&(old.familyId!==entry.familyId||old.sizeKey!==entry.sizeKey||old.key!==entry.key))throw Error('Ambiguous product group source');
  groups.set(t.productId,entry);
  }
  // Consume while this one document is resident. Never keep all native fonts
  // and designs merely to build the small management source list.
  onRecord?.(groups.get(productId),record);
 }
 return [...groups.values()];
}
