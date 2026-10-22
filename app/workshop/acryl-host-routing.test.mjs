import test from 'node:test';
import assert from 'node:assert/strict';
import {acrylRoute,acrylAssetText} from './acryl-employee-host.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';
test('native and form editor aliases remain in their own release',()=>{
 for(const [outer,inner]of [
  ['/_merchant-acryl-editor.html','/_merchant-editor.html'],['/_merchant-acryl-form-editor.html','/_merchant-form-editor.html'],
  ['/_acryl-bundle/editor-0123456789abcdef.mjs','/_bundle/editor-0123456789abcdef.mjs'],
  ['/_acryl-runtime/lazy/fonts.json','/_runtime/lazy/fonts.json'],['/acryl-assets/stand.png','/acrylic-assets/stand.png'],
  ['/acryl-assistant.js','/assistant.js'],['/api/acryl-guides','/api/guides'],
  ['/api/workshop/acryl/customer-drafts','/api/workshop/customer-drafts'],['/workshop-acryl-ui/form-customer-ui.mjs','/workshop-ui/form-customer-ui.mjs']])assert.equal(acrylRoute(outer),inner);
});
test('legacy paths and global integration endpoints keep their host dispatcher',()=>{
 for(const path of ['/_merchant-editor.html','/_bundle/editor-0123456789abcdef.mjs','/_runtime/fonts.json','/api/workshop/session','/api/configurator-test/session','/webhooks/shopify/orders-paid'])assert.equal(acrylRoute(path),null);
});
test('rewritten native resources do not leak into legacy build',()=>{
 const original='"/_bundle/editor-0123456789abcdef.mjs" "/_runtime/lazy/fonts.json" "/acrylic-assets/stand.png" "/configurator/variant-m/ux.mjs" "/_merchant-editor.html"';
 const changed=acrylAssetText(original);for(const route of ['/_acryl-bundle/','/_acryl-runtime/','/acryl-assets/','/acryl-configurator/','/_merchant-acryl-editor.html'])assert.ok(changed.includes(route));
 assert.equal(acrylAssetText('fetch("/api/configurator-test/model")'),'fetch("/api/configurator-test/model")');
});
test('two-store helper is byte-preserved by the Acryl text adapter',()=>{
 const original='["/api/workshop/", "/api/workshop/acryl/", "/_merchant-editor.html", "/_merchant-acryl-editor.html"]';
 assert.equal(acrylAssetText(original,'/workshop-ui/configurator-test-client.mjs'),original);
});
test('integration is absent by default and refuses ambiguous activation',()=>{
 assert.equal(createConfiguratorIntegration({settings:null}),null);
 assert.throws(()=>createConfiguratorIntegration({settings:{mode:'public'}}));
 assert.throws(()=>createConfiguratorIntegration({settings:{mode:'merchant-test-only',legacyStoreId:'same',acrylStoreId:'same'}}));
});
