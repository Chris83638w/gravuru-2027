import {surfaceGeometry} from './surfaces.mjs';
import {surfaceTextIssues} from './usability.mjs';
import {alignedPosition} from '../../workshop/ui/editor-guides.mjs';
import {validateSteelFormats,enableSteelFormats,steelPhysicalGeometry,resizeSteelDocument} from './steel-formats.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {studioSvg} from '../../platform/sources/app/shared/models/studio-svg.mjs';
import {contourPathWithHoles,contourContainsPolygon} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {designArea,designAreaOutline,designAreaPreview} from './design-area.mjs';
import {surfacePreview} from './material-surface.mjs';
import {fitsSurface,transformedCorners} from './usability-model.mjs';
import {freePosition} from './workflow-model.mjs';
import {clampToContour,clampToPlate,installEdgeClamp} from './edge-clamp.mjs';
import {contourGuides} from './contour-guides.mjs';
import {materialPreview} from '../../workshop/material-preview.mjs';
import {composeMaterialPreview} from '../../workshop/material-presentation.mjs';

const outlinePath='M0 0H90V60H0V40Q16 30 0 20Z';
const geometry={width:90,height:60,shape:'contour',outlinePath,holes:[{x:60,y:30,diameter:4}],safeMarginMm:2,holeKeepoutMm:3};
const profile={kind:'universal-product',geometry,material:{kind:'steel',color:'#bac2c4'}};
const bounds=o=>({x:-o.w/2,y:-o.h/2,width:o.w,height:o.h});

test('universal preview and material texture preserve the original contour and transparent fixed holes',()=>{
 const design={name:'Kontur-Test',objects:[{id:'a',type:'graphic',shape:'rect',x:30,y:30,w:10,h:5,rotation:0,filled:true}],marks:[]};
 const before=structuredClone({profile,design}),svg=studioSvg(profile,design,{}),d=contourPathWithHoles(geometry);
 assert.ok(svg.includes('d="'+d+'" fill-rule="evenodd"'));
 assert.match(svg,/data-contour-artwork="true" clip-path=/);
 assert.doesNotMatch(svg,/<circle[^>]+fill="#f4f5f3"/);
 const url='/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png';
 const textured=surfacePreview(svg,url,geometry);
 assert.match(textured,/data-material-surface="true"/);
 assert.ok(textured.includes('<path d="'+d+'" clip-rule="evenodd"/>'));
 assert.doesNotMatch(textured,/<rect width="90" height="60" rx=/);
 assert.deepEqual({profile,design},before);
});

test('design area uses a true inward mask with hole protection and is absent from production previews',()=>{
 const config={profile},area=designArea(config),markup=designAreaOutline(config);
 assert.deepEqual(area,{left:2,top:2,right:88,bottom:58});
 assert.ok(markup.includes('d="'+outlinePath+'"'));
 assert.match(markup,/stroke-width="4" stroke-linejoin="round"/);
 assert.match(markup,/<circle cx="60" cy="30" r="5" fill="black"/);
 assert.equal(markup.includes('scale('),false);
 assert.equal(designAreaPreview('<svg></svg>',config,profile,{show:false}),'<svg></svg>');
 assert.match(designAreaPreview('<svg></svg>',config),/data-m-design-area="true"/);
});

test('fitting rejects the concave bite but allows artwork over holes, including free placement',()=>{
 const safe={x:30,y:30,w:8,h:6,rotation:0},bite={...safe,x:6},hole={...safe,x:60,w:12,h:12};
 assert.equal(fitsSurface(safe,bounds(safe),geometry),true);
 assert.equal(fitsSurface(bite,bounds(bite),geometry),false);
 assert.equal(fitsSurface(hole,bounds(hole),geometry),true);
 const surface={x:2,y:2,width:86,height:56,shape:'contour',geometry};
 const p=freePosition(safe,surface,[]);assert.ok(p);assert.equal(fitsSurface({...safe,...p},bounds(safe),geometry),true);
 const overHole={...safe,w:5,h:5},position=freePosition(overHole,{x:55,y:25,width:10,height:10,shape:'contour',geometry},[]);
 assert.ok(position);assert.equal(fitsSurface({...overHole,...position},bounds(overHole),geometry),true);
});

test('dragging stops at the actual inset edge and never substitutes a rectangular boundary',()=>{
 const object={id:'move',x:1,y:30,w:4,h:4,rotation:0};
 assert.equal(clampToContour(object,geometry,null,{x:30,y:30}),true);
 assert.ok(object.x>10&&object.x<20);assert.equal(object.y,30);
 assert.equal(contourContainsPolygon(geometry,transformedCorners(object,bounds(object))),true);
 const onHole={...object,x:60};assert.equal(clampToContour(onHole,geometry,null,object),false);assert.equal(onHole.x,60);
 assert.equal(fitsSurface(onHole,bounds(onHole),geometry),true);
 const rectangle={x:-5,y:10,w:10,h:10};assert.equal(clampToPlate(rectangle,90,60),true);assert.equal(rectangle.x,5);
});

test('snapping filters unsafe targets and rejects an unsafe combination of valid axis targets',()=>{
 const g={width:100,height:100,shape:'contour',outlinePath:'M0 0H100V50H50V100H0Z',safeMarginMm:0,holeKeepoutMm:0,holes:[]};
 const base={alignmentTargets(){return {x:[{key:'x',value:50.8,line:50.8},{key:'outside',value:-1,line:-1}],y:[{key:'y',value:50.8,line:50.8}]};},snap(state,o){const t=this.alignmentTargets(state,o);return {x:t.x[0].value,y:t.y[0].value,locks:{x:t.x[0],y:t.y[0]}};}};
 const guided=contourGuides(base,()=>g),o={id:'a',type:'text',x:48,y:48,w:1,h:1,rotation:0};
 assert.deepEqual(guided.alignmentTargets({},o).x.map(t=>t.key),['x']);
 const result=guided.snap({},o,3);assert.equal(Object.keys(result.locks).length,1);
 assert.equal(fitsSurface({...o,...result},bounds(o),g),true);
 const withHole={...g,outlinePath:'M0 0H100V100H0Z',holes:[{x:51,y:51,diameter:3}]};
 const acrossHole=contourGuides(base,()=>withHole).snap({},o,3);
 assert.equal(Object.keys(acrossHole.locks).length,2);assert.equal(fitsSurface({...o,...acrossHole},bounds(o),withHole),true);
});

test('existing workshop material preview renders the same curved outer path and physical opening',()=>{
 const hole='M58 30a2 2 0 1 0 4 0a2 2 0 1 0 -4 0Z';
 const document={form:{geometry:{schema:'gravuru-contour/v1',unit:'mm',measurement:'path-centerline',widthMm:90,heightMm:60,pageWidthMm:90,pageHeightMm:60,sourceOriginMm:[0,0],holeCount:1,contours:[{role:'outer',d:outlinePath},{role:'hole',d:hole}],warnings:[]}},material:{id:'steel',thicknessMm:1.5},processingMethod:'engraving',presentation:{scene:'studio'}};
 const before=structuredClone(document),preview=materialPreview(document),svg=composeMaterialPreview(preview.svg,'<g data-test-art="true"/>');
 assert.ok(svg.includes(outlinePath+' Z '+hole+' Z'));
 assert.match(svg,/clip-rule="evenodd"/);assert.match(svg,/data-preview-depth-mm="1.5"/);
 assert.match(svg,/data-test-art="true"/);assert.deepEqual(document,before);
});

test('catalog contour dimensions cannot be rescaled by the rectangular steel size editor',()=>{
 const config={profile:structuredClone(profile)},before=structuredClone(config);
 assert.deepEqual(steelPhysicalGeometry(config),geometry);
 assert.throws(()=>enableSteelFormats(config),/Konturmaße/);
 assert.deepEqual(config,before);
 assert.throws(()=>resizeSteelDocument({config},{width:120,height:80,shape:'rect'}),/Konturmaße/);
 const invalid={...config,steelFormats:{version:1}};
 assert.throws(()=>validateSteelFormats(invalid),/Konturmaße/);
 assert.throws(()=>steelPhysicalGeometry(invalid),/Konturmaße/);
});

test('workshop snapping also permits artwork over contour holes',()=>{
 const object={id:'a',x:49.3,y:48,w:1,h:1,rotation:0};
 const g={width:100,height:100,shape:'contour',outlinePath:'M0 0H100V100H0Z',safeMarginMm:0,holeKeepoutMm:0,holes:[{x:50,y:50,diameter:3}]};
 const result=alignedPosition(object,g,[],{threshold:3});
 assert.equal(fitsSurface(result.object,bounds(object),g),true);
 assert.deepEqual([result.object.x,result.object.y],[49.5,49.5]);
 assert.equal(contourContainsPolygon(g,transformedCorners(result.object,bounds(object))),false,'physical hole check remains distinct');
 assert.deepEqual(object,{id:'a',x:49.3,y:48,w:1,h:1,rotation:0});
});

test('back-side preview mirrors the asymmetric source contour together with its holes',()=>{
 const back=surfaceGeometry(geometry,'back');
 assert.equal(surfaceGeometry(geometry,'front'),geometry);
 assert.equal(back.holes[0].x,30);assert.equal(back.holes[0].y,30);
 assert.notEqual(back.outlinePath,outlinePath);assert.equal(geometry.outlinePath,outlinePath);
 const object={x:6,y:30,w:2,h:4,rotation:0};
 assert.equal(fitsSurface(object,bounds(object),geometry),false);
 assert.equal(fitsSurface(object,bounds(object),back),true);
 assert.equal(fitsSurface({...object,x:84},bounds(object),back),false);
});


test('switching contour surfaces preserves both designs; only the active object is clamped',()=>{
 const front={id:'front',type:'graphic',shape:'rect',x:84,y:30,w:2,h:4,rotation:0};
 const back={id:'back',type:'graphic',shape:'rect',surfaceId:'back',x:6,y:30,w:2,h:4,rotation:0};
 const el={state:{objects:[front,back],width:90,height:60,uxSurface:'front'},
  uxProfileGeometry(){return surfaceGeometry(geometry,this.state.uxSurface);},render(){return 'rendered';}};
 const original=structuredClone(el.state.objects);
 installEdgeClamp(el);
 for(const side of ['front','back','front','back']){
  el.state.uxSurface=side;assert.equal(el.render(),'rendered');
  assert.deepEqual(el.state.objects,original,'switching to '+side+' must not edit either design');
 }
 back.x=84;el.render();
 assert.notEqual(back.x,84,'the active back object still obeys its own contour');
 assert.equal(fitsSurface(back,bounds(back),surfaceGeometry(geometry,'back')),true);
 assert.deepEqual(front,original[0],'moving back never changes front');
});

test('contour position anchors survive surface changes independently when an outer cut removes the centre',()=>{
 const g={...geometry,outlinePath:'M0 0H40V35H50V0H90V60H0V40Q16 30 0 20Z',holes:[]};
 const front={id:'front',x:84,y:30,w:2,h:4,rotation:0};
 const back={id:'back',surfaceId:'back',x:6,y:30,w:2,h:4,rotation:0};
 const el={state:{objects:[front,back],width:90,height:60,uxSurface:'front'},
  uxProfileGeometry(){return surfaceGeometry(g,this.state.uxSurface);},render(){}};
 installEdgeClamp(el);
 el.render();el.state.uxSurface='back';el.render();el.state.uxSurface='front';el.render();
 assert.equal(fitsSurface({...back,x:45},bounds(back),surfaceGeometry(g,'back')),false,'centre cannot replace a cached valid anchor');
 el.state.uxSurface='back';back.x=84;el.render();
 assert.equal(fitsSurface(back,bounds(back),surfaceGeometry(g,'back')),true,'back retains its valid anchor across the front render');
 assert.equal(front.x,84);
 const savedBack=structuredClone(back);
 el.state.uxSurface='front';front.x=6;el.render();
 assert.equal(fitsSurface(front,bounds(front),g),true,'front retains its own anchor');
 assert.deepEqual(back,savedBack);
});


test('text warnings use only the active surface and never test inactive text against the displayed outline',()=>{
 const front={id:'front',type:'text',text:'Front',x:84,y:30,w:2,h:4,rotation:0};
 const back={id:'back',type:'text',text:'Back',surfaceId:'back',x:6,y:30,w:2,h:4,rotation:0};
 const objects=[front,back],original=structuredClone(objects),measured=[];
 const textBounds=o=>{measured.push(o.id);return bounds(o);};
 assert.deepEqual(surfaceTextIssues(objects,'front',geometry,textBounds),[]);
 assert.deepEqual(measured,['front']);measured.length=0;
 assert.deepEqual(surfaceTextIssues(objects,'back',surfaceGeometry(geometry,'back'),textBounds),[]);
 assert.deepEqual(measured,['back']);assert.deepEqual(objects,original);
 back.x=84;
 assert.deepEqual(surfaceTextIssues(objects,'front',geometry,textBounds),[],'invalid inactive back text does not block front');
 const before=structuredClone(objects),issues=surfaceTextIssues(objects,'back',surfaceGeometry(geometry,'back'),textBounds);
 assert.deepEqual(issues.map(i=>[i.id,i.code]),[['back','outside-surface']]);
 assert.deepEqual(objects,before,'warning checks never move either text');
});
