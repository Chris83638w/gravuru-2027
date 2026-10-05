import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createContourStore} from './contours.mjs';
import {makeFormProduct} from './form-product.mjs';
import {materialPreview,STEEL_SURFACE} from './material-preview.mjs';

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
 for(const id of [null,'oak','slate','acrylic-clear']){d.material.id=id;const missing=materialPreview(d);assert.equal(missing.svg,null);assert.equal(missing.surface,null);assert.ok(missing.note);}
});
