import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Server-only, read-only SP-API adapter. No arbitrary endpoint, credential getter,
// order mutation, label purchase or listing update is exposed.
export const AMAZON_ORDERS_VERSION = '2026-01-01';
export const AMAZON_NON_PII_DATA = Object.freeze(['PROCEEDS', 'EXPENSE', 'PROMOTION', 'CANCELLATION', 'FULFILLMENT', 'PACKAGES']);
const ORDER_ROLES = ['Amazon Fulfillment', 'Buyer Communication', 'Buyer Solicitation', 'Direct-to-Consumer Shipping (Restricted)',
  'Finance and Accounting', 'Inventory and Order Tracking', 'Pricing', 'Product Listing', 'Professional Services (Restricted)',
  'Selling Partner Insights', 'Tax Invoicing (Restricted)', 'Tax Remittance (Restricted)'];
const ROLES = Object.freeze({orders: ORDER_ROLES, listings: ['Inventory and Order Tracking', 'Product Listing'],
  catalog: ['Product Listing'], finances: ['Finance and Accounting'], fees: ORDER_ROLES});
const REPO = fileURLToPath(new URL('../../', import.meta.url));
const ID = /^[A-Z0-9]{4,32}$/, ORDER_ID = /^\d{3}-\d{7}-\d{7}$/, ASIN = /^[A-Z0-9]{10}$/;
const TOKEN = /^[\x21-\x7e]{16,8192}$/;
const DPAPI_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$clearBytes = $null
try {
  Add-Type -AssemblyName System.Security
  $cipherFile = [IO.File]::ReadAllBytes([Environment]::GetEnvironmentVariable('GRAVURU_AMAZON_DPAPI_FILE'))
  $digest = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($cipherFile)).Replace('-', '').ToLowerInvariant()
  if ($digest -ne [Environment]::GetEnvironmentVariable('GRAVURU_AMAZON_DPAPI_SHA256')) { throw 'changed' }
  $envelope = [Text.Encoding]::UTF8.GetString($cipherFile) | ConvertFrom-Json
  if ($envelope.format -ne 'gravuru-windows-dpapi/v1') { throw 'format' }
  $clearBytes = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($envelope.data), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  if ($clearBytes.Length -gt 32768) { throw 'size' }
  [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
  [Console]::Write([Text.Encoding]::UTF8.GetString($clearBytes))
} catch { [Console]::Error.Write('DPAPI_DECRYPT_FAILED'); exit 1 }
finally { if ($null -ne $clearBytes) { [Array]::Clear($clearBytes, 0, $clearBytes.Length) } }
`;

export class AmazonSpApiError extends Error {
  constructor(code, {upstreamStatus, retryAfterMs} = {}) {
    super('Amazon-Anbindung nicht bestätigt: ' + code);
    this.name = 'AmazonSpApiError'; this.code = code; this.status = 502;
    if (upstreamStatus !== undefined) this.upstreamStatus = upstreamStatus;
    if (retryAfterMs !== undefined) this.retryAfterMs = retryAfterMs;
  }
}
const fail = (code, details) => {throw new AmazonSpApiError(code, details);};
const inside = (parent, child) => {const relative = path.relative(parent, child); return relative === '' || !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);};
function credentials(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['clientId', 'clientSecret', 'refreshToken'].includes(k))) fail('credentials_format');
  for (const key of ['clientId', 'clientSecret', 'refreshToken']) if (!TOKEN.test(value[key] || '')) fail('credentials_format');
  return {clientId: value.clientId, clientSecret: value.clientSecret, refreshToken: value.refreshToken};
}

// Windows DPAPI envelopes are bound to the same Windows user and machine.
// A service on another host needs its own Secret Store/credential provisioning.
// ACLs still need operator restriction. Windows requires DPAPI; POSIX JSON must be 0600.
// Files inside the source checkout and symlinked credential paths are refused.
export function readAmazonCredentialsFile(filename) {
  let descriptor;
  try {
    if (typeof filename !== 'string' || !path.isAbsolute(filename)) fail('credentials_file');
    const resolved = fs.realpathSync(filename), requested = path.resolve(filename);
    if ((process.platform === 'win32' ? resolved.toLowerCase() !== requested.toLowerCase() : resolved !== requested) || inside(REPO, resolved)) fail('credentials_file');
    const before = fs.lstatSync(filename);
    if (!before.isFile() || before.isSymbolicLink() || before.size > 65536 || before.size < 2 ||
        process.platform !== 'win32' && (before.mode & 0o077) !== 0) fail('credentials_file');
    descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const after = fs.fstatSync(descriptor);
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size) fail('credentials_file');
    const bytes = fs.readFileSync(descriptor);
    if (bytes.length > 65536) fail('credentials_file');
    const value = JSON.parse(bytes.toString('utf8'));
    if (value?.format === 'gravuru-windows-dpapi/v1') {
      if (process.platform !== 'win32') fail('credentials_platform');
      if (Object.keys(value).sort().join(',') !== 'data,format' || typeof value.data !== 'string' || value.data.length < 64 || value.data.length > 60000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.data)) fail('credentials_format');
      let clear;
      try {
        clear = execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
          ['-NoProfile', '-NonInteractive', '-Command', DPAPI_SCRIPT], {windowsHide: true, timeout: 10000, maxBuffer: 32768,
            stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, GRAVURU_AMAZON_DPAPI_FILE: filename,
              GRAVURU_AMAZON_DPAPI_SHA256: createHash('sha256').update(bytes).digest('hex')}});
        return credentials(JSON.parse(clear.toString('utf8')));
      } catch {fail('credentials_decryption');}
      finally {clear?.fill(0);}
    }
    if (process.platform === 'win32') fail('credentials_encryption_required');
    if (bytes.length > 32768) fail('credentials_file');
    return credentials(value);
  } catch (error) {
    if (error instanceof AmazonSpApiError) throw error;
    fail('credentials_file');
  } finally {if (descriptor !== undefined) fs.closeSync(descriptor);}
}

function record(value) {return value !== null && typeof value === 'object' && !Array.isArray(value);}
function pick(value, keys) {
  if (!record(value)) return undefined;
  const scalar = input => input === null || ['string', 'number', 'boolean'].includes(typeof input);
  return Object.fromEntries(keys.filter(key => Object.hasOwn(value, key) &&
    (scalar(value[key]) || Array.isArray(value[key]) && value[key].every(scalar))).map(key => [key, value[key]]));
}
function money(value) {
  if (!record(value)) return undefined;
  if (typeof value.amount !== 'string' || !/^-?\d{1,16}(?:\.\d{1,8})?$/.test(value.amount) || !/^[A-Z]{3}$/.test(value.currencyCode || '')) return undefined;
  return {amount: value.amount, currencyCode: value.currencyCode};
}
function financial(value, depth = 0) {
  if (!record(value) || depth > 8) return undefined;
  const result = {};
  for (const key of ['grandTotal', 'proceedsTotal', 'subtotal', 'value', 'total', 'pointsMonetaryValue']) if (money(value[key])) result[key] = money(value[key]);
  for (const key of ['type', 'subtype']) if (typeof value[key] === 'string' && /^[A-Z0-9_]{1,80}$/.test(value[key])) result[key] = value[key];
  for (const key of ['breakdowns', 'detailedBreakdowns']) if (Array.isArray(value[key])) result[key] = value[key].map(v => financial(v, depth + 1)).filter(Boolean);
  return result;
}
const timeWindow = value => pick(value, ['earliestDateTime', 'latestDateTime']);
const clean = value => JSON.parse(JSON.stringify(value));

// Defense in depth: even static fixtures and unexpectedly over-permissive app
// roles never expose buyer/address, Custom URL, gift text or cancellation prose.
export function amazonOrderWithoutPii(value) {
  if (!record(value) || typeof value.orderId !== 'string' || !ORDER_ID.test(value.orderId) || !Array.isArray(value.orderItems)) fail('orders_response');
  const fulfillment = pick(value.fulfillment, ['fulfillmentStatus', 'fulfilledBy', 'fulfillmentServiceLevel']);
  if (fulfillment) for (const key of ['shipByWindow', 'deliverByWindow', 'labelPrintingWindow']) fulfillment[key] = timeWindow(value.fulfillment[key]);
  return clean({...pick(value, ['orderId', 'createdTime', 'lastUpdatedTime', 'programs']),
    salesChannel: pick(value.salesChannel, ['channelName', 'marketplaceId', 'marketplaceName']), fulfillment,
    proceeds: financial(value.proceeds), orderItems: value.orderItems.map(item => {
      if (!record(item) || typeof item.orderItemId !== 'string' || !Number.isInteger(item.quantityOrdered) || item.quantityOrdered < 0) fail('orders_response');
      return {...pick(item, ['orderItemId', 'quantityOrdered', 'programs']),
        product: {...pick(item.product, ['asin', 'sellerSku']), customizationAvailable: Boolean(item.product?.customization?.customizedUrl),
          price: {unitPrice: money(item.product?.price?.unitPrice)}},
        proceeds: financial(item.proceeds),
        fulfillment: pick(item.fulfillment, ['quantityFulfilled', 'quantityUnfulfilled']),
        cancellation: item.cancellation ? {
          cancellationRequest: pick(item.cancellation.cancellationRequest, ['requester']),
          cancellationExecution: pick(item.cancellation.cancellationExecution, ['cancelledBy'])} : undefined};
    }), packages: Array.isArray(value.packages) ? value.packages.map(item => ({
      ...pick(item, ['packageReferenceId', 'createdTime', 'carrier', 'shipTime', 'shippingService']),
      packageItems: Array.isArray(item.packageItems) ? item.packageItems.map(i => pick(i, ['orderItemId', 'quantity'])) : undefined})) : undefined});
}

function exactKeys(input, allowed) {if (!record(input) || Object.keys(input).some(key => !allowed.includes(key))) fail('request_parameters');}
function date(value) {if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail('request_date'); return value;}
function string(value, max = 2048) {if (typeof value !== 'string' || value.length < 1 || value.length > max || /[\x00-\x1f\x7f]/.test(value)) fail('request_string'); return value;}
function skuSegment(value) {
  const sku = string(value, 200);
  // encodeURIComponent leaves literal dots intact; URL parsing would change the route.
  if (sku === '.' || sku === '..') fail('request_sku');
  return encodeURIComponent(sku);
}
function enums(values, allowed) {if (!Array.isArray(values) || values.some(v => !allowed.includes(v)) || new Set(values).size !== values.length) fail('request_values'); return values;}

export function createAmazonSpApiClient(config, {
  fetchImpl = globalThis.fetch, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), random = Math.random,
  timeoutMs = 20000, maxAttempts = 3, maxRetryDelayMs = 15000, tokenSkewMs = 60000,
  allowProductionReads = false, onAudit = () => {}
} = {}) {
  exactKeys(config, ['readCredentials', 'credentialFile', 'environment', 'region', 'roles', 'sellerId', 'marketplaceIds']);
  const environment = config.environment ?? 'sandbox', region = config.region ?? 'eu';
  if (!['sandbox', 'production'].includes(environment) || !['eu', 'na', 'fe'].includes(region) ||
      environment === 'production' && allowProductionReads !== true) fail('production_disabled');
  if (typeof fetchImpl !== 'function' || typeof now !== 'function' || typeof sleep !== 'function' || typeof random !== 'function' || typeof onAudit !== 'function' ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5 ||
      !Number.isInteger(maxRetryDelayMs) || maxRetryDelayMs < 0 || maxRetryDelayMs > 60000 || !Number.isInteger(tokenSkewMs) || tokenSkewMs < 1000 || tokenSkewMs > 300000) fail('configuration');
  if (!!config.credentialFile === !!config.readCredentials || config.readCredentials && typeof config.readCredentials !== 'function') fail('configuration');
  const readCredentials = config.readCredentials ?? (() => readAmazonCredentialsFile(config.credentialFile));
  const roles = new Set(enums(config.roles ?? [], ORDER_ROLES));
  const marketplaces = [...(config.marketplaceIds ?? ['A1PA6795UKMFR9'])];
  if (!marketplaces.length || marketplaces.length > 50 || marketplaces.some(v => typeof v !== 'string' || !ID.test(v)) || new Set(marketplaces).size !== marketplaces.length) fail('marketplace_ids');
  if (config.sellerId !== undefined && !ID.test(config.sellerId)) fail('seller_id');
  const sellerId = config.sellerId, origin = `https://${environment === 'sandbox' ? 'sandbox.' : ''}sellingpartnerapi-${region}.amazon.com`;
  let cached = null, pending = null, lastRequest = null;
  const audit = value => {lastRequest = Object.freeze({...value}); try {onAudit(lastRequest);} catch { /* Telemetry cannot expose request bodies or break ingestion. */ }};
  const needRole = capability => {if (!ROLES[capability].some(role => roles.has(role))) fail('role_' + capability);};
  const datasets = values => enums(values ?? ['FULFILLMENT', 'PROCEEDS', 'CANCELLATION'], AMAZON_NON_PII_DATA);
  const marketplaceQuery = values => {
    const selected = values ?? marketplaces;
    if (!Array.isArray(selected) || !selected.length || selected.some(v => !marketplaces.includes(v)) || new Set(selected).size !== selected.length) fail('marketplace_ids');
    return selected.join(',');
  };
  function retryDelay(response, attempt) {
    const header = response?.headers.get('retry-after');
    let delay = header === null || header === undefined ? NaN : /^\d+(?:\.\d+)?$/.test(header) ? Number(header) * 1000 : Date.parse(header) - now();
    if (!Number.isFinite(delay) || delay < 0) delay = Math.round(500 * 2 ** attempt * (0.5 + Math.min(1, Math.max(0, random()))));
    return Math.max(0, delay);
  }
  async function transport(url, options, operation, attempt, limit) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs), started = now();
    let response, reader;
    try {
      response = await fetchImpl(url, {...options, signal: controller.signal, redirect: 'error', cache: 'no-store'});
      const rawId = response.headers.get('x-amzn-requestid'), requestId = /^[a-f0-9-]{32,40}$/i.test(rawId || '') ? rawId : undefined;
      const rate = Number(response.headers.get('x-amzn-ratelimit-limit'));
      audit({operation, environment, attempt: attempt + 1, status: response.status, durationMs: Math.max(0, now() - started),
        ...(requestId ? {requestId} : {}), ...(Number.isFinite(rate) && rate > 0 && rate < 1e6 ? {rateLimit: rate} : {})});
      if (response.redirected || response.status >= 300 && response.status < 400) fail('redirect_rejected');
      if (!response.ok) return {status: response.status, retryAfterMs: retryDelay(response, attempt)};
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '') || !response.body) fail('response_format');
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) fail('response_size');
      reader = response.body.getReader(); const parts = []; let bytes = 0;
      for (;;) {
        const next = await reader.read();
        if (controller.signal.aborted) fail('timeout');
        if (next.done) break;
        bytes += next.value.byteLength; if (bytes > limit) fail('response_size'); parts.push(Buffer.from(next.value));
      }
      let data;
      try {data = JSON.parse(Buffer.concat(parts, bytes).toString('utf8'));} catch {fail('response_format');}
      if (!record(data) || data.errors !== undefined) fail('api_response');
      return {status: response.status, data};
    } catch (error) {
      if (error instanceof AmazonSpApiError) throw error;
      fail(controller.signal.aborted ? 'timeout' : 'network_or_response');
    } finally {
      clearTimeout(timer); controller.abort();
      if (reader) {try {await reader.cancel();} catch {} reader.releaseLock();}
      else if (response?.body) {try {await response.body.cancel();} catch {}}
    }
  }
  async function perform(url, options, operation, {limit = 8 * 1024 * 1024, authenticated = false} = {}) {
    let refreshed = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let result;
      const headers = {...options.headers};
      if (authenticated) {
        headers['x-amz-access-token'] = await token();
        headers['x-amz-date'] = new Date(now()).toISOString().replace(/[:-]|\.\d{3}/g, '');
        headers['user-agent'] = 'gravuru-2027-amazon/1.0 (Language=JavaScript; Platform=Node.js)';
      }
      try {
        result = await transport(url, {...options, headers}, operation, attempt, limit);
      } catch (error) {
        if (!(error instanceof AmazonSpApiError)) fail('network_or_response');
        if (!['timeout', 'network_or_response'].includes(error.code) || attempt + 1 >= maxAttempts) throw error;
        await sleep(Math.min(maxRetryDelayMs, retryDelay(null, attempt))); continue;
      }
      if (result.data) return result.data;
      if (authenticated && result.status === 401 && !refreshed && attempt + 1 < maxAttempts) {cached = null; refreshed = true; continue;}
      if (result.status !== 429 && ![500, 502, 503, 504].includes(result.status) || attempt + 1 >= maxAttempts) fail('http_' + result.status, {upstreamStatus: result.status});
      if (result.retryAfterMs > maxRetryDelayMs) fail('retry_later', {upstreamStatus: result.status, retryAfterMs: result.retryAfterMs});
      await sleep(result.retryAfterMs);
    }
    fail('retry_exhausted');
  }
  async function token() {
    if (cached && now() < cached.refreshAt) return cached.value;
    if (pending) return pending;
    pending = (async () => {
      const started = now(); let secret;
      try {secret = credentials(await readCredentials());} catch {fail('credentials_unavailable');}
      const result = await perform('https://api.amazon.com/auth/o2/token', {method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
        body: new URLSearchParams({grant_type: 'refresh_token', client_id: secret.clientId, client_secret: secret.clientSecret, refresh_token: secret.refreshToken}).toString()}, 'lwa', {limit: 32768});
      if (!TOKEN.test(result.access_token || '') || !Number.isInteger(result.expires_in) || result.expires_in < 60 || result.expires_in > 86400 ||
          result.token_type?.toLowerCase() !== 'bearer') fail('token_response');
      const refreshAt = started + result.expires_in * 1000 - Math.min(tokenSkewMs, result.expires_in * 500);
      if (now() >= refreshAt) fail('token_expired');
      cached = {value: result.access_token, refreshAt}; return cached.value;
    })();
    try {return await pending;} finally {pending = null;}
  }
  async function get(route, query, operation) {
    const url = new URL(route, origin);
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    return perform(url.href, {method: 'GET', headers: {Accept: 'application/json'}}, operation, {authenticated: true});
  }
  const safeOrderResponse = result => ({...result, orders: result.orders?.map(amazonOrderWithoutPii)});
  function seller() {if (!sellerId) fail('seller_id'); return sellerId;}
  return Object.freeze({
    diagnostics() {return {environment, region, ordersVersion: AMAZON_ORDERS_VERSION, productionReadsEnabled: environment === 'production',
      capabilities: Object.fromEntries(Object.keys(ROLES).map(key => [key, ROLES[key].some(r => roles.has(r))])), lastRequest};},
    async searchOrders(input = {}) {
      needRole('orders'); exactKeys(input, ['createdAfter', 'createdBefore', 'lastUpdatedAfter', 'lastUpdatedBefore', 'marketplaceIds', 'maxResultsPerPage', 'paginationToken', 'includedData', 'fulfillmentStatuses', 'fulfilledBy']);
      if (!!input.createdAfter === !!input.lastUpdatedAfter || input.createdAfter && input.lastUpdatedBefore || input.lastUpdatedAfter && input.createdBefore) fail('request_date_window');
      const afterKey = input.createdAfter ? 'createdAfter' : 'lastUpdatedAfter', beforeKey = input.createdAfter ? 'createdBefore' : 'lastUpdatedBefore';
      date(input[afterKey]);
      if (input[beforeKey] && (Date.parse(date(input[beforeKey])) < Date.parse(input[afterKey]) || Date.parse(input[beforeKey]) > now() - 120000)) fail('request_date_window');
      const max = input.maxResultsPerPage ?? 100; if (!Number.isInteger(max) || max < 1 || max > 100) fail('request_page_size');
      const result = await get('/orders/2026-01-01/orders', {...input, marketplaceIds: marketplaceQuery(input.marketplaceIds),
        maxResultsPerPage: max, paginationToken: input.paginationToken === undefined ? undefined : string(input.paginationToken, 8192),
        includedData: datasets(input.includedData).join(','),
        fulfillmentStatuses: input.fulfillmentStatuses && enums(input.fulfillmentStatuses, ['PENDING_AVAILABILITY', 'PENDING', 'UNSHIPPED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'CANCELLED', 'UNFULFILLABLE']).join(','),
        fulfilledBy: input.fulfilledBy && enums(input.fulfilledBy, ['MERCHANT', 'AMAZON']).join(',')}, 'searchOrders');
      if (!Array.isArray(result.orders)) fail('orders_response');
      return clean({orders: safeOrderResponse(result).orders, pagination: pick(result.pagination, ['nextToken']),
        createdBefore: result.createdBefore, lastUpdatedBefore: result.lastUpdatedBefore});
    },
    async getOrder(orderId, input = {}) {
      needRole('orders'); exactKeys(input, ['includedData']); if (!ORDER_ID.test(orderId)) fail('order_id');
      const result = await get('/orders/2026-01-01/orders/' + orderId, {includedData: datasets(input.includedData).join(',')}, 'getOrder');
      return amazonOrderWithoutPii(result.order ?? result);
    },
    async probeSandbox() {
      if (environment !== 'sandbox') fail('sandbox_only'); needRole('orders');
      // Official static fixture: synthetic PII datasets are required for matching.
      // Fixed sandbox host and order; response is projected before returning.
      const result = await get('/orders/2026-01-01/orders/171-9876543-2109876',
        {includedData: 'BUYER,RECIPIENT,PROCEEDS,EXPENSE,PROMOTION,CANCELLATION,FULFILLMENT,PACKAGES'}, 'probeSandbox');
      return {environment: 'sandbox', staticFixture: true, productionPermissionVerified: false, order: amazonOrderWithoutPii(result.order ?? result)};
    },
    async searchListingsItems(input = {}) {
      needRole('listings'); exactKeys(input, ['marketplaceIds', 'pageToken', 'pageSize', 'lastUpdatedAfter', 'lastUpdatedBefore']);
      const pageSize = input.pageSize ?? 20; if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20) fail('request_page_size');
      for (const key of ['lastUpdatedAfter', 'lastUpdatedBefore']) if (input[key]) date(input[key]);
      return get('/listings/2021-08-01/items/' + seller(), {...input, marketplaceIds: marketplaceQuery(input.marketplaceIds), pageSize,
        pageToken: input.pageToken === undefined ? undefined : string(input.pageToken, 8192),
        includedData: 'summaries,attributes,issues,offers,fulfillmentAvailability,relationships,productTypes'}, 'searchListingsItems');
    },
    async getListingsItem(sku, input = {}) {
      needRole('listings'); exactKeys(input, ['marketplaceIds']);
      return get('/listings/2021-08-01/items/' + seller() + '/' + skuSegment(sku),
        {marketplaceIds: marketplaceQuery(input.marketplaceIds), includedData: 'summaries,attributes,issues,offers,fulfillmentAvailability,relationships,productTypes'}, 'getListingsItem');
    },
    async getCatalogItem(asin, input = {}) {
      needRole('catalog'); exactKeys(input, ['marketplaceIds']); if (!ASIN.test(asin)) fail('asin');
      return get('/catalog/2022-04-01/items/' + asin, {marketplaceIds: marketplaceQuery(input.marketplaceIds), includedData: 'summaries,identifiers,attributes,relationships,images'}, 'getCatalogItem');
    },
    async listTransactions(input = {}) {
      needRole('finances'); exactKeys(input, ['postedAfter', 'postedBefore', 'marketplaceId', 'nextToken', 'orderId']);
      if (!input.orderId && !input.postedAfter || input.orderId && !ORDER_ID.test(input.orderId)) fail('request_parameters');
      for (const key of ['postedAfter', 'postedBefore']) if (input[key] && Date.parse(date(input[key])) > now() - 120000) fail('request_date_window');
      if (input.postedBefore && input.postedAfter && (Date.parse(input.postedBefore) <= Date.parse(input.postedAfter) || Date.parse(input.postedBefore) - Date.parse(input.postedAfter) > 180 * 86400000)) fail('request_date_window');
      if (input.marketplaceId !== undefined && !marketplaces.includes(input.marketplaceId)) fail('marketplace_ids');
      return get('/finances/2024-06-19/transactions', {postedAfter: input.postedAfter, postedBefore: input.postedBefore, marketplaceId: input.marketplaceId,
        nextToken: input.nextToken === undefined ? undefined : string(input.nextToken, 8192), relatedIdentifierName: input.orderId ? 'ORDER_ID' : undefined, relatedIdentifierValue: input.orderId}, 'listTransactions');
    },
    async estimateFees(sku, input = {}) {
      needRole('fees'); exactKeys(input, ['marketplaceId', 'priceCents', 'shippingCents', 'currency', 'isAmazonFulfilled']);
      // This POST computes a quote only. It never changes a price or an offer.
      if (!marketplaces.includes(input.marketplaceId) || !Number.isSafeInteger(input.priceCents) || input.priceCents < 0 ||
          input.shippingCents !== undefined && (!Number.isSafeInteger(input.shippingCents) || input.shippingCents < 0) ||
          !/^[A-Z]{3}$/.test(input.currency || '') || typeof input.isAmazonFulfilled !== 'boolean') fail('fees_parameters');
      const result = await perform(origin + '/products/fees/v0/listings/' + skuSegment(sku) + '/feesEstimate',
        {method: 'POST', headers: {Accept: 'application/json', 'Content-Type': 'application/json'}, body: JSON.stringify({FeesEstimateRequest: {
          MarketplaceId: input.marketplaceId, IsAmazonFulfilled: input.isAmazonFulfilled, Identifier: 'gravuru-estimate',
          PriceToEstimateFees: {ListingPrice: {CurrencyCode: input.currency, Amount: input.priceCents / 100},
            Shipping: {CurrencyCode: input.currency, Amount: (input.shippingCents ?? 0) / 100}}}})}, 'estimateFees', {authenticated: true});
      return result;
    }
  });
}
