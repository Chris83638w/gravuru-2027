import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createWorkshop} from './http.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {workshopResources} from './catalog.mjs';
import {openKatalog} from './katalog-source.mjs';
import {planKatalogImport,applyKatalogImport,formatReport,ensureFontSet,importKey,createKatalogReportWriter} from './katalog-import.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
function workshop(t){
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const ws=createWorkshop({filename:':memory:',seedConfig:makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'b'.repeat(64)),legacy:{purchasing:{},features:{}}});
 t.after(()=>ws.close());return ws;
}
// Fixture-Designs tragen keine Freigabe; die Mechanik-Tests laufen daher mit allDesigns, die Freigabe-Regel hat einen eigenen Test.
const options=ws=>({repository:ws.repository,families:ws.families,fontLibrary:ws.fonts,profiles:ws.profiles,available:workshopResources().fonts,allDesigns:true});
const writableOptions=ws=>({...options(ws),allDesigns:false});
// Approvals are explicit synthetic setup only; source fixture files stay untouched.
function approvedFixture(katalog){
 const ziele=[...katalog.families.keys()].map(familie=>({familie,freigabe:{status:'freigegeben',am:'2026-10-24T00:00:00Z',von:'synthetic-import-fixture'}}));
 for(const master of katalog.designs.masters){master.json={...master.json,ziele:structuredClone(ziele)};master.released=true;}
 const bestand=katalog.designs.bestand;katalog.designs.bestand=(...args)=>bestand(...args).map(design=>({...design,json:{...design.json,ziele:structuredClone(ziele)},released:true}));
 return katalog;
}

test('Dry-run: Bericht je Linie ohne Schreiben; Commit legt Familie, Schriftprofile und Produkte an; zweiter Lauf ist unverändert',async t=>{
 const ws=workshop(t),k=approvedFixture(openKatalog(FIXTURE));
 await assert.rejects(planKatalogImport(k,'fremd',writableOptions(ws)),/Linie „fremd“ ist im Katalog nicht vorhanden/);
 const plan=await planKatalogImport(k,'test-linie',{...writableOptions(ws),bestand:'test-bestand'}),r=plan.report;
 assert.equal(r.line.id,'test-linie');
 assert.deepEqual(r.families.map(f=>[f.id,f.action,f.revision,f.sizes,f.ready,f.pricesOpen]),[['test-schilder','neu',1,4,false,['Preis offen: 6 × 4 cm']]]);
 assert.deepEqual(r.families[0].series.map(s=>[s.key,s.sizes,s.designs]),[['60x40',3,2],['80x80',1,1]],'Bestand 100 × 100 gehört zur quadratischen Reihe');
 assert.deepEqual(r.designs.oldSize,['test-alt']);
 assert.deepEqual({masters:r.designs.masters,bestand:r.designs.bestand,considered:r.designs.considered,withSeries:r.designs.withSeries,withoutTheme:r.designs.withoutTheme},{masters:3,bestand:2,considered:4,withSeries:3,withoutTheme:1},'Acryl-Bestand passt nicht zum Edelstahl; Edelstahl-Bestand ohne Thema wird gezählt, nicht übernommen');
 const [namen,hunde]=r.subcategories;
 assert.equal(namen.fontProfileId,ws.profiles.list({type:'fonts'}).find(p=>p.name==='Schrift-Set tuerschilder (Katalog)').id);
 assert.deepEqual(namen.fonts.missing,['Michroma (Datei fehlt im Katalog)','Lato (Datei fehlt im Katalog)']);
 assert.deepEqual(ws.profiles.get(namen.fontProfileId).items,['Cinzel','Montserrat'],'Set-Profil nur mit vorhandenen Werkstattschriften');
 assert.equal(hunde.fontSet,'hundeschilder');assert.equal(hunde.designs,2);
 assert.deepEqual(namen.products.map(p=>[p.sizeKey,p.action,p.templates.map(x=>x.design+':'+x.fit)]),[['TS-RE-90X60','neu',['test-herz:prüfen']],['TS-RE-120X80','neu',['test-herz:prüfen']],['TS-RE-60X40','gesperrt',['test-herz:prüfen']],['TS-QU-80X80','neu',[]]]);
 assert.equal(namen.products[2].reason,'Preis offen: 6 × 4 cm');
 assert.ok([namen.products[0],namen.products[1],hunde.products[0]].every(p=>p.templates.find(x=>x.design==='test-herz').issues.some(issue=>/Bohrloch|gebohrt/.test(issue))),'all offered mounting choices retain their drilling warning');
 assert.equal(plan.diagnosticOnly,false,'only a plan with explicit fixture approvals is applicable');
 assert.deepEqual(hunde.products.map(p=>[p.sizeKey,p.action,p.templates.map(x=>x.design+':'+x.fit)]),[['TS-RE-90X60','neu',['test-foto:prüfen','test-herz:prüfen']],['TS-RE-60X40','gesperrt',['test-foto:prüfen','test-herz:prüfen']]],'Bericht in Katalogreihenfolge; Fotogravur bleibt (tools.photo), ohne Fotoangabe der Familie „prüfen“');
 assert.ok(hunde.products.every(p=>!p.excluded.some(e=>e.design==='test-foto')),'Fotofeld auf einem Gravurziel mit Fotoverfahren wird nicht ausgeschlossen (Claude 25.10.: Fotogravur ist Produktwissen)');
 assert.deepEqual(r.counts,{products:6,new:4,update:0,unchanged:0,blocked:2,templates:4,sizes:4,pricesOpen:1,designsWithoutSeries:1,unreleased:0,fit:{passt:0,'prüfen':7,'passt nicht':0}});
 assert.equal(ws.repository.list().length,1,'Dry-run legt keine Produkte an');assert.deepEqual(ws.families.list(),[]);
 const text=formatReport(r);
 assert.match(text,/Summe: 6 Produkte \(neu 4, aktualisieren 0, unverändert 0, gesperrt 2\), 4 Vorlagen/);assert.match(text,/gesperrt ×2: Preis offen: 6 × 4 cm/);
 const bestseller=plan.items.find(i=>i.key===importKey('test-linie','hundeschilder','TS-RE-90X60')).document;
 assert.deepEqual(bestseller.config.profile.designs.map(d=>d.id),['katalog-test-herz','katalog-test-foto'],'Bestseller zuerst');
 assert.equal(bestseller.config.photo.enabled,true);assert.equal(bestseller.config.profile.themeId,'hundeschilder');
 // Commit
 const result=applyKatalogImport(plan,writableOptions(ws));
 assert.deepEqual(result.families,[{id:'test-schilder',action:'neu',revision:1}]);
 assert.equal(result.products.filter(p=>p.action==='neu').length,4);
 assert.equal(ws.families.get('test-schilder').revision,1);assert.equal(ws.repository.list().length,5);
 const saved=ws.repository.get(ws.repository.importItem(importKey('test-linie','namensschilder','TS-RE-90X60')).id);
 assert.equal(saved.document.name,'Test Linie – Namensschilder · Rechteck 9 × 6 cm');assert.equal(saved.document.config.basePriceCents,1199);
 assert.deepEqual(saved.metadata.profiles.selections.fonts,['Cinzel','Montserrat'],'Schrift-Set wirkt über die Profilbibliothek');
 const again=await planKatalogImport(k,'test-linie',writableOptions(ws));
 assert.deepEqual([again.report.counts.new,again.report.counts.update,again.report.counts.unchanged,again.report.counts.blocked],[0,0,4,2]);
 assert.equal(again.report.families[0].action,'unverändert');
 assert.equal(ws.profiles.list({type:'fonts'}).length,2,'Profile werden wiederverwendet, nicht dupliziert');
});

test('Geänderter Katalog → Familienrevision und neue Produktrevisionen; Preisänderung nur in der Unterkategorie',async t=>{
 const ws=workshop(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(FIXTURE,dir,{recursive:true});
 applyKatalogImport(await planKatalogImport(approvedFixture(openKatalog(dir)),'test-linie',writableOptions(ws)),writableOptions(ws));
 const lineFile=path.join(dir,'linien/test-linie.json'),line=JSON.parse(fs.readFileSync(lineFile,'utf8'));
 line.subcategories[0].priceOverrides.sizes['TS-RE-90X60']=1299;fs.writeFileSync(lineFile,JSON.stringify(line));
 let plan=await planKatalogImport(approvedFixture(openKatalog(dir)),'test-linie',writableOptions(ws));
 assert.deepEqual([plan.report.counts.update,plan.report.counts.unchanged],[1,3]);assert.equal(plan.report.families[0].action,'unverändert');
 let result=applyKatalogImport(plan,writableOptions(ws));
 const updated=result.products.find(p=>p.action==='aktualisiert');assert.equal(updated.revision,2);
 assert.equal(ws.repository.get(updated.id).document.config.basePriceCents,1299);assert.equal(ws.repository.get(updated.id,{revision:1}).document.config.basePriceCents,1199,'alte Revision bleibt');
 const familyFile=path.join(dir,'familien/edelstahl/test-schilder.json'),family=JSON.parse(fs.readFileSync(familyFile,'utf8'));
 family.sizes[2].baseCents=899;fs.writeFileSync(familyFile,JSON.stringify(family));
 plan=await planKatalogImport(approvedFixture(openKatalog(dir)),'test-linie',writableOptions(ws));
 assert.equal(plan.report.families[0].action,'aktualisieren');assert.equal(plan.report.families[0].revision,2);
 assert.deepEqual([plan.report.counts.new,plan.report.counts.update,plan.report.counts.blocked],[2,4,0],'offener Preis geschlossen → 2 neue Produkte, alle anderen tragen die neue Familienrevision');
 result=applyKatalogImport(plan,writableOptions(ws));
 assert.equal(ws.families.get('test-schilder').revision,2);assert.equal(result.products.filter(p=>p.action==='neu').length,2);
});

test('ensureFontSet ohne Bibliothek liefert nur die Lücken; Import-Journal verhindert Doppelanlage',async t=>{
 const k=approvedFixture(openKatalog(FIXTURE));
 const r=await ensureFontSet(k,{id:'tuerschilder',fonts:['Michroma','Montserrat']},{runtimeFonts:workshopResources().fonts});
 assert.deepEqual(r,{profileId:null,items:[],missing:['Michroma'],imported:[],available:['Montserrat']});
 const ws=workshop(t),plan=await planKatalogImport(k,'test-linie',writableOptions(ws));
 applyKatalogImport(plan,writableOptions(ws));
 const twice=applyKatalogImport(plan,writableOptions(ws));
 assert.ok(twice.products.every(p=>p.action==='vorhanden'),'gleicher Plan zweimal: Produkte bleiben, nichts doppelt');
 assert.equal(ws.repository.list().length,5);
});

test('Hauptprodukte: je Hauptprodukt ein Produkt mit eigenem Startdesign, Namen und Backend-Kennungen; `only` begrenzt den Lauf',async t=>{
 const ws=workshop(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(FIXTURE,dir,{recursive:true});
 const lineFile=path.join(dir,'linien/test-linie.json'),line=JSON.parse(fs.readFileSync(lineFile,'utf8'));
 // This test verifies IDs/defaults. Its second source keeps only text so engraving eligibility is independent.
 const secondSvg=path.join(dir,'designs/3-2/test-foto/design.svg');fs.writeFileSync(secondSvg,fs.readFileSync(secondSvg,'utf8').replace(/<g id="foto-1">[\s\S]*?<\/g>/,''));
 line.subcategories[1].mainProducts=[
  {id:'3100000',startDesign:'test-herz',sizesOffered:['TS-RE-90X60'],externalIds:{amazonCustom:'3100000'}},
  {id:'3200000',name:'Hundeschild mit Foto',startDesign:'test-foto'}];
 fs.writeFileSync(lineFile,JSON.stringify(line));
 const plan=await planKatalogImport(approvedFixture(openKatalog(dir)),'test-linie',writableOptions(ws)),hunde=plan.report.subcategories[1];
 assert.deepEqual(hunde.products.map(p=>[p.mainProduct,p.sizeKey,p.action,p.templates.map(x=>x.design)]),[
  ['3100000','TS-RE-90X60','neu',['test-foto','test-herz']],
  ['3200000','TS-RE-90X60','neu',['test-foto','test-herz']],['3200000','TS-RE-60X40','gesperrt',['test-foto','test-herz']]],'alle Designs des Themas bleiben wählbar; Größenliste je Hauptprodukt');
 const a=plan.items.find(i=>i.key===importKey('test-linie','hundeschilder','TS-RE-90X60')+':3100000').document,b=plan.items.find(i=>i.key===importKey('test-linie','hundeschilder','TS-RE-90X60')+':3200000').document;
 assert.equal(a.config.profile.id,'katalog-test-linie-hundeschilder-ts-re-90x60-3100000');assert.notEqual(a.config.profile.id,b.config.profile.id);
 assert.deepEqual([a.config.profile.defaultDesignId,b.config.profile.defaultDesignId],['katalog-test-herz','katalog-test-foto'],'Startdesign je Hauptprodukt');
 assert.equal(a.name,'Test Linie – Hundeschilder · Rechteck 9 × 6 cm – Herz mit Namen');assert.equal(b.name,'Hundeschild mit Foto');
 assert.ok(a.categoryIds.includes('hauptprodukt-3100000')&&a.categoryIds.includes('extern-amazoncustom-3100000'),'Backend-Kennungen als Kategorien');
 assert.ok(!b.categoryIds.some(c=>c.startsWith('extern-')));
 assert.equal(plan.report.counts.products,7);
 const part=await planKatalogImport(approvedFixture(openKatalog(dir)),'test-linie',{...writableOptions(ws),only:{subcategories:['hundeschilder'],sizes:['TS-RE-90X60'],mainProducts:['3200000']}});
 assert.deepEqual(part.report.subcategories.map(s=>s.products.map(p=>p.key)),[[importKey('test-linie','hundeschilder','TS-RE-90X60')+':3200000']],'only begrenzt auf Unterkategorie, Größe und Hauptprodukt');
 applyKatalogImport(plan,writableOptions(ws));
 assert.equal(ws.repository.list().length,1+3+2,'Namensschilder 3 + Hundeschilder 2 (gesperrte bleiben aus)');
 await assert.rejects(async()=>{line.subcategories[1].mainProducts.push({id:'3100000',startDesign:'test-herz'});fs.writeFileSync(lineFile,JSON.stringify(line));approvedFixture(openKatalog(dir)).line('test-linie');},/Hauptprodukt „3100000“ doppelt/);
});

test('Ausgeblendete Master (hidden, Design-Dashboard) bleiben im Katalog, kommen aber in kein Produkt',async t=>{
 const ws=workshop(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(FIXTURE,dir,{recursive:true});
 const file=path.join(dir,'designs/3-2/test-herz/design.json'),doc=JSON.parse(fs.readFileSync(file,'utf8'));doc.hidden=true;fs.writeFileSync(file,JSON.stringify(doc));
 const k=openKatalog(dir);assert.equal(k.designs.masters.find(d=>d.id==='test-herz').hidden,true);
 const plan=await planKatalogImport(k,'test-linie',options(ws));
 assert.ok(plan.report.notes.some(n=>/Ausgeblendet \(hidden\): test-herz/.test(n)));
 assert.ok(plan.items.every(i=>!(i.document.config.profile.designs||[]).some(d=>d.katalog?.designId==='test-herz')),'kein Produkt enthält das ausgeblendete Design');
 doc.hidden='ja';fs.writeFileSync(file,JSON.stringify(doc));
 assert.throws(()=>openKatalog(dir),/hidden ist true oder false/);
});

test('Freigabe: ohne allDesigns kommen nur freigegebene Master ins Produkt; Größen ohne freigegebenes Design sind gesperrt',async t=>{
 const ws=workshop(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(FIXTURE,dir,{recursive:true});
 const blocked=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),allDesigns:false});
 assert.equal(blocked.report.counts.unreleased,blocked.report.designs.masters,'alle Fixture-Master sind offen');
 assert.ok(blocked.report.notes.some(n=>n.startsWith('Nicht freigegeben (Dashboard)')));
 assert.ok(blocked.report.counts.blocked>0&&blocked.report.counts.new===0,'keine Produkte ohne freigegebene Designs');
 const herz=path.join(dir,'designs','3-2','test-herz','design.json'),j=JSON.parse(fs.readFileSync(herz));
 fs.writeFileSync(herz,JSON.stringify({...j,freigabe:{status:'freigegeben',am:'2026-10-23T10:00:00.000Z',von:'test'}},null,1));
 const plan=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),allDesigns:false});
 assert.equal(plan.report.counts.unreleased,blocked.report.counts.unreleased-1);
 const templates=plan.report.subcategories.flatMap(s=>s.products).flatMap(p=>p.templates||[]).map(x=>x.design);
 assert.ok(templates.length>0&&templates.every(d=>d==='test-herz'),'nur das freigegebene Design wird Vorlage: '+[...new Set(templates)].join(','));
});

function contourFixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-kontur-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(FIXTURE,dir,{recursive:true});
 const file=path.join(dir,'familien/edelstahl/test-schilder.json'),f=JSON.parse(fs.readFileSync(file,'utf8'));
 f.groups.push({key:'RT',name:'Kontur (Fixture)',shape:'contour',cornerRadiusMm:0});
 f.mountingRules.push({id:'B02-KONTUR-D4',label:'Feste Bohrungen',layout:'left-right',count:2,diameterMm:4,edgeMm:null,priceCents:249,skuSuffix:'B02'});
 f.sizes.push({key:'TS-RT-90X60',groupKey:'RT',label:'Kontur 9 × 6 cm',widthMm:90,heightMm:60,baseCents:null,mounting:['B02-KONTUR-D4'],outlinePath:'M0 30L45 0L90 30L45 60Z',holesMm:[{x:6,y:30,diameterMm:4},{x:84,y:30,diameterMm:4}]});
 fs.writeFileSync(file,JSON.stringify(f));
 for(const id of ['test-herz','test-foto']){const jsonFile=path.join(dir,'designs/3-2',id,'design.json'),json=JSON.parse(fs.readFileSync(jsonFile));json.form='Rechteck';fs.writeFileSync(jsonFile,JSON.stringify(json));}
 return dir;
}
test('mixed contour import keeps rectangle plans and counts, with no writable contour product',async t=>{
 const ws=workshop(t),before=await planKatalogImport(openKatalog(FIXTURE),'test-linie',options(ws)),dir=contourFixture(t);
 const plan=await planKatalogImport(openKatalog(dir),'test-linie',options(ws)),rows=plan.report.subcategories.flatMap(s=>s.products),contour=rows.filter(p=>p.sizeKey==='TS-RT-90X60');
 assert.equal(contour.length,1);assert.equal(contour[0].action,'gesperrt');assert.equal(contour[0].reason,'Preis offen: Kontur 9 × 6 cm');
 assert.deepEqual(contour[0].templates,[]);assert.equal(contour[0].excluded[0].design,'test-herz');
 assert.deepEqual(contour[0].fit,{passt:0,'prüfen':0,'passt nicht':1},'outside artwork is checked against the actual contour');
 assert.deepEqual(rows.filter(p=>p.sizeKey!=='TS-RT-90X60'),before.report.subcategories.flatMap(s=>s.products),'existing rectangle report remains identical');
 assert.deepEqual(plan.items,before.items,'the only writable products are the unchanged rectangular plans');
 assert.ok(plan.items.every(i=>!i.key.includes('TS-RT-')));
 assert.deepEqual(plan.report.counts,{...before.report.counts,products:before.report.counts.products+1,blocked:before.report.counts.blocked+1,sizes:before.report.counts.sizes+1,pricesOpen:before.report.counts.pricesOpen+1,fit:{...before.report.counts.fit,'passt nicht':before.report.counts.fit['passt nicht']+1}});
 assert.equal(ws.repository.list().length,1,'dry-run has not written products');
});
test('contour import keeps source release, open price and start-design blockers',async t=>{
 const ws=workshop(t),dir=contourFixture(t),lineFile=path.join(dir,'linien/test-linie.json'),line=JSON.parse(fs.readFileSync(lineFile,'utf8'));
 line.subcategories[0].mainProducts=[{id:'retro-test',startDesign:'nicht-vorhanden',sizesOffered:['TS-RT-90X60']}];
 fs.writeFileSync(lineFile,JSON.stringify(line));
 for(const allDesigns of [false,true]){
  const plan=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),allDesigns,only:{subcategories:['namensschilder']}});
  const rows=plan.report.subcategories.flatMap(s=>s.products);
  assert.equal(rows.length,1);assert.equal(rows[0].action,'gesperrt');
  assert.match(rows[0].reason,allDesigns?/Preis offen: Kontur/:/Keine freigegebenen Designs/);
  assert.deepEqual(plan.items,[]);assert.deepEqual(rows[0].templates,[]);
  assert.deepEqual([plan.report.counts.products,plan.report.counts.blocked,plan.report.counts.new],[1,1,0]);
 }
 const familyFile=path.join(dir,'familien/edelstahl/test-schilder.json'),family=JSON.parse(fs.readFileSync(familyFile));
 family.sizes.at(-1).baseCents=1499;fs.writeFileSync(familyFile,JSON.stringify(family));
 const missing=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),only:{subcategories:['namensschilder']}});
 assert.match(missing.report.subcategories[0].products[0].reason,/Startdesign „nicht-vorhanden“/);assert.equal(missing.items.length,0);
 // An explicit fitting source design now traverses the real contour adapter.
 const designDir=path.join(dir,'designs/3-2/test-herz'),designFile=path.join(designDir,'design.json'),design=JSON.parse(fs.readFileSync(designFile));
 design.fields={};delete design.form;design.sizes=['TS-RT-90X60'];fs.writeFileSync(designFile,JSON.stringify(design));
 fs.writeFileSync(path.join(designDir,'design.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="60mm" viewBox="0 0 90 60"><g id="text-1"><text x="45" y="30" text-anchor="middle" font-family="Montserrat" font-size="4">Test</text></g></svg>');
 line.subcategories[0].mainProducts[0].startDesign='test-herz';fs.writeFileSync(lineFile,JSON.stringify(line));
 const accepted=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),only:{subcategories:['namensschilder']}});
 assert.equal(accepted.items.length,1);assert.equal(accepted.report.counts.new,1);
 const g=accepted.items[0].document.config.profile.geometry;assert.equal(g.shape,'contour');assert.equal(g.outlinePath,family.sizes.at(-1).outlinePath);
 const chunks=[],streamed=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),only:{subcategories:['namensschilder']},retainItems:false,reporter:createKatalogReportWriter(chunk=>chunks.push(chunk))});
 assert.deepEqual(JSON.parse(chunks.join('')),accepted.report,'streaming preserves the accepted contour and real fit result');
 assert.equal(streamed.token,accepted.token);assert.deepEqual(streamed.items,[]);assert.equal(streamed.reportOnly,true);
 assert.throws(()=>applyKatalogImport(streamed,options(ws)),/Berichtplan/);
 assert.deepEqual(accepted.items[0].document.config.profile.optionGroups[0].values.find(v=>v.id==='B02').holes,family.sizes.at(-1).holesMm.map(h=>({x:h.x,y:h.y,diameter:h.diameterMm})));
 assert.equal(ws.repository.list().length,1,'all plans remain dry runs');
});

test('Berichtmodus streamt jedes Produkt mit Rückstau; Bericht und Token entsprechen dem schreibbaren Plan',async t=>{
 const ws=workshop(t),k=openKatalog(contourFixture(t));
 const full=await planKatalogImport(k,'test-linie',options(ws)),chunks=[],phases=[];
 let writes=0,active=false;
 const writer=createKatalogReportWriter(async chunk=>{
  assert.equal(active,false,'keine überlappenden Schreibvorgänge');active=true;
  await new Promise(resolve=>setImmediate(resolve));chunks.push(chunk);writes++;active=false;
 });
 const reportOnly=await planKatalogImport(k,'test-linie',{...options(ws),retainItems:false,reporter:writer,onProgress:event=>{phases.push(event.phase);if(event.phase==='product')assert.ok(writes>0,'Bericht wird bereits während der Planung geschrieben');}});
 assert.deepEqual(JSON.parse(chunks.join('')),full.report,'auch gesperrte Produkte, Rechte-/Preisfehler und Reihenfolge bleiben gleich');
 assert.deepEqual(reportOnly.report,full.report);assert.equal(reportOnly.token,full.token);
 const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(full.token,sha(JSON.stringify({line:full.line,items:full.items.map(i=>[i.key,i.action,sha(JSON.stringify(i.document))])})),'Token bleibt kompatibel zum ursprünglichen vollständigen Plan');
 assert.deepEqual(reportOnly.items,[]);assert.equal(reportOnly.reportOnly,true);
 assert.equal(phases.filter(p=>p==='document').length,full.items.length);
 assert.equal(phases.filter(p=>p==='product').length,full.report.counts.products);
 assert.equal(chunks.filter(c=>c.startsWith('\n{')||c.startsWith(',\n{')).length,full.report.counts.products,'ein Produkt pro Chunk');
 assert.throws(()=>applyKatalogImport(reportOnly,options(ws)),/Berichtplan/);
 assert.deepEqual(ws.families.list(),[],'Schutz greift vor der ersten Familienänderung');assert.equal(ws.repository.list().length,1);
});

test('Streamingfehler bricht ab und wird weder als Produktfehler verschluckt noch als vollständiger Bericht beendet',async t=>{
 const ws=workshop(t);let ended=false,products=0;
 await assert.rejects(planKatalogImport(openKatalog(FIXTURE),'test-linie',{...options(ws),retainItems:false,reporter:{product:async()=>{products++;throw Error('Berichtsablage voll');},end:()=>{ended=true;}}}),/Berichtsablage voll/);
 assert.equal(products,1);assert.equal(ended,false);assert.deepEqual(ws.families.list(),[]);assert.equal(ws.repository.list().length,1);
});

test('Streamingbericht ohne ausgewählte Unterkategorie bleibt vollständiges JSON',async t=>{
 const ws=workshop(t),chunks=[];
 const plan=await planKatalogImport(openKatalog(FIXTURE),'test-linie',{...options(ws),only:{subcategories:[]},retainItems:false,reporter:createKatalogReportWriter(chunk=>chunks.push(chunk))});
 assert.deepEqual(JSON.parse(chunks.join('')),plan.report);assert.deepEqual(plan.report.subcategories,[]);assert.equal(plan.report.counts.products,0);
});


test('family-target approval never opens another family; explicit [] overrides legacy approval and shape changes require variants',async t=>{
 const ws=workshop(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-target-import-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.cpSync(FIXTURE,dir,{recursive:true});
 const familyFile=path.join(dir,'familien/edelstahl/test-schilder.json'),family=JSON.parse(fs.readFileSync(familyFile)),other={...structuredClone(family),id:'other'};
 const otherFile=path.join(dir,'familien/edelstahl/other.json');fs.writeFileSync(otherFile,JSON.stringify(other));
 const lineFile=path.join(dir,'linien/test-linie.json'),line=JSON.parse(fs.readFileSync(lineFile));line.subcategories[0].mainProducts=[{id:'only-start',startDesign:'test-herz',sizesOffered:['TS-RE-90X60']}];fs.writeFileSync(lineFile,JSON.stringify(line));
 fs.writeFileSync(path.join(dir,'linien/other.json'),JSON.stringify({...line,id:'other',families:['other']}));
 const designFile=path.join(dir,'designs/3-2/test-herz/design.json'),design=JSON.parse(fs.readFileSync(designFile)),release={status:'freigegeben',am:'2026-10-24T10:00:00Z',von:'test'};
 Object.assign(design,{form:'Rechteck',freigabe:release,ziele:[{familie:family.id,freigabe:release},{familie:other.id,freigabe:null}]});const save=()=>fs.writeFileSync(designFile,JSON.stringify(design));save();
 const plan=id=>planKatalogImport(openKatalog(dir),id,{...options(ws),allDesigns:false,only:{subcategories:['namensschilder']}});
 const a=await plan(line.id),b=await plan(other.id);assert.equal(a.items.length,1);assert.deepEqual(a.items[0].document.config.profile.designs.map(d=>d.katalog.designId),['test-herz']);assert.equal(b.items.length,0);assert.match(b.report.subcategories[0].products[0].reason,/Keine freigegebenen Designs/);
 design.ziele[1].freigabe=release;save();assert.equal((await plan(other.id)).items.length,1,'only the separate target approval opens B');
 other.groups=other.groups.map(g=>({...g,shape:'ellipse'}));fs.writeFileSync(otherFile,JSON.stringify(other));const wrongShape=await plan(other.id);assert.equal(wrongShape.items.length,0);assert.match(wrongShape.report.subcategories[0].products[0].excluded[0].issues.join(' '),/Andere Form.*Variante/);
 design.ziele=[];save();const empty=await plan(line.id);assert.equal(empty.items.length,0);assert.match(empty.report.subcategories[0].products[0].reason,/Keine freigegebenen Designs/);
 assert.equal(ws.repository.list().length,1,'all target checks are read-only plans');
});

test('import CLI rejects --alle-designs with --commit before opening a database or writing reports',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-import-guard-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const db=path.join(dir,'workshop.sqlite'),report=path.join(dir,'report.json'),script=fileURLToPath(new URL('../../scripts/katalog-import.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[script,'--katalog',FIXTURE,'--linie','test-linie','--alle-designs','--commit','--db',db,'--json',report],{encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/nur für Dry-runs/);assert.deepEqual(fs.readdirSync(dir),[],'no database, audit or report was created');
});


test('the public apply API rejects a full diagnostic plan before touching any repository',async t=>{
 const ws=workshop(t),plan=await planKatalogImport(openKatalog(FIXTURE),'test-linie',options(ws));
 assert.equal(plan.diagnosticOnly,true);assert.ok(plan.items.length>0,'full diagnostic documents exist');
 const forbidden=new Proxy({},{get(){assert.fail('diagnostic apply touched a repository');}});
 assert.throws(()=>applyKatalogImport(plan,{repository:forbidden,families:forbidden}),error=>error.code==='katalog_import'&&/Diagnoseplan/.test(error.message));
 assert.deepEqual(ws.families.list(),[]);assert.equal(ws.repository.list().length,1);
});

test('--hauptprodukt excludes absent, empty and other main-product subcategories before profiles or products are planned',async t=>{
 const ws=workshop(t),source=approvedFixture(openKatalog(FIXTURE)),k={...source,lines:new Map(source.lines)},line=structuredClone(k.lines.get('test-linie'));k.lines.set('test-linie',line);
 const base=line.subcategories[0];line.subcategories=[
 {...base,id:'selected',mainProducts:[{id:'wanted',name:'Gewähltes Hauptprodukt',startDesign:'test-herz',sizesOffered:['TS-RE-90X60']}]},
 {...base,id:'absent',mainProducts:undefined},
 {...base,id:'empty',mainProducts:[]},
 {...base,id:'other',mainProducts:[{id:'other',name:'Anderes Hauptprodukt',startDesign:'test-herz',sizesOffered:['TS-RE-90X60']}]}
 ];
 const plan=await planKatalogImport(k,'test-linie',{...writableOptions(ws),only:{mainProducts:['wanted']}});
 assert.deepEqual(plan.report.subcategories.map(s=>s.id),['selected']);assert.equal(plan.report.counts.products,1);
 assert.deepEqual(plan.items.map(item=>item.key),['katalog:test-linie:selected:TS-RE-90X60:wanted']);
 const missing=await planKatalogImport(k,'test-linie',{...writableOptions(ws),only:{mainProducts:['unknown']}});
 assert.equal(missing.report.counts.products,0);assert.deepEqual(missing.report.subcategories,[]);assert.deepEqual(missing.items,[]);
 const intersect=await planKatalogImport(k,'test-linie',{...writableOptions(ws),only:{mainProducts:['wanted'],subcategories:['other']}});
 assert.equal(intersect.report.counts.products,0);assert.deepEqual(intersect.report.subcategories,[]);
});
