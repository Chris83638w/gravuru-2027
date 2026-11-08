import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {installDemoEdgeResize} from './edge-resize.mjs';
import {installEdgeClamp,clampToPlate,clampToContour,clampToAcrylic} from '../variant-m/edge-clamp.mjs';
import {selectionScaleFactor} from '../variant-m/selection-arrows.mjs';
import {scaleObject} from '../variant-m/image-processing.mjs';
import {fitText} from '../variant-m/workflow-model.mjs';
import {fitsSurface,transformedCorners} from '../variant-m/usability-model.mjs';
import {measureText,setTextSize} from '../../platform/sources/app/shared/models/text-paths.mjs';
import {textOutlineBounds} from '../../platform/sources/app/shared/models/text-outline-fit.mjs';

// Run the real native gesture registration and workflow normalization, not a
// second resize/autofit implementation. Only DOM/event and SVG bbox ports are
// supplied here; the bbox comes from the same shared native glyph outlines.
const source = file => fs.readFileSync(new URL('../variant-m/'+file,import.meta.url),'utf8').replaceAll('\r\n','\n');
const refinement = source('refinements.mjs');
const gestures = refinement.slice(refinement.indexOf('  let resize=null;'),refinement.indexOf("  r.addEventListener('click',async e=>{"));
const workflow = source('workflow.mjs');
const normalization = workflow.slice(workflow.indexOf(' const fitted=new Map()'),workflow.indexOf(" r.addEventListener('input',e=>"));
assert.ok(gestures.includes('selectionScaleFactor') && normalization.includes('fitText('));
const fonts = {Fixture:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0L500 0L500 700L0 700Z'}}}}};
const near = (a,b) => assert.ok(Math.abs(a-b)<.002,`${a} != ${b}`);
const ink = object => {
  const b = textOutlineBounds(object,fonts);
  return b && {x:b.left,y:b.top,width:b.right-b.left,height:b.bottom-b.top};
};
class Port {
  constructor(parent=null,data={}) { this.parent=parent; this.dataset=data; this.listeners=new Map(); this.captures=new Set(); }
  addEventListener(type,fn,capture=false) { const list=this.listeners.get(type)||[]; list.push({fn,capture:capture===true});this.listeners.set(type,list); }
  removeEventListener(type,fn) { this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item.fn!==fn)); }
  closest(selector) {
    if (selector==='[data-ux-handle]' && this.dataset.uxHandle) return this;
    if (selector==='[data-ux-handle="scale"]' && this.dataset.uxHandle==='scale') return this;
    if (selector==='.scene [data-object]' && this.dataset.object) return this;
    return null;
  }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
}
function emit(target,type,extra={}) {
  const path=[]; for(let node=target;node;node=node.parent) path.push(node);
  const event={type,target,button:0,pointerId:1,pointerType:'mouse',...extra,
    composedPath:()=>path,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};
  for(const node of path.toReversed())for(const listener of [...node.listeners.get(type)||[]])if(listener.capture&&!event.stopped)listener.fn(event);
  for(const node of path)for(const listener of [...node.listeners.get(type)||[]])if(!listener.capture&&!event.stopped)listener.fn(event);
  return event;
}
function setup({demo=true,type='text',rotation=0,text='AAAA',geometry={shape:'rect',width:220,height:140},scale=1,profile={},rights=true,extra={}}={}) {
  const el=new Port(),r=new Port(el),holder=new Port(r),handle=new Port(r,{uxHandle:'scale'}),rotate=new Port(r,{uxHandle:'rotate'});
  el.shadowRoot=r;
  const object={id:'active',type,x:0,y:0,rotation,...(type==='text'
    ? {text,font:'Fixture',size:10,lineHeight:14,textAnchor:'start'}
    : {w:32,h:20,...(type==='photoSlot'?{uxUploadId:'original-upload',uxPhotoCrop:{zoom:1.2,x:.1,y:-.1,angle:0},photoShape:'heart',photoMaskAssetId:'original-mask'}:{motif:'native-motif'})}),...extra};
  if(type==='text')measureText(object,fonts);
  const bounds=type==='text'?ink(object):null;
  if(geometry.shape==='ellipse'){object.x=geometry.width*.2;object.y=geometry.height*.4;clampToContour(object,geometry,bounds,null,fonts);}
  else if(profile.doorbellSchema){object.x=10;object.y=20;clampToAcrylic(object,profile,bounds);}
  else clampToPlate(object,geometry.width,geometry.height,0,bounds);
  Object.assign(el,{state:{designId:'D1',objects:[object,{id:'other',type:'motif',motif:'untouched',x:160,y:80,w:20,h:20,rotation:0}],selected:'active',width:geometry.width,height:geometry.height,showHero:false},
    fontData:fonts,history:[],future:[],uxCanEdit:()=>rights,uxPhotoPositionActive:()=>false,
    uxTextScale:()=>1,uxMinTextMm:4,uxTextBounds:ink,uxProfileGeometry:()=>geometry,uxSelectedProfile:()=>profile,
    point:event=>({x:(event.clientX-28)/scale,y:(event.clientY-48)/scale}),
    normalize(){for(const o of this.state.objects)if(o.type==='text')measureText(o,fonts);},
    render(){},sync(){this.normalize();this.render();},record(prior){this.history.push(structuredClone(prior||this.state));this.future=[];}});
  const selected=()=>el.state.objects.find(o=>o.id===el.state.selected),say=[];
  const context={el,r,holder,selected,showTab(){},window:{},scaleObject,selectionScaleFactor,structuredClone,
    mutate(fn){el.record();fn();el.normalize();el.sync();},$:()=>null,
    config:{},signature:()=>null,bounds:ink,textSurface:()=>geometry,chosenProfile:()=>profile,
    fitText,clampToAcrylic,setTextSize,measureText,say:message=>say.push(message)};
  vm.runInNewContext(normalization,context);
  installEdgeClamp(el);
  vm.runInNewContext(gestures,context);
  const nativeNormalize=el.normalize,api=demo?installDemoEdgeResize(el):null;
  const physical=point=>({clientX:point.x*scale+28,clientY:point.y*scale+48});
  function begin({corner=[1,1],pointerType='mouse',target=handle}={}) {
    const original=structuredClone(selected()),angle=original.rotation*Math.PI/180;
    const x=corner[0]*(original.w/2+1),y=corner[1]*(original.h/2+1);
    const start={x:original.x+x*Math.cos(angle)-y*Math.sin(angle),y:original.y+x*Math.sin(angle)+y*Math.cos(angle)};
    emit(target,'pointerdown',{...physical(start),pointerType});
    return {original,start,pointerType,target};
  }
  function move(session,factor=2) {
    const p={x:session.original.x+(session.start.x-session.original.x)*factor,y:session.original.y+(session.start.y-session.original.y)*factor};
    emit(handle,'pointermove',{...physical(p),pointerType:session.pointerType});
  }
  const end=(session,type='pointerup')=>emit(session.target,type,{...physical(session.start),pointerType:session.pointerType});
  const drag=(factor=2,options={})=>{const session=begin(options);move(session,factor);end(session);return session;};
  return {el,r,handle,rotate,api,nativeNormalize,geometry,selected,say,begin,move,end,drag,object:()=>el.state.objects.find(o=>o.id==='active'),undo(){el.state=el.history.pop();el.sync();}};
}

test('reproduces native text shrinking at the top-left edge, then preserves requested size with demo ordering',()=>{
  const old=setup({demo:false}),fixed=setup(),before=structuredClone(fixed.el.state);
  old.drag(); assert.ok(old.object().size<=10.01,'the unchanged native path reproduces the reported limit');
  fixed.drag();near(fixed.object().size,20);near(fixed.object().w,40);assert.ok(fitsSurface(fixed.object(),ink(fixed.object()),fixed.geometry));
  assert.equal(fixed.el.history.length,1);assert.deepEqual(fixed.el.state.objects[1],before.objects[1]);
  fixed.undo();assert.deepEqual(fixed.el.state,before,'the native undo restores geometry, selection and the whole design');
});

test('all four native corners, rotated multiline text and mouse/touch preserve proportional native geometry',()=>{
  for(const rotation of [0,37,90,-120])for(const corner of [[-1,-1],[1,-1],[1,1],[-1,1]])for(const pointerType of ['mouse','touch']){
    const f=setup({rotation,text:'AA\nAAAA'}),before=structuredClone(f.object());f.drag(1.8,{corner,pointerType});
    near(f.object().size,18);near(f.object().lineHeight,before.lineHeight*1.8);near(f.object().h,before.h*1.8);near(f.object().w,before.w*1.8);
    assert.equal(f.object().rotation,rotation);assert.ok(fitsSurface(f.object(),ink(f.object()),f.geometry));assert.equal(f.el.history.length,1);
  }
});

test('successive native moves grow smoothly from the same gesture snapshot without compounding or extra undo',()=>{
  const f=setup(),s=f.begin(),sizes=[],positions=[];
  for(const factor of [1.05,1.1,1.2,1.5,2]){f.move(s,factor);sizes.push(f.object().size);positions.push(f.object().x);}
  assert.deepEqual(sizes,[10.5,11,12,15,20]);assert.ok(positions.every((x,i)=>i===0||x>=positions[i-1]));
  f.end(s);assert.equal(f.el.history.length,1);
});

test('display zoom does not change resize dimensions, rotation or undo',()=>{
  for(const scale of [1,2,4]){const f=setup({scale,rotation:29});f.drag(1.5);near(f.object().size,15);assert.equal(f.object().rotation,29);assert.equal(f.el.history.length,1);}
});

test('rotated motifs and masked photos use unchanged native scale and preserve uploads and crop',()=>{
  for(const type of ['motif','photoSlot'])for(const rotation of [0,43,90]){
    const original=setup({demo:false,type,rotation}),fixed=setup({type,rotation}),before=structuredClone(fixed.el.state);
    original.drag(1.5,{pointerType:'touch'});fixed.drag(1.5,{pointerType:'touch'});
    assert.deepEqual(fixed.el.state,original.el.state,'non-text output is identical to existing native scaling and render clamp');
    near(fixed.object().w,48);near(fixed.object().h,30);assert.deepEqual(fixed.object().uxPhotoCrop,before.objects[0].uxPhotoCrop);
    assert.equal(fixed.object().uxUploadId,before.objects[0].uxUploadId);assert.equal(fixed.object().photoMaskAssetId,before.objects[0].photoMaskAssetId);
    fixed.undo();assert.deepEqual(fixed.el.state,before);
  }
});

test('ellipse fitting uses the native contour helper and retains the real production boundary',()=>{
  const f=setup({geometry:{shape:'ellipse',width:220,height:140},rotation:22}),s=f.begin();f.move(s,1.5);f.end(s);
  near(f.object().size,15);assert.ok(fitsSurface(f.object(),ink(f.object()),f.geometry));
});

test('oversized text still follows native fitting and existing minimum rather than bypassing validation',()=>{
  const f=setup({geometry:{shape:'rect',width:50,height:30}});f.drag(9);
  assert.ok(f.object().size<90);assert.ok(f.object().size>=4);assert.ok(fitsSurface(f.object(),ink(f.object()),f.geometry));
  assert.ok(f.say.some(message=>message.startsWith('Text automatisch')));
});

test('no gesture, non-scale controls and locked/hidden/disabled/crop-mode sources do not gain a demo bypass',()=>{
  for(const options of [{rights:false},{extra:{uxLocked:true}},{extra:{uxHidden:true}},{extra:{locked:true}},{extra:{technicalLocked:true}},{extra:{customerEditable:false}},{extra:{acrylicFixed:true}}]){
    const legacy=setup({...options,demo:false}),demo=setup(options);legacy.drag();demo.drag();assert.deepEqual(demo.el.state,legacy.el.state);
  }
  for(const guard of ['hidden','disabled','crop']){
    const legacy=setup({demo:false}),demo=setup();
    if(guard==='crop'){legacy.el.uxPhotoPositionActive=demo.el.uxPhotoPositionActive=()=>true;}else legacy.handle[guard]=demo.handle[guard]=true;
    legacy.drag();demo.drag();assert.deepEqual(demo.el.state,legacy.el.state);
  }
  const legacy=setup({demo:false}),demo=setup();
  for(const f of [legacy,demo]){setTextSize(f.object(),20);f.el.normalize();f.el.render();}
  assert.deepEqual(demo.el.state,legacy.el.state,'ordinary typing/size input keeps its existing native rules');
});

test('pointer cancel and lost capture restore the native pre-drag state without recording',()=>{
  for(const type of ['pointercancel','lostpointercapture']){
    const f=setup(),before=structuredClone(f.el.state),s=f.begin();f.move(s,2);f.end(s,type);assert.deepEqual(f.el.state,before);assert.equal(f.el.history.length,0);
  }
});

test('native replacement-photo cancellation retains the replacement upload and its crop',()=>{
  const f=setup({type:'photoSlot'}),before=structuredClone(f.object()),s=f.begin();f.move(s,2);
  f.object().uxUploadId='replacement';f.object().uxPhotoCrop={zoom:1.1,x:.2,y:.3,angle:0};f.el.sync();f.end(s);
  for(const key of ['x','y','w','h','rotation'])assert.equal(f.object()[key],before[key]);
  assert.equal(f.object().uxUploadId,'replacement');assert.deepEqual(f.object().uxPhotoCrop,{zoom:1.1,x:.2,y:.3,angle:0});assert.equal(f.el.history.length,0);
});

test('dispose cancels only an active native gesture, restores the hook and leaves other editor instances untouched',()=>{
  const f=setup(),other=setup({demo:false}),before=structuredClone(f.el.state),s=f.begin();
  assert.equal(installDemoEdgeResize(f.el),f.api);f.move(s,2);f.api.dispose();assert.deepEqual(f.el.state,before);assert.equal(f.el.history.length,0);
  assert.equal(f.el.normalize,f.nativeNormalize);f.api.dispose();other.drag();assert.ok(other.object().size<=10.01);
  f.drag();assert.ok(f.object().size<=10.01,'disposed demo behaves as the native editor');
});

test('missing text measurement and native validation failures are not swallowed or retried',()=>{
  const f=setup();delete f.el.uxTextBounds;f.drag();assert.ok(f.object().size<=10.01);
  let calls=0;const el=new Port();el.shadowRoot=new Port(el);el.state={objects:[],selected:null};el.normalize=()=>{calls++;throw Error('native invalid');};
  const api=installDemoEdgeResize(el);assert.throws(()=>el.normalize(),/native invalid/);assert.equal(calls,1);api.dispose();
});
