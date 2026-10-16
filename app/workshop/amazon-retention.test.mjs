import test from 'node:test';
import assert from 'node:assert/strict';
import { planAmazonRetention } from './amazon-retention.mjs';
const now = '2026-10-16T12:00:00Z';
const policy = { reviewed: true, version: 'synthetic-policy-v1' };
const record = patch => ({ id: 'opaque-1', dataClass: 'custom_assets', ...patch });
const plan = (records, options = {}) => planAmazonRetention({ records, now, policy, ...options });

test('retention is always dry-run and deliveredAt, not shippedAt, drives the Amazon 30-day cap', () => {
  const records = [record({ shippedAt: '2026-09-01T00:00:00Z', deliveredAt: '2026-09-20T00:00:00Z', payload: 'PRIVATE' })];
  const before = JSON.stringify(records), result = plan(records);
  assert.equal(result.dryRun, true); assert.equal(result.deletionEnabled, false);
  assert.equal(result.decisions[0].dueAt, '2026-10-20T00:00:00.000Z');
  assert.equal(result.decisions[0].action, 'retain_until');
  assert.equal(JSON.stringify(records), before); assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
});

test('completed purpose wins over the outer cap and elapsed cap produces only a candidate', () => {
  const result = plan([record({ deliveredAt: '2026-09-01T00:00:00Z', purposeCompletedAt: '2026-09-02T00:00:00Z' })]);
  assert.equal(result.decisions[0].action, 'delete_candidate');
  assert.deepEqual(result.decisions[0].reasons, ['purpose_completed']);
  assert.equal(result.counts.delete_candidate, 1);
});

test('missing delivery/purpose or unreviewed policy is an explicit review, not indefinite approval', () => {
  assert.equal(plan([record({ shippedAt: '2026-09-01T00:00:00Z' })]).decisions[0].action, 'review');
  assert.deepEqual(plan([record({ deliveredAt: '2026-09-01T00:00:00Z' })], { policy: {} }).decisions[0].reasons, ['policy_not_reviewed']);
  assert.equal(plan([record({ dataClass: 'order_core' })]).decisions[0].action, 'review');
});

test('optional internal seven-day rule requires reviewed policy and cannot replace legal classification', () => {
  const records = [record({ shippedAt: '2026-10-01T00:00:00Z' }), record({ id: 'invoice-1', dataClass: 'legal_accounting_record', shippedAt: '2026-10-01T00:00:00Z' })];
  const result = plan(records, { policy: { ...policy, postShipmentDays: 7 } });
  assert.equal(result.decisions[0].dueAt, '2026-10-08T00:00:00.000Z');
  assert.equal(result.decisions[1].action, 'review');
  assert.throws(() => plan(records, { policy: { ...policy, postShipmentDays: 8 } }));
});

test('legal exception needs basis, document class, reviewer and expiry; expired holds require review', () => {
  const legalException = { basis: 'synthetic legal basis', documentClass: 'invoice', reviewedBy: 'test-reviewer',
    reviewedAt: '2026-10-01T00:00:00Z', retainUntil: '2035-01-01T00:00:00Z' };
  const source = record({ dataClass: 'legal_accounting_record', legalException });
  assert.equal(plan([source]).decisions[0].action, 'retain_legal');
  assert.equal(plan([{ ...source, legalException: {} }]).decisions[0].action, 'review');
  assert.equal(plan([{ ...source, legalException: { ...legalException, retainUntil: '2026-10-01T00:00:00Z' } }]).decisions[0].action, 'review');
  assert.equal(plan([{ ...source, authorizationRevokedAt: '2026-10-01T00:00:00Z' }]).decisions[0].action, 'review');
});

test('revocation deadlines cover all data classes, invalid temporal sequences and repeated IDs fail', () => {
  const source = record({ dataClass: 'order_core', authorizationRevokedAt: '2026-09-01T00:00:00Z' });
  assert.equal(plan([source]).decisions[0].action, 'delete_candidate');
  for (const patch of [{ deliveredAt: '2026-11-01T00:00:00Z' }, { deliveredAt: '2026-02-30T00:00:00Z' },
    { shippedAt: '2026-10-15T00:00:00Z', deliveredAt: '2026-10-14T00:00:00Z' }]) assert.throws(() => plan([record(patch)]));
  assert.throws(() => plan([source, source]));
});
