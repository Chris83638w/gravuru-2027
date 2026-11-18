import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {withCartTiming,cartTimingStep,cartTimingCount,cartTimingHeaders,cartTimingBackground} from './shop-cart-timing.mjs';

test('overlapping and nested labels respect the cap and count every dropped call',async()=>{
 const events=[];
 await withCartTiming('theme-cart',e=>events.push(e),async()=>{
  const jobs=[];
  for(let i=0;i<66;i++)jobs.push(cartTimingStep('label_'+i,async()=>{await Promise.resolve();return i;}));
  assert.equal(cartTimingStep('overflow',()=>42),42);
  assert.equal(cartTimingStep('label_0',()=>cartTimingStep('overflow',()=>17)),17);
  assert.deepEqual(await Promise.all(jobs),Array.from({length:66},(_,i)=>i));
  cartTimingHeaders(200);
 });
 assert.equal(Object.keys(events[0].steps).length,64);
 assert.equal(events[0].droppedStepCalls,4);
 assert.equal(events[0].steps.label_0.calls,2);
});

test('timing preserves synchronous values and exceptions; records rejected async steps',async()=>{
 const events=[],error=Error('private customer text');
 assert.equal(cartTimingStep('outside',()=>42),42);
 await withCartTiming('theme-cart',e=>events.push(e),async()=>{
  assert.equal(cartTimingStep('sync',()=>17),17);
  assert.throws(()=>cartTimingStep('sync',()=>{throw error;}),e=>e===error);
  await assert.rejects(cartTimingStep('async',async()=>{throw error;}),e=>e===error);
  cartTimingCount('request_bytes',123);
  const headers=cartTimingHeaders(422);
  assert.match(headers['Server-Timing'],/^total;dur=\d/);
  assert.equal(headers['X-Gravuru-Timing-Id'],events[0].traceId);
  assert.deepEqual(cartTimingHeaders(500),{});
 });
 assert.equal(events.length,1);assert.equal(events[0].status,422);
 assert.equal(events[0].steps.sync.calls,2);assert.equal(events[0].steps.sync.failures,1);
 assert.equal(events[0].steps.async.failures,1);assert.equal(events[0].counts.request_bytes,123);
 assert.ok(!JSON.stringify(events).includes(error.message));
});

test('overlapping requests and background work have separate totals and counts',async()=>{
 const events=[];let image;
 await Promise.all([
  withCartTiming('theme-cart',e=>events.push(e),async()=>{
   image=cartTimingBackground(async()=>{await cartTimingStep('shopify_poll_wait',()=>delay(30));return 'ready';});
   cartTimingCount('request_bytes',10);cartTimingHeaders(200);
  }),
  withCartTiming('cart/data',e=>events.push(e),async()=>{
   await cartTimingStep('checkout_image_wait',()=>delay(10));cartTimingCount('response_bytes',20);cartTimingHeaders(200);
  })
 ]);
 assert.equal(await image,'ready');
 const request=events.find(e=>e.route==='theme-cart'),data=events.find(e=>e.route==='cart/data'),background=events.find(e=>e.route==='checkout-image');
 const main=events.filter(e=>e.event==='shop_cart_timing');
 assert.equal(main.length,3);assert.equal(new Set(main.map(e=>e.traceId)).size,3);
 assert.equal(background.parentTraceId,request.traceId);
 assert.deepEqual(request.counts,{request_bytes:10});assert.deepEqual(data.counts,{response_bytes:20});
 assert.ok(!request.steps.shopify_poll_wait);assert.ok(background.steps.shopify_poll_wait.durationMs>=10);
 assert.ok(background.totalMs>request.totalMs);
 for(const event of main){
  assert.equal(event.eventLoop.resolutionMs,20);
  for(const window of [event.eventLoop.beforeHandler,event.eventLoop.duringHandler]){
   assert.ok(Object.values(window).every(value=>Number.isFinite(value)&&value>=0));
   assert.ok(window.maxMs>=window.p99Ms);
  }
 }
});

test('logging failures cannot change results, and aborted requests are recorded once',async()=>{
 for(const logger of [()=>{throw Error('log full');},async()=>{throw Error('log rejected');}]){
  assert.equal(await withCartTiming('cart/claim',logger,()=>{cartTimingHeaders(200);return 19;}),19);
 }
 const events=[];
 await assert.rejects(withCartTiming('acrylic-drafts',e=>events.push(e),async()=>{throw Error('aborted');}),/aborted/);
 assert.equal(events.length,1);assert.equal(events[0].status,0);
 assert.ok(events[0].eventLoop,'aborted requests also close their event-loop measurement');
 await withCartTiming('model',()=>assert.fail('unrelated route was logged'),()=>42);
});
