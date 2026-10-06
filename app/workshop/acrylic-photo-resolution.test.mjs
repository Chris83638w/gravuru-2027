import test from 'node:test';
import assert from 'node:assert/strict';
import {acrylicPhotoResolution as measure} from './acrylic-photo-resolution.mjs';

const photo={uploadId:'test',path:'fotos/original.png',width:1200,height:600};
const slot={id:'photo',type:'photoSlot',w:101.6,h:50.8};
test('native photo density follows physical scale and crop zoom, not pan or rotation',()=>{
 assert.equal(measure(slot,photo,1).effectiveDpi,300);
 assert.equal(measure(slot,photo,2).effectiveDpi,150);
 const zoomed={...slot,uxPhotoCrop:{zoom:2,x:1,y:-1,angle:90},rotation:37};
 assert.equal(measure(zoomed,photo,1).effectiveDpi,150);
 assert.equal(measure({...zoomed,uxPhotoCrop:{zoom:2}},photo,1).effectiveDpi,150);
 assert.equal(measure({...slot,w:50.8},photo,1).effectiveDpi,300); // cover, not squeezed pixels
});
test('edited image pixels and each placement determine density; originals remain intact',()=>{
 const edited={...photo,edited:{path:'fotos/edited.png',width:200,height:200}};
 const result=measure(slot,edited,1);
 assert.equal(result.frameCovered,true);assert.equal(measure({...slot,uxPhotoCrop:{zoom:.5}},edited,1).frameCovered,false);assert.equal(result.source,'edited');assert.equal(result.effectiveDpi,50);
 assert.equal(result.placedHeightMm,101.6);assert.equal(result.path,'fotos/edited.png');
 assert.equal(photo.width,1200);assert.equal(edited.width,1200);
 assert.equal(measure({...slot,w:50.8,h:25.4},edited,1).effectiveDpi,100);
 assert.equal(measure(slot,{...photo,width:0},1),null);
});
test('free uploads use contained image dimensions rather than the photo-slot cover',()=>{
 const square={...slot,type:'image',w:101.6,h:101.6};
 const contained=measure(square,photo,1),covered=measure({...square,type:'photoSlot'},photo,1);
 assert.equal(contained.effectiveDpi,300);assert.equal(contained.placedHeightMm,50.8);
 assert.equal(covered.effectiveDpi,150);assert.equal(covered.placedWidthMm,203.2);
});
