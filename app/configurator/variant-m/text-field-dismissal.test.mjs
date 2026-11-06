import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function fieldUI(){
 const source=fs.readFileSync(new URL('./text-fields.mjs',import.meta.url),'utf8');
 const callbacks={},documentCallbacks={},resizers=[];
 class Node{
  constructor(kind,id){this.kind=kind;this.dataset={uxRow:id};this.attrs={};this.classList={toggle(){}};}
  append(node){node.parentNode=this;}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
  querySelector(s){return s==='[data-ux-text]'?this.field:this.disclosure;}
  closest(selector){for(const s of selector.split(',')){if(s==='.ux-text-row'&&this.kind==='row'||s==='[data-ux-text]'&&this.kind==='field'||s==='[data-text-options]'&&this.kind==='disclosure'||s===this.kind)return this;}return this.parentNode?.closest(selector)||null;}
  getBoundingClientRect(){return {top:100,bottom:144};}
 }
 const rows=['a','b'].map(id=>{const row=new Node('row',id);row.field=new Node('field');row.field.dataset={uxText:id};row.field.parentNode=row;row.disclosure=new Node('disclosure');row.disclosure.dataset={textOptions:id};row.disclosure.parentNode=row;return row;});
 const fields={querySelectorAll:s=>s==='.ux-text-row'?rows:rows.map(n=>n.field)},controls=new Node('.ux-controls'),editor={scrollTop:0,getBoundingClientRect:()=>({top:0,bottom:600}),scrollTo({top}){this.scrollTop=top;}};
 const r={host:{},activeElement:null,querySelector:s=>({'.ux-fields':fields,'.ux-controls':controls,'.ux-editor':editor,'#ux-panel-text':{hidden:false}})[s],addEventListener:(type,fn)=>callbacks[type]=fn};
 const el={dataset:{uxMobileTabs:'true'}},env={el,r,object:{id:'a',type:'text'},requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},ResizeObserver:class{constructor(fn){resizers.push(fn);}observe(){}disconnect(){}},window:{addEventListener(){},scrollBy(){}},document:{createElement:()=>new Node('disclosure'),addEventListener:(type,fn)=>documentCallbacks[type]=fn,removeEventListener(){}}};
 env.selected=()=>env.object;env.select=id=>{env.object={id,type:'text'};el.uxUpdateTextUI();};
 vm.createContext(env);vm.runInContext(source.slice(source.indexOf('export function installTextFields')).replace('export ',''),env);vm.runInContext('installTextFields({el,r,selected,select})',env);
 const target=kind=>new Node(kind),emit=(type,node=target('outside'),extra={})=>callbacks[type]?.({target:node,detail:1,pointerId:1,clientX:20,clientY:20,...extra});
 const open=(i=0)=>{r.activeElement=rows[i].field;emit('focusin',rows[i].field);};
 const click=(node=target('outside'))=>{emit('pointerdown',node);emit('click',node);};
 open();return {rows,controls,callbacks,documentCallbacks,resizers,r,env,open,click,emit,target};
}

test('typing, losing focus, scrolling and viewport changes keep the open text options',()=>{
 const ui=fieldUI();assert.equal(ui.controls.hidden,false);
 ui.emit('input',ui.rows[0].field);ui.emit('focusout',ui.rows[0].field);ui.emit('scroll');ui.resizers[0]();
 assert.equal(ui.controls.hidden,false);assert.equal(ui.rows[0].disclosure.attrs['aria-expanded'],'true');
});

test('an intentional outside click closes options, while touch scrolling and cancelled gestures do not',()=>{
 const ui=fieldUI();ui.emit('pointerdown');assert.equal(ui.controls.hidden,false,'pressing alone does not close the box');
 ui.emit('pointermove',ui.target('outside'),{clientY:70});ui.emit('click');assert.equal(ui.controls.hidden,false,'a drag is not an intentional outside click');
 ui.emit('pointerdown');ui.emit('touchmove');ui.emit('click');assert.equal(ui.controls.hidden,false);
 ui.emit('pointerdown');ui.emit('pointercancel');ui.emit('click');assert.equal(ui.controls.hidden,false);
 ui.click(ui.target('.stage'));assert.equal(ui.controls.hidden,true);assert.equal(ui.rows[0].disclosure.attrs['aria-expanded'],'false');
});

test('inline controls, text toolbar and font dialogs stay usable without dismissing text options',()=>{
 const ui=fieldUI(),inline=ui.target('button');inline.parentNode=ui.rows[0];
 for(const node of [inline,ui.target('.ux-direct-edit'),ui.target('.ux-direct-input'),ui.target('dialog'),ui.target('[role="dialog"]')]){ui.click(node);assert.equal(ui.controls.hidden,false);}
 ui.click(ui.rows[0].disclosure);assert.equal(ui.controls.hidden,true,'the existing explicit toggle still closes the box');
});

test('choosing a different text opens its own options and leaves the new box open',()=>{
 const ui=fieldUI();ui.emit('pointerdown',ui.rows[1].field);ui.open(1);ui.emit('click',ui.rows[1].field);
 assert.equal(ui.controls.hidden,false);assert.equal(ui.controls.parentNode,ui.rows[1]);assert.equal(ui.rows[0].disclosure.attrs['aria-expanded'],'false');assert.equal(ui.rows[1].disclosure.attrs['aria-expanded'],'true');
});

test('clicks outside the configurator close options; events from inside its shadow tree do not',()=>{
 const ui=fieldUI();ui.documentCallbacks.click({composedPath:()=>[ui.rows[0].field,ui.r,ui.r.host]});assert.equal(ui.controls.hidden,false);
 ui.documentCallbacks.click({composedPath:()=>[ui.target('outside')]});assert.equal(ui.controls.hidden,true);
 ui.open();ui.emit('click',ui.target('outside'),{detail:0});assert.equal(ui.controls.hidden,true,'keyboard activation of another control also dismisses');
});
