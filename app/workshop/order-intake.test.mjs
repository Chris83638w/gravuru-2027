import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {createHmac,randomBytes} from 'node:crypto';import {once} from 'node:events';
import {createOrderIntake,verifyPaidWebhook} from './order-intake.mjs';import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {createPreviewServer} from '../configurator/variant-m/server.mjs';
const config={shopDomain:'gravuru-synthetic.myshopify.com',apiVersion:'2026-07',secret:randomBytes(32).toString('hex')};
const sign=(payload,eventId='test-event-1234',overrides={})=>{const raw=Buffer.from(typeof payload==='string'?payload:JSON.stringify(payload));return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':config.shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':eventId,...overrides}};};
const order=token=>({id:101,test:true,financial_status:'paid',currency:'EUR',cancelled_at:null,customer:{email:'private-fixture@example.invalid'},line_items:[{id:201,variant_id:301,quantity:2,price:'29.99',properties:[{name:'_gravuru_offer',value:token}]}]});
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-order-')),filename=path.join(dir,'private.sqlite');let db=new DatabaseSync(filename),now=Date.now(),m={id:'proof_synthetic',packageSha256:'a'.repeat(64),product:{id:'cfg_synthetic',revision:2,name:'Synthetisches Schild',basePriceCents:2999,currency:'EUR'},productionProfile:{id:'mfg_synthetic',revision:3,sha256:'b'.repeat(64)}};const create=()=>createOrderIntake({database:db,snapshot:id=>{assert.equal(id,m.id);return structuredClone(m);},clock:()=>now});let intake=create();const record={id:m.product.id,revision:2,status:'draft',document:{schema:'gravuru-form-product/v1',kind:'product',basePriceCents:2999,designs:[{}]}};const binding=intake.bind({shopDomain:config.shopDomain,variantId:'301',record});const offer=()=>intake.offer({bindingId:binding.id,snapshotId:m.id,quantity:2});t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});return {get db(){return db;},get intake(){return intake;},offer,binding,record,changeTime:delta=>now+=delta,changeHash:()=>m.packageSha256='f'.repeat(64),reopen:()=>{db.close();db=new DatabaseSync(filename);intake=create();}};}
const receive=(intake,message)=>intake.receive(message.raw,message.headers,config);
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
 const f=setup(t),o=f.offer(),payload=order(o.property.value),signed=sign(payload),first=receive(f.intake,signed);assert.equal(first.lines[0].totalCents,5998);assert.equal(first.lines[0].product.revision,2);assert.equal(first.lines[0].productionProfile.revision,3);assert.equal(first.lines[0].productionReady,false);assert.equal(first.lines[0].customerDownloadAllowed,false);assert.equal(receive(f.intake,signed).duplicate,true);assert.deepEqual(receive(f.intake,sign(payload,'test-event-second')).lines,first.lines);assert.equal(f.intake.list().length,1);
 assert.throws(()=>receive(f.intake,sign({...payload,id:102},'test-event-third')),/bereits/);assert.throws(()=>receive(f.intake,sign({...payload,id:102})),/anderem Inhalt/);assert.throws(()=>f.db.exec("UPDATE form_order_lines SET document='{}'"),/immutable/);
 const rows=JSON.stringify(f.db.prepare('SELECT * FROM form_order_lines').all())+JSON.stringify(f.db.prepare('SELECT * FROM form_order_offers').all());assert.ok(!rows.includes(o.property.value));assert.ok(!rows.includes(payload.customer.email));assert.ok(!rows.includes(config.secret));f.reopen();assert.deepEqual(f.intake.list(),first.lines);assert.equal(receive(f.intake,signed).duplicate,true);
});
test('variant, price, quantity, expired offers and changed snapshot are refused without partial admission',t=>{
 const f=setup(t),o=f.offer(),payload=order(o.property.value);
 for(const change of [{variant_id:999},{price:'0.01'},{quantity:1},{price:29.99},{properties:[]},{properties:[o.property,o.property]}]){const p=structuredClone(payload);Object.assign(p.line_items[0],change);assert.throws(()=>receive(f.intake,sign(p)));assert.equal(f.intake.list().length,0);}
 const two=structuredClone(payload);two.line_items.push({...two.line_items[0],id:202,properties:[{name:'_gravuru_offer',value:'f'.repeat(64)}]});assert.throws(()=>receive(f.intake,sign(two)));assert.equal(f.intake.list().length,0);assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_events').get().n,0);
 f.changeHash();assert.throws(()=>receive(f.intake,sign(payload)),/verändert/);f.changeTime(8*86400000);assert.throws(()=>receive(f.intake,sign(payload)),/abgelaufen/);
});
test('configured HTTP receiver requires HMAC instead of browser CSRF; default runtime keeps intake disabled',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-order-http-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];const instances=[];t.after(async()=>{for(const {server,w} of instances){await new Promise(r=>server.close(r));w.close();}fs.rmSync(dir,{recursive:true,force:true});});
 async function start(enabled){const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,...(enabled?{orderWebhook:config}:{})}),server=createPreviewServer({workshop:w,outputDirectory:dir});server.listen(0,'127.0.0.1');await once(server,'listening');instances.push({server,w});return 'http://127.0.0.1:'+server.address().port;}
 const base=await start(true),disabled=await start(false),payload={id:101,test:true,financial_status:'paid',currency:'EUR',line_items:[]},message=sign(payload);const request=(origin,headers=message.headers)=>fetch(origin+'/api/workshop/order-webhook',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:message.raw});assert.equal((await request(base,{})).status,401);assert.equal((await request(base)).status,200);assert.equal((await request(disabled)).status,503);assert.equal((await fetch(base+'/api/workshop/order-offers',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);assert.equal((await fetch(base+'/werkstatt/bestellungen/')).status,200);assert.deepEqual((await (await fetch(disabled+'/api/workshop/orders')).json()).integration,{enabled:false,mode:'test-only'});
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
 receive(f.intake,statusMessage(o.property.value,'paid','2026-10-06T12:00:00Z','cancel-event-1234',{cancelled_at:'2026-10-06T11:59:00Z'}));assert.equal(f.intake.status(paid.id).state,'cancelled');
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
