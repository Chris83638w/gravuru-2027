// K8 (Ü9.1): Konfigurations-ID und Revision je Warenkorbübergabe. Die Inhalte liegen
// weiterhin im unveränderlichen Prüfstand (form_review_snapshots); dieses Register
// ordnet ihnen nur eine stabile, nach außen sichtbare Kennung und eine fortlaufende
// Revision zu. Zeilen werden nie geändert oder gelöscht; die Warenkorbzeile wird
// genau einmal nachgetragen, sobald der Shop sie bestätigt hat.
import {randomUUID} from 'node:crypto';
import {tenantOption,ensureTenantColumns,TENANT_COLUMN} from './tenant.mjs';

const fail = (status, code, message) => {
  throw Object.assign(new Error(message), {status, code, retryable: false, paymentConfirmed: false});
};
export const CART_CONFIG_ID = /^konfig_[a-f0-9-]{36}$/;
export const CART_LINE_ID = /^gid:\/\/shopify\/CartLine\/[^\s"'<>]{1,512}$/;
const draftId = v => typeof v === 'string' && /^(?:adraft|draft)_[a-f0-9-]{36}$/.test(v);
const row = r => ({id: r.config_id, rev: r.rev, draftId: r.draft_id, draftRevision: r.draft_revision,
  snapshotId: r.snapshot_id, offerId: r.offer_id, cartId: r.cart_id, lineId: r.line_id, createdAt: r.created_at});

export function createCartConfigurations({database: db, clock = Date.now, tenantId}) {
  const tenant = tenantOption({tenantId});
  // Claim before the browser POST: a lost reply must not cause a second upload.
  db.exec(`CREATE TABLE IF NOT EXISTS theme_cart_transfers (offer_id TEXT NOT NULL, nonce TEXT NOT NULL, created_at TEXT NOT NULL, tenant_id TEXT NOT NULL, PRIMARY KEY(offer_id,tenant_id));`);
  db.exec(`CREATE TABLE IF NOT EXISTS cart_configurations (
      id TEXT PRIMARY KEY, draft_id TEXT NOT NULL UNIQUE, product_id TEXT NOT NULL, created_at TEXT NOT NULL, ${TENANT_COLUMN});
    CREATE TABLE IF NOT EXISTS cart_configuration_revisions (
      config_id TEXT NOT NULL, rev INTEGER NOT NULL, draft_id TEXT NOT NULL, draft_revision INTEGER NOT NULL,
      snapshot_id TEXT NOT NULL, offer_id TEXT NOT NULL UNIQUE, cart_id TEXT, line_id TEXT, created_at TEXT NOT NULL, ${TENANT_COLUMN},
      PRIMARY KEY(config_id, rev));
    CREATE TRIGGER IF NOT EXISTS cart_configuration_fixed BEFORE UPDATE ON cart_configurations
      BEGIN SELECT RAISE(ABORT,'Cart configurations are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS cart_configuration_keep BEFORE DELETE ON cart_configurations
      BEGIN SELECT RAISE(ABORT,'Cart configurations are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS cart_configuration_revision_fixed
      BEFORE UPDATE OF config_id,rev,draft_id,draft_revision,snapshot_id,offer_id,created_at ON cart_configuration_revisions
      BEGIN SELECT RAISE(ABORT,'Cart configuration revisions are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS cart_configuration_line_once
      BEFORE UPDATE OF cart_id,line_id ON cart_configuration_revisions WHEN OLD.cart_id IS NOT NULL OR OLD.line_id IS NOT NULL
      BEGIN SELECT RAISE(ABORT,'Cart line of a revision is attached once'); END;
    CREATE TRIGGER IF NOT EXISTS cart_configuration_revision_keep BEFORE DELETE ON cart_configuration_revisions
      BEGIN SELECT RAISE(ABORT,'Cart configuration revisions are immutable'); END;`);
  ensureTenantColumns(db, ['cart_configurations', 'cart_configuration_revisions']);
  const tx = fn => {
    if (db.isTransaction) return fn();
    db.exec('BEGIN IMMEDIATE');
    try {const v = fn(); db.exec('COMMIT'); return v;}
    catch (e) {db.exec('ROLLBACK'); throw e;}
  };
  const at = () => new Date(clock()).toISOString();
  const get = (id, rev) => db.prepare('SELECT * FROM cart_configuration_revisions WHERE config_id=? AND rev=? AND tenant_id=?').get(id, rev, tenant);
  const latestRow = id => db.prepare('SELECT * FROM cart_configuration_revisions WHERE config_id=? AND tenant_id=? ORDER BY rev DESC LIMIT 1').get(id, tenant);

  return {
    claimThemeTransfer(offerId,nonce){
      if(typeof offerId!=='string'||!/^offer_[A-Za-z0-9_-]{1,100}$/.test(offerId)||typeof nonce!=='string'||!/^[a-f0-9]{64}$/.test(nonce))fail(422,'theme_cart_claim','Die Warenkorbübergabe ist ungültig.');
      return tx(()=>{
        if(!db.prepare('SELECT 1 FROM cart_configuration_revisions WHERE offer_id=? AND tenant_id=?').get(offerId,tenant))fail(404,'theme_cart_claim','Diese Gestaltung ist nicht bekannt.');
        if(db.prepare('SELECT 1 FROM theme_cart_transfers WHERE offer_id=? AND tenant_id=?').get(offerId,tenant))fail(409,'theme_cart_uncertain','Diese Übertragung wurde bereits begonnen. Bitte den Warenkorb prüfen; die Gestaltung wird nicht erneut hinzugefügt.');
        db.prepare('INSERT INTO theme_cart_transfers(offer_id,nonce,created_at,tenant_id) VALUES(?,?,?,?)').run(offerId,nonce,at(),tenant);
        return {claimed:true};
      });
    },
    // Erste Übergabe eines Entwurfs: neue Kennung, Revision 1. Jede weitere Übergabe mit
    // einem anderen Angebot: Revision n+1. Dasselbe Angebot bekommt wieder dieselbe Revision.
    assign({draftId: draft, draftRevision, snapshotId, offerId, productId}) {
      if (!draftId(draft) || !Number.isSafeInteger(draftRevision) || draftRevision < 1 ||
          typeof snapshotId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(snapshotId) ||
          typeof offerId !== 'string' || !/^offer_[A-Za-z0-9_-]{1,100}$/.test(offerId) || typeof productId !== 'string' || !productId) {
        fail(422, 'cart_configuration', 'Konfiguration braucht Entwurf, Prüfstand und gesichertes Angebot.');
      }
      return tx(() => {
        const known = db.prepare('SELECT * FROM cart_configuration_revisions WHERE offer_id=? AND tenant_id=?').get(offerId, tenant);
        if (known) {
          if (known.draft_id !== draft || known.snapshot_id !== snapshotId) fail(409, 'cart_configuration', 'Dieses Angebot gehört zu einem anderen Konfigurationsstand.');
          return {...row(known), created: false};
        }
        let config = db.prepare('SELECT * FROM cart_configurations WHERE draft_id=? AND tenant_id=?').get(draft, tenant);
        if (config && config.product_id !== productId) fail(409, 'cart_configuration', 'Die Konfiguration gehört zu einem anderen Produkt.');
        if (!config) {
          config = {id: 'konfig_' + randomUUID()};
          db.prepare('INSERT INTO cart_configurations(id,draft_id,product_id,created_at,tenant_id) VALUES(?,?,?,?,?)').run(config.id, draft, productId, at(), tenant);
        }
        const rev = (latestRow(config.id)?.rev ?? 0) + 1;
        db.prepare('INSERT INTO cart_configuration_revisions (config_id,rev,draft_id,draft_revision,snapshot_id,offer_id,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)')
          .run(config.id, rev, draft, draftRevision, snapshotId, offerId, at(), tenant);
        return {...row(get(config.id, rev)), created: true};
      });
    },
    forDraft(draft) {
      const config = draftId(draft) && db.prepare('SELECT * FROM cart_configurations WHERE draft_id=? AND tenant_id=?').get(draft, tenant);
      if (!config) return null;
      const latest = latestRow(config.id);
      return {id: config.id, draftId: draft, productId: config.product_id, rev: latest?.rev ?? 0};
    },
    revision(id, rev) {
      const r = typeof id === 'string' && CART_CONFIG_ID.test(id) && Number.isSafeInteger(rev) && rev >= 1 && get(id, rev);
      if (!r) fail(404, 'cart_configuration', 'Diese Konfigurations-Revision ist nicht bekannt.');
      return row(r);
    },
    latest(id) {
      const r = typeof id === 'string' && CART_CONFIG_ID.test(id) && latestRow(id);
      if (!r) fail(404, 'cart_configuration', 'Diese Konfiguration ist nicht bekannt.');
      return row(r);
    },
    byOffer(offerId) {
      const r = typeof offerId === 'string' && db.prepare('SELECT * FROM cart_configuration_revisions WHERE offer_id=? AND tenant_id=?').get(offerId, tenant);
      return r ? row(r) : null;
    },
    // Jüngste Revision vor `before`, die der Shop als Warenkorbzeile bestätigt hat.
    lastCartLine(id, {before}) {
      const r = typeof id === 'string' && Number.isSafeInteger(before) &&
        db.prepare('SELECT * FROM cart_configuration_revisions WHERE config_id=? AND rev<? AND cart_id IS NOT NULL AND tenant_id=? ORDER BY rev DESC LIMIT 1').get(id, before, tenant);
      return r ? row(r) : null;
    },
    attachCartLine(id, rev, {cartId, lineId}) {
      if (typeof cartId !== 'string' || !cartId.startsWith('gid://shopify/Cart/') || typeof lineId !== 'string' || !CART_LINE_ID.test(lineId)) {
        fail(422, 'cart_configuration', 'Warenkorbzeile ist nicht bestätigt.');
      }
      return tx(() => {
        const r = get(id, rev);
        if (!r) fail(404, 'cart_configuration', 'Diese Konfigurations-Revision ist nicht bekannt.');
        if (r.cart_id !== null || r.line_id !== null) {
          if (r.cart_id !== cartId || r.line_id !== lineId) fail(409, 'cart_configuration', 'Diese Revision ist bereits einer anderen Warenkorbzeile zugeordnet.');
          return row(r);
        }
        db.prepare('UPDATE cart_configuration_revisions SET cart_id=?,line_id=? WHERE config_id=? AND rev=? AND tenant_id=?').run(cartId, lineId, id, rev, tenant);
        return row(get(id, rev));
      });
    },
  };
}
