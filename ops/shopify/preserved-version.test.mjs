import test from 'node:test';
import assert from 'node:assert/strict';
import {APP_KEY, OLD_HOME, NEW_HOME, BASELINE_VERSION, proposeMerchantHome, verifyPreservedCandidate} from './preserved-version.mjs';
function fixture() {
  const definitions = [
    ['app_home', 'app_home', {app_url: OLD_HOME, embedded: true}],
    ['gravuru-storefront', 'theme_app_extension', {theme_extension: {files: {assets: {'existing.js': {sha256: 'a'.repeat(64), size: 3}}, blocks: {'existing.liquid': {value: 'existing'}}}}}],
    ['gravuru-personalization-price', 'function', {app_key: APP_KEY, module_id: 'existing-compiled-module', targets: [{handle: 'cart.transform.run', input_query: 'query RunInput { cart { lines { id } } }'}], module_metadata: {languages: ['javascript']}}],
    ['app_access', 'app_access', {scopes: 'read_products,write_products', redirect_url_allowlist: [OLD_HOME]}],
    ['webhooks', 'webhooks', {api_version: '2026-07'}],
    ['future-existing-module', 'another_supported_remote_type', {nested: {retain: [1, 2, 3]}}]
  ];
  return {version: {name: 'Gravuru Konfigurator'}, appModuleVersions: definitions.map(([handle, type, config], i) => ({registrationId: handle, registrationUuid: 'existing-' + i, registrationTitle: handle, type, config, target: type === 'function' ? 'cart.transform.run' : ''}))};
}
test('preserves every existing module, asset hash, compiled function reference and permission while proposing only app home', () => {
  const snapshot = fixture(), saved = structuredClone(snapshot), result = proposeMerchantHome(snapshot, BASELINE_VERSION);
  assert.deepEqual(snapshot, saved); assert.equal(result.manifest.modules.length, snapshot.appModuleVersions.length);
  assert.equal(result.manifest.modules[0].config.app_url, NEW_HOME); assert.equal(result.fullPublicationReady, false); assert.equal(result.released, false);
  for (let i = 1; i < snapshot.appModuleVersions.length; i++) assert.deepEqual(result.manifest.modules[i].config, snapshot.appModuleVersions[i].config);
});
test('fails closed on changed baseline, missing theme/function, duplicate identity or another app', () => {
  assert.throws(() => proposeMerchantHome(fixture(), 'new-version'), {code: 'baseline_changed'});
  for (const change of [s => s.appModuleVersions.splice(1, 1), s => s.appModuleVersions.splice(2, 1), s => s.appModuleVersions.push(s.appModuleVersions[1]), s => s.appModuleVersions[2].config.app_key = 'other-app', s => s.appModuleVersions[0].config.app_url = 'https://other.example']) {
    const s = fixture(); change(s); assert.throws(() => proposeMerchantHome(s, BASELINE_VERSION));
  }
});
test('candidate readback rejects missing extensions, changed assets/scopes/function and accepts order-only differences', () => {
  const before = fixture(), expected = proposeMerchantHome(before, BASELINE_VERSION).proposed;
  assert.equal(verifyPreservedCandidate(before, {versionTag: 'candidate', appModuleVersions: [...expected].reverse()}, BASELINE_VERSION).exactConfigurationPreservation, true);
  for (const change of [m => m.pop(), m => m[1].config.theme_extension.files.assets['existing.js'].sha256 = 'b'.repeat(64), m => m[2].config.module_id = 'different-code', m => m[3].config.scopes += ',write_orders', m => m[2].target = 'different.target']) {
    const modules = structuredClone(expected); change(modules);
    assert.throws(() => verifyPreservedCandidate(before, {versionTag: 'candidate', appModuleVersions: modules}, BASELINE_VERSION));
  }
});
