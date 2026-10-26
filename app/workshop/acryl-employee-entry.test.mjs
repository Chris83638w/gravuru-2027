import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {customerIntegrationFromEnv} from './acryl-employee-host.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';

const entry=fileURLToPath(new URL('../../scripts/acryl-employee-entry.cjs',import.meta.url));
// Der Einstieg wird ohne Release, Daten und Shopify-Konfiguration gestartet: er darf nur an der Entscheidung über die
// Kundenanbindung oder – danach – am fehlenden Legacy-Release scheitern, nie eine Datenbank oder einen Port öffnen.
const start=extra=>spawnSync(process.execPath,[entry],{env:{PATH:process.env.PATH,...extra},encoding:'utf8',timeout:60000});

test('customer integration stays off unless the host variable is set',()=>{
 assert.equal(customerIntegrationFromEnv({}),null);
 assert.equal(customerIntegrationFromEnv({GRAVURU_CUSTOMER_INTEGRATION:''}),null);
 assert.equal(customerIntegrationFromEnv({GRAVURU_CUSTOMER_INTEGRATION:undefined,GRAVURU_SHOPIFY_ORDER_WEBHOOK:'test-only-2026-07'}),null);
});

test('merchant-test-only switches on both fixed stores and the App-Proxy entry, nothing else',()=>{
 const settings=customerIntegrationFromEnv({GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'});
 assert.deepEqual(settings,{mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl',shopEntry:{proxyPath:'/apps/konfigurator'}});
 assert.notEqual(customerIntegrationFromEnv({GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'}),settings);
 // Die Einstellung besteht die Prüfung des Integrationsbausteins (Modus, Store-Kennungen, Einstiegsschlüssel);
 // erst an den hier fehlenden echten Stores scheitert der Aufbau.
 const stores={legacy:{repository:{},customerDrafts:{}},acryl:{repository:{},customerDrafts:{}}};
 assert.throws(()=>createConfiguratorIntegration({settings,...stores,shopifySessions:{shopDomain:'shop.myshopify.com',secret:'synthetic-app-secret-value',clientId:'c'}}),e=>!/Kundeneinstieg|Eindeutige private Test-Stores/.test(e.message));
});

test('every other value is refused instead of being guessed',()=>{
 for(const value of ['true','1','on','off','live','public','Merchant-Test-Only',' merchant-test-only','merchant-test-only ','merchant-test-only,live'])
  assert.throws(()=>customerIntegrationFromEnv({GRAVURU_CUSTOMER_INTEGRATION:value}),{code:'customer_integration_env'});
});

test('entry script: an invalid value stops the start before any release, database or port is touched',()=>{
 const result=start({GRAVURU_CUSTOMER_INTEGRATION:'live'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/GRAVURU_CUSTOMER_INTEGRATION/);
 assert.doesNotMatch(result.stderr,/Vorherigen Start/);
});

test('entry script: without the variable and with the valid value the start fails only on the missing release',()=>{
 for(const extra of [{},{GRAVURU_CUSTOMER_INTEGRATION:''},{GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'}]){
  const result=start(extra);
  assert.equal(result.status,1);
  assert.match(result.stderr,/Vorherigen Start verwenden/);
  assert.doesNotMatch(result.stderr,/GRAVURU_CUSTOMER_INTEGRATION/);
 }
});
