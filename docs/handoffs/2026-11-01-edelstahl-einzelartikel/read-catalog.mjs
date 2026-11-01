import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]),dest=path.resolve(process.argv[3]);
const git=(args,opts={})=>execFileSync('git',args,{cwd:root,maxBuffer:100*1024*1024,...opts});
const commit=git(['rev-parse','--verify',process.argv[4]||'origin/main'],{encoding:'utf8'}).trim();
const tree=git(['ls-tree','-rz',commit],{encoding:'utf8'}).split('\0').filter(Boolean).map(l=>{const [info,p]=l.split('\t');return {path:p,oid:info.split(' ')[2]};});
const files=tree.filter(x=>['familien/edelstahl/steel-door-signs.json','linien/edelstahl-tuerschilder.json'].includes(x.path)||/^designs\/edelstahl-[^/]+\/[^/]+\/design.json$/.test(x.path));
const input=files.map(f=>f.oid+'\n').join('');
const checked=git(['cat-file','--batch-check'],{input,encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).trim().split('\n');
const missing=checked.filter(s=>s.endsWith(' missing')).map(s=>s.split(' ')[0]);
for(let i=0;i<missing.length;i+=80){try {git(['-c','fetch.negotiationAlgorithm=noop','fetch','origin','--no-tags','--no-write-fetch-head','--recurse-submodules=no','--filter=blob:none','--stdin'],{input:missing.slice(i,i+80).join('\n')+'\n'});}catch(e){console.error(e.stderr?.toString());process.exit(1);}console.log('Quellobjekte gelesen: '+Math.min(i+80,missing.length)+'/'+missing.length);}
const buf=git(['cat-file','--batch'],{input});let offset=0;const values=[];
for(const f of files){const end=buf.indexOf(10,offset),line=buf.subarray(offset,end).toString(),n=Number(line.split(' ')[2]);if(!Number.isFinite(n))throw Error('Quelle fehlt '+f.path);const d=JSON.parse(buf.subarray(end+1,end+1+n).toString('utf8'));values.push({...f,data:d});offset=end+n+2;}
fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'catalog-source.json'),JSON.stringify({commit,files:values},null,2)+'\n');
const ds=values.filter(v=>v.path.endsWith('/design.json'));
console.log(JSON.stringify({commit,files:values.length,designs:ds.length,approved:ds.filter(x=>x.data.ziele?.some(z=>z.familie==='steel-door-signs'&&z.freigabe?.status==='freigegeben')).length}));
