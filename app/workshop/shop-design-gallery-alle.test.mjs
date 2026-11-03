import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {familyProductConfig} from './product-families.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {prepareConfig,quote} from '../configurator/variant-m/contract.mjs';
import {FAMILY_FORMATS_SCHEMA} from '../configurator/variant-m/family-formats.mjs';
import {createShopDesignGallery} from './shop-design-gallery.mjs';
import {galleryScope} from './shop-gallery-scope.mjs';

// Türschild-Konfi (Chris 03.11.2026, ENTSCHEIDUNGEN 4.42): ein Produkt mit allen Formen und Größen.
// Echte Katalogmaße/-preise (Testfixture), synthetische Namensvorlagen, keine Shopify-Verbindung.
function doorSignConfig(){
 const f=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),formats=[],designs=[];let c;
 const chosen=f.sizes.filter((s,i,list)=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80||list.findIndex(a=>a.groupKey===s.groupKey)===i).slice(0,3);
 for(const s of chosen){
  const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},n=familyProductConfig(view,s,1),p=n.profile;
  if(!c||s.groupKey==='AB'&&s.widthMm===120)c=n;
  const ids=[];
  for(const k of [1,2]){const d=structuredClone(p.designs[0]);d.id='ts-'+s.key+'-'+k;d.name='Design '+k;d.themes=['familienschilder'];d.katalog={designId:'TS-'+s.groupKey+'-D'+k,plateMm:[s.widthMm,s.heightMm]};const o=d.objects[0];Object.assign(o,{text:'Name',fieldKey:'name',size:3.2,x:s.widthMm/2,y:s.heightMm/2});measureText(o,n.localResources.fonts);designs.push(d);ids.push(d.id);}
  formats.push({key:s.key,form:s.groupKey,label:s.label,geometry:structuredClone(p.geometry),variants:[{color:'steel',familyId:f.id,sizeKey:s.key,basePriceCents:s.baseCents,material:p.material,mounting:p.optionGroups[0].values,designIds:ids}]});
 }
 const start=formats.find(s=>s.form==='AB')||formats[0];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:start.key,defaultColor:'steel',colors:[{id:'steel',label:'Edelstahl'}],formats,designs,source:{shopProduct:{sizeKey:start.key,themeId:'familienschilder',defaultDesignId:designs.find(d=>start.variants[0].designIds.includes(d.id)).katalog.designId,groessenWahl:'alle'}}};
 c.profile.themeId='familienschilder';c.profile.defaultDesignId=start.variants[0].designIds[0];
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',required:true,defaultValueId:start.key,values:formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}))},{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[{id:'K00',label:'Ohne',priceCents:0,currency:'EUR'}]}];
 delete c.familyAcrylic;return prepareConfig(c);
}
function setup(){
 const config=doorSignConfig(),scope={storeId:'test-store',tenantId:'test-tenant',shopDomain:'synthetic.myshopify.com'};
 const model={key:'acryl',galleryCategoryIds:['linie-edelstahl-tuerschilder','familie-steel-door-signs'],name:'Türschild Edelstahl',configuration:{id:'cfg_ts',revision:1},universal:config};
 const bindings=new Map(),store={storeId:scope.storeId,workshop:{tenantId:scope.tenantId,assets:{read(){throw Error('Unexpected asset read');}}},registry:{listActive:()=>structuredClone([...bindings.values()])}};
 config.familyFormats.formats.forEach((s,i)=>{const options={size:s.key,mounting:'K00'};const b={...scope,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(100+i),productId:'cfg_ts',productRevision:1,bindingId:'binding_'+i,assignmentRevision:1,options,unitCents:quote(config,[],s.variants[0].designIds[0],options).unitCents};bindings.set(b.shopifyVariantId,b);});
 const first=[...bindings.values()].find(b=>b.options.size===config.familyFormats.defaultSize),context={store,binding:structuredClone(first),session:{sid:'s1'}};
 const resolve=ids=>{const binding=bindings.get(ids.shopifyVariantId);if(!binding)throw Object.assign(Error('Inactive'),{status:404});return {store,binding:structuredClone(binding)};};
 const gallery=createShopDesignGallery({secret:'synthetic-only-gallery-secret',resolve,modelFor:()=>structuredClone(model),allowedAssets:()=>new Set()});
 return {config,model,bindings,context,gallery};
}

test('all-sizes product has its own gallery scope, not the store-wide door-sign line',()=>{
 const {model,context}=setup();
 assert.equal(galleryScope(model,context.binding).key,JSON.stringify(['product','cfg_ts',1]));
});
test('gallery lists the templates of the size chosen in the configurator and signs that variant',async()=>{
 const {config,model,bindings,context,gallery}=setup(),other=config.familyFormats.formats.find(s=>s.key!==context.binding.options.size);
 const own=await gallery.list(context,{sourceModel:model});
 assert.deepEqual(own.items.map(i=>i.designId),config.familyFormats.formats.find(s=>s.key===context.binding.options.size).variants[0].designIds);
 const result=await gallery.list(context,{sourceModel:model,options:{size:other.key,mounting:'K00'}});
 assert.deepEqual(result.items.map(i=>i.designId),other.variants[0].designIds);
 assert.ok(result.items.every(i=>i.current&&i.widthMm===other.geometry.width&&i.heightMm===other.geometry.height));
 const target=gallery.target(context,result.items[1].target);
 assert.equal(target.design.id,other.variants[0].designIds[1]);
 assert.deepEqual(target.binding,[...bindings.values()].find(b=>b.options.size===other.key));
});
test('a size without a Shopify variant is refused, never answered with another size',async()=>{
 const {model,context,gallery}=setup();
 await assert.rejects(gallery.list(context,{sourceModel:model,options:{size:'GR-ES-QU-999X999-T15',mounting:'K00'}}),{code:'shop_gallery_variant'});
});
