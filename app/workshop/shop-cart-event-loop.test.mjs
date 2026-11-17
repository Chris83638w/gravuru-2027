import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {createCartEventLoopProbe} from './shop-cart-event-loop.mjs';
import {withCartTiming,cartTimingHeaders} from './shop-cart-timing.mjs';

function fixture(){
 let now=0,tick,unref=0,cancelled=0;
 const timer={unref(){unref++;}};
 const probe=createCartEventLoopProbe({clock:()=>now,schedule:(callback,ms)=>{assert.equal(ms,20);tick=callback;return timer;},cancel:t=>{assert.equal(t,timer);cancelled++;}});
 return {probe,at(ms){now=ms;},tick(ms){now=ms;tick();},unref:()=>unref,cancelled:()=>cancelled};
}
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<0.2,`${actual} vs ${expected}`);

test('idle heartbeat and unsampled short request do not claim a measured zero delay',()=>{
 const f=fixture(),finish=f.probe.start();f.at(5);
 assert.deepEqual(finish().duringHandler,{windowMs:5,samples:0,maxMs:0,p99Ms:0});
 f.tick(20);f.tick(40);const done=f.probe.start();f.tick(60);
 const measured=done();assert.equal(measured.beforeHandler.samples,2);assert.equal(measured.duringHandler.samples,1);near(measured.duringHandler.maxMs,0);
 assert.equal(f.unref(),1);f.probe.close();assert.equal(f.cancelled(),1);
});

test('block before handler is captured even before the delayed heartbeat can run',()=>{
 const f=fixture();f.tick(20);f.at(220);const done=f.probe.start();f.at(225);
 const measured=done();near(measured.beforeHandler.maxMs,180);near(measured.beforeHandler.p99Ms,180);
 near(measured.duringHandler.maxMs,5);assert.equal(measured.duringHandler.windowMs,5);
 assert.deepEqual(done(),measured,'finishing twice does not change any measurements');f.probe.close();
});

test('synchronous block at handler start or just before response is counted without yielding',()=>{
 const f=fixture();f.tick(20);const first=f.probe.start();f.at(120);
 near(first().duringHandler.maxMs,80);f.tick(120);
 const second=f.probe.start();f.tick(140);f.at(240);
 const measured=second();assert.equal(measured.duringHandler.samples,2);near(measured.duringHandler.maxMs,80);near(measured.duringHandler.p99Ms,80);f.probe.close();
});

test('overlapping requests retain independent histograms and history expires',()=>{
 const f=fixture(),first=f.probe.start();f.tick(20);f.at(30);const second=f.probe.start();
 f.tick(120);const a=first();near(a.duringHandler.maxMs,80);
 f.tick(140);f.tick(240);const b=second();assert.equal(b.duringHandler.samples,3);near(b.duringHandler.maxMs,80);
 assert.equal(a.duringHandler.samples,2,'later completion does not mutate earlier log');
 for(let time=260;time<=1320;time+=20)f.tick(time);
 const fresh=f.probe.start()();near(fresh.beforeHandler.maxMs,0);assert.equal(fresh.beforeHandler.windowMs,1000);f.probe.close();
});

test('p99 is a percentile of samples, not an alias for maximum',()=>{
 const f=fixture(),done=f.probe.start();for(let time=20;time<=2000;time+=20)f.tick(time);
 f.at(2120);const measured=done();assert.equal(measured.duringHandler.samples,101);
 near(measured.duringHandler.maxMs,100);near(measured.duringHandler.p99Ms,0);f.probe.close();
});

test('real process stall is present in the same response log; error response retains numeric diagnostics',async()=>{
 const events=[];await delay(40);
 await withCartTiming('cart/claim',e=>events.push(e),()=>{
  const start=performance.now();while(performance.now()-start<90){};
  cartTimingHeaders(200);
 });
 assert.equal(events.length,1);const loop=events[0].eventLoop;
 assert.ok(loop.duringHandler.maxMs>=60,JSON.stringify(loop));assert.ok(loop.duringHandler.p99Ms>=60);
 const validate=value=>{for(const item of Object.values(value))if(typeof item==='object')validate(item);else assert.ok(Number.isFinite(item)&&item>=0);};validate(loop);
 await withCartTiming('acrylic-drafts',e=>events.push(e),()=>cartTimingHeaders(422));validate(events[1].eventLoop);
});
