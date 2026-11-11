import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {sichern} from './sicherung-db.mjs';

function quelle(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dbsich-'));
 const data=path.join(dir,'data');fs.mkdirSync(data);
 const db=new DatabaseSync(path.join(data,'workshop.sqlite'));
 db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE motif_search_daily(day TEXT,term TEXT,n INTEGER); CREATE TABLE produkte(id INTEGER PRIMARY KEY,daten TEXT);');
 const ins=db.prepare('INSERT INTO produkte(daten) VALUES(?)');
 for(let i=0;i<2000;i++)ins.run('x'.repeat(500));
 db.prepare('INSERT INTO motif_search_daily VALUES(?,?,?)').run('2026-11-11','herz',3);
 return {dir,data,db};
}

test('Sicherung im laufenden Betrieb: Stand aus der WAL ist enthalten, Quelle bleibt unberührt, Kopie ist geprüft',async()=>{
 const {dir,data,db}=quelle();
 try{
  assert.ok(fs.statSync(path.join(data,'workshop.sqlite-wal')).size>0,'Testquelle hat offene WAL');
  const vorher=fs.statSync(path.join(data,'workshop.sqlite')).mtimeMs;
  const r=await sichern({dataDir:data,backupDir:path.join(dir,'sich'),jetzt:new Date('2026-11-11T20:00:00Z')});
  assert.equal(path.basename(r.ordner),'20261111T200000Z');
  assert.deepEqual(r.dateien,['workshop.sqlite']);
  const m=JSON.parse(fs.readFileSync(path.join(r.ordner,'manifest.json'),'utf8'));
  assert.equal(m.dateien['workshop.sqlite'].quickCheck,'ok');
  assert.deepEqual(m.dateien['workshop.sqlite'].tabellen,{motif_search_daily:1,produkte:2000});
  assert.match(m.dateien['workshop.sqlite'].sha256,/^[0-9a-f]{64}$/);
  assert.equal(fs.statSync(path.join(data,'workshop.sqlite')).mtimeMs,vorher,'Quelldatei nicht angefasst');
  assert.equal(fs.existsSync(path.join(r.ordner,'workshop.sqlite-wal')),false,'Kopie ist eine einzelne, abgeschlossene Datei');
  // Die laufende App kann danach weiterschreiben.
  db.prepare('INSERT INTO produkte(daten) VALUES(?)').run('nachher');
  const kopie=new DatabaseSync(path.join(r.ordner,'workshop.sqlite'),{readOnly:true});
  assert.equal(kopie.prepare('SELECT COUNT(*) AS n FROM produkte').get().n,2000);kopie.close();
 }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('Vorhandene Sicherung wird nie überschrieben; --pruefen schreibt keine Sicherung',async()=>{
 const {dir,data,db}=quelle();
 try{
  const jetzt=new Date('2026-11-11T20:00:00Z'),backupDir=path.join(dir,'sich');
  const p=await sichern({dataDir:data,backupDir,nurPruefen:true,jetzt});
  assert.equal(p.geprueft,true);assert.deepEqual(fs.readdirSync(backupDir),[]);
  await sichern({dataDir:data,backupDir,jetzt});
  await assert.rejects(()=>sichern({dataDir:data,backupDir,jetzt}),/EEXIST/);
 }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('Fehlende Quelle bricht ab, ohne etwas anzulegen',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dbsich-'));
 try{
  await assert.rejects(()=>sichern({dataDir:path.join(dir,'nichts'),backupDir:path.join(dir,'sich')}),/Quelle fehlt/);
  assert.equal(fs.existsSync(path.join(dir,'sich')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
