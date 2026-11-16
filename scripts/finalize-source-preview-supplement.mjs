// Prefer byte-identical historical catalogue PNGs to derived legacy SVG renders.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const hash=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f));
const json=v=>JSON.stringify(v,null,2)+'\n';
const child=(root,file)=>{if(typeof file!=='string'||file.includes('\\')||file.split('/').some(p=>!p||p==='..'||p==='.'||p.includes(':')))throw Error('Unsafe relative file');const target=path.resolve(root,file);if(!target.startsWith(path.resolve(root)+path.sep))throw Error('File escapes root');return target;};
export function finalizeSourcePreviewSupplement({out,baseRoot,gapAudit,legacyProof,archiveOut}){
 const root=path.resolve(out),base=path.resolve(baseRoot),archive=path.resolve(archiveOut);
 if([root,base].some(dir=>archive===dir||archive.startsWith(dir+path.sep)||dir.startsWith(archive+path.sep)))throw Error('Separate archive required');
 const manifestFile=child(root,'supplement-manifest.json'),manifest=read(manifestFile),proof=read(child(root,'preparation-proof.json'));
 if(manifest.schema!=='gravuru-source-preview-supplement/v1'||manifest.complete!==true||manifest.counts.pending!==0||manifest.sourceImagePreferenceFinalized)throw Error('Completed unfinalized raster supplement required');
 const baseBytes=fs.readFileSync(child(base,'manifest.json')),basePack=JSON.parse(baseBytes),baseIndex=new Map(read(child(base,'files-sha256.json')).map(f=>[f.file,f]));
 const oldIndex=new Map(read(child(root,'files-sha256.json')).map(f=>[f.file,f]));
 for(const [file,entry]of oldIndex){const b=fs.readFileSync(child(root,file));if(b.length!==entry.bytes||hash(b)!==entry.sha256)throw Error('Supplement changed before finalization: '+file);}
 const gaps=new Set(read(gapAudit).rows.map(r=>r.id)),fallback=read(legacyProof),candidates=fallback.rows.filter(r=>gaps.has(r.id)||!r.hasSvg),byId=new Map(basePack.originals.map(r=>[r.id,r]));
 if(new Set(candidates.map(r=>r.id)).size!==candidates.length)throw Error('Duplicate original PNG candidate');
 const validated=candidates.map(candidate=>{
  const row=byId.get(candidate.id),source=baseIndex.get(candidate.preview),name=candidate.preview.split('/').at(-1),declared=row?.files?.find(f=>f.name===name);
  if(!row||row.reviewSourcePreview||row.targets?.some(t=>t.status==='prepared')||!source||!declared||candidate.preview!=='originals/'+row.id+'/'+name||!['preview.png','design.png'].includes(name))throw Error('Existing PNG is not an eligible open original');
  const bytes=fs.readFileSync(child(base,candidate.preview)),sha256=hash(bytes);
  if(candidate.sha256!==sha256||source.sha256!==sha256||declared.sha256!==sha256||source.bytes!==bytes.length||candidate.bytes!==bytes.length||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Existing PNG source bytes differ');
  return {row,candidate,bytes,sha256,name};
 });
 const replacements=new Map(validated.map(v=>[v.row.id,v])),rows=manifest.rows.filter(r=>!replacements.has(r.originalId)).map(r=>({...r,provenanceKind:'rendered-source-svg'})),archived=[];
 for(const v of validated){
  const originalId=v.row.id,preview='originals/_source-previews/'+hash(originalId).slice(0,24)+'.png',target=child(root,preview),prior=manifest.rows.find(r=>r.originalId===originalId);
  if(prior){
   if(prior.preview!==preview)throw Error('Unexpected legacy raster path');
   const bytes=fs.readFileSync(target);if(hash(bytes)!==prior.sha256)throw Error('Legacy derivative changed');
   fs.mkdirSync(archive,{recursive:true});fs.writeFileSync(child(archive,path.basename(preview)),bytes,{flag:'wx'});archived.push(prior);
  }else if(fs.existsSync(target))throw Error('Untracked output image already exists');
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,v.bytes,{flag:prior?'w':'wx'});
  rows.push({originalId,sourceOriginalId:v.row.sourceOriginalId||originalId,provenanceKind:'existing-source-image',preview,bytes:v.bytes.length,sha256:v.sha256,
   source:{file:v.row.source.replace(/\/design\.json$/,'')+'/'+v.name,galleryFile:v.candidate.preview,sha256:v.sha256,kind:'preserved-gallery-original'},fonts:[],photos:[],
   geometry:{width:v.bytes.readUInt32BE(16),height:v.bytes.readUInt32BE(20),backgroundReason:'Unveränderte vorhandene Katalog-PNG, keine Neurasterung oder Hintergrundänderung.'},reviewOnly:true,released:false});
 }
 const renderingBlockers=manifest.blocked.filter(b=>replacements.has(b.originalId)).map(b=>({...b,coveredByExistingOriginalPreview:true})),blocked=manifest.blocked.filter(b=>!replacements.has(b.originalId));
 const counts={requested:new Set([...manifest.rows.map(r=>r.originalId),...manifest.blocked.map(r=>r.originalId),...validated.map(v=>v.row.id)]).size,rendered:rows.filter(r=>r.provenanceKind==='rendered-source-svg').length,existingOriginalPreviews:validated.length,available:rows.length,blocked:blocked.length,pending:0,renderingBlockers:renderingBlockers.length};
 if(new Set(rows.map(r=>r.originalId)).size!==rows.length||counts.available+counts.blocked!==counts.requested)throw Error('Final supplement identity/count mismatch');
 const existingOriginalSources=validated.map(v=>({originalId:v.row.id,file:v.candidate.preview,bytes:v.bytes.length,sha256:v.sha256}));
 Object.assign(manifest,{rows:rows.sort((a,b)=>a.originalId.localeCompare(b.originalId)),counts,blocked,renderingBlockers,sourceImagePreferenceFinalized:true});
 Object.assign(proof,{counts,renderingBlockers,existingOriginalSources,existingOriginalSourceManifestSha256:hash(baseBytes),existingOriginalImageBytesVerified:true,archivedDerivativeCount:archived.length});
 fs.writeFileSync(manifestFile,json(manifest));fs.writeFileSync(child(root,'preparation-proof.json'),json(proof));
 if(archived.length)fs.writeFileSync(child(archive,'archived-derivatives.json'),json({schema:'gravuru-superseded-source-preview-examples/v1',rows:archived,reason:'Vorhandene unveränderte Katalog-PNG erhält Vorrang vor abgeleiteter Legacy-SVG-Vorschau.'}),{flag:'wx'});
 const index=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name!=='files-sha256.json'){const bytes=fs.readFileSync(f);index.push({file:path.relative(root,f).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});}}}walk(root);fs.writeFileSync(child(root,'files-sha256.json'),json(index.sort((a,b)=>a.file.localeCompare(b.file))));
 return {out:root,counts,archivedDerivativeCount:archived.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=n=>args[args.indexOf(n)+1];
 console.log(JSON.stringify(finalizeSourcePreviewSupplement({out:get('--out'),baseRoot:get('--base'),gapAudit:get('--audit'),legacyProof:get('--legacy'),archiveOut:get('--archive')})));
}
