import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createHmac,randomBytes,createHash} from 'node:crypto';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {amazonTestOrders} from './amazon-fixtures.mjs';

async function runtime(t,options={}){
 const parent=path.resolve(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'g27-amazon-operations-'));
 build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json'),'utf8'))[0];
 const workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,...options}),server=createPreviewServer({outputDirectory:dir,workshop});
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));workshop.close();assert.equal(path.dirname(path.resolve(dir)),parent);assert.ok(path.basename(dir).startsWith('g27-amazon-operations-'));fs.rmSync(dir,{recursive:true,force:true});});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const get=(route,headers)=>fetch(base+route,{headers});
 const post=(route,payload={},csrf,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'X-Gravuru-CSRF':csrf}:{}),...headers},body:JSON.stringify(payload)});
 return {workshop,get,post};
}

test('paperwork is automatically generated after import, reproducible, A5 selectable and exact output confirmation idempotent',async t=>{
 const f=await runtime(t,{amazon:{allowTestImports:true}}),{csrfToken}=await (await f.get('/api/workshop/session')).json();
 const imported=await (await f.post('/api/workshop/amazon/demo',{action:'import'},csrfToken)).json();
 assert.equal(imported.paperwork.generated,true);assert.equal(imported.paperwork.jobIds.length,1);
 const queue=await (await f.get('/api/workshop/amazon/paperwork')).json();assert.equal(queue.jobs.length,1);assert.equal(queue.jobs[0].status,'generated');
 assert.equal((await f.get('/workshop-ui/amazon-operations-ui.mjs')).status,200);
 await f.post('/api/workshop/amazon/demo',{action:'import'},csrfToken);assert.equal((await (await f.get('/api/workshop/amazon/paperwork')).json()).total,1);
 const jobIds=imported.paperwork.jobIds,pdfResponse=await f.post('/api/workshop/amazon/paperwork/pdf',{jobIds},csrfToken),pdf=Buffer.from(await pdfResponse.arrayBuffer());
 assert.equal(pdfResponse.status,200);assert.match(pdfResponse.headers.get('content-type'),/application\/pdf/);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 assert.equal(createHash('sha256').update(pdf).digest('hex'),pdfResponse.headers.get('x-gravuru-sha256'));assert.equal(pdfResponse.headers.get('cache-control'),'no-store');
 const confirmed={jobIds,outputId:pdfResponse.headers.get('x-gravuru-outputid'),requestId:'print-example-1'};
 const first=await (await f.post('/api/workshop/amazon/paperwork/printed',confirmed,csrfToken)).json(),again=await (await f.post('/api/workshop/amazon/paperwork/printed',confirmed,csrfToken)).json();
 assert.deepEqual(first,again);assert.equal(first.physicalPrintingVerified,false);
 const rows=f.workshop.amazonOrders.list(),a5=await (await f.post('/api/workshop/amazon/paperwork/enqueue',{lineIds:[rows[0].id],format:'A5'},csrfToken)).json();
 assert.equal(a5.jobs.length,1);assert.equal(a5.jobs[0].document.lines.length,2);assert.equal(a5.jobs[0].format,'A5');
 const a5pdf=await f.post('/api/workshop/amazon/paperwork/pdf',{jobIds:a5.jobs.map(j=>j.id)},csrfToken);assert.equal(a5pdf.status,200);
 const resolved=await (await f.post('/api/workshop/amazon/scan/resolve',{code:rows[0].orderId},csrfToken)).json();assert.equal(resolved.positions.length,2);
 const position=await (await f.post('/api/workshop/amazon/scan/resolve',{code:a5.jobs[0].document.lines[0].positionCode},csrfToken)).json();assert.equal(position.positions.length,1);
 assert.equal((await f.post('/api/workshop/amazon/scan',{code:rows[0].orderId,stage:'production',requestId:'missing-snapshot'},csrfToken)).status,409);
 await f.post('/api/workshop/amazon/demo',{action:'cancel'},csrfToken);
 assert.equal((await f.post('/api/workshop/amazon/paperwork/pdf',{jobIds},csrfToken)).status,409);assert.equal((await f.post('/api/workshop/amazon/scan',{code:rows[0].orderId,stage:'production',requestId:'cancelled-scan'},csrfToken)).status,409);
});

test('manual Custom upload -> exact matching -> review -> append-only confirmation -> printable selected values',async t=>{
 const f=await runtime(t,{amazon:{allowTestImports:true}}),{csrfToken}=await (await f.get('/api/workshop/session')).json();
 const orders=amazonTestOrders();orders[0].orderId='123-1234567-1234567';f.workshop.amazonOrders.ingestPage({orders},{provenance:'synthetic'});
 const row=f.workshop.amazonOrders.list()[0],base64=Buffer.from(JSON.stringify({customizations:[{text:'MUSTER GRAVURU',fontFamily:'Arial'}]})).toString('base64');
 const input={lineId:row.id,orderId:row.orderId,orderItemId:row.lineId,sku:row.sku,base64,format:'json',classification:'synthetic',operatorApproved:true,expectedVersion:0,expectedHash:null};
 assert.equal((await f.post('/api/workshop/amazon/custom/imports',{...input,orderId:'wrong-order'},csrfToken)).status,422);
 assert.equal((await f.post('/api/workshop/amazon/custom/imports',{...input,classification:'production'},csrfToken)).status,403);
 const uploaded=await f.post('/api/workshop/amazon/custom/imports',input,csrfToken);assert.equal(uploaded.status,201);const current=await uploaded.json();
 assert.equal(current.version,1);assert.equal(current.inspection.valuesIncluded,false);assert.ok(!JSON.stringify(current).includes('MUSTER GRAVURU'));
 const duplicate=await (await f.post('/api/workshop/amazon/custom/imports',input,csrfToken)).json();assert.equal(duplicate.hash,current.hash);
 const candidate=current.inspection.candidates.find(f=>f.kind==='text'),mapping={texts:[{file:candidate.file,path:candidate.path,label:'Gravurtext'}],options:[],images:[]};
 const reviewInput={lineId:row.id,expectedVersion:current.version,expectedHash:current.hash,mapping},reviewed=await (await f.post('/api/workshop/amazon/custom/review',reviewInput,csrfToken)).json();
 assert.equal(reviewed.customization.texts[0].value,'MUSTER GRAVURU');
 const confirmation={...reviewInput,reviewHash:reviewed.reviewHash,operatorApproved:true},confirmed=await (await f.post('/api/workshop/amazon/custom/confirm',confirmation,csrfToken)).json();
 assert.equal(confirmed.version,2);assert.equal(confirmed.productionReady,false);
 const replay=await (await f.post('/api/workshop/amazon/custom/confirm',confirmation,csrfToken)).json();assert.equal(replay.version,2);assert.equal(replay.duplicate,true);
 const latest=await (await f.get('/api/workshop/amazon/custom/imports?lineId='+row.id)).json();assert.equal(latest.history.length,2);assert.equal(latest.current.customization.texts[0].value,'MUSTER GRAVURU');
 const queued=await (await f.post('/api/workshop/amazon/paperwork/enqueue',{lineIds:[row.id],format:'A4'},csrfToken)).json();
 assert.equal(queued.jobs[0].document.lines.find(l=>l.id===row.id).customTexts[0].value,'MUSTER GRAVURU');
 const pdf=await f.post('/api/workshop/amazon/paperwork/pdf',{jobIds:queued.jobs.map(j=>j.id)},csrfToken);assert.equal(pdf.status,200);
 const encoded=Buffer.from(await pdf.arrayBuffer()).toString('latin1'),text=encoded.replace(/<([a-f0-9]+)>/gi,(_,value)=>Buffer.from(value,'hex').toString('latin1'));assert.ok(text.includes('MUSTER GRAVURU'));
});

test('operations inherit configuration, CSRF and merchant authentication gates',async t=>{
 const disabled=await runtime(t),{csrfToken}=await (await disabled.get('/api/workshop/session')).json();
 for(const route of ['paperwork/enqueue','paperwork/pdf','paperwork/printed','scan/resolve','scan','custom/imports','custom/review','custom/confirm']){
  assert.equal((await disabled.post('/api/workshop/amazon/'+route,{},csrfToken)).status,403,route);
 }
 const f=await runtime(t,{amazon:{allowTestImports:true}});
 assert.equal((await f.post('/api/workshop/amazon/custom/imports',{})).status,403);assert.equal((await f.post('/api/workshop/amazon/paperwork/pdf',{})).status,403);
 const now=1800000000,config={mode:'test-only',shopDomain:'synthetic.myshopify.com',clientId:'synthetic-client',secret:randomBytes(32).toString('hex'),clock:()=>now*1000},secured=await runtime(t,{shopifySessions:config,amazon:{allowTestImports:true}});
 const payload={aud:config.clientId,dest:config.shopDomain,sub:'gid://shopify/Customer/456',exp:now+60,nbf:now,iat:now,jti:'synthetic-session'},sign=[{alg:'HS256',typ:'JWT'},payload].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.'),token='Bearer '+sign+'.'+createHmac('sha256',config.secret).update(sign).digest('base64url');
 for(const route of ['paperwork','custom/imports?lineId=amazonline_00000000-0000-0000-0000-000000000000']){
  assert.equal((await secured.get('/api/workshop/amazon/'+route)).status,401);assert.equal((await secured.get('/api/workshop/amazon/'+route,{Authorization:token})).status,401);
 }
});
