import fs from 'node:fs';
import {createHash} from 'node:crypto';

export const manifest = JSON.parse(fs.readFileSync(new URL('./sources-manifest.json',import.meta.url),'utf8'));
export const sourceEvidence = manifest.files.map(entry => {
  const bytes=fs.readFileSync(new URL(entry.file,import.meta.url));
  const gitBlobSha1=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(gitBlobSha1!==entry.gitBlobSha1)throw Error('Source hash mismatch: '+entry.file);
  return {...entry,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),verified:true};
});
const source=name=>fs.readFileSync(new URL('./sources/'+name,import.meta.url),'utf8');

// Only module linking is replaced. All function bodies remain the fetched,
// hash-verified source, including their validations and rounding.
// No network, database, storefront or full editor is started by this harness.
function link(name,exports,dependencies={}){
  const text=source(name)
    .replace(/^import .*;\s*$/gm,'')
    .replace(/^export \{.*\} from .*;\s*$/gm,'')
    .replace(/^export (?=(?:async )?function |const |let |class )/gm,'');
  return Function(...Object.keys(dependencies),'"use strict";\n'+text+'\nreturn {'+exports.join(',')+'};')(...Object.values(dependencies));
}
const unsupported=()=>{throw Error('Outside this native-slate price pilot; full product validation is not claimed.');};
const fields=link('option-fields.mjs',['optionFields','visibleBy','fieldValue','fieldPrice','fieldDisplay']);
const surfaces=link('surfaces.mjs',['hasBack','backSurcharge'],{processProfile:unsupported});
export const contract=link('contract.mjs',['quantityTiersIssue','activeQuantityTiers','quantityTierFor','applyQuantityTier','quantityTierLabels','quote','resolvedOptions','choiceOptions','variantCombinations'],{
  ...fields,...surfaces,acrylicSelection:unsupported,acrylicOptions:unsupported
});
const uploads=link('ux-model.mjs',['uploadQuote']);
export const commerce=link('commerce-model.mjs',['commercePrice','selectCommerceVariant','validateCommerce','variantKey'],{...contract,...uploads});
export const personalization=link('cart-personalization.mjs',['personalizationForSnapshot','tierDiscount'],contract);
export const defaults=JSON.parse(source('quantity-tier-defaults.json'));
export const family=JSON.parse(source('schiefer-natur.json'));
const katalog=source('katalog-convert.mjs');
const marker='export function defaultQuantityTiers(';
const start=katalog.indexOf(marker),end=katalog.indexOf('\nexport function priceGaps(',start);
if(start<0||end<0)throw Error('Source boundaries changed: defaultQuantityTiers.');
export const defaultQuantityTiers=Function('quantityTierDefaults','"use strict";\n'+katalog.slice(start,end).replace(/^export /,'')+'\nreturn defaultQuantityTiers;')(()=>defaults);

export function fixture({photoCents=899,includedPhotos=1}={}){
  // The genuine source family supplies product type, base price and mounting.
  // This is a synthetic pricing fixture, NOT a publishable product or shop binding.
  // Photo surcharge 899 is deliberately a test input, not a claim for this 30x20 family.
  const size=family.sizes[0];
  const quantityTiers=defaultQuantityTiers({id:'gedenktafeln-30x20'},{themeId:'tiergedenktafeln'}).tiers;
  return {
    basePriceCents:size.baseCents,extraMotifCents:169,quantityTiers,
    photo:{enabled:true,includedCount:includedPhotos,extraPriceCents:photoCents},
    profile:{id:'pricing-pilot-'+family.id,revision:'synthetic-1',
      defaultDesignId:'pricing-only',designs:[{id:'pricing-only',objects:[]}],
      optionGroups:[{id:'mounting',name:'Befestigung',defaultValueId:'K00',values:[
        {id:'K00',priceCents:0},
        ...family.mountingRules.map(r=>({id:r.skuSuffix,priceCents:r.priceCents}))
      ]}]}
  };
}
export function state(config,objects=[],mounting='K00'){
  return {designId:config.profile.defaultDesignId,objects,mOptions:{mounting}};
}

