import fs from 'node:fs';
import {commerce,defaultQuantityTiers} from './load-pricing.mjs';
export const observation=JSON.parse(fs.readFileSync(new URL('./observed-product-20261021.json',import.meta.url),'utf8'));
export function observedConfig(){
  return {
    basePriceCents:observation.observed.baseCents,extraMotifCents:observation.observed.motifCents,
    quantityTiers:defaultQuantityTiers({id:'gedenktafeln-30x20'},{themeId:'gedenktafeln'}).tiers,
    // One chargeable photo is the supplied test case. This does not establish
    // the live product's free-photo allowance.
    photo:{enabled:true,includedCount:0,extraPriceCents:observation.observed.photoCents},
    profile:{id:'isolated-observation-only',revision:'observation-5',defaultDesignId:'price-check',
      designs:[{id:'price-check',objects:[]}],
      optionGroups:[{id:'mounting',name:'Befestigung',defaultValueId:'observed-none',values:structuredClone(observation.observed.mounting)}]}
  };
}
export const observedState=(mounting='observed-none',withPhoto=true)=>({
  designId:'price-check',
  objects:withPhoto?[{id:'test-photo',type:'photoSlot',uxUploadId:'synthetic-no-file',uxUploadKind:'photo'}]:[],
  mOptions:{mounting}
});
export function observedSummary(){
  const config=observedConfig();
  return {
    provenance:observation.source,requestedPricing:observation.requestedPricing,testScope:observation.testScope,
    cases:[1,2,3,4].map(quantity=>{
      const price=commerce.commercePrice(config,observedState(),quantity);
      return {quantity,chargedPhotos:1,mounting:'Ohne Befestigung',unitCents:price.unitCents,totalCents:price.totalCents,tier:price.quantityTier};
    }),
    liveCartVerified:false
  };
}

