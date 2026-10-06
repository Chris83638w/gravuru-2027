import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {validateCommerce,selectCommerceVariant,variantKey} from './commerce-model.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const bases={none:0,buche:899,eiche:999,nussbaum:1099,klar:399,satiniert:499,'holz-flach':599};
const config=()=>makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},{fonts:resources.fonts,motifs:resources.motifs},'a'.repeat(64));
function binding(c){return {schema:'gravuru-shopify-commerce/v2',productId:'gid://shopify/Product/1',profileId:c.profile.id,revision:c.profile.revision,currency:'EUR',priceMode:'base-only',designIds:c.profile.designs.map(d=>d.id),variants:['small','large'].flatMap(size=>Object.entries(bases).flatMap(([base,price])=>['none','wall'].map(wall=>({key:variantKey({size,base,wall}),priceCents:(size==='small'?1499:1999)+price+(size==='large'&&base!=='none'?100:0)+(wall==='wall'?599:0)})))).map((v,i)=>({...v,id:String(100+i)}))};}
function state(c,options={size:'large',base:'eiche',wall:'wall'}){const d=c.profile.designs[0];return {designId:d.id,objects:structuredClone(d.objects),mOptions:options};}
test('commerce accepts all 28 independently priced acrylic combinations and quantities',()=>{
 const c=config(),b=binding(c);assert.equal(validateCommerce(c,b),b);assert.equal(b.variants.length,28);
 for(const v of b.variants){const result=selectCommerceVariant(c,b,state(c,Object.fromEntries(JSON.parse(v.key))),3);assert.equal(result.unitCents,v.priceCents);assert.equal(result.baseVariantCents,v.priceCents);assert.equal(result.totalCents,v.priceCents*3);assert.equal(result.variantId,v.id);}
 assert.equal(selectCommerceVariant(c,b,state(c)).unitCents,3697);
});
test('commerce rejects the old missing large-base surcharge and later stale prices',()=>{
 const c=config(),b=binding(c);b.variants.find(v=>v.key===variantKey({size:'large',base:'eiche',wall:'wall'})).priceCents-=100;
 assert.throws(()=>validateCommerce(c,b),/Preiszuordnung/);assert.throws(()=>selectCommerceVariant(c,b,state(c)),/Shop-Preis/);
 const good=binding(c);validateCommerce(c,good);c.acrylic.pricing.largeBaseExtraCents=200;
 assert.throws(()=>validateCommerce(c,good),/Preiszuordnung/);assert.throws(()=>selectCommerceVariant(c,good,state(c)),/Shop-Preis/);
 for(const v of good.variants){const o=Object.fromEntries(JSON.parse(v.key));if(o.size==='large'&&o.base!=='none')v.priceCents+=100;}
 assert.doesNotThrow(()=>validateCommerce(c,good));assert.equal(selectCommerceVariant(c,good,state(c)).unitCents,3797);
});
test('commerce still uses generic option prices for non-acrylic profiles',()=>{
 const c=config();delete c.acrylic;c.basePriceCents=1500;c.profile.optionGroups=[{id:'finish',defaultValueId:'plain',values:[{id:'plain',priceCents:0},{id:'custom',priceCents:500}]}];
 const b=binding(config());b.variants=[{id:'1',key:variantKey({finish:'plain'}),priceCents:1500},{id:'2',key:variantKey({finish:'custom'}),priceCents:2000}];
 assert.doesNotThrow(()=>validateCommerce(c,b));assert.equal(selectCommerceVariant(c,b,state(c,{finish:'custom'}),2).totalCents,4000);
});
test('extra motifs and photos cannot bypass the explicit surcharge integration',()=>{
 const c=config(),b=binding(c),s=state(c);c.extraMotifCents=169;s.objects.push({id:'extra',type:'motif',motif:'test-extra'});
 assert.throws(()=>selectCommerceVariant(c,b,s),/Aufpreisberechnung/);
 b.priceMode='shopify-cart-transform';assert.throws(()=>validateCommerce(c,b),/nicht aktiviert/);b.cartTransformId='gid://shopify/CartTransform/1';validateCommerce(c,b);
 assert.equal(selectCommerceVariant(c,b,s).unitCents,3866);
 s.objects.pop();c.photo.extraPriceCents=500;s.objects.push({type:'image',uxUploadId:'one',uxUploadKind:'photo'},{type:'image',uxUploadId:'two',uxUploadKind:'photo'});
 const q=selectCommerceVariant(c,b,s,2);assert.equal(q.chargedUploads,1);assert.equal(q.unitCents,4197);assert.equal(q.totalCents,8394);b.priceMode='base-only';assert.throws(()=>selectCommerceVariant(c,b,s),/Aufpreisberechnung/);
});
test('commerce rejects incomplete, duplicate and stale binding metadata',()=>{
 const c=config();for(const change of [b=>{delete b.variants;},b=>{b.variants.pop();},b=>{b.variants[0].priceCents=-1;},b=>{b.variants[1].id=b.variants[0].id;},b=>{b.revision='wrong';},b=>{b.designIds=[];}]){const b=binding(c);change(b);assert.throws(()=>validateCommerce(c,b));}
});
