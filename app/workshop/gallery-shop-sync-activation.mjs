import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {planShopProductBindings} from './shop-product-binding-plan.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {syncFail,syncHash} from './gallery-shop-sync-native.mjs';
import {capturePersonalization} from './cart-personalization.mjs';
import {expandPricingVariants,resolvedPricingHistory} from '../../ops/shopify/master-release/pricing-history.mjs';

// Server factory only. Transaction ownership stays with the real orderIntake
// instance, including when createWorkshop intentionally hides its connection.
export function createGallerySyncActivation({workshop,tenantId,shopDomain,storeId='acryl',personalizationPricingFor,clock=Date.now,approvalMode='approve'}={}){
 if(!workshop||workshop.tenantId!==tenantId||workshop.repository?.tenantId!==tenantId||workshop.orderIntake?.tenantId!==tenantId||typeof workshop.orderIntake.withBindingTransaction!=='function'||storeId!=='acryl'||workshop.sessionContext?.shopDomain&&workshop.sessionContext.shopDomain!==shopDomain)
  syncFail('gallery_sync_activation_scope','Der vorhandene Katalog-/Bindungsspeicher muss ausdrücklich zum Mandanten und Shop gehören.',422);
 if(!['approve','preserve'].includes(approvalMode))syncFail('gallery_sync_approval_mode','Unbekannter Freigabeauftrag.',422);
 const host={...workshop,sessionContext:{shopDomain}},adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop:host,productionProfileScope:{storeId,tenantId}});
 let activePricing=null;
 const registry=workshop.orderIntake.idBindings({storeId,shopDomain,adapter,personalizationPricingFor:entry=>{
  const assigned=activePricing?.variants.find(v=>v.id===entry.shopifyVariantId),contract=activePricing?.contracts.find(c=>c.sha256===assigned?.sha256);
  return contract?.pricing;
 }});
 // capture is also used while the repository holds its product write lock on
 // another connection. Use the existing read-only registry so this comparison
 // never requests a second BEGIN IMMEDIATE lock on the same database.
 const readRegistry=workshop.orderIntake.idBindings({storeId,shopDomain,adapter,readOnly:true});
 function capture(target){
  const heads=readRegistry.resolveMany(target.shopifyVariantIds.map(shopifyVariantId=>({shopifyProductId:target.shopifyProductId,shopifyVariantId})));
  if(!heads.length||heads.some(h=>h.productId!==target.target.productId||h.shopDomain!==shopDomain||h.storeId!==storeId))syncFail('gallery_sync_binding','Die bestehende Shopzuordnung gehört nicht zu diesem Ziel.');
  const revisions=new Set(heads.map(h=>h.productRevision));if(revisions.size!==1)syncFail('gallery_sync_binding','Die Varianten verweisen auf unterschiedliche Konfi-Stände.');
  const boundRevision=heads[0].productRevision,record=workshop.repository.get(target.target.productId,{revision:boundRevision});
  const prepared=prepareShopProduct(record),keys=heads.map(h=>syncHash(h.options));
  if(keys.length!==new Set(keys).size||prepared.variants.length!==heads.length||prepared.variants.some(v=>!heads.some(h=>syncHash(h.options)===syncHash(v.options)&&h.unitCents===v.priceCents)))
   syncFail('gallery_sync_binding_coverage','Die ausdrückliche Zuordnung muss alle bisherigen Ausführungen genau einmal enthalten.');
  const approvals=workshop.orderIntake.catalogLiveApprovals(heads.map(h=>({shopDomain,shopifyProductId:target.shopifyProductId,shopifyVariantId:h.shopifyVariantId,productId:h.productId,productRevision:h.productRevision})));
  if(approvalMode==='preserve'&&approvals.some(Boolean)&&!approvals.every(Boolean))syncFail('gallery_sync_partial_approval','Die vorhandene Verkaufsfreigabe deckt nur einen Teil der Varianten ab. Den Bestand zuerst gesondert prüfen.');
  const approved=approvals.every(Boolean);
  return {boundRevision,approved,heads:heads.map(h=>({shopifyVariantId:h.shopifyVariantId,assignmentRevision:h.assignmentRevision,bindingId:h.bindingId,productRevision:h.productRevision,options:h.options,unitCents:h.unitCents,personalization:workshop.orderIntake.bindingPricing(h.bindingId)}))};
 }
 function prepare({mapping,record,document,binding,remote}){
  const result={contracts:[],variants:[]},prepared=prepareShopProduct({...record,document});
  const requires= binding.heads.some(h=>h.personalization!==null)||(document.config.moduleProfile&&Object.values(prepared.extras).some(v=>v>0));
  let checkedPricing;
  const raw=remote?.commerce?.personalizationPricing;
  if(raw!=null){
   if(remote.shopDomain!==shopDomain||remote.id!==mapping.shopifyProductId)syncFail('gallery_sync_pricing_provider','Der Preisbeleg gehört nicht zur festen Shopzuordnung.',422);
   try{resolvedPricingHistory(raw);checkedPricing=expandPricingVariants(raw);}catch{syncFail('gallery_sync_pricing_provider','Die vorhandenen komprimierten Preisverträge oder deren Historie sind ungültig.',422);}
  }
  if(requires&&!checkedPricing&&typeof personalizationPricingFor!=='function')syncFail('gallery_sync_pricing_provider','Die bestehenden oder benötigten Zusatzpreisverträge müssen vor der Freigabe geprüft übernommen werden. Der Preisadapter fehlt.',422);
  for(const head of binding.heads){
   const pricing=checkedPricing??personalizationPricingFor?.({mapping,record:{...record,document},previous:head.personalization,shopifyVariantId:head.shopifyVariantId});
   if(pricing?.then||(requires&&pricing===undefined))syncFail('gallery_sync_pricing_provider','Für jede vorhandene Variante ist ein synchron geprüfter Zusatzpreisvertrag erforderlich.',422);
   if(pricing===undefined)continue;
   if(pricing.productId!==mapping.shopifyProductId)syncFail('gallery_sync_pricing_provider','Der Zusatzpreisvertrag gehört zu einem anderen Shopprodukt.',422);
   capturePersonalization(pricing,{variantId:head.shopifyVariantId.split('/').at(-1),baseCents:head.unitCents,document});
   const sha256=syncHash(pricing);if(!result.contracts.some(c=>c.sha256===sha256))result.contracts.push({sha256,pricing:structuredClone(pricing)});
   result.variants.push({id:head.shopifyVariantId,sha256});
  }
  return result;
 }
 function wasBound(mapping,revision){
  return mapping.shopifyVariantIds.length>0&&mapping.shopifyVariantIds.every(shopifyVariantId=>readRegistry.history({shopifyProductId:mapping.shopifyProductId,shopifyVariantId})
   .some(h=>h.productId===mapping.target.productId&&h.productRevision===revision));
 }
 // Run the actual binding planner against the current immutable product before
 // a font-only revision is appended. No bindings or approvals are written.
 function checkBindings({mapping,record,binding,remote}){
  if(remote.shopDomain!==shopDomain||remote.id!==mapping.shopifyProductId)syncFail('gallery_sync_remote_stale','Der Shopify-Prüfbeleg gehört nicht zum Ziel.');
  return readRegistry.withReadSnapshot(()=>{
   for(let offset=0;offset<binding.heads.length;offset+=100)planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now:clock(),maxEvidenceAgeMs:60000,
    selections:binding.heads.slice(offset,offset+100).map(h=>({shopifyProductId:mapping.shopifyProductId,shopifyVariantId:h.shopifyVariantId,productId:record.id,productRevision:record.revision,options:h.options})),
    shopifyEvidence:{tenantId,shopDomain,readAt:remote.readAt,complete:true,products:[{id:remote.id,variants:remote.variants.map(v=>({id:v.id,productId:remote.id,priceCents:v.priceCents}))}]}});
  });
 }
 function activate({entries,operationId}){
  return workshop.orderIntake.withBindingTransaction(()=>{
   for(const entry of entries){
    const record=workshop.repository.get(entry.mapping.target.productId);
    if(record.revision!==entry.newRevision||syncHash(record.document)!==entry.documentSha256)syncFail('gallery_sync_target_changed','Der Zielentwurf wurde zwischenzeitlich geändert.');
    const actual=capture(entry.mapping),already=actual.boundRevision===entry.newRevision;
    if(!already&&syncHash(actual)!==syncHash(entry.binding))syncFail('gallery_sync_binding_changed','Die Shopzuordnung wurde seit der Vorschau geändert.');
    const pricing=prepare({mapping:entry.mapping,record,document:record.document,binding:entry.binding,remote:entry.remote});
    if(syncHash(pricing)!==syncHash(entry.pricing))syncFail('gallery_sync_pricing_changed','Die geprüften Zusatzpreisverträge haben sich geändert.');
    const remote=entry.remote;
    if(remote.shopDomain!==shopDomain||remote.id!==entry.mapping.shopifyProductId||!Number.isFinite(Date.parse(remote.readAt))||Math.abs(clock()-Date.parse(remote.readAt))>60000)
     syncFail('gallery_sync_remote_stale','Der Shopify-Prüfbeleg ist nicht mehr aktuell.');
    if(already)continue;
    const selections=entry.binding.heads.map(h=>({shopifyProductId:entry.mapping.shopifyProductId,shopifyVariantId:h.shopifyVariantId,productId:record.id,productRevision:record.revision,options:h.options}));
    activePricing=pricing;
    try{for(let offset=0;offset<selections.length;offset+=100)registry.withReadSnapshot(()=>{
     const batch=selections.slice(offset,offset+100),ids=new Set(batch.map(v=>v.shopifyVariantId));
     const plan=planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now:clock(),maxEvidenceAgeMs:60000,selections:batch,
      shopifyEvidence:{tenantId,shopDomain,readAt:remote.readAt,complete:true,products:[{id:remote.id,variants:remote.variants.map(v=>({id:v.id,productId:remote.id,priceCents:v.priceCents}))}]}});
     registry.persist({plan,expectedHeads:entry.binding.heads.filter(h=>ids.has(h.shopifyVariantId)).map(h=>({shopifyVariantId:h.shopifyVariantId,revision:h.assignmentRevision}))});
    });}finally{activePricing=null;}
   }
   const pending=entries.filter(e=>!capture(e.mapping).approved&&(approvalMode==='approve'||e.binding.approved));
   const result=pending.length?workshop.orderIntake.approveCatalogLiveProducts({shopDomain,approvalId:operationId,registry,products:pending.map(e=>({productId:e.mapping.target.productId,productRevision:e.newRevision,shopifyProductId:e.mapping.shopifyProductId}))}):{created:0,products:entries.length};
   return result;
  });
 }
 return Object.freeze({tenantId,shopDomain,storeId,approvalMode,capture,prepare,checkBindings,wasBound,activate});
}
