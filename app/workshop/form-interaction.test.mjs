import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeField,scopedSvg} from './ui/form-interaction.mjs';
const field={xMm:20,yMm:10,widthMm:40,heightMm:20,sizeMm:4};
const geometry={widthMm:120,heightMm:80},text={type:'text',allowMove:true,allowScale:true};
test('corner resize anchors the opposite edge and preserves whole-mm text sizes',()=>{
 const nw=resizeField(field,text,geometry,'nw',-7,-3);
 assert.equal(nw.xMm+nw.widthMm,60);assert.equal(nw.yMm+nw.heightMm,30);assert.equal(nw.sizeMm,5);
 const se=resizeField(field,text,geometry,'se',9,8);assert.equal(se.xMm,20);assert.equal(se.yMm,10);assert.equal(se.sizeMm,5);
 assert.deepEqual(field,{xMm:20,yMm:10,widthMm:40,heightMm:20,sizeMm:4});
});
test('resize respects locked geometry, page limits and circular photo frames',()=>{
 assert.deepEqual(resizeField(field,{...text,allowScale:false},geometry,'nw',-99,-99),field);
 const fixed=resizeField(field,{...text,allowMove:false},geometry,'nw',999,999);assert.equal(fixed.xMm,20);assert.equal(fixed.yMm,10);assert.equal(fixed.widthMm,100);assert.equal(fixed.heightMm,70);
 for(const corner of ['nw','ne','sw','se'])for(const delta of [-1000,1000]){
  const f=resizeField({...field,widthMm:20},{type:'photo',shape:'circle',allowMove:true,allowScale:true},geometry,corner,delta,-delta);
  assert.equal(f.widthMm,f.heightMm);assert(f.xMm>=0&&f.yMm>=0);assert(f.xMm+f.widthMm<=120&&f.yMm+f.heightMm<=80);assert(f.widthMm>0);
 }
});
test('simultaneous previews isolate clip IDs without rewriting photos or field identifiers',()=>{
 const svg='<svg><defs><clipPath id="mask"><rect/></clipPath></defs><g data-field="photo" clip-path="url(#mask)"><image href="data:image/png;base64,abcd"/><use href="#mask"/></g></svg>';
 const result=scopedSvg(svg,'direct-preview');assert.match(result,/id="direct-preview-mask"/);assert.match(result,/url\(#direct-preview-mask\)/);assert.match(result,/href="#direct-preview-mask"/);assert.match(result,/data-field="photo"/);assert.match(result,/data:image\/png;base64,abcd/);assert(!scopedSvg(svg,'other').includes('direct-preview-mask'));assert.throws(()=>scopedSvg(svg,'bad scope'));
});
