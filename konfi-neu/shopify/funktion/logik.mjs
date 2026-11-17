// Fachlogik der beiden Shopify-Funktionen (Preis im Warenkorb, Sperre an der Kasse).
// Diese Datei ist die Referenz: Tests und der lokale Test-Shop benutzen sie direkt.
// Die ausgelieferte Funktion (shopify/funktion/rust) rechnet dasselbe in Rust nach,
// weil die Unterschriftsprüfung in JavaScript das Rechenlimit von Shopify zu schnell erreicht.
//
// Regeln:
//   1. Eine Zeile mit `_gravuru` und gültiger Unterschrift bekommt:
//        Stückpreis = (Variantenpreis + unterschriebener Aufpreis), danach unterschriebene Mengenstaffel.
//   2. Jede Zeile wird für sich behandelt. Ein Fehler in einer Zeile ändert an anderen Zeilen nichts.
//   3. Eine Konfigurator-Zeile ohne gültige Unterschrift behält ihren Variantenpreis und wird an der
//      Kasse gesperrt (nicht im Warenkorb – entfernen und ändern bleibt immer möglich).
import {pruefen, staffelPreis} from '../../core/signatur.mjs';

const variantenNummer = gid => String(gid || '').split('/').pop();

/** @returns {{art:'fremd'} | {art:'ok', stueckCents:number} | {art:'gesperrt', grund:string}} */
export function zeileBewerten(zeile, schluessel, jetztSekunden) {
  const kennung = zeile.gestaltung?.value;
  const konfiProdukt = Boolean(zeile.merchandise?.product?.konfi?.value);
  if (!kennung) return konfiProdukt ? {art: 'gesperrt', grund: 'ohne_gestaltung'} : {art: 'fremd'};
  if (zeile.merchandise?.__typename !== 'ProductVariant') return {art: 'gesperrt', grund: 'keine_variante'};
  if (!schluessel) return {art: 'gesperrt', grund: 'schluessel_fehlt'};
  const ergebnis = pruefen(schluessel, zeile.preis?.value, {gestaltung: kennung, variante: variantenNummer(zeile.merchandise.id), jetzt: jetztSekunden});
  if (!ergebnis.ok) return {art: 'gesperrt', grund: ergebnis.grund};
  const variantenCents = Math.round(Number(zeile.cost?.amountPerQuantity?.amount) * 100);
  if (!Number.isSafeInteger(variantenCents) || variantenCents < 0) return {art: 'gesperrt', grund: 'variantenpreis'};
  return {art: 'ok', stueckCents: staffelPreis(variantenCents + ergebnis.aufpreisCents, zeile.quantity, ergebnis.staffel), variantenCents};
}

const zeitAus = input => { const t = Date.parse(input.shop?.localTime?.date ? input.shop.localTime.date + 'T00:00:00Z' : ''); return Number.isFinite(t) ? Math.floor(t / 1000) : null; };

export function preisLauf(input) {
  const schluessel = input.shop?.schluessel?.value;
  const jetzt = zeitAus(input);
  const operations = [];
  for (const zeile of input.cart.lines) {
    const bewertung = zeileBewerten(zeile, schluessel, jetzt);
    if (bewertung.art !== 'ok' || bewertung.stueckCents === bewertung.variantenCents) continue;
    operations.push({lineUpdate: {cartLineId: zeile.id, price: {adjustment: {fixedPricePerUnit: {amount: (bewertung.stueckCents / 100).toFixed(2)}}}}});
  }
  return {operations};
}

const KASSE = new Set(['CHECKOUT_INTERACTION', 'CHECKOUT_COMPLETION']);
export function pruefLauf(input) {
  if (!KASSE.has(input.buyerJourney?.step)) return {operations: [{validationAdd: {errors: []}}]};
  const schluessel = input.shop?.schluessel?.value;
  const jetzt = zeitAus(input);
  const errors = [];
  for (const zeile of input.cart.lines) {
    const bewertung = zeileBewerten(zeile, schluessel, jetzt);
    if (bewertung.art !== 'gesperrt') continue;
    const titel = String(zeile.merchandise?.product?.title || '').slice(0, 80);
    errors.push({message: (titel ? `„${titel}“: ` : '') + (bewertung.grund === 'abgelaufen'
      ? 'Diese Gestaltung ist zu alt. Bitte öffne sie im Warenkorb über „Bearbeiten“ und lege sie erneut in den Warenkorb.'
      : 'Diese Position hat keine gültige Gestaltung. Bitte entferne sie und gestalte das Produkt im Konfigurator.'), target: '$.cart'});
  }
  return {operations: [{validationAdd: {errors}}]};
}
