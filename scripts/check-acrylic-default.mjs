import assert from 'node:assert/strict';
import {plates,baseGeometry} from '../src/lib/configuration.ts';
for(const g of [baseGeometry,{...baseGeometry,shape:'rounded',cornerRadiusMm:20},{...baseGeometry,shape:'ellipse',cornerRadiusMm:0,holeCount:0},{...baseGeometry,holeDiameterMm:16,edgeMm:20},{...baseGeometry,holeOverrides:[{x:50,y:50,locked:false},null,null,null]}]){
 const a=plates.initialAcrylic(g);const result=plates.validate({...g,assembly:{reference:plates.bellReference.revision,acrylic:a,bell:null}});assert.equal(plates.screwWarnings(result).length,0);assert.equal(plates.acrylicHoles(result).length,0);assert.ok(a.width<=g.widthMm*.81);console.log(g.shape,a.width,a.height);
}
assert.throws(()=>plates.initialAcrylic({...baseGeometry,widthMm:20,heightMm:20,holeCount:0,edgeMm:2}),/passt mittig/);
console.log('PASS: Smaller initial acrylic clears holes and screw heads, including custom hole positions.');

