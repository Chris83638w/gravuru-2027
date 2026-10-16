// Pure SKU/ASIN contribution analysis. All figures are TOTAL amounts for the same
// allocation/window, not unit prices; cents only. Missing is never treated as zero.
export const AMAZON_COST_CATEGORIES = Object.freeze(['amazonFees', 'advertising', 'shipping', 'materials', 'production', 'returns']);
// Deliberately limited to these two-decimal currencies; no implicit FX conversion.
const CURRENCIES = new Set(['EUR', 'GBP', 'PLN', 'SEK', 'DKK', 'NOK', 'CHF', 'CZK', 'HUF', 'RON', 'USD', 'CAD', 'AUD']);
const fail = () => { throw Object.assign(new Error('Wirtschaftlichkeitsdaten haben keine einheitliche Cent-/Währungs-/Steuerbasis.'), { status: 422, code: 'amazon_economics' }); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const label = v => typeof v === 'string' && v.length > 0 && v.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(v);
const sum = values => {
  const result = values.reduce((total, value) => total + BigInt(value), 0n);
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) fail();
  return Number(result);
};

/** Money: {cents: integer, currency:'EUR', basis:'net'|'gross', kind:'actual'|'estimate'} or null. */
export function calculateAmazonContribution({ sku, asin, currency, basis, allocationId, revenue, costs = {} } = {}) {
  if (!label(sku) || (asin != null && (typeof asin !== 'string' || !/^[A-Z0-9]{10}$/.test(asin))) ||
      !label(allocationId) || !CURRENCIES.has(currency) ||
      !['net', 'gross'].includes(basis) || !object(costs) || Object.keys(costs).some(k => !AMAZON_COST_CATEGORIES.includes(k))) fail();
  const readMoney = value => {
    if (value == null) return null;
    if (!object(value) || !Number.isSafeInteger(value.cents) || value.cents < 0 || value.currency !== currency ||
        value.basis !== basis || !['actual', 'estimate'].includes(value.kind)) fail();
    return { cents: value.cents, currency, basis, kind: value.kind };
  };
  const income = readMoney(revenue), details = Object.fromEntries(AMAZON_COST_CATEGORIES.map(k => [k, readMoney(costs[k])]));
  const unknownCategories = AMAZON_COST_CATEGORIES.filter(k => details[k] === null);
  const estimatedCategories = AMAZON_COST_CATEGORIES.filter(k => details[k]?.kind === 'estimate');
  const knownCostCents = sum(Object.values(details).filter(Boolean).map(v => v.cents));
  const complete = income !== null && unknownCategories.length === 0;
  const balanceCents = complete ? sum([income.cents, -knownCostCents]) : null;
  const containsEstimates = income?.kind === 'estimate' || estimatedCategories.length > 0;
  return { schema: 'gravuru-amazon-contribution/v1', sku, asin: asin ?? null, allocationId, currency, basis,
    revenueCents: income?.cents ?? null, costs: details, knownCostCents,
    totalCostCents: unknownCategories.length === 0 ? knownCostCents : null,
    balanceCents, contributionCents: basis === 'net' ? balanceCents : null,
    complete, containsEstimates, status: !complete ? 'incomplete' : containsEstimates ? 'estimated' : 'actual',
    unknownCategories: [...(income === null ? ['revenue'] : []), ...unknownCategories], estimatedCategories,
    warning: basis === 'gross' ? 'gross_balance_is_not_net_contribution' : null };
}
