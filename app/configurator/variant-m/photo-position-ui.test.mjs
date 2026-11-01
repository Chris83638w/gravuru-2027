import {textToolbarPosition} from './text-toolbar-position.mjs';
import {placeDirectToolbar} from './toolbar-hosts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {installPhotoPosition} from './photo-position.mjs';
import {beginCustomerRights} from './customer-rights.mjs';
import {scaleObject} from './image-processing.mjs';
import {tapTracker} from './photo-upload.mjs';
import {selectionScaleFactor} from './selection-arrows.mjs';
import {fontDisplayName} from './font-display.mjs';

// Deterministic DOM ports execute the real installed photo/rights listeners and
// the unchanged shared configurator gesture registration, including capture order.
const attrKey=value=>value.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
class Node {
  constructor(tag){this.tagName=tag.toLowerCase();this.children=[];this.dataset={};this.style={setProperty(key,value){this[key]=String(value);}};this.attributes={};this.listeners={};this.hidden=false;this.disabled=false;this.captured=new Set();}
  getBoundingClientRect(){return {x:0,y:0,left:0,top:0,right:100,bottom:60,width:100,height:60};}
  get isConnected(){return this===document.body||!!this.parent?.isConnected;}
  get parentNode(){return this.parent||null;}
  set className(value){this.attributes.class=value;}
  get className(){return this.attributes.class||'';}
  setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[attrKey(name.slice(5))]=String(value);if(name==='id')this.id=String(value);}
  removeAttribute(name){delete this.attributes[name];if(name.startsWith('data-'))delete this.dataset[attrKey(name.slice(5))];}
  matches(selector){
    return selector.split(',').some(part=>{
      const bits=part.trim().split(/\s+/),last=bits.pop();
      if(!this.simple(last))return false;
      let parent=this.parent;
      while(bits.length){const bit=bits.pop();while(parent&&!parent.simple(bit))parent=parent.parent;if(!parent)return false;parent=parent.parent;}
      return true;
    });
  }
  simple(selector){
    const tag=selector.match(/^[a-z][a-z0-9-]*/i)?.[0];if(tag&&this.tagName!==tag)return false;
    for(const m of selector.matchAll(/\.([\w-]+)/g))if(!this.className.split(/\s+/).includes(m[1]))return false;
    const id=selector.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;
    for(const m of selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)){
      const value=m[1].startsWith('data-')?this.dataset[attrKey(m[1].slice(5))]:this.attributes[m[1]];
      if(value===undefined||m[2]!==undefined&&value!==m[2])return false;
    }
    return true;
  }
  closest(selector){for(let n=this;n;n=n.parent)if(n.matches(selector))return n;return null;}
  querySelectorAll(selector){return this.children.flatMap(n=>[...(n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  append(...nodes){for(const node of nodes){node.parent?.remove(node);node.parent=this;this.children.push(node);}}
  prepend(node){node.parent?.remove(node);node.parent=this;this.children.unshift(node);}
  after(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,node);}
  remove(node){this.children.splice(this.children.indexOf(node),1);node.parent=null;if((document.activeNode||document.activeElement)===node||node.querySelectorAll('*').includes(document.activeNode||document.activeElement))document.activeElement=document.body;}
  replaceChildren(...nodes){for(const child of [...this.children])this.remove(child);this.append(...nodes);}
  set innerHTML(html){
    this.replaceChildren();const stack=[this];
    for(const token of html.matchAll(/<\/?([\w-]+)([^>]*)>|([^<]+)/g)){
      if(token[3])continue;
      if(token[0].startsWith('</')){stack.pop();continue;}
      const n=new Node(token[1]);for(const a of token[2].matchAll(/([\w-]+)(?:="([^"]*)"|'([^']*)'|=([^\s>]+))?/g))n.setAttribute(a[1],a[2]??a[3]??a[4]??'');
      stack.at(-1).append(n);if(!['input','img','br','hr'].includes(n.tagName))stack.push(n);
    }
  }
  addEventListener(type,fn,capture=false){(this.listeners[type]||=[]).push({fn,capture:capture===true||capture?.capture===true});}
  focus(){document.activeElement=this;}
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);}
}
function emit(target,type,extra={}){
  const path=[];for(let node=target;node;node=node.parent)path.push(node);
  const e={type,target,button:0,pointerId:1,clientX:50,clientY:40,isTrusted:true,...extra,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};
  for(const node of path.toReversed())for(const {fn,capture}of node.listeners[type]||[])if(capture&&!e.stopped)fn(e);
  for(const node of path)for(const {fn,capture}of node.listeners[type]||[])if(!capture&&!e.stopped)fn(e);
  return e;
}
const sharedSource=fs.readFileSync(new URL('./refinements.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
const sharedGestures=sharedSource.slice(sharedSource.indexOf('  let resize=null;'),sharedSource.indexOf('  function areaResize(field)'));
assert(sharedGestures.includes("r.addEventListener('pointerdown'"),'shared gesture source must be present');
function setup(t,{rights={move:true,replace:true,scale:false,delete:false},slot={},uploaded=true,legacyTap=false}={}){
  const prior={document:globalThis.document,CSS:globalThis.CSS};
  globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>Object.assign(new Node('span'),{textContent:text})};
  document.body=new Node('body');document.activeElement=document.body;globalThis.CSS={escape:value=>value};
  t.after(()=>{globalThis.document=prior.document;globalThis.CSS=prior.CSS;});
  const r=new Node('div');document.body.append(r);
  r.innerHTML='<div class="stage"><div class="plate-holder"><svg class="scene"></svg></div><div class="ux-selection-handles"><button data-ux-handle="scale"></button><button data-ux-handle="rotate"></button><span class="ux-rotate-stem"></span><button data-ux="delete" class="ux-handle-delete"></button></div></div><div class="ux-controls"><div class="ux-uploads"></div></div>';
  const object={id:'photo',type:'photoSlot',fieldKey:'photo',photoShape:'template',photoMaskAssetId:'heart-mask',x:50,y:40,w:30,h:40,rotation:0,...(uploaded?{uxUploadId:'upload',uxPhotoCrop:{zoom:1.3,x:.2,y:-.1,angle:5}}:{}),...slot};
  const other={...object,id:'other',x:80,fieldKey:'other'};
  const config={profile:{designs:[{id:'design',objects:structuredClone([object,other])}]},workshopElementRights:{design:{photo:rights,other:rights}}};
  const undo=[],tabs=[],said=[],files=new Map([['upload',{width:600,height:900}],['new-upload',{width:800,height:600}]]);
  const el={state:{designId:'design',width:120,height:80,objects:[object,other],selected:'photo'},point:e=>({x:e.clientX,y:e.clientY}),normalize(){},record(old){undo.push(structuredClone(old||this.state));},render(){r.querySelector('.scene').innerHTML=this.state.objects.map(o=>'<g data-object="'+o.id+'"></g>').join('');},sync(){this.render();}};
  const selected=()=>el.state.objects.find(o=>o.id===el.state.selected),select=id=>{el.state.selected=id;el.sync();},mutate=fn=>{el.record();fn();el.normalize();el.sync();},showTab=tab=>tabs.push(tab);
  const api={el,r,config,files,selected,select,mutate,showTab,say:m=>said.push(m),button:(key,label)=>'<button data-ux="'+key+'">'+label+'</button>'};
  const finishRights=beginCustomerRights(api);el.render();
  let uploadRequests=0;
  if(legacyTap){
    const uxSource=fs.readFileSync(new URL('./ux.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n');
    const begin=uxSource.indexOf('  const photoTap=tapTracker();'),end=uxSource.indexOf("  r.addEventListener('keydown',event=>{",begin);
    assert(begin>=0&&end>begin);const hooks=uxSource.slice(begin,end);
    vm.runInNewContext(hooks,{r,el,tapTracker,emptySlotFromEvent:()=>null,uploadedSlotFromEvent:event=>{const id=event.target.closest('.scene [data-object]')?.dataset.object,slot=el.state.objects.find(o=>o.id===id);return slot?.uxUploadId?{slot}:null;},replaceablePhotoSlot:()=>false,uploadFromEmptySlot(){},say(){},$:()=>({click(){uploadRequests++;}}),replacing:null,uploadKind:null});
  }
  installPhotoPosition(api);
  vm.runInNewContext(sharedGestures,{...api,$:s=>r.querySelector(s),holder:r.querySelector('.plate-holder'),window:{},scaleObject,selectionScaleFactor,structuredClone});
  finishRights();el.sync();
  const node=id=>r.querySelector('.scene [data-object="'+id+'"]'),panel=r.querySelector('.ux-photo-position'),button=key=>panel.querySelector('[data-ux="'+key+'"]'),handle=kind=>r.querySelector('[data-ux-handle="'+kind+'"]');
  const current=()=>el.state.objects.find(o=>o.id==='photo');
  return {el,r,files,undo,tabs,said,panel,uploadRequests:()=>uploadRequests,button,handle,node,object:current,select,selected,click:key=>emit(button(key),'click'),undoOne(){el.state=undo.pop();el.sync();}};
}
const geometry=o=>Object.fromEntries(['x','y','w','h','rotation','photoShape','photoMaskAssetId'].map(key=>[key,o[key]]));
function drag(h,target,{dx=10,dy=5,pointerType='mouse',end='pointerup'}={}){
  const start={clientX:50,clientY:40,pointerType};emit(target,'pointerdown',start);emit(h.r,'pointermove',{...start,clientX:50+dx,clientY:40+dy});if(end)emit(h.r,end,{...start,clientX:50+dx,clientY:40+dy});
}

test('movable masked photo defaults to shared field movement; crop and mask stay intact, undo restores geometry',t=>{
  const h=setup(t),before=structuredClone(h.object());assert.equal(h.el.uxPhotoPositionActive(h.object()),false);
  assert.equal(h.handle('scale').hidden,true,'replace permission must not grant field scaling');
  drag(h,h.node('photo'));assert.equal(h.object().x,before.x+10);assert.equal(h.object().y,before.y+5);
  assert.deepEqual(h.object().uxPhotoCrop,before.uxPhotoCrop);assert.equal(h.object().photoMaskAssetId,'heart-mask');assert.equal(h.object().w,before.w);
  assert.equal(h.undo.length,1);h.undoOne();assert.deepEqual(h.object(),before);
});
test('move true / replace false supports touch and repeated keyboard steps without unlocking crop or replacement',t=>{
  const h=setup(t,{rights:{move:true,replace:false}}),before=structuredClone(h.object());assert.equal(h.panel.hidden,true);
  drag(h,h.node('photo'),{pointerType:'touch',dx:7,dy:3});assert.equal(h.object().x,57);assert.deepEqual(h.object().uxPhotoCrop,before.uxPhotoCrop);
  h.node('photo').focus();emit(document.activeElement,'keydown',{key:'ArrowRight'});emit(document.activeElement,'keydown',{key:'ArrowRight'});
  assert.equal(h.object().x,59);assert.equal(document.activeElement,h.node('photo'));
  emit(document.activeElement,'keydown',{key:'Delete'});assert.equal(h.object().uxUploadId,'upload');assert.equal(h.el.uxSetPhotoPositionMode('crop'),false);
});
test('explicit crop mode pans with touch while complete heart geometry stays unchanged and undo restores only crop',t=>{
  const h=setup(t),before=structuredClone(h.object());h.click('photo-position-crop');assert.equal(h.el.uxPhotoPositionActive(h.object()),true);
  assert.equal(h.handle('scale').hidden,false,'crop zoom remains available without field scaling');
  drag(h,h.node('photo'),{pointerType:'touch'});assert.deepEqual(geometry(h.object()),geometry(before));assert.notDeepEqual(h.object().uxPhotoCrop,before.uxPhotoCrop);
  h.undoOne();assert.deepEqual(h.object(),before);
});
test('crop arrows resize/rotate only image; reset never moves or changes mask and leaving mode restores shared field movement',t=>{
  const h=setup(t),before=structuredClone(h.object());h.click('photo-position-crop');
  emit(h.handle('scale'),'keydown',{key:'ArrowRight'});emit(h.handle('rotate'),'keydown',{key:'ArrowRight'});
  assert(h.object().uxPhotoCrop.zoom>before.uxPhotoCrop.zoom);assert.equal(h.object().uxPhotoCrop.angle,before.uxPhotoCrop.angle+1);assert.deepEqual(geometry(h.object()),geometry(before));
  h.click('photo-position-reset');assert.equal(h.object().uxPhotoCrop,undefined);assert.deepEqual(geometry(h.object()),geometry(before));
  h.click('photo-position-move');assert.equal(h.el.uxPhotoPositionActive(h.object()),false);drag(h,h.node('photo'));assert.equal(h.object().x,60);assert.equal(h.object().uxPhotoCrop,undefined);
});
test('fixed photo with replace only defaults to crop and cannot switch to mask movement',t=>{
  const h=setup(t,{rights:{replace:true,move:false,scale:false}}),before=geometry(h.object());
  assert.equal(h.el.uxPhotoPositionActive(h.object()),true);assert.equal(h.button('photo-position-move').hidden,true);assert.equal(h.el.uxSetPhotoPositionMode('move'),false);
  drag(h,h.node('photo'));assert.deepEqual(geometry(h.object()),before);assert.notEqual(h.object().uxPhotoCrop.x,.2);
  h.node('photo').focus();emit(document.activeElement,'keydown',{key:'ArrowRight'});assert.deepEqual(geometry(h.object()),before);
});
test('fixed acrylic mask remains fixed even with an inconsistent permissive rights document',t=>{
  const h=setup(t,{slot:{acrylicFixed:true},rights:{replace:true,move:true,scale:true}}),before=geometry(h.object());
  assert.equal(h.el.uxSetPhotoPositionMode('move'),false);drag(h,h.node('photo'));assert.deepEqual(geometry(h.object()),before);
});
test('read-only and technical-locked photos never acquire move or crop through gestures',t=>{
  const h=setup(t,{rights:{}}),before=structuredClone(h.object());drag(h,h.node('photo'));emit(h.node('photo'),'keydown',{key:'ArrowRight'});
  assert.deepEqual(h.object(),before);assert.equal(h.el.uxSetPhotoPositionMode('crop'),false);
});
for(const mode of ['move','crop'])for(const end of ['pointercancel','lostpointercapture','Escape'])test(mode+' gesture cancellation via '+end+' restores its changes without adding undo',t=>{
  const h=setup(t),before=structuredClone(h.object());if(mode==='crop')h.click('photo-position-crop');
  drag(h,h.node('photo'),{end:null});if(end==='Escape')emit(h.r,'keydown',{key:'Escape'});else emit(end==='lostpointercapture'&&mode==='crop'?h.r.querySelector('.stage'):h.r,end);
  assert.deepEqual(h.object(),before);assert.equal(h.undo.length,0);assert.equal(h.r.querySelector('.stage').captured.size,0);assert.equal(h.r.querySelector('.plate-holder').captured.size,0);
});
test('selection change cancels a crop and resets explicit mode without modifying the new selection',t=>{
  const h=setup(t),before=structuredClone(h.el.state.objects);h.click('photo-position-crop');drag(h,h.node('photo'),{end:null});h.select('other');
  emit(h.r,'pointermove',{clientX:85,clientY:70});emit(h.r,'pointerup');assert.deepEqual(h.el.state.objects,before);assert.equal(h.el.state.selected,'other');assert.equal(h.undo.length,0);
  h.select('photo');assert.equal(h.el.uxPhotoPositionActive(h.object()),false);
});
test('replacement upload exits crop mode and an old pointer cannot overwrite new upload/crop',t=>{
  const h=setup(t);h.click('photo-position-crop');drag(h,h.node('photo'),{end:null});h.object().uxUploadId='new-upload';h.object().uxPhotoCrop={zoom:1,x:0,y:0,angle:0};h.el.sync();
  emit(h.r,'pointercancel');assert.equal(h.object().uxUploadId,'new-upload');assert.deepEqual(h.object().uxPhotoCrop,{zoom:1,x:0,y:0,angle:0});assert.equal(h.el.uxPhotoPositionActive(h.object()),false);assert.equal(h.undo.length,0);
});
test('selection change cancels shared field movement without restoring the old selection or moving another mask',t=>{
  const h=setup(t),before=structuredClone(h.el.state.objects);drag(h,h.node('photo'),{end:null});h.select('other');emit(h.r,'pointermove',{clientX:90,clientY:60});emit(h.r,'pointerup');
  assert.deepEqual(h.el.state.objects,before);assert.equal(h.el.state.selected,'other');assert.equal(h.undo.length,0);
});
test('upload during field movement cancels geometry only and retains replacement image and its crop',t=>{
  const h=setup(t),before=geometry(h.object());drag(h,h.node('photo'),{end:null});h.object().uxUploadId='new-upload';h.object().uxPhotoCrop={zoom:2,x:.1,y:.3,angle:8};h.el.sync();emit(h.r,'pointercancel');
  assert.deepEqual(geometry(h.object()),before);assert.equal(h.object().uxUploadId,'new-upload');assert.deepEqual(h.object().uxPhotoCrop,{zoom:2,x:.1,y:.3,angle:8});assert.equal(h.undo.length,0);
});
test('fresh upload preserves moved slot and starts in field mode; hidden crop controls cannot change image',t=>{
  const h=setup(t,{uploaded:false});drag(h,h.node('photo'));const before=geometry(h.object());h.object().uxUploadId='upload';h.el.sync();
  assert.equal(h.el.uxPhotoPositionActive(h.object()),false);assert.deepEqual(geometry(h.object()),before);
  const range=h.panel.querySelector('input');range.value='3';emit(range,'input');h.click('photo-position-reset');assert.equal(h.object().uxPhotoCrop,undefined);
});
test('crop slider Escape restores prior crop without changing field and remove preserves the field',t=>{
  const h=setup(t),before=structuredClone(h.object());h.click('photo-position-crop');const range=h.panel.querySelector('input');range.value='3';emit(range,'input');assert.equal(h.object().uxPhotoCrop.zoom,3);emit(range,'keydown',{key:'Escape'});
  assert.deepEqual(h.object(),before);h.click('photo-position-remove');assert.equal(h.object().uxUploadId,undefined);assert.deepEqual(geometry(h.object()),geometry(before));
});

test('small shared drag cancels the earlier real upload tap listener, while a stationary default tap still offers replacement',t=>{
  const h=setup(t,{legacyTap:true});drag(h,h.node('photo'),{dx:1,dy:0});
  assert.equal(h.object().x,51);assert.equal(h.uploadRequests(),0,'a movement below the legacy 6px tap threshold must not open a file picker');
  drag(h,h.node('photo'),{dx:0,dy:0});assert.equal(h.uploadRequests(),1);
});
test('explicit crop mode cancels the earlier real upload tap listener even without movement',t=>{
  const h=setup(t,{legacyTap:true});h.click('photo-position-crop');drag(h,h.node('photo'),{dx:0,dy:0});assert.equal(h.uploadRequests(),0);
});
test('removing a colour-edited photo clears photo colour but retains the exact mask geometry',t=>{
  const h=setup(t,{slot:{uxPhotoColor:'original'}}),before=geometry(h.object());h.click('photo-position-crop');h.click('photo-position-remove');
  assert.equal(h.object().uxPhotoColor,undefined);assert.equal(h.object().uxUploadId,undefined);assert.deepEqual(geometry(h.object()),before);
});
test('photo keyboard focus survives shadow-root SVG replacement and never jumps back from another field',t=>{
  const h=setup(t,{rights:{move:true,replace:false}}),host=new Node('gravuru-configurator');h.r.host=host;
  let focused=document.body;
  const inside=node=>{for(let n=node;n;n=n.parent)if(n===h.r)return true;return false;};
  Object.defineProperty(document,'activeNode',{get:()=>focused});
  Object.defineProperty(document,'activeElement',{get:()=>inside(focused)?host:focused,set:value=>{focused=value;}});
  Object.defineProperty(h.r,'activeElement',{get:()=>inside(focused)?focused:null});
  h.node('photo').focus();assert.equal(document.activeElement,host);assert.equal(h.r.activeElement,h.node('photo'));
  emit(h.r.activeElement,'keydown',{key:'ArrowRight'});emit(h.r.activeElement,'keydown',{key:'ArrowRight'});assert.equal(h.object().x,52);assert.equal(h.r.activeElement,h.node('photo'));
  const input=h.panel.querySelector('input');input.focus();h.el.render();assert.equal(document.activeElement,host);assert.equal(h.r.activeElement,input);
});

// Execute the actual floating toolbar update through its real render/sync wrappers.
// The photo mode and transitions below are installed by the production module.
function floatingPhotoToolbar(h){
  const source=fs.readFileSync(new URL('./direct-editing.mjs',import.meta.url),'utf8');
  const begin=source.indexOf('  function update(){'),end=source.indexOf('  function openText(id){',begin);
  const wrap=source.indexOf("  for(const name of ['render','sync']){");
  assert(begin>=0&&end>begin&&wrap>=0);
  const panel=new Node('section');panel.innerHTML='<label data-direct-size-label></label><button data-direct-turn></button><button data-ux=delete></button>';
  const selectionName=new Node('span'),primary=new Node('div'),secondary=new Node('div'),tail=new Node('div');
  panel.append(selectionName,primary,secondary,tail);
  panel.classList={toggle(){}};h.el.style={setProperty(){}};
  const color=new Node('input');color.parentElement=new Node('label');
  const stage=h.r.querySelector('.stage');stage.getBoundingClientRect=()=>({width:320,height:240});
  const preview=new Node('div');preview.className='ux-preview';h.r.append(preview);preview.append(stage);
  h.r.querySelector('.scene').getBoundingClientRect=()=>({width:300,height:200});
  const fullscreen=new Node('dialog');fullscreen.className='c-large-preview';fullscreen.open=false;h.r.append(fullscreen);
  const context={textToolbarPosition,placeDirectToolbar,fontDisplayName,config:{profile:{designs:[]}},extras:new Node('div'),matchMedia:()=>({matches:false}),CSS:{escape:value=>value},el:h.el,r:h.r,selected:h.selected,stage,panel,color,openButton:new Node('button'),confirm:new Node('div'),font:new Node('button'),presets:new Node('div'),size:new Node('input'),freeColor:false,colorTool:false,paletteColors:[],editing:null,close(){},can:(o,right)=>o&&!o.uxLocked&&!o.uxHidden&&h.el.uxCanEdit?.(o,right)!==false};
  Object.assign(context,{selectionName,primary,secondary,tail,stableDoorbell:false,stableHost:null});
  vm.runInNewContext(source.slice(begin,end)+source.slice(wrap,source.indexOf("  window.addEventListener('resize',update)",wrap))+'update();',context);
  return panel;
}
test('floating photo toolbar yields to crop arrows across real mode and render transitions; panel editing stays available',t=>{
  const h=setup(t),floating=floatingPhotoToolbar(h);
  assert.equal(floating.hidden,false,'field mode keeps the existing floating edit action');
  h.click('photo-position-crop');assert.equal(floating.hidden,true);assert.equal(h.panel.hidden,false);
  assert.equal(h.button('photo-position-move').hidden,false,'photo controls remain available');
  h.el.render();assert.equal(floating.hidden,true,'render does not reintroduce the overlap');
  h.click('photo-position-reset');assert.equal(floating.hidden,true,'crop adjustments keep the floating action hidden');
  h.click('photo-position-move');assert.equal(floating.hidden,false,'returning to field movement restores the existing toolbar');
});
