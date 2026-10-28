import test from 'node:test';
import assert from 'node:assert/strict';
import {toolbarPlacement,editorUi,validateToolbarConfig,toolbarPlacementQuery,resolveToolbarPlacement,TOOLBAR_VISITOR_KEY} from './toolbar-placement-model.mjs';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value))};};

test('toolbar placement accepts only plate/selection; missing metadata stays backward compatible',()=>{
 assert.equal(toolbarPlacement(),'plate');assert.equal(editorUi(undefined),undefined);
 for(const placement of ['plate','selection'])assert.deepEqual(editorUi({textToolbarPlacement:placement}),{textToolbarPlacement:placement});
 for(const value of [null,'a','b','',true,1,{},[]])assert.throws(()=>toolbarPlacement(value));
 for(const value of [null,{},[],{textToolbarPlacement:undefined},{textToolbarPlacement:'plate',price:0},{textToolbarPlacement:'other'}])assert.throws(()=>editorUi(value));
 assert.throws(()=>validateToolbarConfig({textToolbarExperiment:'true'}));
});
test('leiste a/b is an explicit Shop-window override, never a general editor switch',()=>{
 assert.equal(toolbarPlacementQuery('?leiste=a',{embedded:true}),'selection');
 assert.equal(toolbarPlacementQuery('?leiste=b',{embedded:true}),'plate');
 for(const search of ['?leiste=a','?leiste=b'])assert.equal(toolbarPlacementQuery(search),undefined);
 for(const search of ['?leiste=A','?leiste=selection','?leiste=toString','?leiste=a&leiste=b','?other=a'])assert.equal(toolbarPlacementQuery(search,{embedded:true}),undefined);
 assert.equal(resolveToolbarPlacement({embedded:true,search:'?leiste=a',savedUi:{textToolbarPlacement:'plate'}}),'selection');
 assert.equal(resolveToolbarPlacement({search:'?leiste=a'}),'plate');
});
test('the default and saved design stay stable without an explicitly enabled experiment',()=>{
 const throwing=()=>{throw Error('must not allocate');};
 for(const embedded of [true,false])assert.equal(resolveToolbarPlacement({embedded,storage:storage(),random:throwing}),'plate');
 assert.equal(resolveToolbarPlacement({config:{textToolbarPlacement:'selection'},random:throwing}),'selection');
 assert.equal(resolveToolbarPlacement({savedUi:{textToolbarPlacement:'selection'},random:throwing}),'selection');
 assert.equal(resolveToolbarPlacement({config:{textToolbarExperiment:true},random:throwing}),'plate');
});
test('explicit visitor experiment persists the 50/50 bucket and saved designs win over visitor allocation',()=>{
 for(const [draw,expected] of [[0,'selection'],[.49999,'selection'],[.5,'plate'],[.99999,'plate']]){
  const store=storage(),args={embedded:true,config:{textToolbarExperiment:true},storage:store,random:()=>draw};
  assert.equal(resolveToolbarPlacement(args),expected);assert.equal(store.getItem(TOOLBAR_VISITOR_KEY),expected);
  assert.equal(resolveToolbarPlacement({...args,random:()=>{throw Error('must not reassign');}}),expected);
  assert.equal(resolveToolbarPlacement({...args,savedUi:{textToolbarPlacement:'selection'}}),'selection');
 }
});
test('unavailable, corrupt or nonpersistent visitor storage safely uses the configured choice',()=>{
 const args={embedded:true,config:{textToolbarExperiment:true},random:()=>0};
 for(const store of [undefined,{getItem(){throw Error('blocked');},setItem(){}},{getItem:()=>null,setItem(){}},{getItem:()=>null,setItem(){throw Error('full');}}])assert.equal(resolveToolbarPlacement({...args,storage:store}),'plate');
 const store=storage();store.setItem(TOOLBAR_VISITOR_KEY,'invalid');assert.equal(resolveToolbarPlacement({...args,storage:store}),'selection');
 assert.equal(resolveToolbarPlacement({...args,storage:storage(),random:()=>NaN}),'plate');
});
