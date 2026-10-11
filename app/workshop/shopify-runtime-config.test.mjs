import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {shopifyRuntimeConfig,checkShopifyRuntime,REQUIRED_SHOPIFY_FIELDS,SHOPIFY_IDENTITY} from './shopify-runtime-config.mjs';
import {createShopifyTestRuntime} from './shopify-admin-test-server.mjs';
const env=()=>({GRAVURU_SHOPIFY_SHOP_DOMAIN:'gravuru-design.myshopify.com',GRAVURU_SHOPIFY_CLIENT_ID:SHOPIFY_IDENTITY.clientId,GRAVURU_SHOPIFY_CLIENT_SECRET:randomBytes(32).toString('hex'),GRAVURU_SHOPIFY_APP_ORIGIN:'https://workshop.example',GRAVURU_PRIVATE_DATA_DIR:'/tmp/gravuru-test-not-created'});
test('readiness reports exact missing field names without values or pretending authenticated access',()=>{
 assert.deepEqual(checkShopifyRuntime({}).missing,REQUIRED_SHOPIFY_FIELDS);const input=env();delete input.GRAVURU_SHOPIFY_APP_ORIGIN;const result=checkShopifyRuntime(input);assert.deepEqual(result.missing,['GRAVURU_SHOPIFY_APP_ORIGIN']);assert.equal(result.credentialsVerified,false);assert.ok(!JSON.stringify(result).includes(input.GRAVURU_SHOPIFY_CLIENT_SECRET));
});
test('complete config wires matching host/session and keeps transfer disabled without optional token',()=>{
 const input=env(),config=shopifyRuntimeConfig(input);assert.equal(config.shopDrafts,null);assert.equal(config.shopifySessions.secret,input.GRAVURU_SHOPIFY_CLIENT_SECRET);assert.equal(config.embeddedApp.clientId,config.shopifySessions.clientId);assert.equal(config.port,8962);
 assert.deepEqual(checkShopifyRuntime(input),{configured:true,scope:'merchant-embedded-test',draftTransferConfigured:false,credentialsVerified:false,httpsHostVerified:false,privateStorageVerified:false});
});
test('optional Admin token enables only draft transfer in fixed shop and API version, without probing network',()=>{
 const input={...env(),GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN:randomBytes(24).toString('hex')},config=shopifyRuntimeConfig(input);
 assert.equal(config.shopDrafts.config.mode,'draft-only');assert.equal(config.shopDrafts.config.apiVersion,'2026-07');assert.equal(config.shopDrafts.config.shopDomain,config.embeddedApp.shopDomain);assert.equal(checkShopifyRuntime(input).draftTransferConfigured,true);assert.ok(!JSON.stringify(checkShopifyRuntime(input)).includes(input.GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN));
});
test('explicit organization credential mode uses existing secret privately and enables drafts only',()=>{
 const input={...env(),GRAVURU_SHOPIFY_DRAFT_TRANSFER:'draft-only'},config=shopifyRuntimeConfig(input);
 assert.equal(config.shopDrafts.config.mode,'draft-only');assert.equal(typeof config.shopDrafts.config.getAccessToken,'function');assert.equal(config.shopDrafts.config.accessToken,undefined);
 assert.equal(checkShopifyRuntime(input).draftTransferConfigured,true);assert.ok(!JSON.stringify(config.shopDrafts).includes(input.GRAVURU_SHOPIFY_CLIENT_SECRET));
 assert.throws(()=>shopifyRuntimeConfig({...input,GRAVURU_SHOPIFY_DRAFT_TRANSFER:'publish'}));
});
for(const [key,value]of Object.entries({GRAVURU_SHOPIFY_SHOP_DOMAIN:'other.myshopify.com',GRAVURU_SHOPIFY_CLIENT_ID:'"><script>',GRAVURU_SHOPIFY_CLIENT_SECRET:'short',GRAVURU_SHOPIFY_APP_ORIGIN:'http://workshop.example',GRAVURU_PRIVATE_DATA_DIR:process.cwd(),GRAVURU_SHOPIFY_TEST_PORT:'80',GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN:'token\nheader'}))test('invalid runtime configuration cannot start: '+key,()=>{
 const input={...env(),[key]:value};assert.equal(checkShopifyRuntime(input).error,'invalid_configuration');assert.throws(()=>shopifyRuntimeConfig(input),e=>!e.message.includes(value));
});
test('private directory must already exist and have private permissions; check never creates storage',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-runtime-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const missing=path.join(dir,'missing');assert.equal(checkShopifyRuntime({...env(),GRAVURU_PRIVATE_DATA_DIR:missing}).configured,true);assert.ok(!fs.existsSync(missing));assert.throws(()=>createShopifyTestRuntime({...env(),GRAVURU_PRIVATE_DATA_DIR:missing}));assert.ok(!fs.existsSync(missing));fs.chmodSync(dir,0o755);assert.throws(()=>createShopifyTestRuntime({...env(),GRAVURU_PRIVATE_DATA_DIR:dir}));assert.deepEqual(fs.readdirSync(dir),[]);
});
test('symlinked database or WAL is rejected before any build/database opening',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-runtime-links-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const name of ['workshop.sqlite','profiles.sqlite-wal','design-assets.sqlite-shm']){const dir=fs.mkdtempSync(path.join(root,'private-')),outside=path.join(root,'outside');fs.writeFileSync(outside,'unchanged');fs.symlinkSync(outside,path.join(dir,name));assert.throws(()=>createShopifyTestRuntime({...env(),GRAVURU_PRIVATE_DATA_DIR:dir}));assert.equal(fs.readFileSync(outside,'utf8'),'unchanged');assert.deepEqual(fs.readdirSync(dir),[name]);}
});
test('explicit runtime constructs the real authenticated server with isolated private storage, no listener or shop writes',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-runtime-real-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const {server,port}=createShopifyTestRuntime({...env(),GRAVURU_PRIVATE_DATA_DIR:dir});assert.equal(server.listening,false);assert.equal(port,8962);assert.ok(fs.existsSync(path.join(dir,'workshop.sqlite')));assert.ok(fs.existsSync(path.join(dir,'profiles.sqlite')));await new Promise(resolve=>{server.once('close',resolve);server.close();});
});

test('private storage inside another Git checkout is rejected without touching its files',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-runtime-git-')),dir=path.join(root,'private');fs.mkdirSync(dir,{mode:0o700});fs.writeFileSync(path.join(root,'.git'),'gitdir: synthetic');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));assert.throws(()=>createShopifyTestRuntime({...env(),GRAVURU_PRIVATE_DATA_DIR:dir}));assert.deepEqual(fs.readdirSync(dir),[]);
});

test('verified public identity needs no user-provided key and never silently switches apps',()=>{const input=env();delete input.GRAVURU_SHOPIFY_CLIENT_ID;delete input.GRAVURU_SHOPIFY_SHOP_DOMAIN;const config=shopifyRuntimeConfig(input);assert.equal(config.shopifySessions.clientId,SHOPIFY_IDENTITY.clientId);assert.equal(config.shopifySessions.shopDomain,SHOPIFY_IDENTITY.shopDomain);assert.throws(()=>shopifyRuntimeConfig({...input,GRAVURU_SHOPIFY_CLIENT_ID:'another-valid-id'}));});
