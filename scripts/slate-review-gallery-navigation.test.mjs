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

async function openGallery({hash = '', material = 'steel', scroll = 987, targetIsCard = true, savedReturn=null, withTargets=false, dirty=false, formats={}, openAcrylic=false, cardCount=1} = {}) {
  const calls = [], nodes = new Map();
  let approvalPasses = 0;
  const interactive = extra => {const listeners=new Map();return {...extra,addEventListener(type,fn){listeners.set(type,fn);},emit(type,event={}){return listeners.get(type)?.(event);},setAttribute(key,value){this[key]=value;}};};
  const control = (id, values, value = '') => nodes.set('#' + id, interactive({value, options: values.map(value => ({value}))}));
  const navigation = ['designs','blanks','all'].map(viewNav=>interactive({dataset:{viewNav}}));
  const resets = [interactive({}),interactive({})], body={dataset:{}};
  control('search', []);control('view', ['designs', 'blanks', 'all'], 'designs');
  control('material', ['', 'steel', 'slate', 'acrylic-schwarz-3mm']);control('theme', ['', 'family']);
  control('category', ['', 'door']);control('blank-form', ['', 'round']);
  control('process', ['', 'Gravur']);control('approval-filter', ['', 'approved', 'unreviewed']);
  nodes.set('#blank-form-filter', {hidden: true});nodes.set('#count', {textContent: ''});nodes.set('#no-results', {hidden: true});
  const options = ['steel', 'acrylic-schwarz-3mm'].map((key, index) => ({value: String(index), textContent: key, dataset: {material: key, materialLabel: key, mm: '100x100', productId: 'cfg_' + key, designId: 'native', sizeKey: key + '-100', approvalKey: key + '-approval', preview: '/' + key + '.svg', edit: '/' + key + '-editor'}}));
  if (openAcrylic) Object.assign(options[1].dataset, {productId: '', designId: '', preview: '', edit: '', openReason: 'Schriftdatei fehlt'});
  const nativePreview = {}, openReason = {}, openPreview = {querySelector() {return openReason;}};
  const select = {value: '0', options, get selectedOptions() {return options.filter(option => option.value === this.value);}, addEventListener(){}};
  const image = {}, badge = {}, heading={after(){}},card = {id: 'design-target', hidden: false, dataset: {originalId:'target',productId:'cfg_test',designId:'native',search: 'target steel family', material: 'steel', themes: '["family"]', category: 'door', process: 'Gravur', approvalStatus: 'unreviewed'},
    querySelector(selector) { return selector==='.card-heading'?heading:withTargets?({'[data-format]':select,'[data-preview]':image,'[data-material-badge]':badge,'[data-native-preview]':nativePreview,'[data-open-preview]':openPreview,h3:{textContent:'target'}}[selector]||null):null; }, querySelectorAll() { return []; }, matches() { return targetIsCard; },
    scrollIntoView(options) { calls.push({target: this.id, block: options.block}); }};
  const stored = {material, scroll, formats};
  const context = {
    URLSearchParams, location: {hash}, requestAnimationFrame(callback) { callback(); },
    sessionStorage: {getItem(key) { return JSON.stringify(key==='gravuru-gallery-return'?savedReturn:stored); }, setItem() {},removeItem(){calls.push({removed:true});}},
    document: {body,createElement(){return {dataset:{}};},querySelector(selector) { return nodes.get(selector) || null; }, querySelectorAll(selector) { return selector === '[data-design-card]' ? Array(cardCount).fill(card) : selector==='[data-view-nav]'?navigation:selector==='[data-reset-filters]'?resets:[]; },
      getElementById(id) { return id === card.id ? card : null; }},
    window: {scrollY: 0, addEventListener() {}, scrollTo(x, y) { calls.push({x, y}); }},
    fakeInlineModule: {installInlineReview() { return {keepVisible() { return dirty; }, beforeFormatChange() { return !dirty; }, beforeNavigation() { return true; }}; }},
    fakeApprovalModule: {installApprovalReview({onChanged}) { return {syncControls() {approvalPasses++;}, formatChanged() {onChanged();}, refresh() {}}; }},
  };
  vm.runInNewContext(source, context);
  await context.initialized;
  return {calls, card, image, badge, select, nativePreview, openPreview, openReason, approvalPasses, material: nodes.get('#material').value,nodes,navigation,resets,body,setDirty:value=>{dirty=value;}};
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

test('saved return pins the exact original without clearing a now-conflicting filter',async()=>{
 const page=await openGallery({hash:'#design-target',material:'slate',savedReturn:{originalId:'target',productId:'cfg_test',designId:'native',sizeKey:'SIZE',revision:2}});
 assert.equal(page.card.hidden,false);assert.equal(page.material,'slate');assert.deepEqual(page.calls,[{removed:true},{target:'design-target',block:'start'}]);
});

test('material filter selects the native target and its preview and approval in the same card', async () => {
  const page = await openGallery({material: 'acrylic-schwarz-3mm', withTargets: true});
  assert.equal(page.card.hidden, false);
  assert.equal(page.card.dataset.productId, 'cfg_acrylic-schwarz-3mm');
  assert.equal(page.card.dataset.approvalKey, 'acrylic-schwarz-3mm-approval');
  assert.equal(page.image.src, '/acrylic-schwarz-3mm.svg');
  assert.equal(page.badge.textContent, 'acrylic-schwarz-3mm · Gravur');
});

test('a dirty inline edit remains on its material even when the global filter changes', async () => {
  const page = await openGallery({material: 'acrylic-schwarz-3mm', withTargets: true, dirty: true});
  assert.equal(page.card.hidden, false);
  assert.equal(page.card.dataset.material, 'steel');
  assert.equal(page.select.value, '0');
  assert.equal(page.image.src, undefined);
});

test('saved format identities survive option reordering instead of selecting an ordinal', async () => {
  const page = await openGallery({material: '', withTargets: true, formats: {'design-target': {productId: 'cfg_acrylic-schwarz-3mm', designId: 'native', sizeKey: 'acrylic-schwarz-3mm-100'}}});
  assert.equal(page.select.value, '1');
  assert.equal(page.card.dataset.material, 'acrylic-schwarz-3mm');
});

test('restoring hundreds of remembered formats performs one shared approval/filter pass', async () => {
  const page = await openGallery({material:'',withTargets:true,cardCount:462,formats:{'design-target':{productId:'cfg_acrylic-schwarz-3mm',designId:'native',sizeKey:'acrylic-schwarz-3mm-100'}}});
  assert.equal(page.approvalPasses,1);
  assert.equal(page.select.value,'1');
  assert.equal(page.card.dataset.material,'acrylic-schwarz-3mm');
});

test('filtering an open material shows its reason instead of another material preview', async () => {
  const page = await openGallery({material: 'acrylic-schwarz-3mm', withTargets: true, openAcrylic: true});
  assert.equal(page.card.hidden, false);
  assert.equal(page.card.dataset.productId, '');
  assert.equal(page.nativePreview.hidden, true);
  assert.equal(page.openPreview.hidden, false);
  assert.equal(page.openReason.textContent, 'Schriftdatei fehlt');
  assert.equal(page.image.src, undefined);
});

test('visible view and reset buttons preserve a dirty native target while updating actual filters',async()=>{
  const page=await openGallery({withTargets:true,dirty:true}),before={...page.card.dataset};
  const material=page.nodes.get('#material'),search=page.nodes.get('#search');
  material.value='acrylic-schwarz-3mm';material.emit('input');
  search.value='does not match';search.emit('input');
  page.navigation.find(button=>button.dataset.viewNav==='blanks').emit('click');
  assert.equal(page.body.dataset.reviewView,'blanks');
  assert.equal(page.navigation.find(button=>button.dataset.viewNav==='blanks')['aria-pressed'],'true');
  assert.equal(page.card.hidden,false,'unsaved card stays visible in the blank view');
  assert.equal(page.nodes.get('#theme').disabled,true);
  assert.equal(page.resets[0].disabled,false);
  page.resets[1].emit('click');
  assert.equal(material.value,'');assert.equal(search.value,'');
  assert.equal(page.nodes.get('#view').value,'blanks','reset filters does not silently switch views');
  assert.equal(page.card.dataset.productId,before.productId);
  assert.equal(page.card.dataset.designId,before.designId);
  assert.equal(page.card.dataset.material,before.material);
  assert.equal(page.select.value,'0');assert.equal(page.card.hidden,false);
  page.setDirty(false);page.navigation.find(button=>button.dataset.viewNav==='designs').emit('click');
  assert.equal(page.body.dataset.reviewView,'designs');assert.equal(page.nodes.get('#theme').disabled,false);
  assert.equal(page.card.hidden,false);assert.equal(page.resets[0].disabled,true);
});
