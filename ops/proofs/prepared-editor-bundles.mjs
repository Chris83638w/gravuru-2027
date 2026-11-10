// Local loopback comparison only. The argument is an already generated PUBLIC core.
// No server connection, product/DB access or repository resource mutation.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import http from 'node:http';import {once} from 'node:events';import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {acrylAssetText} from '../../app/workshop/acryl-employee-host.mjs';

const input=process.argv[2];if(!input||!/^editor-[a-f0-9]{16}\.mjs$/.test(path.basename(input)))throw Error('Expected a generated public editor-[hash].mjs file.');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-bundle-timing-')),name=path.basename(input),target='/_bundle/'+name;
const digest=b=>createHash('sha256').update(b).digest('hex');let native,outer;
function request(port,url,headers){return new Promise((resolve,reject)=>{const start=performance.now();http.get({host:'127.0.0.1',port,path:url,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks),ms:performance.now()-start}));}).on('error',reject);});}
try{
 fs.mkdirSync(path.join(temporary,'bundle'));fs.copyFileSync(input,path.join(temporary,'bundle',name));fs.writeFileSync(path.join(temporary,'editor.html'),'<head><link rel="modulepreload" href="'+target+'"></head>');
 const expected=Buffer.from(acrylAssetText(fs.readFileSync(input,'utf8'),target));
 const shopDomain='gravuru-test.myshopify.com',clientId='localtest',host='konfi.example.test';
 native=createPreviewServer({outputDirectory:temporary,workshop:{sessionContext:{mode:'test-only',shopDomain,clientId}},embeddedApp:{mode:'embedded-test',origin:'https://'+host,shopDomain,clientId}});
 native.listen(0,'127.0.0.1');await once(native,'listening');
 const start=performance.now(),prepared=native.prepareBundleDelivery(acrylAssetText),prepareMs=performance.now()-start;
 outer=http.createServer((req,res)=>{
  if(req.url==='/prepared'){prepared(req,res,target);return;}
  const upstream=http.get({host:'127.0.0.1',port:native.address().port,path:target,headers:{host}},response=>{
   const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>{const body=Buffer.from(acrylAssetText(Buffer.concat(chunks).toString('utf8'),target));res.writeHead(response.statusCode,{'Content-Type':'text/javascript','Content-Length':body.length});res.end(body);});
  });upstream.on('error',error=>res.destroy(error));
 });outer.listen(0,'127.0.0.1');await once(outer,'listening');
 const old=[],fresh=[];let transmitted=0;
 for(let i=0;i<12;i++)for(const mode of ['original','prepared']){
  const result=await request(outer.address().port,'/'+mode,{host,'accept-encoding':'gzip'});
  const bytes=result.headers['content-encoding']==='gzip'?gunzipSync(result.body):result.body;
  if(result.status!==200||!bytes.equals(expected))throw Error('Byte comparison failed.');
  (mode==='original'?old:fresh).push(result.ms);if(mode==='prepared')transmitted=result.body.length;
 }
 const stats=values=>({minMs:Math.min(...values),medianMs:[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)],maxMs:Math.max(...values),samples:values.length});
 console.log(JSON.stringify({scope:'local-loopback-real-public-core',core:name,sourceSha256:digest(fs.readFileSync(input)),rewrittenSha256:digest(expected),identityBytes:expected.length,preparedGzipBytes:transmitted,prepareMs,oldRawLoopbackAndRewrite:stats(old),preparedGzip:stats(fresh),limits:'Local Node HTTP only, no LiteSpeed or external network. Original route is identity at Node; LiteSpeed compression is not simulated. No prediction of customer transfer time.'},null,2));
}finally{for(const server of [outer,native])if(server){await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}fs.rmSync(temporary,{recursive:true,force:true});}
