import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';
import {createShopifyAdminHost} from './shopify-admin-host.mjs';
import {createMerchantRequest} from './ui/merchant-request.mjs';
import {merchantDownload} from './ui/merchant-downloads.mjs';

const config={mode:'embedded-test',origin:'https://workshop.example',shopDomain:'fixture.myshopify.com',clientId:'fixture-client'};
const sessions={mode:'test-only',shopDomain:config.shopDomain,clientId:config.clientId,secret:randomBytes(32).toString('hex')};

test('variant report and saved checks require merchant authorization and preserve product snapshot separation',async t=>{
 const {request,workshop}=setup(t),authorization=jwt(),session=JSON.parse((await request('/api/workshop/session',{headers:{authorization}})).bytes);
 const headers={authorization,'x-gravuru-csrf':session.csrfToken,'content-type':'application/json',origin:config.origin},base='/api/workshop/variants/batch/';
 const input={rows:[{import_key:'missing-members',name:'Noch unvollständig'}],variantRows:[]},data={name:'Private Prüfung',input},before=workshop.repository.list();
 assert.equal((await request(base+'jobs')).status,401);
 for(const route of ['jobs','report']){
  const body=route==='jobs'?data:{...input,mode:'errors'};
  assert.equal((await request(base+route,{method:'POST',data:body,headers:{...headers,authorization:''}})).status,401);
  assert.equal((await request(base+route,{method:'POST',data:body,headers:{...headers,'x-gravuru-csrf':'wrong'}})).status,403);
  assert.equal((await request(base+route,{method:'POST',data:body,headers:{...headers,origin:'https://foreign.invalid'}})).status,403);
 }
 const response=await request(base+'report',{method:'POST',data:{...input,mode:'errors'},headers});assert.equal(response.status,200,response.bytes.toString());assert.equal(response.bytes.subarray(0,2).toString(),'PK');assert.match(response.headers['cache-control'],/private, no-store/);
 const saved=await request(base+'jobs',{method:'POST',data,headers});assert.equal(saved.status,201,saved.bytes.toString());const {id}=JSON.parse(saved.bytes);
 assert.equal((await request('/api/workshop/batch/jobs/'+id,{headers})).status,404);
 assert.equal((await request(base+'jobs/'+id)).status,401);
 const loaded=await request(base+'jobs/'+id,{headers});assert.equal(loaded.status,200);assert.equal(JSON.parse(loaded.bytes).plan.report[0].status,'error');
 assert.equal((await request(base+'jobs/'+id+'/remove',{method:'POST',data:{},headers:{...headers,'x-gravuru-csrf':'wrong'}})).status,403);
 assert.equal((await request(base+'jobs/'+id+'/remove',{method:'POST',data:{},headers})).status,200);
 assert.deepEqual(workshop.repository.list(),before);assert.equal(workshop.variants.list().length,0);
});
function setup(t,embedded=true){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-admin-host-'));build({outputDirectory:dir});
  const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
  const workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,...(embedded?{shopifySessions:sessions}:{})});
  const server=createPreviewServer({outputDirectory:dir,workshop,...(embedded?{embeddedApp:config}:{})});server.address=()=>({port:8765});
  t.after(()=>{workshop.close();fs.rmSync(dir,{recursive:true,force:true});});
  const request=(url,{method='GET',headers={},data}={})=>new Promise(resolve=>{
    const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);Object.assign(req,{url,method,headers:{host:embedded?'workshop.example':'127.0.0.1:8765',...headers}});
    const res=new EventEmitter();res.headersSent=false;res.headers={};res.setHeader=(k,v)=>res.headers[k.toLowerCase()]=v;
    res.writeHead=(status,h={})=>{res.status=status;for(const[k,v]of Object.entries(h))res.setHeader(k,v);res.headersSent=true;return res;};
    res.end=bytes=>{res.bytes=Buffer.from(bytes||'');resolve(res);};server.emit('request',req,res);
  });return {request,workshop};
}
function jwt(patch={}){const now=Math.floor(Date.now()/1000),p={aud:sessions.clientId,dest:'https://'+sessions.shopDomain,iss:'https://'+sessions.shopDomain+'/admin',sub:'123',iat:now,nbf:now,exp:now+60,jti:randomUUID(),...patch};const text=[{alg:'HS256'},p].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return 'Bearer '+text+'.'+createHmac('sha256',sessions.secret).update(text).digest('base64url');}

test('batch correction download requires merchant session, CSRF and trusted origin and changes no products',async t=>{
  const {request,workshop}=setup(t),authorization=jwt();
  const session=JSON.parse((await request('/api/workshop/session',{headers:{authorization}})).bytes);
  const master=workshop.repository.list().find(p=>p.kind==='master');assert(master);
  const data={mode:'errors',masterId:master.id,masterRevision:master.revision,rows:[{import_key:'correction',name:'Fehler',price_small_eur:'invalid'}]};
  const headers={authorization,'x-gravuru-csrf':session.csrfToken,'content-type':'application/json',origin:config.origin};
  const route='/api/workshop/batch/report',before=workshop.repository.list();
  assert.equal((await request(route,{method:'POST',data,headers:{...headers,authorization:''}})).status,401);
  assert.equal((await request(route,{method:'POST',data,headers:{...headers,'x-gravuru-csrf':'wrong'}})).status,403);
  assert.equal((await request(route,{method:'POST',data,headers:{...headers,origin:'https://foreign.invalid'}})).status,403);
  assert.equal((await request(route,{method:'POST',data,headers:{...headers,host:'foreign.invalid'}})).status,403);
  const response=await request(route,{method:'POST',data,headers});assert.equal(response.status,200,response.bytes.toString());
  assert.equal(response.bytes.subarray(0,2).toString(),'PK');assert.match(response.headers['cache-control'],/no-store/);assert.match(response.headers['content-disposition'],/Gravuru-Fehlerkorrektur.xlsx/);
  assert.deepEqual(workshop.repository.list(),before);
});

test('saved import checks use the merchant gate and removal never deletes products',async t=>{
  const {request,workshop}=setup(t),authorization=jwt();
  const session=JSON.parse((await request('/api/workshop/session',{headers:{authorization}})).bytes);
  const master=workshop.repository.list().find(p=>p.kind==='master');
  const data={name:'Private Serie',input:{masterId:master.id,masterRevision:master.revision,rows:[{import_key:'saved-http',name:'Privater Produktname'}]}};
  const headers={authorization,'x-gravuru-csrf':session.csrfToken,'content-type':'application/json',origin:config.origin},route='/api/workshop/batch/jobs';
  assert.equal((await request(route)).status,401);
  assert.equal((await request(route,{method:'POST',data,headers:{...headers,'x-gravuru-csrf':'wrong'}})).status,403);
  assert.equal((await request(route,{method:'POST',data,headers:{...headers,origin:'https://other.invalid'}})).status,403);
  const before=workshop.repository.list(),saved=await request(route,{method:'POST',data,headers});assert.equal(saved.status,201,saved.bytes.toString());const job=JSON.parse(saved.bytes);
  const listed=await request(route,{headers:{authorization}});assert.equal(listed.status,200);assert.ok(!listed.bytes.toString().includes('Privater Produktname'));
  assert.equal((await request(route+'/'+job.id)).status,401);
  const opened=await request(route+'/'+job.id,{headers:{authorization}});assert.equal(opened.status,200);assert.equal(JSON.parse(opened.bytes).plan.report[0].status,'ready');
  assert.equal((await request(route+'/'+job.id+'/remove',{method:'POST',data:{},headers:{...headers,authorization:''}})).status,401);
  assert.equal((await request(route+'/'+job.id+'/remove',{method:'POST',data:{},headers})).status,200);
  assert.equal((await request(route+'/'+job.id,{headers:{authorization}})).status,404);assert.deepEqual(workshop.repository.list(),before);
});

test('explicit fixed HTTPS host requires matching authenticated workshop before startup',()=>{
  for(const patch of [{origin:'http://workshop.example'},{origin:'https://workshop.example/'},{origin:'https://user:pw@workshop.example'},{origin:'https://workshop.example?x=1'},{origin:'https://127.0.0.1'},{origin:'https://localhost'},{shopDomain:'*.myshopify.com'},{clientId:'"><script>'},{mode:'public'}])assert.throws(()=>createShopifyAdminHost({...config,...patch},sessions));
  for(const context of [null,{...sessions,shopDomain:'other.myshopify.com'},{...sessions,clientId:'other'},{...sessions,mode:'public'}])assert.throws(()=>createShopifyAdminHost(config,context));
  assert.throws(()=>createPreviewServer({embeddedApp:config}));
});
test('all merchant pages load App Bridge before modules with exact frame ancestors and no secrets',async t=>{
  const f=setup(t);
  for(const route of ['/werkstatt/','/werkstatt/shopvorbereitung/','/werkstatt/serien/','/werkstatt/bestellungen/','/werkstatt/formprodukt/']){
    const r=await f.request(route+'?shop=evil.myshopify.com&host=evil&clientId=evil',{headers:{'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate','sec-fetch-dest':'iframe'}});
    assert.equal(r.status,200);const html=r.bytes.toString();
    assert.match(html,/name="shopify-api-key" content="fixture-client"/);assert.ok(html.indexOf('app-bridge.js')<html.indexOf('type="module"'));assert.ok(!html.includes(sessions.secret));assert.ok(!html.includes('evil.myshopify.com'));
    assert.match(r.headers['content-security-policy'],/frame-ancestors https:\/\/fixture.myshopify.com https:\/\/admin.shopify.com/);assert.ok(!r.headers['content-security-policy'].includes('*'));assert.ok(!r.headers['content-security-policy'].includes('unsafe-eval'));assert.equal(r.headers['referrer-policy'],'no-referrer');
    assert.equal(Number(r.headers['content-length']),r.bytes.length);
  }
});
test('foreign hosts and forwarded header spoofing cannot select the application host',async t=>{
  const {request}=setup(t);
  for(const host of ['evil.example','workshop.example.evil','127.0.0.1:8765','workshop.example:443'])assert.equal((await request('/werkstatt/',{headers:{host,'x-forwarded-host':'workshop.example','x-forwarded-proto':'https'}})).status,403);
});
test('iframe navigation is allowed but cross-site API, scripts and writes stay forbidden',async t=>{
  const {request}=setup(t),nav={'sec-fetch-site':'cross-site','sec-fetch-mode':'navigate','sec-fetch-dest':'iframe',origin:'https://admin.shopify.com'};
  assert.equal((await request('/werkstatt/',{headers:nav})).status,200);
  assert.equal((await request('/werkstatt/',{headers:{...nav,origin:'https://evil.example'}})).status,403);
  for(const route of ['/api/workshop/session','/workshop-ui/app.mjs'])assert.equal((await request(route,{headers:nav})).status,403);
  assert.equal((await request('/werkstatt/',{method:'POST',headers:nav})).status,403);
  assert.equal((await request('/api/workshop/session',{headers:{authorization:jwt(),'sec-fetch-site':'same-site'}})).status,403);
});
test('anonymous API and missing CSRF stay blocked; real merchant handler succeeds only with session',async t=>{
  const {request}=setup(t);
  assert.equal((await request('/api/workshop/products')).status,401);
  assert.equal((await request('/api/workshop/products',{headers:{authorization:jwt({aud:'other'})}})).status,401);
  const h={authorization:jwt(),origin:config.origin,'sec-fetch-site':'same-origin'};
  const session=await request('/api/workshop/session',{headers:h});assert.equal(session.status,200);assert.ok(JSON.parse(session.bytes).csrfToken);
  assert.equal((await request('/api/workshop/products',{headers:h})).status,200);
  assert.equal((await request('/api/workshop/products',{method:'POST',headers:{...h,'content-type':'application/json'},data:{}})).status,403);
  assert.match(session.headers['content-security-policy'],/frame-ancestors/);
});
test('embedded host does not expose customer editor, model data, dotfiles or traversal',async t=>{
  const {request}=setup(t);
  for(const route of ['/','/models.json','/editor.html','/form-editor.html','/konfigurator/form/','/.env','/workshop-ui/%2e%2e%2fhttp.mjs','/workshop-ui/no-file.html'])assert.equal((await request(route)).status,404,route);
  const r=await request('/werkstatt/',{method:'HEAD'});assert.equal(r.status,200);assert.equal(r.bytes.length,0);assert.ok(Number(r.headers['content-length'])>0);
});
test('loopback preview keeps original host, frame and unauthenticated local behavior',async t=>{
  const {request}=setup(t,false);const page=await request('/werkstatt/');assert.equal(page.status,200);assert.ok(!page.bytes.toString().includes('shopify-api-key'));assert.match(page.headers['content-security-policy'],/frame-ancestors 'self'/);
  assert.equal((await request('/models.json')).status,200);assert.equal((await request('/api/workshop/products')).status,200);assert.equal((await request('/werkstatt/',{headers:{host:'workshop.example'}})).status,403);
});
test('embedded browser fails closed when App Bridge does not load, never sending anonymous requests',async()=>{
  let calls=0;const request=createMerchantRequest({bridge:()=>undefined,required:()=>true,fetchImpl:()=>{calls++;}});await assert.rejects(request('/api/workshop/session'),/Anmeldung nicht verfügbar/);assert.equal(calls,0);
});
test('private Excel download uses fresh merchant token, original bytes and no bearer in URL',async t=>{
  const {request}=setup(t);let calls=0;
  const client=createMerchantRequest({required:()=>true,bridge:()=>({idToken:async()=>{calls++;return jwt().slice(7);}}),fetchImpl:async(url,opts)=>{assert.ok(!url.includes('Bearer'));const r=await request(url,{headers:Object.fromEntries(opts.headers)});return new Response(r.bytes,{status:r.status,headers:r.headers});}});
  const result=await merchantDownload('/api/workshop/import-template',{request:client});const bytes=Buffer.from(await result.blob.arrayBuffer());assert.equal(bytes.subarray(0,2).toString(),'PK');assert.equal(calls,1);
});
test('downloads reject errors/JSON and sanitize filenames rather than exposing upstream text',async()=>{
  for(const response of [new Response('private-upstream',{status:403}),Response.json({private:'data'})])await assert.rejects(merchantDownload('/api/workshop/file',{request:async()=>response}),e=>!e.message.includes('private'));
  const response=new Response('pdf',{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="../secret.pdf"'}});assert.equal((await merchantDownload('/api/workshop/file',{request:async()=>response})).filename,null);
});

test('private dashboard preview passes through actual authenticated host and preserves self-contained SVG bytes',async t=>{
  const {createMerchantMediaLoader}=await import('./ui/merchant-media.mjs');
  const {request,workshop}=setup(t),route='/api/workshop/products/'+workshop.defaultId+'/preview.svg?revision=1&layout=card';
  assert.equal((await request(route)).status,401);
  const raw=await request(route,{headers:{authorization:jwt()}});assert.equal(raw.status,200);assert.match(raw.bytes.toString(),/editor-base-front/);assert.match(raw.bytes.toString(),/data:image\//);
  let captured;const client=createMerchantRequest({required:()=>true,bridge:()=>({idToken:async()=>jwt().slice(7)}),fetchImpl:async(url,opts)=>{const r=await request(url,{headers:Object.fromEntries(opts.headers)});return new Response(r.bytes,{status:r.status,headers:r.headers});}});
  const loader=createMerchantMediaLoader({request:client,createURL:blob=>{captured=blob;return 'blob:private-preview';},revokeURL:()=>{}}),attrs=new Map(),element={localName:'img',isConnected:true,getAttribute:k=>attrs.get(k),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),dispatchEvent:()=>{}};
  assert.equal(await loader.load(element,route),true);assert.deepEqual(Buffer.from(await captured.arrayBuffer()),raw.bytes);assert.equal(attrs.get('src'),'blob:private-preview');loader.dispose();
  assert.equal((await request('/workshop-ui/merchant-media.mjs')).status,200);
  assert.equal((await request('/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png')).status,200);
  assert.equal((await request('/_runtime/other-file.json')).status,404);
});
