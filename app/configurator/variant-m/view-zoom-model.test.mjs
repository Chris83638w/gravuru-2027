import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {viewScale,fitView,constrainView,projectView,unprojectView,zoomViewAt,panView,pinchView,fitViewFrame,viewLayerStyle,interpolateView,visibleViewRect,createViewGesture} from './view-zoom-model.mjs';
const bounds={plate:{x:50,y:25,width:400,height:300},viewport:{x:0,y:0,width:500,height:350}};
const close=(a,b)=>{for(const key of Object.keys(b))assert.ok(Math.abs(a[key]-b[key])<1e-8,key+': '+a[key]+' != '+b[key]);};
test('view zoom clamps to 100–400% and Fit restores the original view exactly',()=>{
 for(const [input,expected]of [[0,1],[.5,1],[1,1],[2.5,2.5],[8,4],[NaN,1],[Infinity,1]])assert.equal(viewScale(input),expected);
 assert.deepEqual(constrainView({scale:1,x:500,y:-500},bounds),fitView());
});
test('zoom anchors the same design coordinate under the mouse; inverse coordinates remain exact at every scale',()=>{
 const anchor={x:270,y:190},point={x:290,y:140};let view=fitView();
 for(const scale of [1.25,2,3,4,2,1]){
  const design=unprojectView(anchor,view,bounds);view=zoomViewAt(view,scale,anchor,bounds);
  close(projectView(design,view,bounds),anchor);close(unprojectView(projectView(point,view,bounds),view,bounds),point);
 }
});
test('panning never loses the plate and the minimap viewport shrinks with the zoom',()=>{
 const view=constrainView({scale:2,x:1000,y:-1000},bounds);assert.deepEqual(view,{scale:2,x:200,y:-150});
 assert.deepEqual(panView(view,{x:-10000,y:10000},bounds),{scale:2,x:-200,y:150});
 assert.deepEqual(visibleViewRect({scale:2,x:0,y:0},bounds),{x:125,y:87.5,width:250,height:175});
 const narrow={plate:{x:200,y:0,width:100,height:350},viewport:bounds.viewport};assert.equal(constrainView({scale:2,x:100,y:100},narrow).x,50);
});
test('pinch preserves its midpoint and also supports two-finger panning at the zoom limit',()=>{
 const start=[{x:200,y:175},{x:300,y:175}],current=[{x:160,y:200},{x:360,y:200}];
 const result=pinchView(fitView(),start,current,bounds);assert.deepEqual(result,{scale:2,x:10,y:25});
 close(projectView({x:250,y:175},result,bounds),{x:260,y:200});
 const capped=pinchView({scale:4,x:0,y:0},start,[{x:60,y:185},{x:460,y:185}],bounds);assert.deepEqual(capped,{scale:4,x:10,y:10});
});
test('all visual layers use the full stage with no desktop gutter or geometry change',()=>{
 const raw={x:40,y:50,width:620,height:410},stage={width:700,height:600},before=structuredClone(raw);
 const frame=fitViewFrame(raw,stage);assert.deepEqual(frame.plate,raw);assert.equal(frame.viewport.width,700);assert.equal(frame.fit.scale,1);
 for(const scale of [1,1.8,4])for(const box of [raw,{x:0,y:0,width:700,height:600}]){
  const view=constrainView({scale,x:80,y:-40},frame),style=viewLayerStyle(view,frame,box),nums=style.transform.match(/-?[\d.]+/g).map(Number),local={x:20,y:30};
  assert.equal(style.clipPath,'none');
  close({x:box.x+nums[0]+local.x*nums[2],y:box.y+nums[1]+local.y*nums[2]},projectView({x:box.x+local.x,y:box.y+local.y},view,frame));
 }
 assert.deepEqual(raw,before);
});test('explicit Fit interpolation approaches the target smoothly and retains exact endpoints',()=>{
 const from=fitView(),to={scale:4,x:100,y:-50};assert.deepEqual(interpolateView(from,to,0),from);assert.deepEqual(interpolateView(from,to,1),to);
 const middle=interpolateView(from,to,.5);assert.ok(middle.scale>1&&middle.scale<4);assert.ok(middle.x>0&&middle.x<100);assert.ok(middle.y<0&&middle.y>-50);assert.deepEqual(from,fitView());
});
function gestures(){let view=fitView(),cancelled=0,taps=[],paint=[];const design={objects:[{id:'text',x:40,y:70,w:20,h:5,rotation:15}]},saved=structuredClone(design);let photo=false;
 const gesture=createViewGesture({getView:()=>view,setView:next=>{paint.push(next);view=next;},getBounds:()=>bounds,cancelObject:()=>{cancelled++;Object.assign(design,structuredClone(saved));},onTap:id=>taps.push(id),photoActive:()=>photo});
 const point=(id,x,y,kind='object',pointerType='touch')=>({id,x,y,kind,objectId:'text',pointerType,button:0});
 return {gesture,point,design,saved,paint,taps,get view(){return view;},get cancelled(){return cancelled;},zoom:scale=>{view={scale,x:0,y:0};},photo:value=>{photo=value;}};
}
test('one-finger object drag and taps never change the view without an explicit gesture handler',()=>{
 const f=gestures(),p=f.point;assert.equal(f.gesture.down(p(1,200,175)),false);assert.equal(f.gesture.move(p(1,220,175)),false);assert.equal(f.gesture.up(p(1,220,175)),false);assert.equal(f.paint.length,0);assert.deepEqual(f.taps,[]);
 f.gesture.down(p(2,200,175));f.gesture.up(p(2,200,175));assert.deepEqual(f.taps,['text']);assert.deepEqual(f.view,fitView());assert.equal(f.paint.length,0);assert.deepEqual(f.design,f.saved);
 f.gesture.down(p(3,200,175));f.gesture.up(p(3,230,175));assert.deepEqual(f.taps,['text'],'last movement in pointerup must not become a tap');
});
test('a second touch cancels the first object drag before pinch, with no late tap or one-finger mutation',()=>{
 const f=gestures(),p=f.point;f.gesture.down(p(1,200,175));f.design.objects[0].x=99;f.gesture.move(p(1,210,175));
 assert.equal(f.gesture.down(p(2,300,175)),true);assert.equal(f.cancelled,1);assert.deepEqual(f.design,f.saved);
 assert.equal(f.gesture.move(p(2,390,175)),true);assert.equal(f.view.scale,2);assert.deepEqual(f.design,f.saved);
 assert.equal(f.gesture.up(p(2,390,175)),true);const view={...f.view};assert.equal(f.gesture.move(p(1,220,180)),true);assert.deepEqual(f.view,view);assert.equal(f.gesture.up(p(1,220,180)),true);assert.deepEqual(f.taps,[]);assert.equal(f.gesture.has(1),false);
});
test('blank dragging pans only above 100%; controls and photo crop retain their existing gestures',()=>{
 const f=gestures(),p=f.point;assert.equal(f.gesture.down(p(1,200,175,'blank','mouse')),false);f.gesture.up(p(1,200,175,'blank','mouse'));f.zoom(2);
 assert.equal(f.gesture.down(p(2,200,175,'blank','mouse')),true);assert.equal(f.gesture.move(p(2,240,195,'blank','mouse')),true);assert.deepEqual(f.view,{scale:2,x:40,y:20});f.gesture.up(p(2,240,195,'blank','mouse'));
 assert.equal(f.gesture.down(p(3,200,175,'control')),false);assert.equal(f.gesture.has(3),false);f.photo(true);assert.equal(f.gesture.down(p(4,200,175)),false);assert.equal(f.gesture.down(p(5,300,175)),false);assert.equal(f.cancelled,0);assert.deepEqual(f.design,f.saved);
});
test('real object-gesture cancel hook restores pre-drag geometry without recording an undo or changing the view',()=>{
 const source=fs.readFileSync(new URL('./refinements.mjs',import.meta.url),'utf8').replaceAll('\r\n','\n'),lines=source.split('\n'),old={designId:'D1',objects:[{id:'text',x:12,y:20,w:50,h:8}],ui:{textToolbarPlacement:'plate'}},el={state:{...structuredClone(old),objects:[{id:'text',x:40,y:30,w:50,h:8}]},record(){throw Error('cancel must not record');},sync(){},uxGuideGesture(){}};
 const prior={id:1,target:{hasPointerCapture:()=>true,releasePointerCapture(){}},old,object:{...old.objects[0],type:'text'},moved:true,kind:'move'},context=vm.createContext({el,resize:prior,validPhotoGesture:()=>true,selected:()=>el.state.objects[0],cancelPhotoGesture(){throw Error('not a photo');}});
 vm.runInContext(lines.find(l=>l.includes('function finish(e,cancel=false)'))+'\n'+lines.find(l=>l.includes('el.uxCancelObjectGesture=')),context);
 el.uxCancelObjectGesture();assert.deepEqual(el.state,old);assert.equal(context.resize,null);el.uxCancelObjectGesture();
});
