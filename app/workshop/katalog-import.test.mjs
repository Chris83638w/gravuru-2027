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
const options=ws=>({repository:ws.repository,families:ws.families,fontLibrary:ws.fonts,profiles:ws.profiles,available:workshopResources().fonts});

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
 assert.deepEqual(r.counts,{products:6,new:4,update:0,unchanged:0,blocked:2,templates:4,sizes:4,pricesOpen:1,designsWithoutSeries:1,fit:{passt:5,'prüfen':2,'passt nicht':0}});
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
