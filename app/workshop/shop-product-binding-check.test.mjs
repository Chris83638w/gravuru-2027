import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopProductBindingCheck} from './shop-product-binding-check.mjs';

// Pure service isolation: no real repositories, SQLite, credentials, HTTP or writes.
const CFG = 'cfg_11111111-1111-4111-8111-111111111111';
const OTHER_CFG = 'cfg_22222222-2222-4222-8222-222222222222';
const PROFILE = 'mfg_33333333-3333-4333-8333-333333333333';
const BINDING = 'binding_44444444-4444-4444-8444-444444444444';
const PRODUCT = 'gid://shopify/Product/100';
const VARIANT = 'gid://shopify/ProductVariant/200';
const OTHER_VARIANT = 'gid://shopify/ProductVariant/201';
const NOW = Date.parse('2026-10-22T12:00:00Z');
const copy = value => structuredClone(value);

function fixture({native = false, profile = true, sourceReady = true, existing = false} = {}) {
  const selected = native ? {color: 'black', fastening: 'none'} : {};
  const state = {
    record: {id: CFG, revision: 5, status: 'draft', metadata: {}, document: {
      schema: native ? 'gravuru-product/v1' : 'gravuru-form-product/v1', kind: 'product',
      name: 'Synthetic private product', basePriceCents: 1899,
      privateOriginal: 'must-not-appear-in-public-response',
      ...(profile ? {productionProfile: {id: PROFILE, revision: 2}} : {}),
      ...(native ? {config: {profile: {optionGroups: [{id: 'color'}, {id: 'fastening'}]}}} : {})}},
    profile: profile ? {id: PROFILE, revision: 2, sha256: 'a'.repeat(64), document: {archived: false, notes: 'private synthetic settings'}} : null,
    selection: {options: copy(selected), unitCents: 1899}, sourceReady,
    bindings: existing ? [{id: BINDING, shopDomain: 'synthetic.myshopify.com', variantId: '200', productId: CFG, productRevision: 5, unitCents: 1899, ...(native ? {options: copy(selected)} : {})}] : [],
  };
  const calls = {reader: [], writes: 0};
  const adapter = {
    tenantId: 'synthetic', shopDomain: 'synthetic.myshopify.com', storeId: 'private-synthetic',
    getCurrentProduct: () => copy(state.record),
    resolveSelection: () => copy(state.selection),
    resolveProductionProfile: () => copy(state.profile),
    getBindings: () => copy(state.bindings),
    readiness: () => ({sourceReady: state.sourceReady,
      blockers: state.profile ? [] : [{code: 'production_profile_missing', message: 'Kein fester Fertigungsprofilstand.'}],
      productionProfileRef: state.profile ? {id: state.profile.id, revision: state.profile.revision, sha256: state.profile.sha256} : null}),
    bind: () => { calls.writes++; throw new Error('Unexpected write'); },
    bindVariants: () => { calls.writes++; throw new Error('Unexpected write'); },
  };
  const response = {installation: {shopDomain: adapter.shopDomain, currency: 'EUR', scope: 'admin-readonly',
    safeCheckoutVerified: false}, variants: [{id: VARIANT, found: true, productId: PRODUCT, status: 'DRAFT', priceCents: 1899}]};
  let currentTime = NOW, duringRead = async () => {};
  const reader = {inspectVariants: async ids => { calls.reader.push(copy(ids)); await duringRead(); return copy(response); }};
  const input = {selections: [{shopifyProductId: PRODUCT, shopifyVariantId: VARIANT, productId: CFG, productRevision: 5, options: copy(selected)}]};
  const service = createShopProductBindingCheck({adapter, reader, clock: () => currentTime});
  return {state, calls, adapter, reader, response, input, service,
    duringRead: callback => { duringRead = callback; }, time: value => { currentTime = value; }};
}

for (const native of [false, true]) test(`${native ? 'native' : 'form'} exact-ID check creates only a private plan with no data writes`, async () => {
  const f = fixture({native, existing: true}), before = copy(f.state), inputBefore = copy(f.input);
  const result = await f.service.check(f.input);
  assert.equal(result.status, 'id-plan-ready'); assert.equal(result.mode, 'private-read-only-check');
  assert.equal(result.purpose, 'id-binding'); assert.equal(result.productionStatus, 'not-released');
  assert.equal(result.completeness, 'requested-variants-only'); assert.equal(result.shopIdentityConfirmed, true);
  assert.deepEqual(f.calls.reader, [[VARIANT]]); assert.equal(f.calls.writes, 0);
  assert.deepEqual(f.state, before); assert.deepEqual(f.input, inputBefore);
  for (const field of ['productionReady', 'publicAccess', 'checkoutEnabled', 'written', 'shopifyWrites']) assert.equal(result[field], false);
  assert.equal(result.plan.mode, 'plan-only'); assert.equal(result.plan.publicAccess, false); assert.equal(result.plan.checkoutEnabled, false);
  assert.equal(result.plan.purpose, 'id-binding'); assert.equal(result.plan.productionReady, false);
  assert.equal(result.plan.entries[0].productId, CFG); assert.equal(result.plan.entries[0].productRevision, 5);
  assert.deepEqual(result.plan.entries[0].binding, {mode: 'reuse', id: BINDING});
  assert.deepEqual(result.entries[0].options, f.input.selections[0].options);
  assert.equal(result.entries[0].baseUnitCents, 1899);
  assert(!JSON.stringify(result).includes('must-not-appear-in-public-response'));
  assert(!JSON.stringify(result).includes('private synthetic settings'));
});

test('browser cannot supply evidence, prices, profile, shop, tenant or store context', async () => {
  for (const field of ['shopifyEvidence', 'priceCents', 'productionProfile', 'shopDomain', 'tenantId', 'storeId', 'plan', 'purpose', 'allowMissingProfile']) {
    const f = fixture(); f.input[field] = 'forged';
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_fields'});
    assert.equal(f.calls.reader.length, 0);
  }
  for (const field of ['priceCents', 'unitCents', 'productionProfile', 'shopDomain', 'tenantId', 'storeId', 'sku', 'bindingId', 'purpose', 'allowMissingProfile']) {
    const f = fixture(); f.input.selections[0][field] = 'forged';
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_fields'});
    assert.equal(f.calls.reader.length, 0);
  }
});

test('strict payload shape and limits fail before any external read', async () => {
  for (const input of [null, [], {}, {selections: []}, {selections: [null]}, {selections: Array(101).fill({})}]) {
    const f = fixture(); await assert.rejects(f.service.check(input), {code: 'shop_binding_fields'});
    assert.equal(f.calls.reader.length, 0);
  }
  for (const [key, value] of [['shopifyProductId', '100'], ['shopifyVariantId', 200], ['productId', 'cfg_unknown'], ['productRevision', 0], ['productRevision', 1.5], ['productRevision', '5'], ['options', []]]) {
    const f = fixture(); f.input.selections[0][key] = value;
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_fields'}); assert.equal(f.calls.reader.length, 0);
  }
});

test('duplicate requested variant IDs and unsafe options fail before external read', async () => {
  const duplicate = fixture(); duplicate.input.selections.push(copy(duplicate.input.selections[0]));
  await assert.rejects(duplicate.service.check(duplicate.input), {code: 'shop_binding_ambiguous'});
  assert.equal(duplicate.calls.reader.length, 0);
  for (const options of [{name: ''}, {name: 4}, {name: 'x\nheader'}, {constructor: 'value'}, JSON.parse('{"__proto__":"value"}'), {'invalid.key': 'value'}]) {
    const f = fixture(); f.input.selections[0].options = options;
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_options'}); assert.equal(f.calls.reader.length, 0);
  }
});

test('fresh server response alone determines identity and price', async () => {
  const f = fixture(); f.response.variants[0].priceCents = 1900;
  await assert.rejects(f.service.check(f.input), {code: 'shop_binding_price'});
  assert.deepEqual(f.calls.reader, [[VARIANT]]); assert.equal(f.calls.writes, 0);
});

test('wrong parent product, missing variant and archived product cannot pass', async () => {
  for (const change of [
    f => { f.response.variants[0].productId = 'gid://shopify/Product/999'; },
    f => { f.response.variants[0] = {id: VARIANT, found: false}; },
    f => { f.response.variants[0].id = OTHER_VARIANT; },
    f => { f.response.variants[0].status = 'ARCHIVED'; },
  ]) {
    const f = fixture(); change(f);
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_ownership'}); assert.equal(f.calls.writes, 0);
  }
});

test('foreign shop, wrong currency and wrong read-scope fail', async () => {
  for (const [key, value] of [['shopDomain', 'foreign.myshopify.com'], ['currency', 'USD'], ['scope', 'unverified']]) {
    const f = fixture(); f.response.installation[key] = value;
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_shop_evidence', status: 502});
  }
});

test('duplicate, missing and malformed response identities fail closed', async () => {
  const f = fixture(); f.input.selections.push({...copy(f.input.selections[0]), shopifyVariantId: OTHER_VARIANT});
  f.response.variants.push(copy(f.response.variants[0]));
  await assert.rejects(f.service.check(f.input), {code: 'shop_binding_shop_evidence'});
  for (const variants of [[], [null], [{id: '200'}], [{id: VARIANT}, {id: OTHER_VARIANT}]]) {
    const g = fixture(); g.response.variants = variants;
    await assert.rejects(g.service.check(g.input), {code: 'shop_binding_shop_evidence'});
  }
});

test('money must match whole-cent server source exactly', async () => {
  for (const value of [NaN, Infinity, '1899', 1899.1, -1, 1900]) {
    const f = fixture(); f.response.variants[0].priceCents = value;
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_price'});
  }
});

test('missing production profile is visibly pending and permits only an ID plan after successful ID and price checks', async () => {
  const f = fixture({profile: false});
  const result = await f.service.check(f.input);
  assert.equal(result.status, 'id-plan-ready'); assert.equal(result.plan.purpose, 'id-binding');
  assert.equal(result.shopIdentityConfirmed, true); assert.equal(result.entries[0].readiness.productionProfileRef, null);
  assert.equal(result.plan.entries[0].productionProfileRef, null);
  assert.equal(result.productionStatus, 'profile-assignment-pending');
  assert.equal(result.entries[0].readiness.productionStatus, 'profile-assignment-pending');
  assert.equal(result.entries[0].readiness.productionPending[0].code, 'production_profile_missing');
  assert.deepEqual(result.entries[0].readiness.bindingBlockers, []); assert.deepEqual(result.entries[0].readiness.blockers, []);
  for (const value of [result, result.plan, result.entries[0].readiness])
    for (const flag of ['productionReady', 'publicAccess', 'checkoutEnabled']) assert.equal(value[flag], false);
  assert.equal(result.written, false); assert.equal(result.checkoutEnabled, false); assert.equal(f.calls.writes, 0);
});

test('unready source never becomes a strict plan even without profile blockers', async () => {
  const f = fixture({sourceReady: false}); const result = await f.service.check(f.input);
  assert.equal(result.status, 'blocked'); assert.equal(result.plan, null);
});

test('configured scope cannot change during the network await', async () => {
  for (const key of ['tenantId', 'storeId', 'shopDomain']) {
    const f = fixture(); f.duringRead(async () => { f.adapter[key] = key === 'shopDomain' ? 'other.myshopify.com' : 'other'; });
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_context', status: 409});
  }
});

test('revision, source document, profile, price and binding races are detected after async read', async () => {
  for (const [change, code] of [
    [f => { f.state.record.revision++; }, 'shop_binding_revision'],
    [f => { f.state.record.document.name = 'changed'; }, 'shop_binding_changed'],
    [f => { f.state.profile.sha256 = 'b'.repeat(64); }, 'shop_binding_changed'],
    [f => { f.state.profile = null; }, 'shop_binding_changed'],
    [f => { f.state.selection.unitCents++; }, 'shop_binding_changed'],
    [f => { f.state.bindings.length = 0; }, 'shop_binding_changed'],
    [f => { f.state.bindings.push({...f.state.bindings[0], id: 'binding_55555555-5555-4555-8555-555555555555'}); }, 'shop_binding_changed'],
  ]) {
    const f = fixture({existing: true}); f.duringRead(async () => { await Promise.resolve(); change(f); });
    await assert.rejects(f.service.check(f.input), {code, status: 409}); assert.equal(f.calls.writes, 0);
  }
});

test('remote exception details and credentials are not exposed', async () => {
  const f = fixture(); const marker = 'SYNTHETIC_SENSITIVE_TRANSPORT_MARKER';
  f.duringRead(async () => { throw Object.assign(new Error(marker), {url: marker, token: marker}); });
  await assert.rejects(f.service.check(f.input), error => {
    assert.equal(error.code, 'shop_binding_remote_unavailable'); assert.equal(error.status, 502);
    assert(!String(error).includes(marker)); assert(!JSON.stringify(error).includes(marker)); assert.equal(error.cause, undefined);
    return true;
  });
  assert.equal(f.calls.reader.length, 1); assert.equal(f.calls.writes, 0);
});

test('long or backward external read timing cannot create stale evidence', async () => {
  for (const value of [NOW + 60001, NOW - 1, NaN]) {
    const f = fixture(); f.duringRead(async () => f.time(value));
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_freshness', status: 409});
  }
});

test('same Shopify variant already bound to another cfg is blocked', async () => {
  const f = fixture({existing: true}); f.state.bindings[0].productId = OTHER_CFG;
  const result = await f.service.check(f.input);
  assert.equal(result.status, 'blocked'); assert.equal(result.plan, null);
  assert(result.entries[0].readiness.blockers.some(x => x.code === 'variant_config_conflict'));
});

test('same pinned cfg/options already bound to a different variant is blocked', async () => {
  const f = fixture({native: true, existing: true}); f.state.bindings[0].variantId = '201';
  const result = await f.service.check(f.input);
  assert.equal(result.status, 'blocked'); assert.equal(result.plan, null);
  assert(result.entries[0].readiness.blockers.some(x => x.code === 'selection_variant_conflict'));
});

test('older revision of the same configuration remains historical, not silently reused', async () => {
  const f = fixture({existing: true}); f.state.bindings[0].productRevision = 4;
  const before = copy(f.state.bindings), result = await f.service.check(f.input);
  assert.equal(result.status, 'id-plan-ready'); assert.deepEqual(result.plan.entries[0].binding, {mode: 'bind-required', id: null});
  assert.deepEqual(f.state.bindings, before); assert.equal(result.written, false);
});

test('duplicate exact existing bindings are not selected arbitrarily', async () => {
  const f = fixture({existing: true}); f.state.bindings.push({...f.state.bindings[0], id: 'binding_55555555-5555-4555-8555-555555555555'});
  await assert.rejects(f.service.check(f.input), {code: 'shop_binding_ambiguous'});
});

test('foreign shop binding cannot pass a readiness check', async () => {
  const f = fixture({existing: true, profile: false}); f.state.bindings[0].shopDomain = 'foreign.myshopify.com';
  await assert.rejects(f.service.check(f.input), {code: 'shop_binding_context'});
  assert.equal(f.calls.reader.length, 0);
});

test('local invalid record, revision, selection and async readers fail before external read', async () => {
  for (const [change, code] of [
    [f => { f.state.record.revision++; }, 'shop_binding_revision'],
    [f => { f.state.record.status = 'archived'; }, 'shop_binding_product'],
    [f => { f.state.record.document.kind = 'master'; }, 'shop_binding_product'],
    [f => { f.state.selection.options = {unknown: 'value'}; }, 'shop_binding_selection'],
    [f => { f.state.selection.unitCents = NaN; }, 'shop_binding_selection'],
    [f => { f.adapter.getCurrentProduct = async () => copy(f.state.record); }, 'shop_binding_revision'],
    [f => { f.adapter.resolveSelection = async () => copy(f.state.selection); }, 'shop_binding_selection'],
    [f => { f.adapter.readiness = async () => ({blockers: []}); }, 'shop_binding_configuration'],
    [f => { f.adapter.getBindings = async () => []; }, 'shop_binding_configuration'],
  ]) {
    const f = fixture(); change(f);
    await assert.rejects(f.service.check(f.input), {code}); assert.equal(f.calls.reader.length, 0);
  }
});

test('all configuration fields must be supplied by the server', () => {
  assert.throws(() => createShopProductBindingCheck(), {code: 'shop_binding_configuration'});
  for (const maxEvidenceAgeMs of [0, 60001, '1000', NaN]) {
    const f = fixture(); assert.throws(() => createShopProductBindingCheck({adapter: f.adapter, reader: f.reader, maxEvidenceAgeMs}), {code: 'shop_binding_configuration'});
  }
});

test('a missing profile cannot hide any other source or binding blocker', async () => {
  for (const code of ['production_profile_invalid', 'source_designs', 'binding_variant_product_conflict', 'binding_selection_ambiguous']) {
    const f = fixture({profile: false}), readiness = f.adapter.readiness;
    f.adapter.readiness = () => ({...readiness(), blockers: [...readiness().blockers, {code, message: 'Synthetic blocker'}]});
    const result = await f.service.check(f.input);
    assert.equal(result.status, 'blocked'); assert.equal(result.plan, null);
    assert.deepEqual(result.entries[0].readiness.bindingBlockers.map(row => row.code), [code]);
    assert.deepEqual(result.entries[0].readiness.productionPending.map(row => row.code), ['production_profile_missing']);
    for (const flag of ['productionReady', 'publicAccess', 'checkoutEnabled', 'written', 'shopifyWrites']) assert.equal(result[flag], false);
  }
});

test('existing invalid or unresolved profile references remain blockers, never pending omissions', async () => {
  for (const code of ['production_profile_invalid', 'production_profile_missing']) {
    const f = fixture(); f.state.profile = null;
    f.adapter.readiness = () => ({sourceReady: true, blockers: [{code, message: 'Stored reference cannot resolve'}], productionProfileRef: null});
    const result = await f.service.check(f.input);
    assert.equal(result.status, 'blocked'); assert.equal(result.plan, null);
    assert.equal(result.productionStatus, 'not-released');
    assert.deepEqual(result.entries[0].readiness.productionPending, []);
    assert.deepEqual(result.entries[0].readiness.bindingBlockers.map(row => row.code), [code]);
    assert.equal(result.productionReady, false);
  }
});

test('planner rejects damaged or archived profile even if a readiness provider wrongly omits its blocker', async () => {
  for (const change of [f => { f.state.record.document.productionProfile = {}; },
    f => { f.state.record.document.productionProfile = false; },
    f => { f.state.profile.document.archived = true; }, f => { f.state.profile.revision++; }]) {
    const f = fixture(); change(f);
    await assert.rejects(f.service.check(f.input), {code: 'shop_binding_profile'}); assert.equal(f.calls.writes, 0);
  }
});

test('conflicting cfg/variant and selection/variant bindings remain blocked without a profile', async () => {
  for (const [change, code] of [
    [f => { f.state.bindings[0].productId = OTHER_CFG; }, 'variant_config_conflict'],
    [f => { f.state.bindings[0].variantId = '201'; }, 'selection_variant_conflict'],
  ]) {
    const f = fixture({profile: false, existing: true}); change(f);
    const result = await f.service.check(f.input);
    assert.equal(result.status, 'blocked'); assert.equal(result.plan, null);
    assert(result.entries[0].readiness.bindingBlockers.some(row => row.code === code));
    assert.equal(result.productionStatus, 'profile-assignment-pending'); assert.equal(f.calls.writes, 0);
  }
});

test('ambiguous exact existing bindings are checked even without a production profile', async () => {
  const f = fixture({profile: false, existing: true});
  f.state.bindings.push({...f.state.bindings[0], id: 'binding_55555555-5555-4555-8555-555555555555'});
  await assert.rejects(f.service.check(f.input), {code: 'shop_binding_ambiguous'}); assert.equal(f.calls.writes, 0);
});

test('a new manufacturing assignment during the remote read invalidates the ID-only check', async () => {
  const f = fixture({profile: false}); f.duringRead(async () => {
    f.state.record.document.productionProfile = {id: PROFILE, revision: 2};
    f.state.profile = {id: PROFILE, revision: 2, sha256: 'a'.repeat(64), document: {archived: false}};
  });
  await assert.rejects(f.service.check(f.input), {code: 'shop_binding_changed', status: 409}); assert.equal(f.calls.writes, 0);
});

test('native ID-only check uses actual option evidence and keeps all release flags false', async () => {
  const f = fixture({native: true, profile: false, existing: true}), before = copy(f.state);
  const result = await f.service.check(f.input);
  assert.equal(result.status, 'id-plan-ready'); assert.equal(result.productionStatus, 'profile-assignment-pending');
  assert.deepEqual(result.plan.entries[0].options, {color: 'black', fastening: 'none'});
  assert.equal(result.plan.entries[0].productionProfileRef, null); assert.equal(result.plan.entries[0].binding.mode, 'reuse');
  assert.deepEqual(f.state, before); assert.equal(f.calls.writes, 0);
  for (const flag of ['productionReady', 'publicAccess', 'checkoutEnabled']) assert.equal(result[flag], false);
});
