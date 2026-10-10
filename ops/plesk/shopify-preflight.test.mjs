import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readPrivateFile, runPreflight} from './shopify-preflight.mjs';
const source = new URL('./shopify-preflight.mjs', import.meta.url);
function fixture(t) {const root = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-preflight-file-')); t.after(() => fs.rmSync(root, {recursive: true, force: true})); return root;}
test('private existing secret is read without rewriting or exposing metadata/content in errors', t => {
  const root = fixture(t), file = path.join(root, 'secret'); fs.writeFileSync(file, 'synthetic_private_content', {mode: 0o600});
  const before = fs.statSync(file); assert.equal(readPrivateFile(file), 'synthetic_private_content');
  assert.equal(fs.statSync(file).mtimeMs, before.mtimeMs);
  const bytes=Buffer.from([0,128,255,65]);fs.writeFileSync(file,bytes);assert.deepEqual(readPrivateFile(file,1024,null),bytes);
  fs.chmodSync(file, 0o644); assert.throws(() => readPrivateFile(file), e => e.code === 'private_file' && !String(e).includes(root));
});
test('symlink, symlink parent, Git content and oversized files are rejected', t => {
  const root = fixture(t), dir = path.join(root, 'private'); fs.mkdirSync(dir); const file = path.join(dir, 'secret'); fs.writeFileSync(file, 'synthetic_private_content', {mode: 0o600});
  fs.symlinkSync(file, path.join(root, 'link')); fs.symlinkSync(dir, path.join(root, 'linkdir'));
  for (const value of [path.join(root, 'link'), path.join(root, 'linkdir', 'secret'), root, './secret']) assert.throws(() => readPrivateFile(value), {code: 'private_file'});
  fs.writeFileSync(path.join(dir, '.git'), 'synthetic marker'); assert.throws(() => readPrivateFile(file), {code: 'private_file'}); fs.unlinkSync(path.join(dir, '.git'));
  fs.writeFileSync(file, 'x'.repeat(1025)); assert.throws(() => readPrivateFile(file), {code: 'private_file'});
});
test('invalid invocation and private request fail closed with sanitized CLI result and no network', async t => {
  const root = fixture(t), file = path.join(root, 'secret'); fs.writeFileSync(file, 'synthetic_private_content', {mode: 0o600});
  await assert.rejects(runPreflight(['--secret', 'synthetic_private_content']), {code: 'arguments'});
  const bad = path.join(root, 'request'); fs.writeFileSync(bad, '{synthetic_private_content', {mode: 0o600});
  const result = spawnSync(process.execPath, [source.pathname, '--secret-file', file, '--binding-request', bad], {encoding: 'utf8'});
  assert.equal(result.status, 1); assert.equal(result.stderr, ''); assert.ok(!result.stdout.includes('synthetic_private_content')); assert.ok(!result.stdout.includes(root));
  assert.deepEqual(JSON.parse(result.stdout), {ok: false, code: 'binding_file', bindingSaved: false, checkoutReady: false});
});
