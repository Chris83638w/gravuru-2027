import test from 'node:test';
import assert from 'node:assert/strict';
import {untouchedAddedTexts} from './added-texts.mjs';
test('only customer-added texts that stay empty or „Dein Text“ are dropped; template texts always stay',()=>{
 const template=[{id:'text-1',type:'text',text:'Meyer'},{id:'text-2',type:'text',text:''}];
 const objects=[{id:'text-1',type:'text',text:'Meyer'},{id:'text-2',type:'text',text:''},{id:'a',type:'text',text:'Dein Text'},{id:'b',type:'text',text:'  '},{id:'c',type:'text',text:'Familie'},{id:'d',type:'motif',motif:'herz'},{id:'e',type:'text',text:' Dein Text '},{id:'f',type:'text',text:'Dein Text',customerEditable:false}];
 assert.deepEqual(untouchedAddedTexts(objects,template),['a','b','e']);
 assert.deepEqual(untouchedAddedTexts(null,null),[]);
});
