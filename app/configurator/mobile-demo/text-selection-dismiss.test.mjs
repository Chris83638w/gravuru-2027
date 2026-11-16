import test from 'node:test';
import assert from 'node:assert/strict';
import {installDemoTextSelectionDismiss} from './text-selection-dismiss.mjs';

class Node {
  constructor(parent=null,{tag='div',classes=[],text=false,role}={}) {
    this.parentNode=parent;this.tag=tag;this.classes=new Set(classes);this.textField=text;this.role=role;
    this.listeners=new Map();this.ownerDocument=parent?.ownerDocument;this.value='Eine lange Textzeile';
    this.selectionStart=1;this.selectionEnd=8;this.selectionDirection='forward';this.ranges=[];this.blurs=0;
  }
  addEventListener(type,fn,options=false) {const list=this.listeners.get(type)||[];list.push({fn,capture:options===true||options?.capture===true});this.listeners.set(type,list);}
  removeEventListener(type,fn) {this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item.fn!==fn));}
  matches(selector) {return selector.split(',').some(s=>s==='[data-ux-text]'&&this.textField||s.startsWith('.')&&this.classes.has(s.slice(1))||s==='dialog'&&this.tag==='dialog'||s==='[role="dialog"]'&&this.role==='dialog'||s==='[data-text-options]'&&this.textOptions);}
  closest(selector) {for(let node=this;node;node=node.parentNode)if(node.matches?.(selector))return node;return null;}
  contains(node) {for(;node;node=node.parentNode)if(node===this)return true;return false;}
  setSelectionRange(start,end,direction='none') {this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;this.ranges.push([start,end,direction]);}
  blur() {this.blurs++;const root=this.root;if(root?.activeElement===this)root.activeElement=null;emit(this,'focusout');}
}
function emit(target,type,extra={}) {
  const path=[];for(let node=target;node;node=node.parentNode)path.push(node);
  const event={type,target,pointerId:1,button:0,isPrimary:true,clientX:30,clientY:40,...extra,
    composedPath:()=>path,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};
  for(const node of path.toReversed())for(const item of [...node.listeners.get(type)||[]])if(item.capture&&!event.stopped)item.fn(event);
  for(const node of path)for(const item of [...node.listeners.get(type)||[]])if(!item.capture&&!event.stopped)item.fn(event);
  return event;
}
function setup(options={}) {
  const doc=new Node();doc.ownerDocument=doc;doc.getSelection=()=>{throw Error('Unrelated browser selection must not be read/cleared');};
  const el=new Node(doc);el.isConnected=true;const root=new Node(el);root.activeElement=null;el.shadowRoot=root;
  const row=new Node(root,{classes:['ux-text-row']}),field=new Node(row,{tag:'textarea',text:true});field.root=root;
  const otherRow=new Node(root,{classes:['ux-text-row']}),second=new Node(otherRow,{tag:'textarea',text:true});second.root=root;
  const canvas=new Node(root,{classes:['scene']}),outside=new Node(doc),controls=new Node(row,{classes:['ux-controls']});
  const api=installDemoTextSelectionDismiss(el,options);
  const focus=node=>{root.activeElement=node;emit(node,'focusin');};
  const tap=async(target,extra={})=>{emit(target,'pointerdown',extra);emit(target,'pointerup',extra);await Promise.resolve();};
  const snapshot=node=>({value:node.value,start:node.selectionStart,end:node.selectionEnd,direction:node.selectionDirection,blurs:node.blurs,ranges:[...node.ranges]});
  return {doc,el,root,row,field,second,canvas,outside,controls,api,focus,tap,snapshot};
}

test('explicit Done collapses only the last native field and blurs it without changing text or emitting input',()=>{
  const f=setup(),before=f.field.value,inputs=[];f.focus(f.field);
  for(const type of ['input','change','beforeinput'])f.root.addEventListener(type,event=>inputs.push(event));
  f.api.dismiss();assert.equal(f.field.selectionStart,8);assert.equal(f.field.selectionEnd,8);assert.equal(f.field.value,before);
  assert.equal(f.field.blurs,1);assert.equal(f.root.activeElement,null);assert.deepEqual(inputs,[]);
  f.api.dismiss();assert.equal(f.field.blurs,1);assert.equal(f.field.ranges.length,1,'repeated Done is harmless');
});

test('backwards selection collapses at its focused end; unrelated active control keeps focus',()=>{
  const f=setup();f.field.selectionDirection='backward';f.focus(f.field);
  const unrelated=new Node(f.root,{tag:'input'});f.root.activeElement=unrelated;
  f.api.dismiss();assert.equal(f.field.selectionStart,1);assert.equal(f.field.selectionEnd,1);
  assert.equal(f.field.blurs,0);assert.equal(f.root.activeElement,unrelated);assert.equal(unrelated.blurs,0);
});

test('a deliberate canvas or external tap dismisses after native pointerup, not on pointerdown',async()=>{
  for(const location of ['canvas','outside']){
    const f=setup();f.focus(f.field);let nativeObserved;
    f.root.addEventListener('pointerup',()=>{nativeObserved=f.field.selectionEnd-f.field.selectionStart;},true);
    const target=f[location];emit(target,'pointerdown');assert.equal(f.field.selectionEnd,8);assert.equal(f.field.blurs,0);
    emit(target,'pointerup');assert.equal(f.field.selectionEnd,8,'native pointerup gets the untouched selection');
    await Promise.resolve();assert.equal(f.field.selectionStart,8);assert.equal(f.field.blurs,1);
    if(location==='canvas')assert.equal(nativeObserved,7);
  }
});

test('field taps, selection handles, long press, copy/paste, select-all and composition stay native',async()=>{
  const f=setup();f.focus(f.field);
  for(const type of ['pointerdown','pointermove','contextmenu','pointerup','keydown','copy','paste','beforeinput','input','compositionstart','compositionupdate','compositionend']){
    const e=emit(f.field,type,{clientX:90,clientY:80,key:'a',ctrlKey:true});assert.equal(e.defaultPrevented,undefined);assert.equal(e.stopped,undefined);
  }
  f.field.setSelectionRange(0,f.field.value.length);const before=f.snapshot(f.field);await Promise.resolve();
  assert.deepEqual(f.snapshot(f.field),before);assert.equal(f.field.blurs,0);
  await f.tap(f.field);assert.deepEqual(f.snapshot(f.field),before);
});

test('font/size controls, text choices and native or ARIA dialogs do not dismiss selection',async()=>{
  for(const classes of [['ux-controls'],['ux-direct-edit'],['ux-direct-input'],['md-text-picker'],['md-text-size-control']]){
    const f=setup();f.focus(f.field);const protectedRegion=new Node(f.root,{classes}),button=new Node(protectedRegion,{tag:'button'});
    await f.tap(button);assert.equal(f.field.selectionStart,1);assert.equal(f.field.blurs,0);
  }
  for(const attributes of [{tag:'dialog'},{role:'dialog'}]){
    const f=setup();f.focus(f.field);const dialog=new Node(f.root,attributes),button=new Node(dialog,{tag:'button'});
    await f.tap(button);assert.equal(f.field.selectionStart,1);assert.equal(f.field.blurs,0);
  }
});

test('scroll, wheel, touch movement, cancelled pointer and dragging preserve selection',async()=>{
  for(const action of ['move','upMoved','rootScroll','documentScroll','wheel','touchmove','pointercancel','contextmenu','dragstart']){
    const f=setup();f.focus(f.field);const before=f.snapshot(f.field);emit(f.canvas,'pointerdown');
    if(action==='move')emit(f.canvas,'pointermove',{clientX:100});
    else if(action==='rootScroll')emit(f.root,'scroll');
    else if(action==='documentScroll')emit(f.doc,'scroll');
    else if(action!=='upMoved')emit(f.canvas,action);
    emit(f.canvas,'pointerup',action==='upMoved'?{clientY:100}:{});await Promise.resolve();
    assert.deepEqual(f.snapshot(f.field),before,action);
  }
});

test('small pointer jitter is still a tap while multitouch and non-primary/right buttons are ignored',async()=>{
  const f=setup();f.focus(f.field);emit(f.canvas,'pointerdown');emit(f.canvas,'pointermove',{clientX:33,clientY:42});emit(f.canvas,'pointerup',{clientX:33,clientY:42});await Promise.resolve();assert.equal(f.field.blurs,1);
  for(const extra of [{button:2},{isPrimary:false}]){const f=setup();f.focus(f.field);await f.tap(f.canvas,extra);assert.equal(f.field.blurs,0);}
  const multi=setup();multi.focus(multi.field);emit(multi.canvas,'pointerdown');emit(multi.canvas,'pointerdown',{pointerId:2,isPrimary:false});emit(multi.canvas,'pointerup',{pointerId:2});emit(multi.canvas,'pointerup');await Promise.resolve();assert.equal(multi.field.blurs,0);
});

test('switching or refocusing a text field before queued dismissal protects the new selection',async()=>{
  for(const same of [false,true]){
    const f=setup();f.focus(f.field);emit(f.canvas,'pointerdown');emit(f.canvas,'pointerup');
    const chosen=same?f.field:f.second;f.focus(chosen);chosen.setSelectionRange(0,chosen.value.length);const before=f.snapshot(chosen);
    await Promise.resolve();assert.deepEqual(f.snapshot(chosen),before);assert.equal(f.root.activeElement,chosen);
  }
});

test('enabled callback leaves desktop unchanged including an already queued mobile tap',async()=>{
  let mobile=false;const f=setup({enabled:()=>mobile});f.focus(f.field);const before=f.snapshot(f.field);
  f.api.dismiss();await f.tap(f.canvas);assert.deepEqual(f.snapshot(f.field),before);
  mobile=true;emit(f.canvas,'pointerdown');emit(f.canvas,'pointerup');mobile=false;await Promise.resolve();assert.deepEqual(f.snapshot(f.field),before);
  mobile=true;f.api.dismiss();assert.equal(f.field.blurs,1);
});

test('removed fields and no previous field are harmless; an initially focused field is supported',()=>{
  const f=setup();f.api.dismiss();f.focus(f.field);f.field.parentNode=null;f.api.dismiss();assert.equal(f.field.blurs,0);
  const doc=new Node();doc.ownerDocument=doc;const el=new Node(doc),root=new Node(el),field=new Node(root,{text:true});field.root=root;root.activeElement=field;el.shadowRoot=root;
  const api=installDemoTextSelectionDismiss(el);api.dismiss();assert.equal(field.blurs,1);
});

test('dispose removes listeners, cancels queued dismissal and restores normal selection behavior',async()=>{
  const f=setup();f.focus(f.field);assert.equal(installDemoTextSelectionDismiss(f.el),f.api);
  emit(f.canvas,'pointerdown');emit(f.canvas,'pointerup');f.api.dispose();f.api.dispose();await Promise.resolve();
  assert.equal(f.field.blurs,0);f.api.dismiss();assert.equal(f.field.blurs,0);
  assert.equal([...f.doc.listeners.values()].flat().length,0);assert.equal([...f.root.listeners.values()].flat().length,0);
  const fresh=installDemoTextSelectionDismiss(f.el);assert.notEqual(fresh,f.api);fresh.dismiss();assert.equal(f.field.blurs,1);
});

test('one editor never clears another editor field or the page selection',async()=>{
  const a=setup(),b=setup();a.focus(a.field);b.focus(b.field);const before=b.snapshot(b.field);
  await a.tap(a.canvas);assert.equal(a.field.blurs,1);assert.deepEqual(b.snapshot(b.field),before);
});
