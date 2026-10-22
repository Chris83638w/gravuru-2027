import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createHash, createHmac, randomBytes, randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

// No private backup, real credential, Shopify transport or external HTTP target.
// The real preview server listens only on an ephemeral loopback port. Host/Origin
// are synthetic headers so the existing embedded-host boundary is exercised.
const ROUTE = '/api/workshop/shop-product-bindings/check';
const APP = {mode: 'embedded-test', origin: 'https://workshop.example', shopDomain: 'binding-fixture.myshopify.com', clientId: 'binding-fixture'};
const PRODUCT = 'gid://shopify/Product/100', VARIANT = 'gid://shopify/ProductVariant/200';
const FOREIGN = 'foreign-fixture.myshopify.com';
let directory, seed;
before(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-binding-http-'));
  const outputDirectory = path.join(directory, 'preview');
  build({outputDirectory});
  seed = JSON.parse(fs.readFileSync(path.join(outputDirectory, 'models.json'), 'utf8'))[0];
});
after(() => {if (directory) fs.rmSync(directory, {recursive: true, force: true});});

function jwt(sessions, patch = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {aud: sessions.clientId, dest: 'https://' + sessions.shopDomain,
    iss: 'https://' + sessions.shopDomain + '/admin', sub: '123', iat: now, nbf: now,
    exp: now + 60, jti: randomUUID(), ...patch};
  const text = [{alg: 'HS256'}, claims].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return 'Bearer ' + text + '.' + createHmac('sha256', sessions.secret).update(text).digest('base64url');
}

// Logical snapshot of ALL application tables in the three synthetic databases, including
// revision/binding/journal rows. Reads use SQLite, not an unsafe copy of a WAL DB.
function databaseState(dir) {
  return Object.fromEntries(['workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite'].map(name => {
    const db = new DatabaseSync(path.join(dir, name), {readOnly: true});
    try {
      const schema = db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
      const rows = schema.filter(v => v.type === 'table').map(({name}) => {
        assert.match(name, /^[a-z_][a-z0-9_]*$/);
        return [name, db.prepare('SELECT * FROM "' + name + '"').all().map(v => JSON.stringify(v)).sort()];
      });
      return [name, createHash('sha256').update(JSON.stringify({schema, rows})).digest('hex')];
    } finally {db.close();}
  }));
}

async function setup(t, {embedded = true, configured = true, storeId = 'synthetic-store', remoteShop = APP.shopDomain} = {}) {
  const dir = fs.mkdtempSync(path.join(directory, 'case-'));
  const sessions = {mode: 'test-only', shopDomain: APP.shopDomain, clientId: APP.clientId, secret: randomBytes(32).toString('hex')};
  const otherSessions = {...sessions, shopDomain: FOREIGN, secret: randomBytes(32).toString('hex')};
  const calls = [];
  let selectedPrice;
  const reader = {async inspectVariants(ids) {
    calls.push([...ids]);
    return {installation: {shopDomain: remoteShop, currency: 'EUR', scope: 'admin-readonly'},
      variants: ids.map(id => ({id, found: true, productId: PRODUCT, priceCents: selectedPrice, status: 'DRAFT'}))};
  }};
  const workshop = createWorkshop({filename: path.join(dir, 'workshop.sqlite'), seedConfig: seed.universal, legacy: seed.legacy,
    ...(embedded ? {shopifySessions: sessions} : {}), ...(configured ? {shopBindingRead: {storeId, reader}} : {}),
    tenantOptions: tenant => tenant.shopDomain === FOREIGN ? {shopifySessions: otherSessions, shopBindingRead: {storeId: 'foreign-store', reader}} : null});
  let server;
  t.after(async () => {
    if (server?.listening) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
    workshop.close();
  });
  const record = workshop.repository.copy(workshop.defaultId, {expectedRevision: 1, name: 'Synthetic ID check', kind: 'product'});
  const preparation = prepareShopProduct(record), variant = preparation.variants[0];
  assert.equal(preparation.sourceReady, true); selectedPrice = variant.priceCents;
  const data = {selections: [{shopifyProductId: PRODUCT, shopifyVariantId: VARIANT,
    productId: record.id, productRevision: record.revision, options: variant.options}]};
  server = createPreviewServer({workshop, outputDirectory: path.join(directory, 'preview'), ...(embedded ? {embeddedApp: APP} : {})});
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port;
  function request(url, {method = 'GET', headers = {}, data, raw} = {}) {
    const bytes = raw === undefined ? (data === undefined ? undefined : JSON.stringify(data)) : raw;
    return new Promise((resolve, reject) => {
      const req = http.request({hostname: '127.0.0.1', port, path: url, method,
        headers: {host: embedded ? 'workshop.example' : '127.0.0.1:' + port, connection: 'close', ...headers}}, res => {
        const chunks = []; res.on('data', part => chunks.push(part)); res.on('error', reject);
        res.on('end', () => {const text = Buffer.concat(chunks).toString('utf8'); let value;
          try {value = JSON.parse(text);} catch {value = null;}
          resolve({status: res.statusCode, headers: res.headers, value});});
      });
      req.on('error', reject); req.setTimeout(10000, () => req.destroy(new Error('Synthetic loopback request timed out.')));
      req.end(bytes);
    });
  }
  const authorization = embedded ? jwt(sessions) : undefined;
  const session = await request('/api/workshop/session', {headers: authorization ? {authorization} : {}});
  assert.equal(session.status, 200);
  const headers = {'content-type': 'application/json', 'x-gravuru-csrf': session.value.csrfToken,
    origin: embedded ? APP.origin : 'http://127.0.0.1:' + port, ...(authorization ? {authorization} : {})};
  const send = (value = data, patch = {}) => request(ROUTE, {method: 'POST', data: value, headers: {...headers, ...patch}});
  return {dir, workshop, record, preparation, data, headers, request, send, calls, sessions, otherSessions};
}

test('binding HTTP denies anonymous/customer/foreign-shop tokens and invalid CSRF/host/origin before the reader', async t => {
  const f = await setup(t), before = databaseState(f.dir);
  const {authorization: _authorization, ...anonymousHeaders} = f.headers;
  assert.equal((await f.request(ROUTE, {method: 'POST', headers: anonymousHeaders, data: f.data})).status, 401);
  const customer = jwt(f.sessions, {dest: APP.shopDomain, sub: 'gid://shopify/Customer/456'});
  const foreign = jwt(f.sessions, {dest: 'https://' + FOREIGN, iss: 'https://' + FOREIGN + '/admin'});
  for (const authorization of ['', customer, foreign]) assert.equal((await f.send(f.data, {authorization})).status, 401);
  for (const patch of [{'x-gravuru-csrf': 'wrong'}, {host: 'foreign.invalid'}, {origin: 'https://foreign.invalid'}])
    assert.equal((await f.send(f.data, patch)).status, 403);
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});

test('binding HTTP enforces POST, JSON and the 64 KiB body boundary', async t => {
  const f = await setup(t), before = databaseState(f.dir);
  assert.equal((await f.request(ROUTE, {headers: f.headers})).status, 405);
  assert.equal((await f.send(f.data, {'content-type': 'text/plain'})).status, 415);
  assert.equal((await f.request(ROUTE, {method: 'POST', headers: f.headers, raw: '{broken'})).status, 400);
  const large = await f.send({padding: 'x'.repeat(65536)}); assert.equal(large.status, 413); assert.equal(large.value.error.code, 'body_limit');
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});

test('merchant login alone cannot enable an unconfigured binding check', async t => {
  const f = await setup(t, {configured: false}), before = databaseState(f.dir), result = await f.send();
  assert.equal(result.status, 503); assert.equal(result.value.error.code, 'shop_binding_disabled');
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});

test('local operator CSRF session is insufficient even with a configured reader', async t => {
  const f = await setup(t, {embedded: false}), before = databaseState(f.dir), result = await f.send();
  assert.equal(result.status, 503); assert.equal(result.value.error.code, 'shop_binding_login_required');
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});

test('configured HTTP check permits ID planning with a pending manufacturing profile and never enables production or writes', async t => {
  const f = await setup(t), before = databaseState(f.dir);
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await f.send(); assert.equal(result.status, 200, JSON.stringify(result.value));
    assert.match(result.headers['cache-control'], /no-store/);
    assert.equal(result.value.schema, 'gravuru-shop-product-binding-check/v1');
    assert.equal(result.value.status, 'id-plan-ready'); assert.equal(result.value.purpose, 'id-binding');
    assert.equal(result.value.productionStatus, 'profile-assignment-pending');
    assert.equal(result.value.plan.purpose, 'id-binding'); assert.equal(result.value.plan.mode, 'plan-only');
    assert.equal(result.value.plan.productionStatus, 'profile-assignment-pending');
    assert.equal(result.value.plan.entries[0].productionProfileRef, null);
    for (const flag of ['productionReady', 'publicAccess', 'checkoutEnabled', 'written', 'shopifyWrites']) assert.equal(result.value[flag], false);
    const readiness = result.value.entries[0].readiness;
    for (const value of [result.value.plan, readiness]) {
      for (const flag of ['productionReady', 'publicAccess', 'checkoutEnabled']) assert.equal(value[flag], false);
    }
    assert.equal(result.value.entries[0].productId, f.record.id); assert.equal(result.value.entries[0].productRevision, 1);
    assert.deepEqual(readiness.bindingBlockers, []); assert.deepEqual(readiness.blockers, []);
    assert.equal(readiness.productionStatus, 'profile-assignment-pending');
    assert.ok(readiness.productionPending.some(b => b.code === 'production_profile_missing'));
  }
  assert.deepEqual(f.calls, [[VARIANT], [VARIANT]]); assert.deepEqual(databaseState(f.dir), before);
  assert.equal(f.workshop.orderIntake.bindings().length, 0);
});

test('browser fields cannot choose a tenant/store/reader/profile or provide price evidence', async t => {
  const f = await setup(t), before = databaseState(f.dir);
  for (const patch of [{tenantId: 'foreign'}, {storeId: 'foreign-store'}, {reader: {}}, {shopDomain: FOREIGN}, {productionProfileRef: {}}, {priceCents: 1}, {purpose: 'id-binding'}, {purpose: 'profile-bound'}]) {
    const result = await f.send({...f.data, ...patch}); assert.equal(result.status, 422); assert.equal(result.value.error.code, 'shop_binding_fields');
  }
  for (const patch of [{tenantId: 'foreign'}, {storeId: 'foreign-store'}, {baseUnitCents: 1}, {productionProfileRef: {id: 'forged'}}, {purpose: 'id-binding'}]) {
    const result = await f.send({selections: [{...f.data.selections[0], ...patch}]}); assert.equal(result.status, 422);
  }
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});

test('a product existing only in another tenant cannot be read through the current merchant route', async t => {
  const f = await setup(t);
  f.workshop.tenants.ensure({id: 'foreign', shopDomain: FOREIGN});
  const other = f.workshop.forTenant('foreign');
  const foreignProduct = other.repository.create({...structuredClone(f.record.document), masterId: null, name: 'Foreign synthetic product'});
  const before = databaseState(f.dir);
  const result = await f.send({selections: [{...f.data.selections[0], productId: foreignProduct.id}]});
  assert.equal(result.status, 404); assert.equal(result.value.error.code, 'shop_binding_product_missing');
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});

test('invalid server store scope fails closed before any remote inspection', async t => {
  const f = await setup(t, {storeId: '../foreign-store'}), before = databaseState(f.dir), result = await f.send();
  assert.equal(result.status, 422); assert.equal(result.value.error.code, 'shop_binding_adapter_scope');
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});

test('a stale product revision and foreign Shopify evidence cannot yield an attachment plan', async t => {
  const f = await setup(t, {remoteShop: FOREIGN}), before = databaseState(f.dir);
  const stale = await f.send({selections: [{...f.data.selections[0], productRevision: 2}]});
  assert.equal(stale.status, 409); assert.equal(stale.value.error.code, 'shop_binding_revision'); assert.equal(f.calls.length, 0);
  const foreign = await f.send(); assert.equal(foreign.status, 502); assert.equal(foreign.value.error.code, 'shop_binding_shop_evidence');
  assert.equal(f.calls.length, 1); assert.deepEqual(databaseState(f.dir), before);
});

test('existing session/product/preparation routes retain merchant guards and saved revisions', async t => {
  const f = await setup(t), before = databaseState(f.dir);
  for (const route of ['/api/workshop/products', '/api/workshop/products/' + f.record.id + '/shop-preparation?revision=1']) {
    assert.equal((await f.request(route)).status, 401);
    const response = await f.request(route, {headers: f.headers}); assert.equal(response.status, 200);
  }
  assert.equal((await f.request('/api/workshop/session', {headers: f.headers})).status, 200);
  assert.equal(f.calls.length, 0); assert.deepEqual(databaseState(f.dir), before);
});
