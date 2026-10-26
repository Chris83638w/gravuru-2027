import test from 'node:test';
import assert from 'node:assert/strict';
import {shopCartRequest,checkoutTarget,themeCartTarget} from './shop-cart.mjs';

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

test('theme transfer accepts only this shop and its signed-proxy handoff path',()=>{
 const path='/apps/konfigurator/cart',shop='test.myshopify.com',result={mode:'theme',paymentConfirmed:false,totalCents:1499,handoffUrl:'https://'+shop+path+'#handoff='+'a'.repeat(64)};
 assert.equal(themeCartTarget(result,shop,path),result.handoffUrl);
 for(const handoffUrl of ['http://'+shop+path+'#handoff='+'a'.repeat(64),'https://evil.example'+path+'#handoff='+'a'.repeat(64),'https://'+shop+'/cart#handoff='+'a'.repeat(64),result.handoffUrl.replace('#','?bad=1#'),result.handoffUrl.slice(0,-1)])assert.throws(()=>themeCartTarget({...result,handoffUrl},shop,path));
 for(const patch of [{mode:'storefront'},{paymentConfirmed:true},{totalCents:NaN}])assert.throws(()=>themeCartTarget({...result,...patch},shop,path));
});

test('theme edits carry the actual cart revision even after abandoned preparation',()=>{assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:'theme',draftId:'adraft_a'},quantity:2}),{draftId:'adraft_a',expectedRevision:3,quantity:2,configId:konfig,cartLineId:'theme',cartRevision:1});});
