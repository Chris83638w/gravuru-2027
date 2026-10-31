import {cartTransformRun as currentPriceTransform} from './price-v1.mjs';
import {withCheckoutDesignImages} from '../checkout-image/cart-image.mjs';
import {legacyPrice} from './legacy-price.mjs';

// Keep the currently released V1 arithmetic and all existing quantity tiers.
// V2 adds a separately counted logo fee to the complete unit before that same
// discount/rounding step. No browser-supplied price is accepted.
export function cartTransformRun(input){
 const legacy=[];
 const lines=input.cart.lines.map(line=>{
  const item=line.merchandise,pricing=item?.__typename==='ProductVariant'?item.product.pricing?.jsonValue:null;
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
  const mapped={...pricing,schema:'gravuru-personalization-pricing/v1',variants:{...pricing.variants,[variantId]:base+logos*pricing.extraLogoCents}};
  return {...line,merchandise:{...item,product:{...item.product,pricing:{...item.product.pricing,jsonValue:mapped}}}};
 }).filter(Boolean);
 const current=currentPriceTransform({...input,cart:{...input.cart,lines}});
 return withCheckoutDesignImages(input,{operations:[...current.operations,...legacy]});
}
function readCount(value,max){
 if(!/^(0|[1-9]\d*)$/.test(value||'')||Number(value)>max)throw Error('Invalid personalization quantity');
 return Number(value);
}
