import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createCartConfigurations} from './cart-configuration.mjs';

const uuid = c => c.repeat(8) + '-' + c.repeat(4) + '-' + c.repeat(4) + '-' + c.repeat(4) + '-' + c.repeat(12);
const draft = 'adraft_' + uuid('a'), offer = n => 'offer_' + uuid(String(n));
const base = {draftId: draft, draftRevision: 1, snapshotId: 'proof_1', offerId: offer(1), productId: 'cfg_x'};
const line = n => ({cartId: 'gid://shopify/Cart/synthetic', lineId: 'gid://shopify/CartLine/' + n + '?cart=synthetic'});

test('first handoff gets revision 1, each new offer n+1, the same offer keeps its revision; rows are append-only', t => {
  const db = new DatabaseSync(':memory:'); t.after(() => db.close());
  const ledger = createCartConfigurations({database: db, clock: () => Date.UTC(2026, 9, 19)});
  assert.equal(ledger.forDraft(draft), null);
  const first = ledger.assign(base);
  assert.match(first.id, /^konfig_[a-f0-9-]{36}$/); assert.equal(first.rev, 1); assert.equal(first.created, true);
  assert.deepEqual(ledger.assign(base), {...first, created: false});
  const second = ledger.assign({...base, draftRevision: 2, snapshotId: 'proof_2', offerId: offer(2)});
  assert.equal(second.id, first.id); assert.equal(second.rev, 2); assert.equal(ledger.forDraft(draft).rev, 2);
  assert.throws(() => ledger.assign({...base, snapshotId: 'proof_other'}), /anderen Konfigurationsstand/);
  assert.throws(() => ledger.assign({...base, offerId: offer(3), productId: 'cfg_other'}), /anderen Produkt/);
  assert.throws(() => ledger.assign({...base, draftId: 'bad'}), e => e.status === 422);
  assert.deepEqual(ledger.revision(first.id, 1).snapshotId, 'proof_1'); assert.equal(ledger.latest(first.id).rev, 2);
  assert.throws(() => ledger.revision(first.id, 3), e => e.status === 404); assert.throws(() => ledger.revision('konfig_x', 1), e => e.status === 404);
  assert.equal(ledger.byOffer(offer(2)).rev, 2); assert.equal(ledger.byOffer(offer(9)), null);
  // Warenkorbzeile wird genau einmal angehängt; frühere Revision bleibt der Anker fürs Bearbeiten.
  assert.equal(ledger.lastCartLine(first.id, {before: 2}), null);
  ledger.attachCartLine(first.id, 1, line(1)); ledger.attachCartLine(first.id, 1, line(1));
  assert.throws(() => ledger.attachCartLine(first.id, 1, line(2)), /bereits/);
  assert.throws(() => ledger.attachCartLine(first.id, 2, {cartId: 'x', lineId: 'y'}), e => e.status === 422);
  assert.equal(ledger.lastCartLine(first.id, {before: 2}).lineId, line(1).lineId);
  assert.equal(ledger.lastCartLine(first.id, {before: 1}), null);
  const third = ledger.assign({...base, draftRevision: 3, snapshotId: 'proof_3', offerId: offer(3)});
  assert.equal(ledger.lastCartLine(first.id, {before: third.rev}).rev, 1);
  for (const sql of ['UPDATE cart_configurations SET draft_id=\'adraft_x\'', 'DELETE FROM cart_configurations',
    'UPDATE cart_configuration_revisions SET rev=9 WHERE rev=1', 'UPDATE cart_configuration_revisions SET cart_id=\'x\' WHERE rev=1', 'DELETE FROM cart_configuration_revisions'])
    assert.throws(() => db.exec(sql), /immutable|once/);
});
