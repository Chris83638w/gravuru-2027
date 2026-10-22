import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {makeProductDocument} from './product-model.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeFormProduct, FORM_MATERIALS} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';
import {productionSubject} from './production-profiles.mjs';
import {planShopProductBindings, resolveShopProductBinding} from './shop-product-binding-plan.mjs';

// All records are synthetic. Only pure preparation/validation functions are used;
// no repository/profile/SQLite constructor, backup database or network call.
const id='cfg_00000000-0000-0000-0000-000000000001', otherId='cfg_00000000-0000-0000-0000-000000000002';
const profileId='mfg_00000000-0000-0000-0000-000000000003';
const tenantId='gravuru', shopDomain='synthetic.myshopify.com', storeId='synthetic-store';
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
function nativeDocument(){
 const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},{fonts:resources.fonts,motifs:resources.motifs},'a'.repeat(64));
 return makeProductDocument(config,{name:'Synthetic native product'});
}
function formDocument(material='oak',method='engraving'){
 const geometry={schema:'gravuru-contour/v1',unit:'mm',measurement:'path-centerline',widthMm:120,heightMm:80,pageWidthMm:120,pageHeightMm:80,sourceOriginMm:[0,0],holeCount:1,
  contours:[{role:'outer',d:'M0 0 L120 0 L110 80 L0 80 Z'},{role:'hole',d:'M5 5 L7 5 L7 7 L5 7 Z'}],warnings:[]};
 let d=makeFormProduct({id:'a'.repeat(64),sourceSha256:'b'.repeat(64),geometrySha256:hash(geometry),geometry},'Synthetic free contour');
 d.material={id:material,thicknessMm:3,surfaceNotes:'Synthetic'};d.processingMethod=method;d.basePriceCents=2599;
 return addFormDesign(d,{assetId:'c'.repeat(64),sourceSha256:'d'.repeat(64),originalName:'synthetic.svg',widthMm:100,heightMm:60},{name:'Synthetic design',designId:'synthetic-design'});
}
function fixture(document=nativeDocument()){
 document.productionProfile={id:profileId,revision:2};
 const record={id,revision:5,status:'active',document,metadata:{synthetic:true}};
 const subject=productionSubject(document), profile={id:profileId,revision:2,sha256:hash('synthetic-profile'),document:{...subject,archived:false},blockers:['Synthetic machine proof pending']};
 const bindings=[],calls=[];
 const workshop={tenantId,sessionContext:{shopDomain},repository:{tenantId,get(productId){calls.push(['get',productId]);if(productId!==id)throw Object.assign(Error('do not expose'),{status:404});return record;}},
  orderIntake:{tenantId,bindings(){calls.push(['bindings']);return bindings;}},
  productionProfiles:{resolve(d){calls.push(['profile']);assert.deepEqual(productionSubject(d),subject);return profile;}}};
 const options={storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}};
 return {record,profile,bindings,calls,workshop,options,adapter:createShopBindingReadAdapter(options)};
}
function binding(overrides={}){return {id:'binding_00000000-0000-0000-0000-000000000010',shopDomain,variantId:'100',productId:id,productRevision:5,unitCents:2599,options:{},...overrides};}

test('real native preparation preserves all 28 combinations and canonical base prices',()=>{
 const f=fixture(),before=structuredClone(f.record),prepared=prepareShopProduct(f.record);
 assert.equal(prepared.variants.length,28);
 for(const variant of prepared.variants)assert.deepEqual(f.adapter.resolveSelection(f.adapter.getCurrentProduct(id),variant.options),{options:variant.options,unitCents:variant.priceCents});
 assert.equal(f.adapter.resolveSelection(f.adapter.getCurrentProduct(id),{size:'large',base:'eiche',wall:'wall'}).unitCents,3697);
 assert.deepEqual(f.record,before);assert.equal(f.adapter.readiness(id).ready,true);
});
test('every existing form material and both methods retain original fixed geometry and base price',()=>{
 for(const material of FORM_MATERIALS)for(const method of ['engraving','print']){
  const f=fixture(formDocument(material.id,method)),before=structuredClone(f.record),record=f.adapter.getCurrentProduct(id);
  assert.equal(prepareShopProduct(record).sourceReady,true);
  assert.deepEqual(f.adapter.resolveSelection(record,{}),{options:{},unitCents:2599});
  assert.equal(f.adapter.readiness(record).ready,true);assert.deepEqual(f.record,before);
  assert.deepEqual(record.document.form,before.document.form);assert.equal(record.document.form.geometry.holeCount,1);
 }
});
test('missing production profile blocks only that readiness; canonical selection remains available',()=>{
 const f=fixture(formDocument());delete f.record.document.productionProfile;
 const ready=f.adapter.readiness(id);assert.equal(ready.sourceReady,true);assert.equal(ready.ready,false);
 assert.deepEqual(ready.blockers.map(b=>b.code),['production_profile_missing']);assert.equal(ready.productionProfileRef,null);
 assert.deepEqual(f.adapter.resolveSelection(f.adapter.getCurrentProduct(id),{}),{options:{},unitCents:2599});
});
test('missing form design/material/price produces concrete source blockers without global failure',()=>{
 const f=fixture(formDocument());delete f.record.document.productionProfile;delete f.record.document.designs;delete f.record.document.defaultDesignId;
 f.record.document.material.id=null;f.record.document.basePriceCents=null;
 const ready=f.adapter.readiness(id);assert.equal(ready.sourceReady,false);
 for(const code of ['source_designs','source_material','source_price','production_profile_missing'])assert.ok(ready.blockers.some(b=>b.code===code));
 assert.throws(()=>f.adapter.resolveSelection(f.adapter.getCurrentProduct(id),{}),{code:'shop_binding_source_not_ready'});
});
test('immutable current records reject changed revision, status, metadata, document and browser prices',()=>{
 const f=fixture(formDocument());
 for(const change of [r=>r.revision++,r=>r.status='draft',r=>r.metadata.injected=true,r=>r.document.basePriceCents=1]){
  const record=f.adapter.getCurrentProduct(id);change(record);
  assert.throws(()=>f.adapter.resolveSelection(record,{}),{code:'shop_binding_revision'});
  assert.ok(f.adapter.readiness(record).blockers.some(b=>b.code==='shop_binding_revision'));
 }
});
test('options must exactly match existing variants, not customer fields or inferred defaults',()=>{
 const f=fixture();for(const selected of [{},{size:'small',base:'none',wall:'none',customerText:'hello'},{size:'small',base:'unknown',wall:'none'}])
  assert.throws(()=>f.adapter.resolveSelection(f.adapter.getCurrentProduct(id),selected),{code:'shop_binding_selection'});
 const form=fixture(formDocument());assert.throws(()=>form.adapter.resolveSelection(form.adapter.getCurrentProduct(id),{size:'small'}),{code:'shop_binding_selection'});
});
test('record, binding and profile outputs are copies and never mutate store-owned values',()=>{
 const f=fixture(formDocument());f.bindings.push(binding());const record=f.adapter.getCurrentProduct(id),profile=f.adapter.resolveProductionProfile(record.document),bindings=f.adapter.getBindings();
 profile.document.archived=true;bindings[0].options.injected='x';record.document.name='changed';
 assert.equal(f.profile.document.archived,false);assert.deepEqual(f.bindings[0].options,{});assert.notEqual(f.record.document.name,'changed');
 assert.throws(()=>f.adapter.resolveProductionProfile(record.document),{code:'shop_binding_profile_document'});
 assert.throws(()=>f.adapter.resolveProductionProfile(structuredClone(f.record.document)),{code:'shop_binding_profile_document'});
});
test('profile reference, revision, archive state and fixed product freshness stay strict',()=>{
 for(const change of [f=>f.profile.revision++,f=>f.profile.id='mfg_wrong',f=>f.profile.document.archived=true,f=>f.profile.sha256='wrong']){
  const f=fixture(formDocument());change(f);assert.ok(f.adapter.readiness(id).blockers.some(b=>b.code==='production_profile_invalid'));
 }
 const f=fixture(),record=f.adapter.getCurrentProduct(id);f.record.revision++;
 assert.throws(()=>f.adapter.resolveProductionProfile(record.document),{code:'shop_binding_revision'});
});
test('constructor requires server-confirmed identity for every injected instance and profile scope',()=>{
 for(const change of [o=>o.workshop.tenantId='foreign',o=>o.workshop.repository.tenantId='foreign',o=>o.workshop.orderIntake.tenantId='foreign',o=>o.workshop.sessionContext.shopDomain='other.myshopify.com']){
  const f=fixture();change(f.options);assert.throws(()=>createShopBindingReadAdapter(f.options),{code:'shop_binding_adapter_scope'});
 }
 for(const scope of [undefined,{}, {storeId:'foreign',tenantId},{storeId,tenantId:'foreign'}]){
  const f=fixture();assert.throws(()=>createShopBindingReadAdapter({...f.options,productionProfileScope:scope}),{code:'shop_binding_profile_scope'});
 }
});
test('later instance replacement or scope drift is not softened into a readiness blocker',()=>{
 const f=fixture();f.workshop.repository={...f.workshop.repository};
 assert.throws(()=>f.adapter.readiness(id),{code:'shop_binding_adapter_scope'});
 const g=fixture();g.workshop.sessionContext.shopDomain='changed.myshopify.com';
 assert.throws(()=>g.adapter.getBindings(),{code:'shop_binding_adapter_scope'});
});
test('read methods reject asynchronous injected stores',()=>{
 const f=fixture();f.workshop.repository.get=()=>Promise.resolve(f.record);
 assert.throws(()=>f.adapter.getCurrentProduct(id),{code:'shop_binding_adapter_async'});
 assert.throws(()=>f.adapter.readiness(id),{code:'shop_binding_adapter_async'});
 const g=fixture();g.workshop.orderIntake.bindings=()=>Promise.resolve([]);
 assert.throws(()=>g.adapter.getBindings(),{code:'shop_binding_adapter_async'});
});
test('bindings are shop filtered and historical revisions remain historical',()=>{
 const f=fixture(formDocument());f.bindings.push(binding(),binding({id:'old',productRevision:4}),binding({shopDomain:'other.myshopify.com'}));
 assert.equal(f.adapter.getBindings().length,2);assert.equal(f.adapter.readiness(id).ready,true);
 assert.equal(f.bindings.length,3);assert.equal(f.bindings[1].productRevision,4);
});
test('existing cross-product variant and duplicate selection conflicts are explicit blockers',()=>{
 const f=fixture(formDocument());f.bindings.push(binding(),binding({productId:otherId}));
 assert.ok(f.adapter.readiness(id).blockers.some(b=>b.code==='binding_variant_product_conflict'));
 const g=fixture(formDocument());g.bindings.push(binding(),binding({variantId:'200'}));
 assert.ok(g.adapter.readiness(id).blockers.some(b=>b.code==='binding_selection_ambiguous'));
});
test('missing product is a per-product blocker without leaking repository error text',()=>{
 const f=fixture();const ready=f.adapter.readiness(otherId);assert.equal(ready.ready,false);
 assert.equal(ready.blockers[0].code,'shop_binding_product_missing');assert.ok(!JSON.stringify(ready).includes('do not expose'));
});
test('strict plan and resolver consume adapter without weakening missing profile gate',()=>{
 const f=fixture(formDocument()),now=Date.now();
 const args={tenantId,shopDomain,adapter:f.adapter,now,maxEvidenceAgeMs:60000,shopifyEvidence:{tenantId,shopDomain,readAt:new Date(now).toISOString(),complete:true,products:[{id:'gid://shopify/Product/1',variants:[{id:'gid://shopify/ProductVariant/100',productId:'gid://shopify/Product/1',priceCents:2599}]}]},
  selections:[{shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/100',productId:id,productRevision:5,options:{}}]};
 const plan=planShopProductBindings(args);assert.equal(plan.entries[0].productionProfileRef.id,profileId);
 assert.equal(resolveShopProductBinding(plan,{tenantId,shopDomain,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/100',adapter:f.adapter,now}).mode,'plan-only');
 delete f.record.document.productionProfile;assert.throws(()=>planShopProductBindings(args),{code:'production_profile_missing'});
});
