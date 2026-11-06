import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceObjectIssue,objectIssue} from './design-content.mjs';
import {measureText} from './text-paths.mjs';
const fonts={Example:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0L400 0L400 500L0 500Z'}}}}};
const profile={kind:'universal-product',geometry:{shape:'rect',width:30,height:20,safeMarginMm:0,holes:[]}};
const object=()=>measureText({type:'text',font:'Example',text:'A',size:10,x:15,y:3,rotation:0},fonts);
test('rectangular slate accepts visible letters that fit despite an oversized nominal text box',()=>{
 const o=object(),before=structuredClone(o);
 assert.ok(objectIssue(o,profile));
 assert.equal(surfaceObjectIssue(o,profile,{fonts}),'');
 assert.deepEqual(o,before,'validation never shifts or resizes source text');
});
test('real ink outside rectangle, missing glyphs and safe margins retain the boundary error',()=>{
 const o=object();
 assert.ok(surfaceObjectIssue({...o,y:0},profile,{fonts}));
 assert.ok(surfaceObjectIssue({...o,text:'B'},profile,{fonts}));
 assert.ok(surfaceObjectIssue(o,{...profile,geometry:{...profile.geometry,safeMarginMm:2}},{fonts}));
 assert.ok(surfaceObjectIssue(o,profile));
});
