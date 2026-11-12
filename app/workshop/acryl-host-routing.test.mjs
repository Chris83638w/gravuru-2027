import test from 'node:test';
import assert from 'node:assert/strict';
import {acrylRoute,acrylAssetText,acrylCacheControl} from './acryl-employee-host.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';
test('native and form editor aliases remain in their own release',()=>{
 for(const [outer,inner]of [
  ['/_merchant-acryl-editor.html','/_merchant-editor.html'],['/_merchant-acryl-form-editor.html','/_merchant-form-editor.html'],
  ['/_acryl-bundle/editor-0123456789abcdef.mjs','/_bundle/editor-0123456789abcdef.mjs'],
  ['/_acryl-runtime/lazy/fonts.json','/_runtime/lazy/fonts.json'],['/acryl-assets/stand.png','/acrylic-assets/stand.png'],
  ['/acryl-assistant.js','/assistant.js'],['/api/acryl-guides','/api/guides'],
  ['/api/workshop/acryl/customer-drafts','/api/workshop/customer-drafts'],['/workshop-acryl-ui/form-customer-ui.mjs','/workshop-ui/form-customer-ui.mjs'],
  ['/werkstatt/katalog','/werkstatt/katalog/'],['/werkstatt/designs/','/werkstatt/designs/'],
  ['/api/workshop/designs/svg','/api/workshop/designs/svg'],['/api/workshop/designs/target-preview','/api/workshop/designs/target-preview'],['/api/workshop/acryl/designs/target-preview','/api/workshop/designs/target-preview'],['/werkstatt/designs/bearbeiten','/werkstatt/designs/bearbeiten/'],['/werkstatt/designs/bearbeiten/','/werkstatt/designs/bearbeiten/'],['/api/workshop/acryl/designs/svg','/api/workshop/designs/svg']])assert.equal(acrylRoute(outer),inner);
});
test('Konfis page belongs to the native Acryl store; only the exact page route is added',()=>{
 for(const outer of ['/werkstatt/konfis','/werkstatt/konfis/'])assert.equal(acrylRoute(outer),'/werkstatt/konfis/');
 for(const outer of ['/werkstatt/konfis/x','/werkstatt/konfis/../mandanten/','/werkstatt/mandanten/','/werkstatt/module/','/api/workshop/konfis'])assert.equal(acrylRoute(outer),null);
 assert.equal(acrylRoute('/api/workshop/acryl/konfis'),'/api/workshop/konfis');
 for(const asset of ['konfis-ui.mjs','konfis.css'])assert.equal(acrylRoute('/workshop-acryl-ui/'+asset),'/workshop-ui/'+asset);
 assert.match(acrylAssetText('<a href="/werkstatt/konfis/"><script src="/workshop-ui/konfis-ui.mjs"></script>api(\'/api/workshop/konfis?\')'),/href="\/werkstatt\/konfis\/".*\/workshop-acryl-ui\/konfis-ui\.mjs.*\/api\/workshop\/acryl\/konfis\?/s);
});
test('legacy paths and global integration endpoints keep their host dispatcher',()=>{
 for(const path of ['/api/workshop/designs','/api/workshop/designs/svg/x','/api/workshop/designs/target-preview/x','/_merchant-editor.html','/_bundle/editor-0123456789abcdef.mjs','/_runtime/fonts.json','/api/workshop/session','/api/configurator-test/session','/webhooks/shopify/orders-paid'])assert.equal(acrylRoute(path),null);
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

test('catalogue editor routes remain narrow on the Acryl host',()=>{
 for(const suffix of ['', '/preview','/fit','/font']){
  assert.equal(acrylRoute('/api/workshop/designs/editor'+suffix),'/api/workshop/designs/editor'+suffix);
  assert.equal(acrylRoute('/api/workshop/acryl/designs/editor'+suffix),'/api/workshop/designs/editor'+suffix);
 }
 for(const suffix of ['/save','/font/file','-other','/preview/extra'])assert.equal(acrylRoute('/api/workshop/designs/editor'+suffix),null);
});
test('static editor files may be cached by the browser; everything else stays private, no-store',()=>{
 assert.equal(acrylCacheControl('/_acryl-bundle/editor-f0c9572974236922.mjs',200),'public, max-age=31536000, immutable');
 assert.equal(acrylCacheControl('/_acryl-runtime/lazy/katalog-kern.json',200),'public, max-age=3600');
 assert.equal(acrylCacheControl('/_acryl-runtime/lazy/schriften/lora-italic.json',200),'public, max-age=3600');
 assert.equal(acrylCacheControl('/_merchant-acryl-editor.html',200),'private, max-age=300');
 assert.equal(acrylCacheControl('/_acryl-runtime/lazy/motive-alle.json',200),'public, max-age=3600');assert.equal(acrylCacheControl('/_acryl-runtime/lazy/motive/leuchtturm_1.json',200),'public, max-age=3600');
 for(const [p,s] of [['/_acryl-bundle/editor.mjs',200],['/_acryl-runtime/lazy/schriften/../x.json',200],['/_acryl-runtime/lazy/motive/../a.json',200],['/api/workshop/acryl/acrylic-drafts',200],['/_merchant-acryl-editor.html',404],['/werkstatt/',200]])assert.equal(acrylCacheControl(p,s),null,p);
});
