import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [beforeFile,afterFile,outputFile]=process.argv.slice(2);
if(!beforeFile||!afterFile||!outputFile)throw Error('before.json after.json comparison.json erforderlich');
const rawBefore=fs.readFileSync(beforeFile,'utf8'),rawAfter=fs.readFileSync(afterFile,'utf8');
const before=JSON.parse(rawBefore),after=JSON.parse(rawAfter);
function normalize(report){
 const copy=structuredClone(report),profiles=new Map(),profileOwners=new Map();
 delete copy.line.file;for(const f of copy.families)delete f.file;
 for(const s of copy.subcategories){
  if(s.fontProfileId===null)continue;
  const key=s.fontSet??'ohne';
  if(profiles.has(key))assert.equal(s.fontProfileId,profiles.get(key),'ein Profil pro Schrift-Set');
  if(profileOwners.has(s.fontProfileId))assert.equal(profileOwners.get(s.fontProfileId),key,'keine zwei Schrift-Sets auf einem Profil');
  profiles.set(key,s.fontProfileId);profileOwners.set(s.fontProfileId,key);s.fontProfileId='profile-for-set:'+key;
 }
 return copy;
}
const normalizedBefore=normalize(before),normalizedAfter=normalize(after),differences=[];
function compare(a,b,p='$'){
 if(Object.is(a,b))return;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b)){differences.push({path:p,before:a,after:b});return;}
 if(Array.isArray(a)&&a.length!==b.length)differences.push({path:p+'.length',before:a.length,after:b.length});
 const keys=[...new Set([...Object.keys(a),...Object.keys(b)])];
 for(const key of keys)compare(a[key],b[key],p+(Array.isArray(a)?'['+key+']':'.'+key));
}
compare(normalizedBefore,normalizedAfter);
const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
const blocked=report=>report.subcategories.flatMap(s=>s.products).filter(p=>p.action==='gesperrt').reduce((r,p)=>(r[p.reason]=(r[p.reason]??0)+1,r),{});
const result={equal:differences.length===0,ignored:['line.file','families[*].file','subcategories[*].fontProfileId (bijective set identity verified)'],timestampsPresent:false,differenceCount:differences.length,differences: differences.slice(0,50),baselineSha256:digest(rawBefore),candidateSha256:digest(rawAfter),counts:after.counts,designs:{...after.designs,oldSize:after.designs.oldSize.length},blocked:blocked(after)};
fs.writeFileSync(outputFile,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({equal:result.equal,differenceCount:result.differenceCount,counts:result.counts,blocked:result.blocked},null,2));
if(!result.equal)process.exitCode=1;
