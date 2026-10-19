// K14 / Ü15.1: zweite Fläche (Rückseite) – Produktmodell, Prüfung, Preis, Editor-Reiter, Fertigung.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {makeProductDocument} from './product-model.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';import {createAcrylicPrintProof} from './acrylic-print-proof.mjs';import {outputDownload} from './print-delivery.mjs';import {readReviewPackage,digest} from './review-package.mjs';
import {SUMMARY_FILES} from './production-summary.mjs';import {importEnvironment} from './design-assets.mjs';
import {openKatalog} from './katalog-source.mjs';
import {validateFamily,familyProductConfig,familyBriefing} from './product-families.mjs';
import {prepareConfig,quote,validateDesign,newEditableObject} from '../configurator/variant-m/contract.mjs';
import {objectSurface,producedSurfaces,surfaceGeometry,surfaceFileName,backDesigned} from '../configurator/variant-m/surfaces.mjs';
import {surfaceTabState} from '../configurator/variant-m/surface-tabs.mjs';
import {workshopResources} from './catalog.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const family=()=>{const f=structuredClone(openKatalog(FIXTURE).families.get('test-schilder'));f.sizes.find(s=>s.baseCents===null).baseCents=899;return f;};
const fonts=workshopResources().fonts;
const BACK={id:'back',priceCents:450};
// Familienprodukt (Edelstahl 90 × 60, Startdesign mit einem Text) mit oder ohne Rückseite.
function product(surfaces){const f=family();if(surfaces)f.surfaces=surfaces;validateFamily(f);return familyProductConfig(f,f.sizes[0],1);}
const backText=(c,extra={})=>({...structuredClone(c.profile.designs[0].objects[0]),id:'rueck',text:'Für Oma',templateOrigin:false,surfaceId:'back',...extra});

test('Vorderseite allein wie bisher: kein Reiter, kein Aufpreisfeld, Elemente ohne surfaceId liegen vorn',()=>{
 const c=product();
 assert.equal(c.profile.surfaces,undefined);assert.equal(surfaceTabState(c.profile),null);
 const design=c.profile.designs[0],q=quote(c,design.objects,design.id,{mounting:'K00'});
 assert.equal(q.backCents,undefined);assert.equal(q.unitCents,1099);
 assert.equal(objectSurface(design.objects[0]),'front');assert.deepEqual(producedSurfaces(c.profile,design.objects),['front']);
 // Ohne Rückseite gibt es keine Rückseiten-Elemente.
 assert.throws(()=>validateDesign(c,{...design,objects:[...design.objects,backText(c)]},{mounting:'K00'},fonts,[]),/keine solche Seite/);
 assert.throws(()=>newEditableObject(c,{type:'text',text:'x',font:'Montserrat',surfaceId:'back'},'neu',fonts,[]),/keine solche Seite/);
});

test('Rückseite validiert je Fläche: Aufpreis, Kontur/Rand, Seite der Vorlage, Limits; Reiter mit Preis',()=>{
 const c=product([{id:'front'},BACK]),design=c.profile.designs[0];
 assert.deepEqual(surfaceTabState(c.profile).tabs.map(t=>[t.id,t.enabled]),[['front',true],['back',true]]);
 assert.match(surfaceTabState(c.profile).tabs[1].note,/Rückseite gestalten \+4,50/);
 const objects=[...design.objects,backText(c)];
 validateDesign(c,{...design,objects},{mounting:'K00'},fonts,[]);
 assert.equal(quote(c,objects,design.id,{mounting:'K00'}).unitCents,1099+450);assert.equal(quote(c,objects,design.id,{mounting:'K00'}).backCents,450);
 assert.equal(quote(c,design.objects,design.id,{mounting:'K00'}).backCents,0,'nur gestaltete Rückseite kostet');
 assert.equal(quote(c,[...design.objects,backText(c,{uxHidden:true})],design.id,{mounting:'K00'}).unitCents,1099,'ausgeblendet = nicht gestaltet');
 // Kontur/Rand gilt auf der Rückseite genauso.
 assert.throws(()=>validateDesign(c,{...design,objects:[...design.objects,backText(c,{x:200})]},{mounting:'K00'},fonts,[]),/ragt|Gestaltungsfläche|außerhalb/);
 // Ein Vorlagenelement bleibt auf seiner Seite; unbekannte Seite wird abgelehnt.
 assert.throws(()=>validateDesign(c,{...design,objects:design.objects.map(o=>({...o,surfaceId:'back'}))},{mounting:'K00'},fonts,[]),/bleibt auf seiner Seite/);
 assert.throws(()=>validateDesign(c,{...design,objects:[...design.objects,backText(c,{surfaceId:'innen'})]},{mounting:'K00'},fonts,[]),/keine solche Seite/);
 // Mindestschriftgröße des Verfahrens (K10) auch hinten.
 assert.throws(()=>validateDesign(c,{...design,objects:[...design.objects,backText(c,{size:1})]},{mounting:'K00'},fonts,[]),/Text zu klein/);
 // Bohrlöcher erscheinen von hinten gespiegelt.
 assert.deepEqual(surfaceGeometry({width:90,height:60,holes:[{x:6,y:30,diameter:4}]},'back').holes,[{x:84,y:30,diameter:4}]);
 const added=newEditableObject(c,{type:'text',text:'Hinten',font:'Montserrat',surfaceId:'back'},'neu',fonts,[]);assert.equal(added.surfaceId,'back');
});

test('Offener Aufpreis sperrt die Rückseite (nur Entwurf und Vorlage dürfen sie tragen)',()=>{
 const c=product([{id:'front'},{id:'back',priceCents:null}]),design=c.profile.designs[0],objects=[...design.objects,backText(c)];
 const tabs=surfaceTabState(c.profile).tabs;assert.equal(tabs[1].enabled,false);assert.match(tabs[1].note,/Preis offen – noch nicht buchbar/);
 assert.throws(()=>validateDesign(c,{...design,objects},{mounting:'K00'},fonts,[]),/Rückseite ist noch nicht buchbar/);
 assert.throws(()=>quote(c,objects,design.id,{mounting:'K00'}),/noch nicht buchbar/);
 validateDesign(c,{...design,objects},{mounting:'K00'},fonts,[],{draft:true});validateDesign(c,{...design,objects},{mounting:'K00'},fonts,[],{template:true});
 assert.equal(quote(c,design.objects,design.id,{mounting:'K00'}).unitCents,1099,'Vorderseite bleibt bestellbar');
 // Schema der Flächen.
 for(const [surfaces,re] of [[[{id:'back',priceCents:1}],/zuerst „front“/],[[{id:'front'},{id:'back'}],/Aufpreis/],[[{id:'front'},{id:'back',priceCents:1,mirror:'ja'}],/Spiegelung/],[[{id:'front'},{id:'seite',priceCents:1}],/Kennungen front und back/],[[{id:'front'},{id:'back',priceCents:1,farbe:1}],/unbekannte Felder/],[[{id:'front'},{id:'back',priceCents:1,processingProfileId:'gibtsnicht'}],/Verfahrensprofil/]])
  assert.throws(()=>product(surfaces),re,JSON.stringify(surfaces));
 // Rückseite mit anderem Verfahren (Druck statt Gravur) ist nicht an die Ausgabe angeschlossen.
 assert.throws(()=>product([{id:'front'},{id:'back',priceCents:0,processingProfileId:'color-print'}]),/anderem Verfahren/);
});

test('Familie: Flächen gehen ins Produkt, Briefing nennt Rückseite und offenen Aufpreis; Excel-Rundlauf',()=>{
 const f=family();f.surfaces=[{id:'front'},{id:'back',priceCents:null,mirror:false}];validateFamily(f);
 assert.deepEqual(familyProductConfig(f,f.sizes[0],1).profile.surfaces,f.surfaces);
 const brief=familyBriefing(f,1);assert.match(brief,/\*\*Rückseite:\*\* eigene Fläche/);assert.match(brief,/Aufpreis „Rückseite gestalten“ \(bis dahin nicht buchbar\)/);
 const root=fileURLToPath(new URL('../../',import.meta.url)),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-flaechen-'));
 try{
  const g=JSON.parse(fs.readFileSync(path.join(root,'app/designs/gedenktafeln-30x20/schiefer-natur.json')));g.surfaces=[{id:'front'},{id:'back',priceCents:350,processingProfileId:'slate-engraving',mirror:true}];validateFamily(g);
  const src=path.join(dir,'f.json'),xlsx=path.join(dir,'s.xlsx');fs.writeFileSync(src,JSON.stringify(g));
  execFileSync('python3',[path.join(root,'scripts/family-excel.py'),'export','--out',xlsx,src],{cwd:root});
  execFileSync('python3',[path.join(root,'scripts/family-excel.py'),'import','--xlsx',xlsx,'--out',path.join(dir,'out')],{cwd:root});
  assert.deepEqual(validateFamily(JSON.parse(fs.readFileSync(path.join(dir,'out',g.id+'.json')))).surfaces,g.surfaces);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

const png=(w,h)=>execFileSync('python3',['-c',`from PIL import Image;import sys;Image.new('RGB',(${w},${h}),'white').save(sys.stdout.buffer,format='PNG')`],{env:importEnvironment()});
async function engraving(t,{back=true,mirror,print=false,profile}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-flaechen-gravur-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],w=createWorkshop({filename:path.join(dir,'w.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const c=structuredClone(seed.universal);if(!print)c.profile.processing.profileId='acrylic-engraving';c.profile.surfaces=[{id:'front'},{id:'back',priceCents:500,...(mirror===undefined?{}:{mirror})}];
 const d=c.profile.designs[0],text=structuredClone(d.objects.find(o=>o.type==='text'));Object.assign(text,{id:'vorn',fieldKey:'vorn',text:'Vorne',size:6,x:60,y:50,w:10,h:6});d.objects=[text];
 const record=w.repository.create(makeProductDocument(c,{name:'Brettchen · zweiseitig',kind:'product'})),config=w.model(record.id,1).universal,objects=structuredClone(config.profile.designs[0].objects);
 if(back)objects.push({...structuredClone(objects[0]),id:'hinten',fieldKey:undefined,text:'Hinten',x:40,templateOrigin:false,customerEditable:true,surfaceId:'back'});
 const raw=png(40,40).toString('base64'),input={productId:record.id,productRevision:1,designId:d.id,objects:objects.map(o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined))),options:{size:'small',base:'none',wall:'none'},quantity:1,media:[],preview:raw};
 const bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});w.customerDrafts.captureAcrylicReview('fixture',bundle);
 const result=print?await createAcrylicPrintProof(bundle.package,bundle.manifest.packageSha256,profile?{profile}:{}):await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256);
 return {bundle,result,...readReviewPackage(result.archive,digest(result.archive),'gravuru-acrylic-review/v1')};
}
test('Fertigung: Rückseite erzeugt eigene Produktionsdatei mit -vorderseite/-rueckseite, ohne fremde Seite',async t=>{
 const {bundle,result,files}=await engraving(t,{mirror:true});
 assert.equal(bundle.manifest.selection.price.backCents,500);
 for(const name of ['technische-gravurpruefung-vorderseite.pdf','technische-gravurpruefung-rueckseite.pdf','gravur-kontur-1zu1-vorderseite.pdf','gravur-kontur-1zu1-rueckseite.pdf','gesicherte-gravurgestaltung-vorderseite.svg','gesicherte-gravurgestaltung-rueckseite.svg','gravurpruefung.json',SUMMARY_FILES.json])assert.ok(files.has(name),name);
 assert.ok(!files.has('technische-gravurpruefung.pdf'));
 const front=files.get('gesicherte-gravurgestaltung-vorderseite.svg').toString(),backSvg=files.get('gesicherte-gravurgestaltung-rueckseite.svg').toString();
 assert.equal((front.match(/data-field=/g)||[]).length,1);assert.equal((backSvg.match(/data-field=/g)||[]).length,1,'je Seite nur ihre Elemente');
 assert.notEqual(digest(files.get('technische-gravurpruefung-vorderseite.pdf')),digest(files.get('technische-gravurpruefung-rueckseite.pdf')));
 assert.deepEqual(result.metadata.surfaces.map(s=>[s.id,s.pdf,s.mirror]),[['front','technische-gravurpruefung-vorderseite.pdf',false],['back','technische-gravurpruefung-rueckseite.pdf',true]]);
 assert.equal(result.metadata.surfaces[1].pdfSha256,digest(files.get('technische-gravurpruefung-rueckseite.pdf')));
 const summary=JSON.parse(files.get(SUMMARY_FILES.json));
 assert.deepEqual(summary.product.surfaces.map(s=>s.id),['front','back']);assert.deepEqual(summary.textFields.map(f=>[f.text,f.surfaceId]),[['Vorne','front'],['Hinten','back']]);
 assert.ok(summary.output.files.includes('technische-gravurpruefung-rueckseite.pdf'));
 assert.equal(surfaceFileName('Mimaki-NUR-RDG_WHITE.pdf','back'),'Mimaki-NUR-RDG_WHITE-rueckseite.pdf');
});
test('Fertigung: zweiseitiges Produkt ohne gestaltete Rückseite behält die bisherigen Dateinamen',async t=>{
 const {result,files}=await engraving(t,{back:false});
 assert.ok(files.has('technische-gravurpruefung.pdf'));assert.ok(files.has('gravur-kontur-1zu1.pdf'));assert.ok(!files.has('technische-gravurpruefung-rueckseite.pdf'));
 assert.equal(result.metadata.surfaces,undefined);assert.equal(backDesigned([]),false);
});
test('Fertigung Druck: je Seite Druck-, Weiß- und SVG-Datei; Weiß-Download der Vorderseite bleibt erreichbar',async t=>{
 const {result,files}=await engraving(t,{print:true,profile:'mimaki'});
 for(const name of ['Mimaki-FARBE-ohne-RDG_WHITE-vorderseite.pdf','Mimaki-FARBE-ohne-RDG_WHITE-rueckseite.pdf','Mimaki-NUR-RDG_WHITE-vorderseite.pdf','Mimaki-NUR-RDG_WHITE-rueckseite.pdf','gesicherte-gestaltung-vorderseite.svg','gesicherte-gestaltung-rueckseite.svg','druckpruefung.json'])assert.ok(files.has(name),name);
 assert.deepEqual(result.metadata.surfaces.map(s=>[s.id,s.pdf,s.white]),[['front','Mimaki-FARBE-ohne-RDG_WHITE-vorderseite.pdf','Mimaki-NUR-RDG_WHITE-vorderseite.pdf'],['back','Mimaki-FARBE-ohne-RDG_WHITE-rueckseite.pdf','Mimaki-NUR-RDG_WHITE-rueckseite.pdf']]);
 assert.equal(outputDownload(result,'white-pdf').suffix,'Mimaki-NUR-RDG_WHITE-vorderseite.pdf');
});
