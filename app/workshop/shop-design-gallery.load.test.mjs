import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {openWorkshopDb,checkSelections} from '../../scripts/shop-bind.mjs';
import {createShopDesignGallery} from './shop-design-gallery.mjs';
import {shopGalleryModel} from './shop-gallery-model.mjs';

test('150 active SQLite bindings: cold/warm first-page latency, event loop and lightweight reads only, including a restarted gallery',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-gallery-load-')),filename=path.join(dir,'workshop.sqlite'),shopDomain='gallery-load.myshopify.com';
 const repository=createProductRepository({filename,tenantId:'gravuru'});
 const config=doorbellFixture();
 for(const profile of [config.profile,...config.doorbell.formats.map(f=>f.profile)]){const original=profile.designs[0];profile.designs=Array.from({length:10},(_,i)=>({...structuredClone(original),id:i===0?'example':'example-'+i,name:'Synthetic design '+i}));}
 // Two valid, sizable immutable SVG surfaces; no customer or production data.
 config.materialSurface='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><!--'+'x'.repeat(512*1024)+'--></svg>').toString('base64');
 const records=[1,2].map(n=>repository.create(makeProductDocument(config,{name:'Load fixture '+n,kind:'product'})));
 repository.close();
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',storeId:'acryl',shopDomain});
 t.after(()=>{ws.close();fs.rmSync(dir,{recursive:true,force:true});});
 const selections=records.flatMap((record,n)=>prepareShopProduct(record).variants.slice(0,75).map((v,i)=>({productId:record.id,productRevision:1,shopifyProductId:'gid://shopify/Product/'+(16000000000001+n),shopifyVariantId:'gid://shopify/ProductVariant/'+(57000000000001+n*100+i),options:v.options,expectedUnitCents:v.priceCents})));
 assert.equal(selections.length,150);
 const reader={async inspectVariants(ids){return {installation:{shopDomain,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const s=selections.find(s=>s.shopifyVariantId===id);return {id,found:true,productId:s.shopifyProductId,status:'ACTIVE',priceCents:s.expectedUnitCents};})};}};
 const registry=ws.orderIntake.idBindings({storeId:'acryl',shopDomain,adapter:ws.adapter});
 for(const part of [selections.slice(0,75),selections.slice(75)]){
  const block=(await checkSelections(part,{adapter:ws.adapter,reader}))[0];assert.equal(block.error,null);
  registry.persist({plan:block.result.plan,expectedHeads:part.map(s=>({shopifyVariantId:s.shopifyVariantId,revision:null}))});
 }
 assert.equal(registry.listActive().length,150);
 const identity={shopifyProductId:selections[0].shopifyProductId,shopifyVariantId:selections[0].shopifyVariantId};
 const store={storeId:'acryl',workshop:{tenantId:'gravuru'},registry};let models=0,exactReads=0;
 const makeGallery=()=>createShopDesignGallery({secret:'synthetic-gallery-load-secret',resolve:ids=>{exactReads++;return {store,binding:registry.resolve(ids)};},modelFor:()=>{throw Error('Full model forbidden for gallery');},cardFor:(_s,b)=>{models++;return shopGalleryModel(ws.adapter.getCurrentProduct(b.productId));},allowedAssets:()=>new Set()});
 let gallery=makeGallery();
 const server=http.createServer(async(req,res)=>{try{
  // Include the route's strict source-binding check on every request.
  const context={store,binding:registry.resolve(identity),session:{sid:'synthetic-source'}};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await gallery.list(context)));
 }catch(error){res.writeHead(500).end(error.stack);}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const url='http://127.0.0.1:'+server.address().port,lag=monitorEventLoopDelay({resolution:1});
 lag.enable();await delay(15);lag.reset();
 const measure=async()=>{
  const start=performance.now(),r=await fetch(url);let body=await r.json();const ms=performance.now()-start,firstStatus=body.status||'ready';assert.equal(r.status,200);
  if(body.status==='preparing'){
   assert.deepEqual(body.items,[]);assert.equal(body.nextPage,0);assert.equal(body.total,null);assert.match(body.message,/Designs werden vorbereitet/);
   await gallery.warm({store,binding:{shopDomain}});const retry=await fetch(url);assert.equal(retry.status,200);body=await retry.json();
  }
  assert.equal(body.items.length,40);assert.equal(body.status,undefined,'retry must return the complete ready first page');return {ms,total:body.total,firstStatus};
 };
 const cold=await measure(),coldModels=models;await delay(5);
 const coldLag=lag.max/1e6;lag.reset();const warm=await measure();await delay(5);const warmLag=lag.max/1e6;lag.disable();
 assert.equal(models,coldModels,'warm page does not rebuild any product model');assert.equal(coldModels,2,'one model per product revision');assert.equal(exactReads,0,'registry-validated listing does not resolve all bindings a second time');assert.equal(warm.total,cold.total);
 gallery=makeGallery();const restarted=await measure();assert.equal(restarted.total,cold.total);assert.equal(models,4);for(const r of [cold,warm,restarted])assert.ok(r.ms<5000,JSON.stringify(r));
 t.diagnostic(JSON.stringify({restartedFirstPageMs:+restarted.ms.toFixed(2),coldFirstStatus:cold.firstStatus,restartedFirstStatus:restarted.firstStatus,activeBindings:150,sourceSurfaceBytes:Buffer.byteLength(config.materialSurface),cards:cold.total,coldFirstPageMs:+cold.ms.toFixed(2),warmFirstPageMs:+warm.ms.toFixed(2),coldEventLoopMaxMs:+coldLag.toFixed(2),warmEventLoopMaxMs:+warmLag.toFixed(2),modelsCold:coldModels,lightweightReadsAdditionalRestart:models-coldModels}));
});
