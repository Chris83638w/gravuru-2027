// Consolidate pinned batches once; existing gallery documents remain separate.
// Hard links are confined to immutable prepared resources, never user databases.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readSlatePackage,privateReviewPath,reviewPackageFile,mergeDesignReviewOriginals,mergeDesignReviewBlanks} from './extend-slate-original-review.mjs';
import {designReviewTargetKey,validatedDesignReviewTargets} from './lib/design-review-targets.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const json=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const canonicalIndex=rows=>rows.map(({file,bytes,sha256})=>({file,bytes,sha256})).sort((a,b)=>a.file.localeCompare(b.file));
const inside=(root,file)=>{const rel=path.relative(root,file);return !rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
export function combineCompleteDesignReview({baseRoot,partRoots,out,catalogueFile,correspondenceFile,deliveryCoverage=null,onProgress=()=>{}}){
 const base=readSlatePackage(baseRoot),known=new Set((base.pack.sourcePackages||[]).map(p=>p.manifestSha256));known.add(base.hash);
 out=privateReviewPath(out);if(fs.existsSync(out))throw Error('Combined output must be new');
 const sourceRoots=partRoots.map(privateReviewPath);
 for(const root of [base.root,...sourceRoots])if(inside(root,out)||inside(out,root))throw Error('Combined output must be separate from every source');
 const indexes=new Map([[base.hash,canonicalIndex(base.checksums)]]);
 const correspondenceBytes=correspondenceFile?fs.readFileSync(correspondenceFile):null,correspondence=correspondenceBytes?JSON.parse(correspondenceBytes):null;
 if(correspondence&&(correspondence.schema!=='gravuru-legacy-original-correspondence/v2'||correspondence.baseManifestSha256!==base.hash))throw Error('Correspondence belongs to a different baseline');
 const matches=new Map((correspondence?.rows||[]).map(r=>[JSON.stringify([r.batchId,r.incomingId]),r]));
 if(matches.size!==(correspondence?.rows||[]).length)throw Error('Duplicate source correspondence');
 const files=new Map(),sources=[],products=[],productKeys=new Set(),productIds=new Set(),assets=new Map(),fonts=new Map(),reused=new Map(),sourceReviewUpdates=[];
 let originals=[],blanks=[];
 const addFile=(name,file,expected)=>{const old=files.get(name);if(old)assert.deepEqual(old.expected,expected,'Different immutable bytes at '+name);else files.set(name,{file,expected});};
 for(const root of sourceRoots){
  const source=readSlatePackage(root);
  if(known.has(source.hash)){
   if(!indexes.has(source.hash))indexes.set(source.hash,canonicalIndex(JSON.parse(fs.readFileSync(reviewPackageFile(base.root,'source-packages/'+source.hash+'/files-sha256.json')))));
   assert.deepEqual(canonicalIndex(source.checksums),indexes.get(source.hash),'Repeated package resources differ from the recorded delivery');continue;
  }
  known.add(source.hash);indexes.set(source.hash,canonicalIndex(source.checksums));
  if(source.pack.schema!=='gravuru-design-original-review/v1')throw Error('Versioned material package required');
  const descriptors=new Map(source.checksums.map(r=>[r.file,{bytes:r.bytes,sha256:r.sha256}]));
  for(const p of source.pack.products){if(productKeys.has(p.key)||productIds.has(p.productId))throw Error('Duplicate native group');productKeys.add(p.key);productIds.add(p.productId);products.push(p);}
  const incoming=[],pathAliases=new Map();
  for(const row of source.pack.originals){
   const match=matches.get(JSON.stringify([source.pack.batchId,row.id]));
   if(match&&['alias-incoming-id-to-existing-id','register-separate-source-original'].includes(match.action)){
    if(!Array.isArray(match.incomingFiles)||!match.incomingFiles.some(f=>f.name==='design.json'))throw Error('Source correspondence lacks immutable original evidence');
    for(const f of match.incomingFiles){if(!['design.json','design.svg'].includes(f.name)||descriptors.get('originals/'+row.id+'/'+f.name)?.sha256!==f.sha256)throw Error('Source correspondence differs from incoming original: '+row.id);}
    if(!base.pack.originals.some(r=>r.id===match.legacyId))throw Error('Source correspondence refers to a missing baseline original');
    if(!Array.isArray(match.legacyFiles)||!match.legacyFiles.some(f=>f.name==='design.json'))throw Error('Source correspondence lacks immutable baseline evidence');
    for(const f of match.legacyFiles){if(!['design.json','design.svg'].includes(f.name)||base.checksums.find(r=>r.file==='originals/'+match.legacyId+'/'+f.name)?.sha256!==f.sha256)throw Error('Source correspondence differs from baseline original: '+match.legacyId);}
   }
   if(match?.action==='alias-incoming-id-to-existing-id'){
    if(row.targets?.some(t=>t.status==='prepared'))throw Error('Prepared aliases require explicit native identity migration');
    sourceReviewUpdates.push({id:match.legacyId,sourceOriginalId:row.id,source:match.incomingSource,sourceStandConflict:match.sourceStandConflict,preview:row.reviewSourcePreview||null});continue;
   }
   if(match?.action==='register-separate-source-original'){
    if(row.targets?.some(t=>t.status==='prepared'))throw Error('Prepared source collisions require explicit native identity migration');
    const oldPrefix='originals/'+row.id+'/',newPrefix='originals/'+match.canonicalOriginalId+'/';pathAliases.set(oldPrefix,newPrefix);
    incoming.push({...row,id:match.canonicalOriginalId,sourceOriginalId:row.id,reviewSourcePreview:row.reviewSourcePreview?.replace(oldPrefix,newPrefix),sourceIdentityNote:'Gleiche Designnummer, andere Katalogquelle; getrennt vom bisherigen Original.'});
   }else incoming.push(row);
  }
  for(const row of incoming){
   for(const ref of row.reusedTargetRefs||[]){const key=designReviewTargetKey(row,ref),old=reused.get(key);if(old)assert.deepEqual(old.ref,ref);else reused.set(key,{id:row.id,ref});}
  }
  originals=mergeDesignReviewOriginals(originals,incoming.map(row=>({...row,reusedTargetRefs:[]})));
  for(const a of source.pack.assets){if(assets.has(a.id))assert.deepEqual(assets.get(a.id),a);else assets.set(a.id,a);}
  for(const [name,file]of Object.entries(source.pack.fontFiles)){
   const old=fonts.get(name),expected=descriptors.get(file);if(!expected)throw Error('Unindexed font');
   if(old)assert.deepEqual(old.expected,expected,'Font resource mismatch: '+name);else fonts.set(name,{file,expected});
  }
  blanks=mergeDesignReviewBlanks(blanks,source.pack.blanks||[]);
  for(const entry of source.checksums){let target=entry.file.includes('/')?entry.file:'source-packages/'+source.hash+'/'+entry.file;for(const [oldPrefix,newPrefix]of pathAliases)if(target.startsWith(oldPrefix)){target=newPrefix+target.slice(oldPrefix.length);break;}addFile(target,reviewPackageFile(source.root,entry.file),{bytes:entry.bytes,sha256:entry.sha256});}
  const index=reviewPackageFile(source.root,'files-sha256.json'),bytes=fs.readFileSync(index);addFile('source-packages/'+source.hash+'/files-sha256.json',index,{bytes:bytes.length,sha256:sha(bytes)});
  sources.push({manifestSha256:source.hash,catalogueCommit:source.pack.catalogueCommit,deliveryCommit:source.pack.deliveryCommit,counts:source.pack.counts});
  onProgress({stage:'combined-source',sources:sources.length,originals:originals.length,products:products.length});
 }
 const byId=new Map(originals.map(r=>[r.id,r]));
 for(const [key,{id,ref}]of reused){const row=byId.get(id);if(!row)throw Error('Reused original missing');if(!row.targets?.some(t=>designReviewTargetKey(row,t)===key))(row.reusedTargetRefs||=[]).push(ref);}
 const catalogueBytes=fs.readFileSync(catalogueFile),catalogue=JSON.parse(catalogueBytes);
 if(catalogue.schema!=='gravuru-gallery-assignment-catalogue/v1'||!/^[a-f0-9]{40}$/.test(catalogue.sourceCommit))throw Error('Pinned assignment catalogue required');
 const editable=originals.filter(r=>r.targets?.some(t=>t.status==='prepared'));
 const pack={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,catalogueCommit:catalogue.catalogueCommit,deliveryCommit:catalogue.sourceCommit,originals,products,assets:[...assets.values()],fontFiles:Object.fromEntries([...fonts].map(([n,v])=>[n,v.file])),blanks,sourcePackages:sources,sourceReviewUpdates,correspondenceBaseSha256:correspondence?.baseManifestSha256||null,
  deliveryCoverage,counts:{originals:originals.length,editableOriginals:editable.length,unpreparedOriginals:originals.length-editable.length,preparedTargets:originals.reduce((n,r)=>n+(r.targets||[]).filter(t=>t.status==='prepared').length,0),reviewProducts:products.length}};
 validatedDesignReviewTargets(pack,{localOnly:true,published:false,shopifyWrites:0,products});
 fs.mkdirSync(out,{recursive:true,mode:0o700});const checks=[];
 for(const [name,{file,expected}]of files){
  const bytes=fs.readFileSync(file);if(bytes.length!==expected.bytes||sha(bytes)!==expected.sha256)throw Error('Resource changed during consolidation');
  const dest=reviewPackageFile(out,name);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});
  try{fs.linkSync(file,dest);}catch(e){if(!['EXDEV','EPERM','ENOTSUP'].includes(e.code))throw e;fs.copyFileSync(file,dest,fs.constants.COPYFILE_EXCL);}
  checks.push({file:name,...expected});
 }
 for(const [name,bytes]of [['manifest.json',json(pack)],['assignment-catalogue.json',catalogueBytes]]){fs.writeFileSync(reviewPackageFile(out,name),bytes,{flag:'wx',mode:0o600});checks.push({file:name,bytes:bytes.length,sha256:sha(bytes)});}
 if(correspondenceBytes){fs.writeFileSync(reviewPackageFile(out,'legacy-original-correspondence.json'),correspondenceBytes,{flag:'wx',mode:0o600});checks.push({file:'legacy-original-correspondence.json',bytes:correspondenceBytes.length,sha256:sha(correspondenceBytes)});}
 fs.writeFileSync(reviewPackageFile(out,'files-sha256.json'),json(checks.sort((a,b)=>a.file.localeCompare(b.file))),{flag:'wx',mode:0o600});
 return {out,counts:pack.counts,sources:sources.length,files:checks.length+1};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=n=>args[args.indexOf(n)+1];
 const progress=JSON.parse(fs.readFileSync(get('--progress')));if(progress.complete!==true||progress.failures.length)throw Error('All batches must be verified first');
 const referenceOnly=progress.completed.filter(b=>b.parts.every(p=>p.counts.originals===0&&p.counts.reviewProducts===0&&p.counts.blanks===0));
 const parts=progress.completed.filter(b=>!referenceOnly.includes(b)).flatMap(b=>b.parts.map(p=>p.root));if(args.includes('--extra'))parts.push(get('--extra'));
 console.log(JSON.stringify(combineCompleteDesignReview({baseRoot:get('--base'),partRoots:parts,out:get('--out'),catalogueFile:get('--catalogue'),correspondenceFile:args.includes('--correspondence')?get('--correspondence'):null,deliveryCoverage:{verifiedBatches:progress.completed.length,referenceOnlyBatches:referenceOnly.map(b=>b.batchId),sourceOriginals:progress.completed.reduce((n,b)=>n+b.counts.originals,0)},onProgress:e=>console.log(JSON.stringify(e))})));
}
