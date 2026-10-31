import test from 'node:test';
import assert from 'node:assert/strict';
import {textOutlineFits} from '../../platform/sources/app/shared/models/text-outline-fit.mjs';
import {measureText,textPaths} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {objectIssue,surfaceObjectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {textsNearHoles,holeHintText} from '../../platform/sources/app/shared/models/hole-proximity.mjs';
import {surfaceGeometry} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
import {customerLayoutIssue} from './contract.mjs';
import {clampToContour,installEdgeClamp} from './edge-clamp.mjs';
import {fitText} from './workflow-model.mjs';
import {layoutReviewIssues} from './layout-review.mjs';

// Deliberately asymmetric ink, independently specified in font units. The
// letters fit near the curved bottom edge; their conservative box does not.
const glyph={a:2000,d:'M0 0 L2000 0 L1000 1000 Z'};
const fonts={Test:{regular:{units:1000,glyphs:{A:glyph,' ':{a:500,d:''}}}}};
const geometry={shape:'ellipse',width:100,height:100,safeMarginMm:0,holes:[]};
const profile={kind:'universal-product',material:{kind:'steel'},processing:{profileId:'steel-engraving'},geometry};
const letter=(change={})=>measureText({id:'a',type:'text',font:'Test',text:'A',size:30,x:50,y:78,w:1,h:1,rotation:0,...change},fonts);
const box=o=>({x:-o.w/2,y:-o.h/2,width:o.w,height:o.h});

test('oval: glyphs clear a box-only error equally in workshop, customer and layout review',()=>{
 const o=letter(),snapshot=structuredClone(o),svg=textPaths(o,fonts);
 assert.match(objectIssue(o,profile),/ovale/);
 assert.equal(surfaceObjectIssue(o,profile,{fonts}),'');
 assert.equal(customerLayoutIssue(o,profile,{fonts}),'');
 assert.equal(textOutlineFits(o,geometry,fonts),true);
 const issues=layoutReviewIssues({profile,objects:[o],resources:{fonts}});
 assert.equal(layoutReviewIssues({profile,objects:[o]}).filter(i=>i.code==='boundary').length,1);
 assert.equal(issues.filter(i=>i.code==='boundary').length,0);
 assert.deepEqual(o,snapshot);assert.equal(textPaths(o,fonts),svg);
});

test('genuine glyph overhang and explicit engraving/print margins remain blocked',()=>{
 for(const o of [letter({y:80}),letter({rotation:90}),letter({x:70})]){
  assert.equal(textOutlineFits(o,geometry,fonts),false);
  assert.match(customerLayoutIssue(o,profile,{fonts}),/hinaus/);
 }
 const o=letter();
 for(const p of [{...profile,geometry:{...geometry,safeMarginMm:3}},
  {...profile,processing:{profileId:'color-print'},geometry:{...geometry,safeMarginMm:undefined}}])
  assert.match(surfaceObjectIssue(o,p,{fonts}),/hinaus/);
 assert.match(surfaceObjectIssue(letter({x:NaN}),profile,{fonts}),/Ungültige/);
 assert.match(surfaceObjectIssue(o,{...profile,geometry:{...geometry,bell:{x:45,y:70,width:10,height:10}}},{fonts}),/Klingel/);
});

test('rounded corners and a concave contour inspect complete painted segments',()=>{
 const rounded={...geometry,shape:'rect',cornerRadiusMm:50};
 assert.match(objectIssue(letter(),{...profile,geometry:rounded}),/gerundete/);
 assert.equal(surfaceObjectIssue(letter(),{...profile,geometry:rounded},{fonts}),'');
 // A triangular plate accepts the triangular letter but not its rectangular box.
 const triangle={...geometry,shape:'contour',outlinePath:'M10 95L50 45L90 95Z'};
 assert.equal(surfaceObjectIssue(letter(),{...profile,geometry:triangle},{fonts}),'');
 // All 3 glyph vertices fit; the bottom segment crosses the 10 mm deep bite.
 const bite={...geometry,shape:'contour',outlinePath:'M0 0H100V100H55V85H45V100H0Z'};
 assert.equal(textOutlineFits(letter(),bite,fonts),false);
 assert.match(surfaceObjectIssue(letter(),{...profile,geometry:bite},{fonts}),/hinaus/);
});

test('back side uses the same physical reflection and retains the hole hint',()=>{
 const g={...geometry,shape:'contour',outlinePath:'M0 0H100V100H70V70H0Z',holes:[{x:80,y:75,diameter:4}]};
 const front=letter({x:80,y:75,size:8}),back={...front,x:20,surfaceId:'back'};
 assert.equal(surfaceObjectIssue(front,{...profile,geometry:g},{fonts}),'');
 assert.equal(surfaceObjectIssue(back,{...profile,geometry:g},{fonts}),'');
 assert.equal(textOutlineFits(back,surfaceGeometry(g,'back'),fonts),true);
 const warnings=textsNearHoles({objects:[front]},{geometry:g},fonts,3);
 assert.equal(warnings.length,1);assert.match(holeHintText(warnings),/Bohrloch/);
});

test('fitting and drag clamping retain a valid original, but stop a genuine overhang',()=>{
 const o=letter(),before=structuredClone(o);
 assert.equal(fitText(o,box(o),geometry,4,fonts),30);
 assert.equal(clampToContour(o,geometry,null,null,fonts),false);assert.deepEqual(o,before);
 const el={fontData:fonts,state:{objects:[o]},uxProfileGeometry:()=>geometry,render(){}};
 installEdgeClamp(el,{profile});el.render();assert.deepEqual(o,before);
 o.y=85;el.render();assert.ok(o.y<85);assert.equal(textOutlineFits(o,geometry,fonts),true);
 const out=letter({y:80}),size=fitText(out,box(out),geometry,4,fonts);
 assert.ok(size>=4&&size<30);
});

test('anchors, spacing, multiline, bold and italic follow the rendered transforms',()=>{
 const o=letter({size:10,x:50,y:50,text:'A A\nA',letterSpacing:2,lineHeight:15,textAnchor:'end',italic:true});
 const markup=textPaths(o,fonts);
 assert.match(markup,/skewX\(-12\)/);
 assert.match(markup,/translate\(0 -4\) scale\(0.01 -0.01\)/);
 assert.match(markup,/translate\(0 11\) scale\(0.01 -0.01\)/);
 assert.equal(textOutlineFits(o,geometry,fonts),true);
 for(const textAnchor of ['start','middle','end'])for(const rotation of [0,37,-91])
  assert.equal(textOutlineFits(letter({size:10,x:50,y:50,textAnchor,rotation}),geometry,fonts),true);
 const bold={Test:{...fonts.Test,bold:{units:1000,glyphs:{A:{a:2000,d:'M0 -1000H2000V1000H0Z'}}}}};
 assert.equal(textOutlineFits(letter({bold:true}),geometry,bold),false);
});

test('missing fonts/glyphs, malformed paths and empty ink cannot erase a boundary error',()=>{
 const o=letter();
 for(const f of [undefined,{}, {Test:{regular:{units:1000,glyphs:{}}}}]){
  assert.equal(textOutlineFits(o,geometry,f),null);
  assert.match(surfaceObjectIssue(o,profile,{fonts:f}),/hinaus/);
 }
 for(const d of ['', 'M0 0 Lbad Z', 'm0 0h2000v1000z', 'M0 0L2000 0L1000 1000Z garbage']){
  const f={Test:{regular:{units:1000,glyphs:{A:{a:2000,d}}}}};
  assert.equal(textOutlineFits(o,geometry,f),null);
 }
 const f=structuredClone(fonts);
 assert.equal(textOutlineFits(o,geometry,f),true);
 f.Test.regular.glyphs.A.d='M0 -1000H2000V1000H0Z';
 assert.equal(textOutlineFits(o,geometry,f),false,'edited glyph invalidates the cache');
});

test('curve bulges and displaced start/end anchors cannot hide genuine ink outside',()=>{
 const curved={Test:{regular:{units:1000,glyphs:{A:{a:2000,d:'M0 0 Q1000 -2000 2000 0 L1000 1000Z'}}}}};
 assert.equal(textOutlineFits(letter(),geometry,curved),false,'curve endpoints fit but its bulge does not');
 const o={...letter({size:10,x:72}),w:60};
 assert.equal(textOutlineFits({...o,textAnchor:'start'},geometry,fonts),true);
 assert.equal(textOutlineFits({...o,textAnchor:'end'},geometry,fonts),false);
});
