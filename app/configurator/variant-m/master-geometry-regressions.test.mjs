import test from 'node:test';
import assert from 'node:assert/strict';
import {objectIssue,surfaceObjectIssue,validateGeometryHoles} from '../../platform/sources/app/shared/models/design-content.mjs';
import {contourContainsPoint} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {fitsSurface} from './usability-model.mjs';
import {clampToContour} from './edge-clamp.mjs';
import {customerLayoutIssue} from './contract.mjs';
import {installEdgeClamp} from './edge-clamp.mjs';

const rect={shape:'rect',width:100,height:80,holes:[]};
const object={id:'t',type:'text',x:5,y:40,w:10,h:8,rotation:0};
const engraving={kind:'universal-product',material:{kind:'steel'},processing:{profileId:'steel-engraving'},geometry:rect};
test('painted-path fallback and unchanged template placement also allow a hole under the artwork',()=>{
 const geometry={shape:'ellipse',width:100,height:100,holes:[{x:50,y:50,diameter:8}]};
 const o={id:'frame',type:'motif',motif:'diamond',templateOrigin:true,x:50,y:50,w:98,h:98,rotation:0};
 const resource={key:'diamond',embeddedOnly:true,bounds:[1,1,98,98],svgFragment:'<path d="M50 1 L99 50 L50 99 L1 50 Z" fill="currentColor" fill-rule="nonzero"/>'};
 const p={...engraving,geometry,designs:[{id:'d',objects:[o]}]};
 assert.match(objectIssue(o,p),/ovale/,'bounding box crosses the ellipse');
 assert.equal(surfaceObjectIssue(o,p,{motifs:[resource]}),'','actual diamond fits with zero margin');
 const el={state:{designId:'d',objects:[structuredClone(o)]},render(){},uxProfileGeometry:()=>geometry};
 installEdgeClamp(el,{profile:p,motifs:[resource]});el.render();
 assert.deepEqual(el.state.objects[0],o,'authentic artwork does not jump away from the hole');
});
test('engraving without an explicit margin reaches the edge; explicit margins, print and outer contour remain enforced',()=>{
 assert.equal(objectIssue(object,engraving),'');
 assert.match(objectIssue({...object,x:4},engraving),/hinaus/);
 assert.match(objectIssue(object,{...engraving,geometry:{...rect,safeMarginMm:2}}),/hinaus/);
 assert.match(objectIssue(object,{...engraving,processing:{profileId:'color-print'}}),/hinaus/);
 assert.match(objectIssue({...object,x:50,y:40},{...engraving,geometry:{...rect,bell:{x:45,y:35,width:10,height:10}}}),/Klingel/);
});

test('text and motifs may cross contour holes on both faces in validation and placement; drilling stays physical',()=>{
 const g={...rect,shape:'contour',outlinePath:'M0 0H100V80H0Z',safeMarginMm:0,holeKeepoutMm:3,holes:[{x:20,y:40,diameter:8}]};
 for(const type of ['text','motif'])for(const side of ['front','back']){
  const o={...object,type,surfaceId:side,x:side==='front'?20:80};
  const p={...engraving,geometry:g},oriented=side==='back'?{...g,holes:[{x:80,y:40,diameter:8}]}:g;
  assert.equal(surfaceObjectIssue(o,p),'');
  assert.equal(customerLayoutIssue(o,p),'');
  assert.equal(fitsSurface(o,{x:-5,y:-4,width:10,height:8},oriented),true);
  assert.equal(clampToContour(o,oriented),false,'artwork must not jump away from a hole');
 }
 assert.equal(contourContainsPoint(g,20,40),false,'low-level physical hole exclusion is retained');
 assert.doesNotThrow(()=>validateGeometryHoles({geometry:g}));
 assert.throws(()=>validateGeometryHoles({geometry:{...g,holes:[{x:1,y:40,diameter:8}]}}),/Bohrloch/);
 assert.match(objectIssue({...object,x:-5},{...engraving,geometry:g}),/hinaus/);
});
