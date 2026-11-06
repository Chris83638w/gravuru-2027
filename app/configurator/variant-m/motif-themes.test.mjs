import test from 'node:test';
import assert from 'node:assert/strict';
import {motifThemes,themedMotifSelection} from './motif-themes.mjs';
test('theme suggestions retain original allowed keys and separate human/animal memorial themes',()=>{
 const all=Object.entries(motifThemes).flatMap(([theme,{featured}])=>featured.map(key=>({key,category:theme})));
 const human=themedMotifSelection(all,'remembranceHuman'),animal=themedMotifSelection(all,'remembranceAnimal');
 assert.ok(human.includes(motifThemes.remembranceHuman.featured[0]));assert.ok(!animal.includes(motifThemes.remembranceHuman.featured[0]));
 assert.ok(animal.includes(motifThemes.remembranceAnimal.featured[0]));assert.ok(!human.includes(motifThemes.remembranceAnimal.featured[0]));
 assert.deepEqual(themedMotifSelection([], 'home'),[]);assert.equal(themedMotifSelection(all,'unknown'),null);
 assert.deepEqual(themedMotifSelection(all,'home',[]),[],'explicit workshop selections remain authoritative');
});
