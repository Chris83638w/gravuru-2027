import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionIds, motifChoices, bestsellerChoices, colorPalettes} from './profile-selection.mjs';

test('missing/null keeps choices, empty disables new choices, explicit order is preserved', () => {
  const available = ['Default Font', 'Script', 'Default Font', 'Serif'];
  assert.deepEqual(selectionIds(available), ['Default Font', 'Script', 'Serif']);
  assert.deepEqual(selectionIds(available, null), ['Default Font', 'Script', 'Serif']);
  assert.deepEqual(selectionIds(available, []), []);
  assert.deepEqual(selectionIds(available, ['Serif', 'missing', 'Script', 'Serif']), ['Serif', 'Script']);
  assert.throws(() => selectionIds(available, 'Script'), /Profilauswahl/);
});

test('library choices omit embedded template motifs without deleting their resource or object', () => {
  const entries = Object.freeze([{key:'heart', category:'Love'}, {key:'house', category:'Home'}, {key:'fixed', embeddedOnly:true}, {key:'heart', category:'Duplicate'}].map(Object.freeze));
  const resources = Object.freeze(Object.fromEntries(entries.map(entry => [entry.key, '<path/>'])));
  const design = Object.freeze({objects:Object.freeze([{type:'motif', motif:'fixed'}, {type:'text', font:'Unlisted Font'}])});
  const before = JSON.stringify({entries, resources, design});
  const choices = motifChoices(entries, ['house', 'fixed', 'heart'], new Set(['fixed']));
  assert.deepEqual(choices.map(entry => entry.key), ['house', 'heart']);
  assert.equal(choices[1].category, 'Love');
  assert.equal(JSON.stringify({entries, resources, design}), before);
});

test('bestsellers respect configured order, empty and allowed motif intersection', () => {
  const choices = [{key:'heart'}, {key:'flower'}];
  const fallback = [{key:'house'}, {key:'heart'}];
  assert.deepEqual(bestsellerChoices(choices, fallback), [{key:'heart'}]);
  assert.deepEqual(bestsellerChoices(choices, fallback, []), []);
  assert.deepEqual(bestsellerChoices(choices, fallback, ['flower','house','heart']), [{key:'flower'},{key:'heart'}]);
  assert.deepEqual(bestsellerChoices([], fallback, ['heart']), []);
});

test('preset colors normalize/dedupe while null inherits and empty has no presets', () => {
  const fallback = [['Standardfarben', [['Rot','#ff0000'], ['Schwarz','#000000']]]];
  const before = structuredClone(fallback);
  assert.deepEqual(colorPalettes(fallback), fallback);
  assert.notEqual(colorPalettes(fallback), fallback);
  assert.deepEqual(colorPalettes(fallback, []), []);
  assert.deepEqual(colorPalettes(fallback, ['#AABBCC','#ff0000','#aabbcc']), [['Empfohlene Farben', [['#AABBCC','#aabbcc'],['Rot','#ff0000']]]]);
  assert.deepEqual(fallback, before);
  assert.throws(() => colorPalettes(fallback, ['red']), /Profilfarbe/);
});
