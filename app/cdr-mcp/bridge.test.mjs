// Synthetic transfer fixtures; no company source or real design claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { loadConfig, createCdrServer } from './server.mjs';
import { sourceStatus, snapshotSource } from './source.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const DATA = Buffer.from('RIFF0000CDRA-synthetic-only');
const TOKEN = 'U'.repeat(48), MCP = 'M'.repeat(48);
const REL = 'Türschilder/7x2/[CDR]/test.cdr';
const NOW = '2026-10-22T12:00:00.000Z';

async function setup(t, options = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cdr-bridge-test-'));
  const root = path.join(tmp, 'copies');
  const tokenfile = path.join(tmp, 'upload-token');
  await fs.mkdir(root, { mode: 0o700 });
  await fs.writeFile(tokenfile, TOKEN, { mode: 0o600 });
  const env = { CDR_MCP_TOKEN: MCP, CDR_MCP_DATA: path.join(tmp, 'work'), CDR_MCP_SOURCE_ROOT: root,
    CDR_MCP_BRIDGE_ENABLED: '1', CDR_MCP_BRIDGE_ROOT: root, CDR_MCP_BRIDGE_TOKEN_FILE: tokenfile,
    CDR_MCP_MAX_MB: '1', CDR_MCP_QUIET: '1', ...options };
  const cfg = loadConfig([], env), server = createCdrServer(cfg);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(r => server.close(r)); await fs.rm(tmp, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${server.address().port}/bridge/v1/file`;
  const request = (method = 'PUT', body = DATA, headers = {}) => fetch(url, {
    method, headers: { authorization: 'Bearer ' + TOKEN, 'x-cdr-path': encodeURIComponent(REL),
      ...(method === 'PUT' ? { 'content-type': 'application/octet-stream', 'x-cdr-sha256': hash(body), 'x-cdr-modified': NOW } : {}), ...headers },
    ...(method === 'PUT' ? { body } : {})
  });
  return { tmp, root, cfg, env, tokenfile, request };
}

test('Bridge: verified upload, unchanged HEAD, MCP copy metadata and atomic replacement', async t => {
  const { root, cfg, request } = await setup(t);
  assert.equal((await request('HEAD')).status, 404);
  const first = await request();
  assert.equal(first.status, 200, await first.clone().text());
  const receipt = await first.json();
  assert.equal(receipt.sha256, hash(DATA));
  assert.equal(receipt.sourceModified, NOW);
  assert.deepEqual(await fs.readFile(path.join(root, REL)), DATA);
  assert.equal((await fs.stat(path.join(root, REL))).mode & 0o777, 0o600);
  const head = await request('HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('x-cdr-sha256'), hash(DATA));
  assert.equal((await sourceStatus(cfg)).quelle, 'übertragene Kopien');
  const copy = await snapshotSource(cfg, 'V:\\Produkte\\' + REL.replaceAll('/', '\\'));
  assert.equal(copy.source.geaendert, NOW);
  assert.equal(copy.source.empfangen, receipt.receivedAt);
  await fs.rm(copy.file);
  const changed = Buffer.concat([DATA, Buffer.from('-changed')]);
  assert.equal((await request('PUT', changed)).status, 200);
  assert.deepEqual(await fs.readFile(path.join(root, REL)), changed);
  assert.equal((await request('HEAD')).headers.get('x-cdr-sha256'), hash(changed));
  assert.equal((await fs.readdir(root)).some(n => n.startsWith('.')), false);
});

test('Bridge: disabled endpoint, separate credential, strict Bearer, method and origin', async t => {
  const { request } = await setup(t);
  for (const authorization of ['', TOKEN, 'Bearer ' + MCP, 'Bearer wrong']) assert.equal((await request('HEAD', DATA, { authorization })).status, 401);
  assert.equal((await request('HEAD', DATA, { origin: 'https://example.org' })).status, 403);
  assert.equal((await request('GET')).status, 405);
  const disabled = await setup(t, { CDR_MCP_BRIDGE_ENABLED: '0' });
  assert.equal((await disabled.request()).status, 404);
});

test('Bridge: failed hash/signature/size leaves previous confirmed copy intact', async t => {
  const { request, root } = await setup(t);
  await request();
  assert.equal((await request('PUT', DATA, { 'x-cdr-sha256': '0'.repeat(64) })).status, 422);
  assert.equal((await request('PUT', Buffer.alloc(24))).status, 415);
  assert.equal((await request('PUT', Buffer.alloc(1024 * 1024 + 1))).status, 413);
  assert.equal((await request('PUT', DATA, { 'x-cdr-modified': 'unknown' })).status, 400);
  assert.deepEqual(await fs.readFile(path.join(root, REL)), DATA);
  assert.equal((await request('HEAD')).status, 200);
  assert.equal((await fs.readdir(root)).some(n => n.startsWith('.')), false);
});

test('Bridge: traversal, Windows paths, symlink parents and quota fail closed', async t => {
  const { request, root, tmp } = await setup(t);
  for (const p of ['../x.cdr', '/x.cdr', 'C:\\x.cdr', 'a//x.cdr', '.secret/x.cdr', 'x.txt', 'a/../x.cdr', 'x.cdr:stream', 'x\u0000.cdr'])
    assert.equal((await request('PUT', DATA, { 'x-cdr-path': encodeURIComponent(p) })).status, 400, p);
  await fs.symlink(tmp, path.join(root, 'escape'));
  assert.equal((await request('HEAD', DATA, { 'x-cdr-path': encodeURIComponent('escape/test.cdr') })).status, 400);
  assert.equal((await request()).status, 503);
  await fs.rm(path.join(root, 'escape'));
  const limited = await setup(t, { CDR_MCP_BRIDGE_MAX_MB: '0.001953125' });
  assert.equal((await limited.request()).status, 507);
});

test('Bridge: locks prevent overlapping uploads and unmatched receipts prevent stale claims', async t => {
  const { request, root, cfg } = await setup(t);
  await fs.writeFile(path.join(root, '.bridge-upload.lock'), 'test');
  assert.equal((await request()).status, 409);
  assert.equal(await fs.readFile(path.join(root, '.bridge-upload.lock'), 'utf8'), 'test');
  await fs.rm(path.join(root, '.bridge-upload.lock'));
  await request();
  await fs.rm(path.join(root, REL) + '.source.json');
  assert.equal((await request('HEAD')).status, 409);
  await assert.rejects(snapshotSource(cfg, REL), /Übertragungsbestätigung/);
  assert.equal((await request()).status, 200);
  await fs.writeFile(path.join(root, REL) + '.source.json', '{}');
  assert.equal((await request('HEAD')).status, 409);
  assert.deepEqual(await fs.readdir(path.join(cfg.data, 'in')), []);
});

test('Bridge: enabling requires private copy directory and distinct private credential', async t => {
  const { env, root, tokenfile } = await setup(t);
  await fs.chmod(root, 0o755);
  assert.throws(() => loadConfig([], env), /0700/);
  await fs.chmod(root, 0o700);
  await fs.chmod(tokenfile, 0o644);
  assert.throws(() => loadConfig([], env), /0600/);
  await fs.chmod(tokenfile, 0o600);
  await fs.writeFile(tokenfile, MCP);
  assert.throws(() => loadConfig([], env), /separates/);
});
