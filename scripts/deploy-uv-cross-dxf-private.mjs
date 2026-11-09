// Versioned update of exactly four existing UV-cross products in the private test site.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const pack=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json')));
const base='/var/www/vhosts/gravuru-designwerkstatt.de';
const source=base+'/private/uv-gedenkkreuze-20261109/runtime';
const target=base+'/private/uv-cross-dxf-20261109',runtime=target+'/runtime',reports=target+'/reports';
const data=base+'/private/gesamtbestand-stage-0bb50565-20261106-v1/data';
const configFile=base+'/private/mika-module-connect-20261108-v2/config-with-modules-v2.json';
const shim=base+'/gravuru-2027-bulkapproval-3db1ef5d/app.cjs';
const oldShim=`process.env.GRAVURU_TEST_CONFIG_FILE="${configFile}";\nrequire("${source}/ops/plesk/app.cjs");\n`;
const newShim=`process.env.GRAVURU_TEST_CONFIG_FILE="${configFile}";\nrequire("${runtime}/ops/plesk/app.cjs");\n`;
const ids=['cfg_877c4b29-88aa-4bde-a3c6-ae6a9cffca3a','cfg_0220e9ef-44ef-428e-aa3c-3d8798b26f92','cfg_1223c9fd-7083-4171-ad02-a4d9fd4ed96a','cfg_185cac49-70f6-4a08-bd69-e7e05f98b681'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f));
const write=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n',{mode:0o600});
const cfg=read(configFile).values;
assert.equal(cfg.GRAVURU_PRIVATE_DATA_DIR,data);
assert.equal(cfg.GRAVURU_TEST_ORIGIN,'https://test-2027.gravuru-designwerkstatt.de');
const env={...process.env,GRAVURU_PYTHON:cfg.GRAVURU_TEST_PYTHON_DIR+'/bin/python',PYTHONIOENCODING:'utf-8',PATH:cfg.GRAVURU_TEST_PYTHON_DIR+'/bin:'+process.env.PATH};delete env.PYTHONPATH;
process.umask(0o077);
function run(args){const r=spawnSync(process.execPath,args,{cwd:runtime,env,encoding:'utf8',maxBuffer:30*1024*1024});if(r.stdout)process.stdout.write(r.stdout);if(r.stderr)process.stderr.write(r.stderr);assert.equal(r.status,0,'Failed: '+args[0]);}
function validatePackage(){for(const f of manifest.files){assert(!f.file.includes('..')&&!path.isAbsolute(f.file));assert.equal(hash(fs.readFileSync(path.join(pack,f.file))),f.sha256,'Package: '+f.file);}}
function readHeads(db){
 return db.prepare('SELECT * FROM products ORDER BY id').all().map(r=>({id:r.id,revision:r.revision,sha:hash(JSON.stringify(r))}));
}
function snapshot(){
 const db=new DatabaseSync(path.join(data,'workshop.sqlite'),{readOnly:true});
 try{
  return {heads:readHeads(db),history:Array.from(db.prepare('SELECT * FROM product_revisions ORDER BY product_id,revision').iterate(),r=>({id:r.product_id,revision:r.revision,sha:hash(JSON.stringify(r))}))};
 }finally{db.close();}
}
function checkHeads(before,after){
 assert.equal(after.length,before.length,'No duplicate products');
 const heads=new Map(after.map(x=>[x.id,x]));
 for(const x of before){
  const now=heads.get(x.id);
  assert.ok(now,'Product missing: '+x.id);
  if(ids.includes(x.id))assert.equal(now.revision,2);
  else assert.equal(now.sha,x.sha,'Unrelated product changed: '+x.id);
 }
}
function preservationCounts(before){
 return {products:before.heads.length,created:0,updated:ids.length,historicalRevisionsPreserved:before.history.length,unrelatedHeadsPreserved:before.heads.length-ids.length};
}
function preserved(before){
 const after=snapshot();
 checkHeads(before.heads,after.heads);
 const oldRows=new Map(after.history.map(x=>[x.id+':'+x.revision,x.sha]));
 for(const x of before.history)assert.equal(oldRows.get(x.id+':'+x.revision),x.sha,'Historical revision changed');
 assert.equal(after.history.length,before.history.length+ids.length);
 return preservationCounts(before);
}
function verifyImported(){
 const imported=read(target+'/IMPORTED.json');
 assert.equal(imported.ok,true,'Full import verification required');
 const before=read(target+'/before.json'),counts=preservationCounts(before);
 for(const [key,value] of Object.entries(counts))assert.equal(imported[key],value,'Import proof differs: '+key);
 // The import receipt records the completed byte-level history comparison.
 // Here read current heads and count revisions without loading their payloads.
 const db=new DatabaseSync(path.join(data,'workshop.sqlite'),{readOnly:true});
 try{
  db.exec('BEGIN');
  checkHeads(before.heads,readHeads(db));
  const {count}=db.prepare('SELECT COUNT(*) AS count FROM product_revisions').get();
  assert.equal(count,before.history.length+ids.length,'Revision count changed since import');
 }finally{db.close();}
 return counts;
}
const phase=process.argv[2];
if(phase==='stage'){
 validatePackage();assert.equal(fs.readFileSync(shim,'utf8'),oldShim,'Active runtime changed');
 for(const f of manifest.overrides){const p=path.join(source,f.file);if(f.baseSha256===null)assert(!fs.existsSync(p),'Unexpected existing file '+f.file);else if(f.file.endsWith('.test.mjs')&&!fs.existsSync(p))console.log('Add test omitted from runtime: '+f.file);else assert.equal(hash(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n')),f.baseSha256,'Source changed '+f.file);}
 assert(!fs.existsSync(target),'Stage already exists');fs.mkdirSync(target,{mode:0o700});fs.mkdirSync(reports,{mode:0o700});
 fs.cpSync(source,runtime,{recursive:true,preserveTimestamps:true});
 for(const f of manifest.overrides){const p=path.join(runtime,f.file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(pack,'code',f.file),p);}
 fs.copyFileSync(shim,target+'/previous-app.cjs');
 write(target+'/deployment.json',{codeCommit:manifest.codeCommit,catalogCommit:manifest.catalogCommit,source,runtime,data,configSha:hash(fs.readFileSync(configFile)),overrides:manifest.overrides});
 run(['scripts/build-uv-cross-products.mjs',pack+'/catalog',target+'/preflight-data',pack+'/native-fonts.json',reports+'/preflight']);
 run(['scripts/check-uv-cross-products.mjs',target+'/preflight-data',reports+'/preflight-check.json',reports+'/preflight/uv-cross-products.json']);
 for(const group of manifest.testGroups??[])run(['--test',...group]);
 write(target+'/STAGED.json',{ok:true,at:new Date().toISOString()});console.log('UV_DXF_STAGE_OK');
}else if(phase==='import'){
 assert(read(target+'/STAGED.json').ok);assert.equal(fs.readFileSync(shim,'utf8'),oldShim);assert.equal(hash(fs.readFileSync(configFile)),read(target+'/deployment.json').configSha);
 assert(!fs.existsSync(target+'/IMPORTED.json'),'Already imported');assert(!fs.existsSync(target+'/before.json'),'Inspect previous attempt before resuming');
 const before=snapshot();for(const id of ids)assert.equal(before.heads.find(x=>x.id===id)?.revision,1,'Revision conflict');write(target+'/before.json',before);
 fs.mkdirSync(target+'/backup',{mode:0o700});for(const name of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite']){const db=new DatabaseSync(path.join(data,name),{readOnly:true});try{await backup(db,target+'/backup/'+name);}finally{db.close();}}
 run(['scripts/build-uv-cross-products.mjs',pack+'/catalog',data,pack+'/native-fonts.json',reports+'/online','update-dxf-20261109']);
 const counts=preserved(before);
 run(['scripts/check-uv-cross-products.mjs',data,reports+'/online-check.json',reports+'/online/uv-cross-products.json']);
 write(target+'/IMPORTED.json',{ok:true,...counts,at:new Date().toISOString()});console.log(JSON.stringify({event:'UV_DXF_IMPORT_OK',...counts}));
}else if(phase==='activate'){
 assert.equal(fs.readFileSync(shim,'utf8'),oldShim);assert.equal(hash(fs.readFileSync(configFile)),read(target+'/deployment.json').configSha);validatePackage();verifyImported();
 fs.writeFileSync(shim+'.uv-dxf-next',newShim,{mode:0o600});fs.renameSync(shim+'.uv-dxf-next',shim);write(target+'/ACTIVATED.json',{ok:true,at:new Date().toISOString()});console.log('UV_DXF_ACTIVATED_RESTART_REQUIRED');
}else if(phase==='verify'){
 assert.equal(fs.readFileSync(shim,'utf8'),newShim);const counts=verifyImported();
 const headers={Authorization:'Basic '+Buffer.from(cfg.GRAVURU_TEST_USERNAME+':'+cfg.GRAVURU_TEST_PASSWORD).toString('base64')};
 const get=async route=>{assert(route.startsWith('/')&&!route.startsWith('//'));const r=await fetch(cfg.GRAVURU_TEST_ORIGIN+route,{headers,redirect:'error',signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,'HTTP '+r.status+' '+route);return r.text();};
 assert(JSON.parse(await get('/__test/health')).ready);const html=await get('/uv-gedenkkreuze/');assert.equal((html.match(/<article>/g)||[]).length,20);
 const previews=[...html.matchAll(/src="(\/api\/workshop\/products\/[^" ]+)/g)].map(m=>m[1].replaceAll('&amp;','&'));assert.equal(previews.length,20);for(const p of previews){assert(p.includes('revision=2'));assert((await get(p)).includes('<svg'));}
 const links=[...html.matchAll(/class="open" href="([^" ]+)/g)].map(m=>m[1].replaceAll('&amp;','&'));assert.equal(links.length,20);for(const p of links){assert(p.includes('revision=2'));assert((await get(p)).includes('<html'));}
 write(target+'/VERIFIED.json',{ok:true,...counts,previews:20,editors:20,at:new Date().toISOString()});console.log(JSON.stringify({ok:true,...counts,previews:20,editors:20}));
}else throw Error('Choose stage, import, activate, verify');
