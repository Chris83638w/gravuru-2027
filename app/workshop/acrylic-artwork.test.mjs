import test from 'node:test';
import assert from 'node:assert/strict';
import {flattenContourPath,mirrorContourPath} from './contour-path.mjs';
import {nativeContour} from './acrylic-artwork.mjs';

test('native contour preserves physical outline and fixed drilling coordinates',()=>{
 const outlinePath='M0 5C5 5 5 0 10 0H80C85 0 85 5 90 5V55C85 55 85 60 80 60H10C5 60 5 55 0 55Z';
 const result=nativeContour({shape:'contour',width:90,height:60,outlinePath,holes:[{x:7.995,y:30,diameter:4},{x:82.005,y:30,diameter:4}]});
 assert.equal(result.widthMm,90);assert.equal(result.heightMm,60);assert.equal(result.holeCount,2);
 assert.deepEqual(result.contours[0],{role:'outer',d:outlinePath});
 assert.equal(result.contours[1].d,'M5.995 30a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z');
 assert.equal(result.contours[2].d,'M80.005 30a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z');
});
test('native contour rejects a missing, unsafe, open or wrongly sized path instead of drawing a rectangle',()=>{
 for(const outlinePath of [undefined,'M0 0H90V60H0','M0 0H91V60H0Z','M0 0H90V60H0Z" onload="x'])assert.throws(()=>nativeContour({shape:'contour',width:90,height:60,outlinePath,holes:[]}),/Kontur/);
});
test('existing native rectangle, ellipse and plaque contours remain unchanged',()=>{
 assert.equal(nativeContour({shape:'rect',width:90,height:60,holes:[]}).contours[0].d,'M0 0H90V60H0Z');
 assert.equal(nativeContour({shape:'ellipse',width:90,height:60,holes:[]}).contours[0].d,'M0 30a45 30 0 1 0 90 0a45 30 0 1 0 -90 0Z');
 assert.equal(nativeContour({shape:'plaque',width:90,height:60,cornerRadiusMm:5,holes:[]}).contours[0].d,'M5 0H85A5 5 0 0 0 90 5V55A5 5 0 0 0 85 60H5A5 5 0 0 0 0 55V5A5 5 0 0 0 5 0Z');
});

test('generated holes oppose either contour orientation without rewriting the source path',()=>{
 const original='M0 5C5 5 5 0 10 0H80C85 0 85 5 90 5V55C85 55 85 60 80 60H10C5 60 5 55 0 55Z';
 const area=d=>{const points=flattenContourPath(d);return points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);};
 for(const outlinePath of [original,mirrorContourPath(original,90)]){
  const result=nativeContour({shape:'contour',width:90,height:60,outlinePath,holes:[{x:7.995,y:30,diameter:4}]});
  assert.equal(result.contours[0].d,outlinePath);
  assert.ok(area(result.contours[0].d)*area(result.contours[1].d)<0);
 }
});
