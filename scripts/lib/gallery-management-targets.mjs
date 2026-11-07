import {createHash} from 'node:crypto';
// The approved import map supplies physical identity; the native design carries
// the explicit catalogue family. No inference from SKU/name/material prefixes.
export function galleryProductGroupSources(workshop,targets){
 const groups=new Map(),families=new Map();
 for(const t of targets){
  if(!t.productId||!t.productKey||!t.sizeKey)continue;
  // A gallery has many design targets per physical product. Parse each native
  // document once per invocation and retain only its explicit family lookup.
  // A later call rereads the repository; no revision/material cache survives.
  if(!families.has(t.productId)){
   const record=workshop.repository.get(t.productId),index=new Map();
   for(const design of record.document.config?.profile?.designs||[])if(!index.has(design.id))index.set(design.id,design.katalog?.target?.familyId??null);
   families.set(t.productId,index);
  }
  const familyId=families.get(t.productId).get(t.designId)??null;
  const entry={key:'source-'+createHash('sha256').update(JSON.stringify([t.productKey,t.productId])).digest('hex').slice(0,24),productId:t.productId,familyId,sizeKey:t.sizeKey};
  const old=groups.get(t.productId);
  if(old&&(old.familyId!==entry.familyId||old.sizeKey!==entry.sizeKey||old.key!==entry.key))throw Error('Ambiguous product group source');
  groups.set(t.productId,entry);
 }
 return [...groups.values()];
}
