#!/usr/bin/env node
// Kontaktbogen „neu neben alt“: Jedes veröffentlichte Design wird in jeder Größe einmal mit dem bestehenden
// Zeichencode (app/workshop, wie Konfi und Werkstatt) und einmal mit dem Neuaufbau (core/) gezeichnet und vermessen.
//
//   node dev/kontaktbogen.mjs --katalog <Katalogordner> [--out dist/kontaktbogen] [--familie a,b] [--grenze n]
//                             [--schlimmste 40] [--stichprobe 20] [--seiten 4]
//
// Gemessen wird nur die Gestaltung (Text, Motive, Linien), ohne Platte und ohne Befestigung, beschnitten auf
// die Platte wie in beiden Vorschauen:
//   kante   größte Abweichung der vier Außenkanten der Gestaltung in mm
//   daneben Anteil der Gravurfläche, der mehr als 0,5 mm neben der anderen Fassung liegt
// Fotofelder zeigt der Bestand mit Beispielfoto, der Neuaufbau als leeren Rahmen. Verglichen wird deshalb
// ihre Lage und Größe (geht in „kante“ ein), nicht ihr Bild.
// Nur lesen: Katalog und dist/daten. Geschrieben wird ausschließlich in --out.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {katalogFor} from '../../app/workshop/design-dashboard.mjs';
import {designTargets} from '../../app/workshop/design-targets.mjs';
import {targetDesignPreview} from '../../app/workshop/design-target-preview.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.join(here, '..');
const arg = name => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : undefined; };
const katalogOrdner = arg('katalog');
if (!katalogOrdner) { console.error('Aufruf: node dev/kontaktbogen.mjs --katalog <Katalogordner>'); process.exit(1); }
const root = path.resolve(katalogOrdner);
const daten = path.join(wurzel, 'dist', 'daten');
const out = path.resolve(arg('out') || path.join(wurzel, 'dist', 'kontaktbogen'));
const grenze = Number(arg('grenze') || Infinity);
const schlimmste = Number(arg('schlimmste') || 40);
const stichprobe = Number(arg('stichprobe') || 20);
const seitenZahl = Number(arg('seiten') || 4);
const nurFamilien = arg('familie') ? new Set(arg('familie').split(',')) : null;
const started = Date.now();

// Grenzen der Einstufung. „gleich“ heißt: mit bloßem Auge und an der Maschine kein Unterschied zu erwarten.
export const STUFEN = {gleich: {kante: 0.5, daneben: 0.01}, klein: {kante: 1.5, daneben: 0.08}};
const stufe = m => m.leer ? 'leer' : m.kante <= STUFEN.gleich.kante && m.daneben <= STUFEN.gleich.daneben ? 'gleich'
  : m.kante <= STUFEN.klein.kante && m.daneben <= STUFEN.klein.daneben ? 'klein' : 'abweichung';

const stand = JSON.parse(fs.readFileSync(path.join(daten, 'stand.json'), 'utf8'));
const katalog = katalogFor(root, {maxAgeMs: 0});
const lesen = adresse => JSON.parse(fs.readFileSync(path.join(daten, adresse), 'utf8'));

// Aufträge: jedes Paar Design × Größe aus der Designauswahl der Platten-Familien.
const auftraege = [];
const familien = {};
for (const [id, f] of Object.entries(stand.familien)) {
  const familie = lesen(f.u);
  if (familie.art === 'klingel' || (nurFamilien && !nurFamilien.has(id))) continue;
  familien[id] = familie;
  for (const [groesse, adresse] of Object.entries(familie.galerie || {})) {
    if (!familie.groessen.some(g => g.k === groesse)) continue; // Größe ohne Preis ist nicht veröffentlicht
    for (const d of lesen(adresse).designs) auftraege.push({familie: id, groesse, id: d.id, datei: d.u, ein: d.ein ? 1 : 0});
  }
}
// Je Familie nach Design sortiert: Der bestehende Zeichner wandelt ein Design einmal um und merkt es sich
// (batchCache); so folgen alle Größen eines Designs direkt aufeinander.
auftraege.sort((a, b) => a.familie.localeCompare(b.familie) || a.id.localeCompare(b.id) || a.groesse.localeCompare(b.groesse));
if (auftraege.length > grenze) {
  // Gleichmäßig über alle Aufträge verteilt, damit auch ein kurzer Lauf jede Familie berührt.
  const schritt = auftraege.length / grenze;
  const auswahl = Array.from({length: grenze}, (_, i) => auftraege[Math.floor(i * schritt)]);
  auftraege.length = 0; auftraege.push(...auswahl);
}

// Bestehender Zeichner: wie scripts/render-vorlagen.mjs in der Kundenansicht (ohne Befestigung, wo es sie gibt).
const batchCache = new Map();
const meister = new Map();
function meisterVon(familie, id) {
  const key = familie + '|' + id;
  if (!meister.has(key)) meister.set(key, katalog.designs.masters.filter(d => d.id === id && designTargets(d, katalog).some(t => t.familie === familie)));
  return meister.get(key);
}
async function altZeichnen(auftrag) {
  const treffer = meisterVon(auftrag.familie, auftrag.id);
  if (treffer.length !== 1) return {fehler: treffer.length ? 'Design-ID im Katalog mehrfach' : 'Design im Katalog nicht gefunden'};
  const family = katalog.families.get(auftrag.familie);
  const preview = {designArea: false, ...(family.withoutMounting ? {options: {mounting: 'K00'}, mountingPlacement: true} : {})};
  try {
    const r = await targetDesignPreview(root, {reihe: treffer[0].seriesFolder, id: auftrag.id, familie: auftrag.familie, size: auftrag.groesse}, {katalog, preview, batchCache});
    return r.svg ? {svg: r.svg, status: r.fit.status, hinweise: r.fit.issues} : {fehler: r.fit.issues.at(-1) || 'keine Vorschau', status: r.fit.status};
  } catch (error) { return {fehler: String(error.message).slice(0, 200)}; }
}

// Kleiner Dateiserver nur für diesen Lauf: liefert core/ und die veröffentlichten Daten an den Browser.
const typen = {'.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png'};
const server = http.createServer((req, res) => {
  const pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pfad === '/') { res.writeHead(200, {'content-type': 'text/html'}); res.end('<!doctype html><meta charset="utf-8">'); return; }
  const datei = pfad.startsWith('/daten/') ? path.join(daten, pfad.slice(7)) : path.join(wurzel, pfad);
  if (!datei.startsWith(wurzel)) { res.writeHead(403); res.end(); return; }
  fs.readFile(datei, (error, data) => { if (error) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': typen[path.extname(datei)] || 'application/octet-stream'}); res.end(data); } });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const basis = `http://127.0.0.1:${server.address().port}`;

const SEITE = `
  import {gestaltungSvg, elementMarkup, schriftFamilie} from '/core/zeichnen.mjs';
  import {elementeAusDesign} from '/core/modell.mjs';
  const TOLERANZ_MM = 0.5;
  const cache = new Map();
  const einmal = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };
  const dataUrl = adresse => einmal('u:' + adresse, () => fetch(adresse).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); })));
  const json = adresse => einmal('j:' + adresse, () => fetch(adresse).then(r => r.json()));
  const schriftCss = (schriften, name) => einmal('s:' + name, () => dataUrl('/daten/' + schriften[name].u).then(url => '@font-face{font-family:"' + schriftFamilie(name) + '";src:url(' + url + ')}'));
  async function bildVon(svg) { const bild = new Image(); bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await bild.decode(); return bild; }

  // Nur die Gestaltung der bestehenden Vorschau: Platte, Befestigung und Hilfslinien fallen weg.
  function altNurGestaltung(altSvg, w, h, breite, hoehe, fotoIds = []) {
    const doc = new DOMParser().parseFromString(altSvg, 'image/svg+xml');
    const svg = doc.documentElement;
    for (const kind of [...svg.children]) {
      if (kind.tagName === 'defs') continue;
      if (kind.matches('[data-object]') || kind.querySelector('[data-object]')) continue;
      kind.remove();
    }
    for (const el of svg.querySelectorAll('[data-role="guide"],[data-design-area],[data-keepout]')) el.remove();
    // Der Milchglas-Effekt der Rückseitengravur ist nur Anzeige und verbreitert die Kanten.
    for (const el of svg.querySelectorAll('[data-preview-rear-engraving]')) el.removeAttribute('filter');
    const objekte = svg.querySelectorAll('[data-object]').length;
    const fotos = {};
    for (const id of fotoIds) {
      const el = [...svg.querySelectorAll('[data-object]')].find(o => o.getAttribute('data-object') === id);
      if (!el) continue;
      const t = /translate\\(\\s*(-?[\\d.e-]+)[ ,]+(-?[\\d.e-]+)/.exec(el.getAttribute('transform') || ''), r = el.querySelector('rect');
      if (t && r) fotos[id] = [Number(t[1]) + Number(r.getAttribute('x')), Number(t[2]) + Number(r.getAttribute('y')), Number(r.getAttribute('width')), Number(r.getAttribute('height'))];
      el.remove();
    }
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('width', breite); svg.setAttribute('height', hoehe);
    return {svg: new XMLSerializer().serializeToString(svg), objekte, fotos};
  }
  // Gestaltung des Neuaufbaus ohne Fotofelder, auf die Platte beschnitten wie in gestaltungSvg.
  const neuNurGestaltung = (els, groesse, css, breite, hoehe) =>
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + groesse.w + ' ' + groesse.h + '" width="' + breite + '" height="' + hoehe + '"><style>' + css + '</style>' +
    '<clipPath id="p"><path d="' + groesse.d + '"/></clipPath><g clip-path="url(#p)">' + els.filter(el => el.t !== 'foto').map(el => elementMarkup(el, '#000', 'n')).join('') + '</g></svg>';

  function maske(bild, breite, hoehe) {
    const canvas = new OffscreenCanvas(breite, hoehe);
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(bild, 0, 0, breite, hoehe);
    const rgba = ctx.getImageData(0, 0, breite, hoehe).data;
    const m = new Uint8Array(breite * hoehe);
    let x0 = breite, y0 = hoehe, x1 = -1, y1 = -1, n = 0;
    for (let y = 0, i = 0; y < hoehe; y++) for (let x = 0; x < breite; x++, i++) {
      if (rgba[i * 4 + 3] > 96) { m[i] = 1; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    return {m, n, box: n ? [x0, y0, x1 + 1, y1 + 1] : null};
  }
  // Maske um r Pixel aufweiten (getrennt waagerecht und senkrecht), nur im Ausschnitt [x0,y0,x1,y1).
  function weiten(m, breite, r, [x0, y0, x1, y1]) {
    const a = new Uint8Array(m.length), b = new Uint8Array(m.length);
    for (let y = y0; y < y1; y++) { const z = y * breite; let letzter = -1e9;
      for (let x = x0; x < x1; x++) { if (m[z + x]) letzter = x; if (x - letzter <= r) a[z + x] = 1; }
      letzter = 1e9; for (let x = x1 - 1; x >= x0; x--) { if (m[z + x]) letzter = x; if (letzter - x <= r) a[z + x] = 1; } }
    for (let x = x0; x < x1; x++) { let letzter = -1e9;
      for (let y = y0; y < y1; y++) { if (a[y * breite + x]) letzter = y; if (y - letzter <= r) b[y * breite + x] = 1; }
      letzter = 1e9; for (let y = y1 - 1; y >= y0; y--) { if (a[y * breite + x]) letzter = y; if (letzter - y <= r) b[y * breite + x] = 1; } }
    return b;
  }

  async function vorbereiten({auftrag, altSvg, schriften}) {
    const familie = await json('/daten/' + auftrag.familieDatei);
    const design = await json('/daten/' + auftrag.datei);
    const groesse = familie.groessen.find(g => g.k === auftrag.groesse);
    const css = (await Promise.all(design.schriften.map(name => schriftCss(schriften, name)))).join('');
    const els = elementeAusDesign(design, groesse, Boolean(auftrag.ein));
    return {familie, design, groesse, css, els};
  }

  window.vergleiche = async job => {
    const {design, groesse, css, els} = await vorbereiten(job);
    const {w, h} = groesse;
    // Auflösung: mindestens 3, höchstens 8 Pixel je mm; große Platten nie über 1,5 Mio. Pixel.
    let s = Math.min(8, Math.max(3, 1600 / Math.max(w, h)));
    if (w * h * s * s > 1.5e6) s = Math.sqrt(1.5e6 / (w * h));
    const breite = Math.round(w * s), hoehe = Math.round(h * s);
    const fotoEls = els.filter(el => el.t === 'foto');
    const alt = altNurGestaltung(job.altSvg, w, h, breite, hoehe, fotoEls.map(el => el.id));
    const a = maske(await bildVon(alt.svg), breite, hoehe);
    const b = maske(await bildVon(neuNurGestaltung(els, groesse, css, breite, hoehe)), breite, hoehe);
    const mess = {px: +s.toFixed(2), elemente: [alt.objekte, els.length], schriften: design.schriften};
    // Fotofelder: Lage und Größe des Feldes.
    if (fotoEls.length) {
      let fotoKante = 0, fehlt = 0;
      for (const el of fotoEls) {
        const f = alt.fotos[el.id];
        if (!f) { fehlt++; continue; }
        const n = [el.x - el.w / 2, el.y - el.h / 2, el.w, el.h];
        fotoKante = Math.max(fotoKante, Math.abs(n[0] - f[0]), Math.abs(n[1] - f[1]), Math.abs(n[0] + n[2] - f[0] - f[2]), Math.abs(n[1] + n[3] - f[1] - f[3]));
      }
      mess.foto = fotoEls.length; mess.fotoKante = +fotoKante.toFixed(2);
      if (fehlt) mess.fotoFehlt = fehlt;
    }
    if (!a.n || !b.n) {
      if (!a.n && !b.n) return {...mess, ...(fotoEls.length && !mess.fotoFehlt ? {} : {leer: 'beide'}), kante: mess.fotoKante || 0, daneben: 0};
      return {...mess, leer: !a.n ? 'alt' : 'neu', kante: mess.fotoKante || 0, daneben: 1};
    }
    const r = Math.max(1, Math.round(TOLERANZ_MM * s));
    const aus = [Math.max(0, Math.min(a.box[0], b.box[0]) - r - 1), Math.max(0, Math.min(a.box[1], b.box[1]) - r - 1), Math.min(breite, Math.max(a.box[2], b.box[2]) + r + 1), Math.min(hoehe, Math.max(a.box[3], b.box[3]) + r + 1)];
    const aw = weiten(a.m, breite, r, aus), bw = weiten(b.m, breite, r, aus);
    let daneben = 0;
    for (let y = aus[1]; y < aus[3]; y++) for (let i = y * breite + aus[0], ende = y * breite + aus[2]; i < ende; i++) { if (a.m[i] && !bw[i]) daneben++; if (b.m[i] && !aw[i]) daneben++; }
    const kanten = a.box.map((v, i) => (b.box[i] - v) / s);
    return {...mess, kante: +Math.max(mess.fotoKante || 0, ...kanten.map(Math.abs)).toFixed(2), kanten: kanten.map(v => +v.toFixed(2)), daneben: +(daneben / (a.n + b.n)).toFixed(4),
      flaeche: +(b.n / a.n).toFixed(3), ...(mess.fotoFehlt ? {leer: 'fotofeld-alt'} : {})};
  };

  // Bilder für den Bogen: alt und neu so, wie sie der Kunde sieht, dazu die Überlagerung (alt rot, neu blau, deckungsgleich dunkel).
  window.bilder = async (job, zielBreite) => {
    const {familie, groesse, css, els} = await vorbereiten(job);
    const {w, h} = groesse;
    const webp = async (bild, breite, hoehe, malen) => { const c = new OffscreenCanvas(breite, hoehe); const ctx = c.getContext('2d'); malen ? malen(ctx) : ctx.drawImage(bild, 0, 0, breite, hoehe);
      const blob = await c.convertToBlob({type: 'image/webp', quality: 0.82}); return new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result.split(',')[1]); fr.readAsDataURL(blob); }); };
    const altBild = await bildVon(job.altSvg.replace('<svg ', '<svg width="' + zielBreite + '" '));
    const material = {...familie.material};
    if (material.textur) material.textur = await dataUrl('/daten/' + material.textur);
    delete material.schraube;
    const opt = familie.optionen ? Object.fromEntries(familie.optionen.map(o => [o.k, o.werte[0].k])) : undefined;
    const neuBild = await bildVon(gestaltungSvg({groesse: groesse.k, bef: groesse.bef[0].id, opt, els}, {...familie, material}, {schriftCss: css, breite: zielBreite, rand: 0.05}));
    const breite = zielBreite, hoehe = Math.round(zielBreite * h / w);
    const alt = altNurGestaltung(job.altSvg, w, h, breite, hoehe, els.filter(el => el.t === 'foto').map(el => el.id));
    const a = maske(await bildVon(alt.svg), breite, hoehe), b = maske(await bildVon(neuNurGestaltung(els, groesse, css, breite, hoehe)), breite, hoehe);
    const ueber = await webp(null, breite, hoehe, ctx => {
      const bild = ctx.createImageData(breite, hoehe);
      for (let i = 0; i < a.m.length; i++) { const f = a.m[i] && b.m[i] ? [40, 40, 40] : a.m[i] ? [220, 38, 38] : b.m[i] ? [37, 99, 235] : [255, 255, 255]; bild.data.set([...f, 255], i * 4); }
      ctx.putImageData(bild, 0, 0);
    });
    return {alt: await webp(altBild, altBild.naturalWidth, altBild.naturalHeight), neu: await webp(neuBild, neuBild.naturalWidth, neuBild.naturalHeight), ueber};
  };
  window.bereit = true;
`;

const browser = await chromium.launch();
const seiten = [];
for (let i = 0; i < seitenZahl; i++) {
  const page = await browser.newPage();
  await page.goto(basis + '/');
  await page.addScriptTag({type: 'module', content: SEITE});
  await page.waitForFunction('window.bereit === true');
  seiten.push(page);
}

// Messlauf: Der bestehende Zeichner läuft in diesem Prozess, gemessen wird in mehreren Browserseiten.
const ergebnisse = new Array(auftraege.length);
let naechster = 0, erledigt = 0;
async function arbeiter(page) {
  for (;;) {
    const i = naechster++;
    if (i >= auftraege.length) return;
    const auftrag = auftraege[i];
    const alt = await altZeichnen(auftrag);
    let mess;
    if (alt.fehler) mess = {fehler: 'alt: ' + alt.fehler};
    else {
      try { mess = await page.evaluate(job => window.vergleiche(job), {auftrag: {...auftrag, familieDatei: stand.familien[auftrag.familie].u}, altSvg: alt.svg, schriften: stand.schriften}); }
      catch (error) { mess = {fehler: 'neu: ' + String(error.message).split('\n')[0].slice(0, 200)}; }
    }
    ergebnisse[i] = {...auftrag, altStatus: alt.status || null, ...mess, stufe: mess.fehler ? 'fehler' : stufe(mess)};
    if (++erledigt % 2000 === 0) console.log(`… ${erledigt}/${auftraege.length} (${Math.round((Date.now() - started) / 1000)} s)`);
  }
}
await Promise.all(seiten.map(arbeiter));

// Auswertung
const zaehlen = liste => liste.reduce((a, r) => (a[r.stufe] = (a[r.stufe] || 0) + 1, a), {});
const quantil = (werte, q) => werte.length ? werte[Math.min(werte.length - 1, Math.floor(q * werte.length))] : null;
const kennzahlen = liste => {
  const gemessen = liste.filter(r => !r.fehler && !r.leer);
  const kante = gemessen.map(r => r.kante).sort((a, b) => a - b), daneben = gemessen.map(r => r.daneben).sort((a, b) => a - b);
  return {paare: liste.length, stufen: zaehlen(liste), kanteMm: {median: quantil(kante, 0.5), p95: quantil(kante, 0.95), max: kante.at(-1) ?? null},
    daneben: {median: quantil(daneben, 0.5), p95: quantil(daneben, 0.95), max: daneben.at(-1) ?? null}};
};
const jeFamilie = {};
for (const id of Object.keys(familien)) jeFamilie[id] = kennzahlen(ergebnisse.filter(r => r.familie === id));
// Je Schrift: Wo eine Schrift auffällt, liegt es meist an der Schrift, nicht am Design.
const jeSchrift = {};
for (const r of ergebnisse) for (const name of r.schriften || []) {
  const s = jeSchrift[name] ||= {paare: 0, gleich: 0, klein: 0, abweichung: 0, groessteKante: 0};
  s.paare++; if (s[r.stufe] !== undefined) s[r.stufe]++; s.groessteKante = Math.max(s.groessteKante, r.kante || 0);
}
const schwere = r => r.stufe === 'fehler' ? 1e6 : r.leer ? 1e5 : Math.max(r.kante / STUFEN.gleich.kante, r.daneben / STUFEN.gleich.daneben);
const zusammenfassung = {
  erzeugt: new Date().toISOString(), stand: stand.stand, katalog: path.basename(root), grenzen: STUFEN, toleranzMm: 0.5,
  gesamt: kennzahlen(ergebnisse), jeFamilie,
  jeSchrift: Object.fromEntries(Object.entries(jeSchrift).sort((a, b) => (b[1].abweichung / b[1].paare) - (a[1].abweichung / a[1].paare))),
  fehler: ergebnisse.filter(r => r.fehler).reduce((a, r) => (a[r.fehler] = (a[r.fehler] || 0) + 1, a), {}),
  sekunden: Math.round((Date.now() - started) / 1000),
};
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'zusammenfassung.json'), JSON.stringify(zusammenfassung, null, 1) + '\n');
fs.writeFileSync(path.join(out, 'messwerte.jsonl'), ergebnisse.map(r => JSON.stringify(r)).join('\n') + '\n');

// Bogen je Familie: die größten Abweichungen und eine feste Stichprobe, jeweils alt | neu | Überlagerung.
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const farbe = {gleich: '#2e7d32', klein: '#e08a00', abweichung: '#c62828', fehler: '#c62828', leer: '#c62828'};
const prozent = v => (v * 100).toFixed(1).replace('.', ',') + ' %';
const mm = v => String(v).replace('.', ',') + ' mm';
const karten = {};
const bildAuftraege = [];
for (const id of Object.keys(familien)) {
  const liste = ergebnisse.filter(r => r.familie === id);
  const schlimm = liste.filter(r => r.stufe !== 'gleich').sort((a, b) => schwere(b) - schwere(a)).slice(0, schlimmste);
  const rest = liste.filter(r => !schlimm.includes(r) && !r.fehler);
  const probe = Array.from({length: Math.min(stichprobe, rest.length)}, (_, i) => rest[Math.floor(i * rest.length / Math.min(stichprobe, rest.length))]);
  karten[id] = {schlimm, probe};
  for (const r of [...schlimm, ...probe]) if (!r.fehler) bildAuftraege.push(r);
}
let bildNr = 0, bildFertig = 0;
async function bildArbeiter(page) {
  for (;;) {
    const r = bildAuftraege[bildNr++];
    if (!r) return;
    const alt = await altZeichnen(r);
    if (alt.fehler) continue;
    try {
      const b = await page.evaluate(([job, breite]) => window.bilder(job, breite), [{auftrag: {...r, familieDatei: stand.familien[r.familie].u}, altSvg: alt.svg, schriften: stand.schriften}, 420]);
      const name = (r.groesse + '__' + r.id).replace(/[^\w.-]+/g, '_');
      const ordner = path.join(out, r.familie);
      fs.mkdirSync(ordner, {recursive: true});
      for (const art of ['alt', 'neu', 'ueber']) fs.writeFileSync(path.join(ordner, `${name}.${art}.webp`), Buffer.from(b[art], 'base64'));
      r.bild = name; bildFertig++;
    } catch (error) { r.bildFehler = String(error.message).split('\n')[0].slice(0, 160); }
  }
}
await Promise.all(seiten.map(bildArbeiter));
await browser.close();
server.close();

const stil = 'body{font:13px system-ui,sans-serif;margin:24px;background:#fff;color:#222}h1{font-size:19px;margin:0 0 4px}h2{font-size:15px;margin:26px 0 8px}p{margin:0 0 10px;color:#555;max-width:900px}' +
  'main{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}figure{margin:0;border:1px solid #ddd;border-radius:6px;padding:8px}.reihe{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;align-items:center}' +
  '.reihe div{background:#f2f2f2;text-align:center}.reihe img{max-width:100%;max-height:220px;display:block;margin:auto}.reihe small{display:block;color:#777;padding:2px}' +
  'figcaption{margin-top:6px}figcaption i{font-style:normal;color:#fff;border-radius:3px;padding:1px 6px;margin-left:6px}table{border-collapse:collapse;margin:8px 0 14px}td,th{border:1px solid #ddd;padding:3px 8px;text-align:right}th:first-child,td:first-child{text-align:left}';
const karte = r => `<figure><div class="reihe">${r.bild ? ['alt', 'neu', 'ueber'].map((art, i) => `<div><img loading="lazy" src="${esc(r.familie + '/' + r.bild + '.' + art + '.webp')}"><small>${['bisher', 'neu', 'Überlagerung'][i]}</small></div>`).join('') : `<div>${esc(r.fehler || r.bildFehler || 'kein Bild')}</div>`}</div>` +
  `<figcaption><b>${esc(r.id)}</b> · ${esc(r.groesse)}<i style="background:${farbe[r.stufe]}">${esc(r.stufe)}</i><br>` +
  (r.fehler ? esc(r.fehler) : `Kante ${mm(r.kante)} · daneben ${prozent(r.daneben)}${r.leer ? ' · leer: ' + esc(r.leer) : ''} · ${esc((r.schriften || []).join(', '))}${r.ein ? ' · eingepasst' : ''}${r.foto ? ' · Fotofeld ' + mm(r.fotoKante) : ''}`) + '</figcaption></figure>';
const tabelle = k => `<table><tr><th>Paare</th><th>gleich</th><th>klein</th><th>Abweichung</th><th>leer</th><th>Fehler</th><th>Kante Median</th><th>Kante 95 %</th><th>Kante größte</th></tr>` +
  `<tr><td>${k.paare}</td><td>${k.stufen.gleich || 0}</td><td>${k.stufen.klein || 0}</td><td>${k.stufen.abweichung || 0}</td><td>${k.stufen.leer || 0}</td><td>${k.stufen.fehler || 0}</td><td>${mm(k.kanteMm.median)}</td><td>${mm(k.kanteMm.p95)}</td><td>${mm(k.kanteMm.max)}</td></tr></table>`;
const erklaerung = `<p>„Kante“: größte Abweichung der Außenkanten der Gestaltung. „daneben“: Anteil der Gravurfläche, der mehr als 0,5 mm neben der anderen Fassung liegt. ` +
  `gleich = Kante ≤ ${mm(STUFEN.gleich.kante)} und daneben ≤ ${prozent(STUFEN.gleich.daneben)}; klein = Kante ≤ ${mm(STUFEN.klein.kante)} und daneben ≤ ${prozent(STUFEN.klein.daneben)}. Überlagerung: rot = nur bisher, blau = nur neu, dunkel = deckungsgleich.</p>`;
for (const [id, {schlimm, probe}] of Object.entries(karten)) {
  fs.writeFileSync(path.join(out, id + '.html'), `<!doctype html><meta charset="utf-8"><title>neu neben alt · ${esc(id)}</title><style>${stil}</style><h1>neu neben alt · ${esc(familien[id].name || id)}</h1>${erklaerung}${tabelle(jeFamilie[id])}` +
    `<h2>Größte Abweichungen (${schlimm.length})</h2><main>${schlimm.map(karte).join('')}</main><h2>Stichprobe (${probe.length})</h2><main>${probe.map(karte).join('')}</main>`);
}
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>neu neben alt</title><style>${stil}</style><h1>Kontaktbogen: neu neben alt</h1>${erklaerung}<h2>Alle Familien</h2>${tabelle(zusammenfassung.gesamt)}` +
  Object.keys(familien).map(id => `<h2><a href="${esc(id)}.html">${esc(familien[id].name || id)}</a></h2>${tabelle(jeFamilie[id])}`).join(''));
console.log(JSON.stringify({paare: ergebnisse.length, stufen: zusammenfassung.gesamt.stufen, kanteMm: zusammenfassung.gesamt.kanteMm, bilder: bildFertig, sekunden: Math.round((Date.now() - started) / 1000), out}));
