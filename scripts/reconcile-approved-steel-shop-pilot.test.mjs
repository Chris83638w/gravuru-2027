import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {nativeDesignReviewFingerprint} from './lib/design-review-approvals.mjs';
import {rendererSignature} from './lib/slate-review-approval-targets.mjs';
import {STEEL_PILOT,prepareApprovedSteelShopPilot,importApprovedSteelShopPilot} from './prepare-approved-steel-shop-pilot.mjs';
import {run,CONNECTOR_LOOKUP,MAX_EVIDENCE_AGE_MS,verifyConnectorEvidence} from './reconcile-approved-steel-shop-pilot.mjs';

const now=Date.parse('2026-11-07T12:00:00.000Z'),clock=()=>now,rendererVersion=rendererSignature();
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'reconcile-steel-pilot-')),filename=path.join(root,'workshop.sqlite');
  const family=JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json',import.meta.url),'utf8'));
  const config=familyProductConfig(family,family.sizes.find(s=>s.key===STEEL_PILOT.sizeKey),1),template=structuredClone(config.profile.designs[0]);
  config.productExecution={schema:'gravuru-product-execution/v1',kind:'door-sign',sourceFamilyId:family.id};
  config.profile.designs=STEEL_PILOT.originals.map((id,i)=>({...structuredClone(template),id:'katalog-'+id,name:id,katalog:{originalId:id,designId:id,target:{familyId:family.id}},objects:template.objects.map(o=>({...o,...(o.type==='text'?{text:'Gesicherter Name '+i}:{})}))}));
  config.profile.defaultDesignId=config.profile.designs[0].id;
  const repository=createProductRepository({filename,validateDocument:validateProductDocument}),source=repository.create(makeProductDocument(config));
  const approvals=Object.fromEntries(STEEL_PILOT.originals.map(id=>{
    const key=JSON.stringify(['steel',id,STEEL_PILOT.sizeKey]),designId='katalog-'+id,fingerprint=nativeDesignReviewFingerprint({document:source.document,designId,rendererVersion});
    return [key,{key,approved:true,status:'approved',revision:1,fingerprint,approvedFingerprint:fingerprint,updatedAt:'2026-11-07T11:59:00.000Z',actor:'fixture-private-review',metadata:{key,id,designId,productId:source.id,productRevision:source.revision,materialKey:'steel',materialKind:'steel',familyId:family.id,sizeKey:STEEL_PILOT.sizeKey,mm:[50,20]}}];
  }));
  const bundle={schema:STEEL_PILOT.sourceSchema,checkedAtUtc:new Date(now).toISOString(),source,approvals},plan=prepareApprovedSteelShopPilot(bundle);
  const saved=importApprovedSteelShopPilot(plan,{repository,currentBundle:()=>bundle});
  const native={plan,...saved,createdRecord:repository.get(saved.productId),shopDraftRequest:saved.shopRequest},request=native.shopDraftRequest;
  const nativeFile=path.join(root,'native.json');fs.writeFileSync(nativeFile,JSON.stringify(native));
  const db=new DatabaseSync(filename),before=JSON.stringify(db.prepare('SELECT * FROM product_revisions ORDER BY product_id,revision').all());
  const table=name=>db.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=?').get('table',name);
  const rows=name=>table(name)?db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all():[];
  const evidence=(nodes=[])=>({checkedAtUtc:new Date(now).toISOString(),data:{shop:{id:'gid://shopify/Shop/777',myshopifyDomain:STEEL_PILOT.shopDomain,currencyCode:'EUR'},products:{nodes,pageInfo:{hasNextPage:false}}}});
  const remote=()=>({id:'gid://shopify/Product/901',handle:request.handle,title:request.input.title,status:'DRAFT',publishedAt:null,onlineStoreUrl:null,tags:[...request.input.tags],seo:{...request.input.seo},variants:{pageInfo:{hasNextPage:false},nodes:request.input.variants.map((v,i)=>({id:'gid://shopify/ProductVariant/'+(1001+i),price:v.price,selectedOptions:v.optionValues.map(o=>({name:o.optionName,value:o.name}))}))}});
  let counter=0;
  async function command(action,readback=evidence(),extra=[]){
    const id=++counter,evidenceFile=path.join(root,'evidence-'+id+'.json'),out=path.join(root,'report-'+id+'.json');fs.writeFileSync(evidenceFile,JSON.stringify(readback));
    const summary=await run(['--native',nativeFile,'--db',filename,'--action',action,'--evidence',evidenceFile,'--out',out,...extra],{clock});
    return {summary,report:JSON.parse(fs.readFileSync(out,'utf8')),out};
  }
  t.after(()=>{
    assert.equal(JSON.stringify(db.prepare('SELECT * FROM product_revisions ORDER BY product_id,revision').all()),before,'all native revisions unchanged');
    assert.equal(rows('catalog_live_order_approvals').length,0,'no live-order approvals');
    assert.equal(rows('doorbell_live_order_approvals').length,0,'no other live-order approvals');
    db.close();repository.close();
    assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert(path.basename(root).startsWith('reconcile-steel-pilot-'));fs.rmSync(root,{recursive:true,force:true});
  });
  return {root,filename,repository,db,native,request,nativeFile,evidence,remote,command,rows,table};
}

test('claim records one intent only; retry never permits a second product creation',async t=>{
  const f=fixture(t),first=await f.command('claim'),again=await f.command('claim');
  assert.equal(first.summary.claimed,true);assert.equal(first.summary.mayCreateDraft,true);assert.equal(first.summary.state,'started');
  assert.equal(again.summary.claimed,false);assert.equal(again.summary.mayCreateDraft,false);assert.equal(again.report.nextAction,'fresh-reconcile-only');
  assert.equal(f.rows('shop_draft_transfers').length,1);assert.equal(f.rows('form_shop_bindings').length,0);
  assert.equal(first.summary.networkRequests,0);assert.equal(first.summary.shopifyWrites,0);
  assert.match(CONNECTOR_LOOKUP,/shop \{ id myshopifyDomain currencyCode/);
  assert.match(CONNECTOR_LOOKUP,/variants\(first: 50\)/);assert.match(CONNECTOR_LOOKUP,/publishedAt onlineStoreUrl/);
});

test('fresh reconcile uses existing transfer service, binds all exact variants and repeats without extra rows',async t=>{
  const f=fixture(t);await f.command('claim');
  const result=await f.command('reconcile',f.evidence([f.remote()]));
  assert.equal(result.summary.state,'completed');assert.equal(result.summary.standardBindings,5);assert.equal(result.summary.idBindings,0);assert.equal(result.report.idBindingsRequested,false);
  const stored=f.rows('form_shop_bindings'),journal=f.rows('shop_draft_transfers');
  assert.deepEqual(stored.map(r=>r.unit_cents),[899,1198,1298,1148,1168]);
  assert(stored.every(r=>r.product_id===f.native.createdRecord.id&&r.product_revision===1));
  const again=await f.command('reconcile',f.evidence([f.remote()]));
  assert.equal(again.summary.mayCreateDraft,false);assert.deepEqual(f.rows('form_shop_bindings'),stored);assert.deepEqual(f.rows('shop_draft_transfers'),journal);
  assert(!f.table('shop_product_binding_heads'),'no ID registry without explicit store');
  await assert.rejects(f.command('claim'),/Abgeschlossener/);
});

test('explicit store persists five draft ID assignments through existing check/apply; repeat is idempotent',async t=>{
  const f=fixture(t);await f.command('claim');
  const result=await f.command('reconcile',f.evidence([f.remote()]),['--store-id','fixture-pilot-store']);
  assert.equal(result.summary.standardBindings,5);assert.equal(result.summary.idBindings,5);
  const [block]=result.report.idBindings;assert.equal(block.createdBindings,0);assert.equal(block.changedAssignments,5);
  assert(block.assignments.every(a=>a.productId===f.native.createdRecord.id&&a.productRevision===1&&a.productionStatus==='profile-assignment-pending'));
  const again=await f.command('reconcile',f.evidence([f.remote()]),['--store-id','fixture-pilot-store']);
  assert.equal(again.report.idBindings[0].createdBindings,0);assert.equal(again.report.idBindings[0].changedAssignments,0);
  assert.deepEqual(again.report.idBindings[0].assignments,block.assignments);
});

test('stale, future, wrong-shop, incomplete or errored evidence fails before journal initialization',async t=>{
  const f=fixture(t),mutations=[
    e=>e.checkedAtUtc=new Date(now-MAX_EVIDENCE_AGE_MS-1).toISOString(),e=>e.checkedAtUtc=new Date(now+1).toISOString(),e=>e.checkedAtUtc='invalid',
    e=>e.data.shop.myshopifyDomain='other.myshopify.com',e=>e.data.shop.currencyCode='USD',e=>e.data.shop.id='not-a-shop-id',
    e=>e.data.products.pageInfo.hasNextPage=true,e=>e.errors=[{message:'private upstream detail'}],e=>delete e.data.shop
  ];
  for(const mutate of mutations){const e=f.evidence();mutate(e);await assert.rejects(f.command('claim',e));}
  assert(!f.table('shop_draft_transfers'));assert(!f.table('form_shop_bindings'));
});

test('existing handle, duplicate products, missing claimed intent and empty reconcile cannot create anything',async t=>{
  const f=fixture(t);
  await assert.rejects(f.command('claim',f.evidence([f.remote()])),/null Treffer/);
  await assert.rejects(f.command('reconcile',f.evidence([f.remote()])),/Schreibabsicht/);
  assert.equal(f.rows('shop_draft_transfers').length,0);
  await f.command('claim');const before=f.rows('shop_draft_transfers');
  await assert.rejects(f.command('reconcile',f.evidence()),/genau einen/);
  await assert.rejects(f.command('reconcile',f.evidence([f.remote(),f.remote()])),/genau einen/);
  assert.deepEqual(f.rows('shop_draft_transfers'),before);assert.equal(f.rows('form_shop_bindings').length,0);
});

test('ACTIVE, incorrect handle/title/tag/SEO/price/options and incomplete variants never complete a claim',async t=>{
  const f=fixture(t);await f.command('claim');const before=f.rows('shop_draft_transfers');
  const mutations=[p=>p.status='ACTIVE',p=>p.status='ARCHIVED',p=>p.handle+='x',p=>p.title+='x',p=>p.tags=[],p=>p.seo.title+='x',p=>p.variants.pageInfo.hasNextPage=true,
    p=>p.publishedAt='2026-11-07T11:59:00Z',p=>p.onlineStoreUrl='https://example.invalid/product',p=>delete p.publishedAt,p=>delete p.onlineStoreUrl,
    p=>p.variants.nodes.pop(),p=>p.variants.nodes[0].price='0.01',p=>p.variants.nodes[0].selectedOptions[0].value='Other',p=>p.variants.nodes[1].id=p.variants.nodes[0].id];
  for(const mutate of mutations){const product=f.remote();mutate(product);await assert.rejects(f.command('reconcile',f.evidence([product])));}
  assert.deepEqual(f.rows('shop_draft_transfers'),before);assert.equal(f.rows('form_shop_bindings').length,0);
});

test('completed replay still checks current remote status and exact product/variant identity',async t=>{
  const f=fixture(t);await f.command('claim');await f.command('reconcile',f.evidence([f.remote()]));
  const before=f.rows('shop_draft_transfers'),bindings=f.rows('form_shop_bindings');
  for(const mutate of [p=>p.status='ACTIVE',p=>p.id='gid://shopify/Product/902',p=>p.variants.nodes[0].id='gid://shopify/ProductVariant/9999']){
    const product=f.remote();mutate(product);await assert.rejects(f.command('reconcile',f.evidence([product])));
  }
  assert.deepEqual(f.rows('shop_draft_transfers'),before);assert.deepEqual(f.rows('form_shop_bindings'),bindings);
});

test('tampered native export, request or wrong actual DB is rejected read-only',async t=>{
  const f=fixture(t);
  for(const mutate of [n=>n.createdRecord.document.name+='x',n=>n.shopDraftRequest.input.variants[0].price='0.01',n=>n.createdRecord.id=f.native.plan.source.productId,n=>n.plan.document.name+='x']){
    const native=structuredClone(f.native);mutate(native);fs.writeFileSync(f.nativeFile,JSON.stringify(native));await assert.rejects(f.command('claim'));
  }
  assert(!f.table('shop_draft_transfers'));assert(!f.table('form_shop_bindings'));
});

test('existing report is not overwritten and no claim is made; unknown action/store ID fail before write',async t=>{
  const f=fixture(t),evidenceFile=path.join(f.root,'input.json'),out=path.join(f.root,'existing.json');fs.writeFileSync(evidenceFile,JSON.stringify(f.evidence()));fs.writeFileSync(out,'preserved');
  await assert.rejects(run(['--native',f.nativeFile,'--db',f.filename,'--action','claim','--evidence',evidenceFile,'--out',out],{clock}),/existiert/);
  assert.equal(fs.readFileSync(out,'utf8'),'preserved');assert(!f.table('shop_draft_transfers'));
  await assert.rejects(f.command('create'),/claim oder reconcile/);
  await assert.rejects(f.command('claim',f.evidence(),['--store-id','invalid/path']),/Store-Kennung/);
  assert(!f.table('shop_draft_transfers'));
});

test('connector timestamp is not replaced by local parse/check time',t=>{
  const f=fixture(t),e=f.evidence();
  assert.equal(verifyConnectorEvidence(e,f.request,{clock:()=>now+60000,action:'claim'}),null);
  assert.throws(()=>verifyConnectorEvidence(e,f.request,{clock:()=>now+60001,action:'claim'}),/60 Sekunden/);
});
