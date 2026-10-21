// Exact source extraction from gravuru-2027 bf5c059f13e0868d7c554616b7c35ff7a328ae62
// app/configurator/variant-m/contract.mjs, QUANTITY_TIER_MAX through applyQuantityTier.
export const QUANTITY_TIER_MAX = 10;
export function quantityTiersIssue(tiers, {allowUnitCents=true}={}) {
  if (!Array.isArray(tiers) || tiers.length > QUANTITY_TIER_MAX) return 'Mengenstaffel: Liste mit höchstens ' + QUANTITY_TIER_MAX + ' Stufen.';
  let last = 1;
  for (const t of tiers) {
    if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).some(k => !['minQuantity','percentOff','unitCents'].includes(k))) return 'Mengenstaffel: Stufe aus minQuantity und percentOff oder unitCents.';
    if (!Number.isInteger(t.minQuantity) || t.minQuantity < 2 || t.minQuantity > 99 || t.minQuantity <= last) return 'Mengenstaffel: Mindestmengen 2 bis 99, aufsteigend.';
    last = t.minQuantity;
    const percent = Object.hasOwn(t, 'percentOff'), unit = Object.hasOwn(t, 'unitCents');
    if (percent === unit) return 'Mengenstaffel ab ' + t.minQuantity + ' Stück: entweder percentOff oder unitCents.';
    if (percent && t.percentOff !== null && !(Number.isFinite(t.percentOff) && t.percentOff > 0 && t.percentOff < 100 && Number.isInteger(Math.round(t.percentOff * 100)) && Math.abs(t.percentOff * 100 - Math.round(t.percentOff * 100)) < 1e-9)) return 'Mengenstaffel ab ' + t.minQuantity + ' Stück: Prozent über 0 und unter 100 (höchstens zwei Nachkommastellen) oder offen.';
    if (unit && (!allowUnitCents || !(t.unitCents === null || (Number.isSafeInteger(t.unitCents) && t.unitCents >= 0 && t.unitCents <= 100000000)))) return allowUnitCents ? 'Mengenstaffel ab ' + t.minQuantity + ' Stück: Stückpreis in ganzen Cent oder offen.' : 'Mengenstaffel: Stückpreise nur bei Produkten mit festem Grundpreis, sonst Prozent.';
  }
  return null;
}
const tierValue = t => Object.hasOwn(t, 'percentOff') ? t.percentOff : t.unitCents;
export const quantityTiersOpen = tiers => Array.isArray(tiers) && tiers.some(t => tierValue(t) === null);
// Gerechnete Staffel: vorhanden, nicht leer und ohne offenen Wert – sonst keine.
export function activeQuantityTiers(config) {
  const tiers = config?.quantityTiers;
  return Array.isArray(tiers) && tiers.length && !quantityTiersOpen(tiers) ? tiers : null;
}
export function quantityTierFor(config, quantity) {
  let hit = null;
  for (const t of activeQuantityTiers(config) || []) if (quantity >= t.minQuantity) hit = t;
  return hit;
}
// Kaufmännisch gerundet auf ganze Cent (halbe Cent nach oben), rein ganzzahlig.
const roundHalfUp = (numerator, denominator) => Math.floor((2 * numerator + denominator) / (2 * denominator));
export function applyQuantityTier(listUnitCents, tier, baseCents = 0) {
  if (!tier) return listUnitCents;
  if (Object.hasOwn(tier, 'percentOff')) return roundHalfUp(listUnitCents * (10000 - Math.round(tier.percentOff * 100)), 10000);
  return Math.max(0, listUnitCents - baseCents + tier.unitCents);
}

