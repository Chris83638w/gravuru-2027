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
import {loadCartRevision,loadCartRevisionPhoto} from './cart-edit-revision.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
import {createHash} from 'node:crypto';

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

test('form reopening reads the exact frozen customer state, hidden photo recipe and original after newer edits; foreign source fails',async()=>{
 const configId='konfig_'+'1'.repeat(36),draftId='draft_'+'2'.repeat(36),photo=Buffer.from([137,80,78,71,1,2,3]),digest=b=>createHash('sha256').update(b).digest('hex');
 const customer={fields:[{id:'photo',mediaId:'media-original',deleted:true,crop:{zoom:1.4,x:.2,y:-.1,angle:90},tone:'grayscale'}]},product={schema:'gravuru-form-product/v1',name:'Original revision',basePriceCents:4799};
 const input=Buffer.from(JSON.stringify({schema:'gravuru-form-review-input/v1',product,customer,designId:'design',profiles:null}));
 const manifest={schema:'gravuru-form-review/v1',id:'proof_frozen',source:{draftId,draftRevision:1,designId:'design'},product:{id:'cfg_form',revision:2},photos:[{fieldId:'photo',mediaId:'media-original',path:'fotos/photo-original.png',width:40,height:60,crop:customer.fields[0].crop,tone:'grayscale'}],files:[{path:'produkt-und-gestaltung.json',bytes:input.length,sha256:digest(input)},{path:'fotos/photo-original.png',bytes:photo.length,sha256:digest(photo)}]};
 const files=[{name:'produkt-und-gestaltung.json',blob:new Blob([input])},{name:'fotos/photo-original.png',blob:new Blob([photo])},{name:'manifest.json',blob:new Blob([JSON.stringify(manifest)])}],archive=Buffer.from(await (await zipFiles(files)).arrayBuffer());
 const head={id:draftId,revision:3,productId:'cfg_form',productRevision:2,designId:'design',state:{fields:[]}};
 const draft={cartConfigurations:{revision:()=>({draftId,draftRevision:1,snapshotId:manifest.id,offerId:'offer_old',lineId:'gid://shopify/CartLine/old'}),latest:()=>({rev:2})},get:(id,token)=>{assert.equal(id,draftId);if(token!=='private-synthetic')throw Error('private');return head;},review:()=>({manifest:{...manifest,packageSha256:digest(archive)}}),downloadSnapshot:()=>archive,orderIntake:{offerSummary:()=>({quantity:3})}};
 const args={drafts:draft,repository:{get:()=>({revision:2,status:'draft'})},configId,rev:1,draftToken:'private-synthetic'};
 const loaded=loadCartRevision(args);assert.equal(loaded.editorKind,'form');assert.equal(loaded.quantity,3);assert.deepEqual(loaded.customer,customer);assert.deepEqual(loaded.product,product);assert.equal(loaded.photos[0].hidden,true);assert.equal(loaded.photos[0].mediaId,'media-original');assert.equal(loaded.draft.revision,3);assert.match(loaded.hints.join(' '),/Revision 2/);
 assert.deepEqual(loadCartRevisionPhoto({...args,uploadId:'photo'}).bytes,photo);assert.throws(()=>loadCartRevisionPhoto({...args,uploadId:'another'}));assert.throws(()=>loadCartRevision({...args,draftToken:'wrong'}));
 manifest.source.draftId='draft_foreign';assert.throws(()=>loadCartRevision(args),e=>e.code==='cart_private');
});

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
