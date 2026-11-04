// Transport the same final tree in small fast-forward pushes when GitHub rejects a large pack.
// No force push. Only the explicitly named, own review branch is addressed.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1],repo=path.resolve(value('--repo')),branch=value('--branch'),base=value('--base'),final=value('--final');
if(branch!=='dev/astra1-schiefer-designboegen-20261104'||![base,final].every(s=>/^[a-f0-9]{40}$/.test(s)))throw Error('Explicit slate review branch and full commit IDs required');
const planFile=path.resolve(repo,'../slate-upload-plan.json'),index=path.resolve(repo,'../slate-upload.index');
function git(argv,input,alternate=false){const r=spawnSync('git',argv,{cwd:repo,input,encoding:'utf8',maxBuffer:64*1024*1024,env:{...process.env,...(alternate?{GIT_INDEX_FILE:index}:{})}});if(r.status!==0)throw Error((r.stderr||r.stdout||'git failed').slice(-3000));return r.stdout.trimEnd();}
const finalTree=git(['rev-parse',final+'^{tree}']);let plan;
if(fs.existsSync(planFile)){plan=JSON.parse(fs.readFileSync(planFile));if(plan.branch!==branch||plan.base!==base||plan.final!==final)throw Error('Different upload plan exists');}
else{
 if(git(['branch','--show-current'])!==branch||git(['rev-parse','HEAD'])!==final)throw Error('Unexpected local branch');
 if(git(['ls-remote','--heads','origin',branch]))throw Error('Remote branch already exists; do not overwrite it');
 const changed=git(['diff','--name-only','-z',base,final]).split('\0').filter(Boolean);
 const entries=new Map(git(['ls-tree','-r','-z',final]).split('\0').filter(Boolean).map(line=>{const tab=line.indexOf('\t'),[mode,type,oid]=line.slice(0,tab).split(' ');return [line.slice(tab+1),{mode,type,oid,file:line.slice(tab+1)}];}));
 const records=changed.map(file=>{const e=entries.get(file);if(!e||e.type!=='blob')throw Error('Unsupported changed path '+file);return e;});
 const metadata=records.filter(e=>!e.file.endsWith('.webp')),pictures=records.filter(e=>e.file.endsWith('.webp'));
 const sizes=git(['cat-file','--batch-check=%(objectname) %(objectsize)'],pictures.map(e=>e.oid).join('\n')+'\n').split('\n');
 const byHash=new Map(sizes.map(line=>{const [oid,size]=line.split(' ');return [oid,Number(size)];}));
 const batches=[metadata];let batch=[],bytes=0;
 for(const entry of pictures){const size=byHash.get(entry.oid);if(batch.length&&bytes+size>18*1024*1024){batches.push(batch);batch=[];bytes=0;}batch.push(entry);bytes+=size;}if(batch.length)batches.push(batch);
 git(['read-tree',base],undefined,true);let parent=base;const commits=[];
 for(let i=0;i<batches.length;i++){
  git(['update-index','-z','--index-info'],batches[i].map(e=>e.mode+' '+e.oid+'\t'+e.file+'\0').join(''),true);
  const tree=git(['write-tree'],undefined,true),commit=git(['commit-tree',tree,'-p',parent,'-m',i===0?'Map existing slate designs without approval; add review reports':'Add lossless slate contact sheets '+i+'/'+(batches.length-1)]);
  commits.push({commit,files:batches[i].length});parent=commit;
 }
 if(git(['rev-parse',parent+'^{tree}'])!==finalTree)throw Error('Final tree differs from audited result');
 plan={branch,base,final,finalTree,commits};fs.writeFileSync(planFile,JSON.stringify(plan,null,2)+'\n');
}
let remote=git(['ls-remote','--heads','origin',branch]).split(/\s/)[0]||null;
if(remote&&!plan.commits.some(c=>c.commit===remote))throw Error('Remote changed outside this upload');
const start=remote?plan.commits.findIndex(c=>c.commit===remote)+1:0;
for(let i=start;i<plan.commits.length;i++){
 const step=plan.commits[i];
 for(let attempt=1;attempt<=3;attempt++){try{git(['-c','http.version=HTTP/1.1','-c','http.postBuffer=33554432','push','origin',step.commit+':refs/heads/'+branch]);break;}catch(error){console.log(JSON.stringify({batch:i+1,attempt,retry:attempt<3}));if(attempt===3)throw error;}}
 console.log(JSON.stringify({uploaded:i+1,total:plan.commits.length,files:step.files,commit:step.commit}));
}
const last=plan.commits.at(-1).commit;
if(git(['ls-remote','--heads','origin',branch]).split(/\s/)[0]!==last)throw Error('Remote verification failed');
const local=git(['rev-parse','refs/heads/'+branch]);if(local===final)git(['update-ref','refs/heads/'+branch,last,final]);else if(local!==last)throw Error('Local branch changed outside this upload');
console.log(JSON.stringify({head:last,tree:finalTree,verified:true}));
