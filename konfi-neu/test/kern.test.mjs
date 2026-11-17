// Tests für Modell, Preis, Unterschrift, Preisfunktion und Server – ohne Browser, ohne Netz.
// Voraussetzung: veröffentlichte Daten unter dist/daten (node publish/publish.mjs --katalog …).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createHmac, createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as modell from '../core/modell.mjs';
import {kompaktPfad} from '../core/pfad.mjs';
import {hmacSha256Base64Url, sha256, utf8} from '../core/sha256.mjs';
import {unterschreiben, pruefen, staffelText, staffelPreis} from '../core/signatur.mjs';
import {preisLauf, pruefLauf} from '../shopify/funktion/logik.mjs';
import {kern} from '../server/kern.mjs';
import {speicherOeffnen} from '../server/speicher.mjs';

const wurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const daten = path.join(wurzel, 'dist', 'daten');
const eintrag = key => JSON.parse(fs.readFileSync(path.join(daten, 'p', key + '.json'), 'utf8'));
const FEST = '3100000'; // Türschild Edelstahl 7 × 2 cm, Startdesign D5
const FREI = 'katalog-formate-edelstahl-tuerschilder-familienschilder-eb5fe26624befe4a';

test('Pfad verkleinern lässt Geometrie unverändert', () => {
  assert.equal(kompaktPfad('M 0.000 10.5049 L -0.5 .25 C 1 2 3 4 5 6 Z'), 'M0 10.5L-.5 .25C1 2 3 4 5 6Z');
  assert.equal(kompaktPfad('M10 10a5 5 0 1 0 10 0'), 'M10 10a5 5 0 1 0 10 0');
});

test('SHA-256 und HMAC stimmen mit node:crypto überein', () => {
  for (const text of ['', 'abc', 'ä€😀'.repeat(40), 'x'.repeat(200)]) {
    assert.equal(Buffer.from(sha256(utf8(text))).toString('hex'), createHash('sha256').update(text).digest('hex'));
    for (const key of ['k', 'geheim-'.repeat(20)]) {
      assert.equal(hmacSha256Base64Url(key, text), createHmac('sha256', key).update(text).digest('base64url'));
    }
  }
});

test('Preisunterschrift: gültig, verändert, falsche Variante, abgelaufen', () => {
  const wert = unterschreiben('geheim', {gestaltung: 'gabc.1', variante: 4711, aufpreisCents: 169, staffel: '3x5_5x10', ablauf: 2000});
  assert.deepEqual(pruefen('geheim', wert, {gestaltung: 'gabc.1', variante: '4711', jetzt: 1000}), {ok: true, aufpreisCents: 169, staffel: '3x5_5x10'});
  assert.equal(pruefen('geheim', wert.replace('.169.', '.0.'), {gestaltung: 'gabc.1', variante: 4711}).grund, 'unterschrift');
  assert.equal(pruefen('geheim', wert, {gestaltung: 'gabc.1', variante: 4712}).grund, 'unterschrift');
  assert.equal(pruefen('geheim', wert, {gestaltung: 'gabc.2', variante: 4711}).grund, 'unterschrift');
  assert.equal(pruefen('anderer', wert, {gestaltung: 'gabc.1', variante: 4711}).grund, 'unterschrift');
  assert.equal(pruefen('geheim', wert, {gestaltung: 'gabc.1', variante: 4711, jetzt: 2001}).grund, 'abgelaufen');
  assert.equal(pruefen('geheim', 'unsinn', {gestaltung: 'gabc.1', variante: 4711}).grund, 'format');
  assert.equal(staffelText([{ab: 5, prozent: 10}, {ab: 3, prozent: 5}]), '3x5_5x10');
  assert.equal(staffelPreis(2417, 3, '3x5_5x10_10x15'), 2296);
  assert.equal(staffelPreis(2417, 2, '3x5_5x10_10x15'), 2417);
});

test('Startzustand: Größe, Befestigung ohne Bohrung, Preise aus dem Katalog', () => {
  const e = eintrag(FEST);
  const z = modell.startZustand(e);
  assert.equal(z.groesse, 'GR-ES-RE-70X23P3-T15');
  assert.equal(z.bef, 'K00');
  assert.equal(z.els.filter(el => el.t === 'text').length, 2);
  const p = modell.preis(z, e.familie, e.regeln);
  assert.equal(p.grund, 899);
  assert.equal(p.summe, 899);
  assert.deepEqual(modell.pruefen(z, e.familie), []);
});

test('Preis: Befestigung, Zusatzmotiv und Mengenstaffel', () => {
  const e = eintrag(FREI);
  let z = modell.startZustand(e, {groesse: 'GR-ES-OV-120X80-T15', bef: 'B02'});
  const g = modell.groesseVon(e.familie, z.groesse);
  z = {...z, els: [modell.neuerText(g, 'Montserrat', 'Test'), modell.neuesMotiv(g, {k: 'x', n: 'Herz'}, [0, 0, 100, 100], '<path d="M0 0h10v10z"/>')]};
  const einzeln = modell.preis(z, e.familie, e.regeln);
  assert.equal(einzeln.liste, g.p + g.bef.find(b => b.id === 'B02').p + 169);
  const drei = modell.preis({...z, menge: 3}, e.familie, e.regeln);
  assert.equal(drei.stueck, Math.round(einzeln.liste * 0.95));
  assert.equal(drei.summe, drei.stueck * 3);
});

test('Größenwechsel skaliert Elemente mit der Platte', () => {
  const e = eintrag(FREI);
  const von = modell.groesseVon(e.familie, 'GR-ES-RE-120X80-T15');
  const nach = modell.groesseVon(e.familie, 'GR-ES-RE-240X160-T15');
  const z = {...modell.startZustand(e, {groesse: von.k}), els: [modell.neuerText(von, 'Montserrat', 'A')]};
  const gross = modell.groesseSkalieren(z, von, nach);
  assert.equal(gross.els[0].size, z.els[0].size * 2);
  assert.equal(gross.els[0].x, nach.w / 2);
});

test('Designwechsel übernimmt eigene Texte über den Feldschlüssel', () => {
  const e = eintrag(FEST);
  const g = modell.groesseVon(e.familie, e.groessen[0]);
  let z = modell.startZustand(e);
  const feld = z.els.find(el => el.t === 'text');
  z = {...z, els: z.els.map(el => el === feld ? {...el, text: 'Eigener Name'} : el)};
  const neu = modell.designWechseln(z, e.start, g);
  assert.equal(neu.els.find(el => el.feld === feld.feld).text, 'Eigener Name');
});

// ---------------------------------------------------------------- Server
async function mitServer(fn, extra = {}) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'konfi-test-'));
  const speicher = speicherOeffnen(ordner);
  const server = http.createServer(kern({daten, app: path.join(wurzel, 'dist', 'app'), speicher, schluessel: 'test-schluessel', webhookSchluessel: 'hook', shop: 'test.myshopify.com', jetzt: () => 1_000_000_000_000, ...extra}));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const basis = `http://127.0.0.1:${server.address().port}`;
  try { await fn(basis, speicher); } finally { server.close(); speicher.schliessen(); fs.rmSync(ordner, {recursive: true, force: true}); }
}
const post = (url, body) => fetch(url, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});

test('Server: speichern, Preis nachrechnen, bearbeiten nur mit Token', async () => {
  await mitServer(async basis => {
    const e = eintrag(FEST);
    const zustand = {...modell.startZustand(e), menge: 3};
    const antwort = await post(basis + '/api/gestaltungen', {zustand});
    assert.equal(antwort.status, 200);
    const d = await antwort.json();
    assert.equal(d.rev, 1);
    assert.equal(d.preis.stueck, Math.round(899 * 0.95));
    assert.equal(d.position.menge, 3);
    assert.equal(d.position.eigenschaften.Gravurtext, 'Familie');
    assert.equal(d.position.eigenschaften['Gravurtext 2'], 'Schneider');
    const sig = pruefen('test-schluessel', d.position.eigenschaften._gravuru_preis, {gestaltung: d.position.eigenschaften._gravuru, variante: d.position.variante});
    assert.deepEqual(sig, {ok: true, aufpreisCents: 0, staffel: '3x5_5x10_10x15'});

    assert.equal((await fetch(`${basis}/api/gestaltungen/${d.id}?token=falsch`)).status, 404);
    const gelesen = await (await fetch(`${basis}/api/gestaltungen/${d.id}?token=${d.token}`)).json();
    assert.equal(gelesen.zustand.menge, 3);

    assert.equal((await post(basis + '/api/gestaltungen', {zustand, vorgaenger: {id: d.id, token: 'falsch'}})).status, 403);
    const zweite = await (await post(basis + '/api/gestaltungen', {zustand: {...zustand, menge: 1}, vorgaenger: {id: d.id, token: d.token}})).json();
    assert.equal(zweite.id, d.id);
    assert.equal(zweite.rev, 2);
  });
});

test('Server: weist ungültige Gestaltungen ab', async () => {
  await mitServer(async basis => {
    const e = eintrag(FEST);
    const z = modell.startZustand(e);
    const status = async zustand => (await post(basis + '/api/gestaltungen', {zustand})).status;
    assert.equal(await status({...z, groesse: 'GR-ES-RE-450X300-T15'}), 422, 'Größe gehört nicht zum Produkt');
    assert.equal(await status({...z, bef: 'B99'}), 422);
    assert.equal(await status({...z, menge: 0}), 422);
    assert.equal(await status({...z, produkt: '../../etc'}), 404);
    assert.equal(await status({...z, els: [{...z.els.find(el => el.t === 'text'), font: 'Gibt es nicht'}]}), 422);
    assert.equal(await status({...z, els: []}), 422, 'leere Gestaltung');
    // Edelstahl: kein Foto (Entscheidung 1.16/1.19)
    assert.equal(await status({...z, els: [...z.els, {t: 'foto', id: 'f1', x: 10, y: 10, w: 10, h: 10, rot: 0, form: 'rect', bild: {upload: 'u-gibt-es-nicht', zoom: 1}}]}), 422);
  });
});

test('Server: Dateien mit Hash sind dauerhaft zwischenspeicherbar und komprimiert', async () => {
  await mitServer(async basis => {
    const stand = JSON.parse(fs.readFileSync(path.join(daten, 'stand.json'), 'utf8'));
    const familie = await fetch(basis + '/daten/' + Object.values(stand.familien)[0].u, {headers: {'accept-encoding': 'br'}});
    assert.match(familie.headers.get('cache-control'), /immutable/);
    assert.equal(familie.headers.get('content-encoding'), 'br');
    const produkt = await fetch(`${basis}/daten/p/${FEST}.json`);
    assert.match(produkt.headers.get('cache-control'), /max-age=60/);
    assert.equal((await fetch(basis + '/daten/../server/kern.mjs')).status, 404);
  });
});

test('Server: Foto-Upload prüft das Dateiformat', async () => {
  await mitServer(async basis => {
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const ok = await fetch(basis + '/api/uploads', {method: 'POST', headers: {'content-type': 'image/jpeg'}, body: jpeg});
    assert.equal(ok.status, 200);
    assert.match((await ok.json()).id, /^u/);
    assert.equal((await fetch(basis + '/api/uploads', {method: 'POST', body: Buffer.from('<script>')})).status, 415);
  });
});

test('Bestelleingang: richtige Unterschrift, Wiederholung, jede Abweichung wird sichtbar', async () => {
  await mitServer(async (basis, speicher) => {
    const e = eintrag(FEST);
    const d = await (await post(basis + '/api/gestaltungen', {zustand: {...modell.startZustand(e), menge: 3}})).json();
    const eigenschaften = Object.entries(d.position.eigenschaften).map(([name, value]) => ({name, value}));
    const bestellung = (zeilen, id = 1) => JSON.stringify({id, name: '#' + (1000 + id), test: true, line_items: zeilen});
    const senden = (body, ereignis, schluessel = 'hook') => fetch(basis + '/webhooks/shopify/orders-paid', {method: 'POST', body, headers: {'x-shopify-hmac-sha256': createHmac('sha256', schluessel).update(body).digest('base64'), 'x-shopify-shop-domain': 'test.myshopify.com', 'x-shopify-webhook-id': ereignis}});

    const gut = bestellung([{id: 11, variant_id: d.position.variante, sku: d.position.sku, quantity: 3, price: '8.54', properties: eigenschaften}]);
    assert.equal((await senden(gut, 'e1', 'falsch')).status, 401);
    assert.deepEqual((await (await senden(gut, 'e1')).json()).positionen, [{position: '11', status: 'bereit', grund: null}]);
    assert.deepEqual(await (await senden(gut, 'e1')).json(), {wiederholung: true});
    assert.equal((await senden(gut.replace('#1001', '#9999'), 'e1')).status, 409, 'gleiche Kennung, anderer Inhalt');

    // Menge im Warenkorb auf 5 erhöht: Staffel 10 % → 8,09 €. Das ist gültig.
    const fuenf = bestellung([{id: 21, variant_id: d.position.variante, sku: d.position.sku, quantity: 5, price: '8.09', properties: eigenschaften}], 2);
    assert.equal((await (await senden(fuenf, 'e2')).json()).positionen[0].status, 'bereit');

    // Falscher Preis, manipulierte Unterschrift, unbekannte Gestaltung: nie still übersprungen.
    const falsch = bestellung([
      {id: 31, variant_id: d.position.variante, sku: d.position.sku, quantity: 3, price: '1.00', properties: eigenschaften},
      {id: 32, variant_id: d.position.variante, sku: d.position.sku, quantity: 1, price: '8.99', properties: eigenschaften.map(p => p.name === '_gravuru_preis' ? {...p, value: p.value.replace(/\.0\./, '.1.')} : p)},
      {id: 33, variant_id: d.position.variante, sku: d.position.sku, quantity: 1, price: '8.99', properties: [{name: '_gravuru', value: 'gunbekannt.1'}]},
      {id: 34, variant_id: 999, sku: 'FREMD', quantity: 1, price: '5.00', properties: []},
    ], 3);
    const ergebnis = (await (await senden(falsch, 'e3')).json()).positionen;
    assert.deepEqual(ergebnis.map(p => [p.position, p.status]), [['31', 'klaeren'], ['32', 'klaeren'], ['33', 'klaeren']]);
    assert.match(ergebnis[0].grund, /^preis_100_statt_854$/);
    assert.equal(ergebnis[1].grund, 'preisangabe_unterschrift');
    assert.equal(ergebnis[2].grund, 'gestaltung_unbekannt');
    assert.equal(speicher.positionen().length, 5);
  });
});

// ---------------------------------------------------------------- Preisfunktion (Referenzlogik)
test('Preisfunktion: jede Zeile für sich, Sperre nur an der Kasse', () => {
  const schluessel = 'geheim';
  const zeile = (id, menge, extra = {}) => ({id, quantity: menge, cost: {amountPerQuantity: {amount: '22.48'}}, merchandise: {__typename: 'ProductVariant', id: 'gid://shopify/ProductVariant/4711', product: {title: 'Türschild', konfi: {value: 'x'}}}, ...extra});
  const preisangabe = unterschreiben(schluessel, {gestaltung: 'gA.1', variante: 4711, aufpreisCents: 169, staffel: '3x5_5x10_10x15', ablauf: 9_999_999_999});
  const input = step => ({buyerJourney: {step}, shop: {schluessel: {value: schluessel}}, cart: {lines: [
    zeile('gut', 3, {gestaltung: {value: 'gA.1'}, preis: {value: preisangabe}}),
    zeile('manipuliert', 1, {gestaltung: {value: 'gA.1'}, preis: {value: preisangabe.replace('.169.', '.0.')}}),
    zeile('ohne', 1),
    {id: 'fremd', quantity: 2, cost: {amountPerQuantity: {amount: '5.00'}}, merchandise: {__typename: 'ProductVariant', id: 'gid://shopify/ProductVariant/1', product: {title: 'Zubehör', konfi: null}}},
  ]}});
  const ops = preisLauf(input('CART_INTERACTION')).operations;
  assert.deepEqual(ops, [{lineUpdate: {cartLineId: 'gut', price: {adjustment: {fixedPricePerUnit: {amount: '22.96'}}}}}]);
  assert.deepEqual(pruefLauf(input('CART_INTERACTION')).operations[0].validationAdd.errors, [], 'im Warenkorb nie sperren');
  assert.equal(pruefLauf(input('CHECKOUT_INTERACTION')).operations[0].validationAdd.errors.length, 2, 'manipulierte Zeile und Zeile ohne Gestaltung');
  // 40 Gestaltungen in einem Warenkorb: kein Limit in der Logik
  const viele = {buyerJourney: {step: 'CART_INTERACTION'}, shop: {schluessel: {value: schluessel}}, cart: {lines: Array.from({length: 40}, (_, i) => zeile('z' + i, 1, {gestaltung: {value: 'gA.1'}, preis: {value: preisangabe}}))}};
  assert.equal(preisLauf(viele).operations.length, 40);
});

// ---------------------------------------------------------------- Funkklingelschilder
const KLINGEL = 'cfg_7e8b31c1-b95f-49bb-8a3d-fd44a158db98'; // WP Cardea 2 · Querformat 24 × 20 cm

test('Funkklingel: Startwahl, Preise aus dem Katalog, Position ist keine Variante', () => {
  const e = eintrag(KLINGEL);
  const z = modell.startZustand(e);
  assert.equal(z.groesse, '24x20');
  assert.deepEqual(z.opt, {position: 'standard', rahmen: 'FK-RUNDUM', farbe: 'schwarz'});
  assert.equal(modell.preis(z, e.familie, e.regeln).summe, 5999);
  assert.equal(modell.preis({...z, bef: 'B04S'}, e.familie, e.regeln).summe, 6368);
  assert.equal(modell.preis({...z, groesse: '35x18', bef: 'GWS', menge: 3}, e.familie, e.regeln).summe, 3 * (6999 + 599), 'keine Mengenstaffel belegt');
  assert.equal(modell.variantenSchluessel(e.familie, {...z, opt: {...z.opt, position: 'opposite'}}), '24x20-schwarz-FK-RUNDUM-K00');
  assert.equal(modell.galerieSchluessel(e.familie, '24x20', {position: 'opposite'}), '24x20|opposite');
  assert.deepEqual(modell.pruefen(z, e.familie), []);
  assert.equal(modell.pruefen({...z, opt: {...z.opt, rahmen: 'gibt-es-nicht'}}, e.familie)[0].code, 'option');
  assert.equal(e.familie.groessen.length, 3);
  assert.equal(Object.keys(e.familie.galerie).length, 6, '3 Formate × 2 Positionen');
});

test('Funkklingel: Gegenposition liegt gespiegelt, Gerät bleibt auf der Platte', () => {
  const e = eintrag(KLINGEL);
  for (const g of e.familie.groessen) {
    const a = g.kl.pos.standard.bell, b = g.kl.pos.opposite.bell;
    assert.ok(Math.abs((a[0] + a[2] / 2) + (b[0] + b[2] / 2) - g.w) < 0.01, g.k + ': waagerecht gespiegelt');
    assert.ok(Math.abs((a[1] + a[3] / 2) + (b[1] + b[3] / 2) - g.h) < 0.01, g.k + ': senkrecht gespiegelt');
    for (const bell of [a, b]) assert.ok(bell[0] >= 0 && bell[1] >= 0 && bell[0] + bell[2] <= g.w && bell[1] + bell[3] <= g.h);
  }
});

test('Funkklingel: Server speichert mit Optionen und nennt die Klingelposition in der Zeile', async () => {
  await mitServer(async basis => {
    const e = eintrag(KLINGEL);
    const z = {...modell.startZustand(e), bef: 'B04S'};
    // Start-Gestaltung mit Gegenposition gemischt: Die Zierlinie läge auf der Klingel → abgewiesen.
    const gemischt = await post(basis + '/api/gestaltungen', {zustand: {...z, opt: {...z.opt, position: 'opposite'}}});
    assert.equal(gemischt.status, 422);
    assert.equal((await gemischt.json()).code, 'pruefung:geraet');
    // Richtig: dasselbe Design in der Fassung für die Gegenposition.
    const liste = JSON.parse(fs.readFileSync(path.join(daten, e.familie.galerie['24x20|opposite']), 'utf8')).designs;
    const design = JSON.parse(fs.readFileSync(path.join(daten, liste[0].u), 'utf8'));
    const gespiegelt = {...modell.designWechseln(z, design, modell.groesseVon(e.familie, '24x20')), opt: {...z.opt, position: 'opposite', farbe: 'anthrazit'}};
    const d = await (await post(basis + '/api/gestaltungen', {zustand: gespiegelt})).json();
    assert.equal(d.preis.summe, 6368);
    assert.equal(d.position.sku, '24x20-anthrazit-FK-RUNDUM-B04S');
    assert.equal(d.position.eigenschaften.Klingelposition, 'Klingel links');
    assert.match(d.position.eigenschaften.Format, /WP Cardea 2 · Querformat/);
    // Unbekannte Optionswerte werden abgewiesen, nicht stillschweigend ersetzt.
    assert.equal((await post(basis + '/api/gestaltungen', {zustand: {...z, opt: {position: 'standard', rahmen: 'y', farbe: 'z'}}})).status, 422);
    assert.equal((await post(basis + '/api/gestaltungen', {zustand: {...z, opt: undefined}})).status, 422);
  });
});

test('Funkklingel: Foto ist erlaubt, kostet je Foto und darf nicht auf der Klingel liegen', async () => {
  await mitServer(async basis => {
    const e = eintrag(KLINGEL);
    assert.deepEqual(e.familie.foto, {inklusive: 0, preis: 999});
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const upload = await (await fetch(basis + '/api/uploads', {method: 'POST', headers: {'content-type': 'image/jpeg'}, body: jpeg})).json();
    const z = modell.startZustand(e);
    const foto = (x, y) => ({t: 'foto', id: 'foto-1', x, y, w: 40, h: 30, rot: 0, form: 'rect', original: false, bild: {upload: upload.id, zoom: 1, w: 400, h: 300}});
    const d = await (await post(basis + '/api/gestaltungen', {zustand: {...z, els: [...z.els, foto(60, 150)]}})).json();
    assert.equal(d.preis.summe, 5999 + 999);
    assert.deepEqual(d.preis.zusatz, [{art: 'foto', n: 1, je: 999, cents: 999}]);
    const bell = e.familie.groessen.find(g => g.k === '24x20').kl.pos.standard.bell;
    const aufKlingel = await post(basis + '/api/gestaltungen', {zustand: {...z, els: [...z.els, foto(bell[0] + bell[2] / 2, bell[1] + bell[3] / 2)]}});
    assert.equal(aufKlingel.status, 422);
    assert.equal((await aufKlingel.json()).code, 'pruefung:geraet');
  });
});
