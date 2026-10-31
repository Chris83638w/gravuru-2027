import {withCheckoutDesignImages} from './cart-image.mjs';
export function cartTransformRun(input){return withCheckoutDesignImages(input,priceTransformRun(input));}
// Prices are trusted app-owned product data, never prices supplied by the browser.
const count=(value,max)=>{if(!/^(0|[1-9]\d*)$/.test(value||'')||Number(value)>max)throw Error('Invalid personalization quantity');return Number(value);};
function priceTransformRun(input){
 const operations=[];
 for(const line of input.cart.lines){
  const item=line.merchandise;if(item?.__typename!=='ProductVariant')continue;
  const pricing=item.product.pricing?.jsonValue;if(!pricing?.enabled)continue;
  const logoContract=pricing.schema==='gravuru-personalization-pricing/v2';
  if(!['gravuru-personalization-pricing/v1','gravuru-personalization-pricing/v2'].includes(pricing.schema)||pricing.productId!==item.product.id||pricing.currency!=='EUR')throw Error('Invalid product pricing configuration');
  const base=pricing.variants?.[item.id.split('/').pop()];
  if(![base,pricing.extraMotifCents,pricing.extraPhotoCents].every(n=>Number.isSafeInteger(n)&&n>=0)||line.revision?.value!==String(pricing.revision)||!line.designFile?.value)throw Error('Personalization must be completed before checkout');
  const motifs=count(line.motifs?.value,200),uploads=count(line.uploads?.value,4),rate=Number(input.presentmentCurrencyRate);
  const logos=logoContract?count(line.logos?.value,4):0;
  if(logoContract?(pricing.extraLogoCents!==1299||uploads+logos>4):pricing.extraLogoCents!==undefined||(line.logos?.value!==undefined&&line.logos.value!=='0'))throw Error('Invalid logo pricing configuration');
  if(!Number.isFinite(rate)||rate<=0)throw Error('Invalid currency conversion');
  const listCents=base+motifs*pricing.extraMotifCents+uploads*pricing.extraPhotoCents+logos*(pricing.extraLogoCents||0);
  if(!Number.isSafeInteger(listCents)||listCents>100000000)throw Error('Invalid personalization price');
  const unitCents=logoContract?logoTierPrice(listCents,pricing,line.quantity):listCents;
  const amount=(unitCents*rate/100).toFixed(2);
  operations.push({lineUpdate:{cartLineId:line.id,price:{adjustment:{fixedPricePerUnit:{amount}}}}});
 }
 return {operations};
}
// V2 is a separate explicit release. Keep the captured V1 program's arithmetic.
function logoTierPrice(cents,pricing,quantity){
 if(pricing.quantityTiers===undefined){if(pricing.quantityTierScope!==undefined)throw Error('Invalid quantity pricing');return cents;}
 if(pricing.quantityTierScope!=='complete-unit'||!Array.isArray(pricing.quantityTiers)||pricing.quantityTiers.length>10||!Number.isSafeInteger(quantity)||quantity<1||quantity>99)throw Error('Invalid quantity pricing');
 let previous=1,percent=0;
 for(const tier of pricing.quantityTiers){
  if(!tier||Object.keys(tier).sort().join(',')!=='minQuantity,percentOff'||!Number.isSafeInteger(tier.minQuantity)||tier.minQuantity<2||tier.minQuantity>99||tier.minQuantity<=previous||!Number.isFinite(tier.percentOff)||tier.percentOff<=0||tier.percentOff>=100||Math.abs(tier.percentOff*100-Math.round(tier.percentOff*100))>=1e-9)throw Error('Invalid quantity pricing');
  previous=tier.minQuantity;if(quantity>=tier.minQuantity)percent=tier.percentOff;
 }
 return Math.round(cents*(10000-Math.round(percent*100))/10000);
}
