import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';import {DatabaseSync} from 'node:sqlite';
import {MAIN_POLICY,sha256,digest,documentPins,guardedMetadataSnapshot,captureUpdateObservation,prepareUpdateReview,makeApprovalEvidence,executeApprovedUpdate,verifyUpdateReview,writeNewJson} from './update-review.mjs';
const code=process.env.GRAVURU_UPDATE_TEST_CODE_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const imp=p=>import(pathToFileURL(path.join(code,p)));
const {createProductRepository}=await imp('app/workshop/repository.mjs');
const {makeAcrylicConfig}=await imp('app/configurator/variant-m/acrylic-product.mjs');
const {makeProductDocument,validateProductDocument}=await imp('app/workshop/product-model.mjs');
const {measureText}=await imp('app/platform/sources/app/shared/models/doorbell-preview.mjs');
const resources=JSON.parse(fs.readFileSync(path.join(code,'app/designs/acrylic-unser-anfang/resources.json')));
const cfg=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
for(const o of cfg.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
const source=makeProductDocument(cfg,{name:'Synthetic native copy source'}),target=validateProductDocument({...structuredClone(source),name:'Synthetic reviewed update'});
const H='a'.repeat(64),evidence={categoryComparisonSha256:H,categoryComparisonPassed:true,nativeValidatorContract:'native-product+resources+assets+manufacturing',nativeValidatorSourceSha256:H};
// Synthetic pins/acceptance exercise controls, never claim real operator evidence.
const original={excelFile:'synthetic-v9.xlsx',excelSha256:H,v9PlanId:'pgp_synthetic',v9PlanHash:H};
const excel=Buffer.from('synthetic final Excel appendix');
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-update-review-')),seed=path.join(dir,'seed.sqlite'),copy=path.join(dir,'workshop.copy.sqlite');
 const meta={profiles:{selections:{fonts:null,motifs:null,colors:null,bestsellers:null},sources:{},settingsRevision:1},productionProfile:null};
 const seedRepo=createProductRepository({filename:seed,tenantId:'gravuru',validateDocument:validateProductDocument,snapshotMetadata:()=>structuredClone(meta)});
 const current=seedRepo.create(source),other=seedRepo.create({...structuredClone(source),name:'Do not modify'});seedRepo.close();
 const db=new DatabaseSync(seed);db.exec('CREATE TABLE unrelated_probe(id INTEGER PRIMARY KEY,note TEXT); INSERT INTO unrelated_probe VALUES(1,\'unchanged\');');db.close();
 const seedSha=sha256(fs.readFileSync(seed));fs.copyFileSync(seed,copy);
 const state={nativeCalls:0,driftAt:Infinity,resourcesChanged:false,validationChanged:false};
 const pins={categoryIds:[],categoryAssignments:[],settings:{revision:1,sha256:H},profiles:[],resolutionSha256:digest(meta.profiles),productionProfile:null};
 const readResourcePins=()=>({...structuredClone(pins),settings:{revision:state.resourcesChanged?2:1,sha256:H}});
 const snapshot=guardedMetadataSnapshot(()=>{state.nativeCalls++;return state.nativeCalls>=state.driftAt?{...meta,unexpected:true}:structuredClone(meta);},readResourcePins);
 const repo=createProductRepository({filename:copy,tenantId:'gravuru',validateDocument:d=>{const v=validateProductDocument(d);if(state.validationChanged)v.name+=' drift';return v;},snapshotMetadata:snapshot});
 t.after(()=>{repo.close();assert.equal(sha256(fs.readFileSync(seed)),seedSha,'untouched source database');const absolute=fs.realpathSync(dir);assert.ok(absolute.startsWith(fs.realpathSync(os.tmpdir())+path.sep));fs.rmSync(absolute,{recursive:true,force:true});});
 const policy={...MAIN_POLICY,productId:current.id,importKey:'synthetic-copy-update',expectedPreimageBindingSha256:documentPins(source).idBindingSha256,targetProductGroupSha256:documentPins(target).productGroupSha256,targetBindingSha256:documentPins(target).idBindingSha256};
 const context={repository:repo,metadataSnapshot:snapshot,readResourcePins};
 const observation=captureUpdateObservation(context,target,{evidence,policy});const review=prepareUpdateReview({target,observation,origin:original},{policy});
 const approval=makeApprovalEvidence({review,acceptedReviewHash:review.reviewHash,excelAddendum:{file:'synthetic-appendix.xlsx',sha256:sha256(excel)},decision:{accepted:true,actor:'SYNTHETIC TEST ONLY',quote:'SYNTHETIC explicit acceptance',source:'synthetic fixture; no user authorization',recordedAt:new Date().toISOString()}},target,{policy});
 const run=overrides=>executeApprovedUpdate(context,{review,approval,target,excelAddendumBytes:excel,execute:true,...overrides},{policy});
 const counts=()=>{const d=new DatabaseSync(copy,{readOnly:true});try{return {revisions:d.prepare('SELECT COUNT(*) AS n FROM product_revisions').get().n,imports:d.prepare('SELECT COUNT(*) AS n FROM import_items').get().n,foreign:d.prepare('SELECT note FROM unrelated_probe WHERE id=1').get().note};}finally{d.close();}};
 return {dir,repo,state,policy,context,observation,review,approval,run,counts,otherId:other.id,seedSha};
}
const codeIs=c=>e=>e.code===c;
test('native copied repository: one update, exact readback, same identity, untouched source and foreign product, idempotent replay',t=>{
 const f=fixture(t),other=f.repo.get(f.otherId),before=f.counts();
 const receipt=f.run();assert.equal(receipt.replayed,false);assert.equal(receipt.newRevisions,1);assert.equal(receipt.createdProducts,0);assert.equal(receipt.productId,f.policy.productId);assert.equal(receipt.revision,2);
 assert.deepEqual(f.repo.get(f.otherId),other);assert.deepEqual(f.counts(),{...before,revisions:before.revisions+1,imports:before.imports+1});
 assert.equal(documentPins(f.repo.get(f.policy.productId,{revision:1}).document).idBindingSha256,f.policy.expectedPreimageBindingSha256);
 const after=f.counts(),again=f.run();assert.equal(again.replayed,true);assert.equal(again.newRevisions,0);assert.deepEqual(f.counts(),after);assert.equal(again.reviewHash,receipt.reviewHash);
 if(process.env.GRAVURU_UPDATE_PILOT_PROOF)fs.writeFileSync(process.env.GRAVURU_UPDATE_PILOT_PROOF,JSON.stringify({syntheticNativeCopyPilot:true,realOperatorDatabaseOpened:false,realTargetExecuted:false,fixturePreimageDatabaseSha256:f.seedSha,syntheticReviewHash:f.review.reviewHash,firstExecution:receipt,secondExecution:again,sourceDatabaseUnchangedCheckedOnCleanup:true,otherProductUnchanged:true,before,after,afterReplay:f.counts(),limits:['Synthetic native product and resource evidence; not a live/customer/real-copy acceptance.','Native repository and native product validator are used; operator full resource/asset/manufacturing validation remains required.']},null,2)+'\n',{flag:'wx'});
});
test('no explicit execute, different Excel, tampered target/review/approval all reject before any writes',t=>{
 const f=fixture(t),before=f.counts();
 assert.throws(()=>f.run({execute:false}),codeIs('execute_not_explicit'));
 assert.throws(()=>f.run({excelAddendumBytes:Buffer.from('different')}),codeIs('excel_changed'));
 assert.throws(()=>f.run({target:{...target,name:'changed'}}),codeIs('target_changed'));
 assert.throws(()=>f.run({review:{...f.review,reviewHash:'b'.repeat(64)}}),codeIs('review_changed'));
 assert.throws(()=>f.run({approval:{...f.approval,decision:{...f.approval.decision,quote:'altered'}}}),codeIs('approval_changed'));
 assert.deepEqual(f.counts(),before);
});
test('changed actual head rejects without replacing unrelated work',t=>{
 const f=fixture(t);f.repo.save(f.policy.productId,{...source,name:'Concurrent preserved edit'},1);const before=f.counts();
 assert.throws(()=>f.run(),codeIs('head_changed'));assert.deepEqual(f.counts(),before);assert.equal(f.repo.get(f.policy.productId).document.name,'Concurrent preserved edit');
});
test('resource drift and native validator drift reject without a new revision',t=>{
 const f=fixture(t),before=f.counts();f.state.resourcesChanged=true;assert.throws(()=>f.run(),codeIs('snapshot_resources_changed'));f.state.resourcesChanged=false;
 f.state.validationChanged=true;assert.throws(()=>f.run(),codeIs('validation_changed_document'));assert.deepEqual(f.counts(),before);
});
test('metadata changes at actual snapshot insertion roll back native import and journal',t=>{
 const f=fixture(t),before=f.counts();f.state.driftAt=f.state.nativeCalls+3;
 assert.throws(()=>f.run(),e=>e.code==='invalid_snapshot_metadata'&&e.message==='snapshot_metadata_changed');assert.deepEqual(f.counts(),before);assert.equal(f.repo.head(f.policy.productId).revision,1);assert.equal(f.repo.importItem(f.policy.importKey),null);
});
test('missing guarded metadata wiring is detected before import',t=>{
 const f=fixture(t),before=f.counts();f.context.metadataSnapshot=guardedMetadataSnapshot(()=>({}),()=>({}));assert.throws(()=>f.run(),codeIs('metadata_guard_not_wired'));assert.deepEqual(f.counts(),before);
});
test('incomplete category evidence cannot become review; existing frozen evidence files cannot be overwritten',t=>{
 const f=fixture(t);assert.throws(()=>prepareUpdateReview({target,observation:{...f.observation,evidence:{...evidence,categoryComparisonPassed:false}},origin:original},{policy:f.policy}),codeIs('category_evidence_missing'));
 assert.throws(()=>makeApprovalEvidence({review:f.review,acceptedReviewHash:'b'.repeat(64),excelAddendum:{file:'x',sha256:H},decision:f.approval.decision},target,{policy:f.policy}),codeIs('accept_exact_review'));
 const output=path.join(f.dir,'immutable-review.json');writeNewJson(output,f.review);const before=fs.readFileSync(output);assert.throws(()=>writeNewJson(output,{changed:true}),/EEXIST/);assert.deepEqual(fs.readFileSync(output),before);verifyUpdateReview(JSON.parse(before),target,{policy:f.policy});
});
test('replay after a later edit is a conflict, not false success',t=>{
 const f=fixture(t);f.run();f.repo.save(f.policy.productId,{...target,name:'Later preserved edit'},2);const before=f.counts();assert.throws(()=>f.run(),codeIs('replay_head_changed'));assert.deepEqual(f.counts(),before);
});
test('same one-time key with another fingerprint is a conflict, never an inferred approval',t=>{
 const f=fixture(t);f.repo.importBatch([{key:f.policy.importKey,fingerprint:'b'.repeat(64),action:'update',productId:f.policy.productId,expectedRevision:1,document:target}]);const before=f.counts();
 assert.throws(()=>f.run(),codeIs('journal_conflict'));assert.deepEqual(f.counts(),before);
});
