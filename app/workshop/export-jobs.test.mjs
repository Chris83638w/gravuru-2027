import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {createExportJobStore,createExportWorker} from './export-jobs.mjs';
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-queue-')),filename=path.join(dir,'workshop.sqlite'),resources=new Set();
 const own=resource=>{resources.add(resource);return resource;},close=resource=>{resource.close();resources.delete(resource);};
 t.after(()=>{for(const resource of [...resources].reverse())close(resource);fs.rmSync(dir,{recursive:true,force:true});});
 const db=own(new DatabaseSync(filename));db.exec('CREATE TABLE form_review_snapshots(id TEXT PRIMARY KEY);CREATE TABLE form_print_proofs(snapshot_id TEXT,recipe_key TEXT,metadata TEXT,pdf BLOB,archive BLOB,PRIMARY KEY(snapshot_id,recipe_key));');db.prepare('INSERT INTO form_review_snapshots VALUES(?)').run('proof-fixture');close(db);
 return {filename,own,close};
}
const input={snapshotId:'proof-fixture',recipeKey:'recipe-key',recipe:'recipe/v1',settings:{dpi:300}},result={metadata:{fixture:true},pdf:Buffer.from('synthetic PDF bytes'),archive:Buffer.from('synthetic ZIP bytes')};
const waitFor=async(fn)=>{const deadline=Date.now()+3000;while(Date.now()<deadline){const x=fn();if(x)return x;await new Promise(r=>setTimeout(r,10));}assert.fail('Queue transition timed out');};
test('queue deduplicates requests, fences expired workers and atomically retains first output and immutable request history',t=>{
 const f=fixture(t),{filename}=f;let now=1000;const a=f.own(createExportJobStore({filename,clock:()=>now})),b=f.own(createExportJobStore({filename,clock:()=>now}));const j=a.enqueue(input);assert.equal(a.enqueue(input).id,j.id);assert.equal(a.list().length,1);const first=a.claim(100);assert.equal(b.claim(100),null);now+=101;const second=b.claim(100);assert.equal(second.id,j.id);assert.notEqual(first.leaseToken,second.leaseToken);assert.equal(a.finish(j.id,first.leaseToken,{...result,pdf:Buffer.from('stale')}),false);assert.equal(b.finish(j.id,second.leaseToken,result),true);assert.equal(a.get(j.id).attempts,2);assert.equal(a.get(j.id).status,'completed');assert.equal(a.retry(j.id).status,'completed');assert.equal(a.enqueue(input).id,j.id);assert.equal(a.events(j.id).length,4);
 const db=f.own(new DatabaseSync(filename));assert.equal(Buffer.from(db.prepare('SELECT pdf FROM form_print_proofs').get().pdf).toString(),result.pdf.toString());assert.throws(()=>db.exec("UPDATE form_export_jobs SET settings='{}'"),/immutable/);assert.throws(()=>db.exec('DELETE FROM form_export_events'),/immutable/);f.close(db);assert.equal(JSON.stringify(a.get(j.id)).includes('leaseToken'),false);
});
test('failed jobs survive SQLite reopen, retry safely and retain a visible failure event',async t=>{
 const f=fixture(t),{filename}=f;let jobs=f.own(createExportJobStore({filename})),worker=f.own(createExportWorker({jobs,recipe:'recipe/v1',intervalMs:10000,render:async()=>{throw Object.assign(Error('Synthetische Quelldatei fehlt.'),{status:422});}}));const j=jobs.enqueue(input);worker.kick();await waitFor(()=>jobs.get(j.id).status==='failed');assert.match(jobs.get(j.id).error,/Quelldatei/);f.close(worker);f.close(jobs);jobs=f.own(createExportJobStore({filename}));worker=f.own(createExportWorker({jobs,recipe:'recipe/v1',intervalMs:10,render:async()=>result}));assert.equal(jobs.get(j.id).status,'failed');jobs.retry(j.id);await waitFor(()=>jobs.get(j.id).status==='completed');assert.equal(jobs.get(j.id).attempts,2);assert.deepEqual(jobs.events(j.id).map(e=>e.status),['queued','running','failed','queued','running','completed']);
});
test('graceful worker close releases a job and a later worker resumes without the old renderer overwriting it',async t=>{
 const f=fixture(t),{filename}=f,jobs=f.own(createExportJobStore({filename}));let resolve;const worker=f.own(createExportWorker({jobs,recipe:'recipe/v1',intervalMs:10000,render:()=>new Promise(r=>resolve=r)}));const j=jobs.enqueue(input);worker.kick();assert.equal(jobs.get(j.id).status,'running');f.close(worker);assert.equal(jobs.get(j.id).status,'queued');const next=f.own(createExportWorker({jobs,recipe:'recipe/v1',intervalMs:10,render:async()=>result}));await waitFor(()=>jobs.get(j.id).status==='completed');resolve({...result,pdf:Buffer.from('old worker')});await new Promise(r=>setTimeout(r,20));const db=f.own(new DatabaseSync(filename));assert.equal(Buffer.from(db.prepare('SELECT pdf FROM form_print_proofs').get().pdf).toString(),result.pdf.toString());f.close(db);
 const obsolete=jobs.enqueue({...input,recipe:'retired/v0',recipeKey:'old'});next.kick();await waitFor(()=>jobs.get(obsolete.id).status==='failed');assert.match(jobs.get(obsolete.id).error,/Rezeptversion/);
});

test('position outputs filter by immutable snapshot before the global 200-job limit, never by product or recency',t=>{
 const f=fixture(t),{filename}=f,jobs=f.own(createExportJobStore({filename}));
 const first=jobs.enqueue(input),db=f.own(new DatabaseSync(filename));db.prepare('INSERT INTO form_review_snapshots(id) VALUES(?)').run('proof-other');f.close(db);
 for(let i=0;i<205;i++)jobs.enqueue({...input,snapshotId:'proof-other',recipeKey:'other-'+i});
 assert.equal(jobs.list().some(j=>j.id===first.id),false);
 assert.deepEqual(jobs.forSnapshot(input.snapshotId),{jobs:[first],total:1});
 const other=jobs.forSnapshot('proof-other');assert.equal(other.total,205);assert.equal(other.jobs.length,200);assert.ok(other.jobs.every(j=>j.snapshotId==='proof-other'));
 assert.deepEqual(jobs.forSnapshot('unknown'),{jobs:[],total:0});
});
