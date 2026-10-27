import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createModelSlimmer,surfaceSwapsFrom,fontKey,DEFAULT_SURFACE_DIR} from './shop-model-slim.mjs';

const glyphs=d=>({units:1000,glyphs:{A:{a:600,d}}});
const font=(d,extra={})=>({label:'x',regular:glyphs(d),bold:glyphs(d+'Z'),...extra});
function catalogFetch(files){
 return async p=>{
  if(p==='/_acryl-runtime/lazy/katalog-kern.json')return {font_index:Object.keys(files).map(name=>({name,file:name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json'})).concat([{name:'Böse',file:'../etc.json'}])};
  const hit=Object.entries(files).find(([name])=>p==='/_acryl-runtime/lazy/schriften/'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json');
  if(!hit)throw Error('404');return structuredClone(hit[1]);
 };
}
test('fonts identical to the delivered catalog (regular and bold) leave the customer model; own or differing fonts stay',async()=>{
 const slimmer=createModelSlimmer({fetchJson:catalogFetch({Lora:font('M0 0'),Cinzel:font('M1 1',{category:'Klassisch'}),Raleway:font('M2 2')})});
 const universal={localResources:{scope:'local-review-only',fonts:{Lora:font('M0 0'),Cinzel:font('M1 1'),Raleway:{...font('M2 2'),bold:glyphs('anders')},Ashley:font('M3 3')},motifs:[]}};
 assert.deepEqual(slimmer.slim(structuredClone(universal)),{fonts:[],surface:false},'ohne Katalog nichts entfernen');
 await slimmer.load();assert.equal(slimmer.ready(),true);
 const copy=structuredClone(universal),report=slimmer.slim(copy,{key:'cfg:3'});
 assert.deepEqual(report.fonts.sort(),['Cinzel','Lora']);
 assert.deepEqual(Object.keys(copy.localResources.fonts).sort(),['Ashley','Raleway'],'eigene Schrift und abweichender Fettschnitt bleiben');
 assert.ok(copy.localResources.fonts&&typeof copy.localResources.fonts==='object');
 // Gleiche Revision: Entscheidung wird wiederverwendet.
 const again=structuredClone(universal);assert.deepEqual(slimmer.slim(again,{key:'cfg:3'}).fonts.sort(),['Cinzel','Lora']);
});
test('a failing catalog keeps the full model and is retried later',async()=>{
 let calls=0;const slimmer=createModelSlimmer({fetchJson:async()=>{calls++;throw Error('down');}});
 assert.equal(await slimmer.load(),null);assert.equal(slimmer.ready(),false);
 const universal={localResources:{fonts:{Lora:font('M0 0')}}};assert.deepEqual(slimmer.slim(universal).fonts,[]);assert.ok(universal.localResources.fonts.Lora);
 await slimmer.load();assert.equal(calls,2);
});
test('material surface PNG with a WebP sibling in the repo is replaced by the WebP (preview only)',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-surface-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.writeFileSync(path.join(dir,'platte.png'),Buffer.from([1,2,3]));fs.writeFileSync(path.join(dir,'platte.webp'),Buffer.from([4,5]));fs.writeFileSync(path.join(dir,'allein.png'),Buffer.from([9]));
 const swaps=surfaceSwapsFrom(dir);assert.equal(swaps.size,1);
 const slimmer=createModelSlimmer({surfaceSwaps:swaps});
 const universal={materialSurface:'data:image/png;base64,AQID'};
 assert.equal(slimmer.slim(universal).surface,true);assert.equal(universal.materialSurface,'data:image/webp;base64,BAU=');
 const other={materialSurface:'data:image/png;base64,CQ=='};assert.equal(slimmer.slim(other).surface,false);
 assert.equal(surfaceSwapsFrom(path.join(dir,'fehlt')).size,0);
});
test('the delivered steel surface (sha 74f75d…) has its WebP next to it in the repo',()=>{
 const swaps=surfaceSwapsFrom(DEFAULT_SURFACE_DIR);
 const png='data:image/png;base64,'+fs.readFileSync(path.join(DEFAULT_SURFACE_DIR,'gravuru-edelstahl-feine-maserung-vorschau.png')).toString('base64');
 assert.ok(swaps.get(png)?.startsWith('data:image/webp;base64,'));assert.ok(swaps.get(png).length<png.length/10);
 assert.equal(fontKey({regular:1}),'[1,null]');
});
