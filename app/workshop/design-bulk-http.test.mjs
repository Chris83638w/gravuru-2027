import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHmac,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createWorkshop} from './http.mjs';
import {forgetKatalog} from './design-dashboard.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {acrylRoute,acrylAssetText} from './acryl-employee-host.mjs';
const FIXTURE=fileURLToPath(new URL('./fixtures/katalog/',import.meta.url));
const DESIGN='TEST-9x6,0-D1',SECOND='TEST-9x6-D2';
const read=(root,relative)=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const write=(root,relative,value)=>{const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,1)+'\n');};
const config={mode:'embedded-test',origin:'https://bulk-workshop.example',shopDomain:'bulk-fixture.myshopify.com',clientId:'bulk-fixture-client'};
const sessions={mode:'test-only',shopDomain:config.shopDomain,clientId:config.clientId,secret:'synthetic-bulk-test-secret'};
const foreignSessions={mode:'test-only',shopDomain:'foreign-bulk-fixture.myshopify.com',clientId:'foreign-bulk-client',secret:'synthetic-other-test-secret'};
let output,seed;
before(()=>{output=fs.mkdtempSync(path.join(os.tmpdir(),'g27-bulk-http-build-'));build({outputDirectory:output});seed=read(output,'models.json')[0];});
after(()=>{fs.rmSync(output,{recursive:true,force:true});forgetKatalog();});
function token(options=sessions,overrides={}){
 const now=Math.floor(Date.now()/1000),claims={aud:options.clientId,dest:'https://'+options.shopDomain,iss:'https://'+options.shopDomain+'/admin',sub:'123',iat:now,nbf:now,exp:now+240,jti:randomUUID(),...overrides};
 const unsigned=[{alg:'HS256'},claims].map(value=>Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
 return 'Bearer '+unsigned+'.'+createHmac('sha256',options.secret).update(unsigned).digest('base64url');
}
function requestTo(server,url,{method='GET',headers={},data,raw}={}){
 return new Promise(resolve=>{
  const bytes=raw??(data===undefined?null:Buffer.from(JSON.stringify(data))),req=Readable.from(bytes===null?[]:[bytes]);
  Object.assign(req,{url,method,headers:{host:'bulk-workshop.example',...headers}});
  const res=new EventEmitter();res.headersSent=false;res.headers={};
  res.setHeader=(key,value)=>{res.headers[key.toLowerCase()]=value;};
  res.writeHead=(status,values={})=>{res.status=status;for(const [key,value]of Object.entries(values))res.setHeader(key,value);res.headersSent=true;return res;};
  res.end=body=>{res.bytes=Buffer.from(body??'');res.writableFinished=true;res.json=()=>JSON.parse(res.bytes.toString());resolve(res);};
  server.emit('request',req,res);
 });
}
async function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'g27-bulk-http-')),root=path.join(directory,'catalogue');fs.mkdirSync(root);
 for(const part of ['familien','themen.json','schriften'])fs.cpSync(path.join(FIXTURE,part),path.join(root,part),{recursive:true});
 const family=read(root,'familien/edelstahl/test-schilder.json');family.sizes=family.sizes.filter(size=>size.groupKey==='RE');write(root,'familien/edelstahl/test-schilder.json',family);
 const slate=structuredClone(family);slate.id='slate-http';slate.name='Synthetic slate';slate.material.kind='slate';slate.material.processingProfileId='slate-engraving';slate.sizes.forEach(size=>size.key='slate-'+size.key);write(root,'familien/slate/slate-http.json',slate);
 const line={schema:'gravuru-line/v2',id:'test-http-line',name:'Synthetic line',families:[family.id,slate.id],subcategories:[{id:'names',name:'Names',themeId:'namensschilder',mainProducts:[{id:'BOUND',name:'Bound product',startDesign:SECOND,sizesOffered:[family.sizes[0].key],externalIds:{shopifyProductId:'123456'}}]}]};write(root,'linien/http-fixture.json',line);
 for(const id of [DESIGN,SECOND]){write(root,'designs/test/'+id+'/design.json',{id,name:id,material:'Edelstahl',process:'Gravur',form:'Rechteck',plateMm:[90,60],sizes:family.sizes.map(size=>size.key),themes:['namensschilder'],fonts:[],texts:[],motifs:[],photos:[],ziele:[{familie:family.id,freigabe:null}]});write(root,'designs/test/'+id+'/design.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><path d="M10 10L20 10L20 20Z"/></svg>\n');}
 forgetKatalog();
 const workshop=createWorkshop({filename:path.join(directory,'test.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:root,shopifySessions:sessions,tenantOptions:()=>({shopifySessions:foreignSessions,katalogDir:root})});
 const server=createPreviewServer({outputDirectory:output,workshop,embeddedApp:config});server.address=()=>({port:8765});
 t.after(()=>{workshop.close();forgetKatalog();fs.rmSync(directory,{recursive:true,force:true});});
 const request=(url,options)=>requestTo(server,url,options),authorization=token(),session=await request('/api/workshop/session',{headers:{authorization}});assert.equal(session.status,200,session.bytes.toString());
 const headers={authorization,origin:config.origin,'content-type':'application/json','x-gravuru-csrf':session.json().csrfToken,'sec-fetch-site':'same-origin'};
 return {root,workshop,request,headers,family};
}
const changes={familyIds:['slate-http']};
const selection={designs:[{reihe:'test',id:DESIGN}],change:changes};
const appliedInput=(plan,change)=>({designs:plan.designs.map(({reihe,id,sourceChecksum})=>({reihe,id,sourceChecksum})),change,checksum:plan.checksum});
const audits=(root,relative)=>fs.existsSync(path.join(root,relative))?fs.readFileSync(path.join(root,relative),'utf8').trim().split('\n').map(JSON.parse):[];
async function mainInput(f,id=DESIGN){
 const result=await f.request('/api/workshop/designs/main-products/options?'+new URLSearchParams({reihe:'test',id}),{headers:f.headers});assert.equal(result.status,200,result.bytes.toString());
 const options=result.json(),line=options.lines.find(line=>line.id==='test-http-line'),family=line.families.find(family=>family.id==='test-schilder'),group=family.groups.find(group=>group.key==='RE');
 return {options,input:{source:{reihe:'test',id,checksum:options.source.checksum},lineId:line.id,lineChecksum:line.lineChecksum,subcategoryId:'names',familyId:family.id,groupKey:group.key,sizeKeys:group.sizes.map(size=>size.key),name:'Synthetic main product'}};
}

test('R1/R3 HTTP routes require signed merchant sessions, CSRF, same origin and correct host',async t=>{
 const f=await fixture(t),r3=await mainInput(f);
 const prepare=await f.request('/api/workshop/designs/batch/prepare',{method:'POST',headers:f.headers,data:selection});assert.equal(prepare.status,200);
 const mutations=[['/api/workshop/designs/batch/prepare','POST',selection],['/api/workshop/designs/batch','POST',appliedInput(prepare.json(),changes)],['/api/workshop/designs/main-products','POST',r3.input],['/api/workshop/designs/main-products','DELETE',{lineId:r3.input.lineId,lineChecksum:r3.input.lineChecksum,subcategoryId:'names',productId:'BOUND'}]];
 for(const [url,method,data]of mutations){
  for(const [patch,status]of [[{authorization:''},401],[{authorization:'Bearer invalid'},401],[{authorization:token(sessions,{aud:'wrong-client'})},401],[{'x-gravuru-csrf':'wrong'},403],[{origin:'https://foreign.invalid'},403],[{host:'foreign.invalid'},403],[{'sec-fetch-site':'cross-site'},403]]){
   const response=await f.request(url,{method,data,headers:{...f.headers,...patch}});assert.equal(response.status,status,url+' '+JSON.stringify(patch)+' '+response.bytes.toString());
  }
 }
 const options='/api/workshop/designs/main-products/options?'+new URLSearchParams({reihe:'test',id:DESIGN});assert.equal((await f.request(options)).status,401);assert.equal((await f.request(options,{headers:{...f.headers,authorization:token(sessions,{exp:Math.floor(Date.now()/1000)-30,iat:Math.floor(Date.now()/1000)-90,nbf:Math.floor(Date.now()/1000)-90})}})).status,401);
 assert.equal(audits(f.root,'designs/test/_aenderungen.jsonl').length,0);assert.equal(audits(f.root,'linien/_aenderungen.jsonl').length,0);assert.equal(f.workshop.repository.list().length,1);
});

test('R1 HTTP applies partial results with the server actor, preserves open approvals and blocks forged fields',async t=>{
 const f=await fixture(t),request={...selection,designs:[...selection.designs,{reihe:'test',id:'MISSING'}]},prepare=await f.request('/api/workshop/designs/batch/prepare',{method:'POST',headers:f.headers,data:request});assert.equal(prepare.status,200,prepare.bytes.toString());assert.equal(prepare.json().counts.rejected,1);assert.equal(audits(f.root,'designs/test/_aenderungen.jsonl').length,0);
 const input=appliedInput(prepare.json(),changes);
 for(const patch of [{actor:'forged'},{freigegeben:true},{change:{familyIds:['slate-http'],freigegeben:true}}])assert.equal((await f.request('/api/workshop/designs/batch',{method:'POST',headers:f.headers,data:{...input,...patch}})).status,422);
 const applied=await f.request('/api/workshop/designs/batch',{method:'POST',headers:f.headers,data:input});assert.equal(applied.status,200,applied.bytes.toString());assert.equal(applied.json().counts.changed,1);assert.equal(applied.json().counts.rejected,1);assert.equal(applied.json().designs[1].error.status,404);
 const master=read(f.root,'designs/test/'+DESIGN+'/design.json');assert.deepEqual(master.ziele,[{familie:'test-schilder',freigabe:null},{familie:'slate-http',freigabe:null}]);assert.equal(master.freigabe,undefined);
 const audit=audits(f.root,'designs/test/_aenderungen.jsonl');assert.equal(audit.length,1);assert.equal(audit[0].actor,'123');assert.equal(audit[0].designId,DESIGN);
 const retry=await f.request('/api/workshop/designs/batch',{method:'POST',headers:f.headers,data:input});assert.equal(retry.status,200);assert.equal(retry.json().counts.changed,0);assert.equal(audits(f.root,'designs/test/_aenderungen.jsonl').length,1);assert.equal(f.workshop.repository.list().length,1);
});

test('R1/R3 HTTP validates methods, bounded JSON bodies and the 500-design request limit',async t=>{
 const f=await fixture(t),fiveHundred={designs:Array.from({length:500},(_,i)=>({reihe:'test',id:'MISSING-'+i})),change:changes};
 const accepted=await f.request('/api/workshop/designs/batch/prepare',{method:'POST',headers:f.headers,data:fiveHundred});assert.equal(accepted.status,200,accepted.bytes.toString());assert.equal(accepted.json().counts.designs,500);
 assert.equal((await f.request('/api/workshop/designs/batch/prepare',{method:'POST',headers:f.headers,data:{...fiveHundred,designs:[...fiveHundred.designs,{reihe:'test',id:'MISSING-500'}]}})).status,422);
 for(const [url,limit]of [['/api/workshop/designs/batch/prepare',512*1024],['/api/workshop/designs/batch',512*1024],['/api/workshop/designs/main-products',32768]])assert.equal((await f.request(url,{method:'POST',headers:f.headers,raw:Buffer.from(JSON.stringify({padding:'x'.repeat(limit)}))})).status,413,url);
 assert.equal((await f.request('/api/workshop/designs/batch',{method:'POST',headers:{...f.headers,'content-type':'text/plain'},raw:Buffer.from('{}')})).status,415);
 assert.equal((await f.request('/api/workshop/designs/batch',{method:'POST',headers:f.headers,raw:Buffer.from('{')})).status,400);
 for(const [url,method]of [['/api/workshop/designs/batch','GET'],['/api/workshop/designs/batch/prepare','GET'],['/api/workshop/designs/main-products','GET'],['/api/workshop/designs/main-products/options','POST']])assert.equal((await f.request(url,{method,headers:f.headers,data:{}})).status,405,url);
 assert.equal(audits(f.root,'designs/test/_aenderungen.jsonl').length,0);assert.equal(audits(f.root,'linien/_aenderungen.jsonl').length,0);
});

test('R3 HTTP creates and deletes local main products but never a Shopify-bound product',async t=>{
 const f=await fixture(t),{input}=await mainInput(f),sourceBefore=fs.readFileSync(path.join(f.root,'designs/test/'+DESIGN+'/design.json'),'utf8');
 for(const patch of [{actor:'forged'},{externalIds:{shopifyProductId:'111'}},{freigegeben:true}])assert.equal((await f.request('/api/workshop/designs/main-products',{method:'POST',headers:f.headers,data:{...input,...patch}})).status,422);
 const created=await f.request('/api/workshop/designs/main-products',{method:'POST',headers:f.headers,data:input});assert.equal(created.status,201,created.bytes.toString());const result=created.json();assert.equal(result.productId,'TEST-9x6_0-D1-RE');assert.deepEqual(result.entry.externalIds,{});assert.match(result.entry.status,/^angelegt im Dashboard \d{4}-\d{2}-\d{2} von 123$/);
 assert.equal(read(f.root,'linien/http-fixture.json').subcategories[0].mainProducts.length,2);assert.equal((await f.request('/api/workshop/designs/main-products',{method:'POST',headers:f.headers,data:input})).status,409);
 const deletion={lineId:input.lineId,lineChecksum:result.lineChecksum,subcategoryId:'names',productId:result.productId};
 assert.equal((await f.request('/api/workshop/designs/main-products',{method:'DELETE',headers:f.headers,data:{...deletion,actor:'forged'}})).status,422);
 const deleted=await f.request('/api/workshop/designs/main-products',{method:'DELETE',headers:f.headers,data:deletion});assert.equal(deleted.status,200,deleted.bytes.toString());assert.equal(read(f.root,'linien/http-fixture.json').subcategories[0].mainProducts.length,1);
 const bound=await mainInput(f,SECOND),boundEntry=bound.options.existing.find(entry=>entry.id==='BOUND');assert.equal(boundEntry.canDelete,false);
 const blocked=await f.request('/api/workshop/designs/main-products',{method:'DELETE',headers:f.headers,data:{lineId:boundEntry.lineId,lineChecksum:boundEntry.lineChecksum,subcategoryId:boundEntry.subcategoryId,productId:'BOUND'}});assert.equal(blocked.status,409,blocked.bytes.toString());
 const audit=audits(f.root,'linien/_aenderungen.jsonl');assert.deepEqual(audit.map(entry=>entry.action),['dashboard-add','dashboard-delete']);assert.ok(audit.every(entry=>entry.actor==='123'));
 assert.equal(fs.readFileSync(path.join(f.root,'designs/test/'+DESIGN+'/design.json'),'utf8'),sourceBefore);assert.equal(audits(f.root,'designs/test/_aenderungen.jsonl').length,0);assert.equal(f.workshop.repository.list().length,1);
});

test('a valid session for another tenant cannot read or mutate the configured Gravuru catalogue',async t=>{
 const f=await fixture(t);f.workshop.tenants.ensure({id:'other',shopDomain:foreignSessions.shopDomain,name:'Synthetic other tenant'});
 const authorization=token(foreignSessions),session=await f.request('/api/workshop/session',{headers:{authorization}});assert.equal(session.status,200,session.bytes.toString());assert.equal(session.json().tenant.id,'other');
 const headers={...f.headers,authorization,'x-gravuru-csrf':session.json().csrfToken};
 for(const [url,method,data]of [['/api/workshop/designs/batch/prepare','POST',selection],['/api/workshop/designs/batch','POST',{}],['/api/workshop/designs/main-products/options?reihe=test&id='+encodeURIComponent(DESIGN),'GET',undefined],['/api/workshop/designs/main-products','POST',{}],['/api/workshop/designs/main-products','DELETE',{}]]){
  const response=await f.request(url,{method,headers,data});assert.equal(response.status,503,response.bytes.toString());assert.equal(response.json().error.code,'katalog_tenant');
 }
 assert.equal(audits(f.root,'designs/test/_aenderungen.jsonl').length,0);assert.equal(audits(f.root,'linien/_aenderungen.jsonl').length,0);assert.equal(f.workshop.forTenant('other').repository.list().length,0);
});

test('merchant proxy paths route both new APIs and serve their actual dashboard modules',async t=>{
 const f=await fixture(t);
 for(const filename of ['design-dashboard-assignments.mjs','design-dashboard-main-products.mjs']){
  const route=acrylRoute('/workshop-acryl-ui/'+filename);assert.equal(route,'/workshop-ui/'+filename);
  const response=await f.request(route,{headers:f.headers});assert.equal(response.status,200,response.bytes.toString());assert.match(response.headers['content-type'],/^text\/javascript/);assert.match(response.bytes.toString(),/export function installDesign/);
  const rewritten=acrylAssetText(response.bytes.toString(),route);assert.match(rewritten,/\/api\/workshop\/acryl\/designs\//);
 }
 for(const route of ['/api/workshop/acryl/designs/batch/prepare','/api/workshop/acryl/designs/batch','/api/workshop/acryl/designs/main-products/options','/api/workshop/acryl/designs/main-products'])assert.equal(acrylRoute(route),route.replace('/workshop/acryl/','/workshop/'));
 const prepared=await f.request(acrylRoute('/api/workshop/acryl/designs/batch/prepare'),{method:'POST',headers:f.headers,data:selection});assert.equal(prepared.status,200,prepared.bytes.toString());assert.equal(prepared.json().counts.addable,1);
 const options=await f.request(acrylRoute('/api/workshop/acryl/designs/main-products/options')+'?'+new URLSearchParams({reihe:'test',id:DESIGN}),{headers:f.headers});assert.equal(options.status,200,options.bytes.toString());assert.equal(options.json().source.id,DESIGN);
});
