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

test('numeric Excel dates are row errors and cannot become unintended printed serial numbers through the API',t=>{
 const f=fixture(t),input={masterId:f.master.id,masterRevision:1,rows:[{import_key:'excel-date',name:'Datum',date:46301},{import_key:'excel-zero',name:'Null',date:0},{import_key:'text-date',name:'Textdatum',date:'06.10.2026'}]};
 const plan=planBatch(f.store,input);assert.equal(plan.valid,false);assert.deepEqual(plan.report.map(r=>r.status),['error','error','ready']);assert.match(plan.report[0].message,/Datumsspalte als Text/);
 assert.throws(()=>commitBatch(f.store,{...input,token:plan.token}));assert.equal(f.store.list().length,1);
 const partial=commitBatch(f.store,{...input,token:plan.token,skipErrors:true});assert.equal(partial.products.length,1);assert.equal(partial.errors.length,2);const saved=f.store.get(partial.products[0].id);assert.equal(saved.document.config.profile.designs[0].objects.find(o=>o.fieldKey==='date').text,'06.10.2026');
 input.rows[0].date='07.10.2026';input.rows[1].date='08.10.2026';const corrected=planBatch(f.store,input);assert.equal(corrected.valid,true);assert.equal(corrected.report[2].status,'existing');const result=commitBatch(f.store,{...input,token:corrected.token});assert.equal(result.products.filter(p=>p.created).length,2);assert.equal(f.store.list().length,4);
});


test('explicit updates preserve IDs, historical revisions and omitted content; retry after restart never overwrites later edits',t=>{
 const f=fixture(t),p=f.store.copy(f.master.id,{expectedRevision:1,name:'Bestand'}),input={rows:[{import_key:'change-1',action:'update',product_id:p.id,expected_revision:1,name:'',price_small_eur:'12,99'}]};
 const plan=planBatch(f.store,input);assert.equal(plan.valid,true,JSON.stringify(plan.report));assert.equal(plan.report[0].action,'update');const result=commitBatch(f.store,{...input,token:plan.token});assert.equal(result.products[0].updated,true);assert.equal(result.products[0].created,false);assert.equal(result.products[0].id,p.id);
 const saved=f.store.get(p.id);assert.equal(saved.revision,2);assert.equal(saved.document.name,'Bestand');assert.equal(saved.document.config.acrylic.pricing.sizes.small,1299);assert.equal(saved.document.config.acrylic.pricing.sizes.large,p.document.config.acrylic.pricing.sizes.large);assert.deepEqual(f.store.get(p.id,{revision:1}).document,p.document);
 const later=structuredClone(saved.document);later.name='Manuell geändert';f.store.save(p.id,later,2);f.restart();const again=commitBatch(f.store,{...input,token:plan.token});assert.equal(again.products[0].updated,undefined);assert.equal(f.store.get(p.id).revision,3);assert.equal(f.store.get(p.id).document.name,'Manuell geändert');
 input.rows[0].price_small_eur='13,99';assert.equal(planBatch(f.store,input).valid,false);
});
test('updates reject missing intent, duplicate targets, master targets, no-ops and stale revisions; atomic rollback retains journal and old products',t=>{
 const f=fixture(t),a=f.store.copy(f.master.id,{expectedRevision:1,name:'A'}),b=f.store.copy(f.master.id,{expectedRevision:1,name:'B'}),row={import_key:'update-a',action:'update',product_id:a.id,expected_revision:1,name:'Neu A'};
 for(const change of [{action:''},{expected_revision:''},{product_id:f.master.id},{master_id:f.master.id},{name:''},{expected_revision:100}])assert.equal(planBatch(f.store,{rows:[{...row,...change}]}).valid,false);
 assert.ok(planBatch(f.store,{rows:[row,{...row,import_key:'duplicate'}]}).report.every(r=>r.status==='error'));
 const input={rows:[row,{...row,product_id:b.id,import_key:'update-b',name:'Neu B'}]},plan=planBatch(f.store,input);const raw=new DatabaseSync(f.filename);raw.exec("CREATE TRIGGER update_failure BEFORE INSERT ON import_items WHEN NEW.import_key='update-b' BEGIN SELECT RAISE(ABORT,'failure'); END");raw.close();assert.throws(()=>commitBatch(f.store,{...input,token:plan.token}));assert.equal(f.store.get(a.id).revision,1);assert.equal(f.store.importItem('update-a'),null);
 const changed=structuredClone(a.document);changed.name='Zwischenzeitlich';f.store.save(a.id,changed,1);assert.throws(()=>commitBatch(f.store,{...input,token:plan.token}));assert.equal(f.store.get(b.id).revision,1);
 assert.throws(()=>f.store.importBatch(plan.entries),/zwischenzeitlich/);assert.equal(f.store.get(a.id).document.name,'Zwischenzeitlich');
});
test('100 update rows permit explicit 97-row application and correcting only the remaining three',t=>{
 const f=fixture(t),products=Array.from({length:100},(_,i)=>f.store.copy(f.master.id,{expectedRevision:1,name:'Produkt '+i}));
 const input={rows:products.map((p,i)=>({import_key:'update-100-'+i,action:'update',product_id:p.id,expected_revision:1,name:'Neu '+i,price_small_eur:i<3?'bad':'12.99'}))},plan=planBatch(f.store,input);assert.equal(plan.report.filter(r=>r.status==='error').length,3);assert.throws(()=>commitBatch(f.store,{...input,token:plan.token}));assert.equal(f.store.get(products[4].id).revision,1);
 assert.equal(commitBatch(f.store,{...input,token:plan.token,skipErrors:true}).products.filter(p=>p.updated).length,97);
 for(let i=0;i<3;i++)input.rows[i].price_small_eur='12.99';const fixed=planBatch(f.store,input);assert.equal(fixed.valid,true);assert.equal(commitBatch(f.store,{...input,token:fixed.token}).products.filter(p=>p.updated).length,3);assert.ok(products.every(p=>f.store.get(p.id).revision===2));
});
