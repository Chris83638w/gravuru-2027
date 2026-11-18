import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createWorkshop} from './http.mjs';
import {createShopEntry} from './shop-entry.mjs';
import {createBoundTestCart} from './bound-test-cart.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {planShopProductBindings} from './shop-product-binding-plan.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';
import {customerVectorLogoPreview} from './customer-vector-logo-media.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {withCustomerReadScope} from './customer-read-scope.mjs';
import {createCustomerDesignImages} from './customer-design-image.mjs';
import {prepareThemeCart} from './theme-cart.mjs';

const origin='https://app.example',shopDomain='synthetic.myshopify.com',secret='synthetic-read-phases-secret',proxyPath='/apps/konfigurator';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
function source(kind){
 if(kind==='doorbell')return doorbellFixture();
 const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
 if(kind==='photo')return c;
 delete c.acrylic;const p=c.profile;
 p.material={kind:'steel',color:'#a0a0a0',thicknessMm:1.5};p.processing={profileId:'steel-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
 const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
 Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:30,w:30,h:8,rotation:0,acrylicFixed:false});
 p.designs=[{id:'test',name:'Synthetic',objects:[text]}];p.defaultDesignId='test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]}]}];
 c.basePriceCents=2299;c.extraMotifCents=169;c.photo={enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:999};c.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];return c;
}

for(const kind of ['photo','steel-logo','doorbell'])test('read phases: real HTTP '+kind+' through save, theme, data, claim and Storefront',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-read-phases-'));
 const w=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:source(kind),legacy:{purchasing:{}},shopifySessions:{mode:'test-only',shopDomain,clientId:'synthetic-client',secret}});
 t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Synthetic '+kind,kind:'product'}),before=structuredClone(record);
 const frozen=withCustomerReadScope(()=>w.repository.get(record.id));
 assert.ok(Object.isFrozen(frozen)&&Object.isFrozen(frozen.document.config.profile.designs[0].objects));
 const plan=prepareShopProduct(record),variants=kind==='doorbell'?plan.variants:plan.variants.slice(0,1);
 const shopifyProductId='gid://shopify/Product/90001',mappings=variants.map((v,i)=>({key:v.key,variantId:String(90002+i)}));
 const pricing=kind==='steel-logo'?{schema:'gravuru-personalization-pricing/v2',enabled:true,productId:shopifyProductId,revision:1,currency:'EUR',variants:Object.fromEntries(mappings.map((m,i)=>[m.variantId,variants[i].priceCents])),extraMotifCents:169,extraPhotoCents:999,extraLogoCents:1299}:undefined;
 w.orderIntake.bindVariants({record,shopDomain,mappings,...(pricing?{personalizationPricing:pricing}:{})});
 const tenantId=w.tenantId,storeId='acryl',now=Date.now();
 const adapter=createShopBindingReadAdapter({storeId,tenantId,shopDomain,workshop:w,productionProfileScope:{storeId,tenantId}});
 const registry=w.orderIntake.idBindings({storeId,shopDomain,adapter});
 const selections=variants.map((v,i)=>({shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+mappings[i].variantId,productId:record.id,productRevision:record.revision,options:v.options}));
 for(let offset=0;offset<selections.length;offset+=100){
  const batch=selections.slice(offset,offset+100);
  const bindingPlan=planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now,maxEvidenceAgeMs:60000,
   shopifyEvidence:{tenantId,shopDomain,complete:true,readAt:new Date(now).toISOString(),products:[{id:shopifyProductId,variants:selections.map((s,i)=>({id:s.shopifyVariantId,productId:shopifyProductId,priceCents:variants[i].priceCents}))}]},selections:batch});
  registry.persist({plan:bindingPlan,expectedHeads:batch.map(s=>({shopifyVariantId:s.shopifyVariantId,revision:null}))});
 }
 if(kind==='doorbell')w.orderIntake.approveDoorbellLiveProducts({shopDomain,products:[{productId:record.id,productRevision:record.revision,shopifyProductId}],approvalId:'synthetic-test-only',registry});
 const events=[],lines=[],imageSources=[];
 const fetchImpl=async(url,options)=>{
  const body=JSON.parse(options.body);assert.equal(url,'https://'+shopDomain+'/api/2026-07/graphql.json');
  if(!body.query.includes('query GravuruCartRead')){
   const line=body.variables.input.lines[0],unit=variants[0].priceCents+(kind==='steel-logo'?1299:0);
   lines.push({id:'gid://shopify/CartLine/synthetic',...line,merchandise:{id:line.merchandiseId},cost:{amountPerQuantity:{amount:(unit/100).toFixed(2),currencyCode:'EUR'},totalAmount:{amount:(unit*line.quantity/100).toFixed(2),currencyCode:'EUR'}}});
  }
  const cart={id:'gid://shopify/Cart/synthetic',checkoutUrl:'https://'+shopDomain+'/checkouts/cn/synthetic',lines:{nodes:lines,pageInfo:{hasNextPage:false}}};
  return Response.json({data:body.query.includes('query GravuruCartRead')?{cart}:{cartCreate:{userErrors:[],warnings:[],cart}}});
 };
 const store={storeId,registry,workshop:w,nativeEditorPath:'/_merchant-editor.html',doorbellLiveOrders:kind==='doorbell',cart:createBoundTestCart({workshop:w,registry,shopDomain,transportOptions:{fetchImpl}})};
 const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,modelSlimmer:null,logger:e=>events.push(e),checkoutImage:async source=>{imageSources.push(source);await Promise.resolve();return 'https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+ 'c'.repeat(64)+'.png';}});
 const server=http.createServer((req,res)=>entry.handle(req,res,new URL(req.url,origin)));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 function request(route,method='GET',body,extra={}){
  return new Promise((resolve,reject)=>{
   const bytes=body?Buffer.from(JSON.stringify(body)):null;
   const req=http.request({host:'127.0.0.1',port:server.address().port,path:route,method,headers:{Host:'app.example','X-Forwarded-Proto':'https',...(method==='POST'?{Origin:origin,'Content-Type':'application/json'}:{}),...(bytes?{'Content-Length':bytes.length}:{}),...extra}},res=>{
    const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const text=Buffer.concat(chunks).toString();let data;try{data=JSON.parse(text);}catch{}resolve({status:res.statusCode,headers:new Headers(res.headers),data,text});});
   });req.on('error',reject);req.end(bytes);
  });
 }
 function signed(extra={}){const q=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:'',...extra});q.set('signature',appProxySignature(q,secret));return q;}
 const start=await request(proxyPath+'/start?'+signed({product:'90001',variant:mappings[0].variantId}));assert.equal(start.status,302,start.text);
 const token=new URLSearchParams(new URL(start.headers.get('location')).hash.slice(1)).get('s'),session={'X-Gravuru-Shop-Session':token};
 const model=await request('/api/shop-entry/model','GET',undefined,session);assert.equal(model.status,200,model.text);
 const config=model.data.model.universal,design=selectedProfile(config,variants[0].options).designs[0];
 const input={productId:record.id,productRevision:record.revision,designId:design.id,objects:structuredClone(design.objects),options:variants[0].options,quantity:1,media:[],preview:png,customerPreview:png};
 if(kind==='photo'){input.media.push({id:'photo',original:png});Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'photo',uxUploadKind:'photo'});}
 if(kind==='steel-logo'){
  const original=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M1 1H19V19H1Z"/></svg>').toString('base64');
  const preview=await customerVectorLogoPreview(config,{name:'logo.svg',original});
  const vectorLogo={version:preview.version,sourceSha256:preview.sourceSha256,outputSha256:preview.outputSha256};
  input.objects.push({id:'own-logo',type:'image',x:115,y:85,w:20,h:20,rotation:0,customerEditable:true,uxPersonal:true,uxUploadId:'logo',uxUploadKind:'logo',uxVectorLogo:vectorLogo});
  input.media.push({id:'logo',name:'logo.svg',original,edited:preview.svg,vectorLogo});
 }
 const saved=await request('/api/shop-entry/acrylic-drafts','POST',{input},session);assert.equal(saved.status,201,saved.text);
 const headers={...session,'X-Gravuru-Draft':saved.data.token},body={draftId:saved.data.id,expectedRevision:1,quantity:1};
 const handoff=await request('/api/shop-entry/theme-cart','POST',body,headers);assert.equal(handoff.status,200,handoff.text);
 const handoffToken=new URLSearchParams(new URL(handoff.data.handoffUrl).hash.slice(1)).get('handoff');
 const proxyHeaders={'X-Gravuru-Cart-Handoff':handoffToken,'X-Gravuru-Cart-Preview':'hosted',Origin:'https://'+shopDomain};
 const data=await request(proxyPath+'/cart/data?'+signed(),'GET',undefined,proxyHeaders);assert.equal(data.status,200,data.text);
 const claim=await request(proxyPath+'/cart/claim?'+signed(),'POST',undefined,proxyHeaders);assert.equal(claim.status,200,claim.text);
 const storefront=await request('/api/shop-entry/cart','POST',body,headers);assert.equal(storefront.status,200,storefront.text);assert.equal(lines.length,1);
 assert.equal(storefront.data.totalCents,data.data.totalCents);assert.equal(data.data.productionReady,false);
 assert.deepEqual(w.repository.get(record.id),before,'all consumers preserve the frozen product document');
 // Exact counts secure scope placement, not elapsed time. The real registry
 // must not silently reparse the same document after a new await is added.
 if(kind==='photo')for(const [route,response,reads,digests] of [['acrylic-drafts',saved,2,1],['theme-cart',handoff,2,2],['cart/data',data,2,2],['cart/claim',claim,1,1]]){
  const event=events.find(e=>e.traceId===response.headers.get('x-gravuru-timing-id'));
  assert.equal(event.steps.product_revision_read.calls,reads,route+' product reads');
  assert.equal(event.steps.registry_document_digest.calls,digests,route+' registry digests');
 }
 if(kind==='photo'){
  await t.test('source derivation failure after persistence keeps the successful save response',async()=>{
   const drafts=w.customerDrafts.acrylicDrafts,originalCreate=drafts.create,beforeJobs=imageSources.length;
   drafts.create=(...args)=>({...originalCreate(...args),snapshotId:'legacy_snapshot_identifier'});
   try{const response=await request('/api/shop-entry/acrylic-drafts','POST',{input},session);assert.equal(response.status,201,response.text);assert.equal(response.data.snapshotId,'legacy_snapshot_identifier');assert.equal(imageSources.length,beforeJobs);}
   finally{drafts.create=originalCreate;}
  });
  await t.test('invalid snapshot identifier keeps old offer image and all cart checks',async()=>{
   const images=createCustomerDesignImages({origin,shopDomain,secret,stores:[store]});
   const binding=registry.resolve({shopifyProductId,shopifyVariantId:selections[0].shopifyVariantId});
   const fresh=await request('/api/shop-entry/acrylic-drafts','POST',{input},session);assert.equal(fresh.status,201,fresh.text);
   const prepared=prepareThemeCart({workshop:w,registry,shopDomain,proxyPath,customerImageUrl:id=>images.url(storeId,id),checkoutImageSource:(id,hash)=>images.snapshotUrl(storeId,'legacy_snapshot_identifier',hash)},binding,{draftId:fresh.data.id,expectedRevision:1,quantity:1},{draftToken:fresh.data.token});
   assert.equal(prepared.checkoutImageSource,undefined);assert.match(prepared.payload.properties._gravuru_bild,/\/offer_[a-f0-9-]{36}\//);
   assert.ok(prepared.resolve());assert.ok(prepared.claim('a'.repeat(64)));
  });
 }
});
