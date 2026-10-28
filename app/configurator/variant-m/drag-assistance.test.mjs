import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDragSnap,nearestPlateEdge,alignmentLabel} from './drag-assistance-model.mjs';
import {contourGuides} from './contour-guides.mjs';
import {loupePosition,LOUPE_SIZE,LOUPE_SCALE} from './view-loupe.mjs';
const source=fs.readFileSync(new URL('../../references/aosu-upgrade-2026-09-21/verification/editor-source.html',import.meta.url),'utf8'),start=source.indexOf('  alignmentTargets(state,object){'),end=source.indexOf('  setup(el,form){',start);
const guided=vm.runInNewContext('({'+source.slice(start,end)+'})');
const geometry={width:120,height:80,shape:'rect',safeMarginMm:2},area={left:2,top:2,right:118,bottom:78};
const object=(extra={})=>({id:'move',type:'text',rotation:0,x:59,y:30,w:20,h:10,...extra});
const snap=createDragSnap(contourGuides(guided,()=>geometry),()=>area,()=>geometry);
const state=o=>({width:120,height:80,objects:[o]});
test('existing snap engine: 1.5 physical mm reaches the plate center, independent of view zoom',()=>{
 for(const displayZoom of [1,2,3,4]){const o=object(),result=snap({...state(o),displayZoom},o);assert.equal(result.x,60);assert.equal(alignmentLabel(result.locks.x),'Mitte');assert.equal(o.x,59);}
 const far=object({x:58.4});assert.equal(snap(state(far),far).x,58.4);
 const physical=object({x:58.9});assert.equal(snap(state(physical),physical,2).x,58.9);physical.x=59.3;assert.equal(snap(state(physical),physical,2).x,60);
});
test('existing hysteresis retains a lock, but releases it beyond 1.6 times the physical tolerance',()=>{
 const o=object(),first=snap(state(o),o);o.x=57.8;assert.equal(snap(state(o),o,1,first.locks).x,60);o.x=57.5;assert.equal(snap(state(o),o,1,first.locks).x,57.5);
});
test('safety margin and other element edges are targets for text and motifs',()=>{
 const o=object({type:'motif',x:12.8});const safe=snap(state(o),o);assert.equal(safe.x,12);assert.equal(alignmentLabel(safe.locks.x),'Sicherheitsrand');
 const other=object({id:'other',type:'motif',x:90,y:60,w:40,label:'Haus'});o.x=80.9;const result=snap({width:120,height:80,objects:[o,other]},o);assert.equal(result.x,80);assert.equal(alignmentLabel(result.locks.x),'bündig mit „Haus“');
 other.uxHidden=true;assert.equal(snap({width:120,height:80,objects:[o,other]},o).x,80.9);
});
test('contour wrapper keeps extended snapping inside the real contour',()=>{
 const g={...geometry,shape:'contour',outlinePath:'M0 0H120L60 80Z',safeMarginMm:2};const s=createDragSnap(contourGuides(guided,()=>g),()=>area,()=>g),o=object({x:59,y:30,w:10,h:5});assert.equal(s(state(o),o).x,60);
 const outside=object({x:12.8,y:60});const result=s(state(outside),outside);assert.equal(result.x,outside.x);assert.equal(Object.keys(result.locks).length,0);
});
test('120 by 80 mm: nearest outer plate edge is 15 mm, with actual rotation and scale',()=>{
 const o=object({x:60,y:60});const d=nearestPlateEdge(o,{geometry});assert.equal(d.distanceMm,15);assert.equal(d.label,'15 mm zum Rand');assert.equal(d.object.y,65);assert.equal(d.edge.y,80);
 assert.equal(nearestPlateEdge({...o,rotation:90},{geometry}).distanceMm,10);
 assert.equal(nearestPlateEdge(o,{geometry:{...geometry,width:260,height:200},scale:2,x:10,y:20}).distanceMm,50);
});
test('oval, rounded and contour distances use the actual outline, never its enclosing rectangle',()=>{
 const o=object({x:10,y:40,w:10,h:10}),ellipse=nearestPlateEdge(o,{geometry:{...geometry,shape:'ellipse'}});assert.ok(ellipse.distanceMm>4&&ellipse.distanceMm<5);
 const rounded=nearestPlateEdge(object({x:10,y:10,w:2,h:2}),{geometry:{...geometry,cornerRadiusMm:20}});assert.ok(rounded.distanceMm<9);
 const contour=nearestPlateEdge(object({x:60,y:40,w:10,h:10}),{geometry:{...geometry,shape:'contour',outlinePath:'M0 0H120L60 80Z'}});assert.ok(contour.distanceMm<35&&contour.distanceMm>10);
});
test('loupe is 110 px at 3x and shifts sideways at the top while remaining in the stage',()=>{
 assert.equal(LOUPE_SIZE,110);assert.equal(LOUPE_SCALE,3);assert.deepEqual(loupePosition({x:195,y:220},{width:390,height:330}),{x:195,y:115});
 const top=loupePosition({x:195,y:30},{width:390,height:330});assert.notEqual(top.x,195);assert.equal(top.y,61);
 for(const w of [375,390,1000])for(const p of [{x:0,y:0},{x:w,y:330},{x:w/2,y:100}]){const q=loupePosition(p,{width:w,height:330});assert.ok(q.x>=61&&q.x<=w-61);assert.ok(q.y>=61&&q.y<=269);}
});

test('an element crossing the plate boundary measures zero instead of a false positive clearance',()=>{
 const d=nearestPlateEdge(object({x:60,y:80,w:20,h:10}),{geometry});assert.equal(d.distanceMm,0);assert.equal(d.label,'0 mm zum Rand');assert.deepEqual(d.object,d.edge);
});
