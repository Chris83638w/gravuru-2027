import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Readable} from 'node:stream';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';
import {readDraft} from '../configurator/variant-m/contract.mjs';

// K8 (Ü9.1): Bearbeiten-Link lädt genau die gespeicherte Revision aus dem Prüfstand – mit Entwurfstoken, sonst nichts.
async function request(workshop, pathname, method = 'GET', input, headers = {}) {
  const req = Readable.from(input === undefined ? [] : [Buffer.from(JSON.stringify(input))]);
  req.method = method; req.headers = {'content-type': 'application/json', ...headers};
  const res = {headersSent: false, writeHead(status, headers) {this.status = status; this.headers = headers; this.headersSent = true; return this;},
    end(bytes) {this.raw = Buffer.from(bytes); if (/json/.test(this.headers['Content-Type'])) this.body = JSON.parse(this.raw.toString());}};
  await workshop.handle(req, res, new URL(pathname, 'http://127.0.0.1'));
  return res;
}
const shop = 'gravuru-synthetic.myshopify.com';

test('a configuration revision is loaded as editor draft with photos only for the private draft owner; stale and unknown revisions are explained', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-cart-edit-'));
  build({outputDirectory: directory});
  const seed = JSON.parse(fs.readFileSync(path.join(directory, 'models.json')))[0], filename = path.join(directory, 'workshop.sqlite');
  const w = createWorkshop({filename, seedConfig: seed.universal, legacy: seed.legacy});
  t.after(() => {w.close(); fs.rmSync(directory, {recursive: true, force: true});});
  const record = w.repository.copy(w.defaultId, {expectedRevision: 1, name: 'Synthetische Warenkorb-Bearbeitung', kind: 'product'});
  const config = w.model(record.id, record.revision).universal, source = config.profile.designs[0];
  const png = 'iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
  const input = {productId: record.id, productRevision: record.revision, designId: source.id,
    objects: structuredClone(source.objects), options: Object.fromEntries(config.profile.optionGroups.map(g => [g.id, g.defaultValueId])),
    quantity: 3, media: [{id: 'synthetic-photo', original: png}], preview: png};
  Object.assign(input.objects.find(o => o.type === 'photoSlot'), {uxUploadId: 'synthetic-photo', uxUploadKind: 'photo'});
  const text = input.objects.find(o => o.type === 'text' && o.customerEditable); if (text) text.text = 'Revision eins';
  const csrf = {'x-gravuru-csrf': (await request(w, '/api/workshop/session')).body.csrfToken};
  const created = await request(w, '/api/workshop/acrylic-drafts', 'POST', {input}, csrf);
  assert.equal(created.status, 201, JSON.stringify(created.body)); const draft = created.body;
  // Erste Übergabe: Revision 1 im Register (Prüfstand-Sperren hier bewusst per Prüfregel umgangen, kein Netz).
  const binding = w.orderIntake.bind({shopDomain: shop, variantId: '301', record, snapshotId: draft.snapshotId});
  const offer = w.orderIntake.offer({bindingId: binding.id, snapshotId: draft.snapshotId, quantity: 3});
  const fetchImpl = async (url, options) => {
    const line = JSON.parse(options.body).variables.input.lines[0];
    return Response.json({data: {cartCreate: {userErrors: [], warnings: [], cart: {id: 'gid://shopify/Cart/synthetic', checkoutUrl: 'https://' + shop + '/checkout/synthetic',
      lines: {pageInfo: {hasNextPage: false}, nodes: [{id: 'gid://shopify/CartLine/one?cart=synthetic', quantity: line.quantity, attributes: line.attributes, merchandise: {id: line.merchandiseId},
        cost: {amountPerQuantity: {amount: (offer.unitCents / 100).toFixed(2), currencyCode: 'EUR'}, totalAmount: {amount: (offer.unitCents * 3 / 100).toFixed(2), currencyCode: 'EUR'}}}]}}}}});
  };
  const submit = createDraftCartHandoff({drafts: w.customerDrafts, config: {shopDomain: shop, apiVersion: '2026-07', privateToken: 'synthetic-private-token'}, reviewPolicy: () => {}}, {fetchImpl});
  const result = await submit({draftId: draft.id, snapshotId: draft.snapshotId, expectedRevision: 1, offerId: offer.id, offerToken: offer.property.value}, {draftToken: draft.token, buyerIp: '192.0.2.5'});
  assert.equal(result.configuration.rev, 1);
  const endpoint = '/api/workshop/cart-configurations/' + result.configuration.id + '/1';
  assert.equal((await request(w, endpoint)).status, 404);
  assert.equal((await request(w, endpoint, 'GET', undefined, {'x-gravuru-draft': 'f'.repeat(64)})).status, 404);
  assert.equal((await request(w, endpoint.replace(/1$/, '2'), 'GET', undefined, {'x-gravuru-draft': draft.token})).status, 404);
  assert.equal((await request(w, endpoint, 'POST', {}, {...csrf, 'x-gravuru-draft': draft.token})).status, 405);
  const loaded = await request(w, endpoint, 'GET', undefined, {'x-gravuru-draft': draft.token});
  assert.equal(loaded.status, 200, JSON.stringify(loaded.body)); assert.equal(loaded.headers['Cache-Control'], 'no-store');
  const v = loaded.body;
  assert.deepEqual(v.configuration, {id: result.configuration.id, rev: 1, latestRev: 1, cartLineId: result.lineId});
  assert.equal(v.quantity, 3); assert.deepEqual(v.hints, []); assert.equal(v.draft.id, draft.id); assert.ok(!JSON.stringify(v).includes(draft.token));
  assert.equal(v.document.profileId, config.profile.id); assert.equal(v.document.profileRevision, config.profile.revision);
  assert.equal(v.document.productId, config.profile.binding.productId);
  assert.equal(v.document.design.objects.find(o => o.type === 'photoSlot').uxUploadId, 'synthetic-photo');
  if (text) assert.equal(v.document.design.objects.find(o => o.id === text.id).text, 'Revision eins');
  assert.deepEqual(v.photos, [{uploadId: 'synthetic-photo', width: 40, height: 60}]);
  // Das gelieferte Dokument ist genau das, was der Editor über readDraft wieder annimmt.
  const restored = readDraft(config, v.document, config.localResources.fonts, config.localResources.motifs);
  assert.equal(restored.design.id, source.id); assert.deepEqual(restored.options, input.options);
  const photo = await request(w, endpoint + '/photos/synthetic-photo', 'GET', undefined, {'x-gravuru-draft': draft.token});
  assert.equal(photo.status, 200); assert.equal(photo.headers['Content-Type'], 'image/png'); assert.deepEqual(photo.raw, Buffer.from(png, 'base64'));
  assert.equal((await request(w, endpoint + '/photos/synthetic-photo')).status, 404);
  assert.equal((await request(w, endpoint + '/photos/other', 'GET', undefined, {'x-gravuru-draft': draft.token})).status, 404);
  assert.equal((await request(w, endpoint + '/photos/synthetic-photo?edited=1', 'GET', undefined, {'x-gravuru-draft': draft.token})).status, 404);
  // Produkt inzwischen geändert: Revision bleibt ladbar, aber mit Hinweis statt stiller Übernahme.
  w.repository.save(record.id, {...record.document, name: 'Geändert'}, record.revision);
  const stale = (await request(w, endpoint, 'GET', undefined, {'x-gravuru-draft': draft.token})).body;
  assert.equal(stale.hints.length, 1); assert.match(stale.hints[0], /inzwischen geändert/);
});
