import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createOrderIntake} from './order-intake.mjs';
import {createOrderWebhookHandler,ORDER_WEBHOOK_PATH} from './shopify-order-webhook.mjs';
import {createExportJobStore} from './export-jobs.mjs';
import {crossStoreOrders,outputStateFromJobs} from './cross-store-orders.mjs';
const config={mode:'test-only',apiVersion:'2026-07',shopDomain:'synthetic.myshopify.com',secret:'synthetic_secret_at_least_16'};
async function fixture(t,{timeout=3000,liveMode=false,onPaid}={}){
 const db=new DatabaseSync(':memory:');
 const manifest={id:'proof_test',packageSha256:'a'.repeat(64),product:{id:'cfg_test',revision:1,name:'Synthetic',basePriceCents:1499,currency:'EUR'}};
 const intake=createOrderIntake({database:db,snapshot:()=>structuredClone(manifest),onPaid});
 const binding=intake.bind({shopDomain:config.shopDomain,variantId:'301',record:{id:'cfg_test',revision:1,status:'draft',document:{schema:'gravuru-form-product/v1',kind:'product',basePriceCents:1499,designs:[{}]}}});
 const offer=intake.offer({bindingId:binding.id,snapshotId:manifest.id,quantity:2});
 const payload={id:101,test:true,financial_status:'paid',currency:'EUR',customer:{email:'private@example.invalid'},line_items:[{id:201,variant_id:301,quantity:2,price:'14.99',properties:[{name:'_gravuru_offer',value:offer.property.value}]}]};
 const handler=createOrderWebhookHandler({intake,config:liveMode?{...config,mode:'doorbell-live-approved'}:config,bodyTimeoutMs:timeout});
 const server=http.createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.close();server.closeAllConnections();db.close();});
 const request=(data=payload,{headers={},method='POST',route=ORDER_WEBHOOK_PATH,send=true}={})=>new Promise((resolve,reject)=>{
  const body=typeof data==='string'?data:JSON.stringify(data);
  const signed={'content-type':'application/json','x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(body).digest('base64'),'x-shopify-shop-domain':config.shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':'synthetic-event-12345'};
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:route,method,headers:{...signed,...headers}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString()}));});
  req.on('error',reject);if(send)req.end(body);else{req.flushHeaders();t.after(()=>req.destroy());}
 });return {db,intake,binding,payload,offer,request};
}
test('signed delivery commits matching immutable lines before acknowledgment and deduplicates without leaking data',async t=>{
 const f=await fixture(t),first=await f.request();assert.equal(first.status,200);
 assert.deepEqual(JSON.parse(first.body),{accepted:true,duplicate:false,matchedLines:1,rejectedLines:0,testOnly:true});
 assert.equal(f.intake.list().length,1);assert.equal(f.intake.list()[0].totalCents,2998);assert.equal(f.intake.list()[0].productionReady,false);
 assert.equal(JSON.parse((await f.request()).body).duplicate,true);assert.equal(f.intake.list().length,1);
 for(const value of [f.offer.property.value,f.payload.customer.email,config.secret,'cfg_test','proof_test'])assert.ok(!first.body.includes(value));
 const bad=structuredClone(f.payload);bad.id=102;assert.equal((await f.request(bad)).status,409);
});
test('forged, browser, wrong topic/version/shop, live and malformed deliveries never change order state',async t=>{
 const f=await fixture(t);
 for(const headers of [{'x-shopify-hmac-sha256':'invalid'},{'x-shopify-shop-domain':'other.myshopify.com'},{'x-shopify-api-version':'2026-10'},{'x-shopify-topic':'orders/updated'},{'x-shopify-webhook-id':['synthetic-event-12345','synthetic-event-12345']},{origin:'https://merchant.example'},{'sec-fetch-site':'same-origin'},{'content-encoding':'gzip'},{'content-type':'text/plain'}])assert.notEqual((await f.request(f.payload,{headers})).status,200);
 for(const patch of [{test:false},{financial_status:'pending'},{currency:'USD'}, {id:9007199254740992}])assert.equal((await f.request({...f.payload,...patch})).status,422);
 assert.equal((await f.request('{bad json')).status,400);
 assert.equal((await f.request(f.payload,{method:'GET'})).status,405);
 assert.equal((await f.request(f.payload,{route:ORDER_WEBHOOK_PATH+'?token=x'})).status,404);
 assert.equal(f.intake.list().length,0);assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_events').get().n,0);
});
test('E3: a bad second line is rejected alone (status „fehler“); the first line and the delivery ID are kept, the answer is 200',async t=>{
 const f=await fixture(t),bad=structuredClone(f.payload);bad.line_items.push({...bad.line_items[0],id:202,price:'0.01'});
 const r=await f.request(bad);assert.equal(r.status,200);assert.deepEqual(JSON.parse(r.body),{accepted:true,duplicate:false,matchedLines:1,rejectedLines:1,testOnly:true});
 assert.equal(f.intake.list().length,1);assert.equal(f.intake.errors().length,1);assert.equal(f.intake.errors()[0].lineId,'202');assert.equal(f.intake.errors()[0].status,'fehler');assert.match(f.intake.errors()[0].intakeError,/Preis/);
 // Shopify retry of the same delivery: nothing changes, still 200.
 const again=await f.request(bad);assert.equal(again.status,200);assert.equal(JSON.parse(again.body).duplicate,true);assert.equal(f.intake.list().length,1);assert.equal(f.intake.errors().length,1);
 // Same delivery ID with a different body is still refused.
 assert.equal((await f.request()).status,409);assert.equal(f.intake.list().length,1);
});
test('oversized and slow request bodies stop before intake and do not acknowledge payment',async t=>{
 const f=await fixture(t,{timeout:80});
 assert.equal((await f.request('x'.repeat(1024*1024+1))).status,413);
 assert.equal((await f.request('',{headers:{'content-length':'1048577'}})).status,413);
 assert.equal((await f.request('',{headers:{'content-length':'100'},send:false})).status,408);
 assert.equal(f.intake.list().length,0);
});
test('explicit live webhook mode cannot admit an unapproved old form product',async t=>{
 const f=await fixture(t,{liveMode:true});
 const payload={...f.payload,test:false,line_items:f.payload.line_items.map(l=>({...l,product_id:401}))};
 const response=await f.request(payload);
 assert.equal(response.status,200);
 assert.deepEqual(JSON.parse(response.body),{accepted:true,duplicate:false,matchedLines:0,rejectedLines:1,testOnly:false});
 assert.equal(f.intake.list().length,0);assert.equal(f.intake.errors()[0].test,false);
 assert.match(f.intake.errors()[0].intakeError,/Live-Freigabe/);
});
// #265 Stufe B, Lieferung 1 (ENTSCHEIDUNGEN 3.48/3.51/3.53): Der Bestelleingang reiht den Ausgabeauftrag ein; die Antwort an Shopify
// bleibt dieselbe, auch wenn das Einreihen scheitert. Das Kennzeichen je Position entsteht allein aus den Ausgabeaufträgen.
test('#265: the acknowledgment is independent of the output hook; one job per design and a derived mark per position',async t=>{
 let hook=()=>{throw Error('synthetic enqueue failure');};const f=await fixture(t,{onPaid:lines=>hook(lines)});
 f.db.exec('CREATE TABLE form_review_snapshots(id TEXT PRIMARY KEY);CREATE TABLE form_print_proofs(snapshot_id TEXT,recipe_key TEXT,metadata TEXT,pdf BLOB,archive BLOB,PRIMARY KEY(snapshot_id,recipe_key));');
 f.db.prepare('INSERT INTO form_review_snapshots VALUES(?)').run('proof_test');
 const jobs=createExportJobStore({database:f.db}),deviating=f.intake.offer({bindingId:f.binding.id,snapshotId:'proof_test',quantity:2});
 const payload=structuredClone(f.payload);payload.line_items.push({id:202,variant_id:301,quantity:2,price:'9.99',properties:[deviating.property]});
 // Scheitert das Einreihen, antwortet der Eingang wie ohne Anbindung: angenommen, gespeichert, kein Auftrag.
 const first=await f.request(payload);assert.equal(first.status,200);
 assert.deepEqual(JSON.parse(first.body),{accepted:true,duplicate:false,matchedLines:1,rejectedLines:1,testOnly:true});
 assert.equal(f.intake.list().length,1);assert.equal(jobs.list().length,0);
 const store={storeId:'acryl',apiPrefix:'/api/workshop/acryl/',workshop:{orderIntake:f.intake,orderOutputState:line=>outputStateFromJobs(jobs.forSnapshot(line.snapshotId).jobs,'Noch kein Ausgabeauftrag.')}};
 const marks=()=>{const r=crossStoreOrders([store],{shopDomain:config.shopDomain,enabled:true});return {line:r.outputStates['acryl:'+r.orders[0].id],rejected:r.errors[0]};};
 assert.deepEqual(marks().line,{state:'bitte prüfen',reason:'Noch kein Ausgabeauftrag.',jobId:null});
 // Erneute Zustellung desselben Ereignisses holt den Auftrag nach; jede weitere findet denselben (ein Auftrag je Prüfstand und Rezept).
 hook=lines=>{for(const line of lines)jobs.enqueue({snapshotId:line.snapshotId,recipeKey:'recipe-key',recipe:'recipe/v1',settings:{dpi:300}});};
 for(let i=0;i<2;i++){const again=await f.request(payload);assert.equal(again.status,200);assert.equal(JSON.parse(again.body).duplicate,true);assert.equal(jobs.list().length,1);}
 const job=jobs.list()[0];assert.equal(job.snapshotId,'proof_test');assert.deepEqual(marks().line,{state:'wird erstellt',reason:null,jobId:job.id});
 // Nicht baubar → „bitte prüfen“ mit dem Grund des Auftrags; nach erneutem Versuch fertig.
 let claimed=jobs.claim();assert.equal(marks().line.state,'wird erstellt');jobs.fail(job.id,claimed.leaseToken,'Die gesicherte Schrift fehlt.');
 assert.deepEqual(marks().line,{state:'bitte prüfen',reason:'Die gesicherte Schrift fehlt.',jobId:job.id});
 jobs.retry(job.id);claimed=jobs.claim();jobs.finish(job.id,claimed.leaseToken,{metadata:{},pdf:Buffer.from('synthetic PDF'),archive:Buffer.from('synthetic ZIP')});
 assert.deepEqual(marks().line,{state:'fertig',reason:null,jobId:job.id});
 // Preisabweichung: abgelehnt, kein Auftrag, „bitte prüfen“ mit Grund; der Prüfstand des gefundenen Angebots ist gemerkt.
 const rejected=marks().rejected;assert.equal(rejected.lineId,'202');assert.match(rejected.intakeError,/Preis/);assert.equal(rejected.snapshotId,'proof_test');
 assert.deepEqual(rejected.outputState,{state:'bitte prüfen',reason:rejected.intakeError,jobId:null});
 assert.equal(jobs.list().length,1);for(const value of [f.offer.property.value,deviating.property.value,config.secret,'proof_test'])assert.ok(!first.body.includes(value));
});
