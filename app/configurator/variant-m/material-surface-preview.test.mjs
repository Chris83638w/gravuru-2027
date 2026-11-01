import test from 'node:test';
import assert from 'node:assert/strict';
import {previewSurfaceUrl, surfacePreview, validSurface,plateDepthPreview} from './material-surface.mjs';

// Leistung mobil (20.10.2026): data:-Texturen werden für die Bildschirmvorschau einmal zur blob:-Adresse.
const png='data:image/png;base64,'+Buffer.from('\x89PNG\r\n\x1a\nTEST','binary').toString('base64');
const svg='<svg viewBox="0 0 90 30"><defs></defs><rect width="90" height="30"/></svg>';

test('data:-Textur wird einmal zur blob:-Adresse und in der Vorschau verwendet', () => {
  const a=previewSurfaceUrl(png),b=previewSurfaceUrl(png);
  assert.match(a,/^blob:/);
  assert.equal(a,b,'gleiche Textur → gleiche Adresse, keine neuen Blobs je Zeichnung');
  const out=surfacePreview(svg,a,{width:90,height:30,shape:'rect'});
  assert.ok(out.includes('href="'+a+'"'));
  assert.ok(!out.includes('base64'),'die große Textur steht nicht mehr im Vorschau-Markup');
});

test('fremde blob:-Adressen und ungültige Werte bleiben gesperrt', () => {
  assert.equal(validSurface('blob:http://x/abc'),false);
  assert.equal(surfacePreview(svg,'blob:http://x/abc',{width:90,height:30,shape:'rect'}),svg);
  assert.equal(previewSurfaceUrl('/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png'),'/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png');
  assert.equal(previewSurfaceUrl('data:text/html;base64,PGI+'),'data:text/html;base64,PGI+');
});

test('depth is a separate noninteractive layer; source image and artwork stay exact',()=>{
 const source=surfacePreview(svg,png,{width:90,height:30,shape:'rect'}).replace('</svg>','<g data-object="text"><path d="M1 1L2 2"/></g></svg>');
 const output=plateDepthPreview(source,{width:90,height:30,shape:'rect',cornerRadiusMm:3},'test');
 const marker=output.indexOf('<g data-plate-shadow'),end=output.indexOf('</g></g>',marker)+8;
 assert.equal(output.slice(0,marker)+output.slice(end),source);
 assert.match(output,/data-plate-shadow="true" data-role="guide" aria-hidden="true" pointer-events="none"/);
 assert(output.indexOf('data-plate-shadow')<output.indexOf('data-material-surface'));
});

test('depth follows ellipse or exact contour, without drill holes in the shadow silhouette',()=>{
 const oval=plateDepthPreview(svg,{width:90,height:60,shape:'ellipse',holes:[{x:8,y:30,diameter:4}]});
 assert.match(oval,/<ellipse cx="45" cy="30" rx="45" ry="30"\/>/);
 const g={width:90,height:60,shape:'contour',outlinePath:'M0 5L5 0H85L90 5V55L85 60H5L0 55Z',holes:[{x:8,y:30,diameter:4}]};
 const contour=plateDepthPreview(svg,g),noHoles=plateDepthPreview(svg,{...g,holes:[]});
 assert.equal(contour,noHoles);assert(contour.includes(g.outlinePath));assert.match(contour,/fill-rule="evenodd"/);
});
