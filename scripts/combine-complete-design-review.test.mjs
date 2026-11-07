import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {combineCompleteDesignReview,orderedReviewBatches} from './combine-complete-design-review.mjs';
import {readSlatePackage,mergeSlatePackages,mergeDesignReviewBlanks} from './extend-slate-original-review.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex'),json=v=>JSON.stringify(v,null,2)+'\n';
const write=(root,file,value)=>{const dest=path.join(root,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.isBuffer(value)?value:typeof value==='string'?value:json(value));};
const read=file=>JSON.parse(fs.readFileSync(file));
function index(root){
 const rows=fs.readdirSync(root,{recursive:true,withFileTypes:true}).filter(d=>d.isFile()&&path.join(d.parentPath,d.name)!==path.join(root,'files-sha256.json')).map(d=>{const p=path.join(d.parentPath,d.name),b=fs.readFileSync(p);return {file:path.relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};});
 write(root,'files-sha256.json',rows);
}
function pack(root,ids,{batchId='batch',blanks=[],prepared=false,previews=false}={}){
 const originals=ids.map(id=>({id,group:'Historische Kategorie',subcategory:'Allgemein',reviewSourcePreview:previews?'originals/'+id+'/preview.svg':undefined,targets:prepared?[{status:'prepared',sizeKey:'OLD-SIZE',mm:[50,20],productKey:'old:'+id,nativeDesignId:'native-'+id}]:[]}));
 const products=prepared?ids.map(id=>({key:'old:'+id,productId:'cfg_old_'+id,reviewOnly:true,designIds:[id],file:'products/'+id+'.json'})):[];
 const manifest={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,batchId,catalogueCommit:'a'.repeat(40),originals,products,fontFiles:{},assets:[],blanks,counts:{originals:ids.length}};
 for(const id of ids){write(root,'originals/'+id+'/design.json',{id,batchId});write(root,'originals/'+id+'/design.svg','<svg>'+id+' '+batchId+'</svg>');if(previews)write(root,'originals/'+id+'/preview.svg','<svg>Preview '+id+'</svg>');}
 for(const p of products)write(root,p.file,{immutableNative:p.key});
 for(const b of blanks)if(b.preview)write(root,b.preview,Buffer.from('verified blank image'));
 write(root,'manifest.json',manifest);index(root);return manifest;
}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'combine-design-review-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const baseRoot=path.join(root,'base'),partRoot=path.join(root,'part'),catalogueFile=path.join(root,'catalogue.json');
 pack(baseRoot,['OLD']);pack(partRoot,['NEW']);write(root,'catalogue.json',{schema:'gravuru-gallery-assignment-catalogue/v1',sourceCommit:'b'.repeat(40),catalogueCommit:'a'.repeat(40),families:[],lines:[]});
 return {root,baseRoot,partRoot,catalogueFile,options:{baseRoot,partRoots:[partRoot],catalogueFile,out:path.join(root,'combined')}};
}

test('consolidates each verified part once and rejects altered resources behind identical manifest hashes',t=>{
 const f=fixture(t),duplicate=path.join(f.root,'duplicate');fs.cpSync(f.partRoot,duplicate,{recursive:true});
 const out=combineCompleteDesignReview({...f.options,partRoots:[f.partRoot,duplicate]});assert.equal(out.sources,1);assert.equal(out.counts.originals,1);
 const addon=readSlatePackage(out.out);assert.equal(addon.pack.sourcePackages.length,1);
 const merged=path.join(f.root,'merged');mergeSlatePackages({baseRoot:f.baseRoot,addonRoot:out.out,out:merged,materialExtension:true});
 write(duplicate,'originals/NEW/design.json',{id:'NEW',changed:true});index(duplicate);
 assert.equal(readSlatePackage(duplicate).hash,readSlatePackage(f.partRoot).hash,'manifest bytes unchanged');
 assert.throws(()=>combineCompleteDesignReview({...f.options,out:path.join(f.root,'bad-duplicates'),partRoots:[f.partRoot,duplicate]}),/Repeated package resources/);
 assert.throws(()=>combineCompleteDesignReview({...f.options,baseRoot:merged,out:path.join(f.root,'bad-known'),partRoots:[duplicate]}),/Repeated package resources/);
 const duplicateBase=path.join(f.root,'duplicate-base');fs.cpSync(f.baseRoot,duplicateBase,{recursive:true});write(duplicateBase,'originals/OLD/design.svg','changed');index(duplicateBase);
 assert.throws(()=>combineCompleteDesignReview({...f.options,out:path.join(f.root,'bad-base'),partRoots:[duplicateBase,f.partRoot]}),/Repeated package resources/);
 assert.equal(fs.existsSync(path.join(f.root,'bad-known')),false);
});

test('output cannot sit inside any immutable input package',t=>{
 const f=fixture(t),before=[f.baseRoot,f.partRoot].map(r=>readSlatePackage(r).checksums);
 for(const out of [path.join(f.baseRoot,'new-output'),path.join(f.partRoot,'new-output')])assert.throws(()=>combineCompleteDesignReview({...f.options,out}),/separate from every source/);
 [f.baseRoot,f.partRoot].forEach((r,i)=>assert.deepEqual(readSlatePackage(r).checksums,before[i]));
});

function correspondenceFixture(t){
 const f=fixture(t);fs.rmSync(f.baseRoot,{recursive:true});fs.rmSync(f.partRoot,{recursive:true});
 pack(f.baseRoot,['OLD','DRIFT'],{batchId:'legacy',prepared:true,previews:true});
 const incoming=['legacy/OLD','legacy/DRIFT','OLD','NEW'];pack(f.partRoot,incoming,{batchId:'fresh',previews:true});
 const base=readSlatePackage(f.baseRoot),part=readSlatePackage(f.partRoot);
 const match=(incomingId,legacyId,action,conflict=false)=>({batchId:'fresh',incomingId,legacyId,canonicalOriginalId:action==='register-separate-source-original'?legacyId+'--source-unique':legacyId,incomingSource:'catalogue/'+incomingId,sourceStandConflict:conflict,action,incomingFiles:['design.json','design.svg'].map(name=>({name,sha256:part.checksums.find(r=>r.file==='originals/'+incomingId+'/'+name).sha256})),legacyFiles:['design.json','design.svg'].map(name=>({name,sha256:base.checksums.find(r=>r.file==='originals/'+legacyId+'/'+name).sha256}))});
 const correspondence={schema:'gravuru-legacy-original-correspondence/v2',baseManifestSha256:base.hash,rows:[match('legacy/OLD','OLD','alias-incoming-id-to-existing-id'),match('legacy/DRIFT','DRIFT','alias-incoming-id-to-existing-id',true),match('OLD','OLD','register-separate-source-original',true)]};
 const correspondenceFile=path.join(f.root,'correspondence.json');write(f.root,'correspondence.json',correspondence);
 return {...f,base,part,correspondence,correspondenceFile,options:{...f.options,correspondenceFile}};
}

test('proven aliases preserve legacy IDs and targets; equal-number sources are namespaced without replacing originals',t=>{
 const f=correspondenceFixture(t),baseBytes=fs.readFileSync(path.join(f.baseRoot,'manifest.json'));
 combineCompleteDesignReview(f.options);const addon=readSlatePackage(f.options.out);
 assert.deepEqual(addon.pack.originals.map(r=>r.id),['OLD--source-unique','NEW']);assert.equal(addon.pack.sourceReviewUpdates.length,2);
 assert.equal(addon.pack.originals[0].sourceOriginalId,'OLD');assert.match(addon.pack.originals[0].reviewSourcePreview,/originals\/OLD--source-unique\//);
 assert.deepEqual(fs.readFileSync(path.join(addon.root,'originals/OLD--source-unique/design.json')),fs.readFileSync(path.join(f.partRoot,'originals/OLD/design.json')));
 const out=path.join(f.root,'merged');mergeSlatePackages({baseRoot:f.baseRoot,addonRoot:addon.root,out,materialExtension:true});const merged=readSlatePackage(out);
 for(const id of ['OLD','DRIFT']){
  const before=f.base.pack.originals.find(r=>r.id===id),after=merged.pack.originals.find(r=>r.id===id);
  assert.deepEqual(after.targets,before.targets);assert.equal(after.group,before.group);assert.equal(after.reviewSourcePreview,before.reviewSourcePreview);assert.equal(after.catalogueSourceUpdates.length,1);
  assert.deepEqual(fs.readFileSync(path.join(out,'originals/'+id+'/design.json')),fs.readFileSync(path.join(f.baseRoot,'originals/'+id+'/design.json')));
 }
 assert.equal(merged.pack.originals.length,4);assert.deepEqual(merged.pack.products,f.base.pack.products);assert.deepEqual(fs.readFileSync(path.join(f.baseRoot,'manifest.json')),baseBytes);
 assert.equal(read(path.join(out,'assignment-catalogue.json')).sourceCommit,'b'.repeat(40));
});

test('stale correspondence and prepared aliases fail closed before creating output',t=>{
 const f=correspondenceFixture(t);f.correspondence.rows[0].incomingFiles[0].sha256='f'.repeat(64);write(f.root,'correspondence.json',f.correspondence);
 assert.throws(()=>combineCompleteDesignReview(f.options),/correspondence differs from incoming original/);assert.equal(fs.existsSync(f.options.out),false);
 f.correspondence.rows[0].incomingFiles[0].sha256=f.part.checksums.find(r=>r.file==='originals/legacy/OLD/design.json').sha256;write(f.root,'correspondence.json',f.correspondence);
 const manifest=read(path.join(f.partRoot,'manifest.json')),row=manifest.originals[0];row.targets=[{status:'prepared',sizeKey:'NEW',mm:[50,20],productKey:'new',nativeDesignId:'native'}];manifest.products=[{key:'new',productId:'cfg_new',reviewOnly:true,designIds:[row.id]}];write(f.partRoot,'manifest.json',manifest);index(f.partRoot);
 assert.throws(()=>combineCompleteDesignReview(f.options),/Prepared aliases require explicit native identity migration/);assert.equal(fs.existsSync(f.options.out),false);
});

test('baseline resource drift cannot reuse a correspondence with the same manifest hash',t=>{
 const f=correspondenceFixture(t);write(f.baseRoot,'originals/OLD/design.json',{id:'OLD',changed:true});index(f.baseRoot);
 assert.equal(readSlatePackage(f.baseRoot).hash,f.correspondence.baseManifestSha256);
 assert.throws(()=>combineCompleteDesignReview(f.options),/correspondence differs from baseline original/);assert.equal(fs.existsSync(f.options.out),false);
});

function missingSourceFixture(t,{supplierListsOriginal=false}={}){
 const f=correspondenceFixture(t),manifest=read(path.join(f.partRoot,'manifest.json')),row=manifest.originals[0],match=f.correspondence.rows[0];
 for(const name of ['design.json','design.svg','preview.svg'])fs.unlinkSync(path.join(f.partRoot,'originals/'+row.id+'/'+name));
 delete row.reviewSourcePreview;Object.assign(row,{status:'open',source:match.incomingSource,files:[],reusedTargetRefs:[]});
 Object.assign(match,{incomingFiles:[],sourceStandConflict:true,sameSvgAndJson:false});write(f.root,'correspondence.json',f.correspondence);
 const file='auftraege/2026-11-06-gesamtbestand/stapel/fresh/manifest.json',evidence='evidence/'+file;
 const supplier={schema:'gravuru-gesamtuebergabe/v1',art:'stapel',stapel:{id:'fresh'},designs:[{id:row.id,pfad:match.incomingSource,stapel:'fresh',zustand:'offen',dateien:supplierListsOriginal?[{pfad:match.incomingSource+'/design.json',rolle:'design-json'}]:[]}]};
 write(f.partRoot,evidence,supplier);const bytes=fs.readFileSync(path.join(f.partRoot,evidence)),manifestSha256=sha(bytes);
 const sourcePlan={schema:'gravuru-complete-review-plan/v1',reviewOnly:true,released:false,deliveryCommit:'b'.repeat(40),catalogueCommit:'a'.repeat(40),batches:[{id:'fresh',manifestSha256}]};
 const pin={file,bytes:bytes.length,sha256:manifestSha256,blob:createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};
 write(f.partRoot,'preparation-report.json',{schema:'gravuru-design-batch-preparation/v1',batchId:'fresh',deliveryCommit:sourcePlan.deliveryCommit,catalogueCommit:sourcePlan.catalogueCommit,pinnedFiles:[pin]});
 Object.assign(manifest,{deliveryCommit:sourcePlan.deliveryCommit,sources:{provenance:'preparation-report.json',deliveryManifest:evidence}});write(f.partRoot,'manifest.json',manifest);index(f.partRoot);
 return {...f,row,sourcePlan,options:{...f.options,sourcePlan}};
}

test('pinned missing-source aliases preserve legacy templates and explicitly record the missing originals',t=>{
 const f=missingSourceFixture(t);combineCompleteDesignReview(f.options);
 const addon=readSlatePackage(f.options.out),update=addon.pack.sourceReviewUpdates.find(r=>r.id==='OLD');
 assert.equal(update.originalFilesMissing,true);assert.deepEqual(update.missingOriginalFiles,['design.json','design.svg']);assert.equal(update.sourceStandConflict,true);assert.equal(update.preview,null);assert.match(update.sourceIssue,/Originaldateien.*fehlen/);assert.equal(update.sourceManifestSha256,f.sourcePlan.batches[0].manifestSha256);
 const out=path.join(f.root,'merged');mergeSlatePackages({baseRoot:f.baseRoot,addonRoot:f.options.out,out,materialExtension:true});
 const old=readSlatePackage(out).pack.originals.find(r=>r.id==='OLD'),before=f.base.pack.originals.find(r=>r.id==='OLD');
 assert.deepEqual(old.targets,before.targets);assert.equal(old.reviewSourcePreview,before.reviewSourcePreview);assert.equal(old.catalogueSourceUpdates[0].originalFilesMissing,true);
 assert.deepEqual(fs.readFileSync(path.join(out,'originals/OLD/design.json')),fs.readFileSync(path.join(f.baseRoot,'originals/OLD/design.json')));
});

test('false missing-original claims and unpinned supplier evidence are rejected',t=>{
 const f=missingSourceFixture(t);write(f.partRoot,'originals/'+f.row.id+'/design.json',{exists:true});index(f.partRoot);
 assert.throws(()=>combineCompleteDesignReview(f.options),/Original files exist despite missing-source claim/);assert.equal(fs.existsSync(f.options.out),false);
 fs.unlinkSync(path.join(f.partRoot,'originals/'+f.row.id+'/design.json'));index(f.partRoot);
 f.sourcePlan.batches[0].manifestSha256='f'.repeat(64);
 assert.throws(()=>combineCompleteDesignReview(f.options),/not pinned to the reviewed plan/);
});

test('a supplier listing an original file cannot be treated as proven missing even when its prepared copy is absent',t=>{
 const f=missingSourceFixture(t,{supplierListsOriginal:true});assert.throws(()=>combineCompleteDesignReview(f.options),/does not confirm missing original files/);assert.equal(fs.existsSync(f.options.out),false);
});

test('late retried batches return to the source plan order, with exact batch coverage',()=>{
 const batch=id=>({batchId:id,parts:[{root:id+'/part-001'}]}),sourcePlan={schema:'gravuru-complete-review-plan/v1',reviewOnly:true,released:false,deliveryCommit:'b'.repeat(40),catalogueCommit:'a'.repeat(40),batches:[{id:'steel'},{id:'satin'},{id:'slate'}]},progress={complete:true,failures:[],completed:[batch('steel'),batch('slate'),batch('satin')]};
 assert.deepEqual(orderedReviewBatches(progress,sourcePlan).map(b=>b.batchId),['steel','satin','slate']);
 assert.deepEqual(progress.completed.map(b=>b.batchId),['steel','slate','satin']);
 assert.throws(()=>orderedReviewBatches({...progress,completed:[batch('steel'),batch('slate'),batch('unknown')]},sourcePlan),/differ from the pinned source plan/);
});

const blank=(preview='originals/_blanks/old.webp')=>({key:'SIZE',materialKey:'steel',materialLabel:'Edelstahl',familyId:'steel-door-signs',sizeKey:'SIZE',form:'Rechteck',label:'5 × 2 cm',mm:[50,20],preview,sha256:sha('verified blank image'),source:'original-contour.svg',sourceVersion:'c'.repeat(64),reviewOnly:true,released:false});
test('same physical blank keeps historic paths and wording while adding proven delivery metadata',t=>{
 const f=fixture(t),old=blank(),fresh={...blank('originals/_blanks/new.webp'),label:'5 x 2 cm',status:'source-prepared',nativeFamilyAvailable:true,sourceIssues:[]};
 fs.rmSync(f.baseRoot,{recursive:true});fs.rmSync(f.partRoot,{recursive:true});pack(f.baseRoot,['OLD'],{blanks:[old]});pack(f.partRoot,['NEW'],{blanks:[fresh]});
 combineCompleteDesignReview(f.options);const out=path.join(f.root,'merged');mergeSlatePackages({baseRoot:f.baseRoot,addonRoot:f.options.out,out,materialExtension:true});
 const stored=readSlatePackage(out).pack.blanks;assert.equal(stored.length,1);assert.deepEqual(stored[0],{...old,status:'source-prepared',nativeFamilyAvailable:true,sourceIssues:[]});
 assert.deepEqual(fs.readFileSync(path.join(out,old.preview)),fs.readFileSync(path.join(out,fresh.preview)));
 assert.deepEqual(mergeDesignReviewBlanks([old],[fresh]),stored);assert.equal(old.status,undefined);
 for(const changed of [{...fresh,mm:[50,21]},{...fresh,sourceVersion:'d'.repeat(64)},{...fresh,sha256:'d'.repeat(64)}])assert.throws(()=>mergeDesignReviewBlanks([old],[changed]),/Blank identity differs/);
 const otherFamily={...fresh,familyId:'different'};assert.deepEqual(mergeDesignReviewBlanks([old],[otherFamily]),[old,otherFamily],'equal size keys in separate catalogue families stay distinct');
});

test('a claimed blank image hash must match the actual indexed image',t=>{
 const f=fixture(t);fs.rmSync(f.partRoot,{recursive:true});pack(f.partRoot,['NEW'],{blanks:[{...blank(),sha256:'f'.repeat(64)}]});
 assert.throws(()=>combineCompleteDesignReview(f.options),/Blank preview differs from its verified resource/);assert.equal(fs.existsSync(f.options.out),false);
});
