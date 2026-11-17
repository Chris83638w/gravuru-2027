// Lokaler Test-Shop: verhält sich an den Stellen, die der Konfigurator benutzt, wie ein Shopify-Theme.
// Nur für Entwicklung und automatische Tests (--dev). Der Warenkorb liegt im Arbeitsspeicher.
//   /testshop/                 Liste der veröffentlichten Produkte
//   /testshop/produkt/<key>    Produktseite mit „Jetzt personalisieren“
//   /cart, /cart.js, /cart/add.js, /cart/change.js   Warenkorb wie im Theme
// Der Preis je Zeile wird mit derselben Logik berechnet wie in der Shopify-Preisfunktion.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {preisLauf, pruefLauf} from '../shopify/funktion/logik.mjs';

const esc = value => String(value).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const euro = cents => (cents / 100).toFixed(2).replace('.', ',') + ' €';

export function testshop({wurzel, schluessel = null}) {
  const daten = path.join(wurzel, 'dist', 'daten');
  const warenkorb = [];
  const stand = () => JSON.parse(fs.readFileSync(path.join(daten, 'stand.json'), 'utf8'));
  const produkt = key => JSON.parse(fs.readFileSync(path.join(daten, 'p', key + '.json'), 'utf8'));
  const seite = (titel, inhalt) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titel)}</title>
<style>body{font:16px/1.4 system-ui,sans-serif;margin:0;color:#1d2b2f}header{padding:14px 20px;border-bottom:1px solid #dde4e5;font-weight:700}main{max-width:980px;margin:0 auto;padding:20px}
a{color:#17525c}.p{display:grid;grid-template-columns:1fr 1fr;gap:28px}@media(max-width:700px){.p{grid-template-columns:1fr}}.bild{background:#f3f6f6;border-radius:12px;aspect-ratio:1;display:grid;place-items:center;color:#6b8085}
button.k{background:#18794e;color:#fff;border:0;border-radius:10px;padding:14px 22px;font:inherit;font-weight:700;cursor:pointer;width:100%}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #dde4e5;text-align:left;vertical-align:top}td img{width:120px;border-radius:8px;background:#f3f6f6}small{color:#5a6f74}</style></head>
<body><header><a href="/testshop/" style="text-decoration:none;color:inherit">Test-Shop gravuru</a> · <a href="/cart">Warenkorb (<span id="anzahl">${warenkorb.length}</span>)</a></header><main>${inhalt}</main></body></html>`;

  /** Warenkorb in der Form, die die Shopify-Funktion als Eingabe bekommt. */
  function funktionsEingabe(step) {
    return {
      buyerJourney: {step}, shop: {schluessel: {value: schluessel?.()}},
      cart: {lines: warenkorb.map(z => ({
        id: z.key, quantity: z.quantity,
        gestaltung: z.properties._gravuru ? {value: z.properties._gravuru} : null,
        preis: z.properties._gravuru_preis ? {value: z.properties._gravuru_preis} : null,
        cost: {amountPerQuantity: {amount: (z.variantenCents / 100).toFixed(2)}},
        merchandise: {__typename: 'ProductVariant', id: 'gid://shopify/ProductVariant/' + z.id, product: {title: z.titel, konfi: {value: z.produkt}}},
      }))},
    };
  }
  function bepreist() {
    const operationen = preisLauf(funktionsEingabe('CART_INTERACTION')).operations;
    return warenkorb.map(z => {
      const op = operationen.find(o => o.lineUpdate.cartLineId === z.key);
      const stueck = op ? Math.round(Number(op.lineUpdate.price.adjustment.fixedPricePerUnit.amount) * 100) : z.variantenCents;
      return {...z, price: stueck, line_price: stueck * z.quantity};
    });
  }
  /** Variantenpreis wie in Shopify: Grundpreis der Größe + Befestigung (kommt dort aus dem Shop-Abgleich). */
  function variantenPreis(sku, bevorzugt) {
    for (const key of [bevorzugt, ...Object.keys(stand().produkte)].filter(Boolean)) {
      const eintrag = produkt(key);
      const zusatz = eintrag.familie.art === 'klingel' ? eintrag.familie.optionen.find(o => o.k === 'farbe').werte.flatMap(f => eintrag.familie.optionen.find(o => o.k === 'rahmen').werte.map(r => `-${f.k}-${r.k}`)) : [''];
      for (const g of eintrag.familie.groessen) for (const b of g.bef) for (const z of zusatz) if (`${g.k}${z}-${b.id}` === sku) return {cents: g.p + b.p, titel: eintrag.name, produkt: key};
    }
    return null;
  }

  return async function zusatz(req, res, url, pfad) {
    const html = (text, status = 200) => { res.writeHead(status, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}); res.end(text); return true; };
    const json = (daten, status = 200) => { res.writeHead(status, {'content-type': 'application/json', 'cache-control': 'no-store'}); res.end(JSON.stringify(daten)); return true; };
    const lesen = () => new Promise(resolve => { let text = ''; req.on('data', teil => text += teil); req.on('end', () => resolve(text ? JSON.parse(text) : {})); });

    if (req.method === 'GET' && pfad === '/testshop/') {
      const s = stand();
      return html(seite('Test-Shop', `<h1>Veröffentlichte Produkte (${Object.keys(s.produkte).length})</h1><ul>${Object.entries(s.produkte).map(([key, p]) => `<li><a href="/testshop/produkt/${esc(key)}">${esc(p.name)}</a> <small>${esc(p.familie)}</small></li>`).join('')}</ul>`));
    }
    const treffer = /^\/testshop\/produkt\/([\w.-]+)$/.exec(pfad);
    if (req.method === 'GET' && treffer) {
      let eintrag;
      try { eintrag = produkt(treffer[1]); } catch { return html(seite('Nicht gefunden', '<p>Produkt nicht veröffentlicht.</p>'), 404); }
      const g = eintrag.groessen ? eintrag.familie.groessen.find(x => x.k === eintrag.groessen[0]) : eintrag.familie.groessen[0];
      return html(seite(eintrag.name, `<div class="p"><div class="bild">Produktbild</div><div><h1>${esc(eintrag.name)}</h1><p>${esc(eintrag.familie.material.name)} · ${esc(g.n)}</p><p><b>ab ${euro(g.p)}</b></p>
<button class="k" data-gravuru-konfi data-produkt="${esc(eintrag.key)}">Jetzt personalisieren</button><p><small>Test-Shop: Diese Seite steht für die Shopify-Produktseite.</small></p></div></div>
<script type="module" src="/app/konfi.js" data-gravuru-konfi-start data-basis="/daten/" data-api="/api"></script>`));
    }
    if (req.method === 'GET' && pfad === '/cart.js') {
      const zeilen = bepreist();
      return json({item_count: zeilen.reduce((s, z) => s + z.quantity, 0), total_price: zeilen.reduce((s, z) => s + z.line_price, 0), items: zeilen});
    }
    if (req.method === 'GET' && pfad === '/cart') {
      const zeilen = bepreist();
      const fehler = pruefLauf(funktionsEingabe('CHECKOUT_INTERACTION')).operations[0].validationAdd.errors;
      return html(seite('Warenkorb', `<h1>Warenkorb</h1>${zeilen.length ? `<table><tr><th></th><th>Position</th><th>Menge</th><th>Preis</th></tr>${zeilen.map(z => `<tr data-zeile="${esc(z.key)}"><td>${z.properties._gravuru_bild ? `<img src="${esc(z.properties._gravuru_bild)}" alt="Deine Gestaltung">` : ''}</td>
<td><b>${esc(z.titel)}</b><br><small>${esc(z.sku)}</small>${Object.entries(z.properties).filter(([name]) => !name.startsWith('_')).map(([name, wert]) => `<br>${esc(name)}: ${esc(wert)}`).join('')}
${z.properties._gravuru_bearbeiten ? `<br><a data-bearbeiten href="/testshop/produkt/${esc(z.produkt)}?${esc(z.properties._gravuru_bearbeiten)}&zeile=${esc(z.key)}">Bearbeiten</a>` : ''}</td>
<td>${z.quantity}</td><td>${euro(z.line_price)}<br><small>${euro(z.price)} je Stück</small></td></tr>`).join('')}</table><p><b id="summe">Summe: ${euro(zeilen.reduce((s, z) => s + z.line_price, 0))}</b></p>
${fehler.length ? `<p id="kasse" style="color:#c62828">Kasse gesperrt: ${fehler.map(f => esc(f.message)).join(' ')}</p>` : '<p id="kasse" style="color:#18794e">Kasse frei.</p>'}` : '<p>Dein Warenkorb ist leer.</p>'}`));
    }
    if (req.method === 'POST' && pfad === '/cart/add.js') {
      const body = await lesen();
      const neu = [];
      for (const item of body.items || [body]) {
        // Im echten Shop ist die Variante eindeutig einem Produkt zugeordnet; hier hilft die Herkunftsseite.
        const herkunft = /\/testshop\/produkt\/([\w.-]+)/.exec(String(req.headers.referer || ''))?.[1];
        const variante = variantenPreis(String(item.id), herkunft);
        if (!variante) return json({status: 422, message: 'Cart Error', description: 'Variante nicht verfügbar'}, 422);
        const zeile = {key: `${item.id}:${randomBytes(6).toString('hex')}`, id: item.id, sku: String(item.id), quantity: Number(item.quantity) || 1, properties: item.properties || {}, variantenCents: variante.cents, titel: variante.titel, produkt: variante.produkt};
        warenkorb.push(zeile); neu.push(zeile);
      }
      return json({items: neu});
    }
    if (req.method === 'POST' && pfad === '/cart/change.js') {
      const body = await lesen();
      const index = warenkorb.findIndex(z => z.key === body.id);
      if (index < 0) return json({status: 404, message: 'Zeile nicht gefunden'}, 404);
      if (Number(body.quantity) === 0) warenkorb.splice(index, 1); else warenkorb[index].quantity = Number(body.quantity);
      return json({items: bepreist()});
    }
    if (req.method === 'POST' && pfad === '/testshop/leeren') { warenkorb.length = 0; return json({ok: true}); }
    return false;
  };
}
