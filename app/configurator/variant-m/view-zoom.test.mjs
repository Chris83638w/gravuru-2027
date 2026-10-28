import test from 'node:test';
import assert from 'node:assert/strict';
import {installViewZoom} from './view-zoom.mjs';

class NodePort{
 constructor(){this.children=[];this.listeners={};this.dataset={};this.attributes=[];this.properties=new Map();this.style={setProperty:(key,value)=>this.properties.set(key,value)};this.hidden=false;this.capture=new Set();}
 append(...nodes){this.children.push(...nodes);for(const node of nodes)node.parentNode=this;}
 setAttribute(key,value){this[key]=value;}
 removeAttribute(key){delete this[key];}querySelectorAll(){return [];}replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 dispatch(type,event){for(const fn of this.listeners[type]||[])fn(event);}
 setPointerCapture(id){this.capture.add(id);}hasPointerCapture(id){return this.capture.has(id);}releasePointerCapture(id){this.capture.delete(id);}
 set innerHTML(value){this.html=value;this.buttons=new Map([...value.matchAll(/data-view-action="([^"]+)"/g)].map(([,action])=>{const node=new NodePort();node.dataset.viewAction=action;node.control=true;return [action,node];}));}
 querySelector(selector){return this.buttons?.get(selector.match(/data-view-action=([^\]]+)/)?.[1])||null;}
 closest(selector){if(selector==='[data-view-action]')return this.dataset.viewAction?this:null;if(selector==='[data-ux-handle]')return null;if(selector==='.scene [data-object]')return this.object?this:null;if(selector.includes('button'))return this.control?this:null;return null;}
}
async function runtime(t){
 const saved=new Map(),frames=new Map(),windowPort=new NodePort();let frameId=0,reduced=false;
 const set=(key,value)=>{saved.set(key,globalThis[key]);globalThis[key]=value;};
 set('document',{createElement:()=>new NodePort(),createElementNS:()=>new NodePort()});set('window',windowPort);set('fetch',async()=>({ok:true,text:async()=>''}));set('matchMedia',query=>({matches:query==='(prefers-reduced-motion: reduce)'&&reduced}));set('requestAnimationFrame',fn=>{frames.set(++frameId,fn);return frameId;});set('cancelAnimationFrame',id=>frames.delete(id));set('ResizeObserver',class{observe(){}});set('CSS',{escape:value=>value});
 t.after(()=>{windowPort.dispatch('pagehide',{});for(const [key,value]of saved)if(value===undefined)delete globalThis[key];else globalThis[key]=value;});
 const stage=new NodePort(),holder=new NodePort(),r=new NodePort(),el=new NodePort(),object=new NodePort();object.object=true;object.dataset.object='text';
 stage.getBoundingClientRect=()=>({left:10,top:20,right:810,bottom:520,width:800,height:500});holder.getBoundingClientRect=()=>({left:110,top:70,right:710,bottom:470,width:600,height:400});
 stage.querySelectorAll=()=>[holder];stage.contains=node=>node===holder||node===object;stage.append(holder);
 r.querySelector=selector=>selector==='.stage'?stage:selector==='.plate-holder'?holder:null;
 let handleRefresh=0,toolbarRefresh=0,photoMode=false,cancels=0;
 el.state={designId:'D1',width:120,height:80,objects:[{id:'text',type:'text',x:40,y:30,w:20,h:5,rotation:15,uxPhotoCrop:{zoom:1.4,x:.1}}],ui:{textToolbarPlacement:'plate'}};el.render=()=>{};el.sync=()=>{};el.uxRefreshSelectionHandles=()=>handleRefresh++;el.uxRefreshTextToolbar=()=>toolbarRefresh++;el.uxPhotoPositionActive=()=>photoMode;el.uxCancelObjectGesture=()=>cancels++;
 const original=structuredClone(el.state),api=await installViewZoom({el,r,selected:()=>el.state.objects[0]}),controls=stage.children.find(n=>n.className==='ux-view-zoom');
 const event=(target=holder,extra={})=>({target,button:0,pointerType:'touch',pointerId:1,clientX:410,clientY:270,deltaY:0,deltaMode:0,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},composedPath:()=>[target,stage,r,el],...extra});
 const frame=time=>{const current=[...frames];frames.clear();for(const [,fn]of current)fn(time);};
 return {el,r,stage,holder,object,original,api,controls,event,photo:value=>{photoMode=value;},reduced:value=>{reduced=value;},frame,flush:()=>{let time=0;while(frames.size){assert.ok(time<10000,'animation must settle');frame(time+=16);}},get handles(){return handleRefresh;},get toolbar(){return toolbarRefresh;},get cancels(){return cancels;}};
}
test('real view adapter scales visual layers, refreshes unscaled overlays and never edits the saved design',async t=>{
 const f=await runtime(t);assert.equal(f.el.uxViewZoom(),1);assert.equal(f.holder.properties.get('transform'),'translate(0px,0px) scale(1)');
 f.el.uxSetViewZoom(2);assert.equal(f.el.uxViewZoom(),2);assert.equal(f.holder.properties.get('transform'),'translate(0px,0px) scale(2)');assert.ok(f.handles>=2&&f.toolbar>=2);
 const wheel=f.event(f.holder,{deltaY:-120,clientX:450});f.el.dispatch('wheel',wheel);assert.equal(wheel.prevented,true);assert.ok(f.api.view().scale>2);assert.notEqual(f.api.view().x,0);
 f.controls.dispatch('click',f.event(f.controls.buttons.get('fit')));assert.deepEqual(f.api.view(),{scale:1,x:0,y:0});assert.equal(f.controls.buttons.get('minus').disabled,true);
 f.controls.dispatch('click',f.event(f.controls.buttons.get('level')));assert.equal(f.api.view().scale,1.5);assert.equal(f.controls.buttons.get('level').textContent,'150 %');
 assert.deepEqual(f.el.state,f.original);
});
test('real pointer adapter captures blank pan and pinch, leaves object drag and photo-crop input alone',async t=>{
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
test('small touch targets animate gently, refresh overlays each frame and stop on a new gesture; reduced motion jumps directly',async t=>{
 const f=await runtime(t),find=f.r.querySelector;const scene={isConnected:false,cloneNode:()=>new NodePort(),querySelector:()=>({getBoundingClientRect:()=>({left:395,top:267,width:30,height:6})})};f.r.querySelector=selector=>selector==='.scene'?scene:find(selector);
 const tap=()=>{f.el.dispatch('pointerdown',f.event(f.object,{pointerId:12}));f.el.dispatch('pointerup',f.event(f.object,{pointerId:12}));f.el.sync();};
 tap();f.frame(0);f.frame(16);const refreshed=f.handles;f.frame(106);assert.ok(f.el.uxViewZoom()>1&&f.el.uxViewZoom()<4);assert.ok(f.handles>refreshed);f.frame(196);assert.equal(f.el.uxViewZoom(),4);
 f.el.uxFitView();tap();f.frame(200);f.frame(216);f.frame(276);const stopped=f.api.view();f.el.dispatch('pointerdown',f.event(f.holder,{pointerId:13}));f.frame(500);assert.deepEqual(f.api.view(),stopped);f.el.dispatch('pointerup',f.event(f.holder,{pointerId:13}));
 f.el.uxFitView();f.reduced(true);tap();f.frame(600);assert.equal(f.el.uxViewZoom(),4);assert.deepEqual(f.el.state,f.original);
});
