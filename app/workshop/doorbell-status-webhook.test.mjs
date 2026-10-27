import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {openWorkshopDb} from '../../scripts/shop-bind.mjs';
import {applyDoorbellBindings} from '../../scripts/doorbell-shop-bind.mjs';
import {createDoorbellStatusWebhookHandler,DOORBELL_STATUS_WEBHOOK_PATH} from './doorbell-status-webhook.mjs';

const SHOP='gravuru-design.myshopify.com';
const config={shopDomain:SHOP,apiVersion:'2026-07',secret:'synthetic_doorbell_status_secret_123',mode:'doorbell-live-approved'};
const labels=o=>[{name:'Acrylfarbe',value:o.color},{name:'Edelstahlrahmen',value:o.format+' / '+o.frame},{name:'Befestigung',value:o.mounting}];
const sign=(payload,event,topic)=>{const raw=Buffer.from(JSON.stringify(payload));return {raw,headers:{'content-type':'application/json','x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':SHOP,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':topic,'x-shopify-webhook-id':event}};};

test('actual approved native order status reaches the existing durable ledger via isolated HMAC HTTP route',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-doorbell-status-')),filename=path.join(dir,'workshop.sqlite');
 const repository=createProductRepository({filename,tenantId:'gravuru'}),native=doorbellFixture(),record=repository.create(makeProductDocument(native,{name:'Synthetic status doorbell',kind:'product'}));
 const prepared=prepareShopProduct(record),p={modelKey:native.doorbell.modelKey,formatKey:native.doorbell.defaultFormatKey,productId:record.id,productRevision:1,shopifyProductId:'gid://shopify/Product/16000000000001',variants:prepared.variants.map((v,i)=>({shopifyVariantId:'gid://shopify/ProductVariant/'+(57000000000001+i),sku:'SYNTH-STATUS-'+i,priceCents:v.priceCents,options:v.options,selectedOptions:labels(v.options)}))};
 repository.close();
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',storeId:'acryl',shopDomain:SHOP});t.after(()=>{ws.close();fs.rmSync(dir,{recursive:true,force:true});});
 const selections=p.variants.map(v=>({konfiProductId:p.productId,productId:p.productId,productRevision:1,shopifyProductId:p.shopifyProductId,shopifyVariantId:v.shopifyVariantId,sku:v.sku,options:v.options,selectedOptions:v.selectedOptions,expectedUnitCents:v.priceCents}));
 const reader={async inspectVariants(ids){return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const v=p.variants.find(v=>v.shopifyVariantId===id);return {id,found:true,productId:p.shopifyProductId,status:'ACTIVE',priceCents:v.priceCents,options:v.selectedOptions};})};}};
 await applyDoorbellBindings({manifest:{products:[p],shopDomain:SHOP},selections,workshop:ws,reader,approvalId:'synthetic-status-release'});
 const chosen=p.variants[0],binding=ws.orderIntake.bindings().find(b=>b.variantId===chosen.shopifyVariantId.split('/').at(-1));
 const proof={schema:'gravuru-native-review/v1',id:'proof_doorbell_status',packageSha256:'a'.repeat(64),product:{id:p.productId,revision:1,name:'Synthetic',basePriceCents:chosen.priceCents,currency:'EUR'},selection:{options:chosen.options,price:{unitCents:chosen.priceCents,quantity:1}}};
 const intake=createOrderIntake({database:ws.db,tenantId:'gravuru',snapshot:()=>structuredClone(proof)}),offer=intake.offer({bindingId:binding.id,snapshotId:proof.id,quantity:1});
 const paid={id:901,test:false,currency:'EUR',financial_status:'paid',updated_at:'2026-10-27T10:00:00Z',line_items:[{id:902,product_id:16000000000001,variant_id:Number(binding.variantId),quantity:1,price:(chosen.priceCents/100).toFixed(2),properties:[{name:'_gravuru_offer',value:offer.property.value}]}]};
 let probes=0;const routeIntake={receive:(...a)=>intake.receive(...a),doorbellLiveOrderScope:(...a)=>{probes++;return intake.doorbellLiveOrderScope(...a);}};
 const server=http.createServer(createDoorbellStatusWebhookHandler({intake:routeIntake,config,bodyTimeoutMs:100}));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.close();server.closeAllConnections();});
 const request=(payload,event='synthetic-status-01',topic='orders/updated',headers={},route=DOORBELL_STATUS_WEBHOOK_PATH,method='POST')=>new Promise((resolve,reject)=>{
  const s=sign(payload,event,topic),req=http.request({host:'127.0.0.1',port:server.address().port,path:route,method,headers:{...s.headers,...headers}},res=>{const chunks=[];res.on('data',v=>chunks.push(v));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString())}));});req.on('error',reject);req.end(s.raw);
 });
 const count=()=>ws.db.prepare('SELECT count(*) AS n FROM form_order_status_events').get().n;
 // Status may arrive before payment: retry rather than silently discard it.
 assert.equal((await request(paid)).status,409);assert.equal(count(),0);
 const unrelated={...paid,id:999,line_items:[{id:998,product_id:777,variant_id:888}]};
 assert.deepEqual((await request(unrelated)).body,{accepted:true,ignored:true,matchedLines:0});assert.equal(count(),0);
 for(const headers of [{'x-shopify-hmac-sha256':'invalid'},{'x-shopify-shop-domain':'foreign.myshopify.com'},{'x-shopify-api-version':'2026-10'},{origin:'https://foreign.invalid'},{'sec-fetch-site':'same-origin'},{'content-encoding':'gzip'}]){
  const before=probes;assert.notEqual((await request(paid,'synthetic-forged-event','orders/updated',headers)).status,200);assert.equal(probes,before);
 }
 assert.equal((await request({...paid,test:true})).status,422);
 assert.equal((await request(paid,'synthetic-wrong-topic','orders/paid')).status,422);
 assert.equal((await request(paid,'synthetic-query','orders/updated',{},DOORBELL_STATUS_WEBHOOK_PATH+'?x=1')).status,404);
 assert.equal((await request(paid,'synthetic-get','orders/updated',{},DOORBELL_STATUS_WEBHOOK_PATH,'GET')).status,405);
 const event=sign(paid,'synthetic-paid-status-fixture','orders/paid'),line=intake.receive(event.raw,event.headers,config).lines[0];assert.ok(line.liveApproval);assert.equal(line.test,false);
 const partial={...paid,financial_status:'partially_refunded',updated_at:'2026-10-27T10:02:00Z'};
 assert.equal((await request(partial)).status,200);assert.equal(intake.status(line.id).state,'partially_refunded');assert.equal(intake.status(line.id).productionReady,false);
 assert.equal((await request(partial)).body.duplicate,true);assert.equal(count(),2); // paid + one status
 assert.equal((await request({...partial,financial_status:'refunded'})).status,409);
 const stale={...paid,updated_at:'2026-10-27T10:01:00Z'};assert.equal((await request(stale,'synthetic-stale-event')).status,200);assert.equal(intake.status(line.id).state,'partially_refunded');
 const cancel={...partial,cancelled_at:'2026-10-27T10:03:00Z',updated_at:'2026-10-27T10:03:00Z'};
 assert.equal((await request(cancel,'synthetic-cancel-event','orders/cancelled')).status,200);assert.equal(intake.status(line.id).state,'cancelled');assert.equal(intake.status(line.id).productionReady,false);
 assert.deepEqual(intake.get(line.id),line); // paid line and snapshot are immutable
 assert.throws(()=>createDoorbellStatusWebhookHandler({intake,config:{...config,mode:'test-only'}}));
});
