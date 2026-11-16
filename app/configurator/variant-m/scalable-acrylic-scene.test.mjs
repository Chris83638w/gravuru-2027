import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {combineScalableSizes} from './scalable-sizes.mjs';
import {selectedProfile,resolvedOptions,quote} from './contract.mjs';
import {ACRYLIC_BASES} from './acrylic-product.mjs';
import {isScalableAcrylicScene,scalableAcrylicSceneLayout,scalableAcrylicBackdrop,transparentScalableAcrylicFace} from './scalable-acrylic-scene.mjs';

// Synthetic native profiles test presentation only; these are not catalogue prices.
const sizes=[['10x14',100,140],['15x20',150,200],['20x27',200,270],['40x54',400,540]];
function fixture(){
 return combineScalableSizes(sizes.map(([id,width,height])=>({id,label:id,config:{basePriceCents:1000,extraMotifCents:169,photo:{enabled:true,mode:'upload-only'},profile:{id:'scene-test',revision:1,binding:{kind:'local-review',productId:null},material:{kind:'acrylic'},processing:{profileId:'color-print'},geometry:{width,height,shape:'rect',holes:[]},defaultDesignId:'d',designs:[{id:'d',objects:[]}],optionGroups:[{id:'base',name:'Sockel',required:true,defaultValueId:'none',values:ACRYLIC_BASES.map(b=>({id:b.id,label:b.label,priceCents:0,currency:'EUR'}))}]}}})),'15x20');
}

test('scalable backdrop preserves every native physical ratio and base anchoring without editing prices or config',()=>{
 const c=fixture(),before=JSON.stringify(c);
 for(const [size,width,height]of sizes)for(const base of ['none','buche','klar']){
  const values={size,base},p=selectedProfile(c,values),price=quote(c,[],'d',values),layout=scalableAcrylicSceneLayout(c,values);
  assert.deepEqual(layout.geometry,p.geometry);assert.deepEqual(layout.options,resolvedOptions(c,values));
  assert.ok(Math.abs(layout.plate.width/layout.plate.height-width/height)<1e-12);
  assert.equal(layout.plate.left+layout.plate.width/2,layout.square/2);
  if(base==='none')assert.equal(layout.stand,null);
  else{const insertion=ACRYLIC_BASES.find(b=>b.id===base).insertionMm;assert.equal(layout.stand.slot,layout.plate.top+layout.plate.height-insertion*layout.plate.height/height);assert.match(layout.stand.url,/-v2\.webp$/);}
  assert.deepEqual(quote(c,[],'d',values),price);assert.match(scalableAcrylicBackdrop(layout),/scene-empty-v2\.webp/);
 }
 assert.equal(JSON.stringify(c),before);
});

test('new scene is restricted to scalable acrylic colour print; engraving and legacy acrylic remain on their existing renderers',()=>{
 const c=fixture();assert.equal(isScalableAcrylicScene(c),true);
 for(const change of [v=>v.profile.processing.profileId='acrylic-engraving',v=>v.profile.material.kind='steel',v=>v.acrylic={},v=>delete v.scalableSizes]){
  const other=structuredClone(c);change(other);assert.equal(isScalableAcrylicScene(other),false);assert.equal(scalableAcrylicSceneLayout(other),null);
 }
 assert.equal(isScalableAcrylicScene(null),false);
});

class Node {
 constructor(localName,attributes={}){this.localName=localName;this.attrs={...attributes};this.children=[];this.dataset={};this.style={setProperty:(k,v)=>this.style[k]=v};this.classList={add(){}};this.innerHTML='';}
 getAttribute(k){return this.attrs[k]??null;} setAttribute(k,v){this.attrs[k]=String(v);} hasAttribute(k){return Object.hasOwn(this.attrs,k);} removeAttribute(k){delete this.attrs[k];}
 append(...nodes){this.children.push(...nodes);} prepend(...nodes){this.children.unshift(...nodes);} cloneNode(){return new Node(this.localName,this.attrs);}
}
test('preview transparency changes only the top-level physical plate; white objects and nested photo masks remain intact',()=>{
 const rect=extra=>new Node('rect',{width:'150',height:'200',fill:'#fff',stroke:'#ddd',...extra});
 const face=rect(),art=rect({'data-object':'white-art'}),offset=rect({x:'1'}),wrong=rect({width:'149'}),mask=rect(),group=new Node('g');group.children=[mask];
 const root=new Node('svg');root.children=[face,art,offset,wrong,group];
 assert.equal(transparentScalableAcrylicFace(root,{width:150,height:200}),root);
 assert.equal(face.getAttribute('fill'),'transparent');assert.equal(face.getAttribute('stroke'),'none');
 for(const preserved of [art,offset,wrong,mask])assert.equal(preserved.getAttribute('fill'),'#fff');
});

test('installed scene follows native size changes and bypasses every preview rewrite for production SVG',async()=>{
 const source=fs.readFileSync(new URL('./acrylic-scene.mjs',import.meta.url),'utf8'),start=source.indexOf('export async function installScalableAcrylicScene');
 assert.ok(start>0);let parseCalls=0,refreshes=0;const css=new Node('style'),stage=new Node('div'),artwork=new Node('svg'),holder={querySelector:()=>artwork};
 const r={host:{dataset:{}},querySelector:s=>s==='.stage'?stage:s==='.plate-holder'?holder:null,append:n=>assert.equal(n,css)};
 const config=fixture(),el={state:{mOptions:{size:'15x20',base:'none'}},svgBody:(preview,marker)=>`native-${preview}-${marker}`,sync(){},render(){},uxRefreshViewZoom(){refreshes++;}};
 const context={isScalableAcrylicScene,scalableAcrylicSceneLayout,scalableAcrylicBackdrop,transparentScalableAcrylicFace,fetch:async()=>({ok:true,text:async()=>''}),document:{createElement:tag=>tag==='style'?css:new Node(tag),createElementNS:(_,tag)=>new Node(tag)},DOMParser:class{parseFromString(){parseCalls++;throw Error('Production must not invoke DOM parsing');}}};
 const install=vm.runInNewContext(source.slice(start).replace('export async function','async function')+'\ninstallScalableAcrylicScene;',context);
 await install({el,r,config});assert.equal(r.host.dataset.scalableAcrylicScene,'true');assert.equal(artwork.getAttribute('viewBox'),'0 0 150 200');
 assert.equal(el.svgBody(false,'original'),'native-false-original');assert.equal(parseCalls,0);
 el.state.mOptions={size:'40x54',base:'buche'};el.sync();assert.equal(artwork.getAttribute('viewBox'),'0 0 400 540');assert.equal(stage.dataset.hasBase,'true');assert.ok(refreshes>=2);
 const children=stage.children.length;await install({el,r,config});assert.equal(stage.children.length,children,'installation is idempotent');
});
