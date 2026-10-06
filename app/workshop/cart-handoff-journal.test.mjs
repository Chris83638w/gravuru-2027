import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, rmSync, chmodSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createCartHandoffJournal, createPersistentCartHandoff} from './cart-handoff-journal.mjs';
import {createStorefrontCartTransport} from './storefront-transport.mjs';
import {createFormCustomerStore} from './form-customer-store.mjs';

const shopDomain = 'gravuru-synthetic.myshopify.com', apiVersion = '2026-07';
const owner = {principalId: 'synthetic-private-owner', buyerIp: '192.0.2.5'};
const offer = () => ({scope: 'test-checkout-only', variantId: '301', quantity: 2,
  unitCents: 2999, currency: 'EUR', property: {name: '_gravuru_offer', value: 'a'.repeat(64)}});
const result = () => ({cartId: 'gid://shopify/Cart/synthetic',
  checkoutUrl: `https://${shopDomain}/checkout/synthetic?key=synthetic-checkout-key`,
  quantity: 2, unitCents: 2999, totalCents: 5998, currency: 'EUR', paymentConfirmed: false});
function fixture(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'g27-cart-journal-'));
  const filename = path.join(directory, 'synthetic.sqlite'), connections = new Set();
  const open = () => {
    const db = new DatabaseSync(filename); connections.add(db); chmodSync(filename, 0o600);
    const journal = createCartHandoffJournal({database: db});
    return {db, journal, close() {db.close(); connections.delete(db);},
      handoff(transport, config = {}) {return createPersistentCartHandoff({journal, transport, shopDomain, apiVersion, ...config});}};
  };
  t.after(() => {for (const db of connections) db.close(); rmSync(directory, {recursive: true, force: true});});
  return {open};
}
const rows = db => db.prepare('SELECT * FROM storefront_cart_handoffs').all();

test('completed handoff is reused after reopening the private database without sending a second cart', async t => {
  const f = fixture(t); let current = f.open(), calls = 0;
  const transport = async () => {calls++; return {...result(), raw: 'private-upstream-response'};};
  const first = await current.handoff(transport)(offer(), owner);
  assert.equal(first.duplicate, false); assert.equal(first.paymentConfirmed, false);
  current.close(); current = f.open();
  assert.deepEqual(await current.handoff(transport)(offer(), owner), {...first, duplicate: true});
  assert.equal(calls, 1); assert.equal(rows(current.db).length, 1);
  const stored = JSON.stringify(rows(current.db));
  for (const value of [owner.principalId, offer().property.value, 'private-upstream-response', owner.buyerIp]) assert.ok(!stored.includes(value));
  assert.ok(stored.includes('synthetic-checkout-key')); // Capability stays inside private storage.
  assert.throws(() => current.db.exec("UPDATE storefront_cart_handoffs SET state='started'"), /immutable/);
  assert.throws(() => current.db.exec('DELETE FROM storefront_cart_handoffs'), /retention/);
});

test('two independent database connections cannot send the same offer concurrently', async t => {
  const f = fixture(t), a = f.open(), b = f.open(); let calls = 0, release;
  const waiting = new Promise(resolve => {release = resolve;});
  const transport = async () => {calls++; await waiting; return result();};
  const pending = a.handoff(transport)(offer(), owner);
  await assert.rejects(() => b.handoff(transport)(offer(), owner), e => e.code === 'cart_review' && e.status === 409);
  assert.equal(calls, 1); release(); await pending;
  assert.equal((await b.handoff(transport)(offer(), owner)).duplicate, true);
  assert.equal(calls, 1);
});

test('an unfinished persisted send remains blocked after restart rather than being leased and resent', async t => {
  const f = fixture(t); let current = f.open();
  const pending = current.handoff(() => new Promise(() => {}))(offer(), owner);
  void pending; assert.equal(rows(current.db)[0].state, 'started');
  current.close(); current = f.open(); let calls = 0;
  await assert.rejects(() => current.handoff(async () => {calls++; return result();})(offer(), owner), e => e.code === 'cart_review');
  assert.equal(calls, 0); assert.equal(rows(current.db)[0].state, 'started');
});

test('a different principal cannot read a saved checkout; changed offer or API version cannot reuse it', async t => {
  const current = fixture(t).open(); let calls = 0;
  const transport = async () => {calls++; return result();};
  const handoff = current.handoff(transport); await handoff(offer(), owner);
  await assert.rejects(() => handoff(offer(), {...owner, principalId: 'another-owner'}), e => e.status === 404 && !e.message.includes('synthetic-checkout-key'));
  for (const change of [{quantity: 1}, {unitCents: 3000}, {variantId: '302'}]) {
    await assert.rejects(() => handoff({...offer(), ...change}, owner), e => e.code === 'cart_changed');
  }
  await assert.rejects(() => current.handoff(transport, {apiVersion: '2026-10'})(offer(), owner), e => e.code === 'cart_changed');
  assert.equal(calls, 1);
});

test('unknown and pre-send failures are sanitized, persisted, and never retried', async t => {
  for (const mayHaveCreatedCart of [true, false, undefined]) await t.test(String(mayHaveCreatedCart), async t => {
    const f = fixture(t); let current = f.open(), calls = 0;
    const transport = async () => {calls++; throw Object.assign(Error('private-token-and-upstream-body'), {mayHaveCreatedCart});};
    await assert.rejects(() => current.handoff(transport)(offer(), owner), e => e.code === 'cart_review' && !e.stack.includes('private-token'));
    assert.equal(rows(current.db)[0].state, mayHaveCreatedCart === false ? 'failed' : 'unknown');
    assert.ok(!JSON.stringify(rows(current.db)).includes('private-token'));
    current.close(); current = f.open();
    await assert.rejects(() => current.handoff(transport)(offer(), owner), e => e.status === 409);
    assert.equal(calls, 1);
  });
});

test('failed persistence after a successful response never exposes checkout or permits another send', async t => {
  const current = fixture(t).open(); let calls = 0;
  current.db.exec(`CREATE TRIGGER synthetic_storage_failure BEFORE UPDATE ON storefront_cart_handoffs
    BEGIN SELECT RAISE(ABORT,'synthetic disk failure'); END;`);
  const transport = async () => {calls++; return result();};
  await assert.rejects(() => current.handoff(transport)(offer(), owner), e => e.code === 'cart_storage' && !e.stack.includes('synthetic-checkout-key'));
  assert.equal(rows(current.db)[0].state, 'started');
  await assert.rejects(() => current.handoff(transport)(offer(), owner), e => e.code === 'cart_review');
  assert.equal(calls, 1);
});

test('invalid identity and live offers fail before reserving or sending; unknown input is discarded', async t => {
  const current = fixture(t).open(); let calls = 0;
  const handoff = current.handoff(async fixed => {
    calls++; assert.deepEqual(fixed, offer()); return result();
  });
  for (const principalId of [undefined, '', 'bad\nowner', 'x'.repeat(513)]) {
    await assert.rejects(() => handoff(offer(), {...owner, principalId}), e => e.code === 'cart_principal');
  }
  await assert.rejects(() => handoff({...offer(), scope: 'live'}, owner), e => e.code === 'cart_handoff');
  assert.equal(rows(current.db).length, 0); assert.equal(calls, 0);
  await handoff({...offer(), privatePhoto: 'secret-photo', property: {...offer().property, secret: 'not-allowed'}}, owner);
  assert.equal(calls, 1); assert.ok(!JSON.stringify(rows(current.db)).includes('secret-photo'));
});

test('foreign checkout, mismatching prices and a payment claim cannot become reusable results', async t => {
  for (const change of [{checkoutUrl: 'https://elsewhere.invalid/private'}, {totalCents: 1}, {paymentConfirmed: true}]) await t.test(JSON.stringify(change), async t => {
    const current = fixture(t).open(); let calls = 0;
    const handoff = current.handoff(async () => {calls++; return {...result(), ...change};});
    await assert.rejects(() => handoff(offer(), owner), e => e.code === 'cart_review');
    assert.equal(rows(current.db)[0].state, 'unknown'); assert.equal(rows(current.db)[0].result, null);
    await assert.rejects(() => handoff(offer(), owner)); assert.equal(calls, 1);
  });
});

test('caller changes while waiting do not alter the saved offer or verified result', async t => {
  const current = fixture(t).open(), original = offer();
  const handoff = current.handoff(async fixed => {
    original.quantity = 1; original.property.value = 'b'.repeat(64);
    assert.equal(fixed.quantity, 2); assert.equal(fixed.property.value, 'a'.repeat(64)); return result();
  });
  assert.equal((await handoff(original, owner)).totalCents, 5998);
  assert.equal((await handoff(offer(), owner)).duplicate, true);
});

test('real transport validation and private journal compose without any external request', async t => {
  const current = fixture(t).open(); let calls = 0;
  const transport = createStorefrontCartTransport({shopDomain, apiVersion, privateToken: 'synthetic-private-token'}, {
    fetchImpl: async (_url, options) => {
      calls++; const line = JSON.parse(options.body).variables.input.lines[0];
      return Response.json({data: {cartCreate: {cart: {id: result().cartId, checkoutUrl: result().checkoutUrl,
        lines: {nodes: [{quantity: line.quantity, attributes: line.attributes, merchandise: {id: line.merchandiseId},
          cost: {amountPerQuantity: {amount: '29.99', currencyCode: 'EUR'}, totalAmount: {amount: '59.98', currencyCode: 'EUR'}}}],
          pageInfo: {hasNextPage: false}}}, userErrors: [], warnings: []}}});
    },
  });
  const handoff = current.handoff(transport);
  assert.equal((await handoff(offer(), owner)).duplicate, false);
  assert.equal((await handoff(offer(), owner)).duplicate, true); assert.equal(calls, 1);
});

test('storage failure before reservation prevents the send and hides database errors', async t => {
  const current = fixture(t).open(); let calls = 0;
  current.db.exec(`CREATE TRIGGER synthetic_insert_failure BEFORE INSERT ON storefront_cart_handoffs
    BEGIN SELECT RAISE(ABORT,'private-database-detail'); END;`);
  await assert.rejects(() => current.handoff(async () => {calls++; return result();})(offer(), owner),
    e => e.code === 'cart_storage' && !e.stack.includes('private-database-detail'));
  assert.equal(calls, 0); assert.equal(rows(current.db).length, 0);
});

test('customer store provides its journal inside the same private database without enabling a route', async t => {
  const store = createFormCustomerStore({filename: ':memory:'}); t.after(() => store.close());
  const handoff = createPersistentCartHandoff({journal: store.cartHandoffs, transport: async () => result(), shopDomain, apiVersion});
  assert.equal((await handoff(offer(), owner)).duplicate, false);
  assert.equal((await handoff(offer(), owner)).duplicate, true);
});
