import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {createHmac,randomBytes} from 'node:crypto';import {once} from 'node:events';
import {createOrderIntake,verifyPaidWebhook} from './order-intake.mjs';import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {crossStoreOrders} from './cross-store-orders.mjs';
const config={shopDomain:'gravuru-synthetic.myshopify.com',apiVersion:'2026-07',secret:randomBytes(32).toString('hex')};
const sign=(payload,eventId='test-event-1234',overrides={})=>{const raw=Buffer.from(typeof payload==='string'?payload:JSON.stringify(payload));return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':config.shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':eventId,...overrides}};};
const order=token=>({id:101,test:true,financial_status:'paid',currency:'EUR',cancelled_at:null,customer:{email:'private-fixture@example.invalid'},line_items:[{id:201,variant_id:301,quantity:2,price:'29.99',properties:[{name:'_gravuru_offer',value:token}]}]});
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-order-')),filename=path.join(dir,'private.sqlite');let db=new DatabaseSync(filename),now=Date.now(),m={id:'proof_synthetic',packageSha256:'a'.repeat(64),product:{id:'cfg_synthetic',revision:2,name:'Synthetisches Schild',basePriceCents:2999,currency:'EUR'},productionProfile:{id:'mfg_synthetic',revision:3,sha256:'b'.repeat(64)}};const create=()=>createOrderIntake({database:db,snapshot:id=>{assert.equal(id,m.id);return structuredClone(m);},clock:()=>now});let intake=create();const record={id:m.product.id,revision:2,status:'draft',document:{schema:'gravuru-form-product/v1',kind:'product',basePriceCents:2999,designs:[{}]}};const binding=intake.bind({shopDomain:config.shopDomain,variantId:'301',record});const offer=()=>intake.offer({bindingId:binding.id,snapshotId:m.id,quantity:2});t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},get intake(){return intake;},offer,binding,record,changeTime:delta=>now+=delta,changeHash:()=>m.packageSha256='f'.repeat(64),reopen:()=>{db.close();db=new DatabaseSync(filename);intake=create();}};}
const receive=(intake,message)=>intake.receive(message.raw,message.headers,config);
test('F16: an unreadable order document or E3 record is isolated in the cross-store overview',t=>{
 const f=setup(t),good=f.offer(),accepted=receive(f.intake,sign(order(good.property.value))).lines[0];
 const db=f.db,shop=config.shopDomain,at='2026-11-16T12:00:00Z';
 db.prepare('INSERT INTO form_order_lines(id,shop,order_id,line_id,offer_id,document,created_at) VALUES(?,?,?,?,?,?,?)')
  .run('unreadable',shop,'102','202','separate-offer','{"privateFixture":',at);
 db.prepare('INSERT INTO form_order_line_errors(id,shop,order_id,line_id,event_id,document,created_at) VALUES(?,?,?,?,?,?,?)')
  .run('unreadable-error',shop,'103','203','bad-event','{"privateFixture":',at);
 const store={storeId:'acryl',apiPrefix:'/api/workshop/acryl/',workshop:{orderIntake:f.intake}};
 const result=crossStoreOrders([store],{shopDomain:shop,enabled:true});
 assert.deepEqual(result.orders.map(line=>line.id),[accepted.id]);
 assert.deepEqual(result.errors.map(error=>[error.orderId,error.lineId,error.overviewReadError]),
  [['102','202',true],['103','203',true]]);
 assert.ok(!JSON.stringify(result).includes('privateFixture'));
 assert.throws(()=>f.intake.list(),SyntaxError);
 assert.throws(()=>f.intake.errors(),SyntaxError);
});
test('cart offer resolution uses saved values and refuses changed snapshot hashes',t=>{
 const f=setup(t),o=f.offer(),input={offerId:o.id,offerToken:o.property.value,snapshotId:'proof_synthetic',shopDomain:config.shopDomain};
 assert.deepEqual(f.intake.resolveCartOffer(input),o);
 f.reopen();assert.deepEqual(f.intake.resolveCartOffer(input),o);
 f.changeHash();assert.throws(()=>f.intake.resolveCartOffer(input),/stimmt nicht/);
});
test('cart offer capability cannot be combined with another offer ID or snapshot',t=>{
 const f=setup(t),a=f.offer(),b=f.offer(),input={offerId:a.id,offerToken:a.property.value,snapshotId:'proof_synthetic',shopDomain:config.shopDomain};
 for(const patch of [{offerId:b.id},{offerToken:b.property.value},{snapshotId:'proof_other'},{shopDomain:'other.myshopify.com'}])assert.throws(()=>f.intake.resolveCartOffer({...input,...patch}),e=>e.status===404);
});
test('webhook authenticates exact raw bytes and rejects forged signatures, wrong shops/versions/topics, unpaid and live orders',()=>{
 const payload=order('a'.repeat(64)),s=sign(payload);assert.equal(verifyPaidWebhook(s.raw,s.headers,config).orderId,'101');assert.throws(()=>verifyPaidWebhook(s.raw,s.headers,null),/nicht eingerichtet/);
 assert.throws(()=>verifyPaidWebhook(Buffer.concat([s.raw,Buffer.from(' ')]),s.headers,config),/nicht bestätigt/);
 for(const headers of [{'x-shopify-hmac-sha256':'x'},{'x-shopify-shop-domain':'other.myshopify.com'},{'x-shopify-api-version':'2026-10'},{'x-shopify-topic':'orders/create'},{'x-shopify-webhook-id':['a','b']}]){const a=sign(payload,'test-event-2345',headers);assert.throws(()=>verifyPaidWebhook(a.raw,a.headers,config));}
 for(const changed of [{test:false},{financial_status:'pending'},{currency:'USD'},{cancelled_at:'2026-10-05'},{id:9007199254740992}]){const a=sign({...payload,...changed});assert.throws(()=>verifyPaidWebhook(a.raw,a.headers,config));}
});
test('paid test lines are immutable, deduplicated across deliveries/restart and cannot reuse an offer for another order',t=>{
 const f=setup(t),o=f.offer(),payload=order(o.property.value),signed=sign(payload),first=receive(f.intake,signed);assert.equal(first.lines[0].totalCents,5998);assert.equal(first.lines[0].product.revision,2);assert.equal(first.lines[0].productionProfile.revision,3);assert.equal(first.lines[0].productionReady,false);assert.equal(first.lines[0].customerDownloadAllowed,false);assert.equal(f.intake.status(first.lines[0].id).productionReady,false);assert.equal(f.intake.status(first.lines[0].id).production.state,'eingegangen');assert.deepEqual(f.intake.status(first.lines[0].id).production.checks,{total:0,passed:0,failed:0,ok:false});assert.equal(receive(f.intake,signed).duplicate,true);assert.deepEqual(receive(f.intake,sign(payload,'test-event-second')).lines,first.lines);assert.equal(f.intake.list().length,1);
 assert.deepEqual(f.intake.forSnapshot('proof_synthetic'),first.lines);assert.deepEqual(f.intake.forSnapshot('proof_other'),[]);assert.deepEqual(f.intake.forSnapshot(undefined),[]);
 const reused=receive(f.intake,sign({...payload,id:102},'test-event-third'));assert.equal(reused.lines.length,0);assert.equal(reused.errors.length,1);assert.match(reused.errors[0].intakeError,/bereits/);assert.throws(()=>receive(f.intake,sign({...payload,id:102})),/anderem Inhalt/);assert.throws(()=>f.db.exec("UPDATE form_order_lines SET document='{}'"),/immutable/);
 const rows=JSON.stringify(f.db.prepare('SELECT * FROM form_order_lines').all())+JSON.stringify(f.db.prepare('SELECT * FROM form_order_offers').all());assert.ok(!rows.includes(o.property.value));assert.ok(!rows.includes(payload.customer.email));assert.ok(!rows.includes(config.secret));f.reopen();assert.deepEqual(f.intake.list(),first.lines);assert.equal(receive(f.intake,signed).duplicate,true);
});
test('E3: an invalid position is rejected alone with status „fehler“; no order-wide refusal, no partial rows',t=>{
 const f=setup(t),o=f.offer(),payload=order(o.property.value);let n=0;
 for(const change of [{variant_id:999},{price:'0.01'},{quantity:1},{price:29.99},{properties:[]},{properties:[o.property,o.property]}]){
  const p=structuredClone(payload);Object.assign(p.line_items[0],change);const r=receive(f.intake,sign(p,'test-event-change-'+(++n)));
  assert.equal(r.duplicate,false);assert.equal(r.lines.length,0);assert.equal(r.errors.length,1);assert.equal(r.errors[0].status,'fehler');assert.equal(r.errors[0].lineId,'201');assert.ok(r.errors[0].intakeError);
  assert.equal(f.intake.list().length,0);assert.equal(f.intake.errors().length,1,'overview shows the latest reason per shop line');assert.equal(f.intake.errors()[0].intakeError,r.errors[0].intakeError);
 }
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_events').get().n,n,'every delivery is acknowledged once');
 f.changeHash();assert.match(receive(f.intake,sign(payload,'test-event-hash')).errors[0].intakeError,/verändert/);
 const b=f.offer();f.changeTime(8*86400000);const late=receive(f.intake,sign({...order(b.property.value),id:103},'test-event-late'));assert.equal(late.lines.length,0);assert.match(late.errors[0].intakeError,/abgelaufen/);
 assert.throws(()=>f.db.exec("UPDATE form_order_line_errors SET document='{}'"),/immutable/);
 const rows=JSON.stringify(f.db.prepare('SELECT * FROM form_order_line_errors').all());assert.ok(!rows.includes(o.property.value));assert.ok(!rows.includes(payload.customer.email));
});
test('E3: two positions, one broken – the valid one is admitted, the broken one gets „fehler“ with reason; a second delivery changes nothing',t=>{
 const f=setup(t),o=f.offer(),payload=order(o.property.value);
 payload.line_items.push({id:202,variant_id:301,quantity:2,price:'29.99',properties:[{name:'_gravuru_offer',value:'f'.repeat(64)}]});
 const first=receive(f.intake,sign(payload));
 assert.equal(first.duplicate,false);assert.equal(first.lines.length,1);assert.equal(first.lines[0].lineId,'201');assert.equal(first.lines[0].totalCents,5998);
 assert.equal(first.errors.length,1);assert.equal(first.errors[0].lineId,'202');assert.equal(first.errors[0].status,'fehler');assert.equal(first.errors[0].intakeError,'Entwurfszuordnung nicht gefunden.');assert.equal(first.errors[0].variantId,'301');assert.equal(first.errors[0].quantity,2);assert.equal(first.errors[0].productionReady,false);
 assert.equal(f.intake.list().length,1);assert.deepEqual(f.intake.errors(),first.errors);assert.equal(f.intake.status(first.lines[0].id).state,'paid');
 // E3 on K5: the rejected position is „fehler“ in the production release with the intake reason (actor system) and cannot move on.
 const production=f.intake.production.state(first.errors[0].id);assert.equal(production.state,'fehler');assert.equal(production.actor,'system');assert.equal(production.reason,'Entwurfszuordnung nicht gefunden.');assert.deepEqual(production.allowed,[]);assert.equal(production.productionReady,false);
 assert.throws(()=>f.intake.production.transition(first.errors[0].id,'geprueft',{actor:'test',reason:'x'}),/Abgelehnte Bestellposition/);
 assert.deepEqual(f.intake.production.list({state:'fehler'}).map(r=>[r.lineId,r.reason,r.rejected]),[[first.errors[0].id,'Entwurfszuordnung nicht gefunden.',true]]);assert.equal(f.intake.production.list().length,2);
 // Same event again (Shopify retry) and a second delivery with another event ID: identical result, no second row.
 const again=receive(f.intake,sign(payload));assert.equal(again.duplicate,true);assert.deepEqual(again.lines,first.lines);assert.deepEqual(again.errors,first.errors);
 const strip=e=>({...e,id:null,eventId:null,receivedAt:null}),second=receive(f.intake,sign(payload,'test-event-second'));assert.equal(second.duplicate,false);assert.deepEqual(second.lines,first.lines);assert.deepEqual(second.errors.map(strip),first.errors.map(strip));
 assert.equal(f.intake.list().length,1);assert.equal(f.intake.errors().length,1,'one visible error per shop line');assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_line_errors').get().n,2,'every acknowledged delivery leaves its trace');
 f.reopen();assert.deepEqual(f.intake.errors(),second.errors);assert.deepEqual(f.intake.list(),first.lines);
 // The unbound shop variant without a saved draft is reported as a position error, not as an order refusal.
 const missing=order(f.offer().property.value);missing.id=104;missing.line_items[0].id=203;missing.line_items.push({id:204,variant_id:301,quantity:1,price:'29.99',properties:[]});
 const r=receive(f.intake,sign(missing,'test-event-missing'));assert.equal(r.lines.length,1);assert.match(r.errors[0].intakeError,/fehlt der gesicherte Entwurf/);assert.equal(f.intake.errors().length,2);
});
test('configured HTTP receiver requires HMAC instead of browser CSRF; default runtime keeps intake disabled',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-order-http-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];const instances=[];t.after(async()=>{for(const {server,w} of instances){await new Promise(r=>server.close(r));w.close();}fs.rmSync(dir,{recursive:true,force:true});});
 async function start(enabled){const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,...(enabled?{orderWebhook:config}:{})}),server=createPreviewServer({workshop:w,outputDirectory:dir});server.listen(0,'127.0.0.1');await once(server,'listening');instances.push({server,w});return 'http://127.0.0.1:'+server.address().port;}
 const base=await start(true),disabled=await start(false),payload={id:101,test:true,financial_status:'paid',currency:'EUR',line_items:[]},message=sign(payload);const post=(origin,m,headers=m.headers)=>fetch(origin+'/api/workshop/order-webhook',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:m.raw}),request=(origin,headers)=>post(origin,message,headers);assert.equal((await request(base,{})).status,401);assert.equal((await request(base)).status,200);
 // E3: a broken position answers 200 (no retry storm) and is listed as „fehler“ in the overview API.
 const broken=await post(base,sign({...payload,id:105,line_items:[{id:205,variant_id:305,quantity:1,price:'1.00',properties:[{name:'_gravuru_offer',value:'e'.repeat(64)}]}]},'test-event-broken'));assert.equal(broken.status,200);const brokenBody=await broken.json();assert.equal(brokenBody.lines.length,0);assert.equal(brokenBody.errors[0].status,'fehler');
 const overview=await (await fetch(base+'/api/workshop/orders')).json();assert.equal(overview.orders.length,0);assert.equal(overview.errors.length,1);assert.equal(overview.errors[0].lineId,'205');assert.equal(overview.errors[0].intakeError,'Entwurfszuordnung nicht gefunden.');assert.equal((await request(disabled)).status,503);assert.equal((await fetch(base+'/api/workshop/order-offers',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);assert.equal((await fetch(base+'/werkstatt/bestellungen/')).status,200);assert.deepEqual((await (await fetch(disabled+'/api/workshop/orders')).json()).integration,{enabled:false,mode:'test-only'});
});

const statusMessage=(token,status,time='2026-10-06T12:00:00Z',event='status-event-1234',extra={})=>sign({...order(token),financial_status:status,updated_at:time,...extra},event,{'x-shopify-topic':extra.cancelled_at?'orders/cancelled':'orders/updated'});
test('status updates report partial/full refunds while preserving paid line, private package and restart state',t=>{
 const f=setup(t),o=f.offer(),paid=receive(f.intake,sign(order(o.property.value))).lines[0],before=JSON.stringify(f.intake.get(paid.id));
 const partial=statusMessage(o.property.value,'partially_refunded');assert.equal(receive(f.intake,partial).matchedLines,1);assert.equal(f.intake.status(paid.id).state,'partially_refunded');assert.equal(f.intake.status(paid.id).scope,'order-wide');assert.equal(f.intake.status(paid.id).customerDownloadAllowed,false);assert.equal(receive(f.intake,partial).duplicate,true);
 receive(f.intake,statusMessage(o.property.value,'refunded','2026-10-06T13:00:00Z','refund-event-1234'));assert.equal(f.intake.status(paid.id).state,'refunded');f.reopen();assert.equal(f.intake.status(paid.id).state,'refunded');assert.equal(JSON.stringify(f.intake.get(paid.id)),before);
 const rows=JSON.stringify(f.db.prepare('SELECT * FROM form_order_status_events').all());for(const privateValue of [o.property.value,'private-fixture@example.invalid',config.secret])assert.ok(!rows.includes(privateValue));assert.throws(()=>f.db.exec("UPDATE form_order_status_events SET financial_status='paid'"),/immutable/);
});
test('status may precede paid delivery; stale and duplicate paid events cannot erase a later refund',t=>{
 const f=setup(t),o=f.offer();assert.equal(receive(f.intake,statusMessage(o.property.value,'refunded','2026-10-06T14:00:00Z')).matchedLines,0);
 const payload={...order(o.property.value),updated_at:'2026-10-06T10:00:00Z'},signed=sign(payload),paid=receive(f.intake,signed).lines[0];assert.equal(f.intake.status(paid.id).state,'refunded');assert.equal(receive(f.intake,signed).duplicate,true);
 receive(f.intake,statusMessage(o.property.value,'paid','2026-10-06T11:00:00Z','old-event-1234'));assert.equal(f.intake.status(paid.id).state,'refunded');assert.deepEqual(f.intake.get(paid.id),paid);
});
test('cancellation remains visible with a later refund; conflicting equal timestamps require review',t=>{
 const f=setup(t),o=f.offer(),paid=receive(f.intake,sign(order(o.property.value))).lines[0];
 f.intake.production.transition(paid.id,'geprueft',{actor:'merchant:1'});assert.equal(f.intake.status(paid.id).production.state,'geprueft');
 receive(f.intake,statusMessage(o.property.value,'paid','2026-10-06T12:00:00Z','cancel-event-1234',{cancelled_at:'2026-10-06T11:59:00Z'}));assert.equal(f.intake.status(paid.id).state,'cancelled');assert.equal(f.intake.status(paid.id).production.state,'fehler');assert.equal(f.intake.status(paid.id).production.reason,'Storniert/erstattet im Shop');assert.equal(f.intake.status(paid.id).production.shopBlocked,true);assert.equal(f.intake.status(paid.id).productionReady,false);
 receive(f.intake,statusMessage(o.property.value,'refunded','2026-10-06T13:00:00Z','refunded-event-1234'));assert.equal(f.intake.status(paid.id).state,'cancelled');assert.equal(f.intake.status(paid.id).financialStatus,'refunded');
 receive(f.intake,statusMessage(o.property.value,'paid','2026-10-06T13:00:00Z','conflict-event-1234'));assert.equal(f.intake.status(paid.id).conflict,true);assert.equal(f.intake.status(paid.id).requiresReview,true);
});
test('status authentication, live rejection, currency, times and event collisions leave no partial rows',t=>{
 const f=setup(t),o=f.offer(),p=order(o.property.value);receive(f.intake,sign(p));
 for(const extra of [{test:false},{currency:'USD'},{updated_at:'bad'},{cancelled_at:'2026-10-06T13:00:00Z'},{financial_status:'invented'}])assert.throws(()=>receive(f.intake,statusMessage(o.property.value,'paid','2026-10-06T12:00:00Z','status-bad-1234',extra)));
 const bad=statusMessage(o.property.value,'refunded');bad.headers['x-shopify-hmac-sha256']='a'.repeat(43)+'=';assert.throws(()=>receive(f.intake,bad),/nicht bestätigt/);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_status_events').get().n,0);
 assert.throws(()=>receive(f.intake,statusMessage(o.property.value,'refunded','2026-10-06T12:00:00Z','test-event-1234')),/Zahlungsnachricht/);
 const valid=statusMessage(o.property.value,'refunded');receive(f.intake,valid);assert.throws(()=>receive(f.intake,statusMessage(o.property.value,'paid')),/anderem Inhalt/);assert.throws(()=>receive(f.intake,sign(p,'status-event-1234')),/Statusnachricht/);
});


test('gallery approval batch checks every variant, reuses one document hash and reads fresh evidence on retry',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let reads=0;
 const connection=new Proxy(db,{get(target,key){if(key==='prepare')return sql=>{if(sql.startsWith('SELECT document FROM product_revisions'))reads++;return target.prepare(sql);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const intake=createOrderIntake({database:connection,snapshot:()=>{throw Error('No customer snapshot');}});
 const productId='cfg_11111111-1111-4111-8111-111111111111',shopDomain='batch-test.myshopify.com',shopifyProductId='gid://shopify/Product/123';
 const record={id:productId,revision:1,status:'draft',document:{schema:'gravuru-form-product/v1',kind:'product',basePriceCents:1999,designs:[{}]}};
 for(const variantId of ['301','302','303'])intake.bind({shopDomain,variantId,record});
 db.exec('CREATE TABLE product_revisions(tenant_id TEXT,product_id TEXT,revision INTEGER,document TEXT);CREATE TABLE doorbell_live_order_approvals(tenant_id TEXT,shop TEXT,product_gid TEXT,cfg_id TEXT,cfg_revision INTEGER,document_sha256 TEXT,variants_json TEXT,approval_id TEXT,approved_at TEXT);');
 const body=JSON.stringify(record.document),{createHash}=await import('node:crypto');
 db.prepare('INSERT INTO product_revisions VALUES(?,?,?,?)').run('gravuru',productId,1,body);
 db.prepare('INSERT INTO doorbell_live_order_approvals VALUES(?,?,?,?,?,?,?,?,?)').run('gravuru',shopDomain,shopifyProductId,productId,1,createHash('sha256').update(body).digest('hex'),'["301","303"]','test-approval','2026-10-28');
 const inputs=['301','302','303'].map(id=>({shopDomain,shopifyProductId,productId,productRevision:1,shopifyVariantId:'gid://shopify/ProductVariant/'+id}));
 const result=await intake.doorbellGalleryApprovals(inputs);assert.deepEqual(result.map(r=>r?.id??null),['test-approval',null,'test-approval']);assert.equal(reads,1);
 assert.equal(intake.doorbellLiveApproval(inputs[1]),null);
 db.prepare('UPDATE product_revisions SET document=?').run(body+' ');
 assert.deepEqual(await intake.doorbellGalleryApprovals(inputs),[null,null,null]);assert.equal(reads,2,'a second request must rehash the fixed document');
});
