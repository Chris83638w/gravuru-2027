import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createPrivateTestProxy} from './runtime.mjs';
import {testConfig} from './config.mjs';
import {validateSlateReviewMapping} from './slate-review-runtime.mjs';
import {createSlateGalleryHandler} from '../../scripts/lib/slate-review-gallery.mjs';

test('gallery proxy authenticates and checks exact external origin before forwarding CSRF',async t=>{
  let forwarded=0,headers;
  const inner=http.createServer((req,res)=>{forwarded++;headers=req.headers;res.end('private');});
  inner.listen(0,'127.0.0.1');await once(inner,'listening');
  const config={origin:'https://slate.example',host:'slate.example',username:'synthetic',password:'synthetic-password-for-test'};
  const proxy=createPrivateTestProxy(config,inner);
  proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  t.after(()=>{proxy.close();proxy.closeAllConnections();inner.close();inner.closeAllConnections();});
  const authorization='Basic '+Buffer.from(config.username+':'+config.password).toString('base64');
  const request=(overrides={})=>new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:proxy.address().port,path:'/originale/comments',method:'POST',headers:{host:config.host,'x-forwarded-proto':'https',origin:config.origin,authorization,'x-slate-review-csrf':'slate-token','x-gravuru-csrf':'editor-token','x-untrusted':'discard',...overrides}},res=>{res.resume();res.once('end',()=>resolve(res.statusCode));});
    req.on('error',reject);req.end();
  });
  assert.equal(await request({authorization:''}),401);
  assert.equal(await request({authorization:'Basic '+Buffer.from('synthetic:wrong').toString('base64')}),401);
  assert.equal(await request({host:'other.example'}),403);
  assert.equal(await request({origin:'https://other.example'}),403);
  assert.equal(await request({'x-forwarded-proto':'http'}),403);
  assert.equal(await request({'sec-fetch-site':'cross-site'}),403);
  assert.equal(forwarded,0);
  assert.equal(await request(),200);
  assert.equal(forwarded,1);
  assert.equal(headers.host,'127.0.0.1:'+inner.address().port);
  assert.equal(headers.origin,'http://127.0.0.1:'+inner.address().port);
  assert.equal(headers['x-slate-review-csrf'],'slate-token');
  assert.equal(headers['x-gravuru-csrf'],'editor-token');
  assert.equal(headers.authorization,undefined);
  assert.equal(headers['x-untrusted'],undefined);
});

test('review mode requires separated private paths and remains optional',()=>{
  const root=path.join(os.tmpdir(),'slate-config-paths');
  const env={GRAVURU_TEST_ORIGIN:'https://slate.example',GRAVURU_PRIVATE_DATA_DIR:path.join(root,'data'),GRAVURU_TEST_PYTHON_DIR:path.join(root,'python')};
  assert.equal(testConfig(env,{credentials:false}).slateReviewPackage,undefined);
  assert.equal(testConfig({...env,GRAVURU_SLATE_REVIEW_PACKAGE:path.join(root,'gallery')},{credentials:false}).slateReviewPackage,path.join(root,'gallery'));
  for(const candidate of [env.GRAVURU_PRIVATE_DATA_DIR,path.join(root,'data','nested'),root,''])assert.throws(()=>testConfig({...env,GRAVURU_SLATE_REVIEW_PACKAGE:candidate},{credentials:false}));
});

test('mapping preserves local IDs while rejecting mismatched, duplicate or published designs',()=>{
  const row={key:'slate',productId:'cfg_package-id',reviewOnly:true,designIds:['D1']};
  const pack={schema:'gravuru-slate-original-review/v1',reviewOnly:true,released:false,originals:[{id:'D1'}],products:[row]};
  const imported={localOnly:true,published:false,shopifyWrites:0,products:[{...row,productId:'cfg_actual-user-id',revision:4}]};
  assert.deepEqual(validateSlateReviewMapping(pack,imported),{originals:1,products:1});
  assert.throws(()=>validateSlateReviewMapping(pack,{...imported,published:true}));
  assert.throws(()=>validateSlateReviewMapping(pack,{...imported,products:[{...row,designIds:['OTHER']}]}));
  assert.throws(()=>validateSlateReviewMapping({...pack,products:[row,row]},{...imported,products:[row,row]}));
});

test('protected gallery saves and reads comments through its own CSRF contract',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'slate-private-comments-'));
  const config={origin:'https://slate.example',host:'slate.example',username:'synthetic',password:'synthetic-password-for-test'};
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({originals:[{id:'D1',group:'Hunde',subcategory:'Allgemein',process:'Gravur',targets:[]}]}));
  fs.writeFileSync(path.join(root,'local-review-import.json'),JSON.stringify({products:[]}));
  const gallery=createSlateGalleryHandler(root,path.join(root,'local-review-import.json'),{csrfToken:'stable-review-token'});
  const inner=http.createServer((req,res)=>{if(!gallery(req,res))res.writeHead(404).end();});
  inner.listen(0,'127.0.0.1');await once(inner,'listening');
  const proxy=createPrivateTestProxy(config,inner);proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  t.after(async()=>{
    await Promise.all([new Promise(resolve=>proxy.close(resolve)),new Promise(resolve=>inner.close(resolve))]);
    gallery.close();fs.rmSync(root,{recursive:true,force:true});
  });
  const request=(method,token)=>new Promise((resolve,reject)=>{
    const body=JSON.stringify({designId:'D1',text:'Text bitte weiter nach links',expectedRevision:0});
    const req=http.request({host:'127.0.0.1',port:proxy.address().port,path:'/originale/comments',method,headers:{host:config.host,'x-forwarded-proto':'https',origin:config.origin,authorization:'Basic '+Buffer.from(config.username+':'+config.password).toString('base64'),'x-slate-review-csrf':token,'content-type':'application/json'}},res=>{let data='';res.on('data',part=>data+=part);res.once('end',()=>resolve({status:res.statusCode,data:JSON.parse(data)}));});
    req.on('error',reject);req.end(method==='POST'?body:undefined);
  });
  assert.equal((await request('POST','wrong-token')).status,403);
  const saved=await request('POST','stable-review-token');
  assert.equal(saved.status,200);assert.equal(saved.data.comment.revision,1);
  const read=await request('GET','stable-review-token');
  assert.equal(read.status,200);assert.equal(read.data.comments.D1.text,'Text bitte weiter nach links');
  assert.equal((await request('POST','stable-review-token')).status,409);
});

test('approval endpoint and script retain private proxy authentication, origin and CSRF protection',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'slate-private-approvals-'));
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({originals:[{id:'D1',group:'Hunde',subcategory:'Allgemein',process:'Gravur',targets:[]}]}));
  fs.writeFileSync(path.join(root,'local-review-import.json'),JSON.stringify({products:[]}));
  const token='stable-approval-test-token';
  const gallery=createSlateGalleryHandler(root,path.join(root,'local-review-import.json'),{csrfToken:token});
  const inner=http.createServer((req,res)=>{if(!gallery(req,res))res.writeHead(404).end();});
  inner.listen(0,'127.0.0.1');await once(inner,'listening');
  const config={origin:'https://slate.example',host:'slate.example',username:'synthetic',password:'synthetic-password-for-test'};
  const proxy=createPrivateTestProxy(config,inner);proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  t.after(async()=>{
    proxy.closeAllConnections();inner.closeAllConnections();
    await Promise.all([new Promise(resolve=>proxy.close(resolve)),new Promise(resolve=>inner.close(resolve))]);
    gallery.close();fs.rmSync(root,{recursive:true,force:true});
  });
  const authorization='Basic '+Buffer.from(config.username+':'+config.password).toString('base64');
  const request=(route,{method='GET',body,headers={}}={})=>new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port:proxy.address().port,path:route,method,agent:false,
      headers:{host:config.host,'x-forwarded-proto':'https',origin:config.origin,authorization,'x-slate-review-csrf':token,'content-type':'application/json',...headers}},res=>{
        let text='';res.on('data',chunk=>text+=chunk);res.once('end',()=>resolve({status:res.statusCode,text,type:res.headers['content-type']||'',data:res.headers['content-type']?.includes('application/json')?JSON.parse(text):null}));
      });
    req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
  });
  for(const route of ['/originale/approvals','/originale/approvals.js'])assert.equal((await request(route,{headers:{authorization:''}})).status,401);
  const initial=await request('/originale/approvals');assert.equal(initial.status,200);assert.equal(typeof initial.data.overviewHtml,'string');
  const [key]=Object.keys(initial.data.approvals),state=initial.data.approvals[key];
  assert.equal(state.status,'unavailable');assert.equal(state.revision,0);
  const script=await request('/originale/approvals.js');assert.equal(script.status,200);assert.match(script.type,/javascript/);assert.ok(script.text.length>0);
  const body={key,approved:false,expectedRevision:0,expectedFingerprint:null};
  assert.equal((await request('/originale/approvals',{method:'POST',body,headers:{authorization:''}})).status,401);
  assert.equal((await request('/originale/approvals',{method:'POST',body,headers:{'x-slate-review-csrf':''}})).status,403);
  assert.equal((await request('/originale/approvals',{method:'POST',body,headers:{origin:'https://foreign.example'}})).status,403);
  assert.equal((await request('/originale/approvals',{method:'POST',body,headers:{host:'foreign.example'}})).status,403);
  assert.equal((await request('/originale/approvals',{method:'POST',body,headers:{'x-forwarded-proto':'http'}})).status,403);
  assert.equal((await request('/originale/approvals',{method:'POST',body,headers:{'sec-fetch-site':'cross-site'}})).status,403);
  assert.equal((await request('/originale/approvals',{headers:{origin:'https://foreign.example'}})).status,403);
  assert.equal((await request('/originale/approvals',{method:'POST',body:{...body,key:'unknown-target'}})).status,404);
  assert.equal((await request('/originale/approvals',{method:'POST',body:{...body,approved:true}})).status,422);
  assert.equal((await request('/originale/approvals',{method:'POST',body:{...body,expectedRevision:1}})).status,409);
  assert.equal((await request('/originale/approvals',{method:'POST',body:{...body,unexpected:true}})).status,422);
  assert.equal((await request('/originale/approvals',{method:'POST',body:{...body,padding:'x'.repeat(18000)}})).status,413);
  const unchanged=await request('/originale/approvals',{method:'POST',body});assert.equal(unchanged.status,200);
  assert.deepEqual(unchanged.data.approvals,initial.data.approvals,'protected invalid requests and false/no-op do not create approval events');
  for(const route of ['/review-approvals.sqlite','/originale/files/review-approvals.sqlite']){
    const denied=await request(route);assert.equal(denied.status,404);assert.equal(denied.text,'');
  }
});
