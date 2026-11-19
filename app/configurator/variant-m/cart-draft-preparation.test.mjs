import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalCartDraft,createCartDraftPreparation} from './cart-draft-preparation.mjs';
import {cartDraftKey} from './shop-cart.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('production key includes every renderer field, including future nested fields',()=>{
 const input={binding:{productId:'test',productRevision:1},state:{designId:'test',objects:[],mOptions:{},ui:{}},quantity:1,cartEdit:null,media:[]};
 const key=cartDraftKey(input);
 for(const state of [{...input.state,futureRenderSetting:true},{...input.state,ui:{futureRenderSetting:1}},{...input.state,objects:[{futureRenderSetting:1}]}])assert.notEqual(cartDraftKey({...input,state}),key);
});

test('a failed cart handoff invalidates the saved result and the second click saves a new revision',async()=>{
 let saves=0,carts=0;const p=createCartDraftPreparation({key:()=> 'same',prepare:async()=>({revision:++saves})});
 p.prefetch();
 const click=async()=>{const saved=await p.get();try{if(++carts===1)throw Object.assign(Error('stale draft'),{status:409});return saved;}catch(error){p.invalidate();throw error;}};
 await assert.rejects(click(),/stale draft/);assert.equal(saves,1);
 assert.deepEqual(await click(),{revision:2});assert.equal(saves,2);
});

test('invalidating an in-flight result preserves serial writes and never revives that result',async()=>{
 const gate=deferred(),started=deferred();let saves=0;
 const p=createCartDraftPreparation({key:()=> 'same',prepare:async()=>{if(++saves===1){started.resolve();await gate.promise;}return {revision:saves};}});
 const first=p.get();await started.promise;p.invalidate();const second=p.get();gate.resolve();
 await assert.rejects(first,/geändert/);assert.deepEqual(await second,{revision:2});assert.equal(saves,2);
});

test('canonical input includes quantity, uploaded content identity and cart edit while ignoring object key order',()=>{
 const a={design:{name:'A',objects:[{id:'t',text:'Name'}]},quantity:1,media:[{file:1,edited:2}],edit:{revision:1}};
 const key=canonicalCartDraft(a);
 assert.equal(canonicalCartDraft({edit:a.edit,media:a.media,quantity:1,design:{objects:a.design.objects,name:'A'}}),key);
 for(const patch of [{quantity:2},{media:[{file:1,edited:3}]},{edit:{revision:2}},{design:{name:'A',objects:[{id:'t',text:'Changed'}]}}])assert.notEqual(canonicalCartDraft({...a,...patch}),key);
});

test('two openings and immediate cart click share one in-flight save; reopening unchanged reuses it',async()=>{
 const gate=deferred(),started=deferred();let saves=0;
 const p=createCartDraftPreparation({key:()=> 'same',prepare:()=>{saves++;started.resolve();return gate.promise;}});
 p.prefetch();p.prefetch();const click=p.get();await started.promise;assert.equal(saves,1);
 gate.resolve({draftId:'draft',revision:1});assert.deepEqual(await click,{draftId:'draft',revision:1});
 assert.equal(await p.get(),await click);assert.equal(saves,1);
});

test('text, quantity, upload or edit change serializes a new save and never returns the old revision',async()=>{
 for(const next of ['changed-text','quantity-2','upload-2','cart-edit-2']){
  let key='initial',saves=0,active=0,max=0;const gate=deferred(),started=deferred();
  const p=createCartDraftPreparation({key:()=>key,prepare:async()=>{saves++;started.resolve();max=Math.max(max,++active);if(saves===1)await gate.promise;active--;return {revision:saves};}});
  const old=p.get();await started.promise;key=next;const current=p.get();gate.resolve();
  await assert.rejects(old,/geändert/);assert.deepEqual(await current,{revision:2});assert.equal(max,1);
 }
});

test('failed pre-save is silent and a real click can retry through the same error path',async()=>{
 let calls=0;const p=createCartDraftPreparation({key:()=> 'same',prepare:async()=>{if(++calls===1)throw Error('Sitzung abgelaufen');return {revision:1};}});
 p.prefetch();await assert.rejects(p.get(),/Sitzung abgelaufen/);
 assert.deepEqual(await p.get(),{revision:1});assert.equal(calls,2);
});

test('leaving the page cannot submit a cart, retain a completed result or start a queued save',async()=>{
 let key='first',saves=0;const gate=deferred(),started=deferred();
 const p=createCartDraftPreparation({key:()=>key,prepare:()=>{saves++;started.resolve();return gate.promise;}});
 const first=p.get();await started.promise;key='second';const second=p.get();p.close();gate.resolve({revision:1});
 await assert.rejects(first,/geändert/);await assert.rejects(second,/geändert/);await assert.rejects(p.get(),/geändert/);assert.equal(saves,1);
});

test('a changed input is detected even if a completed save is revisited after another revision',async()=>{
 let key='A',revision=0;const p=createCartDraftPreparation({key:()=>key,prepare:async()=>({revision:++revision})});
 assert.equal((await p.get()).revision,1);key='B';assert.equal((await p.get()).revision,2);key='A';assert.equal((await p.get()).revision,3);
});

test('change and undo while the first save runs reuses it if no newer revision was written',async()=>{
 let key='A',calls=0;const gate=deferred(),started=deferred();
 const p=createCartDraftPreparation({key:()=>key,prepare:async()=>{calls++;started.resolve();await gate.promise;return {revision:calls};}});
 const first=p.get();await started.promise;key='B';const abandoned=p.get();key='A';const last=p.get();gate.resolve();
 await assert.rejects(abandoned,/geändert/);assert.equal(await first,await last);assert.equal(calls,1);
});
