import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {createExportJobStore} from './export-jobs.mjs';
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-output-checks-')),filename=path.join(dir,'synthetic.sqlite'),db=new DatabaseSync(filename);db.exec("CREATE TABLE form_review_snapshots(id TEXT PRIMARY KEY);INSERT INTO form_review_snapshots VALUES('proof-one');CREATE TABLE form_print_proofs(snapshot_id TEXT,recipe_key TEXT,metadata TEXT,pdf BLOB,archive BLOB,PRIMARY KEY(snapshot_id,recipe_key));");let jobs=createExportJobStore({database:db});t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});const job=jobs.enqueue({snapshotId:'proof-one',recipeKey:'key',recipe:'fixture/v1',settings:{dpi:300}}),file={format:'pdf',name:'fixture.pdf',sha256:'a'.repeat(64)},input={requestId:randomUUID(),format:'pdf',sha256:file.sha256,stage:'import',result:'passed',machine:'',software:'CorelDRAW Test',notes:'Synthetic observation'};const finish=()=>{const active=jobs.claim();jobs.finish(job.id,active.leaseToken,{metadata:{},pdf:Buffer.from('fixture PDF'),archive:Buffer.from('fixture ZIP')});};return {db,filename,jobs,job,file,input,finish};}
test('check pins file SHA and observation, deduplicates retry and survives database reopen without releasing production',t=>{
 const f=setup(t);f.finish();const original=f.jobs.get(f.job.id),check=f.jobs.checks.add(f.job.id,f.input,f.file);assert.equal(check.sha256,f.file.sha256);assert.equal(check.source,'operator-report');assert.equal(check.productionReady,false);assert.deepEqual(f.jobs.checks.add(f.job.id,f.input,f.file),check);assert.equal(f.jobs.checks.list(f.job.id).total,1);
 assert.throws(()=>f.jobs.checks.add(f.job.id,{...f.input,notes:'Changed retry'},f.file),e=>e.status===409);
 const reopened=createExportJobStore({filename:f.filename});assert.deepEqual(reopened.checks.list(f.job.id).checks,[check]);reopened.close();assert.deepEqual(f.jobs.get(f.job.id),original);assert.equal(Buffer.from(f.db.prepare('SELECT pdf FROM form_print_proofs').get().pdf).toString(),'fixture PDF');
});
test('later failure or correction appends evidence; saved observations cannot be changed or deleted',t=>{
 const f=setup(t);f.finish();const first=f.jobs.checks.add(f.job.id,f.input,f.file),second=f.jobs.checks.add(f.job.id,{...f.input,requestId:randomUUID(),stage:'print',result:'failed',machine:'Mimaki 2513 EX',software:'Synthetic RIP',notes:'Contour check needs correction'},f.file);
 assert.deepEqual(f.jobs.checks.list(f.job.id).checks.map(c=>c.id),[second.id,first.id]);assert.equal(second.productionReady,false);assert.throws(()=>f.db.exec("UPDATE export_output_checks SET document='{}'"),/immutable/);assert.throws(()=>f.db.exec('DELETE FROM export_output_checks'),/immutable/);
});
test('unfinished jobs, wrong file hash, ZIP and invalid or incomplete observations leave no evidence',t=>{
 const f=setup(t);assert.throws(()=>f.jobs.checks.add(f.job.id,f.input,f.file),e=>e.status===409);f.finish();
 for(const change of [{sha256:'b'.repeat(64)},{format:'zip'},{stage:'approval'},{result:'approved'},{stage:'print',machine:''},{software:''},{result:'failed',notes:''},{notes:'x'.repeat(2001)},{productionReady:true},{requestId:'-'.repeat(36)}])assert.throws(()=>f.jobs.checks.add(f.job.id,{...f.input,...change},f.file));
 assert.equal(f.jobs.checks.list(f.job.id).total,0);assert.throws(()=>f.jobs.checks.add('missing',f.input,f.file),e=>e.status===404);
});
test('complete history pages remain ordered and duplicate-free when a newer observation is added',t=>{
 const f=setup(t);f.finish();const expected=[];
 for(let i=0;i<207;i++)expected.unshift(f.jobs.checks.add(f.job.id,{...f.input,requestId:randomUUID(),notes:'Synthetic '+i},f.file).id);
 let page=f.jobs.checks.list(f.job.id);assert.equal(page.checks.length,50);assert.equal(page.total,207);const found=page.checks.map(c=>c.id);
 const newer=f.jobs.checks.add(f.job.id,{...f.input,requestId:randomUUID(),notes:'New observation while paging'},f.file);
 while(page.nextBefore){page=f.jobs.checks.list(f.job.id,{before:page.nextBefore});found.push(...page.checks.map(c=>c.id));}
 assert.deepEqual(found,expected);assert.equal(new Set(found).size,207);assert.equal(f.jobs.checks.list(f.job.id).checks[0].id,newer.id);assert.equal(page.total,208);
});
test('file and stage filters apply before pagination and reject invalid or foreign cursors',t=>{
 const f=setup(t);f.finish();const white={...f.file,format:'white-pdf',name:'white.pdf',sha256:'b'.repeat(64)},expected=[];
 for(let i=0;i<61;i++)expected.unshift(f.jobs.checks.add(f.job.id,{...f.input,requestId:randomUUID(),format:white.format,sha256:white.sha256,stage:'print',machine:'Synthetic printer'},white).id);
 for(let i=0;i<205;i++)f.jobs.checks.add(f.job.id,{...f.input,requestId:randomUUID()},f.file);
 const options={format:'white-pdf',stage:'print'},first=f.jobs.checks.list(f.job.id,options),second=f.jobs.checks.list(f.job.id,{...options,before:first.nextBefore});
 assert.equal(first.total,61);assert.equal(first.checks.length,50);assert.deepEqual([...first.checks,...second.checks].map(c=>c.id),expected);assert.equal(second.nextBefore,null);assert.equal(f.jobs.checks.list(f.job.id,{format:'white-pdf',stage:'import'}).total,0);
 for(const options of [{format:'zip'},{stage:'approved'},{before:'bad'},{before:123},{before:'check_'+randomUUID()}])assert.throws(()=>f.jobs.checks.list(f.job.id,options),e=>e.status===422);
 assert.throws(()=>f.jobs.checks.list('different-job',{before:first.checks[0].id}),e=>e.status===422);
});
