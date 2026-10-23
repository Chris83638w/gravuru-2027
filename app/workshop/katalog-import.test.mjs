import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorkshop} from './http.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {workshopResources} from './catalog.mjs';
import {openKatalog} from './katalog-source.mjs';
import {planKatalogImport,applyKatalogImport,formatReport,ensureFontSet,importKey} from './katalog-import.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
function workshop(t){
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const ws=createWorkshop({filename:':memory:',seedConfig:makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'b'.repeat(64)),legacy:{purchasing:{},features:{}}});
 t.after(()=>ws.close());return ws;
}
// Fixture-Designs tragen keine Freigabe; die Mechanik-Tests laufen daher mit allDesigns, die Freigabe-Regel hat einen eigenen Test.
const options=ws=>({repository:ws.repository,families:ws.families,fontLibrary:ws.fonts,profiles:ws.profiles,available:workshopResources().fonts,allDesigns:true});

test('Dry-run: Bericht je Linie ohne Schreiben; Commit legt Familie, Schriftprofile und Produkte an; zweiter Lauf ist unverändert',async t=>{
 const ws=workshop(t),k=openKatalog(FIXTURE);
 await assert.rejects(planKatalogImport(k,'fremd',options(ws)),/Linie „fremd“ ist im Katalog nicht vorhanden/);
 const plan=await planKatalogImport(k,'test-linie',{...options(ws),bestand:'test-bestand'}),r=plan.report;
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
 assert.deepEqual(namen.products.map(p=>[p.sizeKey,p.action,p.templates.map(x=>x.design+':'+x.fit)]),[['TS-RE-90X60','neu',['test-herz:passt']],['TS-RE-120X80','neu',['test-herz:passt']],['TS-RE-60X40','gesperrt',['test-herz:prüfen']],['TS-QU-80X80','neu',[]]]);
 assert.equal(namen.products[2].reason,'Preis offen: 6 × 4 cm');
 assert.deepEqual(hunde.products.map(p=>[p.sizeKey,p.action,p.templates.map(x=>x.design+':'+x.fit)]),[['TS-RE-90X60','neu',['test-foto:passt','test-herz:passt']],['TS-RE-60X40','gesperrt',['test-foto:passt','test-herz:prüfen']]],'Bericht in Katalogreihenfolge');
 assert.deepEqual(r.counts,{products:6,new:4,update:0,unchanged:0,blocked:2,templates:4,sizes:4,pricesOpen:1,designsWithoutSeries:1,unreleased:0,fit:{passt:5,'prüfen':2,'passt nicht':0}});
 assert.equal(ws.repository.list().length,1,'Dry-run legt keine Produkte an');assert.deepEqual(ws.families.list(),[]);
 const text=formatReport(r);
 assert.match(text,/Summe: 6 Produkte \(neu 4, aktualisieren 0, unverändert 0, gesperrt 2\), 4 Vorlagen/);assert.match(text,/gesperrt ×2: Preis offen: 6 × 4 cm/);
 const bestseller=plan.items.find(i=>i.key===importKey('test-linie','hundeschilder','TS-RE-90X60')).document;
 assert.deepEqual(bestseller.config.profile.designs.map(d=>d.id),['katalog-test-herz','katalog-test-foto'],'Bestseller zuerst');
 assert.equal(bestseller.config.photo.enabled,true);assert.equal(bestseller.config.profile.themeId,'hundeschilder');
 // Commit
 const result=applyKatalogImport(plan,options(ws));
 assert.deepEqual(result.families,[{id:'test-schilder',action:'neu',revision:1}]);
 assert.equal(result.products.filter(p=>p.action==='neu').length,4);
 assert.equal(ws.families.get('test-schilder').revision,1);assert.equal(ws.repository.list().length,5);
 const saved=ws.repository.get(ws.repository.importItem(importKey('test-linie','namensschilder','TS-RE-90X60')).id);
 assert.equal(saved.document.name,'Test Linie – Namensschilder · Rechteck 9 × 6 cm');assert.equal(saved.document.config.basePriceCents,1199);
 assert.deepEqual(saved.metadata.profiles.selections.fonts,['Cinzel','Montserrat'],'Schrift-Set wirkt über die Profilbibliothek');
 const again=await planKatalogImport(k,'test-linie',options(ws));
 assert.deepEqual([again.report.counts.new,again.report.counts.update,again.report.counts.unchanged,again.report.counts.blocked],[0,0,4,2]);
 assert.equal(again.report.families[0].action,'unverändert');
 assert.equal(ws.profiles.list({type:'fonts'}).length,2,'Profile werden wiederverwendet, nicht dupliziert');
});

test('Geänderter Katalog → Familienrevision und neue Produktrevisionen; Preisänderung nur in der Unterkategorie',async t=>{
 const ws=workshop(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(FIXTURE,dir,{recursive:true});
 applyKatalogImport(await planKatalogImport(openKatalog(dir),'test-linie',options(ws)),options(ws));
 const lineFile=path.join(dir,'linien/test-linie.json'),line=JSON.parse(fs.readFileSync(lineFile,'utf8'));
 line.subcategories[0].priceOverrides.sizes['TS-RE-90X60']=1299;fs.writeFileSync(lineFile,JSON.stringify(line));
 let plan=await planKatalogImport(openKatalog(dir),'test-linie',options(ws));
 assert.deepEqual([plan.report.counts.update,plan.report.counts.unchanged],[1,3]);assert.equal(plan.report.families[0].action,'unverändert');
 let result=applyKatalogImport(plan,options(ws));
 const updated=result.products.find(p=>p.action==='aktualisiert');assert.equal(updated.revision,2);
 assert.equal(ws.repository.get(updated.id).document.config.basePriceCents,1299);assert.equal(ws.repository.get(updated.id,{revision:1}).document.config.basePriceCents,1199,'alte Revision bleibt');
 const familyFile=path.join(dir,'familien/edelstahl/test-schilder.json'),family=JSON.parse(fs.readFileSync(familyFile,'utf8'));
 family.sizes[2].baseCents=899;fs.writeFileSync(familyFile,JSON.stringify(family));
 plan=await planKatalogImport(openKatalog(dir),'test-linie',options(ws));
 assert.equal(plan.report.families[0].action,'aktualisieren');assert.equal(plan.report.families[0].revision,2);
 assert.deepEqual([plan.report.counts.new,plan.report.counts.update,plan.report.counts.blocked],[2,4,0],'offener Preis geschlossen → 2 neue Produkte, alle anderen tragen die neue Familienrevision');
 result=applyKatalogImport(plan,options(ws));
 assert.equal(ws.families.get('test-schilder').revision,2);assert.equal(result.products.filter(p=>p.action==='neu').length,2);
});

test('ensureFontSet ohne Bibliothek liefert nur die Lücken; Import-Journal verhindert Doppelanlage',async t=>{
 const k=openKatalog(FIXTURE);
 const r=await ensureFontSet(k,{id:'tuerschilder',fonts:['Michroma','Montserrat']},{runtimeFonts:workshopResources().fonts});
 assert.deepEqual(r,{profileId:null,items:[],missing:['Michroma'],imported:[],available:['Montserrat']});
 const ws=workshop(t),plan=await planKatalogImport(k,'test-linie',options(ws));
 applyKatalogImport(plan,options(ws));
 const twice=applyKatalogImport(plan,options(ws));
 assert.ok(twice.products.every(p=>p.action==='vorhanden'),'gleicher Plan zweimal: Produkte bleiben, nichts doppelt');
 assert.equal(ws.repository.list().length,5);
});

test('Hauptprodukte: je Hauptprodukt ein Produkt mit eigenem Startdesign, Namen und Backend-Kennungen; `only` begrenzt den Lauf',async t=>{
 const ws=workshop(t),dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-katalog-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.cpSync(FIXTURE,dir,{recursive:true});
 const lineFile=path.join(dir,'linien/test-linie.json'),line=JSON.parse(fs.readFileSync(lineFile,'utf8'));
 line.subcategories[1].mainProducts=[
  {id:'3100000',startDesign:'test-herz',sizesOffered:['TS-RE-90X60'],externalIds:{amazonCustom:'3100000'}},
  {id:'3200000',name:'Hundeschild mit Foto',startDesign:'test-foto'}];
 fs.writeFileSync(lineFile,JSON.stringify(line));
 const plan=await planKatalogImport(openKatalog(dir),'test-linie',options(ws)),hunde=plan.report.subcategories[1];
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
 const part=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),only:{subcategories:['hundeschilder'],sizes:['TS-RE-90X60'],mainProducts:['3200000']}});
 assert.deepEqual(part.report.subcategories.map(s=>s.products.map(p=>p.key)),[[importKey('test-linie','hundeschilder','TS-RE-90X60')+':3200000']],'only begrenzt auf Unterkategorie, Größe und Hauptprodukt');
 applyKatalogImport(plan,options(ws));
 assert.equal(ws.repository.list().length,1+3+2,'Namensschilder 3 + Hundeschilder 2 (gesperrte bleiben aus)');
 await assert.rejects(async()=>{line.subcategories[1].mainProducts.push({id:'3100000',startDesign:'test-herz'});fs.writeFileSync(lineFile,JSON.stringify(line));openKatalog(dir).line('test-linie');},/Hauptprodukt „3100000“ doppelt/);
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
 fs.writeFileSync(file,JSON.stringify(f));return dir;
}
test('mixed contour import keeps rectangle plans and counts, with no writable contour product',async t=>{
 const ws=workshop(t),before=await planKatalogImport(openKatalog(FIXTURE),'test-linie',options(ws)),dir=contourFixture(t);
 const plan=await planKatalogImport(openKatalog(dir),'test-linie',options(ws)),rows=plan.report.subcategories.flatMap(s=>s.products),contour=rows.filter(p=>p.sizeKey==='TS-RT-90X60');
 assert.equal(contour.length,1);assert.equal(contour[0].action,'gesperrt');assert.equal(contour[0].reason,'Kontur offen');
 assert.deepEqual(contour[0].templates,[]);assert.deepEqual(contour[0].excluded,[]);
 assert.deepEqual(contour[0].fit,{passt:0,'prüfen':0,'passt nicht':0},'blocked contour is never fitted to a substitute rectangle');
 assert.deepEqual(rows.filter(p=>p.sizeKey!=='TS-RT-90X60'),before.report.subcategories.flatMap(s=>s.products),'existing rectangle report remains identical');
 assert.deepEqual(plan.items,before.items,'the only writable products are the unchanged rectangular plans');
 assert.ok(plan.items.every(i=>!i.key.includes('TS-RT-')));
 assert.deepEqual(plan.report.counts,{...before.report.counts,products:before.report.counts.products+1,blocked:before.report.counts.blocked+1,sizes:before.report.counts.sizes+1,pricesOpen:before.report.counts.pricesOpen+1});
 assert.equal(ws.repository.list().length,1,'dry-run has not written products');
});
test('contour import reports Kontur offen ahead of open price, missing release and missing start design',async t=>{
 const ws=workshop(t),dir=contourFixture(t),lineFile=path.join(dir,'linien/test-linie.json'),line=JSON.parse(fs.readFileSync(lineFile,'utf8'));
 line.subcategories[0].mainProducts=[{id:'retro-test',startDesign:'nicht-vorhanden',sizesOffered:['TS-RT-90X60']}];
 fs.writeFileSync(lineFile,JSON.stringify(line));
 for(const allDesigns of [false,true]){
  const plan=await planKatalogImport(openKatalog(dir),'test-linie',{...options(ws),allDesigns,only:{subcategories:['namensschilder']}});
  const rows=plan.report.subcategories.flatMap(s=>s.products);
  assert.equal(rows.length,1);assert.equal(rows[0].reason,'Kontur offen');assert.equal(rows[0].action,'gesperrt');
  assert.deepEqual(plan.items,[]);assert.deepEqual(rows[0].templates,[]);
  assert.deepEqual([plan.report.counts.products,plan.report.counts.blocked,plan.report.counts.new],[1,1,0]);
 }
});
