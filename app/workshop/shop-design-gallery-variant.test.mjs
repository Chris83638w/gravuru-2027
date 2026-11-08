import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {familyProductConfig} from './product-families.mjs';
const runtime=process.env.GRAVURU_GALLERY_RUNTIME;
const load=(file)=>import(runtime?pathToFileURL(path.join(runtime,file)):new URL('../'+file.replace(/^app\//,''),import.meta.url));
const {createShopDesignGallery}=await load('app/workshop/shop-design-gallery.mjs');
const {quote,selectedProfile}=await load('app/configurator/variant-m/contract.mjs');
const {familyFormatOptions}=await load('app/configurator/variant-m/family-formats.mjs');
function configFixture(){
 if(process.env.GRAVURU_GALLERY_CANDIDATE)return JSON.parse(fs.readFileSync(process.env.GRAVURU_GALLERY_CANDIDATE)).config;
 const source=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),sizes=source.sizes.filter(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80||s.groupKey==='RE'&&s.widthMm===150&&s.heightMm===100),formats=[],designs=[];let config;
 for(const size of sizes){const view={...source,groups:source.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:source.mountingRules.filter(r=>size.mounting.includes(r.id))},c=familyProductConfig(view,size,1),d={id:'test-'+size.key,name:'Template '+size.groupKey,objects:[],katalog:{designId:'TEST-'+size.groupKey+'-D1',plateMm:[size.widthMm,size.heightMm]}};config??=c;designs.push(d);formats.push({key:size.key,form:size.groupKey,label:size.label,geometry:c.profile.geometry,variants:[{color:'steel',familyId:source.id,sizeKey:size.key,basePriceCents:size.baseCents,material:c.profile.material,mounting:c.profile.optionGroups[0].values,designIds:[d.id]}]});}
 config.familyFormats={schema:'gravuru-family-formats/v1',defaultSize:formats[0].key,defaultColor:'steel',colors:[{id:'steel',label:'Edelstahl'}],formats,designs,source:{shopProduct:{groessenWahl:'alle'}}};delete config.familyAcrylic;return config;
}
function fixture(){
 const config=configFixture(),scope={storeId:'acryl',tenantId:'gravuru',shopDomain:'test.myshopify.com'},sourceSize=config.familyFormats.formats.find(f=>f.form==='AB'&&f.geometry.width===120&&f.geometry.height===80).key,targetSize=config.familyFormats.formats.find(f=>f.form==='RE'&&f.geometry.width===150&&f.geometry.height===100).key;
 const options=[{size:sourceSize,mounting:'K00'},{size:sourceSize,mounting:'KGL'},{size:targetSize,mounting:'KGL'}].map(o=>familyFormatOptions(config,o));
 const model={key:'acryl',name:'Door sign',configuration:{id:'cfg_test',revision:4},galleryCategoryIds:['linie-edelstahl-tuerschilder'],universal:config};
 const active=options.map((o,i)=>({...scope,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(101+i),productId:'cfg_test',productRevision:4,bindingId:'binding-'+i,assignmentRevision:4,options:o,unitCents:quote(config,[],selectedProfile(config,o).designs[0].id,o).unitCents}));
 let saved=active.map(b=>({id:b.bindingId,shopDomain:b.shopDomain,variantId:b.shopifyVariantId.split('/').at(-1),productId:b.productId,productRevision:b.productRevision,options:structuredClone(b.options),unitCents:b.unitCents})),resolveCalls=0,lookupCalls=0,allowed=true;
 const missing=()=>Object.assign(Error('Inactive'),{code:'shop_binding_active_not_found',status:404});
 const store={storeId:scope.storeId,workshop:{tenantId:scope.tenantId,orderIntake:{tenantId:scope.tenantId,bindings:()=>{lookupCalls++;return structuredClone(saved);}}},registry:{listActive(){throw Error('Global scan is forbidden');},resolve(ids){resolveCalls++;const found=active.find(b=>b.shopifyVariantId===ids.shopifyVariantId);if(!found)throw missing();return structuredClone(found);}}};
 const context={store,binding:structuredClone(active[0]),session:{sid:'test-session'}},resolve=ids=>({store,binding:store.registry.resolve(ids)});
 const gallery=createShopDesignGallery({secret:'synthetic-test-secret',resolve,modelFor:()=>model,cardFor:()=>model,allowedAssets:()=>new Set(),checkBinding:()=>{if(!allowed)throw Object.assign(Error('Paused'),{status:423,code:'paused'});}});
 return {store,context,model,active,options,gallery,list:(i=0)=>gallery.list(context,{sourceModel:model,options:options[i]}),saved:()=>saved,setSaved:rows=>saved=rows,calls:()=>({resolveCalls,lookupCalls}),pause:()=>allowed=false};
}
test('start and changed mounting/size use exact active IDs without a global product scan',async()=>{
 const f=fixture(),start=await f.list();assert.ok(start.total);assert.deepEqual(f.calls(),{resolveCalls:0,lookupCalls:0});
 for(const i of [1,2]){const result=await f.list(i);assert.ok(result.total);assert.ok(result.items.every(c=>c.shopifyVariantId===f.active[i].shopifyVariantId));const selected=selectedProfile(f.model.universal,f.options[i]);assert.deepEqual(result.items.map(c=>c.designId),selected.designs.filter(d=>d.hidden!==true&&d.released!==false&&d.katalog?.fit!=='passt nicht').slice(0,40).map(d=>d.id));const target=f.gallery.target(f.context,result.items[0].target);assert.deepEqual(target.binding.options,f.options[i]);assert.equal(target.price.unitCents,result.items[0].unitCents);}
 assert.equal(f.calls().lookupCalls,2);assert.equal(f.calls().resolveCalls,4);
});
test('foreign saved rows never become authority; missing or duplicate active matches fail closed',async()=>{
 const f=fixture(),valid=structuredClone(f.saved()[2]);f.setSaved([{...valid,shopDomain:'foreign.myshopify.com'},{...valid,productId:'cfg_foreign'},{...valid,productRevision:3}]);await assert.rejects(f.list(2),{code:'shop_gallery_variant'});assert.equal(f.calls().resolveCalls,0);
 f.setSaved([valid,{...valid,variantId:'999'}]);assert.ok((await f.list(2)).total,'inactive historical ID is not authority');f.active.push({...f.active[2],shopifyVariantId:'gid://shopify/ProductVariant/999',bindingId:'binding-other'});await assert.rejects(f.list(2),{code:'shop_gallery_variant'});
});
test('fresh active binding cannot switch shop, tenant, store, product, revision, variant or options',async()=>{
 for(const patch of [{shopDomain:'foreign.myshopify.com'},{tenantId:'foreign'},{storeId:'foreign'},{productId:'cfg_foreign'},{productRevision:3},{shopifyProductId:'gid://shopify/Product/2'},{options:{size:'foreign',mounting:'KGL'}}]){const f=fixture();Object.assign(f.active[2],patch);await assert.rejects(f.list(2),{code:'shop_gallery_changed'});}
 const f=fixture();f.store.workshop.orderIntake.tenantId='foreign';await assert.rejects(f.list(2),{code:'shop_gallery_changed'});
});
test('price, hidden design and pause checks remain active after the targeted lookup',async()=>{
 const f=fixture();f.active[2].unitCents++;assert.equal((await f.list(2)).total,0);f.active[2].unitCents--;
 const profile=selectedProfile(f.model.universal,f.options[2]),id=profile.designs[0].id,design=f.model.universal.familyFormats.designs.find(d=>d.id===id);design.hidden=true;assert.ok(!(await f.list(2)).items.some(c=>c.designId===id));delete design.hidden;design.released=false;assert.ok(!(await f.list(2)).items.some(c=>c.designId===id));delete design.released;f.pause();await assert.rejects(f.list(2),{code:'paused'});
});
