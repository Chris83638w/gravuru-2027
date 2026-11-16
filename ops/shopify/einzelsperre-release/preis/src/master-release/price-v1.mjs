// Prices and tiers are app-owned product data. The quantity comes from Shopify.
// Existing v1 personalization attributes are preserved; they are not signatures.
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const money = n => Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
const count = (value, max) => {
  if (!/^(0|[1-9]\d*)$/.test(value || '') || Number(value) > max) throw Error('Invalid personalization quantity');
  return Number(value);
};

export function tierPrice(listCents, tiers, quantity) {
  if (!Array.isArray(tiers) || tiers.length > 10 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw Error('Invalid quantity tiers');
  let previous = 1, selected = null;
  for (const tier of tiers) {
    if (!tier || typeof tier !== 'object' || Array.isArray(tier) || Object.keys(tier).length !== 2 ||
        !owns(tier, 'minQuantity') || !owns(tier, 'percentOff') ||
        !Number.isSafeInteger(tier.minQuantity) || tier.minQuantity <= previous || tier.minQuantity > 99 ||
        !Number.isFinite(tier.percentOff) || tier.percentOff <= 0 || tier.percentOff >= 100 ||
        Math.abs(tier.percentOff * 100 - Math.round(tier.percentOff * 100)) >= 1e-9) throw Error('Invalid quantity tiers');
    previous = tier.minQuantity;
    if (quantity >= tier.minQuantity) selected = tier;
  }
  if (!money(listCents)) throw Error('Invalid personalization price');
  if (!selected) return listCents;
  const numerator = listCents * (10000 - Math.round(selected.percentOff * 100));
  // Same integer-cent half-up rule as configurator/variant-m/contract.mjs.
  return Math.floor((2 * numerator + 10000) / 20000);
}

export function cartTransformRun(input) {
  const operations = [];
  for (const line of input.cart.lines) {
    const item = line.merchandise;
    if (item?.__typename !== 'ProductVariant') continue;
    const pricing = item.product.pricing?.jsonValue;
    const hasTiers = pricing != null && owns(pricing, 'quantityTiers');
    const hasScope = pricing != null && owns(pricing, 'quantityTierScope');
    if (hasTiers !== hasScope || (hasTiers && pricing.quantityTierScope !== 'complete-unit')) throw Error('Invalid quantity tier scope');
    if (!pricing?.enabled) {
      if (hasTiers) throw Error('Tier pricing must be enabled');
      continue;
    }
    if (pricing.schema !== 'gravuru-personalization-pricing/v1' || pricing.productId !== item.product.id || pricing.currency !== 'EUR') throw Error('Invalid product pricing configuration');
    const base = pricing.variants?.[item.id.split('/').pop()];
    if (![base, pricing.extraMotifCents, pricing.extraPhotoCents].every(money) ||
        line.revision?.value !== String(pricing.revision) || !line.designFile?.value) throw Error('Personalization must be completed before checkout');
    const motifs = count(line.motifs?.value, 200), uploads = count(line.uploads?.value, 4);
    // User decision 2026-10-21: include photos in the tier base, round ONCE.
    const listCents = base + motifs * pricing.extraMotifCents + uploads * pricing.extraPhotoCents;
    if (!money(listCents)) throw Error('Invalid personalization price');
    const unitCents = hasTiers ? tierPrice(listCents, pricing.quantityTiers, line.quantity) : listCents;
    if (!money(unitCents)) throw Error('Invalid personalization price');
    const rate = Number(input.presentmentCurrencyRate), convertedCents = unitCents * rate;
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(convertedCents) || convertedCents < 0 || convertedCents > Number.MAX_SAFE_INTEGER) throw Error('Invalid currency conversion');
    const amount = (convertedCents / 100).toFixed(2);
    operations.push({lineUpdate: {cartLineId: line.id, price: {adjustment: {fixedPricePerUnit: {amount}}}}});
  }
  return {operations};
}
