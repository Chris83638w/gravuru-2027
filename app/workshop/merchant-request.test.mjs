import test from 'node:test';
import assert from 'node:assert/strict';
import {createMerchantRequest} from './ui/merchant-request.mjs';
test('merchant requests obtain a fresh token for each API call and preserve CSRF/body without redirects', async () => {
  let count = 0; const calls = [], request = createMerchantRequest({bridge: () => ({idToken: async () => 'fixture-' + (++count)}), fetchImpl: async (path, options) => {calls.push({path, options}); return Response.json({});}});
  await request('/api/workshop/session'); await request('/api/workshop/orders/orderline_123/file-grants', {method: 'POST', headers: {'X-Gravuru-CSRF': 'fixture-csrf', Authorization: 'untrusted'}, body: '{}', redirect: 'follow'});
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer fixture-1'); assert.equal(calls[1].options.headers.get('Authorization'), 'Bearer fixture-2');
  assert.equal(calls[1].options.headers.get('X-Gravuru-CSRF'), 'fixture-csrf'); assert.equal(calls[1].options.body, '{}'); assert.equal(calls[1].options.redirect, 'error');
});
test('tokens cannot be sent to foreign URLs, traversed paths, or after provider failure', async () => {
  let calls = 0, tokens = 0; const request = createMerchantRequest({bridge: () => ({idToken: () => {tokens++; throw Error('private-provider-detail');}}), fetchImpl: () => {calls++;}});
  for (const path of ['https://foreign.invalid/api/workshop/orders', '//foreign.invalid/', '/api/workshop/../other', '/api/workshop/%2e%2e/other', '/api/workshop/%2fother']) await assert.rejects(request(path), /Werkstattziel/);
  assert.equal(tokens, 0); await assert.rejects(request('/api/workshop/orders'), /bitte erneuern/); assert.equal(calls, 0);
});
test('plain loopback preview works without App Bridge and cannot inject a bearer header', async () => {
  const request = createMerchantRequest({bridge: () => undefined, fetchImpl: async (_, options) => {assert.equal(options.headers.has('Authorization'), false); return Response.json({});}});
  await request('/api/workshop/session', {headers: {Authorization: 'untrusted'}});
});
