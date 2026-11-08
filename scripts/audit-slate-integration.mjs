// Read-only audit of the combined slate catalogue and unchanged source packages.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {assignTargetSeries,approvedForFamily,designTargets} from '../app/workshop/design-targets.mjs';
const args=process.argv.slice(2),arg=k=>args[args.indexOf(k)+1];
assert(args.includes('--katalog')&&args.includes('--out'),'--katalog and --out required');
const root=path.resolve(arg('--katalog'));
const git=(...a)=>execFileSync('git',['-C',root,...a],{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const previous='c0cffc85e0f703fa06e5e6cae61745aec47d5a24';
const mapping=JSON.parse(git('show',previous+':auftraege/2026-11-04-schiefer-designziele/zuordnung.json'));
const changed=new Set(git('diff-tree','--no-commit-id','--name-only','-r',previous,'HEAD').split('\n'));
const protectedRows=mapping.rows.filter(r=>['mapped-unapproved','existing-unchanged'].includes(r.status));
assert.equal(protectedRows.length,2944);
assert.deepEqual(protectedRows.filter(r=>changed.has(r.file)).map(r=>r.file),[],'Previous mapped/existing metadata changed');
const sources=[{pr:177,ref:'e6d87b9bc54381cf1349115059c84e22dd8ecf72',prefix:'designs/schiefer-menschen-*'},
 {pr:178,ref:'53caf60a9d54358e1289747f0b607f6951222a09',prefix:'designs/schiefer-tuerschilder-*'}];
for(const s of sources)assert.equal(git('diff-tree','--no-commit-id','--name-only','-r',s.ref,'HEAD','--',s.prefix),'','Claude source package changed');
// Read the committed metadata in one Git batch. Source artwork stays in Git;
// no second materialization of thousands of embedded-photo SVGs is needed.
const scoped=new Set(mapping.rows.map(r=>r.file));
const entries=git('ls-tree','-r','HEAD','--','designs').split('\n').map(line=>{
 const m=line.match(/^100644 blob ([a-f0-9]{40})\t(.+)$/);return m?{blob:m[1],file:m[2]}:null;
}).filter(e=>e&&(scoped.has(e.file)||/^designs\/schiefer-(menschen|tuerschilder)-[^/]+\/[^/]+\/design\.json$/.test(e.file)));
// Partial clones otherwise retrieve missing JSON blobs one HTTP request at a
// time. Refetch the pinned source commits with small blobs before the audit.
if(args.includes('--fetch-metadata')){
 execFileSync('git',['-C',root,'fetch','--quiet','--refetch','--no-tags','--filter=blob:limit=65536','origin',...sources.map(s=>git('rev-parse',s.ref))],{maxBuffer:8*1024*1024});
}
const batch=execFileSync('git',['-C',root,'cat-file','--batch'],{input:entries.map(e=>e.blob).join('\n')+'\n',maxBuffer:256*1024*1024});
let offset=0;
const masters=entries.map(e=>{
 const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString('utf8').split(' '),length=Number(header[2]);
 assert.equal(header[1],'blob');assert(Number.isFinite(length));offset=end+1;
 const json=JSON.parse(batch.subarray(offset,offset+length).toString('utf8'));offset+=length+1;
 const dir=path.join(root,path.posix.dirname(e.file));
 const plateMm=json.plateMm??(json.plate?[json.plate.widthMm,json.plate.heightMm]:null);
 return {id:json.id??path.basename(dir),dir,json,plateMm,themes:json.themes??[],hidden:json.hidden===true,source:'lieferform2',seriesFolder:e.file.split('/')[1]};
});
const families=new Map();for(const material of fs.readdirSync(path.join(root,'familien'))){
 const dir=path.join(root,'familien',material);if(!fs.statSync(dir).isDirectory())continue;
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json'))){const f=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));if(f.schema==='gravuru-product-family/v2')families.set(f.id,f);}
}
const lines=fs.readdirSync(path.join(root,'linien')).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(path.join(root,'linien',n),'utf8')));
const kat={families,lines,designs:{masters}},newPackages=sources.map(s=>{
 const prefix=s.pr===177?'schiefer-menschen-':'schiefer-tuerschilder-';
 const masters=kat.designs.masters.filter(d=>path.relative(root,d.dir).replaceAll('\\','/').startsWith('designs/'+prefix));
 assert(masters.length>0);
 const targets=masters.flatMap(d=>d.json.ziele??[]);assert(targets.every(t=>t.freigabe===null),'New design approval introduced');
 return {pr:s.pr,commit:git('rev-parse',s.ref),masters:masters.length,offered:masters.filter(d=>d.json.ziele?.length).length,approvals:0,sourceFilesUnchanged:true};
});
const plates=[];
for(const family of kat.families.values()){
 if(!['schiefer-tafeln-premium','schiefer-tafeln-natur','schiefer-tafeln-geschnitten','schiefer-tafeln-kordel'].includes(family.id))continue;
 const candidates=kat.designs.masters.filter(d=>!d.hidden&&designTargets(d,kat).some(t=>t.familie===family.id));
 const assignments=assignTargetSeries(family,candidates,kat);
 for(const size of family.sizes){
  const entries=assignments.filter(a=>a.sizes.includes(size.key));
  const released=entries.filter(a=>approvedForFamily(a.design,family.id,kat));
  plates.push({family:family.id,size:size.key,label:size.label,widthMm:size.widthMm,heightMm:size.heightMm,
   assigned:entries.length,approved:released.length,awaitingApproval:entries.length-released.length,
   approvedIds:released.map(a=>a.design.id)});
 }
}
assert.equal(plates.length,48);
const report={schema:'gravuru-slate-integration-audit/v1',catalogueCommit:git('rev-parse','HEAD'),
 protectedMappedFiles:2695,protectedExistingFiles:249,newPackages,plates,
 counts:{plates:48,platesWithAssignments:plates.filter(p=>p.assigned).length,platesWithApprovedDesigns:plates.filter(p=>p.approved).length,
 assignedSizes:plates.reduce((n,p)=>n+p.assigned,0),approvedSizes:plates.reduce((n,p)=>n+p.approved,0)},
 approvalsSet:0,shopifyWrites:0};
fs.mkdirSync(path.dirname(path.resolve(arg('--out'))),{recursive:true});
fs.writeFileSync(arg('--out'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({newPackages,counts:report.counts,sourceFilesUnchanged:true}));
