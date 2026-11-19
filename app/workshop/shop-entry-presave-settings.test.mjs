import test from 'node:test';
import assert from 'node:assert/strict';
import {customerIntegrationFromEnv} from './acryl-employee-host.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';

test('pre-save cannot activate implicitly or enable the customer integration by itself',()=>{
 const base={GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'};
 assert.equal(customerIntegrationFromEnv(base).shopEntry.preSaveOnReview,undefined);
 assert.equal(customerIntegrationFromEnv({...base,GRAVURU_CUSTOMER_PRE_SAVE_ON_REVIEW:''}).shopEntry.preSaveOnReview,undefined);
 assert.equal(customerIntegrationFromEnv({...base,GRAVURU_CUSTOMER_PRE_SAVE_ON_REVIEW:'enabled'}).shopEntry.preSaveOnReview,true);
 assert.throws(()=>customerIntegrationFromEnv({GRAVURU_CUSTOMER_PRE_SAVE_ON_REVIEW:'enabled'}),{code:'customer_pre_save_env'});
 for(const bad of ['true','1','on','disabled','Enabled',true])assert.throws(()=>customerIntegrationFromEnv({...base,GRAVURU_CUSTOMER_PRE_SAVE_ON_REVIEW:bad}),{code:'customer_pre_save_env'});
});

test('host integration rejects nonboolean pre-save settings before opening services',()=>{
 const stub={orderIntake:{},repository:{},customerDrafts:{}};
 for(const bad of ['enabled',1,{},null])assert.throws(()=>createConfiguratorIntegration({settings:{mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl',shopEntry:{proxyPath:'/apps/konfigurator',preSaveOnReview:bad}},legacy:{...stub,repository:{a:1},customerDrafts:{a:1}},acryl:{...stub,repository:{b:1},customerDrafts:{b:1}},origin:'https://app.example',shopifySessions:{shopDomain:'x.myshopify.com',secret:'s'.repeat(32),clientId:'c'}}),/Kundeneinstieg ist nicht eindeutig eingerichtet/);
});
