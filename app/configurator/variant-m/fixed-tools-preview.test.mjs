import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedToolsRequested,installFixedToolsPreview} from './fixed-tools-preview.mjs';

test('fixed tools require both a preview model and the explicit test link; normal customers keep existing UI',async()=>{
 for(const config of [null,{}, {productPreview:false},{productPreview:'true'}])assert.equal(fixedToolsRequested(config,'?tools=fixed'),false);
 for(const config of [{productPreview:true},{reviewOnly:true}]){
  assert.equal(fixedToolsRequested(config,''),false);
  assert.equal(fixedToolsRequested(config,'?tools=off'),false);
  assert.equal(fixedToolsRequested(config,'?fresh=1&tools=fixed'),true);
 }
 // No DOM, network or state access at all in the default path.
 assert.equal(await installFixedToolsPreview({config:{productPreview:true},search:''}),false);
});
