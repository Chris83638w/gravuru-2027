import {createHash, randomUUID} from 'node:crypto';
import {outputDownload} from './print-delivery.mjs';

const fail = (status, message) => {throw Object.assign(Error(message), {status, code: 'customer_download'});};
const hidden = () => fail(404, 'Diese Datei ist nicht verfügbar.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Explicit, revocable TEST grants. A paid webhook alone never releases a proof.
// This store does not change manufacturing approval or existing order documents.
export function createCustomerDownloads({database: db, orders, jobs, printProof, clock = Date.now}) {
  db.exec(`CREATE TABLE IF NOT EXISTS customer_file_grants(id TEXT PRIMARY KEY, line_id TEXT NOT NULL, job_id TEXT NOT NULL, format TEXT NOT NULL, sha256 TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS customer_file_revocations(grant_id TEXT PRIMARY KEY, actor TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS customer_grant_fixed BEFORE UPDATE ON customer_file_grants BEGIN SELECT RAISE(ABORT,'Grants are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS customer_grant_keep BEFORE DELETE ON customer_file_grants BEGIN SELECT RAISE(ABORT,'Revoke grants explicitly'); END;
    CREATE TRIGGER IF NOT EXISTS customer_revoke_fixed BEFORE UPDATE ON customer_file_revocations BEGIN SELECT RAISE(ABORT,'Revocations are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS customer_revoke_keep BEFORE DELETE ON customer_file_revocations BEGIN SELECT RAISE(ABORT,'Revocations are immutable'); END;`);
  const stamp = () => new Date(clock()).toISOString();
  function merchant(principal, line) {
    if (principal?.role !== 'merchant' || principal.shopDomain !== line.shopDomain || !/^[1-9][0-9]{0,19}$/.test(principal.subject || '')) hidden();
  }
  function eligible(line) {
    const status = orders.status(line.id);
    if (line.test !== true || !orders.customer(line.id) || status.state !== 'paid' || status.requiresReview || !status.updatedAt) fail(409, 'Bestätigte Testzahlung, Kundenbindung und aktueller Zahlungsstatus erforderlich.');
  }
  function file(line, jobId, format) {
    if (!['pdf', 'white-pdf', 'zip'].includes(format)) fail(422, 'PDF, Weiß-PDF oder ausdrücklich gewähltes Datenpaket erforderlich.');
    const job = jobs.get(jobId);
    if (job.snapshotId !== line.snapshotId || job.status !== 'completed') fail(409, 'Ausgabe gehört nicht zum gesicherten Bestellstand.');
    const result = printProof(job.snapshotId, job.recipeKey); if (!result) fail(409, 'Gesicherte Ausgabe fehlt.');
    const download = outputDownload(result, format), sha256 = hash(download.bytes);
    const expected = format === 'pdf' ? result.metadata.downloads?.pdf?.sha256 || result.metadata.pdfSha256 : format === 'white-pdf' ? result.metadata.downloads?.white?.sha256 : result.metadata.packageSha256;
    if (expected && expected !== sha256) fail(409, 'Ausgabedatei weicht vom Nachweis ab.');
    return {...download, sha256};
  }
  const get = id => {const row = typeof id === 'string' && db.prepare('SELECT * FROM customer_file_grants WHERE id=?').get(id); if (!row) hidden(); return row;};
  const revoked = id => Boolean(db.prepare('SELECT 1 FROM customer_file_revocations WHERE grant_id=?').get(id));
  return {
    available(principal, before) {
      if (principal?.role !== 'customer' || typeof principal.subject !== 'string' || !/^gid:\/\/shopify\/Customer\/[1-9][0-9]{0,19}$/.test(principal.subject)) hidden();
      if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) fail(422, 'Ungültige Fortsetzung.');
      const rows = db.prepare(`SELECT g.rowid AS cursor,g.id,g.line_id,g.format,g.created_at,l.order_id FROM customer_file_grants g
        JOIN form_order_lines l ON l.id=g.line_id JOIN form_order_customers c ON c.shop=l.shop AND c.order_id=l.order_id
        WHERE c.shop=? AND c.customer_id=? AND g.rowid<? AND NOT EXISTS(SELECT 1 FROM customer_file_revocations r WHERE r.grant_id=g.id)
        ORDER BY g.rowid DESC LIMIT 51`).all(principal.shopDomain, principal.subject, before ?? Number.MAX_SAFE_INTEGER);
      const page = rows.slice(0, 50), files = [];
      for (const row of page) {
        const status = orders.status(row.line_id);
        if (status.state === 'paid' && !status.requiresReview && status.updatedAt) files.push({id: row.id, orderId: row.order_id, format: row.format, createdAt: row.created_at});
      }
      return {files, nextBefore: rows.length > 50 ? page.at(-1).cursor : null, mode: 'test-only'};
    },
    grant({lineId, jobId, format = 'pdf'}, principal) {
      const line = orders.get(lineId); merchant(principal, line); eligible(line);
      const download = file(line, jobId, format);
      const existing = db.prepare('SELECT * FROM customer_file_grants g WHERE line_id=? AND job_id=? AND format=? AND sha256=? AND NOT EXISTS(SELECT 1 FROM customer_file_revocations r WHERE r.grant_id=g.id)').get(lineId, jobId, format, download.sha256);
      if (existing) return {id: existing.id, format, sha256: existing.sha256, mode: 'test-only'};
      const id = 'grant_' + randomUUID();
      db.prepare('INSERT INTO customer_file_grants VALUES(?,?,?,?,?,?,?)').run(id, lineId, jobId, format, download.sha256, principal.subject, stamp());
      return {id, format, sha256: download.sha256, mode: 'test-only'};
    },
    revoke(id, principal) {
      const row = get(id); merchant(principal, orders.get(row.line_id));
      db.prepare('INSERT OR IGNORE INTO customer_file_revocations VALUES(?,?,?)').run(id, principal.subject, stamp());
      return {id, revoked: true};
    },
    list(lineId, principal) {
      merchant(principal, orders.get(lineId));
      return db.prepare('SELECT id,job_id AS jobId,format,sha256,created_at AS createdAt FROM customer_file_grants WHERE line_id=? ORDER BY rowid DESC').all(lineId).map(row => ({...row, revoked: revoked(row.id), mode: 'test-only'}));
    },
    download(id, principal) {
      const row = get(id), line = orders.get(row.line_id);
      if (principal?.role !== 'customer' || principal.shopDomain !== line.shopDomain || principal.subject !== orders.customer(line.id) || revoked(id)) hidden();
      eligible(line);
      const download = file(line, row.job_id, row.format);
      if (download.sha256 !== row.sha256) fail(409, 'Freigegebene Datei wurde verändert.');
      return download;
    }
  };
}
