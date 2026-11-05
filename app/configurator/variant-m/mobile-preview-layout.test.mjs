import test from 'node:test';
import assert from 'node:assert/strict';
import {mobilePreviewHeight} from './mobile-preview-layout.mjs';

test('mobile preview shrinks continuously on downward scrolling and restores at the top',()=>{
 for(const [width,height] of [[390,664],[375,548],[430,932]]){
  const args={width,height,ratio:1.5},expanded=mobilePreviewHeight(args);
  const middle=mobilePreviewHeight({...args,scrollTop:48}),compact=mobilePreviewHeight({...args,scrollTop:96});
  assert.ok(expanded>middle&&middle>compact);
  assert.equal(mobilePreviewHeight({...args,scrollTop:10000}),compact);
  assert.equal(mobilePreviewHeight({...args,scrollTop:-30}),expanded);
  assert.ok(compact>=156&&expanded<=height*.5);
 }
});
test('short and tall products fit the available width and preserve room for editing',()=>{
 const args={width:390,height:664};
 assert.equal(mobilePreviewHeight({...args,ratio:3}),202);
 assert.equal(mobilePreviewHeight({...args,ratio:.5}),332);
 assert.equal(mobilePreviewHeight({...args,ratio:0}),mobilePreviewHeight(args));
});
test('keyboard height is stable regardless of the previous scroll position',()=>{
 for(const scrollTop of [0,48,10000])assert.equal(mobilePreviewHeight({width:375,height:300,scrollTop,keyboardOpen:true}),156);
});
test('design gallery leaves room for the first row immediately on small phones',()=>{
 for(const [width,height] of [[390,664],[375,548],[430,932]]){
  const args={width,height,ratio:1.5,galleryOpen:true};
  assert.ok(mobilePreviewHeight(args)<=200);
  assert.equal(mobilePreviewHeight(args),mobilePreviewHeight({...args,scrollTop:200}));
  assert.equal(mobilePreviewHeight(args),mobilePreviewHeight({...args,galleryOpen:false,scrollTop:96}));
 }
});
