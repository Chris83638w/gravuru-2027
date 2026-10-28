import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopEntrySessions} from './shop-entry-session.mjs';

const binding={storeId:'acryl',shopifyProductId:'gid://shopify/Product/16077793821052',shopifyVariantId:'gid://shopify/ProductVariant/57265872109948',productId:'cfg_92cd80be-b67c-411a-ba1a-20287d9dc1cf',productRevision:3,bindingId:'binding_'+'1'.repeat(8)+'-1111-1111-1111-'+'1'.repeat(12),assignmentRevision:2};
const secret='synthetic-shop-entry-secret';

test('issued session carries only identifiers, verifies, and expires',()=>{
 let now=1_800_000_000_000;const sessions=createShopEntrySessions({secret,clock:()=>now,ttlMs:60*60*1000});
 const issued=sessions.issue(binding,{customerId:'gid://shopify/Customer/5'});
 assert.match(issued.token,/^gse1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
 const payload=JSON.parse(Buffer.from(issued.token.split('.')[1],'base64url').toString());
 assert.deepEqual(Object.keys(payload).sort(),['a','b','c','cu','exp','iat','p','r','sid','st','v','va']);
 assert.ok(!issued.token.includes(secret));
 const session=sessions.verify(issued.token);
 assert.equal(session.storeId,'acryl');assert.equal(session.shopifyProductId,binding.shopifyProductId);assert.equal(session.shopifyVariantId,binding.shopifyVariantId);
 assert.equal(session.productId,binding.productId);assert.equal(session.productRevision,3);assert.equal(session.bindingId,binding.bindingId);assert.equal(session.assignmentRevision,2);
 assert.equal(session.customerId,'gid://shopify/Customer/5');assert.equal(session.sid,issued.sid);assert.equal(session.expiresAt,issued.expiresAt);
 now+=60*60*1000;assert.throws(()=>sessions.verify(issued.token),e=>e.status===403&&e.code==='shop_entry_expired');
});
test('anonymous customers, tampering, foreign keys and malformed tokens are rejected',()=>{
 const sessions=createShopEntrySessions({secret,clock:()=>1_800_000_000_000});
 const {token}=sessions.issue(binding);
 assert.equal(sessions.verify(token).customerId,null);
 const [prefix,body,signature]=token.split('.');
 const forged=JSON.parse(Buffer.from(body,'base64url').toString());forged.r=99;
 assert.throws(()=>sessions.verify(prefix+'.'+Buffer.from(JSON.stringify(forged)).toString('base64url')+'.'+signature),e=>e.code==='shop_entry_session');
 assert.throws(()=>createShopEntrySessions({secret:'other-secret-value-xyz',clock:()=>1_800_000_000_000}).verify(token),e=>e.code==='shop_entry_session');
 for(const bad of [undefined,'',token.slice(0,-1),'gse2.'+body+'.'+signature,token+'.x',body,'a'.repeat(3000)])assert.throws(()=>sessions.verify(bad),e=>e.status===403);
});
test('issue refuses incomplete bindings and configuration limits are enforced',()=>{
 const sessions=createShopEntrySessions({secret,clock:()=>1_800_000_000_000});
 for(const [key,value] of [['productId','cfg_x'],['bindingId','binding_1'],['assignmentRevision',0],['shopifyVariantId','gid://shopify/ProductVariant/abc']])assert.throws(()=>sessions.issue({...binding,[key]:value}),e=>e.status===503);
 assert.throws(()=>createShopEntrySessions({secret:'short'}));
 assert.throws(()=>createShopEntrySessions({secret,ttlMs:13*60*60*1000}));
 assert.throws(()=>createShopEntrySessions({secret,ttlMs:1000}));
});

test('switching sessions keeps the original expiry, including repeated hops and sub-minute remainder',()=>{
 let now=1_800_000_000_000;const sessions=createShopEntrySessions({secret,clock:()=>now,ttlMs:3600000});
 const first=sessions.issue(binding),deadline=first.expiresAt;let previous=first;
 for(const elapsed of [1200000,1200000,1199000]){
  now+=elapsed;previous=sessions.issue(binding,{expiresAt:sessions.verify(previous.token).expiresAt});
  assert.equal(previous.expiresAt,deadline);
 }
 now=Date.parse(deadline);assert.throws(()=>sessions.issue(binding,{expiresAt:deadline}),{code:'shop_entry_expired'});
 assert.throws(()=>sessions.verify(previous.token),{code:'shop_entry_expired'});
 assert.throws(()=>sessions.issue(binding,{expiresAt:'invalid'}),{code:'shop_entry_expiry'});
 const capped=sessions.issue(binding,{expiresAt:new Date(now+24*3600000).toISOString()});
 assert.equal(Date.parse(capped.expiresAt),now+3600000);
});
