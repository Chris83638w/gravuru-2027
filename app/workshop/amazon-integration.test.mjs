import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createAmazonOrderStore} from './amazon-order-store.mjs';
import {createAmazonIntegration} from './amazon-integration.mjs';
import {amazonTestOrders} from './amazon-fixtures.mjs';
import {createWorkshop} from './http.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Core fields from the actual 2026-10-16 static sandbox getOrder response.
// The EU sandbox returned the public Brazil fixture; this is intentionally BRL, not EUR.
const observedSandboxOrder=()=>({orderId:'171-9876543-2109876',createdTime:'2024-12-24T20:30:00Z',lastUpdatedTime:'2024-12-25T08:15:00Z',salesChannel:{channelName:'AMAZON',marketplaceId:'A2Q3Y263D00KWC'},fulfillment:{fulfillmentStatus:'UNSHIPPED',fulfilledBy:'MERCHANT',shipByWindow:{earliestDateTime:'2024-12-26T00:00:00Z',latestDateTime:'2024-12-27T23:59:59Z'}},orderItems:[{orderItemId:'17198765432109',quantityOrdered:1,product:{asin:'B08N5WRWNW',sellerSku:'ECHO-DOT-4-BR-PRETO',price:{unitPrice:{amount:'299.90',currencyCode:'BRL'}}},proceeds:{proceedsTotal:{amount:'299.90',currencyCode:'BRL'}},fulfillment:{quantityFulfilled:0,quantityUnfulfilled:1}}]});
const query={lastUpdatedAfter:'2026-10-15T00:00:00Z',marketplaceIds:['A1PA6795UKMFR9'],includedData:['FULFILLMENT','PROCEEDS','CANCELLATION']};
const diagnostics=()=>({environment:'sandbox',ordersVersion:'2026-01-01'});
function setup(t,client=null,extra={}){const db=new DatabaseSync(':memory:');const orders=createAmazonOrderStore({database:db}),service=createAmazonIntegration({orders,client,...extra});t.after(()=>{service.close();db.close();});return {db,orders,service};}
test('default runtime remains disconnected, does not invent orders, and refuses production clients',async t=>{
 const f=setup(t);assert.equal(f.service.status().mode,'not-connected');assert.equal(f.service.status().productionReadsEnabled,false);assert.equal(f.orders.list().length,0);assert.throws(()=>f.service.demo(),{code:'amazon_demo_disabled'});await assert.rejects(f.service.probe(),{code:'amazon_not_connected'});
 assert.throws(()=>createAmazonIntegration({orders:f.orders,client:{diagnostics:()=>({environment:'production'})}}),{code:'amazon_sandbox_required'});
});
test('invalid Amazon config is rejected before a workshop opens databases or accesses seed data',()=>{
 assert.throws(()=>createWorkshop({amazon:{client:{diagnostics:()=>({environment:'production'})}}}),{code:'amazon_sandbox_required'});
});
test('demo import/cancel deduplicates and does not alter pre-existing source rows',t=>{
 const f=setup(t,null,{allowTestImports:true});f.db.exec("CREATE TABLE existing_workshop_snapshot(id TEXT PRIMARY KEY,document TEXT); INSERT INTO existing_workshop_snapshot VALUES('proof_original','unchanged');");
 assert.equal(f.service.demo().lines.length,2);assert.equal(f.service.demo().duplicates,1);assert.equal(f.orders.list().length,2);f.service.demo('cancel');assert.ok(f.orders.list().every(row=>f.orders.status(row.id).cancelled));assert.equal(f.db.prepare('SELECT document FROM existing_workshop_snapshot').get().document,'unchanged');
});
test('observed static sandbox fixture imports in BRL and repeated probes preserve identity',async t=>{
 let calls=0;const f=setup(t,{diagnostics,async probeSandbox(){calls++;return {order:observedSandboxOrder()};}});
 const result=await f.service.probe();assert.equal(result.staticFixture,true);assert.equal(result.productionPermissionVerified,false);assert.equal(result.imported,1);const first=f.orders.list()[0];assert.equal(first.currency,'BRL');assert.equal(first.unitCents,29990);assert.equal(first.marketplaceId,'A2Q3Y263D00KWC');assert.equal(first.provenance,'sandbox');await f.service.probe();assert.equal(f.orders.list().length,1);assert.equal(f.orders.list()[0].id,first.id);assert.equal(calls,2);
});
test('scheduled sandbox polling deduplicates and stops scheduling after close',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let calls=0;const f=setup(t,{diagnostics,async probeSandbox(){calls++;return {order:observedSandboxOrder()};}},{intervalMs:180000});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));f.service.start();f.service.start();t.mock.timers.tick(1);await flush();assert.equal(calls,1);assert.equal(f.orders.list().length,1);
 t.mock.timers.tick(180000);await flush();assert.equal(calls,2);assert.equal(f.orders.list().length,1);f.service.close();t.mock.timers.tick(180000);await flush();assert.equal(calls,2);assert.equal(f.service.status().automatic,false);
});
test('probe worker prevents overlapping remote reads and hides provider error details in status',async t=>{
 let complete,fail=false;const f=setup(t,{diagnostics,async probeSandbox(){if(fail)throw Object.assign(Error('PRIVATE-BODY-TOKEN'),{code:'bad code PRIVATE'});await new Promise(resolve=>complete=resolve);return {order:observedSandboxOrder()};}});
 const first=f.service.probe();await Promise.resolve();assert.equal(f.service.status().running,true);await assert.rejects(f.service.probe(),{code:'amazon_sync_running'});complete();await first;assert.equal(f.service.status().running,false);
 fail=true;await assert.rejects(f.service.probe());assert.ok(!JSON.stringify(f.service.status()).includes('PRIVATE'));assert.equal(f.service.status().lastError.code,'amazon_sync_failed');
});
test('pagination resumes from committed cursor after a failed page and service restart',async t=>{
 let failPage=true;const calls=[],client={diagnostics,async searchOrders(input){calls.push(input);if(!input.paginationToken)return {orders:amazonTestOrders(),pagination:{nextToken:'opaque-next-page'}};if(failPage)throw Object.assign(Error('PRIVATE-REMOTE-BODY'),{code:'amazon_http'});return {orders:[{...amazonTestOrders()[0],orderId:'TEST-GRAVURU-AMAZON-002'}]};}};
 const f=setup(t,client);await assert.rejects(f.service.sync(query));assert.equal(f.orders.list().length,2);assert.equal(f.orders.checkpoint('sandbox-orders').revision,1);assert.equal(f.orders.checkpoint('sandbox-orders').nextToken,'opaque-next-page');f.service.close();failPage=false;
 const restarted=createAmazonIntegration({orders:f.orders,client});t.after(()=>restarted.close());const result=await restarted.sync(query);assert.equal(result.complete,true);assert.equal(result.pages,1);assert.equal(f.orders.list().length,4);assert.equal(calls.at(-1).paginationToken,'opaque-next-page');assert.equal(f.orders.checkpoint('sandbox-orders').revision,2);
 const again=await restarted.sync(query);assert.equal(again.pages,0);assert.equal(again.reused,true);
});
test('committed cursor and identity survive a physical SQLite connection restart',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-amazon-restart-')),filename=path.join(dir,'test.sqlite');let db=new DatabaseSync(filename),orders=createAmazonOrderStore({database:db}),service;
 const client={diagnostics,async searchOrders(input){return input.paginationToken?{orders:amazonTestOrders()}:{orders:amazonTestOrders(),pagination:{nextToken:'resume-after-process-restart'}};}};
 t.after(()=>{service?.close();db.close();fs.rmSync(filename,{force:true});fs.rmdirSync(dir);});
 service=createAmazonIntegration({orders,client});const first=await service.sync(query,{maxPages:1});assert.equal(first.complete,false);const ids=orders.list().map(v=>v.id).sort();service.close();db.close();
 db=new DatabaseSync(filename);orders=createAmazonOrderStore({database:db});service=createAmazonIntegration({orders,client});assert.equal(orders.checkpoint('sandbox-orders').nextToken,'resume-after-process-restart');const completed=await service.sync(query);assert.equal(completed.complete,true);assert.deepEqual(orders.list().map(v=>v.id).sort(),ids);
});
test('repeated pagination token does not ingest the repeated page or advance cursor',async t=>{
 const f=setup(t,{diagnostics,async searchOrders(input){return {orders:[{...amazonTestOrders()[0],orderId:input.paginationToken?'TEST-SECOND-ORDER':'TEST-FIRST-ORDER'}],pagination:{nextToken:'same-token'}};}});
 await assert.rejects(f.service.sync(query),{code:'amazon_repeated_cursor'});assert.equal(f.orders.list().length,2);assert.equal(f.orders.checkpoint('sandbox-orders').revision,1);
});
test('reusing a checkpoint for another search window is a visible conflict, never a false completed sync',async t=>{
 const f=setup(t,{diagnostics,async searchOrders(){return {orders:amazonTestOrders()};}});await f.service.sync(query);
 await assert.rejects(f.service.sync({...query,lastUpdatedAfter:'2026-10-16T00:00:00Z'}),error=>error.status===409);assert.equal(f.orders.checkpoint('sandbox-orders').revision,1);
});
test('closing an active probe prevents late response persistence into a closed runtime',async t=>{
 let complete;const f=setup(t,{diagnostics,async probeSandbox(){await new Promise(resolve=>complete=resolve);return {order:observedSandboxOrder()};}});
 const running=f.service.probe();await Promise.resolve();f.service.close();complete();await running.catch(()=>{});assert.equal(f.orders.list().length,0);assert.equal(f.service.status().automatic,false);
});
