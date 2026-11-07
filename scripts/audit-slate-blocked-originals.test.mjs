import test from 'node:test';
import assert from 'node:assert/strict';
import {paintedTextBounds} from './audit-slate-blocked-originals.mjs';
import {measureText} from '../app/platform/sources/app/shared/models/text-paths.mjs';
import {customerLayoutIssue} from '../app/configurator/variant-m/contract.mjs';

const fonts={Fixture:{regular:{units:1000,glyphs:{A:{a:1000,d:'M100 0L900 0L900 500L100 500Z'}}}}};
const profile={material:{kind:'slate'},geometry:{shape:'rect',width:30,height:20,safeMarginMm:0,holes:[]}};
test('audit measures painted text rather than declaring a nominal-box failure a source error',()=>{
  const object=measureText({type:'text',text:'A',font:'Fixture',size:10,x:15,y:4,rotation:0},fonts),saved=structuredClone(object);
  const bounds=paintedTextBounds(object,fonts);
  assert.ok(object.y-object.h/2<0);assert.ok(bounds.top>0);
  assert.equal(customerLayoutIssue(object,profile,{fonts}),'');
  assert.deepEqual(object,saved);
});
test('actual off-plate ink remains rejected and audit never moves or scales it',()=>{
  const object=measureText({type:'text',text:'A',font:'Fixture',size:10,x:1,y:10,rotation:0},fonts),saved=structuredClone(object);
  assert.ok(paintedTextBounds(object,fonts).left<0);
  assert.match(customerLayoutIssue(object,profile,{fonts}),/ragt über/);
  assert.deepEqual(object,saved);assert.equal(paintedTextBounds(object,{}),null);
});
