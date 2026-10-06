import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {build} from '../configurator/variant-m/build.mjs';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {commitBatch} from './batch.mjs';
import {createBatchJobs} from './batch-jobs.mjs';

function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-batch-jobs-'));build({outputDirectory:dir});
 const filename=path.join(dir,'workshop.sqlite'),seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0].universal;
 let repository=createProductRepository({filename,validateDocument:validateProductDocument}),jobs=createBatchJobs({filename,repository});
 const master=repository.create(makeProductDocument(seed,{kind:'master',name:'Gespeicherter Master'}));
 t.after(()=>{jobs.close();repository.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {filename,master,get repository(){return repository;},get jobs(){return jobs;},restart(){jobs.close();repository.close();repository=createProductRepository({filename,validateDocument:validateProductDocument});jobs=createBatchJobs({filename,repository});},input:rows=>({rows,masterId:master.id,masterRevision:1})};
}
test('saved input survives reopening, pins the master and derives partial progress from the durable product journal',t=>{
 const f=fixture(t),input=f.input([{import_key:'one',name:'Eins'},{import_key:'two',name:'Zwei'},{import_key:'bad',name:'Drei',price_small_eur:'bad'}]);
 const before=f.repository.list(),job=f.jobs.create({name:'Meine Serie',input});assert.deepEqual(f.repository.list(),before);assert.equal(f.jobs.list().length,1);
 const opened=f.jobs.review(job.id);assert.equal(opened.plan.report.filter(r=>r.status==='ready').length,2);assert.equal(opened.input.rows[0].master_id,f.master.id);assert.equal(opened.input.rows[0].master_revision,1);assert.ok(!Object.hasOwn(opened.input,'token'));assert.ok(!Object.hasOwn(opened.plan,'entries'));
 commitBatch(f.repository,{...opened.input,token:opened.plan.token,skipErrors:true});
 // No job completion update: a lost browser response must still recover the real committed progress.
 f.restart();const resumed=f.jobs.review(job.id);assert.deepEqual(resumed.plan.report.map(r=>r.status),['existing','existing','error']);
 const doc=structuredClone(f.master.document);doc.config.acrylic.pricing.sizes.small=1777;f.repository.save(f.master.id,doc,1);
 const corrected=structuredClone(resumed.input);corrected.rows[2].price_small_eur='12,99';const second=f.jobs.create({name:'Korrigiert',input:corrected});assert.notEqual(second.id,job.id);
 const next=f.jobs.review(second.id),result=commitBatch(f.repository,{...next.input,token:next.plan.token});assert.equal(result.products.filter(p=>p.created).length,1);assert.equal(f.repository.list().length,4);
 const again=f.jobs.review(second.id);assert(again.plan.report.every(r=>r.status==='existing'));assert.equal(commitBatch(f.repository,{...again.input,token:again.plan.token}).products.filter(p=>p.created).length,0);
 assert.equal(f.jobs.review(job.id).input.rows[2].price_small_eur,'bad');
});
test('resuming an update obtains a fresh conflict report without incrementing revision or applying stale data',t=>{
 const f=fixture(t),product=f.repository.copy(f.master.id,{expectedRevision:1,name:'Original'});
 const job=f.jobs.create({name:'Änderung',input:{rows:[{action:'update',import_key:'update',product_id:product.id,expected_revision:1,name:'Tabellenname'}]}});
 const prior=f.jobs.review(job.id),doc=structuredClone(product.document);doc.name='Neu im Einzelprodukt';f.repository.save(product.id,doc,1);f.restart();
 const current=f.jobs.review(job.id);assert.equal(current.plan.valid,false);assert.equal(current.plan.token,null);assert.match(current.plan.report[0].message,/zwischenzeitlich/);
 assert.throws(()=>commitBatch(f.repository,{...current.input,token:prior.plan.token}),/Fehler/);assert.equal(f.repository.get(product.id).document.name,doc.name);
});
test('identical saved input deduplicates across connections; removing a snapshot leaves products and import history intact',t=>{
 const f=fixture(t),input=f.input([{import_key:'duplicate',name:'Produkt'}]),job=f.jobs.create({name:'Erste Prüfung',input});
 const other=createBatchJobs({filename:f.filename,repository:f.repository});try{const repeated=other.create({name:'Anderer Dateiname',input});assert.equal(repeated.id,job.id);assert.equal(repeated.existing,true);assert.equal(repeated.name,'Erste Prüfung');}finally{other.close();}
 const opened=f.jobs.review(job.id);commitBatch(f.repository,{...opened.input,token:opened.plan.token});const products=f.repository.list(),item=f.repository.importItem('duplicate');
 assert.deepEqual(f.jobs.list()[0],{id:job.id,name:job.name,createdAt:job.createdAt,rowCount:1});assert.deepEqual(f.jobs.remove(job.id),{removed:true});assert.equal(f.jobs.list().length,0);assert.throws(()=>f.jobs.review(job.id),/nicht gefunden/);
 assert.deepEqual(f.repository.list(),products);assert.deepEqual(f.repository.importItem('duplicate'),item);
});
test('snapshot storage rejects credentials/arbitrary payload and cannot rewrite immutable inputs',t=>{
 const f=fixture(t),input=f.input([{import_key:'safe',name:'Produkt'}]);
 for(const extra of [{token:'not-to-store'},{authorization:'not-to-store'},{customerPhoto:'not-to-store'},{entries:[]}])assert.throws(()=>f.jobs.create({name:'Ungültig',input:{...input,...extra}}),/Importdaten/);
 for(const name of ['', 'x'.repeat(161), 'bad\nname'])assert.throws(()=>f.jobs.create({name,input}),/Namen/);
 const job=f.jobs.create({name:'Prüfung',input}),db=new DatabaseSync(f.filename);
 try{assert.throws(()=>db.prepare('UPDATE batch_jobs SET input=? WHERE id=?').run('{}',job.id),/immutable/);assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare('PRAGMA user_version').get().user_version,3);}finally{db.close();}
 assert.equal(f.jobs.review(job.id).input.rows[0].name,'Produkt');
});
test('saved checks have an explicit capacity and reject oversized data instead of removing older work',t=>{
 const f=fixture(t),db=new DatabaseSync(f.filename);
 try{const insert=db.prepare('INSERT INTO batch_jobs VALUES(?,?,?,?,?,?)');for(let i=0;i<100;i++)insert.run('fixture-'+i,'hash-'+i,'Bestand',new Date().toISOString(),1,'{}');}finally{db.close();}
 assert.throws(()=>f.jobs.create({name:'Neu',input:f.input([{import_key:'new',name:'Neu'}])}),/100 Importprüfungen/);assert.equal(f.jobs.list().length,100);
 const huge=f.input(Array.from({length:100},(_,i)=>({import_key:'large-'+i,name:'Produkt',slogan:'x'.repeat(25000)})));
 assert.throws(()=>f.jobs.create({name:'Groß',input:huge}),/2 MB/);assert.equal(f.jobs.list().length,100);
});
