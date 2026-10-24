import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {installEdgeClamp,clampToContour} from './edge-clamp.mjs';
import {embeddedMotifFits} from '../../platform/sources/app/shared/models/embedded-motif-fit.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../workshop/fixtures/katalog-path-fit/retro2-d12-motif.json',import.meta.url),'utf8'));
function editor(resource=fixture.resource,{back=false}={}){
 const original={...structuredClone(fixture.object),...(back?{surfaceId:'back'}:{})},profile={designs:[{id:'D12',objects:[original]},{id:'D1',objects:[{...original,id:'other',type:'text',x:45,y:30,w:4,h:4}]}]};
 const el={state:{designId:'D12',uxSurface:back?'back':'front',width:90,height:60,objects:[structuredClone(original)]},geometry:structuredClone(fixture.geometry),uxProfileGeometry(){return this.geometry;},render(){return 'rendered';},chooseDesign(id){this.state.designId=id;this.state.objects=structuredClone(profile.designs.find(d=>d.id===id).objects);this.render();}};
 installEdgeClamp(el,{profile,motifs:[resource]});return el;
}
const sameGeometry=(a,b)=>assert.deepEqual(['x','y','w','h','rotation'].map(k=>a[k]),['x','y','w','h','rotation'].map(k=>b[k]));
test('authentic Retro2 D12 keeps its exact imported initial position; drag still uses the existing clamp',()=>{
 const original=fixture.object,baseline=structuredClone(original);assert.equal(clampToContour(baseline,fixture.geometry),true,'old box clamp would move this real motif');
 assert.equal(embeddedMotifFits(original,fixture.geometry,fixture.resource),true);
 const el=editor();assert.equal(el.render(),'rendered');sameGeometry(el.state.objects[0],original);el.render();sameGeometry(el.state.objects[0],original);
 const o=el.state.objects[0];o.x-=5;const expected=structuredClone(o);assert.equal(clampToContour(expected,fixture.geometry),true);el.render();sameGeometry(o,expected);
 const restored=structuredClone(original);clampToContour(restored,fixture.geometry,null,expected);Object.assign(o,original);el.render();sameGeometry(o,restored);assert.notEqual(o.x,original.x,'restoring coordinates in the edited instance does not restore the exception');
});
test('a fresh authentic design selection restores its own start after a previous drag',()=>{
 const el=editor();el.render();el.state.objects[0].x-=5;el.render();el.chooseDesign('D1');el.chooseDesign('D12');sameGeometry(el.state.objects[0],fixture.object);
 const o=el.state.objects[0];o.x-=5;const expected=structuredClone(o);clampToContour(expected,el.geometry);el.render();sameGeometry(o,expected);
});
test('resizing and rotation end the start exception; changed geometry and holes are rechecked',()=>{
 for(const change of [o=>o.w-=1,o=>o.rotation=2]){
  const el=editor();el.render();const o=el.state.objects[0];change(o);const expected=structuredClone(o);clampToContour(expected,el.geometry);el.render();sameGeometry(o,expected);
 }
 const el=editor();el.render();el.geometry.holes.push({x:32,y:32,diameter:20});const expected=structuredClone(el.state.objects[0]);clampToContour(expected,el.geometry);el.render();sameGeometry(el.state.objects[0],expected);
 assert.equal(embeddedMotifFits(fixture.object,el.geometry,fixture.resource),false);
});
test('changed resource bytes, missing resources and client template flags grant no start exception',()=>{
 const changed=structuredClone(fixture.resource),el=editor(changed);el.render();changed.bounds[0]+=1;const expected=structuredClone(el.state.objects[0]);clampToContour(expected,el.geometry);el.render();sameGeometry(el.state.objects[0],expected);
 const unknown=editor({...fixture.resource,key:'other'});unknown.render();const baseline=structuredClone(fixture.object);clampToContour(baseline,fixture.geometry);sameGeometry(unknown.state.objects[0],baseline);
 const forged=editor();forged.state.designId='not-in-profile';forged.render();sameGeometry(forged.state.objects[0],baseline);
});

test('a reselected template also resets the unvisited reverse-face start safely',()=>{
 const el=editor(fixture.resource,{back:true});el.render();el.state.objects[0].x-=5;el.render();
 el.state.uxSurface='front';el.chooseDesign('D1');el.chooseDesign('D12');el.state.uxSurface='back';el.render();sameGeometry(el.state.objects[0],fixture.object);
});
