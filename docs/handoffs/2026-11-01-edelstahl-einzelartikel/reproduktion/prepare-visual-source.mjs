import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [repo,localSource,destination]=process.argv.slice(2);if(!destination)throw Error('Arguments: catalogue-repo local-source-checkout output-dir');
const out=path.resolve(destination),root=path.resolve(repo),old=path.resolve(localSource);
const git=(args,opts={})=>execFileSync('git',args,{cwd:root,maxBuffer:120*1024*1024,...opts});
const source=JSON.parse(fs.readFileSync(path.join(out,'catalog-source.json'),'utf8'));
const extra=JSON.parse(fs.readFileSync(path.join(out,'pr99/catalog-source.json'),'utf8'));
const tree=ref=>git(['ls-tree','-rz',ref],{encoding:'utf8'}).split('\0').filter(Boolean).map(l=>{const [i,p]=l.split('\t');return {path:p,oid:i.split(' ')[2]};});
const roundCommit=git(['rev-parse','62404b12d429b439e0f8738d6bc81b23e15bd25d'],{encoding:'utf8'}).trim();
const round=tree(roundCommit).filter(f=>/^designs\/edelstahl-gravur-65x65-rund\/[^/]+\/design\.(json|svg)$/.test(f.path));
const svgs=tree(source.commit).filter(f=>/^designs\/edelstahl-[^/]+\/[^/]+\/design.svg$/.test(f.path));
const read=[...svgs,...round],bytes=new Map(),need=[];
for(const f of read){const p=path.join(old,f.path);if(fs.existsSync(p)){const b=fs.readFileSync(p),h=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');if(h===f.oid){bytes.set(f.oid,b);continue;}}need.push(f);}
const check=git(['cat-file','--batch-check'],{input:need.map(f=>f.oid+'\n').join(''),encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1'}}).trim().split('\n');
const missing=check.filter(s=>s.endsWith(' missing')).map(s=>s.split(' ')[0]);
for(let i=0;i<missing.length;i+=80){git(['-c','fetch.negotiationAlgorithm=noop','fetch','origin','--no-tags','--no-write-fetch-head','--recurse-submodules=no','--filter=blob:none','--stdin'],{input:missing.slice(i,i+80).join('\n')+'\n'});console.log('Read '+Math.min(i+80,missing.length)+'/'+missing.length);}
const buf=git(['cat-file','--batch'],{input:need.map(f=>f.oid+'\n').join('')});let off=0;
for(const f of need){const end=buf.indexOf(10,off),n=Number(buf.subarray(off,end).toString().split(' ')[2]);if(!Number.isFinite(n))throw Error('Missing '+f.path);bytes.set(f.oid,buf.subarray(end+1,end+1+n));off=end+n+2;}
const extraByPath=new Map(extra.files.map(f=>[f.path,f])),svgByPath=new Map(svgs.map(f=>[f.path,f]));let changed=0,added=0;
for(const f of source.files){if(!f.path.endsWith('/design.json'))continue;const v=extraByPath.get(f.path);const additions=(v?.data.sizes||[]).filter(s=>!(f.data.sizes||[]).includes(s));if(additions.length){f.data.sizes=[...(f.data.sizes||[]),...additions];f.sizeReviewSource={commit:extra.commit,blob:v.oid,additions};changed++;added+=additions.length;}
const svg=svgByPath.get(f.path.replace(/json$/,'svg'));if(!svg)throw Error('SVG missing '+f.path);f.svg=bytes.get(svg.oid).toString('utf8');f.svgBlob=svg.oid;}
for(const f of round.filter(f=>f.path.endsWith('.json'))){const svg=round.find(x=>x.path===f.path.replace(/json$/,'svg'));source.files.push({...f,data:JSON.parse(bytes.get(f.oid)),svg:bytes.get(svg.oid).toString('utf8'),svgBlob:svg.oid,roundReviewSource:{commit:roundCommit,pr:12}});}
source.reviewSources={base:source.commit,sizeProposal:extra.commit,roundProposal:roundCommit,changedSizeFiles:changed,addedSizeBindings:added,roundFiles:round.filter(f=>f.path.endsWith('.json')).length};
fs.writeFileSync(path.join(out,'visual-source.json'),JSON.stringify(source)+'\n');console.log(JSON.stringify(source.reviewSources));
