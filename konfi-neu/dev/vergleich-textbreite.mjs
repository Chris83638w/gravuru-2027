// Vergleicht je Schrift die Textbreite im Browser (WOFF2, so sieht es der Kunde) mit der Fertigung (HarfBuzz,
// Originalschrift). Ausgabe: größte Abweichung je Schrift bei 10 mm Schriftgröße.
// Voraussetzung: Server läuft (node server/server.mjs --dev).   node dev/vergleich-textbreite.mjs [basis]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {schriftSatz} from '../server/fertigung.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const wurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const basis = process.argv[2] || 'http://127.0.0.1:8970';
const stand = JSON.parse(fs.readFileSync(path.join(wurzel, 'dist/daten/stand.json'), 'utf8'));
const satz = schriftSatz(path.join(wurzel, 'dist/fertigung/schriften'));
const TEXTE = ['Familie Müller', 'Thorsten & Marion', 'Özdemir-Schäfer', 'Hausnummer 12a', 'Weg zum Wald 7', 'Törtchen AVATAR Yvonne'];
const GROESSE = 10;
// Jeder Text einmal normal und einmal gesperrt (Zeichenabstand in mm), wie ihn viele Designs für Straßennamen nutzen.
const ABSTAENDE = [0, 1.2];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(basis + '/testshop/');
const imBrowser = await page.evaluate(async ({schriften, texte, groesse, basis, abstaende}) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.append(svg);
  const ergebnis = {};
  for (const [name, s] of Object.entries(schriften)) {
    const familie = 'gk-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const face = new FontFace(familie, `url(${basis}/daten/${s.u})`);
    await face.load(); document.fonts.add(face);
    ergebnis[name] = abstaende.flatMap(abstand => texte.map(t => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      el.setAttribute('font-family', familie); el.setAttribute('font-size', groesse);
      if (abstand) el.setAttribute('letter-spacing', abstand);
      el.setAttribute('style', 'font-kerning:none;font-variant-ligatures:none;font-feature-settings:"kern" 0,"liga" 0,"clig" 0,"calt" 0;white-space:pre');
      el.textContent = t; svg.append(el);
      const w = el.getComputedTextLength(); el.remove(); return w;
    }));
  }
  return ergebnis;
}, {schriften: stand.schriften, texte: TEXTE, groesse: GROESSE, basis, abstaende: ABSTAENDE});
await browser.close();

const zeilen = [];
for (const [name, breiten] of Object.entries(imBrowser)) {
  const faelle = ABSTAENDE.flatMap(abstand => TEXTE.map(text => ({text, abstand})));
  const abweichungen = faelle.map((f, i) => satz.zeile(name, f.text, GROESSE, f.abstand).breite - breiten[i]);
  const groesste = abweichungen.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0);
  const fall = faelle[abweichungen.indexOf(groesste)] || faelle[0];
  zeilen.push({name, mm: Number(groesste.toFixed(3)), prozent: Number((100 * groesste / breiten[Math.max(0, abweichungen.indexOf(groesste))]).toFixed(2)), text: fall.text, abstand: fall.abstand});
}
zeilen.sort((a, b) => Math.abs(b.mm) - Math.abs(a.mm));
const ueber = zeilen.filter(z => Math.abs(z.mm) > 0.05);
console.log(JSON.stringify({schriften: zeilen.length, schriftgroesseMm: GROESSE, abstaendeMm: ABSTAENDE, gleichBis005mm: zeilen.length - ueber.length, abweichend: ueber.length, groessteAbweichungen: zeilen.slice(0, 12)}, null, 1));
fs.writeFileSync(path.join(wurzel, 'dist', 'textbreiten-vergleich.json'), JSON.stringify(zeilen, null, 1));
