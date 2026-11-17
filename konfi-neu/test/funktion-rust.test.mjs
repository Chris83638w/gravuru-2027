// Vergleicht die Rust-Funktion mit der JavaScript-Referenz (shopify/funktion/logik.mjs) über viele Warenkörbe.
// Vorher bauen: (cd shopify/funktion/rust && cargo build --release). Ohne gebautes Programm wird der Test übersprungen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preisLauf, pruefLauf} from '../shopify/funktion/logik.mjs';
import {unterschreiben} from '../core/signatur.mjs';

const ziel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'shopify', 'funktion', 'rust', 'target', 'release');
const gebaut = fs.existsSync(path.join(ziel, 'preis')) && fs.existsSync(path.join(ziel, 'pruefung'));
const rust = (programm, eingabe) => JSON.parse(spawnSync(path.join(ziel, programm), {input: JSON.stringify(eingabe), encoding: 'utf8'}).stdout);

// Fester Zufall, damit ein Fehlschlag wiederholbar ist.
let saat = 20261117;
const zufall = () => { saat = (saat * 1664525 + 1013904223) >>> 0; return saat / 4294967296; };
const wahl = liste => liste[Math.floor(zufall() * liste.length)];

function warenkorb(schritt) {
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
  return {buyerJourney: {step: schritt}, shop: {schluessel: {value: schluessel}, localTime: {date: wahl(['2026-11-17', '2000-01-01', '2100-02-29'])}}, cart: {lines}};
}

test('Rust-Funktion rechnet wie die JavaScript-Referenz (400 Warenkörbe)', {skip: !gebaut && 'Rust-Programm nicht gebaut'}, () => {
  let positionen = 0;
  for (let i = 0; i < 200; i++) {
    const eingabe = warenkorb(wahl(['CART_INTERACTION', 'CHECKOUT_INTERACTION', 'CHECKOUT_COMPLETION']));
    positionen += eingabe.cart.lines.length;
    assert.deepEqual(rust('preis', eingabe), preisLauf(eingabe), 'Preis, Warenkorb ' + i);
    assert.deepEqual(rust('pruefung', eingabe), pruefLauf(eingabe), 'Prüfung, Warenkorb ' + i);
  }
  assert.ok(positionen > 800);
});
