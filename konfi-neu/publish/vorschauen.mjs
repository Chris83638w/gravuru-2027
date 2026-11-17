#!/usr/bin/env node
// Vorschaubilder der Designs für die Designauswahl (kleine WebP-Dateien).
//
//   node publish/vorschauen.mjs [--out dist/daten] [--breite 360] [--grenze n] [--neu] [--neu-vor <Zeitpunkt>]
//
// Gezeichnet wird mit demselben Code wie im Editor (core/zeichnen.mjs), in einem unsichtbaren
// Browser. Der Dateiname hängt am Inhalts-Hash des Designs: d/<name>.<hash>.json → v/<name>.<hash>.webp.
// Schon vorhandene Bilder werden übersprungen, verwaiste entfernt. Nach einer Änderung am Zeichencode (der Hash
// des Designs bleibt dann gleich) zeichnet --neu alle Bilder neu und überschreibt sie; --neu-vor nur die, die
// älter sind als der Zeitpunkt (z. B. 2026-11-17T10:00:00Z), um einen abgebrochenen Lauf fortzusetzen. Läuft nur beim Veröffentlichen,
// nie auf dem Kundenweg.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.join(here, '..');
const arg = name => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : undefined; };
const out = path.resolve(arg('out') || path.join(wurzel, 'dist', 'daten'));
const breite = Number(arg('breite') || 360);
const grenze = Number(arg('grenze') || Infinity);
const allesNeu = process.argv.includes('--neu');
const neuVor = arg('neu-vor') ? Date.parse(arg('neu-vor')) : null;
if (arg('neu-vor') && !Number.isFinite(neuVor)) { console.error('--neu-vor: Zeitpunkt nicht lesbar'); process.exit(1); }
const started = Date.now();

const stand = JSON.parse(fs.readFileSync(path.join(out, 'stand.json'), 'utf8'));
const familien = {};
for (const [id, f] of Object.entries(stand.familien)) familien[id] = JSON.parse(fs.readFileSync(path.join(out, f.u), 'utf8'));
// Ein Bild je Design UND Material: Dasselbe Design sieht auf Edelstahl anders aus als auf schwarzem Acryl.
// Aufträge kommen aus der Designauswahl der Familien (g/<familie>/<größe>.json).
const auftraege = new Map(); // "<material>/<datei>.webp" → {file, familie, groesse, ein}
for (const familie of Object.values(familien)) {
  for (const [groesse, adresse] of Object.entries(familie.galerie || {})) {
    for (const d of JSON.parse(fs.readFileSync(path.join(out, adresse), 'utf8')).designs) {
      const file = path.basename(d.u);
      const ziel = `${familie.material.k}/${file.replace(/\.json$/, '.webp')}`;
      if (!familie.groessen.some(g => g.k === groesse.split('|')[0])) continue; // Größe ohne Preis ist nicht veröffentlicht
      if (!auftraege.has(ziel)) auftraege.set(ziel, {file, familie: familie.id, groesse, ein: d.ein ? 1 : 0});
    }
  }
}
fs.mkdirSync(path.join(out, 'v'), {recursive: true});
let entfernt = 0;
for (const eintrag of fs.readdirSync(path.join(out, 'v'), {recursive: true, withFileTypes: true})) {
  if (!eintrag.isFile()) continue;
  const relativ = path.relative(path.join(out, 'v'), path.join(eintrag.parentPath, eintrag.name)).split(path.sep).join('/');
  if (!auftraege.has(relativ)) { fs.rmSync(path.join(eintrag.parentPath, eintrag.name)); entfernt++; }
}
const designs = [...auftraege.keys()];
const veraltet = ziel => { const datei = path.join(out, 'v', ziel); return !fs.existsSync(datei) || (neuVor !== null && fs.statSync(datei).mtimeMs < neuVor); };
const offen = designs.filter(ziel => allesNeu || veraltet(ziel)).slice(0, grenze);

// Kleiner Dateiserver nur für diesen Lauf: liefert core/ und die veröffentlichten Daten an den Browser.
const typen = {'.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.html': 'text/html'};
const server = http.createServer((req, res) => {
  const pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pfad === '/') { res.writeHead(200, {'content-type': 'text/html'}); res.end('<!doctype html><meta charset="utf-8"><canvas id="c"></canvas>'); return; }
  const datei = pfad.startsWith('/daten/') ? path.join(out, pfad.slice(7)) : path.join(wurzel, pfad);
  if (!datei.startsWith(wurzel) && !datei.startsWith(out)) { res.writeHead(403); res.end(); return; }
  fs.readFile(datei, (error, data) => { if (error) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': typen[path.extname(datei)] || 'application/octet-stream'}); res.end(data); } });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const basis = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const SEITE = `
  import {gestaltungSvg, schriftFamilie} from '/core/zeichnen.mjs';
  import {elementeAusDesign} from '/core/modell.mjs';
  const schriftCss = new Map();
  const bilder = new Map();
  const dataUrl = async adresse => { if (!bilder.has(adresse)) bilder.set(adresse, fetch(adresse).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }))); return bilder.get(adresse); };
  window.zeichne = async ({design, familie, schriften, breite}) => {
    const [groesseKey, position] = String(design.bsp?.g || '').split('|');
    const groesse = familie.groessen.find(g => g.k === groesseKey) || familie.groessen.find(g => Math.abs(g.w / g.h - design.platte[0] / design.platte[1]) < 0.02) || familie.groessen[0];
    const css = [];
    for (const name of design.schriften) {
      if (!schriftCss.has(name)) schriftCss.set(name, dataUrl('/daten/' + schriften[name].u).then(url => '@font-face{font-family:"' + schriftFamilie(name) + '";src:url(' + url + ')}'));
      css.push(await schriftCss.get(name));
    }
    const material = {...familie.material};
    if (material.textur) material.textur = await dataUrl('/daten/' + material.textur);
    delete material.schraube;
    if (material.stahl?.textur) material.stahl = {...material.stahl, textur: await dataUrl('/daten/' + material.stahl.textur)};
    const geraet = familie.geraet?.bild ? {...familie.geraet, bild: await dataUrl('/daten/' + familie.geraet.bild)} : familie.geraet;
    familie = {...familie, geraet};
    const opt = familie.optionen ? Object.fromEntries(familie.optionen.map(o => [o.k, o.k === 'position' && position ? position : o.k === 'rahmen' && design.rahmen ? design.rahmen : o.werte[0].k])) : undefined;
    const zustand = {groesse: groesse.k, bef: groesse.bef[0].id, opt, els: elementeAusDesign(design, groesse, Boolean(design.bsp?.ein))};
    const svg = gestaltungSvg(zustand, {...familie, material}, {schriftCss: css.join(''), breite, rand: 0.04});
    const bild = new Image();
    bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await bild.decode();
    const canvas = document.getElementById('c');
    canvas.width = bild.naturalWidth; canvas.height = bild.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bild, 0, 0);
    return canvas.toDataURL('image/webp', 0.8).split(',')[1];
  };
  window.bereit = true;
`;
// Eine frische Seite; stürzt sie ab (z. B. bei knappem Speicher), wird sie ersetzt und der Lauf geht weiter.
async function neueSeite() {
  const seite = await browser.newPage();
  await seite.goto(basis + '/');
  await seite.addScriptTag({type: 'module', content: SEITE});
  await seite.waitForFunction('window.bereit === true');
  return seite;
}
let page = await neueSeite();

let fertig = 0, fehler = 0, bytes = 0;
const meldungen = [];
for (const ziel of offen) {
  const auftrag = auftraege.get(ziel);
  const design = {...JSON.parse(fs.readFileSync(path.join(out, 'd', auftrag.file), 'utf8')), bsp: {g: auftrag.groesse, ein: auftrag.ein}};
  const familie = familien[auftrag.familie];
  try {
    const base64 = await page.evaluate(job => window.zeichne(job), {design, familie: {...familie, galerie: undefined}, schriften: stand.schriften, breite});
    const data = Buffer.from(base64, 'base64');
    fs.mkdirSync(path.dirname(path.join(out, 'v', ziel)), {recursive: true});
    fs.writeFileSync(path.join(out, 'v', ziel), data);
    bytes += data.length; fertig++;
  } catch (error) {
    fehler++;
    if (/crash|closed/i.test(String(error.message))) { try { await page.close(); } catch {} page = await neueSeite(); }
    if (meldungen.length < 10) meldungen.push(design.id + ': ' + String(error.message).slice(0, 120));
  }
  if ((fertig + fehler) % 1000 === 0) console.log(`… ${fertig + fehler}/${offen.length}`);
}
await browser.close();
server.close();
console.log(JSON.stringify({designs: designs.length, neu: fertig, fehler, entfernt, mittelBytes: fertig ? Math.round(bytes / fertig) : 0, sekunden: Math.round((Date.now() - started) / 1000), meldungen}));
