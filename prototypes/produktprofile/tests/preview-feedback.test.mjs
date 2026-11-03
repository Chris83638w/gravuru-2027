import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BESTSELLERS,categoriesFor,visibleMotifs,canvasLayout} from '../src/preview-model.mjs';

// Original local library, prepared with scripts/prepare-local-assets.mjs.
const motifs=JSON.parse(fs.readFileSync(new URL('../public/assets/motifs.json',import.meta.url),'utf8'));
test('Bestseller is only the default; all 47 source categories stay individually available',()=>{
 const categories=categoriesFor(motifs);
 assert.equal(motifs.length,721);
 assert.equal(categories.length,49);
 assert.equal(categories[0].id,BESTSELLERS);
 assert.deepEqual(new Set(categories.slice(2).map(c=>c.id)),new Set(motifs.map(m=>m.category)));
 for(const category of categories.slice(2)){
  const result=visibleMotifs(motifs,category.id);
  assert.ok(result.length>0,category.name);
  assert.ok(result.every(m=>m.category===category.id),category.name);
 }
 assert.equal(visibleMotifs(motifs,'').length,721);
});
test('Master starter order and descriptive motif labels are preserved',()=>{
 const selected=visibleMotifs(motifs);
 assert.equal(selected.length,18);
 assert.deepEqual(selected.slice(0,3).map(m=>m.name),['Haus','Strich Haus','Herzlinie schlicht']);
 assert.ok(!motifs.some(m=>/^Motiv[ -]*\d/i.test(m.name)));
 assert.ok(visibleMotifs(motifs,'Leuchttürme').every(m=>m.name.startsWith('Leuchtturm')));
});
test('Semantic search and category selection work together without losing the other categories',()=>{
 const result=visibleMotifs(motifs,'Anker','Meer');
 assert.ok(result.length>0);
 assert.ok(result.every(m=>m.category==='Anker'));
 assert.equal(visibleMotifs(motifs,'Anker','nichtvorhandenesmotiv').length,0);
 assert.equal(categoriesFor(motifs).length,49);
});
test('100% fits the available canvas with dimension space at desktop and phone sizes',()=>{
 for(const [w,h] of [[840,573],[840,526],[363,250],[363,290],[1900,1024]]){
  for(const ratio of [1.5,22/14,160/280]){
   const l=canvasLayout(w,h,ratio);
   assert.ok(l.plateWidth+60<=w);
   assert.ok(l.plateHeight+62<=h);
   assert.equal(l.width,w);assert.equal(l.height,h);
  }
 }
 assert.ok(canvasLayout(840,573,1.5).base>740,'Only a minimal fit margin, no old 562px cap');
});
test('Zoom changes the whole drawing proportionally and reset restores the exact fitted size',()=>{
 const fitted=canvasLayout(840,573,1.5);
 for(const zoom of [75,125]){
  const l=canvasLayout(840,573,1.5,zoom);
  assert.ok(Math.abs(l.plateWidth-fitted.plateWidth*zoom/100)<1e-9,'Proportional size, allowing floating-point roundoff');
  assert.ok(l.width>=l.plateWidth+60);
  assert.ok(l.height>=l.plateHeight+62);
 }
 assert.deepEqual(canvasLayout(840,573,1.5,100),fitted);
});
