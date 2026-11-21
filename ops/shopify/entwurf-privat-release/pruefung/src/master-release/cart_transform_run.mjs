import {cartTransformRun as currentPriceTransform} from './price-v1.mjs';
import {withCheckoutDesignImages} from '../checkout-image/cart-image.mjs';
import {legacyPrice} from './legacy-price.mjs';
import {createPricingResolver} from './pricing-history.mjs';

// Keep the currently released V1 arithmetic and all existing quantity tiers.
// V2 adds a separately counted logo fee to the complete unit before that same
// discount/rounding step. No browser-supplied price is accepted.
//
// Einzelsperre (Chris 15.11.2026): Grundlage ist exakt die aktive Version
// gravuru-2027-steel-pricing-input-20261108-v2. Einzige Änderung: Jede Position wird
// für sich mit denselben strengen Regeln bepreist. Eine abgewiesene Position bekommt
// keinen Preis und wird von der Checkout-Prüfung (cart_validation_run.mjs) gesperrt,
// statt Shopify jede Warenkorbänderung ablehnen zu lassen.
export function cartTransformRun(input){return runPricing(input,true).result;}
export function cartTransformStrict(input){return runPricing(input,false).result;}
export function rejectedPricingLines(input){return runPricing(input,true).rejected;}
function runPricing(input,isolate){
 const pricingForLine=createPricingResolver();
 const prepared=[],legacy=[],rejected=[];
 const reject=(index,error)=>rejected.push({index,lineId:input.cart.lines[index].id,reason:String(error?.message||error)});
 input.cart.lines.forEach((line,index)=>{
  try{
   const own=priceOne(withDesignReference(line),pricingForLine,input);
   if(own.legacy)legacy.push(own.legacy);else prepared.push({index,line:own.line});
  }catch(error){if(!isolate)throw error;reject(index,error);}
 });
 const priceLines=list=>currentPriceTransform({...input,cart:{...input.cart,lines:list.map(p=>p.line)}}).operations;
 // Normalfall wie bisher in einem Aufruf (gleiche Rechenkosten); nur bei einem Fehler Position für Position.
 let priced;
 try{priced=priceLines(prepared);}
 catch(error){
  if(!isolate)throw error;
  priced=[];
  for(const p of prepared){try{priced.push(...priceLines([p]));}catch(lineError){reject(p.index,lineError);}}
 }
 rejected.sort((a,b)=>a.index-b.index);
 return {result:withCheckoutDesignImages(input,{operations:[...priced,...legacy]}),rejected};
}
// Entwurfsnachweis (Chris 21.11.2026: „Bearbeitbarer Entwurf“ soll für Kunden nicht mehr sichtbar sein). Neue Positionen
// tragen ihn unter dem privaten Schlüssel `_gravuru_entwurf` (Eingabe `designPrivate`), ältere unter dem sichtbaren
// (Eingabe `designFile`). Beide Lesarten gelten gleich und werden danach exakt wie bisher geprüft. Tragen beide Schlüssel
// einen Wert und sind die Werte verschieden, ist die Angabe ungültig: Die Position bekommt keinen Preis und wird am Checkout
// gesperrt (Einzelsperre), wie jede andere abgewiesene Position.
function withDesignReference(line){
 const hidden=line.designPrivate?.value;
 if(hidden==null)return line;
 const visible=line.designFile?.value;
 if(visible!=null&&visible!==hidden)throw Error('Conflicting design reference');
 return {...line,designFile:{value:hidden}};
}
function priceOne(line,pricingForLine,input){
 {
  let item=line.merchandise;const pricing=pricingForLine(line);
  if(pricing&&pricing.schema!=='gravuru-personalization-pricing/v2'&&pricing!==item.product.pricing?.jsonValue){item={...item,product:{...item.product,pricing:{...item.product.pricing,jsonValue:pricing}}};line={...line,merchandise:item};}
  if(pricing?.schema!=='gravuru-personalization-pricing/v2'){
   if(pricing?.enabled&&(pricing.extraLogoCents!==undefined||line.logos?.value!==undefined&&line.logos.value!=='0'))throw Error('Logo requires V2 pricing');
   return {line};
  }
  if(!pricing.enabled||pricing.extraLogoCents!==1299)throw Error('Invalid logo pricing configuration');
  if(pricing.productId!==item.product.id||pricing.currency!=='EUR')throw Error('Invalid product pricing configuration');
  const previous=legacyPrice(line,pricing,input.presentmentCurrencyRate);
  if(previous)return {legacy:previous};
  const logos=readCount(line.logos?.value,4),uploads=readCount(line.uploads?.value,4);
  if(logos+uploads>4)throw Error('Invalid combined upload count');
  const variantId=item.id.split('/').pop(),base=pricing.variants?.[variantId];
  if(!Number.isSafeInteger(base)||base<0||base>100000000)throw Error('Invalid variant price');
  const mapped={...pricing,schema:'gravuru-personalization-pricing/v1',variants:{[variantId]:base+logos*pricing.extraLogoCents}};
  return {line:{...line,merchandise:{...item,product:{...item.product,pricing:{...item.product.pricing,jsonValue:mapped}}}}};
 }
}
function readCount(value,max){
 if(!/^(0|[1-9]\d*)$/.test(value||'')||Number(value)>max)throw Error('Invalid personalization quantity');
 return Number(value);
}
