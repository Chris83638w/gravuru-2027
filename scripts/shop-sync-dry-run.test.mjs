import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {targetsForLine, planShopSync, ACTIONS} from './shop-sync.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/shop-sync/', import.meta.url));
const KATALOG = path.join(FIXTURE, 'katalog');
const EXPORT = path.join(FIXTURE, 'export-7x2.json');
const LINE = 'edelstahl-tuerschilder';
const FONT={regular:{units:1000,glyphs:Object.fromEntries([...new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ')].map(c=>[c,{a:400,d:'M0 0 L300 0 L300 600 L0 600 Z'}]))}},FONTS={Michroma:FONT};
const STAMP = '2026-10-24T12:00:00.000Z';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const exportDoc = () => JSON.parse(fs.readFileSync(EXPORT, 'utf8'));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const byMain = (plan, id, size) => plan.entries.find(e => e.mainProductId === id && (!size || e.sizeKey === size));

function snapshot(root) {
  return fs.readdirSync(root, {withFileTypes:true}).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? snapshot(file).map(([rel, hash]) => [entry.name + '/' + rel, hash]) : [[entry.name, sha256(fs.readFileSync(file))]];
  });
}
const fixtureBefore = snapshot(FIXTURE);
// A regression must fail before attempting any request, even with credentials present.
const originalFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = () => { networkCalls++; throw Error('Unexpected network access in offline dry-run'); };
const fakeEnv = {
  GRAVURU_SHOPIFY_ADMIN_ACCESS_TOKEN:'offline_test_token_never_use_00000000',
  GRAVURU_SHOPIFY_CLIENT_SECRET:'offline_test_secret_never_use_00000000',
  GRAVURU_SHOPIFY_CLIENT_SECRET_FILE:path.join(os.tmpdir(), 'offline-secret-must-not-be-read.txt')
};
const previousEnv = Object.fromEntries(Object.keys(fakeEnv).map(key => [key, process.env[key]]));
Object.assign(process.env, fakeEnv);
after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  assert.equal(networkCalls, 0, 'no HTTP request may be attempted');
  assert.deepEqual(snapshot(FIXTURE), fixtureBefore, 'checked-in catalog and export fixtures stay byte-identical');
});
const {prepareDryRun, run} = await import('./shop-sync-dry-run.mjs');

function temporary(t, {designs = null} = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gravuru-offline-dry-run-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(base)), path.resolve(os.tmpdir()));
    fs.rmSync(base, {recursive:true, force:true});
  });
  const katalogRoot = path.join(base, 'katalog');
  fs.cpSync(KATALOG, katalogRoot, {recursive:true});
  const exportFile = path.join(base, 'products.json');
  fs.copyFileSync(EXPORT, exportFile);
  if (designs !== null) {
    const katalog=openKatalog(katalogRoot),targets=targetsForLine(katalog,LINE).targets,ids=new Set(targets.map(target=>target.startDesign));
    for (const id of ids) {
      const dir = path.join(katalogRoot, 'designs', 'edelstahl-gravur-70x23', id);
      fs.mkdirSync(dir, {recursive:true});
      const target=targets.find(target=>target.startDesign===id),size=katalog.families.get(target.family).sizes.find(size=>size.key===target.sizeKey),plateMm=[size.widthMm,size.heightMm];
      fs.writeFileSync(path.join(dir,'design.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+plateMm.join(' ')+'"><text id="text-1" x="'+size.widthMm/2+'" y="'+size.heightMm/2+'" text-anchor="middle" font-size="5" font-family="Michroma">Fixture</text></svg>');
      const data={id,name:'Offline test fixture',plateMm,sizes:[size.key],material:'Edelstahl',process:'Gravur',form:'Rechteck',themes:['familienschilder']};
      if (designs === 'released') data.freigabe = {status:'freigegeben', am:STAMP, von:'synthetic test only'};
      fs.writeFileSync(path.join(dir, 'design.json'), JSON.stringify(data) + '\n');
    }
  }
  return {base, katalogRoot, exportFile};
}
const inputs = context => ({catalog:snapshot(context.katalogRoot), export:sha256(fs.readFileSync(context.exportFile))});
const prepare = context => prepareDryRun({...context, lineId:LINE, generatedAt:STAMP,available:FONTS});
const argv = (context, out, withExport = false) => ['--katalog', context.katalogRoot, '--linie', LINE, '--out', out, ...(withExport ? ['--export', context.exportFile] : [])];
function capture() {
  let text = '';
  return {available:FONTS,stdout:{write(value) { text += value; }}, get text() { return text; }};
}

function assertCatalog(report, root) {
  const catalog = openKatalog(root), expected = targetsForLine(catalog, LINE,{fonts:FONTS});
  const mains = catalog.lines.get(LINE).subcategories.flatMap(sub => sub.mainProducts ?? []);
  assert.deepEqual(report.catalog.line, expected.line);
  assert.deepEqual(report.catalog.targets, expected.targets);
  assert.deepEqual(report.catalog.notes, expected.notes);
  assert.deepEqual(report.catalog.counts, {
    mainProducts:mains.length,
    withShopifyProductId:mains.filter(main => main.externalIds?.shopifyProductId).length,
    withoutShopifyProductId:mains.filter(main => !main.externalIds?.shopifyProductId).length,
    targets:expected.targets.length,
    targetVariants:expected.targets.reduce((count, target) => count + target.variants.length, 0),
    releasedTargets:expected.targets.filter(target => target.designReleased).length,
    blockedTargets:expected.targets.filter(target => target.open.length).length,
    withoutPlannerBlockers:expected.targets.filter(target => !target.open.length).length
  });
  for (const action of ACTIONS) assert.equal(Object.hasOwn(report.catalog.counts, action), false, 'catalog counts must not invent shop actions');
  return expected;
}

function assertPlan(report, context, doc) {
  const expected = planShopSync(targetsForLine(openKatalog(context.katalogRoot), LINE,{fonts:FONTS}), doc, {generatedAt:STAMP});
  assert.equal(report.mode, 'export-plan');
  assert.deepEqual(report.plan, expected, 'wrapper preserves the existing planner, including its defaults');
  assert.deepEqual(report.export, {
    file:path.basename(context.exportFile), sha256:sha256(fs.readFileSync(context.exportFile)),
    ...expected.export, shopDomain:doc.shopDomain
  });
}

test('catalog-only: real catalog targets, no shop counts or invented plan; missing approvals stay open', async t => {
  const context = temporary(t), before = inputs(context);
  const report = await prepareDryRun({katalogRoot:context.katalogRoot, lineId:LINE, generatedAt:STAMP,available:FONTS});
  assert.equal(report.schema, 'gravuru-shop-sync-dry-run/v1');
  assert.equal(report.generatedAt, STAMP);
  assert.equal(report.mode, 'catalog-only');
  assert.equal(report.export, null);
  assert.equal(report.plan, null);
  assertCatalog(report, context.katalogRoot);
  assert.equal(report.catalog.counts.releasedTargets, 0);
  assert.equal(report.catalog.counts.blockedTargets, report.catalog.counts.targets);
  assert.ok(report.catalog.targets.every(target => target.open.some(reason => /keine Freigabe möglich/.test(reason))));
  assert.deepEqual(inputs(context), before);
});

test('unapproved local masters remain open even with an otherwise complete export', async t => {
  const context = temporary(t, {designs:'unreleased'}), doc = exportDoc();
  doc.complete = true;
  fs.writeFileSync(context.exportFile, JSON.stringify(doc));
  const before = inputs(context), report = await prepare(context);
  assertPlan(report, context, doc);
  assertCatalog(report, context.katalogRoot);
  assert.equal(report.plan.counts.offen, report.catalog.counts.targets);
  assert.ok(report.plan.entries.every(entry => entry.action === 'offen' && !entry.input));
  assert.ok(report.plan.entries.every(entry => entry.reasons.some(reason => /nicht freigegeben/.test(reason))));
  assert.deepEqual(inputs(context), before);
});

test('released TEMP masters: full and partial exports retain the genuine planner counts and creation safeguards', async t => {
  const context = temporary(t, {designs:'released'}), doc = exportDoc();
  doc.products = doc.products.filter(product => product.id !== 'gid://shopify/Product/16099000000001');
  const results = [];
  for (const complete of [false, true]) {
    doc.complete = complete;
    fs.writeFileSync(context.exportFile, JSON.stringify(doc));
    const before = inputs(context), report = await prepare(context);
    assertPlan(report, context, doc);
    assertCatalog(report, context.katalogRoot);
    assert.equal(report.export.complete, complete);
    const target = byMain(report.plan, '9900000', 'GR-ES-RE-80X20-T15');
    assert.equal(target.action, complete ? 'create' : 'offen');
    if (complete) assert.equal(target.input.status, 'DRAFT');
    else {
      assert.match(target.reasons.join(' '), /Teilexport/);
      assert.equal(report.plan.counts.create, 0);
      assert.equal(target.input, null);
    }
    assert.ok(report.plan.counts.update > 0, 'released designs are actually planned');
    assert.ok(report.plan.counts.konflikt > 0, 'existing option conflict remains visible');
    assert.ok(report.plan.counts.offen > 0, 'other missing prerequisites remain open');
    assert.deepEqual(inputs(context), before);
    results.push(report.plan.counts);
  }
  assert.notDeepEqual(results[0], results[1]);
});

test('same design fingerprint keeps data-only differences unchanged: no implicit data-update bypass', async t => {
  const context = temporary(t, {designs:'released'}), doc = exportDoc();
  const target = targetsForLine(openKatalog(context.katalogRoot), LINE,{fonts:FONTS}).targets.find(target => target.mainProductId === '3100000');
  const product = doc.products.find(product => product.id === 'gid://shopify/Product/16077793821052');
  product.designSha256 = target.designSha256;
  product.variants.nodes[0].price = '9.99';
  fs.writeFileSync(context.exportFile, JSON.stringify(doc));
  const before = inputs(context), report = await prepare(context);
  assertPlan(report, context, doc);
  assert.equal(byMain(report.plan, '3100000').action, 'unverändert');
  assert.equal(byMain(report.plan, '3100000').dataChangesSkipped, true);
  assert.deepEqual(inputs(context), before);
});

test('run writes only new LF reports, plus the exact plan when given an export; inputs and credential values never enter the outputs', async t => {
  const context = temporary(t, {designs:'released'}), before = inputs(context);
  for (const withExport of [false, true]) {
    // A sibling with the same prefix is outside the catalog and must be accepted.
    const out = path.join(context.base, 'katalog-bericht-' + withExport), output = capture();
    const report = await run(argv(context, out, withExport), output);
    assert.deepEqual(fs.readdirSync(out).sort(), withExport ? ['bericht.json','bericht.md','plan.json'] : ['bericht.json','bericht.md']);
    assert.deepEqual(readJson(path.join(out, 'bericht.json')), report);
    if (withExport) assert.deepEqual(readJson(path.join(out, 'plan.json')), report.plan);
    else assert.equal(report.plan, null);
    for (const name of fs.readdirSync(out)) {
      const text = fs.readFileSync(path.join(out, name), 'utf8');
      assert.ok(text.endsWith('\n'), name + ' has a final LF');
      assert.ok(!text.includes('\r'), name + ' uses LF, including on Windows');
      for (const secret of Object.values(fakeEnv)) assert.ok(!text.includes(secret), 'no credential values in reports');
    }
    const markdown = fs.readFileSync(path.join(out, 'bericht.md'), 'utf8');
    if (withExport) assert.match(markdown, /TEILEXPORT/);
    else {
      assert.match(markdown, /Shop-Aktionszähler sind nicht ermittelt/);
      assert.doesNotMatch(markdown, /\| Geplante Aktion \|/);
    }
    assert.match(output.text, /Berichte:/);
  }
  assert.deepEqual(inputs(context), before);
});

test('run rejects catalog-contained or existing output paths before writing anything', async t => {
  const context = temporary(t), existing = path.join(context.base, 'already-there');
  fs.mkdirSync(existing);
  fs.writeFileSync(path.join(existing, 'keep.txt'), 'unchanged\n');
  const before = snapshot(context.base);
  for (const out of [context.katalogRoot, path.join(context.katalogRoot, 'reports'), path.join(context.katalogRoot, 'nested', 'reports'), existing]) {
    await assert.rejects(() => run(argv(context, out), capture()), /außerhalb|existiert bereits/);
    assert.deepEqual(snapshot(context.base), before);
  }
});

test('strict CLI refuses apply/create/bypass, unknown, duplicated and missing options; help needs no files', async t => {
  const context = temporary(t), out = path.join(context.base, 'must-not-exist'), valid = argv(context, out);
  const before = snapshot(context.base);
  for (const option of ['--apply','--create','--alle-designs','--daten-aktualisieren','--unknown','unexpected-positional']) {
    await assert.rejects(() => run([...valid, option], capture()), /nicht erlaubte Option/);
  }
  for (const [option, value] of [['--katalog',context.katalogRoot],['--linie',LINE],['--out',out],['--export',context.exportFile]]) {
    const first = option === '--export' ? [...valid, option, value] : valid;
    await assert.rejects(() => run([...first, option, value], capture()), /doppelt/);
  }
  for (const missing of [[], ['--katalog'], ['--katalog',context.katalogRoot,'--linie',LINE], [...valid,'--export'], [...valid,'--help']]) {
    await assert.rejects(() => run(missing, capture()));
  }
  const output = capture();
  assert.equal(await run(['--help'], output), null);
  assert.match(output.text, /--katalog/);
  assert.deepEqual(snapshot(context.base), before);
});

test('full export: a missing SKU cannot turn the existing 80x20 product from update into create; null remains valid', async t => {
  const context = temporary(t, {designs:'released'}), doc = exportDoc();
  doc.complete = true;
  const product = doc.products.find(product => product.id === 'gid://shopify/Product/16099000000001');
  const variant = product.variants.nodes.find(variant => variant.sku === 'TRE-V2A-8x2-D1');
  assert.ok(variant, 'the fixture contains the existing product and its identifying SKU');
  fs.writeFileSync(context.exportFile, JSON.stringify(doc));
  const baseline = await prepare(context);
  assertPlan(baseline, context, doc);
  assert.equal(byMain(baseline.plan, '9900000', 'GR-ES-RE-80X20-T15').action, 'update');

  delete variant.sku;
  fs.writeFileSync(context.exportFile, JSON.stringify(doc));
  const before = inputs(context), out = path.join(context.base, 'no-create-report'), output = capture();
  await assert.rejects(() => run(argv(context, out, true), output), /SKU-Feld/);
  assert.equal(fs.existsSync(out), false, 'no create plan or report may be written from a missing-SKU export');
  assert.equal(output.text, '');
  assert.deepEqual(inputs(context), before);

  variant.sku = 'TRE-V2A-8x2-D1';
  doc.products[0].variants.nodes[0].sku = null;
  fs.writeFileSync(context.exportFile, JSON.stringify(doc));
  const nullBefore = inputs(context), withNull = await prepare(context);
  assertPlan(withNull, context, doc);
  assert.equal(byMain(withNull.plan, '9900000', 'GR-ES-RE-80X20-T15').action, 'update');
  assert.deepEqual(inputs(context), nullBefore);
});

test('malformed or wrong-shop exports fail before a report directory is created', async t => {
  const context = temporary(t), out = path.join(context.base, 'must-not-exist');
  const cases = [
    ['array export', doc => doc.products],
    ['wrong shop', doc => ({...doc, shopDomain:'wrong.myshopify.com'})],
    ['missing shop', doc => { delete doc.shopDomain; return doc; }],
    ['schema', doc => ({...doc, schema:'unknown/v1'})],
    ['complete', doc => ({...doc, complete:'true'})],
    ['date', doc => ({...doc, exportedAt:'not-a-date'})],
    ['products', doc => ({...doc, products:{}})],
    ['duplicate product', doc => { doc.products.push(structuredClone(doc.products[0])); return doc; }],
    ['missing product ID', doc => { delete doc.products[0].id; return doc; }],
    ['options missing', doc => { delete doc.products[0].options; return doc; }],
    ['option name', doc => { delete doc.products[0].options[0].name; return doc; }],
    ['option values', doc => { delete doc.products[0].options[0].values; return doc; }],
    ['empty variants', doc => { doc.products[0].variants.nodes = []; return doc; }],
    ['duplicate variant', doc => { const nodes = doc.products[0].variants.nodes; nodes.push(structuredClone(nodes[0])); return doc; }],
    ['selected options', doc => { delete doc.products[0].variants.nodes[0].selectedOptions; return doc; }],
    ['missing SKU', doc => { delete doc.products[0].variants.nodes[0].sku; return doc; }],
    ...[123, false, {}, []].map(value => ['non-string SKU ' + JSON.stringify(value), doc => { doc.products[0].variants.nodes[0].sku = value; return doc; }]),
    ['incomplete variant page', doc => { doc.products[0].variants.pageInfo = {hasNextPage:true}; return doc; }]
  ];
  for (const [name, mutate] of cases) {
    fs.writeFileSync(context.exportFile, JSON.stringify(mutate(exportDoc())));
    const before = inputs(context);
    await assert.rejects(() => run(argv(context, out, true), capture()), /Export/, name);
    assert.equal(fs.existsSync(out), false, name);
    assert.deepEqual(inputs(context), before, name);
  }
});
