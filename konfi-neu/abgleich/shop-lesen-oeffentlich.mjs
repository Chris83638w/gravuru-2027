#!/usr/bin/env node
// Liest die ÖFFENTLICHEN Produktdaten des Shops (/products.json) und schreibt den Shop-Abzug für abgleich.mjs.
// Kein Zugangsschlüssel nötig, nur Lesezugriff, nur veröffentlichte Produkte.
//
//   node abgleich/shop-lesen-oeffentlich.mjs --shop gravuru-design.myshopify.com --out abzug.json
//
// Grenzen der öffentlichen Daten:
//   - höchstens 250 Varianten je Produkt (darüber: abgleich/shop-lesen.mjs mit Admin-Zugang),
//   - keine Metafelder: Die Zuordnung zum Konfigurator läuft über die Shopify-Produkt-ID.
import fs from 'node:fs';

const arg = name => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : undefined; };
const shop = arg('shop'), out = arg('out');
if (!shop || !out) { console.error('Aufruf: node abgleich/shop-lesen-oeffentlich.mjs --shop <domain> --out <Datei>'); process.exit(1); }

const produkte = [];
for (let seite = 1; seite < 200; seite++) {
  let antwort;
  for (let versuch = 0; versuch < 5; versuch++) {
    antwort = await fetch(`https://${shop}/products.json?limit=250&page=${seite}`, {headers: {accept: 'application/json'}});
    if (antwort.status !== 429 && antwort.status < 500) break;
    await new Promise(r => setTimeout(r, 2000 * (versuch + 1)));
  }
  if (!antwort.ok) throw new Error(`Shop antwortet mit ${antwort.status} auf Seite ${seite}`);
  const liste = (await antwort.json()).products;
  if (!liste.length) break;
  for (const p of liste) {
    produkte.push({
      id: String(p.id), handle: p.handle, titel: p.title, status: 'ACTIVE', art: p.product_type, konfi: null, schnitt: null,
      optionen: p.options.map(o => o.name),
      // Die öffentliche Liste nennt die Gesamtzahl nicht; genau 250 heißt „möglicherweise abgeschnitten“.
      variantenGesamt: p.variants.length === 250 ? null : p.variants.length,
      varianten: p.variants.map(v => ({id: String(v.id), sku: v.sku, preis: v.price, o: [v.option1, v.option2, v.option3]})),
    });
  }
  if (liste.length < 250) break;
}
fs.writeFileSync(out, JSON.stringify({shop, gelesen: new Date().toISOString(), quelle: 'öffentlich (/products.json)', produkte}));
console.log(JSON.stringify({produkte: produkte.length, varianten: produkte.reduce((s, p) => s + p.varianten.length, 0), moeglicherweiseAbgeschnitten: produkte.filter(p => p.variantenGesamt === null).map(p => p.handle)}));
