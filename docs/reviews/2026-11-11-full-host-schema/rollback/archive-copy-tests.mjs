import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fs.mkdtempSync(path.join(import.meta.dirname,'synthetic-'));
const oldSql='CREATE TABLE motif_search_daily(tenant TEXT NOT NULL,day TEXT NOT NULL,product_group TEXT NOT NULL,term TEXT NOT NULL,source TEXT NOT NULL,searches INTEGER NOT NULL,without_results INTEGER NOT NULL,PRIMARY KEY(tenant,day,product_group,term,source))';
const currentSql="CREATE TABLE motif_search_daily(tenant TEXT NOT NULL,day TEXT NOT NULL,product_group TEXT NOT NULL,term TEXT NOT NULL,source TEXT NOT NULL,search_kind TEXT NOT NULL DEFAULT 'motif' CHECK(search_kind IN ('motif','design')),searches INTEGER NOT NULL,without_results INTEGER NOT NULL,PRIMARY KEY(tenant,day,product_group,term,source,search_kind))";
const fixture=(name,design=true)=>{
 const dir=path.join(root,name);fs.mkdirSync(dir,{mode:0o700});
 const backup=path.join(dir,'baseline.sqlite'),file=path.join(dir,'copy.sqlite'),archive=path.join(dir,'archive.json');
 let db=new DatabaseSync(backup);db.exec(oldSql);db.close();
 db=new DatabaseSync(file);db.exec(currentSql+"; CREATE TABLE untouched_order(id TEXT,amount INTEGER); INSERT INTO untouched_order VALUES('synthetic-order',1234); CREATE TABLE untouched_product(id TEXT,revision INTEGER); INSERT INTO untouched_product VALUES('synthetic-product',7); INSERT INTO motif_search_daily VALUES('gravuru','2026-11-11','test','synthetic-motif','shop','motif',8,2)");
 if(design)db.exec("INSERT INTO motif_search_daily VALUES('gravuru','2026-11-11','test','synthetic-design','shop','design',9007199254740993,4),('second','2026-11-11','test','synthetic-design-2','preview','design',3,1)");
 db.close();return {dir,backup,file,archive};
};
const snapshot=f=>{const db=new DatabaseSync(f,{readOnly:true});try{const s=db.prepare('SELECT * FROM motif_search_daily ORDER BY tenant');s.setReadBigInts(true);return JSON.stringify({rows:s.all(),schema:db.prepare("SELECT type,name,sql FROM sqlite_master ORDER BY name").all(),orders:db.prepare('SELECT * FROM untouched_order').all(),products:db.prepare('SELECT * FROM untouched_product').all()},(_k,v)=>typeof v==='bigint'?String(v):v);}finally{db.close();}};
const run=(f,archive,args=['--ausfuehren'])=>spawnSync(process.execPath,[path.join(import.meta.dirname,'rt-suchstatistik-zurueck.mjs'),...args],{encoding:'utf8',env:{...process.env,RT_DB:f.file,RT_SICHERUNG_DB:f.backup,RT_SUCHSTATISTIK_ARCHIV:archive||''}});
const results=[];
{
 const f=fixture('success'),r=run(f,f.archive);assert.equal(r.status,0,r.stdout+r.stderr);
 const doc=JSON.parse(fs.readFileSync(f.archive));assert.equal(doc.payload.rows.length,2);assert.equal(doc.payload.rows[0].searches.sqliteInteger,'9007199254740993');assert.deepEqual(new Set(doc.payload.rows.map(x=>x.tenant)),new Set(['gravuru','second']));
 assert.equal(createHash('sha256').update(JSON.stringify(doc.payload)).digest('hex'),doc.payloadSha256);
 const loggedArchive=r.stdout.trim().split('\n').map(line=>JSON.parse(line)).find(row=>row.schritt==='designsuche_archiviert');
 assert.equal(loggedArchive.dateiSha256,createHash('sha256').update(fs.readFileSync(f.archive)).digest('hex'));
 assert.equal(loggedArchive.payloadSha256,doc.payloadSha256);
 assert.equal(r.stdout.includes('synthetic-design'),false);
 const db=new DatabaseSync(f.file,{readOnly:true});assert.equal(db.prepare('PRAGMA table_info(motif_search_daily)').all().length,7);assert.deepEqual({...db.prepare('SELECT searches,without_results FROM motif_search_daily').get()},{searches:8,without_results:2});assert.equal(db.prepare('SELECT amount FROM untouched_order').get().amount,1234);assert.equal(db.prepare('SELECT revision FROM untouched_product').get().revision,7);db.close();
 results.push('all non-motif rows archived before drop; cross-tenant/source, exact int64, hashes and untouched order/product retained');
}
{
 const f=fixture('missing'),before=snapshot(f.file),r=run(f);assert.equal(r.status,1);assert.equal(snapshot(f.file),before);assert.equal(fs.existsSync(f.archive),false);results.push('missing archive path aborts transaction and preserves complete schema/data');
}
{
 const f=fixture('exclusive');fs.writeFileSync(f.archive,'keep',{mode:0o600});const before=snapshot(f.file),r=run(f,f.archive);assert.equal(r.status,1);assert.equal(snapshot(f.file),before);assert.equal(fs.readFileSync(f.archive,'utf8'),'keep');results.push('existing archive rejected by exclusive create; no overwrite and DB unchanged');
}
{
 const f=fixture('readonly'),before=snapshot(f.file),r=run(f,f.archive,['--pruefen']);assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(snapshot(f.file),before);assert.equal(fs.existsSync(f.archive),false);results.push('read-only preflight creates no archive and does not modify synthetic DB');
}
{
 const f=fixture('motif-only',false),r=run(f);assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(fs.existsSync(f.archive),false);results.push('motif-only rollback still needs no unused archive');
}
console.log(JSON.stringify({syntheticOnly:true,checksPassed:results.length,results,platform:process.platform,permissionLimit:process.platform==='win32'?'POSIX mode/owner and directory fsync require Linux operator copy test; data/archive ordering tested here.':null},null,2));
