import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createContourStore} from './contours.mjs';
import {makeFormProduct} from './form-product.mjs';
import {materialPreview,STEEL_SURFACE,WOOD_LEATHER_ATLAS} from './material-preview.mjs';

test('material preview uses the existing verified steel surface and preserves the original inner and outer geometry',async t=>{
 const store=createContourStore({filename:':memory:'});t.after(()=>store.close());
 const source='<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80" rx="5"/><circle cx="8" cy="40" r="2"/><circle cx="112" cy="40" r="2"/></svg>';
 const c=await store.import({name:'Schild.svg',bytes:Buffer.from(source).toString('base64')}),d=makeFormProduct(c,'Prüfung');d.material.id='steel';
 const before=structuredClone(d),result=materialPreview(d);
 assert.deepEqual(d,before);assert.match(result.svg,/clip-rule="evenodd"/);
 for(const ring of c.geometry.contours)assert.ok(result.svg.includes(ring.d+' Z'));
 assert.match(result.svg,/preserveAspectRatio="xMidYMid slice"/);
 const bytes=readFileSync(new URL('../designs/aosu-labrador/runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),STEEL_SURFACE.sha256);
 for(const id of [null,'slate']){d.material.id=id;const missing=materialPreview(d);assert.equal(missing.svg,null);assert.equal(missing.surface,null);assert.ok(missing.note);}
});

test('derived wood and leather previews use their documented atlas tile, keep holes and never change technical material data',async t=>{
 const store=createContourStore({filename:':memory:'});t.after(()=>store.close());
 const c=await store.import({name:'Schild.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80"/><circle cx="8" cy="40" r="2"/></svg>').toString('base64')});
 const bytes=readFileSync(new URL(WOOD_LEATHER_ATLAS.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),WOOD_LEATHER_ATLAS.sha256);
 for(const [id,x,y]of [['oak',0,0],['beech',1,0],['cherry',0,1],['leather-brown',1,1]]){
  const d=makeFormProduct(c,'Prüfung');d.material.id=id;const before=structuredClone(d),r=materialPreview(d);assert.deepEqual(d,before);assert.equal(d.material.thicknessMm,null);assert.match(r.note,/KI-abgeleitete/);assert(r.svg.includes(`viewBox="${x} ${y} 1 1"`));assert.match(r.svg,/fill-rule="evenodd"/);for(const ring of c.geometry.contours)assert(r.svg.includes(ring.d+' Z'));
 }
});

test('acrylic presentations preserve exact geometry, optional historical settings and explicit thickness',async t=>{
 const {validateFormProduct}=await import('./form-product.mjs');
 const {composeMaterialPreview}=await import('./material-presentation.mjs');
 const store=createContourStore({filename:':memory:'});t.after(()=>store.close());
 const c=await store.import({name:'Freiform.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><path d="M0 0H120V60H80V80H0Z"/><circle cx="8" cy="40" r="2"/></svg>').toString('base64')});
 for(const id of ['acrylic-clear','acrylic-satin','acrylic-anthracite','acrylic-black']){
  const d=makeFormProduct(c,'Acrylprüfung');d.material.id=id;d.presentation={scene:'warm'};const before=structuredClone(d),r=materialPreview(d);
  assert.deepEqual(d,before);assert.equal(r.surface.kind,'procedural');assert.match(r.svg,/data-preview-scene="warm"/);assert.doesNotMatch(r.svg,/data-preview-depth-mm=/);assert.match(r.note,/Stärke offen/);
  for(const ring of c.geometry.contours)assert(r.svg.includes(ring.d+' Z'));
  d.material.thicknessMm=5;const thick=materialPreview(d);assert.match(thick.svg,/data-preview-depth-mm="5"/);assert.match(thick.svg,/translate\(1.1 2.4\)/);
  const composed=composeMaterialPreview(thick.svg,'<g data-original-artwork="true"/>');assert(composed.indexOf('data-original-artwork')<composed.indexOf('data-preview-finish'));assert.doesNotMatch(composed,/<!--material-artwork-->/);
  delete d.presentation;assert.deepEqual(validateFormProduct(d),d);assert.doesNotMatch(materialPreview(d).svg,/data-preview-scene=/);
  for(const p of [{scene:'file:///tmp/private'},{scene:'studio',background:'injected'},null]){const bad=structuredClone(d);bad.presentation=p;assert.throws(()=>validateFormProduct(bad));}
 }
});

test('UV presentation is opt-in, validated and keeps front ink above glass and reverse ink below',async t=>{
 const {validateFormProduct}=await import('./form-product.mjs');const {composeMaterialPreview}=await import('./material-presentation.mjs');
 const store=createContourStore({filename:':memory:'});t.after(()=>store.close());
 const c=await store.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect width="60" height="40"/><circle cx="8" cy="20" r="2"/></svg>').toString('base64')});
 const d=makeFormProduct(c,'Druck');d.material.id='acrylic-clear';d.processingMethod='print';const original=materialPreview(d).svg;
 for(const printSurface of ['front','reverse']){
  d.presentation.printSurface=printSurface;assert.deepEqual(validateFormProduct(d),d);
  const svg=composeMaterialPreview(materialPreview(d).svg,'<g data-art="true"/>');
  assert.equal(svg.indexOf('data-art')>svg.indexOf('data-preview-finish'),printSurface==='front');assert.equal(svg.includes('feTurbulence'),printSurface==='front');
 }
 d.presentation.printSurface='bad';assert.throws(()=>validateFormProduct(d));d.presentation.printSurface='reverse';d.material.id='acrylic-black';assert.throws(()=>validateFormProduct(d),/klares Acrylglas/);
 d.processingMethod='engraving';assert.deepEqual(validateFormProduct(d),d);d.processingMethod='print';
 d.material.id='acrylic-clear';delete d.presentation.printSurface;assert.equal(materialPreview(d).svg,original);
 d.presentation.printSurface='front';d.processingMethod='engraving';assert.doesNotMatch(composeMaterialPreview(materialPreview(d).svg,'<g/>'),/feTurbulence|data-preview-print-surface/);
});

test('all acrylic engraving previews use tonal light marks without mutating source or print views',async t=>{
 const {composeMaterialPreview}=await import('./material-presentation.mjs');const store=createContourStore({filename:':memory:'});t.after(()=>store.close());
 const c=await store.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect width="60" height="40"/><circle cx="8" cy="20" r="2"/></svg>').toString('base64')});
 for(const id of ['acrylic-clear','acrylic-satin','acrylic-anthracite','acrylic-black']){
  const d=makeFormProduct(c,'Prüfung');d.material.id=id;d.processingMethod='engraving';const original=structuredClone(d),art='<path fill="#ab6034" d="M5 5H20V10H5Z"/>';
  const result=materialPreview(d),svg=composeMaterialPreview(result.svg,art);assert.match(svg,/material-acrylic-engraving/);assert.ok(svg.includes(art));assert.match(result.note,/Weiß und Transparenz ohne Gravur/);assert.deepEqual(d,original);
  d.processingMethod='print';assert.doesNotMatch(composeMaterialPreview(materialPreview(d).svg,art),/material-acrylic-engraving/);
 }
});

test('steel, wood and leather have material-specific engraving tones without changing print sources or geometry',async t=>{
 const {composeMaterialPreview,DARK_ENGRAVING_TONES}=await import('./material-presentation.mjs');const store=createContourStore({filename:':memory:'});t.after(()=>store.close());
 const c=await store.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect width="60" height="40"/><circle cx="8" cy="20" r="2"/></svg>').toString('base64')});
 const art='<path fill="#ff0000" d="M5 5H20V10H5Z"/>';
 for(const id of Object.keys(DARK_ENGRAVING_TONES)){
  const d=makeFormProduct(c,'Materialprüfung');d.material.id=id;d.processingMethod='engraving';const before=structuredClone(d),preview=materialPreview(d),svg=composeMaterialPreview(preview.svg,art);
  assert.match(svg,/material-dark-engraving/);assert.ok(svg.includes(art));assert.match(preview.note,/Weiß und Transparenz ohne Gravur/);assert.deepEqual(d,before);for(const ring of c.geometry.contours)assert.ok(svg.includes(ring.d+' Z'));
  d.processingMethod='print';assert.doesNotMatch(composeMaterialPreview(materialPreview(d).svg,art),/material-dark-engraving/);
 }
 const d=makeFormProduct(c,'Unbekannte Oberfläche');d.material.id='slate';d.processingMethod='engraving';assert.equal(materialPreview(d).svg,null);
});

test('M: walnut preview is explicitly an approximation and preserves original contour holes',async t=>{
 const {DARK_ENGRAVING_TONES}=await import('./material-presentation.mjs');const store=createContourStore({filename:':memory:'});t.after(()=>store.close());const c=await store.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect width="60" height="40"/><circle cx="8" cy="20" r="2"/></svg>').toString('base64')});const d=makeFormProduct(c,'Walnuss');d.material.id='walnut';d.processingMethod='engraving';const before=structuredClone(d),preview=materialPreview(d);assert.equal(preview.surface.approximate,true);assert.match(preview.note,/Näherung/);assert.match(preview.svg,/data-material-approximation="walnut"/);assert.equal(DARK_ENGRAVING_TONES.walnut.approximate,true);for(const p of c.geometry.contours)assert.ok(preview.svg.includes(p.d+' Z'));assert.deepEqual(d,before);
});
