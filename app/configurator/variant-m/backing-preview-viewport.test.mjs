import test from 'node:test';import assert from 'node:assert/strict';
import {updateBackingPreviewViewport,productPreviewSize} from './backing-preview-viewport.mjs';
const node=()=>({values:{},style:{setProperty(k,v){this[k]=v;}},setAttribute(k,v){this.values[k]=v;}});
test('legacy viewport keeps SS backing inside and measures the 180 by 120 front, also after sync',()=>{
 const scene=node(),x=node(),y=node(),host=node(),nodes={'.plate-holder':[node()],'.ux-preview':[node()],'.scene':[scene],'.dimension-x':[x],'.dimension-y':[y]};host.shadowRoot={querySelectorAll:s=>nodes[s]};
 const profile={geometry:{width:180,height:120},backingPreview:{offsetMm:10}},before=JSON.stringify(profile);
 for(let i=0;i<2;i++){
  scene.values.viewBox='0 0 180 120';updateBackingPreviewViewport(host,profile);
  assert.equal(scene.values.viewBox,'-13.6 -13.6 207.2 147.2');assert.equal(nodes['.plate-holder'][0].style['aspect-ratio'],'207.2/147.2');assert.equal(host.style['--m-plate-width'],'207.2');assert.equal(host.style['--m-plate-height'],'147.2');
  assert.ok(Math.abs(parseFloat(x.style.left)*207.2/100-13.6)<1e-9);assert.ok(Math.abs(parseFloat(x.style.width)*207.2/100-180)<1e-9);
  assert.ok(Math.abs(parseFloat(y.style.top)*147.2/100-13.6)<1e-9);assert.ok(Math.abs(parseFloat(y.style.height)*147.2/100-120)<1e-9);assert.equal(x.style.right,'auto');assert.equal(y.style.bottom,'auto');
 }
 assert.equal(JSON.stringify(profile),before);
});
test('ordinary single plates do not change their existing viewport or dimensions',()=>{
 updateBackingPreviewViewport({shadowRoot:{querySelectorAll(){assert.fail('must not touch ordinary previews');}}},{geometry:{width:180,height:120}});
});

test('responsive stage fits the complete backing without changing front dimensions',()=>{
 const el={state:{width:180,height:120},uxSelectedProfile:()=>({geometry:{width:180,height:120},backingPreview:{offsetMm:10}})};
 assert.deepEqual(productPreviewSize(el),{width:207.2,height:147.2});assert.deepEqual(el.state,{width:180,height:120});
 assert.deepEqual(productPreviewSize({state:{width:160,height:160}}),{width:160,height:160});
});
