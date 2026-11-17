// Zufällige, aber wiederholbare Warenkörbe für die Prüfung der Shopify-Funktionen:
// gültige, manipulierte, abgelaufene, fremde und kaputte Zeilen in allen Mischungen.
import {unterschreiben} from '../../core/signatur.mjs';

// Fester Zufall, damit ein Fehlschlag wiederholbar ist.
let saat = 20261117;
const zufall = () => { saat = (saat * 1664525 + 1013904223) >>> 0; return saat / 4294967296; };
export const wahl = liste => liste[Math.floor(zufall() * liste.length)];

export function warenkorb(schritt) {
  const schluessel = 'geheim-' + Math.floor(zufall() * 1000);
  const lines = Array.from({length: 1 + Math.floor(zufall() * 12)}, (_, i) => {
    const variante = 1000 + Math.floor(zufall() * 5);
    const kennung = 'g' + Math.floor(zufall() * 50) + '.' + (1 + Math.floor(zufall() * 3));
    const staffel = wahl(['0', '3x5_5x10_10x15', '2x6_3x10']);
    const ablauf = wahl([1_000_000_000, 4_000_000_000]);
    let preis = unterschreiben(schluessel, {gestaltung: kennung, variante, aufpreisCents: wahl([0, 169, 338, 999, 1299]), staffel, ablauf});
    const fall = wahl(['gut', 'gut', 'gut', 'manipuliert', 'andere-variante', 'ohne', 'fremd', 'kaputt', 'falscher-schluessel']);
    if (fall === 'manipuliert') preis = preis.replace(/^v1\.\d+\./, 'v1.0.');
    if (fall === 'kaputt') preis = wahl(['', 'v1.1.2', 'v2.0.0.1.x', 'v1.-5.0.1.abc', 'v1.1e3.0.1.abc']);
    if (fall === 'falscher-schluessel') preis = unterschreiben('x', {gestaltung: kennung, variante, aufpreisCents: 0, staffel, ablauf});
    return {
      id: 'zeile-' + i, quantity: 1 + Math.floor(zufall() * 12),
      cost: {amountPerQuantity: {amount: wahl(['8.99', '19.99', '22.48', '149.00', '0.01'])}},
      gestaltung: fall === 'ohne' || fall === 'fremd' ? null : {value: kennung},
      preis: fall === 'ohne' || fall === 'fremd' ? null : {value: preis},
      merchandise: {__typename: 'ProductVariant', id: 'gid://shopify/ProductVariant/' + (fall === 'andere-variante' ? variante + 1 : variante), product: {title: 'Türschild „Test“ ' + i, konfi: fall === 'fremd' ? null : {value: 'konfi'}}},
    };
  });
  return {buyerJourney: {step: schritt}, presentmentCurrencyRate: wahl(['1.0', '1.0', '1.0', '0.93', '1.17']), shop: {schluessel: {value: schluessel}, localTime: {date: wahl(['2026-11-17', '2000-01-01', '2100-02-29'])}}, cart: {lines}};
}

