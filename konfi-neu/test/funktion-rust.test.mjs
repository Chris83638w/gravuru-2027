// Vergleicht die Rust-Funktion mit der JavaScript-Referenz (shopify/funktion/logik.mjs) über viele Warenkörbe.
// Vorher bauen: (cd shopify/funktion/rust && cargo build --release). Ohne gebautes Programm wird der Test übersprungen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preisLauf, pruefLauf} from '../shopify/funktion/logik.mjs';
import {warenkorb, wahl} from '../shopify/funktion/zufall.mjs';

const ziel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'shopify', 'funktion', 'rust', 'target', 'release');
const gebaut = fs.existsSync(path.join(ziel, 'preis')) && fs.existsSync(path.join(ziel, 'pruefung'));
const rust = (programm, eingabe) => JSON.parse(spawnSync(path.join(ziel, programm), {input: JSON.stringify(eingabe), encoding: 'utf8'}).stdout);

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
