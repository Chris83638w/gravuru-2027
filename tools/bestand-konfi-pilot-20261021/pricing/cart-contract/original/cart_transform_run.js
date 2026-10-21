// Prices are trusted app-owned product data, never prices supplied by the browser.
const count=(value,max)=>{if(!/^(0|[1-9]\d*)$/.test(value||'')||Number(value)>max)throw Error('Invalid personalization quantity');return Number(value);};
export function cartTransformRun(input){
 const operations=[];
 for(const line of input.cart.lines){
  const item=line.merchandise;if(item?.__typename!=='ProductVariant')continue;
  const pricing=item.product.pricing?.jsonValue;if(!pricing?.enabled)continue;
  if(pricing.schema!=='gravuru-personalization-pricing/v1'||pricing.productId!==item.product.id||pricing.currency!=='EUR')throw Error('Invalid product pricing configuration');
  const base=pricing.variants?.[item.id.split('/').pop()];
  if(![base,pricing.extraMotifCents,pricing.extraPhotoCents].every(n=>Number.isSafeInteger(n)&&n>=0)||line.revision?.value!==String(pricing.revision)||!line.designFile?.value)throw Error('Personalization must be completed before checkout');
  const motifs=count(line.motifs?.value,200),uploads=count(line.uploads?.value,4),rate=Number(input.presentmentCurrencyRate);
  if(!Number.isFinite(rate)||rate<=0)throw Error('Invalid currency conversion');
  const amount=((base+motifs*pricing.extraMotifCents+uploads*pricing.extraPhotoCents)*rate/100).toFixed(2);
  operations.push({lineUpdate:{cartLineId:line.id,price:{adjustment:{fixedPricePerUnit:{amount}}}}});
 }
 return {operations};
}
