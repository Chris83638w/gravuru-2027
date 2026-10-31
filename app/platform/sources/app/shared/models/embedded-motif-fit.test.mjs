import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddedMotifFits,MOTIF_PATH_TOLERANCE_MM} from './embedded-motif-fit.mjs';
import {objectIssue,surfaceObjectIssue} from './design-content.mjs';
import {flattenClosedSvgPath,surfaceGeometry} from './contour-geometry.mjs';
const outer='M45 0L90 30L45 60L0 30Z';
const diamond='M45 5L82 30L45 55L8 30Z';
const object={id:'motif',type:'motif',motif:'original',templateOrigin:true,x:45,y:30,w:90,h:60,rotation:0};
const resource=(d=diamond,rule='nonzero')=>({key:'original',embeddedOnly:true,bounds:[0,0,90,60],svgFragment:'<path d="'+d+'" fill="currentColor" fill-rule="'+rule+'"/>'});
const geometry=(shape='ellipse')=>({shape,width:90,height:60,safeMarginMm:.2,holeKeepoutMm:1,holes:[],...(shape==='contour'?{outlinePath:outer}:{})});
const profile=g=>({kind:'universal-product',geometry:g});
test('painted paths override an outside box only for a known embedded template; both shapes keep .2 mm margin',()=>{
 for(const shape of ['ellipse','contour']){
  const g=geometry(shape),m=resource();assert.ok(objectIssue(object,profile(g)));
  assert.equal(embeddedMotifFits(object,g,m),true);
  assert.equal(surfaceObjectIssue(object,profile(g),{motifs:[m]}),'');
  assert.ok(surfaceObjectIssue(object,profile(g)));
  assert.ok(surfaceObjectIssue({...object,templateOrigin:false},profile(g),{motifs:[m]}));
 }
 let calls=0;assert.equal(surfaceObjectIssue({...object,w:5,h:5},profile(geometry()),{motifs:()=>{calls++;return [];}}),'');assert.equal(calls,0,'passing boxes do not parse resources');
});
test('real curve overhangs, barely outside paths and actual margin remain blocked',()=>{
 assert.equal(embeddedMotifFits(object,geometry(),resource('M45 10C110 -10 110 70 45 50L10 30Z')),false);
 const g={...geometry(),safeMarginMm:0};
 assert.equal(embeddedMotifFits(object,g,resource('M45 1L90.0002 30L45 59L1 30Z')),false);
 assert.equal(embeddedMotifFits(object,{...g,safeMarginMm:.2},resource('M45 .199L89 30L45 59L1 30Z')),false);
 assert.ok(MOTIF_PATH_TOLERANCE_MM<.001);
});
test('a filled motif surrounding a keepout fails without a vertex in that keepout',()=>{
 const g={...geometry('contour'),holes:[{x:45,y:30,diameter:4}]};
 assert.equal(embeddedMotifFits(object,g,resource()),false);
 const inner='M30 25L60 25L60 35L30 35Z';
 assert.equal(embeddedMotifFits(object,g,resource(diamond+inner,'evenodd')),true);
 assert.equal(embeddedMotifFits(object,g,resource(diamond+inner,'nonzero')),false);
 assert.equal(embeddedMotifFits(object,g,resource(diamond+'M30 25L30 35L60 35L60 25Z','nonzero')),true);
 assert.equal(embeddedMotifFits(object,g,resource(diamond+'M30 28L60 28L60 32L30 32Z','evenodd')),false,'cutout does not clear full keepout');
 const m=resource(diamond+inner,'evenodd');m.svgFragment+=resource('M44 29L46 29L46 31L44 31Z').svgFragment;
 assert.equal(embeddedMotifFits(object,g,m),false,'one path cannot erase another filled path');
});
test('concave outer cuts are checked along entire edges',()=>{
 const g={...geometry('contour'),outlinePath:'M0 0L90 0L90 60L50 60L50 25L40 25L40 60L0 60Z'};
 assert.equal(embeddedMotifFits(object,g,resource('M20 20L70 20L70 40L20 40Z')),false);
});
test('compound subpaths, repeated Z, implicit closure and post-Z drawing follow SVG fill',()=>{
 const expected=embeddedMotifFits(object,geometry(),resource());
 for(const d of [diamond+'ZZ',diamond.slice(0,-1),diamond+'Z L45 5 L45 5Z',diamond+'M40 20L50 20L45 25Z'])assert.equal(embeddedMotifFits(object,geometry(),resource(d)),expected);
 assert.deepEqual(flattenClosedSvgPath('M1 1L1 1Z'),[[1,1]]);
});
test('viewBox meet and rotation match the renderer; resources and object input stay unchanged',()=>{
 const m={...resource('M50 0L100 25L50 50L0 25Z'),bounds:[0,0,100,50]},o={...object,w:40,h:40,rotation:90};
 const before=structuredClone({m,o});assert.equal(embeddedMotifFits(o,geometry(),m),true);assert.deepEqual({m,o},before);
 m.svgFragment=resource('M50 0L500 25L50 50L0 25Z').svgFragment;assert.equal(embeddedMotifFits(o,geometry(),m),false,'cache invalidates changed path');
});
test('unsupported elements, styles, transforms, relative commands and excessive paths fail closed',()=>{
 for(const svg of ['<g>'+resource().svgFragment+'</g>',resource().svgFragment.replace('/>',' stroke="currentColor" stroke-width="1"/>'),resource().svgFragment.replace('/>',' transform="translate(1 1)"/>'),resource().svgFragment.replace('M45','m45'),'<circle cx="45" cy="30" r="5"/>',resource().svgFragment.repeat(257)]){
  const m={...resource(),svgFragment:svg};assert.equal(embeddedMotifFits(object,geometry(),m),null);assert.ok(surfaceObjectIssue(object,profile(geometry()),{motifs:[m]}));
 }
});
test('back geometry mirrors once, including asymmetric fixed holes',()=>{
 const g={...geometry('contour'),outlinePath:'M0 0L90 0L90 60L0 60Z',holes:[{x:8,y:30,diameter:4}]};
 const m=resource('M70 25L80 25L80 35L70 35Z'),o={...object};
 assert.equal(surfaceObjectIssue(o,profile(g),{motifs:[m]}),'');
 assert.equal(surfaceObjectIssue({...o,surfaceId:'back'},profile(g),{motifs:[m]}),'','artwork may cover the mirrored hole');
 assert.equal(embeddedMotifFits(o,surfaceGeometry(g,'back'),m),false,'physical hole exclusion still mirrors once');
 const asymmetric={...g,holes:[],outlinePath:'M0 0L90 0L90 60L0 60L0 40L20 40L20 20L0 20Z'};
 assert.equal(surfaceObjectIssue(o,profile(asymmetric),{motifs:[m]}),'');
 assert.equal(surfaceObjectIssue({...o,surfaceId:'back'},profile(asymmetric),{motifs:[m]}),'Element ragt über die Gestaltungsfläche hinaus.','the mirrored outer cut retains the original box error');
});
