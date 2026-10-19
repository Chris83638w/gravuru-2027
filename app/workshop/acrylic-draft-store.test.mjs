import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';

function bundle(changes = {}) {
  const bytes = Buffer.from('synthetic archive ' + randomUUID());
  return {manifest: {schema: 'gravuru-acrylic-review/v1', id: 'proof_' + randomUUID(),
    source: {draftId: 'acrylic_' + randomUUID(), draftRevision: 1, designId: 'synthetic-design'},
    product: {id: 'cfg_synthetic', revision: 2, basePriceCents: 2999, currency: 'EUR'},
    packageSha256: createHash('sha256').update(bytes).digest('hex'), blockers: [], warnings: [], photos: [], ...changes},
    package: bytes, preview: Buffer.from('<svg/>'), contourPdf: Buffer.alloc(0), photos: Buffer.from('synthetic originals')};
}
function setup(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'g27-acrylic-private-')), filename = path.join(directory, 'private.sqlite');
  let store = createFormCustomerStore({filename});
  t.after(() => {store.close(); rmSync(directory, {recursive: true, force: true});});
  return {filename, get store() {return store;}, get drafts() {return store.acrylicDrafts;},
    reopen() {store.close(); store = createFormCustomerStore({filename});}};
}

test('private acrylic ownership survives restart and stores only the access token hash', t => {
  const f = setup(t), b = bundle(), original = structuredClone(b.manifest), draft = f.drafts.create(b);
  assert.match(draft.id, /^adraft_/); assert.match(draft.token, /^[a-f0-9]{64}$/);
  assert.equal(draft.snapshotId, b.manifest.id); const {token, ...safe} = draft;
  assert.deepEqual(f.drafts.get(draft.id, token), safe); f.reopen(); assert.deepEqual(f.drafts.get(draft.id, token), safe);
  assert.deepEqual(f.store.review(draft.snapshotId).manifest, original);
  assert.deepEqual(f.store.downloadSnapshot(draft.snapshotId, 'package'), b.package);
  const db = new DatabaseSync(f.filename, {readOnly: true});
  try {assert.ok(!JSON.stringify(db.prepare('SELECT * FROM acrylic_customer_drafts').all()).includes(token));} finally {db.close();}
});
test('missing, malformed and foreign access tokens cannot read or save private drafts', t => {
  const f = setup(t), a = f.drafts.create(bundle()), b = f.drafts.create(bundle());
  for (const token of [undefined, 'bad', 'f'.repeat(64), b.token, [a.token]]) {
    assert.throws(() => f.drafts.get(a.id, token), e => e.status === 404);
    assert.throws(() => f.drafts.save(a.id, token, 1, bundle()), e => e.status === 404);
  }
  assert.equal(f.store.listSnapshots().length, 2);
});
test('saving adds a revision and preserves earlier archives and originals byte for byte', t => {
  const f = setup(t), first = bundle(), draft = f.drafts.create(first), second = bundle();
  const saved = f.drafts.save(draft.id, draft.token, 1, second);
  assert.equal(saved.revision, 2); assert.equal(saved.snapshotId, second.manifest.id); assert.ok(!('token' in saved));
  assert.deepEqual(f.store.downloadSnapshot(first.manifest.id, 'package'), first.package);
  assert.deepEqual(f.store.downloadSnapshot(first.manifest.id, 'photos'), first.photos);
  assert.equal(f.store.listSnapshots().length, 2); f.reopen(); assert.deepEqual(f.drafts.get(draft.id, draft.token), saved);
  const db = new DatabaseSync(f.filename);
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM acrylic_customer_revisions').get().n, 2);
    assert.throws(() => db.exec("UPDATE acrylic_customer_revisions SET snapshot_id='other'"), /immutable/);
    assert.throws(() => db.exec('DELETE FROM acrylic_customer_revisions'), /retention/);
  } finally {db.close();}
});
test('two connections reject a stale save without leaving an extra snapshot', t => {
  const f = setup(t), draft = f.drafts.create(bundle()), second = createFormCustomerStore({filename: f.filename});
  try {
    f.drafts.save(draft.id, draft.token, 1, bundle());
    assert.throws(() => second.acrylicDrafts.save(draft.id, draft.token, 1, bundle()), e => e.status === 409);
    assert.equal(f.store.listSnapshots().length, 2); assert.equal(second.acrylicDrafts.get(draft.id, draft.token).revision, 2);
  } finally {second.close();}
});
test('product, product revision and design cannot be switched on a saved private draft', t => {
  const f = setup(t), draft = f.drafts.create(bundle());
  for (const change of [{product: {id: 'cfg_other', revision: 2}}, {product: {id: draft.productId, revision: 3}},
    {source: {draftId: 'acrylic_other', draftRevision: 1, designId: 'other'}}]) {
    assert.throws(() => f.drafts.save(draft.id, draft.token, 1, bundle(change)), e => e.status === 409);
  }
  assert.equal(f.store.listSnapshots().length, 1);
});
test('invalid archives and collisions roll back without capturing or reassigning a snapshot', t => {
  const f = setup(t), b = bundle(), draft = f.drafts.create(b);
  assert.throws(() => f.drafts.create(b));
  assert.throws(() => f.drafts.save(draft.id, draft.token, 1, b));
  const broken = bundle(); broken.package[0] ^= 1;
  assert.throws(() => f.drafts.create(broken), e => e.status === 422);
  assert.equal(f.store.listSnapshots().length, 1); assert.equal(f.drafts.get(draft.id, draft.token).revision, 1);
});

test('acrylic cart access uses private ownership and current snapshot, not the historical manifest draft ID', async t => {
  const f = setup(t), b = bundle(), draft = f.drafts.create(b), other = f.drafts.create(bundle());
  let resolves = 0, calls = 0;
  const offerToken = 'a'.repeat(64), shopDomain = 'gravuru-synthetic.myshopify.com';
  // Offer resolution is isolated here; the HTTP integration test below uses real
  // product validation/bundles. The shared cart resolver has its own DB tests.
  const drafts = {...f.store, orderIntake: {resolveCartOffer() {resolves++; return {id: 'offer_synthetic',
    scope: 'test-checkout-only', variantId: '301', quantity: 2, unitCents: 2999, currency: 'EUR',
    property: {name: '_gravuru_offer', value: offerToken}};}}};
  const submit = createDraftCartHandoff({drafts, config: {shopDomain, apiVersion: '2026-07', privateToken: 'synthetic-private-token'}}, {
    fetchImpl: async (_url, options) => {
      calls++; const line = JSON.parse(options.body).variables.input.lines[0];
      return Response.json({data: {cartCreate: {userErrors: [], warnings: [], cart: {
        id: 'gid://shopify/Cart/synthetic', checkoutUrl: `https://${shopDomain}/checkout/synthetic`,
        lines: {pageInfo: {hasNextPage: false}, nodes: [{id: 'gid://shopify/CartLine/synthetic?cart=synthetic', quantity: 2, merchandise: {id: line.merchandiseId},
          attributes: line.attributes, cost: {amountPerQuantity: {amount: '29.99', currencyCode: 'EUR'},
            totalAmount: {amount: '59.98', currencyCode: 'EUR'}}}]}}}}});
    }});
  const input = {draftId: draft.id, snapshotId: draft.snapshotId, expectedRevision: 1, offerId: 'offer_synthetic', offerToken};
  const context = {draftToken: draft.token, buyerIp: '192.0.2.5'};
  await assert.rejects(submit({...input, draftId: other.id}, {...context, draftToken: other.token}), e => e.code === 'cart_private');
  assert.equal(resolves, 0); assert.equal(calls, 0);
  assert.equal((await submit(input, context)).duplicate, false);
  assert.equal((await submit(input, context)).duplicate, true); assert.equal(calls, 1);
  f.drafts.save(draft.id, draft.token, 1, bundle());
  await assert.rejects(submit(input, context), e => e.code === 'cart_stale');
  await assert.rejects(submit({...input, expectedRevision: 2}, context), e => e.code === 'cart_private'); assert.equal(calls, 1);
});
