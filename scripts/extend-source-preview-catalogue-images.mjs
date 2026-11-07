// Add original catalogue PNGs with verifiable Git commit/tree/blob membership.
// A new supplement is created; its frozen predecessor and native data stay intact.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const DELIVERY='86c1ff5f431acfe60d4cff388958112187005550',CATALOGUE='3c6051fbbc7904969948950fae12cae2ae663f30';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f));
const json=v=>JSON.stringify(v,null,2)+'\n';
const child=(root,file)=>{if(typeof file!=='string'||!file||file.includes('\\')||file.split('/').some(s=>!s||s==='.'||s==='..'||s.includes(':')))throw Error('Unsafe relative path');const full=path.resolve(root,file);if(!full.startsWith(path.resolve(root)+path.sep))throw Error('Path escapes root');return full;};
export function sourceGitObjectId(type,bytes){
 if(!['blob','tree','commit'].includes(type))throw Error('Unsupported Git object type');
 return createHash('sha1').update(type+' '+bytes.length+'\0').update(bytes).digest('hex');
}
export function sourceGitTreeEntries(bytes){
 const entries=new Map();let offset=0;
 while(offset<bytes.length){
  const space=bytes.indexOf(32,offset),zero=bytes.indexOf(0,space+1);
  if(space<offset||zero<space+2||zero+21>bytes.length)throw Error('Malformed Git tree');
  const mode=bytes.toString('ascii',offset,space),name=bytes.toString('utf8',space+1,zero),oid=bytes.subarray(zero+1,zero+21).toString('hex');
  if(!/^[0-7]{5,6}$/.test(mode)||name.includes('/')||entries.has(name))throw Error('Invalid Git tree entry');
  entries.set(name,{mode,oid});offset=zero+21;
 }
 return entries;
}
export function verifySourceGitMembership({commit,sourceFile,png,objects}){
 if(!/^[a-f0-9]{40}$/.test(commit)||typeof sourceFile!=='string'||sourceFile.split('/').some(p=>!p||p==='.'||p==='..'||/[\\\x00-\x1f]/.test(p)))throw Error('Invalid pinned source identity');
 const object=(type,oid)=>{const bytes=objects.get(type+':'+oid);if(!bytes||sourceGitObjectId(type,bytes)!==oid)throw Error('Git object hash differs');return bytes;};
 const commitBytes=object('commit',commit),match=/^tree ([a-f0-9]{40})\n/.exec(commitBytes.toString('utf8'));if(!match)throw Error('Commit tree missing');
 const parts=sourceFile.split('/');let tree=match[1];
 for(let i=0;i<parts.length;i++){
  const entry=sourceGitTreeEntries(object('tree',tree)).get(parts[i]);if(!entry)throw Error('Source file absent from pinned Git tree');
  if(i===parts.length-1){if(!['100644','100755'].includes(entry.mode)||entry.oid!==sourceGitObjectId('blob',png))throw Error('PNG differs from pinned Git blob');return entry.oid;}
  if(!['40000','040000'].includes(entry.mode))throw Error('Source path crosses a non-tree');tree=entry.oid;
 }
 throw Error('Source file missing');
}
export function extendSourcePreviewCatalogueImages({priorRoot,out,catalogueRoot,gapReport,galleryAddon}){
 const prior=path.resolve(priorRoot),dest=path.resolve(out),catalogue=path.resolve(catalogueRoot),code=fileURLToPath(new URL('../',import.meta.url));
 if(fs.existsSync(dest))throw Error('New supplement output required');
 for(const forbidden of [prior,catalogue,code])if(dest===forbidden||dest.startsWith(forbidden+path.sep)||forbidden.startsWith(dest+path.sep))throw Error('Separate supplement output required');
 const manifestBytes=fs.readFileSync(child(prior,'supplement-manifest.json')),manifest=JSON.parse(manifestBytes),proof=read(child(prior,'preparation-proof.json')),index=read(child(prior,'files-sha256.json')),report=read(gapReport),gallery=read(galleryAddon);
 if(manifest.complete!==true||manifest.counts.pending!==0||manifest.deliveryCommit!==DELIVERY||gallery.deliveryCommit!==DELIVERY||gallery.catalogueCommit!==CATALOGUE||report.sourceCommit!==DELIVERY)throw Error('Authoritative delivery/catalogue pins differ');
 const oldIds=new Set(manifest.rows.map(r=>r.originalId)),galleryRows=new Map(gallery.originals.map(r=>[r.id,r]));
 const objects=new Map(),fetch=(type,oid)=>{
  const key=type+':'+oid;if(objects.has(key))return objects.get(key);
  const bytes=execFileSync('git',['-C',catalogue,'cat-file',type,oid],{maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
  if(sourceGitObjectId(type,bytes)!==oid)throw Error('Pinned object bytes differ');objects.set(key,bytes);return bytes;
 };
 const commitBytes=fetch('commit',DELIVERY),match=/^tree ([a-f0-9]{40})\n/.exec(commitBytes.toString('utf8'));if(!match)throw Error('Pinned commit lacks tree');
 const rootTree=match[1],incoming=[];
 for(const item of report.rows){
  const row=galleryRows.get(item.canonicalOriginalId),file=item.sourcePath+'/preview.png',listed=item.availablePinnedSourceFiles.find(f=>f.file===file);
  if(!row||row.source!==item.sourcePath||row.reviewSourcePreview||row.targets?.some(t=>t.status==='prepared')||oldIds.has(row.id)||incoming.some(v=>v.originalId===row.id)||!listed)throw Error('Catalogue PNG is not an eligible source-only original');
  const bytes=fs.readFileSync(child(catalogue,file));if(bytes.length!==listed.bytes||sha(bytes)!==listed.sha256||sourceGitObjectId('blob',bytes)!==listed.gitBlob||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Pinned PNG differs from reviewed source');
  let tree=rootTree;const parts=file.split('/');
  for(let i=0;i<parts.length;i++){
   const entry=sourceGitTreeEntries(fetch('tree',tree)).get(parts[i]);if(!entry)throw Error('Image path absent from commit');
   if(i<parts.length-1){if(!['40000','040000'].includes(entry.mode))throw Error('Image path crosses non-tree');tree=entry.oid;}
  }
  const gitBlob=verifySourceGitMembership({commit:DELIVERY,sourceFile:file,png:bytes,objects});
  incoming.push({originalId:row.id,sourceOriginalId:row.sourceOriginalId||row.id,provenanceKind:'pinned-catalogue-image',preview:'originals/_source-previews/'+sha(row.id).slice(0,24)+'.png',bytes:bytes.length,sha256:sha(bytes),
   source:{file,sha256:sha(bytes),gitBlob,commit:DELIVERY,kind:'pinned-catalogue-image'},fonts:[],photos:[],geometry:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),backgroundReason:'Byteidentische originale Katalog-PNG aus dem gepinnten Git-Commit; keine Neurasterung.'},reviewOnly:true,released:false,_bytes:bytes});
 }
 // Verify the complete immutable predecessor before creating the new package.
 for(const entry of index){const bytes=fs.readFileSync(child(prior,entry.file));if(bytes.length!==entry.bytes||sha(bytes)!==entry.sha256)throw Error('Frozen predecessor changed: '+entry.file);}
 fs.mkdirSync(dest,{recursive:true});
 const write=(name,bytes)=>{const file=child(dest,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});};
 for(const entry of index.filter(e=>!['supplement-manifest.json','preparation-proof.json'].includes(e.file))){const target=child(dest,entry.file);fs.mkdirSync(path.dirname(target),{recursive:true});try{fs.linkSync(child(prior,entry.file),target);}catch(error){if(!['EXDEV','EPERM','ENOTSUP'].includes(error.code))throw error;fs.copyFileSync(child(prior,entry.file),target,fs.constants.COPYFILE_EXCL);}}
 for(const row of incoming){write(row.preview,row._bytes);delete row._bytes;}
 const descriptors=[];
 for(const [key,bytes]of objects){const [type,oid]=key.split(':'),file='evidence/git/objects/'+oid+'.'+type;write(file,bytes);descriptors.push({oid,type,file,bytes:bytes.length,sha256:sha(bytes)});}
 const gitProof='evidence/git/proof.json';
 write(gitProof,json({schema:'gravuru-pinned-catalogue-image-proof/v1',commitPins:{deliveryCommit:DELIVERY,catalogueCommit:CATALOGUE},commits:[{oid:DELIVERY,file:'evidence/git/objects/'+DELIVERY+'.commit',tree:rootTree}],objects:descriptors.sort((a,b)=>a.file.localeCompare(b.file)),images:incoming.map(r=>({originalId:r.originalId,file:r.source.file,gitBlob:r.source.gitBlob,bytes:r.bytes,sha256:r.sha256})),verified:true}));
 const rows=[...manifest.rows,...incoming].sort((a,b)=>a.originalId.localeCompare(b.originalId)),counts={...manifest.counts,requested:manifest.counts.requested+incoming.length,pinnedCataloguePreviews:incoming.length,available:rows.length};
 if(new Set(rows.map(r=>r.originalId)).size!==rows.length||counts.rendered+counts.existingOriginalPreviews+counts.pinnedCataloguePreviews!==counts.available||counts.available+counts.blocked!==counts.requested)throw Error('V2 preview counts differ');
 const pinnedSources=incoming.map(r=>({file:r.source.file,sha256:r.sha256,bytes:r.bytes,blob:r.source.gitBlob}));
 write('supplement-manifest.json',json({...manifest,version:2,catalogueCommit:CATALOGUE,gitProof,counts,rows,priorSupplementManifestSha256:sha(manifestBytes)}));
 write('preparation-proof.json',json({...proof,catalogueCommit:CATALOGUE,gitProof,counts,pinnedCatalogueSourceMembershipVerified:true,pinnedCatalogueImageBytesVerified:true,pinnedCatalogueImages:pinnedSources,sources:[...proof.sources,...pinnedSources],priorSupplementManifestSha256:sha(manifestBytes),deliveryIssue:'Liefermanifest dateien:[] ließ vorhandene preview.png/design.json aus, weil die zusammengeführte design.svg fehlt. 59 Originalbilder sind im gepinnten Katalog vorhanden.'}));
 const checks=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else{const bytes=fs.readFileSync(f);checks.push({file:path.relative(dest,f).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});}}}walk(dest);write('files-sha256.json',json(checks.sort((a,b)=>a.file.localeCompare(b.file))));
 return {out:dest,counts,gitObjects:objects.size,gitRootTree:rootTree,manifestSha256:sha(fs.readFileSync(child(dest,'supplement-manifest.json')))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=n=>args[args.indexOf(n)+1];
 console.log(JSON.stringify(extendSourcePreviewCatalogueImages({priorRoot:get('--prior'),out:get('--out'),catalogueRoot:get('--katalog'),gapReport:get('--gaps'),galleryAddon:get('--gallery')})));
}
