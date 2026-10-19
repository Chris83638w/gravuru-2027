import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createProductRepository } from './repository.mjs';

const document = (name = 'Acryl 150 × 200', extra = {}) => ({
  schema: 'gravuru-product/v1', name, kind: 'product', masterId: null,
  config: { widthMm: 150, heightMm: 200, priceCents: 1499 }, ...extra,
});
const errorIs = (status, code) => (error) => error.status === status && error.code === code;

function fixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'gravuru-products-'));
  const filename = join(directory, 'nested', 'products.sqlite');
  const connections = [];
  const open = (overrides = {}) => {
    const repository = createProductRepository({ filename, ...options, ...overrides });
    connections.push(repository);
    return repository;
  };
  t.after(() => {
    for (const repository of connections) {
      try { repository.close(); } catch { /* A restart test may already have closed it. */ }
    }
    rmSync(directory, { recursive: true, force: true });
  });
  return { filename, open, repository: open() };
}

test('creates server-owned stable IDs and persists independent JSON snapshots after restart', (t) => {
  const { repository, open } = fixture(t);
  const input = document();
  const created = repository.create(input);
  assert.match(created.id, /^cfg_[a-f0-9-]{36}$/);
  assert.equal(created.revision, 1);
  assert.equal(created.status, 'draft');
  assert.equal(created.publishedRevision, null);
  input.config.priceCents = 0;
  created.document.name = 'mutated return value';
  repository.close();
  const restarted = open();
  assert.equal(restarted.get(created.id).document.name, 'Acryl 150 × 200');
  assert.equal(restarted.get(created.id).document.config.priceCents, 1499);
  assert.ok(restarted.get(created.id).createdAt);
});

test('two connections cannot silently overwrite a stale edit or state mutation', (t) => {
  const { repository, open } = fixture(t);
  const other = open();
  const created = repository.create(document());
  const old = other.get(created.id);
  repository.save(created.id, document('Changed'), 1);
  for (const mutate of [
    () => other.save(old.id, document('Stale'), old.revision),
    () => other.publish(old.id, { expectedRevision: old.revision }),
    () => other.setArchived(old.id, { expectedRevision: old.revision, archived: true }),
    () => other.copy(old.id, { expectedRevision: old.revision }),
    () => other.restore(old.id, { expectedRevision: old.revision, revision: 1 }),
  ]) assert.throws(mutate, errorIs(409, 'revision_conflict'));
  assert.equal(other.get(old.id).document.name, 'Changed');
  assert.equal(other.history(old.id).length, 2);
});

test('published document is immutable while subsequent drafts evolve', (t) => {
  const { repository, filename } = fixture(t);
  const first = repository.create(document());
  const published = repository.publish(first.id, { expectedRevision: 1 });
  assert.equal(published.revision, 2);
  assert.equal(published.publishedRevision, 2);
  assert.equal(published.status, 'active');
  const draft = repository.save(first.id, document('Next draft'), 2);
  assert.equal(draft.revision, 3);
  assert.equal(draft.publishedRevision, 2);
  assert.deepEqual(repository.get(first.id, { revision: 2 }), published);
  const raw = new DatabaseSync(filename);
  try {
    assert.throws(() => raw.prepare('UPDATE product_revisions SET document = ? WHERE product_id = ?').run('{}', first.id), /immutable/);
    assert.throws(() => raw.prepare('DELETE FROM product_revisions WHERE product_id = ?').run(first.id), /immutable/);
  } finally { raw.close(); }
});

test('archive and unarchive create concurrency-protected revisions and preserve publication', (t) => {
  const { repository } = fixture(t);
  const created = repository.create(document());
  repository.publish(created.id, { expectedRevision: 1 });
  const archived = repository.setArchived(created.id, { expectedRevision: 2, archived: true });
  assert.equal(archived.status, 'archived');
  assert.equal(archived.revision, 3);
  assert.equal(archived.publishedRevision, 2);
  assert.equal(repository.list().length, 0);
  assert.equal(repository.list({ includeArchived: true }).length, 1);
  assert.throws(() => repository.publish(created.id, { expectedRevision: 3 }), errorIs(422, 'archived_product'));
  assert.equal(repository.history(created.id).length, 3);
  const active = repository.setArchived(created.id, { expectedRevision: 3, archived: false });
  assert.equal(active.status, 'active');
  assert.equal(active.revision, 4);
  assert.equal(active.publishedRevision, 2);
});

test('copy has a fresh identity and records master provenance without sharing mutable documents', (t) => {
  const { repository } = fixture(t);
  const master = repository.create(document('Master', { kind: 'master' }));
  const copy = repository.copy(master.id, { expectedRevision: 1, name: 'Kundenprodukt' });
  assert.notEqual(copy.id, master.id);
  assert.equal(copy.revision, 1);
  assert.equal(copy.document.masterId, master.id);
  assert.equal(copy.document.kind, 'product');
  repository.save(master.id, document('Master 2', { kind: 'master', config: { priceCents: 1999 } }), 1);
  assert.equal(repository.get(copy.id).document.config.priceCents, 1499);
  const next = repository.copy(copy.id, { expectedRevision: 1 });
  assert.equal(next.document.masterId, master.id);
  const newMaster = repository.copy(copy.id, { expectedRevision: 1, kind: 'master' });
  assert.equal(newMaster.document.masterId, null);
  assert.equal(newMaster.document.kind, 'master');
  assert.equal(repository.get(master.id).revision, 2);
});

test('master references are validated and referenced masters cannot become products', (t) => {
  const { repository } = fixture(t);
  const product = repository.create(document());
  assert.throws(() => repository.create(document('Invalid', { masterId: 'cfg_missing' })), errorIs(422, 'invalid_master'));
  assert.throws(() => repository.create(document('Invalid', { masterId: product.id })), errorIs(422, 'invalid_master'));
  const master = repository.create(document('Master', { kind: 'master' }));
  repository.copy(master.id, { expectedRevision: 1 });
  assert.throws(() => repository.save(master.id, document('Not a master'), 1), errorIs(422, 'master_in_use'));
  assert.equal(repository.get(master.id).revision, 1);
});

test('restore appends a new revision atomically and keeps published and historical snapshots', (t) => {
  const { repository } = fixture(t);
  const first = repository.create(document());
  repository.save(first.id, document('Second'), 1);
  const published = repository.publish(first.id, { expectedRevision: 2 });
  const restored = repository.restore(first.id, { expectedRevision: 3, revision: 1 });
  assert.equal(restored.revision, 4);
  assert.equal(restored.document.name, first.document.name);
  assert.equal(restored.publishedRevision, 3);
  assert.deepEqual(repository.get(first.id, { revision: 3 }), published);
  assert.deepEqual(repository.history(first.id).map((item) => item.revision), [4, 3, 2, 1]);
  assert.throws(() => repository.restore(first.id, { expectedRevision: 4, revision: 99 }), errorIs(404, 'revision_not_found'));
  assert.equal(repository.get(first.id).revision, 4);
});

test('restore does not implicitly unarchive or republish', (t) => {
  const { repository } = fixture(t);
  const first = repository.create(document());
  repository.setArchived(first.id, { expectedRevision: 1, archived: true });
  const restored = repository.restore(first.id, { expectedRevision: 2, revision: 1 });
  assert.equal(restored.status, 'archived');
  assert.equal(restored.publishedRevision, null);
});

test('validation failures roll back all writes and leave the connection usable', (t) => {
  let reject = false;
  const { repository } = fixture(t, {
    validateDocument: (value) => {
      if (reject) throw new Error('Invalid configuration');
      return value;
    },
  });
  const first = repository.create(document());
  reject = true;
  for (const mutate of [
    () => repository.create(document('Invalid')),
    () => repository.save(first.id, document('Invalid'), 1),
    () => repository.copy(first.id, { expectedRevision: 1 }),
    () => repository.publish(first.id, { expectedRevision: 1 }),
    () => repository.restore(first.id, { expectedRevision: 1, revision: 1 }),
  ]) assert.throws(mutate, errorIs(422, 'invalid_document'));
  assert.equal(repository.list().length, 1);
  assert.equal(repository.get(first.id).revision, 1);
  assert.equal(repository.history(first.id).length, 1);
  reject = false;
  assert.equal(repository.save(first.id, document('Valid'), 1).revision, 2);
});

test('a database failure after updating the product rolls back the entire revision transaction', (t) => {
  const { repository, filename } = fixture(t);
  const first = repository.create(document());
  const raw = new DatabaseSync(filename);
  try {
    raw.exec(`CREATE TRIGGER simulate_revision_failure BEFORE INSERT ON product_revisions
      BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END;`);
    assert.throws(() => repository.save(first.id, document('Must not survive'), 1), /simulated storage failure/);
    assert.throws(() => repository.create(document('Must not exist')), /simulated storage failure/);
    assert.deepEqual(repository.get(first.id), first);
    assert.equal(repository.list().length, 1);
    assert.equal(repository.history(first.id).length, 1);
    raw.exec('DROP TRIGGER simulate_revision_failure');
    assert.equal(repository.save(first.id, document('Storage recovered'), 1).revision, 2);
    assert.equal(raw.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally { raw.close(); }
});

test('missing or invalid expected revisions and database-owned input are rejected', (t) => {
  const { repository } = fixture(t);
  const first = repository.create(document());
  for (const expectedRevision of [undefined, null, '1', 0, -1, 1.5]) {
    assert.throws(() => repository.save(first.id, document(), expectedRevision), errorIs(422, 'invalid_revision'));
  }
  for (const field of ['id', 'revision', 'status', 'publishedRevision', 'createdAt', 'updatedAt', 'metadata']) {
    assert.throws(() => repository.create(document('Invalid', { [field]: 'caller chosen' })), errorIs(422, 'invalid_document'));
  }
  assert.throws(() => repository.copy(first.id), errorIs(422, 'invalid_revision'));
  assert.throws(() => repository.publish(first.id), errorIs(422, 'invalid_revision'));
  assert.throws(() => repository.setArchived(first.id), errorIs(422, 'invalid_revision'));
  assert.throws(() => repository.restore(first.id), errorIs(422, 'invalid_revision'));
  assert.throws(() => repository.setArchived(first.id, { expectedRevision: 1, archived: 'false' }), errorIs(422, 'invalid_archive_state'));
  assert.throws(() => repository.get('missing'), errorIs(404, 'not_found'));
  assert.throws(() => repository.get(first.id, { revision: 9 }), errorIs(404, 'revision_not_found'));
  assert.equal(repository.history(first.id).length, 1);
});

test('search supports case-insensitive Unicode names and literal SQL punctuation', (t) => {
  const { repository } = fixture(t);
  const first = repository.create(document('ÄPFEL 100%_ Acryl'));
  repository.create(document('Holz'));
  assert.equal(repository.list({ query: 'äpfel' })[0].id, first.id);
  assert.equal(repository.list({ query: '100%_' }).length, 1);
  assert.equal(repository.list({ query: "' OR 1=1 --" }).length, 0);
  assert.equal(repository.list({ query: first.id })[0].name, 'ÄPFEL 100%_ Acryl');
  assert.equal(repository.list({ query: 'holz' })[0].kind, 'product');
});

test('migration is durable and idempotent, enforces foreign keys, and rejects future schemas', (t) => {
  const { filename, repository, open } = fixture(t);
  const first = repository.create(document());
  repository.close();
  const raw = new DatabaseSync(filename);
  try {
    assert.equal(raw.prepare('PRAGMA user_version').get().user_version, 4);
    raw.exec('PRAGMA foreign_keys = ON');
    assert.throws(() => raw.prepare('UPDATE products SET master_id = ? WHERE id = ?').run('missing', first.id), /FOREIGN KEY/);
    assert.equal(raw.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally { raw.close(); }
  const restarted = open();
  assert.equal(restarted.get(first.id).revision, 1);
  restarted.close();
  const future = new DatabaseSync(filename);
  future.exec('PRAGMA user_version = 5');
  future.close();
  assert.throws(() => open(), errorIs(422, 'unsupported_database_version'));
  const inspect = new DatabaseSync(filename);
  try {
    assert.equal(inspect.prepare('SELECT COUNT(*) AS count FROM products').get().count, 1);
    assert.equal(inspect.prepare('PRAGMA user_version').get().user_version, 5);
  } finally { inspect.close(); }
});

test('metadata is detached, immutable and pinned across profile changes and restart', (t) => {
  const profiles = { revision: 1, colors: ['#FF0000'] };
  const { repository, open, filename } = fixture(t, {
    snapshotMetadata: (value) => {
      value.name = 'Callback cannot change the document';
      return { profiles };
    },
  });
  const first = repository.create(document('Original'));
  assert.equal(first.document.name, 'Original');
  profiles.revision = 2;
  profiles.colors[0] = '#0000FF';
  const published = repository.publish(first.id, { expectedRevision: 1 });
  first.metadata.profiles.colors[0] = '#FFFFFF';
  profiles.revision = 3;
  profiles.colors[0] = '#00FF00';
  repository.close();
  const restarted = open();
  assert.deepEqual(restarted.get(first.id, { revision: 1 }).metadata, { profiles: { revision: 1, colors: ['#FF0000'] } });
  assert.deepEqual(restarted.get(first.id), published);
  const restored = restarted.restore(first.id, { expectedRevision: 2, revision: 1 });
  assert.deepEqual(restored.metadata, { profiles: { revision: 3, colors: ['#00FF00'] } });
  assert.deepEqual(restarted.history(first.id).map((item) => item.metadata.profiles.revision), [3, 2, 1]);
  const raw = new DatabaseSync(filename);
  try {
    assert.throws(() => raw.prepare('UPDATE product_revisions SET metadata = ? WHERE product_id = ?').run('{}', first.id), /immutable/);
  } finally { raw.close(); }
});

test('metadata callback failures roll back product changes and earlier batch rows including import keys', (t) => {
  let reject = '';
  const { repository } = fixture(t, {
    snapshotMetadata: (value) => {
      if (reject === '*' || value.name === reject) throw new Error('Profile resolution failed');
      return { profileRevision: 1 };
    },
  });
  const first = repository.create(document('Existing'));
  reject = '*';
  for (const mutate of [
    () => repository.create(document()),
    () => repository.save(first.id, document('Changed'), 1),
    () => repository.copy(first.id, { expectedRevision: 1 }),
    () => repository.publish(first.id, { expectedRevision: 1 }),
    () => repository.setArchived(first.id, { expectedRevision: 1, archived: true }),
    () => repository.restore(first.id, { expectedRevision: 1, revision: 1 }),
  ]) assert.throws(mutate, errorIs(422, 'invalid_snapshot_metadata'));
  assert.deepEqual(repository.get(first.id), first);
  assert.equal(repository.history(first.id).length, 1);
  const entries = ['Valid first', 'Invalid second'].map((name, index) => ({
    key: `metadata-batch-${index}`, fingerprint: String(index).repeat(64), document: document(name),
  }));
  reject = 'Invalid second';
  assert.throws(() => repository.importBatch(entries), /Profile resolution failed/);
  assert.equal(repository.list().length, 1);
  for (const entry of entries) assert.equal(repository.importItem(entry.key), null);
  reject = '';
  assert.ok(repository.importBatch(entries).every((item) => item.created));
  assert.equal(repository.list().length, 3);
});

test('metadata callbacks must synchronously return JSON objects', (t) => {
  let metadata;
  const { repository } = fixture(t, { snapshotMetadata: () => metadata });
  const cyclic = {}; cyclic.self = cyclic;
  for (metadata of [undefined, null, [], 1, Promise.resolve({}), cyclic, { toJSON: () => null }]) {
    assert.throws(() => repository.create(document()), errorIs(422, 'invalid_snapshot_metadata'));
    assert.equal(repository.list().length, 0);
  }
  metadata = {};
  assert.deepEqual(repository.create(document()).metadata, {});
});

for (const version of [1, 2]) test(`migration from schema ${version} preserves historical records with empty metadata`, (t) => {
  const { filename, repository, open } = fixture(t);
  const first = repository.create(document('Historic'));
  const published = repository.publish(first.id, { expectedRevision: 1 });
  repository.close();
  const raw = new DatabaseSync(filename);
  try {
    raw.exec('ALTER TABLE product_revisions DROP COLUMN metadata');
    // K13: Alt-Schema vor der Mandantenspalte nachbilden (Schema 1/2 kannte weder tenant_id noch den Mandantenschlüssel der Importzeilen).
    raw.exec('DROP INDEX IF EXISTS products_tenant; DROP INDEX IF EXISTS product_revisions_tenant; ALTER TABLE products DROP COLUMN tenant_id; ALTER TABLE product_revisions DROP COLUMN tenant_id; DROP TABLE import_items');
    if (version === 2) {
      raw.exec('CREATE TABLE import_items (import_key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, product_id TEXT NOT NULL REFERENCES products(id), created_at TEXT NOT NULL)');
      raw.prepare('INSERT INTO import_items VALUES (?, ?, ?, ?)').run('old-import', 'a'.repeat(64), first.id, first.createdAt);
    }
    raw.exec(`PRAGMA user_version = ${version}`);
  } finally { raw.close(); }
  let calls = 0;
  const migrated = open({ snapshotMetadata: () => ({ profileRevision: ++calls }) });
  assert.deepEqual(migrated.get(first.id), published);
  assert.deepEqual(migrated.history(first.id).map((item) => item.metadata), [{}, {}]);
  assert.equal(calls, 0);
  if (version === 2) assert.equal(migrated.importItem('old-import').id, first.id);
  assert.equal(migrated.save(first.id, document('New'), 2).metadata.profileRevision, 1);
  migrated.close();
  const restarted = open();
  assert.deepEqual(restarted.get(first.id, { revision: 2 }), published);
  assert.deepEqual(restarted.get(first.id).metadata, { profileRevision: 1 });
  const inspect = new DatabaseSync(filename);
  try {
    assert.equal(inspect.prepare('PRAGMA user_version').get().user_version, 4);
    assert.equal(inspect.prepare('PRAGMA foreign_key_check').all().length, 0);
  } finally { inspect.close(); }
});

test('manufacturing usage separates current and activated product revisions, includes archives, excludes history-only references',t=>{
 const {repository:r}=fixture(t),profileId='mfg_1234',other='mfg_5678',doc=document('Synthetisches Acryl',{productionProfile:{id:profileId,revision:1}});
 let a=r.create(doc);a=r.publish(a.id,{expectedRevision:a.revision});const activated=a.revision;
 assert.equal(r.productionProfileUsage(profileId).length,1);assert.equal(r.productionProfileUsage(profileId)[0].current,true);assert.equal(r.productionProfileUsage(profileId)[0].activated,true);
 a=r.save(a.id,{...doc,productionProfile:{id:profileId,revision:2}},a.revision);
 let rows=r.productionProfileUsage(profileId);assert.deepEqual(rows.map(x=>[x.revision,x.profileRevision,x.current,x.activated]),[[a.revision,2,true,false],[activated,1,false,true]]);
 a=r.save(a.id,{...doc,productionProfile:{id:other,revision:1}},a.revision);rows=r.productionProfileUsage(profileId);assert.equal(rows.length,1);assert.equal(rows[0].revision,activated);
 const b=r.create(document('Synthetischer Master',{kind:'master',schema:'gravuru-form-product/v1',productionProfile:{id:profileId,revision:2}}));r.setArchived(b.id,{expectedRevision:b.revision,archived:true});
 rows=r.productionProfileUsage(profileId);assert.equal(rows.length,2);assert.equal(rows.find(x=>x.id===b.id).archived,true);assert.equal(rows.find(x=>x.id===b.id).kind,'master');assert.ok(rows.every(x=>!Object.hasOwn(x,'document')&&!Object.hasOwn(x,'metadata')));
 const before=r.history(a.id);r.productionProfileUsage(profileId);assert.deepEqual(r.history(a.id),before);assert.deepEqual(r.productionProfileUsage('mfg_ffff'),[]);assert.throws(()=>r.productionProfileUsage("x' OR 1=1"));
});
