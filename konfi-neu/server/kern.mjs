// Server des Konfigurators. Bewusst klein: Er liefert Dateien aus, speichert Gestaltungen,
// nimmt Fotos an und empfängt bezahlte Bestellungen. Mehr nicht.
//
// Kundenweg ohne Serverarbeit: Alles, was der Editor zum Start braucht, sind fertige Dateien
// (dist/daten, dist/app). Sie können genauso gut vom Webserver oder einem CDN kommen; fällt
// dieser Node-Prozess aus oder startet neu, lädt der Konfigurator trotzdem.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHmac, timingSafeEqual} from 'node:crypto';
import * as modell from '../core/modell.mjs';
import {unterschreiben, pruefen as signaturPruefen, staffelText, staffelPreis} from '../core/signatur.mjs';

const TYPEN = {'.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg'};
const KOMPRIMIERBAR = new Set(['.json', '.js', '.mjs', '.css', '.html', '.svg']);
const ANGEBOT_TAGE = 30;

class Fehler extends Error {
  constructor(status, code, kundentext) { super(code); this.status = status; this.code = code; this.kundentext = kundentext; }
}

/**
 * @param {object} k
 * @param {string} k.daten       Ordner der veröffentlichten Daten (dist/daten)
 * @param {string} k.app         Ordner der Browser-Dateien (dist/app)
 * @param {object} k.speicher    aus speicherOeffnen()
 * @param {string} k.schluessel  geheimer Schlüssel für die Preisunterschrift
 * @param {string} [k.webhookSchluessel]  Shopify-Webhook-Schlüssel
 * @param {string} [k.shop]      erwartete Shop-Domain für Webhooks
 * @param {string} [k.oeffentlich]  öffentliche Adresse dieses Servers für Bild-Links
 * @param {Record<string,{variante:string|number}>} [k.bindung]  "<produkt>|<sku>" → Shopify-Variante
 * @param {string[]} [k.urspruenge]  erlaubte Shop-Adressen für direkte Uploads
 */
export function kern(k) {
  const jetzt = k.jetzt || (() => Date.now());
  const produktCache = new Map();
  function produkt(key) {
    if (!/^[\w.-]{1,80}$/.test(key)) throw new Fehler(404, 'produkt_unbekannt');
    const datei = path.join(k.daten, 'p', key + '.json');
    let stat;
    try { stat = fs.statSync(datei); } catch { throw new Fehler(404, 'produkt_unbekannt', 'Dieses Produkt ist nicht mehr verfügbar.'); }
    const cached = produktCache.get(key);
    if (cached && cached.mtime === stat.mtimeMs) return cached.eintrag;
    const eintrag = JSON.parse(fs.readFileSync(datei, 'utf8'));
    if (produktCache.size > 200) produktCache.clear();
    produktCache.set(key, {mtime: stat.mtimeMs, eintrag});
    return eintrag;
  }

  // ---------------------------------------------------------------- Gestaltung speichern
  function gestaltungSpeichern(body) {
    const zustand = zustandPruefen(body?.zustand);
    const eintrag = produkt(zustand.produkt);
    const familie = eintrag.familie;
    if (zustand.familie !== familie.id) throw new Fehler(422, 'familie');
    const groesse = modell.groesseVon(familie, zustand.groesse);
    if (!groesse || (eintrag.groessen && !eintrag.groessen.includes(groesse.k))) throw new Fehler(422, 'groesse', 'Diese Größe ist für das Produkt nicht verfügbar.');
    const fotoErlaubt = Boolean(familie.foto) || (eintrag.start?.els || []).some(el => el.t === 'foto');
    const fehler = modell.pruefen(zustand, familie, {foto: fotoErlaubt, logo: eintrag.regeln?.logo != null});
    if (fehler.length) throw new Fehler(422, 'pruefung:' + fehler[0].code, fehler[0].text);
    for (const el of zustand.els) {
      if (el.t === 'text' && !eintrag.schriften[el.font]) throw new Fehler(422, 'schrift', 'Eine Schrift ist nicht verfügbar.');
      if (el.t === 'foto' && el.bild && !k.speicher.upload(el.bild.upload)) throw new Fehler(422, 'foto_fehlt', 'Ein Foto wurde nicht vollständig hochgeladen. Bitte lade es erneut hoch.');
    }
    // Nur das Ergebnis dieser Rechnung zählt, nicht der Preis aus dem Browser.
    const preis = modell.preis(zustand, familie, eintrag.regeln || {});
    const sku = modell.variantenSchluessel(familie, zustand);
    const gebunden = k.bindung ? k.bindung[`${eintrag.key}|${sku}`] : {variante: sku};
    if (!gebunden) throw new Fehler(409, 'nicht_gebunden', 'Diese Ausführung ist im Shop gerade nicht bestellbar.');

    let bildBytes = null, bildEndung = null;
    const treffer = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(body.vorschau || '');
    if (treffer) {
      bildBytes = Buffer.from(treffer[2], 'base64');
      bildEndung = treffer[1] === 'jpeg' ? 'jpg' : 'webp';
      if (bildBytes.length > 1_500_000) throw new Fehler(413, 'vorschau_gross');
    }
    const gespeichert = k.speicher.gestaltungSpeichern({vorgaenger: body.vorgaenger || null, produkt: eintrag.key, sku, zustand, preis, stand: eintrag.stand, bildBytes, bildEndung});
    if (!gespeichert) throw new Fehler(403, 'vorgaenger', 'Diese Gestaltung kann nicht mehr bearbeitet werden.');

    const kennung = `${gespeichert.id}.${gespeichert.rev}`;
    const staffel = staffelText(familie.staffel || eintrag.regeln?.staffel);
    const ablauf = Math.floor(jetzt() / 1000) + ANGEBOT_TAGE * 86400;
    const eigenschaften = {
      Format: `${familie.art === 'klingel' ? familie.name : familie.material.name} · ${groesse.n}`,
    };
    // Die Klingelposition ist keine Shop-Variante und muss deshalb in der Zeile stehen.
    if (familie.art === 'klingel') eigenschaften.Klingelposition = groesse.kl.posNamen[zustand.opt.position];
    modell.texteVon(zustand).slice(0, 30).forEach((text, index) => { eigenschaften[index ? `Gravurtext ${index + 1}` : 'Gravurtext'] = text.replace(/\s*\n\s*/g, ' / ').slice(0, 240); });
    Object.assign(eigenschaften, {
      _gravuru: kennung,
      _gravuru_preis: unterschreiben(k.schluessel, {gestaltung: kennung, variante: gebunden.variante, aufpreisCents: preis.aufpreis, staffel, ablauf}),
      _gravuru_bearbeiten: `konfi=${gespeichert.id}&t=${gespeichert.token}`,
      ...(gespeichert.bild ? {_gravuru_bild: `${k.oeffentlich || ''}/bild/${gespeichert.bild}`} : {}),
    });
    return {id: gespeichert.id, rev: gespeichert.rev, token: gespeichert.token, preis, position: {variante: gebunden.variante, sku, menge: preis.menge, eigenschaften}};
  }

  /** Form und Größe der Eingabe begrenzen, bevor irgendetwas damit gerechnet wird. */
  function zustandPruefen(z) {
    const zahl = (wert, min, max) => typeof wert === 'number' && Number.isFinite(wert) && wert >= min && wert <= max;
    const text = (wert, max) => typeof wert === 'string' && wert.length <= max;
    if (!z || z.v !== modell.VERSION || !text(z.produkt, 80) || !text(z.familie, 120) || !text(z.groesse, 120) || !text(z.bef, 40) || !Array.isArray(z.els) || z.els.length > 40) throw new Fehler(422, 'zustand');
    if (!zahl(z.menge, 1, 99) || !Number.isInteger(z.menge)) throw new Fehler(422, 'menge', 'Die Menge muss zwischen 1 und 99 liegen.');
    if (z.opt != null && (typeof z.opt !== 'object' || Array.isArray(z.opt) || Object.keys(z.opt).length > 8 || !Object.entries(z.opt).every(([name, wert]) => text(name, 40) && text(wert, 40)))) throw new Fehler(422, 'optionen');
    const ids = new Set();
    for (const el of z.els) {
      if (!el || !text(el.id, 80) || ids.has(el.id) || !zahl(el.x, -2000, 4000) || !zahl(el.y, -2000, 4000) || !zahl(el.rot ?? 0, -360, 360)) throw new Fehler(422, 'element');
      ids.add(el.id);
      if (el.t === 'text') {
        if (!text(el.text, 500) || !text(el.font, 80) || !zahl(el.size, 0.5, 300) || !['s', 'm', 'e'].includes(el.anker) || !zahl(el.ls ?? 0, -50, 200) || !zahl(el.lh ?? 0, 0, 600)) throw new Fehler(422, 'element_text');
      } else if (el.t === 'motiv') {
        if (!zahl(el.w, 0.1, 3000) || !zahl(el.h, 0.1, 3000) || !zahl(el.s, 0.0001, 1000) || !el.quelle || !['design', 'bibliothek'].includes(el.quelle.art)) throw new Fehler(422, 'element_motiv');
      } else if (el.t === 'foto') {
        if (!zahl(el.w, 0.1, 3000) || !zahl(el.h, 0.1, 3000)) throw new Fehler(422, 'element_foto');
        if (el.bild && (!text(el.bild.upload, 40) || !zahl(el.bild.zoom ?? 1, 1, 10))) throw new Fehler(422, 'element_foto');
      } else throw new Fehler(422, 'element_art');
    }
    return z;
  }

  // ---------------------------------------------------------------- Fotos
  function uploadAnnehmen(bytes, typ, name) {
    const kopf = bytes.subarray(0, 12);
    const erkannt =
      kopf[0] === 0xff && kopf[1] === 0xd8 ? 'image/jpeg' :
      kopf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'image/png' :
      kopf.subarray(0, 4).toString('latin1') === 'RIFF' && kopf.subarray(8, 12).toString('latin1') === 'WEBP' ? 'image/webp' :
      kopf.subarray(4, 8).toString('latin1') === 'ftyp' ? 'image/heic' : null;
    if (!erkannt) throw new Fehler(415, 'bildformat', 'Bitte lade ein Foto als JPG, PNG, WebP oder HEIC hoch.');
    void typ;
    return k.speicher.uploadSpeichern({bytes, typ: erkannt, name: String(name || '').slice(0, 200)});
  }

  // ---------------------------------------------------------------- Bezahlte Bestellung (Webhook)
  function bestellungAnnehmen(roh, kopf) {
    if (!k.webhookSchluessel) throw new Fehler(503, 'webhook_nicht_eingerichtet');
    const erwartet = createHmac('sha256', k.webhookSchluessel).update(roh).digest();
    const erhalten = Buffer.from(String(kopf['x-shopify-hmac-sha256'] || ''), 'base64');
    if (erhalten.length !== erwartet.length || !timingSafeEqual(erhalten, erwartet)) throw new Fehler(401, 'webhook_unterschrift');
    const shop = String(kopf['x-shopify-shop-domain'] || '');
    if (k.shop && shop !== k.shop) throw new Fehler(401, 'webhook_shop');
    const ereignisId = String(kopf['x-shopify-webhook-id'] || kopf['x-shopify-event-id'] || '');
    if (!ereignisId) throw new Fehler(400, 'webhook_kennung');
    if (!k.speicher.ereignisMerken(ereignisId, 'orders/paid', roh)) return {wiederholung: true};
    const bestellung = JSON.parse(roh.toString('utf8'));
    const ergebnis = [];
    for (const zeile of bestellung.line_items || []) {
      const eigenschaften = Object.fromEntries((zeile.properties || []).map(p => [p.name, String(p.value ?? '')]));
      const kennung = eigenschaften._gravuru;
      const gebundeneSku = k.bindung ? Object.keys(k.bindung).some(key => String(k.bindung[key].variante) === String(zeile.variant_id)) : false;
      if (!kennung && !gebundeneSku) continue; // kein Konfigurator-Produkt
      const position = {shop, bestellung: String(bestellung.id), position: String(zeile.id), bestellnummer: bestellung.name, sku: zeile.sku, menge: zeile.quantity, stueckCents: Math.round(Number(zeile.price) * 100), test: Boolean(bestellung.test)};
      const melden = (status, grund, zusatz = {}) => { k.speicher.positionSpeichern({...position, ...zusatz, status, grund}); ergebnis.push({position: position.position, status, grund}); };
      // Eine Konfigurator-Variante ohne Gestaltung ist ein Fehlerfall, der sichtbar werden muss.
      if (!kennung) { melden('klaeren', 'ohne_gestaltung'); continue; }
      const [id, revText] = kennung.split('.');
      const gestaltung = k.speicher.gestaltung(id, Number(revText));
      if (!gestaltung) { melden('klaeren', 'gestaltung_unbekannt'); continue; }
      const zusatz = {gestaltung: id, rev: gestaltung.rev};
      const signatur = signaturPruefen(k.schluessel, eigenschaften._gravuru_preis, {gestaltung: kennung, variante: zeile.variant_id});
      if (!signatur.ok) { melden('klaeren', 'preisangabe_' + signatur.grund, zusatz); continue; }
      const liste = gestaltung.preis.grund + gestaltung.preis.befestigung + signatur.aufpreisCents;
      const soll = staffelPreis(liste, zeile.quantity, signatur.staffel);
      if (soll !== position.stueckCents) { melden('klaeren', `preis_${position.stueckCents}_statt_${soll}`, zusatz); continue; }
      melden('bereit', null, zusatz);
    }
    return {positionen: ergebnis};
  }

  // ---------------------------------------------------------------- HTTP
  const komprimiert = new Map();
  let komprimiertBytes = 0;
  function datei(res, req, wurzel, relativ, cache) {
    const ziel = path.normalize(path.join(wurzel, relativ));
    if (!ziel.startsWith(path.resolve(wurzel) + path.sep)) throw new Fehler(404, 'nicht_gefunden');
    let stat;
    try { stat = fs.statSync(ziel); } catch { throw new Fehler(404, 'nicht_gefunden'); }
    if (!stat.isFile()) throw new Fehler(404, 'nicht_gefunden');
    const endung = path.extname(ziel);
    const etag = `"${stat.size.toString(36)}-${Math.round(stat.mtimeMs).toString(36)}"`;
    const kopf = {'content-type': TYPEN[endung] || 'application/octet-stream', 'cache-control': cache, etag, 'x-content-type-options': 'nosniff', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin'};
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, kopf); res.end(); return; }
    const annahme = String(req.headers['accept-encoding'] || '');
    if (KOMPRIMIERBAR.has(endung) && stat.size > 600 && /\b(br|gzip)\b/.test(annahme)) {
      const art = /\bbr\b/.test(annahme) ? 'br' : 'gzip';
      const key = `${ziel}|${etag}|${art}`;
      let daten = komprimiert.get(key);
      if (!daten) {
        const roh = fs.readFileSync(ziel);
        daten = art === 'br' ? zlib.brotliCompressSync(roh, {params: {[zlib.constants.BROTLI_PARAM_QUALITY]: stat.size > 2e6 ? 5 : 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: roh.length}}) : zlib.gzipSync(roh, {level: 7});
        if (komprimiertBytes > 96e6) { komprimiert.clear(); komprimiertBytes = 0; }
        komprimiert.set(key, daten); komprimiertBytes += daten.length;
      }
      res.writeHead(200, {...kopf, 'content-encoding': art, vary: 'accept-encoding', 'content-length': daten.length});
      res.end(req.method === 'HEAD' ? undefined : daten);
      return;
    }
    res.writeHead(200, {...kopf, 'content-length': stat.size});
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(ziel).pipe(res);
  }

  function koerper(req, grenze) {
    return new Promise((resolve, reject) => {
      const teile = [];
      let groesse = 0;
      req.on('data', teil => { groesse += teil.length; if (groesse > grenze) { reject(new Fehler(413, 'zu_gross', 'Die Datei ist zu groß.')); req.destroy(); } else teile.push(teil); });
      req.on('end', () => resolve(Buffer.concat(teile)));
      req.on('error', reject);
    });
  }
  const json = (res, status, daten, kopf = {}) => { const text = JSON.stringify(daten); res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text), ...kopf}); res.end(text); };
  function cors(req) {
    const ursprung = req.headers.origin;
    return ursprung && (k.urspruenge || []).includes(ursprung) ? {'access-control-allow-origin': ursprung, vary: 'origin', 'access-control-allow-headers': 'content-type, x-dateiname', 'access-control-allow-methods': 'GET, POST, OPTIONS'} : {};
  }

  const UNVERAENDERLICH = 'public, max-age=31536000, immutable';
  const KURZ = 'public, max-age=60, stale-while-revalidate=600';

  return async function anfrage(req, res) {
    const url = new URL(req.url, 'http://x');
    const pfad = decodeURIComponent(url.pathname);
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, cors(req)); res.end(); return; }
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (pfad.startsWith('/daten/')) {
          const relativ = pfad.slice(7);
          // Dateien mit Inhalts-Hash im Namen ändern sich nie; Einstiegsdateien werden kurz gehalten.
          return datei(res, req, k.daten, relativ, /\.[0-9a-f]{12}\.\w+$/.test(relativ) ? UNVERAENDERLICH : KURZ);
        }
        if (pfad.startsWith('/app/')) return datei(res, req, k.app, pfad.slice(5), k.appCache || KURZ);
        if (pfad.startsWith('/bild/')) { const ziel = k.speicher.bildPfad(pfad.slice(6)); if (!ziel) throw new Fehler(404, 'nicht_gefunden'); return datei(res, req, path.dirname(ziel), path.basename(ziel), UNVERAENDERLICH); }
        const treffer = /^\/api\/gestaltungen\/([\w-]{6,40})$/.exec(pfad);
        if (treffer) {
          const gestaltung = k.speicher.gestaltungFuerKunde(treffer[1], url.searchParams.get('token'));
          if (!gestaltung) throw new Fehler(404, 'gestaltung_unbekannt', 'Diese Gestaltung kann nicht mehr bearbeitet werden.');
          return json(res, 200, {id: gestaltung.id, rev: gestaltung.rev, zustand: gestaltung.zustand}, cors(req));
        }
        if (pfad === '/zustand') return json(res, 200, {ok: true});
        if (k.zusatz && await k.zusatz(req, res, url, pfad)) return;
        throw new Fehler(404, 'nicht_gefunden');
      }
      if (req.method === 'POST') {
        if (pfad === '/api/gestaltungen') return json(res, 200, gestaltungSpeichern(JSON.parse((await koerper(req, 8e6)).toString('utf8'))), cors(req));
        if (pfad === '/api/uploads') return json(res, 200, uploadAnnehmen(await koerper(req, 30 * 1024 * 1024), req.headers['content-type'], decodeURIComponent(String(req.headers['x-dateiname'] || ''))), cors(req));
        if (pfad === '/webhooks/shopify/orders-paid') return json(res, 200, bestellungAnnehmen(await koerper(req, 4e6), req.headers));
        if (k.zusatz && await k.zusatz(req, res, url, pfad)) return;
      }
      throw new Fehler(405, 'methode');
    } catch (error) {
      const status = error.status || (error instanceof SyntaxError ? 400 : 500);
      if (status >= 500) console.error('[konfi]', error);
      if (!res.headersSent) json(res, status, {code: error.code || 'fehler', ...(error.kundentext ? {kundentext: error.kundentext} : {})}, cors(req));
      else res.destroy();
    }
  };
}
