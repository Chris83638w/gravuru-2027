import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Readable} from 'node:stream';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {readReviewPackage} from './review-package.mjs';
import {ACRYLIC_REVIEW} from './acrylic-review.mjs';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';

// Exercise the real route handler with streams, without a listening socket.
// Host/origin checks live in the outer HTTP server and are not covered here.
async function request(workshop, pathname, method = 'GET', input, headers = {}) {
  const req = Readable.from(input === undefined ? [] : [Buffer.from(JSON.stringify(input))]);
  req.method = method; req.headers = {'content-type': 'application/json', ...headers};
  const res = {headersSent: false, writeHead(status, headers) {this.status = status; this.headers = headers; this.headersSent = true; return this;},
    end(bytes) {this.body = JSON.parse(Buffer.from(bytes).toString());}};
  await workshop.handle(req, res, new URL(pathname, 'http://127.0.0.1'));
  return res;
}

test('private acrylic routes validate real designs, enforce access/revisions and preserve original photo archives', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-acrylic-draft-http-'));
  build({outputDirectory: directory});
  const seed = JSON.parse(fs.readFileSync(path.join(directory, 'models.json')))[0], filename = path.join(directory, 'workshop.sqlite');
  let w = createWorkshop({filename, seedConfig: seed.universal, legacy: seed.legacy});
  t.after(() => {w.close(); fs.rmSync(directory, {recursive: true, force: true});});
  const record = w.repository.copy(w.defaultId, {expectedRevision: 1, name: 'Synthetischer privater Acrylentwurf', kind: 'product'});
  const config = w.model(record.id, record.revision).universal, source = config.profile.designs[0];
  // Fixed synthetic 40 x 60 RGB image; the route still runs the real photo importer.
  const png = 'iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
  const input = {productId: record.id, productRevision: record.revision, designId: source.id,
    objects: structuredClone(source.objects), options: Object.fromEntries(config.profile.optionGroups.map(g => [g.id, g.defaultValueId])),
    quantity: 1, media: [{id: 'synthetic-photo', original: png}], preview: png};
  Object.assign(input.objects.find(o => o.type === 'photoSlot'), {uxUploadId: 'synthetic-photo', uxUploadKind: 'photo'});
  const credentials = (await request(w, '/api/workshop/session')).body;
  const headers = {'x-gravuru-csrf': credentials.csrfToken};
  assert.equal((await request(w, '/api/workshop/acrylic-drafts', 'POST', {input})).status, 403);
  assert.equal((await request(w, '/api/workshop/acrylic-drafts', 'POST', {snapshotId: 'proof_existing'}, headers)).status, 422);
  assert.equal((await request(w, '/api/workshop/acrylic-drafts', 'POST', {input: {...input, unitCents: 1}}, headers)).status, 422);
  const created = await request(w, '/api/workshop/acrylic-drafts', 'POST', {input}, headers);
  assert.equal(created.status, 201, JSON.stringify(created.body)); assert.equal(created.headers['Cache-Control'], 'no-store');
  const draft = created.body, endpoint = '/api/workshop/acrylic-drafts/' + draft.id;
  const privateHeaders = {...headers, 'x-gravuru-draft': draft.token};
  assert.equal((await request(w, endpoint)).status, 404);
  const read = await request(w, endpoint, 'GET', undefined, privateHeaders);
  assert.equal(read.status, 200); assert.equal(read.body.draft.snapshotId, draft.snapshotId); assert.ok(!JSON.stringify(read.body).includes(draft.token));
  const original = w.customerDrafts.downloadSnapshot(draft.snapshotId, 'package');
  const archive = readReviewPackage(original, read.body.review.packageSha256, ACRYLIC_REVIEW);
  assert.deepEqual(archive.files.get('fotos/1-original.png'), Buffer.from(png, 'base64'));
  const binding = w.orderIntake.bind({shopDomain: 'gravuru-synthetic.myshopify.com', variantId: '301', record, snapshotId: draft.snapshotId});
  const offer = w.orderIntake.offer({bindingId: binding.id, snapshotId: draft.snapshotId, quantity: 1});
  let sends = 0;
  const submit = createDraftCartHandoff({drafts: w.customerDrafts, config: {shopDomain: 'gravuru-synthetic.myshopify.com', apiVersion: '2026-07', privateToken: 'synthetic-private-token'}},
    {fetchImpl: async () => {sends++; throw Error('must not send');}});
  await assert.rejects(submit({draftId: draft.id, snapshotId: draft.snapshotId, expectedRevision: 1, offerId: offer.id, offerToken: offer.property.value},
    {draftToken: draft.token, buyerIp: '192.0.2.5'}), e => e.code === 'cart_blocked');
  assert.equal(sends, 0); // Real review blockers remain, never fabricate machine approval.
  const secondInput = structuredClone(input); secondInput.quantity = 2;
  const saved = await request(w, endpoint, 'POST', {input: secondInput, expectedRevision: 1}, privateHeaders);
  assert.equal(saved.status, 200, JSON.stringify(saved.body)); assert.equal(saved.body.revision, 2);
  assert.notEqual(saved.body.snapshotId, draft.snapshotId); assert.ok(!('token' in saved.body));
  assert.deepEqual(w.customerDrafts.downloadSnapshot(draft.snapshotId, 'package'), original);
  assert.equal((await request(w, endpoint, 'POST', {input, expectedRevision: 1}, privateHeaders)).status, 409);
  assert.equal((await request(w, endpoint, 'POST', {input: {...input, productRevision: 2}, expectedRevision: 2}, privateHeaders)).status, 409);
  assert.equal((await request(w, endpoint, 'POST', {input, expectedRevision: 2}, headers)).status, 404);
  assert.equal(w.customerDrafts.listSnapshots().length, 2);
  w.close(); w = createWorkshop({filename, seedConfig: seed.universal, legacy: seed.legacy});
  const restored = await request(w, endpoint, 'GET', undefined, {'x-gravuru-draft': draft.token});
  assert.equal(restored.status, 200); assert.equal(restored.body.draft.revision, 2);
  assert.equal(restored.body.review.selection.price.quantity, 2);
  assert.deepEqual(w.customerDrafts.downloadSnapshot(draft.snapshotId, 'package'), original);
});
