import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {validateDataDirectory} from './start.mjs';

function fixture(t, {products = 1} = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gravuru-runtime-guard-'));
  fs.chmodSync(directory, 0o700);
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  for (const name of ['workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite']) {
    const db = new DatabaseSync(path.join(directory, name));
    db.exec('CREATE TABLE products (id INTEGER PRIMARY KEY)');
    if (name === 'workshop.sqlite' && products) db.exec('INSERT INTO products VALUES (1)');
    db.close();
    fs.chmodSync(path.join(directory, name), 0o600);
  }
  return directory;
}

test('requires an explicit absolute state directory', () => {
  assert.throws(() => validateDataDirectory(undefined));
  assert.throws(() => validateDataDirectory('.local-data'));
});

test('rejects state inside the source checkout', () => {
  assert.throws(() => validateDataDirectory(path.resolve('infra/private-runtime')), /outside the repository/);
});

test('missing database is refused without generating replacement data', t => {
  const directory = fixture(t);
  const missing = path.join(directory, 'profiles.sqlite');
  fs.unlinkSync(missing);
  assert.throws(() => validateDataDirectory(directory));
  assert.equal(fs.existsSync(missing), false);
});

test('rejects shared filesystem permissions', t => {
  const directory = fixture(t);
  fs.chmodSync(path.join(directory, 'design-assets.sqlite'), 0o640);
  assert.throws(() => validateDataDirectory(directory));
  fs.chmodSync(path.join(directory, 'design-assets.sqlite'), 0o600);
  fs.chmodSync(directory, 0o750);
  assert.throws(() => validateDataDirectory(directory));
});

test('rejects symlinked database files', t => {
  const directory = fixture(t);
  fs.renameSync(path.join(directory, 'profiles.sqlite'), path.join(directory, 'other.sqlite'));
  fs.symlinkSync('other.sqlite', path.join(directory, 'profiles.sqlite'));
  assert.throws(() => validateDataDirectory(directory));
});

test('refuses an empty product store instead of letting the app seed a master', t => {
  const directory = fixture(t, {products: 0});
  assert.throws(() => validateDataDirectory(directory), /already restored/);
});

test('accepts private synthetic state without changing its database bytes', t => {
  const directory = fixture(t);
  const hashes = () => fs.readdirSync(directory).sort().map(name =>
    [name, createHash('sha256').update(fs.readFileSync(path.join(directory, name))).digest('hex')]);
  const before = hashes();
  assert.equal(validateDataDirectory(directory), fs.realpathSync(directory));
  assert.deepEqual(hashes(), before);
});
