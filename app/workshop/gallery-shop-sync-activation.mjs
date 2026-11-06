import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {planShopProductBindings} from './shop-product-binding-plan.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {syncFail,syncHash} from './gallery-shop-sync-native.mjs';

// Server factory only. Transaction ownership stays with the real orderIntake
// instance, including when createWorkshop intentionally hides its connection.
export function createGallerySyncActivation({workshop,tenantId,shopDomain,storeId='acryl',clock=Date.now}={}){
 if(!workshop||workshop.tenantId!==tenantId||workshop.repository?.tenantId!==tenantId||workshop.orderIntake?.tenantId!==tenantId||typeof workshop.orderIntake.withBindingTransaction!=='function'||storeId!=='acryl'||workshop.sessionContext?.shopDomain&&workshop.sessionContext.shopDomain!==shopDomain)
  syncFail('gallery_sync_activation_scope','Der vorhandene Katalog-/Bindungsspeicher muss ausdrücklich zum Mandanten und Shop gehören.',422);
 const host={...workshop,sessionContext:{shopDomain}},adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop:host,productionProfileScope:{storeId,tenantId}});
 const registry=workshop.orderIntake.idBindings({storeId,shopDomain,adapter});
 function capture(target){
  const heads=target.shopifyVariantIds.map(shopifyVariantId=>registry.resolve({shopifyProductId:target.shopifyProductId,shopifyVariantId}));
  if(!heads.length||heads.some(h=>h.productId!==target.target.productId||h.shopDomain!==shopDomain||h.storeId!==storeId))syncFail('gallery_sync_binding','Die bestehende Shopzuordnung gehört nicht zu diesem Ziel.');
  const revisions=new Set(heads.map(h=>h.productRevision));if(revisions.size!==1)syncFail('gallery_sync_binding','Die Varianten verweisen auf unterschiedliche Konfi-Stände.');
  const boundRevision=heads[0].productRevision,record=workshop.repository.get(target.target.productId,{revision:boundRevision});
  const prepared=prepareShopProduct(record),keys=heads.map(h=>syncHash(h.options));
  if(keys.length!==new Set(keys).size||prepared.variants.length!==heads.length||prepared.variants.some(v=>!heads.some(h=>syncHash(h.options)===syncHash(v.options)&&h.unitCents===v.priceCents)))
   syncFail('gallery_sync_binding_coverage','Die ausdrückliche Zuordnung muss alle bisherigen Ausführungen genau einmal enthalten.');
  const approved=heads.every(h=>workshop.orderIntake.catalogLiveApproval({shopDomain,shopifyProductId:target.shopifyProductId,shopifyVariantId:h.shopifyVariantId,productId:h.productId,productRevision:h.productRevision}));
  return {boundRevision,approved,heads:heads.map(h=>({shopifyVariantId:h.shopifyVariantId,assignmentRevision:h.assignmentRevision,bindingId:h.bindingId,productRevision:h.productRevision,options:h.options,unitCents:h.unitCents}))};
 }
 function activate({entries,operationId}){
  return workshop.orderIntake.withBindingTransaction(()=>{
   for(const entry of entries){
    const record=workshop.repository.get(entry.mapping.target.productId);
    if(record.revision!==entry.newRevision||syncHash(record.document)!==entry.documentSha256)syncFail('gallery_sync_target_changed','Der Zielentwurf wurde zwischenzeitlich geändert.');
    const actual=capture(entry.mapping),already=actual.boundRevision===entry.newRevision;
    if(!already&&syncHash(actual)!==syncHash(entry.binding))syncFail('gallery_sync_binding_changed','Die Shopzuordnung wurde seit der Vorschau geändert.');
    const remote=entry.remote;
    if(remote.shopDomain!==shopDomain||remote.id!==entry.mapping.shopifyProductId||!Number.isFinite(Date.parse(remote.readAt))||Math.abs(clock()-Date.parse(remote.readAt))>60000)
     syncFail('gallery_sync_remote_stale','Der Shopify-Prüfbeleg ist nicht mehr aktuell.');
    if(already)continue;
    const selections=entry.binding.heads.map(h=>({shopifyProductId:entry.mapping.shopifyProductId,shopifyVariantId:h.shopifyVariantId,productId:record.id,productRevision:record.revision,options:h.options}));
    const plan=planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now:clock(),maxEvidenceAgeMs:60000,selections,
     shopifyEvidence:{tenantId,shopDomain,readAt:remote.readAt,complete:true,products:[{id:remote.id,variants:remote.variants.map(v=>({id:v.id,productId:remote.id,priceCents:v.priceCents}))}]}});
    registry.persist({plan,expectedHeads:entry.binding.heads.map(h=>({shopifyVariantId:h.shopifyVariantId,revision:h.assignmentRevision}))});
   }
   const pending=entries.filter(e=>!capture(e.mapping).approved);
   const result=pending.length?workshop.orderIntake.approveCatalogLiveProducts({shopDomain,approvalId:operationId,registry,products:pending.map(e=>({productId:e.mapping.target.productId,productRevision:e.newRevision,shopifyProductId:e.mapping.shopifyProductId}))}):{created:0,products:entries.length};
   return result;
  });
 }
 return Object.freeze({tenantId,shopDomain,storeId,capture,activate});
}
