import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {withCartTiming,cartTimingStep,cartTimingDetail,cartTimingRead,cartTimingBytes,cartTimingHeaders} from './shop-cart-timing.mjs';
import {cartCpuDelta,cartResourceDelta} from './shop-cart-resources.mjs';

test('process units and unsupported OS counters are explicit, not invented zeros',()=>{
 assert.deepEqual(cartCpuDelta({user:1000,system:500},{user:4500,system:750}),{available:1,userMs:3.5,systemMs:0.25});
 assert.deepEqual(cartCpuDelta(null),{available:0});
 const before={fsRead:1,fsWrite:2,majorPageFault:3,voluntaryContextSwitches:4,involuntaryContextSwitches:5},after=Object.fromEntries(Object.entries(before).map(([k,v])=>[k,v+10]));
 const linux=cartResourceDelta(before,after,'linux');assert.ok(Object.values(linux.delta).every(n=>n===10));
 const win=cartResourceDelta(before,after,'win32');assert.deepEqual(win.delta,{fsRead:10,fsWrite:10});assert.ok(win.unsupported.includes('majorPageFault'));
 assert.deepEqual(cartResourceDelta(null,after),{available:0});
});

test('version 2 distinguishes sync, rejected async, and detailed reads without exposing new headers',async()=>{
 const events=[],privateRow={secret:'private-token'},error=Error('private-error');let reads=0,headers;
 assert.equal(cartTimingRead('outside',()=>privateRow),privateRow);
 await withCartTiming('theme-cart',e=>events.push(e),async()=>{
  assert.equal(cartTimingStep('offer_resolve',()=>privateRow),privateRow);
  assert.equal(cartTimingDetail('detail_private_read',()=>privateRow),privateRow);
  assert.equal(cartTimingRead('detail_db',()=>{reads++;return [privateRow];})[0],privateRow);
  assert.throws(()=>cartTimingRead('detail_db',()=>{reads++;throw error;}),e=>e===error);
  await assert.rejects(cartTimingStep('async_probe',async()=>{await delay(10);throw error;}),e=>e===error);
  cartTimingBytes('sample_bytes','ä');headers=cartTimingHeaders(422);
 });
 const e=events.find(e=>e.event==='shop_cart_timing');assert.equal(e.version,2);assert.equal(reads,2);
 assert.equal(e.steps.offer_resolve.syncCalls,1);assert.equal(e.steps.offer_resolve.asyncCalls,0);
 assert.equal(e.steps.async_probe.asyncCalls,1);assert.equal(e.steps.async_probe.failures,1);
 assert.equal(e.storageReads.calls,2);assert.equal(e.storageReads.rows,1);assert.equal(e.storageReads.failures,1);assert.equal(e.counts.sample_bytes,2);
 for(const cpu of [e.processCpu,...Object.values(e.steps).map(s=>s.processCpu)]){assert.equal(cpu.available,1);assert.ok(cpu.userMs>=0&&cpu.systemMs>=0);}
 assert.ok(e.memory.before.rss>0&&e.memory.after.heapUsed>0);
 assert.match(headers['Server-Timing'],/offer_resolve;dur=/);assert.doesNotMatch(headers['Server-Timing'],/detail_|cpu|memory|storage|gc/i);
 assert.ok(!JSON.stringify(events).includes(privateRow.secret));assert.ok(!JSON.stringify(events).includes(error.message));
});

test('missing resource APIs cannot change a response or invent measured values',async t=>{
 t.mock.method(process,'resourceUsage',()=>{throw Error('unavailable');});
 t.mock.method(process,'memoryUsage',()=>{throw Error('unavailable');});
 const events=[];assert.equal(await withCartTiming('cart/claim',e=>events.push(e),()=>{cartTimingHeaders(200);return 7;}),7);
 const e=events.find(e=>e.event==='shop_cart_timing');assert.deepEqual(e.resourceUsage,{available:0});assert.deepEqual(e.memory,{before:null,after:null});
});

test('real synchronous GC is delivered after the response, clipped to each original window and never duplicated',()=>{
 const moduleUrl=new URL('./shop-cart-timing.mjs',import.meta.url).href;
 const script=`import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';import {setTimeout as delay} from 'node:timers/promises';
 import {withCartTiming,cartTimingStep,cartTimingHeaders,cartTimingBackground} from ${JSON.stringify(moduleUrl)};
 const events=[];let job;
 await withCartTiming('theme-cart',e=>events.push(e),async()=>{
  job=cartTimingBackground(async()=>{await delay(5);global.gc();await delay(5);return 1;});
  cartTimingStep('busy',()=>{const until=performance.now()+90;while(performance.now()<until){};global.gc();});
  cartTimingHeaders(200);assert.equal(events.filter(e=>e.event==='shop_cart_gc').length,0);
 });await job;await delay(65);
 const main=events.filter(e=>e.event==='shop_cart_timing'),gc=events.filter(e=>e.event==='shop_cart_gc');
 assert.equal(main.length,2);assert.equal(gc.length,2);
 const busy=main.find(e=>e.route==='theme-cart').steps.busy;assert.ok(busy.processCpu.userMs+busy.processCpu.systemMs>0);assert.equal(busy.syncCalls,1);
 for(const e of gc){assert.ok(main.some(m=>m.traceId===e.traceId));assert.equal(e.version,2);assert.ok(e.gc.count>0&&e.gc.pauseMs>0);assert.ok(e.gc.windowEndMs>e.gc.windowStartMs);assert.ok(e.gc.pauseMs<=e.gc.windowMs+0.1);}
 assert.equal(new Set(gc.map(e=>e.traceId)).size,2);assert.ok(gc.find(e=>e.route==='checkout-image').parentTraceId);
 const serialized=JSON.stringify(events);global.gc();await delay(60);assert.equal(JSON.stringify(events),serialized);
 console.log('GC and CPU verified');`;
 const output=execFileSync(process.execPath,['--expose-gc','--input-type=module','-e',script],{encoding:'utf8',timeout:10000});assert.match(output,/GC and CPU verified/);
});
