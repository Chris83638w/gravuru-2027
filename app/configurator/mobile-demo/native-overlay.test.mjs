import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {once} from 'node:events';
import {collectModules,transformModule,BUNDLE_ENTRIES} from '../variant-m/bundle-build.mjs';
import {createPreviewServer} from '../variant-m/server.mjs';
import {isPrioPresentationAsset} from './assets.mjs';

const app=new URL('../../',import.meta.url);
const read=url=>fs.readFileSync(new URL('.'+url,app),'utf8');
const entry='/configurator/mobile-demo/shop-shell.mjs';
const presentation=collectModules([entry],{read});

test('R15 remains an optional separate presentation graph with the same hosted source fallback',()=>{
 const native=collectModules(BUNDLE_ENTRIES,{read});
 assert.equal(native.modules.has(entry),false);
 const index=new Map(native.order.map((url,i)=>[url,i]));
 for(const url of native.order){
  const transformed=transformModule(url,native.modules.get(url).source,index);
  if(url.endsWith('/ux.mjs'))assert.match(transformed.code,/gravuruModules\.import\('\/configurator\/mobile-demo\/shop-shell\.mjs'\)/);
 }
 assert.ok(presentation.modules.size>13);
 assert.ok(presentation.modules.has('/configurator/mobile-demo/compact-controls.mjs'),'the real shop-shell import graph includes compact controls');
 for(const url of presentation.order){
  assert.ok(!url.includes('gallery-workbench')&&!url.includes('browser-model-resources'),url);
  if(url.startsWith('/configurator/mobile-demo/'))assert.equal(isPrioPresentationAsset(url),true,url);
 }
});

test('actual hosted allowlist serves every presentation dependency, with writes and private files still blocked',async()=>{
 const config={mode:'embedded-test',origin:'https://workshop.example',shopDomain:'fixture.myshopify.com',clientId:'fixture-client'};
 const workshop={sessionContext:{mode:'test-only',shopDomain:config.shopDomain,clientId:config.clientId}};
 const server=createPreviewServer({workshop,embeddedApp:config});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const request=(url,{method='GET',headers={}}={})=>new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:url,method,headers:{host:'workshop.example',...headers}},res=>{
   const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });req.on('error',reject);req.end();
 });
 try{
  for(const url of [...presentation.order,'/configurator/mobile-demo/demo.css','/configurator/mobile-demo/shopping-cart.svg']){
   const result=await request(url);assert.equal(result.status,200,url);
   assert.equal(result.headers['cache-control'],'no-store',url);
   assert.ok(result.body.length>0,url);
  }
  for(const name of ['assets.mjs','native-overlay.test.mjs','demo.test.mjs','missing.svg','%2e%2e%2fvariant-m/server.mjs'])assert.equal((await request('/configurator/mobile-demo/'+name)).status,404,name);
  assert.equal((await request(entry,{method:'POST'})).status,405);
  assert.equal((await request(entry,{headers:{origin:'https://foreign.example'}})).status,403);
  assert.equal((await request(entry,{headers:{host:'foreign.example'}})).status,403);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
