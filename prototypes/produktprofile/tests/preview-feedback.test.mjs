import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BESTSELLERS,categoriesFor,visibleMotifs,canvasLayout} from '../src/preview-model.mjs';
import {profiles} from '../src/profiles.mjs';

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
test('Door-sign leading originals and descriptive motif labels are preserved',()=>{
 const selected=visibleMotifs(motifs,BESTSELLERS,'',profiles.sign.motifRecommendations);
 assert.ok(selected.length>18,'More topic-appropriate motifs remain available below the first page');
 assert.deepEqual(selected.slice(0,3).map(m=>m.name),['Haus','Strich Haus','Herzlinie schlicht']);
 assert.ok(!motifs.some(m=>/^Motiv[ -]*\d/i.test(m.name)));
 assert.ok(visibleMotifs(motifs,'Leuchttürme').every(m=>m.name.startsWith('Leuchtturm')));
});
test('Memorials start with crosses and remembrance motifs, door signs with home motifs',()=>{
 const memorial=visibleMotifs(motifs,BESTSELLERS,'',profiles.memorial.motifRecommendations);
 const home=visibleMotifs(motifs,BESTSELLERS,'',profiles.sign.motifRecommendations);
 assert.equal(memorial[0].name,'Kreuz 1');
 assert.deepEqual(new Set(memorial.slice(0,6).map(m=>m.category)),new Set(['Kreuze','Engel','Kerzen','Herzen','Blumen','Flügel']));
 assert.ok(!memorial.some(m=>['Haus','Anker','Leuchttürme'].includes(m.category)));
 assert.ok(home.some(m=>m.name==='Leuchtturm Heimathafen'));
 assert.ok(home.some(m=>m.name==='Anker 1'));
 assert.ok(!home.some(m=>['Kreuze','Engel','Kerzen'].includes(m.category)));
 assert.ok(memorial.length>18);
 assert.notDeepEqual(memorial.map(m=>m.key),home.map(m=>m.key));
});
test('Each local product explicitly binds a topic with valid original keys and categories',()=>{
 for(const p of Object.values(profiles)){
  const theme=p.motifRecommendations;
  assert.ok(theme,p.label);
  for(const key of theme.featured)assert.equal(motifs.filter(m=>m.key===key).length,1,key);
  for(const category of theme.categories)assert.ok(motifs.some(m=>m.category===category),category);
  const selected=visibleMotifs(motifs,BESTSELLERS,'',theme);
  assert.equal(new Set(selected.map(m=>m.key)).size,selected.length);
  assert.ok(selected.every(m=>motifs.includes(m)),'Return unchanged original objects');
 }
});
test('Human and animal remembrance have distinct suggestions without restricting free categories',()=>{
 const people=visibleMotifs(motifs,BESTSELLERS,'',profiles.memorial.motifRecommendations);
 const pets=visibleMotifs(motifs,BESTSELLERS,'',profiles.memorialPet.motifRecommendations);
 assert.equal(people[0].name,'Kreuz 1');
 assert.deepEqual(pets.slice(0,3).map(m=>m.name),['Herz mit Pfote','Pfote in Hand','Regenbogen Tiere']);
 assert.ok(!people.some(m=>m.category==='Pfoten'));
 assert.ok(!pets.some(m=>['Kreuze','Engel','Kerzen'].includes(m.category)));
 assert.ok(pets.length>18);
 assert.equal(new Set(pets.map(m=>m.key)).size,pets.length);
 assert.ok(visibleMotifs(motifs,'Kreuze','',profiles.memorialPet.motifRecommendations).length>0);
 assert.ok(visibleMotifs(motifs,'Pfoten','',profiles.memorial.motifRecommendations).length>0);
 assert.notDeepEqual(people.map(m=>m.key),pets.map(m=>m.key));
});
test('Product topic restricts only Bestseller, every normal category remains accessible',()=>{
 for(const p of Object.values(profiles)){
  for(const category of categoriesFor(motifs).slice(1)){
   assert.deepEqual(visibleMotifs(motifs,category.id,'',p.motifRecommendations),visibleMotifs(motifs,category.id));
  }
 }
 const crosses=visibleMotifs(motifs,BESTSELLERS,'Kreuz',profiles.memorial.motifRecommendations);
 assert.ok(crosses.some(m=>m.name==='Kreuz 1'));
 assert.ok(crosses.every(m=>m.category==='Kreuze'));
});
test('Missing theme or unavailable topic never fills Bestseller with unrelated motifs',()=>{
 assert.deepEqual(visibleMotifs(motifs),[]);
 assert.deepEqual(visibleMotifs(motifs,BESTSELLERS,'',{featured:['not-present'],categories:['not-present']}),[]);
 assert.deepEqual(visibleMotifs(motifs,'','',undefined),motifs);
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
