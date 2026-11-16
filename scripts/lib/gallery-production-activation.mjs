import path from 'node:path';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
import {createGalleryManagementHandler} from './gallery-management-http.mjs';
import {createGalleryModuleManagementHost} from './gallery-module-management-host.mjs';
import {openProductionModuleTarget} from './gallery-production-module-target.mjs';
import {createProductionModulePreflight,moduleOnlyProductionMapping} from './gallery-production-connection.mjs';
import {createGalleryProductionShopifyRelease} from './gallery-production-shopify-read.mjs';

const fail=code=>{throw Object.assign(Error('Der produktive Modulanschluss ist nicht vollständig freigegeben.'),{code,status:409});};
const copy=structuredClone;

/** The capability snapshot stays fixed (steel: r4). The current head and active
 * binding revision are deliberately separate: an interrupted, journalled append
 * is not a changed capability source. Existing engine/CAS owns its recovery. */
export function createProductionModuleActivationPreflight({target,expected,shopify,clock=Date.now}={}){
 function native(){
  const workshop=target.targetWorkshop,capability=workshop.repository.get(expected.productId,{revision:expected.revision});
  if(syncHash(capability.document)!==expected.documentSha256)fail('module_activation_capability_changed');
  const head=workshop.repository.get(expected.productId);target.assertDocument(head.document);
  if(head.revision<expected.revision)fail('module_activation_head_changed');
  const heads=target.readBindings(expected.shopifyVariantIds.map(shopifyVariantId=>({shopifyProductId:expected.shopifyProductId,shopifyVariantId})));
  if(heads.length!==expected.variantCount||new Set(heads.map(h=>h.productRevision)).size!==1)fail('module_activation_binding_revision');
  const bound=workshop.repository.get(expected.productId,{revision:heads[0].productRevision});target.assertDocument(bound.document);
  if(bound.revision<expected.revision||bound.revision>head.revision)fail('module_activation_binding_revision');
  // Pin the active revision for the existing full native/404/price/history
  // preflight. It still observes current binding heads on every capture.
  const boundWorkshop={...workshop,repository:{...workshop.repository,get(id,options){return workshop.repository.get(id,options?.revision!==undefined?options:{revision:bound.revision});}}};
  const preflight=createProductionModulePreflight({targetWorkshop:boundWorkshop,readBindings:target.readBindings,readApprovals:target.readApprovals,
   shopify,expected:{...expected,revision:bound.revision,documentSha256:syncHash(bound.document)},clock});
  const fingerprint=syncHash({head:{revision:head.revision,document:syncHash(head.document),metadata:head.metadata},bound:preflight.capture().fingerprint,capability:expected.documentSha256});
  return {preflight,head,bound,fingerprint};
 }
 return Object.freeze({async run(){const before=native(),proof=await before.preflight.run(),after=native();if(before.fingerprint!==after.fingerprint)fail('module_activation_preflight_changed');return {...proof,capabilityRevision:expected.revision,headRevision:after.head.revision,boundRevision:after.bound.revision,nativeFingerprint:after.fingerprint};}});
}

/** Server-selected alternative to the installed read-only factory. Both gates
 * default OFF. It mounts the SAME registry, module library, handler and journal;
 * no source catalogue activation and no customer route/layout is introduced. */
export function createProductionModuleActivationConfig({targetFilename,expected,shopify,allowedProfileIds,journalFilename,
 executionEnabled=false,writesEnabled=false,clock=Date.now}={}){
 if(typeof executionEnabled!=='boolean'||typeof writesEnabled!=='boolean'||!path.isAbsolute(journalFilename||'')||!path.isAbsolute(targetFilename||'')||
  path.resolve(journalFilename)===path.resolve(targetFilename)||shopify?.shopDomain!==expected?.shopDomain||!Array.isArray(allowedProfileIds)||!allowedProfileIds.length||new Set(allowedProfileIds).size!==allowedProfileIds.length)fail('module_activation_configuration');
 const scope=copy(expected),allowed=[...allowedProfileIds];let mounted=false;
 return {connect(context){
  if(mounted||context.sourceWorkshop?.tenantId!==scope.tenantId||typeof context.sourceWorkshop.configureModuleManagement!=='function'||!context.sourceRegistry||typeof context.sourceApproval!=='function')fail('module_activation_registry');
  const management=context.sourceWorkshop.configureModuleManagement({filename:context.filename,sourceRegistry:context.sourceRegistry});
  for(const id of allowed)management.profiles.get(id);
  const enabled=executionEnabled&&writesEnabled,target=openProductionModuleTarget({filename:targetFilename,expected:scope,moduleProfiles:management.profiles,allowedProfileIds:allowed,writeEnabled:enabled,clock});
  let host;
  try{
   const capability=target.capability;
   // Stable target identity and capability revision. Current target state is
   // read freshly by the native plan, confirmation, journal and activation.
   const targets=()=>allowed.map(id=>{const profile=management.profiles.get(id);return moduleOnlyProductionMapping({id:`module-profile:${scope.productId}:${id}`,label:`Edelstahl-Türschilder · ${profile.document.name}`,targetRecord:capability,
    shopifyProductId:scope.shopifyProductId,shopifyVariantIds:scope.shopifyVariantIds,moduleUpdate:{id,revision:profile.revision,sourceRevision:scope.revision}});});
   const remote=createGalleryProductionShopifyRelease({...shopify,expected:scope,allowedProfileIds:allowed,writesEnabled,clock});
   host=createGalleryModuleManagementHost({...context,targetWorkshop:target.targetWorkshop,targets,shopDomain:scope.shopDomain,journalFilename,graphql:remote.graphql,executionEnabled,writesEnabled,clock});
   const preflight=createProductionModuleActivationPreflight({target,expected:scope,shopify,clock});
   const synchronizer={...host.synchronizer};
   for(const method of ['plan','execute','reconcile'])synchronizer[method]=async input=>{await preflight.run();return host.synchronizer[method](input);};
   const handle=createGalleryManagementHandler({workshop:context.sourceWorkshop,templates:management.groups,synchronizer,csrfToken:context.csrfToken});
   mounted=true;let closed=false;
   return Object.freeze({...host,synchronizer:Object.freeze(synchronizer),handle,preflight,targetWorkshop:target.targetWorkshop,
    close(){if(!closed){closed=true;try{host.close();}finally{target.close();}}}});
  }catch(error){host?.close();target.close();throw error;}
 }};
}
