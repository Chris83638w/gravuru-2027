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
test('401 read renews once with a different token and preserves target and options',async()=>{
 let count=0;const seen=[];const request=createMerchantRequest({bridge:()=>({idToken:async()=>++count===1?'old':'fresh'}),fetchImpl:async(path,o)=>{seen.push([path,o.headers.get('Authorization')]);return seen.length===1?new Response(null,{status:401}):Response.json({ok:true});}});
 assert.equal((await request('/api/workshop/products')).status,200);assert.deepEqual(seen,[['/api/workshop/products','Bearer old'],['/api/workshop/products','Bearer fresh']]);
});
test('unchanged tokens, failed renewal, writes and network errors are never automatically replayed',async()=>{
 for(const mode of ['same','failed','write','network']){
  let calls=0,tokens=0;const request=createMerchantRequest({bridge:()=>({idToken:async()=>{tokens++;if(mode==='failed'&&tokens>1)throw Error();return mode==='write'?'new-'+tokens:'same';}}),fetchImpl:async()=>{calls++;if(mode==='network')throw Error('network');return new Response(null,{status:401});}});
  await assert.rejects(request('/api/workshop/products',{method:mode==='write'?'POST':'GET',body:mode==='write'?'{}':undefined}));assert.equal(calls,1);
 }
});
test('two rejected reads stop with actionable authentication error, never a JSON parse error',async()=>{
 let calls=0,tokens=0;const request=createMerchantRequest({bridge:()=>({idToken:async()=>String(++tokens)}),fetchImpl:async()=>{calls++;return new Response(null,{status:401});}});
 await assert.rejects(request('/api/workshop/session'),e=>e.status===401&&e.message.includes('Verbindung prüfen'));assert.equal(calls,2);
});
