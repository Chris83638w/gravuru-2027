// Read-only identity evidence for combining the pinned PR184 delivery with legacy
// gallery IDs. A path match establishes lineage, never permission to overwrite.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DESIGN_BATCH_FOLDER,DESIGN_BATCH_DELIVERY_COMMIT,deliveryBatchOrder,verifyPinnedFiles} from './prepare-design-batch-review.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const directory=p=>String(p||'').replace(/\/design\.json$/,'');
const sourceFiles=d=>(d.dateien||[]).filter(f=>['design-json','design-svg'].includes(f.rolle)).map(f=>({name:path.basename(f.pfad),sha256:f.sha256}));
function sameBytes(prior,source){const files=sourceFiles(source);return files.length===2&&files.every(f=>prior.files?.some(p=>p.name===f.name&&p.sha256===f.sha256));}
export function originalCorrespondence(base,sources,masterRefs){
 const rows=[],relationships=[],unmatched=[];
 for(const prior of base.originals){
  const dir=directory(prior.source),matched=sources.filter(d=>d.id===prior.id||d.pfad===dir),references=masterRefs.filter(d=>d.pfad===dir);
  for(const source of matched){
   const samePath=source.pfad===dir,exact=sameBytes(prior,source),collision=source.id===prior.id&&!samePath&&!exact;
   rows.push({legacyId:prior.id,incomingId:source.id,batchId:source.batchId,matchType:samePath?'same-source-directory':collision?'id-collision-different-source':'same-id-exact-source-bytes',legacySource:prior.source,incomingSource:source.pfad,sameSvgAndJson:exact,legacyFiles:(prior.files||[]).filter(f=>['design.svg','design.json'].includes(f.name)).map(f=>({name:f.name,sha256:f.sha256})),incomingFiles:sourceFiles(source),action:collision?'register-separate-source-original':source.id===prior.id?'keep-existing-id-and-user-state':'alias-incoming-id-to-existing-id',canonicalOriginalId:collision?source.id+'--source-'+sha(source.pfad).slice(0,12):prior.id,sourceStandConflict:!exact,overwriteExistingAssets:false,overwriteExistingUserState:false});
  }
  for(const reference of references)relationships.push({legacyId:prior.id,stockReferenceId:reference.id,sourcePath:reference.pfad,batchId:reference.batchId,masterIds:reference.verweisAufMaster,action:'retain-explicit-one-to-many-reference-not-an-automatic-master-alias'});
  if(!matched.length&&!references.length)unmatched.push({legacyId:prior.id,source:prior.source});
 }
 return {counts:{legacyOriginals:base.originals.length,pairs:rows.length,exactSourceBytePairs:rows.filter(r=>r.sameSvgAndJson).length,stockPathAliases:rows.filter(r=>r.incomingId!==r.legacyId&&r.action==='alias-incoming-id-to-existing-id').length,stockAliasChangedSource:rows.filter(r=>r.incomingId!==r.legacyId&&r.action==='alias-incoming-id-to-existing-id'&&r.sourceStandConflict).length,sourceIdCollisions:rows.filter(r=>r.action==='register-separate-source-original').length,existingSameIdRetained:rows.filter(r=>r.incomingId===r.legacyId&&r.action==='keep-existing-id-and-user-state').length,legacyOriginalsWithMasterReferences:relationships.length,legacyOriginalsWithoutDeliveryMatch:unmatched.length},rows,masterReferenceRelationships:relationships,unmatched};
}
export function auditReviewOriginalCorrespondence({catalogueRoot,baseManifest}){
 const root=path.resolve(catalogueRoot),baseFile=path.resolve(baseManifest),bytes=fs.readFileSync(baseFile),sources=[],refs=[],files=[];
 for(const id of deliveryBatchOrder(root)){const file=DESIGN_BATCH_FOLDER+'/stapel/'+id+'/manifest.json';files.push(file);const m=read(path.join(root,file));sources.push(...m.designs.map(d=>({...d,batchId:id})));refs.push(...m.verweiseAufMaster.map(d=>({...d,batchId:id})));}
 const provenance=verifyPinnedFiles(root,files),base=JSON.parse(bytes),baseRoot=path.dirname(baseFile);let verifiedBaseFiles=0;
 for(const original of base.originals)for(const file of original.files||[]){
  if(!['design.svg','design.json'].includes(file.name))continue;
  const filename=path.resolve(baseRoot,'originals',original.id,file.name),relative=path.relative(baseRoot,filename);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||sha(fs.readFileSync(filename))!==file.sha256)throw Error('Legacy original checksum mismatch: '+original.id+'/'+file.name);
  verifiedBaseFiles++;
 }
 return {schema:'gravuru-legacy-original-correspondence/v2',baseManifest:baseFile,baseManifestSha256:sha(bytes),verifiedBaseFiles,deliveryCommit:DESIGN_BATCH_DELIVERY_COMMIT,readOnly:true,automaticAliasesApplied:false,provenance,...originalCorrespondence(base,sources,refs)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),o={};for(let i=0;i<args.length;i++){const k={'--katalog':'catalogueRoot','--base':'baseManifest','--out':'out'}[args[i]];if(!k)throw Error('Unknown argument');o[k]=args[++i];}
 const report=auditReviewOriginalCorrespondence(o);fs.writeFileSync(path.resolve(o.out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out:path.resolve(o.out),counts:report.counts}));
}
