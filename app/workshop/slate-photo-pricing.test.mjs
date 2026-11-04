import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateFamily,familyProductConfig,familySyncTarget} from './product-families.mjs';
import {quote,photoPolicyForDesign,variantCombinations} from '../configurator/variant-m/contract.mjs';
import {commercePrice,selectCommerceVariant,variantKey} from '../configurator/variant-m/commerce-model.mjs';
import {photoAvailableForDesign} from '../configurator/variant-m/ux-model.mjs';
const family=()=>{const f=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));f.id='schiefer-tafeln-natur';f.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};f.photo={includedCount:1,extraPriceCents:999};f.sizes=f.sizes.slice(0,1);f.sizes[0].baseCents=1999;f.sizes[0].photoDesignCents=2999;return f;};
const fixture=()=>{const f=family(),c=familyProductConfig(f,f.sizes[0],1);c.profile.designs.push({id:'foto',name:'Testfoto',objects:[{id:'photo',type:'photoSlot',x:45,y:30,w:20,h:20,rotation:0}]});return c;};
const uploads=n=>Array.from({length:n},(_,i)=>({id:'upload'+i,type:'photoSlot',uxUploadId:'f'+i,uxUploadKind:'photo'}));
test('85: selected original template controls base and photo credit, independent of customer objects',()=>{
 const c=fixture(),plain=c.profile.defaultDesignId;
 assert.equal(quote(c,[],'foto').selectedBasePriceCents,2999);
 assert.equal(quote(c,uploads(1),plain).selectedBasePriceCents,1999);
 for(const [designId,n,total] of [[plain,0,1999],[plain,1,2998],['foto',0,2999],['foto',1,2999],['foto',2,3998]]){
  const q=commercePrice(c,{designId,objects:uploads(n),mOptions:{mounting:'K00'}},2);assert.equal(q.unitCents,total);assert.equal(q.totalCents,total*2);
 }
 assert.equal(photoPolicyForDesign(c,'foto').includedCount,1);assert.equal(photoPolicyForDesign(c,plain).includedCount,0);
 assert.equal(photoAvailableForDesign(c,plain),true);
 assert.equal(commercePrice(c,{designId:'foto',objects:[...uploads(1),{...uploads(2)[1],uxHidden:true}],mOptions:{mounting:'K00'}}).unitCents,2999);
});
test('85: photo price is optional whole cents; no-photo sizes reject photo template pricing',()=>{
 for(const value of [null,-1,1.5,'2999']){const f=family();f.sizes[0].photoDesignCents=value;assert.throws(()=>validateFamily(f),/Fotodesignpreis/);}
 const f=family();delete f.sizes[0].photoDesignCents;validateFamily(f);const c=familyProductConfig(f,f.sizes[0],1);assert.equal(c.photo.enabled,false);
 const bad=fixture();delete bad.photoDesignCents;assert.throws(()=>quote(bad,[],'foto'),/kein Fotodesign/);
});
test('85: legacy pricing unchanged and family synchronization carries photo price',()=>{
 const c=fixture();delete c.photoDesignPricing;assert.equal(quote(c,[],'foto').unitCents,quote(c,[],c.profile.defaultDesignId).unitCents);
 const f=family(),d={name:'Test',config:fixture()};f.sizes[0].photoDesignCents=3499;assert.equal(familySyncTarget(d,f,f.sizes[0],2).config.photoDesignCents,3499);
});
test('85: cart receives photo base through verified transform; fixed base-only variants fail closed',()=>{
 const c=fixture(),b={schema:'gravuru-shopify-commerce/v2',productId:'gid://shopify/Product/1',profileId:c.profile.id,revision:c.profile.revision,currency:'EUR',priceMode:'shopify-cart-transform',designIds:c.profile.designs.map(d=>d.id),variants:variantCombinations(c).map((o,i)=>({id:String(i+1),key:variantKey(o),priceCents:quote(c,[],c.profile.defaultDesignId,o).unitCents}))};
 const state={designId:'foto',objects:uploads(2),mOptions:{mounting:'K00'}};
 assert.equal(selectCommerceVariant(c,b,state).unitCents,3998);
 b.priceMode='base-only';assert.throws(()=>selectCommerceVariant(c,b,{...state,objects:[]}),/nicht bestellbar/);
});
