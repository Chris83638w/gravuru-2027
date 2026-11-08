// Local operational proof only. Real immutable r4 artwork, synthetic registry,
// session secret and approval. No Shopify calls, live DB, browser or UI edits.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {registerHooks} from 'node:module';

const here=fileURLToPath(import.meta.url),root=path.resolve(path.dirname(here),'../..');
const source=process.env.GRAVURU_PUBLIC_PREVIEW_SOURCE||path.resolve(root,'../../outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
if(!process.env.GRAVURU_PROOF_PHASE){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-http-bank-proof-'));
 try{
  const reports=['prepare','restart'].map(phase=>{
   const result=spawnSync(process.execPath,[here],{cwd:root,env:{...process.env,GRAVURU_PROOF_PHASE:phase,GRAVURU_PROOF_CACHE:directory},encoding:'utf8',maxBuffer:4*1024*1024});
   if(result.status!==0)throw Error(phase+' failed: '+result.stderr+'\n'+result.stdout);
   return JSON.parse(result.stdout);
  });
  assert.deepEqual(reports[0].publicUrls,reports[1].publicUrls);
  assert.deepEqual(reports[0].cacheFiles,reports[1].cacheFiles);
  assert.equal(reports[0].renderCalls,3);assert.equal(reports[1].renderCalls,0);
  const report={schema:'gravuru-local-public-preview-http-proof/v1',integrationCommit:'f4c370fcc6bfdd388f63f14ea339046ea1103aca',live:false,registry:'synthetic',artwork:'real immutable local r4',processRestart:true,productionFilesChanged:0,phases:reports};
  const text=JSON.stringify(report,null,2)+'\n';
  if(process.env.GRAVURU_PROOF_REPORT)fs.writeFileSync(process.env.GRAVURU_PROOF_REPORT,text);
  process.stdout.write(text);
 }finally{
  const resolved=path.resolve(directory);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('gravuru-http-bank-proof-'));
  fs.rmSync(resolved,{recursive:true,force:true});
 }
}else{
 const phase=process.env.GRAVURU_PROOF_PHASE,directory=process.env.GRAVURU_PROOF_CACHE;
 // Instrument only the loaded function entry. Source files and renderer bytes
 // used for cache identity stay untouched; the production body is unchanged.
 globalThis.__gravuruProofRenders=0;let instrumented=0;
 const hooks=registerHooks({load(url,context,next){const loaded=next(url,context);if(url.endsWith('/app/workshop/product-preview.mjs')){
  const text=Buffer.isBuffer(loaded.source)?loaded.source.toString():String(loaded.source),anchor=/(export function productPreview[^\r\n]*\{\r?\n)/;
  assert.match(text,anchor);instrumented++;
  return {...loaded,source:text.replace(anchor,'$1 globalThis.__gravuruProofRenders++;\n')};
 }return loaded;}});
 const [{createShopEntry},{appProxySignature},{createModelSlimmer},{shopGalleryModel},{familyFormatCombinations},{quote,selectedProfile}]=await Promise.all([
  import('../../app/workshop/shop-entry.mjs'),import('../../app/workshop/shopify-app-proxy.mjs'),import('../../app/workshop/shop-model-slim.mjs'),import('../../app/workshop/shop-gallery-model.mjs'),import('../../app/configurator/variant-m/family-formats.mjs'),import('../../app/configurator/variant-m/contract.mjs')]);
 assert.equal(instrumented,1);
 const raw=fs.readFileSync(source);assert.equal(sha(raw),'2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0');
 const doc=JSON.parse(raw),sourceBefore=JSON.stringify(doc),config=doc.config;
 const origin='https://app.example',shopDomain='synthetic.myshopify.com',secret='synthetic-http-bank-proof-only',proxyPath='/apps/konfigurator';
 const ids={shopifyProductId:'gid://shopify/Product/16190784438652',shopifyVariantId:'gid://shopify/ProductVariant/58104606556540'};
 const options={size:config.familyFormats.defaultSize,mounting:'K00'},profile=selectedProfile(config,options);
 const binding={...ids,storeId:'acryl',tenantId:'synthetic-http-bank-proof',shopDomain,productId:'cfg_00000001-0000-4000-8000-000000000000',productRevision:4,bindingId:'binding_00000002-0000-4000-8000-000000000000',assignmentRevision:1,options,unitCents:quote(config,[],profile.defaultDesignId,options).unitCents};
 const record={id:binding.productId,revision:4,status:'draft',document:doc};
 const model={key:'acryl',name:doc.name,configuration:{id:binding.productId,revision:4},galleryCategoryIds:doc.categoryIds,universal:config};
 let modelReads=0,approvalReads=0;const noWrites=()=>{throw Error('No write endpoint is allowed in this local proof');};
 const resolve=input=>{assert.equal(input.shopifyProductId,ids.shopifyProductId);assert.equal(input.shopifyVariantId,ids.shopifyVariantId);return structuredClone(binding);};
 const workshop={tenantId:binding.tenantId,sessionContext:{shopDomain},
  model:(id,revision)=>{assert.equal(id,binding.productId);assert.equal(revision,4);modelReads++;return structuredClone(model);},
  galleryModel:(id,revision)=>{assert.equal(id,binding.productId);assert.equal(revision,4);return shopGalleryModel(record);},
  repository:{get:(id,args)=>{assert.equal(id,binding.productId);assert.equal(args?.revision,4);return record;}},assets:{read:()=>{throw Error('No private asset read expected');}},konfis:{paused:()=>false},
  customerDrafts:{acrylicDrafts:{get:noWrites,create:noWrites,save:noWrites},review:noWrites,cartConfigurations:{forDraft:()=>null}},
  orderIntake:{bindings:()=>[],catalogLiveApproval:input=>{approvalReads++;assert.equal(input.shopDomain,shopDomain);assert.equal(input.productId,binding.productId);assert.equal(input.productRevision,4);assert.equal(input.shopifyProductId,ids.shopifyProductId);assert.equal(input.shopifyVariantId,ids.shopifyVariantId);return {id:'synthetic-approval'};}}};
 const store={storeId:'acryl',workshop,registry:{resolve,listActive:()=>[structuredClone(binding)]},catalogLiveOrders:true,nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html',apiPrefix:'/api/workshop/acryl/',cart:noWrites};
 const events=[],entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,publicPreviewDirectory:directory,modelSlimmer:createModelSlimmer({fontUrl:hash=>'/konfigurator/shop/schriften/'+hash+'.json'}),logger:e=>events.push(e),limits:{requestsPerMinute:1000,startPerMinute:1000}});
 const server=http.createServer((req,res)=>{const url=new URL(req.url,origin);if(!entry.matches(url.pathname)){res.writeHead(404).end();return;}entry.handle(req,res,url);});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const request=(route,method='GET',data,extra={})=>new Promise((resolve,reject)=>{
  const bytes=data===undefined?null:Buffer.from(JSON.stringify(data)),started=performance.now();
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:route,method,headers:{Host:'app.example','X-Forwarded-Proto':'https',...(method==='GET'||method==='HEAD'?{}:{Origin:origin,'Content-Type':'application/json'}),...(bytes?{'Content-Length':bytes.length}:{}),...extra}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const body=Buffer.concat(chunks);let json;try{json=JSON.parse(body);}catch{}resolve({status:res.statusCode,headers:res.headers,body,json,ms:performance.now()-started});});
  });req.on('error',reject);req.end(bytes);
 });
 function start(){const query=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'',product:'16190784438652',variant:'58104606556540',ui:'prio-r15',format:'json'});query.set('signature',appProxySignature(query,secret));return request(proxyPath+'/start?'+query);}
 const snapshot=()=>fs.readdirSync(directory).filter(n=>n.endsWith('.json')).sort().map(name=>({name,bytes:fs.statSync(path.join(directory,name)).size,sha256:sha(fs.readFileSync(path.join(directory,name)))}));
 try{
  const before=await start();assert.equal(before.status,200,before.body.toString());assert.equal(globalThis.__gravuruProofRenders,0);
  if(phase==='prepare'){assert.deepEqual(before.json.warm.manifest.previews,undefined);assert.equal(snapshot().length,0);}else assert.equal(before.json.warm.manifest.previews.length,3);
  const started=performance.now(),prepared=await entry.preparePublicDesignPreviews(ids),prepareMs=performance.now()-started;
  assert.equal(prepared.prepared,3);assert.equal(prepared.items.every(x=>x.cached),phase==='restart');assert.equal(globalThis.__gravuruProofRenders,phase==='prepare'?3:0);
  const after=await start();assert.equal(after.status,200,after.body.toString());const urls=prepared.items.map(x=>x.url);assert.deepEqual(after.json.warm.manifest.previews,urls);
  const token=new URLSearchParams(new URL(after.json.url).hash.slice(1)).get('s');assert.ok(token);
  const gallery=await request('/api/shop-entry/design-gallery','GET',undefined,{'X-Gravuru-Shop-Session':token});assert.equal(gallery.status,200,gallery.body.toString());assert.deepEqual(gallery.json.items.slice(0,3).map(x=>x.previewUrl),urls);assert.ok(gallery.json.items.length>3);assert.equal(gallery.json.items[3].previewUrl,undefined);
  const images=[];for(const url of urls){const image=await request(url);assert.equal(image.status,200,image.body.toString());assert.match(image.headers['cache-control'],/public.*immutable/);images.push({url,status:image.status,bytes:image.body.length,sha256:sha(image.body),ms:image.ms,contentType:image.headers['content-type'],cacheControl:image.headers['cache-control']});}
  const head=await request(urls[0],'HEAD');assert.equal(head.status,200);assert.equal(head.body.length,0);
  assert.equal(globalThis.__gravuruProofRenders,phase==='prepare'?3:0);assert.equal(snapshot().length,3);assert.equal(JSON.stringify(doc),sourceBefore);
  const cacheFiles=snapshot();assert.ok(cacheFiles.reduce((n,f)=>n+f.bytes,0)<64*1024*1024);assert.ok(images.reduce((n,f)=>n+f.bytes,0)<6*1024*1024);
  process.stdout.write(JSON.stringify({phase,sourceSha256:sha(raw),sourceBytes:raw.length,designs:config.familyFormats.designs.length,sizes:config.familyFormats.formats.length,variants:familyFormatCombinations(config).length,selectedOptions:options,syntheticBindingBaseCents:binding.unitCents,warmBeforeCount:before.json.warm.manifest.previews?.length||0,warmAfterCount:after.json.warm.manifest.previews.length,startBeforeMs:before.ms,startAfterMs:after.ms,prepareMs,preparedFromDisk:prepared.items.every(x=>x.cached),galleryMs:gallery.ms,galleryCards:gallery.json.items.length,gallerySameUrls:true,renderCalls:globalThis.__gravuruProofRenders,modelReads,approvalReads,manifest:after.json.warm.manifest,manifestBytes:Buffer.byteLength(JSON.stringify(after.json.warm.manifest)),publicUrls:urls,images,previewDecodedBytes:images.reduce((n,f)=>n+f.bytes,0),cacheFiles,cacheBytes:cacheFiles.reduce((n,f)=>n+f.bytes,0),requestForms:{shopProxy:'/apps/konfigurator/start?product=16190784438652&variant=58104606556540&ui=prio-r15&format=json',backendProxy:'same route plus Shopify-signed shop/path_prefix/timestamp/signature; values omitted',warmIframe:after.json.warm.url,gallery:'/api/shop-entry/design-gallery (existing session header; omitted)',publicImage:urls[0]}})+'\n');
 }finally{server.closeAllConnections();await new Promise(done=>server.close(done));hooks.deregister();}
}
