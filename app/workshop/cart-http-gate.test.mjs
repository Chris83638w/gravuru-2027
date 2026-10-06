import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';
import {resolveProduct} from './product-model.mjs';
import {createCartHttpGate} from './cart-http-gate.mjs';

const config = {shopDomain: 'gravuru-synthetic.myshopify.com', apiVersion: '2026-07', privateToken: 'synthetic-private-token'};
function setup(t, {enabled = true, mode = 'test-only'} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-cart-http-'));
  build({outputDirectory: directory}); const seed = JSON.parse(fs.readFileSync(path.join(directory, 'models.json')))[0];
  let calls = 0, contexts = 0, buyer = () => '192.0.2.10', duringSend;
  const settings = {mode, config, resolveBuyerIp: req => {contexts++; return buyer(req);}, transportOptions: {
    fetchImpl: async (url, options) => {
      calls++; assert.equal(url, `https://${config.shopDomain}/api/${config.apiVersion}/graphql.json`);
      assert.equal(options.headers['Shopify-Storefront-Buyer-IP'], '192.0.2.10');
      const line = JSON.parse(options.body).variables.input.lines[0]; if (duringSend) await duringSend();
      return Response.json({data: {cartCreate: {userErrors: [], warnings: [], cart: {
        id: 'gid://shopify/Cart/synthetic', checkoutUrl: `https://${config.shopDomain}/checkout/synthetic?key=private-fixture`,
        lines: {pageInfo: {hasNextPage: false}, nodes: [{quantity: line.quantity, attributes: line.attributes,
          merchandise: {id: line.merchandiseId}, cost: {amountPerQuantity: {amount: (unit / 100).toFixed(2), currencyCode: 'EUR'},
            totalAmount: {amount: (unit / 100).toFixed(2), currencyCode: 'EUR'}}}]}}}}});
    }}};
  const w = createWorkshop({filename: path.join(directory, 'workshop.sqlite'), seedConfig: seed.universal, legacy: seed.legacy,
    ...(enabled ? {storefront: settings} : {})});
  const record = w.repository.copy(w.defaultId, {expectedRevision: 1, name: 'Synthetische Warenkorbprüfung', kind: 'product'});
  const resolved = resolveProduct(record.document), unit = resolved.price.unitCents, bytes = Buffer.from('synthetic archive');
  // Synthetic approval-free cart fixture only; real review blockers are covered
  // in acrylic-draft-http.test.mjs and remain present in application code.
  const manifest = {schema: 'gravuru-acrylic-review/v1', id: 'proof_' + randomUUID(),
    source: {draftId: 'acrylic_' + randomUUID(), draftRevision: 1, designId: resolved.designId},
    product: {id: record.id, revision: 1, basePriceCents: unit, currency: 'EUR'},
    selection: {options: resolved.resolvedOptions, price: {unitCents: unit, quantity: 1}},
    packageSha256: createHash('sha256').update(bytes).digest('hex'), blockers: [], warnings: [], photos: []};
  const draft = w.customerDrafts.acrylicDrafts.create({manifest, package: bytes, preview: Buffer.from('<svg/>'), photos: bytes, contourPdf: Buffer.alloc(0)});
  const binding = w.orderIntake.bind({shopDomain: config.shopDomain, variantId: '301', record, snapshotId: draft.snapshotId});
  const offer = w.orderIntake.offer({bindingId: binding.id, snapshotId: draft.snapshotId, quantity: 1});
  const input = {draftId: draft.id, expectedRevision: 1, snapshotId: draft.snapshotId, offerId: offer.id, offerToken: offer.property.value};
  const server = createPreviewServer({workshop: w, outputDirectory: directory});
  // Invoke the real outer HTTP listener without binding a socket. Its address is
  // supplied solely for deterministic Host/Origin checks in this in-process test.
  server.address = () => ({port: 8765});
  const request = (url, method = 'GET', body, headers = {}) => new Promise(resolve => {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
    req.method = method; req.url = url; req.headers = {host: '127.0.0.1:8765', 'content-type': 'application/json', ...headers};
    const res = new EventEmitter(); res.headersSent = false;
    res.writeHead = (status, headers) => {res.status = status; res.headers = headers; res.headersSent = true; return res;};
    res.end = bytes => {res.body = bytes?.length ? JSON.parse(Buffer.from(bytes).toString()) : null; resolve(res);};
    server.emit('request', req, res);
  });
  t.after(() => {w.close(); fs.rmSync(directory, {recursive: true, force: true});});
  const headers = async () => ({'x-gravuru-csrf': (await request('/api/workshop/session')).body.csrfToken, 'x-gravuru-draft': draft.token});
  return {w, input, draft, record, settings, request, headers, get calls() {return calls;}, get contexts() {return contexts;},
    buyer(fn) {buyer = fn;}, during(fn) {duringSend = fn;}, archive() {w.repository.setArchived(record.id, {expectedRevision: 1, archived: true});}};
}

test('default runtime keeps cart writes disabled even with a valid private draft and CSRF', async t => {
  const f = setup(t, {enabled: false}), res = await f.request('/api/workshop/draft-cart', 'POST', f.input, await f.headers());
  assert.equal(res.status, 503); assert.equal(res.body.error.code, 'cart_disabled'); assert.equal(f.calls, 0);
});
test('outer Host/Origin/fetch-site checks and CSRF reject requests before cart transport', async t => {
  const f = setup(t), h = await f.headers();
  for (const change of [{host: 'foreign.invalid'}, {origin: 'https://foreign.invalid'}, {'sec-fetch-site': 'cross-site'}, {'x-gravuru-csrf': ''}]) {
    const r = await f.request('/api/workshop/draft-cart', 'POST', f.input, {...h, ...change}); assert.equal(r.status, 403);
  }
  assert.equal((await f.request('/api/workshop/draft-cart')).status, 405); assert.equal(f.calls, 0); assert.equal(f.contexts, 0);
});
test('authenticated explicit test wiring returns a verified private checkout and deduplicates repeated POSTs', async t => {
  const f = setup(t), h = await f.headers();
  const a = await f.request('/api/workshop/draft-cart', 'POST', f.input, {...h, 'x-forwarded-for': '203.0.113.99'});
  assert.equal(a.status, 200, JSON.stringify(a.body)); assert.equal(a.body.duplicate, false); assert.equal(a.body.paymentConfirmed, false);
  assert.equal(a.headers['Cache-Control'], 'no-store');
  const b = await f.request('/api/workshop/draft-cart', 'POST', f.input, h); assert.equal(b.status, 200); assert.equal(b.body.duplicate, true);
  assert.equal(f.calls, 1); assert.ok(!JSON.stringify(a.body).includes(config.privateToken)); assert.ok(!JSON.stringify(a.body).includes(f.draft.token));
});
test('missing private access and forged price/IP fields cannot trigger a cart', async t => {
  const f = setup(t), h = await f.headers();
  assert.equal((await f.request('/api/workshop/draft-cart', 'POST', f.input, {...h, 'x-gravuru-draft': ''})).status, 404);
  assert.equal(f.contexts, 0);
  for (const patch of [{unitCents: 1}, {buyerIp: '203.0.113.5'}, {principalId: 'other'}])
    assert.equal((await f.request('/api/workshop/draft-cart', 'POST', {...f.input, ...patch}, h)).status, 422);
  assert.equal((await f.request('/api/workshop/draft-cart', 'POST', {...f.input, extra: 'x'.repeat(17000)}, h)).status, 413);
  assert.equal(f.calls, 0);
});
test('unsupported configuration and failed buyer context are sanitized without sending', async t => {
  const invalid = setup(t, {mode: 'live'});
  assert.equal((await invalid.request('/api/workshop/draft-cart', 'POST', invalid.input, await invalid.headers())).status, 503); assert.equal(invalid.calls, 0);
  const f = setup(t), h = await f.headers();
  for (const buyer of [() => undefined, () => 'invalid-ip', () => {throw Error('private-network-detail');}]) {
    f.buyer(buyer); const res = await f.request('/api/workshop/draft-cart', 'POST', f.input, h);
    assert.equal(res.status, 503); assert.equal(res.body.error.code, 'cart_buyer_context'); assert.ok(!JSON.stringify(res.body).includes('private-network-detail'));
  }
  f.buyer(() => '192.0.2.10'); assert.equal((await f.request('/api/workshop/draft-cart', 'POST', f.input, h)).status, 200); assert.equal(f.calls, 1);
});
test('archived products block first send and cached checkout access', async t => {
  for (const completed of [false, true]) {
    const f = setup(t), h = await f.headers(); if (completed) await f.request('/api/workshop/draft-cart', 'POST', f.input, h);
    f.archive(); const res = await f.request('/api/workshop/draft-cart', 'POST', f.input, h);
    assert.equal(res.status, 409); assert.equal(res.body.error.code, 'cart_product_unavailable'); assert.equal(f.calls, Number(completed));
  }
});
test('product archived during trusted-context resolution is checked again before network send', async t => {
  const f = setup(t); f.buyer(async () => {f.archive(); return '192.0.2.10';});
  const res = await f.request('/api/workshop/draft-cart', 'POST', f.input, await f.headers());
  assert.equal(res.status, 409); assert.equal(f.calls, 0);
});
test('product archived during Shopify response withholds the checkout and never resends', async t => {
  const f = setup(t), h = await f.headers(); f.during(() => f.archive());
  const res = await f.request('/api/workshop/draft-cart', 'POST', f.input, h);
  assert.equal(res.status, 409); assert.ok(!JSON.stringify(res.body).includes('private-fixture'));
  assert.equal((await f.request('/api/workshop/draft-cart', 'POST', f.input, h)).status, 409); assert.equal(f.calls, 1);
});
test('cancelled request before or during context resolution does not reserve or send a cart', async t => {
  const f = setup(t), controller = new AbortController();
  const send = createCartHttpGate({drafts: f.w.customerDrafts, repository: f.w.repository, settings: f.settings});
  const context = {draftToken: f.draft.token, request: {aborted: true}};
  await assert.rejects(send(f.input, context), e => e.code === 'cart_cancelled'); assert.equal(f.contexts, 0);
  f.buyer(async () => {controller.abort(); return '192.0.2.10';});
  await assert.rejects(send(f.input, {...context, request: {}, signal: controller.signal}), e => e.code === 'cart_cancelled');
  assert.equal(f.calls, 0);
});
