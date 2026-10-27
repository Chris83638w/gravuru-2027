import test from 'node:test';
import assert from 'node:assert/strict';
import {mainImageSvg,embedDoorbellImages} from './render-doorbell-main-images.mjs';
test('main image retains each exact product aspect ratio inside a neutral square',()=>{
 for(const [w,h]of [[176,296],[256,216],[366,196]]){
  const image=mainImageSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 '+w+' '+h+'"><rect width="160" height="280"/></svg>');
  const nested=image.match(/viewBox="-8 -8 [^"]+" x="[^"]+" y="[^"]+" width="([^"]+)" height="([^"]+)"/);
  assert.ok(nested);assert.ok(Math.abs(Number(nested[1])/Number(nested[2])-w/h)<1e-12);
  assert.match(image,/width="1600" height="1600"/);assert.match(image,/fill="#f5f4f1"/);
 }
});
test('main image export refuses unindexed remote or local image references',()=>{
 for(const href of ['https://example.test/device.webp','/api/workshop/design-assets/unknown/preview.svg']){
  assert.throws(()=>embedDoorbellImages('<svg><image href="'+href+'"/></svg>',{devicesDir:'.',indexDir:'.',assetIndex:{entries:[]}}),/nicht im geprüften/);
 }
 assert.throws(()=>mainImageSvg('<svg></svg>'),/Maßhaltige/);
});

