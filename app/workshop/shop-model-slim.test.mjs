import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createHash} from 'node:crypto';
import {createModelSlimmer,surfaceSwapsFrom,fontKey,designFontNames,DEFAULT_SURFACE_DIR} from './shop-model-slim.mjs';
import {productFontIndex} from '../configurator/variant-m/lazy-resources-model.mjs';

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
 assert.deepEqual(slimmer.slim(structuredClone(universal)),{fonts:[],deferred:[],surface:false},'ohne Katalog nichts entfernen');
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
test('own fonts the model never names become content-addressed files in the lazy index; used, format and catalog-named fonts stay',async()=>{
 const fontUrl=hash=>'/konfigurator/shop/schriften/'+hash+'.json',hashIn=url=>url.match(/([a-f0-9]{64})\.json$/)[1];
 const slimmer=createModelSlimmer({fetchJson:catalogFetch({Lora:font('M0 0'),Raleway:font('M2 2')}),fontUrl,maxFontFiles:3});
 const universal={profile:{designs:[{id:'d1',objects:[{id:'t1',type:'text',font:'Ashley'},{id:'m1',type:'motif',font:'Großzügig'}]},{id:'d2',objects:[{id:'t2',type:'text',font:'Lora'}]}]},
  doorbell:{formats:[{key:'f1',profile:{designs:[{id:'fd',objects:[{id:'ft',type:'text',font:'Formatschrift'}]}]}}]},
  localResources:{fonts:{Lora:font('M0 0'),Raleway:{...font('M2 2'),bold:glyphs('anders')},Ashley:font('M3 3'),'Lato Regular · c3d3cabdb582':font('M4 4',{category:'Serifenlos'}),Homage:font('M6 6'),Großzügig:font('M5 5'),Formatschrift:font('M7 7')},motifs:[]}};
 assert.deepEqual([...designFontNames(universal)].sort(),['Ashley','Formatschrift','Großzügig','Lora']);
 // Ohne Katalog bleibt alles unverändert (auch keine Nachlade-Dateien).
 const before=structuredClone(universal);assert.deepEqual(slimmer.slim(before).deferred,[]);assert.equal(before.localResources.lazyFonts,undefined);
 await slimmer.load();
 let sourceCalls=0;const source=()=>{sourceCalls++;return structuredClone(universal.localResources.fonts);};
 const copy=structuredClone(universal),report=slimmer.slim(copy,{key:'cfg:7',source});
 assert.deepEqual(report.fonts,['Lora']);assert.deepEqual(report.deferred.sort(),['Homage','Lato Regular · c3d3cabdb582']);
 assert.deepEqual(Object.keys(copy.localResources.fonts).sort(),['Ashley','Formatschrift','Großzügig','Raleway'],'genutzte, Format- und gleichnamig abweichende Katalogschriften bleiben');
 const lazy=copy.localResources.lazyFonts;assert.equal(lazy.length,2);
 // Das Format passt zur Editor-Prüfung (productFontIndex) und die Datei ist bytegleich zur Originalschrift.
 assert.deepEqual(productFontIndex(copy).map(f=>f.name).sort(),['Homage','Lato Regular · c3d3cabdb582']);
 for(const entry of lazy){
  const hash=hashIn(entry.url),body=slimmer.fontFile(hash);
  assert.equal(createHash('sha256').update(body).digest('hex'),hash);
  assert.deepEqual(JSON.parse(body),universal.localResources.fonts[entry.name]);
 }
 assert.equal(lazy.find(f=>f.name.startsWith('Lato')).category,'Serifenlos');assert.equal(lazy[0].label,'x');
 assert.equal(slimmer.fontFile('0'.repeat(64)),null);
 // Gleiche Revision: gleiche Adressen; vorhandener Nachlade-Index wird nicht überschrieben.
 const again=structuredClone(universal);slimmer.slim(again,{key:'cfg:7',source});assert.deepEqual(again.localResources.lazyFonts,lazy);
 const preset=structuredClone(universal);preset.localResources.lazyFonts=[];slimmer.slim(preset,{key:'cfg:8'});assert.deepEqual(preset.localResources.lazyFonts,[]);assert.ok(preset.localResources.fonts.Homage);
 // Begrenzter Speicher: zuletzt abgerufene Dateien bleiben; verdrängte kommen geprüft aus dem gespeicherten Modell.
 const [first,second]=lazy.map(e=>hashIn(e.url));
 slimmer.slim({profile:{designs:[]},localResources:{fonts:{F0:font('M9 0')}}},{key:'x:0'});
 assert.ok(slimmer.fontFile(first),'Abruf frischt auf');
 slimmer.slim({profile:{designs:[]},localResources:{fonts:{F1:font('M9 1')}}},{key:'x:1'});
 assert.equal(sourceCalls,0);
 assert.ok(slimmer.fontFile(first),'aufgefrischte Datei noch im Speicher');assert.equal(sourceCalls,0);
 assert.deepEqual(JSON.parse(slimmer.fontFile(second)),universal.localResources.fonts[lazy[1].name]);assert.equal(sourceCalls,1,'verdrängt → aus dem Modell nachgeliefert');
 // Geändertes Modell (anderer Inhalt unter gleichem Namen): kein falscher Inhalt unter dem alten Hash.
 const changed=createModelSlimmer({fetchJson:catalogFetch({}),fontUrl,maxFontFiles:1});await changed.load();
 const c2=structuredClone(universal);let current=structuredClone(universal.localResources.fonts);changed.slim(c2,{key:'cfg:9',source:()=>current});
 const h=hashIn(c2.localResources.lazyFonts.find(f=>f.name==='Homage').url);
 changed.slim({profile:{designs:[]},localResources:{fonts:{F2:font('M9 2')}}},{key:'x:2'});
 current={...current,Homage:font('M8 8')};assert.equal(changed.fontFile(h),null);
 // Ohne fontUrl (z. B. eingebetteter Aufrufer) wird nichts ausgelagert.
 const plain=createModelSlimmer({fetchJson:catalogFetch({Lora:font('M0 0')})});await plain.load();
 const p2=structuredClone(universal);assert.deepEqual(plain.slim(p2).deferred,[]);assert.equal(p2.localResources.lazyFonts,undefined);
});
