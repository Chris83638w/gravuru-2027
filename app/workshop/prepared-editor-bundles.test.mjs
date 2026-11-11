import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {gunzipSync} from 'node:zlib';
import {createPreparedEditorBundles} from './prepared-editor-bundles.mjs';
import {acrylAssetText,acrylRoute} from './acryl-employee-host.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {buildEditorBundle} from '../configurator/variant-m/bundle-build.mjs';

const NAME='editor-0123456789abcdef.mjs',URL='/_bundle/'+NAME;
const source='export default ["/configurator/variant-m/ux.mjs","/platform/sources/app/shared/x.mjs","/_runtime/lazy/a.json","/_bundle/editor-0123456789abcdef.mjs"];';
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-prepared-bundle-'));fs.mkdirSync(path.join(dir,'bundle'));fs.writeFileSync(path.join(dir,'bundle',NAME),source);fs.writeFileSync(path.join(dir,'editor.html'),'<head><link rel="modulepreload" href="'+URL+'"></head>');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function reply(handle,{pathname=URL,method='GET',headers={}}={}){const out={headers:{}};out.handled=handle({method,headers},{writeHead(status,h){out.status=status;out.headers=h;},end(body){out.body=body;}},pathname);return out;}

test('active preload is prepared once; identity and gzip preserve the complete Acryl rewrite',async t=>{
 const dir=fixture(t);let calls=0,auth=0;
 fs.writeFileSync(path.join(dir,'bundle',NAME+'.gz'),'old native gzip must not be used');
 const handle=createPreparedEditorBundles({outputDirectory:dir,transform:(...args)=>{calls++;return acrylAssetText(...args);},authorize:()=>{auth++;return true;}});
 assert.equal(calls,1);const plain=reply(handle),zipped=reply(handle,{headers:{'accept-encoding':'gzip, deflate, br'}});
 assert.equal(calls,1);assert.equal(auth,2);assert.equal(plain.body.toString(),acrylAssetText(source));assert.ok(gunzipSync(zipped.body).equals(plain.body));
 assert.equal(zipped.headers['Content-Encoding'],'gzip');assert.equal(zipped.headers['Content-Length'],zipped.body.length);assert.equal(zipped.headers.Vary,'Accept-Encoding');
 assert.equal(zipped.headers['Cache-Control'],'public, max-age=31536000, immutable');assert.equal(zipped.headers['Access-Control-Allow-Origin'],undefined);
 const module=await import('data:text/javascript;base64,'+plain.body.toString('base64'));assert.equal(module.default[0],'/acryl-configurator/variant-m/ux.mjs');
});

test('HEAD, forbidden encodings and explicit gzip exclusions are respected',t=>{
 const handle=createPreparedEditorBundles({outputDirectory:fixture(t),transform:acrylAssetText,authorize:()=>true});
 const get=reply(handle,{headers:{'accept-encoding':'gzip'}}),head=reply(handle,{method:'HEAD',headers:{'accept-encoding':'gzip'}});
 assert.deepEqual(head.headers,get.headers);assert.equal(head.body,undefined);
 const identity=reply(handle,{headers:{'accept-encoding':'gzip;q=0, *;q=1'}});assert.equal(identity.headers['Content-Encoding'],undefined);
 assert.equal(reply(handle,{headers:{'accept-encoding':'gzip;q=0, identity;q=0'}}).status,406);
 assert.equal(reply(handle,{headers:{'accept-encoding':'identity;q=0, gzip;q=0.5'}}).headers['Content-Encoding'],'gzip');
});

test('authorization runs on warm hits and neither invalid paths nor private data are handled',t=>{
 let allowed=true;const handle=createPreparedEditorBundles({outputDirectory:fixture(t),transform:acrylAssetText,authorize:()=>allowed});
 assert.equal(reply(handle).status,200);allowed=false;assert.equal(reply(handle).status,403);allowed=true;assert.equal(reply(handle,{method:'POST'}).status,405);
 for(const pathname of ['/models.json','/api/workshop/customer-drafts','/konfigurator/shop/vorschauen/abcdef.svg','/_merchant-editor.html','/_bundle/editor.mjs','/_bundle/'+NAME+'.gz','/_bundle/../secret.mjs','/_bundle/%2e%2e/secret.mjs','/_bundle/editor-0123456789abcdeg.mjs'])assert.equal(reply(handle,{pathname}).handled,false,pathname);
 assert.equal(reply(handle,{pathname:'/_bundle/editor-ffffffffffffffff.mjs'}).handled,false);
});

test('historical chunks remain on demand; changed and removed artifacts do not reuse stale bytes',t=>{
 const dir=fixture(t);let count=0;const make=()=>createPreparedEditorBundles({outputDirectory:dir,transform:(...args)=>{count++;return acrylAssetText(...args);},authorize:()=>true});
 const handle=make(),old='editor-ffffffffffffffff.mjs';fs.writeFileSync(path.join(dir,'bundle',old),'export const old=true;');
 assert.equal(reply(handle,{pathname:'/_bundle/'+old}).body.toString(),'export const old=true;');assert.equal(count,2);
 fs.writeFileSync(path.join(dir,'bundle',NAME),source+'\nexport const updated=true;');const changed=reply(handle);assert.match(changed.body.toString(),/updated=true/);assert.equal(count,3);
 assert.ok(reply(make()).body.equals(changed.body));fs.unlinkSync(path.join(dir,'bundle',NAME));assert.equal(reply(handle).handled,false);
});

test('bounded cache evicts older prepared chunks and oversized sources keep the original fallback',t=>{
 const dir=fixture(t),names=['editor-1111111111111111.mjs','editor-2222222222222222.mjs'];
 fs.writeFileSync(path.join(dir,'editor.html'),'<head></head>');
 for(const name of names)fs.writeFileSync(path.join(dir,'bundle',name),'//'+name+'\n'+' '.repeat(17*1024*1024));
 let calls=0;const handle=createPreparedEditorBundles({outputDirectory:dir,transform:s=>{calls++;return s;},authorize:()=>true});
 for(const name of [...names,names[0]])assert.equal(reply(handle,{pathname:'/_bundle/'+name,method:'HEAD'}).status,200);
 assert.equal(calls,3,'two 17MiB entries cannot remain together in the 32MiB cache');
 const huge=path.join(dir,'bundle',NAME);fs.truncateSync(huge,20*1024*1024+1);assert.equal(reply(handle).handled,false);assert.equal(calls,3);
});

test('preparation errors leave the existing route available, never a partial gzip response',t=>{
 const handle=createPreparedEditorBundles({outputDirectory:fixture(t),transform:()=>{throw Error('preparation failed');},authorize:()=>true});
 const result=reply(handle,{headers:{'accept-encoding':'gzip'}});assert.equal(result.handled,false);assert.equal(result.status,undefined);assert.equal(result.body,undefined);
});

test('real generated core remains a valid ESM with identical rewritten module graph',async t=>{
 const dir=fixture(t),built=buildEditorBundle(dir,{keepExisting:true});fs.writeFileSync(path.join(dir,'editor.html'),'<head><link rel="modulepreload" href="'+built.url+'"></head>');
 const original=fs.readFileSync(built.file,'utf8'),handle=createPreparedEditorBundles({outputDirectory:dir,transform:acrylAssetText,authorize:()=>true});
 const response=reply(handle,{pathname:built.url,headers:{'accept-encoding':'gzip'}}),bytes=gunzipSync(response.body);
 assert.equal(bytes.toString(),acrylAssetText(original,built.url));const module=await import('data:text/javascript;base64,'+bytes.toString('base64'));
 assert.equal(module.default.urls.length,built.modules.length);for(const name of ['profile-selection','preview-resource','adapter','lazy-resources','ux'])assert.equal(module.default.has('/acryl-configurator/variant-m/'+name+'.mjs'),true);
});

async function get(port,pathname,headers={},method='GET'){
 return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:pathname,method,headers},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();});
}
test('actual embedded-host authorization and security headers remain on prepared HTTP responses',async t=>{
 const dir=fixture(t),domain='gravuru-test.myshopify.com',origin='https://konfi.example.test',clientId='testclient';
 const native=createPreviewServer({outputDirectory:dir,workshop:{sessionContext:{mode:'test-only',shopDomain:domain,clientId}},embeddedApp:{mode:'embedded-test',origin,shopDomain:domain,clientId}});
 const prepared=native.prepareBundleDelivery(acrylAssetText);let fallback=0;
 const outer=http.createServer((req,res)=>{const target=acrylRoute(new globalThis.URL(req.url,origin).pathname);if(prepared(req,res,target||''))return;fallback++;res.writeHead(418,{'Cache-Control':'private, no-store'}).end();});
 t.after(()=>{outer.close();outer.closeAllConnections();});outer.listen(0,'127.0.0.1');await once(outer,'listening');const port=outer.address().port,p='/_acryl-bundle/'+NAME;
 const h={host:'konfi.example.test',origin,'sec-fetch-site':'same-origin','accept-encoding':'gzip'};
 const good=await get(port,p,h);assert.equal(good.status,200);assert.equal(gunzipSync(good.body).toString(),acrylAssetText(source));
 assert.match(good.headers['content-security-policy'],/frame-ancestors https:\/\/gravuru-test.myshopify.com/);assert.equal(good.headers['referrer-policy'],'no-referrer');assert.equal(good.headers['x-content-type-options'],'nosniff');assert.equal(good.headers['access-control-allow-origin'],undefined);
 const cases=[{...h,host:'other.test'},{...h,origin:'https://other.test'},{...h,'sec-fetch-site':'cross-site'}];
 for(const bad of cases){const r=await get(port,p,bad);assert.equal(r.status,403);assert.equal(r.headers['cache-control'],'no-store');}
 assert.equal((await get(port,p,h,'HEAD')).body.length,0);assert.equal((await get(port,p,h,'OPTIONS')).status,405);assert.equal(fallback,0);
 assert.equal((await get(port,'/api/workshop/acryl/customer-drafts',h)).status,418);assert.equal((await get(port,'/konfigurator/shop/vorschauen/abcdef.svg',h)).status,418);assert.equal(fallback,2);
});
