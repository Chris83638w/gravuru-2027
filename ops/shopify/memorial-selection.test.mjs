import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMemorialSelection} from './memorial-selection.mjs';
function fixture() {
  const product = {id: 'gid://shopify/Product/123', title: 'Gedenktafel – synthetisch', handle: 'synthetic-memorial', status: 'ACTIVE',
    variants: {pageInfo: {hasNextPage: false}, nodes: [
      {id: 'gid://shopify/ProductVariant/301', price: '22.99', availableForSale: true, selectedOptions: [{name: 'Befestigung', value: 'Ohne'}]},
      {id: 'gid://shopify/ProductVariant/302', price: '25.98', availableForSale: true, selectedOptions: [{name: 'Befestigung', value: 'Bohrungen'}]}
    ]}};
  const manifest = {productId: 'synthetic-source', revision: 3, configurator: 'variant-m', customerEnabled: true,
    geometry: {width: 220, height: 140, shape: 'rect', holes: []}, designs: [{id: 'design', source: 'a'.repeat(64)}], defaultDesignId: 'design',
    options: [{id: 'mounting', name: 'Befestigung', defaultValueId: 'none', values: [
      {id: 'none', label: 'Ohne', currency: 'EUR', holes: []},
      {id: 'holes', label: 'Bohrungen', currency: 'EUR', holes: [{x: 12, y: 70, diameter: 5}]}
    ]}]};
  return {product, manifest, currency: 'EUR', personalization: {schema: 'gravuru-personalization-pricing/v1', enabled: true,
    productId: product.id, revision: '3', currency: 'EUR', extraPhotoCents: 999, extraMotifCents: 169, variants: {'301': 2299, '302': 2598}}};
}
test('matches existing prices/options independently of API order without fabricating a new product or checkout approval', () => {
  const f = fixture(), before = structuredClone(f); f.product.variants.nodes.reverse();
  const r = inspectMemorialSelection(f);
  assert.deepEqual(r.variants.map(v => [v.optionId, v.variantId, v.priceCents]), [['none', 'gid://shopify/ProductVariant/301', 2299], ['holes', 'gid://shopify/ProductVariant/302', 2598]]);
  assert.deepEqual(r.variants[1].holes, before.manifest.options[0].values[1].holes);
  assert.equal(r.bindingSaved, false); assert.equal(r.checkoutReady, false); assert.equal(r.published, false); assert.equal(r.newWorkshopConfigurationId, null);
  assert.deepEqual(f.manifest, before.manifest); assert.deepEqual(f.personalization, before.personalization);
});
test('refuses stale revision, mismatched product/price/currency, unavailable variants and incomplete pagination', () => {
  for (const change of [f => f.personalization.revision = '2', f => f.personalization.productId = 'gid://shopify/Product/999',
    f => f.product.variants.nodes[0].price = '0.01', f => f.currency = 'USD', f => f.product.variants.nodes[0].availableForSale = false,
    f => f.product.variants.pageInfo.hasNextPage = true, f => f.product.variants.nodes[0].price = '2.999']) {
    const f = fixture(); change(f); assert.throws(() => inspectMemorialSelection(f));
  }
});
test('refuses ambiguous options and unknown or incomplete configured variant sets', () => {
  for (const change of [f => f.product.variants.nodes[1].selectedOptions = f.product.variants.nodes[0].selectedOptions,
    f => f.manifest.options[0].values[1].label = 'Ohne', f => delete f.personalization.variants['301'],
    f => {delete f.personalization.variants['301']; f.personalization.variants['999'] = 2299;}, f => f.product.variants.nodes.pop(),
    f => f.manifest.designs = [], f => f.manifest.defaultDesignId = 'missing']) {
    const f = fixture(); change(f); assert.throws(() => inspectMemorialSelection(f));
  }
});
