import test from 'node:test';
import assert from 'node:assert/strict';
import {clampToPlate,boundingSize,installEdgeClamp} from './edge-clamp.mjs';

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
