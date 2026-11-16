import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
function record(){
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete config.acrylic;
 const p=config.profile,text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
 Object.assign(text,{id:'name',text:'Test',size:5,x:110,y:70,w:20,h:8,rotation:0,customerEditable:true,acrylicFixed:false});
 p.material={kind:'slate',color:'#41494b',thicknessMm:6};p.processing={profileId:'slate-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
 p.features={...p.features,orderEnabled:false,productionConfirmed:false};p.designs=[{id:'test',name:'Prüfdesign',objects:[text]}];p.defaultDesignId='test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]}]}];
 config.basePriceCents=2199;config.localResources.photoExamples=[];config.localResources.photoPlaceholders=[];
 return {id:'cfg_11111111-1111-4111-8111-111111111111',revision:1,status:'draft',document:makeProductDocument(config)};
}
test('cached slate preparation stays isolated and changed prices, revisions and invalid documents are rechecked',()=>{
 const r=record(),first=prepareShopProduct(r),expected=structuredClone(first);
 first.variants[0].priceCents=1;first.designs[0].name='mutated';
 assert.deepEqual(prepareShopProduct(structuredClone(r)),expected);
 const changed=structuredClone(r);changed.document.config.basePriceCents+=100;
 assert.equal(prepareShopProduct(changed).variants[0].priceCents,2299);
 changed.revision=2;assert.equal(prepareShopProduct(changed).configuration.revision,2);
 const invalid=structuredClone(r);invalid.document.config.profile.optionGroups[0].values[0].holes=null;
 assert.throws(()=>prepareShopProduct(invalid));
 assert.deepEqual(prepareShopProduct(r),expected);
});
