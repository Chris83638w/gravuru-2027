import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {migrateProductDocumentResources, createProductDocumentBackup, parseMigrationArguments} from './migrate-product-document-resources.mjs';
import {initializeProductDocumentResources, encodeStoredDocument, readStoredDocumentText} from '../app/workshop/product-document-resources.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const script = fileURLToPath(new URL('./migrate-product-document-resources.mjs', import.meta.url));
const UPDATE = `CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON product_revisions
  BEGIN SELECT RAISE(ABORT, 'Product revisions are immutable'); END;`;
const surface = 'data:image/webp;base64,' + Buffer.from('exact shared plate'.repeat(5000)).toString('base64');
const font = variant => ({regular: {units: 1000, glyphs: {A: {a: 560 + variant, d: 'M0 0L10 20Z'.repeat(6000)}}}, source: 'Originalschrift'});
const document = (variant = 0) => ({name: 'Original Änne', kind: 'product', config: {
  materialSurface: surface, localResources: {fonts: {Original: font(variant), Alias: font(variant)}},
  profile: {id: 'unchanged', width: 220, height: 140, designs: [{id: 'same-original', objects: [
    {id: 'name', type: 'text', text: 'Änne', font: 'Original', x: 12.345, y: 87.654},
    {id: 'photo', type: 'photo', assetId: 'source-photo', mask: 'heart', crop: {x: .1, y: .2}},
    {id: 'motif', type: 'motif', key: 'original-motif'}]}]}, sceneBackground: 'unchanged-background'}, metadata: {originalId: 'original-42'}});

function fixture(t, {wal = false} = {}) {
  const parent = fs.realpathSync(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, 'gravuru-resource-migration-')), source = path.join(root, 'source');
  fs.mkdirSync(source); const open = [];
  t.after(() => {
    for (const db of open) { try { db.close(); } catch {} }
    // Only our own, freshly-created test directory is removed.
    assert.equal(path.dirname(root), parent); assert.ok(path.basename(root).startsWith('gravuru-resource-migration-'));
    fs.rmSync(root, {recursive: true, force: true});
  });
  const db = new DatabaseSync(path.join(source, 'workshop.sqlite'));
  if (wal) db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
  db.exec(`CREATE TABLE products(id TEXT PRIMARY KEY,revision INTEGER,tenant_id TEXT,name TEXT,updated_at TEXT);
    CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,document TEXT NOT NULL CHECK(json_valid(document)),published_revision INTEGER,status TEXT,created_at TEXT,metadata TEXT,tenant_id TEXT NOT NULL DEFAULT 'gravuru',PRIMARY KEY(product_id,revision));
    CREATE TABLE retained_records(id TEXT PRIMARY KEY,value BLOB,metadata TEXT);
    CREATE TRIGGER immutable_revision_delete BEFORE DELETE ON product_revisions BEGIN SELECT RAISE(ABORT,'Product revisions are immutable'); END;
    ${UPDATE} PRAGMA user_version=4;`);
  const add = (id, revision, tenant, text) => {
    db.prepare('INSERT INTO product_revisions VALUES(?,?,?,?,?,?,?,?)').run(id, revision, text, revision === 1 ? 1 : null, revision === 1 ? 'active' : 'draft', `2026-10-01T00:00:0${revision}Z`, '{ "approval": "old-sha", "original":"fixed-id" }', tenant);
    db.prepare('INSERT INTO products VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision').run(id, revision, tenant, 'unchanged name', '2026-10-01T00:00:00Z');
  };
  add('alpha-product', 1, 'gravuru', JSON.stringify(document(0)));
  add('alpha-product', 2, 'gravuru', JSON.stringify(document(1)));
  add('beta-product', 1, 'beta', JSON.stringify(document(0)));
  add('legacy-product', 1, 'gravuru', JSON.stringify(document(0), null, 2));
  db.prepare('INSERT INTO retained_records VALUES(?,?,?)').run('historic-order', Buffer.from([0, 1, 255, 17]), '{"approved":true}');
  if (wal) open.push(db); else db.close();
  for (const filename of ['design-assets.sqlite', 'profiles.sqlite', 'review-comments.sqlite', 'review-approvals.sqlite']) {
    const companion = new DatabaseSync(path.join(source, filename));
    if (wal) companion.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
    companion.exec('CREATE TABLE resources(id TEXT PRIMARY KEY,payload BLOB,metadata TEXT);');
    companion.prepare('INSERT INTO resources VALUES(?,?,?)').run(filename, Buffer.from('exact original photo/mask/profile bytes'), '{"source":"original","revision":3}');
    if (wal) open.push(companion); else companion.close();
  }
  fs.mkdirSync(path.join(source, 'gallery'));
  fs.writeFileSync(path.join(source, 'gallery', 'manifest.json'), '{ "original": "same-id", "material": "AA-5mm" }\n');
  fs.writeFileSync(path.join(source, 'local-review-import.json'), '{"products":["alpha-product","beta-product"]}');
  fs.writeFileSync(path.join(source, 'original-photo.png'), Buffer.from([137, 80, 78, 71, 0, 1, 2, 3]));
  return {root, source, target: path.join(root, 'compact'), saved: path.join(root, 'backup'), sourceDb: wal ? db : null};
}
function readDb(directory, callback) {
  const db = new DatabaseSync(path.join(directory, 'workshop.sqlite'), {readOnly: true});
  try { return callback(db); } finally { db.close(); }
}
function rawRows(directory) { return readDb(directory, db => db.prepare('SELECT * FROM product_revisions ORDER BY product_id,revision').all().map(row => ({...row}))); }
function expandedRows(directory) { return readDb(directory, db => db.prepare('SELECT * FROM product_revisions ORDER BY product_id,revision').all().map(row => ({...row, document: readStoredDocumentText(db, row.document, {tenantId: row.tenant_id})}))); }
function editSource(directory, callback) { const db = new DatabaseSync(path.join(directory, 'workshop.sqlite')); try { callback(db); } finally { db.close(); } }
const options = f => ({sourceDirectory: f.source, targetDirectory: f.target, backupDirectory: f.saved});
const coreHash = f => sha(fs.readFileSync(path.join(f.source, 'workshop.sqlite')));

test('compact and expand preserve all historical texts, metadata, masks, mapped files and companion databases', async t => {
  const f = fixture(t), before = rawRows(f.source), sourceSha = coreHash(f);
  const compact = await migrateProductDocumentResources(options(f));
  assert.equal(coreHash(f), sourceSha); assert.deepEqual(rawRows(f.saved), before); assert.deepEqual(expandedRows(f.target), before);
  assert.equal(compact.documentHashParity, true); assert.equal(compact.rows, 4); assert.equal(compact.changedRows, 3);
  assert.equal(compact.afterSchemaVersion, 5); assert.equal(compact.references, 9); assert.equal(compact.referencedRows, 3);
  assert.ok(compact.afterBytes < compact.beforeBytes); assert.ok(compact.rawDocBytesAfter < compact.rawDocBytesBefore);
  assert.equal(compact.rawDocBytesBefore, compact.hydratedDocBytes); assert.equal(compact.vacuum, true);
  assert.equal(compact.resources.filter(r => r.kind === 'font').length, 3); // two immutable gravuru revisions, one beta resource
  assert.equal(compact.resources.filter(r => r.kind === 'material-image').length, 2); // same bytes, separate tenant keys
  assert.equal(compact.companionDatabases.length, 4); assert.ok(compact.companionDatabases.every(d => d.contentParity && d.integrity === 'ok'));
  assert.equal(rawRows(f.target).find(r => r.product_id === 'legacy-product').document, before.find(r => r.product_id === 'legacy-product').document);
  for (const file of ['gallery/manifest.json', 'local-review-import.json', 'original-photo.png']) {
    assert.deepEqual(fs.readFileSync(path.join(f.target, file)), fs.readFileSync(path.join(f.source, file)));
  }
  for (const proof of compact.historicalRows) assert.equal(proof.sha256, sha(before.find(row => row.product_id === proof.productId && row.revision === proof.revision).document));
  editSource(f.target, db => assert.throws(() => db.exec("UPDATE product_revisions SET status='draft'"), /immutable/));
  const compactSha = sha(fs.readFileSync(path.join(f.target, 'workshop.sqlite')));
  const expanded = await migrateProductDocumentResources({sourceDirectory: f.target, targetDirectory: path.join(f.root, 'expanded'), backupDirectory: path.join(f.root, 'expand-backup'), mode: 'expand'});
  assert.equal(sha(fs.readFileSync(path.join(f.target, 'workshop.sqlite'))), compactSha);
  assert.deepEqual(rawRows(expanded.targetDirectory), before); assert.equal(expanded.afterSchemaVersion, 4); assert.equal(expanded.resources.length, 0);
  readDb(expanded.targetDirectory, db => { assert.equal(db.prepare('PRAGMA user_version').get().user_version, 4); assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name='product_document_resources'").get(), undefined); });
  editSource(expanded.targetDirectory, db => assert.throws(() => db.exec("UPDATE product_revisions SET status='draft'"), /immutable/));
});

test('snapshot includes committed WAL in workshop, resources and profiles without checkpointing the source', async t => {
  const f = fixture(t, {wal: true}), before = rawRows(f.source), sourceSha = coreHash(f);
  const wal = path.join(f.source, 'workshop.sqlite-wal'), walSha = sha(fs.readFileSync(wal));
  assert.ok(fs.statSync(wal).size > 0);
  const compact = await migrateProductDocumentResources(options(f));
  assert.equal(coreHash(f), sourceSha); assert.equal(sha(fs.readFileSync(wal)), walSha);
  assert.deepEqual(rawRows(f.saved), before); assert.deepEqual(expandedRows(f.target), before);
  const manifest = JSON.parse(fs.readFileSync(compact.backupManifest, 'utf8'));
  assert.ok(manifest.sourceFiles.some(row => row.file === 'workshop.sqlite-wal'));
  assert.ok(manifest.databases.every(row => row.contentParity));
  assert.equal(manifest.databases.find(row => row.file === 'design-assets.sqlite').tables[0].rows, 1);
});

test('a fresh backup alone is complete and never modifies an earlier manifest', async t => {
  const f = fixture(t), result = await createProductDocumentBackup({sourceDirectory: f.source, backupDirectory: f.saved});
  assert.deepEqual(rawRows(f.saved), rawRows(f.source));
  assert.equal(result.manifestSha256, sha(fs.readFileSync(result.manifestFile)));
  const saved = fs.readFileSync(result.manifestFile);
  await assert.rejects(createProductDocumentBackup({sourceDirectory: f.source, backupDirectory: f.saved}), e => e.code === 'migration_exists');
  assert.deepEqual(fs.readFileSync(result.manifestFile), saved);
});

test('already compact data can be copied again without new resources or altered texts', async t => {
  const f = fixture(t), first = await migrateProductDocumentResources(options(f));
  const second = await migrateProductDocumentResources({sourceDirectory: f.target, targetDirectory: path.join(f.root, 'compact-again'), backupDirectory: path.join(f.root, 'backup-again')});
  assert.equal(second.changedRows, 0); assert.deepEqual(second.resources, first.resources); assert.deepEqual(rawRows(second.targetDirectory), rawRows(f.target));
  const report = fs.readFileSync(second.reportFile);
  await assert.rejects(migrateProductDocumentResources({sourceDirectory: f.target, targetDirectory: second.targetDirectory, backupDirectory: path.join(f.root, 'backup-unused')}), e => e.code === 'migration_exists');
  assert.deepEqual(fs.readFileSync(second.reportFile), report); assert.equal(fs.existsSync(path.join(f.root, 'backup-unused')), false);
});

test('unknown revision-update trigger is refused without disabling it or changing target revisions', async t => {
  const f = fixture(t);
  editSource(f.source, db => db.exec("DROP TRIGGER immutable_revision_update; CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON product_revisions BEGIN SELECT RAISE(ABORT,'custom owner rule'); END;"));
  const before = rawRows(f.source); let error;
  await assert.rejects(migrateProductDocumentResources(options(f)), e => { error = e; return e.code === 'migration_trigger'; });
  assert.deepEqual(rawRows(f.target), before); assert.deepEqual(rawRows(f.source), before);
  assert.equal(JSON.parse(fs.readFileSync(error.reportFile)).targetTransactionCommitted, false);
  editSource(f.target, db => assert.throws(() => db.exec("UPDATE product_revisions SET status='draft'"), /custom owner rule/));
});

test('missing references fail after earlier successful rows and roll back all target changes and the schema', async t => {
  const f = fixture(t);
  editSource(f.source, db => {
    db.exec('DROP TRIGGER immutable_revision_update');
    const doc = document(); doc.config.localResources.fonts.Original = {$gravuruResource: 1, kind: 'font', sha256: 'a'.repeat(64)};
    db.prepare("UPDATE product_revisions SET document=? WHERE product_id='beta-product'").run(JSON.stringify(doc));
    db.exec(UPDATE);
  });
  const before = rawRows(f.source);
  await assert.rejects(migrateProductDocumentResources(options(f)), e => e.code === 'product_resource_missing');
  assert.deepEqual(rawRows(f.target), before); assert.deepEqual(rawRows(f.saved), before);
  readDb(f.target, db => { assert.equal(db.prepare('PRAGMA user_version').get().user_version, 4); assert.equal(db.prepare("SELECT name FROM sqlite_schema WHERE name='product_document_resources'").get(), undefined); });
  editSource(f.target, db => assert.throws(() => db.exec("UPDATE product_revisions SET status='draft'"), /immutable/));
});

test('a trigger that changes unrelated data causes the entire compaction transaction to roll back', async t => {
  const f = fixture(t);
  editSource(f.source, db => db.exec("CREATE TRIGGER custom_audit AFTER UPDATE OF document ON product_revisions BEGIN UPDATE retained_records SET metadata='unexpected side effect'; END;"));
  const before = rawRows(f.source);
  await assert.rejects(migrateProductDocumentResources(options(f)), e => e.code === 'migration_other_data_changed');
  assert.deepEqual(rawRows(f.target), before);
  readDb(f.target, db => assert.equal(db.prepare('SELECT metadata FROM retained_records').get().metadata, '{"approved":true}'));
});

test('VACUUM rowid changes are detected and never reported as a verified migration', async t => {
  const f = fixture(t);
  editSource(f.source, db => db.exec("CREATE TABLE legacy_cursors(value TEXT); INSERT INTO legacy_cursors(rowid,value) VALUES(5,'first'),(99,'second');"));
  let error;
  await assert.rejects(migrateProductDocumentResources(options(f)), e => { error = e; return e.code === 'migration_other_data_changed'; });
  const report = JSON.parse(fs.readFileSync(error.reportFile));
  assert.equal(report.status, 'failed'); assert.equal(report.targetTransactionCommitted, true);
  for (const directory of [f.source, f.saved]) readDb(directory, db => assert.deepEqual(db.prepare('SELECT rowid FROM legacy_cursors ORDER BY rowid').all().map(row => row.rowid), [5, 99]));
  assert.deepEqual(rawRows(f.saved), rawRows(f.source));
});

test('corrupt shared payloads cannot be expanded or silently replaced', async t => {
  const f = fixture(t); await migrateProductDocumentResources(options(f));
  editSource(f.target, db => { db.exec('DROP TRIGGER immutable_product_document_resource_update'); db.prepare("UPDATE product_document_resources SET value_json='{}' WHERE kind='font'").run(); });
  const before = rawRows(f.target), destination = path.join(f.root, 'corrupt-expanded');
  await assert.rejects(migrateProductDocumentResources({sourceDirectory: f.target, targetDirectory: destination, backupDirectory: path.join(f.root, 'corrupt-backup'), mode: 'expand'}), e => e.code === 'product_resource_corrupt');
  assert.deepEqual(rawRows(destination), before);
  readDb(destination, db => assert.equal(db.prepare('PRAGMA user_version').get().user_version, 5));
});

test('expand refuses pool removal while an unhandled internal reference remains elsewhere', async t => {
  const f = fixture(t); await migrateProductDocumentResources(options(f));
  editSource(f.target, db => db.prepare('UPDATE retained_records SET metadata=?').run(JSON.stringify({reference: {$gravuruResource: 1, kind: 'font', sha256: 'a'.repeat(64)}})));
  const before = rawRows(f.target), destination = path.join(f.root, 'blocked-expanded');
  await assert.rejects(migrateProductDocumentResources({sourceDirectory: f.target, targetDirectory: destination, backupDirectory: path.join(f.root, 'blocked-backup'), mode: 'expand'}), e => e.code === 'migration_unexpanded_reference');
  assert.deepEqual(rawRows(destination), before);
  readDb(destination, db => assert.ok(db.prepare('SELECT count(*) AS n FROM product_document_resources').get().n > 0));
});

test('path guards require backup and target, reject overlap and existing folders before any copy', async t => {
  const f = fixture(t), sourceSha = coreHash(f);
  for (const change of [
    {backupDirectory: undefined}, {targetDirectory: undefined}, {targetDirectory: f.source}, {backupDirectory: f.source},
    {targetDirectory: path.join(f.source, 'nested')}, {backupDirectory: f.target}, {mode: 'in-place'}
  ]) await assert.rejects(migrateProductDocumentResources({...options(f), ...change}), e => /^migration_/.test(e.code));
  assert.equal(fs.existsSync(f.saved), false); assert.equal(fs.existsSync(f.target), false); assert.equal(coreHash(f), sourceSha);
});

test('junction aliases and linked resources cannot escape the source/copy boundaries', async t => {
  const f = fixture(t), alias = path.join(f.root, 'source-alias');
  fs.symlinkSync(f.source, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(migrateProductDocumentResources({...options(f), targetDirectory: path.join(alias, 'nested')}), e => e.code === 'migration_path_overlap');
  const outside = path.join(f.root, 'external'); fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'untouched.txt'), 'untouched');
  fs.symlinkSync(outside, path.join(f.source, 'linked-resources'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(migrateProductDocumentResources(options(f)), e => e.code === 'migration_symlink');
  assert.equal(fs.readFileSync(path.join(outside, 'untouched.txt'), 'utf8'), 'untouched'); assert.equal(fs.existsSync(f.saved), false);
});

test('missing required companion databases and unknown schema versions fail safely', async t => {
  const f = fixture(t);
  fs.renameSync(path.join(f.source, 'profiles.sqlite'), path.join(f.source, 'profile-other-name.sqlite'));
  await assert.rejects(migrateProductDocumentResources(options(f)), e => e.code === 'migration_resource_database_missing');
  assert.equal(fs.existsSync(f.saved), false);
  fs.renameSync(path.join(f.source, 'profile-other-name.sqlite'), path.join(f.source, 'profiles.sqlite'));
  editSource(f.source, db => db.exec('PRAGMA user_version=6'));
  await assert.rejects(migrateProductDocumentResources(options(f)), e => e.code === 'migration_schema');
  assert.deepEqual(rawRows(f.target), rawRows(f.source));
});

test('schema 4 without tenant identity is refused instead of inventing a legacy tenant', async t => {
  const f = fixture(t);
  editSource(f.source, db => db.exec('ALTER TABLE product_revisions DROP COLUMN tenant_id'));
  const before = rawRows(f.source);
  await assert.rejects(migrateProductDocumentResources(options(f)), e => e.code === 'migration_schema');
  assert.deepEqual(rawRows(f.target), before);
  readDb(f.target, db => assert.equal(db.prepare('PRAGMA user_version').get().user_version, 4));
});

test('a modified revision primary key is refused before altering any rows', async t => {
  const f = fixture(t);
  editSource(f.source, db => db.exec(`DROP TRIGGER immutable_revision_update;
    ALTER TABLE product_revisions RENAME TO old_revisions;
    CREATE TABLE product_revisions(product_id TEXT,revision INTEGER,document TEXT, published_revision INTEGER,status TEXT,created_at TEXT,metadata TEXT,tenant_id TEXT,PRIMARY KEY(tenant_id,product_id,revision));
    INSERT INTO product_revisions SELECT * FROM old_revisions;
    DROP TABLE old_revisions; ${UPDATE}`));
  const before = rawRows(f.source);
  await assert.rejects(migrateProductDocumentResources(options(f)), e => e.code === 'migration_schema');
  assert.deepEqual(rawRows(f.target), before);
});

test('changes made while snapshotting invalidate the backup before any migration target is created', async t => {
  const f = fixture(t);
  const migration = migrateProductDocumentResources(options(f));
  const change = new Promise(resolve => setImmediate(() => { fs.writeFileSync(path.join(f.source, 'local-review-import.json'), '{"changedWhileCopying":true}'); resolve(); }));
  await assert.rejects(migration, e => ['migration_source_changed', 'migration_copy_parity'].includes(e.code));
  await change; assert.equal(fs.existsSync(f.target), false);
  assert.deepEqual(rawRows(f.source), rawRows(f.saved));
});

test('CLI requires all paths, has an inert help command and runs a verified copy', async t => {
  const f = fixture(t);
  assert.equal(parseMigrationArguments(['--help']), null);
  assert.throws(() => parseMigrationArguments(['--source', f.source, '--target', f.target]), e => e.code === 'migration_arguments');
  assert.throws(() => parseMigrationArguments(['--source', f.source, '--source', f.source]), e => e.code === 'migration_arguments');
  const help = spawnSync(process.execPath, [script, '--help'], {encoding: 'utf8'}); assert.equal(help.status, 0); assert.equal(fs.existsSync(f.saved), false);
  const bad = spawnSync(process.execPath, [script, '--source', f.source, '--target', f.target], {encoding: 'utf8'}); assert.equal(bad.status, 1); assert.equal(fs.existsSync(f.target), false);
  const run = spawnSync(process.execPath, [script, '--source', f.source, '--target', f.target, '--backup', f.saved, '--mode', 'compact'], {encoding: 'utf8'});
  assert.equal(run.status, 0, run.stderr); const result = JSON.parse(run.stdout); assert.equal(result.status, 'verified'); assert.equal(result.documentHashParity, true);
});
