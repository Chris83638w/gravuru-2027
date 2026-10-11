import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesignAssetStore} from './design-assets.mjs';
import {steelSpecimen} from './specimen-product.mjs';
import {makeProductDocument,validateProductDocument,resolveProduct,validateProductDesign} from './product-model.mjs';
import {resizeSteelDocument,steelSizeGroup} from '../configurator/variant-m/steel-formats.mjs';
import {replaceDesignArtwork} from './design-import.mjs';
import {prepareEditableDesign} from './editable-design.mjs';
import {objectIssue} from '../platform/sources/app/shared/models/design-content.mjs';
import {physicalGeometry,artworkViewport} from '../configurator/variant-m/print-geometry.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {productPreview} from './product-preview.mjs';
import {alignedPosition} from './ui/editor-guides.mjs';

test('steel resizing retains composition, rights and prices across rectangular, rounded, oval and circular shapes',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const original=makeProductDocument(await steelSpecimen(assets)),before=structuredClone(original);
 for(const g of [{width:180,height:120,shape:'rect',cornerRadiusMm:0},{width:130,height:90,shape:'rect',cornerRadiusMm:20},{width:180,height:120,shape:'ellipse',cornerRadiusMm:0},{width:150,height:150,shape:'ellipse',cornerRadiusMm:0}]){
  const next=validateProductDocument(resizeSteelDocument(original,{...g,safeMarginMm:3}));
  assert.deepEqual(next.elementRights,original.elementRights);
  for(const d of next.config.profile.designs){assert.equal(d.objects.length,original.config.profile.designs.find(v=>v.id===d.id).objects.length);for(const o of d.objects)assert.equal(objectIssue(o,next.config.profile),'');}
  const size=steelSizeGroup(next.config);size.values.push({...size.values[0],id:'large',widthMm:g.width*2,heightMm:g.height*2,priceCents:4599});
  const checked=validateProductDocument(next),r=resolveProduct(checked,{options:{size:'large'}});
  assert.equal(r.designSpace.scaleX,2);assert.equal(r.designSpace.scaleY,2);assert.equal(r.physical.widthMm,g.width*2);assert.equal(r.physical.heightMm,g.height*2);assert.equal(r.price.unitCents,4599);
  const geometry=physicalGeometry(checked.config,{mOptions:r.resolvedOptions});assert.equal(geometry.shape,g.shape);assert.equal(geometry.cornerRadiusMm,g.cornerRadiusMm*2);assert.equal(artworkViewport(checked.config,{mOptions:r.resolvedOptions}).scale,2);
  validateProductDesign(checked,r.design,{options:r.resolvedOptions});
  const shop=prepareShopProduct({id:'cfg-test',revision:1,status:'draft',document:checked});assert.deepEqual(shop.variants.map(v=>[v.widthMm,v.heightMm,v.priceCents]),[[g.width,g.height,1099],[g.width*2,g.height*2,4599]]);
  const svg=productPreview({universal:checked.config},{options:r.resolvedOptions});assert.match(svg,/data-material-surface/);assert.match(svg,g.shape==='ellipse'?/<ellipse cx=/:new RegExp('rx="'+g.cornerRadiusMm+'"'));
  size.values[1].heightMm++;assert.throws(()=>validateProductDocument(next),/Proportionen/);
 }
 assert.deepEqual(original,before);
});

test('oversized vector design fits actual steel contour before editable decomposition, without touching other designs',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const base=makeProductDocument(await steelSpecimen(assets));
 const source=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="220mm" height="140mm" viewBox="0 0 220 140"><path d="M0 0H220V140H0Z"/><path fill="white" d="M20 20H200V120H20Z"/></svg>');
 const asset=await assets.import({name:'Zu-gross.svg',bytes:source.toString('base64')});
 for(const shape of ['rect','ellipse']){
  const d=resizeSteelDocument(base,{width:90,height:60,shape,cornerRadiusMm:shape==='rect'?12:0,safeMarginMm:2}),id=d.config.profile.defaultDesignId;
  const input={designId:id,assetId:asset.assetId,originalName:'Zu-gross.svg',fit:'visible'};
  const plan=replaceDesignArtwork(d,assets,input);assert.ok(plan.placement.widthMm<90&&plan.placement.heightMm<60);
  assert.equal(objectIssue(plan.document.config.profile.designs.find(v=>v.id===id).objects[0],plan.document.config.profile),'');
  const editable=await prepareEditableDesign(plan.document,assets,id);assert.ok(editable.parts.length);validateProductDocument(editable.document);
  assert.deepEqual(editable.document.config.profile.designs.find(v=>v.id!==id),d.config.profile.designs.find(v=>v.id!==id));
  assert.throws(()=>replaceDesignArtwork(d,assets,{...input,fit:'original'}),e=>e.code==='original_does_not_fit');
 }
 assert.deepEqual(assets.read(asset.assetId,true),source);
});

test('alignment chooses nearest edges and centers, supports unsnapped drag and rotated bounds',()=>{
 const g={width:100,height:60,safeMarginMm:2},o={id:'move',x:49.3,y:19.4,w:10,h:10,rotation:0},other={id:'fixed',x:25,y:20,w:10,h:10,rotation:0};
 const result=alignedPosition(o,g,[o,other]);assert.equal(result.object.x,50);assert.equal(result.object.y,20);assert.equal(result.lines.length,2);assert.equal(o.x,49.3);
 const free=alignedPosition(o,g,[other],{snap:false});assert.equal(free.object.x,49.3);assert.equal(free.lines.length,2);
 assert.equal(alignedPosition({...o,x:42,y:33},g,[]).lines.length,0);
 assert.equal(alignedPosition({...o,x:50,rotation:45},g,[]).lines[0].value,50);
});
