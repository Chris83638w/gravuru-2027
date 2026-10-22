import test from 'node:test';
import assert from 'node:assert/strict';
import {planShopProductBindings, resolveShopProductBinding} from './shop-product-binding-plan.mjs';

const CFG = 'cfg_11111111-1111-4111-8111-111111111111';
const CFG2 = 'cfg_22222222-2222-4222-8222-222222222222';
const PROFILE = 'mfg_33333333-3333-4333-8333-333333333333';
const BINDING = 'binding_44444444-4444-4444-8444-444444444444';
const PRODUCT = 'gid://shopify/Product/100';
const VARIANT = 'gid://shopify/ProductVariant/200';
const NOW = Date.parse('2026-10-22T12:00:00Z');
const clone = value => JSON.parse(JSON.stringify(value));
function fixture({native = false, existing = true} = {}) {
  const record = {id: CFG, revision: 5, status: 'draft', document: {schema: native ? 'gravuru-product/v1' : 'gravuru-form-product/v1',
    kind: 'product', basePriceCents: 1899, productionProfile: {id: PROFILE, revision: 2},
    ...(native ? {config: {profile: {optionGroups: [{id: 'color'}, {id: 'fastening'}], optionFields: [{id: 'dedication'}]}}} : {}),
    form: {contourId: 'original-retro-contour', geometrySha256: 'b'.repeat(64)}}};
  const profile = {id: PROFILE, revision: 2, sha256: 'a'.repeat(64), document: {archived: false, autoRelease: false}};
  const selected = native ? {color: 'black', fastening: 'none'} : {};
  const prior = existing ? [{id: BINDING, shopDomain: 'test-shop.myshopify.com', variantId: '200', productId: CFG,
    productRevision: 5, unitCents: 1899, ...(native ? {options: clone(selected)} : {})}] : [];
  const calls = [];
  const adapter = {tenantId: 'test-tenant', shopDomain: 'test-shop.myshopify.com', storeId: 'synthetic-workshop',
    getCurrentProduct: id => { calls.push(['get', id]); return record; },
    resolveSelection: (r, choice) => { calls.push(['selection', r.id, clone(choice)]); return {options: clone(selected), unitCents: 1899}; },
    resolveProductionProfile: d => { calls.push(['profile', d.productionProfile?.id]); return profile; },
    getBindings: () => { calls.push(['bindings']); return prior; }};
  const input = {tenantId: adapter.tenantId, shopDomain: adapter.shopDomain, adapter, now: NOW, maxEvidenceAgeMs: 60000,
    shopifyEvidence: {tenantId: adapter.tenantId, shopDomain: adapter.shopDomain, complete: true, readAt: '2026-10-22T12:00:00Z',
      products: [{id: PRODUCT, variants: [{id: VARIANT, productId: PRODUCT, priceCents: 1899}]}]},
    selections: [{shopifyProductId: PRODUCT, shopifyVariantId: VARIANT, productId: CFG, productRevision: 5, options: clone(selected)}]};
  const request = {tenantId: adapter.tenantId, shopDomain: adapter.shopDomain, shopifyProductId: PRODUCT, shopifyVariantId: VARIANT, adapter, now: NOW};
  return {input, request, adapter, record, profile, prior, calls};
}
function rejectFixture(change, code) { const f = fixture(); change(f); assert.throws(() => planShopProductBindings(f.input), {code}); }

test('form preserves exact cfg/revision/profile and reuses existing binding without activation', () => {
  const f = fixture(), before = clone({record: f.record, prior: f.prior, profile: f.profile});
  const plan = planShopProductBindings(f.input), resolved = resolveShopProductBinding(plan, f.request);
  assert.equal(resolved.productId, CFG); assert.equal(resolved.productRevision, 5);
  assert.deepEqual(resolved.productionProfileRef, {id: PROFILE, revision: 2, sha256: 'a'.repeat(64)});
  assert.deepEqual(resolved.binding, {mode: 'reuse', id: BINDING});
  assert.equal(resolved.mode, 'plan-only'); assert.equal(resolved.publicAccess, false); assert.equal(resolved.checkoutEnabled, false);
  assert.deepEqual({record: f.record, prior: f.prior, profile: f.profile}, before);
  assert.ok(Object.isFrozen(plan)); assert.ok(Object.isFrozen(plan.entries[0].options));
});
test('native delegates option/price resolution and preserves normalized choice', () => {
  const f = fixture({native: true}); const plan = planShopProductBindings(f.input);
  assert.deepEqual(plan.entries[0].options, {color: 'black', fastening: 'none'});
  assert.equal(f.calls.filter(c => c[0] === 'selection').length, 1);
});
test('customer additional fields cannot become permanent Shopify variant choices', () => {
  const f = fixture({native: true}); f.input.selections[0].options.dedication = 'Private customer text';
  f.adapter.resolveSelection = (record, selected) => ({options: selected, unitCents: 1899});
  assert.throws(() => planShopProductBindings(f.input), {code: 'shop_binding_options'});
});
test('missing binding is explicitly pending, never creates or activates one', () => {
  const f = fixture({existing: false}); const result = resolveShopProductBinding(planShopProductBindings(f.input), f.request);
  assert.deepEqual(result.binding, {mode: 'bind-required', id: null}); assert.equal(f.prior.length, 0);
});
test('historical binding does not silently become current binding', () => {
  const f = fixture(); f.prior[0].productRevision = 4;
  assert.equal(planShopProductBindings(f.input).entries[0].binding.mode, 'bind-required');
  assert.equal(f.prior[0].productRevision, 4);
});
test('many configurations share one Shopify product with unique variant IDs', () => {
  const f = fixture({existing: false}), second = clone(f.record); second.id = CFG2;
  f.adapter.getCurrentProduct = id => id === CFG ? f.record : second;
  f.input.shopifyEvidence.products[0].variants.push({id: 'gid://shopify/ProductVariant/201', productId: PRODUCT, priceCents: 1899});
  f.input.selections.push({...clone(f.input.selections[0]), productId: CFG2, shopifyVariantId: 'gid://shopify/ProductVariant/201'});
  assert.equal(planShopProductBindings(f.input).entries.length, 2);
});
test('duplicate selected variant cannot choose two configurations', () => rejectFixture(f => f.input.selections.push(clone(f.input.selections[0])), 'shop_binding_ambiguous'));
test('duplicate Shopify product or variant receipt fails', () => {
  rejectFixture(f => f.input.shopifyEvidence.products.push(clone(f.input.shopifyEvidence.products[0])), 'shop_binding_ambiguous');
  rejectFixture(f => f.input.shopifyEvidence.products[0].variants.push(clone(f.input.shopifyEvidence.products[0].variants[0])), 'shop_binding_ownership');
});
test('variant parent identity mismatch fails', () => rejectFixture(f => f.input.shopifyEvidence.products[0].variants[0].productId = 'gid://shopify/Product/999', 'shop_binding_ownership'));
test('foreign tenant/shop evidence and adapter fail', () => {
  rejectFixture(f => f.input.shopifyEvidence.tenantId = 'other', 'shop_binding_context');
  rejectFixture(f => f.input.shopifyEvidence.shopDomain = 'other.myshopify.com', 'shop_binding_context');
  rejectFixture(f => f.adapter.tenantId = 'other', 'shop_binding_context');
  rejectFixture(f => f.prior[0].tenantId = 'other', 'shop_binding_existing');
});
test('missing/incomplete/stale/future Shopify evidence fails', () => {
  rejectFixture(f => f.input.shopifyEvidence.complete = false, 'shop_binding_incomplete');
  rejectFixture(f => f.input.shopifyEvidence.readAt = '2026-10-21T12:00:00Z', 'shop_binding_freshness');
  rejectFixture(f => f.input.shopifyEvidence.readAt = '2026-10-23T12:00:00Z', 'shop_binding_freshness');
  rejectFixture(f => delete f.input.maxEvidenceAgeMs, 'shop_binding_freshness');
});
test('outdated product revision and archived product fail', () => {
  rejectFixture(f => f.record.revision = 6, 'shop_binding_revision');
  rejectFixture(f => f.record.status = 'archived', 'shop_binding_product');
});
test('profile identity/revision/archive must match pinned product reference', () => {
  rejectFixture(f => f.profile.revision = 3, 'shop_binding_profile');
  rejectFixture(f => f.profile.document.archived = true, 'shop_binding_profile');
  rejectFixture(f => delete f.record.document.productionProfile, 'shop_binding_profile');
});
test('basis mismatch and existing option mismatch fail; no pricing equation introduced', () => {
  rejectFixture(f => f.input.shopifyEvidence.products[0].variants[0].priceCents = 1999, 'shop_binding_price');
  rejectFixture(f => f.prior[0].unitCents = 1, 'shop_binding_existing');
  rejectFixture(f => f.prior[0].options = {fastening: 'screws'}, 'shop_binding_existing');
});
test('duplicate existing binding identities or ambiguous target fail', () => {
  rejectFixture(f => f.prior.push(clone(f.prior[0])), 'shop_binding_existing');
  rejectFixture(f => f.prior.push({...clone(f.prior[0]), id: 'binding_55555555-5555-4555-8555-555555555555'}), 'shop_binding_ambiguous');
});
test('unsupported schema, unknown options, NaN and malformed IDs fail', () => {
  rejectFixture(f => f.record.document.schema = 'invented', 'shop_binding_product');
  rejectFixture(f => f.input.selections[0].options = {unknown: 'value'}, 'shop_binding_selection');
  rejectFixture(f => f.input.shopifyEvidence.products[0].variants[0].priceCents = NaN, 'shop_binding_ownership');
  rejectFixture(f => f.input.selections[0].shopifyVariantId = '200', 'shop_binding_identity');
});
test('resolver uses exact IDs and cannot accept a forged/deserialized plan', () => {
  const f = fixture(), plan = planShopProductBindings(f.input);
  assert.throws(() => resolveShopProductBinding(plan, {...f.request, shopifyProductId: 'gid://shopify/Product/999'}), {code: 'shop_binding_unknown'});
  assert.throws(() => resolveShopProductBinding(clone(plan), f.request), {code: 'shop_binding_plan'});
  assert.throws(() => resolveShopProductBinding(plan, {...f.request, tenantId: 'other'}), {code: 'shop_binding_context'});
});
test('same tenant/shop cannot silently switch between different private stores', () => {
  const f = fixture(), plan = planShopProductBindings(f.input);
  assert.equal(plan.storeId, 'synthetic-workshop');
  assert.throws(() => resolveShopProductBinding(plan, {...f.request, adapter: {...f.adapter, storeId: 'another-workshop'}}), {code: 'shop_binding_store'});
  rejectFixture(g => delete g.adapter.storeId, 'shop_binding_store');
});
test('resolver rechecks revision, document, profile and binding changes', () => {
  for (const [change, code] of [
    [f => f.record.revision++, 'shop_binding_revision'],
    [f => f.record.document.form.contourId = 'replacement', 'shop_binding_changed'],
    [f => f.profile.sha256 = 'c'.repeat(64), 'shop_binding_changed'],
    [f => f.prior.length = 0, 'shop_binding_changed'],
  ]) { const f = fixture(), plan = planShopProductBindings(f.input); change(f); assert.throws(() => resolveShopProductBinding(plan, f.request), {code}); }
});
test('resolver rejects evidence expiry and cannot mutate plan', () => {
  const f = fixture(), plan = planShopProductBindings(f.input);
  assert.throws(() => resolveShopProductBinding(plan, {...f.request, now: NOW + 60001}), {code: 'shop_binding_freshness'});
  assert.throws(() => { plan.entries[0].options.bad = 'new'; }, TypeError);
});
test('asynchronous adapters and malformed lists fail closed', () => {
  rejectFixture(f => f.adapter.getBindings = () => Promise.resolve([]), 'shop_binding_adapter');
  rejectFixture(f => f.input.selections = [null], 'shop_binding_incomplete');
  rejectFixture(f => f.input.shopifyEvidence.products = [null], 'shop_binding_incomplete');
});
