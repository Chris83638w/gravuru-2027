import {createHmac} from 'node:crypto';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';
import {NATIVE_REVIEW} from './native-review-schema.mjs';

export const MEMORIAL_TEST_CART=Object.freeze({mode:'merchant-test-only',shopDomain:'gravuru-design.myshopify.com',apiVersion:'2026-07',productId:'cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1',productRevision:2});
const variants=new Set(['57509812633980','57509812666748','57509812699516','57509812732284','57509812765052','57509812830588','57509812863356','57509812896124','57509812797820']);
const fail=(status,code,message)=>{throw Object.assign(Error(message),{status,code,retryable:false,paymentConfirmed:false});};
const key=options=>JSON.stringify(Object.entries(options||{}).sort());

// Pin one checked revision in private runtime configuration. Saving a product
// never moves this pin or enables a newly created revision for test checkout.
export function memorialTestCartSettings(productRevision=2){
 if(!Number.isSafeInteger(productRevision)||productRevision<2)fail(503,'test_cart_disabled','Der Händler-Testkauf benötigt einen ausdrücklich geprüften Produktstand.');
 return Object.freeze({...MEMORIAL_TEST_CART,productRevision});
}

// A merchant-only test purchase is separate from manufacturing approval.
// No blocker is removed from the immutable package, no output is released, and
// the public/default draft handoff continues to reject unapproved production.
export function assertMemorialTestReview(m,productRevision=2){
 memorialTestCartSettings(productRevision);
 const expected=['Gravurparameter und Probegravur sind nicht freigegeben.','Shopify-Bestellbindung und echte Maschinenabnahme sind nicht bestätigt.'];
 if(m?.schema!==NATIVE_REVIEW||m.product?.id!==MEMORIAL_TEST_CART.productId||m.product.revision!==productRevision||m.product.method!=='engraving'||m.product.material?.kind!=='slate'||m.product.currency!=='EUR'||m.status!=='review-only'||m.productionReady!==false||m.order!==null||m.payment!==null||m.capabilities?.cart!==false||JSON.stringify(m.blockers)!==JSON.stringify(expected))fail(409,'test_cart_review','Dieser Stand ist nicht für den begrenzten Händler-Testkauf geeignet.');
}

export function createMerchantTestCart({drafts,repository,settings},transportOptions={}){
 if(!settings||!Number.isSafeInteger(settings.productRevision)||JSON.stringify(Object.entries(settings).sort())!==JSON.stringify(Object.entries(memorialTestCartSettings(settings.productRevision)).sort()))fail(503,'test_cart_disabled','Der Händler-Testkauf ist nicht eingerichtet.');
 settings=memorialTestCartSettings(settings.productRevision);
 const reviewPolicy=m=>assertMemorialTestReview(m,settings.productRevision);
 const submit=createDraftCartHandoff({drafts,config:{shopDomain:settings.shopDomain,apiVersion:settings.apiVersion,authentication:'tokenless',requestContext:'merchant-test'},reviewPolicy},transportOptions);
 return async(input,{draftToken,signal}={})=>{
  // K8: `configId`/`cartLineId` kommen aus dem Bearbeiten-Link; die Übergabe prüft sie gegen das Konfigurationsregister.
  if(!input||Array.isArray(input)||Object.keys(input).some(k=>!['draftId','expectedRevision','configId','cartLineId'].includes(k))||!/^adraft_[a-f0-9-]{36}$/.test(input.draftId||'')||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1||(input.configId!==undefined&&typeof input.configId!=='string')||(input.cartLineId!==undefined&&typeof input.cartLineId!=='string'))fail(422,'test_cart_fields','Einen gespeicherten privaten Entwurf und seine Revision angeben.');
  const fixed={...input};
  function resolve(){
   const draft=drafts.acrylicDrafts.get(fixed.draftId,draftToken);
   if(draft.revision!==fixed.expectedRevision)fail(409,'test_cart_stale','Die Gestaltung wurde geändert. Bitte erneut sichern.');
   if(draft.productId!==settings.productId||draft.productRevision!==settings.productRevision||repository.get(draft.productId).status==='archived'||repository.get(draft.productId,{revision:draft.productRevision}).status==='archived')fail(409,'test_cart_product','Dieses Produkt ist nicht für den Händler-Testkauf freigegeben.');
   const {manifest}=drafts.review(draft.snapshotId);reviewPolicy(manifest);
   const matches=drafts.orderIntake.bindings().filter(b=>b.shopDomain===settings.shopDomain&&b.productId===draft.productId&&b.productRevision===draft.productRevision&&key(b.options)===key(manifest.selection?.options)&&variants.has(b.variantId));
   if(matches.length!==1)fail(409,'test_cart_binding','Eine eindeutige geprüfte Shop-Zuordnung fehlt.');
   return {draft,manifest,binding:matches[0]};
  }
  const {draft,manifest,binding}=resolve();
  const stableToken=createHmac('sha256',draftToken).update(JSON.stringify(['gravuru-merchant-test-cart/v1',draft.id,draft.revision,draft.snapshotId,binding.id])).digest('hex');
  const offer=drafts.orderIntake.offer({bindingId:binding.id,snapshotId:draft.snapshotId,quantity:manifest.selection.price.quantity},{stableToken});
  const result=await submit({draftId:draft.id,expectedRevision:draft.revision,snapshotId:draft.snapshotId,offerId:offer.id,offerToken:offer.property.value,...(fixed.configId===undefined?{}:{configId:fixed.configId}),...(fixed.cartLineId===undefined?{}:{cartLineId:fixed.cartLineId})},{draftToken,signal});
  resolve();return {...result,testOnly:true,productionReady:false};
 };
}
