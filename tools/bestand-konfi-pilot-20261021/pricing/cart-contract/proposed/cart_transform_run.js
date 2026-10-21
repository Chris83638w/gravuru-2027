// Proposed replacement entry point; NOT deployed. v1 stays on its exact historical
// path; a product explicitly migrated to v2 must supply a signed server offer.
import {cartTransformRun as legacyRun} from './legacy-cart-transform.js';
import {verifySignedQuote,assertQuotePrice} from './price-contract.mjs';
export function cartTransformRun(input){
 const operations=[];
 for(const line of input.cart.lines){
  const item=line.merchandise;if(item?.__typename!=='ProductVariant')continue;
  const pricing=item.product.pricing?.jsonValue;
  const signedAttribute=[line.q0,line.q1,line.q2,line.q3,line.signature].some(a=>typeof a?.value==='string');
  if(!pricing?.enabled){
   if(pricing?.schema==='gravuru-personalization-pricing/v2'||signedAttribute)throw Error('Managed product price configuration missing or disabled');
   continue;
  }
  if(pricing.schema==='gravuru-personalization-pricing/v1'){
   if(signedAttribute)throw Error('Signed product cannot downgrade to legacy pricing');
   const base=pricing.variants?.[item.id.split('/').pop()],rate=Number(input.presentmentCurrencyRate);
   const list=base+Number(line.motifs?.value)*pricing.extraMotifCents+Number(line.uploads?.value)*pricing.extraPhotoCents;
   if(!Number.isSafeInteger(list)||list<0||!Number.isFinite(rate)||rate<=0||!Number.isFinite(list*rate)||list*rate>Number.MAX_SAFE_INTEGER)throw Error('Unsafe legacy price calculation');
   const legacy=legacyRun({...input,cart:{...input.cart,lines:[line]}}).operations;
   for(const operation of legacy){
    const amount=operation.lineUpdate?.price?.adjustment?.fixedPricePerUnit?.amount;
    if(typeof amount!=='string'||!/^\d+\.\d{2}$/.test(amount)||!Number.isSafeInteger(Number(amount.replace('.',''))))throw Error('Unsafe legacy price output');
   }
   operations.push(...legacy);continue;
  }
  // v2 is deliberately EUR-only until currency rounding/Markets are agreed.
  if(line.cost?.amountPerQuantity?.currencyCode!=='EUR'||Number(input.presentmentCurrencyRate)!==1)throw Error('EUR price contract required');
  const pieces=[line.q0,line.q1,line.q2,line.q3];
  if(pieces.some(p=>typeof p?.value!=='string'||p.value.length>240))throw Error('Incomplete signed quote');
  const q=verifySignedQuote(pieces.map(p=>p.value==='.'?'':p.value).join(''),line.signature?.value,input.shop?.quoteKeys?.jsonValue);
  if(q.variantId!==item.id||q.productId!==item.product.id||q.quantity!==line.quantity||
     line.revision?.value!==q.revision||line.designFile?.value!==q.snapshotId+':'+q.snapshotSha256)throw Error('Signed offer does not match cart line');
  const price=assertQuotePrice(pricing,q);
  const amount=Math.floor(price.unitCents/100)+'.'+String(price.unitCents%100).padStart(2,'0');
  operations.push({lineUpdate:{cartLineId:line.id,price:{adjustment:{fixedPricePerUnit:{amount}}}}});
 }
 return {operations};
}

