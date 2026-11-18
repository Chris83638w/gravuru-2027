import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createProfileLibrary} from '../app/workshop/profile-library.mjs';
import {inspectFontSetOrigins} from './inspect-fontset-origins.mjs';
function temporary(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-font-maintenance-'));t.after(()=>{assert.equal(path.dirname(dir),path.resolve(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});return dir;}
test('deprecated spreadsheet import refuses before reading input or changing catalogue files',t=>{
 const dir=temporary(t);fs.mkdirSync(path.join(dir,'schriften'));const filename=path.join(dir,'schriften/sets.json'),original='{"sets":[]}\n';fs.writeFileSync(filename,original);
 const result=spawnSync(process.env.GRAVURU_PYTHON||'python',[fileURLToPath(new URL('./build-font-sets.py',import.meta.url)),'--katalog',dir,'--import-xlsx',path.join(dir,'nonexistent.xlsx')],{encoding:'utf8'});
 assert.ifError(result.error);assert.equal(result.status,1);assert.match(result.stderr,/Excel-Import gesperrt/);assert.match(result.stderr,/\/werkstatt\/schriftgruppen\//);assert.equal(fs.readFileSync(filename,'utf8'),original);assert.deepEqual(fs.readdirSync(path.join(dir,'schriften')),['sets.json']);
});
test('read-only inventory counts inherited and explicit product assignments, isolates tenants and excludes masters',t=>{
 const dir=temporary(t),filename=path.join(dir,'profiles.sqlite'),workshopFilename=path.join(dir,'workshop.sqlite');fs.cpSync(new URL('../app/workshop/fixtures/katalog/',import.meta.url),dir,{recursive:true});
 const profiles=createProfileLibrary({filename,catalog:{fonts:['Lato'],motifs:[]}});profiles.close();
 const db=new DatabaseSync(workshopFilename);db.exec('CREATE TABLE products(id TEXT,tenant_id TEXT,kind TEXT,revision INTEGER); CREATE TABLE product_revisions(product_id TEXT,tenant_id TEXT,revision INTEGER,document TEXT); CREATE TABLE import_items(product_id TEXT,tenant_id TEXT,import_key TEXT);');
 for(const [id,tenant,kind,assignment] of [['a','gravuru','product',{mode:'inherit',profileId:null}],['b','gravuru','product',{mode:'override',profileId:'custom'}],['c','gravuru','product',{mode:'empty',profileId:null}],['d','gravuru','product',null],['e','foreign','product',{mode:'inherit',profileId:null}],['f','gravuru','master',{mode:'inherit',profileId:null}]]){
  db.prepare('INSERT INTO products VALUES(?,?,?,1)').run(id,tenant,kind);db.prepare('INSERT INTO product_revisions VALUES(?,?,1,?)').run(id,tenant,JSON.stringify({profileAssignments:assignment?{fonts:assignment}:undefined}));db.prepare('INSERT INTO import_items VALUES(?,?,?)').run(id,tenant,'katalog:test:'+id);
 }db.close();const before=fs.readFileSync(workshopFilename),report=inspectFontSetOrigins({filename,katalogDir:dir,workshopFilename});
 assert.equal(report.products.total,4);assert.deepEqual(report.products.byAssignmentMode,{inherit:1,override:1,empty:1,missing:1,unknown:0});assert.deepEqual(report.products.catalogImportedByMode,report.products.byAssignmentMode);assert.deepEqual(report.products.byProfile,{custom:1});assert.deepEqual(fs.readFileSync(workshopFilename),before);
});
