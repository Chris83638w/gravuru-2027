import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./refinements.mjs',import.meta.url),'utf8');
const gestures=source.slice(source.indexOf('  let resize=null;'),source.indexOf("  r.addEventListener('click',async e=>{"));
assert.ok(gestures.includes('function pointerObjectItem'));

function fixture({motif={},permission=true}={}){
  const handlers={},capture=new Set(),undo=[],tabs=[];
  const text={id:'text',type:'text',x:50,y:40,w:60,h:40},house={id:'house',type:'motif',x:50,y:28,w:20,h:20,...motif};
  const el={state:{designId:'design',selected:'house',objects:[text,house]},point:e=>({x:e.clientX,y:e.clientY}),uxCanEdit:()=>permission,normalize(){},render(){},sync(){},record:s=>undo.push(s)};
  const selected=()=>el.state.objects.find(o=>o.id===el.state.selected);
  const style={visibility:'visible',display:'inline',opacity:'1',fill:'rgb(0, 0, 0)',fillOpacity:'1',stroke:'none',strokeOpacity:'1',strokeWidth:'0'};
  const scene={closest:s=>s==='.scene'?scene:null,ownerDocument:{defaultView:{getComputedStyle:n=>({...style,...n.style})}},createSVGPoint:()=>({x:0,y:0,matrixTransform(matrix){return {x:this.x/matrix.scale,y:this.y/matrix.scale};}})};
  const group=id=>({localName:'g',dataset:{object:id},parentElement:scene,closest:s=>s.includes('[data-object]')?groups[id]:s==='.scene'?scene:null});
  const groups={text:group('text'),house:group('house')};
  const shape=(owner,{helper=false,fill=true,stroke=false,...extra}={})=>({localName:helper?'rect':'path',parentElement:groups[owner],closest:s=>s.includes('[data-object]')?groups[owner]:s==='.scene'?scene:null,getAttribute:k=>k==='fill'&&helper?'transparent':null,isPointInFill:()=>fill,isPointInStroke:()=>stroke,getScreenCTM:()=>({inverse:()=>({scale:2})}),...extra});
  const textRect=shape('text',{helper:true}),houseRect=shape('house',{helper:true}),housePath=shape('house'),glyph=shape('text');
  groups.text.firstElementChild=textRect;groups.house.firstElementChild=houseRect;
  let hits=[textRect,groups.text,housePath,groups.house,houseRect];
  const root={elementsFromPoint:()=>hits,addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn)};
  const holder={setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id)};
  const context={r:root,el,selected,showTab:s=>tabs.push(s),holder,window:{},structuredClone,scaleObject:(o,f)=>({...o,w:o.w*f,h:o.h*f}),selectionScaleFactor:()=>1.2};
  vm.runInNewContext(gestures,context);
  function emit(type,target=textRect,extra={}){const e={target,button:0,pointerId:1,clientX:50,clientY:28,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of handlers[type]||[])fn(e);return e;}
  function drag(target=textRect,extra={}){emit('pointerdown',target,extra);emit('pointermove',target,{...extra,clientX:54,clientY:30});emit('pointerup',target,{...extra,clientX:54,clientY:30});}
  return {el,root,scene,groups,textRect,houseRect,housePath,glyph,shape,emit,drag,capture,undo,tabs,setHits:v=>{hits=v;}};
}

test('mouse and touch on visible motif through blank text helper move only motif, retaining size and undo',()=>{
  for(const pointerType of ['mouse','touch']){
    const f=fixture();f.drag(f.textRect,{pointerType});
    assert.equal(f.el.state.selected,'house');assert.equal(f.el.state.objects[1].x,54);assert.equal(f.el.state.objects[0].x,50);
    assert.deepEqual([f.el.state.objects[1].w,f.el.state.objects[1].h],[20,20]);assert.equal(f.undo.length,1);assert.deepEqual(f.tabs,[]);
    f.el.state=structuredClone(f.undo[0]);f.el.state.selected=null;f.drag(f.textRect,{pointerType,pointerId:2});assert.equal(f.el.state.selected,'house');
  }
});
test('visible text glyph keeps priority even with a motif selected',()=>{
  const f=fixture();let calls=0;f.root.elementsFromPoint=()=>{calls++;return [f.glyph,f.housePath];};f.drag(f.glyph);
  assert.equal(f.el.state.selected,'text');assert.equal(f.el.state.objects[0].x,54);assert.equal(f.el.state.objects[1].x,50);assert.equal(calls,0);
});
test('a glyph behind another text helper also prevents tunnelling to motif',()=>{
  const f=fixture();f.setHits([f.textRect,f.glyph,f.housePath]);f.drag();assert.equal(f.el.state.selected,'text');
});
test('transparent motif margin and empty text helper preserve the reachable text area',()=>{
  for(const mode of ['margin','no-motif','outside-fill']){const f=fixture();if(mode==='margin')f.setHits([f.textRect,f.houseRect,f.groups.house]);if(mode==='no-motif')f.setHits([f.textRect,f.groups.text]);if(mode==='outside-fill')f.housePath.isPointInFill=()=>false;f.drag();assert.equal(f.el.state.selected,'text',mode);}
});
test('native screen-to-geometry matrix and stroke contour are used, not object rectangle',()=>{
  const f=fixture();let actual;f.housePath.style={fill:'none',stroke:'rgb(0, 0, 0)',strokeWidth:'1'};f.housePath.isPointInFill=()=>false;f.housePath.isPointInStroke=point=>{actual=point;return true;};f.emit('pointerdown');assert.deepEqual(actual,{x:25,y:14});assert.equal(f.el.state.selected,'house');
});
test('hidden, fixed, locked or denied motifs never gain move rights through the fallback',()=>{
  for(const motif of [{uxLocked:true},{uxHidden:true},{locked:true},{technicalLocked:true},{acrylicFixed:true},{customerEditable:false}]){const f=fixture({motif});f.drag();assert.equal(f.el.state.selected,'text',JSON.stringify(motif));}
  const f=fixture({permission:false});f.drag();assert.equal(f.el.state.selected,'text');
});
test('transparent paint and invisible ancestors do not qualify as visible motif contours',()=>{
  for(const style of [{fill:'transparent'},{fill:'rgba(0, 0, 0, 0)'},{fill:'rgb(0 0 0 / 0)'},{fillOpacity:'0'},{opacity:'0'},{visibility:'hidden'}]){const f=fixture();f.housePath.style=style;f.drag();assert.equal(f.el.state.selected,'text',JSON.stringify(style));}
  const f=fixture();f.groups.house.style={opacity:'0'};f.drag();assert.equal(f.el.state.selected,'text');
});
test('do not tunnel through a locked visible motif or photo to another motif',()=>{
  for(const type of ['locked','photo']){const f=fixture({motif:type==='locked'?{locked:true}:{}});const blocker=type==='photo'?{...f.housePath,localName:'image',isPointInFill:undefined}:f.housePath;f.setHits([f.textRect,blocker,f.housePath]);f.drag();assert.equal(f.el.state.selected,'text');}
});
test('handles retain their native resize path and pointer capture lifecycle',()=>{
  const f=fixture(),handle={dataset:{uxHandle:'scale'},closest:s=>s==='[data-ux-handle]'?handle:null,setPointerCapture:id=>f.capture.add(id),hasPointerCapture:id=>f.capture.has(id),releasePointerCapture:id=>f.capture.delete(id)};
  f.drag(handle);assert.equal(f.el.state.selected,'house');assert.equal(f.el.state.objects[1].w,24);assert.equal(f.capture.size,0);
});
test('hit API failures and unsupported geometry fail back to unchanged text selection',()=>{
  for(const mode of ['missing','throws','matrix','svg-api']){const f=fixture();if(mode==='missing')f.root.elementsFromPoint=undefined;if(mode==='throws')f.root.elementsFromPoint=()=>{throw Error('unavailable');};if(mode==='matrix')f.housePath.getScreenCTM=()=>null;if(mode==='svg-api')f.housePath.isPointInFill=undefined;f.drag();assert.equal(f.el.state.selected,'text',mode);}
});
