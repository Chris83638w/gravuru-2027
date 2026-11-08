import {cartTransformRun as currentPriceTransform} from './price-v1.mjs';
import {withCheckoutDesignImages} from '../checkout-image/cart-image.mjs';
import {legacyPrice} from './legacy-price.mjs';
import {createPricingResolver} from './pricing-history.mjs';
import {readSelectedOptions,priceSelectedOptions} from './priced-options.mjs';

// Keep the currently released V1 arithmetic and all existing quantity tiers.
// V2 adds a separately counted logo fee to the complete unit before that same
// discount/rounding step. No browser-supplied price is accepted.
export function cartTransformRun(input){
 const pricingForLine=createPricingResolver();
 const legacy=[];
 const lines=input.cart.lines.map(line=>{
  let item=line.merchandise;const pricing=pricingForLine(line);
  if(pricing&&pricing.schema!=='gravuru-personalization-pricing/v2'&&pricing!==item.product.pricing?.jsonValue){item={...item,product:{...item.product,pricing:{...item.product.pricing,jsonValue:pricing}}};line={...line,merchandise:item};}
  const optionsContract=pricing?.schema==='gravuru-personalization-pricing/v3';
  if(optionsContract){
   if(pricing.enabled!==true||pricing.productId!==item.product.id||pricing.currency!=='EUR')throw Error('Invalid option pricing configuration');
   const ids=readSelectedOptions(line.options?.value),optionCents=priceSelectedOptions(pricing.optionPrices,ids);
   const logos=readCount(line.logos?.value??'0',4),uploads=readCount(line.uploads?.value,4);
   if(logos+uploads>4||pricing.extraLogoCents!==undefined&&pricing.extraLogoCents!==1299||logos>0&&pricing.extraLogoCents!==1299)throw Error('Invalid option/logo pricing configuration');
   const variantId=item.id.split('/').pop(),base=pricing.variants?.[variantId];
   if(!Number.isSafeInteger(base)||base<0||base>100000000)throw Error('Invalid variant price');
   const mapped={...pricing,schema:'gravuru-personalization-pricing/v1',variants:{...pricing.variants,[variantId]:base+optionCents+logos*(pricing.extraLogoCents||0)}};
   return {...line,merchandise:{...item,product:{...item.product,pricing:{...item.product.pricing,jsonValue:mapped}}}};
  }
  if(pricing?.enabled&&line.options?.value)throw Error('Paid options require V3 pricing');
  if(pricing?.schema!=='gravuru-personalization-pricing/v2'){
   if(pricing?.enabled&&(pricing.extraLogoCents!==undefined||line.logos?.value!==undefined&&line.logos.value!=='0'))throw Error('Logo requires V2 pricing');
   return line;
  }
  if(!pricing.enabled||pricing.extraLogoCents!==1299)throw Error('Invalid logo pricing configuration');
  if(pricing.productId!==item.product.id||pricing.currency!=='EUR')throw Error('Invalid product pricing configuration');
  const previous=legacyPrice(line,pricing,input.presentmentCurrencyRate);
  if(previous){legacy.push(previous);return null;}
  const logos=readCount(line.logos?.value,4),uploads=readCount(line.uploads?.value,4);
  if(logos+uploads>4)throw Error('Invalid combined upload count');
  const variantId=item.id.split('/').pop(),base=pricing.variants?.[variantId];
  if(!Number.isSafeInteger(base)||base<0||base>100000000)throw Error('Invalid variant price');
  const mapped={...pricing,schema:'gravuru-personalization-pricing/v1',variants:{[variantId]:base+logos*pricing.extraLogoCents}};
  return {...line,merchandise:{...item,product:{...item.product,pricing:{...item.product.pricing,jsonValue:mapped}}}};
 }).filter(Boolean);
 const current=currentPriceTransform({...input,cart:{...input.cart,lines}});
 return withCheckoutDesignImages(input,{operations:[...current.operations,...legacy]});
}
function readCount(value,max){
 if(!/^(0|[1-9]\d*)$/.test(value||'')||Number(value)>max)throw Error('Invalid personalization quantity');
 return Number(value);
}
