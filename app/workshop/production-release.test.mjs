import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {createProductionRelease,PRODUCTION_STATES,SHOP_BLOCK_REASON} from './production-release.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const config={shopDomain:'fixture.myshopify.com',clientId:'fixture-client',apiVersion:'2026-07',secret:randomBytes(32).toString('hex'),mode:'test-only'};
const signed=(payload,topic='orders/paid')=>{const raw=Buffer.from(JSON.stringify(payload));return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':config.shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':topic,'x-shopify-webhook-id':randomUUID()}};};
const person={actor:'merchant:123'};
// Synthetische Position mit gesicherter Gestaltung, fertiger Ausgabe und Prüfvermerk-Möglichkeit (Muster aus customer-downloads.test.mjs).
function populate(store,{profile=null,orderId='101'}={}){
 const record={id:'cfg_fixture',revision:1,status:'draft',document:{kind:'product',schema:'gravuru-form-product/v1',basePriceCents:2999,designs:[{}]}};
 const draft=store.create(record,'design_fixture',{}),bytes=Buffer.from('synthetic source archive '+orderId);
 const manifest={schema:'gravuru-form-review/v1',id:'proof_'+randomUUID(),source:{draftId:draft.id,draftRevision:1},product:{id:record.id,revision:1,basePriceCents:2999,currency:'EUR'},packageSha256:sha(bytes),blockers:[],warnings:[],photos:[],...(profile?{productionProfile:profile}:{})};
 store.capture(draft.id,draft.token,1,{manifest,preview:Buffer.from('<svg/>'),contourPdf:bytes,package:bytes,photos:bytes});
 const binding=store.orderIntake.bind({record,shopDomain:config.shopDomain,variantId:'301'});
 const offer=store.orderIntake.offer({bindingId:binding.id,snapshotId:manifest.id,quantity:1});
 const payload={id:orderId,test:true,financial_status:'paid',currency:'EUR',customer:{id:'456'},updated_at:'2026-10-06T12:00:00Z',line_items:[{id:'201',variant_id:'301',quantity:1,price:'29.99',properties:[offer.property]}]};
 const pdf=Buffer.from('%PDF-1.7\nsynthetic\n%%EOF'),archive=Buffer.from('synthetic private originals');
 store.savePrintProof(manifest.id,'fixture/v1',{pdf,archive,metadata:{pdfSha256:sha(pdf)}});
 const job=store.exportJobs.enqueue({snapshotId:manifest.id,recipeKey:'fixture/v1',recipe:'fixture/v1',settings:{}});
 const file={format:'pdf',name:'fixture.pdf',sha256:sha(pdf)};
 const check=(result,stage='print')=>store.exportJobs.checks.add(job.id,{requestId:randomUUID(),format:'pdf',sha256:file.sha256,stage,result,machine:'Synthetische Maschine',software:'Synthetischer RIP',notes:result==='failed'?'Synthetischer Fehler':''},file);
 const status=(financial_status,extra={})=>{const event=signed({...payload,financial_status,updated_at:'2026-10-06T13:00:00Z',...extra},extra.cancelled_at?'orders/cancelled':'orders/updated');return store.orderIntake.receive(event.raw,event.headers,config);};
 return {payload,manifest,job,check,status,deliver(){const event=signed(payload);return store.orderIntake.receive(event.raw,event.headers,config).lines[0];}};
}
function setup(t,options={}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'g27-release-')),filename=path.join(directory,'private.sqlite');
 let now=Date.parse('2026-10-19T08:00:00Z');
 const open=()=>createFormCustomerStore({filename,clock:()=>now,...(options.autoRelease?{autoRelease:options.autoRelease}:{})});
 let store=open();const data=populate(store,options);const line=options.deferDelivery?null:data.deliver();
 t.after(()=>{store.close();fs.rmSync(directory,{recursive:true,force:true});});
 return {...data,line,filename,get store(){return store;},get release(){return store.orderIntake.production;},tick(){now+=60000;},reopen(){store.close();store=open();}};
}

test('transitions follow the fixed order with time, actor and reason; forbidden transitions are refused without rows',t=>{
 const f=setup(t),id=f.line.id,r=f.release;
 assert.deepEqual(PRODUCTION_STATES,['eingegangen','geprueft','freigegeben','in_fertigung','fertig','fehler']);
 const initial=r.state(id);assert.equal(initial.state,'eingegangen');assert.equal(initial.productionReady,false);assert.deepEqual(initial.events,[]);assert.deepEqual(initial.allowed,['geprueft']);assert.equal(initial.at,f.line.receivedAt);
 for(const to of ['freigegeben','in_fertigung','fertig','fehler'])assert.throws(()=>r.transition(id,to,{...person,reason:'x'}),e=>e.status===409&&/nicht erlaubt/.test(e.message));
 for(const to of ['eingegangen','unbekannt','',null])assert.throws(()=>r.transition(id,to,person),e=>e.status===422);
 assert.throws(()=>r.transition(id,'geprueft',{actor:''}),e=>e.status===422&&/Akteur/.test(e.message));
 assert.throws(()=>r.transition(id,'geprueft',{actor:'x'.repeat(201)}),e=>e.status===422);
 assert.throws(()=>r.transition(id,'geprueft',{...person,reason:'a\u0000b'}),e=>e.status===422);
 assert.equal(r.state(id).events.length,0);
 f.tick();const checked=r.transition(id,'geprueft',person);assert.equal(checked.state,'geprueft');assert.equal(checked.actor,'merchant:123');assert.equal(checked.at,'2026-10-19T08:01:00.000Z');assert.equal(checked.reason,'');assert.deepEqual(checked.allowed,['freigegeben','fehler']);
 assert.throws(()=>r.transition(id,'geprueft',person),e=>e.status===409);assert.throws(()=>r.transition(id,'in_fertigung',person),e=>e.status===409);assert.throws(()=>r.transition(id,'fertig',person),e=>e.status===409);
 assert.throws(()=>r.transition(id,'fehler',person),e=>e.status===422&&/Grund/.test(e.message));assert.throws(()=>r.transition(id,'fehler',{...person,reason:'   '}),e=>e.status===422);
 f.tick();assert.equal(r.transition(id,'freigegeben',{...person,reason:'Sichtprüfung ok'}).state,'freigegeben');
 assert.throws(()=>r.transition(id,'geprueft',person),e=>e.status===409);assert.throws(()=>r.transition(id,'fertig',person),e=>e.status===409);
 f.tick();assert.equal(r.transition(id,'in_fertigung',person).state,'in_fertigung');assert.throws(()=>r.transition(id,'freigegeben',person),e=>e.status===409);
 f.tick();const done=r.transition(id,'fertig',person);assert.equal(done.state,'fertig');assert.deepEqual(done.allowed,['fehler']);
 assert.deepEqual(done.events.map(e=>[e.from,e.to,e.actor]),[['eingegangen','geprueft','merchant:123'],['geprueft','freigegeben','merchant:123'],['freigegeben','in_fertigung','merchant:123'],['in_fertigung','fertig','merchant:123']]);
 assert.equal(done.events[1].reason,'Sichtprüfung ok');
 f.reopen();assert.deepEqual(f.release.state(id).events,done.events);
});

test('error is reachable from every state after geprueft, needs a reason and returns only to geprueft',t=>{
 const f=setup(t),id=f.line.id;
 const run=(...steps)=>{for(const [to,reason] of steps)f.release.transition(id,to,{...person,reason});return f.release.state(id);};
 assert.equal(run(['geprueft'],['fehler','Text unleserlich']).state,'fehler');
 assert.deepEqual(f.release.state(id).allowed,['geprueft']);
 for(const to of ['freigegeben','in_fertigung','fertig','fehler'])assert.throws(()=>f.release.transition(id,to,{...person,reason:'x'}),e=>e.status===409);
 assert.equal(run(['geprueft'],['freigegeben'],['fehler','Material fehlt']).state,'fehler');
 assert.equal(run(['geprueft'],['freigegeben'],['in_fertigung'],['fehler','Gravur verrutscht']).state,'fehler');
 assert.equal(run(['geprueft'],['freigegeben'],['in_fertigung'],['fertig'],['fehler','Transportschaden']).state,'fehler');
 const events=f.release.state(id).events;assert.equal(events.filter(e=>e.to==='fehler').length,4);assert.ok(events.filter(e=>e.to==='fehler').every(e=>e.reason));
 assert.deepEqual(f.release.list({state:'fehler'}).map(l=>l.lineId),[id]);assert.deepEqual(f.release.list({state:'fertig'}),[]);assert.equal(f.release.list().length,1);
 assert.throws(()=>f.release.list({state:'offen'}),e=>e.status===422);
});

test('productionReady only from freigegeben with green automatic checks; a later failed check withdraws it',t=>{
 const f=setup(t),id=f.line.id,r=f.release,status=()=>f.store.orderIntake.status(id);
 r.transition(id,'geprueft',person);r.transition(id,'freigegeben',person);
 assert.equal(r.state(id).productionReady,false);assert.deepEqual(r.state(id).checks,{total:0,passed:0,failed:0,ok:false});assert.equal(status().productionReady,false);assert.equal(status().production.state,'freigegeben');
 f.check('failed');assert.equal(r.state(id).productionReady,false);assert.deepEqual(r.state(id).checks,{total:1,passed:0,failed:1,ok:false});
 f.check('passed');assert.equal(r.state(id).productionReady,true);assert.deepEqual(r.state(id).checks,{total:1,passed:1,failed:0,ok:true});assert.equal(status().productionReady,true);
 f.check('passed','import');assert.equal(r.state(id).checks.total,2);assert.equal(r.state(id).productionReady,true);
 r.transition(id,'in_fertigung',person);assert.equal(r.state(id).productionReady,true);r.transition(id,'fertig',person);assert.equal(r.state(id).productionReady,true);
 f.check('failed');assert.equal(r.state(id).productionReady,false);assert.equal(status().productionReady,false);
 r.transition(id,'fehler',{...person,reason:'Nachprüfung negativ'});f.check('passed');assert.equal(r.state(id).productionReady,false);
 r.transition(id,'geprueft',person);assert.equal(r.state(id).productionReady,false);
 const g=setup(t);g.check('passed');assert.equal(g.release.state(g.line.id).checks.ok,true);assert.equal(g.release.state(g.line.id).productionReady,false);
 g.release.transition(g.line.id,'geprueft',person);assert.equal(g.release.state(g.line.id).state,'geprueft');assert.equal(g.release.state(g.line.id).productionReady,false);
});

test('autoRelease on the manufacturing profile lets a passed check release without a person; failed checks and other profiles do not',t=>{
 const profile={id:'mfg_fixture',revision:2,sha256:'b'.repeat(64)};
 const f=setup(t,{profile,autoRelease:line=>line.productionProfile?.id===profile.id&&line.productionProfile.revision===2}),id=f.line.id,r=f.release;
 assert.equal(r.state(id).autoRelease,true);assert.equal(r.state(id).state,'eingegangen');
 f.check('failed');assert.deepEqual(r.reviewSnapshot(f.manifest.id),[]);assert.equal(r.state(id).state,'eingegangen');
 f.check('passed');assert.deepEqual(r.reviewSnapshot(f.manifest.id),[id]);
 const released=r.state(id);assert.equal(released.state,'freigegeben');assert.equal(released.productionReady,true);
 assert.deepEqual(released.events.map(e=>[e.from,e.to,e.actor,e.reason]),[['eingegangen','geprueft','system','Automatische Prüfung bestanden'],['geprueft','freigegeben','system','Automatische Prüfung bestanden']]);
 assert.deepEqual(r.reviewSnapshot(f.manifest.id),[]);assert.equal(r.state(id).events.length,2);
 const manual=setup(t,{profile:{...profile,revision:1},autoRelease:line=>line.productionProfile?.revision===2});
 manual.check('passed');assert.deepEqual(manual.release.reviewSnapshot(manual.manifest.id),[]);assert.equal(manual.release.state(manual.line.id).state,'eingegangen');assert.equal(manual.release.state(manual.line.id).autoRelease,false);
 manual.release.transition(manual.line.id,'geprueft',person);assert.equal(manual.release.state(manual.line.id).state,'geprueft');
 const later=setup(t,{profile,autoRelease:()=>true});later.release.transition(later.line.id,'geprueft',person);assert.equal(later.release.state(later.line.id).state,'geprueft');
 later.check('passed');later.release.reviewSnapshot(later.manifest.id);assert.equal(later.release.state(later.line.id).state,'freigegeben');
 const broken=setup(t,{profile,autoRelease:()=>{throw Error('Profil fehlt');}});broken.check('passed');assert.deepEqual(broken.release.reviewSnapshot(broken.manifest.id),[]);assert.equal(broken.release.state(broken.line.id).autoRelease,false);
});

test('shop cancellation or refund blocks release and marks error automatically unless already in production',t=>{
 const f=setup(t),id=f.line.id,r=f.release;
 r.transition(id,'geprueft',person);f.check('passed');
 f.status('refunded');
 const blocked=r.state(id);assert.equal(blocked.state,'fehler');assert.equal(blocked.shopBlocked,true);assert.equal(blocked.productionReady,false);assert.deepEqual(blocked.events.at(-1),{...blocked.events.at(-1),from:'geprueft',to:'fehler',actor:'system',reason:SHOP_BLOCK_REASON});
 assert.equal(f.store.orderIntake.status(id).production.state,'fehler');assert.equal(f.store.orderIntake.status(id).state,'refunded');
 r.transition(id,'geprueft',person);assert.deepEqual(r.state(id).allowed,['fehler']);
 assert.throws(()=>r.transition(id,'freigegeben',person),e=>e.status===409&&/storniert oder erstattet/.test(e.message));assert.equal(r.state(id).state,'geprueft');
 f.status('refunded',{updated_at:'2026-10-06T14:00:00Z'});assert.equal(r.state(id).state,'fehler');
 const g=setup(t,{orderId:'102'}),gid=g.line.id;
 g.release.transition(gid,'geprueft',person);g.release.transition(gid,'freigegeben',person);g.release.transition(gid,'in_fertigung',person);
 g.status('paid',{cancelled_at:'2026-10-06T12:30:00Z'});
 assert.equal(g.release.state(gid).state,'in_fertigung');assert.equal(g.release.state(gid).shopBlocked,true);assert.equal(g.store.orderIntake.status(gid).state,'cancelled');
 assert.equal(g.release.transition(gid,'fertig',person).state,'fertig');
 const h=setup(t,{orderId:'103'}),hid=h.line.id;
 h.release.transition(hid,'geprueft',person);h.release.transition(hid,'freigegeben',person);h.status('paid',{cancelled_at:'2026-10-06T12:30:00Z'});
 assert.equal(h.release.state(hid).state,'fehler');assert.throws(()=>{h.release.transition(hid,'geprueft',person);h.release.transition(hid,'freigegeben',person);},e=>e.status===409);
 const early=setup(t,{orderId:'104',deferDelivery:true});early.status('refunded');const line=early.deliver();
 assert.equal(early.release.state(line.id).state,'fehler');assert.equal(early.release.state(line.id).events[0].actor,'system');
});

test('release events are append-only in the database and the paid line stays untouched',t=>{
 const f=setup(t),id=f.line.id,before=JSON.stringify(f.store.orderIntake.get(id));
 f.release.transition(id,'geprueft',person);f.release.transition(id,'fehler',{...person,reason:'Synthetischer Grund'});
 const db=new DatabaseSync(f.filename);
 assert.throws(()=>db.exec("UPDATE production_release_events SET to_state='fertig'"),/immutable/);
 assert.throws(()=>db.exec('DELETE FROM production_release_events'),/retention/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM production_release_events').get().n,2);db.close();
 assert.equal(JSON.stringify(f.store.orderIntake.get(id)),before);assert.equal(f.store.orderIntake.get(id).productionReady,false);
 f.reopen();assert.equal(f.release.state(id).state,'fehler');assert.equal(f.release.state(id).events.length,2);
 assert.throws(()=>f.release.state('orderline_'+randomUUID()),e=>e.status===404);assert.throws(()=>f.release.transition('orderline_'+randomUUID(),'geprueft',person),e=>e.status===404);
});

test('standalone module refuses to start without line and shop status access',()=>{
 const db=new DatabaseSync(':memory:');
 assert.throws(()=>createProductionRelease({database:db}),e=>e.status===503);
 const r=createProductionRelease({database:db,line:()=>{throw Object.assign(Error('fehlt'),{status:404});},shopStatus:()=>({cancelled:false,financialStatus:'paid'})});
 assert.throws(()=>r.state('orderline_x'),e=>e.status===404);db.close();
});

const jwt=()=>{const now=Math.floor(Date.now()/1000),p={aud:config.clientId,dest:'https://'+config.shopDomain,sub:'123',iss:'https://'+config.shopDomain+'/admin',exp:now+60,nbf:now,iat:now,jti:randomUUID()};const input=[{alg:'HS256',typ:'JWT'},p].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return 'Bearer '+input+'.'+createHmac('sha256',config.secret).update(input).digest('base64url');};
function httpFixture(t,enabled){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'g27-release-http-'));build({outputDirectory:directory});
 const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy,orderWebhook:config,...(enabled?{shopifySessions:config}:{})});
 const data=populate(w.customerDrafts),line=data.deliver(),server=createPreviewServer({workshop:w,outputDirectory:directory});server.address=()=>({port:8765});
 const request=(url,method='GET',body,headers={})=>new Promise(resolve=>{
  const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);Object.assign(req,{url,method,headers:{host:'127.0.0.1:8765','content-type':'application/json',...headers}});
  const res=new EventEmitter();res.headersSent=false;res.writeHead=(status,h)=>{Object.assign(res,{status,headers:h,headersSent:true});return res;};
  res.end=bytes=>{res.bytes=Buffer.from(bytes||'');if(res.headers['Content-Type']?.startsWith('application/json'))res.body=JSON.parse(res.bytes);resolve(res);};
  server.emit('request',req,res);
 });
 t.after(()=>{w.close();fs.rmSync(directory,{recursive:true,force:true});});return {...data,line,w,request};
}
test('HTTP routes expose the release state and accept transitions only with merchant auth and CSRF; actor comes from the session',async t=>{
 const f=httpFixture(t,true),route='/api/workshop/orders/'+f.line.id+'/production',admin={authorization:jwt()};
 assert.equal((await f.request(route)).status,401);
 const state=await f.request(route,'GET',undefined,admin);assert.equal(state.status,200);assert.equal(state.body.state,'eingegangen');assert.equal(state.headers['Cache-Control'],'no-store');
 assert.equal((await f.request(route+'/transition','POST',{to:'geprueft'},admin)).status,403);
 const session=await f.request('/api/workshop/session','GET',undefined,admin);admin['x-gravuru-csrf']=session.body.csrfToken;
 assert.equal((await f.request(route+'/transition','POST',{to:'geprueft',extra:1},admin)).status,422);
 assert.equal((await f.request(route+'/transition','POST',{to:'fertig'},admin)).status,409);
 assert.equal((await f.request(route+'/transition','POST',{to:'fehler'},admin)).status,422);
 const checked=await f.request(route+'/transition','POST',{to:'geprueft'},admin);assert.equal(checked.status,201);assert.equal(checked.body.state,'geprueft');assert.equal(checked.body.actor,'merchant:123');
 assert.equal((await f.request(route,'POST',{to:'geprueft'},admin)).status,405);
 assert.equal((await f.request('/api/workshop/orders/orderline_'+randomUUID()+'/production','GET',undefined,admin)).status,404);
 const orders=await f.request('/api/workshop/orders','GET',undefined,admin);assert.equal(orders.body.statuses[f.line.id].production.state,'geprueft');assert.equal(orders.body.statuses[f.line.id].productionReady,false);
 const failed=await f.request(route+'/transition','POST',{to:'fehler',reason:'Foto zu klein'},admin);assert.equal(failed.status,201);assert.equal(failed.body.reason,'Foto zu klein');
 const status=await f.request('/api/workshop/orders/'+f.line.id+'/status','GET',undefined,admin);assert.equal(status.body.production.state,'fehler');assert.equal(status.body.productionReady,false);
});
test('local operator session records a derived session actor and a saved check re-evaluates auto release',async t=>{
 const f=httpFixture(t,false),route='/api/workshop/orders/'+f.line.id+'/production';
 const session=await f.request('/api/workshop/session');assert.equal(session.body.scope,'local-operator');const headers={'x-gravuru-csrf':session.body.csrfToken};
 const checked=await f.request(route+'/transition','POST',{to:'geprueft'},headers);assert.equal(checked.status,201);assert.match(checked.body.actor,/^werkstatt:[a-f0-9]{12}$/);assert.ok(!checked.body.actor.includes(session.body.csrfToken.slice(0,12)));
 const checks='/api/workshop/export-jobs/'+f.job.id+'/checks';
 const saved=await f.request(checks,'POST',{requestId:randomUUID(),format:'pdf',sha256:sha(Buffer.from('%PDF-1.7\nsynthetic\n%%EOF')),stage:'print',result:'passed',machine:'Synthetische Maschine',software:'Synthetischer RIP',notes:''},headers);
 assert.equal(saved.status,201,JSON.stringify(saved.body));assert.deepEqual(saved.body.autoReleased,[]);assert.equal(saved.body.productionReady,false);
 const after=await f.request(route);assert.equal(after.body.state,'geprueft');assert.equal(after.body.checks.ok,true);assert.equal(after.body.productionReady,false);
 const released=await f.request(route+'/transition','POST',{to:'freigegeben'},headers);assert.equal(released.body.productionReady,true);
 assert.equal((await f.request('/werkstatt/bestellungen/')).status,200);assert.equal((await f.request('/workshop-ui/production-release-ui.mjs')).status,200);
});
