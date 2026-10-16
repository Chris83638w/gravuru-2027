import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createHmac,randomBytes} from 'node:crypto';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {amazonTestOrders} from './amazon-fixtures.mjs';

async function runtime(t,options={}){
 const parent=path.resolve(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'g27-amazon-http-'));
 build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json'),'utf8'))[0];
 const workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,...options}),server=createPreviewServer({outputDirectory:dir,workshop});
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));workshop.close();assert.equal(path.dirname(path.resolve(dir)),parent);assert.ok(path.basename(dir).startsWith('g27-amazon-http-'));fs.rmSync(dir,{recursive:true,force:true});});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const get=(route,headers)=>fetch(base+route,{headers});
 const post=(route,payload={},csrf,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'X-Gravuru-CSRF':csrf}:{}),...headers},body:JSON.stringify(payload)});
 return {workshop,get,post};
}
test('default HTTP runtime exposes no fabricated orders and keeps imports and remote access disabled',async t=>{
 const f=await runtime(t),before=JSON.stringify(f.workshop.repository.get(f.workshop.defaultId)),session=await (await f.get('/api/workshop/session')).json(),status=await (await f.get('/api/workshop/amazon/status')).json();
 assert.equal(status.mode,'not-connected');assert.equal(status.productionReadsEnabled,false);assert.equal(status.productionWritesEnabled,false);assert.equal(status.testImportsAllowed,false);
 assert.deepEqual((await (await f.get('/api/workshop/amazon/orders')).json()).orders,[]);
 assert.equal((await f.post('/api/workshop/amazon/demo',{},session.csrfToken)).status,403);assert.equal((await f.post('/api/workshop/amazon/probe',{},session.csrfToken)).status,503);
 assert.equal(JSON.stringify(f.workshop.repository.get(f.workshop.defaultId)),before);assert.deepEqual(f.workshop.orderIntake.list(),[]);
});
test('HTTP test import requires CSRF, deduplicates, propagates cancellation and strips unexpected input',async t=>{
 let calls=0,providerError=false;const client={diagnostics:()=>({environment:'sandbox'}),async probeSandbox(){calls++;if(providerError)throw Error('PRIVATE-PROVIDER-TOKEN');const raw=amazonTestOrders()[0];raw.buyer={name:'PRIVATE-CUSTOMER'};raw.recipient={address:'PRIVATE-ADDRESS'};raw.orderItems[0].product.customization={customizedUrl:'https://example.invalid/PRIVATE-SIGNATURE'};return {order:raw};}};
 const f=await runtime(t,{amazon:{allowTestImports:true,client}}),before=JSON.stringify(f.workshop.repository.get(f.workshop.defaultId)),{csrfToken}=await (await f.get('/api/workshop/session')).json();
 assert.equal((await f.post('/api/workshop/amazon/demo')).status,403);assert.equal((await f.post('/api/workshop/amazon/demo',{},'a'.repeat(64))).status,403);assert.equal(f.workshop.amazonOrders.list().length,0);
 assert.equal((await f.post('/api/workshop/amazon/demo',{action:'import',mode:'production'},csrfToken)).status,422);
 assert.equal((await f.post('/api/workshop/amazon/demo',{action:'import'},csrfToken)).status,200);assert.equal((await f.post('/api/workshop/amazon/demo',{action:'import'},csrfToken)).status,200);
 let rows=await (await f.get('/api/workshop/amazon/orders')).json();assert.equal(rows.orders.length,2);assert.ok(rows.orders.every(o=>o.test&&o.provenance==='synthetic'));assert.equal(calls,0);
 assert.equal((await f.post('/api/workshop/amazon/demo',{action:'cancel'},csrfToken)).status,200);rows=await (await f.get('/api/workshop/amazon/orders')).json();assert.ok(Object.values(rows.statuses).every(s=>s.cancelled&&s.productionBlocked&&!s.productionReady));
 const probe=await f.post('/api/workshop/amazon/probe',{},csrfToken);assert.equal(probe.status,200);assert.equal((await probe.json()).productionPermissionVerified,false);assert.equal(calls,1);
 const body=await (await f.get('/api/workshop/amazon/orders')).text();assert.ok(!body.includes('PRIVATE'));assert.ok(!body.includes('example.invalid'));assert.equal(f.workshop.amazonOrders.list().length,4);
 providerError=true;const failed=await f.post('/api/workshop/amazon/probe',{},csrfToken);assert.equal(failed.status,502);assert.ok(!(await failed.text()).includes('PRIVATE'));
 const denied=await f.post('/api/workshop/amazon/confirm-shipment',{orderId:'TEST-GRAVURU-AMAZON-001'},csrfToken);assert.ok(denied.status>=400);assert.equal(calls,2);
 assert.equal(JSON.stringify(f.workshop.repository.get(f.workshop.defaultId)),before);assert.deepEqual(f.workshop.orderIntake.list(),[]);
});
test('Amazon HTTP routes inherit merchant authentication; customer sessions cannot access them',async t=>{
 const now=1800000000,config={mode:'test-only',shopDomain:'synthetic.myshopify.com',clientId:'synthetic-client',secret:randomBytes(32).toString('hex'),clock:()=>now*1000};
 const token=role=>{const payload={aud:config.clientId,dest:role==='merchant'?'https://'+config.shopDomain:config.shopDomain,sub:role==='merchant'?'123':'gid://shopify/Customer/456',...(role==='merchant'?{iss:'https://'+config.shopDomain+'/admin'}:{}),exp:now+60,nbf:now,iat:now,jti:'synthetic-session'},input=[{alg:'HS256',typ:'JWT'},payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return 'Bearer '+input+'.'+createHmac('sha256',config.secret).update(input).digest('base64url');};
 const f=await runtime(t,{shopifySessions:config,amazon:{allowTestImports:true}});
 assert.equal((await f.get('/api/workshop/amazon/orders')).status,401);assert.equal((await f.get('/api/workshop/amazon/orders',{Authorization:token('customer')})).status,401);
 const headers={Authorization:token('merchant')},session=await (await f.get('/api/workshop/session',headers)).json();assert.equal((await f.get('/api/workshop/amazon/orders',headers)).status,200);
 assert.equal((await f.post('/api/workshop/amazon/demo',{},session.csrfToken,{Authorization:token('customer')})).status,401);assert.equal((await f.post('/api/workshop/amazon/demo',{},session.csrfToken,headers)).status,200);
});
