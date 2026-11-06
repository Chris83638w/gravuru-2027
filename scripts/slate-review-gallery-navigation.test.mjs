import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual page initializer. Only the two independent editors and
// DOM/browser surfaces are stubbed; filter and return navigation run unchanged.
const source = fs.readFileSync(new URL('./lib/slate-review-gallery-ui.js', import.meta.url), 'utf8')
  .replaceAll('export ', '')
  .replace("await Promise.all([import('./inline.js'), import('./approvals.js')])", '[fakeInlineModule, fakeApprovalModule]')
  .replace("if (typeof document !== 'undefined') void installGalleryPage();", 'globalThis.initialized = installGalleryPage();');

async function openGallery({hash = '', material = 'steel', scroll = 987, targetIsCard = true} = {}) {
  const calls = [], nodes = new Map();
  const control = (id, values, value = '') => nodes.set('#' + id, {value, options: values.map(value => ({value})), addEventListener() {}});
  control('search', []);control('view', ['designs', 'blanks', 'all'], 'designs');
  control('material', ['', 'steel', 'slate']);control('theme', ['', 'family']);
  control('category', ['', 'door']);control('blank-form', ['', 'round']);
  control('process', ['', 'Gravur']);control('approval-filter', ['', 'approved', 'unreviewed']);
  nodes.set('#blank-form-filter', {hidden: true});nodes.set('#count', {textContent: ''});nodes.set('#no-results', {hidden: true});
  const card = {id: 'design-target', hidden: false, dataset: {search: 'target steel family', material: 'steel', themes: '["family"]', category: 'door', process: 'Gravur', approvalStatus: 'unreviewed'},
    querySelector() { return null; }, querySelectorAll() { return []; }, matches() { return targetIsCard; },
    scrollIntoView(options) { calls.push({target: this.id, block: options.block}); }};
  const stored = {material, scroll};
  const context = {
    URLSearchParams, location: {hash}, requestAnimationFrame(callback) { callback(); },
    sessionStorage: {getItem() { return JSON.stringify(stored); }, setItem() {}},
    document: {querySelector(selector) { return nodes.get(selector) || null; }, querySelectorAll(selector) { return selector === '[data-design-card]' ? [card] : []; },
      getElementById(id) { return id === card.id ? card : null; }},
    window: {scrollY: 0, addEventListener() {}, scrollTo(x, y) { calls.push({x, y}); }},
    fakeInlineModule: {installInlineReview() { return {keepVisible() { return false; }, beforeFormatChange() { return true; }, beforeNavigation() { return true; }}; }},
    fakeApprovalModule: {installApprovalReview() { return {syncControls() {}, formatChanged() {}, refresh() {}}; }},
  };
  vm.runInNewContext(source, context);
  await context.initialized;
  return {calls, card, material: nodes.get('#material').value};
}

test('an explicit visible gallery target wins over the previous scroll position', async () => {
  const page = await openGallery({hash: '#design-target', material: 'steel'});
  assert.equal(page.card.hidden, false);
  assert.deepEqual(page.calls, [{target: 'design-target', block: 'start'}]);
  assert.equal(page.material, 'steel');
});

test('an explicit filtered-out target is revealed and scrolled to instead of the previous position', async () => {
  const page = await openGallery({hash: '#design-target', material: 'slate'});
  assert.equal(page.card.hidden, false);
  assert.equal(page.material, 'steel');
  assert.deepEqual(page.calls, [{target: 'design-target', block: 'start'}]);
});

test('without an explicit target the previous scroll position and filters survive', async () => {
  const page = await openGallery({material: 'slate'});
  assert.equal(page.card.hidden, true);
  assert.equal(page.material, 'slate');
  assert.deepEqual(page.calls, [{x: 0, y: 987}]);
});

test('unknown, malformed or non-card fragments never become a gallery target', async () => {
  for (const options of [{hash: '#missing'}, {hash: '#%E0%A4%A'}, {hash: '#design-target', targetIsCard: false}]) {
    assert.deepEqual((await openGallery(options)).calls, [{x: 0, y: 987}]);
  }
});
