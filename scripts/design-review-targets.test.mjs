import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {designReviewMaterial, designReviewCategory, designReviewApprovalKey, resolveDesignReviewTarget, validatedDesignReviewTargets} from './lib/design-review-targets.mjs';
import {slateReviewApprovalKey, slateReviewApprovalTargets, createSlateApprovalTargetSource} from './lib/slate-review-approval-targets.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';

const steel = {key: 'steel', label: 'Edelstahl', kind: 'steel'};
const category = {key: 'steel-tuerschilder', label: 'Türschilder', rank: 100, photo: 'without', topic: 'tuerschilder'};
const originalId = 'TRE-V2A-8x3,5-D1', nativeDesignId = 'katalog-TRE-V2A-8x3-5-D1';
function fixture() {
  const row = {id: originalId, reviewMaterial: steel, reviewCategory: category,
    targets: [{sizeKey: 'GR-ES-RE-80X35-T15', productKey: 'steel:GR-ES-RE-80X35-T15', nativeDesignId, mm: [80,35], status: 'prepared'}]};
  const product = {key: row.targets[0].productKey, productId: 'cfg_steel', reviewOnly: true, designIds: [row.id]};
  return {row, pack: {schema: 'gravuru-design-original-review/v1', reviewOnly: true, released: false, originals: [row], products: [product]},
    imported: {localOnly: true, published: false, shopifyWrites: 0, products: [structuredClone(product)]}};
}

test('legacy slate identities and resolution remain stable; explicit steel IDs preserve comma original IDs', () => {
  const slate = {id: 'GT-S-30x20-D1'}, target = {status: 'prepared', sizeKey: 'large', mm: [300,200]};
  const imported = {products: [{key: 'large:Hunde', productId: 'cfg_slate', designIds: [slate.id]}]};
  assert.deepEqual(designReviewMaterial(slate), {key: 'slate', label: 'Schiefer', kind: 'slate'});
  assert.equal(designReviewApprovalKey(slate, 'large'), slateReviewApprovalKey(slate.id, 'large'));
  assert.equal(designReviewApprovalKey(slate), slateReviewApprovalKey(slate.id));
  assert.equal(resolveDesignReviewTarget(slate, target, imported).designId, 'katalog-' + slate.id);
  const f = fixture(), actual = validatedDesignReviewTargets(f.pack, f.imported)[0];
  assert.equal(actual.originalId, originalId); assert.equal(actual.designId, nativeDesignId);
  assert.equal(actual.productId, 'cfg_steel'); assert.deepEqual(actual.material, steel);
  assert.equal(designReviewApprovalKey(f.row, f.row.targets[0].sizeKey), JSON.stringify(['steel', originalId, 'GR-ES-RE-80X35-T15']));
  assert.deepEqual(designReviewCategory(f.row), category);
  assert.equal(slateReviewApprovalTargets(f.pack, f.imported)[0].material, 'Edelstahl');
});

test('only explicit steel targets, known material pairs and manifest-allowlisted designs resolve', () => {
  const f = fixture(), target = f.row.targets[0];
  for (const changes of [{productKey: undefined}, {nativeDesignId: undefined}, {productKey: 'foreign'}, {status: 'open'}, {mm: [NaN,35]}]) {
    assert.equal(resolveDesignReviewTarget(f.row, {...target, ...changes}, f.imported), null);
  }
  for (const reviewMaterial of [{key: 'wood', label: 'Holz', kind: 'wood'}, {...steel, kind: 'slate'}, {key: '__proto__'}]) {
    assert.throws(() => designReviewMaterial({...f.row, reviewMaterial}), /Unsupported review material/);
  }
  const foreign = structuredClone(f.imported); foreign.products[0].designIds.push('foreign');
  assert.throws(() => validatedDesignReviewTargets(f.pack, foreign), /Invalid review product/);
  const wrongBaseline = structuredClone(f.pack); wrongBaseline.products[0].designIds = [];
  assert.throws(() => validatedDesignReviewTargets(wrongBaseline, f.imported), /Invalid review product/);
  const duplicate = structuredClone(f.imported); duplicate.products.push({...duplicate.products[0], productId: 'cfg_other'});
  assert.throws(() => validatedDesignReviewTargets(f.pack, duplicate), /Invalid review product/);
  assert.throws(() => resolveDesignReviewTarget(f.row, target, duplicate), /Ambiguous/);
  assert.throws(() => validatedDesignReviewTargets({...f.pack, schema: 'arbitrary'}, f.imported), /Unpublished local/);
});

test('steel approval fingerprints use native content and reject changed material, source identity or geometry', () => {
  const f = fixture();
  const family = JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json', import.meta.url)));
  family.sizes = [structuredClone(family.sizes[0])];
  Object.assign(family.sizes[0], {widthMm: 80, heightMm: 35, key: f.row.targets[0].sizeKey});
  const config = familyProductConfig(family, family.sizes[0], 1), design = config.profile.designs[0];
  design.id = nativeDesignId; design.katalog = {designId: originalId}; config.profile.defaultDesignId = nativeDesignId;
  const record = {id: 'cfg_steel', revision: 1, status: 'draft', document: makeProductDocument(config)};
  const workshop = {repository: {get: () => structuredClone(record)}, assets: {read: () => {throw Error('Unexpected external asset');}}, fonts: {resources: () => ({})}};
  const source = createSlateApprovalTargetSource({...f, workshop}), key = source.listTargets()[0];
  const first = source.resolveTarget(key);
  assert.equal(first.available, true); assert.match(first.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.metadata.designId, nativeDesignId); assert.match(first.metadata.previewUrl, /reviewFingerprint=/);
  const original = structuredClone(record.document);
  for (const mutate of [d => {d.config.profile.material.kind = 'slate';}, d => {d.config.profile.geometry.width = 90;}, d => {d.config.profile.designs[0].katalog.designId = 'foreign';}]) {
    record.document = structuredClone(original); mutate(record.document); record.revision++; source.beginRead();
    assert.equal(source.resolveTarget(key).available, false);
  }
  record.document = structuredClone(original); record.document.config.profile.designs[0].objects[0].text = 'Familie Neu'; record.revision++; source.beginRead();
  const changed = source.resolveTarget(key); assert.equal(changed.available, true); assert.notEqual(changed.fingerprint, first.fingerprint);
});
