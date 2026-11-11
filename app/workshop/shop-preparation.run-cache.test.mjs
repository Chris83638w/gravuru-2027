import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {makeAcrylicConfig,ACRYLIC_BASES} from '../configurator/variant-m/acrylic-product.mjs';
import {combineScalableSizes} from '../configurator/variant-m/scalable-sizes.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct,withShopPreparationCache} from './shop-preparation.mjs';
import {createProductRepository} from './repository.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {createShopProductBindingCheck} from './shop-product-binding-check.mjs';
import {withBindingPreparationCache} from '../../scripts/acryl-original18/binding-cache.mjs';

const tenantId='gravuru',shopDomain='cache-synthetic.myshopify.com',storeId='cache-test';
const sizes=[['10x14',100,140,1399],['15x20',150,200,1799],['20x27',200,270,2599],['40x54',400,540,4499]];
function document(){
 const option=(id,priceCents)=>({id,label:id,priceCents,currency:'EUR'});
 const entries=sizes.map(([id,width,height,basePriceCents])=>{
  const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},{fonts:{},motifs:[]},'a'.repeat(64));
  delete c.acrylic;c.basePriceCents=basePriceCents;
  const p=c.profile;p.geometry={width,height,shape:'rect',cornerRadiusMm:2,safeMarginMm:0,holes:[]};
  p.designs[0].objects=p.designs[0].objects.filter(o=>o.type==='photoSlot');
  Object.assign(p.designs[0].objects[0],{x:width/2,y:height/2,w:width*.8,h:height*.8});
  const small={groupId:'size',valueIds:sizes.slice(0,3).map(s=>s[0])};
  p.optionGroups=[
   {id:'base',name:'Sockel',required:true,defaultValueId:'none',visibleIf:small,values:ACRYLIC_BASES.map(b=>option(b.id,b.priceCents))},
   {id:'wall-small',name:'Wandhalterung',required:true,defaultValueId:'none',visibleIf:small,values:[option('none',0),option('wall',599)]},
   {id:'wall-large',name:'Wandhalterung',required:true,defaultValueId:'wall',visibleIf:{groupId:'size',valueIds:['40x54']},values:[option('wall',599)]}
  ];
  return {id,label:id,config:c};
 });
 return makeProductDocument(combineScalableSizes(entries,'15x20'),{name:'Synthetic four-size cache product'});
}
const record=()=>({id:'cfg_00000000-0000-0000-0000-000000000001',revision:1,status:'draft',metadata:{},document:document()});

test('explicit run reuses the same native preparation while every returned value remains isolated',async()=>{
 const r=record(),expected=prepareShopProduct(r);assert.equal(expected.variants.length,43);
 await withShopPreparationCache(async()=>{
  const first=prepareShopProduct(r);assert.deepEqual(first,expected);
  first.variants[0].priceCents=1;first.checks.length=0;
  await Promise.resolve();
  assert.deepEqual(prepareShopProduct(structuredClone(r)),expected);
  assert.deepEqual(prepareShopProduct(r),expected);
 });
 assert.deepEqual(prepareShopProduct(r),expected);
});

test('price, revision, status, metadata and JSON-omitted mutations cannot reuse stale preparation',async()=>{
 const r=record();
 await withShopPreparationCache(async()=>{
  const original=prepareShopProduct(r),price=structuredClone(r);
  price.document.config.scalableSizes.sizes[0].basePriceCents+=100;
  assert.equal(prepareShopProduct(price).variants[0].priceCents,original.variants[0].priceCents+100);
  assert.equal(prepareShopProduct({...r,revision:2}).configuration.revision,2);
  assert.equal(prepareShopProduct({...r,status:'archived'}).sourceReady,false);
  const metadata={productionProfile:{id:'mfg_00000000-0000-0000-0000-000000000002',revision:2,sha256:'b'.repeat(64)}};
  assert.deepEqual(prepareShopProduct({...r,metadata}).productionProfile,metadata.productionProfile);
  prepareShopProduct(r);
  const malformed=structuredClone(r);malformed.document.config.profile.material.extra=undefined;
  assert.equal(JSON.stringify(malformed),JSON.stringify(r));
  assert.throws(()=>prepareShopProduct(malformed),/JSON/);
  const bad=structuredClone(r);bad.document.config.scalableSizes.sizes[1].basePriceCents=-1;
  assert.throws(()=>prepareShopProduct(bad));
  assert.deepEqual(prepareShopProduct(r),original);
 });
});

test('concurrent scopes stay independent and failed scopes close before a later run',async()=>{
 const first=record(),second=structuredClone(first);second.document.name='Other product';
 const results=await Promise.all([first,second].map(r=>withShopPreparationCache(async()=>{prepareShopProduct(r);await Promise.resolve();return prepareShopProduct(r);} )));
 assert.equal(results[0].title,first.document.name);assert.equal(results[1].title,second.document.name);
 await assert.rejects(withShopPreparationCache(async()=>{prepareShopProduct(first);throw Error('synthetic failure');}),/synthetic failure/);
 await withShopPreparationCache(async()=>{
  await assert.rejects(withShopPreparationCache(()=>null),/non-nested/);
  assert.equal(prepareShopProduct(second).title,second.document.name);
 });
});

function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-preparation-cache-')),filename=path.join(dir,'workshop.sqlite');
 const repository=createProductRepository({filename,tenantId}),db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON');
 let now=Date.parse('2026-11-10T10:00:00Z');const clock=()=>now;
 const orderIntake=createOrderIntake({database:db,tenantId,clock,snapshot:()=>{throw Error('No customer snapshots');}});
 const workshop={tenantId,repository,orderIntake,productionProfiles:{resolve(){throw Error('No profile');}},sessionContext:{shopDomain}};
 const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}});
 const registry=orderIntake.idBindings({storeId,shopDomain,adapter}),r=repository.create(document()),preparation=prepareShopProduct(r);
 const selections=preparation.variants.map((v,i)=>({shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(1000+i),productId:r.id,productRevision:r.revision,options:v.options}));
 let onRead=()=>{};
 const reader={async inspectVariants(ids){onRead();return {installation:{shopDomain,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const i=selections.findIndex(s=>s.shopifyVariantId===id);return {id,productId:'gid://shopify/Product/1',found:true,status:'DRAFT',priceCents:preparation.variants[i].priceCents};})};}};
 const check=createShopProductBindingCheck({adapter,reader,clock});
 t.after(()=>{db.close();repository.close();const resolved=path.resolve(dir),relative=path.relative(path.resolve(os.tmpdir()),resolved);assert.ok(relative.startsWith('gravuru-preparation-cache-')&&!relative.includes(path.sep));fs.rmSync(resolved,{recursive:true,force:true});});
 return {repository,orderIntake,registry,r,selections,check,advance:ms=>now+=ms,onRead:fn=>onRead=fn};
}

test('all 43 selections use original check/persist/replay paths and keep the 60-second evidence limit',async t=>{
 const f=fixture(t);
 for(const replay of [false,true])await withBindingPreparationCache(async()=>{
  const checked=await f.check.check({selections:f.selections});assert.equal(checked.status,'id-plan-ready');
  assert.equal(checked.plan.maxEvidenceAgeMs,60000);
  const saved=f.registry.persist({plan:checked.plan,expectedHeads:f.selections.map(s=>({shopifyVariantId:s.shopifyVariantId,revision:replay?1:null}))});
  assert.equal(saved.createdBindings,replay?0:43);assert.equal(saved.changedAssignments,replay?0:43);
  for(const s of f.selections)assert.deepEqual(f.registry.resolve({shopifyProductId:s.shopifyProductId,shopifyVariantId:s.shopifyVariantId}).options,s.options);
 });
 assert.equal(f.orderIntake.bindings().length,43);
 await withBindingPreparationCache(async()=>{
  const checked=await f.check.check({selections:f.selections.slice(0,1)});f.advance(60001);
  assert.throws(()=>f.registry.persist({plan:checked.plan,expectedHeads:[{shopifyVariantId:f.selections[0].shopifyVariantId,revision:1}]}),{code:'shop_binding_freshness'});
 });
 assert.equal(f.orderIntake.bindings().length,43);
});

test('cached preparation does not hide a product revision change during the awaited shop read',async t=>{
 const f=fixture(t);f.onRead(()=>f.repository.save(f.r.id,{...f.r.document,name:'Changed during evidence read'},1));
 await withBindingPreparationCache(async()=>{
  await assert.rejects(f.check.check({selections:f.selections.slice(0,1)}),{code:'shop_binding_revision'});
 });
 assert.equal(f.orderIntake.bindings().length,0);
});
