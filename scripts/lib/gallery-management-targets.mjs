import {createHash} from 'node:crypto';
// The approved import map supplies physical identity; the native design carries
// the explicit catalogue family. No inference from SKU/name/material prefixes.
const sourceKey=t=>'source-'+createHash('sha256').update(JSON.stringify([t.productKey,t.productId])).digest('hex').slice(0,24);
// Display metadata only. Missing legacy family metadata stays unresolved until
// the chosen source is read; this list never authorizes a family or a draft.
export function galleryProductGroupSourceSummaries(targets){
 const groups=new Map();
 for(const t of targets){
  if(!t.productId||!t.productKey||!t.sizeKey)continue;
  const entry={key:sourceKey(t),productId:t.productId,familyId:t.familyId||null,sizeKey:t.sizeKey,
   name:[t.material,t.format,t.productKey].filter(Boolean).join(' · '),label:t.productKey,
   material:{kind:t.materialKind,label:t.material},geometry:Array.isArray(t.mm)?{width:t.mm[0],height:t.mm[1]}:null,detailsLoaded:false};
  const old=groups.get(t.productId);
  if(old&&(old.key!==entry.key||old.sizeKey!==entry.sizeKey||old.familyId!==entry.familyId))throw Error('Ambiguous product group source');
  groups.set(t.productId,entry);
 }
 return [...groups.values()];
}
export function galleryProductGroupSources(workshop,targets,{onRecord,sourceKeys}={}){
 const selected=sourceKeys&&new Set(sourceKeys);
 const groups=new Map(),byProduct=new Map();
 for(const t of targets){
  if(!t.productId||!t.productKey||!t.sizeKey||selected&&!selected.has(sourceKey(t)))continue;
  if(!byProduct.has(t.productId))byProduct.set(t.productId,[]);
  byProduct.get(t.productId).push(t);
 }
 for(const [productId,rows] of byProduct){
  const record=workshop.repository.get(productId),designs=new Map((record.document.config?.profile?.designs||[]).map(d=>[d.id,d]));
  for(const t of rows){
  const design=designs.get(t.designId);
  const familyId=design?.katalog?.target?.familyId??null;
  const entry={key:sourceKey(t),productId:t.productId,familyId,sizeKey:t.sizeKey};
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
