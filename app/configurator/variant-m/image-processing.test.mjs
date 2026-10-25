import test from 'node:test';
import assert from 'node:assert/strict';
import {removeConnectedBackground,fittedSize,scaleObject,editedPhotoSize} from './image-processing.mjs';

test('Freistellung entfernt nur die verbundene Hintergrundfläche; Motiv bleibt erhalten',()=>{
  const w=5,h=5,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,v=(x===0||y===0||x===4||y===4||x===2&&y===2)?255:0;data.set([v,v,v,255],i);}
  assert.equal(removeConnectedBackground(data,w,h,0,0,10),16);
  assert.equal(data[(2*w+2)*4+3],255,'Eingeschlossene gleichfarbige Fläche bleibt erhalten');
  assert.equal(data[(1*w+1)*4+3],255,'Dunkles Motiv bleibt erhalten');
});
test('Arbeitsvorschau hat begrenzte Auflösung, richtige Proportionen und nie leere Kanten',()=>{
  assert.deepEqual(fittedSize(4000,3000),{width:1600,height:1200});assert.deepEqual(fittedSize(500,1000),{width:500,height:1000});assert.deepEqual(fittedSize(1,40000),{width:1,height:1600});assert.throws(()=>fittedSize(0,20));
});
test('Skalieren hält Bildproportionen und Text-Mindestgröße ein',()=>{
  const image={type:'image',w:30,h:20,x:10,y:10};assert.deepEqual(scaleObject(image,2),{...image,w:60,h:40});assert.equal(image.w,30);
  assert.equal(scaleObject({type:'text',size:5},.5).size,4);assert.throws(()=>scaleObject(image,NaN));
});


test('photo output preserves crop source pixels, rotation and zoom without preview-size loss or artificial upscaling',()=>{
 assert.deepEqual(editedPhotoSize(4000,3000),{width:4000,height:3000,limited:false});
 assert.deepEqual(editedPhotoSize(4000,3000,{aspect:1,zoom:1.5}),{width:2000,height:2000,limited:false});
 assert.deepEqual(editedPhotoSize(4000,3000,{aspect:3/4,angle:90}),{width:3000,height:4000,limited:false});
 assert.deepEqual(editedPhotoSize(400,300,{aspect:1,zoom:1}),{width:300,height:300,limited:false});
 const large=editedPhotoSize(10000,10000);assert(large.limited);assert(large.width*large.height<=20_000_000);
 const tall=editedPhotoSize(100,40000);assert(tall.limited);assert.equal(tall.height,8192);
 assert.throws(()=>editedPhotoSize(4000,3000,{zoom:.5}));assert.throws(()=>editedPhotoSize(4000,3000,{angle:45}));
});

import {defaultPhotoColor,photoColorMode,photoColorFilter,photoEngravingPreviewFilter} from '../../platform/sources/app/shared/models/photo-color.mjs';
import {retainedPhotoUrls} from './image-processing.mjs';
test('photo defaults distinguish slate products, acrylic engraving and colour print',()=>{
 const p=(kind,profileId)=>({material:{kind},processing:{profileId}});
 assert.equal(defaultPhotoColor(p('slate','slate-engraving')),'grayscale');
 assert.equal(defaultPhotoColor(p('slate','color-print')),'grayscale');
 assert.equal(defaultPhotoColor(p('acrylic','acrylic-engraving')),'grayscale');
 for(const profile of [p('acrylic','color-print'),p('steel','steel-engraving'),p('wood','wood-engraving')])assert.equal(defaultPhotoColor(profile),'original');
 const explicit={type:'photoSlot',uxUploadKind:'photo',uxUploadId:'customer',uxPhotoColor:'original'},before=structuredClone(explicit);
 for(const profile of [p('slate','slate-engraving'),p('acrylic','acrylic-engraving'),p('slate','color-print')])for(let sync=0;sync<3;sync++)assert.equal(photoColorMode(profile,explicit),'original');
 assert.deepEqual(explicit,before);
 assert.equal(photoColorFilter('original'),'');assert.match(photoColorFilter('grayscale'),/saturate/);
});
test('light engraving preview uses continuous luminance and multiplies original alpha without colour-key deletion',()=>{
 const slate={material:{kind:'slate'},processing:{profileId:'slate-engraving'}};
 const xml=photoEngravingPreviewFilter(slate,'grayscale');
 const values=/values="([^"]+)"/.exec(xml)[1].split(/\s+/).map(Number),alpha=([r,g,b,a])=>(values[15]*r+values[16]*g+values[17]*b+values[18]*a+values[19])*a;
 assert.equal(alpha([0,0,0,1]),0);assert.equal(alpha([1,1,1,1]),1);
 assert(Math.abs(alpha([.05,.05,.05,.4])-.02)<1e-10,'dark fur is continuous ink strength, no threshold');
 assert.equal(alpha([1,1,1,0]),0);assert.match(xml,/in2="SourceAlpha" operator="in"/);
 assert.equal(photoEngravingPreviewFilter(slate,'original'),'');
 assert.equal(photoEngravingPreviewFilter({...slate,processing:{profileId:'color-print'}},'grayscale'),'');
});
test('original photo URLs are recovered only from original retained bytes',()=>{
 const original=new Blob(['source']),source={file:original,url:'blob:edited',edited:true},seen=[];
 assert.deepEqual(retainedPhotoUrls(source,b=>{seen.push(b);return 'blob:source';}),{originalUrl:'blob:source',editSourceUrl:'blob:edited'});
 assert.deepEqual(seen,[original]);assert.equal(source.originalUrl,undefined);
 assert.deepEqual(retainedPhotoUrls({url:'blob:original'}),{originalUrl:'blob:original',editSourceUrl:'blob:original'});
});

test('only explicit customer photo uploads receive the automatic material colour',()=>{
 const profile={material:{kind:'slate'},processing:{profileId:'slate-engraving'}};
 const upload={type:'photoSlot',uxUploadKind:'photo',uxUploadId:'customer-upload'};
 assert.equal(photoColorMode(profile,upload),'grayscale');
 for(const template of [
  {type:'photoSlot'},
  {type:'photoSlot',media:{mediaId:'original-template-png',revisionId:'1'}},
  {type:'photoSlot',placeholder:true,alpha:true},
  {type:'photoSlot',uxUploadKind:'photo'},
  {type:'photoSlot',uxUploadKind:'photo',uxUploadId:''},
  {type:'image',uxUploadKind:'logo',uxUploadId:'logo'},
  {type:'image',uxUploadKind:'photo',uxUploadId:'misclassified'}
 ]){
  const before=structuredClone(template);
  assert.equal(photoColorMode(profile,template),'original');
  assert.deepEqual(template,before);
 }
});
