import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createAmazonSpApiClient, readAmazonCredentialsFile, amazonOrderWithoutPii} from './amazon-sp-api-client.mjs';

const secrets = {clientId: 'synthetic-client-id-only', clientSecret: 'synthetic-client-secret-only', refreshToken: 'synthetic-refresh-token-only'};
const tokenValue = 'synthetic-access-token-only';
const order = () => ({orderId: '171-9876543-2109876', createdTime: '2026-10-01T09:00:00Z', lastUpdatedTime: '2026-10-01T10:00:00Z',
  salesChannel: {marketplaceId: 'A1PA6795UKMFR9'}, buyer: {buyerName: 'private-buyer'}, recipient: {deliveryAddress: {addressLine1: 'private-address'}},
  fulfillment: {fulfillmentStatus: 'UNSHIPPED', fulfilledBy: 'MERCHANT', shipByWindow: {latestDateTime: '2026-10-03T10:00:00Z'}},
  orderItems: [{orderItemId: 'synthetic-item', quantityOrdered: 2, product: {asin: 'B000000001', sellerSku: 'TEST/SKU', title: 'Synthetic sign',
    customization: {customizedUrl: 'https://private.invalid/signed-custom'}, price: {unitPrice: {amount: '12.99', currencyCode: 'EUR'}}},
    fulfillment: {quantityFulfilled: 0, quantityUnfulfilled: 2, packing: {giftOption: {giftMessage: 'private-gift'}}},
    cancellation: {cancellationRequest: {requester: 'BUYER', cancelReason: 'private-reason'}}}]});
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {status, headers: {'content-type': 'application/json', ...headers}});
const token = () => json({access_token: tokenValue, expires_in: 3600, token_type: 'bearer'});
const config = patch => ({readCredentials: () => secrets, roles: ['Inventory and Order Tracking', 'Product Listing', 'Finance and Accounting'], sellerId: 'TESTSELLER', ...patch});
function fixture(handler = () => json(order()), options = {}, patch = {}) {
  const requests = [], sleeps = [], audit = []; let clock = Date.parse('2026-10-16T12:00:00Z');
  const client = createAmazonSpApiClient(config(patch), {now: () => clock, sleep: async ms => {sleeps.push(ms);}, random: () => 0.5,
    onAudit: value => audit.push(value), fetchImpl: async (url, init) => {requests.push({url, init}); return url.includes('/auth/o2/token') ? token() : handler(url, init);}, ...options});
  return {client, requests, sleeps, audit, advance: ms => {clock += ms;}};
}

test('Amazon defaults to fixed EU sandbox, uses LWA and returns only non-PII order fields', async () => {
  const f = fixture(); const result = await f.client.getOrder(order().orderId);
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[0].url, 'https://api.amazon.com/auth/o2/token');
  assert.equal(new URLSearchParams(f.requests[0].init.body).get('grant_type'), 'refresh_token');
  assert.equal(f.requests[1].init.method, 'GET');
  assert.equal(f.requests[1].init.redirect, 'error');
  assert.equal(f.requests[1].init.headers['x-amz-access-token'], tokenValue);
  assert.equal(f.requests[1].init.headers['x-amz-date'], '20261016T120000Z');
  const url = new URL(f.requests[1].url);
  assert.equal(url.origin, 'https://sandbox.sellingpartnerapi-eu.amazon.com');
  assert.equal(url.pathname, '/orders/2026-01-01/orders/' + order().orderId);
  assert.equal(url.searchParams.get('includedData'), 'FULFILLMENT,PROCEEDS,CANCELLATION');
  assert.equal(result.orderItems[0].product.price.unitPrice.amount, '12.99');
  assert.equal(result.orderItems[0].product.customizationAvailable, true);
  assert.equal(result.orderItems[0].cancellation.cancellationRequest.requester, 'BUYER');
  assert.ok(!JSON.stringify(result).includes('private-'));
  for (const secret of [...Object.values(secrets), tokenValue]) assert.ok(!JSON.stringify(f.audit).includes(secret));
  assert.equal(f.client.diagnostics().productionReadsEnabled, false);
});

test('Amazon single-flight token refresh caches and refreshes before expiration', async () => {
  const f = fixture(); await Promise.all(Array.from({length: 8}, () => f.client.getOrder(order().orderId)));
  assert.equal(f.requests.filter(r => r.url.includes('/auth/o2/token')).length, 1);
  f.advance(3539000); await f.client.getOrder(order().orderId);
  assert.equal(f.requests.filter(r => r.url.includes('/auth/o2/token')).length, 1);
  f.advance(1000); await Promise.all([f.client.getOrder(order().orderId), f.client.getOrder(order().orderId)]);
  assert.equal(f.requests.filter(r => r.url.includes('/auth/o2/token')).length, 2);
});

test('Amazon blocked production, role, unknown options and restricted datasets cause no network request', async () => {
  assert.throws(() => createAmazonSpApiClient(config({environment: 'production'})), e => e.code === 'production_disabled');
  assert.throws(() => createAmazonSpApiClient(config({endpoint: 'https://elsewhere.invalid'})), e => e.code === 'request_parameters');
  const f = fixture();
  for (const input of [{includedData: ['BUYER']}, {includedData: ['RECIPIENT']}, {includedData: ['TAX']}, {environment: 'production'}, {sandboxFixture: true}])
    await assert.rejects(f.client.getOrder(order().orderId, input));
  await assert.rejects(f.client.getOrder('../shipmentConfirmation'));
  assert.equal(f.requests.length, 0);
  const g = fixture(undefined, {}, {roles: []}); await assert.rejects(g.client.getOrder(order().orderId), e => e.code === 'role_orders');
  assert.equal(g.requests.length, 0);
});

test('Amazon fixed sandbox fixture permits documented synthetic datasets and strips PII', async () => {
  const f = fixture(); const value = await f.client.probeSandbox();
  assert.equal(value.staticFixture, true); assert.equal(value.productionPermissionVerified, false);
  assert.ok(!JSON.stringify(value).includes('private-'));
  assert.ok(new URL(f.requests[1].url).searchParams.get('includedData').includes('BUYER,RECIPIENT'));
  const g = fixture(undefined, {allowProductionReads: true}, {environment: 'production'});
  await assert.rejects(g.client.probeSandbox(), e => e.code === 'sandbox_only'); assert.equal(g.requests.length, 0);
});

test('Amazon order search validates window, statuses, scoped marketplaces and pagination', async () => {
  const f = fixture(() => json({orders: [order()], pagination: {nextToken: 'safe-next', private: 'private-token'}, unknown: 'private-root'}));
  const input = {lastUpdatedAfter: '2026-10-01T00:00:00Z', lastUpdatedBefore: '2026-10-16T11:57:00Z', fulfillmentStatuses: ['CANCELLED'], fulfilledBy: ['MERCHANT'], paginationToken: 'A+B/='};
  const value = await f.client.searchOrders(input), url = new URL(f.requests[1].url);
  assert.deepEqual(value.pagination, {nextToken: 'safe-next'}); assert.ok(!JSON.stringify(value).includes('private-'));
  assert.equal(url.searchParams.get('paginationToken'), 'A+B/='); assert.equal(url.searchParams.get('marketplaceIds'), 'A1PA6795UKMFR9');
  const count = f.requests.length;
  for (const changes of [{createdAfter: input.lastUpdatedAfter}, {lastUpdatedBefore: '2026-10-16T12:00:00Z'}, {marketplaceIds: ['OTHER']}, {maxResultsPerPage: 101}, {fulfillmentStatuses: ['Canceled']}])
    await assert.rejects(f.client.searchOrders({...input, ...changes}));
  assert.equal(f.requests.length, count);
});

test('Amazon respects Retry-After, bounds transient retries and never retries forbidden calls', async () => {
  let count = 0; const f = fixture(() => ++count < 3 ? json({errors: [{message: 'private-error'}]}, 429, {'retry-after': '2'}) : json(order()));
  await f.client.getOrder(order().orderId); assert.deepEqual(f.sleeps, [2000, 2000]); assert.equal(count, 3);
  const long = fixture(() => json({}, 429, {'retry-after': '120'}));
  await assert.rejects(long.client.getOrder(order().orderId), e => e.code === 'retry_later' && e.retryAfterMs === 120000); assert.equal(long.sleeps.length, 0);
  const unavailable = fixture(() => json({}, 503)); await assert.rejects(unavailable.client.getOrder(order().orderId), e => e.code === 'http_503');
  assert.equal(unavailable.requests.length, 4); assert.deepEqual(unavailable.sleeps, [500, 1000]);
  const forbidden = fixture(() => json({errors: [{message: secrets.clientSecret}]}, 403));
  await assert.rejects(forbidden.client.getOrder(order().orderId), e => e.code === 'http_403' && !e.stack.includes(secrets.clientSecret));
  assert.equal(forbidden.requests.length, 2); assert.deepEqual(forbidden.sleeps, []);
});

test('Amazon refreshes a rejected token once on HTTP 401', async () => {
  let count = 0; const f = fixture(() => ++count === 1 ? json({}, 401) : json(order()));
  await f.client.getOrder(order().orderId);
  assert.equal(f.requests.filter(r => r.url.includes('/auth/o2/token')).length, 2); assert.equal(count, 2);
});

test('Amazon rejects redirects, HTML, oversized and malformed responses without leaking contents', async () => {
  const handlers = [() => new Response(null, {status: 302, headers: {location: 'https://private.invalid/secret'}}),
    () => new Response('private-response', {headers: {'content-type': 'text/html'}}),
    () => new Response('{private-response', {headers: {'content-type': 'application/json'}}),
    () => json(order(), 200, {'content-length': '99999999'})];
  for (const handler of handlers) {
    const f = fixture(handler); await assert.rejects(f.client.getOrder(order().orderId), e => !e.stack.includes('private-response') && !e.stack.includes('private.invalid'));
    assert.equal(f.requests.length, 2);
  }
});

test('Amazon aborts requests and removes upstream exception text', async () => {
  const f = fixture((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Error(secrets.clientSecret)))), {timeoutMs: 5, maxAttempts: 1});
  await assert.rejects(f.client.getOrder(order().orderId), e => e.code === 'timeout' && !e.stack.includes(secrets.clientSecret));
  const g = fixture(() => {throw Error('private-network-credential');}, {maxAttempts: 2});
  await assert.rejects(g.client.getOrder(order().orderId), e => e.code === 'network_or_response' && !e.stack.includes('private-network'));
  assert.equal(g.requests.length, 3);
});

test('Amazon rejects malformed LWA responses and does not leak credentials or cache errors', async () => {
  let calls = 0; const f = fixture(undefined, {fetchImpl: async url => {calls++; return url.includes('/auth/o2/token') ? json({access_token: 'bad', expires_in: 3600}) : json(order());}});
  await assert.rejects(f.client.getOrder(order().orderId), e => e.code === 'token_response'); assert.equal(calls, 1);
  await assert.rejects(f.client.getOrder(order().orderId), e => e.code === 'token_response'); assert.equal(calls, 2);
  const g = fixture(undefined, {}, {readCredentials: () => {throw Error(secrets.clientSecret);}});
  await assert.rejects(g.client.getOrder(order().orderId), e => e.code === 'credentials_unavailable' && !e.stack.includes(secrets.clientSecret));
  assert.equal(g.requests.length, 0);
});

test('Amazon listing/catalog/finance calls are scoped read operations and encode SKU', async () => {
  const f = fixture(() => json({items: [], payload: {transactions: []}}));
  await f.client.searchListingsItems(); await f.client.getListingsItem('SKU/a b?x=1'); await f.client.getCatalogItem('B000000001');
  await f.client.listTransactions({orderId: order().orderId});
  const outbound = f.requests.filter(r => !r.url.includes('/auth/o2/token'));
  assert.ok(outbound.every(r => r.init.method === 'GET'));
  assert.equal(new URL(outbound[1].url).pathname, '/listings/2021-08-01/items/TESTSELLER/SKU%2Fa%20b%3Fx%3D1');
  assert.equal(new URL(outbound[3].url).searchParams.get('relatedIdentifierName'), 'ORDER_ID');
  await assert.rejects(f.client.listTransactions({postedAfter: '2026-01-01T00:00:00Z', postedBefore: '2026-10-01T00:00:00Z'}), e => e.code === 'request_date_window');
  const g = fixture(undefined, {}, {roles: ['Inventory and Order Tracking']});
  await assert.rejects(g.client.getCatalogItem('B000000001'), e => e.code === 'role_catalog');
  await assert.rejects(g.client.listTransactions({orderId: order().orderId}), e => e.code === 'role_finances'); assert.equal(g.requests.length, 0);
});

test('Amazon fee estimate POST is read-only, amounts use input cents and never update listings', async () => {
  const f = fixture(() => json({payload: {FeesEstimateResult: {Status: 'Success'}}}));
  await f.client.estimateFees('TEST/SKU', {marketplaceId: 'A1PA6795UKMFR9', priceCents: 1299, shippingCents: 349, currency: 'EUR', isAmazonFulfilled: false});
  assert.equal(new URL(f.requests[1].url).pathname, '/products/fees/v0/listings/TEST%2FSKU/feesEstimate');
  const body = JSON.parse(f.requests[1].init.body).FeesEstimateRequest;
  assert.equal(body.PriceToEstimateFees.ListingPrice.Amount, 12.99); assert.equal(body.PriceToEstimateFees.Shipping.Amount, 3.49);
  assert.equal(f.client.confirmShipment, undefined); assert.equal(f.client.request, undefined); assert.equal(f.client.token, undefined);
  await assert.rejects(f.client.estimateFees('TEST', {marketplaceId: 'OTHER', priceCents: 1299, currency: 'EUR', isAmazonFulfilled: false}));
});

test('Amazon rejects dot-segment SKUs before token or API requests', async () => {
  const f = fixture();
  for (const sku of ['.', '..']) {
    await assert.rejects(f.client.getListingsItem(sku), e => e.code === 'request_sku');
    await assert.rejects(f.client.estimateFees(sku, {marketplaceId: 'A1PA6795UKMFR9', priceCents: 1299, currency: 'EUR', isAmazonFulfilled: false}), e => e.code === 'request_sku');
  }
  assert.equal(f.requests.length, 0);
});

test('Amazon credentials require a private regular file outside checkout and sanitized parsing', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-amazon-credentials-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const filename = path.join(directory, 'test.json'); fs.writeFileSync(filename, JSON.stringify(secrets), {mode: 0o600});
  if (process.platform === 'win32') assert.throws(() => readAmazonCredentialsFile(filename), e => e.code === 'credentials_encryption_required');
  else assert.deepEqual(readAmazonCredentialsFile(filename), secrets);
  assert.throws(() => readAmazonCredentialsFile('relative.json'), e => e.code === 'credentials_file');
  assert.throws(() => readAmazonCredentialsFile(path.resolve('package.json')), e => e.code === 'credentials_file');
  fs.writeFileSync(filename, '{' + secrets.clientSecret);
  assert.throws(() => readAmazonCredentialsFile(filename), e => e.code === 'credentials_file' && !e.stack.includes(secrets.clientSecret));
  if (process.platform !== 'win32') {
    fs.writeFileSync(filename, JSON.stringify(secrets)); fs.chmodSync(filename, 0o644);
    assert.throws(() => readAmazonCredentialsFile(filename), e => e.code === 'credentials_file');
  }
});

test('Amazon PII projection ignores unexpected nested objects and rejects invalid order shape', () => {
  const raw = order(); raw.orderItems[0].product.title = {buyerName: 'private-injected'};
  assert.ok(!JSON.stringify(amazonOrderWithoutPii(raw)).includes('private-'));
  assert.throws(() => amazonOrderWithoutPii({orderId: 'private-invalid'}), e => e.code === 'orders_response');
});

test('Amazon order projection excludes free-form titles and package tracking strings', () => {
  const raw = order(); raw.orderItems[0].product.title = 'private-personalized-title';
  raw.packages = [{packageReferenceId: '1', carrier: 'DHL', trackingNumber: 'private-tracking-number', shipTime: '2026-10-15T10:00:00Z'}];
  const projected = amazonOrderWithoutPii(raw);
  assert.equal(projected.orderItems[0].product.title, undefined);
  assert.equal(projected.packages[0].trackingNumber, undefined);
  assert.equal(projected.packages[0].carrier, 'DHL');
  assert.ok(!JSON.stringify(projected).includes('private-'));
});

test('Amazon Windows DPAPI credential envelope decrypts only through fixed private-file loader', {skip: process.platform !== 'win32'}, t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-amazon-dpapi-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const filename = path.join(directory, 'test.json'); fs.writeFileSync(filename, JSON.stringify(secrets));
  // Only synthetic values are used here. Real credentials never enter test output.
  execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-NonInteractive', '-Command', String.raw`
      $ErrorActionPreference='Stop'
      Add-Type -AssemblyName System.Security
      $target=[Environment]::GetEnvironmentVariable('GRAVURU_AMAZON_DPAPI_TEST')
      $plain=[IO.File]::ReadAllBytes($target)
      try {
        $encrypted=[Security.Cryptography.ProtectedData]::Protect($plain,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
        $envelope=@{format='gravuru-windows-dpapi/v1';data=[Convert]::ToBase64String($encrypted)} | ConvertTo-Json -Compress
        [IO.File]::WriteAllText($target,$envelope,(New-Object Text.UTF8Encoding($false)))
      } finally {[Array]::Clear($plain,0,$plain.Length)}
    `], {windowsHide: true, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, GRAVURU_AMAZON_DPAPI_TEST: filename}});
  const envelope = fs.readFileSync(filename, 'utf8');
  for (const value of Object.values(secrets)) assert.ok(!envelope.includes(value));
  assert.deepEqual(readAmazonCredentialsFile(filename), secrets);
  fs.writeFileSync(filename, JSON.stringify({format: 'gravuru-windows-dpapi/v1', data: Buffer.alloc(100).toString('base64')}));
  assert.throws(() => readAmazonCredentialsFile(filename), e => e.code === 'credentials_decryption' && !e.stack.includes('DPAPI_DECRYPT_FAILED'));
});
