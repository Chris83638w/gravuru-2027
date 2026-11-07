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
import {STEEL_PILOT,prepareApprovedSteelShopPilot,importApprovedSteelShopPilot,importApprovedSteelShopPilotWithApprovalReservation,verifyApprovedSteelPilotReadback,run} from './prepare-approved-steel-shop-pilot.mjs';

const rendererVersion=rendererSignature();
function fixture(t,{extra=false}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'approved-steel-pilot-'));
  const filename=path.join(root,'workshop.sqlite'),family=JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json',import.meta.url)));
  const config=familyProductConfig(family,family.sizes.find(s=>s.key===STEEL_PILOT.sizeKey),1),template=structuredClone(config.profile.designs[0]);
  config.productExecution={schema:'gravuru-product-execution/v1',kind:'door-sign',sourceFamilyId:family.id};
  const ids=[...STEEL_PILOT.originals,...(extra?['OTHER-UNAPPROVED']:[])];
  config.profile.designs=ids.map((id,i)=>({...structuredClone(template),id:'katalog-'+id,name:id,katalog:{originalId:id,designId:id,target:{familyId:family.id}},objects:template.objects.map(o=>({...o,...(o.type==='text'?{text:'Erhaltener Name '+i}:{})}))}));
  config.profile.defaultDesignId=config.profile.designs[0].id;
  const document=makeProductDocument(config),repository=createProductRepository({filename,validateDocument:validateProductDocument});
  const source=repository.create(document);t.after(()=>{repository.close();assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert(path.basename(root).startsWith('approved-steel-pilot-'));fs.rmSync(root,{recursive:true,force:true});});
  const approvals=Object.fromEntries(STEEL_PILOT.originals.map(id=>{
    const key=JSON.stringify(['steel',id,STEEL_PILOT.sizeKey]),designId='katalog-'+id,fingerprint=nativeDesignReviewFingerprint({document:source.document,designId,rendererVersion});
    return [key,{key,approved:true,status:'approved',revision:1,fingerprint,approvedFingerprint:fingerprint,updatedAt:'2026-11-07T09:00:00.000Z',actor:'private-review-session',metadata:{key,id,designId,productId:source.id,productRevision:source.revision,materialKey:'steel',materialKind:'steel',familyId:family.id,sizeKey:STEEL_PILOT.sizeKey,mm:[50,20]}}];
  }));
  return {root,filename,repository,bundle:{schema:STEEL_PILOT.sourceSchema,checkedAtUtc:'2026-11-07T09:01:00.000Z',source,approvals}};
}

test('pilot keeps exact selected native designs, rights, resources and all five source-priced mountings',t=>{
  const f=fixture(t,{extra:true}),before=structuredClone(f.bundle),plan=prepareApprovedSteelShopPilot(f.bundle);
  assert.deepEqual(f.bundle,before);assert.equal(plan.source.designCount,5);assert.deepEqual(plan.excludedDesignIds,['katalog-OTHER-UNAPPROVED']);
  assert.equal(plan.document.name,STEEL_PILOT.name);assert.equal(plan.document.config.reviewOnly,true);assert.equal(plan.document.config.profile.features.orderEnabled,false);
  assert.deepEqual(plan.document.config.localResources,f.bundle.source.document.config.localResources);
  for(const d of plan.document.config.profile.designs){assert.deepEqual(d,f.bundle.source.document.config.profile.designs.find(s=>s.id===d.id));assert.deepEqual(plan.document.elementRights[d.id],f.bundle.source.document.elementRights[d.id]);}
  assert.equal(Object.keys(plan.document.elementRights).length,4);assert.equal(plan.variants.length,5);
  assert.deepEqual(plan.variants.map(v=>v.priceCents),[899,1198,1298,1148,1168]);
  assert.equal(plan.shopPreview.input.status,'DRAFT');assert.equal(plan.shopPreview.requiresNativeImport,true);assert.equal(plan.shopPreview.input.handle,undefined);assert.equal(plan.shopPreview.input.metafields,undefined);
});

test('missing, revoked, stale or misidentified approvals and changed native resources fail closed',t=>{
  const f=fixture(t),key=Object.keys(f.bundle.approvals)[0];
  const mutations=[b=>delete b.approvals[key],b=>b.approvals[key].approved=false,b=>b.approvals[key].status='changed',b=>b.approvals[key].metadata.productRevision++,b=>b.approvals[key].metadata.materialKey='acrylic',b=>b.approvals[key].metadata.sizeKey='other',b=>b.approvals[key].metadata.mm=[50,21],b=>b.source.document.config.profile.designs[0].objects.find(o=>o.type==='text').text+=' geändert',b=>b.source.document.config.materialSurface='data:image/svg+xml,changed'];
  for(const mutate of mutations){const b=structuredClone(f.bundle);mutate(b);assert.throws(()=>prepareApprovedSteelShopPilot(b));}
  assert.throws(()=>prepareApprovedSteelShopPilot(f.bundle,{rendererVersion:'different-renderer'}),/Renderer/);
});

test('guarded import creates an independent draft, complete readback and restart retry is a no-op',t=>{
  const f=fixture(t),plan=prepareApprovedSteelShopPilot(f.bundle),sourceBefore=f.repository.get(f.bundle.source.id);
  const options={repository:f.repository,currentBundle:()=>f.bundle};
  const first=importApprovedSteelShopPilot(plan,options);
  assert.equal(first.created,true);assert.notEqual(first.productId,sourceBefore.id);assert.equal(first.readbackComplete,true);assert.equal(first.shopRequest.input.status,'DRAFT');assert.equal(first.shopRequest.productId,first.productId);assert.equal(first.shopRequest.mappings.length,5);
  assert.deepEqual(f.repository.get(sourceBefore.id),sourceBefore);assert.equal(f.repository.history(sourceBefore.id).length,1);
  const reopened=createProductRepository({filename:f.filename,validateDocument:validateProductDocument});
  try{const again=importApprovedSteelShopPilot(plan,{...options,repository:reopened});assert.equal(again.created,false);assert.equal(again.productId,first.productId);assert.deepEqual(again.shopRequest,first.shopRequest);}finally{reopened.close();}
  const target=f.repository.get(first.productId),edited={...target.document,name:'Nutzerbearbeitung'};f.repository.save(target.id,edited,target.revision);
  assert.throws(()=>importApprovedSteelShopPilot(plan,options),/zurückgelesene/);assert.equal(f.repository.get(target.id).document.name,'Nutzerbearbeitung');
  assert.throws(()=>verifyApprovedSteelPilotReadback(plan,sourceBefore),/zurückgelesene/);
});

test('fresh source and approval are rechecked under import write guard before any target creation',t=>{
  const f=fixture(t),plan=prepareApprovedSteelShopPilot(f.bundle);let calls=0;
  const stale=structuredClone(f.bundle);Object.values(stale.approvals)[0].revision++;
  assert.throws(()=>importApprovedSteelShopPilot(plan,{repository:f.repository,currentBundle:()=>++calls===1?f.bundle:stale}),/inzwischen/);
  assert.equal(calls,2);assert.equal(f.repository.importItem(plan.importKey),null);assert.equal(f.repository.list().length,1);
  const tampered=structuredClone(plan);tampered.document.name='Anders';assert.throws(()=>importApprovedSteelShopPilot(tampered,{repository:f.repository,currentBundle:()=>f.bundle}),/verändert/);
});

for(const abort of [false,true])test('approval reservation blocks a second revocation connection until '+(abort?'native rollback':'native commit and readback'),t=>{
  const f=fixture(t),plan=prepareApprovedSteelShopPilot(f.bundle),filename=path.join(f.root,'review-approvals.sqlite');
  const approvals=new DatabaseSync(filename);let concurrent;
  try{
    approvals.exec('CREATE TABLE design_review_approval_events(target_key TEXT,revision INTEGER,approved INTEGER,fingerprint TEXT,actor TEXT,created_at TEXT)');
    const insert=approvals.prepare('INSERT INTO design_review_approval_events VALUES(?,?,?,?,?,?)');
    for(const a of Object.values(f.bundle.approvals))insert.run(a.key,a.revision,1,a.fingerprint,a.actor,a.updatedAt);
    const events=approvals.prepare('SELECT * FROM design_review_approval_events ORDER BY target_key,revision').all(),bytes=fs.readFileSync(filename);
    concurrent=new DatabaseSync(filename);concurrent.exec('PRAGMA busy_timeout=0');
    const first=Object.values(f.bundle.approvals)[0],revoke=()=>concurrent.prepare('INSERT INTO design_review_approval_events VALUES(?,?,?,?,?,?)').run(first.key,2,0,null,first.actor,'2026-11-07T09:02:00.000Z');
    let blockedInsideGuard=false,blockedAfterCommit=false;
    const repository={...f.repository,importBatch(entries,options){
      const saved=f.repository.importBatch(entries,{beforeWrite(){
        options.beforeWrite();
        assert.throws(revoke,/database is locked/);blockedInsideGuard=true;
        if(abort)throw Error('synthetic native import failure');
      }});
      assert.throws(revoke,/database is locked/);blockedAfterCommit=true;
      return saved;
    }};
    const perform=()=>importApprovedSteelShopPilotWithApprovalReservation(plan,{bundle:f.bundle,repository,approvalDb:approvals});
    if(abort){assert.throws(perform,/synthetic native import failure/);assert.equal(f.repository.importItem(plan.importKey),null);assert.equal(f.repository.list().length,1);}
    else{const result=perform();assert.equal(result.readbackComplete,true);assert.equal(result.created,true);assert.equal(f.repository.get(result.productId).status,'draft');}
    assert.equal(blockedInsideGuard,true);assert.equal(blockedAfterCommit,!abort);
    assert.deepEqual(approvals.prepare('SELECT * FROM design_review_approval_events ORDER BY target_key,revision').all(),events);
    assert.deepEqual(fs.readFileSync(filename),bytes,'reservation never changes approval database contents');
    assert.doesNotThrow(revoke,'reservation released after success or error');
    assert.equal(concurrent.prepare('SELECT approved FROM design_review_approval_events WHERE target_key=? ORDER BY revision DESC LIMIT 1').get(first.key).approved,0);
  }finally{concurrent?.close();approvals.close();}
});

test('CLI imports only with exact plan confirmation, reads persisted approvals and emits full private readback',t=>{
  const f=fixture(t),sourceFile=path.join(f.root,'source.json'),out=path.join(f.root,'plan.json');fs.writeFileSync(sourceFile,JSON.stringify(f.bundle));
  const prepared=run(['--source',sourceFile,'--out',out]);assert.equal(prepared.readbackComplete,false);
  assert.throws(()=>run(['--source',sourceFile,'--out',path.join(f.root,'bad.json'),'--db',f.filename,'--confirm','wrong']),/Bestätigung/);
  const approvalsDb=new DatabaseSync(path.join(f.root,'review-approvals.sqlite'));
  approvalsDb.exec('CREATE TABLE design_review_approval_events(target_key TEXT,revision INTEGER,approved INTEGER,fingerprint TEXT,actor TEXT,created_at TEXT)');
  const insert=approvalsDb.prepare('INSERT INTO design_review_approval_events VALUES(?,?,?,?,?,?)');
  for(const a of Object.values(f.bundle.approvals))insert.run(a.key,a.revision,1,a.fingerprint,a.actor,a.updatedAt);
  const savedFile=path.join(f.root,'saved.json'),saved=run(['--source',sourceFile,'--out',savedFile,'--db',f.filename,'--confirm',prepared.planSha256]);
  const result=JSON.parse(fs.readFileSync(savedFile));assert.equal(saved.created,true);assert.equal(result.createdRecord.id,saved.productId);assert.equal(result.createdRecord.status,'draft');assert.equal(result.createdRecord.publishedRevision,null);assert.equal(result.shopDraftRequest.productId,saved.productId);assert.equal(result.shopDraftRequest.input.status,'DRAFT');
  assert.throws(()=>run(['--source',sourceFile,'--out',savedFile]),/existiert/);
  const a=Object.values(f.bundle.approvals)[0];insert.run(a.key,2,0,null,a.actor,'2026-11-07T09:02:00.000Z');approvalsDb.close();
  assert.throws(()=>run(['--source',sourceFile,'--out',path.join(f.root,'revoked.json'),'--db',f.filename,'--confirm',prepared.planSha256]),/Freigabe/);
});
