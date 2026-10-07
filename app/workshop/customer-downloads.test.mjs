import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, createHmac, randomBytes, randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
const config = {shopDomain: 'fixture.myshopify.com', clientId: 'fixture-client', apiVersion: '2026-07', secret: randomBytes(32).toString('hex'), mode: 'test-only'};
const merchant = {role: 'merchant', shopDomain: config.shopDomain, subject: '123'}, customer = {role: 'customer', shopDomain: config.shopDomain, subject: 'gid://shopify/Customer/456'};
function signed(payload, topic = 'orders/paid') {
  const raw = Buffer.from(JSON.stringify(payload));
  return {raw, headers: {'x-shopify-hmac-sha256': createHmac('sha256', config.secret).update(raw).digest('base64'), 'x-shopify-shop-domain': config.shopDomain, 'x-shopify-api-version': config.apiVersion, 'x-shopify-topic': topic, 'x-shopify-webhook-id': randomUUID()}};
}
function populate(store, {customerId = '456', timestamp = true} = {}) {
  const record = {id: 'cfg_fixture', revision: 1, status: 'draft', document: {kind: 'product', schema: 'gravuru-form-product/v1', basePriceCents: 2999, designs: [{}]}};
  const draft = store.create(record, 'design_fixture', {}), bytes = Buffer.from('synthetic source archive');
  const manifest = {schema: 'gravuru-form-review/v1', id: 'proof_' + randomUUID(), source: {draftId: draft.id, draftRevision: 1},
    product: {id: record.id, revision: 1, basePriceCents: 2999, currency: 'EUR'}, packageSha256: sha(bytes), blockers: [], warnings: [], photos: []};
  store.capture(draft.id, draft.token, 1, {manifest, preview: Buffer.from('<svg/>'), contourPdf: bytes, package: bytes, photos: bytes});
  const binding = store.orderIntake.bind({record, shopDomain: config.shopDomain, variantId: '301'});
  const offer = store.orderIntake.offer({bindingId: binding.id, snapshotId: manifest.id, quantity: 1});
  const payload = {id: '101', test: true, financial_status: 'paid', currency: 'EUR', customer: customerId === null ? null : {id: customerId},
    ...(timestamp ? {updated_at: '2026-10-06T12:00:00Z'} : {}), line_items: [{id: '201', variant_id: '301', quantity: 1, price: '29.99', properties: [offer.property]}]};
  const event = signed(payload), line = store.orderIntake.receive(event.raw, event.headers, config).lines[0];
  // Synthetic PDF bytes exercise access/byte preservation, not print correctness.
  const pdf = Buffer.from('%PDF-1.7\nsynthetic-access-fixture\n%%EOF'), archive = Buffer.from('synthetic private originals');
  store.savePrintProof(manifest.id, 'fixture/v1', {pdf, archive, metadata: {pdfSha256: sha(pdf)}});
  const job = store.exportJobs.enqueue({snapshotId: manifest.id, recipeKey: 'fixture/v1', recipe: 'fixture/v1', settings: {}});
  const status = (financial_status, extra = {}) => {const event = signed({...payload, financial_status, updated_at: '2026-10-06T13:00:00Z', ...extra}, extra.cancelled_at ? 'orders/cancelled' : 'orders/updated'); return store.orderIntake.receive(event.raw, event.headers, config);};
  return {line, job, pdf, archive, payload, status, manifest};
}
function setup(t, options) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-file-access-')), filename = path.join(directory, 'private.sqlite');
  let store = createFormCustomerStore({filename}); const data = populate(store, options);
  t.after(() => {store.close(); fs.rmSync(directory, {recursive: true, force: true});});
  return {...data, filename, get store() {return store;}, reopen() {store.close(); store = createFormCustomerStore({filename});}, grant(format) {return store.customerDownloads.grant({lineId: data.line.id, jobId: data.job.id, ...(format ? {format} : {})}, merchant);}};
}
test('customer binding comes only from the signed order and stays private/immutable across restart', t => {
  const f = setup(t); assert.equal(f.store.orderIntake.customer(f.line.id), customer.subject);
  assert.ok(!JSON.stringify(f.store.orderIntake.get(f.line.id)).includes(customer.subject));
  const altered = signed({...f.payload, customer: {id: '999'}});
  assert.throws(() => f.store.orderIntake.receive(altered.raw, altered.headers, config), e => e.status === 409);
  f.reopen(); assert.equal(f.store.orderIntake.customer(f.line.id), customer.subject);
});
test('grant is explicit/idempotent; customer receives exact PDF, never other orders or ZIP implicitly', t => {
  const f = setup(t), service = f.store.customerDownloads;
  assert.throws(() => service.download('grant_missing', customer), e => e.status === 404);
  const grant = f.grant(); assert.deepEqual(f.grant(), grant); assert.equal(grant.format, 'pdf');
  assert.deepEqual(service.download(grant.id, customer).bytes, f.pdf);
  for (const principal of [merchant, {...customer, subject: 'gid://shopify/Customer/999'}, {...customer, shopDomain: 'other.myshopify.com'}, null]) assert.throws(() => service.download(grant.id, principal), e => e.status === 404);
  assert.throws(() => service.grant({lineId: f.line.id, jobId: f.job.id}, customer), e => e.status === 404);
  const zip = f.grant('zip'); assert.notEqual(zip.id, grant.id); assert.deepEqual(service.download(zip.id, customer).bytes, f.archive);
  f.reopen(); assert.deepEqual(f.store.customerDownloads.download(grant.id, customer).bytes, f.pdf);
});
for (const status of ['refunded', 'partially_refunded', 'pending']) test(status + ' blocks an already granted file', t => {
  const f = setup(t), grant = f.grant(); f.status(status);
  assert.throws(() => f.store.customerDownloads.download(grant.id, customer), e => e.status === 409);
  assert.throws(() => f.grant(), e => e.status === 409);
});
test('line refund allocation blocks granted files even while the order-wide status still says paid', t => {
  const f=setup(t),grant=f.grant();
  f.status('paid',{refunds:[{id:501,refund_line_items:[{line_item_id:201,quantity:1,subtotal:'10.00',total_tax:'1.90'}]}]});
  assert.equal(f.store.orderIntake.status(f.line.id).state,'paid');
  assert.equal(f.store.orderIntake.status(f.line.id).refunds.subtotalCents,1000);
  assert.throws(()=>f.store.customerDownloads.download(grant.id,customer),e=>e.status===409);
  assert.deepEqual(f.store.customerDownloads.available(customer).files,[]);
  f.reopen();assert.throws(()=>f.grant(),e=>e.status===409);
});
test('stale or contradictory line refund reports cannot restore customer access', t => {
  const f=setup(t),grant=f.grant();
  f.status('paid',{refunds:[{id:501,refund_line_items:[{line_item_id:201,quantity:1,subtotal:'10.00',total_tax:'1.90'}]}]});
  f.status('paid',{updated_at:'2026-10-06T14:00:00Z'});
  assert.equal(f.store.orderIntake.status(f.line.id).refunds.stale,true);
  assert.throws(()=>f.store.customerDownloads.download(grant.id,customer),e=>e.status===409);
  f.status('paid',{updated_at:'2026-10-06T15:00:00Z',refunds:[]});
  assert.equal(f.store.orderIntake.status(f.line.id).refunds.conflict,true);
  assert.throws(()=>f.grant(),e=>e.status===409);
  assert.deepEqual(f.store.customerDownloads.available(customer).files,[]);
});
test('cancellation and explicit revocation cannot be bypassed by restart or old paid notifications', t => {
  const f = setup(t), grant = f.grant(); f.store.customerDownloads.revoke(grant.id, merchant); f.reopen();
  assert.throws(() => f.store.customerDownloads.download(grant.id, customer), e => e.status === 404);
  const next = f.grant(); assert.notEqual(next.id, grant.id);
  const event = signed({...f.payload, cancelled_at: '2026-10-06T12:59:00Z', updated_at: '2026-10-06T13:00:00Z'}, 'orders/cancelled');
  f.store.orderIntake.receive(event.raw, event.headers, config);
  const old = signed(f.payload); f.store.orderIntake.receive(old.raw, old.headers, config);
  assert.throws(() => f.store.customerDownloads.download(next.id, customer), e => e.status === 409);
});
for (const options of [{customerId: null}, {timestamp: false}]) test('missing customer or status evidence never releases files: ' + JSON.stringify(options), t => {
  const f = setup(t, options); assert.throws(() => f.grant(), e => e.status === 409);
});
test('changed PDF bytes and unfinished jobs cannot be granted or downloaded', t => {
  const f = setup(t), grant = f.grant();
  const pending = f.store.exportJobs.enqueue({snapshotId: f.manifest.id, recipeKey: 'pending/v1', recipe: 'pending/v1', settings: {}});
  assert.throws(() => f.store.customerDownloads.grant({lineId: f.line.id, jobId: pending.id}, merchant), e => e.status === 409);
  // Simulate damaged private storage; normal APIs prohibit this mutation.
  const db = new DatabaseSync(f.filename); db.exec('DROP TRIGGER form_print_proof_immutable'); db.prepare('UPDATE form_print_proofs SET pdf=?').run(Buffer.from('damaged')); db.close();
  assert.throws(() => f.store.customerDownloads.download(grant.id, customer), e => e.status === 409);
});

const jwt = role => {
  const now = Math.floor(Date.now() / 1000), p = {aud: config.clientId, dest: role === 'merchant' ? 'https://' + config.shopDomain : config.shopDomain,
    sub: role === 'merchant' ? merchant.subject : customer.subject, ...(role === 'merchant' ? {iss: 'https://' + config.shopDomain + '/admin'} : {}), exp: now + 60, nbf: now, iat: now, jti: randomUUID()};
  const input = [{alg: 'HS256', typ: 'JWT'}, p].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
  return 'Bearer ' + input + '.' + createHmac('sha256', config.secret).update(input).digest('base64url');
};
function httpFixture(t, enabled = true) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-auth-http-')); build({outputDirectory: directory});
  const seed = JSON.parse(fs.readFileSync(path.join(directory, 'models.json')))[0];
  const w = createWorkshop({filename: ':memory:', seedConfig: seed.universal, legacy: seed.legacy, orderWebhook: config, ...(enabled ? {shopifySessions: config} : {})});
  const data = populate(w.customerDrafts), server = createPreviewServer({workshop: w, outputDirectory: directory}); server.address = () => ({port: 8765});
  const request = (url, method = 'GET', data, headers = {}) => new Promise(resolve => {
    const req = Readable.from(data === undefined ? [] : [Buffer.from(JSON.stringify(data))]);
    Object.assign(req, {url, method, headers: {host: '127.0.0.1:8765', 'content-type': 'application/json', ...headers}});
    const res = new EventEmitter(); res.headersSent = false;
    res.writeHead = (status, headers) => {Object.assign(res, {status, headers, headersSent: true}); return res;};
    res.end = bytes => {res.bytes = Buffer.from(bytes || ''); if (res.headers['Content-Type']?.startsWith('application/json')) res.body = JSON.parse(res.bytes); resolve(res);};
    server.emit('request', req, res);
  });
  t.after(() => {w.close(); fs.rmSync(directory, {recursive: true, force: true});}); return {...data, w, request};
}
test('actual HTTP handlers enforce merchant auth/CSRF, customer auth/ownership, no-store and revocation', async t => {
  const f = httpFixture(t), admin = {authorization: jwt('merchant')}, buyer = {authorization: jwt('customer')};
  assert.equal((await f.request('/api/workshop/session')).status, 401);
  assert.equal((await f.request('/api/workshop/orders', 'GET', undefined, buyer)).status, 401);
  const session = await f.request('/api/workshop/session', 'GET', undefined, admin); assert.equal(session.body.scope, 'shopify-merchant-test');
  const route = '/api/workshop/orders/' + f.line.id + '/file-grants', data = {jobId: f.job.id};
  assert.deepEqual((await f.request('/api/workshop/customer-files', 'GET', undefined, buyer)).body.files, []);
  assert.equal((await f.request(route, 'POST', data, admin)).status, 403);
  admin['x-gravuru-csrf'] = session.body.csrfToken;
  assert.equal((await f.request(route, 'POST', {...data, customerId: '999'}, admin)).status, 422);
  const grant = await f.request(route, 'POST', data, admin); assert.equal(grant.status, 201);
  const file = '/api/workshop/customer-files/' + grant.body.id;
  const listing=await f.request('/api/workshop/customer-files', 'GET', undefined, buyer);
  assert.equal(listing.body.files[0].id,grant.body.id);assert.equal(listing.body.nextBefore,null);
  assert.equal((await f.request(file, 'POST', {})).status, 401);
  assert.equal((await f.request(file, 'POST', {}, admin)).status, 401);
  assert.equal((await f.request(file, 'POST', {}, {...buyer, origin: 'https://foreign.invalid'})).status, 403);
  assert.equal((await f.request(file, 'POST', {format: 'zip'}, buyer)).status, 422);
  const downloaded = await f.request(file, 'POST', {}, buyer); assert.equal(downloaded.status, 200); assert.deepEqual(downloaded.bytes, f.pdf); assert.equal(downloaded.headers['Cache-Control'], 'no-store');
  assert.equal((await f.request('/api/workshop/file-grants/' + grant.body.id + '/revoke', 'POST', {}, admin)).status, 200);
  assert.equal((await f.request(file, 'POST', {}, buyer)).status, 404);
  assert.deepEqual((await f.request('/api/workshop/customer-files', 'GET', undefined, buyer)).body.files, []);
});
test('customer listings never contain another customer, refunded or revoked grants',t=>{
  const f=setup(t),grant=f.grant(),service=f.store.customerDownloads;
  assert.equal(service.available(customer).files.length,1);
  assert.deepEqual(service.available({...customer,subject:'gid://shopify/Customer/999'}).files,[]);
  assert.deepEqual(service.available({...customer,shopDomain:'other.myshopify.com'}).files,[]);
  assert.throws(()=>service.available(merchant),e=>e.status===404);
  assert.throws(()=>service.available(customer,NaN),e=>e.status===422);
  f.status('refunded');assert.deepEqual(service.available(customer).files,[]);
  assert.equal(service.list(f.line.id,merchant)[0].id,grant.id);
});
test('guest order cannot be claimed by a later signed delivery with a customer ID',t=>{
  const f=setup(t,{customerId:null}),event=signed({...f.payload,customer:{id:'456'}});
  assert.throws(()=>f.store.orderIntake.receive(event.raw,event.headers,config),e=>e.status===409);
  assert.equal(f.store.orderIntake.customer(f.line.id),null);
});
test('file list pagination remains stable and complete when a new grant arrives',t=>{
  const f=setup(t),store=f.store;
  for(let i=0;i<54;i++){
    const key='page/'+i;store.savePrintProof(f.manifest.id,key,{metadata:{pdfSha256:sha(f.pdf)},pdf:f.pdf,archive:Buffer.alloc(0)});
    const job=store.exportJobs.enqueue({snapshotId:f.manifest.id,recipeKey:key,recipe:key,settings:{}});
    store.customerDownloads.grant({lineId:f.line.id,jobId:job.id},merchant);
  }
  const first=store.customerDownloads.available(customer);assert.equal(first.files.length,50);assert.ok(first.nextBefore);
  f.grant();const second=store.customerDownloads.available(customer,first.nextBefore);
  assert.equal(second.files.length,4);assert.equal(second.nextBefore,null);
  assert.equal(new Set([...first.files,...second.files].map(x=>x.id)).size,54);
});
test('new UI dependencies are served by the existing preview server',async t=>{
  const f=httpFixture(t,false);
  for(const name of ['merchant-request.mjs','order-file-grants-ui.mjs']){
    const response=await f.request('/workshop-ui/'+name);assert.equal(response.status,200);assert.match(response.headers['Content-Type'],/javascript/);assert.ok(response.bytes.length>100);
  }
});
test('another snapshot or a conflicting status at the same time cannot release a file',t=>{
  const f=setup(t),store=f.store,grant=f.grant();
  const second=store.create({id:'cfg_other',revision:1},'other',{}),m={...f.manifest,id:'proof_'+randomUUID(),source:{draftId:second.id,draftRevision:1},product:{...f.manifest.product,id:'cfg_other'}};
  store.capture(second.id,second.token,1,{manifest:m,preview:Buffer.from('<svg/>'),contourPdf:f.pdf,package:Buffer.from('other'),photos:Buffer.alloc(0)});
  store.savePrintProof(m.id,'fixture/v1',{metadata:{pdfSha256:sha(f.pdf)},pdf:f.pdf,archive:Buffer.alloc(0)});
  const other=store.exportJobs.enqueue({snapshotId:m.id,recipeKey:'fixture/v1',recipe:'fixture/v1',settings:{}});
  assert.throws(()=>store.customerDownloads.grant({lineId:f.line.id,jobId:other.id},merchant),e=>e.status===409);
  const event=signed({...f.payload,financial_status:'refunded'},'orders/updated');store.orderIntake.receive(event.raw,event.headers,config);
  assert.equal(store.orderIntake.status(f.line.id).conflict,true);
  assert.throws(()=>store.customerDownloads.download(grant.id,customer),e=>e.status===409);
});
test('signed webhook remains separate from session auth; tampered payload cannot bind a customer',async t=>{
  const f=httpFixture(t),payload={id:'999',test:true,financial_status:'paid',currency:'EUR',line_items:[]},event=signed(payload);
  assert.equal((await f.request('/api/workshop/order-webhook','POST',payload,event.headers)).status,200);
  assert.equal((await f.request('/api/workshop/order-webhook','POST',{...payload,id:'888'},event.headers)).status,401);
  assert.equal(f.w.orderIntake.list().length,1);
});
test('default preview cannot create grants or open customer files even with signed tokens', async t => {
  const f = httpFixture(t, false), session = await f.request('/api/workshop/session');
  const headers = {authorization: jwt('merchant'), 'x-gravuru-csrf': session.body.csrfToken};
  assert.equal((await f.request('/api/workshop/orders/' + f.line.id + '/file-grants', 'POST', {jobId: f.job.id}, headers)).status, 503);
  assert.equal((await f.request('/api/workshop/customer-files/grant_' + randomUUID(), 'POST', {}, {authorization: jwt('customer')})).status, 503);
});
