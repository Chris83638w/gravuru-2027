import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {createHmac,randomUUID} from 'node:crypto';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {createBoundTestCart} from './bound-test-cart.mjs';
import {createShopEntry} from './shop-entry.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {crossStoreOrders} from './cross-store-orders.mjs';

// Durchlauf des öffentlichen Einstiegs mit echter Werkstatt: Start über App-Proxy-Signatur → Modell →
// Gestaltung als privater Prüfstand → Warenkorb über den bestehenden bound-test-cart (synthetischer Storefront)
// → Bestellnachricht bindet die Position an genau diesen Prüfstand. Shopify-IDs stammen aus der 7×2-Übergabe;
// das Produkt ist das mitgelieferte native Mustermodell (der Katalogimport ist kein Teil dieser Tests).
const mapping=JSON.parse(fs.readFileSync(new URL('../../docs/handoffs/2026-10-22-shopify-7x2-hauptprodukte.json',import.meta.url),'utf8'));
const origin='https://app.example',shopDomain=mapping.shopDomain,secret='synthetic-app-secret-value-7x2',proxyPath='/apps/konfigurator';
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
const euro=c=>(c/100).toFixed(2);

// Auftrag #265 (Chris 20.11.2026): derselbe Durchlauf auch mit Antwortspeicher. Dann nutzt der Entwurf das gehaltene Modell und
// jede Anfrage die gemerkte Art der Freigabe; Ablauf, Preise, Prüfstand und Bestellbindung müssen dieselben bleiben.
for(const cache of [false,true])test('customer entry: start, model, saved design, real cart handoff and webhook binding of the order line'+(cache?' (with model response cache)':''),async t=>{
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
 let now=1_800_000_000_000;const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,clock:()=>now,modelSlimmer:null,...(cache?{modelResponseCache:true}:{})});
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
 const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:structuredClone(source.objects),options:structuredClone(chosen.options),quantity:2,media:[{id:'kundenfoto',original:png}],preview:png};
 Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'kundenfoto',uxUploadKind:'photo'});
 const created=await request('/api/shop-entry/acrylic-drafts','POST',{input},session);assert.equal(created.status,201,JSON.stringify(created.data));
 const draft=created.data;assert.match(draft.id,/^adraft_/);assert.match(draft.token,/^[a-f0-9]{64}$/);assert.equal(draft.revision,1);
 const manifest=w.customerDrafts.review(draft.snapshotId).manifest;assert.deepEqual(manifest.selection.options,chosen.options);assert.equal(manifest.selection.price.quantity,2);assert.equal(manifest.productionReady,false);
 // Ohne Entwurfstoken ist der Entwurf nicht fortschreibbar; fremder Produktstand wird abgewiesen.
 assert.equal((await request('/api/shop-entry/acrylic-drafts/'+draft.id,'POST',{input,expectedRevision:1},session)).status,404);
 assert.equal((await request('/api/shop-entry/acrylic-drafts','POST',{input:{...input,productRevision:record.revision+1}},session)).status,409);
 // 4. Warenkorb: Menge wie gesichert, echte Variante der gewählten Ausführung, Preis vom Shop gegen den Server geprüft.
 const headers={...session,'X-Gravuru-Draft':draft.token};
 assert.equal((await request('/api/shop-entry/cart','POST',{draftId:draft.id,expectedRevision:1,quantity:1},headers)).status,409,'Menge muss zum gesicherten Stand passen');
 const cartResult=await request('/api/shop-entry/cart','POST',{draftId:draft.id,expectedRevision:1,quantity:2},headers);
 assert.equal(cartResult.status,200,JSON.stringify(cartResult.data));
 const expectedVariant=product.variants[3].shopifyVariantId;
 assert.equal(cartResult.data.shopifyVariantId,expectedVariant);assert.equal(cartResult.data.quantity,2);assert.equal(cartResult.data.unitCents,chosen.priceCents);assert.equal(cartResult.data.totalCents,chosen.priceCents*2);
 assert.equal(cartResult.data.checkoutUrl,'https://'+shopDomain+'/checkouts/cn/synthetic');assert.match(cartResult.data.configuration.id,/^konfig_/);assert.equal(cartResult.data.configuration.rev,1);assert.equal(cartResult.data.productionReady,false);
 assert.equal(sent.length,1);assert.equal(sent[0].merchandiseId,expectedVariant);assert.equal(sent[0].quantity,2);
 const attribute=name=>sent[0].attributes.find(a=>a.key===name)?.value;
 assert.match(attribute('_gravuru_offer'),/^[a-f0-9]{64}$/);assert.equal(attribute('_gravuru_config'),cartResult.data.configuration.id);assert.equal(attribute('_gravuru_rev'),'1');
 assert.ok(!JSON.stringify(sent[0]).includes(draft.token),'Entwurfstoken gelangt nie in den Warenkorb');
 // Wiederholter Klick derselben Sicherung: dieselbe Übergabe, kein zweiter Shop-Aufruf.
 const repeat=await request('/api/shop-entry/cart','POST',{draftId:draft.id,expectedRevision:1,quantity:2},headers);assert.equal(repeat.status,200);assert.equal(repeat.data.duplicate,true);assert.equal(sent.length,1);
 // 5. Bearbeiten aus dem Warenkorb (K8): Revision nur mit Entwurfstoken dieses Produkts lesbar.
 const reopened=await request('/api/shop-entry/cart-configurations/'+cartResult.data.configuration.id+'/1',undefined,undefined,headers);
 assert.equal(reopened.status,200,JSON.stringify(reopened.data));assert.equal(reopened.data.editorKind,'native');assert.equal(reopened.data.quantity,2);assert.equal(reopened.data.configuration.cartLineId,cartResult.data.lineId);assert.equal(reopened.data.draft.id,draft.id);
 assert.equal((await request('/api/shop-entry/cart-configurations/'+cartResult.data.configuration.id+'/1',undefined,undefined,session)).status,404);
 const photo=await request('/api/shop-entry/cart-configurations/'+cartResult.data.configuration.id+'/1/photos/kundenfoto',undefined,undefined,headers);assert.equal(photo.status,200);assert.equal(photo.headers['content-type'],'image/png');assert.deepEqual(photo.body,Buffer.from(png,'base64'));
 // Neuer Stand ersetzt die Zeile statt sie zu verdoppeln.
 const edited=await request('/api/shop-entry/acrylic-drafts/'+draft.id,'POST',{input:{...input,quantity:3},expectedRevision:1},headers);assert.equal(edited.status,200,JSON.stringify(edited.data));
 const replaced=await request('/api/shop-entry/cart','POST',{draftId:draft.id,expectedRevision:2,quantity:3,configId:cartResult.data.configuration.id,cartLineId:cartResult.data.lineId},headers);
 assert.equal(replaced.status,200,JSON.stringify(replaced.data));assert.equal(replaced.data.mode,'update');assert.equal(replaced.data.configuration.rev,2);assert.equal(replaced.data.quantity,3);assert.equal(cart.lines.length,1);assert.equal(cart.lines[0].quantity,3);
 // 6. Bestellnachricht (orders/paid, Testbestellung) bindet die Position an den zuletzt gesicherten Prüfstand.
 const line=cart.lines[0],value=name=>line.attributes.find(a=>a.key===name).value;
 const payload={id:13745774461308,test:true,financial_status:'paid',currency:'EUR',customer:{id:42},line_items:[{id:9001,product_id:Number(product.shopifyProductId.split('/').at(-1)),variant_id:Number(expectedVariant.split('/').at(-1)),quantity:3,price:euro(chosen.priceCents),properties:line.attributes.map(a=>({name:a.key,value:a.value}))}]};
 const raw=Buffer.from(JSON.stringify(payload)),webhook={shopDomain,secret,apiVersion:'2026-07'};
 const result=w.orderIntake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'evt-7x2-0001'},webhook);
 assert.equal(result.lines.length,1);assert.equal(result.errors.length,0);
 const order=result.lines[0];assert.equal(order.snapshotId,edited.data.snapshotId);assert.notEqual(order.snapshotId,draft.snapshotId);assert.equal(order.quantity,3);assert.equal(order.unitCents,chosen.priceCents);assert.equal(order.variantId,expectedVariant.split('/').at(-1));
 assert.deepEqual(order.configuration,{id:cartResult.data.configuration.id,rev:2});assert.equal(order.productionReady,false);assert.equal(order.product.id,record.id);assert.equal(order.product.revision,record.revision);
 assert.equal(w.orderIntake.forSnapshot(edited.data.snapshotId).length,1);
 // Eine Position mit falschem Preis oder ohne Entwurfsbezug wird nur als Positionsfehler abgelegt.
 const wrong={...payload,id:13745774461309,line_items:[{...payload.line_items[0],id:9002,price:euro(chosen.priceCents-100)}]},wrongRaw=Buffer.from(JSON.stringify(wrong));
 const rejected=w.orderIntake.receive(wrongRaw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(wrongRaw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'evt-7x2-0002'},webhook);
 assert.equal(rejected.lines.length,0);assert.equal(rejected.errors.length,1);assert.match(rejected.errors[0].intakeError,/Preis/);
 // 6b. #265 Stufe B, Lieferung 1 (ENTSCHEIDUNGEN 3.48/3.51/3.53): Mit dem Bestelleingang steht genau ein Ausgabeauftrag in der
 // Warteschlange. Er startet nicht im Bestelleingang selbst; der Arbeiter der Werkstatt übernimmt ihn danach.
 const deliver=(data,eventId)=>{const bytes=Buffer.from(JSON.stringify(data));return w.orderIntake.receive(bytes,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(bytes).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':eventId},webhook);};
 const outputs=id=>w.exportJobs.forSnapshot(id);
 assert.equal(outputs(order.snapshotId).total,1);const queued=outputs(order.snapshotId).jobs[0];assert.equal(queued.status,'queued','kein Start innerhalb des Bestelleingangs');
 assert.deepEqual(w.orderOutputState(order),{state:'wird erstellt',reason:null,jobId:queued.id});
 // Erneute Zustellung desselben Ereignisses und eine zweite Zustellung: kein zweiter Auftrag.
 assert.equal(deliver(payload,'evt-7x2-0001').duplicate,true);assert.equal(deliver(payload,'evt-7x2-0003').lines[0].id,order.id);
 assert.equal(outputs(order.snapshotId).total,1);assert.equal(w.exportJobs.list().length,1);
 // Preisabweichung (oben abgelehnt): kein Auftrag, „bitte prüfen“ mit Grund; der Prüfstand des Angebots ist gemerkt.
 assert.equal(rejected.errors[0].snapshotId,order.snapshotId);
 const overview=()=>crossStoreOrders([store],{shopDomain,enabled:true});
 assert.deepEqual(overview().errors.map(e=>[e.lineId,e.outputState,e.snapshotId]),[['9002',{state:'bitte prüfen',reason:rejected.errors[0].intakeError,jobId:null},order.snapshotId]]);
 assert.deepEqual(overview().outputStates,{['acryl:'+order.id]:{state:'wird erstellt',reason:null,jobId:queued.id}});
 if(!cache){
  // Werkstatt-API wie im Büro (Händlersitzung + CSRF), um den Weg von Hand wirklich zu gehen.
  const api=http.createServer((req,res)=>w.handle(req,res,new URL(req.url,origin)));api.listen(0,'127.0.0.1');await once(api,'listening');
  t.after(async()=>{api.closeAllConnections();await new Promise(r=>api.close(r));});
  const bearer=()=>{const at=Math.floor(Date.now()/1000),input=[{alg:'HS256',typ:'JWT'},{aud:'synthetic-client',dest:'https://'+shopDomain,sub:'123',iss:'https://'+shopDomain+'/admin',exp:at+60,nbf:at,iat:at,jti:randomUUID()}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return 'Bearer '+input+'.'+createHmac('sha256',secret).update(input).digest('base64url');};
  const office=async(pathname,data,raw=false)=>{const r=await fetch('http://127.0.0.1:'+api.address().port+pathname,{method:data?'POST':'GET',headers:{authorization:bearer(),...(data?{'Content-Type':'application/json','X-Gravuru-CSRF':csrf}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:raw?Buffer.from(await r.arrayBuffer()):await r.json()};};
  let csrf='';csrf=(await office('/api/workshop/session')).data.csrfToken;assert.match(csrf,/^[a-f0-9]{64}$/);
  // Der vorhandene Arbeiter (1-s-Takt) baut die Datei; gemessen wird auch, wie lange der Prozess dabei am Stück blockiert.
  let longestBlockMs=0,tick=performance.now();const watch=setInterval(()=>{const at=performance.now();longestBlockMs=Math.max(longestBlockMs,at-tick-20);tick=at;},20);
  const started=performance.now(),built=await w.exportWorker.wait(queued.id);clearInterval(watch);
  t.diagnostic('#265 Bau lokal: '+Math.round(performance.now()-started)+' ms ab Bestelleingang (inkl. bis zu 1 s Takt), längste Blockade des Prozesses '+Math.round(longestBlockMs)+' ms');
  assert.equal(built.status,'completed');assert.equal(built.attempts,1);assert.deepEqual(w.orderOutputState(order),{state:'fertig',reason:null,jobId:queued.id});
  // Der Weg von Hand: Knopf „Ausgabe“ mit unverändertem Formular. Die Vorgaben stehen im Formular der Prüfstandsseite; ein
  // Fertigungsprofil des Prüfstands belegt sie vor (ui/review-snapshots-ui.mjs). Gesendet wird genau das, was der Knopf sendet.
  const saved=w.customerDrafts.review(order.snapshotId).manifest,engraving=saved.product.method==='engraving',page=fs.readFileSync(new URL('./ui/review-snapshots.html',import.meta.url),'utf8');
  const form=Object.fromEntries([...page.match(new RegExp('<form id="'+(engraving?'engraving':'print')+'-form">.*?</form>','s'))[0].matchAll(/<select name="([^"]+)"[^>]*><option value="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  for(const [key,value] of Object.entries(saved.productionProfile?.document.method===saved.product.method?saved.productionProfile.document.output:{}))if(key in form)form[key]=String(value);
  if(!engraving&&(form.bleedMm==='0'||form.white==='none'))form.whiteBleedMm='0';
  const settings=engraving?{mode:form.mode,dpi:Number(form.dpi)}:{profile:form.profile,dpi:Number(form.dpi),white:form.white,bleedMm:Number(form.bleedMm),whiteBleedMm:Number(form.whiteBleedMm)};
  const manual=await office('/api/workshop/export-jobs',{snapshotId:order.snapshotId,settings});
  assert.equal(manual.status,200,JSON.stringify(manual.data));assert.equal(manual.data.id,queued.id,'der Knopf trifft denselben Auftrag');assert.equal(manual.data.status,'completed');
  assert.equal(manual.data.recipe,queued.recipe);assert.equal(manual.data.recipeKey,queued.recipeKey);assert.deepEqual(manual.data.settings,queued.settings);assert.deepEqual(manual.data.clientSettingsIgnored,[]);
  assert.equal(outputs(order.snapshotId).total,1);
  // Dieselbe Datei: der Download des Wegs von Hand ist die gesicherte Ausgabe des automatischen Auftrags.
  const pdf=await office('/api/workshop/export-jobs/'+queued.id+'/download',{format:'pdf'},true);assert.equal(pdf.status,200);
  assert.equal(pdf.data.subarray(0,5).toString(),'%PDF-');assert.deepEqual(pdf.data,w.customerDrafts.printProof(order.snapshotId,queued.recipeKey).pdf);
  // Das Öffnen der Ausgaben zeigt das Kennzeichen und legt nichts doppelt an.
  const opened=await office('/api/workshop/orders/'+order.id+'/outputs');assert.equal(opened.status,200);assert.equal(opened.data.total,1);assert.deepEqual(opened.data.outputState,{state:'fertig',reason:null,jobId:queued.id});
  // Position ohne Auftrag (Bestellung vor dem Aufspielen, Absturz zwischen Commit und Einreihen): hier kommt der Eingang in einer
  // fremden, noch offenen Transaktion an, also wird nichts eingereiht. Das Öffnen der Ausgaben holt den Auftrag nach.
  const variantId=expectedVariant.split('/').at(-1),other=w.orderIntake.offer({bindingId:bound.bindings.find(b=>b.variantId===variantId).id,snapshotId:draft.snapshotId,quantity:2});
  const lateOrder={...payload,id:13745774461310,line_items:[{...payload.line_items[0],id:9003,quantity:2,properties:[other.property]}]};
  const late=w.orderIntake.withBindingTransaction(()=>deliver(lateOrder,'evt-7x2-0004')).lines[0];
  assert.equal(late.snapshotId,draft.snapshotId);assert.equal(outputs(late.snapshotId).total,0);
  assert.equal(w.orderOutputState(late).state,'bitte prüfen');assert.match(w.orderOutputState(late).reason,/noch keinen Ausgabeauftrag/);
  // Nicht baubare Datei: Der Auftrag wird nachgeholt, lässt sich aber nicht bauen (hier: Python-Arbeiter fehlt) → „bitte prüfen“ mit Grund.
  const python=process.env.GRAVURU_PYTHON,restorePython=()=>{if(python===undefined)delete process.env.GRAVURU_PYTHON;else process.env.GRAVURU_PYTHON=python;};
  t.after(restorePython);process.env.GRAVURU_PYTHON=path.join(dir,'kein-python');
  const reopened=await office('/api/workshop/orders/'+late.id+'/outputs');assert.equal(reopened.data.total,1);assert.equal(reopened.data.outputState.state,'wird erstellt');
  assert.equal((await office('/api/workshop/orders/'+late.id+'/outputs')).data.total,1,'wiederholtes Öffnen legt keinen zweiten Auftrag an');
  const failed=reopened.data.jobs[0];await assert.rejects(w.exportWorker.wait(failed.id),{status:422});restorePython();
  const mark=w.orderOutputState(late);assert.equal(mark.state,'bitte prüfen');assert.equal(mark.jobId,failed.id);assert.equal(mark.reason,w.exportJobs.get(failed.id).error);assert.match(mark.reason,/nicht verfügbar/);
  assert.deepEqual(overview().outputStates,{['acryl:'+order.id]:{state:'fertig',reason:null,jobId:queued.id},['acryl:'+late.id]:mark});
  // Ohne lesbaren Prüfstand lässt sich kein Auftrag anlegen: „bitte prüfen“ mit dem Grund, kein Absturz der Übersicht.
  assert.deepEqual(w.orderOutputState({snapshotId:'proof_unbekannt'}),{state:'bitte prüfen',reason:'Prüfstand nicht gefunden.',jobId:null});
 }
 // 7. Nach Ablauf der Sitzung endet der Zugriff; der gesicherte Prüfstand bleibt unverändert erhalten.
 now+=4*60*60*1000+1;
 assert.equal((await request('/api/shop-entry/model',undefined,undefined,session)).status,403);
 assert.deepEqual(w.customerDrafts.review(edited.data.snapshotId).manifest.selection.options,chosen.options);
});
