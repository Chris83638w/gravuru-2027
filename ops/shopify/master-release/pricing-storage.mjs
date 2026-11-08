// Publisher-side only. Shopify Functions omit metafield values above 10,000
// UTF-8 bytes. Keep every revision and price, including historical differences.
import {resolvedPricingHistory,expandPricingVariants} from './pricing-history.mjs';
export const FUNCTION_METAFIELD_BYTES=10000;
const sameKeys=(a,b)=>a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k));
function indexRanges(indices){
 const ranges=[];let start=indices[0],end=start;
 for(const i of indices.slice(1)){if(i===end+1)end=i;else{ranges.push(start===end?String(start):`${start}-${end}`);start=end=i;}}
 ranges.push(start===end?String(start):`${start}-${end}`);return ranges.join(',');
}
function referenceTo(old,source){
 if(!sameKeys(old.variants,source.variants))return null;
 const groups=new Map();
 for(const [index,id] of Object.keys(source.variants).sort().entries()){
  const a=source.variants[id],b=old.variants[id],delta=b-a;
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0||!Number.isSafeInteger(delta))throw Error('Invalid historical variant price');
  if(delta){if(!groups.has(delta))groups.set(delta,[]);groups.get(delta).push(index);}
 }
 const {variants,...fields}=old;
 return {...fields,variantsFromRevision:source.revision,...(groups.size?{variantDeltas:[...groups].sort((a,b)=>a[0]-b[0]).map(([delta,indices])=>[delta,indexRanges(indices)])}:{})};
}
function sequenceTable(contract){
 if(!contract.variants||typeof contract.variants!=='object'||Array.isArray(contract.variants))return contract;
 const keys=Object.keys(contract.variants).sort();if(keys.length<2)return contract;
 if(keys.some(k=>!/^([1-9][0-9]*)$/.test(k)||k.length!==keys[0].length||!Number.isSafeInteger(Number(k))))return contract;
 const first=Number(keys[0]),step=Number(keys[1])-first;
 if(step<1||!Number.isSafeInteger(step)||keys.some((k,i)=>Number(k)!==first+i*step))return contract;
 const {variants,...fields}=contract;
 if(keys.some(k=>!Number.isSafeInteger(variants[k])||variants[k]<0||variants[k]>100000000))throw Error('Invalid variant sequence price');
 const width=Math.max(...keys.map(k=>variants[k].toString(36).length));
 const candidate={...fields,variantSequence:{first:keys[0],step,width,prices36:keys.map(k=>variants[k].toString(36).padStart(width,'0')).join('')}};
 expandPricingVariants(candidate); // Exact integer/cent and ID validation.
 return JSON.stringify(candidate).length<JSON.stringify(contract).length?candidate:contract;
}
export function compactPricingHistory(pricing){
 if(!pricing||typeof pricing!=='object'||Array.isArray(pricing)||pricing.variantsFromRevision!==undefined||pricing.variantDeltas!==undefined)throw Error('Invalid current pricing');
 const result=structuredClone(expandPricingVariants(pricing));
 if(result.history===undefined)return sequenceTable(result);
 const expanded=resolvedPricingHistory(result),anchors=[result];
 result.history=expanded.map(old=>{
  let smallest=old;
  for(const source of anchors){const candidate=referenceTo(old,source);if(candidate&&JSON.stringify(candidate).length<JSON.stringify(smallest).length)smallest=candidate;}
  if(smallest===old)anchors.push(old);
  return smallest;
 });
 // Validate the references after compaction; never publish a dangling source.
 result.history=result.history.map(sequenceTable);
 const compact=sequenceTable(result);
 resolvedPricingHistory(compact);
 return compact;
}
export function encodeFunctionPricing(pricing){
 const compacted=compactPricingHistory(pricing),value=JSON.stringify(compacted),bytes=Buffer.byteLength(value,'utf8');
 if(bytes>FUNCTION_METAFIELD_BYTES)throw Error('Pricing metafield exceeds Shopify Function 10000-byte limit');
 return {pricing:compacted,value,bytes};
}
