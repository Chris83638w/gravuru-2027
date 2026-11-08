// App-owned immutable previous contracts keep saved carts valid when a product
// gains a new configurator revision. Customer attributes select a known contract
// only; its prices, counters and exact legacy offers are still fully validated.
export function resolvedPricingHistory(pricing){
 if(pricing?.history===undefined)return [];
 if(pricing.enabled!==true||!Array.isArray(pricing.history))throw Error('Invalid pricing history');
 const revisions=new Set([String(pricing.revision)]);
 for(const old of pricing.history){
  if(!old||old.enabled!==true||!['gravuru-personalization-pricing/v1','gravuru-personalization-pricing/v2','gravuru-personalization-pricing/v3'].includes(old.schema)||old.productId!==pricing.productId||old.currency!==pricing.currency||!Number.isSafeInteger(old.revision)||old.revision<1||revisions.has(String(old.revision))||old.history!==undefined)throw Error('Invalid historical price contract');
  revisions.add(String(old.revision));
 }
 return pricing.history.map(old=>{
  if(old.variantsFromRevision===undefined)return old;
  // A reference names an immutable revision, never "current". Future revisions
  // can therefore change their table without changing the meaning of old carts.
  if(!Number.isSafeInteger(old.variantsFromRevision)||old.variantsFromRevision<1||old.variants!==undefined||old.variantsFromRevision===old.revision)throw Error('Invalid historical variant reference');
  const source=[pricing,...pricing.history].find(p=>p.revision===old.variantsFromRevision);
  if(!source||source.variantsFromRevision!==undefined||!source.variants||typeof source.variants!=='object'||Array.isArray(source.variants))throw Error('Missing historical variant table');
  const {variantsFromRevision,...fields}=old;
  return {...fields,variants:source.variants};
 });
}
export function pricingForLine(line){
 const item=line.merchandise,pricing=item?.__typename==='ProductVariant'?item.product.pricing?.jsonValue:null;
 if(!pricing&&(line.revision?.value!=null||line.designFile?.value!=null||line.configuration?.value!=null&&line.offer?.value!=null))throw Error('Personalization pricing unavailable');
 if(pricing?.history===undefined)return pricing;
 const history=resolvedPricingHistory(pricing),revision=line.revision?.value;
 if(revision!==undefined)return history.find(p=>String(p.revision)===revision)||pricing;
 const legacy=history.filter(p=>Array.isArray(p.legacyOffers)&&p.legacyOffers.some(e=>e?.offer===line.offer?.value));
 if(legacy.length>1)throw Error('Ambiguous historical offer');
 return legacy[0]||pricing;
}
