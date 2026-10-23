import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createCatalogStructure} from './catalog-structure.mjs';import {readKatalogStructure,patchMainProduct} from './katalog-linien.mjs';import {forgetKatalog} from './design-dashboard.mjs';
const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const temp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-linien-'));fs.cpSync(FIXTURE,dir,{recursive:true});t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});forgetKatalog();});forgetKatalog();return dir;};
const lineJson=dir=>JSON.parse(fs.readFileSync(path.join(dir,'linien','test-linie.json'),'utf8'));

test('Katalogseite liest Linien und Hauptprodukte aus linien/*.json; Änderungen gehen in die Linie zurück (Chris 23.10.2026)',t=>{
 const dir=temp(t);
 const line=lineJson(dir);line.subcategories[0].mainProducts=[{id:'P1',name:'Namensschild Foto',startDesign:'test-foto',sizesOffered:['TS-RE-90X60'],externalIds:{shopifyProductId:'123'},status:'Muster'}];
 fs.writeFileSync(path.join(dir,'linien','test-linie.json'),JSON.stringify(line,null,2)+'\n');forgetKatalog();
 const structure=createCatalogStructure({tenantId:'gravuru',katalogDir:dir});t.after(()=>structure.close());
 const d=structure.read();
 assert.equal(d.schema,'gravuru-workshop-structure/v2');assert.equal(d.saveEffect,'katalog');
 assert.deepEqual(d.lines.map(l=>l.id),['test-linie']);assert.equal(d.lines[0].enabled,true);assert.deepEqual(d.lines[0].subcategories.map(s=>s.id),['namensschilder','hundeschilder']);
 const p=d.mainProducts.find(p=>p.role==='hauptprodukt');
 assert.equal(p.key,'katalog:test-linie/namensschilder/P1');assert.equal(p.id,'gid://shopify/Product/123');assert.equal(p.startDesignId,'test-foto');assert.deepEqual(p.subcategoryIds,['namensschilder']);assert.equal(p.design.reihe,'3-2');assert.equal(p.design.released,false);
 assert.ok(d.sizes['test-schilder'].some(s=>s.key==='TS-RE-90X60'));assert.ok(d.designs['3-2'].some(x=>x.id==='test-herz'));
 assert.match(d.sourceSha256,/^[0-9a-f]{64}$/);assert.equal(d.mainProducts.filter(p=>p.source==='shopify-bestand').length,0);
 // Geplante Anzahl bleibt in SQLite, auch für Kataloglinien.
 const t1=structure.save({action:'target',lineId:'test-linie',subcategoryId:'namensschilder',targetCount:2,expectedRevision:0,sourceSha256:d.sourceSha256});
 assert.equal(t1.lines[0].subcategories[0].targetCount,2);assert.equal(t1.settingsRevision,1);
 // Bearbeiten: Name, Startdesign, Größen, Notiz → Liniendatei + Protokoll; alter Stand → 409.
 assert.throws(()=>structure.save({action:'edit',lineId:'test-linie',productKey:p.key,name:'Neu',expectedRevision:1,sourceSha256:'0'.repeat(64)}),e=>e.status===409);
 const e1=structure.save({action:'edit',lineId:'test-linie',productKey:p.key,name:'Namensschild Herz',startDesign:'test-herz',sizesOffered:['TS-RE-90X60','TS-RE-120X80'],status:'geprüft',expectedRevision:1,sourceSha256:t1.sourceSha256});
 const p1=e1.mainProducts.find(x=>x.katalogId==='P1');assert.equal(p1.title,'Namensschild Herz');assert.equal(p1.startDesignId,'test-herz');assert.deepEqual(p1.sizesOffered,['TS-RE-90X60','TS-RE-120X80']);assert.equal(p1.note,'geprüft');
 const saved=lineJson(dir).subcategories[0].mainProducts[0];assert.equal(saved.startDesign,'test-herz');assert.deepEqual(saved.externalIds,{shopifyProductId:'123'});
 const protocol=fs.readFileSync(path.join(dir,'linien','_aenderungen.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));
 assert.equal(protocol.length,1);assert.equal(protocol[0].action,'edit');assert.deepEqual(protocol[0].changes.startDesign,{from:'test-foto',to:'test-herz'});
 assert.notEqual(e1.sourceSha256,t1.sourceSha256);
 // Ungültiges bleibt draußen: unbekanntes Startdesign, fremde Größe, zwei Unterkategorien.
 for(const bad of [{startDesign:'gibt-es-nicht'},{sizesOffered:['99-99']}])assert.throws(()=>structure.save({action:'edit',lineId:'test-linie',productKey:p.key,...bad,expectedRevision:1,sourceSha256:e1.sourceSha256}),e=>e.status===422);
 assert.throws(()=>structure.save({action:'assign',lineId:'test-linie',productKey:p.key,subcategoryIds:['namensschilder','hundeschilder'],expectedRevision:1,sourceSha256:e1.sourceSha256}),e=>e.status===422);
 // Unterkategorie wechseln = Eintrag verschieben.
 const a1=structure.save({action:'assign',lineId:'test-linie',productKey:p.key,subcategoryIds:['hundeschilder'],expectedRevision:1,sourceSha256:e1.sourceSha256});
 assert.equal(a1.mainProducts.find(x=>x.katalogId==='P1').subcategoryId,'hundeschilder');assert.equal(lineJson(dir).subcategories[0].mainProducts.length,0);assert.equal(lineJson(dir).subcategories[1].mainProducts[0].id,'P1');
 // Neues Hauptprodukt anlegen (Chris: neue Produkte werden neu gelistet) – doppelte Kennung → 409.
 const n1=structure.save({action:'add',lineId:'test-linie',subcategoryId:'namensschilder',katalogId:'P2',name:'Zweites',startDesign:'test-foto',sizesOffered:['TS-RE-90X60'],expectedRevision:1,sourceSha256:a1.sourceSha256});
 const p2=n1.mainProducts.find(x=>x.katalogId==='P2');assert.equal(p2.id,null);assert.equal(p2.adminUrl,null);assert.match(p2.note,/angelegt \d{4}-\d{2}-\d{2} Katalogseite/);
 assert.throws(()=>structure.save({action:'add',lineId:'test-linie',subcategoryId:'namensschilder',katalogId:'P2',startDesign:'test-foto',expectedRevision:1,sourceSha256:n1.sourceSha256}),e=>e.status===409);
 assert.equal(fs.readFileSync(path.join(dir,'linien','_aenderungen.jsonl'),'utf8').trim().split('\n').length,3);
 // Ohne Änderung kein Protokolleintrag.
 const same=patchMainProduct(dir,{action:'edit',lineId:'test-linie',katalogId:'P2',name:'Zweites'});assert.equal(same.changed,false);
});

test('ohne verbundenen Katalog bleibt der eingebaute Stand (v1) unverändert',()=>{const s=createCatalogStructure({tenantId:'gravuru'});try{assert.equal(s.read().schema,'gravuru-workshop-structure/v1');assert.equal(s.read().saveEffect,'organization-only');}finally{s.close();}});
test('readKatalogStructure übernimmt Parallelbestand und Serien aus der eingebauten Datei nur für bekannte Linien',t=>{const dir=temp(t);const d=readKatalogStructure(dir,{statics:{lines:[],mainProducts:[{key:'x',id:'gid://shopify/Product/1',role:'parallelbestand',lineId:'fremd'}],series:[{lineId:'fremd'}],checks:[{id:'c'}]}});assert.equal(d.mainProducts.length,0);assert.equal(d.series.length,0);assert.equal(d.checks.length,1);});
