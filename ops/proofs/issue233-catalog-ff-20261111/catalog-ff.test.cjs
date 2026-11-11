const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {mergeJson,appendAudit,inspect,apply,sha}=require('./catalog-ff.cjs');
test('independent leaves, additions and local deletion are preserved',()=>{
 const got=mergeJson({a:1,b:{x:1,y:2},remove:1},{a:2,b:{x:1,y:2}},{a:1,b:{x:3,y:2},remove:1,newKey:4});
 assert.deepEqual(JSON.parse(JSON.stringify(got)),{a:2,b:{x:3,y:2},newKey:4});
});
test('competing leaves and arrays stop',()=>{assert.throws(()=>mergeJson({a:1},{a:2},{a:3}),/conflict/);assert.throws(()=>mergeJson({a:[1]},{a:[1,2]},{a:[1,3]}),/conflict/);});
test('audit preserves both raw appended histories and rejects prefix change',()=>{const b=Buffer.from('{"base":1}\n'),l=Buffer.from('{"base":1}\n{"local":1}\n'),t=Buffer.from('{"base":1}\n{"target":1}\n');assert.equal(appendAudit(b,l,t).toString(),'{"base":1}\n{"target":1}\n{"local":1}\n');assert.throws(()=>appendAudit(b,Buffer.from('{"base":2}\n'),t),/append-only/);assert.throws(()=>appendAudit(b,Buffer.from('{"base":1}\n{"bad":2}'),t),/incomplete/);});
const fixtures=path.join(__dirname,'test-fixtures');fs.mkdirSync(fixtures,{recursive:true});
function fixture(){
 const root=fs.mkdtempSync(path.join(fixtures,'catalog-'));const git=(...args)=>cp.execFileSync('git',args,{cwd:root,stdio:['pipe','pipe','pipe']}).toString().trim();
 git('init','-b','fixture');git('config','user.name','Local test');git('config','user.email','fixture@example.invalid');git('config','core.autocrlf','false');
 fs.mkdirSync(path.join(root,'designs'));fs.writeFileSync(path.join(root,'designs/design.json'),'{"name":"base","minimum":1}\n');fs.writeFileSync(path.join(root,'designs/design.svg'),'<svg>base</svg>\n');fs.writeFileSync(path.join(root,'designs/_aenderungen.jsonl'),'{"base":1}\n');git('add','.');git('commit','-m','base');const base=git('rev-parse','HEAD');
 fs.writeFileSync(path.join(root,'designs/design.json'),'{"name":"base","minimum":2}\n');fs.appendFileSync(path.join(root,'designs/_aenderungen.jsonl'),'{"target":1}\n');fs.writeFileSync(path.join(root,'added.txt'),'new target\n');git('add','.');git('commit','-m','target');const target=git('rev-parse','HEAD');git('update-ref','refs/heads/bundle-target',target);
 const bundle=path.join(fixtures,path.basename(root)+'.bundle');git('bundle','create',bundle,'refs/heads/bundle-target','^'+base);git('checkout','-B','fixture',base);
 fs.writeFileSync(path.join(root,'designs/design.json'),'{"name":"local","minimum":1}\n');fs.writeFileSync(path.join(root,'designs/design.svg'),'<svg>local</svg>\n');fs.appendFileSync(path.join(root,'designs/_aenderungen.jsonl'),'{"local":1}\n');
 const blob=(ref,p)=>cp.execFileSync('git',['show',ref+':'+p],{cwd:root});
 const dirty=['json','svg','audit'].map((kind,i)=>{const p=['designs/design.json','designs/design.svg','designs/_aenderungen.jsonl'][i],b=blob(base,p),t=blob(target,p);return{path:p,kind,sha256:sha(fs.readFileSync(path.join(root,p))),baseSha256:sha(b),targetSha256:sha(t),base:b.toString('base64'),target:t.toString('base64')};});
 const files=['designs/design.json','designs/_aenderungen.jsonl','added.txt'].map(p=>{const added=p==='added.txt',t=blob(target,p);return{path:p,status:added?'A':'M',oldSha256:added?null:sha(blob(base,p)),newSha256:sha(t),newMode:'100644'};});
 const m={root:fs.realpathSync(root),branch:'fixture',base,target,ref:'refs/heads/bundle-target',files,dirty,backupRoot:path.join(fixtures,'backups'),bundle:{bytes:fs.statSync(bundle).size,sha256:sha(fs.readFileSync(bundle))}};
 return{m,bundle,root,git,head:()=>git('rev-parse','HEAD')};
}
test('inspect is non-mutating; apply exact FF preserves three local changes',()=>{
 const f=fixture(),old=fs.readFileSync(path.join(f.root,'.git/index'));const r=inspect(f.m,f.bundle);assert.equal(r.files,3);assert.equal(f.head(),f.m.base);assert.deepEqual(fs.readFileSync(path.join(f.root,'.git/index')),old);
 const receipt=apply(f.m,f.bundle,{writersStopped:true});assert.equal(receipt.head,f.m.target);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root,'designs/design.json'))),{name:'local',minimum:2});assert.equal(fs.readFileSync(path.join(f.root,'designs/design.svg'),'utf8'),'<svg>local</svg>\n');assert.equal(fs.readFileSync(path.join(f.root,'designs/_aenderungen.jsonl'),'utf8'),'{"base":1}\n{"target":1}\n{"local":1}\n');assert.equal(fs.existsSync(path.join(f.root,'designs/.werkstatt-write-journal.json')),false);assert.ok(fs.existsSync(path.join(receipt.backup,'success.json')));
});
test('late fault restores exact HEAD, index and local bytes, keeps backup',()=>{
 const f=fixture(),idx=fs.readFileSync(path.join(f.root,'.git/index'));assert.throws(()=>apply(f.m,f.bundle,{writersStopped:true,afterMerge(){throw Error('fault test');}}),/fault test/);assert.equal(f.head(),f.m.base);assert.deepEqual(fs.readFileSync(path.join(f.root,'.git/index')),idx);for(const d of f.m.dirty)assert.equal(sha(fs.readFileSync(path.join(f.root,d.path))),d.sha256);assert.equal(fs.existsSync(path.join(f.root,'added.txt')),false);assert.equal(fs.existsSync(path.join(f.root,'designs/.werkstatt-write-journal.json')),false);
});
test('extra local file and changed pinned dirty bytes stop before writes',()=>{
 const f=fixture();fs.writeFileSync(path.join(f.root,'foreign.txt'),'do not touch');assert.throws(()=>inspect(f.m,f.bundle),/Unexpected/);assert.equal(f.head(),f.m.base);fs.unlinkSync(path.join(f.root,'foreign.txt'));fs.appendFileSync(path.join(f.root,'designs/design.svg'),'changed');assert.throws(()=>inspect(f.m,f.bundle),/Pinned/);assert.equal(f.head(),f.m.base);
});
test('native writer lock and pending journal block inspect',()=>{
 const f=fixture(),lock=path.join(f.root,'designs/.werkstatt-write.lock');fs.mkdirSync(lock);assert.throws(()=>inspect(f.m,f.bundle),/lock exists/);fs.rmdirSync(lock);fs.writeFileSync(path.join(f.root,'designs/.werkstatt-write-journal.json'),'{}');assert.throws(()=>inspect(f.m,f.bundle),/Pending writer/);
});
