#!/usr/bin/env node
// Liest Produkte und Varianten aus Shopify (nur lesend) und schreibt den Shop-Abzug für abgleich.mjs.
//
//   SHOPIFY_SHOP=gravuru-design.myshopify.com SHOPIFY_ADMIN_TOKEN=… node abgleich/shop-lesen.mjs --out abzug.json [--status active]
//
// Benötigt nur das Recht read_products. Der Zugang steht in Umgebungsvariablen, nie im Repository.
// Alle Varianten werden gelesen (auch bei mehr als 100 je Produkt); Kostenlimit von Shopify wird beachtet.
import fs from 'node:fs';

const arg = name => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : undefined; };
const shop = process.env.SHOPIFY_SHOP, token = process.env.SHOPIFY_ADMIN_TOKEN;
if (!shop || !token || !arg('out')) { console.error('SHOPIFY_SHOP, SHOPIFY_ADMIN_TOKEN und --out <Datei> sind nötig.'); process.exit(1); }
const version = process.env.SHOPIFY_API_VERSION || '2026-07';

async function gql(query, variables) {
  for (let versuch = 0; versuch < 6; versuch++) {
    const antwort = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {method: 'POST', headers: {'content-type': 'application/json', 'x-shopify-access-token': token}, body: JSON.stringify({query, variables})});
    const daten = await antwort.json();
    const gedrosselt = antwort.status === 429 || daten.errors?.some(e => e.extensions?.code === 'THROTTLED');
    if (gedrosselt) { await new Promise(r => setTimeout(r, 1500 * (versuch + 1))); continue; }
    if (!antwort.ok || daten.errors) throw new Error('Shopify: ' + JSON.stringify(daten.errors || antwort.status));
    return daten.data;
  }
  throw new Error('Shopify drosselt dauerhaft.');
}

const PRODUKTE = `query($nach: String, $filter: String) { products(first: 50, after: $nach, query: $filter) { pageInfo { hasNextPage endCursor } nodes {
  id handle title status variantsCount { count }
  konfi: metafield(namespace: "custom", key: "customization_id") { value }
  schnitt: metafield(namespace: "custom", key: "gravuru_product_cut") { value }
  variants(first: 100) { pageInfo { hasNextPage endCursor } nodes { id sku price } } } } }`;
const VARIANTEN = `query($id: ID!, $nach: String) { product(id: $id) { variants(first: 250, after: $nach) { pageInfo { hasNextPage endCursor } nodes { id sku price } } } }`;
const nummer = gid => gid.split('/').pop();

const produkte = [];
let nach = null;
do {
  const seite = (await gql(PRODUKTE, {nach, filter: arg('status') ? 'status:' + arg('status') : null})).products;
  for (const p of seite.nodes) {
    const varianten = p.variants.nodes.map(v => ({id: nummer(v.id), sku: v.sku, preis: v.price}));
    let weiter = p.variants.pageInfo.hasNextPage ? p.variants.pageInfo.endCursor : null;
    while (weiter) {
      const mehr = (await gql(VARIANTEN, {id: p.id, nach: weiter})).product.variants;
      varianten.push(...mehr.nodes.map(v => ({id: nummer(v.id), sku: v.sku, preis: v.price})));
      weiter = mehr.pageInfo.hasNextPage ? mehr.pageInfo.endCursor : null;
    }
    produkte.push({id: nummer(p.id), handle: p.handle, titel: p.title, status: p.status, konfi: p.konfi?.value || null, schnitt: p.schnitt?.value ? JSON.parse(p.schnitt.value) : null, variantenGesamt: p.variantsCount.count, varianten});
  }
  nach = seite.pageInfo.hasNextPage ? seite.pageInfo.endCursor : null;
} while (nach);
fs.writeFileSync(arg('out'), JSON.stringify({shop, gelesen: new Date().toISOString(), produkte}, null, 1));
console.log(JSON.stringify({produkte: produkte.length, mitKonfi: produkte.filter(p => p.konfi).length, varianten: produkte.reduce((s, p) => s + p.varianten.length, 0)}));
