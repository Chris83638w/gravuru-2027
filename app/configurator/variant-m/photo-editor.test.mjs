import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoEditor} from './photo-editor.mjs';

function fixture(t,{material='slate',processing='slate-engraving',assetExtra={}}={}){
 const prior={document:globalThis.document,Image:globalThis.Image,create:URL.createObjectURL};
 const nodes=new Map(),draws=[];
 class Node{
  constructor(){this.value='';this.hidden=false;this.disabled=false;this.listeners=new Map();this.classList={add(){}};this.style={};this.parentElement=this;}
  querySelector(s){if(!nodes.has(s))nodes.set(s,new Node());return nodes.get(s);}
  append(){} before(){} insertBefore(){} closest(){return this;}
  addEventListener(k,fn){this.listeners.set(k,fn);}
  showModal(){this.open=true;} close(){this.open=false;}
 }
 class Canvas extends Node{
  constructor(){super();this.width=0;this.height=0;this.ctx={filter:'none',clearRect(){},save(){},restore(){},beginPath(){},ellipse(){},clip(){},translate(){},rotate(){},scale(){},drawImage:(image)=>draws.push({src:image.src,filter:this.ctx.filter,width:this.width,height:this.height}),getImageData:()=>({width:this.width,height:this.height}),putImageData(){}};}
  getContext(){return this.ctx;} toBlob(fn){fn(new Blob(['edited'],{type:'image/png'}));}
 }
 const d=new Node();nodes.set('canvas',new Canvas());
 globalThis.document={createElement:tag=>tag==='canvas'?new Canvas():new Node()};
 globalThis.Image=class{constructor(){this.naturalWidth=400;this.naturalHeight=300;}async decode(){}};
 let urls=0;URL.createObjectURL=()=>'blob:derived-'+(++urls);
 t.after(()=>{globalThis.document=prior.document;globalThis.Image=prior.Image;URL.createObjectURL=prior.create;});
 const file=new File(['unchanged-original-bytes'],'dog.png',{type:'image/png'});
 const source={file,url:'blob:original',width:400,height:300,...assetExtra},files=new Map([['original',source]]);
 const object={id:'photo',type:'photoSlot',uxUploadId:'original',uxUploadKind:'photo',photoShape:'rect',w:40,h:30};
 const open=createPhotoEditor({el:{uxCanEdit:()=>true},r:{},config:{profile:{material:{kind:material},processing:{profileId:processing}}},dialog:()=>d,button:()=>'',files,selected:()=>object,mutate:fn=>fn(),say(){}});
 const click=async key=>{const button=d.querySelector('[data-ux='+key+']');button.dataset={ux:key};await d.listeners.get('click')({target:button});};
 return {open,object,files,file,nodes,draws,click};
}
test('slate editor opens in grayscale; Original restore is committed and survives reopening',async t=>{
 const f=fixture(t);await f.open(f.object);
 assert.equal(f.nodes.get('[data-photo-color]').value,'grayscale');
 assert(f.draws.some(d=>d.filter==='grayscale(1)'));
 await f.click('photo-reset');assert.equal(f.nodes.get('[data-photo-color]').value,'original');
 await f.click('photo-apply');
 assert.equal(f.object.uxPhotoColor,'original');
 const saved=f.files.get(f.object.uxUploadId);
 assert.equal(saved.file,f.file);assert.equal(await saved.file.text(),'unchanged-original-bytes');
 assert.equal(saved.originalUrl,'blob:original');assert.equal(saved.photoEdit.color,'original');
 await f.open(f.object);assert.equal(f.nodes.get('[data-photo-color]').value,'original');
});
test('acrylic print editor keeps original colour',async t=>{
 const f=fixture(t,{material:'acrylic',processing:'color-print'});await f.open(f.object);
 assert.equal(f.nodes.get('[data-photo-color]').value,'original');
});
test('restored edited draft obtains its real original from retained File before reset',async t=>{
 const f=fixture(t,{assetExtra:{edited:true,url:'blob:edited',blob:new Blob(['edited'])}});
 await f.open(f.object);await f.click('photo-reset');await f.click('photo-apply');
 const saved=f.files.get(f.object.uxUploadId);
 assert.equal(saved.originalUrl,'blob:derived-1');
 assert.equal(saved.editSourceUrl,'blob:derived-1');
 assert.equal(saved.file,f.file);
 assert.equal(saved.photoEdit.color,'original');
 assert(f.draws.some(d=>d.src==='blob:derived-1'&&d.filter==='none'));
});

test('reloaded applied colour remains explicit without applying the baked filter twice',async t=>{
 const f=fixture(t,{assetExtra:{edited:true,url:'blob:edited',blob:new Blob(['edited'])}});f.object.uxPhotoColor='grayscale';
 await f.open(f.object);assert.equal(f.nodes.get('[data-photo-color]').value,'grayscale');assert.equal(f.draws.at(-1).filter,'none');
 await f.click('photo-apply');assert.equal(f.object.uxPhotoColor,'grayscale');
 await f.open(f.object);assert.equal(f.nodes.get('[data-photo-color]').value,'grayscale');assert.equal(f.draws.at(-1).filter,'none');
 await f.click('photo-reset');await f.click('photo-apply');assert.equal(f.object.uxPhotoColor,'original');
});

test('legacy edited colour photo without provenance still receives the material default',async t=>{
 const f=fixture(t,{assetExtra:{edited:true,url:'blob:legacy-colour',blob:new Blob(['colour'])}});
 await f.open(f.object);assert.equal(f.nodes.get('[data-photo-color]').value,'grayscale');assert.equal(f.draws.at(-1).filter,'grayscale(1)');
 await f.click('photo-apply');assert.equal(f.object.uxPhotoColor,'grayscale');
});
test('edited logo has no photo grayscale default after reload',async t=>{
 const f=fixture(t,{assetExtra:{edited:true,url:'blob:logo',blob:new Blob(['colour'])}});f.object.uxUploadKind='logo';f.object.type='image';
 await f.open(f.object);assert.equal(f.nodes.get('[data-photo-color]').value,'original');assert.equal(f.draws.at(-1).filter,'none');
 await f.click('photo-apply');assert.equal(f.object.uxPhotoColor,undefined);
});
