import test from 'node:test';
import assert from 'node:assert/strict';
import {installAssignmentReview,assignmentSource,assignmentPlanInput,assignmentCanExecute} from './lib/slate-review-assignment-ui.js';
import {slateGalleryHtml,reviewSourcePreviewUrl,galleryPageUrl} from './lib/slate-review-gallery-page.mjs';

class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners=new Map();this.dataset={};this.value='';this.disabled=false;this.hidden=false;this.checked=false;this.textContent='';this.classes=new Set();this.classList={contains:key=>this.classes.has(key)};this.nodes=new Map();}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
  async emit(type,event={}){for(const fn of this.listeners.get(type)||[])await fn({target:this,...event});}
  getAttribute(key){return key==='aria-busy'?this.busy||null:null;}focus(){}scrollIntoView(){}
  querySelectorAll(selector){const tags=selector.split(','),all=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);return all.filter(node=>selector==='*'||tags.includes(node.tagName)||(selector==='input:checked'&&node.tagName==='input'&&node.checked));}
  querySelector(selector){return this.nodes.get(selector)||this.querySelectorAll(selector)[0]||null;}
}
function harness(t,{dirty=false,revision=3,contextRevision=3,executeError=null,savedSelection=[]}={}){
  const prior=new Map(['document','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));t.after(()=>{for(const [key,value]of prior)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
  const nodes=new Map(),panel=new Element();nodes.set('[data-assignment-panel]',panel);
  const add=(selector,tag='div',inPanel=false)=>{const n=new Element(tag);nodes.set(selector,n);if(inPanel){panel.nodes.set(selector,n);panel.append(n);}return n;};
  for(const name of ['open','clear','select-page','count','status'])add('[data-assignment-'+name+']',name==='select-page'?'input':'button');
  for(const name of ['cancel','plan','execute'])add('[data-assignment-'+name+']','button',true);
  for(const name of ['line','subcategory','family'])add('[data-assignment-'+name+']','select',true);
  for(const name of ['panel-status','sources','size-options','preview','targets'])add('[data-assignment-'+name+']','div',true);
  nodes.set('meta[name="slate-review-csrf"]',{content:'fixture-csrf'});
  const card=new Element('article');card.dataset={originalId:'D1',productId:'cfg_native',designId:'native-D1',approvalKey:'["steel","D1","s"]',sourceRevision:String(revision)};
  if(dirty)card.classes.add('inline-dirty');
  const select=new Element('input'),single=new Element('button'),approval=new Element('input');approval.checked=true;
  card.nodes.set('[data-assignment-select]',select);card.nodes.set('[data-assignment-single]',single);card.nodes.set('[data-approval-check]',approval);
  globalThis.document={activeElement:null,querySelector:key=>nodes.get(key)||null,createElement:tag=>new Element(tag)};
  const storage=new Map([['gravuru-gallery-family-selection-v1',JSON.stringify(savedSelection)]]);globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  const calls=[],applied=[];
  const context={sources:[{key:card.dataset.approvalKey,originalId:'D1',productId:'cfg_native',designId:'native-D1',revision:contextRevision,mm:[50,20],existingTargets:[{familyId:'steel',sizeKey:'s'}]}],lines:[{id:'door',label:'Türschilder',subcategories:[{id:'memory',label:'Andenken',familyIds:['steel','acrylic-3mm']}]}],families:[{id:'steel',label:'Edelstahl',sizes:[{key:'s',label:'5 × 2 cm',mm:[50,20],form:'Rechteck'}]},{id:'acrylic-3mm',label:'Acrylglas Schwarz 3 mm',sizes:[{key:'a',label:'5 × 2 cm',mm:[50,20],form:'Rechteck'}]}],limits:{maxSources:60,maxEntries:120}};
  const plan={id:'plan-1',planHash:'hash-1',valid:true,counts:{create:1,existing:1,blocked:0},entries:[{originalId:'D1',sourceKey:card.dataset.approvalKey,target:{familyId:'steel',sizeKey:'s',mm:[50,20]},status:'existing',warnings:[]},{originalId:'D1',sourceKey:card.dataset.approvalKey,target:{familyId:'acrylic-3mm',sizeKey:'a',mm:[50,20]},status:'create',warnings:[]}],options:[]};
  const fetchImpl=async(url,options)=>{const action=new URL(url,'http://localhost').searchParams.get('action'),body=options.body?JSON.parse(options.body):null;calls.push({url,action,body,options});
    if(action==='execute'&&executeError){const error=executeError;executeError=null;if(error==='network')throw TypeError('network');return {ok:false,status:error,json:async()=>({error:'Quelle wurde geändert'})};}
    return {ok:true,status:200,json:async()=>action==='context'?structuredClone(context):action==='plan'?structuredClone(plan):{created:1,createdTargets:1,existing:1,targets:[],replayed:false}};};
  const api=installAssignmentReview({cards:[card],fetchImpl,onApplied:result=>{applied.push(result);assert.equal(api.beforeNavigation(),true);}});
  const node=name=>nodes.get('[data-assignment-'+name+']');
  async function begin(){select.checked=true;await select.emit('change');await node('open').emit('click');}
  async function choose(familyId){node('family').value=familyId;await node('family').emit('change');const input=node('size-options').querySelector('input');input.checked=true;await input.emit('change');}
  return {api,card,select,approval,node,context,plan,calls,applied,storage,begin,choose};
}

test('family selection keeps approvals separate, retains multiple families and executes a verified plan once',async t=>{
  const h=harness(t);await h.begin();await h.choose('steel');await h.choose('acrylic-3mm');await h.node('plan').emit('click');
  const request=h.calls.find(c=>c.action==='plan');assert.deepEqual(request.body.sources,[{key:h.card.dataset.approvalKey,expectedRevision:3}]);assert.deepEqual(request.body.targets.map(x=>x.familyId),['steel','acrylic-3mm']);
  assert.equal(h.approval.checked,true);assert.equal(h.node('execute').disabled,false);
  await h.node('execute').emit('click');await h.node('execute').emit('click');
  assert.equal(h.calls.filter(c=>c.action==='execute').length,1);assert.equal(h.applied.length,1);assert.equal(h.applied[0].originalId,'D1');
  assert(h.calls.every(c=>c.options.credentials==='same-origin'&&c.options.headers['X-Slate-Review-CSRF']==='fixture-csrf'));
});

test('60 long source keys use a short POST context URL with exact JSON and unchanged private request protections',async t=>{
  const sources=Array.from({length:60},(_,i)=>{const originalId='schluesselanhaenger/Anlass/Muttertag und Vatertag/SAHSCUV-A-D'+i;return {originalId,key:JSON.stringify(['acrylic-schwarz-3mm',originalId,'catalogue-size-'+('x'.repeat(110))+i]),expectedRevision:3};});
  assert(encodeURIComponent(JSON.stringify(sources.map(source=>source.key))).length>16000);
  const h=harness(t,{savedSelection:sources});h.context.sources=sources.map(source=>({...source,revision:3,productId:'cfg_fixture',designId:'native-'+source.originalId,mm:[100,100],existingTargets:[]}));
  await h.node('open').emit('click');assert.equal(h.calls.length,1);const request=h.calls[0];
  assert.equal(request.url,'/originale/assignments?action=context');assert.equal(request.options.method,'POST');assert.deepEqual(request.body,{sourceKeys:sources.map(source=>source.key)});
  assert.equal(request.options.headers['Content-Type'],'application/json');assert.equal(request.options.headers['X-Slate-Review-CSRF'],'fixture-csrf');assert.equal(request.options.credentials,'same-origin');assert.equal(request.options.redirect,'error');assert.equal(request.options.cache,'no-store');assert(Buffer.byteLength(request.options.body)<65536);
  assert.match(h.node('panel-status').textContent,/Produktlinie, Familie/);assert.equal(h.applied.length,0);
});
test('dirty or stale sources cannot silently become family assignment sources',async t=>{
  const h=harness(t,{dirty:true});assert.equal(assignmentSource(h.card),null);assert.equal(h.select.disabled,true);await h.node('open').emit('click');assert.equal(h.calls.length,0);
  h.card.classes.delete('inline-dirty');h.context.sources[0].revision=4;h.api.sync();await h.begin();
  assert.equal(h.calls.length,1);assert.equal(h.node('plan').disabled,true);assert.match(h.node('panel-status').textContent,/inzwischen geändert/);
});
test('a revision left on a closed inline editor cannot change the newly selected source revision',t=>{
  const h=harness(t);h.card.dataset.inlineRevision='99';assert.equal(assignmentSource(h.card).expectedRevision,3);h.card.classes.add('inline-active');assert.equal(assignmentSource(h.card).expectedRevision,99);
});
test('cancel does not submit a plan or execute and keeps the cross-page selection',async t=>{
  const h=harness(t);await h.begin();await h.choose('acrylic-3mm');await h.node('cancel').emit('click');
  assert.deepEqual(h.calls.map(c=>c.action),['context']);assert.equal(h.approval.checked,true);assert.match(h.storage.get('gravuru-gallery-family-selection-v1'),/expectedRevision/);
});
test('conflict retains choices but invalidates the plan and never repeats execution automatically',async t=>{
  const h=harness(t,{executeError:409});await h.begin();await h.choose('acrylic-3mm');await h.node('plan').emit('click');await h.node('execute').emit('click');await h.node('execute').emit('click');
  assert.equal(h.calls.filter(c=>c.action==='execute').length,1);assert.equal(h.node('execute').disabled,true);assert.match(h.node('panel-status').textContent,/neuen Plan/);assert.equal(h.node('size-options').querySelector('input').checked,true);assert.equal(h.applied.length,0);
});
test('an unconfirmed response can only reconcile the identical idempotent plan',async t=>{
  const h=harness(t,{executeError:'network'});await h.begin();await h.choose('acrylic-3mm');await h.node('plan').emit('click');await h.node('execute').emit('click');
  assert.equal(h.applied.length,0);assert.match(h.node('execute').textContent,/erneut prüfen/);await h.node('execute').emit('click');
  const calls=h.calls.filter(c=>c.action==='execute');assert.deepEqual(calls[0].body,calls[1].body);assert.equal(h.applied.length,1);
});
test('a blocked plan cannot execute and payloads never contain approval claims',()=>{
  assert.equal(assignmentCanExecute({id:'p',planHash:'h',valid:true,counts:{blocked:1},entries:[{status:'blocked'}]}),false);
  assert.deepEqual(assignmentPlanInput([{key:'k',expectedRevision:1,approved:true}],[{lineId:'l',subcategoryId:'s',familyId:'f',sizeKey:'z',approved:true}]),{sources:[{key:'k',expectedRevision:1}],targets:[{lineId:'l',subcategoryId:'s',familyId:'f',sizeKey:'z'}]});
});
test('paged HTML carries all filter facets but only current cards and a separate native-source selection',()=>{
  const row={id:'D79',group:'Menschen',subcategory:'Allgemein',process:'Gravur',reviewSourcePreview:'originals/D79/preview.png',targets:[],reason:'Original ragt über den Rand'};
  const html=slateGalleryHtml({originals:[row],blanks:[]},{products:[]},{assignmentEnabled:true,paging:{page:2,pageSize:60,totalMatches:20000,totalOriginals:20000,totalBlanks:73,filters:{material:'slate'},facets:{materials:[{key:'wood',label:'Holz'}],themes:[{key:'family',label:'Familie'}],categories:[],blankForms:['Rund']}}});
  assert.equal((html.match(/ data-design-card /g)||[]).length,1);assert.match(html,/20000 Vorlagen insgesamt/);assert.match(html,/value="wood">Holz/);assert.match(html,/value="family">Familie/);assert.match(html,/data-gallery-page/);assert.match(html,/Angezeigte Vorlagen freigeben/);
  assert.match(html,/review-original-ids[^>]*>\["D79"\]/);assert.match(html,/Katalogvorschau · Konfi-Aufbereitung offen/);assert.match(html,/data-assignment-single disabled/);assert.doesNotMatch(html,/data-inline-start/);
  assert.equal(reviewSourcePreviewUrl('originals/a/../../private.png'),null);assert.equal(reviewSourcePreviewUrl('https://example.invalid/a.png'),null);assert.equal(reviewSourcePreviewUrl('originals/a/design.svg'),null);assert.match(galleryPageUrl({material:'steel'},1,'ED-42,1'),/originalId=ED-42%2C1/);
  const unknown=slateGalleryHtml({originals:[{...row,process:'Verfahren offen'}]},{products:[]});
  assert.match(unknown,/data-process="Verfahren offen"/);assert.match(unknown,/· Verfahren offen<\/span>/);assert.match(unknown,/Katalogvorschau · Konfi-Aufbereitung offen/);
});
