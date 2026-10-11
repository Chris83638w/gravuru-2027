import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftTokenProvider} from './shopify-draft-token.mjs';
const c={shopDomain:'fixture.myshopify.com',clientId:'fixture-client',clientSecret:'private-test-secret-value'};
test('draft token requires granted write_products, is shared in memory and refreshed before expiry',async()=>{
 let now=0,calls=0;
 const token=createDraftTokenProvider(c,{now:()=>now,fetchImpl:async(url,o)=>{calls++;assert.equal(url,'https://fixture.myshopify.com/admin/oauth/access_token');assert.equal(o.redirect,'manual');assert.equal(o.body.get('grant_type'),'client_credentials');assert.equal(o.body.has('scope'),false);return Response.json({access_token:'verified-token-value-'+calls,expires_in:86399,scope:'read_orders,write_products'});}});
 assert.deepEqual(await Promise.all([token(),token()]),['verified-token-value-1','verified-token-value-1']);assert.equal(calls,1);
 now=86339000;assert.equal(await token(),'verified-token-value-2');assert.equal(calls,2);
});
test('token failures never leak credentials and do not retry automatically',async()=>{
 for(const response of [Response.json({access_token:'private-token-value',expires_in:86399,scope:'read_products'}),Response.json({error:c.clientSecret},{status:401}),Response.json({access_token:'private-token-value',expires_in:999999,scope:'write_products'})]){
  let calls=0;const token=createDraftTokenProvider(c,{fetchImpl:async()=>{calls++;return response;}});
  await assert.rejects(token(),e=>!e.message.includes(c.clientSecret)&&!e.message.includes('private-token-value')&&/write_products/.test(e.message));assert.equal(calls,1);
 }
});
