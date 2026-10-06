import test from 'node:test';
import assert from 'node:assert/strict';
import {createAcrylicDraftClient} from './acrylic-draft-client.mjs';

const input = {productId: 'cfg_fixture', productRevision: 2, designId: 'design_fixture', media: ['synthetic-photo-data']};
const token = 'a'.repeat(64), id = 'adraft_abcdef-1234';
const storage = () => {const data = new Map(); return {data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};};
test('first save creates private access; a new client in the same tab uses the saved revision and token header', async () => {
  const s = storage(), calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({url, options}); const revision = calls.length;
    return Response.json({id, ...(revision === 1 ? {token} : {}), revision, snapshotId: 'proof_' + revision});
  };
  const first = await createAcrylicDraftClient({storage: s, fetchImpl})(input, 'csrf');
  assert.equal(first.id, 'proof_1'); assert.equal(first.revision, 1); assert.ok(!('token' in first));
  const second = await createAcrylicDraftClient({storage: s, fetchImpl})(input, 'csrf');
  assert.equal(second.revision, 2); assert.equal(calls[0].url, '/api/workshop/acrylic-drafts');
  assert.equal(calls[1].url, '/api/workshop/acrylic-drafts/' + id);
  assert.equal(calls[1].options.headers['X-Gravuru-Draft'], token);
  assert.equal(JSON.parse(calls[1].options.body).expectedRevision, 1);
  assert.ok(!calls[1].url.includes(token)); assert.ok(!calls[1].options.body.includes(token));
  assert.ok(!JSON.stringify([...s.data]).includes('synthetic-photo-data'));
});
test('designs and pinned product revisions have separate access records', async () => {
  const s = storage(), paths = [], save = createAcrylicDraftClient({storage: s, fetchImpl: async url => {
    paths.push(url); return Response.json({id, token, revision: 1, snapshotId: 'proof_1'});
  }});
  await save(input, 'csrf'); await save({...input, designId: 'other'}, 'csrf'); await save({...input, productRevision: 3}, 'csrf');
  assert.equal(s.data.size, 3); assert.ok(paths.every(p => p === '/api/workshop/acrylic-drafts'));
});
test('a revision conflict keeps the known access and never retries automatically', async () => {
  const s = storage(); let calls = 0;
  const save = createAcrylicDraftClient({storage: s, fetchImpl: async () => {
    calls++; return calls === 1 ? Response.json({id, token, revision: 1, snapshotId: 'proof_1'}) :
      Response.json({error: {message: 'Entwurf inzwischen geändert.'}}, {status: 409});
  }});
  await save(input, 'csrf'); const before = [...s.data];
  await assert.rejects(save(input, 'csrf'), /inzwischen geändert/); assert.equal(calls, 2); assert.deepEqual([...s.data], before);
});
test('disabled storage blocks initial transfer; loss of storage after a save retains access in this page', async () => {
  let calls = 0;
  await assert.rejects(createAcrylicDraftClient({storage: {getItem() {throw Error('disabled');}}, fetchImpl() {calls++;}})(input, 'csrf'), /Browserspeicher/);
  assert.equal(calls, 0);
  const s = storage(), set = s.setItem; let writes = 0;
  s.setItem = (key, value) => {if (++writes > 1) throw Error('quota'); set(key, value);};
  const save = createAcrylicDraftClient({storage: s, fetchImpl: async (url, options) => {
    calls++; if (calls === 2) {assert.equal(url, '/api/workshop/acrylic-drafts/' + id); assert.equal(options.headers['X-Gravuru-Draft'], token);}
    return Response.json({id, ...(calls === 1 ? {token} : {}), revision: calls, snapshotId: 'proof_' + calls});
  }});
  assert.equal((await save(input, 'csrf')).accessStored, false); assert.equal((await save(input, 'csrf')).revision, 2);
});
test('malformed stored access and a mismatching server identity are rejected', async () => {
  const s = storage(); let calls = 0;
  const fetchImpl = async () => {calls++; return Response.json({id: calls === 1 ? id : 'adraft_bad', token, revision: calls, snapshotId: 'proof_' + calls});};
  const save = createAcrylicDraftClient({storage: s, fetchImpl}); await save(input, 'csrf');
  const before = [...s.data]; await assert.rejects(save(input, 'csrf'), /nicht vollständig/); assert.deepEqual([...s.data], before);
  s.setItem(before[0][0], JSON.stringify({id, token: 'wrong', revision: 1}));
  await assert.rejects(createAcrylicDraftClient({storage: s, fetchImpl})(input, 'csrf'), /ungültig/); assert.equal(calls, 2);
});
