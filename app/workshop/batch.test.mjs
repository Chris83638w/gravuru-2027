import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {build} from '../configurator/variant-m/build.mjs';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {planBatch,commitBatch} from './batch.mjs';

function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-batch-'));build({outputDirectory:dir});
  const filename=path.join(dir,'products.sqlite'),seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json'),'utf8'))[0].universal;
  let store=createProductRepository({filename,validateDocument:validateProductDocument});
  const master=store.create(makeProductDocument(seed,{kind:'master',name:'Serienmaster'}));
  t.after(()=>{store.close();fs.rmSync(dir,{force:true,recursive:true});});
  return {dir,filename,master,get store(){return store;},restart(){store.close();store=createProductRepository({filename,validateDocument:validateProductDocument});return store;}};
}
test('100 products import atomically, inherit both sizes, preserve IDs across restart and repeated import',t=>{
  const f=fixture(t),input={masterId:f.master.id,masterRevision:1,rows:Array.from({length:100},(_,i)=>({import_key:'serie-'+i,name:'Geschenk '+i,category_ids:'geschenke',price_small_eur:'14,99',names:'Mia & Jörg'}))};
  const plan=planBatch(f.store,input);assert.equal(plan.valid,true);assert.equal(plan.report.length,100);assert.equal(f.store.list().length,1);
  const first=commitBatch(f.store,{...input,token:plan.token});assert.equal(first.products.filter(p=>p.created).length,100);
  const one=f.store.get(first.products[37].id);assert.equal(one.document.masterId,f.master.id);assert.equal(one.document.config.acrylic.pricing.sizes.large,1999);assert.equal(one.document.config.profile.designs[0].objects.find(o=>o.fieldKey==='names').text,'Mia & Jörg');
  f.restart();const repeated=planBatch(f.store,input);assert.equal(repeated.report.filter(p=>p.status==='existing').length,100);
  const again=commitBatch(f.store,{...input,token:repeated.token});assert.deepEqual(again.products.map(p=>p.id),first.products.map(p=>p.id));assert.ok(again.products.every(p=>!p.created));assert.equal(f.store.list().length,101);
  input.rows[0].name='Anderer Name';assert.equal(planBatch(f.store,input).valid,false);assert.throws(()=>commitBatch(f.store,{...input,token:plan.token}),/Fehler/);assert.equal(f.store.list().length,101);
});
test('a bad row prevents all writes; review token binds content and master revision',t=>{
  const f=fixture(t),input={masterId:f.master.id,masterRevision:1,rows:[{import_key:'ok',name:'Okay'},{import_key:'bad',name:'Fehler',price_small_eur:'14.999'}]};
  const bad=planBatch(f.store,input);assert.equal(bad.valid,false);assert.match(bad.report[1].message,/Eurobetrag/);assert.throws(()=>commitBatch(f.store,{...input,token:'bad'}));assert.equal(f.store.list().length,1);
  input.rows.pop();const good=planBatch(f.store,input);input.rows[0].name='Geändert';assert.throws(()=>commitBatch(f.store,{...input,token:good.token}),/erneut prüfen/);
  input.rows[0].name='Okay';const document=structuredClone(f.master.document);document.config.acrylic.pricing.sizes.small=1799;f.store.save(f.master.id,document,1);
  const result=commitBatch(f.store,{...input,token:good.token});assert.equal(f.store.get(result.products[0].id).document.config.acrylic.pricing.sizes.small,1499);
});
test('database failure during batch rolls back products and import keys together; v1 migration preserves data',t=>{
  const f=fixture(t);let raw=new DatabaseSync(f.filename);raw.exec('DROP TABLE import_items; ALTER TABLE product_revisions DROP COLUMN metadata; PRAGMA user_version=1');raw.close();f.restart();assert.equal(f.store.get(f.master.id).document.name,'Serienmaster');
  const input={masterId:f.master.id,masterRevision:1,rows:[{import_key:'first',name:'Erstes'},{import_key:'second',name:'Zweites'}]},plan=planBatch(f.store,input);
  raw=new DatabaseSync(f.filename);raw.exec("CREATE TRIGGER batch_failure BEFORE INSERT ON import_items WHEN NEW.import_key='second' BEGIN SELECT RAISE(ABORT,'failure'); END");raw.close();
  assert.throws(()=>commitBatch(f.store,{...input,token:plan.token}));assert.equal(f.store.list().length,1);assert.equal(f.store.importItem('first'),null);
});
test('explicit partial import preserves 97 valid drafts and returns 3 errors without duplicate keys',t=>{
  const f=fixture(t),input={masterId:f.master.id,masterRevision:1,rows:Array.from({length:100},(_,i)=>({import_key:'partial-'+i,name:'Serie '+i}))};
  input.rows[1].price_small_eur='Fehler';input.rows[2].master_id='other-master';input.rows[3].name='';
  const plan=planBatch(f.store,input);assert.equal(plan.valid,false);assert.equal(plan.report.filter(p=>p.status==='error').length,3);
  assert.throws(()=>commitBatch(f.store,{...input,token:plan.token}));assert.equal(f.store.list().length,1);
  const result=commitBatch(f.store,{...input,token:plan.token,skipErrors:true});assert.equal(result.products.length,97);assert.equal(result.errors.length,3);assert.equal(f.store.list().length,98);
  assert.equal(commitBatch(f.store,{...input,token:plan.token,skipErrors:true}).products.filter(p=>p.created).length,0);
  const duplicate={...input,rows:[{import_key:'same',name:'Eins'},{import_key:'same',name:'Zwei'}]};assert.ok(planBatch(f.store,duplicate).report.every(p=>p.status==='error'));
});

