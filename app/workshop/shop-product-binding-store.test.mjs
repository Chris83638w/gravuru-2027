import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createShopProductBindingStore} from './shop-product-binding-store.mjs';
import {createProductRepository} from './repository.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {planShopProductBindings} from './shop-product-binding-plan.mjs';
import {createShopProductBindingCheck} from './shop-product-binding-check.mjs';
import {makeFormProduct} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';
import {makeProductDocument} from './product-model.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {withCustomerReadScope} from './customer-read-scope.mjs';
import {withCartTiming,cartTimingStep,cartTimingHeaders} from './shop-cart-timing.mjs';

// Synthetic documents and a NEW temporary SQLite database only. No backup, live
// application, Shopify request or production profile is opened or manufactured.
const tenantId='gravuru',shopDomain='binding-synthetic.myshopify.com',storeId='synthetic-store';
const pair=(n=1)=>({shopifyProductId:'gid://shopify/Product/'+n,shopifyVariantId:'gid://shopify/ProductVariant/'+(100+n)});
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function formDocument(){
 const geometry={schema:'gravuru-contour/v1',unit:'mm',measurement:'path-centerline',widthMm:120,heightMm:80,pageWidthMm:120,pageHeightMm:80,sourceOriginMm:[0,0],holeCount:1,
  contours:[{role:'outer',d:'M0 0 L120 0 L110 80 L0 80 Z'},{role:'hole',d:'M5 5 L7 5 L7 7 L5 7 Z'}],warnings:[]};
 let d=makeFormProduct({id:'a'.repeat(64),sourceSha256:'b'.repeat(64),geometrySha256:hash(geometry),geometry},'Synthetic fixed form');
 d.material={id:'steel',thicknessMm:1.5,surfaceNotes:'Synthetic'};d.processingMethod='engraving';d.basePriceCents=2599;
 return addFormDesign(d,{assetId:'c'.repeat(64),sourceSha256:'d'.repeat(64),originalName:'synthetic.svg',widthMm:100,heightMm:60},{name:'Synthetic design',designId:'synthetic-design'});
}
function nativeDocument(){const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));return makeProductDocument(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64)),{name:'Synthetic native'});}
function fixture(t,document=formDocument()){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-id-binding-')),filename=path.join(dir,'workshop.sqlite');
 const repository=createProductRepository({filename,tenantId}),db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=0;');
 let time=Date.parse('2026-10-22T12:00:00Z');const clock=()=>time;
 const orders=createOrderIntake({database:db,tenantId,clock,snapshot:()=>{throw Error('No customer snapshot in ID tests');}});
 const workshop={tenantId,repository,orderIntake:orders,productionProfiles:{resolve(){throw Error('No invented profile');}},sessionContext:{shopDomain}};
 const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}});
 const registry=orders.idBindings({storeId,shopDomain,adapter}),record=repository.create(document);
 t.after(()=>{db.close();repository.close();fs.rmSync(dir,{recursive:true,force:true});});
 const f={dir,filename,repository,db,orders,adapter,registry,record,clock,advance:ms=>time+=ms};
 f.plan=(items=[{record:f.repository.get(f.record.id),...pair(),options:{}}],chosenAdapter=adapter)=>{
   const selections=items.map(({record,...p})=>({...p,productId:record.id,productRevision:record.revision}));
   const products=new Map();for(const item of items){const resolved=chosenAdapter.resolveSelection(chosenAdapter.getCurrentProduct(item.record.id),item.options);
    if(!products.has(item.shopifyProductId))products.set(item.shopifyProductId,{id:item.shopifyProductId,variants:[]});products.get(item.shopifyProductId).variants.push({id:item.shopifyVariantId,productId:item.shopifyProductId,priceCents:resolved.unitCents});}
   return planShopProductBindings({tenantId,shopDomain,adapter:chosenAdapter,purpose:'id-binding',now:clock(),maxEvidenceAgeMs:60000,
    shopifyEvidence:{tenantId,shopDomain,complete:true,readAt:new Date(clock()).toISOString(),products:[...products.values()]},selections});
 };
 f.persist=(plan=f.plan(),revision=null,registryOverride=registry)=>registryOverride.persist({plan,expectedHeads:plan.entries.map(e=>({shopifyVariantId:e.shopifyVariantId,revision}))});
 return f;
}
const tables=['form_shop_bindings','form_shop_binding_selections','shop_product_binding_heads','shop_product_binding_revisions'];
const counts=f=>Object.fromEntries(tables.map(table=>[table,f.db.prepare('SELECT count(*) AS n FROM '+table).get().n]));

test('cart diagnostics split real registry reads, parsing and hashing without changing the binding',async t=>{
 const f=fixture(t);f.persist();const before=counts(f),expected=f.registry.resolve(pair()),events=[];let headers;
 await withCartTiming('theme-cart',e=>events.push(e),()=>{
  assert.deepEqual(cartTimingStep('variant_binding',()=>f.registry.resolve(pair())),expected);
  headers=cartTimingHeaders(200);
 });
 assert.deepEqual(counts(f),before);
 const e=events.find(e=>e.event==='shop_cart_timing');assert.equal(e.version,2);assert.equal(e.counts.registry_entries_returned,1);
 for(const name of ['registry_head_read','registry_product_read','registry_binding_read','registry_document_json','registry_canonical','registry_sha256']){
  assert.ok(e.steps[name].syncCalls>0,name);assert.equal(e.steps[name].asyncCalls,0);assert.equal(e.steps[name].processCpu.available,1);assert.ok(!headers['Server-Timing'].includes(name));
 }
 assert.ok(e.storageReads.calls>=5);assert.ok(e.counts.registry_document_bytes>0);
 const logged=JSON.stringify(e);for(const value of [f.record.id,pair().shopifyVariantId,expected.documentSha256,f.record.document.name])assert.ok(!logged.includes(value),'private registry data in log');
 await withCartTiming('theme-cart',e=>events.push(e),()=>{
  assert.throws(()=>cartTimingStep('variant_binding',()=>f.registry.resolve(pair(99))),{code:'shop_binding_active_not_found'});cartTimingHeaders(404);
 });
 assert.equal(events.find(e=>e.status===404).steps.variant_binding.failures,1);
});

test('locked read phase reuses only frozen source records and rejects a same-connection mutation',t=>{
 const f=fixture(t),get=f.repository.get;let reads=0;f.repository.get=(...args)=>{reads++;return get(...args);};
 f.registry.withReadSnapshot(()=>{const first=f.adapter.getCurrentProduct(f.record.id),second=f.adapter.getCurrentProduct(f.record.id);assert.equal(first,second);assert.equal(reads,1);assert.ok(Object.isFrozen(first.document));assert.throws(()=>{first.document.name='changed';},TypeError);});
 assert.equal(Object.isFrozen(f.adapter.getCurrentProduct(f.record.id)),false,'ordinary reads remain detached mutable copies');
 assert.throws(()=>f.registry.withReadSnapshot(()=>{f.adapter.getCurrentProduct(f.record.id);f.db.prepare('UPDATE products SET archived=1 WHERE id=?').run(f.record.id);f.adapter.getCurrentProduct(f.record.id);}),{code:'shop_binding_cfg_changed'});
 assert.equal(f.db.prepare('SELECT archived FROM products WHERE id=?').get(f.record.id).archived,0,'failed phase rolls its mutation back');
 const next=f.repository.save(f.record.id,{...f.record.document,name:'new revision'},1);
 f.registry.withReadSnapshot(()=>assert.equal(f.adapter.getCurrentProduct(f.record.id).revision,next.revision));
});

test('provider-side product mutation after native binding validation rolls the whole write back',t=>{
 const f=fixture(t),plan=f.plan(),before=counts(f),bind=f.orders.bindVariants;
 f.orders.bindVariants=function(input){const value=bind.call(this,input);f.db.prepare('UPDATE products SET archived=1 WHERE id=?').run(f.record.id);return value;};
 assert.throws(()=>f.persist(plan),{code:'shop_binding_cfg_changed'});assert.deepEqual(counts(f),before);assert.equal(f.db.prepare('SELECT archived FROM products WHERE id=?').get(f.record.id).archived,0);
});

test('native REPLACE and recursive-trigger toggles cannot replace a cached revision',t=>{
 for(const mode of ['replace','disable','disable-replace-restore','disable-replace-metadata-restore']){
  const f=fixture(t),plan=f.plan(),before=counts(f),bind=f.orders.bindVariants;
  const original=f.db.prepare('SELECT * FROM product_revisions WHERE product_id=? AND revision=1').get(f.record.id);
  f.db.exec('PRAGMA recursive_triggers=OFF');
  f.orders.bindVariants=function(input){
   const value=bind.call(this,input);assert.equal(f.db.prepare('PRAGMA recursive_triggers').get().recursive_triggers,1);
   if(mode!=='replace')f.db.exec('PRAGMA recursive_triggers=OFF');
   if(mode!=='disable'){
    const changed=mode==='disable-replace-metadata-restore'?{...original,metadata:JSON.stringify({changed:'Metadaten · geändert 🐾'})}:{...original,document:JSON.stringify({...f.record.document,name:'replaced inside provider'})},keys=Object.keys(changed);
    f.db.prepare('INSERT OR REPLACE INTO product_revisions('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')').run(...keys.map(key=>changed[key]));
   }
   if(mode.endsWith('-restore'))f.db.exec('PRAGMA recursive_triggers=ON');
   return value;
  };
  assert.throws(()=>f.persist(plan),mode==='replace'?/immutable/:{code:'shop_binding_cfg_changed'});
  assert.deepEqual(counts(f),before);
  assert.deepEqual(f.db.prepare('SELECT * FROM product_revisions WHERE product_id=? AND revision=1').get(f.record.id),original);
  assert.equal(f.db.prepare('PRAGMA recursive_triggers').get().recursive_triggers,0,'connection setting restored after failed scope');
 }
});

test('native trigger/schema changes invalidate a locked product cache and unknown schemas keep full document checks',t=>{
 const f=fixture(t),raw=f.db.prepare('SELECT document FROM product_revisions WHERE product_id=?').get(f.record.id).document;
 assert.throws(()=>f.registry.withReadSnapshot(()=>{
  f.adapter.getCurrentProduct(f.record.id);
  assert.throws(()=>f.db.prepare('UPDATE product_revisions SET document=? WHERE product_id=?').run(raw,f.record.id),/immutable/);
  f.db.exec('DROP TRIGGER immutable_revision_update');
  f.db.prepare('UPDATE product_revisions SET document=? WHERE product_id=?').run(JSON.stringify({...f.record.document,name:'changed inside locked phase'}),f.record.id);
  f.adapter.getCurrentProduct(f.record.id);
 }),{code:'shop_binding_revision'});
 assert.equal(f.db.prepare('SELECT document FROM product_revisions WHERE product_id=?').get(f.record.id).document,raw);
 assert.ok(f.db.prepare("SELECT 1 FROM sqlite_master WHERE name='immutable_revision_update'").get());
 // A non-native schema cannot acquire the lightweight native immutability path.
 f.db.exec('DROP TRIGGER immutable_revision_update');
 f.db.exec("CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON product_revisions WHEN 0 BEGIN SELECT RAISE(ABORT, 'Product revisions are immutable'); END");
 assert.throws(()=>f.registry.withReadSnapshot(()=>{
  f.adapter.getCurrentProduct(f.record.id);
  f.db.prepare('UPDATE product_revisions SET document=? WHERE product_id=?').run(JSON.stringify({...f.record.document,name:'same schema mutation'}),f.record.id);
  f.adapter.getCurrentProduct(f.record.id);
 }),{code:'shop_binding_revision'});
 assert.equal(f.db.prepare('SELECT document FROM product_revisions WHERE product_id=?').get(f.record.id).document,raw);
});

test('batched exact reads preserve every ID, historical revision and later archive rejection',t=>{
 const f=fixture(t),second=f.repository.create(formDocument());f.persist(f.plan([{record:f.record,...pair(),options:{}},{record:second,...pair(2),options:{}}]));
 const expected=[f.registry.resolve(pair()),f.registry.resolve(pair(2))];assert.deepEqual(f.registry.resolveMany([pair(),pair(2)]),expected);
 f.repository.save(f.record.id,{...f.record.document,name:'new draft'},1);assert.equal(f.registry.resolveMany([pair()])[0].productRevision,1);
 assert.throws(()=>f.registry.resolveMany([pair(),pair(3)]),{code:'shop_binding_active_not_found'});
 f.repository.setArchived(second.id,{expectedRevision:1,archived:true});assert.throws(()=>f.registry.resolveMany([pair(),pair(2)]),{code:'shop_binding_cfg_changed'});
});

test('customer read phases keep current heads and archive/tenant checks authoritative',t=>{
 const f=fixture(t);f.persist();
 withCustomerReadScope(()=>{
  const first=f.registry.resolve(pair());assert.equal(first.productRevision,1);
  assert.throws(()=>f.registry.resolve(pair(2)),{code:'shop_binding_active_not_found'});
  f.repository.save(f.record.id,{...f.record.document,name:'Next'},1);
  f.persist(f.plan(),1);assert.equal(f.registry.resolve(pair()).productRevision,2);
  assert.equal(f.registry.history(pair()).length,2);
  f.repository.setArchived(f.record.id,{expectedRevision:2,archived:true});
  assert.throws(()=>f.registry.resolve(pair()),{code:'shop_binding_cfg_changed'});
 });
});

test('customer read phase detects same-connection document tampering even if revision IDs stay unchanged',t=>{
 const f=fixture(t);f.persist();
 withCustomerReadScope(()=>{
  f.registry.resolve(pair());
  f.db.exec('DROP TRIGGER immutable_revision_update');
  f.db.prepare("UPDATE product_revisions SET document=json_set(document,'$.basePriceCents',0) WHERE product_id=?").run(f.record.id);
  assert.throws(()=>f.registry.resolve(pair()),{code:'shop_binding_active_integrity'});
 });
});

test('exact ID assignment persists on the existing connection with real form geometry and no profile release',t=>{
 const f=fixture(t),before=f.repository.get(f.record.id),saved=f.persist();
 assert.equal(saved.createdBindings,1);assert.equal(saved.changedAssignments,1);assert.equal(saved.written,true);
 const active=f.registry.resolve(pair());assert.equal(active.productId,f.record.id);assert.equal(active.productRevision,1);assert.equal(active.assignmentRevision,1);
 assert.deepEqual(active.options,{});assert.equal(active.unitCents,2599);assert.equal(active.storeId,storeId);assert.equal(active.tenantId,tenantId);
 assert.equal(active.productionStatus,'profile-assignment-pending');assert.equal(active.productionReady,false);assert.equal(active.publicAccess,false);assert.equal(active.checkoutEnabled,false);
 assert.deepEqual(f.repository.get(f.record.id),before);assert.equal(f.registry.history(pair()).length,1);
 for(const ids of [{...pair(),shopifyProductId:pair(2).shopifyProductId},pair(2)])assert.throws(()=>f.registry.resolve(ids),{code:'shop_binding_active_not_found'});
 assert.throws(()=>f.registry.resolve({shopifyVariantId:pair().shopifyVariantId}),{code:'shop_binding_identity'});
});

test('existing bindings are not activated implicitly and their immutable price contracts are preserved on reuse',t=>{
 const f=fixture(t),record=f.repository.get(f.record.id),mapping=prepareShopProduct(record).variants[0];
 const prior=f.orders.bindVariants({record,shopDomain,mappings:[{key:mapping.key,variantId:'101'}]}).bindings[0];
 const raw='{"synthetic":"existing immutable contract is deliberately not recaptured"}';
 f.db.prepare('INSERT INTO form_shop_binding_personalization(binding_id,document,tenant_id) VALUES(?,?,?)').run(prior.id,raw,tenantId);
 assert.throws(()=>f.registry.resolve(pair()),{code:'shop_binding_active_not_found'});
 const original=f.orders.bindVariants;f.orders.bindVariants=()=>{throw Error('Existing binding must be reused');};
 const result=f.persist();f.orders.bindVariants=original;assert.equal(result.createdBindings,0);assert.equal(result.assignments[0].bindingId,prior.id);
 assert.equal(f.db.prepare('SELECT document FROM form_shop_binding_personalization WHERE binding_id=?').get(prior.id).document,raw);
});

test('native option rows are reused, copied on output and never duplicated into the registry',t=>{
 const f=fixture(t,nativeDocument()),options={size:'large',base:'eiche',wall:'wall'};
 const plan=f.plan([{record:f.record,...pair(),options}]);const result=f.persist(plan);assert.equal(result.assignments[0].unitCents,3697);
 assert.deepEqual(result.assignments[0].options,options);assert.equal(counts(f).form_shop_binding_selections,1);
 result.assignments[0].options.base='wrong';assert.deepEqual(f.registry.resolve(pair()).options,options);
 assert.ok(!f.db.prepare('PRAGMA table_info(shop_product_binding_revisions)').all().some(c=>c.name==='options'));
});

test('explicit head CAS preserves historical revisions and a new source revision is never silently selected',t=>{
 const f=fixture(t),first=f.persist().assignments[0],doc=structuredClone(f.record.document);doc.basePriceCents=2699;
 const next=f.repository.save(f.record.id,doc,1);assert.equal(f.registry.resolve(pair()).productRevision,1);assert.equal(f.registry.resolve(pair()).unitCents,2599);
 const plan=f.plan([{record:next,...pair(),options:{}}]),before=counts(f);
 assert.throws(()=>f.persist(plan,null),{code:'shop_binding_head_conflict'});assert.deepEqual(counts(f),before);
 const saved=f.persist(plan,1);assert.equal(saved.assignments[0].assignmentRevision,2);assert.equal(saved.assignments[0].productRevision,2);assert.notEqual(saved.assignments[0].bindingId,first.bindingId);
 assert.equal(f.orders.bindings().length,2);assert.equal(f.registry.history(pair()).length,2);
 const fresh=f.plan(),same=f.persist(fresh,2);assert.equal(same.written,false);assert.equal(same.changedAssignments,0);assert.equal(same.createdBindings,0);
 assert.throws(()=>f.persist(f.plan(),1),{code:'shop_binding_head_conflict'});
});

test('a product changed or archived after planning cannot create any binding or active assignment',t=>{
 const f=fixture(t),plan=f.plan();f.repository.save(f.record.id,{...f.record.document,name:'new source'},1);const before=counts(f);
 assert.throws(()=>f.persist(plan),/Produktstand|geändert/);assert.deepEqual(counts(f),before);
 const fresh=f.plan();f.repository.setArchived(f.record.id,{expectedRevision:2,archived:true});assert.throws(()=>f.persist(fresh));assert.deepEqual(counts(f),before);
});

test('SQL head CAS rejects a stale adapter even when its own in-memory proof is internally consistent',t=>{
 const f=fixture(t),snapshot=structuredClone(f.record),cachedRepo={tenantId,get:()=>structuredClone(snapshot)},workshop={tenantId,repository:cachedRepo,orderIntake:f.orders,productionProfiles:{resolve:()=>null},sessionContext:{shopDomain}};
 const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}}),registry=f.orders.idBindings({storeId,shopDomain,adapter});
 const plan=f.plan([{record:snapshot,...pair(),options:{}}],adapter);
 f.repository.save(f.record.id,{...f.record.document,name:'actual newer DB head'},1);const before=counts(f);
 assert.throws(()=>f.persist(plan,null,registry),{code:'shop_binding_cfg_changed'});assert.deepEqual(counts(f),before);
});

test('a matching cfg ID/revision from a different database is not accepted as a source',t=>{
 const f=fixture(t),wrong=structuredClone(f.record);wrong.document.basePriceCents=2799;
 const workshop={tenantId,repository:{tenantId,get:()=>structuredClone(wrong)},orderIntake:f.orders,productionProfiles:{resolve:()=>null},sessionContext:{shopDomain}};
 const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}}),registry=f.orders.idBindings({storeId,shopDomain,adapter});
 const plan=f.plan([{record:wrong,...pair(),options:{}}],adapter);assert.throws(()=>f.persist(plan,null,registry),{code:'shop_binding_cfg_changed'});assert.equal(counts(f).form_shop_bindings,0);
});

test('all new legacy bindings and ID assignments roll back when a later SQL write fails',t=>{
 const f=fixture(t),second=f.repository.create(formDocument());const plan=f.plan([{record:f.record,...pair(),options:{}},{record:second,...pair(2),options:{}}]);
 f.db.exec("CREATE TRIGGER synthetic_late_failure BEFORE INSERT ON shop_product_binding_revisions WHEN NEW.variant_gid='gid://shopify/ProductVariant/102' BEGIN SELECT RAISE(ABORT,'synthetic failure');END;");
 const before=counts(f);assert.throws(()=>f.persist(plan),/synthetic failure/);assert.deepEqual(counts(f),before);assert.equal(f.db.isTransaction,false);
});

test('batch return values preserve requested order and catch a later callback changing an earlier product',t=>{
 for(const tamper of [false,true]){
  const f=fixture(t),records=[f.record,f.repository.create(formDocument()),f.repository.create(formDocument())];
  const items=[2,0,1].map(i=>({record:records[i],...pair(i+1),options:{}})),plan=f.plan(items),before=counts(f);
  const bind=f.orders.bindVariants;let calls=0;
  f.orders.bindVariants=function(input){const value=bind.call(this,input);if(++calls===3&&tamper)f.db.prepare('UPDATE products SET archived=1 WHERE id=?').run(items[0].record.id);return value;};
  if(tamper){assert.throws(()=>f.persist(plan),{code:'shop_binding_cfg_changed'});assert.deepEqual(counts(f),before);assert.equal(f.db.prepare('SELECT archived FROM products WHERE id=?').get(items[0].record.id).archived,0);}
  else{const saved=f.persist(plan);assert.deepEqual(saved.assignments.map(v=>v.shopifyVariantId),items.map(v=>v.shopifyVariantId));assert.deepEqual(saved.assignments.map(v=>v.productId),items.map(v=>v.record.id));assert.equal(saved.changedAssignments,3);assert.equal(saved.createdBindings,3);}
  assert.equal(calls,3);
 }
});

test('reentrant competing batch activation cannot overwrite expected heads or leave partial bindings',t=>{
 const f=fixture(t),other=f.repository.create(formDocument()),items=[{record:f.record,...pair(),options:{}},{record:other,...pair(2),options:{}}];
 f.persist(f.plan(items));
 const old=items.map(v=>f.registry.resolve({shopifyProductId:v.shopifyProductId,shopifyVariantId:v.shopifyVariantId}));
 const next=items.map(v=>({...v,record:f.repository.save(v.record.id,{...v.record.document,name:'Next '+v.record.id},1)})),plan=f.plan(next),before=counts(f);
 const bind=f.orders.bindVariants;let nested=false;
 f.orders.bindVariants=function(input){const value=bind.call(this,input);if(!nested){nested=true;f.persist(plan,1);}return value;};
 assert.throws(()=>f.persist(plan,1),/UNIQUE constraint failed: shop_product_binding_revisions/);assert.equal(nested,true);assert.deepEqual(counts(f),before);
 assert.deepEqual(items.map(v=>f.registry.resolve({shopifyProductId:v.shopifyProductId,shopifyVariantId:v.shopifyVariantId})),old);
});

test('custom permanent or temporary head triggers keep the immediate source check before a later callback can restore it',t=>{
 for(const timing of ['before','callback','temporary-callback']){
  const f=fixture(t),other=f.repository.create(formDocument()),items=[{record:f.record,...pair(),options:{}},{record:other,...pair(2),options:{}}],plan=f.plan(items),before=counts(f);
  const install=()=>f.db.exec(`CREATE ${timing==='temporary-callback'?'TEMP ':''}TRIGGER review_archive_after_head AFTER INSERT ON shop_product_binding_heads
   WHEN NEW.variant_gid='gid://shopify/ProductVariant/101'
   BEGIN UPDATE products SET archived=1 WHERE id='${f.record.id}'; END;`);
  if(timing==='before')install();
  const bind=f.orders.bindVariants;let calls=0;
  f.orders.bindVariants=function(input){const value=bind.call(this,input);calls++;if(calls===1&&timing!=='before')install();if(calls===2)f.db.prepare('UPDATE products SET archived=0 WHERE id=?').run(f.record.id);return value;};
  assert.throws(()=>f.persist(plan),{code:'shop_binding_cfg_changed'});assert.deepEqual(counts(f),before);assert.equal(calls,1,'the immediate check rejects before the restoring callback runs');
 }
});

test('a shadowing TEMP head table or added expression index cannot use deferred integrity checks',t=>{
 for(const extension of ['temporary-table','expression-index']){
  const f=fixture(t),other=f.repository.create(formDocument()),items=[{record:f.record,...pair(),options:{}},{record:other,...pair(2),options:{}}],plan=f.plan(items);
  f.db.function('review_archive',{deterministic:true},variant=>{if(variant===pair().shopifyVariantId)f.db.prepare('UPDATE products SET archived=1 WHERE id=?').run(f.record.id);return 1;});
  if(extension==='temporary-table')f.db.exec(`CREATE TEMP TABLE shop_product_binding_heads(tenant_id TEXT NOT NULL,shop TEXT NOT NULL,variant_gid TEXT NOT NULL,revision INTEGER NOT NULL,
   PRIMARY KEY(tenant_id,shop,variant_gid),CHECK(review_archive(variant_gid)=1))`);
  else f.db.exec('CREATE INDEX review_head_expression ON shop_product_binding_heads(review_archive(variant_gid))');
  const before=counts(f),bind=f.orders.bindVariants;let calls=0;
  f.orders.bindVariants=function(input){const value=bind.call(this,input);if(++calls===2)f.db.prepare('UPDATE products SET archived=0 WHERE id=?').run(f.record.id);return value;};
  assert.throws(()=>f.persist(plan),{code:'shop_binding_cfg_changed'});assert.deepEqual(counts(f),before);assert.equal(calls,1);
 }
});

test('nested failures roll back only this operation and a successful outer rollback removes the entire assignment',t=>{
 const f=fixture(t),plan=f.plan();f.db.exec('CREATE TABLE synthetic_outer(note TEXT);BEGIN IMMEDIATE;INSERT INTO synthetic_outer VALUES(\'kept\');');
 assert.throws(()=>f.registry.persist({plan,expectedHeads:[{shopifyVariantId:pair().shopifyVariantId,revision:5}]}),{code:'shop_binding_head_conflict'});
 assert.equal(f.db.isTransaction,true);assert.equal(f.db.prepare('SELECT count(*) AS n FROM synthetic_outer').get().n,1);assert.equal(counts(f).form_shop_bindings,0);
 f.persist(plan);assert.equal(counts(f).form_shop_bindings,1);f.db.exec('ROLLBACK');assert.equal(counts(f).form_shop_bindings,0);assert.equal(counts(f).shop_product_binding_heads,0);
});

test('a second SQLite writer cannot change the product between locked head check and binding insertion',t=>{
 const f=fixture(t),other=new DatabaseSync(f.filename);other.exec('PRAGMA busy_timeout=0;');
 const bind=f.orders.bindVariants;let observedLock=false;
 f.orders.bindVariants=function(input){assert.equal(f.db.isTransaction,true);assert.throws(()=>other.prepare('UPDATE products SET name=? WHERE id=?').run('parallel',f.record.id),/locked/);observedLock=true;return bind.call(this,input);};
 try{f.persist();assert.equal(observedLock,true);assert.equal(other.prepare('SELECT count(*) AS n FROM shop_product_binding_heads').get().n,1);
 assert.doesNotThrow(()=>other.prepare('UPDATE products SET name=? WHERE id=?').run('after commit',f.record.id));}finally{other.close();}
});

test('forged or expired plans and incomplete head expectations are rejected without writes',t=>{
 const f=fixture(t),plan=f.plan(),before=counts(f);
 assert.throws(()=>f.persist(structuredClone(plan)),{code:'shop_binding_plan'});assert.deepEqual(counts(f),before);
 for(const expectedHeads of [[],[{shopifyVariantId:pair().shopifyVariantId,revision:0}],[{shopifyVariantId:pair(2).shopifyVariantId,revision:null}],
  [{shopifyVariantId:pair().shopifyVariantId,revision:null,priceCents:1}]])assert.throws(()=>f.registry.persist({plan,expectedHeads}));
 f.advance(60001);assert.throws(()=>f.persist(plan),{code:'shop_binding_freshness'});assert.deepEqual(counts(f),before);
});

test('explicit ID mapping cannot be switched to another Shopify product, store, tenant or cfg',t=>{
 const f=fixture(t);f.persist();
 const changedPair={...pair(),shopifyProductId:pair(2).shopifyProductId};const changed=f.plan([{record:f.record,...changedPair,options:{}}]);
 assert.throws(()=>f.persist(changed,1),{code:'shop_binding_active_conflict'});
 const otherStore={...f.adapter,storeId:'another-store'},registry=f.orders.idBindings({storeId:'another-store',shopDomain,adapter:otherStore});
 assert.throws(()=>registry.resolve(pair()),{code:'shop_binding_store_scope'});
 assert.throws(()=>f.orders.idBindings({storeId,shopDomain,adapter:{...f.adapter,tenantId:'foreign'}}),{code:'shop_binding_store_scope'});
 const other=f.repository.create(formDocument());assert.throws(()=>f.plan([{record:other,...pair(),options:{}}]),{code:'shop_binding_existing_conflict'});
});

test('active assignment revisions are append-only and archive changes block use without deleting history',t=>{
 const f=fixture(t);f.persist();
 assert.throws(()=>f.db.exec("UPDATE shop_product_binding_revisions SET store_id='changed'"),/immutable/);
 assert.throws(()=>f.db.exec('DELETE FROM shop_product_binding_revisions'),/immutable/);
 assert.throws(()=>f.db.exec('DELETE FROM shop_product_binding_heads'),/explicit transition/);
 f.repository.setArchived(f.record.id,{expectedRevision:1,archived:true});assert.throws(()=>f.registry.resolve(pair()),{code:'shop_binding_cfg_changed'});assert.equal(f.registry.history(pair()).length,1);
});

test('asynchronous personalization provider is rejected and partial legacy writes remain absent',t=>{
 const f=fixture(t),registry=f.orders.idBindings({storeId,shopDomain,adapter:f.adapter,personalizationPricingFor:()=>Promise.resolve({})});
 assert.throws(()=>f.persist(f.plan(),null,registry),{code:'shop_binding_store_async'});assert.equal(counts(f).form_shop_bindings,0);assert.equal(counts(f).shop_product_binding_heads,0);
});

test('evidence expiring during a synchronous write rolls back before commit',t=>{
 const f=fixture(t),plan=f.plan(),original=f.orders.bindVariants;
 f.orders.bindVariants=function(input){const result=original.call(this,input);f.advance(60001);return result;};
 const before=counts(f);assert.throws(()=>f.persist(plan),{code:'shop_binding_freshness'});assert.deepEqual(counts(f),before);
});

test('listActive returns only assignment heads, preserves pinned source revisions and copies option data',t=>{
 const f=fixture(t,nativeDocument()),options={size:'large',base:'eiche',wall:'wall'};
 assert.deepEqual(f.registry.listActive(),[]);f.persist(f.plan([{record:f.record,...pair(),options}]));
 let listed=f.registry.listActive();assert.equal(listed.length,1);assert.deepEqual(listed[0],f.registry.resolve(pair()));
 listed[0].options.base='forged';assert.deepEqual(f.registry.listActive()[0].options,options);
 const document=structuredClone(f.record.document);document.name='New source name';const next=f.repository.save(f.record.id,document,1);
 assert.equal(f.registry.listActive()[0].productRevision,1,'a newer repository source is not an implicit active assignment');
 f.persist(f.plan([{record:next,...pair(),options}]),1);listed=f.registry.listActive();assert.equal(listed.length,1);assert.equal(listed[0].assignmentRevision,2);assert.equal(listed[0].productRevision,2);assert.equal(f.registry.history(pair()).length,2);
});

test('listActive excludes archived products while retaining other active records and all binding history',t=>{
 const f=fixture(t),other=f.repository.create(formDocument());f.persist(f.plan([{record:f.record,...pair(),options:{}},{record:other,...pair(2),options:{}}]));
 const before=counts(f);assert.equal(f.registry.listActive().length,2);f.repository.setArchived(f.record.id,{expectedRevision:1,archived:true});
 const listed=f.registry.listActive();assert.equal(listed.length,1);assert.equal(listed[0].productId,other.id);assert.deepEqual(counts(f),before);assert.equal(f.registry.history(pair()).length,1);
});

test('listActive cannot leak a foreign tenant or shop and refuses a different store scope',t=>{
 const f=fixture(t);f.persist();
 // Deliberately construct foreign rows only in this disposable SQLite file.
 // If query scoping regresses these rows either leak or fail the own-tenant read.
 for(const [otherTenant,otherShop] of [['foreign',shopDomain],[tenantId,'foreign.myshopify.com']]){
  f.db.prepare(`INSERT INTO shop_product_binding_revisions(tenant_id,shop,variant_gid,revision,product_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,evidence_read_at,created_at)
   SELECT ?,?,variant_gid,revision,product_gid,store_id,binding_id,cfg_id,cfg_revision,document_sha256,evidence_read_at,created_at FROM shop_product_binding_revisions WHERE tenant_id=? AND shop=?`).run(otherTenant,otherShop,tenantId,shopDomain);
  f.db.prepare('INSERT INTO shop_product_binding_heads(tenant_id,shop,variant_gid,revision) VALUES(?,?,?,1)').run(otherTenant,otherShop,pair().shopifyVariantId);
 }
 assert.deepEqual(f.registry.listActive(),[f.registry.resolve(pair())]);
 const wrongStore=f.orders.idBindings({storeId:'another-store',shopDomain,adapter:{...f.adapter,storeId:'another-store'}});assert.throws(()=>wrongStore.listActive(),{code:'shop_binding_store_scope'});
});


test('gallery skips broken documents/bindings, logs only fixed diagnostics, while exact resolution stays strict',async t=>{
 for(const damage of ['digest','json','binding']){
  const f=fixture(t),valid=f.repository.create(formDocument()),logs=[];
  f.persist(f.plan([{record:f.record,...pair(),options:{}},{record:valid,...pair(2),options:{}}]));
  const {createShopProductBindingStore}=await import('./shop-product-binding-store.mjs');
  const registry=createShopProductBindingStore({database:f.db,orderIntake:f.orders,tenantId,storeId,shopDomain,adapter:f.adapter,clock:f.clock,logger:e=>logs.push(e)});
  if(damage==='binding'){f.db.exec('DROP TRIGGER form_shop_binding_fixed');f.db.prepare("UPDATE form_shop_bindings SET variant_id='999999' WHERE product_id=?").run(f.record.id);}
  else{f.db.exec('DROP TRIGGER immutable_revision_update');if(damage==='json')f.db.exec('PRAGMA ignore_check_constraints=ON');f.db.prepare('UPDATE product_revisions SET document=? WHERE product_id=? AND revision=1').run(damage==='json'?'{invalid private text':JSON.stringify({...f.record.document,name:'private tampered content'}),f.record.id);}
  const expected=damage==='json'?'shop_binding_document':'shop_binding_active_integrity';
  assert.deepEqual(registry.listActive().map(b=>b.productId),[valid.id]);
  assert.deepEqual((await registry.listActiveForGallery()).map(b=>b.productId),[valid.id]);
  assert.throws(()=>registry.resolve(pair()),{code:expected});
  assert.deepEqual(logs,[{event:'shop_gallery_binding_skipped',storeId,code:expected},{event:'shop_gallery_binding_skipped',storeId,code:expected}]);
 }
});
test('gallery revision heads change on activation, new product revision and archive',t=>{
 const f=fixture(t),empty=f.registry.galleryRevision();f.persist();const bound=f.registry.galleryRevision();assert.notEqual(bound,empty);
 f.repository.save(f.record.id,{...f.record.document,name:'Next revision'},1);const next=f.registry.galleryRevision();assert.notEqual(next,bound);
 f.repository.setArchived(f.record.id,{expectedRevision:2,archived:true});assert.notEqual(f.registry.galleryRevision(),next);
});


test('read-only audit opens the existing registry without schema changes and cannot persist',async t=>{
 const f=fixture(t);f.persist();const before=counts(f);
 const db=new DatabaseSync(f.filename,{readOnly:true});
 try{
 const registry=createShopProductBindingStore({database:db,orderIntake:f.orders,adapter:f.adapter,tenantId,shopDomain,storeId,readOnly:true});
 assert.deepEqual(registry.resolve(pair()),f.registry.resolve(pair()));assert.equal((await registry.listActiveForGallery()).length,1);assert.equal(registry.galleryRevision(),f.registry.galleryRevision());
 assert.deepEqual(registry.resolveMany([pair()]),[f.registry.resolve(pair())]);
 registry.withReadSnapshot(()=>{assert.equal(db.isTransaction,true);assert.equal(f.adapter.getCurrentProduct(f.record.id).revision,1);assert.throws(()=>db.exec('UPDATE products SET archived=1'),/readonly/);});
 assert.throws(()=>registry.persist({}),{code:'shop_binding_read_only',status:403});assert.deepEqual(counts(f),before);
 }finally{db.close();} // Close before the fixture removes its directory on Windows.
 const checker=createShopProductBindingCheck({adapter:f.adapter,clock:f.clock,reader:{async inspectVariants(){assert.equal(f.db.isTransaction,false);return {installation:{shopDomain,currency:'EUR',scope:'admin-readonly'},variants:[{id:pair().shopifyVariantId,found:true,productId:pair().shopifyProductId,status:'ACTIVE',priceCents:2599}]};}}});
 const checked=await checker.check({selections:[{...pair(),productId:f.record.id,productRevision:1,options:{}}]});
 assert.equal(checked.status,'id-plan-ready','closed audit connection never replaces the original writable checker scope');
});


test('benchmark reads a native copy cold and warm without changing any binding or product',async t=>{
 const f=fixture(t,nativeDocument());f.persist(f.plan([{record:f.record,...pair(),options:prepareShopProduct(f.record).variants[0].options}]));const before=counts(f),source=f.repository.get(f.record.id);
 const {benchmarkGalleryCopy}=await import('../../scripts/shop-gallery-benchmark.mjs');
 const result=await benchmarkGalleryCopy({filename:f.filename,tenantId,storeId,shopDomain});
 assert.equal(result.readOnly,true);assert.equal(result.cold.status,'ready');assert.equal(result.warm.status,'ready');assert.equal(result.activeBindings,1);assert.equal(result.lightweightProductReads,1);assert.equal(result.fullModelReads,0);assert.equal(result.assetReads,0);
 assert.deepEqual(counts(f),before);assert.deepEqual(f.repository.get(f.record.id),source);
});


test('covering revision index preserves all head checks and read-only older copies need no migration',t=>{
 const f=fixture(t);f.persist();const expected=f.registry.galleryRevision();
 const index=f.db.prepare("PRAGMA index_info(shop_gallery_revision_status_v1)").all().map(r=>r.name);
 assert.deepEqual(index,['product_id','revision','tenant_id','status']);
 f.db.exec('DROP INDEX shop_gallery_revision_status_v1');
 const registry=createShopProductBindingStore({database:f.db,orderIntake:f.orders,adapter:f.adapter,tenantId,shopDomain,storeId,readOnly:true});
 assert.equal(registry.galleryRevision(),expected);assert.equal(registry.resolve(pair()).productId,f.record.id);
 assert.equal(f.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='shop_gallery_revision_status_v1'").get().n,0);
});

test('benchmark cache uses a separate file, survives reopening, and rejects the source as cache',async t=>{
 const f=fixture(t,nativeDocument());f.persist(f.plan([{record:f.record,...pair(),options:prepareShopProduct(f.record).variants[0].options}]));
 const {benchmarkGalleryCopy}=await import('../../scripts/shop-gallery-benchmark.mjs'),options={filename:f.filename,tenantId,storeId,shopDomain,cacheFilename:path.join(f.dir,'cache.sqlite')};
 const first=await benchmarkGalleryCopy(options),next=await benchmarkGalleryCopy(options);
 assert.equal(first.lightweightProductReads,1);assert.equal(next.lightweightProductReads,0);assert.equal(next.cold.status,'ready');assert.equal(next.cold.cards,first.cold.cards);assert.ok(next.cold.ms<4000);
 await assert.rejects(()=>benchmarkGalleryCopy({...options,cacheFilename:f.filename}),{code:'cache_must_be_separate_from_source'});
});
