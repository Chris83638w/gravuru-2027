import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createAcrylEmployeeHost} from './acryl-employee-host.mjs';
import {createFontConnectionHost} from '../../scripts/lib/font-connection-host.mjs';
import {SHOPIFY_IDENTITY} from './shopify-runtime-config.mjs';

test('real native owner connects an optional private mount under its existing lock, exposes no new HTTP route and closes it with the host',async t=>{
  const parent=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'acryl-font-host-')),legacyRelease=path.join(root,'legacy');
  const modules=path.join(legacyRelease,'ops','plesk');fs.mkdirSync(modules,{recursive:true});
  // Only the unrelated legacy service and Linux lock process are stand-ins.
  // Native runtime, workshop, stores, limited reader and font mount are real.
  fs.writeFileSync(path.join(modules,'merchant-config.mjs'),`import {shopifyRuntimeConfig} from ${JSON.stringify(new URL('./shopify-runtime-config.mjs',import.meta.url).href)};export function merchantConfig(env){const runtime=shopifyRuntimeConfig(env);return {runtime,runtimeEnv:env,origin:runtime.embeddedApp.origin,host:new URL(runtime.embeddedApp.origin).host};}`);
  fs.writeFileSync(path.join(modules,'merchant-runtime.mjs'),`import http from 'node:http';export async function createMerchantRuntime(){const server=http.createServer((req,res)=>res.writeHead(404).end('legacy'));server.workshop={};return server;}`);
  fs.writeFileSync(path.join(modules,'lock.mjs'),`import {EventEmitter} from 'node:events';export const locks=[];export async function lockTestData(){const lock=new EventEmitter();lock.held=true;lock.stdin={end(){if(lock.held){lock.held=false;queueMicrotask(()=>lock.emit('exit'));}}};locks.push(lock);return lock;}`);
  const lockModule=await import(pathToFileURL(path.join(modules,'lock.mjs')).href);
  const katalogRoot=path.join(root,'katalog');fs.cpSync(new URL('./fixtures/katalog/',import.meta.url),katalogRoot,{recursive:true});
  const prior=process.env.GRAVURU_KATALOG;process.env.GRAVURU_KATALOG=katalogRoot;
  t.after(()=>{if(prior===undefined)delete process.env.GRAVURU_KATALOG;else process.env.GRAVURU_KATALOG=prior;assert.equal(path.dirname(root),parent);fs.rmSync(root,{recursive:true,force:true});});
  if(process.platform==='win32'){
    // Windows cannot prove POSIX 0700; simulate that single filesystem flag.
    // This test is not a production-permissions or real Linux flock proof.
    const original=fs.statSync;t.mock.method(fs,'statSync',(name,...args)=>{const stat=original(name,...args);if(String(name).startsWith(root+path.sep))Object.defineProperty(stat,'mode',{value:stat.mode&~0o077});return stat;});
  }
  const responses=[],measurements=[];let networkCalls=0;
  t.mock.method(globalThis,'fetch',async()=>{networkCalls++;throw Error('unexpected network in startup');});
  for(const enabled of [false,true]){
    const dataDirectory=path.join(root,enabled?'mounted':'baseline');fs.mkdirSync(dataDirectory,{mode:0o700});
    const env={GRAVURU_SHOPIFY_CLIENT_SECRET:'synthetic-private-host-secret-32-bytes',GRAVURU_SHOPIFY_APP_ORIGIN:'https://workshop.example',GRAVURU_PRIVATE_DATA_DIR:dataDirectory,
      GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only',GRAVURU_FONT_CONNECTION_EXECUTION:'enabled'};
    const mount=createFontConnectionHost({tenantId:'gravuru',shopDomain:SHOPIFY_IDENTITY.shopDomain,dataDirectory,katalogRoot,
      planDirectory:path.join(root,'plans'),webRoots:[path.join(root,'public')],targets:[],approvedSets:[]});
    let context,closed=0;
    const fontConnection=enabled?{connect(value){context=value;assert.equal(lockModule.locks.at(-1).held,true);const own=mount.connect(value);return {close(){closed++;own.close();}};}}:null;
    const started=performance.now(),memoryBefore=process.memoryUsage();
    const server=await createAcrylEmployeeHost({legacyRelease,dataDirectory,env,...(enabled?{fontConnection}:{})});
    const memoryAfter=process.memoryUsage();
    measurements.push({mode:enabled?'optional-private-mount':'unchanged-entry-without-mount',startupMs:Number((performance.now()-started).toFixed(2)),
      rssBefore:memoryBefore.rss,rssAfter:memoryAfter.rss,heapBefore:memoryBefore.heapUsed,heapAfter:memoryAfter.heapUsed});
    try{
      assert.equal(networkCalls,0);assert.equal(fs.existsSync(path.join(root,'plans')),false);
      assert.equal(server.fontConnection,undefined);assert.equal(server.workshop,undefined);
      if(enabled){
        assert.equal(context.workshop.repository.tenantId,'gravuru');assert.equal(context.dataDirectory,dataDirectory);
        assert.equal(context.shopifyReader.getAccessToken,undefined);assert.equal(context.shopifyReader.accessToken,undefined);assert.equal(context.shopifyReader.canWrite,false);
        await assert.rejects(context.shopifyReader.graphql('mutation X { shop { id } }',{}),{code:'gallery_connection_read_only'});
        await assert.rejects(mount.operator().execute('a'.repeat(64)),{code:'font_connection_execution_disabled'});
      }else assert.throws(()=>mount.operator(),{code:'font_connection_host_closed'});
      server.listen(0,'127.0.0.1');await once(server,'listening');
      // Raw HTTP avoids the mocked outbound Shopify fetch.
      const {get}=await import('node:http');
      const response=await new Promise((resolve,reject)=>{get({host:'127.0.0.1',port:server.address().port,path:'/private-font-connection',headers:{host:'workshop.example','x-forwarded-proto':'https'}},res=>{let body='';res.on('data',b=>body+=b);res.on('end',()=>resolve({status:res.statusCode,body}));}).on('error',reject);});
      responses.push(response);
    }finally{await new Promise(resolve=>server.close(resolve));server.closeAllConnections();}
    assert.equal(lockModule.locks.at(-1).held,false);assert.equal(closed,enabled?1:0);
    if(enabled)assert.throws(()=>mount.operator(),{code:'font_connection_host_closed'});
  }
  assert.deepEqual(responses,[{status:404,body:'legacy'},{status:404,body:'legacy'}]);assert.equal(networkCalls,0);
  t.diagnostic(JSON.stringify({audit:'font-host-isolated-comparison',node:process.version,platform:process.platform,measurements,networkCalls,
    note:'One interleaved synthetic run per mode, same process and fixture; second run benefits from warm imports. Not outage, customer speed or server RSS evidence.'}));
});
