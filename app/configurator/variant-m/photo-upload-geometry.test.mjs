import test from 'node:test';import assert from 'node:assert/strict';
import {fitUploadedPhoto,resizePhoto,photoSizeLimit,newPhotoBounds} from './photo-upload-geometry.mjs';
import {photoPlacement} from './photo-position-model.mjs';
import fs from 'node:fs';import vm from 'node:vm';
test('the actual upload sync keeps a new photo centered even on a full design; logos retain free placement',()=>{
 const photo={id:'new-photo',type:'photoSlot',photoShape:'rect',uxPersonal:true,uxUploadKind:'photo',uxUploadId:'file',...newPhotoBounds(220,140)};
 fitUploadedPhoto(photo,{width:400,height:600});const before=structuredClone(photo);
 const old={...photo,id:'existing',x:35,y:45},logo={id:'logo',uxUploadKind:'logo',uxUploadId:'logo-file'};
 const placed=[],env={el:{state:{objects:[{id:'full-design',x:110,y:70,w:220,h:140},photo,old,logo]},sync(){}},known:new Set(['full-design','existing']),changing:false,place:o=>{placed.push(o.id);o.x=5;o.y=5;o.w=10;},rename(){},arrangeGallery(){},guides(){},$:()=>null};
 const line=fs.readFileSync(new URL('./workflow.mjs',import.meta.url),'utf8').split(/\r?\n/).find(s=>s.startsWith(' const sync=el.sync;'));
 vm.runInNewContext(line,env);env.el.sync();assert.deepEqual(photo,before);assert.equal(old.x,35);assert.deepEqual(placed,['logo']);
 photo.x=72;env.el.sync();assert.equal(photo.x,72,'later manual movement must remain');assert.deepEqual(placed,['logo']);
});
test('new free photos start centered and visibly large in both sizes without cropping portrait or landscape sources',()=>{
 for(const [width,height] of [[220,140],[300,200]])for(const asset of [{width:400,height:600},{width:1200,height:400}]){
  const o={type:'photoSlot',photoShape:'rect',...newPhotoBounds(width,height)};fitUploadedPhoto(o,asset);
  assert.equal(o.x,width/2);assert.equal(o.y,height/2);assert.ok(o.w<=width*.6+1e-9&&o.h<=height*.65+1e-9);
  assert.ok(o.w>50||o.h>50,'new upload must be visibly larger than the former small 50-mm box');
  assert.ok(Math.abs(o.w/o.h-asset.width/asset.height)<1e-9);const p=photoPlacement(o,asset);assert.ok(p.w<=o.w+1e-9&&p.h<=o.h+1e-9);
 }
});
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
