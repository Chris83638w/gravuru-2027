import test from 'node:test';
import assert from 'node:assert/strict';
import {cartEditParams, loadCartRevision} from './cart-edit.mjs';

const konfig = 'konfig_' + '1'.repeat(8) + '-' + '1'.repeat(4) + '-' + '1'.repeat(4) + '-' + '1'.repeat(4) + '-' + '1'.repeat(12);
const storage = entries => {const map = new Map(Object.entries(entries)); return {get length() {return map.size;}, key: i => [...map.keys()][i], getItem: k => map.get(k) ?? null};};

test('edit link parameters are accepted only in their exact shape; the line is optional', () => {
  assert.deepEqual(cartEditParams('?config=' + konfig + '&rev=2&line=gid://shopify/CartLine/x?cart=y'), {configId: konfig, rev: 2, cartLineId: 'gid://shopify/CartLine/x?cart=y'});
  assert.deepEqual(cartEditParams('?config=' + konfig + '&rev=1'), {configId: konfig, rev: 1, cartLineId: null});
  assert.deepEqual(cartEditParams('?config=' + konfig + '&rev=1&line=' + encodeURIComponent('a\nb')), {configId: konfig, rev: 1, cartLineId: null});
  for (const search of ['', '?config=draft_x&rev=1', '?config=' + konfig, '?config=' + konfig + '&rev=0', '?config=' + konfig + '&rev=1.5', '?rev=1'])
    assert.equal(cartEditParams(search), null);
});

test('loading a revision tries only the private draft tokens of this tab and never puts them in the URL', async () => {
  const calls = [], good = 'b'.repeat(64);
  const request = async (url, options) => {calls.push([url, options.headers['X-Gravuru-Draft']]);
    return options.headers['X-Gravuru-Draft'] === good ? Response.json({configuration: {id: konfig, rev: 1}, hints: [], photos: []}) : Response.json({error: {message: 'nicht zugänglich'}}, {status: 404});};
  const store = storage({'gravuru-acrylic-private:["cfg","1","d"]': JSON.stringify({id: 'adraft_x', token: 'a'.repeat(64), revision: 1}),
    'gravuru-acrylic-private:["cfg","2","d"]': JSON.stringify({id: 'adraft_y', token: good, revision: 3}), other: 'ignored'});
  const loaded = await loadCartRevision({request, storage: store, params: {configId: konfig, rev: 1, cartLineId: null}});
  assert.equal(loaded.token, good); assert.equal(calls.length, 2);
  for (const [url] of calls) {assert.equal(url, '/api/workshop/cart-configurations/' + konfig + '/1'); assert.ok(!url.includes(good));}
  await assert.rejects(loadCartRevision({request, storage: storage({}), params: {configId: konfig, rev: 1, cartLineId: null}}), /nicht mehr zugänglich/);
  await assert.rejects(loadCartRevision({request, storage: storage({'gravuru-acrylic-private:x': JSON.stringify({token: 'c'.repeat(64)})}), params: {configId: konfig, rev: 1, cartLineId: null}}), /nicht mehr zugänglich/);
  const failing = async () => Response.json({error: {message: 'Formprodukt'}}, {status: 409});
  await assert.rejects(loadCartRevision({request: failing, storage: store, params: {configId: konfig, rev: 1, cartLineId: null}}), /Formprodukt/);
});
