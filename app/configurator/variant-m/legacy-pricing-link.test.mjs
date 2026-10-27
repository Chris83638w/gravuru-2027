import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLegacyPricingLink,commercePricingRevision,legacyPricingQuote} from './legacy-pricing-link.mjs';
import {linkMemorialPricing,patchLegacyPricingModel,patchLegacyPricingCommerce,patchLegacyPricingUX} from '../../../legacy-patches/memorial-pricing-compat.mjs';
import {applyQuantityTier,quantityTierFor} from './contract.mjs';
const fixture=()=>{
 const config={profile:{id:'P-f087d73f-b29e-43f8-ba1e-543d1daa95a8',revision:30,designs:[{id:'D1',objects:[{id:'text1',text:'Wunschmann'}]}],optionGroups:[{id:'mounting',values:[{id:'OHNE',priceCents:0},{id:'B02',priceCents:299}]}]},basePriceCents:2299,extraMotifCents:169,photo:{enabled:true,extraPriceCents:999,includedCount:0},localResources:{fonts:{original:'unchanged'}}};
 const binding={schema:'gravuru-shopify-commerce/v2',productId:'gid://shopify/Product/16138083107196',profileId:config.profile.id,revision:'30',currency:'EUR',priceMode:'shopify-cart-transform',cartTransformId:'gid://shopify/CartTransform/172523900',designIds:['D1'],variants:[{id:'57509812633980',key:'[["mounting","OHNE"]]',priceCents:2299},{id:'57509812666748',key:'[["mounting","B02"]]',priceCents:2598}]};
 const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:binding.productId,revision:'31',currency:'EUR',extraMotifCents:169,extraPhotoCents:999,variants:Object.fromEntries(binding.variants.map(v=>[v.id,v.priceCents])),quantityTiers:[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}],quantityTierScope:'complete-unit'};
 return {models:[{universal:config}],binding,pricing};
};
test('price revision changes without relabeling or altering the saved design and fonts',()=>{
 const f=fixture(),before=structuredClone(f),result=linkMemorialPricing(f.models,f.binding,f.pricing);
 assert.deepEqual(f,before);assert.deepEqual(result.models[0].universal.profile,f.models[0].universal.profile);
 assert.deepEqual(result.models[0].universal.localResources,f.models[0].universal.localResources);
 assert.equal(result.binding.revision,'30');assert.equal(commercePricingRevision(result.models[0].universal,result.binding),'31');
});
test('unlinked legacy products retain revision and complete original price',()=>{
 const f=fixture();assert.equal(commercePricingRevision(f.models[0].universal,f.binding),'30');
 assert.equal(legacyPricingQuote(f.models[0].universal,3467,3).totalCents,10401);
 f.binding.shopifyPricingRevision='31';assert.throws(()=>validateLegacyPricingLink(f.models[0].universal,f.binding),/ohne Preisvertrag/);
});
test('strict contract rejects mismatched product, design, currency, variants, extras and open tiers',()=>{
 const changes=[
  p=>p.productId='gid://shopify/Product/1',p=>p.revision='oops',p=>p.currency='USD',p=>p.enabled=false,
  p=>p.extraPhotoCents=998,p=>p.extraMotifCents=170,p=>p.variants['57509812633980']=2298,
  p=>delete p.variants['57509812633980'],p=>p.variants['1']=2299,
  p=>p.quantityTiers[0].percentOff=null,p=>p.quantityTiers.reverse(),p=>p.quantityTierScope='base-only',
  p=>p.quantityTiers=[{minQuantity:2,unitCents:1}],p=>p.unknownPriceRule=true
 ];
 for(const mutate of changes){const f=fixture();mutate(f.pricing);assert.throws(()=>linkMemorialPricing(f.models,f.binding,f.pricing));}
 for(const mutate of [f=>f.binding.revision='29',f=>f.binding.designIds=[],f=>f.models[0].universal.basePriceCents=2300,f=>f.models[0].universal.profile.id='another']){
  const f=fixture();mutate(f);assert.throws(()=>linkMemorialPricing(f.models,f.binding,f.pricing));
 }
 const f=fixture(),r=linkMemorialPricing(f.models,f.binding,f.pricing);r.binding.shopifyPricingRevision='32';assert.throws(()=>commercePricingRevision(r.models[0].universal,r.binding));
});
test('complete-unit tiers include the photo, house motif and mounting exactly once',()=>{
 const f=fixture(),c=linkMemorialPricing(f.models,f.binding,f.pricing).models[0].universal;
 assert.equal(legacyPricingQuote(c,2299+169,1).unitCents,2468);
 assert.equal(legacyPricingQuote(c,2299+169+999,1).unitCents,3467);
 assert.equal(legacyPricingQuote(c,3467,2).unitCents,3259);
 assert.equal(legacyPricingQuote(c,3467,2).totalCents,6518);
 assert.equal(legacyPricingQuote(c,3467,3).unitCents,3120);
 assert.equal(legacyPricingQuote(c,3766,3).totalCents,10167);
 for(const n of [1,2,3,4,99])for(const base of [2299,2598])for(const motifs of [0,1,2])for(const photos of [0,1,4]){
  const list=base+motifs*169+photos*999,q=legacyPricingQuote(c,list,n);
  assert.equal(q.unitCents,applyQuantityTier(list,quantityTierFor(f.pricing,n)));
  assert.equal(q.totalCents,q.unitCents*n);
 }
 for(const n of [0,100,1.5,NaN])assert.throws(()=>legacyPricingQuote(c,3467,n));
});
test('unknown or already patched runtime refuses a blind rewrite',()=>{
 for(const patch of [patchLegacyPricingModel,patchLegacyPricingCommerce,patchLegacyPricingUX])assert.throws(()=>patch('unknown revision'),/Unbekannter Laufzeitstand/);
 const source='_gravuru_revision:String(binding.revision)';
 const patched=patchLegacyPricingCommerce(source);assert.match(patched,/commercePricingRevision\(config,binding\)/);
 assert.throws(()=>patchLegacyPricingCommerce(patched));
});
