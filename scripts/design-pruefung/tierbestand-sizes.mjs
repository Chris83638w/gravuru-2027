// Export size variants with the existing native converter and collision guard.
// Writes only to a separate review catalogue; never modifies its source checkout.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const arg=n=>process.argv.find(s=>s.startsWith('--'+n+'='))?.slice(n.length+3);
const catalog=path.resolve(arg('katalog')),root=path.resolve(arg('out')),code=path.resolve(arg('runtime-code'));
assert(!root.startsWith(catalog+path.sep)&&root!==catalog,'Use a separate output catalogue');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const commit=execFileSync('git',['-C',catalog,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
fs.mkdirSync(root,{recursive:true});
for(const p of ['familien','linien','schriften'])if(!fs.existsSync(path.join(root,p)))fs.cpSync(path.join(catalog,p),path.join(root,p),{recursive:true});
fs.copyFileSync(path.join(catalog,'themen.json'),path.join(root,'themen.json'));
const dependency='489fd3292f693a2361a06ab503bb763a92d38ec4';
for(const name of ['acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit']){
 const file='familien/acryl/'+name+'.json';fs.writeFileSync(path.join(root,file),execFileSync('git',['-C',catalog,'show',dependency+':'+file]));
}
const masters=[];
for(const series of fs.readdirSync(path.join(catalog,'designs')).filter(n=>/^tierbestand-.*-80x53$/.test(n))){
 for(const entry of read(path.join(catalog,'designs',series,'index.json'))){
  const source=path.join(catalog,'designs',series,entry.pfad),dest=path.join(root,'designs',series,entry.pfad);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(source,dest,{recursive:true});
  masters.push({reihe:series,id:entry.pfad,json:read(path.join(source,'design.json'))});
 }
}
assert.equal(masters.length,18);
// Include IDs from the COMPLETE committed Git tree, including sparse-excluded
// legacy stock and indices. Synthetic inventory entries only block collisions;
// they are never copied into the deliverable design pool.
const inventoryCode=String.raw`
import subprocess,sys,json,re,hashlib,os
repo,commit=sys.argv[1:]
rows=subprocess.check_output(['git','-C',repo,'ls-tree','-r',commit,'designs']).decode().splitlines()
paths={}
for r in rows:
 if r.rsplit('/',1)[-1] in ('design.json','index.json','designs.json'): paths.setdefault(r.split()[2],[]).append(r.split('\t',1)[1])
oids=sorted(paths)
p=subprocess.Popen(['git','-C',repo,'cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,env={**os.environ,'GIT_NO_LAZY_FETCH':'1'})
ids={}
for oid in oids:
 p.stdin.write((oid+'\n').encode());p.stdin.flush()
 header=p.stdout.readline().split()
 if len(header)!=3: raise RuntimeError('Fetch missing metadata object first: '+oid)
 data=p.stdout.read(int(header[2]));assert p.stdout.read(1)==b'\n'
 for value in re.findall(rb'"(?:id|key)"\s*:\s*("(?:[^"\\]|\\.)*")',data):
  ids.setdefault(json.loads(value),set()).update(paths[oid])
p.stdin.close();assert p.wait()==0
print(json.dumps({'ids':sorted(ids),'paths':{k:sorted(v) for k,v in ids.items()},'objects':len(oids),'sha256':hashlib.sha256('\n'.join(oids).encode()).hexdigest()}))
`;
const fullInventory=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',inventoryCode,catalog,commit],{encoding:'utf8',maxBuffer:32*1024*1024}));
const ids=fullInventory.ids;
const inventory=path.join(root,'designs','_committed-inventory');fs.mkdirSync(inventory,{recursive:true});write(path.join(inventory,'index.json'),ids.map(id=>({id})));
const {createDesignVariants}=await import(pathToFileURL(path.join(code,'app/workshop/design-variants.mjs')));
const variants=createDesignVariants(),family=read(path.join(root,'familien/edelstahl/steel-door-signs.json'));
const reportFile=path.join(root,'groessen.json'),previous=fs.existsSync(reportFile)?read(reportFile):{rows:[]};
const report={catalogCommit:commit,runtimeCommit:execFileSync('git',['-C',code,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),acrylicDependency:dependency,inventoryIds:ids.length,inventoryObjects:fullInventory.objects,inventorySha256:fullInventory.sha256,rows:previous.rows,blocked:previous.blocked??[]};
let done=0;
for(const master of masters)for(const sizeKey of master.json.sizes.slice(1)){
 if([...report.rows,...report.blocked].some(r=>r.sourceId===master.id&&r.sizeKey===sizeKey))continue;
 const query={source:{reihe:master.reihe,id:master.id},target:{familyId:family.id,sizeKey}};
 const plan=await variants.prepare(root,query);
 if(plan.action==='blocked'){
  report.blocked.push({sourceId:master.id,sizeKey,id:plan.identity?.id,status:plan.message,collisions:plan.collisions.map(c=>({id:c.id,files:fullInventory.paths[c.id]??[c.file]}))});
  write(reportFile,report);console.log('Existing source retained:',master.id,sizeKey);continue;
 }
 assert.equal(plan.action,'create-variant',JSON.stringify({source:master.id,sizeKey,status:plan.message,collisions:plan.collisions}));
 assert.equal(plan.identity.id.split(/-\d+(?:[.,]\d+)?x/)[0],master.id.split(/-\d+(?:[.,]\d+)?x/)[0],'Source prefix must stay stable');
 assert.notEqual(plan.fit?.status,'passt nicht','Native variant fit rejected');
 const made=await variants.create(root,{...query,checksum:plan.checksum},{actor:'Codex, Issue 85 Tierbestand',now:new Date('2026-11-01T00:00:00Z')});
 const base=path.join(root,'designs',made.identity.reihe,made.identity.id),meta=read(path.join(base,'design.json'));
 // Targets are the same three explicit family assignments as the reviewed
// master; no material duplicates or approvals. Native converter owns geometry.
 meta.ziele=structuredClone(master.json.ziele);meta.material=master.json.material;
 delete meta.photoFields; // Source-space helper is superseded by native photos[].box.
 meta.sourceMaster={id:master.id,svgSha256:hash(fs.readFileSync(path.join(root,'designs',master.reihe,master.id,'design.svg')))};
 write(path.join(base,'design.json'),meta);
 const size=family.sizes.find(s=>s.key===sizeKey);assert.deepEqual(meta.plateMm,[size.widthMm,size.heightMm]);
 assert(meta.ziele.every(t=>t.freigabe===null)&&meta.freigabe===null);
 report.rows.push({sourceId:master.id,id:made.identity.id,series:made.identity.reihe,sizeKey,plateMm:meta.plateMm,transform:plan.transform,fit:plan.fit,files:{svg:hash(fs.readFileSync(path.join(base,'design.svg'))),json:hash(fs.readFileSync(path.join(base,'design.json')))}});
 write(reportFile,report);console.log(report.rows.length,master.id,'->',made.identity.id,plan.fit?.status);
 if(++done>=Number(arg('limit')??Infinity))process.exit(0);
}
assert.equal(report.rows.length+report.blocked.length,162);console.log(report.rows.length+' native size variants exported, '+report.blocked.length+' existing identifiers retained; all approvals remain null.');
