import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopifyAdminReadonly, ADMIN_READONLY_IDENTITY as identity} from './shopify-admin-readonly.mjs';
const secret = 'synthetic_secret_do_not_log', accessToken = 'synthetic_access_token_do_not_log';
const data = () => ({shop: {myshopifyDomain: identity.shopDomain, currencyCode: 'EUR', plan: {partnerDevelopment: false}},
  currentAppInstallation: {app: {id: identity.appId}, accessScopes: [{handle: 'read_products'}]}});
const v = () => ({id: 'gid://shopify/ProductVariant/301', price: '14.99', selectedOptions: [{name: 'Ausführung', value: 'Standard'}], product: {id: 'gid://shopify/Product/9', status: 'DRAFT'}});
function fixture({respond, tokenRespond, timeoutMs = 500} = {}) {
  let time = 0, tokens = 0; const requests = [];
  const client = createShopifyAdminReadonly({readSecret: () => secret}, {now: () => time, timeoutMs, fetchImpl: async (url, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.match(url, /^https:\/\/gravuru-design\.myshopify\.com\//);
    if (url.endsWith('/access_token')) {tokens++; assert.equal(new URLSearchParams(options.body).get('client_secret'), secret);
      return tokenRespond ? tokenRespond(options) : Response.json({access_token: accessToken, expires_in: 3600, scope: 'read_products'});}
    assert.equal(options.headers['X-Shopify-Access-Token'], accessToken);
    const request = JSON.parse(options.body); requests.push(request); assert.match(request.query, /^query Gravuru/); assert.doesNotMatch(request.query, /mutation/);
    return respond ? respond(request, options) : Response.json({data: {...data(), ...(request.variables.ids ? {nodes: [v()]} : {})}}, {headers: {'x-shopify-api-version': '2026-07'}});
  }});
  return {client, requests, get tokens() {return tokens;}, advance: n => {time += n;}};
}
test('fixed read-only installation confirms own app, preserves limits and never exposes a token', async () => {
  const f = fixture(), result = await f.client.checkInstallation();
  assert.equal(result.appId, identity.appId); assert.equal(result.safeCheckoutVerified, false); assert.equal(result.partnerDevelopment, false);
  assert.deepEqual(result.scopes, ['read_products']); assert.deepEqual(Object.keys(f.client), ['checkInstallation', 'inspectProductPricing', 'inspectVariants']);
  assert.ok(!JSON.stringify(result).includes(accessToken)); assert.ok(!JSON.stringify(result).includes(secret));
});
test('pricing read uses the owning app namespace and preserves explicit absent pricing without authorizing checkout',async()=>{
  for(const product of [null,{id:'gid://shopify/Product/9',status:'ACTIVE',onlineStoreUrl:null,pricing:null},
    {id:'gid://shopify/Product/9',status:'ACTIVE',onlineStoreUrl:'https://gravuru-design.myshopify.com/products/synthetic',pricing:{jsonValue:{schema:'gravuru-personalization-pricing/v1',revision:30}}}]){
    const f=fixture({respond:request=>{
      assert.equal(request.variables.id,'gid://shopify/Product/9');assert.match(request.query,/namespace: "\$app"/);
      return Response.json({data:{...data(),product}},{headers:{'x-shopify-api-version':'2026-07'}});
    }});
    const result=await f.client.inspectProductPricing('gid://shopify/Product/9');
    assert.equal(result.installation.safeCheckoutVerified,false);
    assert.equal(result.product?.pricing?.revision,product?.pricing?.jsonValue?.revision);
    assert.equal(result.product?.publishedToOnlineStore,product===null?undefined:product.onlineStoreUrl!==null);
  }
});
test('pricing read rejects wrong identity, malformed product, missing scopes and IDs without leaking credentials',async()=>{
  const empty=fixture();await assert.rejects(empty.client.inspectProductPricing('9'),{code:'product_id'});assert.equal(empty.tokens,0);
  for(const patch of [d=>d.product.id='gid://shopify/Product/10',d=>delete d.product.pricing,d=>d.product.onlineStoreUrl=3,d=>d.product.status='unknown',d=>d.currentAppInstallation.accessScopes=[]]){
    const f=fixture({respond:()=>{const d={...data(),product:{id:'gid://shopify/Product/9',status:'ACTIVE',onlineStoreUrl:null,pricing:null}};patch(d);return Response.json({data:d},{headers:{'x-shopify-api-version':'2026-07'}});}});
    await assert.rejects(f.client.inspectProductPricing('gid://shopify/Product/9'),e=>['product_response','products_scope'].includes(e.code)&&!String(e).includes(accessToken));
  }
});
test('concurrent calls share token exchange and renew before expiry', async () => {
  const f = fixture(); await Promise.all(Array.from({length: 5}, () => f.client.checkInstallation())); assert.equal(f.tokens, 1);
  f.advance(3539000); await f.client.checkInstallation(); assert.equal(f.tokens, 1);
  f.advance(1000); await f.client.checkInstallation(); assert.equal(f.tokens, 2);
});
test('exact requested variants retain whole-cent prices and no catalogue titles', async () => {
  const f = fixture(), result = await f.client.inspectVariants([v().id]);
  assert.equal(result.variants[0].priceCents, 1499); assert.equal(result.variants[0].productId, v().product.id);
  assert.equal('title' in result.variants[0], false); assert.deepEqual(f.requests[0].variables.ids, [v().id]);
});
test('invalid and duplicate IDs fail before any credentials or request', async () => {
  const f = fixture(); for (const ids of [[], [v().id, v().id], ['301'], ['https://other.invalid'], Array(101).fill(v().id)]) await assert.rejects(f.client.inspectVariants(ids), {code: 'variant_ids'});
  assert.equal(f.tokens, 0); assert.equal(f.requests.length, 0);
});
for (const [name, patch] of [
  ['wrong_shop', d => {d.shop.myshopifyDomain = 'other.myshopify.com';}],
  ['wrong_app', d => {d.currentAppInstallation.app.id = 'gid://shopify/App/1';}],
  ['unknown_development', d => {delete d.shop.plan.partnerDevelopment;}]
]) test(name + ' cannot report an authenticated installation', async () => {
  const f = fixture({respond: () => {const d = data(); patch(d); return Response.json({data: d}, {headers: {'x-shopify-api-version': '2026-07'}});}});
  await assert.rejects(f.client.checkInstallation(), {code: 'installation_identity'});
});
for (const [name, respond, code] of [
  ['redirect', () => new Response(null, {status: 302, headers: {location: 'https://other.invalid'}}), 'http_302'],
  ['denied', () => Response.json({error: secret}, {status: 401}), 'http_401'],
  ['version', () => Response.json({data: data()}, {headers: {'x-shopify-api-version': '2026-10'}}), 'api_version'],
  ['graphql', () => Response.json({data: data(), errors: [{message: secret}]}, {headers: {'x-shopify-api-version': '2026-07'}}), 'graphql'],
  ['oversized', () => new Response('x'.repeat(1048577), {headers: {'content-type': 'application/json', 'x-shopify-api-version': '2026-07'}}), 'response_size'],
  ['network', () => {throw Error(secret + accessToken);}, 'network_or_response'],
]) test(name + ' is redacted and never automatically retried', async () => {
  const f = fixture({respond}); await assert.rejects(f.client.checkInstallation(), e => e.code === code && !String(e).includes(secret) && !String(e).includes(accessToken));
  assert.equal(f.requests.length, 1); assert.equal(f.tokens, 1);
});
test('token errors and invalid expiry never reach GraphQL or leak response details', async () => {
  for (const tokenRespond of [() => Response.json({error: secret}, {status: 403}), () => Response.json({access_token: accessToken, expires_in: 10, scope: 'read_products'})]) {
    const f = fixture({tokenRespond}); await assert.rejects(f.client.checkInstallation(), e => !String(e).includes(secret) && !String(e).includes(accessToken)); assert.equal(f.requests.length, 0);
  }
});
test('timeout aborts request without exposing transport details', async () => {
  const f = fixture({timeoutMs: 10, respond: (_req, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error(secret))))});
  await assert.rejects(f.client.checkInstallation(), {code: 'timeout'}); assert.equal(f.requests.length, 1);
});
for (const [name, change] of [
  ['wrong variant', n => {n[0].id = 'gid://shopify/ProductVariant/999';}],
  ['float money', n => {n[0].price = 14.99;}], ['fraction cent', n => {n[0].price = '14.999';}],
  ['unsafe integer', n => {n[0].price = '9007199254740992.00';}],
  ['duplicates', n => {n[0].selectedOptions.push(n[0].selectedOptions[0]);}]
]) test(name + ' fails response verification', async () => {
  const f = fixture({respond: () => {const nodes = [v()]; change(nodes); return Response.json({data: {...data(), nodes}}, {headers: {'x-shopify-api-version': '2026-07'}});}});
  await assert.rejects(f.client.inspectVariants([v().id]), {code: 'variant_response'});
});
test('missing variant remains missing instead of fabricated successful mapping', async () => {
  const f = fixture({respond: () => Response.json({data: {...data(), nodes: [null]}}, {headers: {'x-shopify-api-version': '2026-07'}})});
  assert.deepEqual((await f.client.inspectVariants([v().id])).variants, [{id: v().id, found: false}]);
});
