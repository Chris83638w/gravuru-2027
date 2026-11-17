// Local, synthetic four-request benchmark. No Shopify traffic or real orders.
// node scripts/measure-shop-cart-timing.mjs [repository-root] [measured-runs] [real-registry]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {execFileSync} from 'node:child_process';

const root=path.resolve(process.argv[2]||'.'),runs=Number(process.argv[3]||7);
const realRegistry=process.argv[4]==='real-registry';
const largeDocument=process.argv.includes('large-document')||process.argv.includes('large-blobs');
const largeBlobs=process.argv.includes('large-blobs');
const concurrency=process.argv.includes('two-customers')?2:1;
assert.ok(Number.isSafeInteger(runs)&&runs>=1&&runs<=100);
const load=file=>import(pathToFileURL(path.join(root,file)).href);
const {build}=await load('app/configurator/variant-m/build.mjs');
const {createWorkshop}=await load('app/workshop/http.mjs');
const {createShopEntry}=await load('app/workshop/shop-entry.mjs');
const {prepareShopProduct}=await load('app/workshop/shop-preparation.mjs');
const {appProxySignature}=await load('app/workshop/shopify-app-proxy.mjs');
const {createShopifyCheckoutImages}=await load('app/workshop/shopify-checkout-image.mjs');
const origin='https://app.example',shopDomain='gravuru-design.myshopify.com',secret='synthetic-timing-secret-only',proxyPath='/apps/konfigurator';
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
const webp='UklGRmoAAABXRUJQVlA4WAoAAAAQAAAAJwAAOwAAQUxQSBMAAAABDzD/ERFCLJj4Sy+Fzoj+p04BAFZQOCAwAAAAMAMAnQEqKAA8AD4xGItEIiGhEVQAIAMEtIAACtIj6x5ssAD+9vnv6tJpEgAAAAAA';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-cart-timing-'));
let workshop,server,log;
try{
 build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 workshop=createWorkshop({filename:realRegistry?path.join(dir,'workshop.sqlite'):':memory:',seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:{mode:'test-only',shopDomain,clientId:'synthetic-client',secret}});
 let record=workshop.repository.copy(workshop.defaultId,{expectedRevision:1,name:'Synthetic timing fixture',kind:'product'});
 if(largeDocument){
  // The live node distribution is unknown. These two explicit stress shapes
  // are inert configuration data, not additional selectable customer designs.
  const document=structuredClone(record.document),items=[];
  document.config.measurementFixture={kind:largeBlobs?'eight-large-strings':'many-vector-resource-trees',items};
  const template={bounds:[0,0,100,100],glyphs:{A:{a:500,d:'M0 0 L100 0 L100 100 Z '.repeat(50)},B:{a:300,d:'M1 1 L2 2 Z '.repeat(50)}}},targetBytes=31_205_183;
  let bytes=Buffer.byteLength(JSON.stringify(document));
  if(largeBlobs){const size=Math.ceil((targetBytes-bytes)/8);for(let i=0;i<8;i++)items.push('0123456789abcdef'.repeat(Math.ceil(size/16)).slice(0,size));}
  else while(bytes<targetBytes){const d={...structuredClone(template),id:'stress-design-'+String(items.length).padStart(6,'0')};items.push(d);bytes+=Buffer.byteLength(JSON.stringify(d))+1;}
  record=workshop.repository.save(record.id,document,record.revision);
 }
 const stress=record.document.config.measurementFixture;
 const fixture={documentBytes:Buffer.byteLength(JSON.stringify(record.document)),designs:record.document.config.profile.designs.length,objects:record.document.config.profile.designs.reduce((n,d)=>n+d.objects.length,0),stressItems:stress?.items.length||0,stressObjects:largeDocument&&!largeBlobs?stress.items.length*5:0,structure:stress?.kind||'bundled native sample',liveNodeDistribution:'unknown'};
 const variant=prepareShopProduct(record).variants[0],shopifyProductId='gid://shopify/Product/90001',variantId='90002';
 const bound=workshop.orderIntake.bindVariants({record,shopDomain,mappings:[{key:variant.key,variantId}]});
 let registry={resolve(identity){
  assert.equal(identity.shopifyProductId,shopifyProductId);assert.equal(identity.shopifyVariantId,'gid://shopify/ProductVariant/'+variantId);
  const b=bound.bindings[0];return {storeId:'acryl',tenantId:workshop.tenantId,shopDomain,...identity,bindingId:b.id,productId:b.productId,productRevision:b.productRevision,options:structuredClone(b.options),unitCents:b.unitCents,assignmentRevision:1};
 }};
 if(realRegistry){
  const {createShopBindingReadAdapter}=await load('app/workshop/shop-product-binding-adapter.mjs');
  const {planShopProductBindings}=await load('app/workshop/shop-product-binding-plan.mjs');
  const tenantId=workshop.tenantId,storeId='acryl',now=Date.now(),shopifyVariantId='gid://shopify/ProductVariant/'+variantId;
  const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop,productionProfileScope:{storeId,tenantId}});
  registry=workshop.orderIntake.idBindings({storeId,shopDomain,adapter});
  const plan=planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now,maxEvidenceAgeMs:60000,
   shopifyEvidence:{tenantId,shopDomain,complete:true,readAt:new Date(now).toISOString(),products:[{id:shopifyProductId,variants:[{id:shopifyVariantId,productId:shopifyProductId,priceCents:variant.priceCents}]}]},
   selections:[{shopifyProductId,shopifyVariantId,productId:record.id,productRevision:record.revision,options:variant.options}]});
  registry.persist({plan,expectedHeads:[{shopifyVariantId,revision:null}]});
 }
 const store={storeId:'acryl',registry,workshop,nativeEditorPath:'/_merchant-editor.html',cart:()=>assert.fail('unexpected Storefront cart')};
 let imageIndex=0;const images=new Map(),events=[];
 const checkoutImage=createShopifyCheckoutImages({origin,shopDomain,getAccessToken:async()=>'synthetic-token'},{
  wait:()=>delay(25),fetchImpl:async(endpoint,options)=>{
   assert.equal(endpoint,'https://'+shopDomain+'/admin/api/2026-07/graphql.json');
   const {query,variables}=JSON.parse(options.body);
   if(query.includes('query CheckoutImage(')){await delay(60);return Response.json({data:{files:{nodes:[]}}});}
   if(query.includes('mutation CheckoutImageCreate')){
    await delay(100);const id='gid://shopify/MediaImage/'+(++imageIndex);
    images.set(id,{id,fileStatus:'READY',image:{url:'https://cdn.shopify.com/s/files/1/0920/5550/3228/files/'+variables.files[0].filename}});
    return Response.json({data:{fileCreate:{files:[{id,fileStatus:'PROCESSING'}],userErrors:[]}}});
   }
   assert.ok(query.includes('query CheckoutImageReady'));await delay(40);return Response.json({data:{node:images.get(variables.id)}});
  }
 });
 log=fs.openSync(path.join(dir,'timings.jsonl'),'w');
 const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,modelSlimmer:null,checkoutImage,limits:{startPerMinute:10000,requestsPerMinute:10000},logger:event=>{events.push(event);fs.writeSync(log,JSON.stringify(event)+'\n');}});
 server=http.createServer((req,res)=>entry.handle(req,res,new URL(req.url,origin)));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 async function request(route,method='GET',data,extra={}){
  const bytes=data===undefined?null:Buffer.from(JSON.stringify(data)),start=performance.now();
  return new Promise((resolve,reject)=>{
   const req=http.request({host:'127.0.0.1',port:server.address().port,path:route,method,headers:{Host:'app.example','X-Forwarded-Proto':'https',...(bytes?{'Content-Type':'application/json','Content-Length':bytes.length}:{}),...(method==='POST'?{Origin:origin}:{}),...extra}},res=>{
    const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{
     const body=Buffer.concat(chunks);let data;try{data=JSON.parse(body);}catch{}
     resolve({status:res.statusCode,data,headers:res.headers,elapsedMs:performance.now()-start,requestBytes:bytes?.length||0,responseBytes:body.length});
    });
   });req.on('error',reject);req.end(bytes);
  });
 }
 function signed(extra={}){const q=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'',...extra});q.set('signature',appProxySignature(q,secret));return q;}
 const samples=[],retainedMemory=[];
 async function customer(run){
  const start=await request(proxyPath+'/start?'+signed({product:'90001',variant:variantId}));assert.equal(start.status,302);
  const token=new URLSearchParams(new URL(start.headers.location).hash.slice(1)).get('s'),session={'X-Gravuru-Shop-Session':token};
  const model=await request('/api/shop-entry/model','GET',undefined,session);assert.equal(model.status,200);
  const config=model.data.model.universal,source=config.profile.designs[0];
  const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:structuredClone(source.objects),options:structuredClone(variant.options),quantity:2,media:[{id:'synthetic-photo',original:png}],preview:png,customerPreview:webp};
  Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo'});
  const saved=await request('/api/shop-entry/acrylic-drafts','POST',{input},session);assert.equal(saved.status,201,JSON.stringify(saved.data));
  const cart=await request('/api/shop-entry/theme-cart','POST',{draftId:saved.data.id,expectedRevision:1,quantity:2},{...session,'X-Gravuru-Draft':saved.data.token});assert.equal(cart.status,200,JSON.stringify(cart.data));
  const handoff=new URLSearchParams(new URL(cart.data.handoffUrl).hash.slice(1)).get('handoff');
  const proxyHeaders={'X-Gravuru-Cart-Handoff':handoff,'X-Gravuru-Cart-Preview':'hosted',Origin:'https://'+shopDomain};
  const data=await request(proxyPath+'/cart/data?'+signed(),'GET',undefined,proxyHeaders);assert.equal(data.status,200,JSON.stringify(data.data));
  assert.equal(data.data.totalCents,variant.priceCents*2);assert.equal(data.data.productionReady,false);assert.equal(data.data.preview,undefined);
  const claim=await request(proxyPath+'/cart/claim?'+signed(),'POST',undefined,proxyHeaders);assert.equal(claim.status,200,JSON.stringify(claim.data));
  if(run>0)samples.push(Object.fromEntries([['acrylic-drafts',saved],['theme-cart',cart],['cart/data',data],['cart/claim',claim]].map(([route,r])=>[route,{elapsedMs:Math.round(r.elapsedMs*100)/100,requestBytes:r.requestBytes,responseBytes:r.responseBytes,timing:events.find(e=>e.traceId===r.headers['x-gravuru-timing-id'])||null}])));
 }
 for(let run=0;run<=runs;run++){await Promise.all(Array.from({length:concurrency},()=>customer(run)));if(global.gc)global.gc();retainedMemory.push({run,...process.memoryUsage()});}
 const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
 // Let optional v2 GC supplements arrive after the measured HTTP work. Apply
 // the same grace to both checkouts; it is not part of a request duration.
 await delay(60);
 const summary=Object.fromEntries(Object.keys(samples[0]).map(route=>[route,{medianMs:median(samples.map(s=>s[route].elapsedMs)),minMs:Math.min(...samples.map(s=>s[route].elapsedMs)),maxMs:Math.max(...samples.map(s=>s[route].elapsedMs))}]));
 console.log(JSON.stringify({schema:'gravuru-shop-cart-timing-benchmark/v2',commit:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),profile:{kind:'local-synthetic-http',platform:os.platform(),cpu:os.cpus()[0].model,node:process.version,runs,warmupRuns:1,parallelSessions:concurrency,network:'loopback, no throttling',shopifyMockMs:{lookup:60,create:100,pollWait:25,poll:40},data:'bundled native acrylic sample, 40x60 PNG photo and WebP customer preview, '+(realRegistry?'temporary file-backed database':'in-memory database'),registry:realRegistry?'actual SQLite registry':'synthetic binding provider',fixture,forcedGc:typeof global.gc==='function'},retainedMemory,summary,samples,backgroundEvents:events.filter(e=>e.event==='shop_cart_timing'&&e.route==='checkout-image'),gcEvents:events.filter(e=>e.event==='shop_cart_gc')},null,2));
}finally{
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 workshop?.close();if(log!==undefined)fs.closeSync(log);fs.rmSync(dir,{recursive:true,force:true});
}
