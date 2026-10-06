import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const runFile=promisify(execFile);
import {build} from '../configurator/variant-m/build.mjs';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {planBatch,commitBatch} from './batch.mjs';
import {batchReportData,batchReportWorkbook} from './batch-report.mjs';
import {importEnvironment} from './design-assets.mjs';

function fixture(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-correction-'));build({outputDirectory:dir});
  const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0].universal;
  const filename=path.join(dir,'products.sqlite');let repository=createProductRepository({filename,validateDocument:validateProductDocument});
  const master=repository.create(makeProductDocument(seed,{kind:'master',name:'Master'}));
  t.after(()=>{repository.close();fs.rmSync(dir,{recursive:true,force:true});});
  return {master,get repository(){return repository;},restart(){repository.close();repository=createProductRepository({filename,validateDocument:validateProductDocument});},input:rows=>({masterId:master.id,masterRevision:1,rows})};
}
async function readWorkbook(bytes){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-report-read-')),file=path.join(dir,'report.xlsx');fs.writeFileSync(file,bytes);
  try{return JSON.parse((await runFile('python3',['-c',`import io,json,sys
from openpyxl import load_workbook
w=load_workbook(sys.argv[1],data_only=False)
result={}
for s in w:
 rows=list(s.values); result[s.title]=[dict(zip(rows[0],[v if v is not None else '' for v in row])) for row in rows[1:]]
result['formula_count']=sum(c.data_type=='f' for s in w for row in s for c in row)
print(json.dumps(result))`,file],{timeout:15000,env:importEnvironment()})).stdout);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('97 successful products survive restart; correction workbook imports only the three fixed failures',async t=>{
  const f=fixture(t),input=f.input(Array.from({length:100},(_,i)=>({import_key:'batch-'+i,name:'Produkt '+i})));
  input.rows[1].price_small_eur='14,999';input.rows[37].name='';input.rows[99].date=46301;
  const plan=planBatch(f.repository,input),first=commitBatch(f.repository,{...input,token:plan.token,skipErrors:true});assert.equal(first.products.length,97);
  f.restart();const before=f.repository.list(),source=structuredClone(input),data=batchReportData(f.repository,{...input,mode:'errors'});
  assert.equal(data.rows.length,3);assert.deepEqual(data.rows.map(r=>r.import_key),['batch-1','batch-37','batch-99']);assert.equal(data.report.filter(r=>r.status==='Bereits ausgeführt').length,97);
  assert.equal(data.report[37].correction_excel_row,3);assert.equal(data.report[0].correction_excel_row,'');assert.equal(data.rows[2].date,46301);
  const file=await readWorkbook(await batchReportWorkbook(data));assert.equal(file.Produkte.length,3);assert.equal(file.Pruefbericht.length,100);assert.equal(file.formula_count,0);
  assert.deepEqual(f.repository.list(),before);assert.deepEqual(input,source);
  const updated=structuredClone(f.master.document);updated.config.acrylic.pricing.sizes.large=8888;f.repository.save(f.master.id,updated,1);
  file.Produkte[0].price_small_eur='14,99';file.Produkte[1].name='Korrigiert';file.Produkte[2].date='06.10.2026';
  const retry={rows:file.Produkte,designRows:file.Designs},next=planBatch(f.repository,retry);assert.equal(next.valid,true,JSON.stringify(next.report));
  const saved=commitBatch(f.repository,{...retry,token:next.token});assert.equal(saved.products.filter(p=>p.created).length,3);assert.equal(f.repository.list().length,101);
  assert.equal(f.repository.get(saved.products[0].id).document.config.acrylic.pricing.sizes.large,f.master.document.config.acrylic.pricing.sizes.large);
  assert.equal(commitBatch(f.repository,{...retry,token:next.token}).products.filter(p=>p.created).length,0);
});
test('full report is a read-only fresh assessment and user formulas remain literal editable text',async t=>{
  const f=fixture(t),input=f.input([{import_key:'formula',name:'=HYPERLINK("https://invalid.example")',names:'+123',seo_description:'@SUM(1,2)'}]);
  const before=f.repository.list(),ready=batchReportData(f.repository,{...input,mode:'report'});assert.equal(ready.report[0].status,'Bereit – noch nicht angewendet');
  const file=await readWorkbook(await batchReportWorkbook(ready));assert.equal(file.formula_count,0);assert.equal(file.Produkte[0].name,input.rows[0].name);assert.equal(file.Produkte[0].names,'+123');assert.deepEqual(f.repository.list(),before);
  const p=planBatch(f.repository,input);commitBatch(f.repository,{...input,token:p.token});
  assert.equal(batchReportData(f.repository,{...input,mode:'report'}).report[0].status,'Bereits ausgeführt');
  assert.throws(()=>batchReportData(f.repository,{...input,mode:'errors'}),/keine fehlerhaften/);
  assert.throws(()=>batchReportData(f.repository,{...input,mode:'report',report:[{status:'ready'}]}),/Prüfbericht/);
});
test('a correction export never refreshes a conflicting expected revision or changes the target ID',async t=>{
  const f=fixture(t),product=f.repository.copy(f.master.id,{expectedRevision:1,name:'Bestand'});
  const input={rows:[{import_key:'edit',action:'update',product_id:product.id,expected_revision:1,price_small_eur:'10'}]};
  const edit=structuredClone(product.document);edit.name='Parallel geändert';f.repository.save(product.id,edit,1);
  const data=batchReportData(f.repository,{...input,mode:'errors'}),file=await readWorkbook(await batchReportWorkbook(data));
  assert.equal(file.Produkte[0].expected_revision,1);assert.equal(file.Produkte[0].product_id,product.id);assert.match(data.report[0].message,/zwischenzeitlich/);
  const retry=planBatch(f.repository,{rows:file.Produkte});assert.equal(retry.valid,false);assert.equal(f.repository.get(product.id).document.name,edit.name);
});
test('invalid explicit master references remain visible for correction instead of inheriting another default',t=>{
  const f=fixture(t),data=batchReportData(f.repository,{...f.input([{import_key:'wrong-master',name:'A',master_id:'not-the-selected-master'},{import_key:'wrong-revision',name:'B',master_revision:'wrong'}]),mode:'errors'});
  assert.equal(data.rows[0].master_id,'not-the-selected-master');assert.equal(data.rows[0].master_revision,undefined);assert.equal(data.rows[1].master_revision,'wrong');assert.equal(data.rows[1].master_id,f.master.id);
});
test('duplicate and missing import keys are preserved as errors; values outside workbook limits fail explicitly',t=>{
  const f=fixture(t),input=f.input([{import_key:'duplicate',name:'A'},{import_key:'duplicate',name:'B'},{import_key:'',name:'Missing'}]);
  const data=batchReportData(f.repository,{...input,mode:'errors'});assert.equal(data.rows.length,3);assert.equal(data.report.length,3);
  for(const patch of [{unknown:'lost column'},{name:'x'.repeat(32768)},{name:'bad\u0000text'},{name:{bad:'value'}}])assert.throws(()=>batchReportData(f.repository,{...f.input([{import_key:'bad',...patch}]),mode:'report'}),/Zellen|Spalten/);
});
