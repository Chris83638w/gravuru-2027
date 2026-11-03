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
function doorSignConfig(materials=['steel']){
 const load=m=>JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/'+m+'.json',import.meta.url)));
 const f=load(materials[0]),others=materials.slice(1).map(m=>[m,load(m)]),formats=[],designs=[];let c;
 const chosen=f.sizes.filter((s,i,list)=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80||list.findIndex(a=>a.groupKey===s.groupKey)===i).slice(0,3);
 for(const s of chosen){
  const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},n=familyProductConfig(view,s,1),p=n.profile;
  if(!c||s.groupKey==='AB'&&s.widthMm===120)c=n;
  const ids=[];
  for(const k of [1,2]){const d=structuredClone(p.designs[0]);d.id='ts-'+s.key+'-'+k;d.name='Design '+k;d.themes=['familienschilder'];d.katalog={designId:'TS-'+s.groupKey+'-D'+k,plateMm:[s.widthMm,s.heightMm]};const o=d.objects[0];Object.assign(o,{text:'Name',fieldKey:'name',size:3.2,x:s.widthMm/2,y:s.heightMm/2});measureText(o,n.localResources.fonts);designs.push(d);ids.push(d.id);}
  const variants=[{color:materials[0],familyId:f.id,sizeKey:s.key,basePriceCents:s.baseCents,material:p.material,mounting:p.optionGroups[0].values,designIds:ids}];
  for(const [m,o] of others){const t=o.sizes.find(x=>x.groupKey===s.groupKey&&x.widthMm===s.widthMm&&x.heightMm===s.heightMm);const ov={...o,groups:o.groups.filter(g=>g.key===t.groupKey),sizes:[t],mountingRules:o.mountingRules.filter(r=>t.mounting.includes(r.id))},op=familyProductConfig(ov,t,1).profile;variants.push({color:m,familyId:o.id,sizeKey:t.key,basePriceCents:t.baseCents,material:op.material,mounting:op.optionGroups[0].values,designIds:ids});}
  formats.push({key:s.key,form:s.groupKey,label:s.label,geometry:structuredClone(p.geometry),variants});
 }
 const start=formats.find(s=>s.form==='AB')||formats[0];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:start.key,defaultColor:materials[0],colors:materials.map(id=>({id,label:id})),formats,designs,source:{shopProduct:{sizeKey:start.key,themeId:'familienschilder',defaultDesignId:designs.find(d=>start.variants[0].designIds.includes(d.id)).katalog.designId,groessenWahl:'alle'}}};
 c.profile.themeId='familienschilder';c.profile.defaultDesignId=start.variants[0].designIds[0];
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',required:true,defaultValueId:start.key,values:formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}))},...(materials.length>1?[{id:'color',name:'Farbe',required:true,defaultValueId:materials[0],values:materials.map(id=>({id,label:id,priceCents:0,currency:'EUR'}))}]:[]),{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[{id:'K00',label:'Ohne',priceCents:0,currency:'EUR'}]}];
 delete c.familyAcrylic;return prepareConfig(c);
}
function setup(materials){
 const config=doorSignConfig(materials),scope={storeId:'test-store',tenantId:'test-tenant',shopDomain:'synthetic.myshopify.com'};
 const model={key:'acryl',galleryCategoryIds:['linie-edelstahl-tuerschilder','familie-steel-door-signs'],name:'Türschild Edelstahl',configuration:{id:'cfg_ts',revision:1},universal:config};
 const bindings=new Map(),store={storeId:scope.storeId,workshop:{tenantId:scope.tenantId,assets:{read(){throw Error('Unexpected asset read');}}},registry:{listActive:()=>structuredClone([...bindings.values()])}};
 let n=0;config.familyFormats.formats.forEach(s=>s.variants.forEach(v=>{const options={size:s.key,...(config.familyFormats.colors.length>1?{color:v.color}:{}),mounting:'K00'},i=n++;const b={...scope,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(100+i),productId:'cfg_ts',productRevision:1,bindingId:'binding_'+i,assignmentRevision:1,options,unitCents:quote(config,[],v.designIds[0],options).unitCents};bindings.set(b.shopifyVariantId,b);}));
 const first=[...bindings.values()].find(b=>b.options.size===config.familyFormats.defaultSize&&(!b.options.color||b.options.color===config.familyFormats.defaultColor)),context={store,binding:structuredClone(first),session:{sid:'s1'}};
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
test('two colours (Acryl schwarz/anthrazit): switching colour keeps gallery targets valid; options are normalised like the configurator',async()=>{
 const {model,bindings,context,gallery}=setup(['schwarz','anthrazit']),size=context.binding.options.size;
 const result=await gallery.list(context,{sourceModel:model,options:{size,color:'anthrazit'}});
 assert.ok(result.items.length>0);
 const target=gallery.target(context,result.items[0].target);
 assert.deepEqual(target.binding,[...bindings.values()].find(b=>b.options.size===size&&b.options.color==='anthrazit'));
 const same=await gallery.list(context,{sourceModel:model,options:{size}});
 assert.ok(same.items.every(i=>i.current));
 await assert.rejects(gallery.list(context,{sourceModel:model,options:{size,shape:'x'}}),{code:'shop_gallery_variant'});
});
test('a variant of another Shopify product bound to the same product revision is never used',async()=>{
 const {model,bindings,context,gallery}=setup(),other=[...bindings.values()].find(b=>b.options.size!==context.binding.options.size);
 other.shopifyProductId='gid://shopify/Product/2';
 await assert.rejects(gallery.list(context,{sourceModel:model,options:{size:other.options.size,mounting:'K00'}}),{code:'shop_gallery_variant'});
});
