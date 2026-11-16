import test from 'node:test';
import assert from 'node:assert/strict';
import {createCartEditAccess} from './cart-edit-access.mjs';

test('cart edit access expires and is bound to the saved revision, shop identity and buyer',()=>{
 let now=10_000;
 const access=createCartEditAccess({secret:'synthetic-shop-entry-secret',clock:()=>now});
 const binding={shopDomain:'synthetic.myshopify.com',storeId:'native',tenantId:'tenant',shopifyProductId:'gid://shopify/Product/1',
  shopifyVariantId:'gid://shopify/ProductVariant/2',productId:'cfg_product',productRevision:1};
 const scope={configId:'konfig_example',rev:1,binding,customerId:'42'};
 const draftToken='a'.repeat(64),grant=access.issue(draftToken,scope);
 assert.equal(access.recover(grant.token,scope),draftToken);
 assert.ok(!grant.token.includes(draftToken));
 for(const changed of [{rev:2},{configId:'konfig_other'},{customerId:'43'},{binding:{...binding,tenantId:'foreign'}},
  {binding:{...binding,shopifyVariantId:'gid://shopify/ProductVariant/3'}},{binding:{...binding,productRevision:2}}]){
  assert.equal(access.recover(grant.token,{...scope,...changed}),null);
 }
 const altered=grant.token.slice(0,10)+(grant.token[10]==='A'?'B':'A')+grant.token.slice(11);
 assert.equal(access.recover(altered,scope),null);
 now=grant.expiresAt;
 assert.equal(access.recover(grant.token,scope),null);
});
