import test from 'node:test';
import assert from 'node:assert/strict';
import {createTargetPreviewCache,reviewPage} from './ui/design-target-preview-cache.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

test('target preview queue never exceeds three requests while advancing queued work',async()=>{
 const cache=createTargetPreviewCache(),jobs=Array.from({length:8},deferred);let running=0,peak=0,started=0;
 const results=jobs.map((job,index)=>cache.get('target-'+index,'r'+index,async()=>{started++;peak=Math.max(peak,++running);try{return await job.promise;}finally{running--;}}));
 await tick();assert.equal(started,3);assert.equal(cache.active,3);
 for(let index=0;index<jobs.length;index++){jobs[index].resolve({checksum:'r'+index});await tick();assert.ok(running<=3);}
 assert.equal((await Promise.all(results)).length,8);assert.equal(peak,3);assert.equal(cache.active,0);
});

test('cache binds reuse to family, requested size and current source checksum',async()=>{
 const cache=createTargetPreviewCache();let calls=0;
 const load=checksum=>async()=>{calls++;return {checksum};};
 const identity=JSON.stringify(['design','steel','default']);
 const a=cache.get(identity,'revision-1',load('revision-1')),duplicate=cache.get(identity,'revision-1',load('revision-1'));
 assert.equal(a,duplicate);await a;
 assert.equal(await cache.get(identity,'revision-1',load('revision-1')),await a);assert.equal(calls,1);
 await cache.get(JSON.stringify(['design','slate','default']),'revision-1',load('revision-1'));
 await cache.get(JSON.stringify(['design','steel','OV-120X80']),'revision-1',load('revision-1'));
 await cache.get(identity,'revision-2',load('revision-2'));assert.equal(calls,4);
});

test('missing or mismatching advertised checksums never produce a cache hit',async()=>{
 const cache=createTargetPreviewCache();let calls=0;const load=async()=>{calls++;return {checksum:'actual'};};
 await cache.get('missing',null,load);await cache.get('missing',null,load);
 await cache.get('changed','old',load);await cache.get('changed','old',load);
 assert.equal(calls,4);assert.equal(cache.size,0);
});

test('late failure of an invalidated request cannot delete the newer request for the same checksum',async()=>{
 const cache=createTargetPreviewCache({limit:2}),old=deferred();let oldSignal,calls=0;
 const first=cache.get('design','revision',signal=>{oldSignal=signal;return old.promise;});const rejected=assert.rejects(first,{name:'AbortError'});await tick();
 cache.invalidate('design');await rejected;assert.equal(oldSignal.aborted,true);
 const fresh=await cache.get('design','revision',async()=>{calls++;return {checksum:'revision',svg:'fresh'};});
 old.reject(Error('old response failed late'));await tick();
 assert.equal(await cache.get('design','revision',async()=>{calls++;return {checksum:'revision'};}),fresh);assert.equal(calls,1);
});

test('page or filter switch cancels queued work and pending results but preserves completed previews',async()=>{
 const cache=createTargetPreviewCache({limit:1}),pending=deferred();let queuedStarted=false;
 const kept=await cache.get('kept','r1',async()=>({checksum:'r1',svg:'kept'}));await tick();
 const active=cache.get('active','r2',()=>pending.promise),queued=cache.get('queued','r3',async()=>{queuedStarted=true;return {checksum:'r3'};});
 const settled=Promise.allSettled([active,queued]);await tick();cache.cancelPending();assert.equal((await settled).filter(result=>result.reason?.name==='AbortError').length,2);
 pending.resolve({checksum:'r2',svg:'stale'});await tick();assert.equal(queuedStarted,false);assert.equal(cache.size,1);
 assert.equal(await cache.get('kept','r1',async()=>assert.fail('cached preview should be retained')),kept);
});

test('completed cache is bounded and recent entries survive least-recently-used eviction',async()=>{
 const cache=createTargetPreviewCache({maxEntries:3});let calls=0;
 const get=id=>cache.get(id,id,async()=>{calls++;return {checksum:id};});
 await get('A');await get('B');await get('C');await get('A');await get('D');await tick();assert.equal(cache.size,3);
 await get('A');assert.equal(calls,4);await get('B');assert.equal(calls,5);await tick();assert.equal(cache.size,3);
});

test('target pagination covers 100 designs exactly and clamps empty or stale page numbers',()=>{
 const rows=Array.from({length:100},(_,i)=>i),pages=Array.from({length:5},(_,i)=>reviewPage(rows,i+1));
 assert.deepEqual(pages.map(page=>page.rows.length),[24,24,24,24,4]);assert.deepEqual(pages.flatMap(page=>page.rows),rows);
 assert.equal(reviewPage(rows,9).page,5);assert.equal(reviewPage(rows,0).page,1);
 assert.deepEqual(reviewPage([],8),{page:1,pages:1,total:0,rows:[]});
});
