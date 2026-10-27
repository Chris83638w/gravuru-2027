import {quantityTiersIssue,quantityTiersOpen,quantityTierFor,applyQuantityTier} from './quantity-tiers.mjs';

// Design revision and app-owned Shopify pricing revision are distinct contracts.
export function validateLegacyPricingLink(config,binding){
 const link=config.shopifyPricing;
 if(link===undefined){if(binding.shopifyPricingRevision!==undefined)throw Error('Preisstand ohne Preisvertrag.');return null;}
 const p=link.pricing;
 if(link.schema!=='gravuru-legacy-pricing-link/v1'||link.profileId!==config.profile.id||String(link.profileRevision)!==String(config.profile.revision)||String(binding.revision)!==String(config.profile.revision)||binding.profileId!==config.profile.id||binding.priceMode!=='shopify-cart-transform'||!/^gid:\/\/shopify\/CartTransform\//.test(binding.cartTransformId||''))throw Error('Preisvertrag gehört nicht zu diesem Gestaltungsstand.');
 if(p?.schema!=='gravuru-personalization-pricing/v1'||p.enabled!==true||p.productId!==binding.productId||!/^gid:\/\/shopify\/Product\/\d+$/.test(p.productId)||p.currency!=='EUR'||binding.currency!=='EUR'||!/^[1-9]\d*$/.test(String(p.revision))||!Number.isSafeInteger(Number(p.revision))||String(p.revision)!==String(binding.shopifyPricingRevision))throw Error('Shopify-Preisstand stimmt nicht überein.');
 if(Object.keys(p).some(k=>!['schema','enabled','productId','revision','currency','extraMotifCents','extraPhotoCents','variants','quantityTiers','quantityTierScope'].includes(k)))throw Error('Unbekannte Shopify-Preisregel.');
 if(![p.extraMotifCents,p.extraPhotoCents].every(n=>Number.isSafeInteger(n)&&n>=0)||p.extraMotifCents!==config.extraMotifCents||p.extraPhotoCents!==config.photo?.extraPriceCents)throw Error('Foto- oder Motivpreis weicht ab.');
 if(!p.variants||typeof p.variants!=='object'||Array.isArray(p.variants)||!Array.isArray(binding.variants)||Object.keys(p.variants).length!==binding.variants.length||new Set(binding.variants.map(v=>v.id)).size!==binding.variants.length)throw Error('Variantenumfang des Preisvertrags weicht ab.');
 for(const v of binding.variants)if(!Object.hasOwn(p.variants,v.id)||!Number.isSafeInteger(v.priceCents)||v.priceCents<0||p.variants[v.id]!==v.priceCents)throw Error('Variantenpreis des Preisvertrags weicht ab.');
 if(p.quantityTierScope!=='complete-unit'||quantityTiersIssue(p.quantityTiers,{allowUnitCents:false})||quantityTiersOpen(p.quantityTiers))throw Error('Shopify-Mengenstaffel fehlt oder ist ungültig.');
 return p;
}
export const commercePricingRevision=(config,binding)=>String(validateLegacyPricingLink(config,binding)?.revision??binding.revision);

export function legacyPricingQuote(config,listUnitCents,quantity){
 if(!Number.isInteger(quantity)||quantity<1||quantity>99)throw Error('Menge: 1 bis 99.');
 if(!Number.isSafeInteger(listUnitCents)||listUnitCents<0)throw Error('Ungültiger Gesamtpreis.');
 const p=config.shopifyPricing?.pricing;
 if(!p)return {unitCents:listUnitCents,totalCents:listUnitCents*quantity,listUnitCents,discountCents:0,quantityTier:null};
 if(p.quantityTierScope!=='complete-unit'||quantityTiersIssue(p.quantityTiers,{allowUnitCents:false})||quantityTiersOpen(p.quantityTiers))throw Error('Shopify-Mengenstaffel fehlt oder ist ungültig.');
 const tier=quantityTierFor(p,quantity),unitCents=applyQuantityTier(listUnitCents,tier);
 if(!Number.isSafeInteger(unitCents*quantity))throw Error('Ungültiger Gesamtpreis.');
 return {unitCents,totalCents:unitCents*quantity,listUnitCents,discountCents:listUnitCents-unitCents,quantityTier:tier};
}
