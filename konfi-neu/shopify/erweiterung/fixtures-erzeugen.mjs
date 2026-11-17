#!/usr/bin/env node
// Schreibt Prüffälle für die Rust-Erweiterungen: Eingaben und die Ergebnisse der JavaScript-Referenz.
// `cargo test` in den Erweiterungen vergleicht dagegen.   node shopify/erweiterung/fixtures-erzeugen.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {warenkorb, wahl} from '../funktion/zufall.mjs';
import {preisLauf, pruefLauf} from '../funktion/logik.mjs';

const ziel = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const preis = [], pruefung = [];
for (let i = 0; i < 150; i++) {
  const eingabe = warenkorb(wahl(['CART_INTERACTION', 'CHECKOUT_INTERACTION', 'CHECKOUT_COMPLETION']));
  preis.push({eingabe, erwartet: preisLauf(eingabe).operations.map(o => ({id: o.lineUpdate.cartLineId, amount: o.lineUpdate.price.adjustment.fixedPricePerUnit.amount}))});
  pruefung.push({eingabe, erwartet: pruefLauf(eingabe).operations[0].validationAdd.errors.map(e => e.message)});
}
fs.writeFileSync(path.join(ziel, 'preis.json'), JSON.stringify(preis));
fs.writeFileSync(path.join(ziel, 'pruefung.json'), JSON.stringify(pruefung));
console.log(JSON.stringify({faelle: preis.length, zeilen: preis.reduce((s, f) => s + f.eingabe.cart.lines.length, 0), preisaenderungen: preis.reduce((s, f) => s + f.erwartet.length, 0), sperren: pruefung.reduce((s, f) => s + f.erwartet.length, 0)}));
