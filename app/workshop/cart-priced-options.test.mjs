import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {familyProductConfig} from './product-families.mjs';
import {prepareConfig,optionFieldEntries} from '../configurator/variant-m/contract.mjs';
import {commercePrice} from '../configurator/variant-m/commerce-model.mjs';
import {capturePersonalization,personalizationForSnapshot,personalizationAttributes} from './cart-personalization.mjs';
import {cartTransformRun,cartTransformStrict,rejectedPricingLines} from '../../ops/shopify/master-release/cart_transform_run.mjs';
const prices={silikon:699,'staender-klar':1399,'staender-schwarz':1599};
function fixture(baseCents=2199,tiers=false){
 const family=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
 family.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
 const raw=familyProductConfig(family,family.sizes[0],1);raw.basePriceCents=baseCents;raw.extraMotifCents=169;
 raw.profile.optionFields=Object.entries(prices).map(([id,priceCents])=>({id,kind:'checkbox',label:id,priceCents}));
 if(tiers){raw.quantityTiers=[{minQuantity:3,percentOff:10}];raw.quantityTierScope='complete-unit';}
 const config=prepareConfig(raw),design=config.profile.designs[0];
 const pricing={schema:'gravuru-personalization-pricing/v3',enabled:true,productId:'gid://shopify/Product/101',revision:1,currency:'EUR',variants:{301:baseCents},extraMotifCents:169,extraPhotoCents:config.photo.extraPriceCents,optionPrices:prices,...(tiers?{quantityTiers:raw.quantityTiers,quantityTierScope:'complete-unit'}:{})};
 const document={config},contract=capturePersonalization(pricing,{variantId:'301',baseCents,document});
 return {config,design,pricing,document,contract};
}
function snapshot(f,options={},added=0,quantity=1){
 const objects=[...f.design.objects,...Array.from({length:added},(_,i)=>({id:'added-'+i,type:'motif',motif:'synthetic',x:20,y:20,w:5,h:5,rotation:0}))];
 const price=commercePrice(f.config,{objects,designId:f.design.id,mOptions:options},quantity);
 return {id:'proof_options',packageSha256:'a'.repeat(64),product:{basePriceCents:price.unitCents},selection:{price,fields:optionFieldEntries(f.config,options)}};
}
function transform(f,result,quantity,run=cartTransformRun){
 const attributes=Object.fromEntries(personalizationAttributes(result.personalization).map(a=>[a.key,a.value]));
 return run({presentmentCurrencyRate:'1',cart:{lines:[{id:'line',quantity,
  motifs:{value:attributes._gravuru_motifs},uploads:{value:attributes._gravuru_uploads},options:{value:attributes._gravuru_options},revision:{value:attributes._gravuru_revision},designFile:{value:attributes['Bearbeitbarer Entwurf']},
  merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/301',product:{id:f.pricing.productId,pricing:{jsonValue:f.pricing}}}}]}});
}
test('both confirmed slate base prices and all eight accessory combinations agree through editor, snapshot, attributes and checkout',()=>{
 for(const base of [2199,2399])for(const tiers of [false,true]){
  const f=fixture(base,tiers);
  for(let mask=0;mask<8;mask++)for(const added of [0,1,2])for(const quantity of [1,3,5]){
   const options=Object.fromEntries(Object.keys(prices).filter((_,i)=>mask&(1<<i)).map(id=>[id,true]));
   const manifest=snapshot(f,options,added,quantity),result=personalizationForSnapshot(f.contract,manifest);
   const list=base+Object.keys(options).reduce((n,id)=>n+prices[id],0)+added*169,expected=tiers&&quantity>=3?Math.floor((list*90+50)/100):list;
   assert.equal(result.unitCents,expected);assert.equal(manifest.selection.price.totalCents,expected*quantity);
   assert.equal(transform(f,result,quantity).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,(expected/100).toFixed(2));
  }
 }
});
test('tampered field amounts, false values, duplicates and unpriced paid fields are rejected before cart creation',()=>{
 const f=fixture();
 for(const change of [m=>m.selection.price.fieldCents=0,m=>m.selection.fields[0].priceCents=1,m=>m.selection.fields[0].value=false,m=>m.selection.fields.push({...m.selection.fields[0]}),m=>m.selection.fields[0].id='foreign']){
  const m=snapshot(f,{silikon:true});change(m);assert.throws(()=>personalizationForSnapshot(f.contract,m),/Aufpreisbindung/);
 }
});
test('app-owned prices must match the saved product and unsupported paid input kinds stay blocked',()=>{
 for(const change of [p=>p.optionPrices.silikon=1,p=>delete p.optionPrices.silikon,p=>p.optionPrices.foreign=50]){
  const f=fixture(),p=structuredClone(f.pricing);change(p);assert.throws(()=>capturePersonalization(p,{variantId:'301',baseCents:2199,document:f.document}),/Aufpreisbindung/);
 }
 const f=fixture();f.document.config.profile.optionFields.push({id:'paid-text',kind:'text',label:'Text',priceCents:100});
 assert.throws(()=>capturePersonalization(f.pricing,{variantId:'301',baseCents:2199,document:f.document}),/Aufpreisbindung/);
});
test('checkout accepts the explicit no-options marker and rejects missing, unknown, duplicate or browser-priced options',()=>{
 const f=fixture(),result=personalizationForSnapshot(f.contract,snapshot(f));assert.equal(result.personalization.options,'-');assert.equal(transform(f,result,1).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'21.99');
 for(const value of [undefined,'','foreign','silikon,silikon','silikon:1','staender-klar,silikon']){
  // Chris 15.11.2026: streng abgewiesen (bisherige Prüfung wirft), aber nur diese Position: kein Preis, Sperrliste für den Checkout.
  const changed={...result,personalization:{...result.personalization,options:value}};assert.throws(()=>transform(f,changed,1,cartTransformStrict));
  let ops;try{ops=transform(f,changed,1).operations;}catch{continue;}// schon die Warenkorbangaben werden serverseitig verweigert
  assert.deepEqual(ops,[]);assert.equal(transform(f,changed,1,rejectedPricingLines).length,1);
 }
});
