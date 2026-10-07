import test from 'node:test';
import assert from 'node:assert/strict';
import {refundReport,lineRefunds} from './order-refunds.mjs';
const line={lineId:'201',quantity:2};
const item=(patch={})=>({line_item_id:201,quantity:1,subtotal:'10.00',total_tax:'1.90',...patch});
const payload=(items=[item()])=>({currency:'EUR',refunds:[{id:501,refund_line_items:items}]});
const report=(p=payload(),updatedAt='2026-10-07T12:00:00.000Z')=>({updatedAt,report:refundReport(p)});

test('line allocations use exact EUR cents and exclude other lines, shipping and private payload data',()=>{
 const p=payload([item(),item({line_item_id:202,subtotal:'7.50',total_tax:'1.43'})]);
 Object.assign(p.refunds[0],{note:'private note',transactions:[{authorization:'private receipt',amount:'12.00'}],order_adjustments:[{amount:'2.00'}],refund_shipping_lines:[{subtotal_amount_set:{shop_money:{amount:'3.00'}}}]});
 p.refunds[0].refund_line_items[0].line_item={title:'private title',properties:[{value:'private text'}]};
 const r=report(p),result=lineRefunds(line,[r],r.updatedAt);
 assert.equal(result.quantity,1);assert.equal(result.subtotalCents,1000);assert.equal(result.taxCents,190);
 assert.equal(result.paymentConfirmed,false);assert.equal(result.requiresReview,true);assert.ok(!JSON.stringify(r).includes('private'));
 assert.equal(lineRefunds({lineId:'999',quantity:1},[r],r.updatedAt).subtotalCents,0);
});
test('shop money wins over presentment currency and legacy floats support only cent precision',()=>{
 const r=refundReport(payload([item({subtotal:77,subtotal_set:{shop_money:{amount:'0.29',currency_code:'EUR'},presentment_money:{amount:'999.00',currency_code:'USD'}},total_tax:.06})]));
 assert.equal(r[0].lines[0].subtotalCents,29);assert.equal(r[0].lines[0].taxCents,6);
 assert.throws(()=>refundReport(payload([item({total_tax:1.001})])),{code:'order_refunds'});
 assert.throws(()=>refundReport(payload([item({subtotal_set:{shop_money:{amount:'10.00',currency_code:'USD'}}})])),{code:'order_refunds'});
});
test('absent detail is unknown, explicit empty is zero, missing newer detail stays visibly stale',()=>{
 assert.equal(refundReport({currency:'EUR'}),null);
 assert.equal(lineRefunds(line,[],null).subtotalCents,null);
 const r=report({currency:'EUR',refunds:[]});
 assert.equal(lineRefunds(line,[r],r.updatedAt).subtotalCents,0);
 const known=report(),stale=lineRefunds(line,[known],'2026-10-07T13:00:00.000Z');
 assert.equal(stale.subtotalCents,1000);assert.equal(stale.stale,true);assert.equal(stale.requiresReview,true);
});
test('cumulative snapshots are idempotent, ordered by shop time and support multiple partial allocations',()=>{
 const first=report(),p=payload();p.refunds.push({id:502,refund_line_items:[item({subtotal:'5.00',total_tax:'0.95'})]});
 const second=report(p,'2026-10-07T13:00:00.000Z');
 const reversed=structuredClone(p);reversed.refunds.reverse();
 const r=lineRefunds(line,[second,first,report(reversed,second.updatedAt)],second.updatedAt);
 assert.equal(r.subtotalCents,1500);assert.equal(r.quantity,2);assert.equal(r.refundCount,2);assert.equal(r.conflict,false);
});
test('same-time disagreements, removed/changed allocations and excessive quantities require review without a guessed total',()=>{
 const first=report(),changed=report(payload([item({subtotal:'9.00'})]));
 for(const reports of [[first,changed],[first,report({currency:'EUR',refunds:[]},'2026-10-07T13:00:00.000Z')],[first,report(payload([item({quantity:3})]),'2026-10-07T13:00:00.000Z')]]){
  const result=lineRefunds(line,reports,'2026-10-07T13:00:00.000Z');
  assert.equal(result.conflict,true);assert.equal(result.subtotalCents,null);assert.equal(result.requiresReview,true);
 }
});
test('malformed IDs, duplicate entries, invalid quantities, money and incomplete reports fail explicitly',()=>{
 for(const patch of [{line_item_id:9007199254740992},{line_item_id:null},{quantity:-1},{quantity:1.5},{subtotal:'NaN'},{subtotal:'-1.00'},{subtotal:'1000000.01'},{total_tax:undefined},{subtotal_set:null}])assert.throws(()=>refundReport(payload([item(patch)])),{code:'order_refunds'});
 for(const p of [{currency:'EUR',refunds:null},payload([item(),item()]),{currency:'EUR',refunds:[{id:501,refund_line_items:[]},{id:501,refund_line_items:[]}]}])assert.throws(()=>refundReport(p),{code:'order_refunds'});
 assert.throws(()=>refundReport({id:101,currency:'EUR',refunds:[{id:501,order_id:999,refund_line_items:[]}]}),{code:'order_refunds'});
});
