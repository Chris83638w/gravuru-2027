import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)),repo=path.join(out,'code-integration');
const git=(...args)=>execFileSync('git',args,{cwd:repo,maxBuffer:100*1024*1024});
const refs={main:'76269aa85b5dd7e22957fb138de7d404758d9ea5',base:'411188db5777d7fb0ec06c6fab2f6faf85270fc9',B:'6298f7af22056333569b030c249ce64568e46beb',C:git('rev-parse','9b0a4fd').toString().trim(),tip:git('rev-parse','64e026e').toString().trim()};
const trees=Object.fromEntries(Object.entries(refs).map(([key,ref])=>[key,new Map(git('ls-tree','-r',ref).toString().trim().split('\n').map(row=>{const [meta,p]=row.split('\t');return [p,meta.split(' ')[2]];}))]));
const isRuntime=p=>p.startsWith('app/')&&!/\.test\.mjs$/.test(p)&&!p.includes('/test-fixtures/')&&!/-test-fixture\.mjs$/.test(p);
const sha=p=>{const blob=git('show',`${refs.tip}:${p}`);return createHash('sha256').update(blob).digest('hex');};
function manifest(name,from,to){const lines=git('diff','--name-status','--no-renames',refs[from],refs[to]).toString().trim().split('\n').filter(Boolean);const entries=lines.map(line=>{const [status,p]=line.split('\t');return {status,path:p,runtime:isRuntime(p),fromBlob:trees[from].get(p)||null,toBlob:trees[to].get(p)||null};});fs.writeFileSync(path.join(out,`${name}.json`),JSON.stringify({from:refs[from],to:refs[to],entries},null,2)+'\n');fs.writeFileSync(path.join(out,`${name}.tsv`),'status\truntime\tpath\tfromGitBlob\ttoGitBlob\n'+entries.map(e=>[e.status,e.runtime,e.path,e.fromBlob||'-',e.toBlob||'-'].join('\t')).join('\n')+'\n');return entries;}
const all=manifest('changed-main-to-final','main','tip'),prior=manifest('prerequisites-main-to-base','main','base'),b=manifest('changed-B','base','B'),c=manifest('changed-C-material','B','C'),docs=manifest('changed-final-docs','C','tip');
for(const [name,from,to] of [['B-runtime','base','B'],['C-material-runtime','B','C']])fs.writeFileSync(path.join(out,`${name}.patch`),git('diff','--binary','--full-index',refs[from],refs[to],'--','app'));
const requested=[...new Set([...b,...c].filter(e=>isRuntime(e.path)).map(e=>e.path))].sort();
const allFiles=trees.tip;
function imports(p){const text=git('show',`${refs.tip}:${p}`).toString();const result=[];for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)){const q=path.posix.normalize(path.posix.join(path.posix.dirname(p),match[1]));if(allFiles.has(q))result.push(q);}return [...new Set(result)];}
const visited=new Set(),edges=[];function visit(p){if(visited.has(p))return;visited.add(p);if(!/\.m?js$/.test(p))return;for(const q of imports(p)){edges.push({from:p,to:q});visit(q);}}
for(const p of requested)visit(p);
const dependencies=[...visited].sort().map(p=>({path:p,requested:requested.includes(p),mainBlob:trees.main.get(p)||null,baseBlob:trees.base.get(p)||null,finalBlob:trees.tip.get(p),changedFromMain:trees.main.get(p)!==trees.tip.get(p),sha256:sha(p)}));
fs.writeFileSync(path.join(out,'runtime-dependencies.json'),JSON.stringify({refs,scope:'Static local imports transitively reachable from B/C runtime files. This is an inventory, not a deployment allowlist; dynamic resources/build inputs must also be verified.',dependencies,edges},null,2)+'\n');
const directMissing=edges.filter(e=>requested.includes(e.from)&&!trees.main.has(e.to));
fs.writeFileSync(path.join(out,'direct-missing-dependencies.tsv'),'from\tmissingOnMain\n'+directMissing.map(e=>e.from+'\t'+e.to).join('\n')+'\n');
const summary={refs,all:all.length,app:all.filter(e=>e.path.startsWith('app/')).length,runtimeMainDiff:all.filter(e=>e.runtime).length,priorApp:prior.filter(e=>e.path.startsWith('app/')).length,BApp:b.filter(e=>e.path.startsWith('app/')).length,CApp:c.filter(e=>e.path.startsWith('app/')).length,requestedRuntime:requested.length,docsOnly:docs.every(e=>!isRuntime(e.path)),closure:dependencies.length,missingOnMain:dependencies.filter(e=>!e.mainBlob).length,differentOnMain:dependencies.filter(e=>e.changedFromMain).length,directMissing,requested};
fs.writeFileSync(path.join(out,'integration-audit.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({...summary,directMissing:summary.directMissing.length,requested:undefined}));
