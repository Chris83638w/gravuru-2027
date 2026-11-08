// Publisher-side only. Shopify Functions omit metafield values above 10,000
// UTF-8 bytes. Keep every revision and price; share only exactly equal maps.
import {resolvedPricingHistory} from './pricing-history.mjs';
export const FUNCTION_METAFIELD_BYTES=10000;
const sameMap=(a,b)=>a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&a[k]===b[k]);
export function compactPricingHistory(pricing){
 if(!pricing||typeof pricing!=='object'||Array.isArray(pricing)||pricing.variantsFromRevision!==undefined)throw Error('Invalid current pricing');
 const result=structuredClone(pricing);
 if(result.history===undefined)return result;
 const expanded=resolvedPricingHistory(result),anchors=[result];
 result.history=expanded.map(old=>{
  const source=anchors.find(p=>sameMap(p.variants,old.variants));
  if(!source){anchors.push(old);return old;}
  const {variants,...fields}=old;
  return {...fields,variantsFromRevision:source.revision};
 });
 // Validate the references after compaction; never publish a dangling source.
 resolvedPricingHistory(result);
 return result;
}
export function encodeFunctionPricing(pricing){
 const compacted=compactPricingHistory(pricing),value=JSON.stringify(compacted),bytes=Buffer.byteLength(value,'utf8');
 if(bytes>FUNCTION_METAFIELD_BYTES)throw Error('Pricing metafield exceeds Shopify Function 10000-byte limit');
 return {pricing:compacted,value,bytes};
}
