import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAmazonContribution, AMAZON_COST_CATEGORIES } from './amazon-economics.mjs';
const money = (cents, kind = 'actual') => ({ cents, currency: 'EUR', basis: 'net', kind });
const input = () => ({ sku: 'TEST-SKU', asin: 'B012345678', currency: 'EUR', basis: 'net', allocationId: 'item-total-1',
  revenue: money(3000), costs: { amazonFees: money(450), advertising: money(100), shipping: money(400),
    materials: money(300), production: money(500), returns: money(0) } });

test('calculates exact cents for one explicit allocation with real zero distinguished from absence', () => {
  const result = calculateAmazonContribution(input());
  assert.equal(result.contributionCents, 1250); assert.equal(result.totalCostCents, 1750);
  assert.equal(result.status, 'actual'); assert.deepEqual(result.unknownCategories, []);
  assert.equal(result.costs.returns.cents, 0);
});

test('unknown costs and revenue produce null totals/contribution, never a false profit', () => {
  const source = input(); delete source.costs.advertising; source.costs.shipping = null;
  const result = calculateAmazonContribution(source);
  assert.equal(result.knownCostCents, 1250); assert.equal(result.totalCostCents, null);
  assert.equal(result.contributionCents, null); assert.equal(result.status, 'incomplete');
  assert.deepEqual(result.unknownCategories, ['advertising', 'shipping']);
  assert.equal(calculateAmazonContribution({ ...input(), revenue: null }).revenueCents, null);
});

test('estimated fees remain estimates and gross balances are not called net contribution', () => {
  const source = input(); source.costs.amazonFees.kind = 'estimate';
  assert.equal(calculateAmazonContribution(source).status, 'estimated');
  const gross = input(); gross.basis = 'gross'; gross.revenue.basis = 'gross';
  for (const value of Object.values(gross.costs)) value.basis = 'gross';
  const result = calculateAmazonContribution(gross);
  assert.equal(result.balanceCents, 1250); assert.equal(result.contributionCents, null);
  assert.equal(result.warning, 'gross_balance_is_not_net_contribution');
});

test('currency, tax basis, cents, provenance, categories and allocation scope are validated', () => {
  for (const patch of [{ currency: 'USD' }, { basis: 'gross' }, { cents: 1.5 }, { cents: -1 },
    { cents: Number.MAX_SAFE_INTEGER + 1 }, { kind: 'assumed' }]) {
    const source = input(); source.costs.shipping = { ...source.costs.shipping, ...patch };
    assert.throws(() => calculateAmazonContribution(source), { code: 'amazon_economics' });
  }
  assert.throws(() => calculateAmazonContribution({ ...input(), allocationId: '' }));
  assert.throws(() => calculateAmazonContribution({ ...input(), costs: { hidden: money(1) } }));
  assert.throws(() => calculateAmazonContribution({ ...input(), currency: 'JPY' }));
});

test('sum overflow is rejected and losses are represented without rounding', () => {
  const source = input(); source.revenue.cents = 0;
  assert.equal(calculateAmazonContribution(source).contributionCents, -1750);
  source.costs = Object.fromEntries(AMAZON_COST_CATEGORIES.map(key => [key, money(Number.MAX_SAFE_INTEGER)]));
  assert.throws(() => calculateAmazonContribution(source), { code: 'amazon_economics' });
});
