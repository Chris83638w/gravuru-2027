import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applySlateCustomerRules} from './slate-customer-rules.mjs';
import {familyProductConfig} from './product-families.mjs';
import {quote,prepareConfig} from '../configurator/variant-m/contract.mjs';
import {capturePersonalization} from './cart-personalization.mjs';
const seed=()=>({profile:{material:{kind:'slate'},themeId:'monogramme',geometry:{width:220,height:140},optionFields:['silikon','staender-klar','staender-schwarz'].map(id=>({id}))},slateAccessories:{choices:['silikon','staender-klar','staender-schwarz'].map(id=>({fieldId:id,optionId:id}))},extraMotifCents:0});
test('Monogramme offer no acrylic stands, retain silicone and do not mutate the source',()=>{
 const source=seed(),c=applySlateCustomerRules(source);
 assert.deepEqual(c.profile.optionFields.map(f=>f.id),['silikon']);assert.deepEqual(c.slateAccessories.choices.map(f=>f.fieldId),['silikon']);
 assert.equal(source.profile.optionFields.length,3);assert.equal(c.extraMotifCents,169);
});
test('memorial stands remain available except 600 x 300 mm, including portrait orientation',()=>{
 for(const [width,height,allowed] of [[220,140,true],[300,200,true],[600,300,false],[300,600,false]]){
  const c=seed();c.profile.themeId='gedenken';c.profile.geometry={width,height};
  assert.equal(applySlateCustomerRules(c).profile.optionFields.length,allowed?3:1);
 }
 const other=seed();other.profile.material.kind='steel';assert.deepEqual(applySlateCustomerRules(other),other);
});
test('real catalogue memorial themes retain stands and select the matching motif audience',()=>{
 for(const [themeId,motifTheme] of [['gedenktafeln','remembranceHuman'],['tiergedenktafeln','remembranceAnimal'],['hundegedenktafeln','remembranceAnimal'],['katzengedenktafeln','remembranceAnimal']]){
  const source=seed();source.profile.themeId=themeId;source.motifTheme='home';
  const c=applySlateCustomerRules(source);
  assert.deepEqual(c.profile.optionFields.map(f=>f.id),['silikon','staender-klar','staender-schwarz'],themeId);
  assert.equal(c.slateAccessories.choices.length,3,themeId);assert.equal(c.motifTheme,motifTheme);
  for(const [width,height] of [[600,300],[300,600]]){
   source.profile.geometry={width,height};const large=applySlateCustomerRules(source);
   assert.deepEqual(large.profile.optionFields.map(f=>f.id),['silikon']);
   assert.deepEqual(large.slateAccessories.choices.map(f=>f.fieldId),['silikon']);
  }
 }
 const generic=seed();generic.profile.themeId='gedenken';generic.motifTheme='remembranceAnimal';
 assert.equal(applySlateCustomerRules(generic).motifTheme,'remembranceAnimal');
 const house=seed();house.profile.themeId='hundeschilder';house.motifTheme='remembranceAnimal';
 assert.equal(applySlateCustomerRules(house).motifTheme,'home');
 assert.deepEqual(applySlateCustomerRules(house).profile.optionFields.map(f=>f.id),['silikon']);
});
test('native quote and Shopify snapshot contract agree on 0, 1 and 2 added motifs',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
 f.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
 const c=prepareConfig(applySlateCustomerRules(familyProductConfig(f,f.sizes[0],1))),d=c.profile.designs[0],base=quote(c,d.objects,d.id).unitCents;
 const template={id:'included',type:'motif',motif:'test',x:20,y:20,w:10,h:10,rotation:0};d.objects.push(template);
 assert.equal(quote(c,d.objects,d.id).unitCents,base,'original template motif included');
 for(const n of [1,2]){
  const objects=[...d.objects,...Array.from({length:n},(_,i)=>({...template,id:'extra'+i}))];
  assert.equal(quote(c,objects,d.id,{},2).totalCents,(base+n*169)*2);
 }
 const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:'gid://shopify/Product/1',revision:1,currency:'EUR',variants:{'11':base},extraMotifCents:169,extraPhotoCents:c.photo.extraPriceCents};
 assert.equal(capturePersonalization(pricing,{variantId:'11',baseCents:base,document:{config:c}}).extraMotifCents,169);
 assert.throws(()=>capturePersonalization({...pricing,extraMotifCents:0},{variantId:'11',baseCents:base,document:{config:c}}),/Aufpreisbindung/);
});
