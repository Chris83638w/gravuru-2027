import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {createBoundTestCart} from './bound-test-cart.mjs';
import {createShopEntry} from './shop-entry.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {workshopResources} from './catalog.mjs';
import {newEditableObject} from '../configurator/variant-m/contract.mjs';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {createThemeCartClient} from './ui/theme-cart-client.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

// Durchlauf des öffentlichen Einstiegs mit echter Werkstatt: Start über App-Proxy-Signatur → Modell →
// Gestaltung als privater Prüfstand → normaler Theme-Warenkorb (synthetischer Ajax-Shop)
// → Bestellnachricht bindet die Position an genau diesen Prüfstand. Shopify-IDs stammen aus der 7×2-Übergabe;
// das Produkt ist das mitgelieferte native Mustermodell (der Katalogimport ist kein Teil dieser Tests).
const mapping=JSON.parse(fs.readFileSync(new URL('../../docs/handoffs/2026-10-22-shopify-7x2-hauptprodukte.json',import.meta.url),'utf8'));
const origin='https://app.example',shopDomain=mapping.shopDomain,secret='synthetic-app-secret-value-7x2',proxyPath='/apps/konfigurator';
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
const euro=c=>(c/100).toFixed(2);

test('theme cart: signed entry, motif, immutable design, preview upload, edit and signed order intake',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-shop-entry-flow-'));build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:{mode:'test-only',shopDomain,clientId:'synthetic-client',secret}});
 t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const product=mapping.products[0];
 const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:product.shopifyTitle,kind:'product'});
 // Jede Shopify-Variante der Übergabe bekommt eine gespeicherte Ausführung des Musterprodukts (echte Preise des Modells).
 const variants=prepareShopProduct(record).variants.slice(0,product.variants.length);
 const bound=w.orderIntake.bindVariants({record,shopDomain,mappings:variants.map((v,i)=>({key:v.key,variantId:product.variants[i].shopifyVariantId.split('/').at(-1)}))});
 assert.equal(bound.bindings.length,product.variants.length);
 const registry={resolve({shopifyProductId,shopifyVariantId}){
  const b=bound.bindings.find(x=>'gid://shopify/ProductVariant/'+x.variantId===shopifyVariantId);
  if(shopifyProductId!==product.shopifyProductId||!b)throw Object.assign(Error('Keine ausdrückliche aktive Zuordnung.'),{status:404,code:'shop_binding_active_not_found'});
  return {storeId:'acryl',tenantId:w.tenantId,shopDomain,shopifyProductId,shopifyVariantId,bindingId:b.id,productId:b.productId,productRevision:b.productRevision,options:structuredClone(b.options),unitCents:b.unitCents,assignmentRevision:1};
 }};
 // Synthetischer Storefront: legt den Warenkorb mit dem Shop-Preis der gebundenen Variante an und merkt sich die Zeile.
 const cart={id:'gid://shopify/Cart/synthetic',lines:[]},sent=[];
 const fetchImpl=async(url,options)=>{
  assert.equal(url,`https://${shopDomain}/api/2026-07/graphql.json`);const body=JSON.parse(options.body);
  if(body.query.includes('query GravuruCartRead'))return Response.json({data:{cart:{id:cart.id,checkoutUrl:'https://'+shopDomain+'/checkouts/cn/synthetic',lines:{nodes:structuredClone(cart.lines),pageInfo:{hasNextPage:false}}}}});
  const update=body.query.includes('cartLinesUpdate'),line=update?body.variables.lines[0]:body.variables.input.lines[0];sent.push(line);
  const unit=w.orderIntake.bindings().find(b=>'gid://shopify/ProductVariant/'+b.variantId===line.merchandiseId)?.unitCents;assert.ok(unit,'unbekannte Variante');
  const node={id:update?line.id:'gid://shopify/CartLine/'+(cart.lines.length+1)+'?cart=synthetic',quantity:line.quantity,attributes:line.attributes,merchandise:{id:line.merchandiseId},cost:{amountPerQuantity:{amount:euro(unit),currencyCode:'EUR'},totalAmount:{amount:euro(unit*line.quantity),currencyCode:'EUR'}}};
  if(update){const i=cart.lines.findIndex(l=>l.id===line.id);assert.ok(i>=0);cart.lines[i]=node;}else cart.lines.push(node);
  return Response.json({data:{[update?'cartLinesUpdate':'cartCreate']:{userErrors:[],warnings:[],cart:{id:cart.id,checkoutUrl:'https://'+shopDomain+'/checkouts/cn/synthetic',lines:{pageInfo:{hasNextPage:false},nodes:update?cart.lines:[node]}}}}});
 };
 const store={storeId:'acryl',registry,workshop:w,apiPrefix:'/api/workshop/',nativeEditorPath:'/_merchant-editor.html',formEditorPath:'/_merchant-form-editor.html',cart:createBoundTestCart({workshop:w,registry,shopDomain,transportOptions:{fetchImpl}})};
 let now=1_800_000_000_000;const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,clock:()=>now,modelSlimmer:null});
 const server=http.createServer((req,res)=>entry.handle(req,res,new URL(req.url,origin)));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const request=(pathname,method='GET',data,extra={})=>new Promise((resolve,reject)=>{
  const bytes=data===undefined?null:Buffer.from(JSON.stringify(data));
  const headers={Host:'app.example','X-Forwarded-Proto':'https',...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(bytes?{'Content-Length':bytes.length}:{}),...extra};
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:pathname,method,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const body=Buffer.concat(chunks);let json=null;try{json=JSON.parse(body);}catch{}resolve({status:res.statusCode,headers:res.headers,body,data:json});});});req.on('error',reject);req.end(bytes);
 });
 // 1. Start wie von Shopify weitergeleitet: Produktseite zeigt Variante 2 (hier „KGL“), der Kunde ist nicht angemeldet.
 const pageVariant=product.variants[1],params=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(now/1000)),logged_in_customer_id:'',product:product.shopifyProductId.split('/').at(-1),variant:pageVariant.shopifyVariantId.split('/').at(-1),back:'/products/'+product.handle});
 params.set('signature',appProxySignature(params,secret));
 const start=await request(proxyPath+'/start?'+params);assert.equal(start.status,302,start.body.toString());
 const fragment=new URLSearchParams(new URL(start.headers.location).hash.slice(1)),token=fragment.get('s');assert.equal(fragment.get('back'),'/products/'+product.handle);
 const session={'X-Gravuru-Shop-Session':token};
 // 2. Modell: echtes Werkstattmodell der festen Revision, Ausführung der Seitenvariante vorausgewählt.
 const model=await request('/api/shop-entry/model',undefined,undefined,session);assert.equal(model.status,200,JSON.stringify(model.data));
 const config=model.data.model.universal;assert.equal(model.data.model.configuration.id,record.id);assert.equal(model.data.model.configuration.revision,record.revision);
 for(const group of config.profile.optionGroups)assert.equal(group.defaultValueId,variants[1].options[group.id]);
 assert.ok(!JSON.stringify(model.data).includes(secret));
 // 3. Gestaltung mit Foto als privater Entwurf/Prüfstand, Ausführung = Variante 4 („B02“) statt der Seitenvariante.
 const chosen=variants[3],source=config.profile.designs[0];
 const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:structuredClone(source.objects),options:structuredClone(chosen.options),quantity:2,media:[{id:'kundenfoto',original:png}],preview:png,customerPreview:png};
 Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'kundenfoto',uxUploadKind:'photo'});
 const created=await request('/api/shop-entry/acrylic-drafts','POST',{input},session);assert.equal(created.status,201,JSON.stringify(created.data));
 const draft=created.data;assert.match(draft.id,/^adraft_/);assert.match(draft.token,/^[a-f0-9]{64}$/);assert.equal(draft.revision,1);
 const manifest=w.customerDrafts.review(draft.snapshotId).manifest;assert.deepEqual(manifest.selection.options,chosen.options);assert.equal(manifest.selection.price.quantity,2);assert.equal(manifest.productionReady,false);
 // Ohne Entwurfstoken ist der Entwurf nicht fortschreibbar; fremder Produktstand wird abgewiesen.
 assert.equal((await request('/api/shop-entry/acrylic-drafts/'+draft.id,'POST',{input,expectedRevision:1},session)).status,404);
 assert.equal((await request('/api/shop-entry/acrylic-drafts','POST',{input:{...input,productRevision:record.revision+1}},session)).status,409);

 // House from the actual bundled editor library is saved and frozen in the snapshot.
 const house=workshopResources().motifs.find(m=>m.key==='import-b56d5711a75f34c1fa8d9c30');assert.ok(house);
 const extra=newEditableObject(config,{type:'motif',motif:house.key},'extra-house',config.localResources.fonts,[...config.localResources.motifs,house],input.options);
 const withHouse=await request('/api/shop-entry/acrylic-drafts','POST',{input:{...input,objects:[...input.objects,extra]}},session);
 assert.equal(withHouse.status,201,JSON.stringify(withHouse.data));
 const houseReview=w.customerDrafts.review(withHouse.data.snapshotId).manifest;
 const bundle=readReviewPackage(w.customerDrafts.downloadSnapshot(withHouse.data.snapshotId,'package'),houseReview.packageSha256,NATIVE_REVIEW_SCHEMAS);
 assert.ok(JSON.parse(bundle.files.get('konfigurator-quellen.json')).localResources.motifs.some(m=>m.key===house.key&&m.svgFragment===house.svgFragment));
 const houseHeaders={...session,'X-Gravuru-Draft':withHouse.data.token};
 const includedMotif=await request('/api/shop-entry/theme-cart','POST',{draftId:withHouse.data.id,expectedRevision:1,quantity:2},houseHeaders);
 assert.equal(includedMotif.status,200,JSON.stringify(includedMotif.data));assert.equal(includedMotif.data.totalCents,chosen.priceCents*2,'included motif keeps the bound price');
 const unknown=await request('/api/shop-entry/acrylic-drafts','POST',{input:{...input,objects:[...input.objects,{...extra,motif:'unknown-motif'}]}},session);
 assert.equal(unknown.status,422);assert.match(unknown.data.error.message,/Bibliothek/);
 // Actual saved baseline without paid additions follows the normal theme-cart path.
 const headers={...session,'X-Gravuru-Draft':draft.token};
 const prepared=await request('/api/shop-entry/theme-cart','POST',{draftId:draft.id,expectedRevision:1,quantity:2},headers);
 assert.equal(prepared.status,200,JSON.stringify(prepared.data));assert.equal(prepared.data.mode,'theme');assert.equal(sent.length,0,'no separate Storefront cart is created');
 const transferToken=new URLSearchParams(new URL(prepared.data.handoffUrl).hash.slice(1)).get('handoff');assert.match(transferToken,/^[a-f0-9]{64}$/);
 function signed(){const q=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(now/1000)),logged_in_customer_id:''});q.set('signature',appProxySignature(q,secret));return q;}
 const proxyRequest=(part,method='GET',token=transferToken,extra={})=>request(proxyPath+part+'?'+signed(),method,undefined,{'X-Gravuru-Cart-Handoff':token,...(method==='POST'?{Origin:'https://'+shopDomain}:{}),...extra});
 const page=await proxyRequest('/cart');assert.equal(page.status,200);assert.match(page.headers['content-type'],/text\/html/);assert.ok(!page.body.includes(Buffer.from(draft.token)));assert.ok(!page.body.includes(Buffer.from(transferToken)));
 for(const file of ['/theme-cart-ui.mjs','/theme-cart-client.mjs']){const r=await proxyRequest(file);assert.equal(r.status,200);assert.match(r.headers['content-type'],/javascript/);}
 assert.equal((await request(proxyPath+'/cart/data')).status,401);
 assert.equal((await proxyRequest('/cart/data','GET','bad')).status,403);
 assert.equal((await proxyRequest('/cart/data','GET',transferToken,{Origin:'https://evil.example'})).status,403);
 assert.equal((await proxyRequest('/cart/claim','POST',transferToken,{Origin:'https://evil.example'})).status,403);
 const wrongCustomer=signed();wrongCustomer.set('logged_in_customer_id','42');wrongCustomer.delete('signature');wrongCustomer.set('signature',appProxySignature(wrongCustomer,secret));
 assert.equal((await request(proxyPath+'/cart/data?'+wrongCustomer,'GET',undefined,{'X-Gravuru-Cart-Handoff':transferToken})).status,403);
 const data=await proxyRequest('/cart/data');assert.equal(data.status,200,JSON.stringify(data.data));const p=data.data;
 assert.equal(p.variantId,product.variants[3].shopifyVariantId.split('/').at(-1));assert.equal(p.quantity,2);assert.equal(p.totalCents,chosen.priceCents*2);
 assert.equal(p.properties._gravuru_config,prepared.data.configuration.id);assert.equal(p.properties._gravuru_rev,'1');assert.ok(p.properties.Gravurtext);assert.equal(p.preview.type,'image/png');
 assert.ok(!JSON.stringify(p).includes(draft.token));assert.ok(!JSON.stringify(p).includes(token));assert.equal(new URL(p.properties._gravuru_bearbeiten).searchParams.get('line'),'theme');
 assert.equal(p.properties.Bearbeiten,undefined);
 const customerImagePath=new URL(p.properties._gravuru_bild).pathname;
 const customerImage=await request(customerImagePath);assert.equal(customerImage.status,200);assert.deepEqual(customerImage.body,Buffer.from(png,'base64'));
 assert.equal((await request(customerImagePath,'HEAD')).body.length,0);
 assert.equal((await request(customerImagePath+'?original=1')).status,404);
 assert.equal((await request(customerImagePath.replace(/.$/,'x'))).status,404);
 assert.equal((await request(customerImagePath,'POST')).status,404);
 assert.equal((await request(customerImagePath,'GET',undefined,{Host:'evil.example'})).status,403);
 const other={key:'9:other',variant_id:9,product_id:9,quantity:1,properties:{Name:'Unverändert'},original_price:500,original_line_price:500,final_line_price:500};
 const themeCart={currency:'EUR',items:[other]};let adds=0,removes=0;
 const shopFetch=async(url,o)=>{
  if(url==='/cart.js')return Response.json(structuredClone(themeCart));
  if(url==='/cart/add.js'){
   adds++;const uploaded=o.body.get('items[0][properties][_Entwurf]');assert.equal(uploaded.type,'image/png');assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()),Buffer.from(png,'base64'));const props={};for(const [key,v]of o.body.entries()){const m=key.match(/^items\[0\]\[properties\]\[(.+)\]$/);if(m)props[m[1]]=typeof v==='string'?v:'https://cdn.shopify.com/s/files/1/uploads/preview-'+adds+'.png';}
   const q=Number(o.body.get('items[0][quantity]'));themeCart.items.push({key:'added-'+adds,variant_id:Number(o.body.get('items[0][id]')),product_id:Number(p.productId),quantity:q,original_price:p.unitCents,original_line_price:p.unitCents*q,final_line_price:p.unitCents*q,properties:props});return Response.json({items:themeCart.items.slice(-1)});
  }
  if(url==='/cart/change.js'){removes++;const b=JSON.parse(o.body);assert.equal(b.quantity,0);const i=themeCart.items.findIndex(x=>x.key===b.id);assert.ok(i>0);themeCart.items.splice(i,1);return Response.json(structuredClone(themeCart));}
  assert.fail(url);
 };
 const bridge=token=>createThemeCartClient({fetchImpl:shopFetch,claim:async()=>{const r=await proxyRequest('/cart/claim','POST',token);assert.equal(r.status,200,JSON.stringify(r.data));}});
 const client=bridge(transferToken);await client.submit(p,{image:new Blob(['wrong later JPEG'],{type:'image/jpeg'})});await client.submit(p);
 assert.equal(adds,1);assert.equal(themeCart.items.length,2);assert.deepEqual(themeCart.items[0],other);
 assert.equal((await proxyRequest('/cart/claim','POST')).status,409,'persistent claim refuses a second upload');
 const opened=await request('/api/shop-entry/cart-configurations/'+p.configuration.id+'/1',undefined,undefined,headers);
 assert.equal(opened.status,200);assert.equal(opened.data.draft.id,draft.id);assert.equal(opened.data.quantity,2);
 const photo=await request('/api/shop-entry/cart-configurations/'+p.configuration.id+'/1/photos/kundenfoto',undefined,undefined,headers);assert.deepEqual(photo.body,Buffer.from(png,'base64'));
 // Edit the same draft; only its own prior cart line is replaced.
 const abandoned=await request('/api/shop-entry/acrylic-drafts/'+draft.id,'POST',{input:{...input,quantity:3},expectedRevision:1},headers);assert.equal(abandoned.status,200);
 const abandonedTransfer=await request('/api/shop-entry/theme-cart','POST',{draftId:draft.id,expectedRevision:2,quantity:3,configId:p.configuration.id,cartLineId:'theme',cartRevision:1},headers);assert.equal(abandonedTransfer.status,200);
 const edited=await request('/api/shop-entry/acrylic-drafts/'+draft.id,'POST',{input:{...input,quantity:3},expectedRevision:2},headers);assert.equal(edited.status,200,JSON.stringify(edited.data));
 const edit=await request('/api/shop-entry/theme-cart','POST',{draftId:draft.id,expectedRevision:3,quantity:3,configId:p.configuration.id,cartLineId:'theme',cartRevision:1},headers);assert.equal(edit.status,200,JSON.stringify(edit.data));
 const editToken=new URLSearchParams(new URL(edit.data.handoffUrl).hash.slice(1)).get('handoff'),editData=await proxyRequest('/cart/data','GET',editToken);assert.equal(editData.status,200);
 assert.equal(editData.data.previousRevision,1);assert.equal(editData.data.configuration.rev,3);
 await bridge(editToken).submit(editData.data);assert.equal(adds,2);assert.equal(removes,1);assert.equal(themeCart.items.length,2);assert.deepEqual(themeCart.items[0],other);
 // Signed order intake still binds precisely to the immutable edited design.
 const item=themeCart.items[1],paid={id:13745774461308,test:true,financial_status:'paid',currency:'EUR',customer:{id:42},line_items:[{id:9001,product_id:Number(p.productId),variant_id:item.variant_id,quantity:3,price:euro(item.original_price),properties:Object.entries(item.properties).map(([name,value])=>({name,value}))}]};
 const raw=Buffer.from(JSON.stringify(paid)),received=w.orderIntake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'evt-theme-cart-0001'},{shopDomain,secret,apiVersion:'2026-07'});
 assert.equal(received.errors.length,0,JSON.stringify(received.errors));assert.equal(received.lines.length,1);assert.equal(received.lines[0].snapshotId,edited.data.snapshotId);assert.deepEqual(received.lines[0].configuration,{id:p.configuration.id,rev:3});assert.equal(received.lines[0].productionReady,false);
 now+=31*60*1000;assert.deepEqual((await request(customerImagePath)).body,Buffer.from(png,'base64'),'immutable image survives draft changes, payment and expired handoff');assert.equal((await proxyRequest('/cart/data','GET',editToken)).status,403);
});
