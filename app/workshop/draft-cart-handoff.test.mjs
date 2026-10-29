import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';

const config = {shopDomain: 'gravuru-synthetic.myshopify.com', apiVersion: '2026-07', privateToken: 'synthetic-private-token'};
function setup(t, changes = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), 'g27-draft-cart-')), filename = path.join(directory, 'private.sqlite');
  let now = Date.UTC(2026, 9, 6), store = createFormCustomerStore({filename, clock: () => now}), calls = 0, duringSend;
  const record = {id: 'cfg_synthetic', revision: 2, status: 'draft', document: {
    schema: 'gravuru-form-product/v1', kind: 'product', basePriceCents: 2999, designs: [{}]}};
  const draft = store.create(record, 'design_synthetic', {text: 'synthetic'});
  const manifest = {schema: 'gravuru-form-review/v1', id: 'review_synthetic', createdAt: new Date(now).toISOString(),
    source: {draftId: draft.id, draftRevision: 1, designId: draft.designId},
    product: {id: record.id, revision: record.revision, basePriceCents: 2999, currency: 'EUR'},
    packageSha256: 'a'.repeat(64), blockers: [], warnings: [], photos: [], ...changes};
  store.capture(draft.id, draft.token, 1, {manifest, preview: Buffer.from('<svg/>'),
    contourPdf: Buffer.from('synthetic'), package: Buffer.from('synthetic'), photos: Buffer.from('synthetic')});
  const binding = store.orderIntake.bind({shopDomain: config.shopDomain, variantId: '301', record});
  const offer = store.orderIntake.offer({bindingId: binding.id, snapshotId: manifest.id, quantity: 2});
  const input = {draftId: draft.id, snapshotId: manifest.id, expectedRevision: 1, offerId: offer.id, offerToken: offer.property.value};
  const context = {draftToken: draft.token, buyerIp: '192.0.2.5'};
  // Synthetischer Shop: cartCreate legt eine Zeile an, cartLinesUpdate ersetzt sie im gemerkten Warenkorb (kein Duplikat).
  const cart = {id: 'gid://shopify/Cart/synthetic', lines: []}, requests = [];
  const euro = c => (c / 100).toFixed(2);
  const fetchImpl = async (url, options) => {
    const read=JSON.parse(options.body);
    if(read.query.includes('query GravuruCartRead'))return Response.json({data:{cart:{id:cart.id,checkoutUrl:'https://'+config.shopDomain+'/checkout/synthetic',lines:{nodes:structuredClone(cart.lines),pageInfo:{hasNextPage:false}}}}});
    calls++; assert.equal(url, `https://${config.shopDomain}/api/${config.apiVersion}/graphql.json`);
    const body = JSON.parse(options.body), update = body.query.includes('cartLinesUpdate'),add=body.query.includes('cartLinesAdd'), line = update||add ? body.variables.lines[0] : body.variables.input.lines[0];
    requests.push(body); const prices = {'gid://shopify/ProductVariant/301': 2999, 'gid://shopify/ProductVariant/302': 3499};
    assert.ok(prices[line.merchandiseId], 'unknown variant');
    if (duringSend) await duringSend();
    const unit = prices[line.merchandiseId];
    const node = {id: update ? line.id : 'gid://shopify/CartLine/' + (cart.lines.length + 1) + '?cart=synthetic', quantity: line.quantity, attributes: line.attributes,
      merchandise: {id: line.merchandiseId}, cost: {amountPerQuantity: {amount: euro(unit), currencyCode: 'EUR'}, totalAmount: {amount: euro(unit * line.quantity), currencyCode: 'EUR'}}};
    if (update) {assert.equal(body.variables.cartId, cart.id); const i = cart.lines.findIndex(l => l.id === line.id); assert.ok(i >= 0, 'unknown cart line'); cart.lines[i] = node;}
    else cart.lines.push(node);
    return Response.json({data: {[update ? 'cartLinesUpdate' : add ? 'cartLinesAdd' : 'cartCreate']: {userErrors: [], warnings: [], cart: {
      id: cart.id, checkoutUrl: `https://${config.shopDomain}/checkout/synthetic?key=synthetic-capability`,
      lines: {pageInfo: {hasNextPage: false}, nodes: update ? cart.lines : [node]}}}}});
  };
  const submit = (data = input, access = context, options = {}) => createDraftCartHandoff({drafts: store, config: {...config, ...options}}, {fetchImpl})(data, access);
  t.after(() => {store.close(); rmSync(directory, {recursive: true, force: true});});
  // Bearbeiten: neue Entwurfsrevision, neuer Prüfstand, Angebot – wahlweise andere Ausführung (Variante 302, 34,99 €).
  function edit({variantId = '301', basePriceCents = 2999, quantity = 2} = {}) {
    const current = store.get(draft.id, draft.token), saved = store.save(draft.id, draft.token, {text: 'edited ' + current.revision}, current.revision);
    const edited = {...record, document: {...record.document, basePriceCents}};
    const next = {...manifest, id: 'review_synthetic_' + saved.revision, source: {...manifest.source, draftRevision: saved.revision},
      product: {...manifest.product, basePriceCents}, packageSha256: 'b'.repeat(64)};
    store.capture(draft.id, draft.token, saved.revision, {manifest: next, preview: Buffer.from('<svg/>'),
      contourPdf: Buffer.from('synthetic'), package: Buffer.from('synthetic'), photos: Buffer.from('synthetic')});
    const b = store.orderIntake.bind({shopDomain: config.shopDomain, variantId, record: edited});
    const o = store.orderIntake.offer({bindingId: b.id, snapshotId: next.id, quantity});
    return {offer: o, input: {draftId: draft.id, snapshotId: next.id, expectedRevision: saved.revision, offerId: o.id, offerToken: o.property.value}};
  }
  return {draft, input, context, record, offer, submit, filename, manifest, cart, requests, edit, get store() {return store;}, get calls() {return calls;},
    expire() {now += 7 * 86400000;}, during(fn) {duringSend = fn;},
    reopen() {store.close(); store = createFormCustomerStore({filename, clock: () => now});}};
}
// Bestellposition wie Shopify sie liefert: Angebot plus (nach einer Übergabe) Konfigurations-ID und Revision aus der Warenkorbzeile.
function pay(f, {properties, offer = f.offer, price = '29.99', eventId = 'synthetic-paid-event', lineId = 201, variantId = Number(offer.variantId)} = {}) {
  const known = f.store.cartConfigurations.byOffer(offer.id);
  properties ??= [offer.property, ...(known ? [{name: '_gravuru_config', value: known.id}, {name: '_gravuru_rev', value: String(known.rev)}] : [])];
  const secret = 'synthetic-webhook-secret', raw = Buffer.from(JSON.stringify({id: 101, test: true,
    financial_status: 'paid', currency: 'EUR', line_items: [{id: lineId, variant_id: variantId, quantity: 2,
      price, properties}]}));
  return f.store.orderIntake.receive(raw, {'x-shopify-hmac-sha256': createHmac('sha256', secret).update(raw).digest('base64'),
    'x-shopify-shop-domain': config.shopDomain, 'x-shopify-api-version': config.apiVersion,
    'x-shopify-topic': 'orders/paid', 'x-shopify-webhook-id': eventId}, {...config, secret});
}

test('authenticated saved draft resolves server prices and reuses its cart after restart', async t => {
  const f = setup(t), result = await f.submit(); assert.equal(result.totalCents, 5998); assert.equal(result.paymentConfirmed, false);
  f.reopen(); assert.deepEqual(await f.submit(), {...result, duplicate: true}); assert.equal(f.calls, 1);
  const db = new DatabaseSync(f.filename, {readOnly: true});
  try {const rows = JSON.stringify(db.prepare('SELECT * FROM storefront_cart_handoffs').all());
    for (const secret of [f.draft.token, f.offer.property.value, config.privateToken, f.draft.id]) assert.ok(!rows.includes(secret));
  } finally {db.close();}
});
test('missing or forged draft capability cannot send or retrieve a completed cart', async t => {
  const f = setup(t);
  for (const draftToken of [undefined, '', 'f'.repeat(64), ['f'.repeat(64)]])
    await assert.rejects(f.submit(f.input, {...f.context, draftToken}), e => e.status === 404);
  assert.equal(f.calls, 0); await f.submit();
  await assert.rejects(f.submit(f.input, {...f.context, draftToken: 'f'.repeat(64)}), e => e.status === 404);
  assert.equal(f.calls, 1);
});
test('another valid private draft cannot claim the snapshot or completed checkout', async t => {
  const f = setup(t), other = f.store.create(f.record, f.draft.designId, {});
  const attempt = () => f.submit({...f.input, draftId: other.id}, {...f.context, draftToken: other.token});
  await assert.rejects(attempt(), e => e.code === 'cart_private'); assert.equal(f.calls, 0);
  await f.submit(); await assert.rejects(attempt(), e => e.code === 'cart_private'); assert.equal(f.calls, 1);
});
test('caller cannot override price, quantity, variant, shop, principal or buyer IP in the request', async t => {
  const f = setup(t);
  for (const [key, value] of Object.entries({unitCents: 1, quantity: 1, variantId: '99', shopDomain: 'other.myshopify.com', principalId: 'other', buyerIp: '192.0.2.7'}))
    await assert.rejects(f.submit({...f.input, [key]: value}), e => e.code === 'cart_fields');
  assert.equal(f.calls, 0);
});
test('wrong offer ID/token, snapshot and configured shop never trigger transport', async t => {
  const f = setup(t);
  for (const change of [{offerId: 'offer_unknown'}, {offerToken: 'f'.repeat(64)}, {offerToken: 'bad'}, {snapshotId: 'review_unknown'}])
    await assert.rejects(f.submit({...f.input, ...change}), e => e.status === 404);
  await assert.rejects(f.submit(f.input, f.context, {shopDomain: 'other.myshopify.com'}), e => e.status === 404);
  assert.equal(f.calls, 0);
});
test('expiry at its exact deadline blocks both a first send and cached checkout access', async t => {
  for (const completed of [false, true]) {
    const f = setup(t); if (completed) await f.submit(); f.expire();
    await assert.rejects(f.submit(), /abgelaufen/); assert.equal(f.calls, Number(completed));
  }
});
test('changed draft revision cannot reuse an old snapshot or bypass it with a current revision number', async t => {
  const f = setup(t); await f.submit(); f.store.save(f.draft.id, f.draft.token, {text: 'changed'}, 1);
  await assert.rejects(f.submit(), e => e.code === 'cart_stale');
  await assert.rejects(f.submit({...f.input, expectedRevision: 2}), e => e.code === 'cart_private'); assert.equal(f.calls, 1);
});
test('review blockers stop handoff before journal and network', async t => {
  const f = setup(t, {blockers: ['synthetic missing field']});
  await assert.rejects(f.submit(), e => e.code === 'cart_blocked'); assert.equal(f.calls, 0);
});
test('a mismatched design and a non-form snapshot cannot masquerade as this saved draft', async t => {
  const f = setup(t, {schema: 'unsupported-review/v1'});
  await assert.rejects(f.submit(), e => e.code === 'cart_private'); assert.equal(f.calls, 0);
  const base = setup(t);
  const drafts = {...base.store, review(id) {const r = base.store.review(id); r.manifest.source.designId = 'other'; return r;}};
  const submit = createDraftCartHandoff({drafts, config}, {fetchImpl: () => {throw Error('must not send');}});
  await assert.rejects(submit(base.input, base.context), e => e.code === 'cart_private');
});
test('paid offers block both initial send and reuse of a cached cart', async t => {
  for (const completed of [false, true]) {
    const f = setup(t); if (completed) await f.submit(); pay(f);
    await assert.rejects(f.submit(), /bereits zu einer Bestellung/); assert.equal(f.calls, Number(completed));
  }
});
test('draft changes during send suppress the checkout URL and preserve the no-resend journal', async t => {
  const f = setup(t); f.during(() => f.store.save(f.draft.id, f.draft.token, {text: 'new'}, 1));
  await assert.rejects(f.submit(), e => e.code === 'cart_stale' && !e.message.includes('synthetic-capability'));
  f.reopen(); await assert.rejects(f.submit(), e => e.code === 'cart_stale'); assert.equal(f.calls, 1);
});
test('paid event arriving during send prevents return of an already consumed checkout', async t => {
  const f = setup(t); f.during(() => pay(f));
  await assert.rejects(f.submit(), /bereits zu einer Bestellung/); assert.equal(f.calls, 1);
});
test('network failure cannot mint a fresh offer or resend on repeated calls', async t => {
  const f = setup(t); f.during(() => {throw Error('private upstream detail');});
  await assert.rejects(f.submit(), e => e.code === 'cart_review' && !e.message.includes('upstream'));
  await assert.rejects(f.submit(), e => e.code === 'cart_review'); assert.equal(f.calls, 1);
});

// K8 (Ü9.1): Konfigurations-ID und Revision in der Warenkorbzeile, Bearbeiten ersetzt die Zeile.
const attribute = (line, key) => line.attributes.filter(a => a.key === key).map(a => a.value);

test('a second private form design adds to a server-owned cart without merging equal variants; browser cart injection is rejected',async t=>{
 const f=setup(t),first=await f.submit(),other=f.store.create(f.record,'design_synthetic',{text:'second design'});
 const manifest={...f.manifest,id:'review_second',source:{...f.manifest.source,draftId:other.id}};
 f.store.capture(other.id,other.token,1,{manifest,preview:Buffer.from('<svg/>'),contourPdf:Buffer.from('synthetic'),package:Buffer.from('synthetic'),photos:Buffer.from('synthetic')});
 const binding=f.store.orderIntake.bindings()[0],offer=f.store.orderIntake.offer({bindingId:binding.id,snapshotId:manifest.id,quantity:2});
 const input={draftId:other.id,expectedRevision:1,snapshotId:manifest.id,offerId:offer.id,offerToken:offer.property.value},context={draftToken:other.token,buyerIp:'192.0.2.5',existingCart:{cartId:first.cartId}};
 await assert.rejects(f.submit({...input,existingCart:context.existingCart},context),e=>e.code==='cart_fields');
 const second=await f.submit(input,context);assert.equal(second.mode,'add');assert.equal(second.cartId,first.cartId);assert.notEqual(second.configuration.id,first.configuration.id);assert.equal(f.cart.lines.length,2);assert.deepEqual(f.cart.lines.map(l=>l.quantity),[2,2]);
 assert.equal((await f.submit(input,context)).duplicate,true);assert.equal(f.calls,2);
});
test('first handoff carries a stable configuration ID, revision 1 and an optional private edit link', async t => {
  const f = setup(t), result = await f.submit(f.input, f.context, {editUrl: 'https://shop.example/products/tafel?size=m'});
  assert.match(result.configuration.id, /^konfig_[a-f0-9-]{36}$/); assert.equal(result.configuration.rev, 1);
  assert.match(result.lineId, /^gid:\/\/shopify\/CartLine\//); assert.equal(result.mode, 'create');
  const line = f.requests[0].variables.input.lines[0];
  assert.deepEqual(attribute(line, '_gravuru_config'), [result.configuration.id]); assert.deepEqual(attribute(line, '_gravuru_rev'), ['1']);
  assert.deepEqual(attribute(line, '_gravuru_bearbeiten'), ['https://shop.example/products/tafel?size=m&config=' + result.configuration.id + '&rev=1']);
  for (const value of [f.draft.token, f.draft.id, f.offer.property.value]) assert.ok(!JSON.stringify(line.attributes.filter(a => a.key !== '_gravuru_offer')).includes(value));
  const stored = f.store.cartConfigurations.revision(result.configuration.id, 1);
  assert.equal(stored.snapshotId, f.manifest.id); assert.equal(stored.lineId, result.lineId); assert.equal(stored.cartId, result.cartId);
  // Ohne Bearbeiten-Adresse keine sichtbare Eigenschaft; ungültige Adresse wird vor dem Transport abgewiesen.
  const g = setup(t); await g.submit(); assert.deepEqual(attribute(g.requests[0].variables.input.lines[0], 'Bearbeiten'), []);
  const h = setup(t); assert.throws(() => h.submit(h.input, h.context, {editUrl: 'http://shop.example/p'}), /Bearbeiten-Adresse/); assert.equal(h.calls, 0);
});
test('editing with the cart line replaces the line via cartLinesUpdate: revision n+1, quantity kept, price recalculated, no duplicate', async t => {
  const f = setup(t), first = await f.submit();
  const {input} = f.edit({variantId: '302', basePriceCents: 3499});
  const second = await f.submit({...input, configId: first.configuration.id, cartLineId: first.lineId});
  assert.deepEqual(second.configuration, {id: first.configuration.id, rev: 2}); assert.equal(second.mode, 'update');
  assert.equal(second.quantity, 2); assert.equal(second.unitCents, 3499); assert.equal(second.totalCents, 6998);
  assert.equal(second.cartId, first.cartId); assert.equal(second.lineId, first.lineId); assert.equal(second.duplicate, false);
  const request = f.requests[1]; assert.match(request.query, /cartLinesUpdate/); assert.equal(request.variables.cartId, first.cartId);
  const line = request.variables.lines[0]; assert.equal(line.id, first.lineId); assert.equal(line.quantity, 2);
  assert.equal(line.merchandiseId, 'gid://shopify/ProductVariant/302');
  assert.deepEqual(attribute(line, '_gravuru_config'), [first.configuration.id]); assert.deepEqual(attribute(line, '_gravuru_rev'), ['2']);
  assert.equal(f.cart.lines.length, 1); assert.deepEqual(attribute(f.cart.lines[0], '_gravuru_rev'), ['2']);
  // Alte Revision bleibt unverändert und unveränderlich gespeichert.
  const ledger = f.store.cartConfigurations, r1 = ledger.revision(first.configuration.id, 1), r2 = ledger.revision(first.configuration.id, 2);
  assert.equal(r1.snapshotId, f.manifest.id); assert.equal(r2.snapshotId, input.snapshotId); assert.equal(r2.draftRevision, 2);
  assert.throws(() => ledger.attachCartLine(first.configuration.id, 1, {cartId: 'gid://shopify/Cart/other', lineId: 'gid://shopify/CartLine/x'}), /bereits/);
  const db = new DatabaseSync(f.filename);
  try {
    assert.throws(() => db.prepare('UPDATE cart_configuration_revisions SET snapshot_id=? WHERE rev=1').run('x'), /immutable/);
    assert.throws(() => db.prepare('DELETE FROM cart_configuration_revisions WHERE rev=1').run(), /immutable/);
  } finally {db.close();}
  // Wiederholung derselben Aktualisierung sendet nichts erneut und erzeugt keine weitere Revision.
  assert.deepEqual(await f.submit({...input, configId: first.configuration.id, cartLineId: first.lineId}), {...second, duplicate: true});
  assert.equal(f.calls, 2); assert.equal(ledger.latest(first.configuration.id).rev, 2);
  // Nächste Bearbeitung hängt an der zuletzt bestätigten Zeile, Revision 3.
  const third = await f.submit({...f.edit().input, cartLineId: second.lineId});
  assert.equal(third.configuration.rev, 3); assert.equal(f.cart.lines.length, 1); assert.equal(f.calls, 3);
});
test('without a cart line the edited design is added as a new line; a foreign or premature line is refused before sending', async t => {
  const f = setup(t), first = await f.submit();
  const lost = await f.submit(f.edit().input);
  assert.equal(lost.mode, 'create'); assert.deepEqual(lost.configuration, {id: first.configuration.id, rev: 2});
  assert.equal(f.cart.lines.length, 2); assert.notEqual(lost.lineId, first.lineId);
  await assert.rejects(f.submit({...f.edit().input, cartLineId: 'gid://shopify/CartLine/foreign?cart=x'}), e => e.code === 'cart_line_mismatch');
  await assert.rejects(f.submit({...f.edit().input, configId: 'konfig_' + '0'.repeat(36)}), e => e.code === 'cart_private');
  const g = setup(t); await assert.rejects(g.submit({...g.input, cartLineId: 'item-key'}), e => e.code === 'cart_line_unknown');
  assert.equal(g.calls, 0); assert.equal(f.calls, 2);
  for (const bad of [{configId: 'draft_x'}, {cartLineId: ''}, {cartLineId: 'a\nb'}]) await assert.rejects(f.submit({...f.input, ...bad}), e => e.code === 'cart_fields');
});
test('order intake admits only the exact configuration revision and rejects unknown ones as single position errors', async t => {
  const f = setup(t), first = await f.submit(), {offer, input} = f.edit({variantId: '302', basePriceCents: 3499});
  const second = await f.submit({...input, cartLineId: first.lineId});
  const wrong = pay(f, {offer, price: '34.99', properties: [offer.property, {name: '_gravuru_config', value: second.configuration.id}, {name: '_gravuru_rev', value: '9'}]});
  assert.equal(wrong.lines.length, 0); assert.equal(wrong.errors.length, 1); assert.equal(wrong.errors[0].status, 'fehler');
  assert.match(wrong.errors[0].intakeError, /Konfigurations-Revision/);
  const missing = pay(f, {offer, price: '34.99', properties: [offer.property], eventId: 'synthetic-paid-event-2'});
  assert.equal(missing.lines.length, 0); assert.match(missing.errors[0].intakeError, /nennt ihre Konfigurations-Revision nicht/);
  const stale = pay(f, {offer: f.offer, properties: [f.offer.property, {name: '_gravuru_config', value: first.configuration.id}, {name: '_gravuru_rev', value: '1'}], eventId: 'synthetic-paid-event-3'});
  assert.equal(stale.lines.length, 1); assert.deepEqual(stale.lines[0].configuration, {id: first.configuration.id, rev: 1});
  const ok = pay(f, {offer, price: '34.99', eventId: 'synthetic-paid-event-4', lineId: 202});
  assert.equal(ok.lines.length, 1); assert.deepEqual(ok.lines[0].configuration, {id: second.configuration.id, rev: 2}); assert.equal(ok.lines[0].unitCents, 3499);
  assert.equal(f.store.orderIntake.errors().length, 0);
});
