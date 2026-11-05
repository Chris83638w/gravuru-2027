import test from 'node:test';import assert from 'node:assert/strict';
import {fitUploadedPhoto,resizePhoto,photoSizeLimit} from './photo-upload-geometry.mjs';
import {photoPlacement} from './photo-position-model.mjs';
test('portrait and landscape uploads are wholly visible without changing their proportions or centre',()=>{
 for(const asset of [{width:400,height:800},{width:1200,height:400}]){
  const o={type:'photoSlot',photoShape:'rect',x:70,y:45,w:50,h:35};fitUploadedPhoto(o,asset);
  assert.ok(Math.abs(o.w/o.h-asset.width/asset.height)<1e-12);assert.equal(o.x,70);assert.equal(o.y,45);
  const p=photoPlacement(o,asset);assert.ok(p.w<=o.w+1e-9);assert.ok(p.h<=o.h+1e-9);
 }
});
test('photo size slider keeps ratio and crop while keeping a rotated photo on the plate',()=>{
 const o={x:110,y:75,w:20,h:40,rotation:30,uxPhotoCrop:{zoom:1.3,x:.1,y:-.2,angle:0}};
 const crop=structuredClone(o.uxPhotoCrop),max=photoSizeLimit(o,120,80);resizePhoto(o,999,120,80);
 assert.equal(o.w,max);assert.equal(o.h/o.w,2);assert.deepEqual(o.uxPhotoCrop,crop);
 const a=o.rotation*Math.PI/180,rx=(o.w*Math.cos(a)+o.h*Math.sin(a))/2,ry=(o.w*Math.sin(a)+o.h*Math.cos(a))/2;
 assert.ok(o.x-rx>=-1e-9&&o.x+rx<=120+1e-9&&o.y-ry>=-1e-9&&o.y+ry<=80+1e-9);
});
test('fixed or shaped product photo geometry stays fixed on replacement',()=>{
 for(const extra of [{acrylicFixed:true},{photoShape:'heart'},{photoMaskAssetId:'mask'}]){const o={type:'photoSlot',photoShape:'rect',x:10,y:10,w:50,h:35,...extra},before={...o};fitUploadedPhoto(o,{width:400,height:800});assert.deepEqual(o,before);}
});
