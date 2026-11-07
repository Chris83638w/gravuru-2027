// File-only PR184 preparation. A completed batch index is the commit marker.
// Existing packages are verified and referenced, never re-rendered or rewritten.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DESIGN_BATCH_FOLDER,DESIGN_BATCH_DELIVERY_COMMIT,DESIGN_BATCH_SOURCE_COMMIT,deliveryBatchOrder,verifyPinnedFiles} from './prepare-design-batch-review.mjs';
import {validateFamily} from '../app/workshop/product-families.mjs';
import {batchSourceMaterial,batchFamilyMaterial} from './lib/design-batch-plan.mjs';

const CODE_ROOT=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const inside=(root,file)=>{const p=path.resolve(root,file),r=path.relative(root,p);if(!r||r==='..'||r.startsWith('..'+path.sep)||path.isAbsolute(r))throw Error('Path escapes root: '+file);return p;};
async function fileHash(file){const h=createHash('sha256');for await(const bytes of fs.createReadStream(file))h.update(bytes);return h.digest('hex');}
function write(root,file,data){fs.mkdirSync(root,{recursive:true});fs.writeFileSync(inside(root,file),JSON.stringify(data,null,2)+'\n');}

export function assignmentCatalogue(catalogueRoot){
 const registerFile=DESIGN_BATCH_FOLDER+'/register.json',register=read(path.join(catalogueRoot,registerFile)),files=[registerFile],families=[],lineIds=new Set(),excludedFamilies=[];
 for(const [id,entry]of Object.entries(register.familien)){
  files.push(entry.datei);const family=read(inside(catalogueRoot,entry.datei));
  if(family.id!==id)throw Error('Assignment family identity differs: '+id);
  try{const before=JSON.stringify(family);validateFamily(family);if(JSON.stringify(family)!==before)throw Error('Family validation changed its source');families.push(family);}catch(error){excludedFamilies.push({id,source:entry.datei,reason:error.message});}
  (entry.linien||[]).forEach(id=>lineIds.add(id));
 }
 const lines=[...lineIds].sort().map(id=>{if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid source line ID');const file='linien/'+id+'.json';files.push(file);const line=read(inside(catalogueRoot,file));if(line.id!==id)throw Error('Line identity differs');return line;});
 const provenance=verifyPinnedFiles(catalogueRoot,files);
 return {schema:'gravuru-gallery-assignment-catalogue/v1',sourceCommit:DESIGN_BATCH_DELIVERY_COMMIT,catalogueCommit:DESIGN_BATCH_SOURCE_COMMIT,families,lines,excludedFamilies,provenance};
}

export async function prepareCentralOnlyBlanks(catalogueRoot,outRoot){
 const source=DESIGN_BATCH_FOLDER+'/rohlinge/manifest.json',manifest=read(path.join(catalogueRoot,source)),seen=new Set();
 for(const id of deliveryBatchOrder(catalogueRoot))for(const b of read(path.join(catalogueRoot,DESIGN_BATCH_FOLDER,'stapel',id,'manifest.json')).rohlinge)seen.add(b.id);
 const selected=manifest.rohlinge.filter(b=>!seen.has(b.id)),dest=path.join(outRoot,'central-blanks-v2'),inventory=read(path.join(catalogueRoot,DESIGN_BATCH_FOLDER,'files-sha256.json'));
 if(fs.existsSync(path.join(dest,'manifest.json'))){
  for(const f of read(path.join(dest,'files-sha256.json')))if(await fileHash(inside(dest,f.file))!==f.sha256)throw Error('Central blank package changed: '+f.file);
  return {root:dest,manifest:path.join(dest,'manifest.json'),counts:read(path.join(dest,'manifest.json')).counts,verified:true};
 }
 const catalogue=assignmentCatalogue(catalogueRoot),families=new Map(catalogue.families.map(f=>[f.id,f]));
 const files=[source,...selected.flatMap(b=>(b.dateien||[]).map(f=>f.pfad))],provenance=verifyPinnedFiles(catalogueRoot,files);
 for(const p of provenance)if(inventory[p.file]!==p.sha256)throw Error('Central blank supplier index mismatch: '+p.file);
 const pack={schema:'gravuru-design-original-review/v1',catalogueCommit:DESIGN_BATCH_SOURCE_COMMIT,deliveryCommit:DESIGN_BATCH_DELIVERY_COMMIT,reviewOnly:true,released:false,blankOnly:true,contentKind:'catalogue-blanks-only',sourceManifestSha256:sha(fs.readFileSync(path.join(catalogueRoot,source))),originals:[],products:[],assets:[],fontFiles:{},blanks:[]};
 for(const blank of selected){
  const image=blank.dateien?.find(f=>f.rolle==='rohling-webp'),family=families.get(blank.familie),material=family?.material.kind==='acrylic'&&family.material.thicknessMm===null?batchSourceMaterial({material:'Acryl'}):family?batchFamilyMaterial(family):batchSourceMaterial({material:blank.material||blank.key.split('|')[0]}),preview=image?'originals/_blanks/'+sha(blank.familie+'|'+blank.key).slice(0,32)+'.webp':null;
  if(preview){const b=fs.readFileSync(inside(catalogueRoot,image.pfad));if(b.length!==image.bytes||sha(b)!==image.sha256)throw Error('Central blank bytes changed');fs.mkdirSync(path.dirname(inside(dest,preview)),{recursive:true});fs.writeFileSync(inside(dest,preview),b);}
  pack.blanks.push({key:blank.key,materialKey:material.key,materialLabel:material.label,familyId:blank.familie,sizeKey:blank.key,form:blank.form,label:blank.key,mm:blank.mm,preview,sha256:image?.sha256||null,source:blank.svg,sourceVersion:blank.version,status:blank.zustand==='vorbereitet'||blank.zustand==='geliefert'?'source-prepared':'open',nativeFamilyAvailable:false,sourceIssues:blank.offen||[],reviewOnly:true,released:false});
 }
 pack.counts={originals:0,preparedDesigns:0,openDesigns:0,preparedTargets:0,reviewProducts:0,blanks:pack.blanks.length};
 write(dest,'preparation-report.json',{source,provenance,familyProvenance:catalogue.provenance,counts:pack.counts,reviewOnly:true,released:false});write(dest,'manifest.json',pack);
 const checks=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else{const bytes=fs.readFileSync(f);checks.push({file:path.relative(dest,f).replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length});}}};walk(dest);write(dest,'files-sha256.json',checks);
 return {root:dest,manifest:path.join(dest,'manifest.json'),counts:pack.counts,verified:true};
}

export function planCompleteDesignReview({catalogueRoot,reuseReport=null,workspaceRoot=path.dirname(path.dirname(catalogueRoot))}){
 const root=path.resolve(catalogueRoot),ids=deliveryBatchOrder(root),seen=new Set(),refs=[],batches=[];
 const reuse=reuseReport?(typeof reuseReport==='string'?read(reuseReport):reuseReport):null;
 for(const [order,id]of ids.entries()){
  const manifestFile=inside(root,DESIGN_BATCH_FOLDER+'/stapel/'+id+'/manifest.json'),bytes=fs.readFileSync(manifestFile),m=JSON.parse(bytes);
  if(m.stapel.id!==id||m.quelle.commit!==DESIGN_BATCH_SOURCE_COMMIT)throw Error('Mismatched source batch: '+id);
  for(const d of m.designs){if(seen.has(d.id))throw Error('Duplicate source original: '+d.id);seen.add(d.id);}
  refs.push(...m.verweiseAufMaster);
  const prior=reuse?.batches?.find(b=>b.batchId===id),output=prior?path.resolve(workspaceRoot,prior.output):null;
  batches.push({id,order,manifestFile,manifestSha256:sha(bytes),originals:m.designs.length,masterReferences:m.verweiseAufMaster.length,explicitTargetOriginals:m.designs.filter(d=>d.ziele?.length).length,sourceTargets:m.designs.reduce((n,d)=>n+(d.ziele||[]).reduce((s,g)=>s+g.groessen.length,0),0),blankReferences:m.rohlinge.length,mode:output?'reuse-verified-package':'prepare',existingOutput:output});
 }
 const missingReferences=refs.flatMap(r=>(r.verweisAufMaster||[]).filter(id=>!seen.has(id)).map(id=>({sourceId:r.id,masterId:id})));
 return {schema:'gravuru-complete-review-plan/v1',catalogueRoot:root,deliveryCommit:DESIGN_BATCH_DELIVERY_COMMIT,catalogueCommit:DESIGN_BATCH_SOURCE_COMMIT,reviewOnly:true,released:false,counts:{batches:batches.length,originals:seen.size,masterReferences:refs.length,registerEntries:seen.size+refs.length,missingMasterReferences:missingReferences.length,reusableBatches:batches.filter(b=>b.existingOutput).length},missingMasterReferences:missingReferences,batches};
}

/** Verify immutable package files, and the exact supplied batch it originated from. */
export async function verifyPreparedBatch(out,{id,manifestSha256}){
 const root=path.resolve(out),index=read(path.join(root,'batch-index.json')),report=read(path.join(root,'preparation-report.json'));
 if(index.batchId!==id||report.batchId!==id||report.deliveryCommit!==DESIGN_BATCH_DELIVERY_COMMIT||index.reviewOnly!==true||index.released!==false)throw Error('Reuse batch identity mismatch: '+id);
 const parts=[];
 for(const part of index.parts){
  const partRoot=inside(root,part.path),pack=read(path.join(partRoot,'manifest.json')),checks=read(path.join(partRoot,'files-sha256.json'));
  if(pack.batchId!==id||pack.reviewOnly!==true||pack.released!==false)throw Error('Reuse package identity mismatch: '+id);
  const evidence=path.join(partRoot,'evidence',DESIGN_BATCH_FOLDER,'stapel',id,'manifest.json');
  if(await fileHash(evidence)!==manifestSha256)throw Error('Reused package has different source manifest: '+id);
  const names=new Set();
  for(const entry of checks){
   if(names.has(entry.file))throw Error('Duplicate package inventory path');names.add(entry.file);
   const file=inside(partRoot,entry.file),stat=fs.statSync(file);
   if(!stat.isFile()||stat.size!==entry.bytes||await fileHash(file)!==entry.sha256)throw Error('Package checksum mismatch: '+entry.file);
  }
  for(const mandatory of ['manifest.json','preparation-report.json',...pack.products.map(p=>p.file),...Object.values(pack.fontFiles)])if(!names.has(mandatory))throw Error('Unindexed required package file: '+mandatory);
  parts.push({root:partRoot,manifest:path.join(partRoot,'manifest.json'),manifestSha256:await fileHash(path.join(partRoot,'manifest.json')),files:checks.length,counts:pack.counts});
 }
 return {batchId:id,root,counts:report.counts,parts,verified:true};
}

function childPrepare({catalogueRoot,outRoot,batchId,fontCacheDir,existingPack},onProgress){
 return new Promise((resolve,reject)=>{
  const args=[fileURLToPath(new URL('./prepare-design-batch-review.mjs',import.meta.url)),'--katalog',catalogueRoot,'--out',outRoot,'--batch',batchId];
  if(fontCacheDir)args.push('--font-cache',fontCacheDir);if(existingPack)args.push('--base',existingPack);
  const child=spawn(process.execPath,args,{cwd:CODE_ROOT,env:process.env,stdio:['ignore','pipe','pipe'],windowsHide:true});let stderr='',pending='';
  child.stdout.on('data',data=>{pending+=data.toString();const lines=pending.split('\n');pending=lines.pop();for(const line of lines){if(!line.trim())continue;try{const e=JSON.parse(line);if(['complete','products'].includes(e.stage))onProgress({batchId,...e});}catch{}}});
  child.stderr.on('data',data=>{stderr=(stderr+data.toString()).slice(-12000);});
  child.on('error',reject);child.on('close',code=>code===0?resolve():reject(Error('Batch '+batchId+' exited '+code+': '+stderr)));
 });
}

export async function prepareCompleteDesignReview({catalogueRoot,outRoot,reuseReport,fontCacheDir,existingPack,only=null,prepare=false,onProgress=()=>{}}){
 const out=path.resolve(outRoot),source=path.resolve(catalogueRoot);
 for(const forbidden of [CODE_ROOT,source]){const r=path.relative(forbidden,out);if(!r||!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r))throw Error('Output must be outside repositories.');}
 const plan=planCompleteDesignReview({catalogueRoot:source,reuseReport});
 const planFile=path.join(out,'plan.json');
 if(fs.existsSync(planFile)&&JSON.stringify(read(planFile))!==JSON.stringify(plan))throw Error('Preparation plan changed; use a fresh output folder.');
 write(out,'plan.json',plan);write(out,'assignment-catalogue.json',assignmentCatalogue(source));if(!prepare)return {out,plan};
 const stateFile=path.join(out,'progress.json'),state=fs.existsSync(stateFile)?read(stateFile):{schema:'gravuru-complete-review-progress/v1',deliveryCommit:DESIGN_BATCH_DELIVERY_COMMIT,completed:[],failures:[]};
 for(const batch of plan.batches.filter(b=>!only||only.includes(b.id))){
  onProgress({stage:'batch-start',id:batch.id,mode:batch.mode});
  const dest=batch.existingOutput||path.join(out,'batches',batch.id);
  try{
   if(!batch.existingOutput&&!fs.existsSync(path.join(dest,'batch-index.json')))await childPrepare({catalogueRoot:source,outRoot:dest,batchId:batch.id,fontCacheDir,existingPack},onProgress);
   const result=await verifyPreparedBatch(dest,batch);state.completed=state.completed.filter(c=>c.batchId!==batch.id);state.completed.push(result);state.failures=state.failures.filter(f=>f.batchId!==batch.id);write(out,'progress.json',state);
   onProgress({stage:'batch-verified',id:batch.id,counts:result.counts});
  }catch(error){state.failures=state.failures.filter(f=>f.batchId!==batch.id);state.failures.push({batchId:batch.id,error:error.message});write(out,'progress.json',state);onProgress({stage:'batch-failed',id:batch.id,error:error.message});}
 }
 state.supplementalPackages=[await prepareCentralOnlyBlanks(source,out)];
 state.complete=state.completed.length===plan.batches.length&&state.failures.length===0;
 write(out,'progress.json',state);return {out,plan,state};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){if(args[i]==='--prepare'){opts.prepare=true;continue;}const key={'--katalog':'catalogueRoot','--out':'outRoot','--reuse-report':'reuseReport','--font-cache':'fontCacheDir','--base':'existingPack','--only':'only'}[args[i]];if(!key)throw Error('Unknown option: '+args[i]);opts[key]=key==='only'?args[++i].split(','):args[++i];}
 const result=await prepareCompleteDesignReview({...opts,onProgress:e=>console.log(JSON.stringify(e))});console.log(JSON.stringify({stage:'finished',out:result.out,counts:result.plan.counts,completed:result.state?.completed.length,failures:result.state?.failures,complete:result.state?.complete}));
 if(result.state?.failures.length)process.exitCode=1;
}
