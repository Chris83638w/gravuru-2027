import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {createProductCatalog} from './product-catalog.mjs';
import {tenantOption,ensureTenantColumn,TENANT_COLUMN} from './tenant.mjs';

const OWNED_FIELDS = ['id', 'revision', 'publishedRevision', 'status', 'createdAt', 'updatedAt', 'metadata'];

function failure(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

/** A local, synchronous SQLite store. Documents are immutable JSON snapshots. */
export function createProductRepository({ filename, validateDocument = (value) => value, snapshotMetadata = () => ({}),catalogOverview=()=>({}),tenantId }) {
  if (typeof filename !== 'string' || !filename) throw new TypeError('A database filename is required.');
  // K13: Alle Lese- und Schreibzugriffe dieses Stores gehören genau einem Mandanten.
  const tenant=tenantOption({tenantId});
  if (typeof snapshotMetadata !== 'function') throw new TypeError('snapshotMetadata must be a synchronous function.');
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  const transact = (work) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    transact(() => {
      const version = db.prepare('PRAGMA user_version').get().user_version;
      if (version > 4) throw failure(422, 'unsupported_database_version', 'Die Datenbank benötigt eine neuere Anwendung.');
      if (version === 0) {
        db.exec(`
          CREATE TABLE products (
            id TEXT PRIMARY KEY,
            revision INTEGER NOT NULL CHECK (revision >= 1),
            published_revision INTEGER,
            archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
            name TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('product', 'master')),
            master_id TEXT REFERENCES products(id),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (id, revision) REFERENCES product_revisions(product_id, revision) DEFERRABLE INITIALLY DEFERRED,
            FOREIGN KEY (id, published_revision) REFERENCES product_revisions(product_id, revision) DEFERRABLE INITIALLY DEFERRED
          );
          CREATE TABLE product_revisions (
            product_id TEXT NOT NULL REFERENCES products(id),
            revision INTEGER NOT NULL CHECK (revision >= 1),
            document TEXT NOT NULL CHECK (json_valid(document)),
            published_revision INTEGER,
            status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
            created_at TEXT NOT NULL,
            PRIMARY KEY (product_id, revision)
          );
          CREATE INDEX products_name ON products(name COLLATE NOCASE);
          CREATE INDEX products_master ON products(master_id);
          CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON product_revisions
            BEGIN SELECT RAISE(ABORT, 'Product revisions are immutable'); END;
          CREATE TRIGGER immutable_revision_delete BEFORE DELETE ON product_revisions
            BEGIN SELECT RAISE(ABORT, 'Product revisions are immutable'); END;
          PRAGMA user_version = 1;
        `);
      }
      if(version<2)db.exec(`CREATE TABLE import_items (
        import_key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL,
        product_id TEXT NOT NULL REFERENCES products(id), created_at TEXT NOT NULL
      ); PRAGMA user_version = 2;`);
      if (version < 3) db.exec(`ALTER TABLE product_revisions
        ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata));
        PRAGMA user_version = 3;`);
      if (version < 4) {
        // K13: Mandant je Produkt und Revision; Importschlüssel sind je Mandant eindeutig (Tabelle neu aufgebaut, Altdaten = Standardmandant).
        ensureTenantColumn(db, 'products'); ensureTenantColumn(db, 'product_revisions');
        db.exec(`CREATE TABLE import_items_v4 (
          import_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
          product_id TEXT NOT NULL REFERENCES products(id), created_at TEXT NOT NULL, ${TENANT_COLUMN},
          PRIMARY KEY (tenant_id, import_key)
        ); INSERT INTO import_items_v4 (import_key, fingerprint, product_id, created_at) SELECT import_key, fingerprint, product_id, created_at FROM import_items;
        DROP TABLE import_items; ALTER TABLE import_items_v4 RENAME TO import_items;
        PRAGMA user_version = 4;`);
      }
    });
  } catch (error) {
    db.close();
    throw error;
  }

  const catalog=transact(()=>createProductCatalog(db,catalogOverview,tenant));
  function product(id) {
    const row = typeof id === 'string' ? db.prepare('SELECT * FROM products WHERE id = ? AND tenant_id = ?').get(id, tenant) : null;
    if (!row) throw failure(404, 'not_found', 'Konfiguration nicht gefunden.');
    return row;
  }

  function snapshot(id, revision) {
    const row = db.prepare('SELECT * FROM product_revisions WHERE product_id = ? AND revision = ? AND tenant_id = ?').get(id, revision, tenant);
    if (!row) throw failure(404, 'revision_not_found', 'Revision nicht gefunden.');
    return row;
  }

  function positiveRevision(revision) {
    if (!Number.isSafeInteger(revision) || revision < 1) {
      throw failure(422, 'invalid_revision', 'Eine gültige erwartete Revision ist erforderlich.');
    }
  }

  function expected(row, revision) {
    positiveRevision(revision);
    if (row.revision !== revision) {
      throw Object.assign(failure(409, 'revision_conflict', 'Die Konfiguration wurde zwischenzeitlich geändert. Bitte neu laden.'), {
        expectedRevision: revision, actualRevision: row.revision,
      });
    }
  }

  function documentValue(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Produktdokument muss ein Objekt sein.');
      for (const field of OWNED_FIELDS) {
        if (Object.hasOwn(value, field)) throw new Error(`Das Feld ${field} wird von der Datenbank vergeben.`);
      }
      // Detach both input and validator output so neither can mutate a saved revision.
      const validated = validateDocument(JSON.parse(JSON.stringify(value)));
      if (!validated || typeof validated !== 'object' || Array.isArray(validated) || typeof validated.then === 'function') {
        throw new Error('Die Dokumentprüfung muss synchron ein Produktdokument zurückgeben.');
      }
      const document = JSON.parse(JSON.stringify(validated));
      for (const field of OWNED_FIELDS) {
        if (Object.hasOwn(document, field)) throw new Error(`Das Feld ${field} gehört nicht zum Produktdokument.`);
      }
      if (typeof document.name !== 'string' || !document.name.trim()) throw new Error('Ein Produktname ist erforderlich.');
      if (!['product', 'master'].includes(document.kind)) throw new Error('Ungültige Produktart.');
      if (document.masterId !== null && typeof document.masterId !== 'string') throw new Error('Ungültige Masterreferenz.');
      if (document.kind === 'master' && document.masterId !== null) throw new Error('Eine Mastervorlage darf keine Masterreferenz besitzen.');
      return document;
    } catch (error) {
      if (error.status === 422) throw error;
      throw failure(422, 'invalid_document', error.message || 'Ungültiges Produktdokument.');
    }
  }

  function reference(document, id) {
    if (document.masterId === null) return;
    const master = db.prepare('SELECT kind FROM products WHERE id = ? AND tenant_id = ?').get(document.masterId, tenant);
    if (!master || master.kind !== 'master' || document.masterId === id) {
      throw failure(422, 'invalid_master', 'Die referenzierte Mastervorlage existiert nicht.');
    }
  }

  function record(row, revision = row.revision) {
    const snap = snapshot(row.id, revision);
    return {
      id: row.id, revision: snap.revision, publishedRevision: snap.published_revision,
      status: snap.status, document: JSON.parse(snap.document), metadata: JSON.parse(snap.metadata),
      createdAt: row.created_at, updatedAt: snap.created_at,
    };
  }

  const state = (row) => row.archived ? 'archived' : row.published_revision !== null ? 'active' : 'draft';

  function insertSnapshot(row, document) {
    let metadata;
    try {
      // The callback must neither alter the validated document nor retain mutable snapshot data.
      const value = snapshotMetadata(JSON.parse(JSON.stringify(document)));
      if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.then === 'function') {
        throw new Error('Revisionsmetadaten müssen synchron als JSON-Objekt zurückgegeben werden.');
      }
      metadata = JSON.stringify(value);
      const detached = JSON.parse(metadata);
      if (!detached || typeof detached !== 'object' || Array.isArray(detached)) {
        throw new Error('Revisionsmetadaten müssen ein JSON-Objekt sein.');
      }
    } catch (error) {
      throw failure(422, 'invalid_snapshot_metadata', error?.message || 'Revisionsmetadaten konnten nicht gespeichert werden.');
    }
    db.prepare(`INSERT INTO product_revisions
      (product_id, revision, document, published_revision, status, created_at, metadata, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(row.id, row.revision, JSON.stringify(document), row.published_revision, state(row), row.updated_at, metadata, tenant);
    catalog.update(row,document);
  }

  function createInside(document) {
    const id = `cfg_${randomUUID()}`;
    reference(document, id);
    const timestamp = new Date().toISOString();
    db.prepare(`INSERT INTO products
      (id, revision, published_revision, archived, name, kind, master_id, created_at, updated_at, tenant_id)
      VALUES (?, 1, NULL, 0, ?, ?, ?, ?, ?, ?)`)
      .run(id, document.name, document.kind, document.masterId, timestamp, timestamp, tenant);
    const row = product(id);
    insertSnapshot(row, document);
    return record(row);
  }

  function append(row, document, { archived = row.archived, publish = false } = {}) {
    reference(document, row.id);
    // A referenced master cannot change its type: existing copies retain valid provenance.
    if (row.kind === 'master' && document.kind !== 'master' &&
        db.prepare('SELECT 1 FROM products WHERE master_id = ? AND tenant_id = ? LIMIT 1').get(row.id, tenant)) {
      throw failure(422, 'master_in_use', 'Diese Mastervorlage wird bereits von Produkten referenziert.');
    }
    const revision = row.revision + 1;
    const published = publish ? revision : row.published_revision;
    db.prepare(`UPDATE products SET revision = ?, published_revision = ?, archived = ?,
      name = ?, kind = ?, master_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .run(revision, published, archived, document.name, document.kind, document.masterId, new Date().toISOString(), row.id, tenant);
    const updated = product(row.id);
    insertSnapshot(updated, document);
    return record(updated);
  }

  return {
    transactionalImportGuards: true,
    tenantId:tenant,
    firstId:()=>db.prepare('SELECT id FROM products WHERE tenant_id = ? ORDER BY created_at,id LIMIT 1').get(tenant)?.id||null,
    catalog:options=>catalog.list(options),
    // The dry-run uses the same pure validation as the transactional write.
    validate(document) { return documentValue(document); },
    previewMetadata(document) { return JSON.parse(JSON.stringify(snapshotMetadata(JSON.parse(JSON.stringify(document))))); },
    importItem(key) {
      const row=db.prepare('SELECT * FROM import_items WHERE import_key = ? AND tenant_id = ?').get(key, tenant);
      return row ? {key:row.import_key,fingerprint:row.fingerprint,id:row.product_id} : null;
    },
    importBatch(entries, { beforeWrite } = {}) {
      if(!Array.isArray(entries)||entries.length<1||entries.length>100)throw failure(422,'invalid_batch','Eine Serie umfasst 1 bis 100 Produkte.');
      if(beforeWrite!==undefined&&typeof beforeWrite!=='function')throw failure(422,'invalid_import_guard','Die Anlageprüfung ist ungültig.');
      return transact(()=>{
        // A reviewed creation plan is rechecked under the same write lock as
        // the actual product import. Callbacks are server-owned and synchronous.
        const guarded=beforeWrite?.();
        if(guarded&&typeof guarded.then==='function')throw failure(422,'async_import_guard','Die Anlageprüfung muss vor dem Schreiben abgeschlossen sein.');
        const keys=new Set(),targets=new Set();
        const validated=entries.map(entry=>{
          if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(entry.key)||keys.has(entry.key))throw failure(422,'invalid_import_key','Jede Zeile benötigt einen eindeutigen Importschlüssel.');
          keys.add(entry.key);
          if(!/^[a-f0-9]{64}$/.test(entry.fingerprint))throw failure(422,'invalid_fingerprint','Ungültiger Importstand.');
          const prior=db.prepare('SELECT * FROM import_items WHERE import_key = ? AND tenant_id = ?').get(entry.key, tenant);
          if(prior&&prior.fingerprint!==entry.fingerprint)throw failure(409,'import_key_conflict',`Importschlüssel ${entry.key} wurde bereits für andere Daten verwendet.`);
          if(entry.action!==undefined&&entry.action!=='update')throw failure(422,'invalid_action','Unbekannte Importaktion.');
          if(entry.action==='update'){
            if(targets.has(entry.productId))throw failure(422,'duplicate_target','Produkt mehrfach in einer Tabelle.');targets.add(entry.productId);
            const target=product(entry.productId);positiveRevision(entry.expectedRevision);
            if(prior&&prior.product_id!==entry.productId)throw failure(409,'import_key_conflict','Importschlüssel gehört zu einem anderen Produkt.');
            if(!prior){expected(target,entry.expectedRevision);if(target.archived||target.kind!=='product')throw failure(409,'inactive_target','Nur aktive Produkte können aktualisiert werden.');}
          }
          return {...entry,prior,document:documentValue(entry.document)};
        });
        return validated.map(entry=>{
          if(entry.prior)return {key:entry.key,id:entry.prior.product_id,created:false};
          const updating=entry.action==='update';
          const item=updating?append(product(entry.productId),entry.document):createInside(entry.document);
          db.prepare('INSERT INTO import_items (import_key, fingerprint, product_id, created_at, tenant_id) VALUES (?, ?, ?, ?, ?)').run(entry.key,entry.fingerprint,item.id,new Date().toISOString(),tenant);
          return {key:entry.key,id:item.id,created:!updating,...(updating?{updated:true,revision:item.revision}:{})};
        });
      });
    },
    create(document) {
      return transact(() => createInside(documentValue(document)));
    },
    get(id, { revision } = {}) {
      const row = product(id);
      if (revision !== undefined) positiveRevision(revision);
      return record(row, revision ?? row.revision);
    },
    list({ query = '', includeArchived = false } = {}) {
      if (typeof query !== 'string' || typeof includeArchived !== 'boolean') {
        throw failure(422, 'invalid_query', 'Ungültige Suchparameter.');
      }
      // Literal substring search; %, _ and SQL punctuation never become wildcards/code.
      const term = query.trim().toLowerCase();
      return db.prepare(`SELECT * FROM products WHERE tenant_id = ? AND (? = 1 OR archived = 0)
        ORDER BY updated_at DESC, id`).all(tenant, includeArchived ? 1 : 0)
        .filter((row) => !term || row.name.toLowerCase().includes(term) || row.id.toLowerCase().includes(term))
        .map((row) => ({ ...record(row), name: row.name, kind: row.kind, masterId: row.master_id }));
    },
    productionProfileUsage(profileId) {
      if(typeof profileId!=='string'||!/^mfg_[a-f0-9-]+$/.test(profileId))throw failure(422,'invalid_profile','Ungültiges Fertigungsprofil.');
      // Inspect current and internally activated revisions, not every historical snapshot.
      return db.prepare(`SELECT p.id,p.revision AS head,p.published_revision,p.archived,r.revision,
        json_extract(r.document,'$.name') AS name,json_extract(r.document,'$.kind') AS kind,
        json_extract(r.document,'$.schema') AS schema,json_extract(r.document,'$.productionProfile.revision') AS profileRevision
        FROM products p JOIN product_revisions r ON r.product_id=p.id
        AND (r.revision=p.revision OR r.revision=p.published_revision)
        WHERE p.tenant_id=? AND r.tenant_id=p.tenant_id AND json_extract(r.document,'$.productionProfile.id')=? ORDER BY p.name COLLATE NOCASE,p.id,r.revision DESC`).all(tenant, profileId)
        .map(r=>({id:r.id,name:r.name,kind:r.kind,schema:r.schema,revision:r.revision,profileRevision:r.profileRevision,
          current:r.revision===r.head,activated:r.revision===r.published_revision,archived:Boolean(r.archived)}));
    },
    // Reuse the existing atomic import journal for a reviewed, exactly-once save.
    saveOnce(id, document, expectedRevision, key, fingerprint) {
      if(!/^ai:air_[a-f0-9-]{36}$/.test(key)||! /^[a-f0-9]{64}$/.test(fingerprint))throw failure(422,'invalid_save_key','Ungültiger geprüfter Auftrag.');
      return transact(()=>{
        const prior=db.prepare('SELECT * FROM import_items WHERE import_key=? AND tenant_id=?').get(key, tenant);
        positiveRevision(expectedRevision);
        if(prior){if(prior.product_id!==id||prior.fingerprint!==fingerprint)throw failure(409,'save_key_conflict','Der Auftrag wurde für andere Daten verwendet.');return record(product(id),expectedRevision+1);}
        const row=product(id);expected(row,expectedRevision);
        if(row.archived)throw failure(409,'archived_product','Archivierte Produkte können nicht geändert werden.');
        const saved=append(row,documentValue(document));
        db.prepare('INSERT INTO import_items (import_key, fingerprint, product_id, created_at, tenant_id) VALUES (?,?,?,?,?)').run(key,fingerprint,id,new Date().toISOString(),tenant);
        return saved;
      });
    },
    save(id, document, expectedRevision) {
      return transact(() => {
        const row = product(id);
        expected(row, expectedRevision);
        return append(row, documentValue(document));
      });
    },
    copy(id, { expectedRevision, name, kind = 'product' } = {}) {
      return transact(() => {
        const row = product(id);
        expected(row, expectedRevision);
        const document = JSON.parse(snapshot(id, row.revision).document);
        document.name = name ?? `${document.name} – Kopie`;
        document.kind = kind;
        document.masterId = kind === 'master' ? null : row.kind === 'master' ? id : document.masterId;
        return createInside(documentValue(document));
      });
    },
    setArchived(id, { expectedRevision, archived } = {}) {
      return transact(() => {
        const row = product(id);
        expected(row, expectedRevision);
        if (typeof archived !== 'boolean') throw failure(422, 'invalid_archive_state', 'Archivstatus muss true oder false sein.');
        return append(row, JSON.parse(snapshot(id, row.revision).document), { archived: archived ? 1 : 0 });
      });
    },
    publish(id, { expectedRevision } = {}) {
      return transact(() => {
        const row = product(id);
        expected(row, expectedRevision);
        if (row.archived) throw failure(422, 'archived_product', 'Archivierte Konfigurationen können nicht veröffentlicht werden.');
        return append(row, documentValue(JSON.parse(snapshot(id, row.revision).document)), { publish: true });
      });
    },
    history(id) {
      const row = product(id);
      return db.prepare('SELECT revision FROM product_revisions WHERE product_id = ? AND tenant_id = ? ORDER BY revision DESC').all(id, tenant)
        .map(({ revision }) => record(row, revision));
    },
    restore(id, { expectedRevision, revision } = {}) {
      return transact(() => {
        const row = product(id);
        expected(row, expectedRevision);
        positiveRevision(revision);
        return append(row, documentValue(JSON.parse(snapshot(id, revision).document)));
      });
    },
    close() { db.close(); },
  };
}
