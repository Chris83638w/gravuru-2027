import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inside, verifyFileIndex, auditDryRun, auditIdentity, designReviewHolds, auditTextFitting } from './audit-design-batch-delivery.mjs';

test('byte verification catches corruption and distinguishes sparse checkout from absent delivery object', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'delivery-audit-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'ok.svg'), 'original\n');
  await fs.writeFile(path.join(root, 'changed.svg'), 'original\r\n');
  const hash = createHash('sha256').update('original\n').digest('hex');
  const result = await verifyFileIndex(root, { 'ok.svg': hash, 'changed.svg': hash, 'sparse.svg': hash, 'absent.svg': hash }, {
    gitExists: async files => new Set(files.filter(f => f === 'sparse.svg')),
  });
  assert.deepEqual(result.counts, { verified: 1, 'hash-mismatch': 1, 'sparse-unavailable': 1, 'missing-delivery-file': 1 });
});

test('all source file references remain confined to the catalogue', () => {
  const root = path.resolve('safe');
  for (const unsafe of ['../outside', '/absolute', 'C:/outside', 'folder\\outside', '']) assert.throws(() => inside(root, unsafe));
  assert.equal(inside(root, 'designs/id/design.json'), path.join(root, 'designs/id/design.json'));
});

test('dry run verifies IDs and counters but never proves existing-store compatibility', () => {
  const m = { designs: [{ id: 'D1', themen: ['hund', 'katze'] }], rohlinge: [{ id: 'family|size' }] };
  const dry = { modus: 'dry-run', eintraege: [{ art: 'design', id: 'D1', status: 'neu' }, { art: 'rohling', id: 'family|size', status: 'unvollstaendig' }], zaehler: { designs: { neu: 1 }, rohlinge: { unvollstaendig: 1 } }, angewendet: { angelegt: 0 } };
  assert.deepEqual(auditDryRun(m, dry).errors, []);
  assert.equal(auditDryRun(m, dry).provesExistingGalleryCompatibility, false);
  const broken = structuredClone(dry);
  broken.eintraege.push({ art: 'design', id: 'D1', status: 'neu' });
  broken.eintraege[1].id = 'unknown';
  broken.angewendet.angelegt = 1;
  const codes = auditDryRun(m, broken).errors.map(e => e.code);
  for (const expected of ['DRY_RUN_DUPLICATE_ID', 'DRY_RUN_UNKNOWN_ID', 'DRY_RUN_MISSING_ID', 'DRY_RUN_COUNTER', 'DRY_RUN_APPLIED']) assert.ok(codes.includes(expected), expected);
});

test('multiple themes are not new designs and stock references must resolve to a delivered master', () => {
  const originals = [{ id: 'M1', themen: ['hund', 'katze'] }];
  assert.deepEqual(auditIdentity(originals, [{ id: 'stock/M1', verweisAufMaster: ['M1'] }], new Set(['M1'])), []);
  const errors = auditIdentity(originals, [{ id: 'M1', verweisAufMaster: ['missing'] }, { id: 'empty', verweisAufMaster: [] }], new Set(['M1']));
  assert.deepEqual(errors.map(e => e.code), ['DUPLICATE_OR_EMPTY_ID', 'UNKNOWN_MASTER_REFERENCE', 'EMPTY_MASTER_REFERENCE']);
});

test('prepared source status retains photo/UV, uncertain-font and rebuild holds without granting approval', () => {
  const result = designReviewHolds({ zustand: 'vorbereitet', freigabe: [{ status: 'freigegeben' }], mitFoto: true, verfahren: 'UV', lieferformPruefung: { klasse: 'umbau' }, befunde: [{ text: "Schrift 'Example' – Ersatz unsicher, bitte ansehen" }], schriften: [{ name: 'Welcome' }], blocker: ['unresolved'] });
  assert.equal(result.reviewStatus, 'unreviewed');
  assert.equal(result.released, false);
  assert.deepEqual(result.holds, ['declared-blocker', 'excluded-font', 'no-target-family', 'photo-decision', 'print-review', 'rebuild', 'uncertain-font']);
});

test('a documented missing historical ratio is a warning; invalid new factors remain errors', () => {
  assert.equal(auditTextFitting({ faktor: null, hinweis: 'Master: bereits angewandte Größenänderung nicht angegeben' }).severity, 'warning');
  for (const faktor of [null, 0, -1, NaN, '1']) assert.equal(auditTextFitting({ faktor }).severity, 'error');
  assert.equal(auditTextFitting({ faktor: 0.9 }), null);
});

test('a self-consistent changed manifest cannot bypass the pinned Git blob', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'delivery-commit-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'design.svg'), 'changed');
  const hash = createHash('sha256').update('changed').digest('hex');
  const originalBlob = createHash('sha1').update('blob 8\0original').digest('hex');
  const result = await verifyFileIndex(root, { 'design.svg': hash }, { gitBlobs: new Map([['design.svg', originalBlob]]) });
  assert.equal(result.files[0].status, 'git-blob-mismatch');
});
