import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createOrderIntake} from './order-intake.mjs';
import {createOrderWebhookHandler,ORDER_WEBHOOK_PATH} from './shopify-order-webhook.mjs';
import {createCrossStoreWebhookIntake} from './cross-store-order-intake.mjs';
import {createExportJobStore,createExportWorker} from './export-jobs.mjs';
import {outputStateFromJobs} from './cross-store-orders.mjs';
import {customerIntegrationFromEnv} from './acryl-employee-host.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';
import {ORDER_REVIEW_TAG,createShopifyOrderReviewTags,connectOrderReview,orderReviewIntakes} from './shopify-order-review-tag.mjs';

// #265 Stufe C, ENTSCHEIDUNGEN 3.51/3.57 (2): „Bitte prüfen“ als Tag an der Shopify-Bestellung. Alles synthetisch: kein Shop,
// kein Netz, kein echter Zugang. Was am echten Shop zu bestätigen ist, steht in docs/handoffs/2026-11-21-stufe-c-app-version.md.
const shopDomain='synthetic.myshopify.com',token='synthetic-admin-token-0123456789';
const config={mode:'test-only',apiVersion:'2026-07',shopDomain,secret:'synthetic_secret_at_least_16'};
const settle=async(turns=12)=>{for(let i=0;i<turns;i++)await new Promise(resolve=>setImmediate(resolve));};
const waitFor=async fn=>{const deadline=Date.now()+3000;while(Date.now()<deadline){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,10));}assert.fail('Zustand nicht erreicht');};

// Nachgebildete Admin-API: zählt Aufrufe, antwortet auf die Berechtigungsfrage und auf `tagsAdd`.
function admin({scopes=['read_orders','write_orders'],fail=null}={}){
 const calls=[],state={scopes,fail,onCall:null};
 const fetchImpl=async(url,options)=>{
  const body=JSON.parse(options.body),kind=body.query.startsWith('mutation')?'tag':'scopes';state.onCall?.();
  calls.push({kind,url,headers:options.headers,method:options.method,redirect:options.redirect,variables:body.variables});
  if(state.fail)return state.fail(kind);
  if(kind==='scopes')return Response.json({data:{currentAppInstallation:{accessScopes:state.scopes.map(handle=>({handle}))}}});
  return Response.json({data:{tagsAdd:{node:{id:body.variables.id},userErrors:[]}}});
 };
 return {calls,state,fetchImpl,tags:()=>calls.filter(c=>c.kind==='tag'),scopeReads:()=>calls.filter(c=>c.kind==='scopes')};
}
const unit=(api,extra={})=>{const log=[];let tokens=0;const mark=createShopifyOrderReviewTags({shopDomain,getAccessToken:async()=>{tokens++;return token;},...extra.client},{fetchImpl:api.fetchImpl,log:entry=>log.push(entry),...extra.options});return {mark,log,tokens:()=>tokens};};

test('kein Client: nichts geschieht – kein Zugang wird geholt, kein Abruf, kein Protokoll',async()=>{
 const api=admin(),log=[];
 for(const client of [undefined,{},{shopDomain},{getAccessToken:async()=>token},{shopDomain:'kein-shop.example',getAccessToken:async()=>assert.fail('kein Zugang ohne gültigen Shop')},{shopDomain,getAccessToken:'token'}]){
  const mark=createShopifyOrderReviewTags(client,{fetchImpl:api.fetchImpl,log:entry=>log.push(entry)});
  assert.deepEqual(await mark({shopDomain,orderId:'101'}),{state:'off'});
 }
 assert.deepEqual(api.calls,[]);assert.deepEqual(log,[]);
});

test('Client mit write_orders: genau ein Tag-Aufruf je betroffener Bestellung, auch bei mehreren und gleichzeitigen Meldungen',async()=>{
 const api=admin(),u=unit(api);
 const results=await Promise.all([u.mark({shopDomain,orderId:'101'}),u.mark({shopDomain,orderId:'101'}),u.mark({shopDomain,orderId:101})]);
 assert.deepEqual(results,[{state:'tagged'},{state:'tagged'},{state:'tagged'}]);
 assert.equal(api.tags().length,1);
 const [call]=api.tags();
 assert.equal(call.url,'https://'+shopDomain+'/admin/api/2026-07/graphql.json');assert.equal(call.method,'POST');assert.equal(call.redirect,'error');
 assert.equal(call.headers['X-Shopify-Access-Token'],token);
 assert.deepEqual(call.variables,{id:'gid://shopify/Order/101',tags:[ORDER_REVIEW_TAG]});
 assert.equal(ORDER_REVIEW_TAG,'Gravuru: bitte prüfen');assert.ok(ORDER_REVIEW_TAG.length<=40&&!ORDER_REVIEW_TAG.includes(','));
 // Spätere Meldungen derselben Bestellung (weitere Zustellung, weiterer Fehlschlag): kein zweiter Aufruf.
 assert.deepEqual(await u.mark({shopDomain,orderId:'101'}),{state:'known'});assert.equal(api.tags().length,1);
 // Eine andere Bestellung bekommt ihren eigenen einen Aufruf; die Berechtigung wird dafür nicht erneut gelesen.
 assert.deepEqual(await u.mark({shopDomain,orderId:'102'}),{state:'tagged'});
 assert.deepEqual(api.tags().map(c=>c.variables.id),['gid://shopify/Order/101','gid://shopify/Order/102']);assert.equal(api.scopeReads().length,1);
 assert.deepEqual(u.log,[{event:'shopify_order_review_tag',state:'tagged'},{event:'shopify_order_review_tag',state:'tagged'}]);
});

test('ohne die Berechtigung write_orders wird keine Mutation versucht; nach der Freigabe wirkt sie ohne Neustart',async()=>{
 let now=1_800_000_000_000;const api=admin({scopes:['read_orders','write_products']}),u=unit(api,{options:{clock:()=>now}});
 assert.deepEqual(await u.mark({shopDomain,orderId:'101'}),{state:'no-scope'});
 assert.deepEqual(await u.mark({shopDomain,orderId:'102'}),{state:'no-scope'});
 assert.equal(api.tags().length,0);assert.equal(api.scopeReads().length,1,'das Nein gilt zehn Minuten');
 assert.deepEqual(u.log,[{event:'shopify_order_review_tag',state:'no-scope'}]);
 api.state.scopes=['read_orders','write_orders'];now+=9*60*1000;
 assert.deepEqual(await u.mark({shopDomain,orderId:'101'}),{state:'no-scope'});assert.equal(api.tags().length,0);
 now+=2*60*1000;
 assert.deepEqual(await u.mark({shopDomain,orderId:'101'}),{state:'tagged'});
 assert.deepEqual(api.tags().map(c=>c.variables.id),['gid://shopify/Order/101']);assert.equal(api.scopeReads().length,2);
});

test('fremder Shop und ungültige Bestellkennungen werden ohne Abruf übergangen',async()=>{
 const api=admin(),u=unit(api);
 for(const input of [undefined,{},{shopDomain:'other.myshopify.com',orderId:'101'},{shopDomain,orderId:'0'},{shopDomain,orderId:'abc'},{shopDomain,orderId:'gid://shopify/Order/101'},{shopDomain,orderId:9007199254740992},{shopDomain,orderId:null},{shopDomain,orderId:'1'.repeat(21)}])assert.deepEqual(await u.mark(input),{state:'ignored'});
 assert.deepEqual(api.calls,[]);assert.equal(u.tokens(),0);
});

test('Fehler des Clients werden abgefangen und nur als Kurzgrund protokolliert – ohne Bestell-, Kunden- oder Zugangsdaten',async()=>{
 const cases=[
  ['access',{client:{getAccessToken:async()=>{throw Error('Zugang für 4711 abgelehnt: '+token);}}},null],
  ['network',{},()=>{throw Error('ECONNRESET order 4711');}],
  ['http',{},()=>new Response('private@example.invalid',{status:500})],
  ['response',{},()=>new Response('<html>4711</html>',{status:200})],
  ['graphql',{},()=>Response.json({errors:[{message:'Access denied for order 4711'}]})],
  ['rejected',{},kind=>kind==='scopes'?Response.json({data:{currentAppInstallation:{accessScopes:[{handle:'write_orders'}]}}}):Response.json({data:{tagsAdd:{node:null,userErrors:[{field:['id'],message:'Order 4711 not found'}]}}})],
  ['rejected',{},kind=>kind==='scopes'?Response.json({data:{currentAppInstallation:{accessScopes:[{handle:'write_orders'}]}}}):Response.json({data:{tagsAdd:{node:{id:'gid://shopify/Order/999'},userErrors:[]}}})]];
 for(const [code,extra,fail] of cases){
  const api=admin({fail}),u=unit(api,extra);
  assert.deepEqual(await u.mark({shopDomain,orderId:'4711'}),{state:'failed'},code);
  assert.deepEqual(u.log,[{event:'shopify_order_review_tag',state:'failed',code}],code);
  for(const secret of ['4711',token,shopDomain,'private@example.invalid'])assert.ok(!JSON.stringify(u.log).includes(secret),code+' '+secret);
  // Nichts gilt als erledigt: Sobald der Client wieder antwortet, setzt die nächste Meldung den Tag.
  api.state.fail=null;const again=unit(api);assert.deepEqual(await again.mark({shopDomain,orderId:'4711'}),{state:'tagged'},code);
 }
 // Auch ein Protokoll, das selbst wirft, ändert nichts am Ergebnis.
 const api=admin(),mark=createShopifyOrderReviewTags({shopDomain,getAccessToken:async()=>token},{fetchImpl:api.fetchImpl,log:()=>{throw Error('Protokoll voll');}});
 assert.deepEqual(await mark({shopDomain,orderId:'4711'}),{state:'tagged'});
});

// ── Verdrahtung: echter Bestelleingang, echte Verteilung über Speicher, echter Webhook-Handler, echte Auftragsliste ──
async function fixture(t,options={}){
 const {review,api=admin(),failOutputFor=null}=options;
 // Ohne Angabe ist der Vermerk in diesen Verdrahtungstests eingeschaltet; `enabled:undefined` prüft den echten Standard (Schlüssel fehlt).
 const setting=Object.hasOwn(options,'enabled')?(options.enabled===undefined?{}:{enabled:options.enabled}):{enabled:true};
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE form_review_snapshots(id TEXT PRIMARY KEY);CREATE TABLE form_print_proofs(snapshot_id TEXT,recipe_key TEXT,metadata TEXT,pdf BLOB,archive BLOB,PRIMARY KEY(snapshot_id,recipe_key));');
 for(const id of ['proof_test','proof_ohne_bestellung'])db.prepare('INSERT INTO form_review_snapshots VALUES(?)').run(id);
 const exportJobs=createExportJobStore({database:db});
 const manifest={id:'proof_test',packageSha256:'a'.repeat(64),product:{id:'cfg_test',revision:1,name:'Synthetic',basePriceCents:1499,currency:'EUR'}};
 const request=line=>({snapshotId:line.snapshotId,recipeKey:'recipe-key',recipe:'recipe/v1',settings:{dpi:300}});
 // Wie http.mjs: Der Bestelleingang reiht je angenommener Position den Ausgabeauftrag ein; das Kennzeichen wird abgeleitet.
 const onPaid=lines=>{for(const line of lines){try{if(failOutputFor?.(line))throw Error('Ausgabe nicht anlegbar');exportJobs.enqueue(request(line));}catch{/* Grund steht im Kennzeichen. */}}};
 const intake=createOrderIntake({database:db,snapshot:()=>structuredClone(manifest),onPaid});
 const orderOutputState=line=>outputStateFromJobs(exportJobs.forSnapshot(line.snapshotId).jobs,'Für diese Position gibt es noch keinen Ausgabeauftrag.');
 const workshop={orderIntake:intake,exportJobs,orderOutputState};
 const binding=intake.bind({shopDomain,variantId:'301',record:{id:'cfg_test',revision:1,status:'draft',document:{schema:'gravuru-form-product/v1',kind:'product',basePriceCents:1499,designs:[{}]}}});
 const offer=intake.offer({bindingId:binding.id,snapshotId:manifest.id,quantity:2});
 const payload={id:101,test:true,financial_status:'paid',currency:'EUR',customer:{email:'private@example.invalid'},line_items:[{id:201,variant_id:301,quantity:2,price:'14.99',properties:[{name:'_gravuru_offer',value:offer.property.value}]}]};
 const log=[];let clients=0;
 const stores=review
  ?[{storeId:'acryl',intake:connectOrderReview({workshop,review})}]
  :orderReviewIntakes({...setting,stores:[{storeId:'acryl',workshop}],client:()=>{clients++;return {shopDomain,getAccessToken:async()=>token};},options:{fetchImpl:api.fetchImpl,log:entry=>log.push(entry)}});
 const handler=createOrderWebhookHandler({intake:createCrossStoreWebhookIntake({stores}),config});
 // Zeitpunkt jedes Admin-Abrufs: War die Antwort an Shopify da schon vollständig geschrieben?
 let current=null;const answeredBeforeAdmin=[];api.state.onCall=()=>answeredBeforeAdmin.push(current?.writableEnded===true);
 const server=http.createServer((req,res)=>{current=res;handler(req,res);});server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.close();server.closeAllConnections();db.close();});
 const deliver=(data=payload,eventId='synthetic-event-12345')=>new Promise((resolve,reject)=>{
  const body=JSON.stringify(data);
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:ORDER_WEBHOOK_PATH,method:'POST',headers:{'content-type':'application/json','x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(body).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':eventId}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString()}));});
  req.on('error',reject);req.end(body);
 });
 // Bestellung mit einer guten und einer abgelehnten Position (Preisabweichung), wie im E3-Test des Webhook-Handlers.
 const deviating=()=>{const bad=structuredClone(payload);bad.line_items.push({...bad.line_items[0],id:202,price:'0.01'});return bad;};
 // Vergleichbarer Stand des Bestelleingangs ohne zufällige Kennungen und Zeitstempel.
 const stored=()=>({lines:intake.list().map(l=>[l.orderId,l.lineId,l.status,l.quantity,l.unitCents,l.totalCents,l.snapshotId]),errors:intake.errors().map(e=>[e.orderId,e.lineId,e.status,e.intakeError,e.snapshotId??null]),jobs:exportJobs.list().map(j=>[j.snapshotId,j.recipeKey,j.status]),events:db.prepare('SELECT count(*) AS n FROM form_order_events').get().n});
 return {db,intake,exportJobs,workshop,payload,deviating,deliver,stored,api,log,clients:()=>clients,stores,answeredBeforeAdmin};
}

test('aus per Standard: ohne die ausdrückliche Einstellung bleibt der bisherige Bestelleingang, kein Client, kein Abruf',async t=>{
 for(const enabled of [undefined,false,'true',1,null]){
  await t.test('enabled='+String(enabled),async s=>{
   const f=await fixture(s,{enabled});
   assert.equal(f.stores[0].intake,f.workshop.orderIntake,'genau das unveränderte Objekt des Bestelleingangs');
   const r=await f.deliver(f.deviating());await settle();
   assert.deepEqual(JSON.parse(r.body),{accepted:true,duplicate:false,matchedLines:1,rejectedLines:1,testOnly:true});
   assert.equal(f.clients(),0);assert.deepEqual(f.api.calls,[]);assert.deepEqual(f.log,[]);
  });
 }
 // Auch der Beobachter für fehlgeschlagene Aufträge wird nur mit der Einstellung angemeldet.
 let subscribed=0;const workshop={orderIntake:{receive(){}},exportJobs:{onFailed(){subscribed++;}},orderOutputState(){}};
 orderReviewIntakes({stores:[{storeId:'acryl',workshop}],client:()=>assert.fail('kein Client ohne Einstellung')});assert.equal(subscribed,0);
 orderReviewIntakes({enabled:true,stores:[{storeId:'acryl',workshop:{...workshop,orderIntake:{receive(){},forSnapshot(){return [];}}}}],client:()=>({shopDomain,getAccessToken:async()=>token})});assert.equal(subscribed,1);
});

test('abgelehnte Position (Preisabweichung): genau ein Tag an dieser Bestellung; Antwort an Shopify und Eingang wie ohne Vermerk',async t=>{
 const off=await fixture(t,{enabled:false}),on=await fixture(t);
 const expected={accepted:true,duplicate:false,matchedLines:1,rejectedLines:1,testOnly:true};
 const [plain,reviewed]=[await off.deliver(off.deviating()),await on.deliver(on.deviating())];await settle();
 assert.equal(reviewed.status,200);assert.deepEqual(JSON.parse(reviewed.body),expected);assert.deepEqual(reviewed,plain);
 assert.deepEqual(on.stored(),off.stored());assert.match(on.intake.errors()[0].intakeError,/Preis/);
 assert.deepEqual(on.api.tags().map(c=>c.variables),[{id:'gid://shopify/Order/101',tags:['Gravuru: bitte prüfen']}]);
 assert.deepEqual(on.log,[{event:'shopify_order_review_tag',state:'tagged'}]);
 // Beide Admin-Abrufe (Berechtigung lesen, Tag setzen) beginnen erst, nachdem die Antwort an Shopify geschrieben ist.
 assert.deepEqual(on.answeredBeforeAdmin,[true,true]);
 // Shopify stellt dieselbe Nachricht erneut zu: Antwort wie ohne Vermerk, kein zweiter Tag-Aufruf.
 const [plainAgain,again]=[await off.deliver(off.deviating()),await on.deliver(on.deviating())];await settle();
 assert.deepEqual(again,plainAgain);assert.equal(JSON.parse(again.body).duplicate,true);
 assert.equal(on.api.tags().length,1);assert.deepEqual(on.stored(),off.stored());
 // Nichts in der Antwort an Shopify nennt Tag, Zugang oder Kundendaten.
 for(const value of [token,'Gravuru','private@example.invalid'])assert.ok(!reviewed.body.includes(value));
});

test('einwandfreie Bestellung: kein Tag; der Ausgabeauftrag wird wie bisher eingereiht',async t=>{
 const f=await fixture(t),r=await f.deliver();await settle();
 assert.deepEqual(JSON.parse(r.body),{accepted:true,duplicate:false,matchedLines:1,rejectedLines:0,testOnly:true});
 assert.deepEqual(f.stored().jobs,[['proof_test','recipe-key','queued']]);
 assert.deepEqual(f.api.calls,[]);
});

test('Ausgabeauftrag lässt sich nicht anlegen: die angenommene Position trägt „bitte prüfen“ – ein Tag an der Bestellung',async t=>{
 const f=await fixture(t,{failOutputFor:()=>true}),r=await f.deliver();await settle();
 assert.deepEqual(JSON.parse(r.body),{accepted:true,duplicate:false,matchedLines:1,rejectedLines:0,testOnly:true});
 assert.equal(f.workshop.orderOutputState(f.intake.list()[0]).state,'bitte prüfen');
 assert.deepEqual(f.api.tags().map(c=>c.variables.id),['gid://shopify/Order/101']);
 await f.deliver();await settle();assert.equal(f.api.tags().length,1);
});

test('Ausgabeaufträge ohne Bestellung und Fehlschläge neben einer fertigen Datei setzen keinen Tag',async t=>{
 const f=await fixture(t);await f.deliver();await settle();assert.deepEqual(f.api.calls,[]);
 // Auftrag eines Prüfstands ohne Bestellung schlägt fehl: keine Bestellung, kein Tag.
 const other=f.exportJobs.enqueue({snapshotId:'proof_ohne_bestellung',recipeKey:'recipe-key',recipe:'recipe/v1',settings:{dpi:300}});
 let fail=job=>job.snapshotId==='proof_ohne_bestellung';
 const worker=createExportWorker({jobs:f.exportJobs,recipe:'recipe/v1',intervalMs:10000,render:async job=>{if(fail(job))throw Object.assign(Error('Synthetische Quelldatei fehlt.'),{status:422});return {metadata:{fixture:true},pdf:Buffer.from('pdf'),archive:Buffer.from('zip')};}});
 t.after(()=>worker.close());
 // Der Arbeiter nimmt den ältesten Auftrag zuerst: den der Bestellung. Er gelingt – kein Tag.
 worker.kick();await waitFor(()=>f.exportJobs.get(other.id).status==='failed');await settle();
 assert.deepEqual(f.stored().jobs.map(j=>j[2]).sort(),['completed','failed']);assert.deepEqual(f.api.calls,[]);
 // Ein weiterer Auftrag derselben bestellten Position schlägt fehl, die fertige Datei bleibt: Kennzeichen „fertig“, kein Tag.
 fail=()=>true;
 const second=f.exportJobs.enqueue({snapshotId:'proof_test',recipeKey:'recipe-key-2',recipe:'recipe/v1',settings:{dpi:600}});
 worker.kick();await waitFor(()=>f.exportJobs.get(second.id).status==='failed');await settle();
 assert.equal(f.workshop.orderOutputState(f.intake.list()[0]).state,'fertig');assert.deepEqual(f.api.calls,[]);
});

test('der einzige Ausgabeauftrag der Bestellung schlägt fehl: „bitte prüfen“ in der Werkstatt und genau ein Tag bei Shopify',async t=>{
 const f=await fixture(t);await f.deliver();await settle();
 const worker=createExportWorker({jobs:f.exportJobs,recipe:'recipe/v1',intervalMs:10000,render:async()=>{throw Object.assign(Error('Synthetische Quelldatei fehlt.'),{status:422});}});
 t.after(()=>worker.close());
 const [job]=f.exportJobs.list();worker.kick();await waitFor(()=>f.exportJobs.get(job.id).status==='failed');await settle();
 assert.deepEqual(f.workshop.orderOutputState(f.intake.list()[0]),{state:'bitte prüfen',reason:'Synthetische Quelldatei fehlt.',jobId:job.id});
 assert.deepEqual(f.api.tags().map(c=>c.variables),[{id:'gid://shopify/Order/101',tags:[ORDER_REVIEW_TAG]}]);
 // Erneuter Versuch von Hand schlägt wieder fehl, dazu eine weitere Zustellung: es bleibt bei dem einen Aufruf.
 f.exportJobs.retry(job.id);worker.kick();await waitFor(()=>f.exportJobs.get(job.id).attempts===2&&f.exportJobs.get(job.id).status==='failed');
 await f.deliver();await settle();assert.equal(f.api.tags().length,1);
});

test('Fehler des Clients ändern nichts am Bestelleingang, an der Antwort an Shopify und an der Fertigung',async t=>{
 const baseline=await fixture(t,{enabled:false}),plain=await baseline.deliver(baseline.deviating());await settle();
 const broken=[
  ['Netz fällt aus',{api:admin({fail:()=>{throw Error('offline');}})}],
  ['Shopify antwortet 500',{api:admin({fail:()=>new Response('x',{status:500})})}],
  ['Shopify lehnt ab',{api:admin({fail:()=>Response.json({errors:[{message:'ACCESS_DENIED'}]})})}],
  ['Berechtigung fehlt',{api:admin({scopes:['read_orders']})}],
  ['Vermerk wirft sofort',{review:()=>{throw Error('kaputt');}}],
  ['Vermerk lehnt später ab',{review:()=>Promise.reject(Error('kaputt'))}],
  ['Vermerk antwortet nie',{review:()=>new Promise(()=>{})}]];
 for(const [name,options] of broken){
  await t.test(name,async s=>{
   const unhandled=[],listener=reason=>unhandled.push(reason);process.on('unhandledRejection',listener);s.after(()=>process.off('unhandledRejection',listener));
   const f=await fixture(s,options),r=await f.deliver(f.deviating());await settle();
   assert.deepEqual(r,plain);assert.deepEqual(f.stored(),baseline.stored());
   assert.equal(f.api.tags().length,0);assert.deepEqual(unhandled,[]);
   // Fertigung: Der eingereihte Auftrag wird unabhängig vom Vermerk gebaut.
   const worker=createExportWorker({jobs:f.exportJobs,recipe:'recipe/v1',intervalMs:10000,render:async()=>({metadata:{fixture:true},pdf:Buffer.from('pdf'),archive:Buffer.from('zip')})});s.after(()=>worker.close());
   const [job]=f.exportJobs.list();worker.kick();await waitFor(()=>f.exportJobs.get(job.id).status==='completed');
  });
 }
});

test('fehlgeschlagener Auftrag: ein wurfender oder ablehnender Beobachter ändert weder Auftrag noch Arbeiter',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());
 db.exec('CREATE TABLE form_review_snapshots(id TEXT PRIMARY KEY);CREATE TABLE form_print_proofs(snapshot_id TEXT,recipe_key TEXT,metadata TEXT,pdf BLOB,archive BLOB,PRIMARY KEY(snapshot_id,recipe_key));');
 db.prepare('INSERT INTO form_review_snapshots VALUES(?)').run('proof_test');
 const jobs=createExportJobStore({database:db}),seen=[];
 assert.throws(()=>jobs.onFailed('kein Beobachter'),{status:422});
 jobs.onFailed(()=>{throw Error('kaputt');});jobs.onFailed(()=>Promise.reject(Error('kaputt')));
 const stop=jobs.onFailed(job=>{seen.push(job);job.snapshotId='verändert';});jobs.onFailed(job=>seen.push(job));
 const unhandled=[],listener=reason=>unhandled.push(reason);process.on('unhandledRejection',listener);t.after(()=>process.off('unhandledRejection',listener));
 const job=jobs.enqueue({snapshotId:'proof_test',recipeKey:'k',recipe:'recipe/v1',settings:{}}),claimed=jobs.claim();
 // Ein fremder Arbeiter (falsches Pfand) meldet keinen Fehlschlag.
 assert.equal(jobs.fail(job.id,'falsches-pfand','x'),false);assert.deepEqual(seen,[]);
 assert.equal(jobs.fail(job.id,claimed.leaseToken,'Synthetischer Fehlschlag'),true);await settle();
 assert.deepEqual(seen,[{id:job.id,snapshotId:'verändert'},{id:job.id,snapshotId:'proof_test'}],'jeder Beobachter bekommt eine eigene Kopie');
 assert.equal(jobs.get(job.id).status,'failed');assert.equal(jobs.get(job.id).error,'Synthetischer Fehlschlag');assert.deepEqual(unhandled,[]);
 // Abgemeldet: kein weiterer Aufruf für diesen Beobachter.
 stop();jobs.retry(job.id);const next=jobs.claim();assert.equal(jobs.fail(job.id,next.leaseToken,'Noch einmal'),true);assert.equal(seen.length,3);
});

test('Aufsatz reicht alles andere unverändert durch und verlangt einen echten Bestelleingang',async()=>{
 assert.throws(()=>connectOrderReview(),/Bestelleingang oder Prüfvermerk fehlt/);
 assert.throws(()=>connectOrderReview({workshop:{orderIntake:{}},review(){}}),/fehlt/);
 assert.throws(()=>connectOrderReview({workshop:{orderIntake:{receive(){}}}}),/fehlt/);
 const seen=[],result={duplicate:false,lines:[],errors:[{shopDomain,orderId:'7'}]};
 const intake={marker:1,receive(...args){assert.equal(this,intake);seen.push(args);return result;},ownsOfferToken(){return this.marker===1;},bindings(){return [];}};
 // Ältere Händler-Laufzeit: kein Kennzeichen, keine Beobachter – nur abgelehnte Positionen werden gemeldet.
 const marked=[],reviewed=connectOrderReview({workshop:{orderIntake:intake},review:order=>{marked.push(order);}});
 assert.equal(reviewed.receive('raw','headers','config'),result);assert.deepEqual(seen,[['raw','headers','config',undefined]]);
 assert.equal(reviewed.receive('raw','headers','config',{acceptedLineIds:['1']}),result);assert.deepEqual(seen[1][3],{acceptedLineIds:['1']});
 assert.equal(reviewed.ownsOfferToken(),true);assert.deepEqual(reviewed.bindings(),[]);
 // Gemeldet wird erst nach dem Aufruf, nie in ihm.
 assert.deepEqual(marked,[]);await settle();
 assert.deepEqual(marked,[{shopDomain,orderId:'7'},{shopDomain,orderId:'7'}]);
 // Statusnachrichten und unvollständige Antworten des Eingangs: nichts wird gemeldet, nichts wirft.
 // (Der Aufsatz verschluckt Fehler des Vermerks – deshalb zählen, nicht im Vermerk werfen.)
 let unexpected=0;const count=()=>{unexpected++;};
 for(const value of [undefined,null,{},{errors:'x',lines:7},{recorded:true}]){const plain={receive:()=>value};assert.equal(connectOrderReview({workshop:{orderIntake:plain,orderOutputState(){throw Error('unlesbar');}},review:count}).receive(),value);}
 // Wirft der Bestelleingang selbst (z. B. 401 bei falscher Signatur), bleibt genau dieser Fehler – ohne Meldung.
 const failing={receive(){throw Object.assign(Error('Bestellnachricht nicht bestätigt.'),{status:401});}};
 assert.throws(()=>connectOrderReview({workshop:{orderIntake:failing},review:count}).receive(),{status:401});
 await settle();assert.equal(unexpected,0);
 // Lässt sich das Kennzeichen einer angenommenen Position nicht lesen, gilt wie in der Bestellansicht „bitte prüfen“.
 const unreadable=[];connectOrderReview({workshop:{orderIntake:{receive:()=>({lines:[{shopDomain,orderId:'8'}],errors:[]})},orderOutputState(){throw Error('unlesbar');}},review:order=>{unreadable.push(order);}}).receive();
 await settle();assert.deepEqual(unreadable,[{shopDomain,orderId:'8'}]);
});

test('Einstellung: nur GRAVURU_ORDER_REVIEW_TAGS=enabled schaltet ein; die Integration verlangt den signierten Bestelleingang',()=>{
 const base={GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'};
 assert.equal(Object.hasOwn(customerIntegrationFromEnv(base),'orderReviewTags'),false);
 assert.equal(Object.hasOwn(customerIntegrationFromEnv({...base,GRAVURU_ORDER_REVIEW_TAGS:''}),'orderReviewTags'),false);
 assert.equal(customerIntegrationFromEnv({...base,GRAVURU_ORDER_REVIEW_TAGS:'enabled'}).orderReviewTags,true);
 for(const value of ['true','1','on','yes','Enabled','enabled ','approved'])for(const env of [base,{}])assert.throws(()=>customerIntegrationFromEnv({...env,GRAVURU_ORDER_REVIEW_TAGS:value}),{code:'order_review_tags_env'},value);
 assert.throws(()=>customerIntegrationFromEnv({GRAVURU_ORDER_REVIEW_TAGS:'enabled'}),{code:'order_review_tags_env'},'ohne Kundenanbindung');
 assert.equal(customerIntegrationFromEnv({}),null);
 const settings=customerIntegrationFromEnv(base),stores={legacy:{repository:{},customerDrafts:{}},acryl:{repository:{},customerDrafts:{}}},shopifySessions={shopDomain,secret:'synthetic-app-secret-value',clientId:'c'};
 for(const value of ['true',1,null,'enabled'])assert.throws(()=>createConfiguratorIntegration({settings:{...settings,orderReviewTags:value},...stores,shopifySessions,orderWebhook:config}),/Prüfvermerk an der Shopify-Bestellung muss ausdrücklich/);
 assert.throws(()=>createConfiguratorIntegration({settings:{...settings,orderReviewTags:true},...stores,shopifySessions}),/Prüfvermerk an der Shopify-Bestellung benötigt den eingerichteten signierten Bestelleingang/);
 // Mit gültiger Einstellung scheitert der Aufbau erst an den hier fehlenden echten Speichern, nicht an der Einstellung.
 for(const value of [true,false,undefined])assert.throws(()=>createConfiguratorIntegration({settings:{...settings,...(value===undefined?{}:{orderReviewTags:value})},...stores,shopifySessions,orderWebhook:config}),e=>!/Prüfvermerk|Eindeutige private Test-Stores/.test(e.message));
});
