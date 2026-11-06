import test from 'node:test';
import assert from 'node:assert/strict';
import {installApprovalReview} from './lib/slate-review-approvals-ui.js';

const base = 'http://localhost:8976';
const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64);
function state({fingerprint = hashA, productRevision = 1, status = 'unreviewed', revision = 0} = {}) {
  return {key:'target-D1',status,revision,fingerprint,metadata:{id:'D1',productRevision,
    previewUrl:'/api/workshop/products/cfg_a/preview.svg?' + new URLSearchParams({designId:'D1',revision:String(productRevision),reviewFingerprint:fingerprint})}};
}
function eventNode(extra = {}) {
  const listeners = new Map();
  return {...extra,addEventListener(type,fn){const list=listeners.get(type)||[];list.push(fn);listeners.set(type,list);},
    async emit(type,event={}){for(const listener of listeners.get(type)||[])await listener(event);}};
}
// Small DOM harness exercises installed listeners and actual request payloads.
// Image assignment deliberately stays pending until the test delivers load/error.
function harness(t, initial = state(), {inline = false, loaded = true} = {}) {
  const previous = new Map(['location','document','window','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  const checkbox=eventNode({checked:false,disabled:false}), image=eventNode({complete:loaded,naturalWidth:loaded?500:0});
  let source=new URL(initial.metadata.previewUrl,base).href;
  const loads=[];
  Object.defineProperty(image,'src',{get:()=>source,set:value=>{source=new URL(value,base).href;loads.push(source);image.complete=false;image.naturalWidth=0;}});
  const label={},progress={},message={},host={querySelector:()=>null,innerHTML:''},classes=new Set(inline?['inline-active']:[]);
  const nodes={'[data-approval-check]':checkbox,'[data-preview]':image,'[data-approval-status-label]':label,'[data-approval-progress]':progress,'[data-approval-message]':message};
  const option={dataset:{approvalKey:initial.key,preview:initial.metadata.previewUrl}};
  const card={dataset:{approvalKey:initial.key,originalId:'D1',inlineRevision:String(initial.metadata.productRevision),inlineFingerprint:initial.fingerprint},
    classList:{contains:key=>classes.has(key)},getAttribute:()=>null,querySelector:key=>nodes[key],querySelectorAll:()=>[option]};
  globalThis.location={href:base+'/originale/'};
  globalThis.document={hidden:false,addEventListener(){},querySelector(key){
    if(key==='#review-approval-data')return{textContent:JSON.stringify({[initial.key]:initial})};
    if(key==='#review-overview')return host;
    if(key==='meta[name="slate-review-csrf"]')return{content:'private-token'};
  }};
  globalThis.window={addEventListener(){}};
  let next=initial, getResponse=null;
  const requests=[];
  globalThis.fetch=async(url,options)=>{
    requests.push({url,...options,body:options.body?JSON.parse(options.body):undefined});
    if(!options.method&&getResponse)return getResponse();
    return{ok:true,json:async()=>({approvals:{[next.key]:next},overviewHtml:''})};
  };
  const api=installApprovalReview({cards:[card]});
  return {api,card,checkbox,image,label,progress,message,classes,loads,requests,option,
    next:value=>{next=value;},getResponse:fn=>{getResponse=fn;},
    async imageLoaded(){image.complete=true;image.naturalWidth=500;await image.emit('load');},
    async click(checked=true){checkbox.checked=checked;await checkbox.emit('change',{target:checkbox});},
    posts:()=>requests.filter(r=>r.method==='POST')};
}

test('a pending or failed preview cannot submit approval',async t=>{
  const h=harness(t,state(),{loaded:false});
  assert.equal(h.checkbox.disabled,true);
  await h.click();assert.equal(h.posts().length,0);
  h.image.complete=true;h.image.naturalWidth=0;await h.image.emit('error');
  await h.click();assert.equal(h.posts().length,0);
  await h.imageLoaded();assert.equal(h.checkbox.disabled,false);
});

test('a new fingerprint at the same product revision must load its own image before approval',async t=>{
  const h=harness(t), next=state({fingerprint:hashB,status:'changed',revision:1});
  h.next(next);await h.api.refresh();
  assert.equal(h.loads.length,1);
  assert.match(h.loads[0],new RegExp('reviewFingerprint='+hashB));
  assert.equal(h.option.dataset.preview,next.metadata.previewUrl);
  assert.equal(h.checkbox.disabled,true);
  await h.click();assert.equal(h.posts().length,0);
  await h.imageLoaded();assert.equal(h.checkbox.disabled,false);
  await h.click();
  assert.deepEqual(h.posts()[0].body,{key:next.key,approved:true,expectedRevision:1,expectedFingerprint:hashB});
});

test('inline revision alone cannot stand in for the actually loaded fingerprint',async t=>{
  const h=harness(t,state(),{inline:true}), next=state({fingerprint:hashB,status:'changed',revision:1});
  h.next(next);await h.api.refresh();await h.imageLoaded();
  assert.equal(h.card.dataset.inlineRevision,String(next.metadata.productRevision));
  assert.equal(h.checkbox.disabled,true);
  await h.click();assert.equal(h.posts().length,0);
  h.card.dataset.inlineFingerprint=hashB;h.api.syncControls();
  assert.equal(h.checkbox.disabled,false);
  h.card.dataset.inlineRevision='0';h.api.syncControls();
  assert.equal(h.checkbox.disabled,true);
});

test('unsaved edits visibly suspend an old checkmark without silently revoking the saved approval',async t=>{
  const h=harness(t,state({status:'approved',revision:1}),{inline:true});
  assert.equal(h.checkbox.checked,true);
  h.classes.add('inline-dirty');h.api.syncControls();
  assert.equal(h.checkbox.checked,false);assert.equal(h.checkbox.disabled,true);
  assert.equal(h.label.textContent,'Ungespeichert · noch nicht bestätigt');
  await h.click();assert.equal(h.posts().length,0);
  h.classes.delete('inline-dirty');h.api.syncControls();
  assert.equal(h.checkbox.checked,true);assert.equal(h.label.textContent,'Bestätigt');
});

test('an unrelated group revision keeps the same design approved and requires no new approval event',async t=>{
  const h=harness(t,state({status:'approved',revision:1}));
  h.next(state({status:'approved',revision:1,productRevision:2}));await h.api.refresh();
  assert.equal(h.checkbox.checked,true);assert.equal(h.checkbox.disabled,true);
  assert.equal(h.card.dataset.approvalStatus,'approved');
  await h.imageLoaded();assert.equal(h.checkbox.disabled,false);
  assert.equal(h.posts().length,0);
});

test('an older refresh arriving late cannot replace the newest approval state',async t=>{
  const h=harness(t), pending=[];
  h.getResponse(()=>new Promise(resolve=>pending.push(resolve)));
  const older=h.api.refresh(), newer=h.api.refresh();
  const approved=state({status:'approved',revision:1});
  pending[1]({ok:true,json:async()=>({approvals:{[approved.key]:approved}})});await newer;
  pending[0]({ok:true,json:async()=>({approvals:{'target-D1':state()}})});await older;
  assert.equal(h.checkbox.checked,true);
  assert.equal(h.card.dataset.approvalStatus,'approved');
});
