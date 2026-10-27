import test from 'node:test';
import assert from 'node:assert/strict';
import { customerIntegrationFromEnv, acrylRoute } from './acryl-employee-host.mjs';

test('doorbell live orders require an exact additional approval and existing customer integration',()=>{
 assert.equal(customerIntegrationFromEnv({}),null);
 assert.equal(customerIntegrationFromEnv({GRAVURU_DOORBELL_LIVE_ORDERS:''}),null);
 const base={GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'};
 assert.equal(customerIntegrationFromEnv(base).doorbellLiveOrders,undefined);
 assert.deepEqual(customerIntegrationFromEnv({...base,GRAVURU_DOORBELL_LIVE_ORDERS:'approved-20261027'}),{
  mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl',
  shopEntry:{proxyPath:'/apps/konfigurator'},doorbellLiveOrders:true
 });
 for(const flag of ['true','1','approved','approved-20261028',true,null])
  assert.throws(()=>customerIntegrationFromEnv({...base,GRAVURU_DOORBELL_LIVE_ORDERS:flag}),{code:'doorbell_live_orders_env'});
 assert.throws(()=>customerIntegrationFromEnv({GRAVURU_DOORBELL_LIVE_ORDERS:'approved-20261027'}),{code:'doorbell_live_orders_env'});
 assert.throws(()=>customerIntegrationFromEnv({GRAVURU_CUSTOMER_INTEGRATION:'live',GRAVURU_DOORBELL_LIVE_ORDERS:'approved-20261027'}),{code:'customer_integration_env'});
});

test('only exact public doorbell content hashes route into the new runtime',()=>{
 const hash='0123456789abcdef'.repeat(4),asset='/doorbell-assets/'+hash+'.webp';
 assert.equal(acrylRoute(asset),asset);
 for(const pathname of ['/doorbell-assets/',asset+'/extra',asset+'?x=1',asset.replace('.webp','.png'),asset.toUpperCase(),'/doorbell-assets/../secret.webp','/doorbell-assets/'+hash.slice(1)+'.webp','/doorbell-assets/%2e%2e/secret.webp'])
  assert.equal(acrylRoute(pathname),null);
 assert.equal(acrylRoute('/werkstatt/'),null);
});

