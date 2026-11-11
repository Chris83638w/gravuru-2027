import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readPinned,INPUT_SHA,EXCEL_COMMIT,auditMissingSources,planExistingTemplate} from './issue230-product-plan-audit.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createProductGroupTemplates} from '../app/workshop/product-group-templates.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';

const inputFile=new URL('../docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz',import.meta.url);
const inputs=()=>readPinned(inputFile,INPUT_SHA);
const code=expected=>error=>error.code===expected;

test('seven real pinned Excel inputs remain blocked, no invented plan or approval',()=>{
 const input=inputs(),rows=auditMissingSources(input);
 assert.equal(rows.length,7);
 assert.equal(rows.reduce((n,r)=>n+r.counts.analysisCombinations,0),823);
 assert.deepEqual(rows.map(r=>r.counts.analysisCombinations),[778,10,10,10,5,5,5]);
 for(const row of rows){
  assert.equal(row.planId,null);assert.equal(row.planHash,null);
  assert.equal(row.confirmed,false);assert.equal(row.executed,false);assert.equal(row.approvalReady,false);
  assert.match(row.workbook.sha256,/^[a-f0-9]{64}$/);
  assert.equal(row.workbook.sourceCommit,EXCEL_COMMIT);
  assert.ok(row.differences.some(d=>d.code==='native_source_missing'));
 }
 assert.equal(input.workbooks[0].cachedFormulaValuesAvailable,false);
});

test('altered extraction pin, missing Excel and later source handoff fail closed',()=>{
 assert.throws(()=>readPinned(inputFile,'0'.repeat(64)),code('input_hash'));
 const absent=inputs();absent.workbooks.pop();assert.throws(()=>auditMissingSources(absent),code('excel_scope'));
 const added=inputs();added.workbooks[0].nativeSourceRevision=1;
 assert.throws(()=>auditMissingSources(added),code('source_handoff_changed'));
});

test('native ProductGroupTemplate plan binds exact Excel SHA without confirm, execution or new output product',t=>{
 // Isolated, explicitly synthetic in-memory source. This is only a helper
 // regression; no identity or plan from this test enters the real audit.
 const repository=createProductRepository({filename:':memory:',validateDocument:validateProductDocument});
 const family=JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json',import.meta.url)));
 family.sizes=family.sizes.slice(0,1);
 const source=repository.create(makeProductDocument(familyProductConfig(family,family.sizes[0],1),{name:'SYNTHETIC issue230 helper regression only'}));
 const targets=[{key:'synthetic-only',productId:source.id,familyId:family.id,sizeKey:family.sizes[0].key}];
 const groups=createProductGroupTemplates({filename:':memory:',repository,targets:()=>targets,offeringFor:()=>({familyIds:[family.id],fingerprint:'synthetic-only'})});
 t.after(()=>{groups.close();repository.close();});
 const template=groups.create(groups.draft({name:'SYNTHETIC TEST ONLY',scope:{lineId:'test',subcategoryId:'test'},sourceKeys:['synthetic-only']}));
 let forbidden=0;
 const planOnly={get:groups.get,plan:groups.plan,getPlan:groups.getPlan,confirm:()=>{forbidden++;throw Error('forbidden');},execute:()=>{forbidden++;throw Error('forbidden');}};
 const excel={sourceCommit:EXCEL_COMMIT,workbookSha256:'a'.repeat(64),workbookPath:'synthetic-not-an-actual-workbook.xlsx'};
 const request={groups:planOnly,templateId:template.id,templateRevision:template.revision,product:{key:'test-one',targetKey:'synthetic-only',name:'SYNTHETIC planned product'},excel};
 const first=planExistingTemplate(request);
 assert.equal(first.plan.valid,true,JSON.stringify(first.plan.issues));
 assert.equal(first.plan.creationKey,'issue230-'+excel.workbookSha256);
 assert.equal(first.planId,groups.getPlan(first.planId).id);
 assert.equal(first.planHash,groups.getPlan(first.planId).planHash);
 assert.equal(first.confirmed,false);assert.equal(first.executed,false);assert.equal(forbidden,0);
 assert.equal(repository.list().length,1,'only the synthetic test source exists');
 const next=planExistingTemplate({...request,excel:{...excel,workbookSha256:'b'.repeat(64)}});
 assert.notEqual(next.planHash,first.planHash,'another Excel version needs its own exact plan');
 assert.equal(repository.list().length,1);
});

test('missing source/template and fabricated plan readback cannot be presented as real plan',()=>{
 const excel={sourceCommit:EXCEL_COMMIT,workbookSha256:'a'.repeat(64),workbookPath:'synthetic.xlsx'};
 assert.throws(()=>planExistingTemplate({excel}),code('template_missing'));
 assert.throws(()=>planExistingTemplate({excel,templateId:'pgt_test',templateRevision:1}),code('source_service_missing'));
 const groups={get:()=>({revision:1,document:{schema:'gravuru-product-group-template/v1'}}),plan:()=>({id:'pgp_test',schema:'gravuru-product-group-creation-plan/v1',planHash:'a'.repeat(64),localOnly:true,shopifyWrites:0}),getPlan:()=>({planHash:'b'.repeat(64)})};
 assert.throws(()=>planExistingTemplate({excel,groups,templateId:'pgt_test',templateRevision:1,product:{}}),code('plan_readback'));
});
