import test from 'node:test';import assert from 'node:assert/strict';
import {updateBackingPreviewViewport,productPreviewSize} from './backing-preview-viewport.mjs';
import {universalPreviewViewport} from '../../platform/sources/app/shared/models/studio-svg.mjs';
const node=()=>({values:{},style:{setProperty(k,v){this[k]=v;}},setAttribute(k,v){this.values[k]=v;}});

test('139: stake working view ends after the head plus 10mm, full product preview stays full length',()=>{
 const profile={geometry:{width:120,height:300},workingArea:{headHeightMm:100,previewHeightMm:110}},before=JSON.stringify(profile);
 const scene=node(),y=node(),host=node(),nodes={'.plate-holder':[node()],'.ux-preview':[node()],'.scene':[scene],'.dimension-x':[node()],'.dimension-y':[y]};host.shadowRoot={querySelectorAll:s=>nodes[s]};
 updateBackingPreviewViewport(host,profile);
 assert.equal(scene.values.viewBox,'-4.2 -4.2 128.4 118.4');assert.equal(y.style.display,'none');
 assert.equal(scene.style.overflow,'hidden','legacy overflow:visible must not expose the complete stem beyond the working view');
 assert.deepEqual(productPreviewSize({state:{width:120,height:300},uxSelectedProfile:()=>profile}),{width:128.4,height:118.4});
 assert.deepEqual(universalPreviewViewport(profile),[-10.500000000000002,-10.500000000000002,141,321]);
 assert.equal(JSON.stringify(profile),before);
});
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
