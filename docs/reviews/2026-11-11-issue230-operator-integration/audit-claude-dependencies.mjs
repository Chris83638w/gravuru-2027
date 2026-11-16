import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const prior=read('runtime-dependencies.json'),upstream=read('claude-ac10e6c-tree.json');if(upstream.truncated)throw Error('Truncated upstream tree');
const files=new Map(upstream.tree.filter(e=>e.type==='blob').map(e=>[e.path,e.sha]));
const b=new Set(read('changed-B.json').entries.filter(e=>e.runtime).map(e=>e.path)),c=new Set(read('changed-C-material.json').entries.filter(e=>e.runtime).map(e=>e.path));
const dependencies=prior.dependencies.map(({mainBlob,changedFromMain,...d})=>({...d,ac10e6cBlob:files.get(d.path)||null,missingOnAc10e6c:!files.has(d.path),differentFromAc10e6c:files.get(d.path)!==d.finalBlob}));
const missing=new Set(dependencies.filter(d=>d.missingOnAc10e6c).map(d=>d.path)),adj=new Map();for(const e of prior.edges){if(!adj.has(e.from))adj.set(e.from,[]);adj.get(e.from).push(e.to);}
const entrypoints=dependencies.filter(d=>d.requested).map(d=>{const queue=[[d.path]],seen=new Set([d.path]),routes=[];while(queue.length){const route=queue.shift(),p=route.at(-1);if(missing.has(p))routes.push({dependency:p,direct:route.length===2,chain:route});for(const q of adj.get(p)||[])if(!seen.has(q)){seen.add(q);queue.push([...route,q]);}}return {path:d.path,changedIn:[...(b.has(d.path)?['B']:[]),...(c.has(d.path)?['C-material']:[])],missingDependencies:routes};});
const direct=prior.edges.filter(e=>(b.has(e.from)||c.has(e.from))&&missing.has(e.to));
const refs={integrationSource:prior.refs.tip,Bbase:prior.refs.base,B:prior.refs.B,C:prior.refs.C,comparison:'ac10e6cee00469591514dcb4fa477b0547a54c48'};
const result={schema:'issue230-runtime-dependencies-against-claude/v1',refs,scope:'Existing static-local-import inventory rebased by exact blob lookup against the complete GitHub ac10e6c tree (4339 entries; not truncated). No claim that ac10e6c equals every live file; the 19 live divergences need the separate snapshot.',requestedRuntime:entrypoints.length,closure:dependencies.length,missingOnAc10e6c:missing.size,differentFromAc10e6c:dependencies.filter(d=>d.differentFromAc10e6c).length,directMissingCount:direct.length,directMissing:direct,dependencies,entrypoints};
fs.writeFileSync(path.join(root,'runtime-dependencies-ac10e6c.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(root,'runtime-dependencies-ac10e6c.tsv'),'path\trequestedRuntime\tac10e6cBlob\tfinalBlob\tmissingOnAc10e6c\tdifferentFromAc10e6c\n'+dependencies.map(d=>[d.path,d.requested,d.ac10e6cBlob||'-',d.finalBlob,d.missingOnAc10e6c,d.differentFromAc10e6c].join('\t')).join('\n')+'\n');
fs.writeFileSync(path.join(root,'direct-missing-dependencies-ac10e6c.tsv'),'entrypoint\tdirectMissingDependency\n'+direct.map(e=>e.from+'\t'+e.to).join('\n')+'\n');
const lines=['# Statische Importketten zu Dateien ohne ac10e6c-Pendant','',`Quelle ${refs.integrationSource}; Vergleich ${refs.comparison}. Jede Kette beginnt in einer der 28 B/C-Runtimedateien. Testdateien sind keine Runtime-Einstiegspunkte. Nicht sämtliche 120 von Claude genannten nur-v8-Dateien sind allein für die 28 Module notwendig. Nicht abgedeckt: dynamische URLs, CSS-/Build-Entrypoints, Serverdatei-Abweichungen.`, ''];
for(const e of entrypoints.filter(x=>x.missingDependencies.length)){lines.push('## '+e.path+' ('+e.changedIn.join(', ')+')','');for(const r of e.missingDependencies)lines.push('- `'+r.chain.join(' → ')+'`');lines.push('');}
fs.writeFileSync(path.join(root,'dependency-chains-ac10e6c.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({requested:result.requestedRuntime,closure:result.closure,missing:result.missingOnAc10e6c,different:result.differentFromAc10e6c,directMissing:direct.length,missingPaths:[...missing].sort(),direct}));
