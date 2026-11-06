// App-owned immutable previous contracts keep saved carts valid when a product
// gains a new configurator revision. Customer attributes select a known contract
// only; its prices, counters and exact legacy offers are still fully validated.
export function pricingForLine(line){
 const item=line.merchandise,pricing=item?.__typename==='ProductVariant'?item.product.pricing?.jsonValue:null;
 if(pricing?.history===undefined)return pricing;
 if(pricing.enabled!==true||!Array.isArray(pricing.history))throw Error('Invalid pricing history');
 const revisions=new Set([String(pricing.revision)]);
 for(const old of pricing.history){
  if(!old||old.enabled!==true||!['gravuru-personalization-pricing/v1','gravuru-personalization-pricing/v2','gravuru-personalization-pricing/v3'].includes(old.schema)||old.productId!==pricing.productId||old.currency!==pricing.currency||!Number.isSafeInteger(old.revision)||old.revision<1||revisions.has(String(old.revision))||old.history!==undefined)throw Error('Invalid historical price contract');
  revisions.add(String(old.revision));
 }
 const revision=line.revision?.value;
 if(revision!==undefined)return pricing.history.find(p=>String(p.revision)===revision)||pricing;
 const legacy=pricing.history.filter(p=>Array.isArray(p.legacyOffers)&&p.legacyOffers.some(e=>e?.offer===line.offer?.value));
 if(legacy.length>1)throw Error('Ambiguous historical offer');
 return legacy[0]||pricing;
}
