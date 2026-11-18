import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {lockTestData} from '../../ops/plesk/lock.mjs';
import {runFontConnectionMaintenance,parseFontMaintenanceArguments} from './font-connection-maintenance.mjs';
import {createGalleryProductionShopifyRead} from './gallery-production-shopify-read.mjs';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain,GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from '../../app/workshop/gallery-shop-sync-test-fixture.mjs';

async function fixture(t){
 const parent=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'font-maint-command-'));
 const f=await createGallerySyncTestFixture({directory:dir,activationOptions:{approvalMode:'preserve'}});
 t.after(()=>{f.close();assert.equal(path.dirname(dir),parent);fs.rmSync(dir,{recursive:true,force:true});});
 const katalogRoot=path.join(dir,'katalog'),fonts=['Michroma','Lato','Cinzel','Montserrat'];
 fs.cpSync(new URL('../../app/workshop/fixtures/katalog/',import.meta.url),katalogRoot,{recursive:true});
 f.targetWorkshop.profiles.registerFonts(fonts);f.targetWorkshop.profiles.syncCatalogFontSet('tuerschilder',fonts);
 const config={schema:'gravuru-font-maintenance/v1',tenantId:'gravuru',shopDomain,dataDirectory:path.join(dir,'target'),katalogRoot,
  planDirectory:path.join(dir,'plans'),webRoots:[path.join(dir,'public')],legacyRelease:path.join(dir,'legacy'),python:path.join(dir,'python'),
  merchantConfigFile:path.join(dir,'merchant.json'),activeEntryFile:path.join(dir,'app.cjs'),installedRelease:path.join(dir,'release'),activeEntrySha256:'a'.repeat(64),lockModuleSha256:'b'.repeat(64),approvedPlanSha:null,
  targets:[{id:'synthetic',setId:'tuerschilder',reviewedRevision:1,mapping:f.mapping}],approvedSets:[{id:'tuerschilder',fonts}]};
 const trace=[];let lock,onRead=()=>{};
 const reader=createGalleryProductionShopifyRead({shopDomain,apiVersion:'2026-07',accessToken:'synthetic-only',fetchImpl:async(url,request)=>{
  trace.push('read');assert.ok(JSON.parse(request.body).query.startsWith('query '));await onRead();
  return new Response(JSON.stringify({data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:PRODUCT,
   variants:{nodes:f.variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2)})),pageInfo:{hasNextPage:false}},media:{nodes:[],pageInfo:{hasNextPage:false}}}}}),{headers:{'content-type':'application/json','x-shopify-api-version':'2026-07'}});}});
 const dependencies={
  acquireLock:async()=>{trace.push('lock');lock=new EventEmitter();return lock;},
  verifyInstalledCode:()=>trace.push('code'),
  readRuntime:async()=>{trace.push('config');return {python:config.python,runtime:{shopifySessions:{shopDomain}},runtimeEnv:{}};},
  createRuntime:(env,options)=>{trace.push('open');assert.equal(options.maintenanceOnly,true);assert.equal(env.GRAVURU_PRIVATE_DATA_DIR,config.dataDirectory);
   const mounted=options.fontConnection.connect({workshop:f.targetWorkshop,dataDirectory:config.dataDirectory,katalogRoot,shopifyReader:reader});let closed=false;
   return {workshop:f.targetWorkshop,close(){if(!closed){closed=true;trace.push('close');mounted.close();}}};},
  releaseLock:async()=>trace.push('unlock'),mountOptions:{runtimeFonts:Object.fromEntries(fonts.map(n=>[n,{regular:{units:1000,glyphs:{}}}]))}
 };
 return {...f,config,dependencies,trace,lock:()=>lock,onRead:fn=>{onRead=fn;},run:(request,change={})=>runFontConnectionMaintenance({config,request,dependencies,...change})};
}

test('lock refusal ends before runtime config, database, network or output creation',async t=>{
 const f=await fixture(t);
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{dependencies:{...f.dependencies,acquireLock:async()=>{f.trace.push('lock');throw Object.assign(Error('busy'),{code:'synthetic_lock_busy'});}}}),{code:'synthetic_lock_busy'});
 assert.deepEqual(f.trace,['lock']);assert.equal(fs.existsSync(f.config.planDirectory),false);
});

test('separate plan and execute commands close before unlock; only the pinned valid plan may run',async t=>{
 const f=await fixture(t),plan=await f.run({phase:'plan',targetId:'synthetic'});
 assert.deepEqual(f.trace,['lock','code','config','open','read','close','unlock']);assert.equal(plan.path,undefined);
 const otherConfig={...f.config,targets:[{...f.config.targets[0],id:'other'}]};
 const other=await f.run({phase:'plan',targetId:'other'},{config:otherConfig});assert.notEqual(other.sha256,plan.sha256);
 f.trace.length=0;
 await assert.rejects(f.run({phase:'execute',sha256:other.sha256},{config:{...f.config,approvedPlanSha:plan.sha256}}),{code:'font_maintenance_plan_not_approved'});
 assert.deepEqual(f.trace,[]);assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);
 const done=await f.run({phase:'execute',sha256:plan.sha256},{config:{...f.config,approvedPlanSha:plan.sha256}});
 assert.equal(done.revision,2);assert.equal(done.previousRevision,1);assert.equal(done.sha256,plan.sha256);
 assert.deepEqual(f.trace.slice(-2),['close','unlock']);
});

test('loss of the existing lock while reading prevents plan persistence and does not retry',async t=>{
 const f=await fixture(t);f.onRead(()=>f.lock().emit('exit'));
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'}),{code:'font_maintenance_lock_lost'});
 assert.deepEqual(f.trace,['lock','code','config','open','read','close','unlock']);assert.equal(fs.existsSync(f.config.planDirectory),false);
 assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);
});

test('abort during execution closes the owner before unlock and leaves the product unchanged',async t=>{
 const f=await fixture(t),plan=await f.run({phase:'plan',targetId:'synthetic'}),controller=new AbortController();f.trace.length=0;
 f.onRead(()=>controller.abort());
 await assert.rejects(f.run({phase:'execute',sha256:plan.sha256},{signal:controller.signal,config:{...f.config,approvedPlanSha:plan.sha256}}),{code:'font_maintenance_aborted'});
 assert.deepEqual(f.trace,['lock','code','config','open','read','close','unlock']);assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);
});

test('code mismatch and startup failure release only after the owner boundary, without commands',async t=>{
 const f=await fixture(t);
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{dependencies:{...f.dependencies,verifyInstalledCode(){throw Object.assign(Error('wrong release'),{code:'font_maintenance_code_mismatch'});}}}),{code:'font_maintenance_code_mismatch'});
 assert.deepEqual(f.trace,['lock','unlock']);f.trace.length=0;
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{dependencies:{...f.dependencies,createRuntime(){f.trace.push('open-failed');throw Error('synthetic startup');}}}),/synthetic startup/);
 assert.deepEqual(f.trace,['lock','code','config','open-failed','unlock']);assert.equal(fs.existsSync(f.config.planDirectory),false);
});

test('an owner close failure never releases a potentially still-owned database',async t=>{
 const f=await fixture(t),open=f.dependencies.createRuntime;
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{dependencies:{...f.dependencies,createRuntime(...args){const owner=open(...args);return {...owner,close(){owner.close();throw Error('synthetic close failure');}};}}}),/synthetic close failure/);
 assert.equal(f.trace.includes('unlock'),false);
});

test('abort retains the lock when the first idempotent owner close failed',async t=>{
 const f=await fixture(t),open=f.dependencies.createRuntime,controller=new AbortController();
 f.onRead(()=>controller.abort());
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{signal:controller.signal,dependencies:{...f.dependencies,createRuntime(...args){
  const owner=open(...args);let closed=false;return {...owner,close(){if(closed)return;closed=true;owner.close();throw Error('synthetic abort close failure');}};
 }}}),/synthetic abort close failure/);
 assert.equal(f.trace.includes('close'),true);assert.equal(f.trace.includes('unlock'),false);
 assert.equal(fs.existsSync(f.config.planDirectory),false);
});

test('real entry-file pin binds maintenance to this installed release before opening the native runtime',async t=>{
 const f=await fixture(t),installedRelease=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),entry=path.join(installedRelease,'scripts','acryl-employee-entry.cjs').replaceAll('\\','/');
 const bytes=Buffer.from('process.env.GRAVURU_ACRYL_DATA_DIR='+JSON.stringify(f.config.dataDirectory.replaceAll('\\','/'))+';\nprocess.env.GRAVURU_ACRYL_LEGACY_RELEASE='+JSON.stringify(f.config.legacyRelease.replaceAll('\\','/'))+';\nrequire('+JSON.stringify(entry)+');\n');fs.writeFileSync(f.config.activeEntryFile,bytes);
 const config={...f.config,installedRelease,activeEntrySha256:createHash('sha256').update(bytes).digest('hex')};
 const dependencies={...f.dependencies};delete dependencies.verifyInstalledCode;
 await f.run({phase:'plan',targetId:'synthetic'},{config,dependencies});assert.ok(f.trace.includes('open'));f.trace.length=0;
 fs.appendFileSync(f.config.activeEntryFile,'// changed');
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{config,dependencies}),{code:'font_maintenance_code_mismatch'});
 assert.deepEqual(f.trace,['lock','unlock']);f.trace.length=0;
 const foreign=Buffer.from('require("/different/release/scripts/acryl-employee-entry.cjs");');fs.writeFileSync(f.config.activeEntryFile,foreign);
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{config:{...config,activeEntrySha256:createHash('sha256').update(foreign).digest('hex')},dependencies}),{code:'font_maintenance_code_mismatch'});
 assert.deepEqual(f.trace,['lock','unlock']);
});

test('CLI permits only a separate explicit plan or execute command, never an enable switch or combined run',()=>{
 const file=path.resolve('synthetic-private-config.json'),base=['--config',file];
 assert.deepEqual(parseFontMaintenanceArguments([...base,'execute','a'.repeat(64)]).request,{phase:'execute',sha256:'a'.repeat(64)});
 assert.deepEqual(parseFontMaintenanceArguments([...base,'plan','pilot','--restore-revision','4','--recovery-sha','b'.repeat(64)]).request,{phase:'plan',targetId:'pilot',restoreRevision:4,recoverySha:'b'.repeat(64)});
 for(const args of [[...base,'execute'],[...base,'execute','a'.repeat(64),'--enabled'],[...base,'plan','pilot','execute','a'.repeat(64)],
  [...base,'plan','pilot','--restore-revision','0'],[...base,'plan','pilot','--restore-revision','1','--restore-revision','2'],['--config','relative.json','plan','pilot']])
  assert.throws(()=>parseFontMaintenanceArguments(args),{code:'font_maintenance_arguments'});
});

test('real Linux lock excludes the second process in both directions and recovers after a hard abort',{skip:process.platform==='win32'?'Linux fcntl proof must run on Linux':false},async t=>{
 const f=await fixture(t),python=process.env.GRAVURU_PYTHON||'/usr/bin/python3';
 const acquire=()=>lockTestData({data:f.config.dataDirectory,python});
 const held=await acquire();
 const dependencies={...f.dependencies,acquireLock:acquire};delete dependencies.releaseLock;
 try{await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{dependencies}),/Testablage bereits geöffnet/);assert.deepEqual(f.trace,[]);}
 finally{const exit=once(held,'exit');held.stdin.end();await exit;}
 f.onRead(async()=>{await assert.rejects(acquire(),/Testablage bereits geöffnet/);});
 await f.run({phase:'plan',targetId:'synthetic'},{dependencies});
 let own;dependencies.acquireLock=async()=>own=await acquire();
 f.onRead(async()=>{const exit=once(own,'exit');own.kill('SIGKILL');await exit;});
 await assert.rejects(f.run({phase:'plan',targetId:'synthetic'},{dependencies}),{code:'font_maintenance_lock_lost'});
 const after=await acquire(),exit=once(after,'exit');after.stdin.end();await exit;
 assert.equal(fs.existsSync(path.join(f.config.dataDirectory,'.runtime.lock')),true);
});
