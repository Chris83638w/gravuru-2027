import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createDesignReviewApprovals, nativeDesignReviewFingerprint} from './lib/design-review-approvals.mjs';

const photoId = 'a'.repeat(64), maskId = 'b'.repeat(64), artworkId = 'c'.repeat(64);
const key = JSON.stringify(['slate', 'D1', '300x200']);
function fixture() {
  const document = {schema: 'gravuru-product/v1', name: 'Gruppe', config: {
    profile: {id: 'group', revision: '1', kind: 'universal-product', defaultDesignId: 'D1',
      geometry: {shape: 'rect', width: 300, height: 200, safeMarginMm: 2, holes: []},
      material: {kind: 'slate', thicknessMm: 4, color: '#41494b'}, processing: {profileId: 'slate-engraving'},
      optionGroups: [{id: 'mounting', defaultValueId: 'none', values: [{id: 'none', holes: []}, {id: 'two', holes: [{x: 10, y: 100, diameter: 5}]}]}],
      designs: [{id: 'D1', name: 'Hund', objects: [
        {id: 'name', type: 'text', text: 'Bella', font: 'Font A', size: 10, x: 100.123456, y: 60, w: 40, h: 12},
        {id: 'motif', type: 'motif', motif: 'heart', x: 100, y: 120, w: 20, h: 20},
        {id: 'photo', type: 'photoSlot', x: 220, y: 100, w: 80, h: 100, photoShape: 'template', photoMaskAssetId: maskId},
      ]}, {id: 'D2', name: 'Anderes Design', objects: [{id: 'other', type: 'text', text: 'Max', font: 'Font B'}]}]},
    localResources: {
      fonts: {'Font A': {unitsPerEm: 1000, glyphs: {B: {path: 'M0 0L1 1', advance: 600}}}, 'Font B': {unitsPerEm: 1000, glyphs: {M: {path: 'M0 0', advance: 600}}}},
      motifs: [{key: 'heart', svgFragment: '<path d="M0 0L1 1"/>', artwork: {assetId: artworkId}}, {key: 'unrelated', svgFragment: '<path d="M2 2"/>'}],
      photoExamples: [{designId: 'D1', slotId: 'photo', assetId: photoId}, {designId: 'D2', slotId: 'unused', assetId: 'd'.repeat(64)}]},
    photo: {enabled: true, hints: [{designId: 'D1', slotId: 'photo', text: 'Dein Foto', enabled: true}]},
    materialSurface: 'data:image/webp;base64,Ymxhbms=', basePriceCents: 1000,
  }};
  const assets = new Map([[photoId, Buffer.from('photograph-v1')], [maskId, Buffer.from('<svg><path d="M0 0L1 1"/></svg>')], [artworkId, Buffer.from('<svg><path d="M1 2"/></svg>')]]);
  const args = {document, designId: 'D1', rendererVersion: 'renderer-source-v1', resourceResolvers: {asset: id => assets.get(id)}};
  return {document, assets, args, fingerprint: () => nativeDesignReviewFingerprint(args)};
}
function storeFixture(t) {
  const f = fixture(), dir = mkdtempSync(join(tmpdir(), 'design-review-approval-test-')), filename = join(dir, 'events.sqlite');
  let available = true, time = '2026-11-06T12:00:00.000Z';
  const options = {resolveTarget: id => id === key ? {available, fingerprint: available ? f.fingerprint() : null, metadata: {material: 'Schiefer', format: '300x200', designId: 'D1'}} : null,
    listTargets: () => [key], actor: 'private-review-session', now: () => time};
  let store = createDesignReviewApprovals(filename, options);
  t.after(() => { store.close(); rmSync(dir, {recursive: true, force: true}); });
  return {...f, filename, options, get store() { return store; }, unavailable: () => { available = false; }, later: () => { time = '2026-11-06T13:00:00.000Z'; },
    reopen: () => { store.close(); store = createDesignReviewApprovals(filename, options); return store; },
    approve: () => { const current = store.get(key); return store.save({key, approved: true, expectedRevision: current.revision, expectedFingerprint: current.fingerprint}); }};
}

test('approval persists across reopen with exact key, actor, timestamp and immutable event history', t => {
  const f = storeFixture(t), start = f.store.get(key);
  assert.equal(start.status, 'unreviewed'); assert.equal(start.revision, 0); assert.equal(start.approved, false);
  const approved = f.approve(); assert.equal(approved.status, 'approved'); assert.equal(approved.revision, 1);
  assert.equal(approved.actor, 'private-review-session'); assert.equal(approved.updatedAt, '2026-11-06T12:00:00.000Z');
  assert.deepEqual(f.reopen().all(), {[key]: approved});
  const db = new DatabaseSync(f.filename);
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM design_review_approval_events').get().n, 1);
    assert.throws(() => db.exec('UPDATE design_review_approval_events SET approved=0'), /immutable/);
    assert.throws(() => db.exec('DELETE FROM design_review_approval_events'), /immutable/);
  } finally { db.close(); }
});
test('no-op is idempotent, revocation is append-only, and a stale browser cannot restore an old approval', t => {
  const f = storeFixture(t), first = f.approve(); f.later();
  assert.deepEqual(f.approve(), first);
  const revoked = f.store.save({key, approved: false, expectedRevision: 1, expectedFingerprint: first.fingerprint});
  assert.equal(revoked.revision, 2); assert.equal(revoked.status, 'unreviewed'); assert.equal(revoked.approvedFingerprint, null);
  assert.equal(revoked.updatedAt, '2026-11-06T13:00:00.000Z');
  assert.deepEqual(f.store.save({key, approved: false, expectedRevision: 2, expectedFingerprint: revoked.fingerprint}), revoked);
  assert.throws(() => f.store.save({key, approved: true, expectedRevision: 1, expectedFingerprint: first.fingerprint}), error => error.status === 409 && error.code === 'review_approval_conflict');
});
test('changed content invalidates effective approval and stale viewed fingerprints fail before append', t => {
  const f = storeFixture(t), first = f.approve(); f.document.config.profile.designs[0].objects[0].text = 'Luna';
  const changed = f.store.get(key); assert.equal(changed.status, 'changed'); assert.equal(changed.approved, false); assert.equal(changed.approvedFingerprint, first.fingerprint);
  assert.throws(() => f.store.save({key, approved: true, expectedRevision: 1, expectedFingerprint: first.fingerprint}), error => error.status === 409 && error.code === 'review_fingerprint_changed');
  assert.equal(f.store.get(key).revision, 1);
  assert.equal(f.approve().revision, 2); assert.equal(f.store.get(key).status, 'approved');
});
test('missing targets remain unavailable and can be revoked without a fresh image', t => {
  const f = storeFixture(t), approved = f.approve(); f.unavailable();
  const missing = f.store.get(key); assert.equal(missing.status, 'unavailable'); assert.equal(missing.approved, false); assert.equal(missing.fingerprint, null);
  assert.throws(() => f.store.save({key, approved: true, expectedRevision: 1, expectedFingerprint: approved.fingerprint}), error => error.status === 422 && error.code === 'review_target_unavailable');
  const revoked = f.store.save({key, approved: false, expectedRevision: 1, expectedFingerprint: null});
  assert.equal(revoked.status, 'unavailable'); assert.equal(revoked.revision, 2); assert.equal(revoked.approvedFingerprint, null);
});
test('strict inputs and unknown targets cannot create approval events', t => {
  const f = storeFixture(t), input = {key, approved: true, expectedRevision: 0, expectedFingerprint: f.fingerprint()};
  for (const bad of [null, {...input, actor: 'Chris'}, {...input, approved: 'true'}, {...input, expectedRevision: -1}, {...input, expectedRevision: 0.5}, {...input, expectedFingerprint: {}}, {...input, extra: true}]) assert.throws(() => f.store.save(bad), error => error.status === 422);
  assert.throws(() => f.store.save({...input, key: 'unknown'}), error => error.status === 404);
  assert.throws(() => f.store.save({...input, expectedFingerprint: null}), error => error.status === 409);
  assert.equal(f.store.get(key).revision, 0);
});
test('a second store shares the same compare-and-swap revision', t => {
  const f = storeFixture(t), second = createDesignReviewApprovals(f.filename, f.options), old = second.get(key);
  try { f.approve(); assert.throws(() => second.save({key, approved: true, expectedRevision: old.revision, expectedFingerprint: old.fingerprint}), error => error.status === 409); }
  finally { second.close(); }
});

for (const [name, mutate] of [
  ['text', f => { f.document.config.profile.designs[0].objects[0].text = 'Luna'; }],
  ['material', f => { f.document.config.profile.material.color = '#333333'; }],
  ['geometry', f => { f.document.config.profile.geometry.width = 301; }],
  ['process', f => { f.document.config.profile.processing.profileId = 'color-print'; }],
  ['font outlines', f => { f.document.config.localResources.fonts['Font A'].glyphs.B.path = 'M1 0L2 1'; }],
  ['motif resource', f => { f.assets.set(artworkId, Buffer.from('changed motif bytes')); }],
  ['photo', f => { f.assets.set(photoId, Buffer.from('changed photograph bytes')); }],
  ['photo mask', f => { f.assets.set(maskId, Buffer.from('changed mask bytes')); }],
  ['material image', f => { f.document.config.materialSurface = 'data:image/webp;base64,bmV3'; }],
  ['view', f => { f.args.view = {surface: 'back'}; }],
  ['backing view', f => { f.document.config.profile.backingPreview = {offsetMm: 2, color: '#333333', geometry: {outlinePath: 'M0 0L300 200Z'}}; }],
  ['renderer implementation', f => { f.args.rendererVersion = 'renderer-source-v2'; }],
]) test('own ' + name + ' changes the fingerprint and invalidates approval', t => {
  const f = storeFixture(t), before = f.approve(); mutate(f);
  assert.notEqual(f.fingerprint(), before.fingerprint); assert.equal(f.store.get(key).status, 'changed');
});
test('other designs, their resources, product revision and price do not invalidate approval', t => {
  const f = storeFixture(t), first = f.approve(), c = f.document.config;
  c.profile.designs[1].objects[0].text = 'Edited elsewhere'; c.profile.designs[1].name = 'Renamed elsewhere';
  c.localResources.fonts['Font B'].glyphs.M.path = 'M9 9'; c.localResources.motifs[1].svgFragment = '<path d="M8 8"/>';
  c.localResources.photoExamples[1].assetId = 'e'.repeat(64); c.profile.revision = '999'; c.basePriceCents = 9999;
  c.profile.defaultDesignId = 'D2'; f.document.name = 'Product renamed';
  assert.equal(f.fingerprint(), first.fingerprint); assert.equal(f.store.get(key).status, 'approved');
});
test('hashing is deterministic and does not alter native objects or resource precision', () => {
  const f = fixture(), before = structuredClone(f.document), hash = f.fingerprint();
  const reordered = JSON.parse(JSON.stringify(f.document)); reordered.config.profile.material = {color: '#41494b', thicknessMm: 4, kind: 'slate'};
  assert.equal(nativeDesignReviewFingerprint({...f.args, document: reordered}), hash);
  assert.deepEqual(f.document, before); assert.equal(f.document.config.profile.designs[0].objects[0].x, 100.123456);
});
test('unresolved resources, transient uploads and unversioned renderer are explicit failures', () => {
  const f = fixture();
  assert.throws(() => nativeDesignReviewFingerprint({...f.args, rendererVersion: undefined}), error => error.code === 'review_renderer_required');
  assert.throws(() => nativeDesignReviewFingerprint({...f.args, resourceResolvers: {}}), error => error.code === 'review_resource_missing');
  f.assets.delete(photoId); assert.throws(f.fingerprint, error => error.code === 'review_resource_missing');
  f.assets.set(photoId, Buffer.from('restored')); delete f.document.config.localResources.fonts['Font A'];
  assert.throws(f.fingerprint, error => error.code === 'review_resource_missing');
  f.document.config.localResources.fonts['Font A'] = {glyphs: {}};
  f.document.config.profile.designs[0].objects[2].uxUploadId = 'temporary';
  assert.throws(f.fingerprint, error => error.code === 'review_transient_media');
});
test('external local image references require an explicit resolver and their bytes affect the fingerprint', () => {
  const f = fixture(); f.document.config.sceneBackground = '/api/workshop/material-surfaces/' + 'f'.repeat(64) + '.png';
  assert.throws(f.fingerprint, error => error.code === 'review_resource_missing');
  let image = Buffer.from('background1'); f.args.resourceResolvers.url = () => image;
  const before = f.fingerprint(); image = Buffer.from('background2'); assert.notEqual(f.fingerprint(), before);
  f.args.resourceResolvers.url = () => Promise.resolve(image); assert.throws(f.fingerprint, error => error.code === 'review_resource_missing');
});
test('an exact native SVG can supply the renderer identity for a small isolated view', () => {
  const f = fixture(); const args = {...f.args, rendererVersion: undefined, renderedSvg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'};
  const before = nativeDesignReviewFingerprint(args); assert.match(before, /^[a-f0-9]{64}$/);
  assert.notEqual(nativeDesignReviewFingerprint({...args, renderedSvg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1"/></svg>'}), before);
});
test('implicit acrylic photographs require actual rendered pixels rather than only a renderer source signature', () => {
  const f = fixture(); f.document.config.acrylic = {version: 1};
  assert.throws(f.fingerprint, error => error.code === 'review_scene_resources_required');
});
