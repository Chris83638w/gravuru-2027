import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {releasePreflight,storagePreflight,collectPreflight} from './preflight-readonly.mjs';
import {loopbackTarget,request,assertPilot,runStage,loadTest} from './loopback-load.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const health={schema:'gravuru-integration-pilot/v1',mode:'synthetic-only',externalNetwork:false,privateData:false};
async function fixture(t,handler){
  const server=http.createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  return {server,url:'http://127.0.0.1:'+server.address().port};
}
async function temp(t){
  const base=await fs.realpath(os.tmpdir()),dir=await fs.mkdtemp(path.join(base,'gravuru-pilot-ops-test-'));
  t.after(async()=>{
    const resolved=await fs.realpath(dir);
    if(path.dirname(resolved)!==base||!path.basename(resolved).startsWith('gravuru-pilot-ops-test-'))throw Error('Cleanup target outside test root');
    await fs.rm(resolved,{recursive:true,force:false});
  });return dir;
}

test('only literal loopback HTTP with explicit unprivileged port; no parser normalization bypass',()=>{
  assert.equal(loopbackTarget('http://127.0.0.1:8970/').hostname,'127.0.0.1');
  assert.equal(loopbackTarget('http://[::1]:8970').hostname,'::1');
  for(const value of ['https://127.0.0.1:8970','http://localhost:8970','http://127.1:8970','http://2130706433:8970','http://0177.0.0.1:8970','http://127.0.0.1:80','http://127.0.0.1:65536','http://127.0.0.1:8970/path','http://127.0.0.1:8970?url=https://shopify.com','http://127.0.0.1:8970@shopify.com','http://[::ffff:127.0.0.1]:8970','http://127.0.0.1:8970#x','http://127.0.0.2:8970'])assert.throws(()=>loopbackTarget(value),{code:'LOOPBACK_ONLY'});
});

test('wrong pilot identity prevents workload calls',async t=>{
  const calls=[];const {url}=await fixture(t,(req,res)=>{calls.push(req.url);res.end(JSON.stringify({...health,externalNetwork:true}));});
  await assert.rejects(loadTest({url}),{code:'PILOT_IDENTITY_REQUIRED'});
  assert.deepEqual(calls,['/pilot/health']);
});

test('redirect is rejected; second local endpoint is never followed',async t=>{
  let redirected=0;const dest=await fixture(t,(_req,res)=>{redirected++;res.end('{}');});
  const source=await fixture(t,(_req,res)=>{res.writeHead(302,{Location:dest.url+'/pilot/health'});res.end();});
  await assert.rejects(assertPilot(loopbackTarget(source.url)),{code:'REDIRECT_REJECTED'});
  assert.equal(redirected,0);
});

test('route whitelist prevents write or general proxy routes',()=>{
  const target=loopbackTarget('http://127.0.0.1:8970');
  for(const route of ['/api/workshop/merchant-test-cart','/api/workshop/acrylic-drafts','/pilot/model?proxy=https://example.com','//example.com'])assert.throws(()=>request(target,route),{code:'ROUTE_NOT_ALLOWED'});
});

test('bounded synthetic stage reports response statistics, only GET requests',async t=>{
  const calls=[];const {url}=await fixture(t,(req,res)=>{calls.push({path:req.url,method:req.method});res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url==='/pilot/health'?health:{synthetic:true,name:'Probe'}));});
  const result=await runStage(loopbackTarget(url),{concurrency:2,durationMs:400,requestsPerSecond:20,maxRequests:4});
  assert.equal(result.completed,4);assert.equal(result.statuses[200],4);assert.equal(result.stoppedOnBusyOrFailure,false);assert.ok(result.latencyMs.p95>=0);
  assert.ok(calls.every(x=>x.method==='GET'&&['/pilot/health','/pilot/model'].includes(x.path)));
});

test('busy target stops load escalation',async t=>{
  let modelCalls=0;const {url}=await fixture(t,(req,res)=>{
    if(req.url==='/pilot/health'){res.end(JSON.stringify(health));return;}
    modelCalls++;res.writeHead(409,{'Content-Type':'application/json'});res.end('{"error":{"code":"review_busy"}}');
  });
  const result=await loadTest({url,concurrencies:[1,2,4],durationMs:300,requestsPerSecond:20});
  assert.equal(result.stages.length,1);assert.equal(result.stages[0].statuses[409],1);assert.equal(modelCalls,1);assert.equal(result.productionCapacityProven,false);
});

test('full source manifest verified; no file changes or private values returned',async t=>{
  const dir=await temp(t);const payload=Buffer.from('export const synthetic = true;\n');await fs.mkdir(path.join(dir,'app'));await fs.writeFile(path.join(dir,'app','probe.mjs'),payload);
  const m={schema:1,sourceCommit:'a'.repeat(40),version:'0.1.0-test',scope:'shopify-merchant-test',unexpectedPrivate:'DO-NOT-PRINT',files:[{path:'app/probe.mjs',bytes:payload.length,sha256:digest(payload)}]};
  const mb=Buffer.from(JSON.stringify(m));await fs.writeFile(path.join(dir,'PACKAGE-MANIFEST.json'),mb);
  const before=await fs.readdir(dir),result=await releasePreflight(dir);
  assert.equal(result.verified,true);assert.equal(result.matched,1);assert.equal(result.sourceCommit,m.sourceCommit);assert.ok(!JSON.stringify(result).includes('DO-NOT-PRINT'));assert.deepEqual(await fs.readdir(dir),before);assert.equal(digest(await fs.readFile(path.join(dir,'PACKAGE-MANIFEST.json'))),digest(mb));
  await fs.writeFile(path.join(dir,'app','probe.mjs'),Buffer.alloc(payload.length,32));
  const mismatch=await releasePreflight(dir);assert.equal(mismatch.verified,false);assert.equal(mismatch.failures[0].code,'HASH_MISMATCH');
});

test('manifest traversal, secrets, databases and duplicate entries cannot be read as release code',async t=>{
  const dir=await temp(t);const invalid=['../outside','/absolute','app/../../private','app\\other','.env','private/config.json','app/data.sqlite','app/data.sqlite-wal'];
  await fs.writeFile(path.join(dir,'PACKAGE-MANIFEST.json'),JSON.stringify({files:invalid.map(p=>({path:p,bytes:0,sha256:digest('')}))}));
  const result=await releasePreflight(dir);assert.equal(result.verified,false);assert.equal(result.invalid,invalid.length);assert.equal(result.bytesRead,0);
});

test('storage inspection does not open SQLite, read configuration, acquire lock or change files',async t=>{
  const dir=await temp(t),secret='SYNTHETIC-SECRET-DO-NOT-PRINT';
  await fs.writeFile(path.join(dir,'workshop.sqlite'),secret);await fs.writeFile(path.join(dir,'.runtime.lock'),'');await fs.writeFile(path.join(dir,'runtime.json'),secret);
  const before=await fs.readdir(dir),result=await storagePreflight(dir);
  assert.equal(result.databasesOpened,false);assert.equal(result.runtimeLockOwnership,'not-tested');assert.equal(result.files.find(x=>x.name==='workshop.sqlite').bytes,secret.length);assert.equal(JSON.stringify(result).includes(secret),false);assert.deepEqual(await fs.readdir(dir),before);assert.equal(await fs.readFile(path.join(dir,'workshop.sqlite'),'utf8'),secret);
});

test('host preflight labels unavailable app limits and never mistakes probe process for app',async()=>{
  const result=await collectPreflight();assert.equal(result.readOnly,true);assert.equal(result.networkRequests,0);assert.equal(result.configurationOrEnvironmentDumped,false);assert.equal(result.appProcess.measured,false);assert.equal(result.release.provided,false);assert.ok(result.host.totalMemoryBytes>0);
});
