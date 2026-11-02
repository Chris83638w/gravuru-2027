import test from 'node:test';import assert from 'node:assert/strict';
import {nativeContour} from './acrylic-artwork.mjs';
import {validateContourGeometry,contourPathWithHoles,contourPathBounds,flattenContourPath,reverseContourPath,surfaceGeometry} from './contour-path.mjs';
const area=d=>{const p=flattenContourPath(d);return p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0);};
test('139: cutouts keep exact curves and full stem in native production, with opposite winding for nonzero clipping',()=>{
 const g={width:120,height:300,shape:'contour',outlinePath:'M0 0H120V100H65V300H55V100H0Z',holes:[],cutoutPaths:['M20 20C20 10 40 10 40 20V40H20Z']},before=JSON.stringify(g);
 validateContourGeometry(g);assert.equal(contourPathWithHoles(g),g.outlinePath+g.cutoutPaths[0]);
 const p=nativeContour(g);assert.equal(p.widthMm,120);assert.equal(p.heightMm,300);assert.equal(p.holeCount,1);assert.equal(p.contours[0].d,g.outlinePath);assert.equal(p.contours[1].role,'hole');
 assert(area(p.contours[0].d)*area(p.contours[1].d)<0);assert.deepEqual(contourPathBounds(p.contours[1].d),contourPathBounds(g.cutoutPaths[0]));assert.match(p.contours[1].d,/C/);
 const back=surfaceGeometry(g,'back');assert.equal(back.cutoutPaths.length,1);assert.deepEqual(contourPathBounds(back.cutoutPaths[0]),[80,12.5,20,27.5]);assert.equal(JSON.stringify(g),before);
 assert.throws(()=>validateContourGeometry({...g,cutoutPaths:['M110 10H130V30H110Z']}),/Innenausschnitt/);
});
test('139: winding reversal retains cubic, quadratic and elliptical arc geometry',()=>{
 const d='M10 20C10 10 30 10 30 20Q40 30 30 40A10 10 0 0 1 10 40Z',reverse=reverseContourPath(d);
 assert(area(d)*area(reverse)<0);assert.deepEqual(contourPathBounds(reverse),contourPathBounds(d));assert.match(reverse,/A10 10 0 0 0/);assert.deepEqual(contourPathBounds(reverseContourPath(reverse)),contourPathBounds(d));
});
