'use strict';
// Read-only verification; accepts the new apply backup directory as argv[2].
const fs=require('node:fs'),p=require('node:path'),cp=require('node:child_process'),c=require('node:crypto'),a=require('node:assert/strict');
const pkg='/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-catalog-ff-package-20261111-v1';
const hash=b=>c.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(f),json=f=>JSON.parse(read(f));
function main(){
 const mb=read(p.join(pkg,'manifest.json'));a.equal(hash(mb),'5cca0332016c40d99ecbf2aaf93e9897c81d4e4fbaa39df83dc2635b5b414b3f');const m=JSON.parse(mb);
 const b=p.resolve(process.argv[2]||'');a.equal(p.dirname(b),m.backupRoot);a.equal(fs.realpathSync(b),b);
 const runner=p.join(pkg,'catalog-ff-v2.cjs');a.equal(hash(read(runner)),'7104c52f22138ffae40d1f1a774674fe3ab7bc44a5d82c167955198a47001935');const {mergeJson,appendAudit}=require(runner);
 const s=json(p.join(b,'success.json')),v=json(p.join(b,'before.json'));a.equal(s.ok,true);a.equal(s.backup,b);a.equal(s.head,m.target);a.equal(s.branch,m.branch);a.equal(s.files,552);a.equal(s.appChanges,false);a.equal(s.restart,false);a.equal(v.base,m.base);a.equal(v.target,m.target);a.equal(v.root,m.root);a.equal(v.branch,m.branch);a.equal(v.files.length,553);a.equal(new Set(v.files.map(x=>x.path)).size,553);a.equal(hash(read(p.join(b,'git-index'))),v.indexSha256);
 const git=(...args)=>cp.execFileSync('git',['-c','core.fsmonitor=false','-C',m.root,...args],{env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},maxBuffer:1024*1024}).toString();a.equal(git('rev-parse','HEAD').trim(),m.target);a.equal(git('symbolic-ref','--short','HEAD').trim(),m.branch);
 const expectedPaths=[...new Set([...m.files.map(x=>x.path),...m.dirty.map(x=>x.path)])].sort();a.deepEqual(v.files.map(x=>x.path).sort(),expectedPaths);let backupFiles=0;
 for(const f of v.files){a.equal(hash(read(p.join(m.root,f.path))),f.finalSha256,f.path);if(f.existed){a.equal(hash(read(p.join(b,'files',f.path))),f.beforeSha256,f.path);backupFiles++;}else{a.equal(f.beforeSha256,null);a.equal(fs.existsSync(p.join(b,'files',f.path)),false);}}
 const clean=new Map(m.files.map(x=>[x.path,x]));
 for(const d of m.dirty){const before=read(p.join(b,'files',d.path)),base=Buffer.from(d.base,'base64'),target=Buffer.from(d.target,'base64'),actual=read(p.join(m.root,d.path));a.equal(hash(before),d.sha256);a.equal(hash(base),d.baseSha256);a.equal(hash(target),d.targetSha256);let expected;if(d.kind==='json')expected=Buffer.from(JSON.stringify(mergeJson(JSON.parse(base),JSON.parse(before),JSON.parse(target)),null,2)+'\n');else if(d.kind==='audit')expected=appendAudit(base,before,target);else{a.deepEqual(base,target);expected=before;}a.deepEqual(actual,expected,d.path);a.equal(s.dirtyPreserved.find(x=>x.path===d.path)?.sha256,hash(expected));clean.delete(d.path);}
 a.equal(s.dirtyPreserved.length,3);for(const f of clean.values())a.equal(hash(read(p.join(m.root,f.path))),f.newSha256,f.path);
 const rows=git('status','--porcelain=v1','-z','--untracked-files=all').split('\0').filter(Boolean);a.equal(rows.length,3);a.ok(rows.every(x=>x.slice(0,2)===' M'));a.deepEqual(rows.map(x=>x.slice(3)).sort(),m.dirty.map(x=>x.path).sort());
 for(const lock of ['designs/.werkstatt-write.lock','designs/.werkstatt-write-journal.json','.git/index.lock','.git/HEAD.lock'])a.equal(fs.existsSync(p.join(m.root,lock)),false,lock);
 console.log(JSON.stringify({ok:true,head:m.target,branch:m.branch,finalHashes:553,targetFiles:552,backupHashes:backupFiles,dirty:3,svg:'bytegleich',json:'local+target',audit:'beide_appendices',locks:0}));
}
try{main();}catch(e){console.log(JSON.stringify({ok:false,error:String(e.message).slice(0,420)}));process.exitCode=1;}
