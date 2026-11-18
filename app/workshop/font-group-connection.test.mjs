import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash, createHmac, randomUUID} from 'node:crypto';
import {createFontGroupConnection, projectFontConnection} from './font-group-connection.mjs';
import {syncHash} from './gallery-shop-sync-native.mjs';
import {createGallerySyncActivation} from './gallery-shop-sync-activation.mjs';
import {createGallerySyncTestFixture, GALLERY_SYNC_TEST_SHOP as shopDomain, GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from './gallery-shop-sync-test-fixture.mjs';

async function fixture(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'font-connect-'));
  const f = await createGallerySyncTestFixture({directory: dir, activationOptions: {approvalMode: 'preserve'}, ...options});
  t.after(() => { f.close(); assert.ok(dir.startsWith(path.join(os.tmpdir(), 'font-connect-'))); fs.rmSync(dir, {recursive: true, force: true}); });
  const profiles = f.targetWorkshop.profiles;
  profiles.syncCatalogFontSet('synthetic-fonts', ['Allura', 'Montserrat']);
  const args = {workshop: f.targetWorkshop, tenantId: 'gravuru', shopDomain, activation: f.activation, transport: f.transport,
    targets: [{id: 'synthetic', setId: 'synthetic-fonts', mapping: f.mapping}], approvedSets: [{id: 'synthetic-fonts', fonts: ['Allura', 'Montserrat']}],
    catalogFontSets: {list: () => ({sets: [{id: 'synthetic-fonts', fonts: ['Allura', 'Montserrat'], synchronized: true, profile: profiles.catalogFontSet('synthetic-fonts')}]})}};
  return {...f, args, connect: createFontGroupConnection({...args, executionEnabled: true})};
}
const approval = (f, revision) => f.targetWorkshop.orderIntake.catalogLiveApproval({shopDomain, shopifyProductId: PRODUCT,
  shopifyVariantId: f.variants[0].id, productId: f.target.id, productRevision: revision});

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
