import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHmac, randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {merchantConfig, prepareMerchantStorage, verifyMerchantStorage, checkMerchantPython, MERCHANT_MARKER} from './merchant-config.mjs';
import {createMerchantRuntime} from './merchant-runtime.mjs';
import {SHOPIFY_IDENTITY} from '../../app/workshop/shopify-runtime-config.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-merchant-'));
  const runtimes = new Set();
  const previous = {python: process.env.GRAVURU_PYTHON, pythonPath: process.env.PYTHONPATH, mask: process.umask()};
  t.after(async () => {for (const runtime of runtimes) await runtime.close(); fs.rmSync(root, {recursive: true, force: true}); process.umask(previous.mask);
    for (const [key, value] of [['GRAVURU_PYTHON', previous.python], ['PYTHONPATH', previous.pythonPath]]) {if (value === undefined) delete process.env[key]; else process.env[key] = value;}});
  const file = path.join(root, 'merchant.json'), secretFile = path.join(root, 'app-secret'), secret = randomBytes(32).toString('hex');
  const values = {GRAVURU_SHOPIFY_APP_ORIGIN: 'https://merchant.example', GRAVURU_PRIVATE_DATA_DIR: path.join(root, 'data'),
    GRAVURU_SHOPIFY_CLIENT_SECRET_FILE: secretFile, GRAVURU_SHOPIFY_PYTHON: process.env.GRAVURU_MERCHANT_TEST_PYTHON || '/usr/bin/python3'};
  fs.writeFileSync(secretFile, secret, {mode: 0o600});
  const save = () => fs.writeFileSync(file, JSON.stringify({schema: 1, purpose: 'shopify-merchant-test-runtime', values}), {mode: 0o600}); save();
  const env = {GRAVURU_SHOPIFY_CONFIG_FILE: file};
  return {root, file, secretFile, secret, values, env, save, runtimes, config: () => merchantConfig(env)};
}
function token(secret, patch = {}) {
  const now = Math.floor(Date.now() / 1000), payload = {aud: SHOPIFY_IDENTITY.clientId, iss: 'https://' + SHOPIFY_IDENTITY.shopDomain + '/admin', dest: 'https://' + SHOPIFY_IDENTITY.shopDomain,
    sub: '123456', exp: now + 60, nbf: now - 1, iat: now - 1, jti: 'synthetic-review-token', ...patch};
  const data = [Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url')].join('.');
  return 'Bearer ' + data + '.' + createHmac('sha256', secret).update(data).digest('base64url');
}
async function start(f) {
  const server = await createMerchantRuntime(f.env); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const runtime = {server, close: async () => {server.close(); server.closeAllConnections(); await server.runtimeClosed; f.runtimes.delete(runtime);},
    request: (route, {headers = {}, method = 'GET', data} = {}) => new Promise((resolve, reject) => {
      const req = http.request({hostname: '127.0.0.1', port: server.address().port, path: route, method,
        headers: {host: 'merchant.example', 'x-forwarded-proto': 'https', ...(data ? {'content-type': 'application/json'} : {}), ...headers}}, res => {
        const parts = []; res.on('data', b => parts.push(b)); res.on('end', () => resolve({status: res.statusCode, headers: res.headers, bytes: Buffer.concat(parts)}));
      }); req.on('error', reject); req.end(data ? JSON.stringify(data) : undefined);
    })}; f.runtimes.add(runtime); return runtime;
}
test('private configuration accepts only explicit separate merchant settings and never prints secrets', t => {
  const f = fixture(t), c = f.config(); assert.equal(c.runtime.shopDrafts, null); assert.equal(c.runtime.shopifySessions.secret, f.secret);
  for (const patch of [{GRAVURU_SHOPIFY_APP_ORIGIN: 'https://other.example'}, {GRAVURU_SHOPIFY_CLIENT_SECRET: f.secret}, {GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN: 'synthetic-admin-token'}, {GRAVURU_SHOPIFY_CLIENT_ID: 'another-app'}, {GRAVURU_SHOPIFY_SHOP_DOMAIN: 'other.myshopify.com'}]) {
    assert.throws(() => merchantConfig({...f.env, ...patch}), e => e.code === 'merchant_config' && !String(e).includes(f.secret));
  }
  fs.chmodSync(f.file, 0o644); assert.throws(f.config, {code: 'merchant_config'}); fs.chmodSync(f.file, 0o600);
  fs.chmodSync(f.secretFile, 0o644); assert.throws(f.config, {code: 'merchant_secret_file'}); fs.chmodSync(f.secretFile, 0o600);
  f.values.GRAVURU_SHOPIFY_APP_ORIGIN = 'https://gravuru-designwerkstatt.de'; f.save(); assert.throws(f.config, {code: 'merchant_config'});
  assert.ok(!fs.existsSync(f.values.GRAVURU_PRIVATE_DATA_DIR));
});
test('preparation only initializes empty private storage and preserves foreign or symlinked data', t => {
  const f = fixture(t), c = f.config(); prepareMerchantStorage(c); verifyMerchantStorage(c); prepareMerchantStorage(c);
  assert.deepEqual(fs.readdirSync(c.data), [MERCHANT_MARKER]);
  const outside = path.join(f.root, 'existing.sqlite'); fs.writeFileSync(outside, 'existing data', {mode: 0o600});
  fs.symlinkSync(outside, path.join(c.data, 'workshop.sqlite'));
  assert.throws(() => prepareMerchantStorage(c), {code: 'merchant_storage'}); assert.equal(fs.readFileSync(outside, 'utf8'), 'existing data');
  fs.unlinkSync(path.join(c.data, 'workshop.sqlite')); const marker = fs.readFileSync(path.join(c.data, MERCHANT_MARKER));
  assert.throws(() => prepareMerchantStorage({...c, origin: 'https://other.example'}), {code: 'merchant_storage'});
  assert.deepEqual(fs.readFileSync(path.join(c.data, MERCHANT_MARKER)), marker);
});
test('real two-listener merchant runtime enforces host, HTTPS, bearer, CSRF and private-file boundaries', async t => {
  const f = fixture(t); prepareMerchantStorage(f.config()); const runtime = await start(f); t.after(runtime.close);
  const auth = {authorization: token(f.secret), origin: f.values.GRAVURU_SHOPIFY_APP_ORIGIN};
  for (const route of ['/api/workshop/products', '/__shopify/health']) {
    assert.equal((await runtime.request(route)).status, 401);
    for (const authorization of ['Basic Zm9vOmJhcg==', token('wrong-secret'), token(f.secret, {exp: 1}), token(f.secret, {aud: 'other-app'}), token(f.secret, {dest: SHOPIFY_IDENTITY.shopDomain, sub: 'gid://shopify/Customer/123'})]) {
      assert.equal((await runtime.request(route, {headers: {authorization}})).status, 401);
    }
  }
  for (const patch of [{host: 'other.example', 'x-forwarded-host': 'merchant.example'}, {'x-forwarded-proto': 'http'}, {'x-forwarded-proto': 'https,http'}]) assert.equal((await runtime.request('/werkstatt/', {headers: patch})).status, 403);
  const page = await runtime.request('/werkstatt/', {headers: {origin: 'https://admin.shopify.com', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe'}});
  assert.equal(page.status, 200); assert.match(page.bytes.toString(), /app-bridge\.js/); assert.ok(!page.bytes.toString().includes(f.secret));
  assert.match(page.headers['content-security-policy'], /frame-ancestors https:\/\/gravuru-design\.myshopify\.com https:\/\/admin.shopify.com/);
  for (const route of ['/.env', '/private/app-secret', '/PACKAGE-MANIFEST.json', '/models.json', '/form-editor.html']) assert.equal((await runtime.request(route)).status, 404);
  const session = await runtime.request('/api/workshop/session', {headers: auth}); assert.equal(session.status, 200);
  const csrf = JSON.parse(session.bytes).csrfToken;
  assert.equal((await runtime.request('/api/workshop/profiles', {method: 'POST', headers: auth, data: {}})).status, 403);
  assert.equal((await runtime.request('/api/workshop/session', {headers: {...auth, origin: 'https://foreign.example'}})).status, 403);
  assert.equal((await runtime.request('/api/workshop/session', {headers: {...auth, 'sec-fetch-site': 'cross-site'}})).status, 403);
  assert.equal((await runtime.request('/api/workshop/products', {headers: auth})).status, 200);
  const health = await runtime.request('/__shopify/health', {headers: auth}); assert.equal(health.status, 200);
  assert.equal(JSON.parse(health.bytes).checkoutEnabled, false); assert.equal(csrf.length, 64);
});
test('concurrent start is refused; persisted data and open-page CSRF survive restart, key rotation invalidates old sessions', async t => {
  const f = fixture(t); prepareMerchantStorage(f.config()); let runtime = await start(f); t.after(() => runtime.close());
  const headers = {authorization: token(f.secret), origin: f.values.GRAVURU_SHOPIFY_APP_ORIGIN};
  const session = JSON.parse((await runtime.request('/api/workshop/session', {headers})).bytes); headers['x-gravuru-csrf'] = session.csrfToken;
  const created = await runtime.request('/api/workshop/profiles', {method: 'POST', headers, data: {name: 'Restart proof', type: 'colors', items: ['#112233']}});
  assert.equal(created.status, 201, created.bytes.toString()); const profile = JSON.parse(created.bytes);
  await assert.rejects(createMerchantRuntime(f.env), /bereits geöffnet/);
  await runtime.close(); runtime = await start(f);
  const reopened = await runtime.request('/api/workshop/profiles/' + profile.id, {headers}); assert.equal(reopened.status, 200); assert.equal(JSON.parse(reopened.bytes).name, 'Restart proof');
  const renewed = JSON.parse((await runtime.request('/api/workshop/session', {headers})).bytes); assert.equal(renewed.csrfToken, session.csrfToken);
  const saved = await runtime.request('/api/workshop/profiles/' + profile.id, {method: 'PATCH', headers, data: {document: {name: 'Continued after restart', type: 'colors', items: ['#112233']}, expectedRevision: profile.revision}});
  assert.equal(saved.status, 200, saved.bytes.toString());
  await runtime.close(); const rotated = randomBytes(32).toString('hex'); fs.writeFileSync(f.secretFile, rotated); runtime = await start(f);
  assert.equal((await runtime.request('/api/workshop/session', {headers})).status, 401);
  const rotatedSession = await runtime.request('/api/workshop/session', {headers: {authorization: token(rotated)}}); assert.equal(rotatedSession.status, 200);
  assert.notEqual(JSON.parse(rotatedSession.bytes).csrfToken, session.csrfToken);
});
test('stable merchant CSRF cannot enable unauthenticated operator mode', () => {
  for (const merchantCsrfToken of ['short', 'a'.repeat(64)]) assert.throws(() => createWorkshop({merchantCsrfToken}), {code: 'merchant_session_config'});
});
test('successful execution alone cannot make an arbitrary executable pass the Python check', () => {
  assert.throws(() => checkMerchantPython({python: '/bin/true'}), {code: 'merchant_python'});
});

test('explicit test-order endpoint authenticates Shopify bytes without weakening merchant access, and persists duplicate detection',async t=>{
 const f=fixture(t);prepareMerchantStorage(f.config());let runtime=await start(f);t.after(()=>runtime.close());
 const route='/webhooks/shopify/orders-paid',payload={id:901,test:true,financial_status:'paid',currency:'EUR',line_items:[]};
 const headers={'x-shopify-hmac-sha256':createHmac('sha256',f.secret).update(JSON.stringify(payload)).digest('base64'),'x-shopify-shop-domain':SHOPIFY_IDENTITY.shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'synthetic-runtime-delivery-901'};
 assert.equal((await runtime.request(route,{method:'POST',headers,data:payload})).status,404);
 await runtime.close();
 for(const value of ['true','live','test-only-2026-10']){f.values.GRAVURU_SHOPIFY_ORDER_WEBHOOK=value;f.save();assert.throws(f.config,{code:'merchant_config'});}
 f.values.GRAVURU_SHOPIFY_ORDER_WEBHOOK='test-only-2026-07';f.save();runtime=await start(f);
 assert.equal((await runtime.request(route,{method:'POST',data:payload})).status,401);
 assert.equal((await runtime.request(route,{method:'POST',headers:{...headers,'x-forwarded-proto':'http'},data:payload})).status,403);
 const first=await runtime.request(route,{method:'POST',headers,data:payload});assert.equal(first.status,200);assert.equal(JSON.parse(first.bytes).duplicate,false);
 assert.equal((await runtime.request('/api/workshop/orders')).status,401);
 assert.equal((await runtime.request('/api/workshop/order-webhook',{method:'POST',headers,data:payload})).status,401);
 const auth={authorization:token(f.secret)};
 const orders=await runtime.request('/api/workshop/orders',{headers:auth});assert.equal(JSON.parse(orders.bytes).integration.enabled,true);
 assert.equal(JSON.parse((await runtime.request('/__shopify/health',{headers:auth})).bytes).orderWebhookEnabled,true);
 await runtime.close();runtime=await start(f);
 const duplicate=await runtime.request(route,{method:'POST',headers,data:payload});assert.equal(duplicate.status,200);assert.equal(JSON.parse(duplicate.bytes).duplicate,true);
});
