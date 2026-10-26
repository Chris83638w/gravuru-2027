import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mainProductOptions,createDesignMainProduct,deleteDesignMainProduct} from './design-main-products.mjs';
import {patchMainProduct,readKatalogStructure} from './katalog-linien.mjs';
import {forgetKatalog} from './design-dashboard.mjs';
import {withKatalogWriteLock} from './katalog-transaction.mjs';
import {openKatalog} from './katalog-source.mjs';
const fixture=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const temp=t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-mainproducts-'));fs.cpSync(fixture,root,{recursive:true});
 t.after(()=>{forgetKatalog();fs.rmSync(root,{recursive:true,force:true});});
 const file=path.join(root,'designs','3-2','test-herz','design.json'),d=json(file);
 d.ziele=[{familie:'test-schilder',freigabe:null}];write(file,d);forgetKatalog();return root;
};
const designFile=root=>path.join(root,'designs','3-2','test-herz','design.json');
const lineFile=root=>path.join(root,'linien','test-linie.json');
const logFile=root=>path.join(root,'linien','_aenderungen.jsonl');
const opts=(root,id='test-herz')=>mainProductOptions(root,{reihe:'3-2',id});
function request(root,id='test-herz'){
 const o=opts(root,id),line=o.lines[0],family=line.families[0],group=family.groups[0];
 return {source:{reihe:o.source.reihe,id:o.source.id,checksum:o.source.checksum},lineId:line.id,lineChecksum:line.lineChecksum,subcategoryId:'namensschilder',familyId:family.id,groupKey:group.key,sizeKeys:group.sizes.map(s=>s.key),name:'Namensschild Herz'};
}
const errorStatus=status=>error=>error.status===status;
test('Optionen zeigen bestätigte Ziele ohne Freigabe, passende Themen und nur kompatible Formgruppen',t=>{
 const root=temp(t),d=json(designFile(root));d.themes=['namensschilder'];write(designFile(root),d);
 const o=opts(root);assert.match(o.source.checksum,/^[0-9a-f]{64}$/);assert.equal(o.lines.length,1);
 const line=o.lines[0];assert.match(line.lineChecksum,/^[0-9a-f]{64}$/);
 assert.deepEqual(line.subcategories.map(s=>[s.id,s.eligible]),[['namensschilder',true],['hundeschilder',false]]);
 assert.match(line.subcategories[1].reason,/Thema fehlt/);
 const f=line.families[0];assert.equal(f.id,'test-schilder');assert.match(f.previewUrl,/target-preview.*familie=test-schilder/);
 assert.deepEqual(f.groups.map(g=>g.key),['RE']);assert.equal(f.groups[0].proposedId,'test-herz-RE');
 assert.equal(f.groups[0].sizes.length,3);assert.equal(f.groups[0].suggestedName,'');assert.equal(f.groups[0].nameBasis,null);
 assert.equal(fs.existsSync(logFile(root)),false);assert.deepEqual(json(designFile(root)).ziele,[{familie:'test-schilder',freigabe:null}]);
 d.ziele=[];write(designFile(root),d);assert.deepEqual(opts(root).lines,[]);
});
test('Anlegen schreibt validierte Linie und Protokoll, setzt keine Freigabe und keine externen IDs',t=>{
 const root=temp(t),before=fs.readFileSync(designFile(root),'utf8'),input=request(root),result=createDesignMainProduct(root,input,{actor:'Chris',now:new Date('2026-10-26T10:00:00Z')});
 assert.equal(result.changed,true);assert.deepEqual(result.files,['linien/test-linie.json','linien/_aenderungen.jsonl']);
 assert.notEqual(result.lineChecksum,input.lineChecksum);assert.equal(result.productId,'test-herz-RE');
 const entry=json(lineFile(root)).subcategories[0].mainProducts[0];
 assert.deepEqual(entry,{id:'test-herz-RE',name:'Namensschild Herz',startDesign:'test-herz',sizesOffered:['TS-RE-90X60','TS-RE-120X80','TS-RE-60X40'],externalIds:{},status:'angelegt im Dashboard 2026-10-26 von Chris'});
 assert.equal(fs.readFileSync(designFile(root),'utf8'),before);
 const audit=json(logFile(root));assert.equal(audit.actor,'Chris');assert.equal(audit.action,'dashboard-add');assert.equal(audit.changes.source.checksum,input.source.checksum);
 assert.equal(openKatalog(root).lines.get('test-linie').subcategories[0].mainProducts.length,1);
 const o=opts(root);assert.equal(o.existing.length,1);assert.equal(o.existing[0].canDelete,true);assert.equal(o.lines[0].families[0].groups[0].eligible,false);
 assert.equal(o.lines[0].families[0].groups[0].existing.id,'test-herz-RE');
});
test('Doppelte Kennung wird über die ganze Linie geprüft, auch in anderer Unterkategorie',t=>{
 const root=temp(t),line=json(lineFile(root));line.subcategories[1].mainProducts=[{id:'test-herz-RE',startDesign:'test-foto'}];write(lineFile(root),line);
 const input=request(root);assert.throws(()=>createDesignMainProduct(root,input),errorStatus(409));
 assert.equal(opts(root).lines[0].families[0].groups[0].existing.subcategoryId,'hundeschilder');
 assert.equal(fs.existsSync(logFile(root)),false);
});
test('Themen, Ziele und kompatible Größen werden frisch geprüft; fremde Form oder mehrere Gruppen bleiben gesperrt',t=>{
 const root=temp(t),initial=request(root);
 assert.throws(()=>createDesignMainProduct(root,{...initial,sizeKeys:['TS-QU-80X80']}),errorStatus(422));
 assert.throws(()=>createDesignMainProduct(root,{...initial,sizeKeys:['TS-RE-90X60','TS-QU-80X80']}),errorStatus(422));
 assert.throws(()=>createDesignMainProduct(root,{...initial,sizeKeys:['TS-RE-90X60','TS-RE-90X60']}),errorStatus(422));
 assert.throws(()=>createDesignMainProduct(root,{...initial,groupKey:'QU'}),errorStatus(422));
 let d=json(designFile(root));d.themes=['hundeschilder'];write(designFile(root),d);
 assert.throws(()=>createDesignMainProduct(root,request(root)),error=>error.status===422&&/Thema fehlt/.test(error.message));
 d.ziele=[];write(designFile(root),d);
 const o=opts(root);assert.throws(()=>createDesignMainProduct(root,{...initial,source:{...initial.source,checksum:o.source.checksum}}),errorStatus(422));
 assert.equal(fs.existsSync(logFile(root)),false);
});
test('Änderung von Design-JSON, SVG oder Linie seit dem Öffnen liefert 409 ohne Änderung',t=>{
 for(const kind of ['json','svg','line']){
  const root=temp(t),input=request(root);
  if(kind==='json'){const d=json(designFile(root));d.name='Inzwischen geändert';write(designFile(root),d);}
  if(kind==='svg')fs.appendFileSync(path.join(root,'designs','3-2','test-herz','design.svg'),'\n<!-- neuer Stand -->\n');
  if(kind==='line'){const l=json(lineFile(root));l.note='Inzwischen geändert';write(lineFile(root),l);}
  const before=fs.readFileSync(lineFile(root),'utf8');
  assert.throws(()=>createDesignMainProduct(root,input),errorStatus(409));
  assert.equal(fs.readFileSync(lineFile(root),'utf8'),before);assert.equal(fs.existsSync(logFile(root)),false);
 }
});
test('Familienänderung nach Optionen liefert 409 auch bei weiterhin kompatiblen Größenschlüsseln',t=>{
 const root=temp(t),input=request(root),file=path.join(root,'familien','edelstahl','test-schilder.json'),f=json(file);
 f.sizes.find(s=>s.key==='TS-RE-90X60').widthMm=90.01;write(file,f);
 assert.throws(()=>createDesignMainProduct(root,input),errorStatus(409));assert.equal(fs.existsSync(logFile(root)),false);
});
test('Kennung ersetzt nur Komma durch Unterstrich; zu lang wird weder gekürzt noch erfunden',t=>{
 for(const id of ['TRE-V2A-8x3,5-D29','D'.repeat(79)]){
  const root=temp(t),old=path.join(root,'designs','3-2','test-herz'),folder=path.join(root,'designs','3-2',id);
  fs.renameSync(old,folder);const file=path.join(folder,'design.json'),d=json(file);d.id=id;write(file,d);
  const input=request(root,id),group=opts(root,id).lines[0].families[0].groups[0];
  assert.equal(group.proposedId,id.replaceAll(',','_')+'-RE');
  if(id.length>76){assert.equal(group.eligible,false);assert.throws(()=>createDesignMainProduct(root,input),errorStatus(409));assert.equal(fs.existsSync(logFile(root)),false);}
  else assert.equal(createDesignMainProduct(root,input).productId,'TRE-V2A-8x3_5-D29-RE');
 }
});
test('Vorschlagsname verweist auf ein vorhandenes Hauptprodukt derselben Form',t=>{
 const root=temp(t),line=json(lineFile(root));line.subcategories[0].mainProducts=[{id:'P1',name:'Schild Foto rund 12x8 cm',startDesign:'test-foto',sizesOffered:['TS-RE-120X80'],externalIds:{}}];write(lineFile(root),line);
 const group=opts(root).lines[0].families[0].groups[0];
 assert.equal(group.suggestedName,'Schild Herz mit Namen 6 × 4 cm');assert.equal(group.nameBasis.productId,'P1');assert.equal(group.nameBasis.name,'Schild Foto rund 12x8 cm');
});
test('Löschen nur unverbunden, mit aktuellem Linienstand und atomarem Protokoll',t=>{
 const root=temp(t);createDesignMainProduct(root,request(root));
 let o=opts(root),entry=o.existing[0],input={lineId:entry.lineId,lineChecksum:entry.lineChecksum,subcategoryId:entry.subcategoryId,productId:entry.id};
 const line=json(lineFile(root));line.subcategories[0].mainProducts[0].externalIds.shopifyProductId='123';write(lineFile(root),line);
 assert.throws(()=>deleteDesignMainProduct(root,input),errorStatus(409));
 o=opts(root);assert.equal(o.existing[0].canDelete,false);assert.match(o.existing[0].deleteReason,/Shopify/);
 input.lineChecksum=o.existing[0].lineChecksum;assert.throws(()=>deleteDesignMainProduct(root,input),errorStatus(409));
 delete line.subcategories[0].mainProducts[0].externalIds.shopifyProductId;write(lineFile(root),line);
 input.lineChecksum=opts(root).existing[0].lineChecksum;
 const result=deleteDesignMainProduct(root,input,{actor:'Prüfer',now:new Date('2026-10-26T11:00:00Z')});assert.equal(result.changed,true);
 assert.equal(json(lineFile(root)).subcategories[0].mainProducts.length,0);
 const audit=fs.readFileSync(logFile(root),'utf8').trim().split('\n').map(JSON.parse);assert.equal(audit.length,2);assert.equal(audit[1].action,'dashboard-delete');assert.equal(audit[1].actor,'Prüfer');
 assert.throws(()=>deleteDesignMainProduct(root,{...input,lineChecksum:result.lineChecksum}),errorStatus(404));
});
test('Beide Schreibwege verwenden dieselbe Katalogsperre und akzeptieren keinen verlorenen Zwischenstand',t=>{
 const root=temp(t),input=request(root),before=readKatalogStructure(root);
 withKatalogWriteLock(root,()=>{
  assert.throws(()=>createDesignMainProduct(root,input),errorStatus(409));
  assert.throws(()=>patchMainProduct(root,{action:'add',lineId:'test-linie',subcategoryId:'namensschilder',katalogId:'P1',startDesign:'test-herz'}),errorStatus(409));
 });
 createDesignMainProduct(root,input);
 assert.throws(()=>patchMainProduct(root,{action:'edit',lineId:'test-linie',katalogId:'test-herz-RE',name:'Alt',sourceSha256:before.sourceSha256}),errorStatus(409));
 const fresh=readKatalogStructure(root);patchMainProduct(root,{action:'edit',lineId:'test-linie',katalogId:'test-herz-RE',name:'Aktuell',sourceSha256:fresh.sourceSha256});
 assert.equal(json(lineFile(root)).subcategories[0].mainProducts[0].name,'Aktuell');
});
test('Fehler beim Protokollersatz rollt neues Hauptprodukt und Löschung vollständig zurück',t=>{
 const root=temp(t),input=request(root),before=fs.readFileSync(lineFile(root),'utf8');
 const fault={beforeReplace(relative){if(relative.endsWith('_aenderungen.jsonl'))throw Error('gezielter Protokollfehler');}};
 assert.throws(()=>createDesignMainProduct(root,input,fault),/gezielter Protokollfehler/);
 assert.equal(fs.readFileSync(lineFile(root),'utf8'),before);assert.equal(fs.existsSync(logFile(root)),false);
 createDesignMainProduct(root,input);
 const entry=opts(root).existing[0],saved=fs.readFileSync(lineFile(root),'utf8'),log=fs.readFileSync(logFile(root),'utf8');
 assert.throws(()=>deleteDesignMainProduct(root,{lineId:entry.lineId,lineChecksum:entry.lineChecksum,subcategoryId:entry.subcategoryId,productId:entry.id},fault),/gezielter Protokollfehler/);
 assert.equal(fs.readFileSync(lineFile(root),'utf8'),saved);assert.equal(fs.readFileSync(logFile(root),'utf8'),log);
});
test('Unbekannte Eingabefelder, Freigaben, Pfadtraversal und fehlende Prüfsummen werden abgelehnt',t=>{
 const root=temp(t),input=request(root);
 for(const bad of [{...input,externalIds:{shopifyProductId:'123'}},{...input,freigabe:{status:'freigegeben'}},{...input,source:{...input.source,checksum:undefined}},{...input,lineChecksum:undefined},{...input,name:'Name\nzweite Zeile'},{...input,source:{...input.source,reihe:'../3-2'}}])assert.throws(()=>createDesignMainProduct(root,bad),errorStatus(422));
 assert.throws(()=>mainProductOptions(root,{reihe:'bestand',id:'test-herz'}),errorStatus(422));
 assert.equal(fs.existsSync(logFile(root)),false);
});

test('Fremde Motivnamen werden auch bei erkennbarer Maßangabe nicht als Namensmuster übernommen',t=>{
 const root=temp(t),line=json(lineFile(root));line.subcategories[0].mainProducts=[{id:'P1',name:'Schild Golden Retriever 12x8 cm',startDesign:'test-foto',sizesOffered:['TS-RE-120X80'],externalIds:{}}];write(lineFile(root),line);
 const group=opts(root).lines[0].families[0].groups[0];assert.equal(group.suggestedName,'');assert.equal(group.nameBasis,null);
});

test('Auch zwei geometrisch kompatible Formgruppen dürfen nicht in einem Hauptprodukt vermischt werden',t=>{
 const root=temp(t),familyFile=path.join(root,'familien','edelstahl','test-schilder.json'),family=json(familyFile);
 family.groups.push({key:'RE2',name:'Zweite Rechteckgruppe',shape:'rect',cornerRadiusMm:0});
 family.sizes.push({...family.sizes[0],key:'TS-RE2-90X60',groupKey:'RE2'});write(familyFile,family);
 const d=json(designFile(root));d.form='rechteck';write(designFile(root),d);
 const o=opts(root);assert.deepEqual(o.lines[0].families[0].groups.map(g=>g.key),['RE','RE2']);
 const input=request(root);assert.throws(()=>createDesignMainProduct(root,{...input,sizeKeys:['TS-RE-90X60','TS-RE2-90X60']}),errorStatus(422));
 assert.equal(fs.existsSync(logFile(root)),false);
 const ok=createDesignMainProduct(root,{...input,groupKey:'RE2',sizeKeys:['TS-RE2-90X60']});assert.equal(ok.productId,'test-herz-RE2');
});
test('Vorhandene Linienvalidierung begrenzt die Hauptprodukte; ein voller Bereich bleibt unverändert',t=>{
 const root=temp(t),line=json(lineFile(root));line.subcategories[0].mainProducts=Array.from({length:300},(_,i)=>({id:'P'+i,startDesign:'test-foto'}));write(lineFile(root),line);
 const input=request(root),before=fs.readFileSync(lineFile(root),'utf8');
 assert.throws(()=>createDesignMainProduct(root,input),error=>error.status===422&&/höchstens 300/.test(error.message));
 assert.equal(fs.readFileSync(lineFile(root),'utf8'),before);assert.equal(fs.existsSync(logFile(root)),false);
});

test('R3 orders real compatible sizes from small to large without changing their keys',t=>{
 const root=temp(t),group=opts(root).lines[0].families[0].groups[0];
 assert.deepEqual(group.sizes.map(s=>s.key),['TS-RE-60X40','TS-RE-90X60','TS-RE-120X80']);
 assert.ok(group.sizes.every(s=>s.ratioLabel==='3:2'));assert.equal(new Set(group.sizes.map(s=>s.seriesKey)).size,1);
});
