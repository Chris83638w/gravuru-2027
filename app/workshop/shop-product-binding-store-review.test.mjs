import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from './repository.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {planShopProductBindings} from './shop-product-binding-plan.mjs';
import {makeFormProduct} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';

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

for(const temporary of [false,true])test('independent review: '+(temporary?'TEMP':'main')+' head trigger cannot hide an earlier archive before a later callback restores it',t=>{
 const f=fixture(t),other=f.repository.create(formDocument());
 const items=[{record:f.record,...pair(),options:{}},{record:other,...pair(2),options:{}}],plan=f.plan(items),before=counts(f);
 f.db.exec(`CREATE ${temporary?'TEMP ':''}TRIGGER review_archive_after_head AFTER INSERT ON main.shop_product_binding_heads
   WHEN NEW.variant_gid='gid://shopify/ProductVariant/101'
   BEGIN UPDATE products SET archived=1 WHERE id='${f.record.id}'; END;`);
 const bind=f.orders.bindVariants;let calls=0;
 f.orders.bindVariants=function(input){const value=bind.call(this,input);if(++calls===2)f.db.prepare('UPDATE products SET archived=0 WHERE id=?').run(f.record.id);return value;};
 assert.throws(()=>f.persist(plan),{code:'shop_binding_cfg_changed'});
 assert.deepEqual(counts(f),before);
});

test('independent review: a custom head expression index cannot use the pure-native path',t=>{
 const f=fixture(t),other=f.repository.create(formDocument());
 const items=[{record:f.record,...pair(),options:{}},{record:other,...pair(2),options:{}}],plan=f.plan(items),before=counts(f);
 f.db.function('review_index_archive',{deterministic:true},variant=>{if(variant===pair().shopifyVariantId)f.db.prepare('UPDATE products SET archived=1 WHERE id=?').run(f.record.id);return variant;});
 f.db.exec('CREATE INDEX review_head_expression ON shop_product_binding_heads(review_index_archive(variant_gid))');
 const bind=f.orders.bindVariants;let calls=0;
 f.orders.bindVariants=function(input){const value=bind.call(this,input);if(++calls===2)f.db.prepare('UPDATE products SET archived=0 WHERE id=?').run(f.record.id);return value;};
 assert.throws(()=>f.persist(plan),{code:'shop_binding_cfg_changed'});
 assert.deepEqual(counts(f),before);
});

test('independent review: a temporary head table with a CHECK callback cannot use the pure-native path',t=>{
 const f=fixture(t),other=f.repository.create(formDocument());
 const items=[{record:f.record,...pair(),options:{}},{record:other,...pair(2),options:{}}],plan=f.plan(items);
 f.db.function('review_archive',variant=>{if(variant===pair().shopifyVariantId)f.db.prepare('UPDATE products SET archived=1 WHERE id=?').run(f.record.id);return 1;});
 f.db.exec(`CREATE TEMP TABLE shop_product_binding_heads(tenant_id TEXT NOT NULL,shop TEXT NOT NULL,variant_gid TEXT NOT NULL,revision INTEGER NOT NULL,
   PRIMARY KEY(tenant_id,shop,variant_gid),CHECK(review_archive(variant_gid)=1))`);
 const before=counts(f),bind=f.orders.bindVariants;let calls=0;
 f.orders.bindVariants=function(input){const value=bind.call(this,input);if(++calls===2)f.db.prepare('UPDATE products SET archived=0 WHERE id=?').run(f.record.id);return value;};
 assert.throws(()=>f.persist(plan),{code:'shop_binding_cfg_changed'});
 assert.deepEqual(counts(f),before);
});

