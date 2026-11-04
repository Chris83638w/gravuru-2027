import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
const root=path.resolve(value('--katalog')),base=value('--base'),report=JSON.parse(fs.readFileSync(path.join(root,'auftraege/2026-11-04-schiefer-designziele/zuordnung.json')));
if(!/^[0-9a-f]{40}$/.test(base))throw Error('--base muss ein vollständiger Commit sein');
const git=spawnSync('git',['cat-file','--batch'],{cwd:root,input:report.rows.map(r=>base+':'+r.file).join('\n')+'\n',maxBuffer:128*1024*1024});
if(git.status!==0)throw Error(String(git.stderr));
let offset=0,mapped=0,unchanged=0;const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const row of report.rows){
 const end=git.stdout.indexOf(10,offset),header=git.stdout.subarray(offset,end).toString(),length=Number(header.split(' ')[2]);assert.ok(Number.isFinite(length),header);
 const bytes=git.stdout.subarray(end+1,end+1+length);offset=end+2+length;
 const current=fs.readFileSync(path.join(root,row.file));
 // Git stores LF; untouched files in this Windows checkout can still have CRLF.
 assert.ok([hash(bytes),hash(Buffer.from(bytes.toString().replace(/\r?\n/g,'\r\n')))].includes(row.beforeHash),'Baseline '+row.file);
 if(row.status!=='mapped-unapproved'){assert.equal(hash(current),row.beforeHash,row.file);unchanged++;continue;}
 assert.equal(hash(current),row.afterHash,row.file);
 const before=JSON.parse(bytes),after=JSON.parse(current);assert.ok(before.ziele===undefined||Array.isArray(before.ziele)&&before.ziele.length===0);
 for(const t of after.ziele)assert.equal(t.freigabe,null);
 delete before.ziele;delete before.sizes;delete after.ziele;delete after.sizes;assert.equal(JSON.stringify(after),JSON.stringify(before),row.file);mapped++;
}
const audit={base,total:report.rows.length,mapped,unchanged,existing249ByteIdentical:true,onlyTargetsAndSizeMetadataChanged:true,approvalsSet:0};
fs.writeFileSync(path.join(root,'auftraege/2026-11-04-schiefer-designziele/audit.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
