import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {installDemoDesktopSelection} from './desktop-selection.mjs';
import {selectionScaleFactor} from '../variant-m/selection-arrows.mjs';
import {scaleObject} from '../variant-m/image-processing.mjs';

// Use the real native gesture handlers, including their capture, selection,
// 0.3 mm drag threshold, photo identity checks and undo. Only DOM ports differ.
const source = fs.readFileSync(new URL('../variant-m/refinements.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
const gestures = source.slice(source.indexOf('  let resize=null;'),source.indexOf("  r.addEventListener('click',async e=>{"));
assert.ok(gestures.includes('el.record(prior.old)') && gestures.includes('selectionScaleFactor'));

class Node {
  constructor(parent=null,{classes=[],dataset={},tag='div',id}={}) {
    this.parentNode=parent;this.children=[];parent?.children.push(this);this.classes=new Set(classes);
    this.dataset=dataset;this.tag=tag;this.id=id;this.listeners=new Map();this.captures=new Set();this.attributes=new Map();
    this.ownerDocument=parent?.ownerDocument;this.hidden=false;this.disabled=false;this.focuses=0;this.clicks=0;
  }
  addEventListener(type,fn,options=false) {const listeners=this.listeners.get(type)||[];listeners.push({fn,capture:options===true||options?.capture===true});this.listeners.set(type,listeners);}
  removeEventListener(type,fn) {this.listeners.set(type,(this.listeners.get(type)||[]).filter(listener=>listener.fn!==fn));}
  contains(node) {for(;node;node=node.parentNode)if(node===this)return true;return false;}
  matches(selector) {
    return selector.split(',').some(value=>{
      if(value==='.scene [data-object]')return this.dataset.object!==undefined&&!!this.parentNode?.closest('.scene');
      if(value==='[data-ux-handle]')return this.dataset.uxHandle!==undefined;
      if(value==='[data-ux=multi-texts]')return this.dataset.ux==='multi-texts';
      if(value==='dialog[open]')return this.tag==='dialog'&&this.open;
      if(value.startsWith('.'))return this.classes.has(value.slice(1));
      if(value.startsWith('#'))return this.id===value.slice(1);
      return this.tag===value;
    });
  }
  closest(selector) {for(let node=this;node;node=node.parentNode)if(node.matches(selector))return node;return null;}
  querySelector(selector) {for(const node of this.children){if(node.matches(selector))return node;const nested=node.querySelector(selector);if(nested)return nested;}return null;}
  getAttribute(name) {return this.attributes.get(name)??null;}
  setPointerCapture(id) {this.captures.add(id);}
  hasPointerCapture(id) {return this.captures.has(id);}
  releasePointerCapture(id) {this.captures.delete(id);emit(this,'lostpointercapture',{pointerId:id});}
  focus() {this.focuses++;}
  click() {this.clicks++;}
}
function emit(target,type,extra={}) {
  const path=[];for(let node=target;node;node=node.parentNode)path.push(node);
  const event={type,target,button:0,pointerId:1,isPrimary:true,pointerType:'mouse',clientX:40,clientY:30,...extra,
    composedPath:()=>path,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};
  for(const node of path.toReversed())for(const listener of [...node.listeners.get(type)||[]])if(listener.capture&&!event.stopped)listener.fn(event);
  for(const node of path)for(const listener of [...node.listeners.get(type)||[]])if(!listener.capture&&!event.stopped)listener.fn(event);
  return event;
}
function setup({type='text',extra={},width=1440,demo=true,enabled,selected=null}={}) {
  const doc=new Node();doc.ownerDocument=doc;doc.defaultView={innerWidth:width};
  const el=new Node(doc),r=new Node(el);el.shadowRoot=r;el.isConnected=true;
  const holder=new Node(r,{classes:['stage']}),scene=new Node(holder,{classes:['scene']});
  const item=new Node(scene,{dataset:{object:'target'}}),ink=new Node(item,{tag:'path'});
  const handle=new Node(holder,{dataset:{uxHandle:'scale'}}),rotate=new Node(holder,{dataset:{uxHandle:'rotate'}});
  const textTab=new Node(r,{tag:'button',id:'ux-tab-text'}),motifTab=new Node(r,{tag:'button',id:'ux-tab-motif'}),uploadTab=new Node(r,{tag:'button',id:'ux-tab-upload'});
  const full=new Node(r,{tag:'dialog',classes:['c-large-preview']}),outside=new Node(doc);
  const multi=new Node(r,{tag:'button',dataset:{ux:'multi-texts'}});multi.attributes.set('aria-pressed','false');
  const object={id:'target',type,x:40,y:30,w:20,h:10,rotation:20,...(type==='text'?{text:'Original',size:10,lineHeight:14,font:'Original'}:{}),...extra};
  const other={id:'other',type:'motif',x:150,y:60,w:10,h:10,motif:'untouched'};
  Object.assign(el,{state:{designId:'design-1',width:220,height:140,selected,objects:[object,other],mOptions:{size:'22x14'},price:1999},history:[],future:[],
    point:event=>({x:event.clientX,y:event.clientY}),normalize(){},render(){},sync(){this.normalize();this.render();},
    record(old){this.history.push(structuredClone(old));this.future=[];},uxPhotoPositionActive:()=>false,
    uxCanEdit:()=>true,uxCanRotate:()=>true,uxTextTap(){},uxToggleTextSelection:()=>false});
  const select=()=>el.state.objects.find(object=>object.id===el.state.selected),nativeTabs=[],callbacks=[];
  vm.runInNewContext(gestures,{el,r,holder,selected:select,structuredClone,window:{},showTab:key=>nativeTabs.push(key),scaleObject,selectionScaleFactor,mutate:fn=>fn()});
  const options={onSelect:section=>callbacks.push({section,id:el.state.selected,history:el.history.length}),...(enabled?{enabled}:{})};
  const api=demo?installDemoDesktopSelection(el,options):null;
  const tap=async(target=ink,options={})=>{emit(target,'pointerdown',options);emit(holder,'pointerup',options);await Promise.resolve();};
  return {doc,el,r,holder,scene,item,ink,handle,rotate,textTab,motifTab,uploadTab,full,outside,multi,object,other,callbacks,nativeTabs,api,tap,select,options};
}

test('completed native canvas selection opens its panel after pointerup without selecting, focusing or changing the design',async()=>{
  const f=setup(),before=structuredClone(f.el.state.objects),price=f.el.state.price;
  const down=emit(f.ink,'pointerdown');assert.equal(down.defaultPrevented,true);assert.equal(f.el.state.selected,'target');assert.deepEqual(f.callbacks,[]);
  emit(f.holder,'pointerup');assert.deepEqual(f.callbacks,[],'native pointerup and capture release finish first');
  await Promise.resolve();assert.deepEqual(f.callbacks,[{section:'text',id:'target',history:0}]);
  assert.deepEqual(f.el.state.objects,before);assert.equal(f.el.state.price,price);assert.deepEqual(f.el.history,[]);
  assert.equal(f.textTab.focuses,0);assert.equal(f.textTab.clicks,0);assert.equal(f.uploadTab.clicks,0);assert.equal(f.full.open,undefined);
  await f.tap();assert.equal(f.callbacks.length,2,'clicking the already selected element also opens the panel');
});

test('motifs, photo slots and explicit native photo/logo uploads map correctly; unrelated images are not guessed',async()=>{
  const cases=[['motif',{},'motif'],['photoSlot',{},'upload'],['photoSlot',{uxUploadId:'photo-1',uxUploadKind:'photo'},'upload'],
    ['image',{uxUploadId:'logo-1',uxUploadKind:'logo',uxVectorLogo:'vector'},'upload'],['image',{uxUploadKind:'logo'},'upload'],
    ['image',{uxUploadId:'older-upload'},'upload'],['image',{},null],['shape',{},null]];
  for(const [type,extra,expected] of cases){
    const f=setup({type,extra});await f.tap();assert.deepEqual(f.callbacks.map(item=>item.section),expected?[expected]:[]);
    assert.equal(f.uploadTab.clicks,0);assert.equal(f.el.history.length,0);
  }
});

test('mobile is untouched and enabling desktop or a supplied guard is evaluated for each gesture and completion',async()=>{
  for(const width of [360,390,844,999]){const f=setup({width});await f.tap();assert.deepEqual(f.callbacks,[]);assert.equal(f.el.state.selected,'target');}
  const f=setup({width:999});f.doc.defaultView.innerWidth=1000;await f.tap();assert.equal(f.callbacks.length,1);
  emit(f.ink,'pointerdown');emit(f.holder,'pointerup');f.doc.defaultView.innerWidth=999;await Promise.resolve();assert.equal(f.callbacks.length,1);
  let allowed=false;const custom=setup({enabled:()=>allowed});await custom.tap();assert.deepEqual(custom.callbacks,[]);
  allowed=true;await custom.tap();assert.equal(custom.callbacks.length,1);
});

test('real drags, including a 0.4 mm movement below the tap tolerance, keep native geometry and one-step undo',async()=>{
  for(const distance of [.4,6,20]){
    const f=setup(),native=setup({demo:false}),before=structuredClone(f.el.state);
    for(const sample of [f,native]){emit(sample.ink,'pointerdown');emit(sample.holder,'pointermove',{clientX:40+distance});emit(sample.holder,'pointerup',{clientX:40+distance});}
    await Promise.resolve();assert.deepEqual(f.callbacks,[]);assert.deepEqual(f.el.state,native.el.state);assert.equal(f.el.history.length,1);
    f.el.state=f.el.history.pop();assert.deepEqual(f.el.state,before);
  }
});

test('native corner resize and rotation do not open panels or change their native result',async()=>{
  for(const type of ['text','motif','photoSlot'])for(const control of ['handle','rotate']){
    const extra=type==='photoSlot'?{uxUploadId:'photo',uxUploadKind:'photo',photoShape:'heart',uxPhotoCrop:{zoom:1.2,x:.1,y:-.2}}:{};
    const f=setup({type,extra,selected:'target'}),native=setup({type,extra,selected:'target'});native.api.dispose();
    for(const sample of [f,native]){emit(sample[control],'pointerdown',{clientX:55,clientY:40});emit(sample[control],'pointermove',{clientX:70,clientY:48});emit(sample[control],'pointerup',{clientX:70,clientY:48});}
    await Promise.resolve();assert.deepEqual(f.callbacks,[]);assert.deepEqual(f.el.state,native.el.state);assert.deepEqual(f.el.history,native.el.history);
  }
});

test('scrolls, wheels, touch gestures, cancelled capture and competing pointers suppress panel navigation',async()=>{
  for(const action of ['scroll','shadow-scroll','wheel','touchmove','contextmenu','dragstart','pointercancel','lostpointercapture','multi','away-and-back']){
    const f=setup();emit(f.ink,'pointerdown');
    if(action==='shadow-scroll')emit(f.r,'scroll');
    else if(action==='multi'){emit(f.outside,'pointerdown',{pointerId:2,isPrimary:false});emit(f.outside,'pointerup',{pointerId:2});}
    else if(action==='away-and-back'){emit(f.holder,'pointermove',{clientX:70});emit(f.holder,'pointermove',{clientX:40});}
    else emit(f.holder,action);
    emit(f.holder,'pointerup');await Promise.resolve();assert.deepEqual(f.callbacks,[],action);
  }
});

test('native permissions and native multi-text mode remain authoritative',async()=>{
  for(const extra of [{uxLocked:true},{uxHidden:true},{acrylicFixed:true}]){
    const f=setup({extra,selected:'target'});await f.tap();assert.deepEqual(f.callbacks,[],'ignored native gesture must not open a panel');
  }
  for(const extra of [{locked:true},{technicalLocked:true},{customerEditable:false}]){
    const f=setup({type:'photoSlot',extra,selected:'target'});await f.tap();assert.deepEqual(f.callbacks,[]);
  }
  const denied=setup({type:'photoSlot',selected:'target'});denied.el.uxCanEdit=()=>false;await denied.tap();assert.deepEqual(denied.callbacks,[]);
  const multi=setup({selected:'target'});multi.multi.attributes.set('aria-pressed','true');multi.el.uxToggleTextSelection=()=>true;
  await multi.tap();assert.deepEqual(multi.callbacks,[]);assert.equal(multi.multi.getAttribute('aria-pressed'),'true');
});

test('hidden or disabled panels, fullscreen and native dialogs are respected',async()=>{
  for(const state of ['hidden','disabled']){const f=setup();f.textTab[state]=true;await f.tap();assert.deepEqual(f.callbacks,[]);}
  const full=setup();full.full.open=true;await full.tap();assert.deepEqual(full.callbacks,[]);
  full.full.open=false;emit(full.ink,'pointerdown');emit(full.holder,'pointerup');full.full.open=true;await Promise.resolve();assert.deepEqual(full.callbacks,[]);
  const modal=setup();const dialog=new Node(modal.r,{tag:'dialog'});dialog.open=true;await modal.tap();assert.deepEqual(modal.callbacks,[]);
  const browserFull=setup();browserFull.doc.fullscreenElement=browserFull.el;await browserFull.tap();assert.deepEqual(browserFull.callbacks,[]);
});

test('selection, design, upload identity or undo changing before the callback invalidates stale navigation',async()=>{
  for(const changed of ['selection','design','type','upload','removed','history']){
    const f=setup({type:'photoSlot',extra:{uxUploadId:'original',uxUploadKind:'photo'}});
    emit(f.ink,'pointerdown');emit(f.holder,'pointerup');
    if(changed==='selection')f.el.state.selected='other';
    if(changed==='design')f.el.state.designId='another-design';
    if(changed==='type')f.object.type='motif';
    if(changed==='upload')f.object.uxUploadId='replacement';
    if(changed==='removed')f.el.state.objects=[];
    if(changed==='history')f.el.record(f.el.state);
    await Promise.resolve();assert.deepEqual(f.callbacks,[],changed);
  }
});

test('controls, blank canvas, non-primary buttons and other editors never request a panel',async()=>{
  const f=setup(),button=new Node(f.item,{tag:'button'}),toolbar=new Node(f.item,{classes:['ux-direct-edit']}),tool=new Node(toolbar);
  for(const target of [button,tool,f.holder,f.outside])await f.tap(target);
  await f.tap(f.ink,{button:2});await f.tap(f.ink,{isPrimary:false});
  const otherRoot=new Node(f.doc),otherScene=new Node(otherRoot,{classes:['scene']}),otherItem=new Node(otherScene,{dataset:{object:'target'}});
  await f.tap(otherItem);assert.deepEqual(f.callbacks,[]);
  const click=emit(f.ink,'click'),key=emit(f.ink,'keydown',{key:'Enter'});await Promise.resolve();
  assert.deepEqual(f.callbacks,[]);assert.equal(click.defaultPrevented,undefined);assert.equal(key.defaultPrevented,undefined);
});

test('dispose removes observers and pending callbacks while preserving all native methods and subsequent interaction',async()=>{
  const f=setup(),methods={sync:f.el.sync,render:f.el.render,record:f.el.record,normalize:f.el.normalize};
  assert.equal(installDemoDesktopSelection(f.el,f.options),f.api,'installation is idempotent');
  emit(f.ink,'pointerdown');emit(f.holder,'pointerup');f.api.dispose();f.api.dispose();await Promise.resolve();
  assert.deepEqual(f.callbacks,[]);for(const [name,method] of Object.entries(methods))assert.equal(f.el[name],method);
  assert.ok([...f.doc.listeners.values()].every(list=>list.length===0));assert.equal((f.r.listeners.get('scroll')||[]).length,0);
  await f.tap();assert.equal(f.el.state.selected,'target');assert.deepEqual(f.callbacks,[]);
  const replacement=installDemoDesktopSelection(f.el,f.options);assert.notEqual(replacement,f.api);await f.tap();assert.equal(f.callbacks.length,1);
});

test('a new gesture or scroll before the queued callback and detachment cannot open a stale panel',async()=>{
  for(const action of ['new-tap','scroll','detached']){
    const f=setup();emit(f.ink,'pointerdown');emit(f.holder,'pointerup');
    if(action==='new-tap')emit(f.outside,'pointerdown');
    if(action==='scroll')emit(f.r,'scroll');
    if(action==='detached')f.el.isConnected=false;
    await Promise.resolve();assert.deepEqual(f.callbacks,[]);
  }
});
