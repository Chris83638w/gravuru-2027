import test from 'node:test';
import assert from 'node:assert/strict';
import {shopCartRequest,checkoutTarget} from './shop-cart.mjs';

const konfig='konfig_'+'1'.repeat(8)+'-1111-1111-1111-'+'1'.repeat(12),line='gid://shopify/CartLine/1?cart=x';
const saved={draftId:'adraft_a',revision:3,draftToken:'t'.repeat(64)};

test('K8: only the cart line of the same draft is replaced; other drafts are added fresh',()=>{
 assert.deepEqual(shopCartRequest({saved,cartEdit:null,quantity:2}),{draftId:'adraft_a',expectedRevision:3,quantity:2});
 assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:line,draftId:'adraft_a'},quantity:2}),{draftId:'adraft_a',expectedRevision:3,quantity:2,configId:konfig,cartLineId:line});
 assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:null,draftId:'adraft_a'},quantity:1}),{draftId:'adraft_a',expectedRevision:3,quantity:1,configId:konfig});
 assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:line,draftId:'adraft_other'},quantity:1}),{draftId:'adraft_a',expectedRevision:3,quantity:1});
 assert.ok(!JSON.stringify(shopCartRequest({saved,cartEdit:null,quantity:1})).includes(saved.draftToken));
});
test('the customer is only forwarded to the confirmed shop checkout',()=>{
 const good={checkoutUrl:'https://gravuru-design.myshopify.com/checkouts/cn/abc?key=1',paymentConfirmed:false,totalCents:1148};
 assert.equal(checkoutTarget(good,'gravuru-design.myshopify.com'),good.checkoutUrl);
 for(const bad of [{...good,checkoutUrl:'https://evil.example/checkout'},{...good,checkoutUrl:'http://gravuru-design.myshopify.com/checkout'},{...good,paymentConfirmed:true},{...good,totalCents:'11.48'},{...good,checkoutUrl:'https://user:pw@gravuru-design.myshopify.com/x'},{},null])assert.throws(()=>checkoutTarget(bad,'gravuru-design.myshopify.com'),/nicht bestätigt/);
});
