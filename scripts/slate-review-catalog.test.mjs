import test from 'node:test';
import assert from 'node:assert/strict';
import {slateReviewCategory, sortSlateReviewRows, withSlateReviewMetadata} from './lib/slate-review-catalog.mjs';
import {catalogueSizeMm, slateInventoryRows, slateExtensionTargetSizes} from './lib/slate-review-catalog-inventory.mjs';

test('open originals retain the catalogue photo classification', () => {
  const original = {katalog: {kategorie: {ziel: 'Tiere', unter: 'Hund', foto: 'ja'}}};
  const row = withSlateReviewMetadata({id: 'open', process: 'UV', targets: []}, original);
  assert.deepEqual(slateReviewCategory(row), {key: 'hunde-with', label: 'Hunde mit Foto', rank: 1, photo: 'with', topic: 'hunde'});
  assert.equal(slateReviewCategory(withSlateReviewMetadata({targets: []}, {images: [{}]})).photo, 'unknown');
  assert.equal(slateReviewCategory(withSlateReviewMetadata({}, {katalog: {kategorie: {foto: 'nein'}}, images: [{}]})).photo, 'without');
});

test('restored photo masks are stronger evidence than old missing-photo metadata', () => {
  assert.equal(slateReviewCategory(withSlateReviewMetadata({photoSlots: 1}, {katalog: {kategorie: {foto: 'nein'}}})).photo, 'with');
  assert.equal(slateReviewCategory({photoSlots: 0, targets: [{status: 'open'}]}).photo, 'unknown');
  assert.equal(slateReviewCategory({photoSlots: 0, targets: [{status: 'prepared'}]}).photo, 'without');
});

test('general animals remain general; door and house signs retain their main theme', () => {
  assert.equal(slateReviewCategory({group: 'Tiere', subcategory: 'Allgemein'}).topic, 'weitere-tiere');
  assert.equal(slateReviewCategory({source: 'designs/bestand/tuerschilder/Tiere/Hund/TS-S-D1/design.json', group: 'Tiere', subcategory: 'Hund'}).topic, 'tuerschilder');
  assert.equal(slateReviewCategory({source: 'designs/bestand/hausnummern/Allgemein/Allgemein/HN-S-D1/design.json'}).topic, 'hausnummern');
  assert.equal(slateReviewCategory({group: 'Sternenkinder', subcategory: 'Kind'}).topic, 'sternenkinder');
});

test('sort is deterministic, numeric, nonmutating and independent of engraving/print', () => {
  const rows = [
    {id: 'D10', group: 'Tiere', subcategory: 'Hund', photoSlots: 1, process: 'Gravur'},
    {id: 'D2', group: 'Menschen', photoSlots: 1},
    {id: 'D2', group: 'Tiere', subcategory: 'Hund', photoSlots: 1, process: 'UV'},
    withSlateReviewMetadata({id: 'D30', group: 'Tiere', subcategory: 'Hund'}, {katalog: {kategorie: {foto: 'nein'}}}),
  ];
  const saved = structuredClone(rows);
  assert.deepEqual(sortSlateReviewRows(rows).map(r => `${r.group}:${r.id}`), ['Tiere:D30', 'Tiere:D2', 'Tiere:D10', 'Menschen:D2']);
  assert.deepEqual(rows, saved);
});

test('inventory filters actual material, deduplicates source IDs, and never treats stock sizes as prepared', () => {
  const original = {masterId: 'HN-S-14x22-D1', key: 'HN-S-D1', path: 'Allgemein/Allgemein/HN-S-D1', material: 'Schiefer', process: 'Gravur', sizesInStock: ['22x14', '30x20'], plate: {widthMm: 140, heightMm: 220}, kategorie: {foto: 'offen'}};
  const indexes = [{family: 'hausnummern', designs: [original, {...original, masterId: 'ACRYL', material: 'Acryl', materials: ['Acryl', 'Schiefer']}]}, {family: 'tuerschilder', designs: [original]}];
  const source = 'designs/bestand/hausnummern/Allgemein/Allgemein/HN-S-D1/design.json';
  const rows = slateInventoryRows(indexes, [{path: source, sha: 'a', bytes: 1}]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sourcePaths.length, 2);
  assert.equal(rows[0].sourceAvailable, true);
  assert.equal(rows[0].originalSvgAvailable, false);
  assert.equal(rows[0].preparationStatus, 'source-only');
  assert.deepEqual(rows[0].targets, []);
  assert.deepEqual(rows[0].stockSizes[0].mm, [220, 140]);
  assert.equal(rows[0].category.topic, 'hausnummern');
  const prepared = slateInventoryRows(indexes, [], [{id: original.masterId, source, process: 'UV', targets: [{status: 'prepared', mm: [220, 140]}]}]);
  assert.equal(prepared[0].process, 'UV');
  assert.equal(prepared[0].preparationStatus, 'prepared');
});

test('catalogue sizes preserve orientation and decimal commas without inventing dimensions', () => {
  assert.deepEqual(catalogueSizeMm('23x10,5'), [230, 105]);
  assert.deepEqual(catalogueSizeMm('14×22'), [140, 220]);
  assert.equal(catalogueSizeMm('Herz'), null);
});

test('extension targets must be exact, selected catalogue formats; no rotation or circle substitution', () => {
  const sizes = [{key: 'square', groupKey: 'QU', widthMm: 100, heightMm: 100}, {key: 'circle', groupKey: 'R', widthMm: 100, heightMm: 100}, {key: 'landscape', groupKey: 'RE', widthMm: 220, heightMm: 140}];
  assert.deepEqual(slateExtensionTargetSizes({sourcePlateMm: [100, 100], targetSizeKeys: ['square', 'circle', 'landscape']}, {sizes}), [sizes[0]]);
  assert.deepEqual(slateExtensionTargetSizes({sourcePlateMm: [140, 220], targetSizeKeys: ['landscape']}, {sizes}), []);
  assert.deepEqual(slateExtensionTargetSizes({sourcePlateMm: [100, 100], targetSizeKeys: []}, {sizes}), []);
});
