import {createHash} from 'node:crypto';
import {inspectAmazonCustomSample, AMAZON_CUSTOM_LIMITS} from './amazon-custom.mjs';

// Local approved test samples only. Original bytes are private SQLite BLOBs, never
// extracted, rendered, fetched, or supplied by this module to a manufacturing job.
const SCHEMA = 'gravuru-amazon-custom-manual-import/v1';
const SOURCE = new Set(['synthetic', 'anonymized']);
const HASH = /^[a-f0-9]{64}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => createHash('sha256').update(typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value)).digest('hex');
const clone = value => structuredClone(value);
const fail = (code, status = 422) => {throw Object.assign(Error({
  amazon_custom_import_input: 'Ungültige Eingaben für den Custom-Testimport.',
  amazon_custom_import_source: 'Nur ausdrücklich bestätigte synthetische oder anonymisierte Testdateien sind zugelassen.',
  amazon_custom_import_match: 'Bestellnummer, Position und SKU stimmen nicht genau mit der ausgewählten Testbestellung überein.',
  amazon_custom_import_order: 'Diese Amazon-Testposition ist für den Custom-Import oder die Bestätigung gesperrt.',
  amazon_custom_import_stale: 'Der Custom-Prüfstand wurde geändert. Bitte den aktuellen Stand laden.',
  amazon_custom_import_order_changed: 'Die Amazon-Bestellung wurde seit dem Import geändert. Bitte einen neuen Prüfstand anlegen.',
  amazon_custom_import_replaced: 'Diese Originaldatei gehört zu einem älteren ersetzten Stand. Sie wird nicht stillschweigend wieder aktiviert.',
  amazon_custom_import_missing: 'Für diese Position ist kein Custom-Prüfstand vorhanden.',
  amazon_custom_import_mapping: 'Bitte ausschließlich vorhandene sichere Text-, Options- oder Bildfelder eindeutig zuordnen.',
  amazon_custom_import_review: 'Die bestätigte Zuordnung entspricht nicht der zuvor geprüften Vorschau.',
  amazon_custom_import_integrity: 'Der gesicherte Custom-Prüfstand hat die Integritätsprüfung nicht bestanden.'
}[code] || 'Custom-Testimport konnte nicht verarbeitet werden.'), {code, status});};
function exact(value, keys) {if (!object(value) || Object.keys(value).some(key => !keys.includes(key))) fail('amazon_custom_import_input');}
function versionInput(version, digest) {
  if (!Number.isSafeInteger(version) || version < 0 || (version === 0 ? digest !== null : typeof digest !== 'string' || !HASH.test(digest))) fail('amazon_custom_import_input');
}
const metadata = report => ({...report, candidates: report.candidates.map(({value, ...field}) => field), valuesIncluded: false});
const sensitivePath = path => path.split('/').some(part => /^(?:buyer|recipient|customer|shipping|billing|address(?:line\d+)?|addresses|deliveryaddress|shippingaddress|billingaddress|email|emailaddress|phone|phonenumber|telephone|mobile|contact|contactdetails|street|streetnumber|postalcode|postcode|zipcode|city|country)$/u.test(part.replace(/~1/gu, '/').replace(/~0/gu, '~').toLowerCase().replace(/[^a-z0-9]/gu, '')));
function safeText(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f<>\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(value) ||
      /[a-z][a-z0-9+.-]*:\/\//iu.test(value) || /^(?:data|javascript|file):/iu.test(value) || value.startsWith('//') || /[^\s@]+@[^\s@]+\.[^\s@]+/u.test(value)) fail('amazon_custom_import_mapping');
  return value;
}
function mappedFields(mapping, report) {
  exact(mapping, ['texts', 'options', 'images']);
  const result = {texts: [], options: [], images: []}, normalized = {texts: [], options: [], images: []};
  const labels = new Set(), fields = new Set(); let characters = 0;
  for (const kind of ['texts', 'options', 'images']) {
    const entries = mapping[kind] ?? [];
    if (!Array.isArray(entries) || entries.length > (kind === 'images' ? 16 : 32)) fail('amazon_custom_import_mapping');
    for (const entry of entries) {
      exact(entry, kind === 'images' ? ['file', 'sha256', 'label'] : ['file', 'path', 'label']);
      const label = safeText(entry.label, 80);
      if (label.includes('\n') || label.includes('\r') || labels.has(label.normalize('NFC').toLowerCase())) fail('amazon_custom_import_mapping');
      labels.add(label.normalize('NFC').toLowerCase());
      if (typeof entry.file !== 'string') fail('amazon_custom_import_mapping');
      if (kind === 'images') {
        const file = report.inventory.find(file => file.name === entry.file && file.sha256 === entry.sha256 && file.type === 'image');
        const key = JSON.stringify([entry.file, entry.sha256]);
        if (!file || fields.has(key)) fail('amazon_custom_import_mapping'); fields.add(key);
        normalized.images.push({file: entry.file, sha256: entry.sha256, label});
        result.images.push({label, file: file.name, sha256: file.sha256, bytes: file.bytes, type: 'image', verified: false, rendered: false});
      } else {
        if (typeof entry.path !== 'string' || sensitivePath(entry.path)) fail('amazon_custom_import_mapping');
        const candidate = report.candidates.find(field => field.file === entry.file && field.path === entry.path);
        const key = JSON.stringify([entry.file, entry.path]);
        if (!candidate || candidate.valueRedacted || fields.has(key) || candidate.kind !== (kind === 'texts' ? 'text' : 'design')) fail('amazon_custom_import_mapping');
        let value = candidate.value;
        if (kind === 'options' && (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e9)) value = String(value);
        value = safeText(value, kind === 'texts' ? 1024 : 256); characters += value.length;
        if (characters > 4096) fail('amazon_custom_import_mapping'); fields.add(key);
        normalized[kind].push({file: entry.file, path: entry.path, label});
        result[kind].push({label, value, file: entry.file, path: entry.path});
      }
    }
  }
  if (!fields.size) fail('amazon_custom_import_mapping');
  return {mapping: normalized, customization: result};
}

/**
 * Mutations are append-only. Orders must be the existing Amazon order store.
 * Caller owns authorization, private DB encryption/backup, and HTTP CSRF checks.
 * No original-byte download method is exposed and no network transport is used.
 */
export function createAmazonCustomImportStore({database: db, orders, clock = Date.now} = {}) {
  if (!db || typeof db.prepare !== 'function' || typeof db.exec !== 'function' || !orders || typeof orders.get !== 'function' || typeof orders.status !== 'function' || typeof clock !== 'function') fail('amazon_custom_import_input');
  db.exec(`CREATE TABLE IF NOT EXISTS amazon_custom_originals(
    sha256 TEXT PRIMARY KEY, format TEXT NOT NULL, classification TEXT NOT NULL, bytes BLOB NOT NULL, byte_length INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS amazon_custom_import_revisions(
    line_id TEXT NOT NULL, version INTEGER NOT NULL, hash TEXT NOT NULL UNIQUE, source_sha256 TEXT NOT NULL,
    status TEXT NOT NULL, document TEXT NOT NULL, PRIMARY KEY(line_id,version));
    CREATE INDEX IF NOT EXISTS amazon_custom_source_revisions ON amazon_custom_import_revisions(line_id,source_sha256,version);`);
  for (const table of ['amazon_custom_originals', 'amazon_custom_import_revisions']) db.exec(`
    CREATE TRIGGER IF NOT EXISTS ${table}_fixed BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'Custom originals and revisions are immutable');END;
    CREATE TRIGGER IF NOT EXISTS ${table}_keep BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'Custom originals require explicit retention');END;`);
  const tx = fn => {if (db.isTransaction) return fn(); db.exec('BEGIN IMMEDIATE'); try {const result = fn(); db.exec('COMMIT'); return result;} catch (error) {db.exec('ROLLBACK'); throw error;}};
  const at = () => {const value = new Date(clock()); if (!Number.isFinite(value.getTime())) fail('amazon_custom_import_input'); return value.toISOString();};
  function checkedDocument(row) {
    if (!row) return null;
    let document; try {document = JSON.parse(row.document);} catch {fail('amazon_custom_import_integrity', 409);}
    if (hash(document) !== row.hash || document.lineId !== row.line_id || document.version !== row.version || document.sourceSha256 !== row.source_sha256 || document.status !== row.status) fail('amazon_custom_import_integrity', 409);
    return {...document, hash: row.hash};
  }
  function current(lineId, version) {
    if (typeof lineId !== 'string' || !/^amazonline_[a-f0-9-]{36}$/u.test(lineId)) fail('amazon_custom_import_input');
    if (version !== undefined && (!Number.isSafeInteger(version) || version < 1)) fail('amazon_custom_import_input');
    return checkedDocument(version === undefined ? db.prepare('SELECT * FROM amazon_custom_import_revisions WHERE line_id=? ORDER BY version DESC LIMIT 1').get(lineId) : db.prepare('SELECT * FROM amazon_custom_import_revisions WHERE line_id=? AND version=?').get(lineId, version));
  }
  function orderContext(lineId) {
    const line = orders.get(lineId), state = orders.status(lineId);
    if (line.test !== true || !['synthetic', 'anonymized', 'sandbox'].includes(line.provenance) || state.cancelled || state.cancellationRequested || state.conflict || state.missing || state.changed ||
        line.fulfilledBy !== 'MERCHANT' || !['UNSHIPPED', 'PARTIALLY_SHIPPED'].includes(line.fulfillmentStatus) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || typeof line.sku !== 'string' || !line.sku) fail('amazon_custom_import_order', 409);
    return {accountId: line.accountId, provenance: line.provenance, marketplaceId: line.marketplaceId, orderId: line.orderId, orderItemId: line.lineId,
      sku: line.sku, quantity: line.quantity, fulfilledBy: line.fulfilledBy, fulfillmentStatus: line.fulfillmentStatus, updatedAt: line.updatedAt};
  }
  function matchContext(context, input) {
    if (typeof input.orderId !== 'string' || typeof input.orderItemId !== 'string' || typeof input.sku !== 'string' || context.orderId !== input.orderId || context.orderItemId !== input.orderItemId || context.sku !== input.sku) fail('amazon_custom_import_match');
  }
  function compare(currentRecord, expectedVersion, expectedHash) {
    versionInput(expectedVersion, expectedHash);
    if ((currentRecord?.version ?? 0) !== expectedVersion || (currentRecord?.hash ?? null) !== expectedHash) fail('amazon_custom_import_stale', 409);
  }
  function append(document) {
    const digest = hash(document);
    db.prepare('INSERT INTO amazon_custom_import_revisions VALUES(?,?,?,?,?,?)').run(document.lineId, document.version, digest, document.sourceSha256, document.status, JSON.stringify(document));
    return {...document, hash: digest};
  }
  function inspection(record) {
    const row = db.prepare('SELECT * FROM amazon_custom_originals WHERE sha256=?').get(record.sourceSha256);
    if (!row || row.format !== record.format || row.classification !== record.classification || row.byte_length !== row.bytes.length || hash(row.bytes) !== record.sourceSha256) fail('amazon_custom_import_integrity', 409);
    return inspectAmazonCustomSample({bytes: row.bytes, format: record.format, source: {classification: record.classification, operatorApproved: true}});
  }
  function prepareReview(input) {
    const record = current(input.lineId); if (!record) fail('amazon_custom_import_missing', 404);
    compare(record, input.expectedVersion, input.expectedHash);
    const context = orderContext(input.lineId);
    if (hash(context) !== record.contextHash) fail('amazon_custom_import_order_changed', 409);
    const report = inspection(record), mapped = mappedFields(input.mapping, report);
    const content = {lineId: input.lineId, expectedVersion: record.version, expectedHash: record.hash, sourceSha256: record.sourceSha256,
      contextHash: record.contextHash, classification: record.classification, ...mapped};
    return {record, mapped, reviewHash: hash(content), context, report};
  }
  function result(record) {
    if (!record) return null;
    const copy = clone(record); delete copy.mapping;
    return {...copy, test: true, productionReady: false, networkEnabled: false, scope: 'manually_selected_fields_only', unknownSchema: true};
  }
  const service = {
    importSample(input) {
      exact(input, ['lineId', 'orderId', 'orderItemId', 'sku', 'bytes', 'format', 'classification', 'operatorApproved', 'expectedVersion', 'expectedHash']);
      versionInput(input.expectedVersion, input.expectedHash);
      if (!SOURCE.has(input.classification) || input.operatorApproved !== true) fail('amazon_custom_import_source', 403);
      if (!(input.bytes instanceof Uint8Array) || !input.bytes.length || input.bytes.length > AMAZON_CUSTOM_LIMITS.archiveBytes || !['json', 'zip'].includes(input.format)) fail('amazon_custom_import_input');
      const bytes = Buffer.from(input.bytes); // Keep an owned immutable copy before hashing or validation.
      const report = inspectAmazonCustomSample({bytes, format: input.format, source: {classification: input.classification, operatorApproved: true}});
      return tx(() => {
        const context = orderContext(input.lineId); matchContext(context, input);
        const old = current(input.lineId), contextHash = hash(context), sourceSha256 = report.originalSha256;
        if (old?.sourceSha256 === sourceSha256 && old.classification === input.classification && old.format === input.format && old.contextHash === contextHash) return {...result(old), duplicate: true};
        compare(old, input.expectedVersion, input.expectedHash);
        // A changed order requires a newly acknowledged version, even for the same bytes.
        if (old && old.sourceSha256 !== sourceSha256 && db.prepare('SELECT 1 FROM amazon_custom_import_revisions WHERE line_id=? AND source_sha256=?').get(input.lineId, sourceSha256)) fail('amazon_custom_import_replaced', 409);
        const existing = db.prepare('SELECT format,classification,byte_length FROM amazon_custom_originals WHERE sha256=?').get(sourceSha256);
        if (existing && (existing.format !== input.format || existing.classification !== input.classification || existing.byte_length !== bytes.length)) fail('amazon_custom_import_source', 409);
        const createdAt = at();
        if (!existing) db.prepare('INSERT INTO amazon_custom_originals VALUES(?,?,?,?,?,?)').run(sourceSha256, input.format, input.classification, bytes, bytes.length, createdAt);
        const record = append({schema: SCHEMA, lineId: input.lineId, version: (old?.version ?? 0) + 1, previousHash: old?.hash ?? null,
          sourceSha256, format: input.format, classification: input.classification, status: 'pending_review', context, contextHash,
          createdAt, operatorApproved: true, inspection: metadata(report), customization: null, reviewHash: null, mapping: null});
        return {...result(record), duplicate: false};
      });
    },
    get(lineId, {version} = {}) {return result(current(lineId, version));},
    history(lineId) {
      current(lineId);
      return db.prepare('SELECT * FROM amazon_custom_import_revisions WHERE line_id=? ORDER BY version').all(lineId).map(row => {
        const record = checkedDocument(row);
        return {lineId, version: record.version, hash: record.hash, previousHash: record.previousHash, sourceSha256: record.sourceSha256,
          status: record.status, classification: record.classification, createdAt: record.createdAt, productionReady: false};
      });
    },
    review(input) {
      exact(input, ['lineId', 'expectedVersion', 'expectedHash', 'mapping']);
      const prepared = prepareReview(input);
      return {lineId: input.lineId, expectedVersion: prepared.record.version, expectedHash: prepared.record.hash, reviewHash: prepared.reviewHash,
        sourceSha256: prepared.record.sourceSha256, classification: prepared.record.classification, customization: prepared.mapped.customization,
        unknownFields: prepared.report.unknownFields, warnings: prepared.report.warnings, reviewRequired: true,
        unmappedCandidateCount: prepared.report.candidates.length - prepared.mapped.mapping.texts.length - prepared.mapped.mapping.options.length,
        scope: 'manually_selected_fields_only', unknownSchema: true, productionReady: false, test: true};
    },
    confirm(input) {
      exact(input, ['lineId', 'expectedVersion', 'expectedHash', 'mapping', 'reviewHash', 'operatorApproved']);
      if (input.operatorApproved !== true) fail('amazon_custom_import_source', 403);
      if (typeof input.reviewHash !== 'string' || !HASH.test(input.reviewHash)) fail('amazon_custom_import_review');
      versionInput(input.expectedVersion, input.expectedHash);
      return tx(() => {
        // A lost successful response can be retried verbatim. This is only the
        // immediately preceding review, and still checks current order + bytes.
        const latest = current(input.lineId);
        if (latest?.status === 'confirmed' && latest.version === input.expectedVersion + 1 && latest.previousHash === input.expectedHash && latest.reviewHash === input.reviewHash) {
          if (hash(orderContext(input.lineId)) !== latest.contextHash) fail('amazon_custom_import_order_changed', 409);
          const replay = mappedFields(input.mapping, inspection(latest));
          if (JSON.stringify(replay.mapping) !== JSON.stringify(latest.mapping) || JSON.stringify(replay.customization) !== JSON.stringify(latest.customization)) fail('amazon_custom_import_review', 409);
          return {...result(latest), duplicate: true};
        }
        const prepared = prepareReview(input);
        if (input.reviewHash !== prepared.reviewHash) fail('amazon_custom_import_review', 409);
        const old = prepared.record;
        if (old.status === 'confirmed' && JSON.stringify(old.mapping) === JSON.stringify(prepared.mapped.mapping)) return {...result(old), duplicate: true};
        const {hash: oldHash, ...document} = old;
        const record = append({...document, version: old.version + 1, previousHash: oldHash, status: 'confirmed', createdAt: at(),
          mapping: prepared.mapped.mapping, customization: prepared.mapped.customization, reviewHash: prepared.reviewHash});
        return {...result(record), duplicate: false};
      });
    },
    paperworkSummary(lineId) {
      const record = current(lineId);
      const empty = reason => ({approved: false, present: Boolean(record), sourceSha256: record?.sourceSha256 ?? null, version: record?.version ?? 0, hash: record?.hash ?? null,
        provenance: record?.classification ?? null, texts: [], options: [], images: [], reason,
        productionReady: false, test: true, scope: 'manually_selected_fields_only', unknownSchema: true});
      if (!record) return empty('custom_import_missing');
      if (record.status !== 'confirmed') return empty('custom_review_pending');
      let context;
      try {context = orderContext(lineId);} catch (error) {if (error.code === 'amazon_custom_import_order') return empty(error.code); throw error;}
      if (hash(context) !== record.contextHash) return empty('amazon_custom_import_order_changed');
      // Recheck originals and explicit mapping so corruption never reaches paperwork.
      const mapped = mappedFields(record.mapping, inspection(record));
      if (JSON.stringify(mapped.customization) !== JSON.stringify(record.customization)) fail('amazon_custom_import_integrity', 409);
      return {approved: true, present: true, provenance: record.classification, sourceSha256: record.sourceSha256, version: record.version, hash: record.hash,
        texts: mapped.customization.texts.map(({label, value}) => ({label, value})), options: mapped.customization.options.map(({label, value}) => ({label, value})),
        images: mapped.customization.images, productionReady: false, test: true, scope: 'manually_selected_fields_only', unknownSchema: true,
        reviewRequiredForProduction: true, geometryMapped: false};
    }
  };
  return Object.freeze(service);
}
