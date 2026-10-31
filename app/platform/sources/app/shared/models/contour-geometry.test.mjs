import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {contourPathBounds,validateContourGeometry,flattenContourPath,contourContainsPoint,contourContainsPolygon,contourObjectCorners,contourSafeAreaSvg,contourPathWithHoles,mirrorContourPath,contourPathCommands,contourNearestBoundaryPoint} from './contour-geometry.mjs';
import {objectIssue,validateGeometryHoles} from './design-content.mjs';

const geometry=(outlinePath,width=100,height=100)=>({shape:'contour',width,height,outlinePath,safeMarginMm:0,holeKeepoutMm:0,holes:[]});
const notch=geometry('M0 0H100V100H60V35H40V100H0Z');
test('concave containment checks full element edges, not only the four corners',()=>{
 const corners=[[30,75],[70,75],[70,85],[30,85]];
 assert.ok(corners.every(([x,y])=>contourContainsPoint(notch,x,y)));
 assert.equal(contourContainsPolygon(notch,corners),false);
 assert.match(objectIssue({x:50,y:80,w:40,h:10,rotation:0},{geometry:notch}),/Kontur/);
 assert.ok(contourContainsPolygon(notch,[[10,10],[90,10],[90,30],[10,30]]));
});
test('physical containment keeps normal margins and hole keepouts while customer artwork may cover holes',()=>{
 const diamond=geometry('M0 50L50 0L100 50L50 100Z');diamond.safeMarginMm=2;
 assert.equal(contourContainsPoint(diamond,2,50),false,'2 mm in x is less than 2 mm normal distance');
 assert.equal(contourContainsPoint(diamond,3,50),true);
 const g=geometry('M0 0H100V100H0Z');Object.assign(g,{safeMarginMm:2,holeKeepoutMm:3,holes:[{x:20,y:20,diameter:4}]});
 assert.equal(contourContainsPoint(g,24.9,20),false);assert.equal(contourContainsPoint(g,25.1,20),true);
 assert.equal(contourContainsPoint(g,20,20,{holes:false}),true);
 for(const type of ['text','motif','photoSlot','image','graphic'])assert.equal(objectIssue({type,x:20,y:20,w:1,h:1,rotation:30},{geometry:g}),'',type+' may cover a hole in the customer configurator');
 assert.equal(contourContainsPolygon(g,[[10,10],[30,10],[30,30],[10,30]]),false,'enclosed hole is caught even when all corners avoid it');
 assert.ok(contourContainsPolygon(g,[[10,10],[30,10],[30,30],[10,30]],{holes:false}));
});
test('mask is a constant-distance erosion and explicit holes, never a scaled replacement path',()=>{
 const g={...notch,safeMarginMm:3,holeKeepoutMm:4,holes:[{x:20,y:20,diameter:4}]},area=contourSafeAreaSvg(g,'safe-test');
 assert.deepEqual(area.bounds,{left:3,top:3,right:97,bottom:97});
 assert.equal(area.attribute,'mask="url(#safe-test)"');assert.ok(area.defs.includes('d="'+g.outlinePath+'"'));
 assert.match(area.defs,/stroke-width="6" stroke-linejoin="round"/);assert.match(area.defs,/cx="20" cy="20" r="6"/);assert.doesNotMatch(area.defs,/transform=/);
 assert.ok(contourPathWithHoles(g).startsWith(g.outlinePath));
 assert.throws(()=>contourSafeAreaSvg(g,'x" onload="y'),/Maskenkennung/);
 assert.throws(()=>contourPathWithHoles({...g,holes:[{x:'1" onclick=',y:2,diameter:4}]}),/Bohrbild/);
});
test('topology rejects self intersections and geometry rejects holes in concave cutouts',()=>{
 assert.throws(()=>validateContourGeometry(geometry('M0 0L100 100H0L100 0Z')),/überschneidet/);
 assert.throws(()=>validateGeometryHoles({geometry:{...notch,holes:[{x:50,y:80,diameter:4}]}}),/Produktkontur/);
 assert.doesNotThrow(()=>validateGeometryHoles({geometry:{...notch,holes:[{x:20,y:80,diameter:4}]}}));
});
test('adaptive geometry supports reflected smooth curves and arcs without changing bounds',()=>{
 const paths=['M0 30C0 0 30 0 30 30S60 60 60 30L60 90H0Z','M0 30Q15 0 30 30T60 30L60 90H0Z','M0 30A50 30 0 1 1 100 30A50 30 0 1 1 0 30Z'];
 for(const p of paths){const points=flattenContourPath(p);assert.ok(points.length>30);assert.ok(points.every(p=>p.every(Number.isFinite)));}
 const original=geometry('M0 0H100V60H20V40H0Z',100,60),mirrored={...original,outlinePath:mirrorContourPath(original.outlinePath,100)};
 for(let x=3;x<100;x+=7)for(let y=3;y<60;y+=7)assert.equal(contourContainsPoint(original,x,y),contourContainsPoint(mirrored,100-x,y));
 const arc=paths[2];assert.deepEqual(contourPathBounds(mirrorContourPath(arc,100)),contourPathBounds(arc));
});
test('actual Retro 1/2 9x6 and 30x20 preserve source paths, fixed holes and safe middle',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('../../../../../workshop/test-fixtures/retro-contours.json',import.meta.url)));
 assert.equal(fixture.rows.length,4);
 for(const row of fixture.rows){
  const g=geometry(row.outline,row.widthMm,row.heightMm);g.holes=row.holes;g.holeKeepoutMm=3;g.safeMarginMm=2;
  assert.doesNotThrow(()=>validateContourGeometry(g));assert.doesNotThrow(()=>validateGeometryHoles({geometry:g}));
  assert.ok(contourContainsPolygon(g,contourObjectCorners({x:g.width/2,y:g.height/2,w:g.width/3,h:g.height/3,rotation:0})),row.id);
  assert.equal(contourContainsPoint(g,g.holes[0].x,g.holes[0].y),false,row.id);
  assert.ok(contourPathWithHoles(g).startsWith(row.outline));assert.ok(flattenContourPath(row.outline).length<2500);
 }
});


test('vector backends share absolute commands and nearest outer boundary',()=>{
 const commands=contourPathCommands('m10 10h20v20s5 5 10 0t10 0a3 4 20 0 1 5 6z');
 assert.deepEqual(commands.map(c=>c.command),['M','L','L','C','Q','A','Z']);
 assert.deepEqual(commands[1].values,[30,10]);assert.deepEqual(commands[3].values,[30,30,35,35,40,30]);
 assert.deepEqual(commands[4].values,[40,30,50,30]);assert.deepEqual(commands[5].values,[3,4,20,0,1,55,36]);
 const g=geometry('M0 0H100V100H0Z'),n=contourNearestBoundaryPoint(g,-3,50);
 assert.equal(n.x,0);assert.equal(n.y,50);assert.equal(n.distance,3);assert.equal(n.inside,false);
 assert.equal(contourNearestBoundaryPoint(g,5,50).inside,true);
});
