// Offline storage migration only: immutable sources -> backup -> a NEW copy.
// No repository constructor is used here, because opening one can migrate/seed.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {DatabaseSync, backup} from 'node:sqlite';
import {initializeProductDocumentResources, encodeStoredDocument, readStoredDocumentText} from '../app/workshop/product-document-resources.mjs';

const POOL = 'product_document_resources';
const REQUIRED = ['workshop.sqlite', 'design-assets.sqlite', 'profiles.sqlite'];
const UPDATE_TRIGGER = `CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON product_revisions
  BEGIN SELECT RAISE(ABORT, 'Product revisions are immutable'); END`;
const sha = value => createHash('sha256').update(value).digest('hex');
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const normalSql = text => text.trim().replace(/;$/, '').replace(/\s+/g, ' ');
const bytes = text => Buffer.byteLength(text, 'utf8');
const fail = (code, message) => { throw Object.assign(Error(message), {code}); };
const jsonFile = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
const normalizedPath = value => process.platform === 'win32' ? value.toLowerCase() : value;
const inside = (a, b) => a === b || b.startsWith(a + path.sep);

function fileHash(filename) {
  const fd = fs.openSync(filename, 'r'), hash = createHash('sha256'), buffer = Buffer.allocUnsafe(1024 * 1024);
  try { let n; while ((n = fs.readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0, n)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}

function existingDirectory(value) {
  if (typeof value !== 'string' || !value.trim()) fail('migration_path', 'Ein Quellordner ist erforderlich.');
  const resolved = path.resolve(value);
  if (!fs.statSync(resolved).isDirectory()) fail('migration_path', 'Die Quelle muss ein Ordner sein.');
  return fs.realpathSync.native(resolved);
}

function newDirectory(value) {
  if (typeof value !== 'string' || !value.trim()) fail('migration_path', 'Neue Ziel- und Sicherungsordner sind erforderlich.');
  const resolved = path.resolve(value);
  // lstat also rejects dangling links; resolving the parent closes junction aliases.
  try { fs.lstatSync(resolved); fail('migration_exists', 'Der Ordner existiert bereits: ' + resolved); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const parent = fs.realpathSync.native(path.dirname(resolved));
  if (!fs.statSync(parent).isDirectory()) fail('migration_path', 'Der übergeordnete Ordner fehlt.');
  return path.join(parent, path.basename(resolved));
}

function pathsFor(sourceDirectory, targetDirectory, backupDirectory) {
  const source = existingDirectory(sourceDirectory), target = targetDirectory === undefined ? null : newDirectory(targetDirectory), saved = newDirectory(backupDirectory);
  const entries = [source, target, saved].filter(Boolean).map(normalizedPath);
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    if (inside(entries[i], entries[j]) || inside(entries[j], entries[i])) fail('migration_path_overlap', 'Quelle, Ziel und Sicherung müssen getrennte Ordner sein.');
  }
  return {source, target, saved};
}

function filesIn(directory) {
  const files = [];
  function visit(relative) {
    for (const item of fs.readdirSync(path.join(directory, relative), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = path.join(relative, item.name), filename = path.join(directory, rel), st = fs.lstatSync(filename);
      if (st.isSymbolicLink()) fail('migration_symlink', 'Verknüpfungen werden nicht kopiert: ' + rel);
      if (st.isDirectory()) visit(rel);
      else if (st.isFile()) files.push(rel);
      else fail('migration_special_file', 'Keine normale Datei: ' + rel);
    }
  }
  visit(''); return files;
}

function isDatabase(filename) {
  const buffer = Buffer.alloc(16), fd = fs.openSync(filename, 'r');
  try { return fs.readSync(fd, buffer, 0, 16, 0) === 16 && buffer.toString('binary') === 'SQLite format 3\u0000'; }
  finally { fs.closeSync(fd); }
}

function sourceLayout(directory) {
  const files = filesIn(directory), databases = new Set(files.filter(file => isDatabase(path.join(directory, file))));
  for (const required of REQUIRED) if (!databases.has(required)) fail('migration_resource_database_missing', 'Notwendige Datenbank fehlt: ' + required);
  const sidecar = rel => /-(wal|shm|journal)$/.test(rel) && databases.has(rel.replace(/-(wal|shm|journal)$/, ''));
  return {files, databases, sidecar};
}

function sourceFingerprint(directory) {
  const layout = sourceLayout(directory), records = [];
  for (const file of layout.files) {
    const filename = path.join(directory, file), stat = fs.statSync(filename);
    // SQLite readers may establish SHM/empty WAL files. They contain no committed data.
    if (layout.sidecar(file) && (file.endsWith('-shm') || file.endsWith('-wal') && stat.size === 0)) continue;
    records.push({file, bytes: stat.size, sha256: fileHash(filename)});
  }
  return {layout, records, sha256: sha(JSON.stringify(records))};
}

function assertIntegrity(db, label) {
  const rows = db.prepare('PRAGMA integrity_check').all();
  if (rows.length !== 1 || Object.values(rows[0])[0] !== 'ok') fail('migration_integrity', 'Integritätsprüfung fehlgeschlagen: ' + label);
}

function databaseSummary(filename) {
  const db = new DatabaseSync(filename, {readOnly: true});
  try {
    db.exec('PRAGMA query_only=ON'); assertIntegrity(db, filename);
    const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    return {integrity: 'ok', userVersion: db.prepare('PRAGMA user_version').get().user_version,
      tables: tables.map(({name}) => ({name, rows: db.prepare(`SELECT count(*) AS n FROM ${quote(name)}`).get().n})),
      content: tablesDigest(db, {ignoreDocument: false, ignorePool: false}),
      schema: db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all()};
  } finally { db.close(); }
}

async function copySnapshot(source, destination, layout) {
  fs.mkdirSync(destination, {mode: 0o700}); // exclusive: never reuse or erase a previous attempt
  const databases = [];
  for (const file of layout.files) {
    if (layout.sidecar(file)) continue;
    const from = path.join(source, file), to = path.join(destination, file);
    fs.mkdirSync(path.dirname(to), {recursive: true, mode: 0o700});
    if (layout.databases.has(file)) {
      const db = new DatabaseSync(from, {readOnly: true});
      let sourceProof;
      try {
        db.exec('PRAGMA query_only=ON'); assertIntegrity(db, file);
        sourceProof = {version: db.prepare('PRAGMA user_version').get().user_version,
          content: tablesDigest(db, {ignoreDocument: false, ignorePool: false}),
          schema: db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all()};
        await backup(db, to);
      }
      finally { db.close(); }
      fs.chmodSync(to, 0o600);
      // This is a newly created snapshot. DELETE mode avoids copying sidecars later.
      const clean = new DatabaseSync(to);
      try { clean.exec('PRAGMA journal_mode=DELETE'); assertIntegrity(clean, file); }
      finally { clean.close(); }
      const summary = databaseSummary(to);
      same({version: summary.userVersion, content: summary.content, schema: summary.schema}, sourceProof,
        'migration_copy_parity', 'Die Datenbankkopie ist nicht inhaltsgleich: ' + file);
      databases.push({file, method: 'SQLite backup; committed WAL included', contentParity: true, ...summary});
    } else { fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL); fs.chmodSync(to, 0o600); }
  }
  return {databases, files: filesIn(destination).map(file => ({file, bytes: fs.statSync(path.join(destination, file)).size, sha256: fileHash(path.join(destination, file))}))};
}

async function makeBackup(paths, id) {
  const before = sourceFingerprint(paths.source);
  const copied = await copySnapshot(paths.source, paths.saved, before.layout);
  const after = sourceFingerprint(paths.source);
  if (before.sha256 !== after.sha256) fail('migration_source_changed', 'Die Quelle wurde während der Sicherung verändert. Bitte den lokalen Schreibbetrieb anhalten und einen neuen Sicherungsordner verwenden.');
  const manifest = {schema: 'gravuru-product-resource-backup/v1', id, createdAt: new Date().toISOString(), sourceDirectory: paths.source,
    backupDirectory: paths.saved, sourceDataUnchanged: true, sourceFingerprint: before.sha256, sourceFiles: before.records, ...copied};
  const manifestFile = path.join(paths.saved, `migration-backup-${id}.json`); jsonFile(manifestFile, manifest);
  return {manifest, manifestFile, manifestSha256: fileHash(manifestFile)};
}

/** A standalone fresh backup, useful before any code/data experiment. */
export async function createProductDocumentBackup({sourceDirectory, backupDirectory} = {}) {
  return makeBackup(pathsFor(sourceDirectory, undefined, backupDirectory), randomUUID());
}

function rowsStatement(db, sql) { const stmt = db.prepare(sql); stmt.setReadBigInts(true); return stmt; }
function scalar(value) {
  if (typeof value === 'bigint') return ['integer', value.toString()];
  if (value instanceof Uint8Array) return ['blob', Buffer.from(value).toString('hex')];
  return [typeof value, value];
}
function tablesDigest(db, {ignoreDocument = true, ignorePool = true} = {}) {
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND (?=0 OR name<>?) ORDER BY name").all(ignorePool ? 1 : 0, POOL);
  return tables.map(({name}) => {
    const allColumns = db.prepare(`PRAGMA table_info(${quote(name)})`).all();
    const columns = allColumns.filter(c => !ignoreDocument || name !== 'product_revisions' || c.name !== 'document');
    const table = db.prepare('PRAGMA table_list').all().find(row => row.schema === 'main' && row.name === name);
    // VACUUM can renumber hidden rowids. Several existing stores use them as
    // cursors/version values, so they are protected data as well as user columns.
    let rowid = null, rowidAlias = '__migration_rowid';
    if (!table?.wr) {
      rowid = ['rowid', '_rowid_', 'oid'].find(key => !allColumns.some(c => c.name.toLowerCase() === key));
      if (!rowid) fail('migration_rowid_unaddressable', 'Interne Zeilen-ID ist nicht prüfbar: ' + name);
      while (allColumns.some(c => c.name === rowidAlias)) rowidAlias += '_';
    }
    const order = columns.filter(c => c.pk).sort((a, b) => a.pk - b.pk);
    const fields = [...columns.map(c => quote(c.name)), ...(rowid ? [`${quote(rowid)} AS ${quote(rowidAlias)}`] : [])].join(',');
    const ordering = rowid ? quote(rowid) : (order.length ? order : columns).map(c => quote(c.name)).join(',');
    const hash = createHash('sha256'); let count = 0;
    for (const row of rowsStatement(db, `SELECT ${fields} FROM ${quote(name)} ORDER BY ${ordering}`).iterate()) {
      hash.update(JSON.stringify([...columns.map(c => scalar(row[c.name])), ...(rowid ? [scalar(row[rowidAlias])] : [])]) + '\n'); count++;
    }
    return {name, rows: count, rowidsChecked: Boolean(rowid), sha256: hash.digest('hex')};
  });
}
function schemaDigest(db) {
  return db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE tbl_name<>? AND name NOT LIKE 'sqlite_%' ORDER BY type,name").all(POOL);
}
function same(a, b, code, message) { if (JSON.stringify(a) !== JSON.stringify(b)) fail(code, message); }
function hasMarker(value) {
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, '$gravuruResource')) return true;
  return Object.values(value).some(hasMarker);
}
function references(text) {
  const config = JSON.parse(text)?.config, values = Object.values(config?.localResources?.fonts ?? {});
  values.push(config?.materialSurface);
  return values.filter(value => value && typeof value === 'object' && Object.hasOwn(value, '$gravuruResource')).length;
}
function assertNoReferences(db) {
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>?").all(POOL);
  for (const {name} of tables) {
    const columns = db.prepare(`PRAGMA table_info(${quote(name)})`).all();
    for (const row of db.prepare(`SELECT * FROM ${quote(name)}`).iterate()) for (const {name: field} of columns) {
      const value = row[field];
      if (typeof value !== 'string' || !value.includes('$gravuruResource')) continue;
      let parsed; try { parsed = JSON.parse(value); } catch { continue; }
      if (hasMarker(parsed)) fail('migration_unexpanded_reference', `Ein interner Verweis bleibt in ${name}.${field}; die gemeinsame Ablage wird nicht entfernt.`);
    }
  }
}

function resourceSummary(db) {
  if (!db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(POOL)) return {resourceBytes: 0, resources: [], uniqueKinds: []};
  const resources = [], kinds = new Map(); let resourceBytes = 0;
  for (const row of db.prepare(`SELECT tenant_id,kind,sha256,value_json FROM ${POOL} ORDER BY tenant_id,kind,sha256`).iterate()) {
    if (sha(row.value_json) !== row.sha256) fail('migration_resource_corrupt', 'Eine gemeinsame Ressource hat einen falschen Inhalts-Hash.');
    const size = bytes(row.value_json); resourceBytes += size;
    resources.push({tenantId: row.tenant_id, kind: row.kind, sha256: row.sha256, bytes: size});
    const kind = kinds.get(row.kind) ?? {kind: row.kind, rows: 0, bytes: 0}; kind.rows++; kind.bytes += size; kinds.set(row.kind, kind);
  }
  return {resourceBytes, resources, uniqueKinds: [...kinds.values()]};
}

function transform(filename, mode) {
  const beforeBytes = fs.statSync(filename).size, db = new DatabaseSync(filename);
  let committed = false;
  try {
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (![4, 5].includes(version)) fail('migration_schema', 'Nur bestehende Werkstatt-Schemata 4 und 5 werden kopiert; ältere Schemata zuerst separat prüfen.');
    const trigger = db.prepare("SELECT sql FROM sqlite_schema WHERE type='trigger' AND name='immutable_revision_update'").get();
    if (!trigger || normalSql(trigger.sql) !== normalSql(UPDATE_TRIGGER)) fail('migration_trigger', 'Der unveränderliche Revisionstrigger entspricht nicht dem bekannten Original.');
    const revisionColumns = db.prepare('PRAGMA table_info(product_revisions)').all(), columns = revisionColumns.map(c => c.name);
    for (const name of ['product_id', 'revision', 'document', 'created_at', 'status', 'metadata', 'tenant_id']) if (!columns.includes(name)) fail('migration_schema', 'Revisionsspalte fehlt: ' + name);
    const primaryKey = revisionColumns.filter(c => c.pk).sort((a, b) => a.pk - b.pk).map(c => c.name);
    if (JSON.stringify(primaryKey) !== JSON.stringify(['product_id', 'revision'])) fail('migration_schema', 'Der Revisionsschlüssel entspricht nicht dem bekannten Schema.');
    if (!db.prepare('PRAGMA table_info(products)').all().some(c => c.name === 'tenant_id')) fail('migration_schema', 'Mandantenspalte der Produkte fehlt.');
    const select = 'SELECT *, tenant_id AS migration_tenant FROM product_revisions WHERE product_id=? AND revision=?';
    const keys = db.prepare('SELECT product_id,revision FROM product_revisions ORDER BY product_id,revision').all();
    const beforeTables = tablesDigest(db), beforeSchema = schemaDigest(db), proofs = [];
    let changedRows = 0, rawDocBytesBefore = 0, rawDocBytesAfter = 0, hydratedDocBytes = 0, referenceCount = 0, referencedRows = 0;
    db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
    try {
      if (mode === 'compact') initializeProductDocumentResources(db);
      db.exec('DROP TRIGGER immutable_revision_update');
      const read = db.prepare(select), write = db.prepare('UPDATE product_revisions SET document=? WHERE product_id=? AND revision=?');
      for (const key of keys) {
        const row = read.get(key.product_id, key.revision), options = {tenantId: row.migration_tenant};
        const original = readStoredDocumentText(db, row.document, options);
        const stored = mode === 'compact' ? encodeStoredDocument(db, original, options) : original;
        if (readStoredDocumentText(db, stored, options) !== original) fail('migration_document_parity', 'Ein Produktstand wurde beim Kodieren verändert.');
        if (stored !== row.document) { write.run(stored, key.product_id, key.revision); changedRows++; }
        const saved = read.get(key.product_id, key.revision);
        if (saved.document !== stored || readStoredDocumentText(db, saved.document, options) !== original) fail('migration_document_parity', 'Ein gespeicherter Produktstand stimmt nicht mit dem Original überein.');
        const count = references(stored); referenceCount += count; referencedRows += count > 0 ? 1 : 0;
        rawDocBytesBefore += bytes(row.document); rawDocBytesAfter += bytes(stored); hydratedDocBytes += bytes(original);
        proofs.push({productId: key.product_id, revision: key.revision, tenantId: row.migration_tenant, bytes: bytes(original), sha256: sha(original), storedBeforeSha256: sha(row.document), storedAfterSha256: sha(stored)});
      }
      if (mode === 'expand') { assertNoReferences(db); db.exec(`DROP TABLE IF EXISTS ${POOL}`); }
      db.exec(trigger.sql); db.exec(`PRAGMA user_version=${mode === 'compact' ? 5 : 4}`);
      same(tablesDigest(db), beforeTables, 'migration_other_data_changed', 'Metadaten oder andere Tabellen wurden verändert.');
      same(schemaDigest(db), beforeSchema, 'migration_other_schema_changed', 'Ein anderer Teil des Datenbankschemas wurde verändert.');
      assertIntegrity(db, filename); resourceSummary(db);
      db.exec('COMMIT'); committed = true;
    } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
    // Space is physically returned only in this newly created, verified database.
    db.exec('VACUUM'); assertIntegrity(db, filename);
    same(tablesDigest(db), beforeTables, 'migration_other_data_changed', 'Datenparität nach VACUUM fehlgeschlagen.');
    const read = db.prepare(select);
    for (const proof of proofs) {
      const row = read.get(proof.productId, proof.revision), original = readStoredDocumentText(db, row.document, {tenantId: proof.tenantId});
      if (sha(original) !== proof.sha256 || bytes(original) !== proof.bytes || sha(row.document) !== proof.storedAfterSha256) fail('migration_document_parity', 'Historischer Produktstand besteht die abschließende Prüfung nicht.');
    }
    return {beforeBytes, afterBytes: fs.statSync(filename).size, beforeSchemaVersion: version, afterSchemaVersion: mode === 'compact' ? 5 : 4,
      rows: keys.length, changedRows, referencedRows, references: referenceCount, rawDocBytesBefore, rawDocBytesAfter, hydratedDocBytes,
      ...resourceSummary(db), documentHashParity: true, historicalRows: proofs, protectedTables: beforeTables,
      immutableTriggerRestored: true, vacuum: true, integrity: 'ok'};
  } catch (error) { error.targetTransactionCommitted = committed; throw error; }
  finally { db.close(); }
}

/**
 * Source and backup are never mutated. Failed attempts are retained, never
 * deleted or reused. Rollback means expanding into ANOTHER new target or using
 * the original, complete backup with the previous application version.
 */
export async function migrateProductDocumentResources({sourceDirectory, targetDirectory, backupDirectory, mode = 'compact'} = {}) {
  if (!['compact', 'expand'].includes(mode)) fail('migration_mode', 'Modus muss compact oder expand sein.');
  if (typeof targetDirectory !== 'string' || !targetDirectory.trim()) fail('migration_path', 'Ein neuer Zielordner ist erforderlich.');
  const paths = pathsFor(sourceDirectory, targetDirectory, backupDirectory), id = randomUUID();
  const saved = await makeBackup(paths, id);
  await copySnapshot(paths.saved, paths.target, sourceLayout(paths.saved));
  const reportFile = path.join(paths.target, `migration-report-${id}.json`);
  try {
    const result = transform(path.join(paths.target, 'workshop.sqlite'), mode);
    const report = {schema: 'gravuru-product-resource-migration/v1', id, createdAt: new Date().toISOString(), status: 'verified', mode,
      sourceDirectory: paths.source, targetDirectory: paths.target, backupDirectory: paths.saved,
      backupManifest: saved.manifestFile, backupManifestSha256: saved.manifestSha256, sourceDataUnchanged: true,
      ...result, companionDatabases: saved.manifest.databases.filter(row => row.file !== 'workshop.sqlite'),
      rollback: 'Use the complete original backup, or expand this target into another new directory; never overwrite the source.'};
    jsonFile(reportFile, report); return {...report, reportFile};
  } catch (error) {
    jsonFile(reportFile, {schema: 'gravuru-product-resource-migration/v1', id, status: 'failed', mode, code: error.code ?? 'migration_failed',
      message: error.message, backupManifest: saved.manifestFile, backupManifestSha256: saved.manifestSha256,
      targetTransactionCommitted: error.targetTransactionCommitted ?? false, sourceDataUnchanged: true,
      recovery: 'The complete backup is preserved. Do not use the failed target; retry with new target and backup directories.'});
    error.reportFile = reportFile; throw error;
  }
}

export function parseMigrationArguments(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const names = {'--source': 'sourceDirectory', '--target': 'targetDirectory', '--backup': 'backupDirectory', '--mode': 'mode'}, options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!names[args[i]] || args[i + 1] === undefined || args[i + 1].startsWith('--') || Object.hasOwn(options, names[args[i]])) fail('migration_arguments', 'Erwartet: --source ORDNER --target NEUER_ORDNER --backup NEUER_ORDNER [--mode compact|expand]');
    options[names[args[i]]] = args[i + 1];
  }
  if (!options.sourceDirectory || !options.targetDirectory || !options.backupDirectory) fail('migration_arguments', '--source, --target und --backup sind erforderlich.');
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = parseMigrationArguments(process.argv.slice(2));
    if (!options) console.log('node scripts/migrate-product-document-resources.mjs --source DATA --target NEW_DATA --backup NEW_BACKUP [--mode compact|expand]\nSource is read only; all three directories must be separate. Stop local writes while taking the snapshot.');
    else { const result = await migrateProductDocumentResources(options); console.log(JSON.stringify({status: result.status, mode: result.mode, rows: result.rows, beforeBytes: result.beforeBytes, afterBytes: result.afterBytes, documentHashParity: result.documentHashParity, reportFile: result.reportFile})); }
  } catch (error) { console.error(JSON.stringify({status: 'failed', code: error.code ?? 'migration_failed', message: error.message, reportFile: error.reportFile})); process.exitCode = 1; }
}
