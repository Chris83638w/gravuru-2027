// Scoped, resumable deployment to the existing private operator configurator.
// No credentials leave the host; no customer production/Shopify writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const pack=path.dirname(fileURLToPath(import.meta.url)),manifest=JSON.parse(fs.readFileSync(path.join(pack,'manifest.json')));
const base='/var/www/vhosts/gravuru-designwerkstatt.de';
const source=base+'/private/mika-module-connect-20261108-v2/runtime-v2';
const configFile=base+'/private/mika-module-connect-20261108-v2/config-with-modules-v2.json';
const data=base+'/private/gesamtbestand-stage-0bb50565-20261106-v1/data';
const target=base+'/private/uv-gedenkkreuze-20261109',runtime=target+'/runtime',reports=target+'/reports';
const shim=base+'/gravuru-2027-bulkapproval-3db1ef5d/app.cjs';
const expectedShim=`process.env.GRAVURU_TEST_CONFIG_FILE="${configFile}";\nrequire("${source}/ops/plesk/app.cjs");\n`;
const nextShim=`process.env.GRAVURU_TEST_CONFIG_FILE="${configFile}";\nrequire("${runtime}/ops/plesk/app.cjs");\n`;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{mode:0o600});
const config=read(configFile).values;
assert.equal(config.GRAVURU_PRIVATE_DATA_DIR,data);
assert.equal(config.GRAVURU_TEST_ORIGIN,'https://test-2027.gravuru-designwerkstatt.de');
const env={...process.env,GRAVURU_PYTHON:config.GRAVURU_TEST_PYTHON_DIR+'/bin/python',PYTHONIOENCODING:'utf-8'};delete env.PYTHONPATH;
process.umask(0o077);
function run(args){const result=spawnSync(process.execPath,args,{cwd:runtime,env,encoding:'utf8',maxBuffer:20*1024*1024});if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);assert.equal(result.status,0,'Command failed: '+args[0]);}
function validatePackage(){for(const f of manifest.files){assert(!f.file.includes('..')&&!path.isAbsolute(f.file));assert.equal(hash(fs.readFileSync(path.join(pack,f.file))),f.sha256,'Package hash: '+f.file);}}
function heads(){const db=new DatabaseSync(path.join(data,'workshop.sqlite'),{readOnly:true});try{return db.prepare('SELECT * FROM products ORDER BY id').all().map(r=>({id:r.id,sha256:hash(JSON.stringify(r))}));}finally{db.close();}}
function preserved(before){const after=heads(),byId=new Map(after.map(r=>[r.id,r.sha256]));for(const row of before)assert.equal(byId.get(row.id),row.sha256,'Existing product changed: '+row.id);return after.length-before.length;}
const phase=process.argv[2];
if(phase==='stage'){
 validatePackage();assert.equal(fs.readFileSync(shim,'utf8'),expectedShim,'Live runtime has changed');
 assert.equal(read(source+'/runtime-manifest.json').commit,manifest.baseCommit);
 for(const f of manifest.overrides){const p=path.join(source,f.file);if(f.baseSha256===null)assert(!fs.existsSync(p),'New file exists: '+f.file);else assert.equal(hash(fs.readFileSync(p)),f.baseSha256,'Live file changed: '+f.file);}
 assert(!fs.existsSync(target),'Choose a fresh stage; never overwrite another stage');fs.mkdirSync(target,{mode:0o700});fs.mkdirSync(reports,{mode:0o700});
 fs.cpSync(source,runtime,{recursive:true,preserveTimestamps:true});
 for(const f of manifest.overrides){const p=path.join(runtime,f.file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(pack,'code',f.file),p);}
 for(const file of manifest.testFiles)fs.copyFileSync(path.join(pack,'tests',file),path.join(runtime,file));
 fs.copyFileSync(shim,target+'/previous-app.cjs');
 write(target+'/deployment.json',{schema:'gravuru-uv-cross-deployment/v1',baseCommit:manifest.baseCommit,codeCommit:manifest.codeCommit,catalogCommit:manifest.catalogCommit,configSha256:hash(fs.readFileSync(configFile)),source,runtime,data,overrides:manifest.overrides});
 // A separate scratch database proves the exact uploaded subset before any import.
 const scratch=target+'/preflight-data';
 run(['scripts/build-uv-cross-products.mjs',pack+'/catalog',scratch,pack+'/native-fonts.json',reports+'/preflight']);
 run(['scripts/check-uv-cross-products.mjs',scratch,reports+'/preflight-check.json',reports+'/preflight/uv-cross-products.json']);
 run(['--test','app/workshop/production-profiles.test.mjs']);
 write(target+'/STAGED.json',{ok:true,at:new Date().toISOString()});console.log('UV_CROSS_STAGE_OK');
}else if(phase==='import'){
 assert(read(target+'/STAGED.json').ok);assert.equal(fs.readFileSync(shim,'utf8'),expectedShim);
 assert.equal(hash(fs.readFileSync(configFile)),read(target+'/deployment.json').configSha256);
 assert(!fs.existsSync(target+'/IMPORTED.json'),'Already imported; use verify');
 assert(!fs.existsSync(target+'/before-heads.json'),'An import attempt exists; inspect its report before resuming');
 const before=heads();write(target+'/before-heads.json',before);
 // Import is append-only in one native SQLite transaction. Existing immutable
 // revisions are never rewritten. Back up the two small auxiliary stores.
 fs.mkdirSync(target+'/backup',{mode:0o700});
 for(const name of ['profiles.sqlite','design-assets.sqlite']){const db=new DatabaseSync(path.join(data,name),{readOnly:true});try{await backup(db,target+'/backup/'+name);}finally{db.close();}}
 run(['scripts/build-uv-cross-products.mjs',pack+'/catalog',data,pack+'/native-fonts.json',reports+'/online']);
 const added=preserved(before);assert.equal(added,4);
 run(['scripts/check-uv-cross-products.mjs',data,reports+'/online-check.json',reports+'/online/uv-cross-products.json']);
 write(target+'/IMPORTED.json',{ok:true,added,previousProducts:before.length,previousHeadsUnchanged:true,at:new Date().toISOString()});console.log('UV_CROSS_IMPORT_OK');
}else if(phase==='activate'){
 assert(read(target+'/IMPORTED.json').ok);assert.equal(fs.readFileSync(shim,'utf8'),expectedShim);
 assert.equal(hash(fs.readFileSync(configFile)),read(target+'/deployment.json').configSha256);
 preserved(read(target+'/before-heads.json'));validatePackage();
 for(const f of manifest.overrides)assert.equal(hash(fs.readFileSync(path.join(runtime,f.file))),hash(fs.readFileSync(path.join(pack,'code',f.file))));
 fs.writeFileSync(shim+'.uv-cross-next',nextShim,{mode:0o600});fs.renameSync(shim+'.uv-cross-next',shim);
 write(target+'/ACTIVATED.json',{ok:true,at:new Date().toISOString()});console.log('UV_CROSS_SHIM_ACTIVATED_RESTART_REQUIRED');
}else if(phase==='verify'){
 assert.equal(fs.readFileSync(shim,'utf8'),nextShim);
 const origin=config.GRAVURU_TEST_ORIGIN,headers={Authorization:'Basic '+Buffer.from(config.GRAVURU_TEST_USERNAME+':'+config.GRAVURU_TEST_PASSWORD).toString('base64')};
 const get=async route=>{assert(route.startsWith('/')&&!route.startsWith('//'));const r=await fetch(origin+route,{headers,redirect:'error',signal:AbortSignal.timeout(60000)});assert.equal(r.status,200,'HTTP '+r.status+' '+route);return r.text();};
 const health=JSON.parse(await get('/__test/health'));assert(health.ready);
 const html=await get('/uv-gedenkkreuze/');assert.equal((html.match(/<article>/g)||[]).length,20);assert.equal((html.match(/<section id=/g)||[]).length,4);
 const gallery=await get('/originale/');assert(gallery.includes('href="/uv-gedenkkreuze/"'));
 const previews=[...html.matchAll(/src="(\/api\/workshop\/products\/[^" ]+)/g)].map(m=>m[1].replaceAll('&amp;','&'));assert.equal(previews.length,20);
 for(const p of previews){const svg=await get(p);assert(svg.includes('<svg'));}
 const entries=[...html.matchAll(/class="open" href="([^" ]+)/g)].map(m=>m[1].replaceAll('&amp;','&'));assert.equal(entries.length,20);
 for(const p of entries){const editor=await get(p);assert(editor.includes('<html'));}
 const added=preserved(read(target+'/before-heads.json'));assert(added>=4);
 const receipt={ok:true,url:origin+'/uv-gedenkkreuze/',groups:4,designs:20,formats:60,previewHttp200:20,editorHttp200:20,existingGalleryHttp200:true,existingHeadsUnchanged:true,at:new Date().toISOString()};
 write(target+'/VERIFIED.json',receipt);console.log(JSON.stringify(receipt));
}else throw Error('Choose stage, import, activate or verify');
