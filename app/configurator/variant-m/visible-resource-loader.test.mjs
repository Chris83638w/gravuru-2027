import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisibleResourceQueue,observeVisibleResources} from './visible-resource-loader.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('only visible keys, two concurrent loads, no 703-item sweep; leaving a list drops queued work',async()=>{
 const gates=new Map(),calls=[],loaded=new Set();let changed=0;
 const q=createVisibleResourceQueue({load:key=>{calls.push(key);return new Promise(resolve=>gates.set(key,()=>{loaded.add(key);resolve();}));},ready:key=>loaded.has(key),changed:()=>changed++});
 q.request(Array.from({length:703},(_,i)=>'motif-'+i));await tick();assert.deepEqual(calls,['motif-0','motif-1']);
 q.request(['searched-cross','searched-cross']);gates.get('motif-0')();await tick();assert.deepEqual(calls,['motif-0','motif-1','searched-cross']);
 gates.get('motif-1')();gates.get('searched-cross')();await tick();assert.equal(changed,3);assert.equal(q.pending,0);
 q.request(['searched-cross']);await tick();assert.equal(calls.length,3);
});
test('one failed font cannot block its neighbor; retry is explicit, not a mutation/download loop',async()=>{
 const calls=[],ready=new Set();let fail=true;
 const q=createVisibleResourceQueue({load:async key=>{calls.push(key);if(key==='bad'&&fail)throw Error('offline');ready.add(key);},ready:key=>ready.has(key)});
 q.request(['bad','good']);await tick();assert.ok(ready.has('good'));q.request(['bad','good']);await tick();assert.equal(calls.length,2);
 fail=false;q.request(['bad','good'],{retry:true});await tick();assert.deepEqual(calls,['bad','good','bad']);q.stop();q.request(['later']);await tick();assert.equal(calls.length,3);
});


test('a missing catalog entry or rendering callback never creates a repeated download loop',async()=>{
 const calls=[];const q=createVisibleResourceQueue({load:async key=>calls.push(key),ready:()=>false,changed:()=>{throw Error('row disposed');}});
 q.request(['missing']);await tick();q.request(['missing']);await tick();assert.deepEqual(calls,['missing']);q.stop();
});

test('actual visibility observer loads new visible rows after filtering, preserving hidden/offscreen rows',async()=>{
 const make=key=>({dataset:{key},isConnected:true}),a=make('first'),b=make('offscreen'),c=make('searched');
 let current=[a,b],io,mutation;const calls=[],ready=new Set();let changes=0;
 const root={querySelectorAll:()=>current,addEventListener(){},removeEventListener(){}};
 const win={IntersectionObserver:class{constructor(fn){this.fn=fn;io=this;}observe(){}unobserve(){}disconnect(){}},MutationObserver:class{constructor(fn){mutation=fn;}observe(){}disconnect(){}},requestAnimationFrame(fn){assert.equal(this,win);setImmediate(fn);}};
 const observed=observeVisibleResources({root,selector:'[data-key]',key:row=>row.dataset.key,win,load:async key=>{calls.push(key);ready.add(key);},ready:key=>ready.has(key),changed:()=>changes++});
 io.fn([{target:a,isIntersecting:true},{target:b,isIntersecting:false}]);await tick();await tick();assert.deepEqual(calls,['first']);assert.equal(changes,1);
 current=[c];a.isConnected=false;mutation();io.fn([{target:c,isIntersecting:true}]);await tick();await tick();assert.deepEqual(calls,['first','searched']);assert.equal(changes,2);
 observed.disconnect();io.fn([{target:b,isIntersecting:true}]);await tick();assert.equal(calls.length,2);
});
