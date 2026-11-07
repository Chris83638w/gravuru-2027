import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {installDemoMotifSizeLimit} from './motif-size-limit.mjs';
import {installDemoEdgeResize} from './edge-resize.mjs';
import {boundingSize,clampToPlate} from '../variant-m/edge-clamp.mjs';
import {selectionScaleFactor} from '../variant-m/selection-arrows.mjs';
import {scaleObject} from '../variant-m/image-processing.mjs';

// Exercise the existing gesture and toolbar event handlers; only their DOM,
// native host rendering and history ports are supplied by this fixture.
const source = fs.readFileSync(new URL('../variant-m/refinements.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
const nativeEvents = source.slice(source.indexOf('  let resize=null;'),source.indexOf('  function checkMini()'));
assert.ok(nativeEvents.includes('selectionScaleFactor') && nativeEvents.includes("key==='object-bigger'"));
class NodePort {
  constructor(parent=null,dataset={}) { this.parent=parent; this.dataset=dataset; this.listeners=new Map(); this.captures=new Set(); }
  addEventListener(type,fn,capture=false) { const list=this.listeners.get(type)||[]; list.push({fn,capture:capture===true}); this.listeners.set(type,list); }
  removeEventListener(type,fn) { this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item.fn!==fn)); }
  closest(selector) {
    if (selector==='[data-ux-handle]' && this.dataset.uxHandle) return this;
    if (selector==='[data-ux-handle="scale"]' && this.dataset.uxHandle==='scale') return this;
    if (selector==='.scene [data-object]' && this.dataset.object) return this;
    for (const [query,key] of [['[data-ux]','ux'],['[data-direct-motif]','directMotif'],['[data-direct-turn]','directTurn']]) if(selector===query && Object.hasOwn(this.dataset,key)) return this;
    return null;
  }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
}
function emit(target,type,extra={}) {
  const path=[]; for(let node=target;node;node=node.parent)path.push(node);
  const event={type,target,button:0,pointerId:1,pointerType:'touch',...extra,composedPath:()=>path,
    preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};
  for(const node of path.toReversed())for(const listener of [...node.listeners.get(type)||[]])if(listener.capture&&!event.stopped)listener.fn(event);
  for(const node of path)for(const listener of [...node.listeners.get(type)||[]])if(!listener.capture&&!event.stopped)listener.fn(event);
}
// Real browser dispatch can checkpoint microtasks between listeners, unlike a
// plain synchronous test dispatcher. In particular host capture precedes the
// native shadow-root capture or target button handlers.
async function emitWithMicrotaskCheckpoints(target,type,extra={}) {
  const path=[]; for(let node=target;node;node=node.parent)path.push(node);
  const event={type,target,button:0,pointerId:1,pointerType:'touch',...extra,composedPath:()=>path,
    preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};
  for(const node of path.toReversed())for(const listener of [...node.listeners.get(type)||[]])if(listener.capture&&!event.stopped){listener.fn(event);await Promise.resolve();}
  for(const node of path)for(const listener of [...node.listeners.get(type)||[]])if(!listener.capture&&!event.stopped){listener.fn(event);await Promise.resolve();}
}
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup({demo=true,geometry={shape:'rect',width:220,height:140},extra={},edge=true}={}) {
  const el=new NodePort(),r=new NodePort(el),holder=new NodePort(r),handle=new NodePort(r,{uxHandle:'scale'}),rotate=new NodePort(r,{uxHandle:'rotate'});
  el.shadowRoot=r;
  const object={id:'motif',type:'motif',motif:'original-dog',x:40,y:40,w:40,h:25,rotation:0,...extra};
  el.state={width:geometry.width,height:geometry.height,designId:'D1',selected:object.id,objects:[object,{id:'untouched',type:'text',text:'Bruno',x:30,y:20,w:40,h:10}]};
  const selected=()=>el.state.objects.find(o=>o.id===el.state.selected);
  el.history=[];el.frames=[];
  Object.assign(el,{uxProfileGeometry:()=>geometry,uxSelectedProfile:()=>({}),uxCanEdit:()=>true,uxCanRotate:()=>true,
    point:event=>({x:event.clientX,y:event.clientY}),normalize(){},
    render(){for(const o of this.state.objects)clampToPlate(o,this.state.width,this.state.height);this.frames.push(structuredClone(selected()));},
    sync(){this.normalize();this.render();},record(before){this.history.push(structuredClone(before||this.state));}});
  const mutate=fn=>{el.record();fn();el.normalize();el.sync();};
  vm.runInNewContext(nativeEvents,{el,r,holder,selected,showTab(){},window:{},scaleObject,selectionScaleFactor,structuredClone,mutate});
  const edgeApi=edge?installDemoEdgeResize(el):null;
  const originals={normalize:el.normalize,render:el.render};
  const api=demo?installDemoMotifSizeLimit(el):null;
  const begin=(kind='scale',corner=[1,1],pointerType='touch')=>{
    const original=structuredClone(selected()),angle=original.rotation*Math.PI/180;
    const x=corner[0]*(original.w/2+1),y=corner[1]*(original.h/2+1);
    const start={x:original.x+x*Math.cos(angle)-y*Math.sin(angle),y:original.y+x*Math.sin(angle)+y*Math.cos(angle)};
    const target=kind==='rotate'?rotate:handle;
    emit(target,'pointerdown',{clientX:start.x,clientY:start.y,pointerType});
    return {original,start,target,pointerType};
  };
  const move=(session,factor)=>emit(session.target,'pointermove',{clientX:session.original.x+(session.start.x-session.original.x)*factor,clientY:session.original.y+(session.start.y-session.original.y)*factor,pointerType:session.pointerType});
  const end=(session,type='pointerup')=>emit(session.target,type,{pointerType:session.pointerType});
  const button=(key)=>{const node=new NodePort(r,{ux:key});emit(node,'click');return node;};
  return {el,r,geometry,handle,rotate,originals,api,edgeApi,selected,begin,move,end,button,
    drag(factor,corner,pointerType){const session=begin('scale',corner,pointerType);move(session,factor);end(session);},
    undo(){el.state=el.history.pop();el.sync();}};
}
function assertInside(f) {
  const o=f.selected(),b=boundingSize(o),epsilon=1e-7;
  assert.ok(b.w<=f.geometry.width+epsilon && b.h<=f.geometry.height+epsilon);
  assert.ok(o.x-b.w/2>=-epsilon && o.x+b.w/2<=f.geometry.width+epsilon);
  assert.ok(o.y-b.h/2>=-epsilon && o.y+b.h/2<=f.geometry.height+epsilon);
}

test('native corner growth reproduces oversized motifs; demo caps both actual plate sizes and every rotation/corner',()=>{
  const old=setup({demo:false});old.drag(20);assert.ok(boundingSize(old.selected()).w>220);
  for(const [width,height] of [[220,140],[300,200]])for(const rotation of [0,23,45,90,137,-42])for(const corner of [[-1,-1],[1,-1],[-1,1],[1,1]])for(const pointerType of ['touch','mouse']){
    const f=setup({geometry:{shape:'rect',width,height},extra:{rotation}}),before=structuredClone(f.el.state);
    f.drag(20,corner,pointerType);assertInside(f);near(f.selected().w/f.selected().h,40/25);
    assert.equal(f.selected().rotation,rotation);assert.equal(f.el.history.length,1);
    assert.deepEqual(f.el.state.objects[1],before.objects[1]);
    for(const frame of f.el.frames){const b=boundingSize(frame);assert.ok(b.w<=width+1e-7&&b.h<=height+1e-7,'no oversized intermediate render');}
    f.undo();assert.deepEqual(f.el.state,before);
  }
});

test('growth is continuous below the limit, can shrink again and leaves original motif artwork untouched',()=>{
  const f=setup(),s=f.begin(),sizes=[];
  for(const factor of [1.1,1.5,2,20,2]){f.move(s,factor);sizes.push(f.selected().w);assertInside(f);}
  near(sizes[0],44);near(sizes[1],60);near(sizes[2],80);near(sizes[3],220);near(sizes[4],80);
  assert.equal(f.selected().motif,'original-dog');f.end(s);assert.equal(f.el.history.length,1);
});

test('native toolbar and keyboard scale/rotation paths enforce the same limit',()=>{
  for(const key of ['object-bigger','object-turn']){
    const f=setup({extra:{w:210,h:130,x:110,y:70}});
    for(let count=0;count<40;count++)f.button(key);
    assertInside(f);near(f.selected().w/f.selected().h,210/130);
  }
  for(const kind of ['scale','rotate']){
    const f=setup({extra:{w:210,h:130,x:110,y:70}});
    for(let count=0;count<40;count++)emit(kind==='scale'?f.handle:f.rotate,'keydown',{key:'ArrowUp'});
    assertInside(f);near(f.selected().w/f.selected().h,210/130);
  }
});

test('direct motif controls also cap a native action that renders without normalization',()=>{
  for(const key of ['grow','rotate','tail']){
    const f=setup({extra:{w:210,h:130,x:110,y:70}});
    const node=new NodePort(f.r,key==='tail'?{directTurn:''}:{directMotif:key});
    node.addEventListener('click',()=>{f.el.record();if(key==='grow')Object.assign(f.selected(),scaleObject(f.selected(),1.1));else f.selected().rotation+=15;f.el.render();});
    for(let count=0;count<40;count++)emit(node,'click');
    assertInside(f);near(f.selected().w/f.selected().h,210/130);
  }
});

test('limits survive browser microtask checkpoints between host capture and native button/gesture handlers',async()=>{
  const click=setup({extra:{w:210,h:130,x:110,y:70}}),button=new NodePort(click.r,{ux:'object-bigger'});
  await emitWithMicrotaskCheckpoints(button,'click');assertInside(click);near(click.selected().w,220);
  const gesture=setup(),session=gesture.begin();
  await emitWithMicrotaskCheckpoints(session.target,'pointermove',{
    clientX:session.original.x+(session.start.x-session.original.x)*20,
    clientY:session.original.y+(session.start.y-session.original.y)*20,
  });
  assertInside(gesture);near(gesture.selected().w,220);gesture.end(session);assert.equal(gesture.el.history.length,1);
});

test('cancel and dispose restore the native gesture snapshot and native wrappers',()=>{
  for(const type of ['pointercancel','lostpointercapture','dispose']){
    const f=setup(),before=structuredClone(f.el.state),s=f.begin();f.move(s,20);
    if(type==='dispose'){assert.equal(installDemoMotifSizeLimit(f.el),f.api);f.api.dispose();f.api.dispose();assert.equal(f.el.normalize,f.originals.normalize);assert.equal(f.el.render,f.originals.render);}
    else f.end(s,type);
    assert.deepEqual(f.el.state,before);assert.equal(f.el.history.length,0);
  }
});

test('load/reset/undo and non-motif or protected objects retain unchanged native behavior',()=>{
  const f=setup({extra:{w:400,h:250}}),before=structuredClone(f.el.state);
  f.el.normalize();f.el.render();assert.equal(f.selected().w,400);assert.equal(f.selected().h,250);
  f.el.state=structuredClone(before);f.el.sync();assert.equal(f.selected().w,400);
  for(const extra of [{type:'photoSlot',uxUploadId:'upload'},{type:'motif',uxUploadKind:'logo'},{uxVectorLogo:true},{uxUploadId:'upload'},{uxLocked:true},{locked:true},{technicalLocked:true},{acrylicFixed:true},{customerEditable:false},{uxHidden:true},{role:'guide'}]){
    const original=setup({demo:false,extra}),demo=setup({extra});original.drag(20);demo.drag(20);
    assert.deepEqual(demo.el.state,original.el.state);
  }
  const original=setup({demo:false}),denied=setup();original.el.uxCanEdit=denied.el.uxCanEdit=()=>false;
  original.drag(20);denied.drag(20);assert.deepEqual(denied.el.state,original.el.state);
});

test('unsupported or missing surface geometry never claims that its rectangular bounds are a valid fit',()=>{
  for(const geometry of [{shape:'ellipse',width:220,height:140},{shape:'contour',width:220,height:140},{shape:'rect',width:220,height:140,cornerRadiusMm:10},{shape:'rect',width:NaN,height:140}]){
    const f=setup({geometry,edge:false}),before=structuredClone(f.selected());f.drag(20);
    assert.equal(f.selected().w,before.w);assert.equal(f.selected().h,before.h);assert.equal(f.selected().rotation,before.rotation);
  }
  const f=setup();f.el.uxProfileGeometry=()=>null;f.button('object-bigger');assert.equal(f.selected().w,40);
});

test('unhandled/disabled controls and changed selection do not leak limits into unrelated edits',async()=>{
  const f=setup(),button=new NodePort(f.r,{directMotif:'grow'});button.disabled=true;emit(button,'click');
  f.selected().w=400;f.el.render();assert.equal(f.selected().w,400);
  button.disabled=false;emit(button,'click');await new Promise(resolve=>setTimeout(resolve,0));f.selected().w=500;f.el.render();assert.equal(f.selected().w,500);
  emit(button,'click');f.el.state.objects[0]={...f.selected(),w:600};f.el.render();assert.equal(f.selected().w,600);
});

test('native normalization errors propagate without retry or suppression',()=>{
  const el=new NodePort();el.shadowRoot=new NodePort(el);el.state={objects:[]};let calls=0;
  el.normalize=()=>{calls++;throw Error('native failure');};el.render=()=>{};
  const api=installDemoMotifSizeLimit(el);assert.throws(()=>el.normalize(),/native failure/);assert.equal(calls,1);api.dispose();
});
