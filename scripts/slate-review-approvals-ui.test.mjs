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

function batchHarness(t, definitions) {
  const previous=new Map(['location','document','window','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  const remote={},items=[],requests=[],button=eventNode({}),status={},panel={hidden:true,focus(){}},summary={},confirmButton=eventNode({}),cancelButton=eventNode({});
  const filters={material:{value:''}};
  let postHook=null,getHook=null,activePosts=0,maxPosts=0;
  for(const [index,definition] of definitions.entries()){
    const id=definition.id||'D'+(index+1),s=state(definition);
    Object.assign(s,{key:'target-'+id,approved:s.status==='approved',approvedFingerprint:s.status==='approved'?s.fingerprint:null});
    Object.assign(s.metadata,{id,material:definition.material||'Edelstahl',format:definition.format||'12 × 8 cm'});
    s.metadata.previewUrl=s.metadata.previewUrl.replace('designId=D1','designId='+id);
    remote[s.key]=s;
    const classes=new Set(definition.dirty?['inline-dirty']:[]),checkbox=eventNode({}),message={},image=eventNode({complete:definition.loaded!==false,naturalWidth:definition.loaded===false?0:500});
    let src=new URL(s.metadata.previewUrl,base).href;
    Object.defineProperty(image,'src',{get:()=>src,set:value=>{src=new URL(value,base).href;image.complete=false;image.naturalWidth=0;}});
    const nodes={'[data-approval-check]':checkbox,'[data-preview]':image,'[data-approval-status-label]':{},'[data-approval-progress]':{},'[data-approval-message]':message,
      '[data-inline-filter-note]':definition.pinned?{hidden:false}:null};
    const card={hidden:!!definition.hidden,dataset:{approvalKey:s.key,originalId:id},classList:{contains:key=>classes.has(key)},getAttribute:()=>definition.busy?'true':null,
      querySelector:key=>nodes[key],querySelectorAll:()=>[]};
    items.push({card,image,checkbox,message,classes,state:s});
  }
  globalThis.location={href:base+'/originale/'};
  const bulkNodes={'[data-approval-bulk]':button,'[data-approval-bulk-status]':status,'[data-approval-bulk-panel]':panel,'[data-approval-bulk-summary]':summary,'[data-approval-bulk-confirm]':confirmButton,'[data-approval-bulk-cancel]':cancelButton};
  globalThis.document={addEventListener(){},querySelector:key=>key==='#review-approval-data'?{textContent:JSON.stringify(remote)}:bulkNodes[key]||filters[key.slice(1)]||(key==='meta[name="slate-review-csrf"]'?{content:'private-token'}:null)};
  globalThis.window={addEventListener(){},confirm(){throw Error('Native browser dialogs are not allowed in bulk approval');}};
  const save=body=>{remote[body.key]={...remote[body.key],approved:true,status:'approved',revision:body.expectedRevision+1,approvedFingerprint:body.expectedFingerprint};};
  const response=()=>({ok:true,json:async()=>({approvals:structuredClone(remote)})});
  globalThis.fetch=async(url,options)=>{
    const request={url,...options,body:options.body?JSON.parse(options.body):undefined};requests.push(request);
    if(options.method!=='POST')return getHook?getHook():response();
    activePosts++;maxPosts=Math.max(maxPosts,activePosts);
    try{
      await new Promise(setImmediate);
      if(postHook){const custom=await postHook(request.body,requests.filter(r=>r.method==='POST').length);if(custom)return custom;}
      save(request.body);return response();
    }finally{activePosts--;}
  };
  const api=installApprovalReview({cards:items.map(i=>i.card),onChanged(){for(const item of items)if(item.card.dataset.approvalStatus==='approved')item.card.hidden=true;}});
  return {api,items,remote,button,status,panel,summary,confirmButton,filters,requests,save,response,posts:()=>requests.filter(r=>r.method==='POST'),maxPosts:()=>maxPosts,
    cancel:()=>cancelButton.emit('click'),confirm:()=>confirmButton.emit('click'),post:fn=>{postHook=fn;},get:fn=>{getHook=fn;},click:()=>button.emit('click'),
    async approve(){await button.emit('click');await confirmButton.emit('click');}};
}

test('bulk approval confirms count and material/formats, excluding dirty, unavailable, unloaded, hidden and already approved cards',async t=>{
  const h=batchHarness(t,[{id:'A'},{id:'B',material:'Schiefer',format:'30 × 20 cm',fingerprint:hashB},{id:'OK',status:'approved',revision:1},{id:'DIRTY',dirty:true},
    {id:'WAIT',loaded:false},{id:'OPEN',status:'unavailable',fingerprint:null},{id:'BUSY',busy:true},{id:'HIDDEN',hidden:true},{id:'PINNED',pinned:true}]);
  assert.match(h.button.textContent,/\(2\)/);
  await h.click();assert.equal(h.posts().length,0);assert.equal(h.panel.hidden,false);
  assert.match(h.summary.textContent,/^2 angezeigte Vorlagen freigeben/);
  assert.match(h.summary.textContent,/1 × Edelstahl · 12 × 8 cm/);assert.match(h.summary.textContent,/1 × Schiefer · 30 × 20 cm/);
  assert.match(h.summary.textContent,/1 bereits bestätigt; 4 offen/);assert.match(h.summary.textContent,/nicht alle Größen/);
  assert.equal(h.confirmButton.textContent,'Jetzt 2 Vorlagen freigeben');assert.equal(h.items[0].checkbox.disabled,true);
  await h.items[0].checkbox.emit('change',{target:{checked:true}});assert.equal(h.posts().length,0,'individual approval stays blocked while the frozen selection is displayed');
  await h.cancel();assert.equal(h.panel.hidden,true);assert.equal(h.posts().length,0);assert.equal(h.items[0].checkbox.disabled,false);
  await h.click();assert.equal(h.posts().length,0);await h.confirm();assert.equal(h.panel.hidden,true);
  assert.deepEqual(h.posts().map(r=>r.body),[{key:'target-A',approved:true,expectedRevision:0,expectedFingerprint:hashA},{key:'target-B',approved:true,expectedRevision:0,expectedFingerprint:hashB}]);
  assert.equal(h.maxPosts(),1,'CAS writes are serial');assert.equal(h.status.textContent,'2 Freigaben gespeichert.');
  for(const post of h.posts()){assert.equal(post.credentials,'same-origin');assert.equal(post.headers['X-Slate-Review-CSRF'],'private-token');}
  assert.equal(h.items[0].card.hidden,true,'approved-status filtering does not add or change the frozen batch');
});

test('bulk approval rejects a format change during confirmation without approving the old target',async t=>{
  const h=batchHarness(t,[{id:'A'}]);await h.click();h.items[0].card.dataset.approvalKey='another-format';
  await h.confirm();assert.equal(h.posts().length,0);assert.equal(h.panel.hidden,true);assert.match(h.status.textContent,/Auswahl oder Vorlagenstand wurde geändert/);
});

test('a filter change cancels the visible confirmation and restores individual approval controls',async t=>{
  const h=batchHarness(t,[{id:'A'}]);await h.click();assert.equal(h.items[0].checkbox.disabled,true);
  h.filters.material.value='steel';h.api.syncControls();
  assert.equal(h.panel.hidden,true);assert.equal(h.confirmButton.disabled,true);assert.equal(h.items[0].checkbox.disabled,false);
  await h.confirm();assert.equal(h.posts().length,0);assert.match(h.status.textContent,/erneut prüfen/);
});

test('bulk count follows a finished filter pass and never includes newly visible cards in an accepted batch',async t=>{
  const h=batchHarness(t,[{id:'A'},{id:'B',hidden:true}]);
  h.api.syncControls();h.items[0].card.hidden=true;h.items[1].card.hidden=false;await Promise.resolve();
  assert.match(h.button.textContent,/\(1\)/);
  await h.click();h.items[0].card.hidden=false;await h.confirm();
  assert.deepEqual(h.posts().map(r=>r.body.key),['target-B']);
});

test('bulk approval stops on CAS conflict, reports proven partial success and never retries the failed write',async t=>{
  const h=batchHarness(t,[{id:'A'},{id:'B'},{id:'C'}]);
  h.post((_body,index)=>index===2?{ok:false,status:409,json:async()=>({error:'Vorlage inzwischen geändert'})}:null);
  await h.approve();assert.deepEqual(h.posts().map(r=>r.body.key),['target-A','target-B']);
  assert.equal(h.requests.filter(r=>!r.method).length,1,'one readback, no automatic write retry');
  assert.match(h.status.textContent,/^1 von 3 ausgewählten Vorlagen bestätigt\. Gestoppt: Vorlage inzwischen geändert/);
  assert.match(h.items[1].message.textContent,/Vorlage inzwischen geändert/);assert.equal(h.remote['target-C'].status,'unreviewed');
});

test('a renderer or resource fingerprint change stops remaining bulk approvals even at the same product revision',async t=>{
  const h=batchHarness(t,[{id:'A'},{id:'B'}]);
  h.post((_body,index)=>{if(index===1)h.remote['target-B']={...h.remote['target-B'],fingerprint:hashB};});
  await h.approve();assert.equal(h.posts().length,1);assert.match(h.status.textContent,/^1 von 2 ausgewählten Vorlagen bestätigt\. Gestoppt:/);
});

test('lost approval response is read back without resending and counts only the proven saved state',async t=>{
  const h=batchHarness(t,[{id:'A'},{id:'B'}]);
  h.post(body=>{h.save(body);throw Error('Antwort unterbrochen');});
  await h.approve();assert.equal(h.posts().length,1);assert.equal(h.requests.filter(r=>!r.method).length,1);
  assert.match(h.status.textContent,/^1 von 2 ausgewählten Vorlagen bestätigt\. Gestoppt: Antwort unterbrochen/);
  assert.equal(h.remote['target-B'].status,'unreviewed');
});

test('an unproven successful response never counts as a confirmed bulk approval',async t=>{
  const h=batchHarness(t,[{id:'A'},{id:'B'}]);
  h.post(()=>h.response());
  await h.approve();assert.equal(h.posts().length,1);assert.match(h.status.textContent,/^0 von 2 ausgewählten Vorlagen bestätigt/);
});

test('lost POST response and failed readback report only acknowledged writes and leave the last approval unresolved',async t=>{
  const h=batchHarness(t,[{id:'A'},{id:'B'},{id:'C'}]);
  h.post((body,index)=>{if(index===2){h.save(body);throw Error('Speicherantwort unterbrochen');}});
  h.get(()=>{throw Error('Nachlesen fehlgeschlagen');});
  await h.approve();
  assert.equal(h.posts().length,2);assert.equal(h.requests.filter(r=>!r.method).length,1);
  assert.equal(h.remote['target-B'].status,'approved','the lost response really committed in the fixture');
  assert.match(h.status.textContent,/^1 Freigaben sicher gespeichert\./);
  assert.match(h.status.textContent,/letzte Freigabe bleibt ungeklärt/);assert.match(h.status.textContent,/Bitte neu laden/);
  assert.doesNotMatch(h.status.textContent,/von 3 ausgewählten Vorlagen bestätigt/,'stale cached states are never presented as a fresh total');
  assert.equal(h.remote['target-C'].status,'unreviewed');
});
