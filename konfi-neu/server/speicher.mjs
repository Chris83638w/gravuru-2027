// Dauerhafter Speicher: EINE SQLite-Datei mit vier Tabellen und ein Ordner für Dateien.
// Nichts Wichtiges liegt nur im Arbeitsspeicher – ein Neustart des Servers unterbricht keinen Kunden.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');

export function speicherOeffnen(ordner) {
  fs.mkdirSync(path.join(ordner, 'uploads'), {recursive: true});
  fs.mkdirSync(path.join(ordner, 'bilder'), {recursive: true});
  const db = new DatabaseSync(path.join(ordner, 'konfi.sqlite'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    -- Jede gespeicherte Fassung einer Gestaltung ist unveränderlich. Bearbeiten erzeugt die nächste Fassung.
    CREATE TABLE IF NOT EXISTS gestaltungen (
      id TEXT NOT NULL, rev INTEGER NOT NULL, token_hash TEXT NOT NULL,
      produkt TEXT NOT NULL, sku TEXT NOT NULL, zustand TEXT NOT NULL, preis TEXT NOT NULL,
      stand TEXT, bild TEXT, erstellt TEXT NOT NULL,
      PRIMARY KEY (id, rev)
    ) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY, datei TEXT NOT NULL, typ TEXT NOT NULL, name TEXT, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, erstellt TEXT NOT NULL
    ) WITHOUT ROWID;
    -- Jede bezahlte Position landet hier, auch wenn etwas nicht stimmt (status + grund). Nichts wird still übersprungen.
    CREATE TABLE IF NOT EXISTS bestellpositionen (
      shop TEXT NOT NULL, bestellung TEXT NOT NULL, position TEXT NOT NULL,
      bestellnummer TEXT, gestaltung TEXT, rev INTEGER, sku TEXT, menge INTEGER, stueck_cents INTEGER,
      status TEXT NOT NULL, grund TEXT, test INTEGER NOT NULL DEFAULT 0, eingegangen TEXT NOT NULL,
      PRIMARY KEY (shop, bestellung, position)
    ) WITHOUT ROWID;
    CREATE TABLE IF NOT EXISTS ereignisse (
      id TEXT PRIMARY KEY, art TEXT NOT NULL, inhalt_sha256 TEXT NOT NULL, eingegangen TEXT NOT NULL
    ) WITHOUT ROWID;
  `);
  const jetzt = () => new Date().toISOString();
  const q = {
    letzte: db.prepare('SELECT * FROM gestaltungen WHERE id = ? ORDER BY rev DESC LIMIT 1'),
    eine: db.prepare('SELECT * FROM gestaltungen WHERE id = ? AND rev = ?'),
    neu: db.prepare('INSERT INTO gestaltungen (id, rev, token_hash, produkt, sku, zustand, preis, stand, bild, erstellt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    upload: db.prepare('INSERT INTO uploads (id, datei, typ, name, bytes, sha256, erstellt) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    uploadLesen: db.prepare('SELECT * FROM uploads WHERE id = ?'),
    ereignis: db.prepare('INSERT OR IGNORE INTO ereignisse (id, art, inhalt_sha256, eingegangen) VALUES (?, ?, ?, ?)'),
    ereignisLesen: db.prepare('SELECT * FROM ereignisse WHERE id = ?'),
    position: db.prepare(`INSERT INTO bestellpositionen (shop, bestellung, position, bestellnummer, gestaltung, rev, sku, menge, stueck_cents, status, grund, test, eingegangen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (shop, bestellung, position) DO NOTHING`),
    positionen: db.prepare('SELECT * FROM bestellpositionen ORDER BY eingegangen DESC LIMIT ?'),
  };

  function tokenPasst(zeile, token) {
    const a = Buffer.from(zeile.token_hash, 'hex');
    const b = Buffer.from(sha(String(token || '')), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const lesbar = zeile => zeile && {id: zeile.id, rev: zeile.rev, produkt: zeile.produkt, sku: zeile.sku, zustand: JSON.parse(zeile.zustand), preis: JSON.parse(zeile.preis), stand: zeile.stand, bild: zeile.bild, erstellt: zeile.erstellt};

  return {
    db,
    /** Neue Gestaltung oder nächste Fassung einer vorhandenen (nur mit deren Token). */
    gestaltungSpeichern({vorgaenger, produkt, sku, zustand, preis, stand, bildBytes, bildEndung}) {
      let id, rev, token, tokenHash;
      if (vorgaenger) {
        const alt = q.letzte.get(vorgaenger.id);
        if (!alt || !tokenPasst(alt, vorgaenger.token)) return null;
        id = alt.id; rev = alt.rev + 1; token = vorgaenger.token; tokenHash = alt.token_hash;
      } else {
        id = 'g' + randomBytes(9).toString('base64url');
        rev = 1;
        token = randomBytes(18).toString('base64url');
        tokenHash = sha(token);
      }
      let bild = null;
      if (bildBytes) {
        bild = `${id}-${rev}-${sha(bildBytes).slice(0, 10)}.${bildEndung}`;
        fs.writeFileSync(path.join(ordner, 'bilder', bild), bildBytes);
      }
      q.neu.run(id, rev, tokenHash, produkt, sku, JSON.stringify(zustand), JSON.stringify(preis), stand || null, bild, jetzt());
      return {id, rev, token, bild};
    },
    gestaltungFuerKunde(id, token) {
      const zeile = q.letzte.get(id);
      return zeile && tokenPasst(zeile, token) ? lesbar(zeile) : null;
    },
    gestaltung: (id, rev) => lesbar(rev ? q.eine.get(id, rev) : q.letzte.get(id)),
    bildPfad: name => /^[\w-]+\.(webp|jpg|png)$/.test(name) ? path.join(ordner, 'bilder', name) : null,

    uploadSpeichern({bytes, typ, name}) {
      const id = 'u' + randomBytes(12).toString('base64url');
      const endung = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/svg+xml': 'svg'}[typ] || 'bin';
      const datei = `${id}.${endung}`;
      fs.writeFileSync(path.join(ordner, 'uploads', datei), bytes);
      q.upload.run(id, datei, typ, name || null, bytes.length, sha(bytes), jetzt());
      return {id};
    },
    upload: id => q.uploadLesen.get(id) || null,
    uploadsOrdner: path.join(ordner, 'uploads'),
    fertigungOrdner: path.join(ordner, 'fertigung'),

    /** true, wenn das Ereignis neu ist; false bei Wiederholung; wirft bei gleicher Kennung mit anderem Inhalt. */
    ereignisMerken(id, art, inhalt) {
      const hash = sha(inhalt);
      const ergebnis = q.ereignis.run(id, art, hash, jetzt());
      if (ergebnis.changes === 1) return true;
      if (q.ereignisLesen.get(id).inhalt_sha256 !== hash) throw Object.assign(new Error('Ereignis mit gleicher Kennung, aber anderem Inhalt'), {status: 409});
      return false;
    },
    positionSpeichern(p) {
      q.position.run(p.shop, p.bestellung, p.position, p.bestellnummer || null, p.gestaltung || null, p.rev || null, p.sku || null, p.menge || null, p.stueckCents ?? null, p.status, p.grund || null, p.test ? 1 : 0, jetzt());
    },
    positionen: (grenze = 200) => q.positionen.all(grenze),
    schliessen: () => db.close(),
  };
}
