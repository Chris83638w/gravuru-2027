import {quote,resolvedOptions} from './contract.mjs';
import {uploadQuote} from './ux-model.mjs';
export const variantKey=options=>JSON.stringify(Object.entries(options).sort());
export function commercePrice(config,state,quantity=1){
 const q=quote(config,state.objects,state.designId,state.mOptions,quantity),photos=uploadQuote(state.objects,quantity,false,config.photo);
 return {...q,chargedUploads:config.photo.extraPriceCents?photos.unitCents/config.photo.extraPriceCents:0,unitCents:q.unitCents+photos.unitCents,totalCents:q.totalCents+photos.totalCents,key:variantKey(q.options)};
}
export function validateCommerce(config,binding){
 if(binding?.schema!=='gravuru-shopify-commerce/v2'||!/^gid:\/\/shopify\/Product\/\d+$/.test(binding.productId)||binding.profileId!==config.profile.id||String(binding.revision)!==String(config.profile.revision)||binding.currency!=='EUR')throw Error('Shop-Produktzuordnung stimmt nicht mit dem Entwurf überein.');
 if(!['base-only','shopify-cart-transform'].includes(binding.priceMode))throw Error('Preisberechnung nicht zugeordnet.');
 if(binding.priceMode==='shopify-cart-transform'&&!/^gid:\/\/shopify\/CartTransform\//.test(binding.cartTransformId||''))throw Error('Shopify-Aufpreisberechnung nicht aktiviert.');
 if(JSON.stringify(binding.designIds)!==JSON.stringify(config.profile.designs.map(d=>d.id)))throw Error('Designumfang stimmt nicht mit der Shop-Fassung überein.');
 const ids=new Set(),keys=new Set();for(const v of binding.variants){if(!/^\d+$/.test(v.id)||ids.has(v.id)||keys.has(v.key)||!Number.isSafeInteger(v.priceCents))throw Error('Doppelte oder ungültige Shop-Variante.');ids.add(v.id);keys.add(v.key);}
 let combinations=[{}];for(const g of config.profile.optionGroups)combinations=combinations.flatMap(o=>g.values.map(v=>({...o,[g.id]:v.id})));
 for(const options of combinations){const v=binding.variants.find(v=>v.key===variantKey(resolvedOptions(config,options))),price=config.basePriceCents+config.profile.optionGroups.reduce((n,g)=>n+g.values.find(v=>v.id===options[g.id]).priceCents,0);if(!v||v.priceCents!==price)throw Error('Shop-Preiszuordnung fehlt oder weicht ab.');}
 if(binding.variants.length!==combinations.length)throw Error('Shop-Varianten dürfen nur Produktausführungen abbilden.');return binding;
}
export function selectCommerceVariant(config,binding,state,quantity=1){
 const price=commercePrice(config,state,quantity),variant=binding.variants.find(v=>v.key===price.key);
 if(!variant)throw Error('Diese Ausführung ist derzeit nicht bestellbar.');
 if(binding.priceMode!=='shopify-cart-transform'&&(price.additionalMotifs||price.chargedUploads))throw Error('Die Aufpreisberechnung ist noch nicht freigeschaltet.');
 return {...price,variantId:variant.id,baseVariantCents:variant.priceCents};
}

