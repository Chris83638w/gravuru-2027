import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createWorkshop } from './http.mjs';
import { build } from '../configurator/variant-m/build.mjs';
import { createPreviewServer } from '../configurator/variant-m/server.mjs';

async function setup(t, enabled) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-amazon-custom-http-'));
  build({ outputDirectory: dir }); const seed = JSON.parse(fs.readFileSync(path.join(dir, 'models.json'), 'utf8'))[0];
  const workshop = createWorkshop({ filename: ':memory:', seedConfig: seed.universal, legacy: seed.legacy, amazon: { allowTestImports: enabled } });
  const server = createPreviewServer({ outputDirectory: dir, workshop }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); workshop.close();
    const absolute = fs.realpathSync(dir), root = fs.realpathSync(os.tmpdir());
    assert.equal(path.dirname(absolute), root); assert.match(path.basename(absolute), /^g27-amazon-custom-http-/);
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  const { csrfToken } = await (await fetch(base + '/api/workshop/session')).json();
  const post = (data, token = csrfToken, headers = {}) => fetch(base + '/api/workshop/amazon/custom/inspect', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gravuru-csrf': token, ...headers }, body: JSON.stringify(data) });
  return { base, post, workshop };
}
const payload = () => ({ format: 'json', base64: Buffer.from('{"text":"PRIVATE-CONTENT","image":"https://test.invalid?secret=SECRET"}').toString('base64'), classification: 'synthetic', operatorApproved: true });

test('Custom endpoint is gated by explicit server test configuration and CSRF', async t => {
  const f = await setup(t, false);
  assert.equal((await f.post(payload())).status, 403);
  assert.equal((await f.post(payload(), '')).status, 403);
});

test('approved Custom samples return only inventory/hash/path metadata and persist no orders', async t => {
  const f = await setup(t, true);
  const r = await f.post(payload()); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
  const text = await r.text(), report = JSON.parse(text);
  assert.ok(!text.includes('PRIVATE-CONTENT')); assert.ok(!text.includes('SECRET'));
  assert.equal(report.valuesIncluded, false); assert.equal(report.productionReady, false);
  assert.ok(report.candidates.every(entry => !Object.hasOwn(entry, 'value')));
  assert.equal(f.workshop.amazonOrders.list().length, 0);
  const ui = await fetch(f.base + '/workshop-ui/amazon-custom-ui.mjs'); assert.equal(ui.status, 200);
  assert.match(await ui.text(), /initializeAmazonCustomUI/);
});

test('Custom endpoint rejects real/unapproved data, unknown fields, noncanonical base64, origin and body excess', async t => {
  const f = await setup(t, true);
  for (const patch of [{ classification: 'real' }, { operatorApproved: false }, { extra: 'unwanted' },
    { base64: 'e30' }, { base64: 'e31=' }, { base64: 'e30=\n' }, { base64: '====' }, { format: 'svg' }]) {
    assert.equal((await f.post({ ...payload(), ...patch })).status, 422);
  }
  assert.equal((await f.post(payload(), '')).status, 403);
  assert.equal((await f.post(payload(), undefined, { Origin: 'https://untrusted.invalid' })).status, 403);
  assert.equal((await f.post(payload(), undefined, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await f.post({ padding: 'x'.repeat(12 * 1024 * 1024) })).status, 413);
});
