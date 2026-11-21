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
import {createShopEntryClient} from './ui/shop-entry-client.mjs';
import {shopCartRequest} from '../configurator/variant-m/shop-cart.mjs';
import {createOrderWebhookHandler,ORDER_WEBHOOK_PATH} from './shopify-order-webhook.mjs';
import {cartTransformRun} from '../../ops/shopify/einzelsperre-release/preis/src/master-release/cart_transform_run.mjs';
import {cartValidationsGenerateRun} from '../../ops/shopify/einzelsperre-release/pruefung/src/cart_validation_run.mjs';
import {customerReadMemo} from './customer-read-scope.mjs';

// Durchlauf des öffentlichen Einstiegs mit echter Werkstatt: Start über App-Proxy-Signatur → Modell →
// Gestaltung als privater Prüfstand → normaler Theme-Warenkorb (synthetischer Ajax-Shop)
// → Bestellnachricht bindet die Position an genau diesen Prüfstand. Shopify-IDs stammen aus der 7×2-Übergabe;
// das Produkt ist das mitgelieferte native Mustermodell (der Katalogimport ist kein Teil dieser Tests).
const mapping=JSON.parse(fs.readFileSync(new URL('../../docs/handoffs/2026-10-22-shopify-7x2-hauptprodukte.json',import.meta.url),'utf8'));
const origin='https://app.example',shopDomain=mapping.shopDomain,secret='synthetic-app-secret-value-7x2',proxyPath='/apps/konfigurator';
// V3: Shop-Editor sendet die Kundenvorschau als WebP; der Prüfstand speichert weiterhin PNG.
const webp='UklGRmoAAABXRUJQVlA4WAoAAAAQAAAAJwAAOwAAQUxQSBMAAAABDzD/ERFCLJj4Sy+Fzoj+p04BAFZQOCAwAAAAMAMAnQEqKAA8AD4xGItEIiGhEVQAIAMEtIAACtIj6x5ssAD+9vnv6tJpEgAAAAAA';
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
const euro=c=>(c/100).toFixed(2);

// Auftrag #265 (Chris 20.11.2026): derselbe Durchlauf auch mit Antwortspeicher (gehaltenes Modell, gemerkte Art der Freigabe).
// Gezählt wird, wie oft der Kundeneinstieg in diesem Durchlauf das ganze Produktdokument liest. Ohne Antwortspeicher 133-mal.
// Mit Antwortspeicher: 135-mal auf dem Stand 44f9bdcf, 88-mal mit der gemerkten Art in active() allein, 72-mal, seit auch die
// Freigabe-Prüfungen des Warenkorbwegs die gemerkte Art nehmen und der Entwurf das gehaltene Modell nutzt. Die Grenze liegt dazwischen.
const documentReadsByMode={};
// ENTSCHEIDUNGEN 3.52/3.53 (Chris 21.11.2026): Standard ist „beim Einlegen kein Bild an Shopify“ (`images:false`).
// Der frühere Weg mit Kassenbild bei Shopify bleibt als abschaltbare Einstellung (`shopifyCartImages`) geprüft.
for(const {cache,images} of [{cache:false,images:true},{cache:true,images:true},{cache:true,images:false}])test('theme cart: signed entry, immutable design, edit, quantity 1 to 4 and signed order intake'+(cache?' (with model response cache)':'')+(images?'':' (kein Bild an Shopify)'),async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-shop-entry-flow-'));build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const quantityTiers=[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}];
 const quantityTierScope='complete-unit';
 Object.assign(seed.universal,{quantityTiers,quantityTierScope});
 const webhookConfig={shopDomain,secret,apiVersion:'2026-07',mode:'test-only'};
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,orderWebhook:webhookConfig,shopifySessions:{mode:'test-only',shopDomain,clientId:'synthetic-client',secret}});
 t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const product=mapping.products[0];
 const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:product.shopifyTitle,kind:'product'});
 // Jede Shopify-Variante der Übergabe bekommt eine gespeicherte Ausführung des Musterprodukts (echte Preise des Modells).
 const plan=prepareShopProduct(record);
 const variants=plan.variants.slice(0,product.variants.length);
 const staffelVariant=plan.variants.find(v=>v.priceCents===1999);
 assert.ok(staffelVariant);
 const mappings=variants.map((v,i)=>({key:v.key,variantId:product.variants[i].shopifyVariantId.split('/').at(-1)}));
 if(!mappings.some(m=>m.key===staffelVariant.key))mappings.push({key:staffelVariant.key,variantId:'99001'});
 const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:product.shopifyProductId,revision:1,currency:'EUR',
  variants:Object.fromEntries(mappings.map(m=>[m.variantId,plan.variants.find(v=>v.key===m.key).priceCents])),
  extraMotifCents:record.document.config.extraMotifCents,extraPhotoCents:record.document.config.photo.extraPriceCents,quantityTiers,quantityTierScope};
 const bound=w.orderIntake.bindVariants({record,shopDomain,mappings,personalizationPricing:pricing});
 assert.equal(bound.bindings.length,mappings.length);
 // Auftrag #265, Stufe 4: Zähler für die Lesephasen der Warenkorbstrecke. `calls` zählt jede Auflösung der Zuordnung,
 // `phases` nur die erste je Lesephase (customerReadMemo merkt innerhalb einer Phase, außerhalb nie).
 const reads={calls:0,phases:0,owner:{}};
 const counted=async work=>{const before={...reads};const result=await work();return {result,calls:reads.calls-before.calls,phases:reads.phases-before.phases};};
 const registry={resolve({shopifyProductId,shopifyVariantId}){
  reads.calls++;customerReadMemo(reads.owner,'phase',()=>++reads.phases);
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
 let documentReads=0;const countingWorkshop={...w,repository:{...w.repository,get:(...a)=>{documentReads++;return w.repository.get(...a);}}};
 const store={storeId:'acryl',registry,workshop:countingWorkshop,apiPrefix:'/api/workshop/',nativeEditorPath:'/_merchant-editor.html',formEditorPath:'/_merchant-form-editor.html',cart:createBoundTestCart({workshop:w,registry,shopDomain,transportOptions:{fetchImpl}})};
 const registeredImage='https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+'c'.repeat(64)+'.png';let imageCalls=0,imagePending=false;
 const timingEvents=[],sources=[];let warmAccess=0;
 let now=1_800_000_000_000;const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,clock:()=>now,logger:event=>timingEvents.push(event),modelSlimmer:null,...(cache?{modelResponseCache:true}:{}),...(images?{shopifyCartImages:true}:{}),warmCheckoutAccess:async()=>{warmAccess++;throw Error('test cold login');},checkoutImage:async (source,options)=>{sources.push({source,options});assert.ok(source.startsWith(origin+'/gestaltung/'));if(imagePending)throw Object.assign(Error('Bild wird vorbereitet.'),{status:502,code:'checkout_image_pending'});imageCalls++;return registeredImage;}});
 const webhook=createOrderWebhookHandler({intake:w.orderIntake,config:webhookConfig});
 const server=http.createServer((req,res)=>req.url===ORDER_WEBHOOK_PATH?webhook(req,res):entry.handle(req,res,new URL(req.url,origin)));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const request=(pathname,method='GET',data,extra={})=>new Promise((resolve,reject)=>{
  const bytes=data===undefined?null:Buffer.from(JSON.stringify(data));
  const headers={Host:'app.example','X-Forwarded-Proto':'https',...(method==='GET'?{}:{'Content-Type':'application/json'}),...(method!=='GET'&&pathname!==ORDER_WEBHOOK_PATH?{Origin:origin}:{}),...(bytes?{'Content-Length':bytes.length}:{}),...extra};
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:pathname,method,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const body=Buffer.concat(chunks);let json=null;try{json=JSON.parse(body);}catch{}resolve({status:res.statusCode,headers:res.headers,body,data:json});});});req.on('error',reject);req.end(bytes);
 });
 // 1. Start wie von Shopify weitergeleitet: Produktseite zeigt Variante 2 (hier „KGL“), der Kunde ist nicht angemeldet.
 const pageVariant=product.variants[1],params=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(now/1000)),logged_in_customer_id:'',product:product.shopifyProductId.split('/').at(-1),variant:pageVariant.shopifyVariantId.split('/').at(-1),back:'/products/'+product.handle,ui:'prio-r15'});
 params.set('signature',appProxySignature(params,secret));
 const start=await request(proxyPath+'/start?'+params);assert.equal(start.status,302,start.body.toString());
 const fragment=new URLSearchParams(new URL(start.headers.location).hash.slice(1)),token=fragment.get('s');assert.equal(fragment.get('back'),'/products/'+product.handle);
 assert.equal(fragment.get('ui'),'prio-r15');
 const session={'X-Gravuru-Shop-Session':token};
 // 2. Modell: echtes Werkstattmodell der festen Revision, Ausführung der Seitenvariante vorausgewählt.
 const model=await request('/api/shop-entry/model',undefined,undefined,session);assert.equal(model.status,200,JSON.stringify(model.data));
 const config=model.data.model.universal;assert.equal(model.data.model.configuration.id,record.id);assert.equal(model.data.model.configuration.revision,record.revision);
 for(const group of config.profile.optionGroups)assert.equal(group.defaultValueId,variants[1].options[group.id]);
 assert.ok(!JSON.stringify(model.data).includes(secret));
 // 3. Gestaltung mit Foto als privater Entwurf/Prüfstand, Ausführung = Variante 4 („B02“) statt der Seitenvariante.
 const chosen=variants[3],source=config.profile.designs[0];
 const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:structuredClone(source.objects),options:structuredClone(chosen.options),quantity:2,media:[{id:'kundenfoto',original:png}],preview:png,customerPreview:webp};
 Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'kundenfoto',uxUploadKind:'photo'});
 const created=await request('/api/shop-entry/acrylic-drafts','POST',{input},session);assert.equal(created.status,201,JSON.stringify(created.data));
 const draftTiming=timingEvents.find(e=>e.traceId===created.headers['x-gravuru-timing-id']);
 assert.equal(draftTiming.route,'acrylic-drafts');assert.equal(draftTiming.status,201);
 assert.equal(draftTiming.counts.request_bytes,Buffer.byteLength(JSON.stringify({input})));
 assert.equal(draftTiming.counts.response_bytes,created.body.length);
 for(const step of ['body_read','body_json','session_binding','model_build','review_validate','preview_pair','review_zip','draft_persist','response_json']){
  assert.equal(draftTiming.steps[step].calls,1,step);assert.ok(draftTiming.steps[step].durationMs>=0);assert.ok(created.headers['server-timing'].includes(step+';dur='));
 }
 // Ohne `shopifyCartImages` meldet das Sichern nichts bei Shopify an: kein Zugang, kein Bild.
 assert.equal(warmAccess,images?1:0);
 assert.equal(sources.length,images?1:0);
 if(images){assert.match(new URL(sources[0].source).pathname,/\/proof_/);assert.deepEqual(sources[0].options,{justSaved:true});}
 const firstSource=sources[0]?.source;
 const draft=created.data;assert.match(draft.id,/^adraft_/);assert.match(draft.token,/^[a-f0-9]{64}$/);assert.equal(draft.revision,1);
 const manifest=w.customerDrafts.review(draft.snapshotId).manifest;assert.deepEqual(manifest.selection.options,chosen.options);assert.equal(manifest.selection.price.quantity,2);assert.equal(manifest.productionReady,false);
 // ENTSCHEIDUNGEN 3.47: Den Verweis auf den Produktstand bekommen nur native Produkte (Familien, Klingelschilder). Das
 // Musterprodukt dieses Durchlaufs ist ein Acryl-Aufsteller alter Art (`config.acrylic`); sein Paket bleibt, wie es war.
 {const stored=JSON.parse(readReviewPackage(w.customerDrafts.downloadSnapshot(draft.snapshotId,'package'),manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files.get('produkt-und-gestaltung.json'));
  assert.equal(stored.schema,'gravuru-acrylic-review-input/v1');assert.ok(stored.product&&stored.productRef===undefined);}
 const storedCustomerPng=readReviewPackage(w.customerDrafts.downloadSnapshot(draft.snapshotId,'package'),manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files.get('gestaltung-kundenansicht.png');
 assert.ok(storedCustomerPng.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'WebP customer preview is stored as PNG');assert.deepEqual([storedCustomerPng.readUInt32BE(16),storedCustomerPng.readUInt32BE(20)],[40,60]);
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
 const cartInput={draftId:draft.id,expectedRevision:1,quantity:2};
 for(const presentation of ['demo','PRIO-R15','https://evil.example/ui.mjs',null,0,['prio-r15'],{ui:'prio-r15'}]){
  const denied=await request('/api/shop-entry/theme-cart','POST',{...cartInput,presentation},headers);
  assert.equal(denied.status,422);assert.equal(denied.data.error.code,'shop_entry_cart_fields');
 }
 const ordinary=await request('/api/shop-entry/cart','POST',{...cartInput,presentation:'prio-r15'},headers);
 assert.equal(ordinary.status,422,'the legacy Storefront endpoint keeps its existing field contract');
 const entryClient=createShopEntryClient({token,fetchImpl:async(url,options)=>{
  const result=await request(url,options.method,JSON.parse(options.body),options.headers);
  return Response.json(result.data,{status:result.status});
 }});
 const requestInput=shopCartRequest({saved:{draftId:draft.id,revision:1},quantity:2,cartMode:'theme',presentation:fragment.get('ui')});
 const submitted=await counted(()=>entryClient.submitThemeCart(requestInput,{draftToken:draft.token})),prepared={data:submitted.result};
 // Sitzungsprüfung vor dem Lesen des Bodys, danach eine Lesephase für Variantenwahl und Angebotsprüfung: jede Prüfung läuft, gelesen wird einmal.
 assert.ok(submitted.calls>=3,'Sitzung, Variante und Angebot lösen die Zuordnung je einmal auf');assert.equal(submitted.phases,2);
 assert.equal(prepared.data.mode,'theme');assert.equal(sent.length,0,'no separate Storefront cart is created');
 const transferToken=new URLSearchParams(new URL(prepared.data.handoffUrl).hash.slice(1)).get('handoff');assert.match(transferToken,/^[a-f0-9]{64}$/);
 // V2: Shopify-Checkout-Bild startet bereits mit der Übergabe (nicht erst mit /cart/data).
 if(images){assert.ok(imageCalls>=2);assert.equal(sources.at(-1).source,firstSource,'handoff must reuse the image of this revision');}else assert.equal(sources.length,0,'auch die Übergabe meldet kein Bild bei Shopify an');imageCalls=0;
 function signed(){const q=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(now/1000)),logged_in_customer_id:''});q.set('signature',appProxySignature(q,secret));return q;}
 const proxyRequest=(part,method='GET',token=transferToken,extra={})=>request(proxyPath+part+'?'+signed(),method,undefined,{'X-Gravuru-Cart-Handoff':token,...(method==='POST'?{Origin:'https://'+shopDomain}:{}),...extra});
 const hosted={'X-Gravuru-Cart-Preview':'hosted','X-Gravuru-Cart-Image':'server'};// der neue Client meldet beide Fähigkeiten (#252 gehostete Vorschau; 3.52 Bild am eigenen Server)
 const page=await proxyRequest('/cart');assert.equal(page.status,200);assert.match(page.headers['content-type'],/text\/html/);assert.ok(!page.body.includes(Buffer.from(draft.token)));assert.ok(!page.body.includes(Buffer.from(transferToken)));
 for(const file of ['/theme-cart-ui.mjs','/theme-cart-client.mjs']){const r=await proxyRequest(file);assert.equal(r.status,200);assert.match(r.headers['content-type'],/javascript/);}
 assert.equal((await request(proxyPath+'/cart/data')).status,401);
 assert.equal((await proxyRequest('/cart/data','GET','bad')).status,403);
 assert.equal((await proxyRequest('/cart/data','GET',transferToken,{Origin:'https://evil.example'})).status,403);
 assert.equal((await proxyRequest('/cart/claim','POST',transferToken,{Origin:'https://evil.example'})).status,403);
 const wrongCustomer=signed();wrongCustomer.set('logged_in_customer_id','42');wrongCustomer.delete('signature');wrongCustomer.set('signature',appProxySignature(wrongCustomer,secret));
 assert.equal((await request(proxyPath+'/cart/data?'+wrongCustomer,'GET',undefined,{'X-Gravuru-Cart-Handoff':transferToken})).status,403);
 if(images){
  imagePending=true;const pendingImage=await proxyRequest('/cart/data');assert.equal(pendingImage.status,502);assert.equal(pendingImage.data.error.code,'checkout_image_pending');assert.equal(imageCalls,0);
  const failedTiming=timingEvents.find(e=>e.traceId===pendingImage.headers['x-gravuru-timing-id']);
  assert.equal(failedTiming.status,502);assert.equal(failedTiming.steps.checkout_image_wait.failures,1);
 }else{
  // Ein Shopify-Bild, das noch nicht bereit wäre, hält den Klick nicht mehr auf: Es wird gar nicht erst angefragt.
  imagePending=true;const direct=await proxyRequest('/cart/data','GET',transferToken,hosted);assert.equal(direct.status,200,JSON.stringify(direct.data));
  assert.equal(timingEvents.find(e=>e.traceId===direct.headers['x-gravuru-timing-id']).steps.checkout_image_wait,undefined);
 }
 t.after(()=>{
  for(const route of ['acrylic-drafts','theme-cart','cart/data','cart/claim']){
   assert.ok(timingEvents.some(e=>e.route===route&&e.status>=200&&e.status<300),'missing successful '+route);
  }
  assert.ok(timingEvents.some(e=>e.route==='cart/data'&&e.status===401),'invalid proxy is timed too');
  const logged=JSON.stringify(timingEvents);
  for(const privateValue of [secret,token,draft.token,draft.id,transferToken,png,webp])assert.ok(!logged.includes(privateValue),'private value in timing log');
 });
 imagePending=false;const dataRead=await counted(()=>proxyRequest('/cart/data','GET',transferToken,hosted)),data=dataRead.result;assert.equal(data.status,200,JSON.stringify(data.data));const p=data.data;
 // Vor und nach dem Warten auf das Shopify-Bild je eine Lesephase mit Sitzungs- und Angebotsprüfung.
 if(images){assert.equal(dataRead.calls,4);assert.equal(dataRead.phases,2);}else assert.equal(dataRead.phases,1,'ohne Warten auf Shopify nur eine Lesephase');
 assert.equal(p.variantId,product.variants[3].shopifyVariantId.split('/').at(-1));assert.equal(p.quantity,2);assert.equal(p.totalCents,chosen.priceCents*2);
 assert.equal(p.properties._gravuru_config,prepared.data.configuration.id);assert.equal(p.properties._gravuru_rev,'1');assert.ok(p.properties.Gravurtext);
 assert.equal(p.preview,undefined,images?'with a READY Shopify file no PNG travels to the customer device':'das Bild bleibt am eigenen Server, kein PNG geht über das Gerät des Kunden an Shopify');assert.ok(JSON.stringify(p).length<64*1024,'handoff stays small');
 assert.ok(!JSON.stringify(p).includes(draft.token));assert.ok(!JSON.stringify(p).includes(token));assert.equal(new URL(p.properties._gravuru_bearbeiten).searchParams.get('line'),'theme');
 assert.equal(p.properties.Bearbeiten,undefined);
 assert.match(p.properties._gravuru_bild,/\/offer_[a-f0-9-]{36}\/[a-f0-9]{64}\.png$/);assert.ok(p.properties._gravuru_bild.startsWith(origin+'/gestaltung/'));
 if(images){assert.equal(sources.at(-1).source,firstSource);assert.equal(p.properties._gravuru_checkout_image,registeredImage);assert.equal(imageCalls,1);}
 else{assert.equal(p.properties._gravuru_checkout_image,undefined,'kein Kassenbild bei Shopify');assert.equal(sources.length,0);assert.equal(imageCalls,0);assert.equal(warmAccess,0);assert.ok(!JSON.stringify(p).includes('cdn.shopify.com'));}
 // #252 Versionswechsel: Tabs mit älterem, zwischengespeichertem Client fragen ohne Kennzeichen und erhalten weiter das PNG.
 const olderTab=await proxyRequest('/cart/data');assert.equal(olderTab.status,200);assert.equal(olderTab.data.preview.type,'image/png');assert.match(olderTab.data.preview.base64,/^iVBORw0KGgo/);
 assert.equal(olderTab.data.properties._gravuru_checkout_image,images?registeredImage:undefined);assert.deepEqual({...olderTab.data,preview:undefined},{...p,preview:undefined},'same handoff apart from the PNG');
 assert.equal((await proxyRequest('/cart/data','GET',transferToken,{'X-Gravuru-Cart-Preview':'other'})).data.preview.type,'image/png','only the exact capability drops the PNG');imageCalls=1;
 const editUrl=new URL(p.properties._gravuru_bearbeiten);
 assert.equal(editUrl.searchParams.get('ui'),'prio-r15','presentation survives the private handoff round trip');
 assert.deepEqual([...editUrl.searchParams.keys()].sort(),['config','line','product','rev','ui','variant']);
 // Shopify signs the generated edit URL again; all identity/revision guards remain in force.
 const reopenParams=new URLSearchParams(editUrl.searchParams);
 for(const [key,value]of signed())if(key!=='signature')reopenParams.set(key,value);
 reopenParams.set('signature',appProxySignature(reopenParams,secret));
 const reopened=await request(proxyPath+'/start?'+reopenParams);assert.equal(reopened.status,200);
 assert.ok(!reopened.body.includes(Buffer.from(prepared.data.editAccess.token)));
 assert.ok(!reopened.body.includes(Buffer.from(draft.token)));
 const frameUrl=reopened.body.toString().match(/data-gravuru-cart-edit="([^"]+)"/)[1].replaceAll('&amp;','&');
 const reopenedFragment=new URLSearchParams(new URL(frameUrl).hash.slice(1));
 assert.equal(reopenedFragment.get('embed'),'1');
 for(const key of ['ui','config','rev','line'])assert.equal(reopenedFragment.get(key),editUrl.searchParams.get(key));
 const reopenedSession={'X-Gravuru-Shop-Session':reopenedFragment.get('s')};
 const reopenedModel=await request('/api/shop-entry/model','GET',undefined,reopenedSession);
 assert.equal(reopenedModel.status,200);assert.deepEqual(reopenedModel.data.model.configuration,model.data.model.configuration);
 const revisionPath='/api/shop-entry/cart-configurations/'+p.configuration.id+'/';
 assert.equal((await request(revisionPath+'1','GET',undefined,reopenedSession)).status,404);
 const accessHeaders={...reopenedSession,'X-Gravuru-Cart-Edit':prepared.data.editAccess.token};
 const recovered=await request(revisionPath+'1','GET',undefined,accessHeaders);
 assert.equal(recovered.status,200,JSON.stringify(recovered.data?.error));
 assert.equal(recovered.data.draft.id,draft.id);
 assert.equal(recovered.data.draftToken,draft.token);
 assert.equal((await request(revisionPath+'2','GET',undefined,accessHeaders)).status,404);
 assert.equal((await request(revisionPath+'1/photos/kundenfoto','GET',undefined,accessHeaders)).status,404);
 assert.equal((await request(revisionPath+'1','GET',undefined,{...session,'X-Gravuru-Cart-Edit':prepared.data.editAccess.token})).status,404);
 assert.ok(!JSON.stringify(p).includes(prepared.data.editAccess.token),'the sealed editor access stays out of the shop payload');
 const legacyToken=new URLSearchParams(new URL(includedMotif.data.handoffUrl).hash.slice(1)).get('handoff');
 const legacyData=await proxyRequest('/cart/data','GET',legacyToken);assert.equal(legacyData.status,200);
 assert.equal(new URL(legacyData.data.properties._gravuru_bearbeiten).searchParams.get('ui'),null,'legacy callers remain on the legacy editor');
 const customerImagePath=new URL(p.properties._gravuru_bild).pathname;
 const customerImage=await request(customerImagePath);assert.equal(customerImage.status,200);assert.deepEqual(customerImage.body,storedCustomerPng);
 assert.equal((await request(customerImagePath,'HEAD')).body.length,0);
 assert.equal((await request(customerImagePath+'?original=1')).status,404);
 assert.equal((await request(customerImagePath.replace(/.$/,'x'))).status,404);
 assert.equal((await request(customerImagePath,'POST')).status,404);
 assert.equal((await request(customerImagePath,'GET',undefined,{Host:'evil.example'})).status,403);
 const other={key:'9:other',variant_id:9,product_id:9,quantity:1,properties:{Name:'Unverändert'},original_price:500,original_line_price:500,final_line_price:500};
 const themeCart={currency:'EUR',items:[other]};let adds=0,removes=0;
 const shopifyFunctionLine=(item,quantity=item.quantity)=>{
  const {properties}=item;
  return {id:item.key,quantity,merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/'+item.variant_id,
   product:{id:product.shopifyProductId,pricing:{jsonValue:pricing}}},
   configuration:{value:properties._gravuru_config},configRevision:{value:properties._gravuru_rev},offer:{value:properties._gravuru_offer},
   motifs:{value:properties._gravuru_motifs},uploads:{value:properties._gravuru_uploads},
   revision:{value:properties._gravuru_revision},designFile:{value:properties['Bearbeitbarer Entwurf']}};
 };
 const priceThemeLine=(item,quantity)=>{
  const cartLine=shopifyFunctionLine(item,quantity);
  const {operations}=cartTransformRun({presentmentCurrencyRate:'1',cart:{lines:[cartLine]}});
  const amount=operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount;
  const unit=Math.round(Number(amount)*100);
  return {...item,quantity,original_price:unit,original_line_price:unit*quantity,final_line_price:unit*quantity};
 };
 const shopFetch=async(url,o)=>{
  if(url==='/cart.js')return Response.json(structuredClone(themeCart));
  if(url==='/cart/add.js'){
   // Plain JSON text properties, no file upload. Mit `shopifyCartImages` ist _Entwurf das Shopify-Bild; im Standard gibt es
   // weder _Entwurf noch ein Shopify-Bild, die Zeile nennt nur das Bild am eigenen Server.
   adds++;assert.equal(typeof o.body,'string');assert.equal(o.headers['Content-Type'],'application/json');
   const body=JSON.parse(o.body);assert.equal(body.items.length,1);const item=body.items[0],props=item.properties;
   if(images){assert.equal(props._Entwurf,registeredImage);assert.equal(props._Entwurf,props._gravuru_checkout_image);}
   else{assert.ok(!Object.hasOwn(props,'_Entwurf'));assert.ok(!Object.hasOwn(props,'_gravuru_checkout_image'));assert.ok(props._gravuru_bild.startsWith(origin+'/gestaltung/'));assert.ok(!o.body.includes('cdn.shopify.com'));}
   assert.ok(o.body.length<64*1024,'cart write stays small');
   themeCart.items.push(priceThemeLine({key:'added-'+adds,variant_id:item.id,product_id:Number(p.productId),properties:props},item.quantity));
   return Response.json({items:themeCart.items.slice(-1)});
  }
  if(url==='/cart/change.js'){
   const change=JSON.parse(o.body),i=themeCart.items.findIndex(x=>x.key===change.id);assert.ok(i>0);
   if(change.quantity===0){removes++;themeCart.items.splice(i,1);}
   else themeCart.items[i]=priceThemeLine(themeCart.items[i],change.quantity);
   return Response.json(structuredClone(themeCart));
  }
  if(url==='/checkout'){
   const items=themeCart.items.slice(1);
   const {operations}=cartValidationsGenerateRun({buyerJourney:{step:'CHECKOUT_COMPLETION'},cart:{lines:items.map(item=>shopifyFunctionLine(item))}});
   assert.deepEqual(operations,[]);
   return Response.json({items:items.map(item=>priceThemeLine(item,item.quantity))});
  }
  assert.fail(url);
 };
 const claimReads=[];
 const bridge=token=>createThemeCartClient({fetchImpl:shopFetch,claim:async()=>{const claimed=await counted(()=>proxyRequest('/cart/claim','POST',token)),r=claimed.result;claimReads.push(claimed);assert.equal(r.status,200,JSON.stringify(r.data));}});
 const client=bridge(transferToken);await client.submit(p,{image:new Blob(['wrong later JPEG'],{type:'image/jpeg'})});await client.submit(p);
 assert.equal(adds,1);assert.equal(themeCart.items.length,2);assert.deepEqual(themeCart.items[0],other);
 assert.equal((await proxyRequest('/cart/claim','POST')).status,409,'persistent claim refuses a second upload');
 // Beim Claim liegen Sitzungsprüfung, Vorbereitung und Claim in einer Lesephase; alle drei Prüfungen laufen.
 assert.ok(claimReads.length>=1);for(const claimed of claimReads){assert.equal(claimed.calls,3);assert.equal(claimed.phases,1);}
 const opened=await request('/api/shop-entry/cart-configurations/'+p.configuration.id+'/1',undefined,undefined,headers);
 assert.equal(opened.status,200);assert.equal(opened.data.draft.id,draft.id);assert.equal(opened.data.quantity,2);
 const photo=await request('/api/shop-entry/cart-configurations/'+p.configuration.id+'/1/photos/kundenfoto',undefined,undefined,headers);assert.deepEqual(photo.body,Buffer.from(png,'base64'));
 // Edit the same draft; only its own prior cart line is replaced.
 const abandoned=await request('/api/shop-entry/acrylic-drafts/'+draft.id,'POST',{input:{...input,quantity:3},expectedRevision:1},headers);assert.equal(abandoned.status,200);
 const abandonedTransfer=await request('/api/shop-entry/theme-cart','POST',{draftId:draft.id,expectedRevision:2,quantity:3,configId:p.configuration.id,cartLineId:'theme',cartRevision:1},headers);assert.equal(abandonedTransfer.status,200);
 const edited=await request('/api/shop-entry/acrylic-drafts/'+draft.id,'POST',{input:{...input,quantity:3},expectedRevision:2},headers);assert.equal(edited.status,200,JSON.stringify(edited.data));
 const edit=await request('/api/shop-entry/theme-cart','POST',{draftId:draft.id,expectedRevision:3,quantity:3,configId:p.configuration.id,cartLineId:'theme',cartRevision:1,presentation:'prio-r15'},headers);assert.equal(edit.status,200,JSON.stringify(edit.data));
 const editToken=new URLSearchParams(new URL(edit.data.handoffUrl).hash.slice(1)).get('handoff'),editData=await proxyRequest('/cart/data','GET',editToken,hosted);assert.equal(editData.status,200);
 assert.equal(editData.data.previousRevision,1);assert.equal(editData.data.configuration.rev,3);
 assert.equal(new URL(editData.data.properties._gravuru_bearbeiten).searchParams.get('ui'),'prio-r15','editing keeps the approved presentation for the next return');
 await bridge(editToken).submit(editData.data);assert.equal(adds,2);assert.equal(removes,1);assert.equal(themeCart.items.length,2);assert.deepEqual(themeCart.items[0],other);
 // Signed order intake still binds precisely to the immutable edited design.
 const item=themeCart.items[1],paid={id:123456,test:true,financial_status:'paid',currency:'EUR',customer:{id:42},line_items:[{id:9001,product_id:Number(p.productId),variant_id:item.variant_id,quantity:3,price:euro(item.original_price),properties:Object.entries(item.properties).map(([name,value])=>({name,value}))}]};
 const raw=Buffer.from(JSON.stringify(paid)),received=w.orderIntake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'evt-theme-cart-0001'},{shopDomain,secret,apiVersion:'2026-07'});
 assert.equal(received.errors.length,0,JSON.stringify(received.errors));assert.equal(received.lines.length,1);assert.equal(received.lines[0].snapshotId,edited.data.snapshotId);assert.deepEqual(received.lines[0].configuration,{id:p.configuration.id,rev:3});assert.equal(received.lines[0].productionReady,false);

 await t.test('F01 changes quantity in the theme and accepts only the exact checkout tier at orders/paid',async()=>{
  themeCart.items.splice(1);
  const started=await request('/api/shop-entry/acrylic-drafts','POST',{input:{...input,options:staffelVariant.options,quantity:1}},session);
  assert.equal(started.status,201,JSON.stringify(started.data));
  const draftHeaders={...session,'X-Gravuru-Draft':started.data.token};
  const requestInput=shopCartRequest({saved:{draftId:started.data.id,revision:1},quantity:1,cartMode:'theme',presentation:fragment.get('ui')});
  const handoff=await entryClient.submitThemeCart(requestInput,{draftToken:started.data.token});
  const handoffToken=new URLSearchParams(new URL(handoff.handoffUrl).hash.slice(1)).get('handoff');
  const transfer=await proxyRequest('/cart/data','GET',handoffToken,hosted);
  assert.equal(transfer.status,200,JSON.stringify(transfer.data));
  assert.equal(transfer.data.unitCents,1999);
  await bridge(handoffToken).submit(transfer.data);
  const before=themeCart.items[1];
  assert.equal(before.quantity,1);
  const action=await shopFetch('/cart/change.js',{body:JSON.stringify({id:before.key,quantity:4})});
  assert.equal((await action.json()).items[1].final_line_price,7596);
  const checkout=(await (await shopFetch('/checkout')).json()).items[0];
  assert.equal(checkout.quantity,4);
  assert.equal(checkout.original_price,1899);
  assert.deepEqual(checkout.properties,before.properties,'the theme keeps the original offer and design');
  const line={id:9002,product_id:checkout.product_id,variant_id:checkout.variant_id,quantity:checkout.quantity,price:euro(checkout.original_price),
   properties:Object.entries(checkout.properties).map(([name,value])=>({name,value}))};
  const payment={id:123457,test:true,financial_status:'paid',currency:'EUR',line_items:[line]};
  const deliver=(event,payload=payment)=>request(ORDER_WEBHOOK_PATH,'POST',payload,{
   'x-shopify-hmac-sha256':createHmac('sha256',secret).update(JSON.stringify(payload)).digest('base64'),
   'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':event});
  const invalidChanges=[{price:'18.98'},{price:'19.00'},{price:'19.99'},{quantity:0},{quantity:100},
   {properties:line.properties.map(p=>p.name==='_gravuru_motifs'?{...p,value:'1'}:p)}];
  for(const [i,change] of invalidChanges.entries()){
   const bad=await deliver('evt-f01-rejected-'+i,{...payment,line_items:[{...line,...change}]});
   assert.equal(bad.status,200);
   assert.equal(bad.data.rejectedLines,1);
   assert.equal(w.orderIntake.forSnapshot(started.data.snapshotId).length,0);
  }
  const accepted=await deliver('evt-f01-exact-tier');
  assert.equal(accepted.status,200);
  assert.deepEqual(accepted.data,{accepted:true,duplicate:false,matchedLines:1,rejectedLines:0,testOnly:true});
  const [ordered]=w.orderIntake.forSnapshot(started.data.snapshotId);
  assert.deepEqual([ordered.quantity,ordered.unitCents,ordered.totalCents],[4,1899,7596]);
  assert.deepEqual(ordered.configuration,transfer.data.configuration);
  assert.equal(ordered.selection.price.quantity,1);
  assert.equal(ordered.productionReady,false);
  const original=await request('/api/shop-entry/cart-configurations/'+ordered.configuration.id+'/1',undefined,undefined,draftHeaders);
  assert.equal(original.status,200);
  assert.equal(original.data.quantity,1);
  assert.equal((await deliver('evt-f01-exact-tier')).data.duplicate,true);
  assert.equal((await deliver('evt-f01-changed-retry',{...payment,line_items:[{...line,quantity:3}]})).data.rejectedLines,1);
  assert.deepEqual(w.orderIntake.forSnapshot(started.data.snapshotId),[ordered]);
 });
 now+=31*60*1000;assert.deepEqual((await request(customerImagePath)).body,storedCustomerPng,'immutable image survives draft changes, payment and expired handoff');assert.equal((await proxyRequest('/cart/data','GET',editToken)).status,403);
 documentReadsByMode[cache]=documentReads;
 if(cache)assert.ok(documentReadsByMode.true<=documentReadsByMode.false*0.6,'mit Antwortspeicher höchstens 60 % der Dokumentlesungen: '+JSON.stringify(documentReadsByMode));
});
