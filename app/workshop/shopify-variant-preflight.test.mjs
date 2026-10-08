import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {preflightVariantBindings} from './shopify-variant-preflight.mjs';
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-preflight-')); build({outputDirectory: dir});
  const seed = JSON.parse(fs.readFileSync(path.join(dir, 'models.json')))[0];
  const w = createWorkshop({filename: path.join(dir, 'workshop.sqlite'), seedConfig: seed.universal, legacy: seed.legacy});
  t.after(() => {w.close(); fs.rmSync(dir, {recursive: true, force: true});});
  const record = w.repository.copy(w.defaultId, {expectedRevision: 1, name: 'Synthetische Variantenprüfung', kind: 'product'});
  const plan = prepareShopProduct(record), groups = record.document.config.profile.optionGroups;
  const mappings = plan.variants.map((v, i) => ({key: v.key, variantId: String(301 + i)}));
  const request = {record, shopifyProductId: 'gid://shopify/Product/9', mappings};
  const remote = {installation: {currency: 'EUR', safeCheckoutVerified: false}, variants: plan.variants.map((v, i) => ({id: 'gid://shopify/ProductVariant/' + (301 + i), found: true,
    productId: request.shopifyProductId, status: 'DRAFT', priceCents: v.priceCents,
    options: groups.map(g => {const x = g.values.find(x => x.id === v.options[g.id]); return {name: g.name, value: x.label || x.id};})}))};
  let calls = 0;
  const client = {async inspectVariants(ids) {calls++; return {...remote, variants: remote.variants.filter(v => ids.includes(v.id))};}};
  return {w, record, plan, request, remote, client, get calls() {return calls;}};
}
test('all 28 canonical variants match without any local binding, product update or checkout approval', async t => {
  const f = fixture(t), before = f.w.repository.history(f.record.id), result = await preflightVariantBindings(f.request, f.client);
  assert.equal(result.matches, true); assert.equal(result.complete, true); assert.equal(result.rows.length, 28);
  assert.equal(result.sourceSha256, f.plan.sha256); assert.deepEqual(result.rows.map(r => r.expectedPriceCents), f.plan.variants.map(v => v.priceCents));
  assert.equal(result.bindingSaved, false); assert.equal(result.checkoutReady, false); assert.equal(result.published, false);
  assert.deepEqual(f.w.orderIntake.bindings(), []); assert.deepEqual(f.w.repository.history(f.record.id), before);
});
test('price, physical option, product, status and currency mismatches are reported separately', async t => {
  const f = fixture(t); f.remote.variants[0].priceCents++; f.remote.variants[1].options[0].value = 'different size';
  f.remote.variants[2].productId = 'gid://shopify/Product/999'; f.remote.variants[3].status = 'ARCHIVED';
  f.remote.variants[4].found = false;
  let result = await preflightVariantBindings(f.request, f.client);
  assert.equal(result.matches, false);
  assert.deepEqual(result.rows.slice(0, 5).map(r => r.issues), [['price_mismatch'], ['options_mismatch'], ['product_mismatch'], ['product_status'], ['variant_missing']]);
  f.remote.installation.currency = 'USD'; result = await preflightVariantBindings(f.request, f.client);
  assert.ok(result.rows.every(r => r.issues.includes('currency_mismatch'))); assert.deepEqual(f.w.orderIntake.bindings(), []);
});
test('incomplete proposal is explicit and changed price revision cannot reuse an earlier success', async t => {
  const f = fixture(t), request = {...f.request, mappings: [f.request.mappings[0]]};
  const first = await preflightVariantBindings(request, f.client); assert.equal(first.matches, true); assert.equal(first.complete, false);
  const document = structuredClone(f.record.document); document.config.acrylic.pricing.sizes.small += 100;
  request.record = f.w.repository.save(f.record.id, document, 1);
  const next = await preflightVariantBindings(request, f.client); assert.equal(next.matches, false); assert.notEqual(next.sourceSha256, first.sourceSha256);
  assert.equal(next.configuration.revision, 2); assert.equal(next.rows[0].actualPriceCents, first.rows[0].actualPriceCents);
});
test('unknown keys, duplicate variants, caller price and incomplete products fail before network', async t => {
  const f = fixture(t), good = f.request.mappings[0];
  for (const mappings of [[], [good, good], [good, {...f.request.mappings[1], variantId: good.variantId}], [{...good, key: 'absent'}], [{...good, priceCents: 1}]]) await assert.rejects(preflightVariantBindings({...f.request, mappings}, f.client), {code: 'binding_request'});
  await assert.rejects(preflightVariantBindings({...f.request, record: f.w.repository.get(f.w.defaultId)}, f.client), {code: 'binding_request'});
  assert.equal(f.calls, 0);
});
test('form product accepts only known default-option conventions and rejects a physical choice without a mapping', async t => {
  const {makeFormProduct} = await import('./form-product.mjs'), {addFormDesign} = await import('./form-designs.mjs');
  const f = fixture(t), svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="80mm" viewBox="0 0 100 80"><rect width="100" height="80"/></svg>';
  const contour = await f.w.contours.import({name: 'Synthetic.svg', bytes: Buffer.from(svg).toString('base64')});
  let document = makeFormProduct(contour, 'Synthetic form');
  document.material = {id: 'steel', thicknessMm: 1.5, surfaceNotes: 'synthetic'}; document.processingMethod = 'engraving'; document.basePriceCents = 1499;
  document = addFormDesign(document, {assetId: 'a'.repeat(64), sourceSha256: 'b'.repeat(64), originalName: 'Synthetic.svg', widthMm: 100, heightMm: 80}, {name: 'Synthetic', designId: 'synthetic'});
  const record = {id: 'cfg_1234', revision: 1, status: 'draft', document}, plan = prepareShopProduct(record);
  const remote = f.remote.variants[0]; remote.options = [{name: 'Title', value: 'Default Title'}];
  const request = {...f.request, record, mappings: [{key: plan.variants[0].key, variantId: '301'}]};
  assert.equal((await preflightVariantBindings(request, f.client)).matches, true);
  remote.options = [{name: 'Ausführung', value: 'Standard'}]; assert.equal((await preflightVariantBindings(request, f.client)).matches, true);
  remote.options = [{name: 'Größe', value: '120 × 80 mm'}]; assert.deepEqual((await preflightVariantBindings(request, f.client)).rows[0].issues, ['options_mismatch']);
});
