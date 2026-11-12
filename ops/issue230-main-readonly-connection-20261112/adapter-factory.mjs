// Additive operator connection. Only local code/files are opened here.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {openScopedReadonlyTarget} from './readonly-target.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
export async function createMainProductionReadonlyAdapterFactory({codeRoot,operatorRoot,workshopFilename,profilesFilename,clock=Date.now}){
 const pins=JSON.parse(fs.readFileSync(new URL('./source-pins.json',import.meta.url)));
 for(const [file,hash] of Object.entries(pins.native))need(sha(fs.readFileSync(path.resolve(codeRoot,file)))===hash,'main_readonly_native_source_changed');
 for(const [file,hash] of Object.entries(pins.operator))need(sha(fs.readFileSync(path.resolve(operatorRoot,file)))===hash,'main_readonly_operator_source_changed');
 const load=(root,file)=>import(pathToFileURL(path.resolve(root,file)).href);
 const [{POLICY,loadPinnedMapping},{createMainReadOnlyGateway},adapter,store,catalog,production]=await Promise.all([
  load(operatorRoot,'main-operator.mjs'),load(operatorRoot,'gateways.mjs'),load(codeRoot,'app/workshop/shop-product-binding-adapter.mjs'),load(codeRoot,'app/workshop/shop-product-binding-store.mjs'),load(codeRoot,'app/workshop/catalog-live-orders.mjs'),load(codeRoot,'app/workshop/production-profiles.mjs')]);
 const mapping=loadPinnedMapping(path.resolve(operatorRoot,'variant-mapping.preview.json.gz'));
 const expected={tenantId:POLICY.tenantId,storeId:POLICY.storeId,shopDomain:POLICY.shopDomain,productId:POLICY.productId,shopifyProductId:POLICY.shopifyProductId,shopifyVariantIds:[...mapping.matches,...mapping.residual].map(v=>v.id),documentSha256:{1:POLICY.beforeDocumentSha256,2:POLICY.targetDocumentSha256},revision2MetadataSha256:POLICY.targetMetadataSha256};
 const native={...adapter,...store,...catalog,productionSubject:production.productionSubject,profileBlockers:production.profileBlockers};
 return async function adapterFactory({readOnly,mode}){
  need(readOnly===true&&['plan','reconcile'].includes(mode),'main_readonly_mode');
  const target=openScopedReadonlyTarget({workshopFilename,profilesFilename,expected,native,clock});
  try{return Object.freeze({workshop:target.workshop,registry:target.registry,native:createMainReadOnlyGateway(target),canWrite:false,close:target.close});}catch(error){target.close();throw error;}
 };
}
