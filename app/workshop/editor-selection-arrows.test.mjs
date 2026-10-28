import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {measureText,setTextSize} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {selectionArrowMarkup,selectionArrowStyles,selectionScaleFactor} from '../configurator/variant-m/selection-arrows.mjs';
import {drawSelection,replaceEditorPreview} from './ui/editor-selection.mjs';

function selectionDom(t){
 const previous=globalThis.document;
 class Node{
  constructor(tag){this.tag=tag;this.localName=tag;this.dataset={};this.style={};this.children=[];this.attributes={};}
  set innerHTML(value){this.html=value;if(this.tag==='template')this.content={firstElementChild:new Node('svg')};}
  getScreenCTM(){return {inverse:()=>({multiply:matrix=>matrix})};}
  contains(node){return this===node||this.children.some(child=>child.contains(node));}
  closest(selector){return selector==='[data-editor-resize]'&&this.dataset.editorResize?this:this.parent?.closest(selector)||null;}
  focus(){globalThis.document.activeElement=this;}
  replaceWith(node){const parent=this.parent,index=parent.children.indexOf(this);this.remove();node.parent=parent;parent.children.splice(index,0,node);}
  setAttribute(key,value){this.attributes[key]=String(value);}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  remove(){if(this.contains(globalThis.document.activeElement))globalThis.document.activeElement=null;if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
  insertAdjacentHTML(_position,html){this.html=html;for(const match of html.matchAll(/data-corner="([^"]+)"/g)){const button=new Node('button');button.dataset.corner=match[1];button.dataset.uxHandle='scale';this.append(button);}}
  querySelectorAll(selector){return selector==='[data-corner]'?this.children.filter(node=>node.dataset.corner):[];}
 }
 globalThis.document={activeElement:null,createElement:tag=>new Node(tag),createElementNS:(_ns,tag)=>new Node(tag)};
 t.after(()=>{globalThis.document=previous;});
 const stage=new Node('div'),svg=new Node('svg');stage.append(svg);
 stage.querySelector=selector=>selector===':scope > svg'?stage.children.find(node=>node.tag==='svg'):stage.children.find(node=>node.dataset.editorSelection);
 stage.getBoundingClientRect=()=>({left:10,top:20});
 svg.getScreenCTM=()=>({inverse:()=>({multiply:matrix=>matrix})});
 const matrix={a:2,b:0,c:0,d:2,e:100,f:80},node={getScreenCTM:()=>matrix};
 return {stage,svg,node,matrix};
}

test('catalogue selection uses the exact configurator arrow shape and no blue frame or square handles',t=>{
 const {stage,svg,node}=selectionDom(t),object={id:'text-1',x:20,y:30,w:20,h:10,size:5};
 const before=structuredClone(object);drawSelection(stage,node,object,{arrows:true});
 const handles=stage.children.find(child=>child.dataset.editorSelection),buttons=handles.querySelectorAll('[data-corner]');
 assert.equal(handles.className,'ux-selection-handles');assert.equal(buttons.length,4);assert.equal(svg.children.length,0);
 assert.equal(handles.html,selectionArrowMarkup());assert.match(handles.html,/M5 14V5h9M5 5l14 14/);assert.doesNotMatch(handles.html,/<rect|#087bce|data-ux-handle="rotate"/);
 assert.deepEqual(buttons.map(button=>button.dataset.editorResize),['-1,-1','1,-1','-1,1','1,1']);
 assert.deepEqual(buttons.map(button=>button.style),[{left:'56px',top:'36px'},{left:'124px',top:'36px'},{left:'56px',top:'84px'},{left:'124px',top:'84px'}]);
 assert.deepEqual(object,before);assert.equal(handles.children[0].textContent,selectionArrowStyles);
});

test('catalogue arrows keep their screen offset while scaling and disappear for protected or absent selection',t=>{
 const {stage,node,matrix}=selectionDom(t),object={id:'motif-1',w:20,h:10};
 drawSelection(stage,node,object,{arrows:true});matrix.a=matrix.d=4;drawSelection(stage,node,object,{arrows:true});
 assert.equal(stage.children.filter(child=>child.dataset.editorSelection).length,1);
 const handles=stage.children.find(child=>child.dataset.editorSelection);assert.equal(handles.querySelectorAll('[data-corner]')[0].style.left,'36px');
 drawSelection(stage,node,object,{arrows:true,editable:false});assert.equal(stage.children.filter(child=>child.dataset.editorSelection).length,0);
 drawSelection(stage,null,null,{arrows:true});assert.equal(stage.children.length,1);
});

test('shared Konfi arrows retain the final CSS cascade, four directions and radial resizing',()=>{
 for(const rotation of [0,90,180,270])assert.ok(selectionArrowStyles.includes('rotate('+rotation+'deg)'));
 assert.match(selectionArrowStyles,/width:19px!important/);assert.match(selectionArrowStyles,/width:14px!important/);assert.match(selectionArrowStyles,/width:44px;height:44px;left:50%;top:50%;transform:translate\(-50%,-50%\);background:transparent/);assert.match(selectionArrowMarkup(),/stroke-width="2\.4"/);assert.match(selectionArrowStyles,/#17634d/);assert.match(selectionArrowStyles,/#bad3c5/);
 assert.equal(selectionScaleFactor({x:10,y:20},{x:13,y:24},{x:16,y:28}),2);
 assert.equal(selectionScaleFactor({x:10,y:20},{x:13,y:24},{x:6,y:23}),1,'a tangential pointer movement keeps the radial size');
 const konfi=fs.readFileSync(new URL('../configurator/variant-m/refinements.mjs',import.meta.url),'utf8'),editor=fs.readFileSync(new URL('./ui/product-editor-ui.mjs',import.meta.url),'utf8');
 assert.match(konfi,/handles.innerHTML=selectionArrowMarkup\(\)/);assert.match(konfi,/positionSelectionArrows\(handles,o,point,margin\)/);assert.match(konfi,/selectionScaleFactor\(start,resize.start,p\)/);
 assert.match(editor,/arrows:!!state.katalogEditor/);assert.match(editor,/state.katalogEditor\?selectionScaleFactor\(original,drag.start,point\)/);
});


test('catalogue Konfi arrow keyboard commands retain focus across rerender and preview without stealing focus',t=>{
 const editor=fs.readFileSync(new URL('./ui/product-editor-ui.mjs',import.meta.url),'utf8'),start=editor.indexOf(" stage.addEventListener('keydown',e=>{"),end=editor.indexOf('\n });',start)+5;
 assert.ok(start>=0&&end>start);let listener,remembered=0,dirty=0,prevented=0;
 const object={id:'text-1',type:'text',text:'A\nA',font:'Source',size:10,lineHeight:6.81,w:5,h:18.81,x:30,y:20},fonts={Source:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0L1 1'}}}}};
 const {stage,node}=selectionDom(t);stage.addEventListener=(_name,fn)=>{listener=fn;};
 const redraw=()=>drawSelection(stage,node,object,{arrows:true});redraw();
 const focused=stage.querySelector('[data-editor-selection]').querySelectorAll('[data-corner]')[1];focused.focus();
 const state={katalogEditor:{},record:{status:'draft'},busy:false,draft:{config:{localResources:{fonts}}}},env={stage,state,drag:null,selected:()=>object,katalogProtected:()=>false,valid:()=>true,structuredClone,setTextSize,measureText,remember:()=>remembered++,markDirty(){dirty++;redraw();},properties:redraw,fitPosition(){throw Error('No automatic catalogue fitting');},$:()=>({})};
 vm.runInNewContext(editor.slice(start,end),env);
 const event={key:'ArrowRight',get target(){return document.activeElement;},preventDefault(){prevented++;}};
 listener(event);assert.equal(object.size,10.3);assert.ok(Math.abs(object.lineHeight-6.81*1.03)<1e-12);assert.equal(object.x,30);assert.equal(object.y,20);assert.equal(remembered,1);assert.equal(dirty,1);assert.equal(prevented,1);
 assert.equal(document.activeElement,focused);replaceEditorPreview(stage,'<svg></svg>',{arrows:true});redraw();assert.equal(document.activeElement,focused);
 listener(event);assert.ok(Math.abs(object.size-10*1.03*1.03)<1e-12);assert.equal(document.activeElement,focused);assert.equal(remembered,2);
 Object.assign(object,{type:'motif',w:20,h:10});listener(event);assert.equal(object.w,20.6);assert.equal(object.h,10.3);assert.equal(remembered,3);
 state.busy=true;listener(event);assert.equal(remembered,3);
 const other=document.createElement('input');other.focus();redraw();replaceEditorPreview(stage,'<svg></svg>',{arrows:true});redraw();assert.equal(document.activeElement,other,'rerender must never steal focus from another field');
 const calls=editor.match(/drawSelection\([^\n]+/g)||[];assert.equal(calls.length,2);assert.ok(calls.every(call=>call.includes('arrows:!!state.katalogEditor')),'highlight and active drag must both use arrows');
});
