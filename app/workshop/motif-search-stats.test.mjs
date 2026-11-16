import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createMotifSearchStats,normalizedMotifQuery} from './motif-search-stats.mjs';
import {DatabaseSync} from 'node:sqlite';
test('persistent reports separate tenant, period, product group and preview from real searches',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'motif-search-stats-')),filename=path.join(dir,'stats.sqlite');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let time=Date.UTC(2026,10,5),a=createMotifSearchStats({filename,tenantId:'gravuru',clock:()=>time});
 a.record({query:' Kreuz ',resultCount:18,group:'Gedenktafeln'});a.record({query:'KREUZ',resultCount:18,group:'Gedenktafeln'});a.record({query:'Dinosaurier',resultCount:0,group:'Gedenktafeln'});a.record({query:'Hund',resultCount:20,group:'Gedenktafeln',source:'preview'});a.record({query:'Sonne',resultCount:2,group:'Hausnummern'});
 let report=a.report();assert.equal(report.rows[0].term,'kreuz');assert.equal(report.rows[0].searches,2);assert.equal(report.totals.searches,4);assert.equal(report.missing[0].term,'dinosaurier');assert.equal(a.report({group:'Gedenktafeln'}).totals.searches,3);assert.equal(a.report({source:'preview'}).totals.searches,1);a.close();
 a=createMotifSearchStats({filename,tenantId:'gravuru',clock:()=>time});assert.equal(a.report().totals.searches,4);time+=40*86400000;assert.equal(a.report().totals.searches,0);assert.equal(a.report({days:90}).totals.searches,4);a.close();
 const b=createMotifSearchStats({filename,tenantId:'anderer-shop'});assert.equal(b.report().totals.searches,0);b.close();
});
test('historical aggregation migrates once without losing any tenant, source or counts',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'search-kind-migration-')),filename=path.join(dir,'stats.sqlite');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const legacy=new DatabaseSync(filename);legacy.exec(`CREATE TABLE motif_search_daily(tenant TEXT NOT NULL,day TEXT NOT NULL,product_group TEXT NOT NULL,term TEXT NOT NULL,source TEXT NOT NULL,searches INTEGER NOT NULL,without_results INTEGER NOT NULL,PRIMARY KEY(tenant,day,product_group,term,source)); INSERT INTO motif_search_daily VALUES('gravuru','2026-11-11','Schilder','haus','shop',8,2),('gravuru','2026-11-11','Schilder','haus','preview',3,1),('zweiter','2026-11-11','Andere','haus','shop',6,0);`);legacy.close();
 const clock=()=>Date.UTC(2026,10,11);let s=createMotifSearchStats({filename,tenantId:'gravuru',clock});
 assert.equal(s.report().totals.searches,8);assert.equal(s.report({source:'preview'}).totals.searches,3);assert.equal(s.report({searchKind:'design'}).totals.searches,0);
 s.record({query:'Haus',resultCount:0,group:'Schilder',searchKind:'design'});s.record({query:'Haus',resultCount:4,group:'Schilder'});
 assert.deepEqual({...s.report({searchKind:'design'}).totals},{searches:1,withoutResults:1});assert.equal(s.report().totals.searches,9);s.close();
 s=createMotifSearchStats({filename,tenantId:'gravuru',clock});assert.equal(s.report().totals.searches,9);assert.equal(s.report({searchKind:'design'}).totals.searches,1);s.close();
 const other=createMotifSearchStats({filename,tenantId:'zweiter',clock});assert.equal(other.report().totals.searches,6);assert.equal(other.report({searchKind:'design'}).totals.searches,0);other.close();
});
test('unknown legacy shape stops atomically instead of dropping data',()=>{
 // A second on-disk reader can verify the unchanged original after a failed open.
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'search-kind-rollback-')),filename=path.join(dir,'stats.sqlite');
 try{const before=new DatabaseSync(filename);before.exec("CREATE TABLE motif_search_daily(tenant TEXT,custom TEXT); INSERT INTO motif_search_daily VALUES('gravuru','keep')");before.close();assert.throws(()=>createMotifSearchStats({filename,tenantId:'gravuru'}),/Unbekanntes Schema/);const after=new DatabaseSync(filename);assert.equal(after.prepare('SELECT custom FROM motif_search_daily').get().custom,'keep');assert.equal(after.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='motif_search_daily_with_kind'").get().n,0);after.close();}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('design identifiers are counted without relaxing contact-data filters or conflating kinds',()=>{
 const s=createMotifSearchStats({filename:':memory:',tenantId:'gravuru'});
 for(const query of ['D23','TRE-V2A-5x2-D23','D12345','TRE-V2A-12000x20-D23','23'])assert.equal(s.record({query,resultCount:0,group:'Türschilder',searchKind:'design'}),true);
 for(const query of ['name@example.com','https://example.com','017612345678','D017612345678','<img>','Name 12345678'])assert.equal(s.record({query,resultCount:0,group:'Türschilder',searchKind:'design'}),false);
 assert.equal(s.report({searchKind:'design'}).totals.searches,5);assert.equal(s.report().totals.searches,0);
 assert.throws(()=>s.record({query:'Haus',resultCount:0,group:'Schilder',searchKind:'preview'}));assert.throws(()=>s.report({searchKind:'all'}));s.close();
});
test('known legacy columns with an unexpected primary key stop without changing schema or rows',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'search-kind-wrong-key-')),filename=path.join(dir,'stats.sqlite');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const before=new DatabaseSync(filename);
 before.exec("CREATE TABLE motif_search_daily(tenant TEXT NOT NULL,day TEXT NOT NULL,product_group TEXT NOT NULL,term TEXT NOT NULL,source TEXT NOT NULL,searches INTEGER NOT NULL,without_results INTEGER NOT NULL,PRIMARY KEY(tenant,day,term,source)); INSERT INTO motif_search_daily VALUES('gravuru','2026-11-11','Schilder','haus','shop',8,2),('zweiter','2026-11-11','Andere','haus','preview',6,1)");
 const schema=before.prepare("SELECT sql FROM sqlite_master WHERE name='motif_search_daily'").get().sql,rows=before.prepare('SELECT * FROM motif_search_daily ORDER BY tenant').all();before.close();
 let opened;try{assert.throws(()=>{opened=createMotifSearchStats({filename,tenantId:'gravuru'});},/Unbekannter Schlüssel/);}finally{opened?.close();}
 const after=new DatabaseSync(filename);try{
  assert.equal(after.prepare("SELECT sql FROM sqlite_master WHERE name='motif_search_daily'").get().sql,schema);
  assert.deepEqual(after.prepare('SELECT * FROM motif_search_daily ORDER BY tenant').all(),rows);
  assert.equal(after.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='motif_search_daily_with_kind'").get().n,0);
 }finally{after.close();}
});
test('query normalization excludes common contact data and markup, rejects invalid counts and filters',()=>{
 for(const value of ['a','name@example.com','https://example.com','017612345678','<img>'])assert.equal(normalizedMotifQuery(value),'');assert.equal(normalizedMotifQuery('  Herz   mit Pfote '),'herz mit pfote');
 const s=createMotifSearchStats({filename:':memory:',tenantId:'gravuru'});assert.throws(()=>s.record({query:'Hund',resultCount:-1,group:'Schiefer'}));assert.throws(()=>s.report({days:10000}));s.close();
});
