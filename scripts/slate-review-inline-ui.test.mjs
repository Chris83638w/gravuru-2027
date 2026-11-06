import test from 'node:test';
import assert from 'node:assert/strict';
import {changedPositions, translatedObjectMatrix, latestPreviewUrl} from './lib/slate-review-inline-ui.js';

const original = [
  {id: 'text', type: 'text', x: 75.25, y: 33.125, w: 40, h: 10, movable: true},
  {id: 'photo', type: 'photoSlot', x: 100, y: 80, w: 50, h: 60, movable: true},
  {id: 'technical', x: 0, y: 0, movable: false},
];
test('movement sends only changed native positions and preserves exact millimetres', () => {
  const current = structuredClone(original); current[0].x += .875; current[1].y -= 4.125;
  assert.deepEqual(changedPositions(original, current), [{objectId: 'text', x: 76.125, y: 33.125}, {objectId: 'photo', x: 100, y: 75.875}]);
  assert.equal(original[0].x, 75.25); assert.equal(original[1].y, 80);
  assert.deepEqual(changedPositions(original, structuredClone(original)), []);
});
test('technical objects and objects absent from the server snapshot cannot enter a position patch', () => {
  const current = structuredClone(original); current[2].x = 50;
  current.push({id: 'new', x: 10, y: 10, movable: true});
  assert.deepEqual(changedPositions(original, current), []);
});
test('moving an already rotated and scaled native SVG retains its original linear transform', () => {
  const matrix = {a: 0, b: 2, c: -3, d: 0, e: 50.5, f: 70};
  const object = {x: 80, y: 60};
  assert.deepEqual(translatedObjectMatrix(matrix, object, {x: 84.125, y: 58.75}), {a: 0, b: 2, c: -3, d: 0, e: 54.625, f: 68.75});
  assert.deepEqual(matrix, {a: 0, b: 2, c: -3, d: 0, e: 50.5, f: 70});
});
test('repeated drags are based on the original SVG, without accumulating transform drift', () => {
  const matrix = {a: 1, b: 0, c: 0, d: 1, e: 75.25, f: 33.125}, before = original[0];
  const moved = {...before, x: before.x + 4, y: before.y - 2};
  assert.equal(translatedObjectMatrix(matrix, before, moved).e, 79.25);
  assert.deepEqual(translatedObjectMatrix(matrix, before, before), matrix);
  assert.deepEqual(changedPositions(original, original.map(object => ({...object}))), []);
});
test('saved gallery images keep the exact design but follow later workshop revisions', () => {
  assert.equal(latestPreviewUrl('/api/workshop/products/cfg_a/preview.svg?designId=katalog-D1&revision=2', 'https://review.example/originale/'),
    'https://review.example/api/workshop/products/cfg_a/preview.svg?designId=katalog-D1');
});
