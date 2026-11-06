import fs from 'node:fs';
import path from 'node:path';

// Explicit server-owned review registrations; never create catalog products or
// trust a client-supplied product group. Review traffic stays outside shop totals.
export function motifSearchPreviewGroup(filename,tenantId,productId){
 if(filename===':memory:'||typeof productId!=='string'||!/^cfg_[a-f0-9-]{36}$/.test(productId))return null;
 const file=path.join(path.dirname(filename),'motif-search-previews.json');
 try{
  if(fs.statSync(file).size>65536)return null;
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(data.schema!=='gravuru-motif-search-previews/v1')return null;
  const group=data.tenants?.[tenantId]?.[productId];
  return typeof group==='string'&&group.length>0&&group.length<=160?group:null;
 }catch{return null;}
}
