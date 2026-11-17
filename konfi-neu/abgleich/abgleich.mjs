#!/usr/bin/env node
// Shop-Abgleich: EIN Werkzeug vom Katalog zum Shop. Dieser Schritt liest nur und schreibt einen Plan.
//
//   node abgleich/abgleich.mjs --shop <Shop-Abzug.json> [--daten dist/daten] [--out abgleich/plan]
//
// Eingaben:
//   - veröffentlichte Daten (Soll): welche Produkte, Größen, Befestigungen und Preise der Katalog vorsieht
//   - Shop-Abzug (Ist): Produkte und Varianten aus Shopify, gelesen mit abgleich/shop-lesen.mjs
// Ausgaben (nur Dateien, kein Schreibzugriff auf Shopify):
//   plan.json      jede Abweichung als einzelne, feldgenaue Maßnahme mit Grund
//   plan.md        derselbe Plan zum Lesen und Freigeben, mit Zählern
//   bindung.json   "<produkt>|<Größe>-<Befestigung>" → Shopify-Variante (ersetzt die bisherigen Bindungstabellen)
//   produkte.json  Produkte, die im Shop einen Konfigurator haben, aber noch nicht veröffentlicht sind
//                  (Eingabe für publish.mjs --produkte)
//
// Grundsätze:
//   - Zuordnung über stabile Kennungen: Produkt über custom.customization_id, Variante über die SKU.
//   - Nie eine Liste ersetzen (kein productSet über ganze Produkte): Jede Maßnahme betrifft genau ein Feld
//     einer Variante oder legt genau eine fehlende Variante an. Was der Plan nicht nennt, bleibt unberührt.
//   - Nichts wird gelöscht. Varianten im Shop, die der Katalog nicht kennt, werden nur gemeldet.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : undefined; };
if (!arg('shop')) { console.error('Aufruf: node abgleich/abgleich.mjs --shop <Shop-Abzug.json> [--daten dist/daten] [--out abgleich/plan]'); process.exit(1); }
const daten = path.resolve(arg('daten') || path.join(here, '..', 'dist', 'daten'));
const out = path.resolve(arg('out') || path.join(here, 'plan'));
const shop = JSON.parse(fs.readFileSync(path.resolve(arg('shop')), 'utf8'));
const stand = JSON.parse(fs.readFileSync(path.join(daten, 'stand.json'), 'utf8'));
const slug = value => String(value).normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
const euro = cents => (cents / 100).toFixed(2).replace('.', ',') + ' €';

/**
 * SKU aus dem Shop auf die Katalogform bringen. Im Shop stehen zwei Schreibweisen:
 *   156-GR-ES-AB-120X80-T15-K00            (Artikelnummer vorn)
 *   TS-Acryl-AB-120X80-T30-D10-SW-K00      (Designnummer in der Mitte)
 * Katalogform ist immer <Größenschlüssel>-<Befestigung>.
 */
export function skuNormal(sku) {
  return String(sku || '').replace(/^\d+-/, '').replace(/-D\d+(?=-)/, '');
}

const massnahmen = [];
const bindung = {};
const unveroeffentlicht = [];
const zaehler = {produkteImShop: shop.produkte.length, mitKonfi: 0, veroeffentlicht: 0, variantenGebunden: 0, variantenFehlen: 0, preisAbweichungen: 0, unbekannteVarianten: 0, nichtImShop: 0, unvollstaendigGelesen: 0};

// Zuordnung Shop-Produkt → veröffentlichtes Produkt: über die Konfigurator-Kennung (Metafeld) oder,
// wenn der Abzug keine Metafelder enthält (öffentliche Daten), über die Shopify-Produkt-ID.
const nachShopifyId = new Map(Object.entries(stand.produkte).filter(([, p]) => p.shopify).map(([key, p]) => [String(p.shopify), key]));
const imShop = new Map();
for (const produkt of shop.produkte) {
  const key = produkt.konfi ? slug(produkt.konfi) : nachShopifyId.get(String(produkt.id));
  if (!key) continue;
  zaehler.mitKonfi++;
  imShop.set(key, produkt);
}

/**
 * Funkklingel: Variante über ihre Optionswerte zuordnen. Im Shop gibt es drei Optionen; die Werte heißen
 * z. B. „Schwarz“, „24 × 20 cm · Ganzer Rahmen“ (ohne Maß = Hochformat 16 × 28), „Bohrlöcher mit Schrauben“.
 * Erkannt wird am Wert, nicht an der Reihenfolge der Optionen. Das Format steht zusätzlich in der SKU.
 */
function klingelSchluessel(familie, variante) {
  const werte = (variante.o || []).filter(Boolean);
  const farbe = familie.optionen.find(o => o.k === 'farbe').werte.find(w => werte.includes(w.n));
  let format = null, rahmen = null, bef = null;
  for (const wert of werte) {
    const teile = /^(\d+) × (\d+) cm · (.+)$/.exec(wert);
    const name = teile ? teile[3] : wert;
    const treffer = familie.optionen.find(o => o.k === 'rahmen').werte.find(w => w.n === name);
    if (treffer) { rahmen = treffer; format = teile ? `${teile[1]}x${teile[2]}` : '16x28'; }
  }
  const ausSku = /^FK-AV2A-(\d+x\d+)-/.exec(variante.sku || '')?.[1];
  if (ausSku && format && ausSku !== format) return {fehler: `SKU nennt ${ausSku}, Option nennt ${format}`};
  const groesse = familie.groessen.find(g => g.k === (format || ausSku));
  if (groesse) bef = groesse.bef.find(b => werte.includes(b.n));
  if (!farbe || !rahmen || !groesse || !bef) return {fehler: 'Optionswerte nicht erkannt: ' + werte.join(' | ')};
  return {sku: `${groesse.k}-${farbe.k}-${rahmen.k}-${bef.id}`, soll: groesse.p + bef.p};
}

for (const [key, produktShop] of imShop) {
  const datei = path.join(daten, 'p', key + '.json');
  if (!fs.existsSync(datei)) {
    unveroeffentlicht.push({key: produktShop.konfi, name: produktShop.titel, ids: {shopifyProductId: produktShop.id}, status: produktShop.status, schnitt: produktShop.schnitt || null});
    continue;
  }
  zaehler.veroeffentlicht++;
  const eintrag = JSON.parse(fs.readFileSync(datei, 'utf8'));
  const abgeschnitten = produktShop.variantenGesamt === null || produktShop.variantenGesamt > produktShop.varianten.length;
  if (abgeschnitten) {
    zaehler.unvollstaendigGelesen++;
    massnahmen.push({art: 'hinweis', produkt: key, grund: `Abzug enthält ${produktShop.varianten.length} von ${produktShop.variantenGesamt ?? 'mehr als 250'} Varianten – Variantenabgleich für dieses Produkt unvollständig`});
  }
  if (eintrag.familie.art === 'klingel') {
    const gefunden = new Set();
    for (const variante of produktShop.varianten) {
      const z = klingelSchluessel(eintrag.familie, variante);
      if (z.fehler) { zaehler.unbekannteVarianten++; massnahmen.push({art: 'hinweis', produkt: key, variante: variante.id, sku: variante.sku, grund: z.fehler}); continue; }
      if (gefunden.has(z.sku)) { massnahmen.push({art: 'hinweis', produkt: key, variante: variante.id, sku: variante.sku, grund: 'zweite Shop-Variante für dieselbe Auswahl ' + z.sku}); continue; }
      gefunden.add(z.sku);
      zaehler.variantenGebunden++;
      bindung[`${key}|${z.sku}`] = {variante: variante.id};
      const ist = Math.round(Number(variante.preis) * 100);
      if (ist !== z.soll) { zaehler.preisAbweichungen++; massnahmen.push({art: 'preis-setzen', produkt: key, variante: variante.id, sku: variante.sku, von: ist, auf: z.soll, grund: 'Katalog: Format-Grundpreis + Befestigung'}); }
    }
    const f = eintrag.familie;
    for (const g of f.groessen) for (const farbe of f.optionen.find(o => o.k === 'farbe').werte) for (const rahmen of f.optionen.find(o => o.k === 'rahmen').werte) for (const b of g.bef) {
      const sku = `${g.k}-${farbe.k}-${rahmen.k}-${b.id}`;
      if (!gefunden.has(sku)) { zaehler.variantenFehlen++; massnahmen.push({art: 'variante-anlegen', produkt: key, shopifyProdukt: produktShop.id, sku, preisCents: g.p + b.p, grund: `Im Shop fehlt ${g.n} / ${farbe.n} / ${rahmen.n} / ${b.n}`}); }
    }
    continue;
  }
  const nachSku = new Map(produktShop.varianten.map(v => [skuNormal(v.sku), v]));
  const erwartet = new Set();
  const groessen = eintrag.groessen ? eintrag.familie.groessen.filter(g => eintrag.groessen.includes(g.k)) : eintrag.familie.groessen;
  for (const g of groessen) {
    for (const b of g.bef) {
      const sku = `${g.k}-${b.id}`;
      erwartet.add(sku);
      const variante = nachSku.get(sku);
      const soll = g.p + b.p;
      if (!variante) {
        if (abgeschnitten) continue; // nicht beurteilbar
        zaehler.variantenFehlen++;
        massnahmen.push({art: 'variante-anlegen', produkt: key, shopifyProdukt: produktShop.id, sku, preisCents: soll, grund: `Katalog sieht ${g.n} / ${b.n} vor, im Shop fehlt die Variante`});
        continue;
      }
      zaehler.variantenGebunden++;
      bindung[`${key}|${sku}`] = {variante: variante.id};
      const ist = Math.round(Number(variante.preis) * 100);
      if (ist !== soll) {
        zaehler.preisAbweichungen++;
        massnahmen.push({art: 'preis-setzen', produkt: key, variante: variante.id, sku: variante.sku, von: ist, auf: soll, grund: `Katalog: ${euro(g.p)} Grundpreis + ${euro(b.p)} Befestigung`});
      }
    }
  }
  for (const [sku, variante] of nachSku) {
    if (!erwartet.has(sku)) { zaehler.unbekannteVarianten++; massnahmen.push({art: 'hinweis', produkt: key, variante: variante.id, sku: variante.sku, grund: 'Variante im Shop, die der Katalog nicht kennt – bleibt unberührt'}); }
  }
}
for (const key of Object.keys(stand.produkte)) {
  if (!imShop.has(key)) { zaehler.nichtImShop++; massnahmen.push({art: 'hinweis', produkt: key, grund: 'Im Katalog veröffentlicht, im Shop-Abzug kein Produkt mit dieser Konfigurator-Kennung'}); }
}

fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'plan.json'), JSON.stringify({erzeugt: new Date().toISOString(), shop: shop.shop, gelesen: shop.gelesen, stand: stand.stand, zaehler, massnahmen}, null, 1));
fs.writeFileSync(path.join(out, 'bindung.json'), JSON.stringify(bindung, null, 1));
fs.writeFileSync(path.join(out, 'produkte.json'), JSON.stringify({hinweis: 'Im Shop mit Konfigurator-Kennung, aber noch nicht veröffentlicht. Familie und Startdesign ergänzen, dann publish.mjs --produkte.', produkte: unveroeffentlicht}, null, 1));
const schreibend = massnahmen.filter(m => m.art !== 'hinweis');
const jeArt = {};
for (const m of massnahmen) jeArt[m.art] = (jeArt[m.art] || 0) + 1;
fs.writeFileSync(path.join(out, 'plan.md'), [
  `# Abgleichplan ${shop.shop}`,
  '',
  `Shop gelesen: ${shop.gelesen} · Katalogstand: ${stand.stand} · erzeugt: ${new Date().toISOString()}`,
  '',
  '**Dieser Plan ändert nichts.** Er listet, was sich zwischen Katalog und Shop unterscheidet.',
  '',
  '| Zähler | Wert |', '|---|---:|',
  ...Object.entries(zaehler).map(([name, wert]) => `| ${name} | ${wert} |`),
  '',
  `## Schreibende Maßnahmen (${schreibend.length})`,
  '',
  schreibend.length ? '| Art | Produkt | SKU | Änderung | Grund |\n|---|---|---|---|---|\n' + schreibend.slice(0, 500).map(m => `| ${m.art} | ${m.produkt} | ${m.sku || ''} | ${m.art === 'preis-setzen' ? `${euro(m.von)} → ${euro(m.auf)}` : euro(m.preisCents)} | ${m.grund} |`).join('\n') : 'Keine.',
  '',
  `## Noch nicht veröffentlichte Shop-Produkte mit Konfigurator (${unveroeffentlicht.length})`,
  '',
  ...unveroeffentlicht.slice(0, 200).map(p => `- ${p.name} · \`${p.key}\` · ${p.status}`),
  '',
].join('\n'));
console.log(JSON.stringify({zaehler, jeArt, ausgabe: out}, null, 1));
