import test from 'node:test';
import assert from 'node:assert/strict';
import {BESTSELLER_CATEGORY,filterMotifBrowser} from './motif-browser-model.mjs';
const available=[{key:'home',name:'Haus',category:'Häuser'},{key:'heart',name:'Herzlinie',category:'Herzen'},{key:'paw',name:'Herz mit Pfote',category:'Pfoten'}];
test('bestsellers preserve the allowed product selection and its order without unrelated fallback',()=>{
 assert.deepEqual(filterMotifBrowser(available,[{key:'paw'},{key:'missing'},{key:'heart'},{key:'paw'}]).map(x=>x.key),['paw','heart']);
 assert.deepEqual(filterMotifBrowser(available,[]),[]);
 assert.deepEqual(filterMotifBrowser(available,[{key:'paw'}],BESTSELLER_CATEGORY,'Haus'),[available[0]]);
});
test('category changes and searches can reach the full allowed library without rewriting names',()=>{
 assert.deepEqual(filterMotifBrowser(available,[],'Herzen','herz').map(x=>x.name),['Herzlinie','Herz mit Pfote']);
 assert.deepEqual(filterMotifBrowser(available,[],'','herz').map(x=>x.key),['heart','paw']);
 assert.deepEqual(filterMotifBrowser(available,[],'').map(x=>x.key),['home','heart','paw']);
 assert.deepEqual(filterMotifBrowser(available,[],'','',item=>item.key==='paw'?2:1).map(x=>x.key),['paw','home','heart']);
});
