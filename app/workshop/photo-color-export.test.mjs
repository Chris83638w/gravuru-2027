import test from 'node:test';
import assert from 'node:assert/strict';
import {nativePhotoTreatment} from './acrylic-artwork.mjs';
import {rasterizePrint,formPrintSettings} from './form-print-proof.mjs';

// Synthetic red square with 50% alpha, not a catalogue or customer photograph.
const bytes='iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8z8DQwIAEmJA5xAkAAGQRAYepirHLAAAAAElFTkSuQmCC';
const profile={material:{kind:'slate'},processing:{profileId:'color-print'}};
const object={type:'photoSlot',uxUploadKind:'photo',uxUploadId:'customer-photo'};
const geometry={schema:'gravuru-contour/v1',widthMm:10,heightMm:10,contours:[{role:'outer',d:'M0 0H10V10H0Z'}]};
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="10mm" height="10mm" viewBox="0 0 10 10"><g data-native-design="true"><g data-field="photo"><g data-photo-pan="photo"><image href="data:image/png;base64,'+bytes+'" x="0" y="0" width="10" height="10"/></g></g></g></svg>';
async function raster(treatment){
 const result=await rasterizePrint({svg,geometry,settings:formPrintSettings({white:'none',bleedMm:0}),textFields:[],photoFields:['photo'],photos:[{fieldId:'photo',bytes,width:4,height:4,...treatment}]});
 const rgb=Buffer.from(result.rgb,'base64'),alpha=Buffer.from(result.alpha,'base64'),i=Math.floor(result.height/2)*result.width+Math.floor(result.width/2);
 return {rgb:[...rgb.subarray(i*3,i*3+3)],alpha:alpha[i]};
}
test('slate print server output matches grayscale default and explicit original with alpha retained',async()=>{
 const gray=await raster(nativePhotoTreatment(profile,object));
 assert(gray.rgb.every(v=>Math.abs(v-54)<=1),JSON.stringify(gray));
 assert(Math.abs(gray.alpha-128)<=1);
 const original=await raster(nativePhotoTreatment(profile,{...object,uxPhotoColor:'original'}));
 assert.deepEqual(original.rgb,[255,0,0]);assert(Math.abs(original.alpha-128)<=1);
 assert.equal(bytes,'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8z8DQwIAEmJA5xAkAAGQRAYepirHLAAAAAElFTkSuQmCC');
});
test('already applied pixels, acrylic print and engraving production are never transformed twice',async()=>{
 assert.equal(nativePhotoTreatment(profile,object,{edited:true}).tone,'original');
 assert.equal(nativePhotoTreatment(profile,object,{engraving:true}).tone,'original');
 const acrylic={material:{kind:'acrylic'},processing:{profileId:'color-print'}};
 assert.equal(nativePhotoTreatment(acrylic,object).tone,'original');
 const unchanged=await raster(nativePhotoTreatment(profile,object,{edited:true}));
 assert.deepEqual(unchanged.rgb,[255,0,0]);
});

import {ACRYLIC_PRINT_RECIPE,acrylicPrintKey} from './acrylic-print-proof.mjs';
import {digest} from './review-package.mjs';
test('native photo colour output uses a new recipe cache key',()=>{
 assert.equal(ACRYLIC_PRINT_RECIPE,'gravuru-acrylic-print-proof/v7');
 assert.notEqual(acrylicPrintKey({}),digest(JSON.stringify({recipe:'gravuru-acrylic-print-proof/v6',settings:formPrintSettings({})})));
 assert.notEqual(acrylicPrintKey({}),digest(JSON.stringify({recipe:'gravuru-acrylic-print-proof/v5',settings:formPrintSettings({})})));
});

test('template photo references keep original PNG colour; customer defaults do not spill into templates',async()=>{
 for(const template of [{type:'photoSlot'},{type:'photoSlot',media:{mediaId:'template-png',revisionId:'1'}},{type:'photoSlot',uxUploadKind:'photo'}]){
  assert.equal(nativePhotoTreatment(profile,template).tone,'original');
 }
 const template={type:'photoSlot',media:{mediaId:'template-png',revisionId:'1'}};
 const original=await raster(nativePhotoTreatment(profile,template));
 assert.deepEqual(original.rgb,[255,0,0]);assert(Math.abs(original.alpha-128)<=1);
});
