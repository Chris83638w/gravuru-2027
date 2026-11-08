import test from 'node:test';
import assert from 'node:assert/strict';
import {createTextBounds} from './text-bounds.mjs';
import {clampToPlate} from './edge-clamp.mjs';

const face=()=>({units:1000,glyphs:{A:{a:500,d:'M0 0L500 0L500 700L0 700Z'}}});
function fixture() {
  let reads=0,removed=0,box={x:-18,y:-7,width:36,height:16};
  const el={fontData:{},shadowRoot:{append(){}},ownerDocument:{createElementNS(){return {
    style:{},firstElementChild:{getBBox(){reads++;return {...box};}},remove(){removed++;}
  };}}};
  const object={id:'name',type:'text',text:'AAAA',font:'Font',size:20,w:40,h:24,x:50,y:50,rotation:0};
  return {el,object,measure:createTextBounds(el),setBox:value=>box=value,reads:()=>reads,removed:()=>removed};
}
test('font arriving after the first measurement is retried without changing the text',()=>{
  const f=fixture(),before=structuredClone(f.object);
  assert.throws(()=>f.measure(f.object),/geladen/);
  f.el.fontData.Font={regular:face()};
  assert.deepEqual(f.measure(f.object),{x:-18,y:-7,width:36,height:16});
  assert.deepEqual(f.object,before);assert.equal(f.reads(),1);
});
test('zero and invalid startup bounds are never retained',()=>{
  for(const box of [{x:0,y:0,width:0,height:0},{x:NaN,y:0,width:36,height:16}]) {
    const f=fixture();f.el.fontData.Font={regular:face()};f.setBox(box);
    assert.throws(()=>f.measure(f.object),/gemessen/);
    f.setBox({x:-18,y:-7,width:36,height:16});
    assert.equal(f.measure(f.object).width,36);f.measure(f.object);
    assert.equal(f.reads(),2);assert.equal(f.removed(),2);
  }
});
test('font replacement and a newly loaded bold face invalidate measurements',()=>{
  const f=fixture();f.el.fontData.Font={regular:face()};f.object.bold=true;
  assert.equal(f.measure(f.object).width,36);
  f.el.fontData.Font.bold=face();f.setBox({x:-20,y:-7,width:40,height:16});
  assert.equal(f.measure(f.object).width,40);
  f.el.fontData.Font.bold=face();f.setBox({x:-21,y:-7,width:42,height:16});
  assert.equal(f.measure(f.object).width,42);assert.equal(f.reads(),3);
});
test('recovered ink bounds reach each plate edge without changing text or its size',()=>{
  const f=fixture();f.el.fontData.Font={regular:face()};const b=f.measure(f.object);
  for(const [axis,value,edge] of [['x',-100,18],['x',300,202],['y',-100,7],['y',300,131]]) {
    const o={...f.object,[axis]:value};clampToPlate(o,220,140,0,b);
    assert.equal(o[axis],edge);assert.equal(o.size,20);assert.equal(o.w,40);assert.equal(o.h,24);assert.equal(o.text,'AAAA');
  }
});
