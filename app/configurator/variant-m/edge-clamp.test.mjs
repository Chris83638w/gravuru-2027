import test from 'node:test';
import assert from 'node:assert/strict';
import {clampToPlate,boundingSize,installEdgeClamp} from './edge-clamp.mjs';
import {fitsSurface} from './usability-model.mjs';

test('clamp never rounds a corrected rotated box or glyph bounds outside the plate',()=>{
 for(const rotation of [0,13,45,90])for(const corner of [-100,1000])for(const bounds of [null,{x:-5.1234,y:-3.4321,width:12.3456,height:7.8912}]){
  const o={x:corner,y:corner,w:12.3456,h:7.8912,rotation};
  assert.equal(clampToPlate(o,100,80,0,bounds),true);
  const box=bounds||{x:-o.w/2,y:-o.h/2,width:o.w,height:o.h};
  assert.equal(fitsSurface(o,box,{shape:'rect',width:100,height:80}),true,JSON.stringify({o,bounds}));
  assert.equal(clampToPlate(o,100,80,0,bounds),false,'second render must not move it again');
 }
});

test('Elemente bis an den Rand, nicht darüber hinaus', () => {
  const o={x:-5,y:150,w:40,h:20,rotation:0};
  assert.equal(clampToPlate(o,220,140),true);
  assert.deepEqual([o.x,o.y],[20,130]);
  const inside={x:30,y:30,w:20,h:10};assert.equal(clampToPlate(inside,220,140),false);
  const edge={x:10,y:5,w:20,h:10};assert.equal(clampToPlate(edge,220,140),false,'genau am Rand bleibt erlaubt');
});

test('gedrehte und zu große Elemente', () => {
  const b=boundingSize({w:20,h:10,rotation:90});assert.ok(Math.abs(b.w-10)<1e-9&&Math.abs(b.h-20)<1e-9);
  const big={x:0,y:0,w:300,h:20};clampToPlate(big,220,140);assert.equal(big.x,110);
  const hidden={x:-50,y:0,w:10,h:10,uxHidden:true};assert.equal(clampToPlate(hidden,220,140),false);
  const guide={x:-50,y:0,w:10,h:10,role:'guide'};assert.equal(clampToPlate(guide,220,140),false);
});

test('vor jedem Zeichnen begrenzt', () => {
  const el={state:{width:90,height:30,objects:[{x:100,y:15,w:10,h:4}]},render(){return 'ok';}};
  installEdgeClamp(el);assert.equal(el.render(),'ok');assert.equal(el.state.objects[0].x,85);
});

test('rounded corners and oval use actual contour on every geometry edit, keep dimensions and the other surface',()=>{
 for(const geometry of [{shape:'rect',width:120,height:80,cornerRadiusMm:12},{shape:'ellipse',width:120,height:80}]){
 const o={id:'m',type:'motif',x:1,y:1,w:10,h:10,rotation:0},back={...o,id:'back',surfaceId:'back',x:-20};
 const el={state:{designId:'d',width:120,height:80,objects:[o,back]},uxProfileGeometry:()=>geometry,render(){}};installEdgeClamp(el);el.render();assert.ok(o.x>5&&o.y>5);assert.equal(o.w,10);assert.equal(back.x,-20);const first=[o.x,o.y];el.render();assert.deepEqual([o.x,o.y],first);}
});
