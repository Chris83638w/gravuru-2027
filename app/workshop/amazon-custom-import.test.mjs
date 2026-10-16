import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {crc32} from 'node:zlib';
import {createAmazonOrderStore} from './amazon-order-store.mjs';
import {amazonTestOrders} from './amazon-fixtures.mjs';
import {createAmazonCustomImportStore} from './amazon-custom-import.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sample = value => Buffer.from(JSON.stringify(value ?? {surface: {text: 'SYNTHETIC ENGRAVING', designVariant: 'Blue'}, unrecognized: 'NOT-FOR-GENERIC-OUTPUT'}));
const mapping = {texts: [{file: 'sample.json', path: '/surface/text', label: 'Gravurtext'}], options: [{file: 'sample.json', path: '/surface/designVariant', label: 'Design'}]};
function fixture(t) {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  let now = Date.parse('2026-10-16T12:00:00Z');
  const orders = createAmazonOrderStore({database: db, clock: () => now});
  const raw = amazonTestOrders()[0];
  const lines = orders.ingestPage({orders: [raw]}, {provenance: 'synthetic'}).lines;
  const line = lines.find(item => item.lineId === 'TEST-LINE-001');
  let store = createAmazonCustomImportStore({database: db, orders, clock: () => now});
  const input = patch => ({lineId: line.id, orderId: line.orderId, orderItemId: line.lineId, sku: line.sku, bytes: sample(), format: 'json', classification: 'synthetic', operatorApproved: true, expectedVersion: 0, expectedHash: null, ...patch});
  const reviewInput = (record, chosen = mapping) => ({lineId: line.id, expectedVersion: record.version, expectedHash: record.hash, mapping: chosen});
  const confirm = (record, chosen = mapping) => {const input = reviewInput(record, chosen), preview = store.review(input); return store.confirm({...input, reviewHash: preview.reviewHash, operatorApproved: true});};
  return {db, orders, raw, line, lines, input, reviewInput, confirm, get store() {return store;},
    reopen() {store = createAmazonCustomImportStore({database: db, orders, clock: () => now});},
    update(mutator, time = '2026-10-16T13:00:00Z') {const changed = structuredClone(raw); changed.lastUpdatedTime = time; mutator(changed); return orders.ingestPage({orders: [changed]}, {provenance: 'synthetic'});},
    advance() {now += 1000;}};
}
// Independent small stored ZIP writer, without filesystem access.
function zip(entries) {
  const local = [], central = []; let offset = 0;
  for (const [name, value] of entries) {
    const body = Buffer.from(value), filename = Buffer.from(name), crc = crc32(body), l = Buffer.alloc(30), c = Buffer.alloc(46);
    l.writeUInt32LE(0x04034b50); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x800, 6); l.writeUInt32LE(crc, 14);
    l.writeUInt32LE(body.length, 18); l.writeUInt32LE(body.length, 22); l.writeUInt16LE(filename.length, 26);
    c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(body.length, 24); c.writeUInt16LE(filename.length, 28); c.writeUInt32LE(offset, 42);
    local.push(l, filename, body); central.push(c, filename); offset += 30 + filename.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

test('manual import requires explicit test classification, approval and exact order/item/SKU', t => {
  const f = fixture(t);
  for (const patch of [{classification: 'real'}, {classification: 'sandbox'}, {operatorApproved: false}, {operatorApproved: 'true'}]) assert.throws(() => f.store.importSample(f.input(patch)), {code: 'amazon_custom_import_source'});
  for (const patch of [{orderId: 'different'}, {orderItemId: 'different'}, {sku: f.line.sku + ' '}, {orderId: undefined}]) assert.throws(() => f.store.importSample(f.input(patch)), {code: 'amazon_custom_import_match'});
  assert.throws(() => f.store.importSample(f.input({filename: f.line.orderId + '.json'})), {code: 'amazon_custom_import_input'});
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM amazon_custom_originals').get().n, 0);
  assert.equal(f.store.get(f.line.id), null);
  assert.equal(f.store.paperworkSummary(f.line.id).approved, false);
  assert.equal(f.store.paperworkSummary(f.line.id).present, false);
  assert.equal(f.store.paperworkSummary(f.line.id).version, 0);
  assert.equal(f.store.paperworkSummary(f.line.id).hash, null);
  assert.equal(f.store.paperworkSummary(f.line.id).sourceSha256, null);
});

test('original is retained byte-for-byte as a private BLOB; inventory has no candidate values', t => {
  const f = fixture(t), bytes = sample(), original = Buffer.from(bytes), record = f.store.importSample(f.input({bytes}));
  bytes.fill(0);
  assert.equal(record.version, 1); assert.equal(record.status, 'pending_review'); assert.equal(record.sourceSha256, sha(original));
  assert.equal(record.productionReady, false); assert.equal(record.networkEnabled, false); assert.equal(record.inspection.valuesIncluded, false);
  assert.ok(!JSON.stringify(record).includes('SYNTHETIC ENGRAVING')); assert.ok(!JSON.stringify(record).includes('NOT-FOR-GENERIC-OUTPUT'));
  assert.equal(record.inspection.candidates.some(field => Object.hasOwn(field, 'value')), false);
  assert.deepEqual(Buffer.from(f.db.prepare('SELECT bytes FROM amazon_custom_originals').get().bytes), original);
  assert.equal(f.store.paperworkSummary(f.line.id).reason, 'custom_review_pending');
  assert.equal(f.store.paperworkSummary(f.line.id).present, true);
  assert.equal(f.store.paperworkSummary(f.line.id).version, record.version);
  assert.equal(f.store.paperworkSummary(f.line.id).hash, record.hash);
  assert.equal(f.store.paperworkSummary(f.line.id).sourceSha256, record.sourceSha256);
  for (const table of ['amazon_custom_originals', 'amazon_custom_import_revisions']) {
    assert.throws(() => f.db.exec(`UPDATE ${table} SET ${table.endsWith('originals') ? "format='json'" : "status='confirmed'"}`), /immutable/);
    assert.throws(() => f.db.exec(`DELETE FROM ${table}`), /retention/);
  }
});

test('review is read-only; confirmation binds explicitly selected fields to reviewed hash/version', t => {
  const f = fixture(t), record = f.store.importSample(f.input()), input = f.reviewInput(record), preview = f.store.review(input);
  assert.equal(preview.customization.texts[0].value, 'SYNTHETIC ENGRAVING'); assert.equal(preview.customization.options[0].value, 'Blue');
  assert.equal(preview.unknownSchema, true); assert.equal(preview.reviewRequired, true); assert.equal(f.store.history(f.line.id).length, 1);
  assert.ok(!JSON.stringify(preview).includes('NOT-FOR-GENERIC-OUTPUT'));
  assert.throws(() => f.store.confirm({...input, reviewHash: '0'.repeat(64), operatorApproved: true}), {code: 'amazon_custom_import_review'});
  assert.throws(() => f.store.confirm({...input, reviewHash: preview.reviewHash, operatorApproved: false}), {code: 'amazon_custom_import_source'});
  const confirmed = f.store.confirm({...input, reviewHash: preview.reviewHash, operatorApproved: true});
  assert.equal(confirmed.version, 2); assert.equal(confirmed.status, 'confirmed'); assert.equal(confirmed.previousHash, record.hash);
  const summary = f.store.paperworkSummary(f.line.id);
  assert.equal(summary.approved, true); assert.equal(summary.provenance, 'synthetic'); assert.equal(summary.productionReady, false);
  assert.equal(summary.present, true);
  assert.deepEqual(summary.texts, [{label: 'Gravurtext', value: 'SYNTHETIC ENGRAVING'}]); assert.equal(summary.geometryMapped, false);
  assert.equal(f.store.get(f.line.id, {version: 1}).customization, null);
  const retried = f.store.confirm({...input, reviewHash: preview.reviewHash, operatorApproved: true});
  assert.equal(retried.duplicate, true); assert.equal(retried.hash, confirmed.hash);
  assert.equal(f.store.history(f.line.id).length, 2);
});

test('original hash deduplicates retries and reopen; replacement appends and suspends prior approval', t => {
  const f = fixture(t), record = f.store.importSample(f.input()), confirmed = f.confirm(record);
  f.reopen(); const duplicate = f.store.importSample(f.input());
  assert.equal(duplicate.duplicate, true); assert.equal(duplicate.hash, confirmed.hash); assert.equal(f.store.history(f.line.id).length, 2);
  const changed = sample({text: 'ANOTHER SYNTHETIC TEXT'});
  assert.throws(() => f.store.importSample(f.input({bytes: changed})), {code: 'amazon_custom_import_stale'});
  const replacement = f.store.importSample(f.input({bytes: changed, expectedVersion: confirmed.version, expectedHash: confirmed.hash}));
  assert.equal(replacement.version, 3); assert.equal(replacement.previousHash, confirmed.hash); assert.equal(replacement.status, 'pending_review');
  assert.equal(f.store.paperworkSummary(f.line.id).approved, false);
  assert.equal(f.store.get(f.line.id, {version: 2}).customization.texts[0].value, 'SYNTHETIC ENGRAVING');
  assert.throws(() => f.store.importSample(f.input({expectedVersion: replacement.version, expectedHash: replacement.hash})), {code: 'amazon_custom_import_replaced'});
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM amazon_custom_originals').get().n, 2);
  assert.equal(f.store.history(f.line.id).length, 3);
});

test('order changes invalidate confirmation and paperwork; same original needs new acknowledged revision', t => {
  const f = fixture(t), first = f.store.importSample(f.input()), confirmed = f.confirm(first);
  f.update(raw => {raw.orderItems[0].quantityOrdered = 3; raw.orderItems[0].fulfillment.quantityUnfulfilled = 3;});
  assert.equal(f.store.paperworkSummary(f.line.id).reason, 'amazon_custom_import_order_changed');
  assert.equal(f.store.paperworkSummary(f.line.id).present, true);
  assert.equal(f.store.paperworkSummary(f.line.id).hash, confirmed.hash);
  assert.throws(() => f.store.review(f.reviewInput(confirmed)), {code: 'amazon_custom_import_order_changed'});
  const next = f.store.importSample(f.input({expectedVersion: confirmed.version, expectedHash: confirmed.hash}));
  assert.equal(next.version, 3); assert.equal(next.context.quantity, 3); assert.equal(next.status, 'pending_review');
  f.confirm(next); assert.equal(f.store.paperworkSummary(f.line.id).approved, true);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM amazon_custom_originals').get().n, 1);
});

test('cancellations, buyer requests, conflicts and missing items block current review/import/paperwork', t => {
  for (const mutate of [raw => {raw.fulfillment.fulfillmentStatus = 'CANCELLED';}, raw => {raw.orderItems[0].cancellation = {cancellationRequest: {requester: 'BUYER'}};}, raw => {raw.orderItems = [];}]) {
    const f = fixture(t), confirmed = f.confirm(f.store.importSample(f.input())); f.update(mutate);
    assert.equal(f.store.paperworkSummary(f.line.id).approved, false);
    assert.throws(() => f.store.review(f.reviewInput(confirmed)), {code: 'amazon_custom_import_order'});
    assert.throws(() => f.store.importSample(f.input({expectedVersion: confirmed.version, expectedHash: confirmed.hash})), {code: 'amazon_custom_import_order'});
  }
  const f = fixture(t), first = f.store.importSample(f.input());
  f.update(raw => {raw.orderItems[0].product.price.unitPrice.amount = '25.00';}, f.raw.lastUpdatedTime);
  assert.throws(() => f.store.review(f.reviewInput(first)), {code: 'amazon_custom_import_order'});
});

test('mapping rejects empty/unknown paths, wrong field kinds, duplicates, sensitive paths and unsafe values', t => {
  const f = fixture(t), raw = sample({text: 'SAFE TEST', design: {variant: 'Blue', email: 'test@example.invalid', addressLine1: 'Synthetic Address'}, recipient: {name: 'NOT-A-PERSONALIZATION'}, image: 'https://example.invalid/signed', message: '<script>test</script>', name: 'test@example.invalid'});
  const record = f.store.importSample(f.input({bytes: raw})), field = (path, label = 'Test') => ({file: 'sample.json', path, label});
  for (const invalid of [{}, {texts: [field('/missing')]}, {texts: [field('/design/variant')]}, {options: [field('/text')]},
    {texts: [field('/text'), field('/text', 'Second')]}, {texts: [field('/text')], options: [field('/design/variant')]},
    {options: [field('/design/email')]}, {options: [field('/design/addressLine1')]}, {texts: [field('/recipient/name')]},
    {texts: [field('/message')]}, {texts: [field('/name')]}, {texts: [field('/text', '<unsafe>')]},
    {images: [{file: 'sample.json', sha256: record.sourceSha256, label: 'Not image'}]}, {texts: [{...field('/text'), value: 'forged'}]}]) {
    assert.throws(() => f.store.review(f.reviewInput(record, invalid)), error => ['amazon_custom_import_mapping', 'amazon_custom_import_input'].includes(error.code));
  }
  assert.equal(f.store.history(f.line.id).length, 1);
});

test('ZIP images remain hashes/inventory only; unsupported XML and geometry are not auto-mapped', t => {
  const f = fixture(t), image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bytes = zip([
    ['order.json', '{"text":"SYNTHETIC","position":{"x":10},"unknown":"NO-GENERIC-FLATTEN"}'],
    ['assets/photo.png', image], ['custom.xml', '<custom><text>NOT-PARSED</text></custom>']]);
  const record = f.store.importSample(f.input({bytes, format: 'zip'}));
  const chosen = {texts: [{file: 'order.json', path: '/text', label: 'Gravurtext'}], images: [{file: 'assets/photo.png', sha256: sha(image), label: 'Foto'}]};
  const confirmed = f.confirm(record, chosen), summary = f.store.paperworkSummary(f.line.id);
  assert.equal(summary.approved, true); assert.equal(summary.images[0].sha256, sha(image)); assert.equal(summary.images[0].verified, false); assert.equal(summary.images[0].rendered, false);
  assert.equal(confirmed.inspection.warnings.some(w => w.code === 'unsupported_xml_not_parsed'), true);
  assert.ok(!JSON.stringify(confirmed).includes('NO-GENERIC-FLATTEN')); assert.ok(!JSON.stringify(confirmed).includes('NOT-PARSED'));
  assert.equal(Object.hasOwn(summary.images[0], 'data'), false); assert.equal(summary.geometryMapped, false);
});

test('malformed, oversized, path-traversing, active SVG and entity XML samples never persist', t => {
  const f = fixture(t);
  for (const patch of [{bytes: Buffer.from('{broken')}, {bytes: Buffer.alloc(8 * 1024 * 1024 + 1)}, {bytes: zip([['../bad.json', '{}']]), format: 'zip'},
    {bytes: zip([['active.svg', '<svg><script>test</script></svg>']]), format: 'zip'},
    {bytes: zip([['bad.xml', '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///secret">]><x/>']]), format: 'zip'}]) assert.throws(() => f.store.importSample(f.input(patch)));
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM amazon_custom_originals').get().n, 0);
  assert.equal(f.store.history(f.line.id).length, 0);
});

test('test source cannot be reclassified silently; paperwork rechecks retained original integrity', t => {
  const f = fixture(t), confirmed = f.confirm(f.store.importSample(f.input()));
  assert.throws(() => f.store.importSample(f.input({classification: 'anonymized', expectedVersion: confirmed.version, expectedHash: confirmed.hash})), {code: 'amazon_custom_import_source'});
  f.db.exec('DROP TRIGGER amazon_custom_originals_fixed'); // Simulated corruption of this in-memory fixture only.
  f.db.prepare('UPDATE amazon_custom_originals SET bytes=?').run(sample({text: 'CORRUPTED'}));
  assert.throws(() => f.store.paperworkSummary(f.line.id), {code: 'amazon_custom_import_integrity'});
});

test('anonymized approval remains explicit and preview hashes cannot confirm changed mappings or another line', t => {
  const f = fixture(t), first = f.store.importSample(f.input({classification: 'anonymized'}));
  const input = f.reviewInput(first), preview = f.store.review(input);
  const changed = structuredClone(mapping); changed.texts[0].label = 'Different label';
  assert.throws(() => f.store.confirm({...input, mapping: changed, reviewHash: preview.reviewHash, operatorApproved: true}), {code: 'amazon_custom_import_review'});
  const other = f.lines.find(line => line.id !== f.line.id);
  const otherRecord = f.store.importSample(f.input({lineId: other.id, orderId: other.orderId, orderItemId: other.lineId, sku: other.sku, classification: 'anonymized'}));
  assert.throws(() => f.store.confirm({lineId: other.id, expectedVersion: otherRecord.version, expectedHash: otherRecord.hash, mapping, reviewHash: preview.reviewHash, operatorApproved: true}), {code: 'amazon_custom_import_review'});
  f.store.confirm({...input, reviewHash: preview.reviewHash, operatorApproved: true});
  assert.equal(f.store.paperworkSummary(f.line.id).provenance, 'anonymized');
  assert.equal(f.store.paperworkSummary(other.id).approved, false);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM amazon_custom_originals').get().n, 1);
});

test('confirmation replay rechecks order, original integrity and exact previously approved mapping', t => {
  const f = fixture(t), record = f.store.importSample(f.input()), review = f.store.review(f.reviewInput(record));
  const input = {...f.reviewInput(record), reviewHash: review.reviewHash, operatorApproved: true};
  f.store.confirm(input); f.reopen(); assert.equal(f.store.confirm(input).duplicate, true);
  const mappingChanged = structuredClone(mapping); mappingChanged.options[0].label = 'Unreviewed';
  assert.throws(() => f.store.confirm({...input, mapping: mappingChanged}), {code: 'amazon_custom_import_review'});
  assert.throws(() => f.store.confirm({...input, expectedVersion: 0, expectedHash: null}), {code: 'amazon_custom_import_stale'});
  f.update(raw => {raw.orderItems[0].quantityOrdered = 3; raw.orderItems[0].fulfillment.quantityUnfulfilled = 3;});
  assert.throws(() => f.store.confirm(input), {code: 'amazon_custom_import_order_changed'});
  assert.equal(f.store.history(f.line.id).length, 2);
  const g = fixture(t), other = g.store.importSample(g.input()), checked = g.store.review(g.reviewInput(other));
  const replay = {...g.reviewInput(other), reviewHash: checked.reviewHash, operatorApproved: true};
  g.store.confirm(replay); g.db.exec('DROP TRIGGER amazon_custom_originals_fixed');
  g.db.prepare('UPDATE amazon_custom_originals SET bytes=?').run(sample({text: 'CORRUPTED'}));
  assert.throws(() => g.store.confirm(replay), {code: 'amazon_custom_import_integrity'});
});
