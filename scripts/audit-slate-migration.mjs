import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
if(!args.includes('--katalog'))throw Error('--katalog erforderlich.');
const root=path.resolve(get('--katalog')),base='ff1ea99ef92f3cce7069e7c9d41cdaa3e781e546';
const report=JSON.parse(fs.readFileSync(path.join(root,'auftraege/2026-11-04-schiefer-anschluss/designziel-migration.json')));
const input=report.rows.map(r=>base+':'+r.file).join('\n')+'\n';
const data=execFileSync('git',['cat-file','--batch'],{cwd:root,input,maxBuffer:50*1024*1024});let offset=0;
for(const row of report.rows){
 const end=data.indexOf(10,offset),header=data.subarray(offset,end).toString(),length=Number(header.split(' ')[2]);assert(Number.isFinite(length),header);
 const before=JSON.parse(data.subarray(end+1,end+1+length));offset=end+2+length;
 const after=JSON.parse(fs.readFileSync(path.join(root,row.file)));
 assert.deepEqual(before.ziele,row.before);assert.deepEqual(after.ziele,row.after);
 for(const t of before.ziele)assert(after.ziele.some(n=>JSON.stringify(n.freigabe)===JSON.stringify(t.freigabe)),row.id+': Freigabe verloren');
 for(const key of before.sizes??[])assert(after.sizes.includes(key),row.id+': bestehende Größe verloren');
 delete before.ziele;delete after.ziele;delete before.sizes;delete after.sizes;
 assert.deepEqual(after,before,row.id+': Änderung außerhalb der Ziel-/Größenmetadaten');
}
const artwork=execFileSync('git',['diff',base,'--name-only','--','designs'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
assert(artwork.every(f=>f.endsWith('/design.json')),'Originalgrafiken wurden geändert');
assert.equal(artwork.length,report.rows.length);
console.log(JSON.stringify({designs:report.rows.length,approvalsPreserved:true,artworkChanged:0,existingSizesPreserved:true}));
