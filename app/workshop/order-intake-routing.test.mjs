import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {createOrderIntake} from './order-intake.mjs';
const shop='synthetic-routing.myshopify.com',config={shopDomain:shop,secret:'synthetic-only-not-a-live-secret',apiVersion:'2026-10'};
function fixture(variant=101,tenantId='gravuru'){
 const db=new DatabaseSync(':memory:'),snapshots=new Map(),intake=createOrderIntake({database:db,snapshot:id=>snapshots.get(id),tenantId});
 const productId='cfg_00000000-0000-4000-8000-'+String(variant).padStart(12,'0'),record={id:productId,revision:1,status:'draft',document:{kind:'product',schema:'gravuru-form-product/v1',basePriceCents:2599,designs:[{}]}};
 const binding=intake.bind({shopDomain:shop,variantId:variant,record});
 snapshots.set('synthetic-snapshot',{schema:'gravuru-form-review/v1',product:{id:productId,revision:1,basePriceCents:2599,currency:'EUR'},packageSha256:'a'.repeat(64)});
 const offer=intake.offer({bindingId:binding.id,snapshotId:'synthetic-snapshot',quantity:1});
 return {db,intake,binding,offer,record,line:{id:variant,variant_id:variant,product_id:1001,quantity:1,price:'25.99',properties:[offer.property]}};
}
function event(lines,id='synthetic-event-123'){
 const raw=Buffer.from(JSON.stringify({id:9001,test:true,financial_status:'paid',currency:'EUR',line_items:lines}));
 return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':shop,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':id}};
}
const receive=(f,e,ids)=>f.intake.receive(e.raw,e.headers,config,ids===undefined?undefined:{acceptedLineIds:ids});
test('two stores receive original HMAC payload once, each owns only its selected lines',()=>{
 const a=fixture(),b=fixture(102);try{
  const e=event([a.line,b.line]);
  for(const [f,id] of [[a,101],[b,102]]){const r=receive(f,e,[id]);assert.equal(r.lines.length,1);assert.equal(r.errors.length,0);assert.equal(r.lines[0].productionReady,false);assert.equal(receive(f,e,[id]).duplicate,true);assert.equal(f.intake.list().length,1);}
  assert.equal(a.intake.ownsOfferToken(a.offer.property.value,{shopDomain:shop}),true);
  assert.equal(a.intake.ownsOfferToken(b.offer.property.value),false);
  assert.equal(a.intake.ownsOfferToken(a.offer.property.value,{shopDomain:'other.myshopify.com'}),false);
  assert.equal(a.intake.ownsOfferToken('invalid'),false);
 }finally{a.db.close();b.db.close();}
});
test('cross-store partial failure safely resumes without duplicate first-store admission',()=>{
 const a=fixture(),b=fixture(102);try{
  const e=event([a.line,b.line]);receive(a,e,[101]);
  b.db.exec("CREATE TRIGGER synthetic_abort BEFORE INSERT ON form_order_events BEGIN SELECT RAISE(ABORT,'synthetic failure');END");
  assert.throws(()=>receive(b,e,[102]),/synthetic failure/);assert.equal(b.intake.list().length,0);
  b.db.exec('DROP TRIGGER synthetic_abort');assert.equal(receive(a,e,[101]).duplicate,true);assert.equal(receive(b,e,[102]).lines.length,1);
  assert.equal(a.intake.list().length,1);assert.equal(b.intake.list().length,1);
 }finally{a.db.close();b.db.close();}
});
test('event selection immutable across filtered and old three-argument replays',()=>{
 const f=fixture();try{const e=event([f.line]);receive(f,e,[101]);assert.throws(()=>receive(f,e),/Positionsauswahl/);
  assert.throws(()=>f.db.exec("UPDATE form_order_event_selections SET line_ids='[]'"),/immutable/);
  assert.throws(()=>f.db.exec('DELETE FROM form_order_event_selections'),/immutable/);
 }finally{f.db.close();}
 const old=fixture();try{const e=event([old.line]);assert.equal(receive(old,e).lines.length,1);assert.equal(receive(old,e).duplicate,true);assert.throws(()=>receive(old,e,[101]),/Positionsauswahl/);}finally{old.db.close();}
});
test('untrusted routing, missing IDs, foreign ownership and invalid HMAC never write',()=>{
 const a=fixture(),b=fixture(102);try{const e=event([a.line,b.line]);
  for(const ids of [[],[101,101],[999],[102]])assert.throws(()=>receive(a,e,ids));
  assert.throws(()=>a.intake.receive(e.raw,{...e.headers,'x-shopify-hmac-sha256':'A'.repeat(43)+'='},config,{acceptedLineIds:[101]}),/bestätigt/);
  assert.equal(a.intake.list().length,0);assert.equal(a.db.prepare('SELECT count(*) n FROM form_order_events').get().n,0);
 }finally{a.db.close();b.db.close();}
});
test('known variant without offer retains existing per-line error, unrelated lines excluded',()=>{
 const f=fixture();try{const e=event([{...f.line,properties:[]},{id:102,variant_id:999,properties:[]}]);const r=receive(f,e,[101]);assert.equal(r.lines.length,0);assert.equal(r.errors.length,1);assert.match(r.errors[0].intakeError,/Entwurf/);}finally{f.db.close();}
});
test('three-argument legacy admission still reports foreign offer instead of silently filtering it',()=>{
 const a=fixture(),b=fixture(102);try{const r=receive(a,event([a.line,b.line]));assert.equal(r.lines.length,1);assert.equal(r.errors.length,1);}finally{a.db.close();b.db.close();}
});
test('quantity summary is exact snapshot/product/revision scoped and contains no token',()=>{
 const f=fixture();try{
  const input={offerId:f.offer.id,snapshotId:'synthetic-snapshot',productId:f.record.id,productRevision:1};
  assert.deepEqual(f.intake.offerSummary(input),{quantity:1});
  for(const change of [{snapshotId:'other'},{productId:'other'},{productRevision:2},{offerId:'other'}])assert.throws(()=>f.intake.offerSummary({...input,...change}),{status:404});
  const other=createOrderIntake({database:f.db,snapshot:()=>{},tenantId:'other'});assert.equal(other.ownsOfferToken(f.offer.property.value),false);assert.throws(()=>other.offerSummary(input),{status:404});
 }finally{f.db.close();}
});
test('paid ProductGID is checked against immutable binding history, not newest active assignment',()=>{
 const f=fixture();try{
  f.db.exec('CREATE TABLE shop_product_binding_revisions(tenant_id TEXT,shop TEXT,binding_id TEXT,product_gid TEXT)');
  f.db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,?)').run('gravuru',shop,f.binding.id,'gid://shopify/Product/1001');
  f.db.prepare('INSERT INTO shop_product_binding_revisions VALUES(?,?,?,?)').run('gravuru',shop,'newer-other-binding','gid://shopify/Product/2002');
  const bad=receive(f,event([{...f.line,product_id:2002}],'synthetic-bad-product'),[101]);assert.equal(bad.errors.length,1);assert.equal(bad.lines.length,0);
  const good=receive(f,event([f.line],'synthetic-good-product'),[101]);assert.equal(good.lines.length,1);
 }finally{f.db.close();}
});
