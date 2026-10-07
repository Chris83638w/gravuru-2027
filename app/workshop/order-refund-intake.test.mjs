import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,createHmac} from 'node:crypto';
import {createOrderIntake} from './order-intake.mjs';

function fixture(t){
 const dir=mkdtempSync(path.join(tmpdir(),'g27-line-refunds-')),filename=path.join(dir,'orders.sqlite');
 const config={shopDomain:'synthetic.myshopify.com',apiVersion:'2026-07',secret:randomBytes(32).toString('hex')};
 const snapshot={id:'proof_synthetic',packageSha256:'a'.repeat(64),product:{id:'cfg_synthetic',revision:1,name:'Prüfschild',basePriceCents:1000,currency:'EUR'}};
 let db,intake;const open=()=>{db=new DatabaseSync(filename);intake=createOrderIntake({database:db,snapshot:()=>structuredClone(snapshot)});};open();
 const binding=intake.bind({shopDomain:config.shopDomain,variantId:301,record:{id:'cfg_synthetic',revision:1,status:'draft',document:{schema:'gravuru-form-product/v1',kind:'product',basePriceCents:1000,designs:[{}]}}});
 const offers=[1,2].map(()=>intake.offer({bindingId:binding.id,snapshotId:snapshot.id,quantity:2}));
 const paid={id:101,test:true,financial_status:'paid',updated_at:'2026-10-07T10:00:00Z',currency:'EUR',customer:{id:401,email:'private@example.invalid'},line_items:offers.map((offer,i)=>({id:201+i,variant_id:301,quantity:2,price:'10.00',properties:[offer.property]}))};
 const allocation={id:501,refund_line_items:[{line_item_id:201,quantity:1,subtotal:'8.40',total_tax:'1.60'}],note:'private note',transactions:[{status:'pending',authorization:'private receipt'}]};
 const update={...paid,financial_status:'partially_refunded',updated_at:'2026-10-07T11:00:00Z',refunds:[allocation]};
 const receive=(payload,eventId,topic='orders/updated',patch={})=>{
  const raw=Buffer.from(JSON.stringify(payload)),headers={'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-topic':topic,'x-shopify-webhook-id':eventId,'x-shopify-api-version':config.apiVersion,'x-shopify-shop-domain':config.shopDomain,...patch};
  return intake.receive(raw,headers,config);
 };
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 return {get db(){return db;},get intake(){return intake;},paid,update,receive,offers,reopen(){db.close();open();}};
}

test('signed cumulative updates isolate line totals, survive restart and never change the paid documents',t=>{
 const f=fixture(t),lines=f.receive(f.paid,'paid-event-1001','orders/paid').lines;
 f.receive(f.update,'refund-event-1001');f.receive(f.update,'refund-event-1002');
 assert.equal(f.intake.status(lines[0].id).refunds.subtotalCents,840);
 assert.equal(f.intake.status(lines[1].id).refunds.subtotalCents,0);
 assert.equal(f.receive(f.update,'refund-event-1001').duplicate,true);
 const next=structuredClone(f.update);next.updated_at='2026-10-07T12:00:00Z';next.refunds.push({id:502,refund_line_items:[{line_item_id:201,quantity:1,subtotal:'4.20',total_tax:'0.80'}]});
 f.receive(next,'refund-event-1003');f.receive(f.update,'refund-old-1001');f.reopen();
 const state=f.intake.status(lines[0].id);assert.equal(state.refunds.subtotalCents,1260);assert.equal(state.refunds.quantity,2);assert.equal(state.refunds.stale,false);assert.equal(state.refunds.conflict,false);assert.equal(state.refunds.paymentConfirmed,false);
 for(const line of lines)assert.deepEqual(f.intake.get(line.id),line);
 const stored=JSON.stringify(f.db.prepare('SELECT * FROM form_order_refund_reports').all());
 for(const value of ['private@example.invalid','private note','private receipt',f.offers[0].property.value])assert.ok(!stored.includes(value));
 assert.throws(()=>f.db.exec("UPDATE form_order_refund_reports SET report='[]'"),/immutable/);
 assert.throws(()=>f.db.exec('DELETE FROM form_order_refund_reports'),/retention/);
});
test('refund before paid admission is retained; missing latest detail never becomes zero',t=>{
 const f=fixture(t);assert.equal(f.receive(f.update,'early-refund-1001').matchedLines,0);
 const line=f.receive(f.paid,'later-paid-1001','orders/paid').lines[0];assert.equal(f.intake.status(line.id).refunds.subtotalCents,840);
 f.receive({...f.paid,updated_at:'2026-10-07T12:00:00Z'},'new-no-detail-1001');
 const status=f.intake.status(line.id);assert.equal(status.state,'paid');assert.equal(status.refunds.stale,true);assert.equal(status.requiresReview,true);assert.equal(status.refunds.subtotalCents,840);assert.equal(status.customerDownloadAllowed,false);
});
test('malformed or unauthenticated refund snapshots create no partial status or allocation rows',t=>{
 const f=fixture(t);f.receive(f.paid,'paid-start-1001','orders/paid');
 const count=table=>f.db.prepare('SELECT count(*) AS n FROM '+table).get().n,initial=count('form_order_status_events');
 const bad=structuredClone(f.update);bad.refunds[0].refund_line_items[0].quantity=-1;
 assert.throws(()=>f.receive(bad,'malformed-1001'),{code:'order_refunds'});
 assert.throws(()=>f.receive(f.update,'unsigned-1001','orders/updated',{'x-shopify-hmac-sha256':'a'.repeat(43)+'='}),/nicht bestätigt/);
 assert.throws(()=>f.receive({...f.update,test:false},'live-refund-1001'),/Live/);
 assert.throws(()=>f.receive(f.update,'unsupported-1001','refunds/create'));
 assert.equal(count('form_order_status_events'),initial);assert.equal(count('form_order_refund_reports'),0);
});
test('changed allocations under new events are flagged and event ID collisions roll back',t=>{
 const f=fixture(t),line=f.receive(f.paid,'paid-conflict-1001','orders/paid').lines[0];
 f.receive(f.update,'refund-conflict-1001');const changed=structuredClone(f.update);changed.refunds[0].refund_line_items[0].subtotal='9.00';
 assert.throws(()=>f.receive(changed,'refund-conflict-1001'),/anderem Inhalt/);
 f.receive(changed,'refund-conflict-1002');const result=f.intake.status(line.id);
 assert.equal(result.refunds.conflict,true);assert.equal(result.refunds.subtotalCents,null);assert.equal(result.requiresReview,true);assert.equal(result.productionReady,false);
 f.reopen();assert.deepEqual(f.intake.status(line.id),result);
});
