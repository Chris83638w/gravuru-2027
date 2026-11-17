import {createHmac} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';
import {isNativeReviewSchema} from './native-review-schema.mjs';
import {isLayeredDoorbell} from '../configurator/variant-m/doorbell-selection.mjs';
import {cartTimingStep,cartTimingDetail,cartTimingCount} from './shop-cart-timing.mjs';

const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code,retryable:false,paymentConfirmed:false});};
const positive=n=>Number.isSafeInteger(n)&&n>0;
const quantity=n=>positive(n)&&n<=99;
const equal=(a,b)=>isDeepStrictEqual(a??null,b??null);

// Test purchase permission is separate from manufacturing permission. These are
// only the known manufacturing blockers emitted by the saved review builders.
// No manifest, snapshot, profile or release flag is modified here.
export function assertBoundTestReview(manifest,record,binding){
 const m=manifest,form=record.document.schema==='gravuru-form-product/v1';
 if((form?m?.schema!=='gravuru-form-review/v1':!isNativeReviewSchema(m?.schema))||m.product?.id!==binding.productId||m.product?.revision!==binding.productRevision||record.id!==binding.productId||record.revision!==binding.productRevision||m.status!=='review-only'||m.productionReady!==false||m.order!==null||m.payment!==null||m.product?.currency!=='EUR'||!['engraving','print'].includes(m.product?.method)||!positive(m.product?.basePriceCents)||!(m.product.widthMm>0&&m.product.heightMm>0)||!Array.isArray(m.blockers))fail(409,'bound_test_review','Dieser Prüfstand ist nicht für den geschützten Testkauf geeignet.');
 if(!equal(m.productionProfile,record.metadata?.productionProfile))fail(409,'bound_test_profile','Der Fertigungsprofilstand gehört nicht zur festen Produktrevision.');
 let expected;
 if(form){
  const d=record.document;
  if(!d.material?.id||!Number.isFinite(d.material.thicknessMm)||d.material.thicknessMm<=0||d.processingMethod!==m.product.method||d.basePriceCents!==m.product.basePriceCents)fail(409,'bound_test_product','Material, Verfahren oder Preis des Formprodukts sind nicht vollständig.');
  expected=m.productionProfile?[...m.productionProfile.blockers]:['Ein freigegebenes Fertigungsprofil ist diesem Formprodukt noch nicht zugeordnet.',...(m.product.method==='print'?['Gemessenes Druck-/Material-ICC-Profil und Maschinenabnahme fehlen.']:[])];
 }else{
  if(m.capabilities?.cart!==false||!equal(m.selection?.options,binding.options))fail(409,'bound_test_selection','Die Ausführung gehört nicht zur festen Shop-Zuordnung.');
  expected=[...(record.document.config?.doorbell&&!isLayeredDoorbell(record.document.config)?['Die getrennte Fertigungsausgabe für Edelstahlträger und Acrylglasauflage ist noch nicht angebunden.']:[]),m.product.method==='print'?'Gemessenes ICC-Profil und Maschinenabnahme fehlen.':'Gravurparameter und Probegravur sind nicht freigegeben.','Shopify-Bestellbindung und echte Maschinenabnahme sind nicht bestätigt.'];
 }
 if(!equal(m.blockers,expected))fail(409,'bound_test_blockers','Dieser Prüfstand enthält weitere ungeklärte Sperrgründe.');
}

// Shared preparation for Storefront and the normal theme cart. No Shopify mutation.
export function prepareBoundCartOffer({workshop,registry,shopDomain},binding,input,{draftToken}={}){
 if(!workshop?.customerDrafts||!workshop.repository||typeof registry?.resolve!=='function'||!/^[-a-z0-9]+\.myshopify\.com$/.test(shopDomain||'')||workshop.sessionContext?.shopDomain!==shopDomain)fail(503,'bound_test_config','Der private Test-Warenkorb ist nicht eingerichtet.');
 const drafts=workshop.customerDrafts;
  if(!input||Array.isArray(input)||Object.keys(input).some(k=>!['draftId','expectedRevision','quantity','configId','cartLineId'].includes(k))||!/^(?:adraft|draft)_[a-f0-9-]{36}$/.test(input.draftId||'')||!positive(input.expectedRevision)||!quantity(input.quantity)||(input.configId!==undefined&&typeof input.configId!=='string')||(input.cartLineId!==undefined&&typeof input.cartLineId!=='string')||typeof draftToken!=='string'||!/^[a-f0-9]{64}$/.test(draftToken))fail(422,'bound_test_fields','Privaten Entwurf, festen Stand und Menge angeben.');
  const fixed=structuredClone(input),native=fixed.draftId.startsWith('adraft_');
  function resolve(){
   cartTimingCount('offer_resolution_calls');
   const active=cartTimingDetail('resolve_registry',()=>registry.resolve({shopifyProductId:binding.shopifyProductId,shopifyVariantId:binding.shopifyVariantId}));
   if(!equal(active,binding)||active.shopDomain!==shopDomain||active.tenantId!==workshop.tenantId)fail(409,'bound_test_binding','Die Shop-Zuordnung wurde geändert. Bitte neu öffnen.');
   const draft=cartTimingDetail('resolve_draft',()=>native?drafts.acrylicDrafts.get(fixed.draftId,draftToken):drafts.get(fixed.draftId,draftToken));
   if(draft.revision!==fixed.expectedRevision||draft.productId!==binding.productId||draft.productRevision!==binding.productRevision)fail(409,'bound_test_draft','Der Entwurf gehört nicht zu dieser Ausführung oder wurde geändert.');
   const record=cartTimingDetail('resolve_product_fixed',()=>workshop.repository.get(draft.productId,{revision:draft.productRevision}));
   if(record.status==='archived'||cartTimingDetail('resolve_product_current',()=>workshop.repository.get(draft.productId)).status==='archived')fail(409,'bound_test_archived','Dieses Produkt ist nicht mehr verfügbar.');
   const proof=native?{id:draft.snapshotId}:cartTimingDetail('resolve_snapshot',()=>drafts.findSnapshot(draft.id,draft.revision));
   if(!proof?.id)fail(409,'bound_test_snapshot','Bitte die Gestaltung zuerst als Prüfstand sichern.');
   const {manifest}=cartTimingDetail('resolve_review',()=>drafts.review(proof.id));cartTimingDetail('resolve_assert_review',()=>assertBoundTestReview(manifest,record,binding));
   // Native drafts own an immutable snapshot by its ID. Its original source
   // identity deliberately predates the draft and must never be rewritten.
   if((!native&&(manifest.source?.draftId!==draft.id||manifest.source.draftRevision!==draft.revision))||manifest.source?.designId!==draft.designId)fail(409,'bound_test_snapshot','Prüfstand und private Entwurfrevision stimmen nicht überein.');
   if(native&&manifest.selection.price.quantity!==fixed.quantity)fail(409,'bound_test_quantity','Bitte den Prüfstand mit der gewählten Menge erneut sichern.');
   return {draft,manifest,record,snapshotId:proof.id};
  }
  const current=cartTimingStep('offer_resolve',()=>resolve());
  const reviewPolicy=m=>assertBoundTestReview(m,current.record,binding);
  const stableToken=createHmac('sha256',draftToken).update(JSON.stringify(['gravuru-bound-test-cart/v1',binding.storeId,binding.tenantId,binding.bindingId,binding.assignmentRevision,current.draft.id,current.draft.revision,current.snapshotId,fixed.quantity])).digest('hex');
  const offer=cartTimingStep('offer_create',()=>drafts.orderIntake.offer({bindingId:binding.bindingId,snapshotId:current.snapshotId,quantity:fixed.quantity},{stableToken}));
 return {...current,offer,reviewPolicy,resolve,fixed};
}

export function createBoundTestCart({workshop,registry,shopDomain,transportOptions={},handoffFactory=createDraftCartHandoff}){
 if(!workshop?.customerDrafts||!workshop.repository||typeof registry?.resolve!=='function'||!/^[-a-z0-9]+\.myshopify\.com$/.test(shopDomain||'')||workshop.sessionContext?.shopDomain!==shopDomain)fail(503,'bound_test_config','Der private Test-Warenkorb ist nicht eingerichtet.');
 const drafts=workshop.customerDrafts;
 return async(binding,input,{draftToken,signal,existingCart}={})=>{
  const current=prepareBoundCartOffer({workshop,registry,shopDomain},binding,input,{draftToken}),{offer,reviewPolicy,resolve,fixed}=current;
  const submit=handoffFactory({drafts,config:{shopDomain,apiVersion:'2026-07',authentication:'tokenless',requestContext:'merchant-test'},reviewPolicy},transportOptions);
  const result=await submit({draftId:current.draft.id,expectedRevision:current.draft.revision,snapshotId:current.snapshotId,offerId:offer.id,offerToken:offer.property.value,...(fixed.configId===undefined?{}:{configId:fixed.configId}),...(fixed.cartLineId===undefined?{}:{cartLineId:fixed.cartLineId})},{draftToken,signal,...(existingCart===undefined?{}:{existingCart})});
  resolve();return {...result,testOnly:true,productionReady:false};
 };
}
