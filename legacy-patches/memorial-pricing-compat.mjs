import {validateLegacyPricingLink} from '../app/configurator/variant-m/legacy-pricing-link.mjs';
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Unbekannter Laufzeitstand: '+a.slice(0,80));return s.replace(a,b);};
export function linkMemorialPricing(models,binding,pricing){
 if(models.length!==1||models[0].universal?.profile.id!=='P-f087d73f-b29e-43f8-ba1e-543d1daa95a8'||String(models[0].universal.profile.revision)!=='30'||binding.productId!=='gid://shopify/Product/16138083107196')throw Error('Nicht das geprüfte Gedenktafel-Produkt.');
 const result=structuredClone({models,binding});
 const config=result.models[0].universal;
 if(config.shopifyPricing!==undefined||result.binding.shopifyPricingRevision!==undefined)throw Error('Preisvertrag bereits verknüpft.');
 config.shopifyPricing={schema:'gravuru-legacy-pricing-link/v1',profileId:config.profile.id,profileRevision:String(config.profile.revision),pricing:structuredClone(pricing)};
 result.binding.shopifyPricingRevision=String(pricing.revision);
 validateLegacyPricingLink(config,result.binding);
 if(result.binding.schema!=='gravuru-shopify-commerce/v2'||JSON.stringify(result.binding.designIds)!==JSON.stringify(config.profile.designs.map(d=>d.id)))throw Error('Designumfang der Shop-Fassung weicht ab.');
 let combinations=[{}];for(const g of config.profile.optionGroups)combinations=combinations.flatMap(o=>g.values.map(v=>({...o,[g.id]:v.id})));
 if(combinations.length!==result.binding.variants.length)throw Error('Ausführungsumfang weicht ab.');
 for(const options of combinations){const key=JSON.stringify(Object.entries(options).sort()),v=result.binding.variants.find(v=>v.key===key),price=config.basePriceCents+config.profile.optionGroups.reduce((n,g)=>n+g.values.find(v=>v.id===options[g.id]).priceCents,0);if(!v||v.priceCents!==price)throw Error('Ausführungspreis weicht ab.');}
 return result;
}
export function patchLegacyPricingModel(source){
 source="import {legacyPricingQuote,validateLegacyPricingLink} from './legacy-pricing-link.mjs';\n"+source;
 source=once(source,'totalCents:q.totalCents+photos.totalCents,key:variantKey(q.options)','totalCents:q.totalCents+photos.totalCents,...legacyPricingQuote(config,q.unitCents+photos.unitCents,quantity),key:variantKey(q.options)');
 return once(source,'export function validateCommerce(config,binding){','export function validateCommerce(config,binding){\n validateLegacyPricingLink(config,binding);');
}
export function patchLegacyPricingCommerce(source){
 source="import {commercePricingRevision} from './legacy-pricing-link.mjs';\n"+source;
 return once(source,'_gravuru_revision:String(binding.revision)','_gravuru_revision:commercePricingRevision(config,binding)');
}
export function patchLegacyPricingUX(source){
 source="import {legacyPricingQuote} from './legacy-pricing-link.mjs';\n"+source;
 source=once(source,'let total,base,options=0,motifs=0;','let total,base,options=0,motifs=0,priceTier=null;');
 source=once(source,'total=q.totalCents+extra.totalCents;base=config.basePriceCents;','priceTier=legacyPricingQuote(config,q.unitCents+extra.unitCents,quantity);total=priceTier.totalCents;base=config.basePriceCents;');
 return once(source,'<p>Menge: ${quantity}</p><p>Gesamt:','<p>Menge: ${quantity}</p>${priceTier?.quantityTier?`<p>Mengenrabatt: ${esc(String(priceTier.quantityTier.percentOff))} % · −${money(priceTier.discountCents)} je Stück</p>`:\'\'}<p>Gesamt:');
}
