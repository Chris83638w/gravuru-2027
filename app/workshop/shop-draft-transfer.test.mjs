import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHmac, randomBytes, randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {createWorkshop} from './http.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {shopDraftRequest, createShopDraftTransfer, createShopDraftTransport, SHOP_DRAFT_CREATE} from './shop-draft-transfer.mjs';

const shop = 'fixture.myshopify.com', secret = randomBytes(32).toString('hex');
const config = {mode: 'draft-only', shopDomain: shop, apiVersion: '2026-07', accessToken: randomBytes(24).toString('hex')};
const sessions = {mode: 'test-only', shopDomain: shop, clientId: 'fixture-client', secret};
const principal = {role: 'merchant', shopDomain: shop, subject: '123'};
function setup(t, enabled = true) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-shop-transfer-')); build({outputDirectory: directory});
  const seed = JSON.parse(fs.readFileSync(path.join(directory, 'models.json')))[0], filename = path.join(directory, 'workshop.sqlite');
  let writes = 0, reads = 0, remote = null, intercept = null, mutate = null, nowShop = shop, currency = 'EUR', version = '2026-07';
  const calls = [];
  const fetchImpl = async (url, options) => {
    assert.equal(url, `https://${shop}/admin/api/2026-07/graphql.json`); assert.equal(options.redirect, 'manual'); assert.equal(options.headers['X-Shopify-Access-Token'], config.accessToken);
    const request = JSON.parse(options.body); calls.push(request);
    let data;
    if (request.query === SHOP_DRAFT_CREATE) {
      writes++;
      const input = request.variables.input;
      assert.equal(input.status, 'DRAFT'); assert.equal('identifier' in request.variables, false); assert.equal('id' in input, false);
      remote = {id: 'gid://shopify/Product/901', title: input.title, seo: structuredClone(input.seo), handle: input.handle, tags: input.tags, status: input.status,
        variants: {pageInfo: {hasNextPage: false}, nodes: input.variants.map((v, i) => ({id: 'gid://shopify/ProductVariant/' + (1001 + i), price: v.price, selectedOptions: v.optionValues.map(o => ({name: o.optionName, value: o.name}))}))}};
      if (mutate) mutate(remote); if (intercept) await intercept('create'); data = {productSet: {product: remote, userErrors: []}};
    } else {
      reads++; assert.match(request.variables.query, /^handle:gravuru-[a-f0-9]{64} AND status:/);
      if (intercept) await intercept('lookup');
      data = {shop: {myshopifyDomain: nowShop, currencyCode: currency}, products: {nodes: remote ? [remote] : [], pageInfo: {hasNextPage: false}}};
    }
    return Response.json({data}, {headers: {'X-Shopify-API-Version': version}});
  };
  const options = {filename, seedConfig: seed.universal, legacy: seed.legacy, ...(enabled ? {shopifySessions: sessions, shopDrafts: {config, transportOptions: {fetchImpl}}} : {})};
  let w = createWorkshop(options);
  const record = w.repository.copy(w.defaultId, {expectedRevision: 1, name: 'Synthetischer Shopentwurf', kind: 'product'});
  const input = {productId: record.id, expectedRevision: record.revision, sourceSha256: prepareShopProduct(record).sha256, action: 'create'};
  const service = () => createShopDraftTransfer({repository: w.repository, orders: w.orderIntake, journal: w.customerDrafts.shopDraftTransfers, config, transport: createShopDraftTransport(config, {fetchImpl})});
  const send = (patch = {}, who = principal, context) => service()({...input, ...patch}, who, context);
  t.after(() => {w.close(); fs.rmSync(directory, {recursive: true, force: true});});
  return {directory, filename, record, input, send, calls, get w() {return w;}, get writes() {return writes;}, get reads() {return reads;}, get remote() {return remote;},
    intercept: fn => intercept = fn, mutate: fn => mutate = fn, shop: value => nowShop = value, currency: value => currency = value, version: value => version = value,
    reopen() {w.close(); w = createWorkshop(options);}, clearRemote() {remote = null;}};
}
test('canonical plan preserves all 28 physical options/prices and creates no design variants or publication', t => {
  const f = setup(t), request = shopDraftRequest(f.record, shop), plan = prepareShopProduct(f.record);
  assert.equal(request.input.variants.length, 28); assert.equal(request.input.productOptions.length, 3);
  assert.deepEqual(request.input.variants.map(v => Math.round(Number(v.price) * 100)), plan.variants.map(v => v.priceCents));
  assert.deepEqual(request.input.productOptions.map(o => o.name), ['Größe', 'Sockel', 'Unsichtbare Wandhalterung']);
  assert.equal(request.input.status, 'DRAFT'); assert.equal(request.input.files, undefined); assert.equal(request.input.id, undefined);
});
test('verified draft response binds all exact variants and repeats after restart without network or new product', async t => {
  const f = setup(t), result = await f.send(); assert.equal(result.state, 'completed'); assert.equal(result.bindings.length, 28); assert.equal(result.published, false);
  assert.equal(f.w.orderIntake.bindings().length, 28); const before = f.calls.length; f.reopen();
  assert.deepEqual(await f.send(), result); assert.equal(f.calls.length, before); assert.equal(f.writes, 1);
  const db = new DatabaseSync(f.filename), journal = JSON.stringify(db.prepare('SELECT * FROM shop_draft_transfers').all());
  assert.ok(!journal.includes(config.accessToken)); assert.ok(!journal.includes(secret));
  assert.throws(() => db.exec("UPDATE shop_draft_transfers SET state='started'"), /immutable/); db.close();
});
test('lost mutation response recovers by read-only reconciliation and never resends creation', async t => {
  const f = setup(t); f.intercept(phase => {if (phase === 'create') throw Error('private-network-detail');});
  await assert.rejects(f.send(), e => e.status === 502 && !e.message.includes('private-network-detail')); assert.equal(f.writes, 1);
  await assert.rejects(f.send(), /Status prüfen/); assert.equal(f.writes, 1);
  f.intercept(null); f.reopen(); const result = await f.send({action: 'reconcile'}); assert.equal(result.state, 'completed'); assert.equal(f.writes, 1); assert.equal(result.bindings.length, 28);
});
test('concurrent attempts reserve exactly one mutation; missing recovery result never permits resend', async t => {
  const f = setup(t); let release, arrived; const ready = new Promise(r => arrived = r);
  f.intercept(async phase => {if (phase === 'lookup') {arrived(); await new Promise(r => release = r);}});
  const first = f.send(); await ready; await assert.rejects(f.send(), /Status prüfen/); release(); await first; assert.equal(f.writes, 1);
  const g = setup(t); g.intercept(() => {throw Error('down');}); await assert.rejects(g.send()); g.intercept(null); g.reopen();
  await assert.rejects(g.send({action: 'reconcile'}), /Keine|keine/); assert.equal(g.writes, 0);
});
test('changed local revision or archive during lookup prevents mutation', async t => {
  for (const archived of [false, true]) {
    const f = setup(t); f.intercept(phase => {if (phase !== 'lookup') return;
      if (archived) f.w.repository.setArchived(f.record.id, {expectedRevision: 1, archived: true});
      else f.w.repository.save(f.record.id, {...f.record.document, name: 'Changed'}, 1);
    });
    await assert.rejects(f.send(), /geändert|archiviert/); assert.equal(f.writes, 0);
  }
});
test('local change after remote creation retains result but does not bind a stale product', async t => {
  const f = setup(t); f.intercept(phase => {if (phase === 'create') f.w.repository.save(f.record.id, {...f.record.document, name: 'New revision'}, 1);});
  await assert.rejects(f.send(), /geändert/); assert.equal(f.writes, 1); assert.equal(f.w.orderIntake.bindings().length, 0);
  const next = f.w.repository.get(f.record.id); await assert.rejects(f.send({expectedRevision: next.revision, sourceSha256: prepareShopProduct(next).sha256}), /anderen Übertragungsstand/); assert.equal(f.writes, 1);
});
test('manual existing variant binding blocks a second product before any network call', async t => {
  const f = setup(t), plan = prepareShopProduct(f.record);
  f.w.orderIntake.bindVariants({record: f.record, shopDomain: shop, mappings: [{key: plan.variants[0].key, variantId: '999'}]});
  await assert.rejects(f.send(), /bereits Shop/); assert.equal(f.calls.length, 0);
});
test('local binding failure retains remote IDs and retries only local binding',async t=>{
  const f=setup(t),orders=f.w.orderIntake,original=orders.bindVariants;let calls=0;
  orders.bindVariants=function(...args){if(++calls===1)throw Object.assign(Error('Local binding unavailable'),{status:503});return original.apply(this,args);};
  await assert.rejects(f.send(),/Local binding/);assert.equal(f.writes,1);
  const request=http(f),headers={authorization:jwt()},route='/api/workshop/products/'+f.record.id+'/shop-transfer';
  const status=await request(route+'?revision=1','GET',undefined,headers);assert.equal(status.body.transfer.state,'completed');assert.equal(status.body.bindingsConfirmed,false);
  const result=await f.send({action:'reconcile'});assert.equal(result.bindingsConfirmed,true);assert.equal(f.writes,1);assert.equal(f.reads,1);
  assert.equal((await request(route+'?revision=1','GET',undefined,headers)).body.bindingsConfirmed,true);
});
for (const mismatch of ['price', 'count', 'options', 'ids', 'status', 'tag', 'handle', 'seo']) test('remote mismatch is never accepted: ' + mismatch, async t => {
  const f = setup(t); f.mutate(p => {
    if (mismatch === 'price') p.variants.nodes[0].price = '0.01';
    if (mismatch === 'count') p.variants.nodes.pop();
    if (mismatch === 'options') p.variants.nodes[0].selectedOptions[0].value = 'wrong';
    if (mismatch === 'ids') p.variants.nodes[1].id = p.variants.nodes[0].id;
    if (mismatch === 'status') p.status = 'ACTIVE';
    if (mismatch === 'tag') p.tags = [];
    if (mismatch === 'seo') p.seo.title = 'wrong';
    if (mismatch === 'handle') p.handle = 'other';
  });
  await assert.rejects(f.send()); assert.equal(f.w.orderIntake.bindings().length, 0); await assert.rejects(f.send()); assert.equal(f.writes, 1);
});
test('wrong shop, currency and API version cannot reach creation', async t => {
  for (const mismatch of ['shop', 'currency', 'version']) {const f = setup(t); f[mismatch](mismatch === 'shop' ? 'other.myshopify.com' : mismatch === 'currency' ? 'USD' : '2026-10'); await assert.rejects(f.send()); assert.equal(f.writes, 0);}
});
test('wrong principal, source hash, stale revision and early cancellation leave no attempts', async t => {
  const f = setup(t);
  for (const who of [null, {...principal, role: 'customer'}, {...principal, shopDomain: 'other.myshopify.com'}]) await assert.rejects(f.send({}, who), e => e.status === 403);
  await assert.rejects(f.send({sourceSha256: 'f'.repeat(64)}), e => e.status === 409);
  await assert.rejects(f.send({expectedRevision: 2}), e => e.status === 409);
  await assert.rejects(f.send({action: 'reconcile'}), e => e.status === 409);
  await assert.rejects(f.send({}, principal, {signal: AbortSignal.abort()}), e => e.status === 409);
  assert.equal(f.calls.length, 0); assert.equal(f.w.customerDrafts.shopDraftTransfers.get(shopDraftRequest(f.record, shop).identity), null);
});

const jwt = () => {
  const now = Math.floor(Date.now() / 1000), payload = {aud: sessions.clientId, dest: 'https://' + shop, iss: 'https://' + shop + '/admin', sub: '123', exp: now + 60, nbf: now, iat: now, jti: randomUUID()};
  const text = [{alg: 'HS256'}, payload].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.'); return 'Bearer ' + text + '.' + createHmac('sha256', secret).update(text).digest('base64url');
};
function http(f) {
  const server = createPreviewServer({workshop: f.w, outputDirectory: f.directory}); server.address = () => ({port: 8765});
  return (url, method = 'GET', data, headers = {}) => new Promise(resolve => {
    const req = Readable.from(data === undefined ? [] : [Buffer.from(JSON.stringify(data))]); Object.assign(req, {url, method, headers: {host: '127.0.0.1:8765', 'content-type': 'application/json', ...headers}});
    const res = new EventEmitter(); res.headersSent = false; res.writeHead = (status, headers) => {Object.assign(res, {status, headers, headersSent: true}); return res;};
    res.end = bytes => {res.bytes = Buffer.from(bytes || ''); if (res.headers['Content-Type']?.startsWith('application/json')) res.body = JSON.parse(res.bytes); resolve(res);}; server.emit('request', req, res);
  });
}
test('actual HTTP requires merchant/CSRF, ignores no browser prices and keeps host/origin checks', async t => {
  const f = setup(t), request = http(f), route = '/api/workshop/products/' + f.record.id + '/shop-transfer', headers = {authorization: jwt()};
  const {productId, ...input} = f.input;
  assert.equal((await request(route)).status, 401);
  assert.equal((await request(route, 'POST', input, headers)).status, 403);
  headers['x-gravuru-csrf'] = (await request('/api/workshop/session', 'GET', undefined, headers)).body.csrfToken;
  assert.equal((await request(route, 'POST', {...input, price: 1}, headers)).status, 422);
  assert.equal((await request(route, 'POST', input, {...headers, origin: 'https://foreign.invalid'})).status, 403);
  const sent = await request(route, 'POST', input, headers); assert.equal(sent.status, 200); assert.equal(sent.body.bindings.length, 28);
  assert.equal((await request(route, 'POST', input, headers)).status, 200); assert.equal(f.writes, 1);
  const status = await request(route + '?revision=1', 'GET', undefined, headers); assert.equal(status.body.transfer.state, 'completed');
});
test('default preview keeps transmission disabled and serves the new UI module', async t => {
  const f = setup(t, false), request = http(f), route = '/api/workshop/products/' + f.record.id + '/shop-transfer';
  assert.equal((await request(route)).body.enabled, false); const session = await request('/api/workshop/session');
  const {productId, ...input} = f.input; assert.equal((await request(route, 'POST', input, {'x-gravuru-csrf': session.body.csrfToken})).status, 503);
  assert.equal((await request('/workshop-ui/shop-transfer-ui.mjs')).status, 200); assert.equal(f.writes, 0);
});
test('transport rejects HTTP, GraphQL, user errors, redirects, malformed/oversized responses and never leaks upstream details',async t=>{
  const f=setup(t),request=shopDraftRequest(f.record,shop),headers={'x-shopify-api-version':'2026-07'};
  const cases=[
    ()=>new Response('private-upstream-detail',{status:500,headers}),
    ()=>new Response(null,{status:302,headers:{...headers,location:'https://foreign.invalid'}}),
    ()=>Response.json({errors:[{message:'private-upstream-detail'}]}, {headers}),
    ()=>Response.json({data:{productSet:{userErrors:[{message:'private-upstream-detail'}],product:null}}},{headers}),
    ()=>new Response('{invalid-json-private-upstream-detail',{headers:{...headers,'content-type':'application/json'}}),
    ()=>new Response(' '.repeat(1024*1024+1),{headers:{...headers,'content-type':'application/json'}})
  ];
  for(const response of cases){let calls=0;const transport=createShopDraftTransport(config,{fetchImpl:async()=>{calls++;return response();}});
    await assert.rejects(transport.create(request),e=>!e.message.includes('private-upstream-detail'));assert.equal(calls,1);
  }
});
test('expired network deadline and aborted lookup cannot trigger automatic retry',async t=>{
  const f=setup(t),request=shopDraftRequest(f.record,shop);let calls=0;
  const transport=createShopDraftTransport(config,{timeoutMs:5,fetchImpl:async(_,options)=>{calls++;return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('private-timeout')),{once:true}));}});
  await assert.rejects(transport.lookup(request),e=>e.status===502&&!e.message.includes('private-timeout'));assert.equal(calls,1);
});
