import {createHash, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {isNativeReviewSchema} from './native-review-schema.mjs';
import {tenantOption, ensureTenantColumns, TENANT_COLUMN} from './tenant.mjs';
import {cartTimingRead} from './shop-cart-timing.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => {throw Object.assign(new Error(message), {status, code: 'acrylic_draft'});};

// Ownership is separate from the immutable review manifest and its archive.
// Only a freshly prepared server bundle may be attached, never a browser-supplied
// snapshot ID. These methods do not confer Shopify customer-account identity.
export function createAcrylicDraftStore({database: db, capture, tenantId}) {
  const tenant = tenantOption({tenantId});
  db.exec(`CREATE TABLE IF NOT EXISTS acrylic_customer_drafts (
    id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, product_id TEXT NOT NULL,
    product_revision INTEGER NOT NULL, design_id TEXT NOT NULL, revision INTEGER NOT NULL,
    snapshot_id TEXT NOT NULL, created_at TEXT NOT NULL, ${TENANT_COLUMN});
    CREATE TABLE IF NOT EXISTS acrylic_customer_revisions (
      draft_id TEXT NOT NULL, revision INTEGER NOT NULL, snapshot_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL, ${TENANT_COLUMN}, PRIMARY KEY(draft_id,revision));
    CREATE TRIGGER IF NOT EXISTS acrylic_draft_identity_fixed
      BEFORE UPDATE OF id,token_hash,product_id,product_revision,design_id,created_at ON acrylic_customer_drafts
      BEGIN SELECT RAISE(ABORT,'Acrylic draft identity is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS acrylic_customer_revision_fixed BEFORE UPDATE ON acrylic_customer_revisions
      BEGIN SELECT RAISE(ABORT,'Acrylic revisions are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS acrylic_customer_revision_no_delete BEFORE DELETE ON acrylic_customer_revisions
      BEGIN SELECT RAISE(ABORT,'Acrylic revisions require explicit retention'); END;`);
  ensureTenantColumns(db, ['acrylic_customer_drafts', 'acrylic_customer_revisions']);
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try {const result = fn(); db.exec('COMMIT'); return result;}
    catch (error) {db.exec('ROLLBACK'); throw error;}
  };
  const auth = (id, token) => {
    const row = typeof id === 'string' && cartTimingRead('draft_row_read',()=>db.prepare('SELECT * FROM acrylic_customer_drafts WHERE id=? AND tenant_id=?').get(id, tenant));
    if (!row || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) ||
        !timingSafeEqual(Buffer.from(hash(token)), Buffer.from(row.token_hash))) fail(404, 'Dieser private Acrylentwurf ist nicht zugänglich.');
    return row;
  };
  const publicRow = row => ({id: row.id, productId: row.product_id, productRevision: row.product_revision,
    designId: row.design_id, revision: row.revision, snapshotId: row.snapshot_id});
  function validate(bundle) {
    const m = bundle?.manifest;
    if (!isNativeReviewSchema(m?.schema) || typeof m.id !== 'string' ||
        typeof m.product?.id !== 'string' || !Number.isSafeInteger(m.product.revision) || m.product.revision < 1 ||
        typeof m.source?.designId !== 'string' || !Buffer.isBuffer(bundle.package) || hash(bundle.package) !== m.packageSha256) {
      fail(422, 'Ein vollständiger serverseitig geprüfter Acrylstand ist erforderlich.');
    }
    return m;
  }
  function revision(id, version, snapshotId, at) {
    db.prepare('INSERT INTO acrylic_customer_revisions(draft_id,revision,snapshot_id,created_at,tenant_id) VALUES(?,?,?,?,?)').run(id, version, snapshotId, at, tenant);
  }
  return {
    get: (id, token) => publicRow(auth(id, token)),
    create(bundle) {
      const m = validate(bundle);
      return transaction(() => {
        const id = 'adraft_' + randomUUID(), token = randomBytes(32).toString('hex'), at = new Date().toISOString();
        capture(bundle);
        db.prepare('INSERT INTO acrylic_customer_drafts(id,token_hash,product_id,product_revision,design_id,revision,snapshot_id,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?,?)')
          .run(id, hash(token), m.product.id, m.product.revision, m.source.designId, 1, m.id, at, tenant);
        revision(id, 1, m.id, at);
        return {...publicRow(auth(id, token)), token};
      });
    },
    save(id, token, expectedRevision, bundle) {
      return transaction(() => {
        const row = auth(id, token);
        if (row.revision !== expectedRevision) fail(409, 'Der Acrylentwurf wurde inzwischen geändert. Bitte den aktuellen Stand laden.');
        const m = validate(bundle);
        if (m.product.id !== row.product_id || m.product.revision !== row.product_revision || m.source.designId !== row.design_id)
          fail(409, 'Produktstand und Design müssen zum ursprünglichen Acrylentwurf gehören.');
        capture(bundle);
        const version = row.revision + 1;
        revision(id, version, m.id, new Date().toISOString());
        db.prepare('UPDATE acrylic_customer_drafts SET revision=?,snapshot_id=? WHERE id=? AND tenant_id=?').run(version, m.id, id, tenant);
        return publicRow(auth(id, token));
      });
    },
  };
}
