// Fehler 20.10.2026: Am Handy fehlte bei Standardschildern (Edelstahl u. a., nicht Acryl) die Platte,
// weil der Rahmen um die Bühne (.stage-wrap) keine Höhe bekam; Werkzeuge und Bildunterschrift
// überdeckten hohe Formate. Sichtprüfung: Playwright 390×844, 9×3, 30×30, 8×2, Oval 15×10, Acryl.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const css=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'mobile.css'),'utf8');
test('Handy: Bühnenrahmen füllt die Vorschau',()=>{
  assert.match(css,/\[data-ux-mobile="true"\]\) \.ux-preview \.stage-wrap\{height:100%;width:100%/);
});
test('Handy: Werkzeuge rechts, Bildunterschrift aus, einzeilige Felder ohne Umbruch',()=>{
  assert.match(css,/\.stage:not\(\.acryl-scene\) > \.ux-preview-tools\{position:absolute!important;left:auto!important;right:6px!important/);
  assert.match(css,/\.stage:not\(\.acryl-scene\) > \.ux-preview-caption\{display:none!important\}/);
  assert.match(css,/textarea\[data-ux-text\]:not\(\[data-ux-multiline\]\)\{white-space:pre/);
});
