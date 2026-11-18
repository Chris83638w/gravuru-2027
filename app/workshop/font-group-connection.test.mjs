import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash, createHmac, randomUUID} from 'node:crypto';
import {createFontGroupConnection, projectFontConnection} from './font-group-connection.mjs';
import {syncHash} from './gallery-shop-sync-native.mjs';
import {createGallerySyncActivation} from './gallery-shop-sync-activation.mjs';
import {createFontGroupShopConnection} from '../../scripts/lib/font-group-connection.mjs';
import {createFontConnectionOperator} from '../../scripts/lib/font-connection-operator.mjs';
import {checkSelections, applyChecks} from '../../scripts/shop-bind.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {planFamilyFormats, blankDesignId} from './katalog-family-formats.mjs';
import {makeProductDocument} from './product-model.mjs';
import {createGallerySyncTestFixture, GALLERY_SYNC_TEST_SHOP as shopDomain, GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from './gallery-shop-sync-test-fixture.mjs';

async function fixture(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-connect-'));
  const f = await createGallerySyncTestFixture({directory: dir, activationOptions: {approvalMode: 'preserve'}, ...options});
  t.after(() => { f.close(); assert.ok(dir.startsWith(path.join(os.tmpdir(), 'font-connect-'))); fs.rmSync(dir, {recursive: true, force: true}); });
  const profiles = f.targetWorkshop.profiles;
  profiles.syncCatalogFontSet('synthetic-fonts', ['Allura', 'Montserrat']);
  const args = {workshop: f.targetWorkshop, tenantId: 'gravuru', shopDomain, activation: f.activation, transport: f.transport,
    targets: [{id: 'synthetic', setId: 'synthetic-fonts', reviewedRevision: 1, mapping: f.mapping}], approvedSets: [{id: 'synthetic-fonts', fonts: ['Allura', 'Montserrat']}],
    catalogFontSets: {list: () => ({sets: [{id: 'synthetic-fonts', fonts: ['Allura', 'Montserrat'], synchronized: true, profile: profiles.catalogFontSet('synthetic-fonts')}]})}};
  return {...f, args, connect: createFontGroupConnection({...args, executionEnabled: true})};
}
const approval = (f, revision) => f.targetWorkshop.orderIntake.catalogLiveApproval({shopDomain, shopifyProductId: PRODUCT,
  shopifyVariantId: f.variants[0].id, productId: f.target.id, productRevision: revision});

function followup(f, fonts, reviewedRevision) {
  f.targetWorkshop.profiles.syncCatalogFontSet('synthetic-fonts', fonts);
  return createFontGroupConnection({...f.args, executionEnabled: true,
    targets: [{...f.args.targets[0], reviewedRevision}], approvedSets: [{id: 'synthetic-fonts', fonts}],
    catalogFontSets: {list: () => ({sets: [{id: 'synthetic-fonts', fonts, synchronized: true, profile: f.targetWorkshop.profiles.catalogFontSet('synthetic-fonts')}]})}});
}

test('remote prices are checked before saving, both before planning and after the reviewed plan', async t => {
  const f = await fixture(t), before = f.activation.capture(f.mapping), plan = await f.connect.plan({targetId: 'synthetic'});
  f.transport.changeForTest(PRODUCT, p => p.variants[0].priceCents++);
  await assert.rejects(f.connect.plan({targetId: 'synthetic'}), {code: 'shop_binding_price'});
  await assert.rejects(f.connect.execute(plan), {code: 'shop_binding_price'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  assert.deepEqual(f.activation.capture(f.mapping), before);
  assert.equal(f.targetWorkshop.repository.importItem('font-connect:' + plan.sha256), null);
});

test('an interrupted connection can be replaced after a font change only with its exact journaled plan', async t => {
  const f = await fixture(t), plan = await f.connect.plan({targetId: 'synthetic'});
  const broken = createFontGroupConnection({...f.args, activation: {...f.activation, activate() { throw Error('interruption'); }}, executionEnabled: true});
  await assert.rejects(broken.execute(plan), /interruption/);
  const next = followup(f, ['Allura', 'Montserrat', 'Pacifico'], 1);
  await assert.rejects(f.connect.execute(plan), {code: 'font_connection_set_changed'});
  await assert.rejects(next.plan({targetId: 'synthetic'}), {code: 'font_connection_recovery_required'});
  const tampered = structuredClone(plan); tampered.metadata = {};
  await assert.rejects(next.plan({targetId: 'synthetic', recoveryPlan: tampered}), {code: 'font_connection_recovery_changed'});
  const fresh = await next.plan({targetId: 'synthetic', recoveryPlan: plan});
  assert.equal(fresh.fromRevision, 2); assert.equal(fresh.binding.boundRevision, 1);
  await next.execute(fresh);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 3);
  assert.deepEqual(f.targetWorkshop.repository.get(f.target.id).metadata.profiles.selections.fonts, ['Allura', 'Montserrat', 'Pacifico']);
});

test('consecutive interrupted own revisions can return to the bound font state; manual intervening revisions cannot', async t => {
  const f = await fixture(t), first = await f.connect.plan({targetId: 'synthetic'});
  const broken = createFontGroupConnection({...f.args, activation: {...f.activation, activate() { throw Error('interruption'); }}, executionEnabled: true});
  await assert.rejects(broken.execute(first), /interruption/);
  const second = await broken.plan({targetId: 'synthetic', recoveryPlan: first});
  await assert.rejects(broken.execute(second), /interruption/);
  const back = await f.connect.plan({targetId: 'synthetic', restoreRevision: 1, recoveryPlan: second});
  await f.connect.execute(back);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 4);
  assert.equal(syncHash(f.targetWorkshop.repository.get(f.target.id).document), syncHash(f.target.document));
  f.targetWorkshop.repository.save(f.target.id, {...f.target.document, name: 'Manual change'}, 4);
  const current = followup(f, ['Allura', 'Montserrat'], 4);
  await assert.rejects(current.plan({targetId: 'synthetic', recoveryPlan: second}), {code: 'font_connection_recovery_changed'});
  assert.equal(f.targetWorkshop.repository.get(f.target.id).document.name, 'Manual change');
});

test('unchanged effective settings permit a followup and rollback despite settings counter changes', async t => {
  const f = await fixture(t);
  await f.connect.execute(await f.connect.plan({targetId: 'synthetic'}));
  f.targetWorkshop.profiles.setDefault('motifs', {mode: 'empty', profileId: null}, 1);
  f.targetWorkshop.profiles.setDefault('motifs', {mode: 'inherit', profileId: null}, 2);
  const next = followup(f, ['Allura', 'Montserrat', 'Pacifico'], 2);
  await next.execute(await next.plan({targetId: 'synthetic'}));
  await next.execute(await next.plan({targetId: 'synthetic', restoreRevision: 1}));
  const record = f.targetWorkshop.repository.get(f.target.id);
  assert.equal(record.revision, 4); assert.equal(record.metadata.profiles.settingsRevision, 3);
  assert.deepEqual(record.metadata.profiles.selections, f.target.metadata.profiles.selections);
});

test('partial approval stops planning and execution without dropping existing per-variant approval', async t => {
  const f = await fixture(t), plan = await f.connect.plan({targetId: 'synthetic'}), orders = f.targetWorkshop.orderIntake;
  const approvals = orders.catalogLiveApprovals;
  orders.catalogLiveApprovals = entries => approvals(entries).map((a, i) => i ? a : null);
  await assert.rejects(f.connect.plan({targetId: 'synthetic'}), {code: 'gallery_sync_partial_approval'});
  await assert.rejects(f.connect.execute(plan), {code: 'gallery_sync_partial_approval'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  assert.ok(approval(f, 1)); assert.equal(approval(f, 2), null);
});

test('manually rehashed forward and rollback assignments cannot bypass managed sets or immutable history', async t => {
  const f = await fixture(t), plan = await f.connect.plan({targetId: 'synthetic'});
  const free = f.targetWorkshop.profiles.create({name: 'Free font list', type: 'fonts', items: ['Pacifico']});
  function changed(input, assignment) {
    const {sha256, ...body} = structuredClone(input), record = f.targetWorkshop.repository.get(f.target.id, {revision: input.fromRevision});
    const projected = projectFontConnection({repository: f.targetWorkshop.repository, record, assignment});
    Object.assign(body, {assignment, selectedProfile: null, documentSha256: syncHash(projected.document), metadata: projected.metadata});
    return {...body, sha256: syncHash(body)};
  }
  await assert.rejects(f.connect.execute(changed(plan, {mode: 'override', profileId: free.id})), {code: 'font_connection_set_changed'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  const noRevision = createFontGroupConnection({...f.args, targets: [{...f.args.targets[0], reviewedRevision: undefined}]});
  await assert.rejects(noRevision.plan({targetId: 'synthetic'}), {code: 'font_connection_reviewed_revision'});
  await f.connect.execute(plan);
  const restore = await f.connect.plan({targetId: 'synthetic', restoreRevision: 1});
  await assert.rejects(f.connect.execute(changed(restore, {mode: 'override', profileId: free.id})), {code: 'font_connection_set_changed'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 2);
});

test('doorbell and form products cannot enter the native catalogue font connection', async t => {
  const f = await fixture(t), record = structuredClone(f.target);
  record.document.config.doorbell = {};
  assert.throws(() => projectFontConnection({repository: f.targetWorkshop.repository, record, assignment: {mode: 'inherit', profileId: null}}), {code: 'font_connection_product_kind'});
  delete record.document.config.doorbell; record.document.schema = 'gravuru-form-product/v1';
  assert.throws(() => projectFontConnection({repository: f.targetWorkshop.repository, record, assignment: {mode: 'inherit', profileId: null}}), {code: 'font_connection_product_kind'});
});

test('rollback accepts only revisions that were actually bound for every mapped variant', async t => {
  const f = await fixture(t), first = await f.connect.plan({targetId: 'synthetic'});
  const broken = createFontGroupConnection({...f.args, activation: {...f.activation, activate() { throw Error('interruption'); }}, executionEnabled: true});
  await assert.rejects(broken.execute(first), /interruption/);
  await f.connect.execute(await f.connect.plan({targetId: 'synthetic', recoveryPlan: first}));
  assert.equal(f.activation.capture(f.mapping).boundRevision, 3);
  assert.equal(f.activation.wasBound(f.mapping, 2), false);
  await assert.rejects(f.connect.plan({targetId: 'synthetic', restoreRevision: 2}), {code: 'font_connection_restore_unbound'});
  const back = await f.connect.plan({targetId: 'synthetic', restoreRevision: 1});
  const {sha256, ...body} = structuredClone(back); body.restoreRevision = 2;
  await assert.rejects(f.connect.execute({...body, sha256: syncHash(body)}), {code: 'font_connection_restore_unbound'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 3);
  await f.connect.execute(back);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 4);
});

test('private operator saves, fsyncs and rereads the exact plan; restart executes only its persisted hash', async t => {
  const f = await fixture(t), planDirectory = path.join(f.dir, 'private-plans');
  const webRoots = [path.join(f.dir, 'public')], op = createFontConnectionOperator({connection: f.connect, planDirectory, webRoots});
  assert.equal(fs.existsSync(planDirectory), false, 'construction creates nothing');
  const stored = await op.plan({targetId: 'synthetic'});
  assert.equal(stored.path, path.join(planDirectory, stored.sha256 + '.json'));
  assert.equal(op.read(stored.sha256).sha256, stored.sha256);
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  assert.deepEqual(await op.plan({targetId: 'synthetic'}), stored, 'same complete file is reused without replacing it');
  await assert.rejects(op.execute(stored.sha256), {code: 'font_connection_execution_disabled'});
  const restarted = createFontConnectionOperator({connection: f.connect, planDirectory, webRoots, executionEnabled: true});
  await restarted.execute(stored.sha256);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 2);
  await restarted.execute(stored.sha256);
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 2);
});

test('missing, truncated or changed private plan files never execute and existing files are not overwritten', async t => {
  const f = await fixture(t), planDirectory = path.join(f.dir, 'private-plans');
  const webRoots = [path.join(f.dir, 'public')], op = createFontConnectionOperator({connection: f.connect, planDirectory, webRoots, executionEnabled: true});
  assert.throws(() => createFontConnectionOperator({connection: f.connect, planDirectory: path.join(webRoots[0], 'plans'), webRoots}), {code: 'font_connection_plan_file'});
  fs.mkdirSync(webRoots[0]);
  const link = path.join(f.dir, 'public-alias'); fs.symlinkSync(webRoots[0], link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => createFontConnectionOperator({connection: f.connect, planDirectory: path.join(link, 'plans'), webRoots}), {code: 'font_connection_plan_file'});
  await assert.rejects(op.execute('a'.repeat(64)), {code: 'font_connection_plan_file'});
  await assert.rejects(op.execute('../outside'), {code: 'font_connection_plan_file'});
  const stored = await op.plan({targetId: 'synthetic'}), document = op.read(stored.sha256);
  const {sha256, ...foreign} = structuredClone(document); foreign.target.mapping.target.productId = 'cfg_' + randomUUID();
  const foreignHash = syncHash(foreign);
  fs.writeFileSync(path.join(planDirectory, foreignHash + '.json'), JSON.stringify({...foreign, sha256: foreignHash}));
  await assert.rejects(op.execute(foreignHash), {code: 'font_connection_plan_changed'});
  document.assignment = {mode: 'empty', profileId: null};
  fs.writeFileSync(stored.path, JSON.stringify(document));
  await assert.rejects(op.execute(stored.sha256), {code: 'font_connection_plan_file'});
  fs.writeFileSync(stored.path, '{');
  await assert.rejects(op.execute(stored.sha256), {code: 'font_connection_plan_file'});
  await assert.rejects(op.plan({targetId: 'synthetic'}), {code: 'font_connection_plan_file'});
  assert.equal(fs.readFileSync(stored.path, 'utf8'), '{');
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 1);
});

test('a revision once bound to only one variant cannot be used as a product-wide rollback', async t => {
  const f = await fixture(t), w = f.targetWorkshop;
  const adapter = createShopBindingReadAdapter({storeId: 'acryl', tenantId: 'gravuru', shopDomain,
    workshop: {...w, sessionContext: {shopDomain}}, productionProfileScope: {storeId: 'acryl', tenantId: 'gravuru'}});
  const reader = {async inspectVariants(ids) { return {installation: {shopDomain, currency: 'EUR', scope: 'admin-readonly'}, variants: ids.map(id => {
    const v = f.variants.find(v => v.id === id); return {id, found: true, productId: PRODUCT, status: 'ACTIVE', priceCents: v.priceCents, options: Object.entries(v.options).map(([name, value]) => ({name, value}))};
  })}; }};
  const bind = async (revision, variants) => {
    const checks = await checkSelections(variants.map(v => ({shopifyProductId: PRODUCT, shopifyVariantId: v.id, productId: f.target.id, productRevision: revision, options: v.options, expectedUnitCents: v.priceCents})), {adapter, reader});
    applyChecks(checks, {orderIntake: w.orderIntake, storeId: 'acryl', shopDomain, adapter});
  };
  w.repository.save(f.target.id, f.target.document, 1);
  await bind(2, [f.variants[0]]);
  w.repository.save(f.target.id, f.target.document, 2);
  await bind(3, f.variants);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 3);
  assert.ok(f.registry.history({shopifyProductId: PRODUCT, shopifyVariantId: f.variants[0].id}).some(h => h.productRevision === 2));
  assert.equal(f.activation.wasBound(f.mapping, 2), false);
  await assert.rejects(f.connect.plan({targetId: 'synthetic', restoreRevision: 2}), {code: 'font_connection_restore_unbound'});
  assert.equal(w.repository.head(f.target.id).revision, 3);
});

test('private host factory uses the existing catalogue and read-only Shopify adapter; execution defaults off', async t => {
  const f = await fixture(t), katalogRoot = path.join(f.dir, 'katalog'), fonts = ['Michroma', 'Lato', 'Cinzel', 'Montserrat'];
  fs.cpSync(new URL('./fixtures/katalog/', import.meta.url), katalogRoot, {recursive: true});
  // This host wiring test supplies a synthetic available font catalogue. It
  // does not claim to verify production glyph files (a separate release gate).
  f.targetWorkshop.profiles.registerFonts(fonts);
  f.targetWorkshop.profiles.syncCatalogFontSet('tuerschilder', fonts);
  const calls = [], args = {workshop: f.targetWorkshop, shopDomain, katalogRoot,
    runtimeFonts: Object.fromEntries(fonts.map(n => [n, {regular: {units: 1000, glyphs: {}}}])),
    targets: [{...f.args.targets[0], setId: 'tuerschilder'}], approvedSets: [{id: 'tuerschilder', fonts}],
    graphql: async (query, variables) => {
      calls.push({query, variables}); assert.ok(query.startsWith('query ')); assert.equal(variables.id, PRODUCT);
      return {data: {shop: {myshopifyDomain: shopDomain, currencyCode: 'EUR'}, product: {id: PRODUCT,
        variants: {nodes: f.variants.map(v => ({id: v.id, price: (v.priceCents / 100).toFixed(2)})), pageInfo: {hasNextPage: false}},
        media: {nodes: [], pageInfo: {hasNextPage: false}}}}};
    }};
  assert.throws(() => createFontGroupShopConnection(), {code: 'font_connection_configuration'});
  const host = createFontGroupShopConnection(args), plan = await host.plan({targetId: 'synthetic'});
  await assert.rejects(host.execute(plan), {code: 'font_connection_execution_disabled'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  await createFontGroupShopConnection({...args, executionEnabled: true}).execute(plan);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 2);
  assert.equal(calls.length, 2); assert.ok(calls.every(c => c.query.startsWith('query ')));
  assert.deepEqual(f.targetWorkshop.repository.get(f.target.id).metadata.profiles.selections.fonts, fonts);
});

async function syntheticSteelBank() {
  const family = JSON.parse(fs.readFileSync(new URL('../../scripts/fixtures/steel-shopify-options/family.json', import.meta.url)));
  const fonts = JSON.parse(fs.readFileSync(new URL('../designs/aosu-labrador/assets/michroma-vectors.json', import.meta.url)));
  const size = family.sizes.find(s => s.groupKey === 'AB' && s.widthMm === 120 && s.heightMm === 80);
  const katalog = {families: new Map([[family.id, family]]), lines: new Map([['proof', {id: 'proof', name: 'Test', families: [family.id], subcategories: [{id: 'normal', name: 'Test', themeId: 'familie'}]}]]),
    designs: {masters: []}, theme: () => null, fontResources: async ids => ({fonts: Object.fromEntries(ids.map(id => [id, fonts[id]])), missing: ids.filter(id => !fonts[id])})};
  const {config, report} = await planFamilyFormats(katalog, 'proof', 'normal', {shopProduct: {sizeKey: size.key, themeId: 'familie', defaultDesignId: blankDesignId(size), groessenWahl: 'alle', vorlagen: 'leer'}});
  assert.deepEqual(report.blocked, []);
  return makeProductDocument(JSON.parse(JSON.stringify(config)), {name: 'Synthetic 404-variant font connection'});
}

test('preserve mode with 404 native variants rolls back after the last block and retries without duplicate history', async t => {
  const f = await fixture(t, {documentTransform: syntheticSteelBank}), before = f.activation.capture(f.mapping), plan = await f.connect.plan({targetId: 'synthetic'});
  assert.equal(before.heads.length, 404);
  assert.equal(f.target.document.config.familyFormats.formats.length, 80);
  assert.equal(new Set(f.target.document.config.familyFormats.formats.map(x => x.form)).size, 8);
  const orders = f.targetWorkshop.orderIntake, approve = orders.approveCatalogLiveProducts;
  let reachedAll = false;
  orders.approveCatalogLiveProducts = input => {
    assert.equal(input.products[0].productRevision, 2);
    // Same connection sees every pending block before the deliberate failure.
    assert.equal(f.activation.capture(f.mapping).boundRevision, 2);
    reachedAll = true; throw Error('failure after all 404 variants');
  };
  await assert.rejects(f.connect.execute(plan), /failure after all 404 variants/);
  assert.equal(reachedAll, true); assert.deepEqual(f.activation.capture(f.mapping), before);
  assert.equal(approval(f, 2), null);
  for (const v of f.variants) assert.equal(f.registry.history({shopifyProductId: PRODUCT, shopifyVariantId: v.id}).length, 1);
  orders.approveCatalogLiveProducts = approve;
  await f.connect.execute(plan);
  const after = f.activation.capture(f.mapping);
  assert.equal(after.boundRevision, 2); assert.equal(after.approved, true);
  assert.deepEqual(after.heads.map(h => [h.shopifyVariantId, h.options, h.unitCents, h.personalization]), before.heads.map(h => [h.shopifyVariantId, h.options, h.unitCents, h.personalization]));
  assert.equal(syncHash(f.targetWorkshop.repository.get(f.target.id).document.config), syncHash(f.target.document.config));
  assert.equal(f.transport.writes.length, 0);
});

test('font-only connection is disabled by default; real bindings, prices, old revision and approvals survive switch and forward rollback', async t => {
  const f = await fixture(t), before = structuredClone(f.target), initialBinding = f.activation.capture(f.mapping);
  const plan = await f.connect.plan({targetId: 'synthetic'});
  assert.deepEqual(f.targetWorkshop.repository.get(before.id), before);
  await assert.rejects(createFontGroupConnection(f.args).execute(plan), {code: 'font_connection_execution_disabled'});
  assert.equal(approval(f, 2), null);
  const result = await f.connect.execute(plan);
  assert.deepEqual(result, {productId: before.id, previousRevision: 1, revision: 2, approved: true});
  const after = f.targetWorkshop.repository.get(before.id), expected = structuredClone(before.document);
  expected.profileAssignments.fonts = {mode: 'override', profileId: f.targetWorkshop.profiles.catalogFontSet('synthetic-fonts').id};
  assert.deepEqual(after.document, expected, 'all design resources, UI data, options and price data unchanged');
  assert.deepEqual(after.metadata.profiles.selections.fonts, ['Allura', 'Montserrat']);
  assert.deepEqual(f.targetWorkshop.repository.get(before.id, {revision: 1}), before);
  assert.ok(approval(f, 1)); assert.ok(approval(f, 2));
  const current = f.activation.capture(f.mapping);
  assert.deepEqual(current.heads.map(h => [h.shopifyVariantId, h.options, h.unitCents, h.personalization]), initialBinding.heads.map(h => [h.shopifyVariantId, h.options, h.unitCents, h.personalization]));
  await createFontGroupConnection({...f.args, executionEnabled: true}).execute(JSON.parse(JSON.stringify(plan)));
  assert.equal(f.targetWorkshop.repository.head(before.id).revision, 2, 'restart/replay appends nothing');
  const rollback = await f.connect.plan({targetId: 'synthetic', restoreRevision: 1});
  await f.connect.execute(rollback);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 3);
  assert.deepEqual(f.targetWorkshop.repository.get(before.id).document, before.document);
  assert.deepEqual(f.targetWorkshop.repository.get(before.id).metadata, before.metadata);
  assert.ok(approval(f, 3));
  assert.equal(f.transport.writes.length, 0, 'no Shopify metadata, media or price writes');
});

test('non-font metadata drift and missing historical metadata stop before any draft or binding write', async t => {
  const f = await fixture(t), before = f.activation.capture(f.mapping);
  const plan = await f.connect.plan({targetId: 'synthetic'});
  f.targetWorkshop.profiles.setDefault('motifs', {mode: 'empty', profileId: null}, 1);
  await assert.rejects(f.connect.execute(plan), {code: 'font_connection_other_profiles_changed'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  assert.deepEqual(f.activation.capture(f.mapping), before);
  assert.throws(() => projectFontConnection({repository: f.targetWorkshop.repository, record: {...f.target, metadata: {}}, assignment: plan.assignment}), {code: 'font_connection_other_profiles_changed'});
});

test('empty historical metadata uses the existing effective fallback; unapproved product remains unapproved through connection and rollback', async t => {
  const f = await fixture(t, {historicalMetadata: {}, initiallyApproved: false});
  const before = f.targetWorkshop.model(f.target.id, 1).universal;
  assert.deepEqual(before.workshopProfiles.selections, {fonts: null, motifs: null, colors: null, bestsellers: null});
  const plan = await f.connect.plan({targetId: 'synthetic'});
  assert.equal(plan.binding.approved, false);
  const result = await f.connect.execute(plan);
  assert.equal(result.approved, false); assert.equal(approval(f, 2), null);
  const after = f.targetWorkshop.model(f.target.id, 2).universal;
  for (const type of ['motifs', 'colors', 'bestsellers']) assert.equal(after.workshopProfiles.selections[type], null);
  assert.deepEqual(after.workshopProfiles.selections.fonts, ['Allura', 'Montserrat']);
  // Compare the actual pinned customer model: only the font profile evidence
  // and the mandatory product revision identity may change.
  delete before.workshopProfiles; delete after.workshopProfiles;
  delete before.profile.revision; delete after.profile.revision;
  for (const id of Object.keys(after.localResources.fonts)) if (!Object.hasOwn(before.localResources.fonts, id)) {
    assert.ok(['Allura', 'Montserrat'].includes(id), 'only newly selected font resources may be added');
    delete after.localResources.fonts[id];
  }
  assert.equal(syncHash(after), syncHash(before), 'the rest of the actual customer model must remain identical');
  await f.connect.execute(await f.connect.plan({targetId: 'synthetic', restoreRevision: 1}));
  assert.equal(f.activation.capture(f.mapping).boundRevision, 3);
  assert.equal(approval(f, 3), null);
  assert.equal(f.targetWorkshop.model(f.target.id, 3).universal.workshopProfiles.selections.fonts, null);
  assert.deepEqual(f.targetWorkshop.repository.get(f.target.id, {revision: 1}).metadata, {});
});

test('historical import evidence cannot disappear and unconfirmed sets cannot be connected', async t => {
  const f = await fixture(t, {historicalMetadata: {importSource: 'synthetic-older-import'}});
  await assert.rejects(f.connect.plan({targetId: 'synthetic'}), {code: 'font_connection_other_profiles_changed'});
  const unknown = createFontGroupConnection({...f.args, approvedSets: [], executionEnabled: true});
  await assert.rejects(unknown.plan({targetId: 'synthetic'}), {code: 'font_connection_set_pending'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
});

test('existing surcharge contract stays exact; even a same-price contract revision change stops the font plan', async t => {
  let pricing;
  const f = await fixture(t, {initialPricingFor({record, variants}) {
    pricing = {schema: 'gravuru-personalization-pricing/v2', enabled: true, productId: PRODUCT, revision: 1, currency: 'EUR', extraLogoCents: 1299,
      variants: Object.fromEntries(variants.map(v => [v.id.split('/').at(-1), v.priceCents])),
      extraMotifCents: record.document.config.extraMotifCents, extraPhotoCents: record.document.config.photo.extraPriceCents};
    return pricing;
  }, activationOptions: {approvalMode: 'preserve', personalizationPricingFor: () => pricing}});
  const original = f.activation.capture(f.mapping), plan = await f.connect.plan({targetId: 'synthetic'});
  pricing.revision = 2;
  await assert.rejects(f.connect.plan({targetId: 'synthetic'}), {code: 'font_connection_contract_changed'});
  await assert.rejects(f.connect.execute(plan), {code: 'font_connection_contract_changed'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  pricing.revision = 1;
  await f.connect.execute(plan);
  assert.deepEqual(f.activation.capture(f.mapping).heads.map(h => h.personalization), original.heads.map(h => h.personalization));
});

test('a late approval error rolls all real variant bindings back; retry reuses the saved revision', async t => {
  const f = await fixture(t), before = f.activation.capture(f.mapping), plan = await f.connect.plan({targetId: 'synthetic'});
  const orders = f.targetWorkshop.orderIntake, approve = orders.approveCatalogLiveProducts;
  orders.approveCatalogLiveProducts = () => { throw Error('synthetic late approval failure'); };
  await assert.rejects(f.connect.execute(plan), /synthetic late approval failure/);
  assert.deepEqual(f.activation.capture(f.mapping), before);
  for (const variant of f.variants) assert.equal(f.registry.history({shopifyProductId: PRODUCT, shopifyVariantId: variant.id}).length, 1);
  orders.approveCatalogLiveProducts = approve;
  await f.connect.execute(plan);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 2);
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 2);
});

test('one stale expected variant head fails real CAS and leaves every old binding intact', async t => {
  const f = await fixture(t), before = f.activation.capture(f.mapping), plan = await f.connect.plan({targetId: 'synthetic'});
  const orders = f.targetWorkshop.orderIntake, original = orders.idBindings;
  orders.idBindings = function (args) {
    const registry = original.call(this, args);
    if (args.readOnly) return registry;
    return {...registry, persist(input) {
      const changed = {...input, expectedHeads: structuredClone(input.expectedHeads)}; changed.expectedHeads.at(-1).revision++;
      return registry.persist(changed);
    }};
  };
  const activation = createGallerySyncActivation({workshop: f.targetWorkshop, tenantId: 'gravuru', shopDomain, approvalMode: 'preserve'});
  const conflicted = createFontGroupConnection({...f.args, activation, executionEnabled: true});
  await assert.rejects(conflicted.execute(plan), {code: 'shop_binding_head_conflict'});
  assert.deepEqual(f.activation.capture(f.mapping), before);
  for (const v of f.variants) assert.equal(f.registry.history({shopifyProductId: PRODUCT, shopifyVariantId: v.id}).length, 1);
  assert.equal(approval(f, 2), null);
});

test('a concurrent product edit or variant change cannot overwrite the reviewed target', async t => {
  const f = await fixture(t), plan = await f.connect.plan({targetId: 'synthetic'}), before = f.activation.capture(f.mapping);
  const changedActivation = {...f.activation, capture: mapping => {
    const value = f.activation.capture(mapping); value.heads[0].assignmentRevision++; return value;
  }};
  await assert.rejects(createFontGroupConnection({...f.args, activation: changedActivation, executionEnabled: true}).execute(plan), {code: 'font_connection_bindings_changed'});
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 1);
  assert.deepEqual(f.activation.capture(f.mapping), before);
  f.targetWorkshop.repository.save(f.target.id, {...f.target.document, name: 'Concurrent edit'}, 1);
  await assert.rejects(f.connect.execute(plan), {code: 'font_connection_head_changed'});
  assert.equal(f.targetWorkshop.repository.get(f.target.id).document.name, 'Concurrent edit');
  assert.deepEqual(f.activation.capture(f.mapping), before);
});

test('restart after draft save resumes exact revision; failed activation never changes existing bindings', async t => {
  const f = await fixture(t), plan = await f.connect.plan({targetId: 'synthetic'}), before = f.activation.capture(f.mapping);
  const broken = createFontGroupConnection({...f.args, activation: {...f.activation, activate() { throw Error('simulated activation interruption'); }}, executionEnabled: true});
  await assert.rejects(broken.execute(plan), /simulated activation interruption/);
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 2);
  assert.deepEqual(f.activation.capture(f.mapping), before);
  assert.equal(approval(f, 2), null);
  await f.connect.execute(plan);
  assert.equal(f.targetWorkshop.repository.head(f.target.id).revision, 2);
  assert.equal(f.activation.capture(f.mapping).boundRevision, 2);
  assert.ok(approval(f, 2));
});

test('an existing customer draft can still be saved, offered and accepted against the old revision after connection', async t => {
  const f = await fixture(t), store = f.targetWorkshop.customerDrafts, orders = f.targetWorkshop.orderIntake;
  const draft = store.create(f.target, f.mapping.target.designId, {synthetic: true});
  const oldBinding = f.registry.resolve({shopifyProductId: PRODUCT, shopifyVariantId: f.variants[0].id});
  await f.connect.execute(await f.connect.plan({targetId: 'synthetic'}));
  store.save(draft.id, draft.token, {synthetic: true, editedAfterSwitch: true}, 1);
  const current = store.get(draft.id, draft.token);
  assert.equal(current.productRevision, 1); assert.equal(current.revision, 2);
  const bytes = Buffer.from('isolated historical draft'), v = f.variants[0];
  const manifest = {schema: 'gravuru-native-review/v1', id: 'proof_' + randomUUID(), createdAt: new Date().toISOString(),
    source: {draftId: draft.id, draftRevision: 2, designId: draft.designId}, product: {id: f.target.id, revision: 1, basePriceCents: v.priceCents, currency: 'EUR'},
    selection: {options: v.options, price: {unitCents: v.priceCents, quantity: 1}}, packageSha256: createHash('sha256').update(bytes).digest('hex'), blockers: [], warnings: [], photos: []};
  store.capture(draft.id, draft.token, 2, {manifest, preview: Buffer.from('<svg/>'), contourPdf: bytes, package: bytes, photos: bytes});
  const offer = orders.offer({bindingId: oldBinding.bindingId, snapshotId: manifest.id, quantity: 1});
  const raw = Buffer.from(JSON.stringify({id: 168500, test: false, financial_status: 'paid', currency: 'EUR', line_items: [
    {id: 168501, product_id: 168001, variant_id: Number(v.id.split('/').at(-1)), quantity: 1, price: (v.priceCents / 100).toFixed(2), properties: [offer.property]}]}));
  const secret = 'isolated-synthetic-secret-only';
  const paid = orders.receive(raw, {'x-shopify-hmac-sha256': createHmac('sha256', secret).update(raw).digest('base64'), 'x-shopify-shop-domain': shopDomain,
    'x-shopify-api-version': '2026-07', 'x-shopify-topic': 'orders/paid', 'x-shopify-webhook-id': 'synthetic-font-connection-paid'},
  {shopDomain, secret, apiVersion: '2026-07', mode: 'catalog-live-approved'});
  assert.equal(paid.lines.length, 1, JSON.stringify(paid));
});
