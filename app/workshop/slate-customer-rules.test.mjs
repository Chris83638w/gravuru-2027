import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applySlateCustomerRules} from './slate-customer-rules.mjs';
import {familyProductConfig} from './product-families.mjs';
import {quote,prepareConfig} from '../configurator/variant-m/contract.mjs';
import {capturePersonalization} from './cart-personalization.mjs';
const seed=()=>({profile:{material:{kind:'slate'},themeId:'monogramme',geometry:{shape:'rect',width:220,height:140},optionFields:['silikon','staender-klar','staender-schwarz'].map(id=>({id}))},slateAccessories:{choices:['silikon','staender-klar','staender-schwarz'].map(id=>({fieldId:id,optionId:id}))},extraMotifCents:0});
test('Monogramme offer no acrylic stands, retain silicone and do not mutate the source',()=>{
 const source=seed(),c=applySlateCustomerRules(source);
 assert.deepEqual(c.profile.optionFields.map(f=>f.id),['silikon']);assert.deepEqual(c.slateAccessories.choices.map(f=>f.fieldId),['silikon']);
 assert.equal(source.profile.optionFields.length,3);assert.equal(c.extraMotifCents,169);
});
test('only confirmed rectangular and square memorial blanks fit the stand in either orientation',()=>{
 for(const [shape,width,height,allowed] of [['rect',400,300,true],['rect',300,400,true],['rect',300,300,true],['rect',400,301,false],['rect',401,300,false],['rect',560,180,false],['rect',600,300,false],['ellipse',355,355,false],['ellipse',200,100,false],['contour',220,140,false],[undefined,220,140,false]]){
  const c=seed();c.profile.themeId='gedenken';c.profile.geometry={shape,width,height};
  const result=applySlateCustomerRules(c);
  assert.equal(result.profile.optionFields.length,allowed?3:1);
  assert.equal(result.slateAccessories.choices.length,allowed?3:1);
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
   source.profile.geometry={shape:'rect',width,height};const large=applySlateCustomerRules(source);
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
test('a newly generated slate family projects only physically permitted accessories and retains their catalogue prices',()=>{
 const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
 family.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
 family.options=[{id:'zubehoer',label:'Zubehör',kind:'accessory',selection:'multiple',choices:[
  {id:'silikon',label:'Silikon',priceCents:599},{id:'staender-klar',label:'Klar',priceCents:1399},{id:'staender-schwarz',label:'Schwarz',priceCents:1599}]}];
 const size=family.sizes.find(s=>family.groups.find(g=>g.key===s.groupKey)?.shape==='rect');
 for(const [widthMm,heightMm,eligible] of [[400,300,true],[560,180,false]]){
  const c=familyProductConfig(family,{...size,widthMm,heightMm},1);
  const fields=c.profile.optionFields.map(({id,priceCents})=>[id,priceCents]);
  assert.deepEqual(fields,eligible?[['silikon',599],['staender-klar',1399],['staender-schwarz',1599]]:[['silikon',599]]);
 }
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
