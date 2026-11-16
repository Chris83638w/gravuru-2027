import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {privateTestEnvironment,testConfig,markerValue} from './config.mjs';
import {attachConfiguredSlateReviewGallery,SLATE_REVIEW_MARKER} from './slate-review-runtime.mjs';
import {createPrivateTestProxy} from './runtime.mjs';
import {createGalleryManagementFixture} from '../../scripts/fixtures/gallery-management.mjs';

function temporary(t,{automatic=true}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-plesk-mount-'));
 if(automatic)t.after(()=>{assert.ok(root.startsWith(path.join(os.tmpdir(),'gravuru-plesk-mount-')));fs.rmSync(root,{recursive:true,force:true});});
 return root;
}

test('optional Plesk management path preserves default and rejects request-like/remote paths',t=>{
 const root=temporary(t),env={GRAVURU_TEST_ORIGIN:'https://gallery.example',GRAVURU_PRIVATE_DATA_DIR:path.join(root,'data'),GRAVURU_TEST_PYTHON_DIR:path.join(root,'python')};
 assert.equal(Object.hasOwn(testConfig(env,{credentials:false}),'galleryManagementConfig'),false);
 const configured={...env,GRAVURU_SLATE_REVIEW_PACKAGE:path.join(root,'gallery'),GRAVURU_GALLERY_MANAGEMENT_CONFIG:path.join(root,'private-host.mjs')};
 assert.equal(testConfig(configured,{credentials:false}).galleryManagementConfig,configured.GRAVURU_GALLERY_MANAGEMENT_CONFIG);
 for(const value of ['relative.mjs','https://example.test/host.mjs',path.join(root,'host.json'),''])assert.throws(()=>testConfig({...configured,GRAVURU_GALLERY_MANAGEMENT_CONFIG:value},{credentials:false}));
 assert.throws(()=>testConfig({...configured,GRAVURU_SLATE_REVIEW_PACKAGE:undefined},{credentials:false}),/Galeriepaket/);
});

test('optional Plesk management key is accepted only by existing private config allowlist',t=>{
 const root=temporary(t),folder=path.join(root,'private'),file=path.join(folder,'config.json');fs.mkdirSync(folder,{mode:0o700});
 const values={GRAVURU_TEST_ORIGIN:'https://gallery.example',GRAVURU_PRIVATE_DATA_DIR:path.join(root,'data'),GRAVURU_TEST_PYTHON_DIR:path.join(root,'python'),GRAVURU_BOOTSTRAP_PYTHON:'/usr/bin/python3',GRAVURU_TEST_USERNAME:'synthetic',GRAVURU_TEST_PASSWORD:'synthetic-only-private-password',GRAVURU_SLATE_REVIEW_PACKAGE:path.join(root,'gallery'),GRAVURU_GALLERY_MANAGEMENT_CONFIG:path.join(folder,'host.mjs')};
 const save=v=>fs.writeFileSync(file,JSON.stringify({schema:1,purpose:'private-test-runtime',values:v}),{mode:0o600});save(values);
 // Windows has no POSIX uid/private mode. Model only these platform metadata
 // values; the real file, JSON parser, key allowlist and conflict checks run.
 if(process.platform==='win32'){
  const old=Object.getOwnPropertyDescriptor(process,'getuid');Object.defineProperty(process,'getuid',{value:()=>42,configurable:true});
  t.after(()=>old?Object.defineProperty(process,'getuid',old):delete process.getuid);
  for(const method of ['lstatSync','fstatSync']){const original=fs[method];t.mock.method(fs,method,(...args)=>{const stat=original(...args);Object.defineProperties(stat,{uid:{value:42},mode:{value:stat.mode&~0o077}});return stat;});}
 }
 assert.equal(testConfig(privateTestEnvironment({GRAVURU_TEST_CONFIG_FILE:file})).galleryManagementConfig,values.GRAVURU_GALLERY_MANAGEMENT_CONFIG);
 assert.throws(()=>privateTestEnvironment({GRAVURU_TEST_CONFIG_FILE:file,GRAVURU_GALLERY_MANAGEMENT_CONFIG:path.join(folder,'other.mjs')}),/Private Testkonfiguration/);
 save({...values,GRAVURU_UNKNOWN_MODULE_PATH:path.join(folder,'host.mjs')});
 assert.throws(()=>privateTestEnvironment({GRAVURU_TEST_CONFIG_FILE:file}),/Private Testkonfiguration/);
});

for(const configured of [false,true])test(`Plesk gallery mount ${configured?'uses native registry factory':'without config keeps existing management'} behind unchanged private proxy`,async t=>{
 const root=temporary(t,{automatic:false}),fixture=await createGalleryManagementFixture(path.join(root,'source'));
 const config={origin:'https://gallery.example',host:'gallery.example',username:'synthetic',password:'synthetic-only-private-password',data:fixture.root,slateReviewPackage:path.join(fixture.root,'package')};
 // The real Plesk mount requires a private package directory. mkdir's default
 // mode depends on umask and is usually 0755 on Linux; the fixture must meet
 // the same 0700 requirement instead of relying on the Windows metadata model.
 fs.chmodSync(config.slateReviewPackage,0o700);
 if(process.platform!=='win32')assert.equal(fs.statSync(config.slateReviewPackage).mode&0o777,0o700);
 fs.writeFileSync(path.join(config.slateReviewPackage,SLATE_REVIEW_MARKER),JSON.stringify(markerValue(config,'slate-review-gallery')));
 if(process.platform==='win32'){
  const original=fs.statSync;t.mock.method(fs,'statSync',(name,...args)=>{const stat=original(name,...args);if(name===config.slateReviewPackage)Object.defineProperty(stat,'mode',{value:stat.mode&~0o077});return stat;});
 }
 let imported;
 if(configured){
  config.galleryManagementConfig=path.join(root,'management.mjs');
  const templates=pathToFileURL(path.resolve('app/workshop/product-group-templates.mjs')).href;
  const handler=pathToFileURL(path.resolve('scripts/lib/gallery-management-http.mjs')).href;
  fs.writeFileSync(config.galleryManagementConfig,`import {createProductGroupTemplates} from ${JSON.stringify(templates)};
import {createGalleryManagementHandler} from ${JSON.stringify(handler)};
export const state={created:0,closed:0};
export function configureGalleryManagement(context){state.start=context;return {connect(c){
 state.created++;state.context=c;
 const groups=createProductGroupTemplates({filename:c.filename,repository:c.sourceWorkshop.repository,tenantId:c.sourceWorkshop.tenantId,targets:c.sourceRegistry.targets,offeringFor:c.sourceRegistry.offeringFor});
 const handle=createGalleryManagementHandler({workshop:c.sourceWorkshop,templates:groups,csrfToken:c.csrfToken});
 return {handle,close(){state.closed++;groups.close();}};
}};}`);
  imported=await import(pathToFileURL(config.galleryManagementConfig).href);
 }
 const inner=http.createServer((req,res)=>res.writeHead(404).end()),token='stable-synthetic-gallery-token';
 const gallery=await attachConfiguredSlateReviewGallery(inner,config,{workshop:fixture.workshop,csrfToken:token});
 await new Promise(r=>inner.listen(0,'127.0.0.1',r));
 const proxy=createPrivateTestProxy(config,inner);await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
 t.after(async()=>{await Promise.all([new Promise(r=>proxy.close(r)),new Promise(r=>inner.close(r))]);gallery.close();await fixture.close();if(imported)assert.equal(imported.state.closed,1);assert.ok(root.startsWith(path.join(os.tmpdir(),'gravuru-plesk-mount-')));fs.rmSync(root,{recursive:true,force:true});});
 const request=(route,{method='GET',body,headers={}}={})=>new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:proxy.address().port,path:route,method,headers:{host:config.host,'x-forwarded-proto':'https',origin:config.origin,authorization:'Basic '+Buffer.from(config.username+':'+config.password).toString('base64'),'x-slate-review-csrf':token,'content-type':'application/json',...headers}},res=>{let text='';res.on('data',v=>text+=v);res.on('end',()=>resolve({status:res.statusCode,text}));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
 });
 const route='/originale/verwaltung/api/context',response=await request(route);
 assert.equal(response.status,200);const context=JSON.parse(response.text);assert.equal(context.sources.length,2);
 for(const headers of [{authorization:''},{host:'foreign.example'},{origin:'https://foreign.example'},{'sec-fetch-site':'cross-site'}])assert.ok([401,403].includes((await request(route,{headers})).status));
 assert.equal((await request('/originale/comments',{method:'POST',body:{designId:fixture.originalId,text:'synthetic',expectedRevision:0},headers:{'x-slate-review-csrf':'wrong'}})).status,403);
 assert.equal((await request('/originale/')).status,200);
 if(imported){
  const {state}=imported;assert.equal(state.created,1);assert.equal(state.context.sourceWorkshop,fixture.workshop);assert.equal(state.context.csrfToken,token);
  assert.equal(state.start.dataDirectory,config.data);assert.equal(state.start.galleryDirectory,config.slateReviewPackage);assert.equal(state.start.filename,fixture.filename);assert.ok(Object.isFrozen(state.start));
  assert.deepEqual(state.context.sourceRegistry.targets().map(x=>x.key),context.sources.map(x=>x.key));
  const states=JSON.parse((await request('/originale/approvals')).text),summary=Object.values(states.approvals).find(a=>a.metadata.productId===fixture.products[0].record.id);
  assert.ok(summary,'exact native source is present in its existing approval registry');
  const read=await request('/originale/approvals?action=read',{method:'POST',body:{originalIds:[summary.metadata.id],targetKeys:[summary.key]}});
  assert.equal(read.status,200);const approval=JSON.parse(read.text).approvals[summary.key];
  const approved=await request('/originale/approvals',{method:'POST',body:{key:approval.key,approved:true,expectedRevision:approval.revision,expectedFingerprint:approval.fingerprint}});
  assert.equal(approved.status,200);
  const source={productId:fixture.products[0].record.id,designId:'source-a',originalId:fixture.originalId};
  assert.equal(state.context.sourceApproval({mapping:{source}}).approved,true);
  for(const patch of [{originalId:'missing-original'},{productId:'cfg_00000000-0000-0000-0000-000000000000'},{designId:'missing-design'}])
   assert.equal(state.context.sourceApproval({mapping:{source:{...source,...patch}}}).approved,false,'missing/foreign identity never inherits approval from an available original');
  const scope=state.context.sourceRegistry.scopes().find(s=>s.lineId==='test-linie'&&s.subcategoryId==='namensschilder');assert.equal(scope.sourceKeys.length,2);
  const before=state.context.sourceRegistry.offeringFor(scope),catalogue=fixture.workshop.catalogStructure.read();
  fixture.workshop.catalogStructure.save({action:'materials',lineId:scope.lineId,subcategoryId:scope.subcategoryId,familyIdsOffered:[],sourceSha256:catalogue.sourceSha256});
  assert.notEqual(state.context.sourceRegistry.offeringFor(scope).fingerprint,before.fingerprint);
 }
});

test('Plesk configured mount fails before installing routes for absent or malformed factory',async t=>{
 const root=temporary(t),server=http.createServer((req,res)=>res.end('existing')),before=server.listeners('request');
 const config={data:root,slateReviewPackage:path.join(root,'gallery'),galleryManagementConfig:path.join(root,'absent.mjs')};
 await assert.rejects(attachConfiguredSlateReviewGallery(server,config,{workshop:{}}));
 fs.writeFileSync(config.galleryManagementConfig,'export const configureGalleryManagement=()=>({connect:()=>({}),synchronizer:()=>({})});');
 await assert.rejects(attachConfiguredSlateReviewGallery(server,config,{workshop:{}}),/exactly one/);
 assert.deepEqual(server.listeners('request'),before);
});
