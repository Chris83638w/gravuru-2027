import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac} from 'node:crypto';
import {patchLegacyOrderIntakeSource} from '../../legacy-patches/apply-order-intake-compat.mjs';
import {createLegacyShopBindingReadAdapter,legacyConfigurationFor} from './shop-product-binding-legacy.mjs';
import {createShopProductBindingStore} from './shop-product-binding-store.mjs';
import {planShopProductBindings} from './shop-product-binding-plan.mjs';
import {makeFormProduct} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';
const original=fs.readFileSync(new URL('../../legacy-patches/fixtures/order-intake.mjs.txt',import.meta.url),'utf8');
// The unchanged old intake/status/refund sources execute against synthetic DBs.
// Shared pure product/price imports use this staging tree, deliberately without
// claiming a full old application build or checking historical tier semantics.
const patched=patchLegacyOrderIntakeSource(original).replace(/from '(\.[^']+)'/g,(_,rel)=>{
 const url=rel==='./order-status.mjs'?new URL('../../legacy-patches/fixtures/order-status.mjs',import.meta.url):new URL(rel,import.meta.url);
 return 'from '+JSON.stringify(url.href);
});
const {createOrderIntake}=await import('data:text/javascript;base64,'+Buffer.from(patched).toString('base64'));
const tenantId='gravuru',storeId='synthetic-legacy',shopDomain='legacy-synthetic.myshopify.com';
const pair={shopifyProductId:'gid://shopify/Product/1001',shopifyVariantId:'gid://shopify/ProductVariant/101'};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function document(){
 const geometry={schema:'gravuru-contour/v1',unit:'mm',measurement:'path-centerline',widthMm:120,heightMm:80,pageWidthMm:120,pageHeightMm:80,sourceOriginMm:[0,0],holeCount:0,contours:[{role:'outer',d:'M0 0 L120 0 L110 80 L0 80 Z'}],warnings:[]};
 let d=makeFormProduct({id:'a'.repeat(64),sourceSha256:'b'.repeat(64),geometrySha256:hash(geometry),geometry},'Synthetic old form');
 d.material={id:'steel',thicknessMm:1.5,surfaceNotes:'Synthetic'};d.processingMethod='engraving';d.basePriceCents=2599;
 return addFormDesign(d,{assetId:'c'.repeat(64),sourceSha256:'d'.repeat(64),originalName:'synthetic.svg',widthMm:100,heightMm:60},{name:'Synthetic',designId:'synthetic-design'});
}
function fixture(t,variant=101){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE products(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,published_revision INTEGER,archived INTEGER NOT NULL DEFAULT 0,name TEXT NOT NULL,kind TEXT NOT NULL,master_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE product_revisions(product_id TEXT NOT NULL REFERENCES products(id),revision INTEGER NOT NULL,document TEXT NOT NULL,published_revision INTEGER,status TEXT NOT NULL,created_at TEXT NOT NULL,metadata TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(product_id,revision));`);
 const cfg='cfg_00000000-0000-4000-8000-'+String(variant).padStart(12,'0'),doc=document(),time=Date.parse('2026-10-22T12:00:00Z'),clock=()=>time;
 db.prepare('INSERT INTO products VALUES(?,1,NULL,0,?,\'product\',NULL,?,?)').run(cfg,doc.name,new Date(time).toISOString(),new Date(time).toISOString());
 db.prepare('INSERT INTO product_revisions(product_id,revision,document,status,created_at) VALUES(?,1,?,\'draft\',?)').run(cfg,JSON.stringify(doc),new Date(time).toISOString());
 const repository={get(id){const p=db.prepare('SELECT * FROM products WHERE id=?').get(id);if(!p)throw Object.assign(Error('missing'),{status:404});const r=db.prepare('SELECT * FROM product_revisions WHERE product_id=? AND revision=?').get(id,p.revision);return {id,revision:p.revision,publishedRevision:null,status:r.status,document:JSON.parse(r.document),metadata:JSON.parse(r.metadata),createdAt:p.created_at,updatedAt:p.updated_at};}};
 const snapshots=new Map(),orders=createOrderIntake({database:db,snapshot:id=>snapshots.get(id),clock}),workshop={repository,orderIntake:orders,productionProfiles:{resolve(){throw Error('No fake profile');}},sessionContext:{shopDomain}};
 const adapter=createLegacyShopBindingReadAdapter({storeId,shopDomain,workshop,legacySingleStore:true}),registry=orders.idBindings({storeId,shopDomain,adapter});
 const f={db,repository,orders,workshop,adapter,registry,snapshots,cfg,time,variant};
 f.plan=()=>planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now:time,maxEvidenceAgeMs:60000,
  selections:[{...pair,shopifyVariantId:'gid://shopify/ProductVariant/'+variant,productId:cfg,productRevision:1,options:{}}],
  shopifyEvidence:{tenantId,shopDomain,complete:true,readAt:new Date(time).toISOString(),products:[{id:pair.shopifyProductId,variants:[{id:'gid://shopify/ProductVariant/'+variant,productId:pair.shopifyProductId,priceCents:2599}]}]}});
 f.persist=()=>registry.persist({plan:f.plan(),expectedHeads:[{shopifyVariantId:'gid://shopify/ProductVariant/'+variant,revision:null}]});
 f.offer=()=>{const b=f.persist().assignments[0];snapshots.set('synthetic-snapshot',{schema:'gravuru-form-review/v1',product:{id:cfg,revision:1,basePriceCents:2599,currency:'EUR'},packageSha256:'a'.repeat(64)});return orders.offer({bindingId:b.bindingId,snapshotId:'synthetic-snapshot',quantity:1});};
 return f;
}
const config={shopDomain,secret:'synthetic-only-not-a-live-secret',apiVersion:'2026-10'};
function event(lines,eventId='synthetic-legacy-event'){
 const raw=Buffer.from(JSON.stringify({id:9001,test:true,financial_status:'paid',currency:'EUR',line_items:lines}));
 return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':eventId}};
}
const line=(variant,offer)=>({id:variant,variant_id:variant,product_id:1001,quantity:1,price:'25.99',properties:[offer.property]});
test('old offers stay readable; assigned cart revisions cannot be omitted, duplicated or substituted',()=>{
 const saved={id:'cfgcart_synthetic',rev:2},ledger={byOffer:id=>id==='assigned'?saved:null};
 const properties=[{name:'_gravuru_config',value:saved.id},{name:'_gravuru_rev',value:'2'}];
 assert.equal(legacyConfigurationFor(ledger,[],'historical'),null);
 assert.deepEqual(legacyConfigurationFor(ledger,properties,'assigned'),saved);
 for(const [props,offer] of [[[],'assigned'],[properties,'historical'],[[...properties,properties[0]],'assigned'],[[properties[0],{name:'_gravuru_rev',value:'1'}],'assigned'],[[properties[0]],'assigned']])assert.throws(()=>legacyConfigurationFor(ledger,props,offer),{status:422});
});
test('patch accepts only the exact verified old source',()=>{assert.throws(()=>patchLegacyOrderIntakeSource(original+'\n'),/SHA256/);assert.match(patched,/createLegacyOrderIntakeAccess/);});
test('actual patched old intake persists fixed form IDs without adding tenant columns to old tables',t=>{
 const f=fixture(t),before=f.repository.get(f.cfg),r=f.persist();assert.equal(r.assignments[0].productId,f.cfg);assert.equal(r.assignments[0].productionReady,false);
 assert.deepEqual(f.repository.get(f.cfg),before);assert.equal(f.registry.resolve(pair).bindingId,r.assignments[0].bindingId);
 for(const table of ['products','product_revisions','form_shop_bindings','form_shop_binding_selections','form_order_offers','form_order_events'])assert.equal(f.db.prepare('PRAGMA table_info('+table+')').all().some(c=>c.name==='tenant_id'),false);
 assert.equal(f.adapter.readiness(f.cfg).blockers.some(b=>b.code==='production_profile_missing'),true);
});
test('old current-head change is checked inside actual write transaction',t=>{
 const f=fixture(t),plan=f.plan();f.db.prepare('UPDATE products SET revision=2 WHERE id=?').run(f.cfg);
 assert.throws(()=>f.registry.persist({plan,expectedHeads:[{shopifyVariantId:pair.shopifyVariantId,revision:null}]}));
 assert.equal(f.orders.bindings().length,0);assert.equal(f.db.prepare('SELECT count(*) n FROM shop_product_binding_heads').get().n,0);
});
test('legacy schema is explicit; default mode and mixed tenant columns fail closed',t=>{
 const f=fixture(t);assert.throws(()=>createShopProductBindingStore({database:f.db,orderIntake:f.orders,tenantId,storeId,shopDomain,adapter:f.adapter}),{code:'shop_binding_store_schema'});
 f.db.exec('ALTER TABLE product_revisions ADD COLUMN tenant_id TEXT');assert.throws(()=>f.orders.idBindings({storeId,shopDomain,adapter:f.adapter}),{code:'shop_binding_store_schema'});
});
test('legacy adapter refuses implicit scope, switched instances and mismatched shops',t=>{
 const f=fixture(t);assert.throws(()=>createLegacyShopBindingReadAdapter({storeId,shopDomain,workshop:f.workshop}));
 f.workshop.repository={...f.repository};assert.throws(()=>f.adapter.readiness(f.cfg),{code:'legacy_single_store_scope'});
 f.workshop.repository=f.repository;f.workshop.sessionContext.shopDomain='other.myshopify.com';assert.throws(()=>f.adapter.getBindings());
});
test('legacy subset journals exact raw event and resumes after second-store rollback',t=>{
 const a=fixture(t),b=fixture(t,102),oa=a.offer(),ob=b.offer(),e=event([line(101,oa),line(102,ob)]);
 assert.equal(a.orders.receive(e.raw,e.headers,config,{acceptedLineIds:[101]}).lines.length,1);
 b.db.exec("CREATE TRIGGER synthetic_abort BEFORE INSERT ON form_order_events BEGIN SELECT RAISE(ABORT,'synthetic failure');END");
 assert.throws(()=>b.orders.receive(e.raw,e.headers,config,{acceptedLineIds:[102]}),/synthetic failure/);assert.equal(b.orders.list().length,0);
 b.db.exec('DROP TRIGGER synthetic_abort');assert.equal(a.orders.receive(e.raw,e.headers,config,{acceptedLineIds:[101]}).duplicate,true);
 assert.equal(b.orders.receive(e.raw,e.headers,config,{acceptedLineIds:[102]}).lines.length,1);
 assert.throws(()=>a.orders.receive(e.raw,e.headers,config),/Positionsauswahl/);
 assert.equal(a.orders.ownsOfferToken(oa.property.value,{shopDomain}),true);assert.equal(a.orders.ownsOfferToken(ob.property.value),false);
 assert.deepEqual(a.orders.offerSummary({offerId:oa.id,snapshotId:'synthetic-snapshot',productId:a.cfg,productRevision:1}),{quantity:1});
});
test('legacy original three-argument valid event and duplicate behavior are retained',t=>{
 const f=fixture(t),offer=f.offer(),e=event([line(101,offer)]);assert.equal(f.orders.receive(e.raw,e.headers,config).lines.length,1);assert.equal(f.orders.receive(e.raw,e.headers,config).duplicate,true);
 assert.throws(()=>f.orders.receive(e.raw,e.headers,config,{acceptedLineIds:[101]}),/Positionsauswahl/);
});
test('legacy rejects foreign selected offer, invalid raw HMAC and product mismatch without writes',t=>{
 const a=fixture(t),b=fixture(t,102),oa=a.offer(),ob=b.offer(),e=event([line(101,oa),line(102,ob)]);
 assert.throws(()=>a.orders.receive(e.raw,e.headers,config,{acceptedLineIds:[102]}));
 assert.throws(()=>a.orders.receive(e.raw,{...e.headers,'x-shopify-hmac-sha256':'A'.repeat(43)+'='},config,{acceptedLineIds:[101]}));
 const bad=event([{...line(101,oa),product_id:999}]);assert.throws(()=>a.orders.receive(bad.raw,bad.headers,config),/Shopify-Produkt/);assert.equal(a.orders.list().length,0);
});
