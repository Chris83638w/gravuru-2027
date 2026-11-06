import test from 'node:test';
import assert from 'node:assert/strict';
import {quickCategoryOptions} from './category-picker.mjs';
import {filterMotifBrowser} from './motif-browser-model.mjs';
const options=['__bestsellers','','Anker','Baby','Blumen','Herzen','Tiere','Kreuze'].map(value=>({value,textContent:value,disabled:false}));
test('four visible category choices use available categories and keep an outside selection visible',()=>{
 assert.deepEqual(quickCategoryOptions(options,'__bestsellers').map(o=>o.value),['__bestsellers','Tiere','Blumen','Herzen']);
 const selected=quickCategoryOptions(options,'Kreuze');assert.equal(selected.length,4);assert.ok(selected.some(o=>o.value==='Kreuze'));
 const limited=[options[0],{...options[4],disabled:true},options[2]];assert.deepEqual(quickCategoryOptions(limited,'__bestsellers').map(o=>o.value),['__bestsellers','Anker']);
});
test('search continues across every available category even after choosing a visible category',()=>{
 const motifs=[{key:'cross',name:'Kreuz',category:'Kreuze'},{key:'flower',name:'Blume',category:'Blumen'}];
 assert.deepEqual(filterMotifBrowser(motifs,[],'Blumen','kreuz').map(o=>o.key),['cross']);
 assert.deepEqual(filterMotifBrowser(motifs,[],'Blumen','').map(o=>o.key),['flower']);
});
