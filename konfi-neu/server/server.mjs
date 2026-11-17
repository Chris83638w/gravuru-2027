#!/usr/bin/env node
// Start des Konfigurator-Servers.
//
//   node server/server.mjs [--port 8970] [--dev]
//
// Einstellungen über Umgebungsvariablen (nie im Repository ablegen):
//   GRAVURU_SCHLUESSEL        geheimer Schlüssel der Preisunterschrift (Pflicht außerhalb von --dev)
//   SHOPIFY_WEBHOOK_SCHLUESSEL  Schlüssel für orders/paid
//   GRAVURU_SHOP              z. B. gravuru-design.myshopify.com
//   GRAVURU_OEFFENTLICH       öffentliche Adresse dieses Servers, z. B. https://app-2027.gravuru-designwerkstatt.de
//   GRAVURU_ABLAGE            Ordner für Datenbank, Fotos und Bilder (Standard: ./ablage)
//   GRAVURU_BINDUNG           JSON-Datei "<produkt>|<sku>" → {"variante": …}, erzeugt vom Shop-Abgleich
//   GRAVURU_URSPRUENGE        erlaubte Shop-Adressen für direkte Foto-Uploads, mit Komma getrennt
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {kern} from './kern.mjs';
import {speicherOeffnen} from './speicher.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const argumente = process.argv.slice(2);
const wert = name => { const index = argumente.indexOf('--' + name); return index >= 0 ? argumente[index + 1] : undefined; };
const dev = argumente.includes('--dev');
const port = Number(wert('port') || process.env.PORT || 8970);
const wurzel = path.join(here, '..');

let schluessel = process.env.GRAVURU_SCHLUESSEL;
if (!schluessel) {
  if (!dev) { console.error('GRAVURU_SCHLUESSEL fehlt. Ohne geheimen Schlüssel startet der Server nur mit --dev.'); process.exit(1); }
  schluessel = randomBytes(32).toString('hex');
}
const bindungDatei = process.env.GRAVURU_BINDUNG;
const speicher = speicherOeffnen(path.resolve(process.env.GRAVURU_ABLAGE || path.join(wurzel, 'ablage')));

let zusatz = null;
if (dev) zusatz = (await import('../dev/testshop.mjs')).testshop({wurzel, schluessel: () => schluessel});

const anfrage = kern({
  daten: path.join(wurzel, 'dist', 'daten'),
  app: path.join(wurzel, 'dist', 'app'),
  speicher, schluessel,
  webhookSchluessel: process.env.SHOPIFY_WEBHOOK_SCHLUESSEL,
  shop: process.env.GRAVURU_SHOP,
  oeffentlich: process.env.GRAVURU_OEFFENTLICH || '',
  bindung: bindungDatei ? JSON.parse(fs.readFileSync(bindungDatei, 'utf8')) : null,
  urspruenge: (process.env.GRAVURU_URSPRUENGE || '').split(',').map(s => s.trim()).filter(Boolean),
  zusatz,
});

const server = http.createServer(anfrage);
server.listen(port, dev ? '127.0.0.1' : undefined, () => {
  console.log(JSON.stringify({konfi: 'bereit', port, dev, bindung: Boolean(bindungDatei), testshop: dev ? `http://127.0.0.1:${port}/testshop/` : undefined}));
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { speicher.schliessen(); process.exit(0); }));
