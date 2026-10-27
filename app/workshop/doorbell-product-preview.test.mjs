import test from 'node:test';
import assert from 'node:assert/strict';
import {previewFonts} from './product-preview.mjs';
test('new doorbell previews resolve shared fonts transiently with local overrides',()=>{
 const local={fonts:{Custom:{regular:{name:'local'}}},motifs:[]};
 const config={doorbell:{schema:'gravuru-doorbell/v1'},localResources:local},before=structuredClone(config);
 let calls=0;
 const fonts=previewFonts(config,input=>{calls++;assert.equal(input,local);return {fonts:{Shared:{regular:{name:'library'}},...input.fonts}};});
 assert.equal(calls,1);assert.equal(fonts.Shared.regular.name,'library');assert.equal(fonts.Custom,local.fonts.Custom);
 assert.deepEqual(config,before);assert.equal(Object.hasOwn(config.localResources.fonts,'Shared'),false);
});
test('existing specimen and all other product previews keep their own resources',()=>{
 for(const doorbell of [undefined,{schema:'gravuru-aosu-specimen/v1'}]){
  const config={doorbell,localResources:{fonts:{Local:{}}}};
  assert.equal(previewFonts(config,()=>{throw Error('Existing products must not load the library');}),config.localResources.fonts);
 }
});

