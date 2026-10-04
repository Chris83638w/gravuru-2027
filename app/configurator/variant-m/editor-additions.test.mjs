import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyPixelPosition} from './motif-placement.mjs';
import {textPaths,measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {cleanObject} from './contract.mjs';
import {rightForProperty} from './element-rights.mjs';
test('Free motif space respects ink, transparent holes and excluded base area',()=>{
 const a=new Uint8ClampedArray(80*100*4);for(let y=0;y<100;y++)for(let x=0;x<80;x++)a[(y*80+x)*4+3]=(x>=15&&x<50&&y>=15&&y<45)?0:255;
 const p=emptyPixelPosition(a,80,100,12,12,(_x,y)=>y<90);assert.ok(p);assert.ok(p.x>=23&&p.x<=42&&p.y>=23&&p.y<=37);
 assert.equal(emptyPixelPosition(a,80,100,60,60),null);assert.equal(emptyPixelPosition(a,80,100,12,12,()=>false),null);
});
test('Italic is retained, protected by content rights and rendered as vector geometry',()=>{
 const font={units:1000,glyphs:{A:{a:600,d:'M0 0L300 800L600 0Z'}}},fonts={Demo:{regular:font,bold:{...font,glyphs:{A:{a:650,d:'M0 0L320 800L650 0Z'}}}}};
 const o={id:'t',type:'text',font:'Demo',text:'A',size:10,bold:true,italic:true};
 assert.equal(cleanObject(o).italic,true);assert.equal(rightForProperty('italic'),'content');
 assert.match(textPaths(o,fonts),/skewX\(-12\)/);assert.match(textPaths(o,fonts),/L320 800/);assert.doesNotMatch(textPaths({...o,italic:false},fonts),/skewX/);
 assert.ok(measureText(o,fonts).w>6.5);
});
