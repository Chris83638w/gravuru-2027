#!/usr/bin/env node
// Veröffentlichen: Katalog → kleine, unveränderliche Dateien für den Kunden-Konfigurator.
//
//   node publish/publish.mjs --katalog <Katalogordner> [--out dist/daten] [--familie a,b] [--grenze n]
//
// Was entsteht (alles unter --out):
//   s/<schrift>.<hash>.woff2      Schriften, dauerhaft zwischenspeicherbar
//   m/<hash>.svg                  Motive der Bibliothek
//   d/<design>.<hash>.json        ein Design (Texte, Motive, Fotofelder) in mm
//   g/<familie>/<größe>.<hash>.json  Designauswahl je Größe
//   f/<familie>.<hash>.json       Familie: Formen, Größen, Preise, Befestigungen, Bohrbilder
//   p/<produkt>.json              Einstieg je Shop-Produkt: Familie + Startdesign in EINER Datei
//   stand.json                    Inhaltsverzeichnis mit Zählern und Prüfhinweisen
//
// Regeln: liest nur, schreibt nur nach --out. Erfindet keine Werte: Was im Katalog offen ist,
// wird nicht veröffentlicht und steht mit Grund in stand.json unter "hinweise".
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as katalogAdapter from './katalog-adapter.mjs';
import {kompaktPfad} from '../core/pfad.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
if (!args.katalog) {
  console.error('Aufruf: node publish/publish.mjs --katalog <Katalogordner> [--out dist/daten] [--familie a,b] [--grenze n]');
  process.exit(1);
}
const root = path.resolve(args.katalog);
const out = path.resolve(args.out || path.join(here, '..', 'dist', 'daten'));
const onlyFamilies = args.familie ? new Set(args.familie.split(',')) : null;
const limit = args.grenze ? Number(args.grenze) : Infinity;
const hinweise = [];
const started = Date.now();
const regelQuelle = JSON.parse(fs.readFileSync(path.join(here, 'regeln.json'), 'utf8'));

const hash = data => createHash('sha256').update(data).digest('hex').slice(0, 12);
const slug = value => String(value).normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'x';
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

function writeHashed(dir, name, ext, content) {
  const data = typeof content === 'string' ? content : JSON.stringify(content);
  const file = `${name}.${hash(data)}.${ext}`;
  fs.mkdirSync(path.join(out, dir), {recursive: true});
  fs.writeFileSync(path.join(out, dir, file), data);
  return `${dir}/${file}`;
}

fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(out, {recursive: true});
const katalog = katalogAdapter.katalogOeffnen(root);

// ---------------------------------------------------------------- Schriften
const fontList = JSON.parse(fs.readFileSync(path.join(root, 'schriften', 'schriften.json'), 'utf8')).fonts;
const fontJob = {out: path.join(out, 's'), fonts: []};
for (const font of fontList) {
  const file = font.file && path.join(root, font.file);
  if (!file || !fs.existsSync(file)) {
    hinweise.push({art: 'schrift', name: font.name, grund: 'Schriftdatei fehlt im Katalog'});
    continue;
  }
  fontJob.fonts.push({name: font.name, file, ofl: /Open Font License/i.test(font.license || '') && fs.existsSync(path.join(path.dirname(file), 'OFL.txt'))});
}
const fontRun = spawnSync('python3', [path.join(here, 'schriften.py')], {input: JSON.stringify(fontJob), encoding: 'utf8', maxBuffer: 64e6});
if (fontRun.status !== 0) throw new Error('Schriften: ' + fontRun.stderr);
const fontResult = JSON.parse(fontRun.stdout);
for (const error of fontResult.errors) hinweise.push({art: 'schrift', name: error.name, grund: error.error});
/** Name der Schrift → {u: Adresse, a/d/c: Ober-, Unterlänge, Versalhöhe als Anteil der Schriftgröße} */
const schriften = {};
for (const font of fontResult.fonts) {
  schriften[font.name] = {
    u: 's/' + font.file,
    a: round(font.ascender / font.unitsPerEm, 4),
    d: round(font.descender / font.unitsPerEm, 4),
    c: font.capHeight ? round(font.capHeight / font.unitsPerEm, 4) : null,
  };
}

// ---------------------------------------------------------------- Motive
const motive = [];
for (const motif of katalog.motifs.list) {
  if (!fs.existsSync(motif.file)) { hinweise.push({art: 'motiv', name: motif.name, grund: 'Datei fehlt'}); continue; }
  const svg = fs.readFileSync(motif.file, 'utf8').replace(/>\s+</g, '><').trim();
  motive.push({k: motif.key, n: motif.name, c: motif.category, u: writeHashed('m', slug(motif.name), 'svg', svg)});
}
const motivIndex = writeHashed('m', 'index', 'json', {motive});

// ---------------------------------------------------------------- Designs
const designCache = new Map();
function designVeroeffentlichen(design) {
  if (designCache.has(design.id)) return designCache.get(design.id);
  let entry = null;
  try {
    const parsed = katalogAdapter.designEbenen(design);
    const els = [];
    const fonts = new Set();
    for (const layer of parsed.layers) {
      if (layer.kind === 'guide') continue; // Hilfsebenen sind nie Teil der Kundengestaltung
      if (layer.kind === 'text') {
        if (!schriften[layer.font]) throw new Error('Schrift nicht veröffentlicht: ' + layer.font);
        fonts.add(layer.font);
        const [x, y] = layer.rotation && layer.textTransform
          ? [layer.textTransform[0] * layer.sourceX + layer.textTransform[2] * layer.sourceY + layer.textTransform[4],
             layer.textTransform[1] * layer.sourceX + layer.textTransform[3] * layer.sourceY + layer.textTransform[5]]
          : [layer.x, layer.y];
        els.push({
          t: 'text', id: layer.id, feld: layer.fieldKey || layer.id, text: layer.text, font: layer.font,
          size: round(layer.size, 3), x: round(x, 3), y: round(y, 3),
          anker: layer.anchor === 'middle' ? 'm' : layer.anchor === 'end' ? 'e' : 's',
          ...(layer.letterSpacing ? {ls: round(layer.letterSpacing, 3)} : {}),
          ...(layer.lines > 1 ? {lh: round(layer.lineHeight, 3)} : {}),
          ...(layer.rotation ? {rot: round(layer.rotation, 2)} : {}),
        });
      } else if (layer.kind === 'foto') {
        els.push({t: 'foto', id: layer.id, box: layer.bounds.map(v => round(v, 3)), form: layer.shape,
          ...(layer.shape === 'template' ? {maske: kompaktPfad(layer.maskPath), mt: layer.maskTranslation} : {}),
          ...(layer.rotation ? {rot: round(layer.rotation, 2)} : {})});
      } else {
        els.push({
          t: 'motiv', id: layer.id, box: layer.bounds.map(v => round(v, 3)),
          ...(layer.translation[0] || layer.translation[1] ? {tr: layer.translation.map(v => round(v, 3))} : {}),
          ...(layer.rotation ? {rot: round(layer.rotation, 2)} : {}),
          p: layer.paths.map((d, index) => {
            const a = layer.pathAttributes[index] || {};
            return {
              d: kompaktPfad(d),
              ...(a.fill === 'none' ? {f: 0} : {}),
              ...(a.evenodd ? {eo: 1} : {}),
              ...(a.stroke && a.stroke !== 'none' ? {sw: round(a.strokeMm, 3), lc: a.linecap, lj: a.linejoin} : {}),
              ...(a.opacity !== undefined && a.opacity !== 1 ? {o: a.opacity} : {}),
            };
          }),
        });
      }
    }
    if (!els.length) throw new Error('keine Ebenen');
    const doc = {
      v: 1, id: design.id, name: design.name || design.id, nr: design.json?.designNo ?? null,
      platte: [parsed.widthMm, parsed.heightMm], schriften: [...fonts], els,
      ...(design.json?.wholePrintDesign ? {einheit: true} : {}),
    };
    entry = {id: design.id, name: doc.name, nr: doc.nr, platte: doc.platte, u: writeHashed('d', slug(design.id), 'json', doc), foto: els.some(e => e.t === 'foto')};
  } catch (error) {
    hinweise.push({art: 'design', id: design.id, grund: error.message});
  }
  designCache.set(design.id, entry);
  return entry;
}

// ---------------------------------------------------------------- Familien und Designauswahl
const appRoot = path.join(here, '..', '..', 'app');
const bildCache = new Map();
function bildVeroeffentlichen(file) {
  if (!file || !fs.existsSync(file)) return null;
  if (!bildCache.has(file)) {
    const data = fs.readFileSync(file);
    const name = `t/${slug(path.basename(file, path.extname(file)).replace(/\.[0-9a-f]{16}$/, ''))}.${hash(data)}${path.extname(file)}`;
    fs.mkdirSync(path.join(out, 't'), {recursive: true});
    fs.writeFileSync(path.join(out, name), data);
    bildCache.set(file, name);
  }
  return bildCache.get(file);
}
const familien = {};
for (const family of katalog.families.values()) {
  if (onlyFamilies && !onlyFamilies.has(family.id)) continue;
  const prozess = katalogAdapter.verfahren(family);
  if (!prozess) { hinweise.push({art: 'familie', id: family.id, grund: 'Verfahrensprofil offen'}); continue; }
  const rules = new Map(family.mountingRules.map(rule => [rule.id, rule]));
  const groessen = [];
  for (const size of family.sizes) {
    if (size.baseCents == null) { hinweise.push({art: 'groesse', id: size.key, grund: 'Grundpreis offen'}); continue; }
    let kontur;
    try { kontur = katalogAdapter.konturPfad(family, size); } catch (error) { hinweise.push({art: 'groesse', id: size.key, grund: 'Kontur: ' + error.message}); continue; }
    const befestigung = [];
    if (family.withoutMounting) befestigung.push({id: 'K00', n: 'Ohne Bohrung', p: 0, l: []});
    for (const ruleId of size.mounting) {
      const rule = rules.get(ruleId);
      const holes = katalogAdapter.bohrloecher(family, size, rule);
      if (rule.priceCents == null || holes === null) { hinweise.push({art: 'befestigung', id: size.key + ' · ' + ruleId, grund: 'Preis oder Bohrbild offen'}); continue; }
      befestigung.push({id: rule.skuSuffix, n: rule.label, p: rule.priceCents, l: holes.map(h => [round(h.x, 3), round(h.y, 3), h.d]), ...(rule.accessory === 'screws' ? {schraube: 1} : {})});
    }
    groessen.push({k: size.key, g: size.groupKey, n: size.label, w: size.widthMm, h: size.heightMm, p: size.baseCents, d: kompaktPfad(kontur.d), bef: befestigung});
  }

  // Designauswahl je Größe
  const designs = katalogAdapter.freigegebeneDesigns(katalog, family.id).slice(0, limit);
  const proGroesse = new Map();
  let designCount = 0;
  for (const row of katalogAdapter.groessenZuordnung(katalog, family, designs)) {
    if (row.alteGroesse || !row.sizes.length) continue;
    const entry = designVeroeffentlichen(row.design);
    if (!entry) continue;
    designCount++;
    for (const key of row.sizes) {
      if (!proGroesse.has(key)) proGroesse.set(key, []);
      proGroesse.get(key).push({id: entry.id, n: entry.name, nr: entry.nr, u: entry.u, ...(row.einpassen ? {ein: 1} : {}), ...(entry.foto ? {foto: 1} : {})});
    }
  }
  const galerie = {};
  for (const [key, list] of proGroesse) {
    list.sort((a, b) => (a.nr ?? 1e9) - (b.nr ?? 1e9) || a.id.localeCompare(b.id));
    galerie[key] = writeHashed('g/' + slug(family.id), slug(key), 'json', {designs: list});
  }

  const darstellung = katalogAdapter.materialDarstellung(family, appRoot);
  const textur = bildVeroeffentlichen(darstellung.textur);
  const schraube = bildVeroeffentlichen(darstellung.schraube);
  const doc = {
    v: 1, id: family.id, name: family.name,
    material: {art: family.material.kind, name: family.material.label, farbe: darstellung.farbe, ...(textur ? {textur} : {}), schraube, staerke: family.material.thicknessMm, ...(family.material.variant ? {variante: family.material.variant} : {}), ...(family.material.engravingSide === 'back' ? {rueckseite: 1} : {})},
    verfahren: prozess,
    formen: family.groups.map(g => ({k: g.key, n: g.name})),
    groessen,
    schriften: family.fonts.filter(name => schriften[name]),
    // Fotoregel steht nur dann hier, wenn die Familie sie im Katalog trägt.
    ...(family.photo ? {foto: {inklusive: family.photo.includedCount, preis: family.photo.extraPriceCents}} : {}),
    ...(family.quantityTiers ? {staffel: family.quantityTiers.map(t => ({ab: t.minQuantity, prozent: t.percentOff}))} : {}),
    galerie,
  };
  familien[family.id] = {u: writeHashed('f', slug(family.id), 'json', doc), doc, designs: designCount, groessen: groessen.length};
}

// ---------------------------------------------------------------- Produkte (Einstieg je Shop-Produkt)
const produkte = {};
// Kennung dieses Veröffentlichungsstands; der Server lehnt Gestaltungen aus einem fremden Stand nicht ab,
// rechnet aber immer mit dem aktuellen Stand nach.
const standKennung = hash(JSON.stringify([Object.values(familien).map(f => f.u), regelQuelle]));
for (const line of katalog.lines.values()) {
  for (const sub of line.subcategories) {
    for (const product of sub.mainProducts || []) {
      const familyId = line.families.find(id => familien[id] && familien[id].doc.groessen.some(s => (product.sizesOffered || []).includes(s.k))) || line.families.find(id => familien[id]);
      if (!familyId) { if (!onlyFamilies) hinweise.push({art: 'produkt', id: product.id, grund: 'Familie nicht veröffentlicht'}); continue; }
      const family = familien[familyId];
      const start = product.startDesign ? katalog.designs.masters.find(d => d.id === product.startDesign) : null;
      const startEntry = start ? designVeroeffentlichen(start) : null;
      if (product.startDesign && !startEntry) { hinweise.push({art: 'produkt', id: product.id, grund: 'Startdesign nicht veröffentlichbar: ' + product.startDesign}); continue; }
      const startDoc = startEntry ? JSON.parse(fs.readFileSync(path.join(out, startEntry.u), 'utf8')) : null;
      const key = slug(product.id);
      const entry = {
        v: 1, key, name: product.name, linie: line.id, thema: sub.themeId,
        // Familie und Startdesign stehen direkt in dieser Datei: ein Abruf genügt für den ersten Bildaufbau.
        familie: family.doc,
        groessen: product.sizesOffered || null,
        start: startDoc,
        // Alle Schriften stehen als Adresse bereit; geladen wird nur, was die Gestaltung benutzt.
        schriften: Object.fromEntries(Object.entries(schriften).map(([name, font]) => [name, {u: font.u}])),
        motive: motivIndex,
        regeln: {motiv: regelQuelle.motiv.cents, ...(regelQuelle.logo.aktiv ? {logo: regelQuelle.logo.cents} : {}), staffel: regelQuelle.staffel.stufen},
        stand: standKennung,
        ids: product.externalIds || {},
      };
      fs.mkdirSync(path.join(out, 'p'), {recursive: true});
      fs.writeFileSync(path.join(out, 'p', key + '.json'), JSON.stringify(entry));
      produkte[key] = {name: product.name, familie: familyId, start: product.startDesign || null, shopify: product.externalIds?.shopifyProductId || null};
    }
  }
}

// Zusätzliche Shop-Produkte, die nicht als Hauptprodukt im Katalog stehen (z. B. „Form und Größe selbst wählen“).
// Die Liste erzeugt der Shop-Abgleich aus den Metafeldern der Shopify-Produkte: --produkte <Datei>
if (args.produkte) {
  for (const product of JSON.parse(fs.readFileSync(path.resolve(args.produkte), 'utf8')).produkte) {
    const family = familien[product.familie];
    if (!family) { hinweise.push({art: 'produkt', id: product.key, grund: 'Familie nicht veröffentlicht: ' + product.familie}); continue; }
    const start = product.start ? katalog.designs.masters.find(d => d.id === product.start) : null;
    const startEntry = start ? designVeroeffentlichen(start) : null;
    if (product.start && !startEntry) { hinweise.push({art: 'produkt', id: product.key, grund: 'Startdesign nicht im Katalog: ' + product.start + ' – Produkt startet leer'}); }
    const startDoc = startEntry ? JSON.parse(fs.readFileSync(path.join(out, startEntry.u), 'utf8')) : null;
    const key = slug(product.key);
    const sizes = Array.isArray(product.groessen) ? product.groessen : null;
    // Startgröße an den Anfang, damit sie zuerst gezeigt wird
    const doc = product.startGroesse ? {...family.doc, groessen: [...family.doc.groessen].sort((a, b) => (b.k === product.startGroesse) - (a.k === product.startGroesse))} : family.doc;
    fs.mkdirSync(path.join(out, 'p'), {recursive: true});
    fs.writeFileSync(path.join(out, 'p', key + '.json'), JSON.stringify({
      v: 1, key, name: product.name, linie: product.linie || null, thema: product.thema || null, familie: doc, groessen: sizes, start: startDoc,
      schriften: Object.fromEntries(Object.entries(schriften).map(([name, font]) => [name, {u: font.u}])), motive: motivIndex,
      regeln: {motiv: regelQuelle.motiv.cents, ...(regelQuelle.logo.aktiv ? {logo: regelQuelle.logo.cents} : {}), staffel: regelQuelle.staffel.stufen},
      stand: standKennung, ids: product.ids || {},
    }));
    produkte[key] = {name: product.name, familie: product.familie, start: startDoc?.id || null, shopify: product.ids?.shopifyProductId || null};
  }
}

// ---------------------------------------------------------------- Inhaltsverzeichnis
const dirSize = dir => fs.existsSync(dir) ? fs.readdirSync(dir, {recursive: true, withFileTypes: true}).filter(e => e.isFile()).reduce((sum, e) => sum + fs.statSync(path.join(e.parentPath, e.name)).size, 0) : 0;
const stand = {
  v: 1, stand: standKennung, erzeugt: new Date().toISOString(), katalog: path.basename(root),
  schriften, motive: motivIndex,
  familien: Object.fromEntries(Object.entries(familien).map(([id, f]) => [id, {u: f.u, designs: f.designs, groessen: f.groessen}])),
  produkte,
  zaehler: {
    schriften: Object.keys(schriften).length, motive: motive.length, designs: [...designCache.values()].filter(Boolean).length,
    familien: Object.keys(familien).length, produkte: Object.keys(produkte).length, hinweise: hinweise.length,
    bytes: {schriften: dirSize(path.join(out, 's')), motive: dirSize(path.join(out, 'm')), designs: dirSize(path.join(out, 'd')), gesamt: dirSize(out)},
    sekunden: round((Date.now() - started) / 1000, 1),
  },
  hinweise,
};
fs.writeFileSync(path.join(out, 'stand.json'), JSON.stringify(stand, null, 1));
console.log(JSON.stringify(stand.zaehler, null, 1));
const byKind = {};
for (const note of hinweise) byKind[note.art] = (byKind[note.art] || 0) + 1;
console.log('Hinweise je Art:', JSON.stringify(byKind));

function parseArgs(list) {
  const result = {};
  for (let i = 0; i < list.length; i++) {
    if (!list[i].startsWith('--')) throw new Error('Unbekanntes Argument: ' + list[i]);
    result[list[i].slice(2)] = list[i + 1] && !list[i + 1].startsWith('--') ? list[++i] : true;
  }
  return result;
}
