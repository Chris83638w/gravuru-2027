// Migration bridge for offers issued BEFORE a product had a price contract.
// Entries come exclusively from the app-owned product metafield, after matching
// the immutable server offer and configuration. Missing counters alone never
// exempt a line. The original quantity and price are fixed, not browser prices.
export function legacyPrice(line, pricing, rate) {
  const entries = pricing.legacyOffers;
  if (entries === undefined) return null;
  if (!Array.isArray(entries) || entries.length > 100) throw Error('Invalid legacy offer registry');
  const matches = entries.filter(e => e?.offer === line.offer?.value);
  if (!matches.length) return null;
  const e = matches[0];
  if (matches.length !== 1 || Object.keys(e).sort().join(',') !== 'config,offer,quantity,revision,unitCents,variantId' ||
      !/^[a-f0-9]{64}$/.test(e.offer) || !/^konfig_[a-f0-9-]{36}$/.test(e.config) ||
      !Number.isSafeInteger(e.revision) || e.revision < 1 ||
      !Number.isSafeInteger(e.quantity) || e.quantity < 1 || e.quantity > 99 ||
      !Number.isSafeInteger(e.unitCents) || e.unitCents < 0 || e.unitCents > 100000000 ||
      !/^[1-9][0-9]{0,19}$/.test(e.variantId) ||
      line.configuration?.value !== e.config || line.configRevision?.value !== String(e.revision) ||
      line.quantity !== e.quantity || line.merchandise.id !== 'gid://shopify/ProductVariant/' + e.variantId ||
      !Object.prototype.hasOwnProperty.call(pricing.variants || {}, e.variantId) ||
      ['revision', 'designFile', 'motifs', 'uploads', 'logos'].some(k => line[k]?.value != null)) {
    throw Error('Legacy offer does not match the saved configuration');
  }
  const converted = e.unitCents * Number(rate);
  if (!Number.isFinite(Number(rate)) || Number(rate) <= 0 || !Number.isFinite(converted) || converted > Number.MAX_SAFE_INTEGER) throw Error('Invalid currency conversion');
  return {lineUpdate: {cartLineId: line.id, price: {adjustment: {fixedPricePerUnit: {amount: (converted / 100).toFixed(2)}}}}};
}
