import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const [before,after]=process.argv.slice(2);if(!before||!after)throw Error('Vorher- und Nachher-Paket erforderlich.');
const read=(dir,p)=>fs.readFileSync(path.join(dir,p),'utf8');
const a=JSON.parse(read(before,'models.json')),b=JSON.parse(read(after,'models.json'));
const ca=a[0].universal,cb=b[0].universal;
assert.deepEqual(cb.profile,ca.profile);assert.deepEqual(cb.photo,ca.photo);
assert.deepEqual({...cb,localResources:null},{...ca,localResources:null});
const module=read(after,'platform/sources/app/shared/models/doorbell-preview.mjs').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
const api=vm.runInNewContext(module+';({measureText,textPaths})');
let retained=0;
for(const [id,font] of Object.entries(ca.localResources.fonts))for(const [c,g] of Object.entries(font.regular.glyphs)){assert.deepEqual(cb.localResources.fonts[id].regular.glyphs[c],g);retained++;}
const d=structuredClone(cb.profile.designs.find(d=>d.id==='GT-S-2-2'));d.objects[0].text='Wunschmann';d.objects[0].size=22;
api.measureText(d.objects[0],cb.localResources.fonts);assert.equal((api.textPaths(d.objects[0],cb.localResources.fonts).match(/<path /g)||[]).length,10);
const complete=read(after,'platform/sources/app/shared/models/design-content.mjs').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
const validate=vm.runInNewContext(complete+';validateDesignContent');validate(d,{universal:true,extraFontIds:Object.keys(cb.localResources.fonts)});
for(const o of d.objects.filter(o=>o.type==='text'))api.measureText(o,cb.localResources.fonts);
console.log(JSON.stringify({passed:true,designsUnchanged:ca.profile.designs.length,existingGlyphsUnchanged:retained,testName:'Wunschmann',glyphs:10,sizeMm:22,textWidthMm:d.objects[0].w,pricesUnchanged:true,photosUnchanged:true}));
