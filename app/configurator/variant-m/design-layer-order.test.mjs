import test from 'node:test';
import assert from 'node:assert/strict';
import {designPaintOrder} from '../../platform/sources/app/shared/models/design-layer-order.mjs';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';

const objects=[{id:'text-a',type:'text',text:'',font:'Arial',x:20,y:20,w:10,h:5,rotation:0},{id:'logo',type:'graphic',shape:'rect',x:20,y:20,w:10,h:5,rotation:0},{id:'text-b',type:'text',text:'',font:'Arial',x:20,y:20,w:10,h:5,rotation:0},{id:'motif',type:'graphic',shape:'rect',x:20,y:20,w:10,h:5,rotation:0}];
test('new designs paint text after logos/motifs without changing IDs, source order or relative text order',()=>{
 const design={objects:structuredClone(objects),textOnTop:true},before=structuredClone(design);
 const ordered=designPaintOrder(design);
 assert.deepEqual(ordered.map(o=>o.id),['logo','motif','text-a','text-b']);assert.deepEqual(design,before);assert.equal(ordered[2],design.objects[0]);
});
test('historic snapshots keep their exact paint order',()=>{
 const design={objects};assert.equal(designPaintOrder(design),objects);assert.deepEqual(designPaintOrder({...design,textOnTop:false}),objects);
});
test('real universal SVG puts text on top only for an explicitly saved rule',()=>{
 const profile={kind:'universal-product',geometry:{shape:'rect',width:120,height:80,holes:[]},material:{kind:'steel',finish:'brushed'},production:{method:'engraving'}};
 for(const textOnTop of [undefined,true]){
  const svg=studioSvg(profile,{id:'d',name:'Test',objects,textOnTop},{},{handles:false});
  const ids=[...svg.matchAll(/data-object="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,textOnTop?['logo','motif','text-a','text-b']:objects.map(o=>o.id));
 }
});
