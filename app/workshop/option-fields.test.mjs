// K14 / Ü12.1: Zusatzfelder und bedingte Optionen in Familie, Prüfstand, Bestellung und Summary.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {makeProductDocument} from './product-model.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';import {readReviewPackage,digest} from './review-package.mjs';
import {SUMMARY_FILES} from './production-summary.mjs';import {importEnvironment} from './design-assets.mjs';
import {openKatalog} from './katalog-source.mjs';
import {validateFamily,familyGaps,familyProductConfig,familyOptionFields} from './product-families.mjs';
import {resolvedOptions,quote} from '../configurator/variant-m/contract.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const family=()=>structuredClone(openKatalog(FIXTURE).families.get('test-schilder'));
const FIELDS=[
 {id:'schrauben-farbe',kind:'select',label:'Schraubenkappen',choices:[{id:'silber',label:'Silber'},{id:'schwarz',label:'Schwarz',priceCents:120}],visibleIf:{groupId:'mounting',valueIds:['B02-E6-D4']}},
 {id:'kappen-hinweis',kind:'text',label:'Hinweis Kappen',maxLength:40,visibleIf:{groupId:'schrauben-farbe',valueIds:['schwarz']}},
 {id:'termin',kind:'date',label:'Liefertermin',required:true},
 {id:'geschenk',kind:'checkbox',label:'Geschenkverpackung',priceCents:390}];

test('Familie: Zusatzfelder mit Bedingung auf die Befestigung werden je Größe auf die SKU-Endung abgebildet',()=>{
 const f=family();f.sizes.find(s=>s.key==='TS-RE-60X40').baseCents=899;f.options=structuredClone(FIELDS);validateFamily(f);
 assert.deepEqual(familyGaps(f).filter(g=>/Feld|Option/.test(g)),[]);
 const big=f.sizes.find(s=>s.key==='TS-RE-90X60'),small=f.sizes.find(s=>s.key==='TS-RE-60X40');
 const fields=familyOptionFields(f,big);
 assert.deepEqual(fields.map(x=>x.id),['schrauben-farbe','kappen-hinweis','termin','geschenk']);
 assert.deepEqual(fields[0].visibleIf,{groupId:'mounting',valueIds:['B02']},'Regel-Kennung → SKU-Endung im Produkt');
 // Größe ohne diese Befestigung: Feld (und das davon abhängige) entfällt.
 assert.deepEqual(familyOptionFields(f,small).map(x=>x.id),['termin','geschenk']);
 const c=familyProductConfig(f,big,1);
 assert.deepEqual(c.profile.optionFields.map(x=>x.id),['schrauben-farbe','kappen-hinweis','termin','geschenk']);
 assert.deepEqual(resolvedOptions(c,{mounting:'KGL','schrauben-farbe':'schwarz'}),{mounting:'KGL'});
 assert.equal(quote(c,[],'start',{mounting:'B02','schrauben-farbe':'schwarz',geschenk:true}).unitCents,1099+249+120+390,'Grundpreis + Befestigung + Kappen + Verpackung');
 // Offener Aufpreis eines Felds ist eine Stammdatenlücke (Produkte erst mit Preis).
 const open=family();open.options=[{id:'geschenk',kind:'checkbox',label:'Geschenkverpackung',priceCents:null}];validateFamily(open);
 assert.ok(familyGaps(open).includes('Aufpreis Feld „Geschenkverpackung“'));
 // Schema: Bedingung nur auf Befestigung oder weiter oben stehende Auswahlliste.
 const bad=family();bad.options=[{id:'x',kind:'text',label:'X',visibleIf:{groupId:'geschenk',valueIds:['ja']}}];
 assert.throws(()=>validateFamily(bad),/Bedingung verweist/);
 const badRule=family();badRule.options=[{id:'x',kind:'text',label:'X',visibleIf:{groupId:'mounting',valueIds:['FREMD']}}];
 assert.throws(()=>validateFamily(badRule),/unbekannte Werte/);
 const accessory=family();accessory.options=[{id:'set',label:'Abstandshalter-Set',kind:'accessory',selection:'single',choices:[{id:'a',label:'A',priceCents:0}],visibleIf:{groupId:'mounting',valueIds:['B02-E6-D4']}}];validateFamily(accessory);
});

test('Excel-Rundlauf: Zusatzfelder mit Art, Bedingung, Zeichenlimit und offenem Aufpreis',()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-felder-'));
 try{
  const f=JSON.parse(fs.readFileSync(path.join(root,'app/designs/gedenktafeln-30x20/schiefer-natur.json')));
  const rule=f.mountingRules[0].id;
  f.options=[{id:'set',label:'Set',kind:'accessory',selection:'single',choices:[{id:'a',label:'A',priceCents:250}]},
   {id:'farbe',kind:'select',label:'Kappenfarbe',required:true,choices:[{id:'silber',label:'Silber'},{id:'gold',label:'Gold',priceCents:null}],visibleIf:{groupId:'mounting',valueIds:[rule]}},
   {id:'widmung',kind:'text',label:'Widmung',maxLength:60,visibleIf:{groupId:'farbe',valueIds:['gold']}},
   {id:'datum',kind:'date',label:'Datum'},{id:'karte',kind:'checkbox',label:'Grußkarte',priceCents:null}];
  validateFamily(f);
  const src=path.join(dir,'familie.json'),xlsx=path.join(dir,'stamm.xlsx');fs.writeFileSync(src,JSON.stringify(f));
  execFileSync('python3',[path.join(root,'scripts/family-excel.py'),'export','--out',xlsx,src],{cwd:root});
  execFileSync('python3',[path.join(root,'scripts/family-excel.py'),'import','--xlsx',xlsx,'--out',path.join(dir,'out')],{cwd:root});
  const back=validateFamily(JSON.parse(fs.readFileSync(path.join(dir,'out',f.id+'.json'))));
  assert.deepEqual(back.options,f.options);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

const png=(w,h)=>execFileSync('python3',['-c',`from PIL import Image;import sys;Image.new('RGB',(${w},${h}),'white').save(sys.stdout.buffer,format='PNG')`],{env:importEnvironment()});
test('Prüfstand, Bestellposition und summary.json/summary.pdf tragen die sichtbaren Zusatzfelder',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-felder-summary-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],w=createWorkshop({filename:path.join(dir,'w.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const c=structuredClone(seed.universal);c.profile.processing.profileId='acrylic-engraving';const d=c.profile.designs[0],text=structuredClone(d.objects.find(o=>o.type==='text'));Object.assign(text,{id:'text',fieldKey:'names',text:'Anna & Lukas',size:5,x:100,y:40,w:10,h:6});d.objects=[text];
 c.profile.optionFields=[{id:'widmung',kind:'text',label:'Widmung auf der Karte',required:true},{id:'kordel',kind:'select',label:'Kordel',choices:[{id:'rot',label:'Rot'}],visibleIf:{groupId:'wall',valueIds:['wall']}},{id:'karte',kind:'checkbox',label:'Grußkarte',priceCents:250}];
 const record=w.repository.create(makeProductDocument(c,{name:'Acryl · Felder',kind:'product'})),config=w.model(record.id,1).universal,raw=png(40,40).toString('base64');
 const input=options=>({productId:record.id,productRevision:1,designId:d.id,objects:structuredClone(config.profile.designs[0].objects),options,quantity:1,media:[],preview:raw});
 // Pflichtfeld fehlt → kein Prüfstand.
 await assert.rejects(()=>prepareAcrylicReview({record,config,input:input({size:'small',base:'none',wall:'none'}),assets:w.assets}),/Bitte „Widmung auf der Karte“ ausfüllen/);
 const bundle=await prepareAcrylicReview({record,config,input:input({size:'small',base:'none',wall:'none',widmung:'Alles Liebe',kordel:'rot',karte:true}),assets:w.assets});
 const m=bundle.manifest;
 assert.deepEqual(m.selection.options,{size:'small',base:'none',wall:'none'},'Ausführung ohne Felder (Shop-Variante)');
 assert.deepEqual(m.selection.fields.map(f=>[f.label,f.display,f.priceCents]),[['Widmung auf der Karte','Alles Liebe',0],['Grußkarte','ja',250]],'Kordel unsichtbar (ohne Wandhalterung) → verworfen');
 assert.equal(m.selection.price.fieldCents,250);
 w.customerDrafts.captureAcrylicReview('fixture',bundle);
 const result=await createAcrylicEngravingProof(bundle.package,m.packageSha256),{files}=readReviewPackage(result.archive,digest(result.archive),'gravuru-acrylic-review/v1');
 const summary=JSON.parse(files.get(SUMMARY_FILES.json));
 assert.deepEqual(summary.product.fields.map(f=>[f.id,f.label,f.display]),[['widmung','Widmung auf der Karte','Alles Liebe'],['karte','Grußkarte','ja']]);
 const text2=JSON.parse(execFileSync('python3',['-c',"import sys,json,pymupdf as f;d=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');print(json.dumps(d[0].get_text()))"],{input:files.get(SUMMARY_FILES.pdf),env:importEnvironment()}).toString());
 const flat=text2.replace(/\s+/g,' ');for(const needle of ['Zusatzangaben','Widmung auf der Karte: Alles Liebe','Grußkarte: ja'])assert.ok(flat.includes(needle),needle+' in '+flat.slice(flat.indexOf('Zusatz'),flat.indexOf('Zusatz')+200));
});
