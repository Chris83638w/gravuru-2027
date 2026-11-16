import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createNativeUpdateResourcePinReader} from './read-resource-pins.mjs';
import {MAIN_POLICY,digest,sha256,documentPins,guardedMetadataSnapshot,captureUpdateObservation,prepareUpdateReview,makeApprovalEvidence,executeApprovedUpdate} from '../issue230-main-update-review-20261111/update-review.mjs';
const code=process.env.GRAVURU_UPDATE_TEST_CODE_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const imp=p=>import(pathToFileURL(path.join(code,p)));
const {createProfileLibrary}=await imp('app/workshop/profile-library.mjs');
const {createProductionProfiles}=await imp('app/workshop/production-profiles.mjs');
const {createProductRepository}=await imp('app/workshop/repository.mjs');
const {createDesignAssetStore}=await imp('app/workshop/design-assets.mjs');
const {makeAcrylicConfig}=await imp('app/configurator/variant-m/acrylic-product.mjs');
const {makeProductDocument,validateProductDocument}=await imp('app/workshop/product-model.mjs');
const {productOverview}=await imp('app/workshop/product-preview.mjs');
const {measureText}=await imp('app/platform/sources/app/shared/models/doorbell-preview.mjs');
const types=['fonts','motifs','colors','bestsellers'],inherit=()=>({mode:'inherit',profileId:null}),override=p=>({mode:'override',profileId:p.id});
const H='a'.repeat(64),matches=code=>error=>error.code===code;
function nativeLibraries(t,catalog={fonts:['A','B'],motifs:['heart','flower']}){
 const profiles=createProfileLibrary({filename:':memory:',tenantId:'gravuru',catalog});
 const productionProfiles=createProductionProfiles({filename:':memory:',tenantId:'gravuru'});
 t.after(()=>{profiles.close();productionProfiles.close();});return {profiles,productionProfiles};
}
function fixture(t){
 const {profiles,productionProfiles}=nativeLibraries(t);
 const a=profiles.create({name:'Default',type:'fonts',items:['A']}),b=profiles.create({name:'Category',type:'fonts',items:['B']}),c=profiles.create({name:'Product',type:'fonts',items:['A','B']});
 const motifs=profiles.create({name:'Motifs',type:'motifs',items:['heart']}),best=profiles.create({name:'Bestsellers',type:'bestsellers',items:['flower','heart']});
 const set=(fn,...args)=>fn(...args,profiles.settings().revision);
 set(profiles.setDefault,'fonts',override(a));set(profiles.setDefault,'motifs',override(motifs));set(profiles.setDefault,'bestsellers',override(best));set(profiles.setCategory,'cat-a','fonts',override(b));set(profiles.setCategory,'cat-b','colors',{mode:'empty',profileId:null});
 const manufacturing=productionProfiles.create({name:'Synthetic engraving',method:'engraving',materialId:'steel',thicknessMm:1.5,machine:'',rip:'',notes:'Synthetic only',archived:false,output:{mode:'vector',dpi:300,mirror:false}});
 const document={categoryIds:['cat-a','cat-b','absent'],profileAssignments:Object.fromEntries(types.map(type=>[type,inherit()])),productionProfile:{id:manufacturing.id,revision:1},processingMethod:'engraving',material:{id:'steel',thicknessMm:1.5}};
 document.profileAssignments.fonts=override(c);
 return {profiles,productionProfiles,document,a,b,c,motifs,best,manufacturing};
}
test('native projections preserve all overridden profiles, exact ordering, empty choices, filter and stored production SHA',t=>{
 const f=fixture(t),read=createNativeUpdateResourcePinReader(f),before=structuredClone(f.document),pins=read(f.document);
 assert.deepEqual(Object.keys(pins).sort(),['categoryAssignments','categoryIds','productionProfile','profiles','resolutionSha256','settings'].sort());
 assert.deepEqual(pins.categoryIds,['cat-a','cat-b','absent']);assert.deepEqual(pins.categoryAssignments.at(-1),{id:'absent',present:false,sha256:null});
 assert.deepEqual(pins.profiles.map(p=>p.id).sort(),[f.a,f.b,f.c,f.motifs,f.best].map(p=>p.id).sort());
 const resolved=f.profiles.resolve(f.document);assert.deepEqual(resolved.selections.colors,[]);assert.deepEqual(resolved.selections.bestsellers,['heart']);assert.equal(pins.resolutionSha256,digest(resolved));
 assert.equal(pins.profiles.find(p=>p.id===f.a.id).sha256,digest({name:f.a.name,type:f.a.type,items:f.a.items}));
 assert.deepEqual(pins.productionProfile,{id:f.manufacturing.id,revision:1,sha256:f.manufacturing.sha256});
 // A newer manufacturing HEAD does not change this explicitly pinned revision.
 f.productionProfiles.save(f.manufacturing.id,{...f.manufacturing.document,notes:'New head only'},1);
 assert.deepEqual(read(f.document),pins);assert.deepEqual(f.document,before);
 const timestamps={...f.profiles,settings:()=>({...f.profiles.settings(),updatedAt:'irrelevant'}),get:(...args)=>({...f.profiles.get(...args),createdAt:'irrelevant',updatedAt:'irrelevant'})};
 assert.deepEqual(createNativeUpdateResourcePinReader({...f,profiles:timestamps})(f.document),pins);
});
test('settings changes inside a single native projection are rejected',t=>{
 const f=fixture(t);let first=true;
 const profiles={...f.profiles,resolve:document=>{if(first){first=false;f.profiles.setCategory('cat-b','colors',inherit(),f.profiles.settings().revision);}return f.profiles.resolve(document);}};
 assert.throws(()=>createNativeUpdateResourcePinReader({...f,profiles})(f.document),matches('resource_reader_settings_changed'));
});
test('a winning native profile changed after resolve cannot form a mixed revision pin',t=>{
 const f=fixture(t);let changed=false;
 const profiles={...f.profiles,get:id=>{if(id===f.c.id&&!changed){changed=true;f.profiles.save(id,{name:f.c.name,type:f.c.type,items:['B']},1);}return f.profiles.get(id);}};
 assert.throws(()=>createNativeUpdateResourcePinReader({...f,profiles})(f.document),matches('resource_reader_profile_changed'));
});
test('a shadowed profile changed between complete projections still causes drift',t=>{
 const f=fixture(t);let reads=0;
 const profiles={...f.profiles,settings:()=>{if(++reads===2)f.profiles.save(f.a.id,{name:'Changed shadowed profile',type:'fonts',items:['B']},1);return f.profiles.settings();}};
 assert.throws(()=>createNativeUpdateResourcePinReader({...f,profiles})(f.document),matches('resource_reader_drift'));
});
test('missing native resources, wrong production assignment and asynchronous readers retain hard failures',t=>{
 const f=fixture(t),read=createNativeUpdateResourcePinReader(f);
 const missing=structuredClone(f.document);missing.profileAssignments.fonts={mode:'override',profileId:'prf_missing'};assert.throws(()=>read(missing),matches('profile_not_found'));
 const bad=structuredClone(f.document);bad.material.thicknessMm=2;assert.throws(()=>read(bad),matches('production_profile'));
 assert.throws(()=>createNativeUpdateResourcePinReader({...f,profiles:{...f.profiles,settings:()=>Promise.resolve(f.profiles.settings())}})(f.document),matches('resource_reader_async'));
});
function copyPilot(t,{shadowed=false}={}){
 const resources=JSON.parse(fs.readFileSync(path.join(code,'app/designs/acrylic-unser-anfang/resources.json')));
 const f=nativeLibraries(t,{fonts:Object.keys(resources.fonts),motifs:resources.motifs.map(m=>({id:m.key,name:m.name||m.key}))});
 const font=f.profiles.create({name:'Native copied pilot',type:'fonts',items:Object.keys(resources.fonts).slice(0,1)});f.profiles.setDefault('fonts',override(font),1);
 const assets=createDesignAssetStore({filename:':memory:',tenantId:'gravuru'});t.after(()=>assets.close());
 const cfg=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,H);
 for(const o of cfg.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
 const source=makeProductDocument(cfg,{name:'Synthetic source'});
 if(shadowed)source.profileAssignments.fonts=override(f.profiles.create({name:'Winning product profile',type:'fonts',items:font.items}));
 const target=validateProductDocument({...structuredClone(source),name:'Synthetic target'});
 const nativeValidate=value=>{const d=validateProductDocument(value);f.profiles.resolve(d);assets.validateDocument(d);f.productionProfiles.resolve(d);return d;};
 const nativeSnapshot=d=>({profiles:f.profiles.resolve(d),productionProfile:f.productionProfiles.resolve(d)});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-resource-reader-')),seed=path.join(dir,'seed.sqlite'),copy=path.join(dir,'workshop.copy.sqlite');
 const seedRepo=createProductRepository({filename:seed,tenantId:'gravuru',validateDocument:nativeValidate,snapshotMetadata:nativeSnapshot,catalogOverview:productOverview});
 const current=seedRepo.create(source),other=seedRepo.create({...structuredClone(source),name:'Other product'});seedRepo.close();const seedHash=sha256(fs.readFileSync(seed));fs.copyFileSync(seed,copy);
 const readResourcePins=createNativeUpdateResourcePinReader(f),state={calls:0,driftAt:Infinity};
 const metadataSnapshot=guardedMetadataSnapshot(d=>{state.calls++;if(state.calls===state.driftAt)f.profiles.save(font.id,{name:'Changed during actual native insert',type:'fonts',items:font.items},1);return nativeSnapshot(d);},readResourcePins);
 const repository=createProductRepository({filename:copy,tenantId:'gravuru',validateDocument:nativeValidate,snapshotMetadata:metadataSnapshot,catalogOverview:productOverview});
 t.after(()=>{repository.close();assert.equal(sha256(fs.readFileSync(seed)),seedHash);assert.equal(path.dirname(fs.realpathSync(dir)),fs.realpathSync(os.tmpdir()));fs.rmSync(dir,{recursive:true,force:true});});
 const context={repository,metadataSnapshot,readResourcePins},policy={...MAIN_POLICY,productId:current.id,importKey:'synthetic-native-reader-copy',expectedPreimageBindingSha256:documentPins(source).idBindingSha256,targetProductGroupSha256:documentPins(target).productGroupSha256,targetBindingSha256:documentPins(target).idBindingSha256};
 const evidence={categoryComparisonSha256:H,categoryComparisonPassed:true,nativeValidatorContract:'native-product+resources+assets+manufacturing',nativeValidatorSourceSha256:H};
 const observation=captureUpdateObservation(context,target,{policy,evidence});
 const review=prepareUpdateReview({target,observation,origin:{excelFile:'SYNTHETIC-v9.xlsx',excelSha256:H,v9PlanId:'pgp_synthetic',v9PlanHash:H}},{policy}),excel=Buffer.from('synthetic spreadsheet bytes');
 const approval=makeApprovalEvidence({review,acceptedReviewHash:review.reviewHash,excelAddendum:{file:'SYNTHETIC.xlsx',sha256:sha256(excel)},decision:{accepted:true,actor:'SYNTHETIC TEST',quote:'SYNTHETIC ONLY',source:'No real user authorization',recordedAt:'2026-11-11T00:00:00.000Z'}},target,{policy});
 const run=()=>executeApprovedUpdate(context,{review,approval,target,excelAddendumBytes:excel,execute:true},{policy});
 const counts=()=>{const db=new DatabaseSync(copy,{readOnly:true});try{return {revisions:db.prepare('SELECT COUNT(*) AS n FROM product_revisions').get().n,imports:db.prepare('SELECT COUNT(*) AS n FROM import_items').get().n};}finally{db.close();}};
 return {repository,context,policy,review,observation,target,run,counts,state,otherId:other.id};
}
test('real native reader plugs into capture, guarded snapshot and copied importBatch with exact replay',t=>{
 const f=copyPilot(t),other=f.repository.get(f.otherId),before=f.counts();
 const receipt=f.run();assert.equal(receipt.newRevisions,1);assert.equal(receipt.createdProducts,0);assert.equal(receipt.productId,f.policy.productId);assert.equal(receipt.revision,2);
 assert.equal(f.observation.resourcePins.profiles.length,1);assert.equal(f.observation.resourcePins.resolutionSha256,digest(f.repository.get(f.policy.productId).metadata.profiles));
 assert.deepEqual(f.counts(),{revisions:before.revisions+1,imports:before.imports+1});const after=f.counts();assert.equal(f.run().replayed,true);assert.deepEqual(f.counts(),after);assert.deepEqual(f.repository.get(f.otherId),other);
});
test('native profile mutation inside the actual insertion hook rolls the copied product and journal back',t=>{
 const f=copyPilot(t),before=f.counts();f.state.driftAt=f.state.calls+3;
 assert.throws(()=>f.run(),error=>error.code==='invalid_snapshot_metadata'&&error.message==='snapshot_metadata_changed');
 assert.deepEqual(f.counts(),before);assert.equal(f.repository.head(f.policy.productId).revision,1);assert.equal(f.repository.importItem(f.policy.importKey),null);
 // Separate profile library writes are not falsely claimed to roll back with workshop.sqlite.
});
test('a shadowed native profile mutation at insertion trips resource pins despite identical final metadata',t=>{
 const f=copyPilot(t,{shadowed:true}),before=f.counts();f.state.driftAt=f.state.calls+3;
 assert.throws(()=>f.run(),error=>error.code==='invalid_snapshot_metadata'&&error.message==='snapshot_resources_changed');
 assert.deepEqual(f.counts(),before);assert.equal(f.repository.head(f.policy.productId).revision,1);assert.equal(f.repository.importItem(f.policy.importKey),null);
 assert.equal(digest(f.repository.previewMetadata(f.target)),f.observation.targetMetadataSha256,'the winning native metadata really stayed identical');
});
