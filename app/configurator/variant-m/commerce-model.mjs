import {quote,resolvedOptions,choiceOptions,variantCombinations,applyQuantityTier,quantityTiersOpen} from './contract.mjs';
import {uploadQuote} from './ux-model.mjs';
// Variant prices exclude customer-added motifs/photos and use the same persisted
// size/base rules as the configurator, including combination-dependent extras.
// Zusatzfelder (Ü12.1) sind keine Ausführung: Variantenpreis und -schlüssel nur aus der Gruppenwahl.
const baseVariantPrice=(config,options)=>quote(config,[],config.profile.defaultDesignId,choiceOptions(config,resolvedOptions(config,options))).unitCents;
export const variantKey=options=>JSON.stringify(Object.entries(options).sort());
export function commercePrice(config,state,quantity=1){
 const q=quote(config,state.objects,state.designId,state.mOptions,quantity),photos=uploadQuote(state.objects,quantity,false,config.photo);
 // Explicit new contract: discount the complete unit once, including all photos.
 // Older saved unscoped revisions remain readable with their original arithmetic.
 if(q.quantityTierScope==='complete-unit'){
  const listUnitCents=q.listUnitCents+photos.unitCents,unitCents=applyQuantityTier(listUnitCents,q.quantityTier);
  if(!Number.isSafeInteger(unitCents*quantity))throw Error('Ungültiger Gesamtpreis.');
  return {...q,chargedUploads:config.photo.extraPriceCents?photos.unitCents/config.photo.extraPriceCents:0,listUnitCents,unitCents,totalCents:unitCents*quantity,quantityTierDiscountCents:listUnitCents-unitCents,key:variantKey(choiceOptions(config,q.options))};
 }
 return {...q,chargedUploads:config.photo.extraPriceCents?photos.unitCents/config.photo.extraPriceCents:0,unitCents:q.unitCents+photos.unitCents,totalCents:q.totalCents+photos.totalCents,...(q.listUnitCents!==undefined?{listUnitCents:q.listUnitCents+photos.unitCents}:{}),key:variantKey(choiceOptions(config,q.options))};
}
export function validateCommerce(config,binding){
 if(binding?.schema!=='gravuru-shopify-commerce/v2'||!/^gid:\/\/shopify\/Product\/\d+$/.test(binding.productId)||binding.profileId!==config.profile.id||String(binding.revision)!==String(config.profile.revision)||binding.currency!=='EUR')throw Error('Shop-Produktzuordnung stimmt nicht mit dem Entwurf überein.');
 if(!['base-only','shopify-cart-transform'].includes(binding.priceMode))throw Error('Preisberechnung nicht zugeordnet.');
 if(binding.priceMode==='shopify-cart-transform'&&!/^gid:\/\/shopify\/CartTransform\//.test(binding.cartTransformId||''))throw Error('Shopify-Aufpreisberechnung nicht aktiviert.');
 if(JSON.stringify(binding.designIds)!==JSON.stringify(config.profile.designs.map(d=>d.id)))throw Error('Designumfang stimmt nicht mit der Shop-Fassung überein.');
 if(!Array.isArray(binding.variants))throw Error('Shop-Varianten fehlen.');
 const ids=new Set(),keys=new Set();for(const v of binding.variants){if(!/^\d+$/.test(v.id)||ids.has(v.id)||keys.has(v.key)||!Number.isSafeInteger(v.priceCents)||v.priceCents<0)throw Error('Doppelte oder ungültige Shop-Variante.');ids.add(v.id);keys.add(v.key);}
 const combinations=variantCombinations(config);
 for(const options of combinations){const v=binding.variants.find(v=>v.key===variantKey(options)),price=baseVariantPrice(config,options);if(!v||v.priceCents!==price)throw Error('Shop-Preiszuordnung fehlt oder weicht ab.');}
 if(binding.variants.length!==combinations.length)throw Error('Shop-Varianten dürfen nur Produktausführungen abbilden.');return binding;
}
export function selectCommerceVariant(config,binding,state,quantity=1){
 if(quantityTiersOpen(config.quantityTiers))throw Error('Mengenstaffel noch offen; Warenkorb nicht freigegeben.');
 const price=commercePrice(config,state,quantity),variant=binding.variants.find(v=>v.key===price.key);
 if(!variant)throw Error('Diese Ausführung ist derzeit nicht bestellbar.');
 if(variant.priceCents!==baseVariantPrice(config,price.options))throw Error('Der Shop-Preis passt nicht mehr zur gespeicherten Ausführung.');
 if(binding.priceMode!=='shopify-cart-transform'&&((price.chargedMotifs??price.additionalMotifs)||price.chargedUploads||price.fieldCents))throw Error('Die Aufpreisberechnung ist noch nicht freigeschaltet.');
 // Ein fester Variantenpreis kann keine Staffel abbilden; der Shop würde den Listenpreis berechnen.
 if(binding.priceMode!=='shopify-cart-transform'&&price.quantityTier)throw Error('Die Mengenstaffel ist im Shop-Warenkorb noch nicht freigeschaltet.');
 return {...price,variantId:variant.id,baseVariantCents:variant.priceCents};
}

