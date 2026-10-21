// Backend-only adapter. Never expose an endpoint that signs browser prices.
// Pass the trusted saved product revision and verified immutable snapshot state.
// Call the existing full document/design/option validation before this adapter.
import {sign} from 'node:crypto';
import {PRICE_SCHEMA,digest,validatePricing,calculate,encode,quoteAttributes} from './price-contract.mjs';
export function createServerPriceAdapter({commercePrice,quote,resolvedOptions,choiceOptions}){
 return function issue({config,state,quantity,productId,variantId,revision,snapshot,publishedPricing,keyId,privateKey}){
  validatePricing(publishedPricing);
  if(!privateKey)throw Error('Private signing key missing');
  if(publishedPricing.productId!==productId||String(publishedPricing.revision)!==String(revision))throw Error('Product revision mismatch');
  const original=commercePrice(config,state,quantity);
  const selected=choiceOptions(config,resolvedOptions(config,state.mOptions));
  const base=quote(config,[],config.profile.defaultDesignId,selected,1).unitCents;
  const metadata={schema:PRICE_SCHEMA,enabled:true,productId,revision:String(revision),currency:'EUR',
    baseCents:config.basePriceCents,variants:publishedPricing.variants,extraMotifCents:config.extraMotifCents,
    extraPhotoCents:config.photo.extraPriceCents,quantityTiers:config.quantityTiers??[]};
  if(digest(metadata)!==digest(publishedPricing)||publishedPricing.variants[variantId.split('/').pop()]!==base)throw Error('Published prices do not match the trusted product');
  const q={version:2,productId,variantId,revision:String(revision),quantity,motifs:original.additionalMotifs,
   uploads:original.chargedUploads,fieldCents:original.fieldCents??0,backCents:original.backCents??0,
   unitCents:original.unitCents,totalCents:original.totalCents,snapshotId:snapshot.id,
   snapshotSha256:snapshot.sha256,pricingSha256:digest(metadata),keyId};
  const computed=calculate(metadata,q);
  if(computed.unitCents!==original.unitCents||computed.totalCents!==original.totalCents)throw Error('Source price and cart contract disagree');
  const payload=encode(q),signature=sign(null,Buffer.from(payload,'utf8'),privateKey).toString('hex');
  return {quote:q,price:computed,payload,signature,attributes:quoteAttributes(payload,signature)};
 };
}

