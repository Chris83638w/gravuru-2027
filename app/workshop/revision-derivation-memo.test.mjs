import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from './repository.mjs';
import {createRevisionDerivationMemo} from './revision-derivation-memo.mjs';

// Paket 1a-2: gemerkte Ableitungen aus unveränderlichen Revisionen. Echte SQLite-Datei, zwei Mandanten.
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'derivation-memo-')),filename=path.join(dir,'w.sqlite');
 const a=createProductRepository({filename,tenantId:'gravuru'}),b=createProductRepository({filename,tenantId:'zweiter'});
 const db=new DatabaseSync(filename);
 t.after(()=>{db.close();a.close();b.close();fs.rmSync(dir,{recursive:true,force:true});});
 const doc=name=>({schema:'gravuru-product/v1',name,kind:'product',masterId:null,config:{widthMm:150,heightMm:200,priceCents:1499}});
 return {a,b,db,filename,doc};
}
const run=(memo,db,tenantId,id,revision,compute,scope='s')=>memo.derive({scope,kind:'k',db,tenantId,productId:id,revision,compute});

test('same value while nothing changed: compute runs once, the second call is a hit',t=>{
 const f=fixture(t),r=f.a.create(f.doc('p1')),memo=createRevisionDerivationMemo();let n=0;
 const compute=()=>{n++;return 'abc';};
 assert.deepEqual([run(memo,f.db,'gravuru',r.id,1,compute).value,run(memo,f.db,'gravuru',r.id,1,compute).value],['abc','abc']);
 assert.equal(n,1);assert.equal(memo.stats().hits,1);
});

test('a new head revision, archiving or a schema change discards the entry at once',t=>{
 const f=fixture(t),r=f.a.create(f.doc('p1')),memo=createRevisionDerivationMemo();let n=0;const compute=()=>++n;
 run(memo,f.db,'gravuru',r.id,1,compute);
 const rec=f.a.get(r.id);f.a.save(r.id,structuredClone(rec.document),rec.revision);
 run(memo,f.db,'gravuru',r.id,1,compute);assert.equal(n,2,'neue Revision ändert den Kopf');
 run(memo,f.db,'gravuru',r.id,1,compute);assert.equal(n,2);
 f.db.exec('CREATE TABLE zz_schema(x)');
 run(memo,f.db,'gravuru',r.id,1,compute);assert.equal(n,3,'Schemaänderung');
 f.a.setArchived(r.id,{expectedRevision:f.a.get(r.id).revision,archived:true});
 const archived=run(memo,f.db,'gravuru',r.id,1,compute);assert.equal(n,4,'Archivierung');
 assert.equal(archived.marker.archived,1,'der frische Beleg meldet die Archivierung dem Aufrufer');
});

test('a replaced revision row (new rowid) is never served from memory',t=>{
 const f=fixture(t),r=f.a.create(f.doc('p1')),memo=createRevisionDerivationMemo();let n=0;const compute=()=>++n;
 run(memo,f.db,'gravuru',r.id,1,compute);
 const row=f.db.prepare('SELECT * FROM product_revisions WHERE product_id=? AND revision=1').get(r.id);
 f.db.exec('PRAGMA recursive_triggers=OFF');
 f.db.prepare('INSERT OR REPLACE INTO product_revisions(product_id,revision,document,metadata,published_revision,status,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)').run(r.id,1,row.document,row.metadata,row.published_revision,row.status,row.created_at,row.tenant_id);
 run(memo,f.db,'gravuru',r.id,1,compute);assert.equal(n,2,'ersetzte Zeile hat eine neue rowid');
});

test('foreign tenant, unknown product or revision: no marker, nothing stored, compute always runs',t=>{
 const f=fixture(t),r=f.a.create(f.doc('p1')),memo=createRevisionDerivationMemo();let n=0;const compute=()=>++n;
 run(memo,f.db,'gravuru',r.id,1,compute);
 assert.equal(memo.marker(f.db,'zweiter',r.id,1),null);
 run(memo,f.db,'zweiter',r.id,1,compute);run(memo,f.db,'zweiter',r.id,1,compute);assert.equal(n,3);
 assert.equal(memo.marker(f.db,'gravuru','cfg_unbekannt',1),null);
 assert.equal(memo.marker(f.db,'gravuru',r.id,2),null);
 assert.equal(memo.marker(f.db,'gravuru',r.id,0),null);
 assert.equal(memo.stats().entries,1);
});

test('entries are kept per scope (store) and per kind',t=>{
 const f=fixture(t),r=f.a.create(f.doc('p1')),memo=createRevisionDerivationMemo();let n=0;const compute=()=>++n;
 run(memo,f.db,'gravuru',r.id,1,compute,'store-a');run(memo,f.db,'gravuru',r.id,1,compute,'store-b');
 assert.equal(n,2);
 assert.equal(memo.derive({scope:'store-a',kind:'andere',db:f.db,tenantId:'gravuru',productId:r.id,revision:1,compute}).value,3);
});

test('errors pass through unchanged and store nothing; a change during compute is not stored',t=>{
 const f=fixture(t),r=f.a.create(f.doc('p1')),memo=createRevisionDerivationMemo();
 assert.throws(()=>run(memo,f.db,'gravuru',r.id,1,()=>{throw Object.assign(Error('x'),{code:'boom'});}),{code:'boom'});
 assert.equal(memo.stats().entries,0);
 let n=0;const compute=()=>{n++;if(n===1)f.db.exec('CREATE TABLE zz_during(x)');return 'v'+n;};
 run(memo,f.db,'gravuru',r.id,1,compute);assert.equal(memo.stats().entries,0,'Schema änderte sich während der Berechnung');
 run(memo,f.db,'gravuru',r.id,1,compute);assert.equal(memo.stats().entries,1);
});

test('limits: entry count is bounded (least recently used goes first), oversized values are not stored, no values are shared mutably',t=>{
 const f=fixture(t),ids=[1,2,3].map(i=>f.a.create(f.doc('p'+i)).id),memo=createRevisionDerivationMemo({maxEntries:2});
 for(const id of ids)run(memo,f.db,'gravuru',id,1,()=>'x');
 assert.equal(memo.stats().entries,2);assert.equal(memo.stats().evictions,1);
 const big=createRevisionDerivationMemo();run(big,f.db,'gravuru',ids[0],1,()=>'y'.repeat(600));assert.equal(big.stats().entries,0);
 const objects=createRevisionDerivationMemo();run(objects,f.db,'gravuru',ids[0],1,()=>({a:1}));
 const hit=run(objects,f.db,'gravuru',ids[0],1,()=>({a:2}));assert.equal(hit.value.a,1);assert.ok(Object.isFrozen(hit.value));
 assert.throws(()=>createRevisionDerivationMemo({maxEntries:0}));
});
