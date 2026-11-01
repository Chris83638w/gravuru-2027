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
const inputDesigns=path.resolve(arg('designs')??path.join(catalog,'designs'));
assert(!root.startsWith(catalog+path.sep)&&root!==catalog,'Use a separate output catalogue');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const commit=execFileSync('git',['-C',catalog,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
fs.mkdirSync(root,{recursive:true});
for(const p of ['familien','linien','schriften'])fs.cpSync(path.join(catalog,p),path.join(root,p),{recursive:true});
fs.copyFileSync(path.join(catalog,'themen.json'),path.join(root,'themen.json'));
// Families now come from main, including acrylic; no historical dependency overlay.
const masters=[];
for(const series of fs.readdirSync(inputDesigns).filter(n=>/^tierbestand-/.test(n))){
 for(const entry of read(path.join(inputDesigns,series,'index.json'))){
  const source=path.join(inputDesigns,series,entry.pfad),dest=path.join(root,'designs',series,entry.pfad);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(source,dest,{recursive:true});
  if(series.endsWith('-80x53'))masters.push({reihe:series,id:entry.pfad,json:read(path.join(source,'design.json'))});
 }
}
assert.equal(masters.length,25);
// Include IDs from the COMPLETE committed Git tree, including sparse-excluded
// legacy stock and indices. Synthetic inventory entries only block collisions;
// they are never copied into the deliverable design pool.
const inventoryCode=String.raw`
import subprocess,sys,json,re,hashlib,os
repo,commit=sys.argv[1:]
rows=subprocess.check_output(['git','-C',repo,'ls-tree','-r',commit,'designs']).decode().splitlines()
paths={}
for r in rows:
 if r.rsplit('/',1)[-1] in ('design.json','index.json','designs.json') and not r.split('\t',1)[1].startswith('designs/tierbestand-'): paths.setdefault(r.split()[2],[]).append(r.split('\t',1)[1])
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
const report={catalogCommit:commit,runtimeCommit:execFileSync('git',['-C',code,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),inventoryScope:'Full committed tree except our own tierbestand output, which is regenerated separately; original source-specific masters copied from --designs.',inventoryIds:ids.length,inventoryObjects:fullInventory.objects,inventorySha256:fullInventory.sha256,rows:previous.rows,blocked:previous.blocked??[],sourceEditions:previous.sourceEditions??[]};
let done=0;
for(const master of masters)for(const sizeKey of master.json.sizes.slice(1)){
 if([...report.rows,...report.blocked,...report.sourceEditions].some(r=>r.sourceId===master.id&&r.sizeKey===sizeKey))continue;
 const sourceSize=family.sizes.find(s=>s.key===sizeKey),familyId=master.json.ziele[0].familie;
 const targetFamily=familyId===family.id?family:read(path.join(root,'familien/acryl/'+familyId+'.json'));
 const targetSize=targetFamily.sizes.find(s=>s.groupKey==='RE'&&s.widthMm===sourceSize.widthMm&&s.heightMm===sourceSize.heightMm);assert(targetSize);
 const query={source:{reihe:master.reihe,id:master.id},target:{familyId,sizeKey:targetSize.key}};
 const plan=await variants.prepare(root,query);
 if(plan.action==='already-exists'){
  report.sourceEditions.push({sourceId:master.id,id:plan.existing.id,series:plan.existing.reihe,sizeKey,status:'Originalfassung im Bestand separat übernommen; nicht durch Skalierung ersetzt'});write(reportFile,report);continue;
 }
 if(plan.action==='blocked'){
  report.blocked.push({sourceId:master.id,sizeKey,id:plan.identity?.id,status:plan.message,collisions:plan.collisions.map(c=>({id:c.id,files:fullInventory.paths[c.id]??[c.file]}))});
  write(reportFile,report);console.log('Existing source retained:',master.id,sizeKey);continue;
 }
 assert.equal(plan.action,'create-variant',JSON.stringify({source:master.id,sizeKey,status:plan.message,collisions:plan.collisions}));
 assert.equal(plan.identity.id.split(/-\d+(?:[.,]\d+)?x/)[0],master.id.split(/-\d+(?:[.,]\d+)?x/)[0],'Source prefix must stay stable');
 assert.notEqual(plan.fit?.status,'passt nicht','Native variant fit rejected');
 const made=await variants.create(root,{...query,checksum:plan.checksum},{actor:'Codex, Issue 85 Tierbestand'});
 const base=path.join(root,'designs',made.identity.reihe,made.identity.id),meta=read(path.join(base,'design.json'));
 // Keep the reviewed master's explicit family assignments (photos: acrylic only).
 // Native converter owns geometry; no material duplicates or approvals.
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
assert.equal(report.rows.length+report.blocked.length+report.sourceEditions.length,masters.length*9);
// Include copied master/original-size editions as well as newly created variants.
for(const series of fs.readdirSync(path.join(root,'designs')).filter(n=>n.startsWith('tierbestand-'))){
 const dir=path.join(root,'designs',series),entries=[];
 for(const name of fs.readdirSync(dir).sort()){
  const file=path.join(dir,name,'design.json');if(!fs.existsSync(file))continue;
  const d=read(file);entries.push({key:d.id,pfad:name,name:d.name,plateMm:d.plateMm,groessen:d.sizes,freigabe:null});
 }
 write(path.join(dir,'index.json'),entries);
}
console.log(report.rows.length+' native size variants, '+report.sourceEditions.length+' source editions, '+report.blocked.length+' blocked; all approvals remain null.');
