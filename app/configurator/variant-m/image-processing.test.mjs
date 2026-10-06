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
