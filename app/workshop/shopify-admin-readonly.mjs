import {SHOPIFY_IDENTITY} from './shopify-runtime-config.mjs';

export const ADMIN_READONLY_IDENTITY = Object.freeze({...SHOPIFY_IDENTITY,
  appId: 'gid://shopify/App/423276544001', apiVersion: '2026-07'});
const fields = `shop { myshopifyDomain currencyCode plan { partnerDevelopment } }
  currentAppInstallation { app { id } accessScopes { handle } }`;
const installationQuery = `query GravuruInstallationPreflight { ${fields} }`;
const variantsQuery = `query GravuruVariantPreflight($ids: [ID!]!) { ${fields}
  nodes(ids: $ids) { ... on ProductVariant { id price selectedOptions { name value } product { id status } } } }`;
const variantId = /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const productId = /^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/;
class ReadonlyError extends Error {}
export const preflightFailure = code => Object.assign(new ReadonlyError('Shopify-Vorprüfung nicht bestätigt: ' + code), {code, status: 502});
const fail = code => {throw preflightFailure(code);};
const tokenPattern = /^[\x21-\x7e]{16,4096}$/;

// Only two fixed GraphQL queries are exposed. No arbitrary query, mutation,
// access token getter, redirect, persistence or automatic HTTP retry.
export function createShopifyAdminReadonly({readSecret}, {fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 20000} = {}) {
  if (typeof readSecret !== 'function' || typeof fetchImpl !== 'function' || typeof now !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail('configuration');
  const {shopDomain, clientId, appId, apiVersion} = ADMIN_READONLY_IDENTITY;
  let cached = null, pending = null;
  async function request(url, options, {limit, version = false}) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs); let reader;
    try {
      const response = await fetchImpl(url, {...options, redirect: 'error', cache: 'no-store', signal: controller.signal});
      if (!response.ok || response.redirected) fail('http_' + response.status);
      if (version && response.headers.get('x-shopify-api-version') !== apiVersion) fail('api_version');
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '') || !response.body) fail('response_format');
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) fail('response_size');
      reader = response.body.getReader(); let size = 0; const chunks = [];
      for (;;) {
        const {done, value} = await reader.read();
        if (controller.signal.aborted) fail('timeout');
        if (done) break;
        size += value.byteLength; if (size > limit) fail('response_size'); chunks.push(Buffer.from(value));
      }
      return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
    } catch (error) {
      if (error instanceof ReadonlyError) throw error;
      fail(controller.signal.aborted ? 'timeout' : 'network_or_response');
    } finally {
      clearTimeout(timer); controller.abort(); if (reader) {try {await reader.cancel();} catch {} reader.releaseLock();}
    }
  }
  async function token() {
    if (cached && now() < cached.refreshAt) return cached.value;
    if (pending) return pending;
    pending = (async () => {
      const started = now(); let secret;
      try {secret = await readSecret();} catch {fail('secret_file');}
      if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(secret)) fail('secret_format');
      const value = await request(`https://${shopDomain}/admin/oauth/access_token`, {method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
        body: new URLSearchParams({grant_type: 'client_credentials', client_id: clientId, client_secret: secret}).toString()}, {limit: 65536});
      if (!tokenPattern.test(value?.access_token || '') || !Number.isInteger(value.expires_in) || value.expires_in < 120 || value.expires_in > 86400 || typeof value.scope !== 'string') fail('token_response');
      const refreshAt = started + value.expires_in * 1000 - 60000;
      if (now() >= refreshAt) fail('token_expired');
      cached = {value: value.access_token, refreshAt}; return cached.value;
    })();
    try {return await pending;} finally {pending = null;}
  }
  async function execute(query, variables) {
    const accessToken = await token(); let result;
    try {
      result = await request(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': accessToken},
        body: JSON.stringify({query, variables})}, {limit: 1048576, version: true});
    } catch (error) {cached = null; throw error;}
    if (!result?.data || result.errors !== undefined && (!Array.isArray(result.errors) || result.errors.length)) fail('graphql');
    const {shop, currentAppInstallation: installation} = result.data;
    if (shop?.myshopifyDomain !== shopDomain || installation?.app?.id !== appId || !Array.isArray(installation.accessScopes) || installation.accessScopes.some(s => typeof s?.handle !== 'string' || !/^[a-z_]+$/.test(s.handle)) || typeof shop.plan?.partnerDevelopment !== 'boolean' || !/^[A-Z]{3}$/.test(shop.currencyCode || '')) {cached = null; fail('installation_identity');}
    return {data: result.data, installation: {shopDomain, appId, apiVersion, currency: shop.currencyCode,
      partnerDevelopment: shop.plan.partnerDevelopment, scopes: [...new Set(installation.accessScopes.map(s => s.handle))].sort(),
      scope: 'admin-readonly', merchantLoginVerified: false, customerLoginVerified: false, safeCheckoutVerified: false}};
  }
  return Object.freeze({
    async checkInstallation() {return (await execute(installationQuery, {})).installation;},
    async inspectVariants(ids) {
      if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || !variantId.test(id)) || new Set(ids).size !== ids.length) fail('variant_ids');
      const requested = [...ids], {data, installation} = await execute(variantsQuery, {ids: requested});
      if (!installation.scopes.some(s => s === 'read_products' || s === 'write_products')) fail('products_scope');
      if (!Array.isArray(data.nodes) || data.nodes.length !== requested.length) fail('variant_response');
      const variants = data.nodes.map((v, index) => {
        if (v === null) return {id: requested[index], found: false};
        const money = typeof v?.price === 'string' && v.price.match(/^(\d+)\.(\d{1,2})$/);
        const priceCents = money ? Number(money[1]) * 100 + Number(money[2].padEnd(2, '0')) : NaN;
        if (v?.id !== requested[index] || !productId.test(v.product?.id || '') || !['ACTIVE', 'DRAFT', 'ARCHIVED', 'UNLISTED'].includes(v.product.status) || !Number.isSafeInteger(priceCents) || priceCents < 0 || !Array.isArray(v.selectedOptions) || !v.selectedOptions.length || v.selectedOptions.length > 3 || v.selectedOptions.some(o => typeof o?.name !== 'string' || typeof o.value !== 'string' || !o.name || !o.value || o.name.length > 255 || o.value.length > 255) || new Set(v.selectedOptions.map(o => o.name)).size !== v.selectedOptions.length) fail('variant_response');
        return {id: v.id, found: true, productId: v.product.id, status: v.product.status, priceCents,
          options: v.selectedOptions.map(o => ({name: o.name, value: o.value}))};
      });
      return {installation, variants};
    }
  });
}
