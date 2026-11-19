// Exercise the normal signed R15 endpoints. Only the external Shopify replies have controlled timing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

const [reference,candidate,output]=process.argv.slice(2);
if(!reference||!candidate||!output)throw Error('Aufruf: node measure-native-checkout.mjs <Referenz> <Kandidat> <Bericht.json>');
const external={coldAccessMs:1950,graphqlMs:120};
const report={external,scope:'Lokale signierte R15-Anfragen vom Speichern bis cart/data mit bestätigtem CDN-Bild. Shopify-Antworten zeitgesteuert.',samples:[]};
const origin='https://app.example',proxyPath='/apps/konfigurator',secret='synthetic-app-secret-value-7x2';
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
const webp='UklGRmoAAABXRUJQVlA4WAoAAAAQAAAAJwAAOwAAQUxQSBMAAAABDzD/ERFCLJj4Sy+Fzoj+p04BAFZQOCAwAAAAMAMAnQEqKAA8AD4xGItEIiGhEVQAIAMEtIAACtIj6x5ssAD+9vnv6tJpEgAAAAAA';
const repo=(dir,file)=>path.resolve(dir,file);
const read=(dir,file)=>JSON.parse(fs.readFileSync(repo(dir,file),'utf8'));
async function sample(dir,buildName,run){
 const mod=file=>import(pathToFileURL(repo(dir,'app/'+file)));
 const {build}=await mod('configurator/variant-m/build.mjs'),{createWorkshop}=await mod('workshop/http.mjs');
 const {prepareShopProduct}=await mod('workshop/shop-preparation.mjs'),{appProxySignature}=await mod('workshop/shopify-app-proxy.mjs');
 const {createShopEntry}=await mod('workshop/shop-entry.mjs'),{createShopifyCheckoutImages}=await mod('workshop/shopify-checkout-image.mjs');
 const {createDraftTokenProvider}=await mod('workshop/shopify-draft-token.mjs');
 const mapping=read(dir,'docs/handoffs/2026-10-22-shopify-7x2-hauptprodukte.json'),shopDomain=mapping.shopDomain,product=mapping.products[0];
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r15-checkout-probe-'));
 let workshop,server;
 try{
  build({outputDirectory:tmp});const [seed]=read(tmp,'models.json');
  workshop=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,orderWebhook:{shopDomain,secret,apiVersion:'2026-07',mode:'test-only'},shopifySessions:{shopDomain,secret,clientId:'synthetic-client',mode:'test-only'}});
  const record=workshop.repository.copy(workshop.defaultId,{expectedRevision:1,name:product.shopifyTitle,kind:'product'});
  const variant=prepareShopProduct(record).variants[0],variantId=product.variants[0].shopifyVariantId.split('/').at(-1);
  const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:product.shopifyProductId,revision:1,currency:'EUR',variants:{[variantId]:variant.priceCents},extraMotifCents:record.document.config.extraMotifCents,extraPhotoCents:record.document.config.photo.extraPriceCents};
  const {bindings:[binding]}=workshop.orderIntake.bindVariants({record,shopDomain,mappings:[{key:variant.key,variantId}],personalizationPricing:pricing});
  const shopifyProductId=product.shopifyProductId,shopifyVariantId=product.variants[0].shopifyVariantId;
  const registry={resolve(ids){
   assert.equal(ids.shopifyProductId,shopifyProductId);assert.equal(ids.shopifyVariantId,shopifyVariantId);
   return {storeId:'acryl',tenantId:workshop.tenantId,shopDomain,shopifyProductId,shopifyVariantId,bindingId:binding.id,productId:binding.productId,productRevision:binding.productRevision,options:structuredClone(binding.options),unitCents:binding.unitCents,assignmentRevision:1};
  }};
  const store={storeId:'acryl',workshop,registry,apiPrefix:'/api/workshop/',nativeEditorPath:'/_merchant-editor.html',formEditorPath:'/_merchant-form-editor.html',cart:()=>assert.fail('Unexpected Storefront request')};
  let calls,currentImage;
  const getAccessToken=createDraftTokenProvider({shopDomain,clientId:'synthetic-client',clientSecret:secret},{fetchImpl:async url=>{
   assert.equal(url,'https://'+shopDomain+'/admin/oauth/access_token');calls.login++;await delay(external.coldAccessMs);
   return Response.json({access_token:'synthetic-checkout-token',expires_in:86400,scope:'write_products'});
  }});
  const checkoutImage=createShopifyCheckoutImages({origin,shopDomain,getAccessToken},{fetchImpl:async(url,options)=>{
   assert.equal(url,'https://'+shopDomain+'/admin/api/2026-07/graphql.json');const {query,variables}=JSON.parse(options.body);
   await delay(external.graphqlMs);
   if(query.includes('query CheckoutImage(')){calls.lookup++;return Response.json({data:{files:{nodes:[]}}});}
   if(query.includes('mutation CheckoutImageCreate(')){
    calls.create++;const {filename}=variables.files[0];assert.match(filename,/^gravuru-gestaltung-[a-f0-9]{64}\.png$/);
    currentImage='https://cdn.shopify.com/s/files/1/0920/5550/3228/files/'+filename;
    return Response.json({data:{fileCreate:{files:[{id:'gid://shopify/MediaImage/12',fileStatus:'PROCESSING'}],userErrors:[]}}});
   }
   assert.ok(query.includes('query CheckoutImageReady('));calls.poll++;
   return Response.json({data:{node:{id:'gid://shopify/MediaImage/12',fileStatus:'READY',image:{url:currentImage}}}});
  }});
  const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,checkoutImage,warmCheckoutAccess:getAccessToken,modelSlimmer:null,logger:()=>{}});
  server=http.createServer((req,res)=>entry.handle(req,res,new URL(req.url,origin)));server.listen(0,'127.0.0.1');await once(server,'listening');
  const request=(route,{headers={},body}={})=>new Promise((resolve,reject)=>{
   const bytes=body?Buffer.from(JSON.stringify(body)):null;
   const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:route,method:bytes?'POST':'GET',
    headers:{Host:'app.example','X-Forwarded-Proto':'https',...(bytes?{Origin:origin,'Content-Type':'application/json','Content-Length':bytes.length}:{}),...headers}},res=>{
    const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});
   req.on('error',reject);req.end(bytes);
  });
  const signed=(extra={})=>{const q=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'',...extra});q.set('signature',appProxySignature(q,secret));return q;};
  const json=async(response,expected)=>{const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data.error));return data;};
  for(const cache of ['kalt','warm']){
   calls={login:0,lookup:0,create:0,poll:0};const start=await request(proxyPath+'/start?'+signed({product:shopifyProductId.split('/').at(-1),variant:variantId,ui:'prio-r15'}));
   assert.equal(start.status,302);const session={'X-Gravuru-Shop-Session':new URLSearchParams(new URL(start.headers.get('location')).hash.slice(1)).get('s')};
   const model=await json(await request('/api/shop-entry/model',{headers:session}),200),design=model.model.universal.profile.designs[0];
   const input={productId:record.id,productRevision:record.revision,designId:design.id,objects:structuredClone(design.objects),options:structuredClone(variant.options),quantity:1,media:[{id:'probe',original:png}],preview:png,customerPreview:webp};
   Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'probe',uxUploadKind:'photo'});
   const clock=performance.now(),saved=await json(await request('/api/shop-entry/acrylic-drafts',{headers:session,body:{input}}),201);
   const afterSave=performance.now();
   const handoff=await json(await request('/api/shop-entry/theme-cart',{headers:{...session,'X-Gravuru-Draft':saved.token},body:{draftId:saved.id,expectedRevision:1,quantity:1,presentation:'prio-r15'}}),200);
   const beforeData=performance.now(),handoffToken=new URLSearchParams(new URL(handoff.handoffUrl).hash.slice(1)).get('handoff');
   const data=await json(await request(proxyPath+'/cart/data?'+signed(),{headers:{'X-Gravuru-Cart-Handoff':handoffToken,'X-Gravuru-Cart-Preview':'hosted'}}),200),end=performance.now();
   assert.equal(data.properties._gravuru_checkout_image,currentImage);assert.ok(data.properties._gravuru_bild);
   assert.equal(String(data.variantId),variantId);assert.equal(data.unitCents,variant.priceCents);assert.equal(data.configuration.rev,1);
   assert.equal(calls.create,1);assert.equal(calls.poll,1);assert.equal(calls.login,cache==='kalt'?1:0);
   report.samples.push({build:buildName,run,cache,saveMs:Math.round(afterSave-clock),dataMs:Math.round(end-beforeData),saveThroughDataMs:Math.round(end-clock),calls});
   fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  }
 }finally{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}workshop?.close();fs.rmSync(tmp,{recursive:true,force:true});}
}
const rounds=Number(process.env.BETA_CART_RUNS||3);
assert.ok(Number.isInteger(rounds)&&rounds>0&&rounds<=10);
for(let run=1;run<=rounds;run++){
 const builds=run===2?[[candidate,'neu'],[reference,'ref']]:[[reference,'ref'],[candidate,'neu']];
 for(const [dir,name] of builds)await sample(dir,name,run);
}
