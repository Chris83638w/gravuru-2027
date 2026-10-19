import test from 'node:test';
import assert from 'node:assert/strict';
import {designAreaOutline,designAreaPreview,designArea} from './design-area.mjs';
import {objectIssue} from '../../platform/sources/app/shared/models/design-content.mjs';
import {createDesignAssetStore} from '../../workshop/design-assets.mjs';
import {steelSpecimen} from '../../workshop/specimen-product.mjs';
import {makeProductDocument,validateProductDocument,resolveProduct} from '../../workshop/product-model.mjs';
import {resizeSteelDocument} from './steel-formats.mjs';
import {productPreview} from '../../workshop/product-preview.mjs';

const plate=(geometry,extra={})=>({profile:{geometry:{shape:'rect',cornerRadiusMm:0,holes:[],...geometry}},...extra});
const frame='<svg viewBox="0 0 100 60"><rect width="100" height="60"/></svg>';

test('E2: the hidden default margin becomes a visible outline that follows the same inset rules as objectIssue',()=>{
 // Default 2 mm on a rounded plate: inset rectangle with reduced corner radius.
 assert.equal(designAreaOutline(plate({width:100,height:60,cornerRadiusMm:5})),'<rect x="2" y="2" width="96" height="56" rx="3"/>');
 assert.equal(designAreaOutline(plate({width:100,height:60,safeMarginMm:3})),'<rect x="3" y="3" width="94" height="54"/>');
 // Margin 0 on a plain plate hides nothing: no line.
 assert.equal(designAreaOutline(plate({width:100,height:60,safeMarginMm:0})),'');
 // Ellipse: constant-distance inset (not simply shrunken axes), 120 points on the parallel curve.
 const oval=designAreaOutline(plate({width:90,height:60,shape:'ellipse',safeMarginMm:2}));
 assert.match(oval,/^<polygon points="88,30 /);assert.equal(oval.split(' ').length-1,120);
 const points=oval.match(/points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number));
 for(const [x,y] of points){const probe={x,y,w:.001,h:.001,rotation:0};assert.equal(objectIssue(probe,plate({width:90,height:60,shape:'ellipse',safeMarginMm:1.99}).profile),'');assert.notEqual(objectIssue(probe,plate({width:90,height:60,shape:'ellipse',safeMarginMm:2.02}).profile),'');}
 // Acrylic uses the fixed safe area (4/4/4/10 mm) – identical to designArea().
 const acrylic={acrylic:{},profile:{geometry:{width:150,height:200,shape:'rect',cornerRadiusMm:2,safeMarginMm:0,holes:[]}}},a=designArea(acrylic);
 assert.equal(designAreaOutline(acrylic),`<rect x="${a.left}" y="${a.top}" width="${a.right-a.left}" height="${a.bottom-a.top}"/>`);
});

test('E2: outline is a 1 px dashed preview layer only; it is never added when show=false',()=>{
 const config=plate({width:100,height:60,safeMarginMm:2}),shown=designAreaPreview(frame,config);
 assert.match(shown,/<g data-m-design-area="true"[^>]*pointer-events="none"[^>]*stroke="#a0a8a3" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="1.5 1"><rect x="2" y="2" width="96" height="56" vector-effect="non-scaling-stroke"\/><\/g><\/svg>$/);
 assert.equal(designAreaPreview(frame,config,config.profile,{show:false}),frame);
 assert.equal(designAreaPreview(frame,plate({width:100,height:60,safeMarginMm:0})),frame,'nothing hidden, nothing drawn');
 // A selected option profile (e.g. another steel size) decides the geometry, not the base profile.
 const larger={geometry:{width:200,height:120,shape:'rect',cornerRadiusMm:0,safeMarginMm:4,holes:[]}};
 assert.match(designAreaPreview(frame,config,larger),/<rect x="4" y="4" width="192" height="112"/);
});

test('E2: workshop preview SVG carries the boundary, the production/order SVG does not',async t=>{
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const document=validateProductDocument(resizeSteelDocument(makeProductDocument(await steelSpecimen(assets)),{width:180,height:120,shape:'rect',cornerRadiusMm:0,safeMarginMm:3}));
 const r=resolveProduct(document,{});
 const preview=productPreview({universal:document.config},{options:r.resolvedOptions,keepout:true});
 assert.match(preview,/data-m-design-area="true"/);assert.match(preview,/<rect x="3" y="3" width="174" height="114" vector-effect="non-scaling-stroke"\/>/);
 const production=productPreview({universal:document.config},{options:r.resolvedOptions});
 assert.doesNotMatch(production,/data-m-design-area/);assert.doesNotMatch(production,/data-m-keepout/);
});
