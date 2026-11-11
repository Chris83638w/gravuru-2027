import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createOrderIntake} from '../app/workshop/order-intake.mjs';
import {createShopBindingReadAdapter} from '../app/workshop/shop-product-binding-adapter.mjs';
import {planShopProductBindings} from '../app/workshop/shop-product-binding-plan.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';
import {makeAcrylicConfig} from '../app/configurator/variant-m/acrylic-product.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';

test('single-process CLI streams scalar events on stderr and keeps stdout JSON and source bytes intact',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-cli-')),filename=path.join(dir,'workshop.copy.sqlite'),cacheFilename=path.join(dir,'cache.sqlite');
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const tenantId='gravuru',storeId='synthetic-store',shopDomain='synthetic.myshopify.com',repository=createProductRepository({filename,tenantId}),db=new DatabaseSync(filename);
 const clock=()=>Date.parse('2026-11-12T00:00:00Z');
 try{
  const orders=createOrderIntake({database:db,tenantId,clock,snapshot:()=>{throw Error('No customer data');}}),workshop={tenantId,repository,orderIntake:orders,productionProfiles:{resolve(){throw Error('No fabricated release');}},sessionContext:{shopDomain}};
  const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}}),registry=orders.idBindings({storeId,shopDomain,adapter});
  const resources=JSON.parse(fs.readFileSync(new URL('../app/designs/acrylic-unser-anfang/resources.json',import.meta.url)));
  const record=repository.create(makeProductDocument(makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64)),{name:'Synthetic CLI fixture'}));
  const variant=prepareShopProduct(record).variants[0],product='gid://shopify/Product/1',id='gid://shopify/ProductVariant/101';
  const plan=planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now:clock(),maxEvidenceAgeMs:60000,shopifyEvidence:{tenantId,shopDomain,complete:true,readAt:new Date(clock()).toISOString(),products:[{id:product,variants:[{id,productId:product,priceCents:variant.priceCents}]}]},selections:[{shopifyProductId:product,shopifyVariantId:id,productId:record.id,productRevision:1,options:variant.options}]});
  registry.persist({plan,expectedHeads:[{shopifyVariantId:id,revision:null}]});
 }finally{db.close();repository.close();}
 const digest=()=>createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),before=digest();
 const keys=['event','storeId','rss','ms','totalMs','activeRowsMs','documentReadMs','documentParseMs','documentHashMs','bindingReadMs','registryMs','modelMs','profileMs','selectionMs','products','bindings','models','cards'];
 const run=()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./shop-gallery-benchmark.mjs',import.meta.url)),'--local-copy','--restart-child','--db',filename,'--tenant',tenantId,'--store',storeId,'--shop',shopDomain,'--source-label','synthetic-cli','--cache-db',cacheFilename],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024,env:{...process.env,NODE_NO_WARNINGS:'1'}});
  assert.equal(result.status,0,result.stderr);const body=JSON.parse(result.stdout),events=result.stderr.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  assert.equal(body.readOnly,true);assert.equal(body.cold.status,'ready');assert.equal(body.warm.status,'ready');assert.ok(events.length);
  for(const event of events){assert.ok(Object.keys(event).every(k=>keys.includes(k)));assert.equal(event.storeId,storeId);assert.ok(event.rss>0);assert.ok(Object.values(event).every(v=>typeof v==='string'||Number.isFinite(v)));}
  assert.deepEqual(events.map(({rss,...entry})=>entry),body.measurements);assert.equal(digest(),before);
  return events.map(e=>e.event);
 };
 const cold=run();assert.ok(cold.includes('shop_gallery_binding_measure'));assert.ok(cold.includes('shop_gallery_build_measure'));assert.ok(cold.includes('shop_gallery_cache_saved'));
 const reopened=run();assert.ok(reopened.includes('shop_gallery_cache_hit'));assert.ok(!reopened.includes('shop_gallery_build_measure'));
});
