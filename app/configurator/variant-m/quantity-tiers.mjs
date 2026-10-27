const fail = message => { throw Error(message); };
const money = cents => new Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'}).format(cents / 100);

// K14 / Ü11.1: Mengenstaffel. Stufen `{minQuantity, percentOff}` (Rabatt auf den
// Stückpreis inkl. Optionen und Zusatzmotiven) oder `{minQuantity, unitCents}`
// (Grundpreis je Stück ab dieser Menge; Optionen/Motive kommen dazu). Ein Wert
// `null` heißt „offen“: Eine Staffel mit offenem Wert gilt als keine Staffel und
// wird weder gerechnet noch angezeigt. `[]` = ausdrücklich keine Staffel.
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
  if(tiers===undefined){if(config?.quantityTierScope!==undefined)fail('Mengenstaffel-Geltung braucht gespeicherte Stufen.');return null;}
  if(config.quantityTierScope!==undefined&&config.quantityTierScope!=='complete-unit')fail('Unbekannte Mengenstaffel-Geltung.');
  const issue=quantityTiersIssue(tiers,{allowUnitCents:config.quantityTierScope!=='complete-unit'&&!config.acrylic&&!config.steelFormats});if(issue)fail(issue);
  return tiers.length && !quantityTiersOpen(tiers) ? tiers : null;
}
export function quantityTierFor(config, quantity) {
  let hit = null;
  for (const t of activeQuantityTiers(config) || []) if (quantity >= t.minQuantity) hit = t;
  return hit;
}
// Kaufmännisch gerundet auf ganze Cent (halbe Cent nach oben), rein ganzzahlig.
const roundHalfUp = (numerator, denominator) => Math.floor((2 * numerator + denominator) / (2 * denominator));
export function applyQuantityTier(listUnitCents, tier, baseCents = 0) {
  if(!Number.isSafeInteger(listUnitCents)||listUnitCents<0||listUnitCents>100000000||!Number.isSafeInteger(baseCents)||baseCents<0||baseCents>100000000)fail('Ungültiger Gesamtpreis.');
  if (!tier) return listUnitCents;
  if(quantityTiersIssue([tier])||tierValue(tier)===null)fail('Mengenstaffel noch offen oder ungültig.');
  if (Object.hasOwn(tier, 'percentOff')) return roundHalfUp(listUnitCents * (10000 - Math.round(tier.percentOff * 100)), 10000);
  return Math.max(0, listUnitCents - baseCents + tier.unitCents);
}
// Anzeige neben der Menge: „ab 5 Stück −10 %“; offene Staffel zeigt nichts.
export function quantityTierLabels(config) {
  return (activeQuantityTiers(config) || []).map(t => 'ab ' + t.minQuantity + ' Stück ' + (Object.hasOwn(t, 'percentOff') ?
    '−' + String(t.percentOff).replace('.', ',') + ' %' : 'je ' + money(t.unitCents) + ' Grundpreis'));
}

