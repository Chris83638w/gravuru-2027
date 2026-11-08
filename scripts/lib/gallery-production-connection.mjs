import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {prepareShopProduct} from '../../app/workshop/shop-preparation.mjs';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
import {capturePersonalization} from '../../app/workshop/cart-personalization.mjs';
import {expandPricingVariants,resolvedPricingHistory} from '../../ops/shopify/master-release/pricing-history.mjs';
import {createGalleryProductionShopifyRead} from './gallery-production-shopify-read.mjs';

const fail=code=>{throw Object.assign(Error('Der private Modulanschluss ist noch nicht vollständig bestätigt.'),{code,status:409});};
const clone=structuredClone;
const positive=n=>Number.isSafeInteger(n)&&n>0;
const productGid=id=>/^gid:\/\/shopify\/Product\/[1-9]\d{0,19}$/.test(id||'');
const variantGid=id=>/^gid:\/\/shopify\/ProductVariant\/[1-9]\d{0,19}$/.test(id||'');
const pin=value=>/^[a-f0-9]{64}$/.test(value||'');
const preflights=new WeakMap();
function sync(fn,...args){const value=fn(...args);if(value?.then)fail('module_connection_async_reader');return value;}

/** An operator-owned explicit mapping, not a catalogue alias. The current
 * source gallery registry remains solely responsible for its actual groups. */
export function moduleOnlyProductionMapping({id,label,targetRecord,shopifyProductId,shopifyVariantIds,moduleUpdate}={}){
 if(typeof id!=='string'||!id||typeof label!=='string'||!label||!targetRecord?.id||!productGid(shopifyProductId)||!Array.isArray(shopifyVariantIds)||!shopifyVariantIds.length||shopifyVariantIds.some(v=>!variantGid(v))||new Set(shopifyVariantIds).size!==shopifyVariantIds.length||
   !moduleUpdate||Object.keys(moduleUpdate).some(k=>!['id','revision','sourceRevision'].includes(k))||typeof moduleUpdate.id!=='string'||!moduleUpdate.id||!positive(moduleUpdate.revision)||!positive(moduleUpdate.sourceRevision))fail('module_connection_mapping');
 const designId=targetRecord.document?.config?.profile?.defaultDesignId;
 if(!targetRecord.document.config.profile.designs.some(d=>d.id===designId))fail('module_connection_start_design');
 return {id,label,kind:'module-profile',target:{productId:targetRecord.id,designId},shopifyProductId,shopifyVariantIds:[...shopifyVariantIds],moduleUpdate:clone(moduleUpdate),mediaRequired:false};
}

/** No SQLite constructor, journal, schema writes or mutations. readBindings
 * must be the existing native registry's resolveMany; readApprovals the native
 * batch approval reader. Their owner controls the readonly connection. */
export function createProductionModulePreflight({targetWorkshop,readBindings,readApprovals,shopify,expected,clock=Date.now}={}){
 if(!targetWorkshop?.repository?.get||typeof targetWorkshop.orderIntake?.bindingPricing!=='function'||typeof readBindings!=='function'||typeof readApprovals!=='function'||typeof clock!=='function'||!expected||
  targetWorkshop.tenantId!==expected.tenantId||targetWorkshop.repository.tenantId!==expected.tenantId||targetWorkshop.sessionContext?.shopDomain&&targetWorkshop.sessionContext.shopDomain!==expected.shopDomain||
  !pin(expected.documentSha256)||!positive(expected.revision)||!productGid(expected.shopifyProductId)||!Array.isArray(expected.shopifyVariantIds)||new Set(expected.shopifyVariantIds).size!==expected.variantCount||expected.shopifyVariantIds.some(v=>!variantGid(v))||
  !Array.isArray(expected.originalIds)||new Set(expected.originalIds).size!==expected.originalCount||!positive(expected.sizeCount)||shopify?.shopDomain!==expected.shopDomain)fail('module_connection_scope');
 const target=clone(expected),remote=createGalleryProductionShopifyRead({...shopify,clock});
 const pairs=target.shopifyVariantIds.map(shopifyVariantId=>({shopifyProductId:target.shopifyProductId,shopifyVariantId}));
 function capture(){
  const record=sync(targetWorkshop.repository.get.bind(targetWorkshop.repository),target.productId);
  if(record.id!==target.productId||record.revision!==target.revision||record.status==='archived'||record.document.kind!=='product'||syncHash(record.document)!==target.documentSha256)fail('module_connection_target_changed');
  const family=record.document.config.familyFormats;
  const originalIds=family?.designs?.map(d=>d.katalog?.designId);
  if(!family||family.formats?.length!==target.sizeCount||originalIds.length!==target.originalCount||new Set(originalIds).size!==originalIds.length||!isDeepStrictEqual([...originalIds].sort(),[...target.originalIds].sort()))fail('module_connection_bank_coverage');
  const prepared=prepareShopProduct(record);
  if(!prepared.sourceReady||prepared.variants.length!==target.variantCount)fail('module_connection_native_preparation');
  const heads=sync(readBindings,clone(pairs));
  if(!Array.isArray(heads)||heads.length!==target.variantCount||new Set(heads.map(h=>h.shopifyVariantId)).size!==target.variantCount||heads.some(h=>h.tenantId!==target.tenantId||h.storeId!==target.storeId||h.shopDomain!==target.shopDomain||h.shopifyProductId!==target.shopifyProductId||h.productId!==target.productId||h.productRevision!==target.revision||h.documentSha256!==target.documentSha256||!positive(h.assignmentRevision)||!h.bindingId||!target.shopifyVariantIds.includes(h.shopifyVariantId)))fail('module_connection_binding_identity');
  const options=new Map(prepared.variants.map(v=>[syncHash(v.options),v.priceCents]));
  if(new Set(heads.map(h=>syncHash(h.options))).size!==target.variantCount||heads.some(h=>options.get(syncHash(h.options))!==h.unitCents))fail('module_connection_options_prices');
  const approvals=sync(readApprovals,heads.map(h=>({shopDomain:target.shopDomain,shopifyProductId:target.shopifyProductId,shopifyVariantId:h.shopifyVariantId,productId:h.productId,productRevision:h.productRevision})));
  if(!Array.isArray(approvals)||approvals.length!==target.variantCount||approvals.some(a=>!a))fail('module_connection_catalog_approval');
  const contracts=heads.map(h=>sync(targetWorkshop.orderIntake.bindingPricing.bind(targetWorkshop.orderIntake),h.bindingId));
  if(contracts.some(contract=>!contract||typeof contract!=='object'||Array.isArray(contract)))fail('module_connection_native_pricing_missing');
  const evidence={record:{id:record.id,revision:record.revision,status:record.status,documentSha256:target.documentSha256,metadataSha256:syncHash(record.metadata||{})},heads:heads.map((h,i)=>({shopifyVariantId:h.shopifyVariantId,assignmentRevision:h.assignmentRevision,bindingId:h.bindingId,productRevision:h.productRevision,options:h.options,unitCents:h.unitCents,productionStatus:h.productionStatus??null,personalization:clone(contracts[i])})).sort((a,b)=>a.shopifyVariantId.localeCompare(b.shopifyVariantId)),approvals:approvals.map(Boolean)};
  return {record,prepared,heads:clone(heads),contracts:clone(contracts),evidence,fingerprint:syncHash(evidence)};
 }
 async function run(){
  const before=capture(),remoteEvidence=await remote.transport.inspect({shopifyProductId:target.shopifyProductId}),after=capture();
  if(before.fingerprint!==after.fingerprint)fail('module_connection_source_changed');
  if(Math.abs(clock()-Date.parse(remoteEvidence.readAt))>60000)fail('module_connection_remote_stale');
  if(remoteEvidence.variants.length!==target.variantCount||new Set(remoteEvidence.variants.map(v=>v.id)).size!==target.variantCount)fail('module_connection_remote_coverage');
  const prices=new Map(remoteEvidence.variants.map(v=>[v.id,v.priceCents]));
  if(after.heads.some(h=>prices.get(h.shopifyVariantId)!==h.unitCents))fail('module_connection_remote_price');
  const raw=remoteEvidence.commerce.personalizationPricing;
  let pricing,history;try{history=resolvedPricingHistory(raw);pricing=expandPricingVariants(raw);}catch{fail('module_connection_pricing_history');}
  if(pricing?.productId!==target.shopifyProductId)fail('module_connection_pricing_identity');
  for(const [index,head] of after.heads.entries()){
   const args={variantId:head.shopifyVariantId.split('/').at(-1),baseCents:head.unitCents,document:after.record.document};
   capturePersonalization(pricing,args);
   const saved=after.contracts[index],sameRevision=[pricing,...history].find(p=>String(p.revision)===saved.revision);
   if(!sameRevision||!isDeepStrictEqual(saved,capturePersonalization(sameRevision,args)))fail('module_connection_native_pricing_changed');
  }
  return {schema:'gravuru-production-module-preflight/v1',readOnly:true,shopifyWrites:0,nativeWrites:0,designSyncEnabled:false,tenantId:target.tenantId,shopDomain:target.shopDomain,productId:target.productId,productRevision:target.revision,shopifyProductId:target.shopifyProductId,
   counts:{originals:target.originalCount,sizes:target.sizeCount,bindings:target.variantCount},documentSha256:target.documentSha256,startDesignId:after.record.document.config.profile.defaultDesignId,
   nativeFingerprint:after.fingerprint,remoteReadAt:remoteEvidence.readAt,remoteCommerceSha256:syncHash(remoteEvidence.commerce),pricingRevision:pricing.revision,pricingHistoryRevisions:(raw.history||[]).map(p=>p.revision),checkedAt:new Date(clock()).toISOString()};
 }
 const api=Object.freeze({run,capture,graphql:remote.graphql,get expected(){return clone(target);},canWrite:false});
 preflights.set(api,{targetWorkshop});return api;
}

/** Explicit private host factory. Mounting is separate from the readonly
 * preflight and may create the existing management's own private journal.
 * This initial production connection deliberately keeps both write gates off.
 * Actual target/source workshops are caller-owned, never constructed here. */
export async function createProductionModuleManagementConfig({preflight,createHost,targetWorkshop,mappingId,label,moduleUpdate,journalFilename,clock=Date.now}={}){
 if(!preflights.has(preflight)||preflights.get(preflight).targetWorkshop!==targetWorkshop||typeof createHost!=='function'||!path.isAbsolute(journalFilename||'')||path.extname(journalFilename)!=='.sqlite')fail('module_connection_host_config');
 const proof=await preflight.run();
 const current=preflight.capture();
 const mapping=moduleOnlyProductionMapping({id:mappingId,label,targetRecord:current.record,shopifyProductId:preflight.expected.shopifyProductId,shopifyVariantIds:preflight.expected.shopifyVariantIds,moduleUpdate});
 let profilePin=null;
 return {connect(context){
  if(Math.abs(clock()-Date.parse(proof.checkedAt))>60000||preflight.capture().fingerprint!==proof.nativeFingerprint)fail('module_connection_preflight_expired');
  if(!context?.sourceWorkshop||context.sourceWorkshop.tenantId!==preflight.expected.tenantId||!context.sourceRegistry||typeof context.sourceRegistry.targets!=='function'||typeof context.sourceApproval!=='function')fail('module_connection_source_registry');
  if(typeof context.sourceWorkshop.configureModuleManagement!=='function')fail('module_connection_source_registry');
  // Only register after the actual host has supplied its original registry.
  // This is the same service that createHost subsequently obtains, never a
  // separately constructed/default native-products profile store.
  const management=context.sourceWorkshop.configureModuleManagement({filename:context.filename,sourceRegistry:context.sourceRegistry});
  const profile=management.profiles.get(moduleUpdate.id);
  if(profile.id!==moduleUpdate.id||profile.revision!==moduleUpdate.revision||!pin(profile.sha256)||profilePin&&profilePin!==profile.sha256)fail('module_connection_profile_changed');
  profilePin=profile.sha256;
  // Pass the host's original context/registry unaltered. No staged registry,
  // catalogue alias, artwork mapping, import or source activation is supplied.
  return createHost({...context,targetWorkshop,shopDomain:preflight.expected.shopDomain,journalFilename,targets:[clone(mapping)],graphql:preflight.graphql,executionEnabled:false,writesEnabled:false,clock});
 }};
}

/** The production library exposes the ACTUAL saved profiles as separate
 * choices for one fixed target. No fabricated profile IDs or source aliases.
 * An empty library stays empty until the merchant creates a profile there.
 * The existing engine disallows choosing the same target twice in one plan. */
export async function createProductionModuleLibraryConfig({preflight,createHost,targetWorkshop,journalFilename,sourceRevision,label='Edelstahl-Türschilder',clock=Date.now}={}){
 if(!preflights.has(preflight)||preflights.get(preflight).targetWorkshop!==targetWorkshop||typeof createHost!=='function'||!path.isAbsolute(journalFilename||'')||path.extname(journalFilename)!=='.sqlite'||sourceRevision!==preflight.expected.revision)fail('module_connection_host_config');
 const proof=await preflight.run();
 return {connect(context){
  if(Math.abs(clock()-Date.parse(proof.checkedAt))>60000||preflight.capture().fingerprint!==proof.nativeFingerprint)fail('module_connection_preflight_expired');
  if(context?.sourceWorkshop?.tenantId!==preflight.expected.tenantId||typeof context.sourceWorkshop.configureModuleManagement!=='function'||typeof context.sourceRegistry?.targets!=='function'||typeof context.sourceApproval!=='function')fail('module_connection_source_registry');
  const management=context.sourceWorkshop.configureModuleManagement({filename:context.filename,sourceRegistry:context.sourceRegistry});
  const targets=()=>{
   const current=preflight.capture();
   return management.profiles.list().map(profile=>moduleOnlyProductionMapping({id:`module-profile:${current.record.id}:${profile.id}`,label:`${label} · ${profile.document.name}`,targetRecord:current.record,
    shopifyProductId:preflight.expected.shopifyProductId,shopifyVariantIds:preflight.expected.shopifyVariantIds,moduleUpdate:{id:profile.id,revision:profile.revision,sourceRevision}}));
  };
  return createHost({...context,targetWorkshop,shopDomain:preflight.expected.shopDomain,journalFilename,targets,graphql:preflight.graphql,executionEnabled:false,writesEnabled:false,clock});
 }};
}
