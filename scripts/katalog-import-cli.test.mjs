import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {checkImportTarget,inspectImportTarget} from '../app/workshop/katalog-import-target.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),catalog=path.join(root,'app/workshop/fixtures/katalog'),script=path.join(root,'scripts/katalog-import.mjs');
function temp(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-import-guard-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function sql(file,source){const db=new DatabaseSync(file);try{db.exec(source);}finally{db.close();}}
function version(file){const db=new DatabaseSync(file,{readOnly:true});try{return db.prepare('PRAGMA user_version').get().user_version;}finally{db.close();}}
function run(file,args=[]){const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('GRAVURU_')&&key!=='GRAVURU_PYTHON')delete env[key];return spawnSync(process.execPath,[script,'--katalog',catalog,'--linie','test-linie','--db',file,'--hauptprodukt','no-such-product',...args],{cwd:root,env,encoding:'utf8',timeout:120000,windowsHide:true});}
function oldSchemas(dir){
 sql(path.join(dir,'workshop.sqlite'),`
 CREATE TABLE products(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,published_revision INTEGER,archived INTEGER NOT NULL DEFAULT 0,name TEXT NOT NULL,kind TEXT NOT NULL,master_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE product_revisions(product_id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,published_revision INTEGER,status TEXT NOT NULL,created_at TEXT NOT NULL,metadata TEXT NOT NULL DEFAULT '{}',PRIMARY KEY(product_id,revision));
 CREATE TABLE import_items(import_key TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,product_id TEXT NOT NULL,created_at TEXT NOT NULL);
 PRAGMA user_version=3;`);
 sql(path.join(dir,'profiles.sqlite'),`
 CREATE TABLE profiles(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE profile_revisions(profile_id TEXT NOT NULL,revision INTEGER NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(profile_id,revision));
 CREATE TABLE profile_library_settings(id INTEGER PRIMARY KEY,revision INTEGER NOT NULL,document TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE profile_settings_revisions(revision INTEGER PRIMARY KEY,document TEXT NOT NULL,created_at TEXT NOT NULL);
 PRAGMA user_version=1;`);
}
test('commit refuses v3 before opening any writable store and reports path, tenant and existing count',t=>{
 const dir=temp(t),file=path.join(dir,'workshop.sqlite');sql(file,"CREATE TABLE products(id TEXT);INSERT INTO products VALUES('A'),('B');PRAGMA user_version=3;");
 const before=fs.readFileSync(file),result=run(file,['--commit']);assert.notEqual(result.status,0);assert.ifError(result.error);
 assert.match(result.stderr,/--migrieren/);assert.ok(result.stderr.includes(file));assert.ok(result.stdout.includes(path.resolve(file)));
 assert.match(result.stdout,/Mandant: gravuru.*Produktanzahl.*2/);assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readdirSync(dir),['workshop.sqlite']);assert.equal(version(file),3);
});
test('an old profiles DB blocks the whole commit even when workshop does not yet exist',t=>{
 const dir=temp(t),profile=path.join(dir,'profiles.sqlite'),file=path.join(dir,'workshop.sqlite');sql(profile,'PRAGMA user_version=1;');
 const before=fs.readFileSync(profile),result=run(file,['--commit']);assert.notEqual(result.status,0);assert.ok(result.stderr.includes(profile));assert.equal(fs.existsSync(file),false);assert.deepEqual(fs.readFileSync(profile),before);
});
test('an existing version-zero file also requires explicit migration; nonexistent paths stay untouched',t=>{
 const dir=temp(t),file=path.join(dir,'empty.sqlite');sql(file,'PRAGMA user_version=0;');assert.throws(()=>checkImportTarget(file,{log:()=>{}}),/--migrieren/);
 const next=path.join(dir,'new','workshop.sqlite');assert.equal(checkImportTarget(next,{log:()=>{}}).products,0);assert.equal(fs.existsSync(path.dirname(next)),false);
});
test('explicit --migrieren migrates actual legacy v3/v1 tables to v4/v2 through the CLI',t=>{
 const dir=temp(t),file=path.join(dir,'workshop.sqlite');oldSchemas(dir);
 const result=run(file,['--commit','--migrieren']);assert.equal(result.status,0,result.stdout+'\n'+result.stderr);assert.ifError(result.error);
 assert.match(result.stdout,/Migration mit --migrieren ausdrücklich angefordert/);assert.equal(version(file),4);assert.equal(version(path.join(dir,'profiles.sqlite')),2);
 assert.ok(result.stdout.indexOf('Import-Zieldatei:')<result.stdout.indexOf('Geschrieben nach'));
 assert.match(result.stdout,/Import-Plan für Mandant gravuru: 0 neue/);
});
test('a new database may be created without --migrieren',t=>{
 const dir=temp(t),file=path.join(dir,'workshop.sqlite'),result=run(file,['--commit']);assert.equal(result.status,0,result.stdout+'\n'+result.stderr);assert.equal(version(file),4);assert.equal(version(path.join(dir,'profiles.sqlite')),2);
});
test('dry-run never opens the supplied legacy DB',t=>{
 const dir=temp(t),file=path.join(dir,'workshop.sqlite');sql(file,"CREATE TABLE products(id TEXT);PRAGMA user_version=3;");const before=fs.readFileSync(file),result=run(file);
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Dry-run: nichts geschrieben/);assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readdirSync(dir),['workshop.sqlite']);
});
test('read-only preflight counts all tenants separately and rejects future schemas even with migration',t=>{
 const dir=temp(t),file=path.join(dir,'workshop.sqlite');sql(file,"CREATE TABLE products(id TEXT,tenant_id TEXT);INSERT INTO products VALUES('A','gravuru'),('B','other');PRAGMA user_version=4;");
 const before=fs.readFileSync(file),target=inspectImportTarget(file);assert.equal(target.products,2);assert.equal(target.tenantProducts,1);assert.equal(target.tenantId,'gravuru');assert.deepEqual(fs.readFileSync(file),before);
 sql(file,'PRAGMA user_version=5;');assert.throws(()=>checkImportTarget(file,{migrate:true,log:()=>{}}),/neuere Datenbankversion/);assert.equal(version(file),5);
});
