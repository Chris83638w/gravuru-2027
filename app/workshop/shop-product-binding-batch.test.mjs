import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {createShopProductBindingCheck} from './shop-product-binding-check.mjs';
import {withBindingReadSnapshot} from './shop-product-binding-read-snapshot.mjs';
import {openWorkshopDb} from '../../scripts/shop-bind.mjs';
const SHOP='gravuru-design.myshopify.com',FOREIGN='cfg_00000000-0000-4000-8000-000000000002';
function fixture(t,count=0){
 const tempRoot=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(tempRoot,'g27-binding-batch-')),filename=path.join(dir,'workshop.sqlite');
 const repo=createProductRepository({filename,tenantId:'gravuru',snapshotMetadata:()=>({syntheticPayload:'x'.repeat(128*1024)})});
 const record=repo.create(makeProductDocument(doorbellFixture(),{name:'Synthetic batch evidence',kind:'product'})),choices=prepareShopProduct(record).variants;repo.close();
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',storeId:'acryl',shopDomain:SHOP});
 t.after(()=>{ws.close();const resolved=fs.realpathSync(dir),relative=path.relative(tempRoot,resolved);assert.ok(relative.startsWith('g27-binding-batch-')&&!relative.includes(path.sep)&&!path.isAbsolute(relative));fs.rmSync(resolved,{recursive:true,force:true});});
 const insert=ws.db.prepare('INSERT INTO form_shop_bindings(id,shop,variant_id,product_id,product_revision,unit_cents,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)');
 const option=ws.db.prepare('INSERT INTO form_shop_binding_selections(binding_id,options,tenant_id) VALUES(?,?,?)');
 const add=(variantId,productId=FOREIGN,options={synthetic:variantId})=>{const id='binding_'+randomUUID();insert.run(id,SHOP,variantId,productId,1,4999,'2026-10-27T00:00:00Z','gravuru');option.run(id,JSON.stringify(options),'gravuru');return id;};
 ws.db.exec('BEGIN');for(let i=0;i<count;i++)add(String(58000000000001+i));ws.db.exec('COMMIT');
 let reads=0;const original=ws.orderIntake.bindings.bind(ws.orderIntake);ws.orderIntake.bindings=()=>{reads++;return original();};
 const selections=choices.slice(0,100).map((v,i)=>({productId:record.id,productRevision:1,shopifyProductId:'gid://shopify/Product/16000000000001',shopifyVariantId:'gid://shopify/ProductVariant/'+(57000000000001+i),options:v.options}));
 function reader(selected,onInspect=()=>{}){return {async inspectVariants(ids){await onInspect();return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const s=selected.find(s=>s.shopifyVariantId===id),v=choices.find(v=>JSON.stringify(v.options)===JSON.stringify(s.options));return {id,found:true,productId:s.shopifyProductId,status:'ACTIVE',priceCents:v.priceCents};})};}};}
 const check=(selected=selections,onInspect)=>createShopProductBindingCheck({adapter:ws.adapter,reader:reader(selected,onInspect)}).check({selections:selected});
 const registry=ws.orderIntake.idBindings({storeId:'acryl',shopDomain:SHOP,adapter:ws.adapter});
 const heads=(selected,revision=null)=>selected.map(s=>({shopifyVariantId:s.shopifyVariantId,revision}));
 const ownRows=()=>ws.db.prepare('SELECT count(*) AS n FROM form_shop_bindings WHERE product_id=?').get(record.id).n;
 return {ws,record,selections,add,check,registry,heads,ownRows,get reads(){return reads;}};
}
test('late 100-variant block over 15120 prior bindings reads full evidence exactly three times and repeats idempotently',async t=>{
 const f=fixture(t,15120),result=await f.check();assert.equal(result.status,'id-plan-ready');assert.equal(f.reads,2);
 const saved=f.registry.persist({plan:result.plan,expectedHeads:f.heads(f.selections)});
 assert.equal(f.reads,3);assert.equal(saved.createdBindings,100);assert.equal(saved.changedAssignments,100);assert.equal(f.ownRows(),100);
 assert.equal(f.ws.db.prepare('SELECT count(*) AS n FROM form_shop_bindings').get().n,15220);
 const again=await f.check(),repeated=f.registry.persist({plan:again.plan,expectedHeads:f.heads(f.selections,1)});
 assert.equal(f.reads,6);assert.equal(repeated.written,false);assert.equal(repeated.createdBindings,0);assert.equal(f.ownRows(),100);
});
test('a global conflict introduced during Shopify await is detected by a new after-read snapshot',async t=>{
 const f=fixture(t),selected=f.selections.slice(0,2);
 await assert.rejects(()=>f.check(selected,()=>f.add(selected[0].shopifyVariantId.split('/').at(-1))),{code:'shop_binding_changed'});
 assert.equal(f.reads,2);assert.equal(f.ownRows(),0);
});
test('a global conflict after checking is re-read inside the locked persist phase and writes nothing',async t=>{
 const f=fixture(t),selected=f.selections.slice(0,2),result=await f.check(selected);
 f.add(selected[0].shopifyVariantId.split('/').at(-1));
 assert.throws(()=>f.registry.persist({plan:result.plan,expectedHeads:f.heads(selected)}),{code:'shop_binding_existing_conflict'});
 assert.equal(f.reads,3);assert.equal(f.ownRows(),0);assert.equal(f.ws.db.prepare('SELECT count(*) AS n FROM shop_product_binding_revisions').get().n,0);
});

test('writes do not reuse the pre-write snapshot: duplicate choices roll back the entire transaction',async t=>{
 const f=fixture(t),selected=[f.selections[0],{...f.selections[1],options:f.selections[0].options}],result=await f.check(selected);
 assert.equal(result.status,'id-plan-ready');
 assert.throws(()=>f.registry.persist({plan:result.plan,expectedHeads:f.heads(selected)}),{code:'order_intake',status:409});
 assert.equal(f.ownRows(),0);assert.equal(f.ws.db.prepare('SELECT count(*) AS n FROM shop_product_binding_revisions').get().n,0);
 assert.equal(f.ws.db.prepare('SELECT count(*) AS n FROM shop_product_binding_heads').get().n,0);
});
test('snapshot rows are deeply immutable; exceptions, async callbacks and scope failures leave no reusable cache',t=>{
 const f=fixture(t,1),a=f.ws.adapter;
 let snapshot;
 a.withBindingReadSnapshot(()=>{
   snapshot=a.getBindings();assert.strictEqual(a.getBindings(),snapshot);assert.equal(f.reads,1);
   assert.ok(Object.isFrozen(snapshot)&&Object.isFrozen(snapshot[0])&&Object.isFrozen(snapshot[0].options));
   assert.throws(()=>{snapshot[0].options.synthetic='changed';},TypeError);
 });
 f.add('59000000000001');assert.equal(a.getBindings().length,2);assert.equal(f.reads,2);
 assert.throws(()=>a.withBindingReadSnapshot(()=>{a.getBindings();throw Error('synthetic failure');}),/synthetic failure/);
 f.add('59000000000002');assert.equal(a.getBindings().length,3);assert.equal(f.reads,4);
 assert.throws(()=>a.withBindingReadSnapshot(async()=>1),{code:'shop_binding_adapter_async'});
 assert.equal(a.withBindingReadSnapshot(()=>a.getBindings().length),3);
 assert.throws(()=>a.withBindingReadSnapshot(()=>{
   a.getBindings();f.ws.repository.tenantId='foreign';
   try{a.getBindings();}finally{f.ws.repository.tenantId='gravuru';}
 }),{code:'shop_binding_adapter_scope'});
 assert.equal(a.withBindingReadSnapshot(()=>a.getBindings().length),3);
 assert.throws(()=>a.withBindingReadSnapshot(()=>a.withBindingReadSnapshot(()=>1)),{code:'shop_binding_snapshot_scope'});
 assert.equal(withBindingReadSnapshot({},()=>17),17,'legacy adapters without batching retain the original callback path');
});
test('the existing 60-second evidence deadline is unchanged',async t=>{
 const f=fixture(t),selected=f.selections.slice(0,1);let now=1000;
 const reader={async inspectVariants(){now+=60001;return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:[]};}};
 const checker=createShopProductBindingCheck({adapter:f.ws.adapter,reader,clock:()=>now});
 await assert.rejects(()=>checker.check({selections:selected}),{code:'shop_binding_freshness'});
 assert.equal(f.ownRows(),0);
});