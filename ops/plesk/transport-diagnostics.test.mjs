import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createPrivateTestProxy} from './runtime.mjs';

const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
async function waitFor(predicate){
  const until=Date.now()+2000;
  while(!predicate()){if(Date.now()>until)assert.fail('Expected transport event did not arrive');await tick();}
}
async function fixture(t,handler,{onDiagnostic}={}){
  const events=[],inner=http.createServer(handler);
  inner.listen(0,'127.0.0.1');await once(inner,'listening');
  const config={origin:'https://private.example',host:'private.example',username:'synthetic',password:'never-log-password'};
  const authorization='Basic '+Buffer.from(config.username+':'+config.password).toString('base64');
  const proxy=createPrivateTestProxy(config,inner,{onDiagnostic:event=>{events.push(event);onDiagnostic?.(event);}});
  proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  t.after(async()=>{proxy.closeAllConnections();inner.closeAllConnections();await Promise.all([new Promise(r=>proxy.close(r)),new Promise(r=>inner.close(r))]);});
  function start(route='/editor.html',{headers={}}={}){
    let request;
    const done=new Promise((resolve,reject)=>{
      request=http.request({hostname:'127.0.0.1',port:proxy.address().port,path:route,agent:false,
        headers:{host:config.host,'x-forwarded-proto':'https',authorization,origin:config.origin,
          'sec-fetch-site':'same-origin','sec-fetch-mode':'navigate','sec-fetch-dest':'iframe',...headers}},response=>{
        const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('error',reject);
        response.once('end',()=>resolve({status:response.statusCode,bytes:Buffer.concat(chunks),complete:response.complete,headers:response.headers}));
      });request.on('error',reject);request.end();
    });
    return {request,done};
  }
  return {events,start,config,authorization,inner};
}

test('editor transport trace correlates bounded metadata and exact bytes through complete response',async t=>{
  const body=Buffer.from('<!doctype html><title>Größe</title>'),split=17;
  const f=await fixture(t,(_req,res)=>{
    res.writeHead(200,{'Content-Type':'text/html; parameter=never-log-header','Content-Length':body.length,'X-Private':'never-log-upstream'});
    res.write(body.subarray(0,split));setImmediate(()=>res.end(body.subarray(split)));
  });
  const result=await f.start('/editor.html?secret=never-log-query',{headers:{cookie:'never-log-cookie','x-gravuru-csrf':'never-log-csrf'}}).done;
  assert.equal(result.status,200);assert.deepEqual(result.bytes,body);assert.equal(result.complete,true);
  await waitFor(()=>f.events.some(e=>e.phase==='outer-close'));
  const byPhase=Object.fromEntries(f.events.map(e=>[e.phase,e]));
  for(const phase of ['request-begin','upstream-headers','upstream-first-byte','upstream-end','upstream-close','outer-finish','outer-close'])assert.ok(byPhase[phase],phase);
  const begin=byPhase['request-begin'];assert.equal(begin.sequence,1);assert.match(begin.runId,/^[a-f0-9-]{36}$/);
  for(const event of f.events){
    assert.equal(event.sequence,begin.sequence);assert.equal(event.runId,begin.runId);assert.equal(event.route,'/editor.html');
    assert.ok(Number.isFinite(Date.parse(event.timestamp)));assert.ok(Number.isFinite(event.elapsedMs)&&event.elapsedMs>=0);
  }
  assert.equal(byPhase['upstream-headers'].declaredBytes,body.length);assert.equal(byPhase['upstream-headers'].contentType,'text/html');
  assert.equal(byPhase['upstream-end'].upstreamBytes,body.length);assert.equal(byPhase['upstream-end'].complete,true);
  assert.equal(byPhase['outer-finish'].upstreamBytes,body.length);assert.equal(byPhase['outer-finish'].upstreamComplete,true);
  assert.equal(byPhase['outer-close'].writableFinished,true);
  const logged=JSON.stringify(f.events);
  for(const value of ['never-log',f.config.origin,f.config.host,f.authorization,'127.0.0.1','Größe'])assert.ok(!logged.includes(value),value);
});

test('route cap does not suppress pending trace completion and wrapper traffic cannot consume iframe budget',async t=>{
  let held;
  const f=await fixture(t,(req,res)=>{if(req.url==='/editor.html?hold'){held=res;return;}res.end('ok');});
  for(let i=0;i<22;i++)await f.start('/originale/editor').done;
  const pending=f.start('/editor.html?hold');await waitFor(()=>held);
  const heldSequence=f.events.findLast(e=>e.phase==='request-begin').sequence;
  for(let i=0;i<22;i++)await f.start('/editor.html').done;
  held.end('late but complete');assert.equal((await pending.done).bytes.toString(),'late but complete');
  await waitFor(()=>f.events.some(e=>e.sequence===heldSequence&&e.phase==='outer-close'));
  for(const route of ['/originale/editor','/editor.html'])assert.equal(f.events.filter(e=>e.route===route&&e.phase==='request-begin').length,20);
  const selected=f.events.filter(e=>e.sequence===heldSequence);
  assert.equal(selected.find(e=>e.phase==='upstream-end').complete,true);
  assert.equal(selected.find(e=>e.phase==='outer-finish').upstreamBytes,17);
  assert.ok(selected.some(e=>e.phase==='outer-close'));
});

test('aborted outer navigation reports close without claiming finish and keeps later requests usable',async t=>{
  let held;
  const f=await fixture(t,(req,res)=>{if(req.url==='/editor.html?hold'){held=res;res.writeHead(200,{'Content-Length':'1000'});res.write('first bytes');return;}res.end('still usable');});
  const pending=f.start('/editor.html?hold');const rejected=assert.rejects(pending.done);
  await waitFor(()=>f.events.some(e=>e.phase==='upstream-first-byte'));
  pending.request.destroy();await rejected;
  await waitFor(()=>f.events.some(e=>e.sequence===1&&e.phase==='outer-close'));
  const selected=f.events.filter(e=>e.sequence===1),closed=selected.find(e=>e.phase==='outer-close');
  assert.equal(closed.writableFinished,false);assert.ok(closed.upstreamBytes>0);assert.ok(!selected.some(e=>e.phase==='outer-finish'));
  assert.equal((await f.start().done).bytes.toString(),'still usable');
  held.destroy();
});

test('rejected requests and upstream failures remain distinguishable without secret error messages',async t=>{
  let forwarded=0;
  const f=await fixture(t,(_req,res)=>{forwarded++;res.end('ok');},{onDiagnostic:()=>{throw Error('observer failure must be harmless');}});
  const rejected=await f.start('/editor.html',{headers:{authorization:''}}).done;
  assert.equal(rejected.status,401);assert.equal(forwarded,0);
  assert.ok(!f.events.some(e=>e.sequence===1&&e.phase.startsWith('upstream-')));
  assert.equal(f.events.find(e=>e.sequence===1&&e.phase==='outer-finish').status,401);
  await new Promise(resolve=>f.inner.close(resolve));
  const failed=await f.start().done;assert.equal(failed.status,502);
  const error=f.events.find(e=>e.sequence===2&&e.phase==='upstream-request-error');assert.equal(error.code,'ECONNREFUSED');
  assert.equal(Object.hasOwn(error,'message'),false);
});
