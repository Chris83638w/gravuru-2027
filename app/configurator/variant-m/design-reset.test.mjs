import test from 'node:test';
import assert from 'node:assert/strict';
import {installDesignReset,resetOriginalDesign} from './design-reset.mjs';

test('reset loads the selected template without carrying edits and retains product options and undo',()=>{
 const original=[{id:'name',text:'Kalle'}],before={designId:'kalle',objects:[{id:'name',text:'Mein Hund'},{id:'photo',uxUploadId:'photo-1'}],mOptions:{size:'30x20',mounting:'gold'},selected:'photo'},el={state:structuredClone(before),history:[],sync(){}};
 const choose=function(id,{carry}){assert.equal(id,'kalle');assert.equal(carry,false);this.history.push(structuredClone(this.state));this.state.objects=structuredClone(original);};
 let decorated=0;resetOriginalDesign({el,choose,decorate:()=>decorated++});
 assert.deepEqual(el.state.objects,original);assert.deepEqual(el.state.mOptions,before.mOptions);assert.equal(decorated,1);assert.equal(el.state.selected,null);
 el.state=el.history.pop();assert.deepEqual(el.state,before);
});

test('reset button requires explicit confirmation; cancel and dismissal preserve the design',t=>{
 const control=()=>({addEventListener(type,fn){this[type]=fn;}}),open=control(),cancel=control(),confirm=control(),name={},bar={querySelector:()=>open},dialog={open:false,querySelector:s=>s==='[data-reset-design-name]'?name:s==='[data-ux=reset-design-cancel]'?cancel:confirm,showModal(){this.open=true;},close(){this.open=false;}};
 const prior=globalThis.document;globalThis.document={createElement:()=>bar};t.after(()=>{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;});
 let resets=0;const el={state:{designId:'kalle'}},r={querySelector:()=>({after(node){assert.equal(node,bar);}})};
 installDesignReset({el,r,config:{},dialog:()=>dialog,button:()=>'',design:()=>({name:'Kalle'}),reset:()=>resets++,say(){}});
 open.click();assert.equal(dialog.open,true);assert.equal(name.textContent,'Kalle');assert.equal(resets,0);
 cancel.click();assert.equal(dialog.open,false);assert.equal(resets,0);
 confirm.click();assert.equal(resets,0,'a dismissed dialog cannot reset');
 open.click();confirm.click();assert.equal(resets,1);assert.equal(dialog.open,false);
});
