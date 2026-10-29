import test from 'node:test';
import assert from 'node:assert/strict';
import {installViewZoom} from './view-zoom.mjs';

class NodePort{
 constructor(){this.children=[];this.listeners={};this.dataset={};this.attributes=[];this.properties=new Map();this.style={setProperty:(key,value)=>this.properties.set(key,value)};this.hidden=false;this.capture=new Set();}
 append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parentNode=this;}
 setAttribute(key,value){this[key]=value;}getAttribute(key){return this[key];}
 removeAttribute(key){delete this[key];}querySelectorAll(){return [];}replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(f=>f!==fn);}
 dispatch(type,event){for(const fn of this.listeners[type]||[])fn(event);}
 setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
 set innerHTML(value){this.html=value;this.buttons=new Map([...value.matchAll(/data-view-action="([^"]+)"/g)].map(([,action])=>{const node=new NodePort();node.dataset.viewAction=action;node.control=true;return [action,node];}));}
 querySelector(selector){return this.buttons?.get(selector.match(/data-view-action=([^\]]+)/)?.[1])||null;}
 closest(selector){if(selector==='.plate-holder'||selector==='.plate-holder,.acryl-backdrop,.acryl-base')return this.plate?this:null;if(selector==='[data-view-action]')return this.dataset.viewAction?this:null;if(selector==='[data-ux-handle]')return null;if(selector==='.scene [data-object],[data-ux-handle]')return this.object||this.handle?this:null;if(selector==='.scene [data-object]')return this.object?this:null;if(selector.includes('button'))return this.control?this:null;return null;}
}
async function runtime(t){
 const saved=new Map(),frames=new Map(),windowPort=new NodePort();let frameId=0,reduced=false,mobile=false;
 const set=(key,value)=>{saved.set(key,globalThis[key]);globalThis[key]=value;};
 set('document',{createElement:()=>new NodePort(),createElementNS:()=>new NodePort()});set('window',windowPort);set('fetch',async()=>({ok:true,text:async()=>''}));set('matchMedia',query=>({matches:query==='(prefers-reduced-motion: reduce)'?reduced:query==='(max-width:767px)'&&mobile}));set('requestAnimationFrame',fn=>{frames.set(++frameId,fn);return frameId;});set('cancelAnimationFrame',id=>frames.delete(id));set('ResizeObserver',class{observe(){}});set('CSS',{escape:value=>value});
 t.after(()=>{windowPort.dispatch('pagehide',{});for(const [key,value]of saved)if(value===undefined)delete globalThis[key];else globalThis[key]=value;});
 const stage=new NodePort(),holder=new NodePort(),r=new NodePort(),el=new NodePort(),object=new NodePort();holder.plate=true;object.object=true;object.dataset.object='text';
 stage.getBoundingClientRect=()=>({left:10,top:20,right:810,bottom:520,width:800,height:500});holder.getBoundingClientRect=()=>({left:110,top:70,right:710,bottom:470,width:600,height:400});
 stage.querySelectorAll=()=>[holder];stage.contains=node=>node===holder||node===object;stage.append(holder);
 r.querySelector=selector=>selector==='.stage'?stage:selector==='.plate-holder'?holder:null;
 let handleRefresh=0,toolbarRefresh=0,photoMode=false,cancels=0;
 el.state={designId:'D1',width:120,height:80,objects:[{id:'text',type:'text',x:40,y:30,w:20,h:5,rotation:15,uxPhotoCrop:{zoom:1.4,x:.1}}],ui:{textToolbarPlacement:'plate'}};el.render=()=>{};el.sync=()=>{};el.uxRefreshSelectionHandles=()=>handleRefresh++;el.uxRefreshTextToolbar=()=>toolbarRefresh++;el.uxPhotoPositionActive=()=>photoMode;el.uxCancelObjectGesture=()=>cancels++;
 let selected=true;const original=structuredClone(el.state),api=await installViewZoom({el,r,selected:()=>selected?el.state.objects[0]:null}),controls=stage.children.find(n=>n.className==='ux-view-zoom');
 const event=(target=holder,extra={})=>({target,button:0,pointerType:'touch',pointerId:1,clientX:410,clientY:270,deltaY:0,deltaMode:0,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},composedPath:()=>[target,stage,r,el],...extra});
 const frame=time=>{const current=[...frames];frames.clear();for(const [,fn]of current)fn(time);};
 return {el,r,stage,holder,object,original,api,controls,event,deselect:()=>{selected=false;},photo:value=>{photoMode=value;},reduced:value=>{reduced=value;},mobile:value=>{mobile=value;},frame,flush:()=>{let time=0;while(frames.size){assert.ok(time<10000,'animation must settle');frame(time+=16);}},get handles(){return handleRefresh;},get toolbar(){return toolbarRefresh;},get cancels(){return cancels;}};
}
test('wheel over text, motif artwork links and selection handles zooms only the view; toolbar controls remain native',async t=>{
 const f=await runtime(t),before=structuredClone(f.el.state);
 for(const type of ['text','motif','handle']){
  f.el.state.objects[0].type=type==='handle'?'text':type;
  const target=new NodePort();target.object=type!=='handle';target.handle=type==='handle';target.control=true;
  const event=f.event(target,{deltaY:-80,pointerType:'mouse'}),zoom=f.api.view().scale;
  f.el.dispatch('wheel',event);assert.equal(event.prevented,true,type);assert.ok(f.api.view().scale>zoom,type);
 }
 f.el.state.objects[0].type=before.objects[0].type;assert.deepEqual(f.el.state,before);
 const input=new NodePort();input.control=true;const event=f.event(input,{deltaY:-80});
 const zoom=f.api.view().scale;f.el.dispatch('wheel',event);assert.equal(event.prevented,undefined);assert.equal(f.api.view().scale,zoom);
 f.mobile(true);const touchScreen=f.event(f.object,{deltaY:-80});f.el.dispatch('wheel',touchScreen);assert.equal(touchScreen.prevented,undefined);
});

test('real view adapter uses full width, refreshes overlays and never edits the saved design',async t=>{
 const f=await runtime(t);assert.equal(f.el.uxViewZoom(),1);assert.ok(f.holder.properties.get('transform').endsWith('scale(1)'));
 f.el.uxSetViewZoom(2);assert.equal(f.el.uxViewZoom(),2);assert.ok(f.holder.properties.get('transform').endsWith('scale(2)'));assert.ok(f.handles>=2&&f.toolbar>=2);
 const wheel=f.event(f.holder,{deltaY:-120,clientX:450});f.el.dispatch('wheel',wheel);assert.equal(wheel.prevented,true);assert.ok(f.api.view().scale>2);assert.notEqual(f.api.view().x,0);
 f.api.fit();assert.deepEqual(f.api.view(),{scale:1,x:0,y:0});assert.equal(f.controls,undefined);assert.deepEqual(f.el.state,f.original);
});test('real pointer adapter captures blank pan and pinch, leaves object drag and photo-crop input alone',async t=>{
 const f=await runtime(t);f.el.uxSetViewZoom(2);
 const drag=f.event(f.object,{pointerId:3,clientX:320});f.el.dispatch('pointerdown',drag);assert.equal(drag.prevented,undefined);
 const second=f.event(f.holder,{pointerId:4,clientX:500});f.el.dispatch('pointerdown',second);assert.equal(second.prevented,true);assert.equal(f.cancels,1);assert.equal(f.el.capture.has(3),true);assert.equal(f.el.capture.has(4),true);
 const move=f.event(f.holder,{pointerId:4,clientX:590});f.el.dispatch('pointermove',move);assert.equal(move.prevented,true);assert.equal(f.el.uxViewZoom(),3);
 f.el.dispatch('pointerup',f.event(f.holder,{pointerId:4}));f.el.dispatch('pointerup',f.event(f.holder,{pointerId:3}));assert.equal(f.el.capture.size,0);
 const down=f.event(f.holder,{pointerType:'mouse',pointerId:8});f.el.dispatch('pointerdown',down);assert.equal(down.prevented,true);const before=f.api.view();f.el.dispatch('pointermove',f.event(f.holder,{pointerType:'mouse',pointerId:8,clientX:430,clientY:280}));assert.equal(f.api.view().x,before.x+20);assert.equal(f.api.view().y,before.y+10);f.el.dispatch('pointerup',f.event(f.holder,{pointerType:'mouse',pointerId:8}));
 f.photo(true);const crop=f.event(f.object,{pointerId:9}),wheel=f.event(f.holder,{deltaY:-80});f.el.dispatch('pointerdown',crop);f.el.dispatch('wheel',wheel);assert.equal(crop.prevented,undefined);assert.equal(wheel.prevented,undefined);
 assert.deepEqual(f.el.state,f.original);
});
test('view resets on a different design or dimensions without putting zoom into undo/draft state',async t=>{
 const f=await runtime(t);f.el.uxSetViewZoom(4);f.el.state.designId='D2';f.el.render();f.flush();assert.equal(f.el.uxViewZoom(),1);assert.equal(Object.hasOwn(f.el.state,'zoom'),false);assert.deepEqual(f.el.state.objects,f.original.objects);assert.deepEqual(f.el.state.ui,f.original.ui);
});
test('navigation fits smoothly, stops on a new gesture and obeys reduced motion; text taps never zoom',async t=>{
 const f=await runtime(t);f.mobile(true);f.api.refresh();f.flush();f.el.uxSetViewZoom(3);
 const tap=()=>{f.el.dispatch('pointerdown',f.event(f.object,{pointerId:12}));f.el.dispatch('pointerup',f.event(f.object,{pointerId:12}));f.el.sync();};
 const navigate=()=>f.r.dispatch('click',{target:{closest:()=>({dataset:{ux:'mobile-next'}})}});
 tap();f.flush();assert.equal(f.el.uxViewZoom(),3);navigate();f.frame(0);f.frame(125);assert.ok(f.el.uxViewZoom()>1&&f.el.uxViewZoom()<3);f.frame(250);assert.equal(f.el.uxViewZoom(),1);
 f.el.uxSetViewZoom(3);navigate();f.frame(300);f.frame(400);const stopped=f.api.view();f.el.dispatch('pointerdown',f.event(f.holder,{pointerId:13}));f.frame(600);assert.deepEqual(f.api.view(),stopped);f.el.dispatch('pointerup',f.event(f.holder,{pointerId:13}));
 f.reduced(true);navigate();assert.equal(f.el.uxViewZoom(),1);tap();f.flush();assert.equal(f.el.uxViewZoom(),1);assert.deepEqual(f.el.state,f.original);
});
function touchBatch(f,contacts,changed=contacts){return f.event(f.object,{touches:contacts,changedTouches:changed});}
function contact(f,id,x,y=270){return {identifier:id,target:f.object,clientX:x,clientY:y};}
test('two simultaneous contacts on selected text zoom the view, never the 10 mm text or saved geometry',async t=>{
 const f=await runtime(t);Object.assign(f.el.state.objects[0],{text:'Meyer',size:10});const saved=structuredClone(f.el.state);
 const start=touchBatch(f,[contact(f,31,360),contact(f,32,460)]);f.el.dispatch('touchstart',start);assert.equal(start.prevented,true);
 const moved=touchBatch(f,[contact(f,31,315),contact(f,32,505)]);f.el.dispatch('touchmove',moved);assert.equal(moved.prevented,true);assert.equal(f.el.uxViewZoom(),1.9);
 assert.deepEqual(f.el.state,saved);assert.equal(f.el.state.objects[0].size,10);
 // Compatibility pointer events cannot hand either contact to the object handler.
 for(const type of ['pointerdown','pointermove','pointerup']){const e=f.event(f.object,{pointerId:31,clientX:315});f.el.dispatch(type,e);assert.equal(e.stopped,true,type);}
 f.el.dispatch('touchend',touchBatch(f,[contact(f,31,315)],[contact(f,32,505)]));
 const late=touchBatch(f,[contact(f,31,200)]);f.el.dispatch('touchmove',late);assert.equal(late.stopped,true);assert.equal(f.el.uxViewZoom(),1.9);
 f.el.dispatch('touchend',touchBatch(f,[contact(f,99,900)],[contact(f,31,200)]));assert.deepEqual(f.el.state,saved); // an unrelated finger elsewhere must not keep the view locked
 const next=f.event(f.object,{pointerId:40});f.el.dispatch('pointerdown',next);assert.equal(next.prevented,undefined,'a new single-finger drag remains available');
});
test('simultaneous touch handover restores a started corner resize and does not create a late click',async t=>{
 const f=await runtime(t);Object.assign(f.el.state.objects[0],{text:'Meyer',size:10});const saved=structuredClone(f.el.state);let cancelled=0;
 f.el.uxCancelObjectGesture=()=>{cancelled++;f.el.state=structuredClone(saved);};
 f.el.dispatch('pointerdown',f.event(f.object,{pointerId:41,clientX:360}));f.el.state.objects[0].size=19;f.el.state.objects[0].w*=1.9;
 f.el.dispatch('touchstart',touchBatch(f,[contact(f,41,360),contact(f,42,460)]));assert.ok(cancelled>=1);assert.deepEqual(f.el.state,saved);
 f.el.dispatch('touchmove',touchBatch(f,[contact(f,41,300),contact(f,42,520)]));assert.equal(f.el.uxViewZoom(),2.2);assert.deepEqual(f.el.state,saved);
 f.el.dispatch('touchcancel',touchBatch(f,[],[contact(f,41,300),contact(f,42,520)]));
 const click=f.event(f.object);f.el.dispatch('click',click);assert.equal(click.stopped,true);assert.deepEqual(f.el.state,saved);
});
test('two fingers also leave the customer photo crop unchanged; single-finger crop remains available',async t=>{
 const f=await runtime(t);f.photo(true);const saved=structuredClone(f.el.state);let cancelled=0;f.el.uxCancelPhotoGesture=()=>cancelled++;
 const one=touchBatch(f,[contact(f,51,360)]);f.el.dispatch('touchstart',one);assert.equal(one.prevented,undefined);
 f.el.dispatch('touchstart',touchBatch(f,[contact(f,51,360),contact(f,52,460)]));assert.ok(cancelled>0);
 f.el.dispatch('touchmove',touchBatch(f,[contact(f,51,310),contact(f,52,510)]));assert.equal(f.el.uxViewZoom(),2);assert.deepEqual(f.el.state,saved);
 f.el.dispatch('touchend',touchBatch(f,[],[contact(f,51,310),contact(f,52,510)]));
 const crop=f.event(f.object,{pointerId:53});f.el.dispatch('pointerdown',crop);assert.equal(crop.prevented,undefined);
});

test('touch batches continue on a replaced SVG target and remove direct listeners when complete',async t=>{
 const f=await runtime(t),saved=structuredClone(f.el.state),start=[contact(f,61,360),contact(f,62,460)];f.el.dispatch('touchstart',touchBatch(f,start));
 assert.equal(f.object.listeners.touchmove.length,1);
 f.object.dispatch('touchmove',touchBatch(f,[contact(f,61,310),contact(f,62,510)]));assert.equal(f.el.uxViewZoom(),2);assert.deepEqual(f.el.state,saved);
 f.object.dispatch('touchend',touchBatch(f,[],start));assert.equal(f.object.listeners.touchmove.length,0);assert.equal(f.object.listeners.touchend.length,0);assert.equal(f.object.listeners.touchcancel.length,0);
});

test('text field focus and selection never zoom on mobile or desktop; navigation still fits',async t=>{
 const f=await runtime(t);for(const mobile of [false,true]){f.mobile(mobile);f.api.refresh();f.flush();f.r.dispatch('focusin',{target:{closest:()=>({dataset:{uxText:'text'}})}});f.flush();assert.equal(f.api.view().scale,1);f.el.uxSetViewZoom(2);f.r.dispatch('focusin',{target:{closest:()=>({dataset:{uxText:'text'}})}});f.flush();assert.equal(f.api.view().scale,2);f.api.fit();}
 assert.equal(f.stage.children.some(n=>n.className==='ux-view-focus'),false);assert.equal(f.el.uxFocusView,undefined);
 f.el.uxSetViewZoom(2);f.r.dispatch('click',{target:{closest:()=>({dataset:{ux:'mobile-next'}})}});f.flush();assert.equal(f.api.view().scale,1);assert.deepEqual(f.el.state,f.original);
});
test('double-clicks on free plate never zoom and text double-clicks remain available for editing',async t=>{
 const f=await runtime(t);for(const mobile of [false,true])for(const scale of [1,2]){f.mobile(mobile);f.el.uxSetViewZoom(scale);const text=f.event(f.object),blank=f.event(f.holder);f.el.dispatch('dblclick',text);f.el.dispatch('dblclick',blank);f.flush();assert.equal(text.stopped,undefined);assert.equal(blank.stopped,undefined);assert.equal(f.api.view().scale,scale);}
 assert.deepEqual(f.el.state,f.original);
});
test('two sequential blank taps do not zoom or reset an already zoomed view',async t=>{
 const f=await runtime(t);f.mobile(true);for(const scale of [1,2]){f.el.uxSetViewZoom(scale);for(const id of [101,102]){f.el.dispatch('pointerdown',f.event(f.holder,{pointerId:id}));f.el.dispatch('pointerup',f.event(f.holder,{pointerId:id}));}f.flush();assert.equal(f.api.view().scale,scale);assert.deepEqual(f.el.state,f.original);}
});

test('keyboard resize and deselection preserve manual zoom without changing saved geometry',async t=>{
 const f=await runtime(t);f.mobile(true);f.api.refresh();f.flush();f.el.uxSetViewZoom(2);
 f.stage.getBoundingClientRect=()=>({left:10,top:20,right:810,bottom:250,width:800,height:230});f.api.refresh();f.flush();assert.equal(f.api.view().scale,2);assert.deepEqual(f.el.state,f.original);
 f.deselect();f.el.sync();f.flush();assert.equal(f.api.view().scale,2);assert.deepEqual(f.el.state,f.original);
});

test('zooming and dragging install no loupe or zoom controls on mobile and desktop',async t=>{
 const f=await runtime(t);
 for(const mobile of [false,true])for(const scale of [1,2,4]){
  f.mobile(mobile);f.el.uxSetViewZoom(scale);f.el.dispatch('pointerdown',f.event(f.object,{pointerId:70}));f.el.dispatch('pointermove',f.event(f.object,{pointerId:70,clientX:430}));f.el.dispatch('pointerup',f.event(f.object,{pointerId:70,clientX:430}));f.el.render();f.flush();
  assert.equal(f.stage.children.some(n=>['ux-drag-loupe','ux-view-zoom','ux-view-whole'].includes(n.className)),false);
  assert.equal(f.el.uxDragLens,undefined);assert.equal(f.api.view().scale,scale);assert.deepEqual(f.el.state,f.original);
 }
});
test('desktop wheel zooms in and out at the cursor and stays within 100–400 percent without buttons',async t=>{
 const f=await runtime(t);assert.equal(f.controls,undefined);
 for(let i=0;i<10;i++)f.el.dispatch('wheel',f.event(f.object,{deltaY:-300,clientX:450,pointerType:'mouse'}));
 assert.equal(f.api.view().scale,4);assert.notEqual(f.api.view().x,0);
 for(let i=0;i<10;i++)f.el.dispatch('wheel',f.event(f.object,{deltaY:300,clientX:450,pointerType:'mouse'}));
 assert.deepEqual(f.api.view(),{scale:1,x:0,y:0});assert.deepEqual(f.el.state,f.original);
});test('mobile zooms in and back out only with two fingers, with no wheel or reset button',async t=>{
 const f=await runtime(t);f.mobile(true);f.api.refresh();f.flush();
 const e=f.event(f.holder,{deltaY:-120});f.el.dispatch('wheel',e);assert.equal(f.el.uxViewZoom(),1);assert.equal(e.prevented,undefined);
 f.el.dispatch('touchstart',touchBatch(f,[contact(f,81,360),contact(f,82,460)]));
 f.el.dispatch('touchmove',touchBatch(f,[contact(f,81,310),contact(f,82,510)]));assert.equal(f.el.uxViewZoom(),2);
 assert.equal(f.stage.children.some(n=>n.className==='ux-view-whole'),false);
 f.el.dispatch('touchmove',touchBatch(f,[contact(f,81,370),contact(f,82,450)]));assert.equal(f.el.uxViewZoom(),1);
 f.el.dispatch('touchend',touchBatch(f,[],[contact(f,81,370),contact(f,82,450)]));assert.deepEqual(f.el.state,f.original);
});