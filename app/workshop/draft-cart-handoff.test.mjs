import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';

const config = {shopDomain: 'gravuru-synthetic.myshopify.com', apiVersion: '2026-07', privateToken: 'synthetic-private-token'};
function setup(t, changes = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'g27-draft-cart-')), filename = path.join(directory, 'private.sqlite');
  let now = Date.UTC(2026, 9, 6), store = createFormCustomerStore({filename, clock: () => now}), calls = 0, duringSend;
  const record = {id: 'cfg_synthetic', revision: 2, status: 'draft', document: {
    schema: 'gravuru-form-product/v1', kind: 'product', basePriceCents: 2999, designs: [{}]}};
  const draft = store.create(record, 'design_synthetic', {text: 'synthetic'});
  const manifest = {schema: 'gravuru-form-review/v1', id: 'review_synthetic', createdAt: new Date(now).toISOString(),
    source: {draftId: draft.id, draftRevision: 1, designId: draft.designId},
    product: {id: record.id, revision: record.revision, basePriceCents: 2999, currency: 'EUR'},
    packageSha256: 'a'.repeat(64), blockers: [], warnings: [], photos: [], ...changes};
  store.capture(draft.id, draft.token, 1, {manifest, preview: Buffer.from('<svg/>'),
    contourPdf: Buffer.from('synthetic'), package: Buffer.from('synthetic'), photos: Buffer.from('synthetic')});
  const binding = store.orderIntake.bind({shopDomain: config.shopDomain, variantId: '301', record});
  const offer = store.orderIntake.offer({bindingId: binding.id, snapshotId: manifest.id, quantity: 2});
  const input = {draftId: draft.id, snapshotId: manifest.id, expectedRevision: 1, offerId: offer.id, offerToken: offer.property.value};
  const context = {draftToken: draft.token, buyerIp: '192.0.2.5'};
  const fetchImpl = async (url, options) => {
    calls++; assert.equal(url, `https://${config.shopDomain}/api/${config.apiVersion}/graphql.json`);
    const line = JSON.parse(options.body).variables.input.lines[0];
    assert.equal(line.merchandiseId, 'gid://shopify/ProductVariant/301'); assert.equal(line.quantity, 2);
    if (duringSend) await duringSend();
    return Response.json({data: {cartCreate: {userErrors: [], warnings: [], cart: {
      id: 'gid://shopify/Cart/synthetic', checkoutUrl: `https://${config.shopDomain}/checkout/synthetic?key=synthetic-capability`,
      lines: {pageInfo: {hasNextPage: false}, nodes: [{quantity: line.quantity, attributes: line.attributes,
        merchandise: {id: line.merchandiseId}, cost: {amountPerQuantity: {amount: '29.99', currencyCode: 'EUR'},
          totalAmount: {amount: '59.98', currencyCode: 'EUR'}}}]}}}}});
  };
  const submit = (data = input, access = context, options = {}) => createDraftCartHandoff({drafts: store, config: {...config, ...options}}, {fetchImpl})(data, access);
  t.after(() => {store.close(); rmSync(directory, {recursive: true, force: true});});
  return {draft, input, context, record, offer, submit, filename, get store() {return store;}, get calls() {return calls;},
    expire() {now += 7 * 86400000;}, during(fn) {duringSend = fn;},
    reopen() {store.close(); store = createFormCustomerStore({filename, clock: () => now});}};
}
function pay(f) {
  const secret = 'synthetic-webhook-secret', raw = Buffer.from(JSON.stringify({id: 101, test: true,
    financial_status: 'paid', currency: 'EUR', line_items: [{id: 201, variant_id: 301, quantity: 2,
      price: '29.99', properties: [f.offer.property]}]}));
  return f.store.orderIntake.receive(raw, {'x-shopify-hmac-sha256': createHmac('sha256', secret).update(raw).digest('base64'),
    'x-shopify-shop-domain': config.shopDomain, 'x-shopify-api-version': config.apiVersion,
    'x-shopify-topic': 'orders/paid', 'x-shopify-webhook-id': 'synthetic-paid-event'}, {...config, secret});
}

test('authenticated saved draft resolves server prices and reuses its cart after restart', async t => {
  const f = setup(t), result = await f.submit(); assert.equal(result.totalCents, 5998); assert.equal(result.paymentConfirmed, false);
  f.reopen(); assert.deepEqual(await f.submit(), {...result, duplicate: true}); assert.equal(f.calls, 1);
  const db = new DatabaseSync(f.filename, {readOnly: true});
  try {const rows = JSON.stringify(db.prepare('SELECT * FROM storefront_cart_handoffs').all());
    for (const secret of [f.draft.token, f.offer.property.value, config.privateToken, f.draft.id]) assert.ok(!rows.includes(secret));
  } finally {db.close();}
});
test('missing or forged draft capability cannot send or retrieve a completed cart', async t => {
  const f = setup(t);
  for (const draftToken of [undefined, '', 'f'.repeat(64), ['f'.repeat(64)]])
    await assert.rejects(f.submit(f.input, {...f.context, draftToken}), e => e.status === 404);
  assert.equal(f.calls, 0); await f.submit();
  await assert.rejects(f.submit(f.input, {...f.context, draftToken: 'f'.repeat(64)}), e => e.status === 404);
  assert.equal(f.calls, 1);
});
test('another valid private draft cannot claim the snapshot or completed checkout', async t => {
  const f = setup(t), other = f.store.create(f.record, f.draft.designId, {});
  const attempt = () => f.submit({...f.input, draftId: other.id}, {...f.context, draftToken: other.token});
  await assert.rejects(attempt(), e => e.code === 'cart_private'); assert.equal(f.calls, 0);
  await f.submit(); await assert.rejects(attempt(), e => e.code === 'cart_private'); assert.equal(f.calls, 1);
});
test('caller cannot override price, quantity, variant, shop, principal or buyer IP in the request', async t => {
  const f = setup(t);
  for (const [key, value] of Object.entries({unitCents: 1, quantity: 1, variantId: '99', shopDomain: 'other.myshopify.com', principalId: 'other', buyerIp: '192.0.2.7'}))
    await assert.rejects(f.submit({...f.input, [key]: value}), e => e.code === 'cart_fields');
  assert.equal(f.calls, 0);
});
test('wrong offer ID/token, snapshot and configured shop never trigger transport', async t => {
  const f = setup(t);
  for (const change of [{offerId: 'offer_unknown'}, {offerToken: 'f'.repeat(64)}, {offerToken: 'bad'}, {snapshotId: 'review_unknown'}])
    await assert.rejects(f.submit({...f.input, ...change}), e => e.status === 404);
  await assert.rejects(f.submit(f.input, f.context, {shopDomain: 'other.myshopify.com'}), e => e.status === 404);
  assert.equal(f.calls, 0);
});
test('expiry at its exact deadline blocks both a first send and cached checkout access', async t => {
  for (const completed of [false, true]) {
    const f = setup(t); if (completed) await f.submit(); f.expire();
    await assert.rejects(f.submit(), /abgelaufen/); assert.equal(f.calls, Number(completed));
  }
});
test('changed draft revision cannot reuse an old snapshot or bypass it with a current revision number', async t => {
  const f = setup(t); await f.submit(); f.store.save(f.draft.id, f.draft.token, {text: 'changed'}, 1);
  await assert.rejects(f.submit(), e => e.code === 'cart_stale');
  await assert.rejects(f.submit({...f.input, expectedRevision: 2}), e => e.code === 'cart_private'); assert.equal(f.calls, 1);
});
test('review blockers stop handoff before journal and network', async t => {
  const f = setup(t, {blockers: ['synthetic missing field']});
  await assert.rejects(f.submit(), e => e.code === 'cart_blocked'); assert.equal(f.calls, 0);
});
test('a mismatched design and a non-form snapshot cannot masquerade as this saved draft', async t => {
  const f = setup(t, {schema: 'unsupported-review/v1'});
  await assert.rejects(f.submit(), e => e.code === 'cart_private'); assert.equal(f.calls, 0);
  const base = setup(t);
  const drafts = {...base.store, review(id) {const r = base.store.review(id); r.manifest.source.designId = 'other'; return r;}};
  const submit = createDraftCartHandoff({drafts, config}, {fetchImpl: () => {throw Error('must not send');}});
  await assert.rejects(submit(base.input, base.context), e => e.code === 'cart_private');
});
test('paid offers block both initial send and reuse of a cached cart', async t => {
  for (const completed of [false, true]) {
    const f = setup(t); if (completed) await f.submit(); pay(f);
    await assert.rejects(f.submit(), /bereits zu einer Bestellung/); assert.equal(f.calls, Number(completed));
  }
});
test('draft changes during send suppress the checkout URL and preserve the no-resend journal', async t => {
  const f = setup(t); f.during(() => f.store.save(f.draft.id, f.draft.token, {text: 'new'}, 1));
  await assert.rejects(f.submit(), e => e.code === 'cart_stale' && !e.message.includes('synthetic-capability'));
  f.reopen(); await assert.rejects(f.submit(), e => e.code === 'cart_stale'); assert.equal(f.calls, 1);
});
test('paid event arriving during send prevents return of an already consumed checkout', async t => {
  const f = setup(t); f.during(() => pay(f));
  await assert.rejects(f.submit(), /bereits zu einer Bestellung/); assert.equal(f.calls, 1);
});
test('network failure cannot mint a fresh offer or resend on repeated calls', async t => {
  const f = setup(t); f.during(() => {throw Error('private upstream detail');});
  await assert.rejects(f.submit(), e => e.code === 'cart_review' && !e.message.includes('upstream'));
  await assert.rejects(f.submit(), e => e.code === 'cart_review'); assert.equal(f.calls, 1);
});
