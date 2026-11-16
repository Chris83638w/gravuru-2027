'use strict';
// Fixed-target catalogue operator. No app, database, Shopify or restart access.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const MANIFEST_SHA='5cca0332016c40d99ecbf2aaf93e9897c81d4e4fbaa39df83dc2635b5b414b3f';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const absent=Symbol('absent');
function fail(message){throw Error(message);}
function mergeJson(base,local,target,at='$'){
 if(isDeepStrictEqual(local,base))return target;
 if(isDeepStrictEqual(target,base)||isDeepStrictEqual(local,target))return local;
 const object=v=>v!==null&&v!==absent&&typeof v==='object'&&!Array.isArray(v);
 if(object(local)&&object(target)&&(object(base)||base===absent)){
  const out=Object.create(null),keys=new Set([...Object.keys(base===absent?{}:base),...Object.keys(target),...Object.keys(local)]);
  for(const k of keys){const own=(v)=>v!==absent&&Object.hasOwn(v,k)?v[k]:absent;const v=mergeJson(own(base),own(local),own(target),at+'.'+k);if(v!==absent)out[k]=v;}
  return out;
 }
 fail('JSON conflict at '+at);
}
function appendAudit(base,local,target){
 for(const [label,b]of[['base',base],['local',local],['target',target]]){
  if(b.length&&b[b.length-1]!==10)fail('Audit '+label+' has incomplete final line');
  for(const line of b.toString('utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);if(!row||typeof row!=='object'||Array.isArray(row))fail('Invalid audit record');}
  if(label!=='base'&&(b.length<base.length||!b.subarray(0,base.length).equals(base)))fail('Audit '+label+' is not append-only from base');
 }
 const l=local.subarray(base.length),t=target.subarray(base.length);
 return l.equals(t)?Buffer.concat([base,l]):Buffer.concat([base,t,l]);
}
function safe(root,relative,{missing=false}={}){
 if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(x=>!x||x==='.'||x==='..'||/[\x00-\x1f:]/.test(x)))fail('Unsafe relative path');
 let p=root;const parts=relative.split('/');
 for(let i=0;i<parts.length;i++){
  p=path.join(p,parts[i]);let s;try{s=fs.lstatSync(p);}catch(e){if(missing&&e.code==='ENOENT')return path.join(root,...parts);throw e;}
  if(s.isSymbolicLink())fail('Symlink refused: '+relative);
  if(i<parts.length-1&&!s.isDirectory())fail('Parent is not directory: '+relative);
  if(i===parts.length-1&&(!s.isFile()||s.nlink!==1))fail('Not a single regular file: '+relative);
 }
 return p;
}
function current(root,p){const file=safe(root,p,{missing:true});try{return fs.readFileSync(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
function hashCurrent(root,p){const b=current(root,p);return b===null?null:sha(b);}
function git(root,...args){
 return cp.execFileSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','core.autocrlf=false','-c','gc.auto=0','-c','submodule.recurse=false','-c','core.quotePath=false',...args],{cwd:root,maxBuffer:16*1024*1024,timeout:120000,env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});
}
function gitText(root,...args){return git(root,...args).toString('utf8').trim();}
function status(root){return git(root,'status','--porcelain=v1','-z','--untracked-files=all').toString('utf8').split('\0').filter(Boolean).filter(x=>!['designs/.werkstatt-write.lock/owner.json','designs/.werkstatt-write-journal.json'].includes(x.slice(3)));}
function checkStatus(root,expected){
 const rows=status(root);if(rows.some(x=>x.slice(0,2)!==' M')||!isDeepStrictEqual(rows.map(x=>x.slice(3)).sort(),[...expected].sort()))fail('Unexpected dirty/staged/untracked paths; no catalogue change made');
 if(git(root,'diff','--cached','--name-only').length)fail('Index has staged changes');
 return rows;
}
function pending(root,ownLock=false){
 for(const p of['designs/.werkstatt-write-journal.json','.original18-native-import.lock','designs/.original18-native-import.lock','.git/index.lock','.git/HEAD.lock'])if(fs.existsSync(path.join(root,p)))fail('Pending writer/journal: '+p);
 if(!ownLock&&fs.existsSync(path.join(root,'designs/.werkstatt-write.lock')))fail('Native catalogue writer lock exists');
}
function validateManifest(m){
 if(m.schema!=='gravuru/catalog-ff/v1'||m.files.length!==552||m.dirty.length!==3)fail('Manifest shape differs');
 if(m.files.some(f=>!['A','M'].includes(f.status)||!['100644','100755'].includes(f.newMode)))fail('Only explicit ordinary-file additions/modifications allowed');
 if(new Set(m.files.map(f=>f.path)).size!==m.files.length)fail('Duplicate manifest paths');
}
function inspect(m,bundle,{ownLock=false}={}){
 const root=m.root;if(fs.realpathSync(root)!==root)fail('Canonical root differs');
 if(!fs.lstatSync(path.join(root,'.git')).isDirectory())fail('Expected self-contained .git directory');
 if(path.resolve(gitText(root,'rev-parse','--show-toplevel'))!==root)fail('Wrong repository root');
 if(gitText(root,'symbolic-ref','--short','HEAD')!==m.branch||gitText(root,'rev-parse','HEAD')!==m.base)fail('Branch or HEAD differs');
 pending(root,ownLock);
 if(sha(fs.readFileSync(bundle))!==m.bundle.sha256||fs.statSync(bundle).size!==m.bundle.bytes)fail('Bundle bytes differ');
 git(root,'bundle','verify',bundle);
 const refs=gitText(root,'bundle','list-heads',bundle);if(refs!==m.target+' '+m.ref)fail('Unexpected bundle ref');
 const beforeStatus=checkStatus(root,m.dirty.map(d=>d.path));
 const dirtyMap=new Map(m.dirty.map(d=>[d.path,d]));
 for(const f of m.files){const expected=dirtyMap.get(f.path)?.sha256??f.oldSha256;if(hashCurrent(root,f.path)!==expected)fail('Working file differs from exact pinned base: '+f.path);}
 const merged=[];
 for(const d of m.dirty){
  const local=current(root,d.path),base=Buffer.from(d.base,'base64'),target=Buffer.from(d.target,'base64');
  if(local===null||sha(local)!==d.sha256||sha(base)!==d.baseSha256||sha(target)!==d.targetSha256)fail('Pinned local/special bytes differ: '+d.path);
  if(!git(root,'show',m.base+':'+d.path).equals(base))fail('Base object differs: '+d.path);
  let result;
  if(d.kind==='json')result=Buffer.from(JSON.stringify(mergeJson(JSON.parse(base),JSON.parse(local),JSON.parse(target)),null,2)+'\n');
  else if(d.kind==='audit')result=appendAudit(base,local,target);
  else {if(!base.equals(target))fail('Target changes preserved SVG');result=local;}
  merged.push({path:d.path,kind:d.kind,bytes:result,sha256:sha(result),localSha256:sha(local)});
 }
 const attrs=cp.execFileSync('git',['check-attr','-z','--stdin','filter','working-tree-encoding'],{cwd:root,input:m.files.map(f=>f.path).join('\0')+'\0',maxBuffer:1024*1024}).toString('utf8').split('\0');
 for(let i=0;i<attrs.length-1;i+=3)if(!['unspecified','unset'].includes(attrs[i+2]))fail('Custom working-tree conversion refused: '+attrs[i]);
 for(const f of m.files){safe(root,f.path,{missing:true});}
 return{root,beforeStatus,merged,files:m.files.length,added:m.files.filter(f=>f.status==='A').length,modified:m.files.filter(f=>f.status==='M').length};
}
function writeAtomic(file,bytes,mode){
 const tmp=file+'.mika-'+crypto.randomUUID()+'.tmp';const fd=fs.openSync(tmp,'wx',mode);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 try{fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function durableWrite(file,bytes,mode=0o600){const fd=fs.openSync(file,'wx',mode);try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function durableJson(file,data){durableWrite(file,JSON.stringify(data,null,2)+'\n');}
function ensureBackupRoot(p){
 const parent=path.dirname(p);if(fs.realpathSync(parent)!==parent)fail('Backup parent is not canonical');
 if(!fs.existsSync(p))fs.mkdirSync(p,{mode:0o700});
 if(fs.realpathSync(p)!==p||!fs.lstatSync(p).isDirectory())fail('Invalid backup root');
}
function apply(m,bundle,{writersStopped=false,afterMerge}={}){
 if(!writersStopped)fail('Apply requires explicit --writers-stopped after operator checks import/Git writers');
 inspect(m,bundle);ensureBackupRoot(m.backupRoot);
 const root=m.root,lock=path.join(root,'designs/.werkstatt-write.lock'),owner=path.join(lock,'owner.json');
 fs.mkdirSync(lock);fs.writeFileSync(owner,JSON.stringify({pid:process.pid,purpose:'issue233 catalogue FF'}),{flag:'wx',mode:0o600});
 let backup,mutated=false,finished=false,beforeIndexSha,afterIndexSha;const records=[];
 const journal=path.join(root,'designs/.werkstatt-write-journal.json');
 try{
  const plan=inspect(m,bundle,{ownLock:true});
  backup=path.join(m.backupRoot,new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID());fs.mkdirSync(backup,{mode:0o700});
  const all=new Map(m.files.map(f=>[f.path,f]));for(const d of m.dirty)if(!all.has(d.path))all.set(d.path,{path:d.path,oldSha256:d.baseSha256,newSha256:d.targetSha256,newMode:'100644'});
  for(const f of all.values()){
   const file=safe(root,f.path,{missing:true}),bytes=current(root,f.path);const mode=bytes===null?null:fs.statSync(file).mode&0o777;
   const record={path:f.path,existed:bytes!==null,beforeSha256:bytes===null?null:sha(bytes),beforeMode:mode,targetSha256:f.newSha256,finalSha256:plan.merged.find(d=>d.path===f.path)?.sha256??f.newSha256};
   if(bytes!==null){const dest=path.join(backup,'files',f.path);fs.mkdirSync(path.dirname(dest),{recursive:true,mode:0o700});durableWrite(dest,bytes,mode);if(sha(fs.readFileSync(dest))!==record.beforeSha256)fail('Backup verification failed');}
   records.push(record);
  }
  const index=fs.readFileSync(safe(root,'.git/index'));beforeIndexSha=sha(index);durableWrite(path.join(backup,'git-index'),index);
  durableWrite(path.join(backup,'git-HEAD'),fs.readFileSync(safe(root,'.git/HEAD')));
  durableJson(path.join(backup,'before.json'),{schema:'gravuru/catalog-ff-backup/v1',base:m.base,target:m.target,branch:m.branch,root,manifestSha256:MANIFEST_SHA,bundleSha256:m.bundle.sha256,indexSha256:sha(index),status:plan.beforeStatus,files:records});
  for(const f of plan.merged)durableWrite(path.join(backup,f.kind+'-merged'),f.bytes);
  // Import only the exact bundle into our private ref; this never moves HEAD.
  git(root,'fetch','--no-tags','--no-write-fetch-head',bundle,m.ref+':refs/mika/issue233-target-20261111');
  if(gitText(root,'rev-parse','refs/mika/issue233-target-20261111')!==m.target)fail('Imported target differs');
  git(root,'merge-base','--is-ancestor',m.base,m.target);
  inspect(m,bundle,{ownLock:true}); // final working bytes/HEAD/status check after backup/import
  git(root,'update-ref','refs/mika/issue233-backup-'+path.basename(backup),m.base);
  // Deliberately not a native <=20-file transaction. If interrupted, native
  // writers reject this version and an operator restores the verified backup.
  durableJson(journal,{version:'mika-catalog-ff/v1',backup,base:m.base,target:m.target,phase:'operator-in-progress'});
  mutated=true;
  for(const d of m.dirty)writeAtomic(safe(root,d.path),Buffer.from(d.base,'base64'),records.find(r=>r.path===d.path).beforeMode);
  if(status(root).length)fail('Repository was not clean after preserving exactly the three dirty files');
  git(root,'-c','merge.autoStash=false','merge','--ff-only','--no-edit','--no-stat',m.target);
  afterIndexSha=sha(fs.readFileSync(safe(root,'.git/index')));
  if(gitText(root,'rev-parse','HEAD')!==m.target)fail('HEAD did not fast-forward to target');
  for(const f of m.files)if(hashCurrent(root,f.path)!==f.newSha256)fail('Fast-forward output differs: '+f.path);
  afterMerge?.(); // local fault-test hook; no CLI input can supply a callback
  for(const f of plan.merged)writeAtomic(safe(root,f.path),f.bytes,records.find(r=>r.path===f.path).beforeMode);
  for(const f of records)if(hashCurrent(root,f.path)!==f.finalSha256)fail('Final file differs: '+f.path);
  checkStatus(root,plan.merged.filter(d=>d.sha256!==m.dirty.find(f=>f.path===d.path).targetSha256).map(d=>d.path));
  if(gitText(root,'rev-parse','HEAD')!==m.target||gitText(root,'symbolic-ref','--short','HEAD')!==m.branch)fail('Final HEAD/branch changed');
  const receipt={ok:true,head:m.target,branch:m.branch,files:m.files.length,dirtyPreserved:plan.merged.map(f=>({path:f.path,sha256:f.sha256})),backup,appChanges:false,restart:false,at:new Date().toISOString()};
  durableJson(path.join(backup,'success.json'),receipt);finished=true;return receipt;
 }catch(error){
  if(mutated&&backup){
   try{
    const meta=JSON.parse(fs.readFileSync(path.join(backup,'before.json'),'utf8')),head=gitText(root,'rev-parse','HEAD');
    if(![m.base,m.target].includes(head)||gitText(root,'symbolic-ref','--short','HEAD')!==m.branch)fail('Rollback refuses unknown HEAD');
    if(fs.existsSync(path.join(root,'.git/index.lock')))fail('Rollback refuses foreign Git lock');
    if(![beforeIndexSha,afterIndexSha].includes(sha(fs.readFileSync(safe(root,'.git/index')))))fail('Rollback refuses foreign index');
    const allowed=new Set(records.map(f=>f.path));if(status(root).some(r=>!allowed.has(r.slice(3))))fail('Rollback refuses foreign changed paths');
    for(const f of records){const got=hashCurrent(root,f.path),d=m.dirty.find(d=>d.path===f.path);if(![f.beforeSha256,f.targetSha256,f.finalSha256,d?.baseSha256].includes(got))fail('Rollback refuses foreign bytes: '+f.path);}
    for(const f of records){const file=safe(root,f.path,{missing:true});if(f.existed){const bytes=fs.readFileSync(path.join(backup,'files',f.path));if(sha(bytes)!==f.beforeSha256)fail('Backup changed');fs.mkdirSync(path.dirname(file),{recursive:true});writeAtomic(file,bytes,f.beforeMode);}else if(fs.existsSync(file))fs.unlinkSync(file);}
    const index=fs.readFileSync(path.join(backup,'git-index'));if(sha(index)!==meta.indexSha256)fail('Backup index changed');writeAtomic(path.join(root,'.git/index'),index,0o644);
    if(head===m.target)git(root,'update-ref','refs/heads/'+m.branch,m.base,m.target);
    checkStatus(root,m.dirty.map(d=>d.path));for(const f of records)if(hashCurrent(root,f.path)!==f.beforeSha256)fail('Rollback verification failed');
    durableJson(path.join(backup,'rollback.json'),{ok:true,head:m.base,error:error.message,at:new Date().toISOString()});
   }catch(rollback){throw new AggregateError([error,rollback],'Stopped. Automatic rollback could not be verified. Keep lock and backup for operator.');}
  }
  throw error;
 }finally{
  // Keep the native lock on an unverified rollback; a live owner must investigate.
  const rollbackOk=backup&&fs.existsSync(path.join(backup,'rollback.json'));
  if(!mutated||finished||rollbackOk){if(mutated&&fs.existsSync(journal))fs.unlinkSync(journal);if(fs.existsSync(owner))fs.unlinkSync(owner);if(fs.existsSync(lock))fs.rmdirSync(lock);}
 }
}
function main(){
 const args=process.argv.slice(2);if(args.some(a=>!['--inspect','--apply','--writers-stopped'].includes(a))||args.includes('--inspect')&&args.includes('--apply'))fail('Use --inspect OR --apply --writers-stopped');
 const bytes=fs.readFileSync(path.join(__dirname,'manifest.json'));if(sha(bytes)!==MANIFEST_SHA)fail('Manifest hash differs');const m=JSON.parse(bytes);validateManifest(m);
 if(process.platform!=='linux')fail('Fixed production runner requires Linux; use exported functions only in isolated local fixtures');
 const bundle=path.join(__dirname,m.bundle.file);
 const result=args.includes('--apply')?apply(m,bundle,{writersStopped:args.includes('--writers-stopped')}):(()=>{const r=inspect(m,bundle);return{ok:true,mode:'read-only-inspect',head:m.base,target:m.target,files:r.files,added:r.added,modified:r.modified,dirty:r.merged.map(f=>({path:f.path,mergeSha256:f.sha256,localSha256:f.localSha256})),catalogueWrites:false};})();
 console.log(JSON.stringify(result,null,2));
}
module.exports={mergeJson,appendAudit,inspect,apply,sha};
if(require.main===module)try{main();}catch(e){console.error(JSON.stringify({ok:false,error:e.message,causes:e.errors?.map(x=>x.message)}));process.exitCode=1;}
