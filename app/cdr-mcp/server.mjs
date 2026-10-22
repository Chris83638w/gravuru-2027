// CDR-Werkzeuge als MCP-Server (Streamable HTTP, zustandslos) für ChatGPT (Entwicklermodus/Apps) und Claude.
// Keine npm-Abhängigkeiten. Die Arbeit macht cdr_engine.py (libcdr); dieser Server lädt die Datei,
// begrenzt Größe/Zeit/Parallelität und übersetzt Ergebnisse in MCP-Antworten.
//
//   node app/cdr-mcp/server.mjs                      (Konfiguration aus Umgebung oder --config=<json>)
//
// Konfiguration (Umgebung oder JSON-Datei {"values": {...}}):
//   CDR_MCP_TOKEN    geheimer Pfadteil, ≥ 32 Zeichen → Endpunkt https://<host>/mcp/<token>
//   CDR_MCP_TOKEN_FILE  ohne CDR_MCP_TOKEN: Token aus dieser Datei, beim ersten Start dort erzeugt (Rechte 600)
//   CDR_MCP_ORIGIN   öffentliche Adresse ohne / am Ende (für Download-Links), z. B. https://cdr.example.de
//   CDR_MCP_PYTHON   Python 3.10+ (Standard: python3)
//   CDR2RAW          Pfad zu cdr2raw (Standard: cdr2raw bzw. ./vendor/libcdr/cdr2raw)
//   CDR_MCP_DATA     Arbeitsordner für Downloads/Ergebnisse (Standard: Systemtemp)
//   CDR_MCP_MAX_MB   größte Eingabedatei (Standard 200)
//   PORT / CDR_MCP_HOST   Standard 8975 / 127.0.0.1 (Plesk/Passenger setzt PORT selbst)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import dns from 'node:dns';
import https from 'node:https';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceError, sourceConfig, sourceStatus, listSource, snapshotSource } from './source.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '1.1.0';
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_TEXT = 120_000;           // größte Textantwort an das Modell (Zeichen); Rest als Download
const KEEP_MS = 24 * 3600_000;      // Downloads/Ergebnisse 24 h
const CACHE_MS = 30 * 60_000;       // geladene CDR 30 min (mehrere Werkzeuge auf dieselbe Datei)

export function loadConfig(argv = process.argv.slice(2), env = process.env, defaults = {}) {
  const arg = argv.find((a) => a.startsWith('--config='));
  let file = {};
  const cfgPath = arg ? arg.slice(9) : env.CDR_MCP_CONFIG;
  if (cfgPath) file = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).values || {};
  const v = (k, d) => (env[k] ?? file[k] ?? defaults[k] ?? d);
  const vendored = path.join(HERE, 'vendor', 'libcdr', 'cdr2raw');
  const cfg = {
    ...sourceConfig(v),
    token: String(v('CDR_MCP_TOKEN', '')),
    origin: String(v('CDR_MCP_ORIGIN', '')).replace(/\/+$/, ''),
    python: String(v('CDR_MCP_PYTHON', 'python3')),
    cdr2raw: String(v('CDR2RAW', fs.existsSync(vendored) ? vendored : 'cdr2raw')),
    data: String(v('CDR_MCP_DATA', path.join(os.tmpdir(), 'gravuru-cdr-mcp'))),
    maxBytes: Number(v('CDR_MCP_MAX_MB', 200)) * 1024 * 1024,
    port: Number(v('PORT', 8975)),
    host: String(v('CDR_MCP_HOST', '127.0.0.1')),
    allowPrivate: v('CDR_MCP_ALLOW_PRIVATE_URLS', '') === '1',   // nur für lokale Tests
    jobs: Number(v('CDR_MCP_JOBS', 2)),
    memMb: Number(v('CDR_MCP_MEM_MB', 3072)),        // Speichergrenze je Auswertung
    diskBytes: Number(v('CDR_MCP_DISK_MB', 3072)) * 1024 * 1024,  // Gesamtgrenze Zwischenspeicher
  };
  // Ohne gesetztes Token: aus privater Datei lesen bzw. beim ersten Start selbst erzeugen (niemand muss es abtippen)
  const tokenFile = String(v('CDR_MCP_TOKEN_FILE', ''));
  if (!cfg.token && tokenFile) {
    try { cfg.token = fs.readFileSync(tokenFile, 'utf8').trim(); }
    catch (e) {
      if (e.code !== 'ENOENT') throw e;
      cfg.token = randomBytes(30).toString('base64url').replace(/[-_]/g, 'x');
      fs.mkdirSync(path.dirname(tokenFile), { recursive: true, mode: 0o700 });
      fs.writeFileSync(tokenFile, cfg.token + '\n', { mode: 0o600, flag: 'wx' });
    }
  }
  if (cfg.token.length < 32 || !/^[A-Za-z0-9_-]+$/.test(cfg.token)) throw new Error('CDR_MCP_TOKEN fehlt oder ist zu kurz (mindestens 32 Zeichen, nur A–Z, a–z, 0–9, _ und -)');
  return cfg;
}

// ------------------------------------------------------------------ Werkzeuge

const FILE_SCHEMA = {
  type: 'object',
  description: 'Die in ChatGPT hochgeladene .cdr-Datei (wird von ChatGPT automatisch ausgefüllt).',
  properties: { download_url: { type: 'string' }, file_id: { type: 'string' }, mime_type: { type: 'string' }, file_name: { type: 'string' } },
  required: ['download_url', 'file_id'],
  additionalProperties: false,
};
const COMMON = {
  file: FILE_SCHEMA,
  url: { type: 'string', description: 'Alternative zu file: öffentliche https-Adresse einer .cdr-Datei (z. B. für Claude).' },
  server_path: { type: 'string', description: 'Alternative zu file/url: CDR-Pfad im eingerichteten Produktordner, relativ oder mit freigegebenem V:\\Produkte-/UNC-Präfix. Zuerst cdr_source_status prüfen. Genau eine Quelle angeben.' },
  page: { type: 'integer', minimum: 1, description: 'Seite (ab 1). Ohne Angabe: alle Seiten bzw. Seite 1.' },
};
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true };

export const TOOLS = [
  {
    name: 'cdr_info',
    title: 'CDR: Überblick',
    description: 'Überblick über eine CorelDRAW-Datei (.cdr) ohne CorelDRAW: Seiten mit Maß in mm, Anzahl Pfade/Texte/Bitmaps, verwendete Schriften. Zuerst aufrufen, wenn unklar ist, was in der Datei steckt.',
    inputSchema: { type: 'object', properties: { file: COMMON.file, url: COMMON.url, server_path: COMMON.server_path }, additionalProperties: false },
    cmd: 'info',
  },
  {
    name: 'cdr_measure',
    title: 'CDR: Platten und Bohrlöcher ausmessen',
    description: 'Misst eine .cdr 1:1 in mm aus: jede Platte/Form (Rechteck, Quadrat, Rechteck mit runden Ecken inkl. Eckenradius, Kreis, Oval, Freiform; auch aus einzelnen Schnittlinien gebildete Rechtecke) mit Breite, Höhe, Lage, Linienfarbe; je Platte die Bohrlöcher (Mittelpunkt relativ zur linken oberen Plattenecke, Durchmesser, Abstand zu allen vier Kanten, bei Freiformen Abstand zur Kontur) und Lochabstände Mitte–Mitte; Texte auf der Platte; Größenübersicht. Für Maß-, Bohrbild- und Größenvergleiche.',
    inputSchema: { type: 'object', properties: { ...COMMON, max_plates: { type: 'integer', minimum: 1, maximum: 2000, description: 'Höchstzahl Platten je Seite in der Antwort (Standard 400).' } }, additionalProperties: false },
    cmd: 'measure',
  },
  {
    name: 'cdr_texts',
    title: 'CDR: Texte und Schriften auslesen',
    description: 'Liest alle Texte einer .cdr aus: Inhalt, Schriftname, Schriftgröße (pt, ungefähre Versalhöhe in mm), Farbe, Ausrichtung, Lage in mm; dazu die Schriftenliste mit Häufigkeit.',
    inputSchema: { type: 'object', properties: { ...COMMON, max_texts: { type: 'integer', minimum: 1, maximum: 5000, description: 'Höchstzahl Texte in der Antwort (Standard 2000).' } }, additionalProperties: false },
    cmd: 'texts',
  },
  {
    name: 'cdr_to_svg',
    title: 'CDR: in SVG umwandeln',
    description: 'Wandelt eine Seite der .cdr in eine SVG im Maßstab 1:1 (Einheit mm) um – Pfade, Linienfarben, Texte bleiben Text. Liefert einen Download-Link (24 h gültig) und bei kleinen Dateien den SVG-Text.',
    inputSchema: { type: 'object', properties: COMMON, additionalProperties: false },
    cmd: 'svg',
  },
  {
    name: 'cdr_preview',
    title: 'CDR: Vorschaubild',
    description: 'Zeichnet eine Seite der .cdr als PNG-Vorschau (zum Ansehen/Prüfen der Lage). Schriften, die auf dem Server fehlen, erscheinen als Ersatzschrift; Bitmaps als gestrichelte Rahmen.',
    inputSchema: { type: 'object', properties: { ...COMMON, pixels: { type: 'integer', minimum: 300, maximum: 2400, description: 'Längste Bildseite in Pixel (Standard 1600).' } }, additionalProperties: false },
    cmd: 'png',
  },
  {
    name: 'cdr_source_status', title: 'CDR: Produktordner prüfen',
    description: 'Prüft, ob der Betreiber einen Produktordner auf dem Plesk-Server eingerichtet hat und der App-Benutzer ihn lesen kann. Ein leerer Mountpunkt belegt noch keine Verbindung zum Dateiserver. Keine Zugangsdaten erforderlich.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }, cmd: 'source_status',
  },
  {
    name: 'cdr_list_files', title: 'CDR: Ordner und Designbögen auflisten',
    description: 'Listet Unterordner und .cdr-Dateien im eingerichteten Produktordner. Genau eine Ordnerebene; mit offset fortsetzen. Die zurückgegebenen server_path-Werte direkt an cdr_texts, cdr_measure usw. übergeben. Nur lesender Zugriff.',
    inputSchema: { type: 'object', properties: {
      server_path: { type: 'string', description: 'Ordner relativ zum Produktordner oder mit freigegebenem V:\\Produkte-/UNC-Präfix. Leer = Wurzel.' },
      offset: { type: 'integer', minimum: 0, maximum: 10000 },
      limit: { type: 'integer', minimum: 1, maximum: 200 },
    }, additionalProperties: false }, cmd: 'source_list',
  },
];

function toolList() {
  return TOOLS.map(({ cmd, ...t }) => ({ ...t, annotations: READ_ONLY, _meta: { ...(t.inputSchema.properties.file ? { 'openai/fileParams': ['file'] } : {}), 'openai/toolInvocation/invoking': 'Lese CDR …', 'openai/toolInvocation/invoked': 'CDR gelesen' } }));
}

// ------------------------------------------------------------------ Hilfen

class ToolError extends Error {}

// Nur öffentliche Unicast-Adressen sind als Download-Ziel erlaubt (Schutz vor Zugriff auf interne Dienste)
// getrennte Listen: Node prüft IPv4 sonst auch gegen ::ffff:0:0/96
const BLOCKED = new net.BlockList();
const BLOCKED6 = new net.BlockList();
for (const [a, p] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]]) BLOCKED.addSubnet(a, p, 'ipv4');
for (const [a, p] of [['::', 96], ['::ffff:0:0', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8]]) BLOCKED6.addSubnet(a, p, 'ipv6');

export function isPrivateIp(ip) {
  const s = String(ip).toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIPv4(s)) return BLOCKED.check(s, 'ipv4');
  if (!net.isIPv6(s)) return true;
  // IPv4 in IPv6 (::ffff:a.b.c.d oder ::ffff:7f00:1) → als IPv4 prüfen; alles in ::/96 und ::ffff:0:0/96 ist ohnehin gesperrt
  const m = /^::ffff:/.test(s) || /^0{0,4}(:0{0,4}){4}:ffff:/.test(s);
  if (m) return true; // gemappte IPv4 (::ffff:…) nie zulassen – ein echter Server liefert sie nicht
  return BLOCKED6.check(s, 'ipv6');
}

function checkUrl(u, cfg) {
  let url;
  try { url = new URL(u); } catch { throw new ToolError('Adresse der Datei ist ungültig'); }
  if (url.protocol !== 'https:' && !(cfg.allowPrivate && url.protocol === 'http:')) throw new ToolError('Nur https-Adressen sind erlaubt');
  if (url.username || url.password) throw new ToolError('Adressen mit Zugangsdaten sind nicht erlaubt');
  if (!cfg.allowPrivate) {
    if (url.port && url.port !== '443') throw new ToolError('Nur der Standard-Port 443 ist erlaubt');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(host) && isPrivateIp(host)) throw new ToolError('Interne Adressen sind nicht erlaubt');
  }
  return url;
}

// DNS-Auflösung genau einmal je Verbindung: geprüft wird dieselbe Adresse, mit der verbunden wird (kein DNS-Rebinding)
function safeLookup(cfg) {
  return (hostname, options, cb) => {
    dns.lookup(hostname, { all: true }, (err, addrs) => {
      if (err) return cb(new ToolError('Server der Datei nicht erreichbar'));
      const ok = cfg.allowPrivate ? addrs : addrs.filter((a) => !isPrivateIp(a.address));
      if (!ok.length) return cb(new ToolError('Interne Adressen sind nicht erlaubt'));
      if (options && options.all) return cb(null, ok);
      cb(null, ok[0].address, ok[0].family);
    });
  };
}

function getOnce(url, cfg, signal) {
  const mod = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(url, { method: 'GET', lookup: safeLookup(cfg), signal, headers: { 'user-agent': `gravuru-cdr-mcp/${VERSION}`, accept: '*/*' } }, resolve);
    req.on('error', reject);
    req.end();
  });
}

const MB = (n) => `${Math.round(n / 1048576)} MB`;

async function download(u, dest, cfg) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 120_000);
  try {
    let url = checkUrl(u, cfg);
    let res;
    for (let hop = 0; ; hop++) {
      res = await getOnce(url, cfg, ctl.signal);
      if (![301, 302, 303, 307, 308].includes(res.statusCode)) break;
      res.resume();
      if (hop >= 3) throw new ToolError('Zu viele Weiterleitungen');
      url = checkUrl(new URL(res.headers.location || '', url).toString(), cfg);
    }
    if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); throw new ToolError('Datei nicht abrufbar'); }
    if (Number(res.headers['content-length'] || 0) > cfg.maxBytes) { res.resume(); throw new ToolError(`Datei ist größer als ${MB(cfg.maxBytes)}`); }
    let n = 0; let head = null;
    const count = new Transform({
      transform(chunk, _enc, done) {
        n += chunk.length;
        if (!head) head = Buffer.from(chunk.subarray(0, 8));
        if (n > cfg.maxBytes) return done(new ToolError(`Datei ist größer als ${MB(cfg.maxBytes)}`));
        done(null, chunk);
      },
    });
    await pipeline(res, count, fs.createWriteStream(dest, { mode: 0o600 }));
    const sig = head || Buffer.alloc(0);
    // CDR ab X4 = ZIP (PK), ältere = RIFF
    if (!(sig[0] === 0x50 && sig[1] === 0x4b) && sig.toString('latin1', 0, 4) !== 'RIFF') throw new ToolError('Das ist keine CorelDRAW-Datei (.cdr)');
    return n;
  } catch (e) {
    if (e instanceof ToolError) throw e;
    if (e.name === 'AbortError' || ctl.signal.aborted) throw new ToolError('Download dauerte zu lange');
    if (e.code === 'ENOSPC') throw new ToolError('Server-Speicher voll – bitte später erneut');
    throw new ToolError('Datei nicht abrufbar');
  } finally { clearTimeout(timer); }
}

function runEngine(cfg, args, timeoutMs = 170_000) {
  return new Promise((resolve, reject) => {
    // eigene Prozessgruppe: bei Zeitüberschreitung werden Python und cdr2raw gemeinsam beendet
    const p = spawn(cfg.python, ['-I', path.join(HERE, 'cdr_engine.py'), ...args], {
      env: { PATH: process.env.PATH || '/usr/bin:/bin', CDR2RAW: cfg.cdr2raw, CDR_TIMEOUT_S: '120', CDR_MEM_MB: String(cfg.memMb), HOME: cfg.data, LANG: 'C.UTF-8', ...(process.env.FONTCONFIG_FILE ? { FONTCONFIG_FILE: process.env.FONTCONFIG_FILE } : {}) },
      stdio: ['ignore', 'pipe', 'pipe'], detached: true,
    });
    const out = []; let outLen = 0; const err = [];
    const kill = () => { try { process.kill(-p.pid, 'SIGKILL'); } catch { try { p.kill('SIGKILL'); } catch {} } };
    const t = setTimeout(() => { kill(); reject(new ToolError('Auswertung dauerte zu lange')); }, timeoutMs);
    p.stdout.on('data', (d) => { outLen += d.length; if (outLen > 64 * 1048576) { kill(); return; } out.push(d); });
    p.stderr.on('data', (d) => { if (err.length < 50) err.push(d); });
    p.on('error', () => { clearTimeout(t); reject(new ToolError('Auswertung auf dem Server nicht startbar')); });
    p.on('close', () => {
      clearTimeout(t);
      if (outLen > 64 * 1048576) return reject(new ToolError('Ergebnis zu groß'));
      const txt = Buffer.concat(out).toString('utf8').trim();
      let json; try { json = JSON.parse(txt); } catch { return reject(new Error('Engine-Ausgabe unlesbar: ' + Buffer.concat(err).toString('utf8').slice(-400))); }
      if (json.error) return reject(new ToolError(json.error));
      resolve(json);
    });
  });
}

function limiter(n) {
  let active = 0; const q = [];
  const next = () => { if (active >= n || !q.length) return; active++; const { fn, res, rej } = q.shift(); fn().then(res, rej).finally(() => { active--; next(); }); };
  return (fn) => {
    if (q.length >= 8) return Promise.reject(new ToolError('Server ist gerade ausgelastet – bitte gleich noch einmal'));
    return new Promise((res, rej) => { q.push({ fn, res, rej }); next(); });
  };
}

// ------------------------------------------------------------------ Server

export function createCdrServer(cfg) {
  fs.mkdirSync(path.join(cfg.data, 'in'), { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(cfg.data, 'out'), { recursive: true, mode: 0o700 });
  const limit = limiter(cfg.jobs);
  const cache = new Map(); // key → {file, at}
  const activeSources = new Set(); // lokale Lesekopien während Übertragung/Auswertung
  const tokenBuf = Buffer.from(cfg.token);

  async function cleanup() {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.at > CACHE_MS) { cache.delete(k); fsp.rm(v.file, { force: true }).catch(() => {}); }
    // Eingänge (auch nach Neustart verwaiste) nach Alter löschen, danach Gesamtgröße begrenzen (älteste zuerst)
    const inDir = path.join(cfg.data, 'in'); const keep = [];
    for (const d of await fsp.readdir(inDir).catch(() => [])) {
      const p = path.join(inDir, d); const st = await fsp.stat(p).catch(() => null);
      if (!st) continue;
      if (activeSources.has(p)) continue;
      const inUse = [...cache.values()].some((v) => v.file === p);
      if (!inUse && now - st.mtimeMs > CACHE_MS) await fsp.rm(p, { force: true }).catch(() => {});
      else keep.push({ p, size: st.size, t: st.mtimeMs });
    }
    let total = keep.reduce((a, b) => a + b.size, 0);
    for (const f of keep.sort((a, b) => a.t - b.t)) {
      if (total <= cfg.diskBytes) break;
      await fsp.rm(f.p, { force: true }).catch(() => {}); total -= f.size;
      for (const [k, v] of cache) if (v.file === f.p) cache.delete(k);
    }
    for (const d of await fsp.readdir(path.join(cfg.data, 'out')).catch(() => [])) {
      const p = path.join(cfg.data, 'out', d);
      const st = await fsp.stat(p).catch(() => null);
      if (st && now - st.mtimeMs > KEEP_MS) await fsp.rm(p, { recursive: true, force: true }).catch(() => {});
    }
  }
  let lastSweep = 0;
  const sweepSoon = () => { if (Date.now() - lastSweep > 60_000) { lastSweep = Date.now(); cleanup().catch(() => {}); } };
  sweepSoon();
  const sweeper = setInterval(() => cleanup().catch(() => {}), 10 * 60_000); sweeper.unref();

  async function fetchInput(args) {
    const sources = ['file', 'url', 'server_path'].filter((k) => args[k] != null);
    if (sources.length > 1) throw new ToolError('Genau eine Quelle angeben: file, url oder server_path');
    if (sources[0] === 'server_path') return snapshotSource(cfg, args.server_path, activeSources);
    const f = args.file;
    const src = f && typeof f === 'object' ? f.download_url : args.url;
    if (!src || typeof src !== 'string') throw new ToolError('Keine Datei: .cdr hochladen (file), https-Adresse (url) oder eingerichteten Serverpfad (server_path) angeben');
    const key = createHash('sha256').update(f?.file_id ? 'id:' + f.file_id : 'url:' + src).digest('hex').slice(0, 32);
    const hit = cache.get(key);
    if (hit && fs.existsSync(hit.file)) { hit.at = Date.now(); return { file: hit.file, name: f?.file_name || path.basename(new URL(src).pathname) || 'datei.cdr', cached: true }; }
    const file = path.join(cfg.data, 'in', key + '.cdr');
    const tmp = file + '.' + randomBytes(4).toString('hex');
    try { await download(src, tmp, cfg); await fsp.rename(tmp, file); }
    catch (e) { await fsp.rm(tmp, { force: true }).catch(() => {}); throw e; }
    cache.set(key, { file, at: Date.now() });
    let name = f?.file_name; try { name ||= decodeURIComponent(path.basename(new URL(src).pathname)); } catch {}
    return { file, name: name || 'datei.cdr', cached: false };
  }

  function publish(id, name, origin) { const o = cfg.origin || origin; return o ? `${o}/dl/${id}/${encodeURIComponent(name)}` : null; }

  async function storeOut(name, data, origin) {
    const id = randomBytes(18).toString('base64url');
    const dir = path.join(cfg.data, 'out', id);
    await fsp.mkdir(dir, { mode: 0o700 });
    await fsp.writeFile(path.join(dir, name), data);
    return { id, url: publish(id, name, origin) };
  }

  function shrink(res, cmd) {
    // Antwort für das Modell begrenzen: lange Listen kürzen, vollständiges Ergebnis als Download
    let txt = JSON.stringify(res);
    if (txt.length <= MAX_TEXT) return { res, full: null };
    const copy = structuredClone(res);
    const lists = cmd === 'texts' ? [copy.texte] : (copy.seiten || []).map((s) => s.platten).filter(Boolean);
    while (JSON.stringify(copy).length > MAX_TEXT) {
      const longest = lists.reduce((a, b) => (b && b.length > (a?.length || 0) ? b : a), null);
      if (!longest || longest.length <= 5) break;
      longest.length = Math.floor(longest.length * 0.7);
    }
    copy.gekuerztFuerAntwort = true;
    return { res: copy, full: txt };
  }

  async function callTool(name, args = {}, origin = null) {
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) throw new RpcError(-32602, `Unbekanntes Werkzeug: ${name}`);
    const posInt = (k, max) => { if (args[k] != null && (!Number.isInteger(args[k]) || args[k] < 1 || args[k] > max)) throw new ToolError(`${k} muss eine ganze Zahl von 1 bis ${max} sein`); };
    posInt('page', 9999); posInt('max_plates', 2000); posInt('max_texts', 5000); posInt('pixels', 2400);
    if (args.file != null && (typeof args.file !== 'object' || typeof args.file.download_url !== 'string' || (args.file.file_name != null && typeof args.file.file_name !== 'string'))) throw new ToolError('file ist ungültig');
    if (args.url != null && typeof args.url !== 'string') throw new ToolError('url muss eine Zeichenkette sein');
    if (args.server_path != null && typeof args.server_path !== 'string') throw new ToolError('server_path muss eine Zeichenkette sein');
    sweepSoon();
    return limit(async () => {
      if (tool.cmd === 'source_status' || tool.cmd === 'source_list') {
        const result = tool.cmd === 'source_status' ? await sourceStatus(cfg) : await listSource(cfg, args);
        return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false };
      }
      const t0 = Date.now();
      const input = await fetchInput(args);
      let base = input.name.replace(/\.cdr$/i, '').replace(/[^\p{L}\p{N} ._-]+/gu, '_').replace(/^[.\s]+/, '');
      while (Buffer.byteLength(base) > 120) base = base.slice(0, -1);
      base ||= 'datei';
      const ea = [tool.cmd, input.file];
      if (args.page) ea.push('--page', String(args.page));
      if (tool.cmd === 'measure' && args.max_plates) ea.push('--max', String(args.max_plates));
      if (tool.cmd === 'texts' && args.max_texts) ea.push('--max', String(args.max_texts));
      let outFile = null;
      if (tool.cmd === 'svg' || tool.cmd === 'png') {
        outFile = path.join(cfg.data, 'out', randomBytes(9).toString('hex') + (tool.cmd === 'svg' ? '.svg' : '.png'));
        ea.push('--out', outFile);
        if (tool.cmd === 'png') ea.push('--px', String(Math.max(300, args.pixels || 1600)));
      }
      try {
        const res = await runEngine(cfg, ea);
        res.datei = input.name;
        if (input.source) res.quelle = input.source;
        const content = [];
        if (tool.cmd === 'svg') {
          const svg = await fsp.readFile(outFile);
          const st = await storeOut(`${base}-seite-${res.seite}.svg`, svg, origin);
          res.download = st.url;

          content.push({ type: 'text', text: JSON.stringify(res) });
          if (svg.length <= 60_000) content.push({ type: 'text', text: svg.toString('utf8') });
        } else if (tool.cmd === 'png') {
          const png = await fsp.readFile(outFile);
          const st = await storeOut(`${base}-seite-${res.seite}.png`, png, origin);
          res.download = st.url;
          content.push({ type: 'image', data: png.toString('base64'), mimeType: 'image/png' });
          content.push({ type: 'text', text: JSON.stringify(res) });
        } else {
          const { res: small, full } = shrink(res, tool.cmd);
          if (full) { const st = await storeOut(`${base}-${tool.cmd}.json`, full, origin); small.vollstaendigesErgebnis = st.url; }
          content.push({ type: 'text', text: JSON.stringify(small) });
          log({ tool: name, ms: Date.now() - t0, cached: input.cached });
          return { content, structuredContent: small, isError: false };
        }
        log({ tool: name, ms: Date.now() - t0, cached: input.cached });
        return { content, structuredContent: res, isError: false };
      } finally {
        if (outFile) fsp.rm(outFile, { force: true }).catch(() => {});
        if (input.temporary) {
          await fsp.rm(input.file, { force: true }).catch(() => {});
          activeSources.delete(input.file);
        }
      }
    });
  }

  async function handleRpc(msg, origin) {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcErr(msg?.id ?? null, -32600, 'Ungültige Anfrage');
    const isNote = msg.id === undefined;
    try {
      let result;
      switch (msg.method) {
        case 'initialize': {
          const want = msg.params?.protocolVersion;
          result = {
            protocolVersion: PROTOCOLS.includes(want) ? want : PROTOCOLS[0],
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'gravuru-cdr', title: 'gravuru CDR-Werkzeuge', version: VERSION },
            instructions: 'Werkzeuge für CorelDRAW-Dateien (.cdr) ohne CorelDRAW. Maße immer in mm, 1:1 aus der Datei. Für Serverdateien erst cdr_source_status, dann cdr_list_files oder den bekannten server_path verwenden. Für Plattengrößen und Bohrbilder cdr_measure, für Texte/Schriften und D-Nummern cdr_texts, zum Ansehen cdr_preview, zum Weiterverarbeiten cdr_to_svg. Werte nicht runden oder „vereinheitlichen“; was die Datei nicht enthält, als unbekannt nennen.',
          };
          break;
        }
        case 'ping': result = {}; break;
        case 'tools/list': result = { tools: toolList() }; break;
        case 'tools/call':
          try { result = await callTool(msg.params?.name, msg.params?.arguments || {}, origin); }
          catch (e) {
            if (e instanceof RpcError) throw e;
            const known = e instanceof ToolError || e instanceof SourceError;
            const text = known ? e.message : 'Interner Fehler beim Lesen der Datei';
            if (!known) log({ error: String(e?.stack || e).slice(0, 500) });
            result = { content: [{ type: 'text', text }], isError: true };
          }
          break;
        case 'resources/list': result = { resources: [] }; break;
        case 'prompts/list': result = { prompts: [] }; break;
        default:
          if (msg.method.startsWith('notifications/')) return null;
          throw new RpcError(-32601, `Methode nicht unterstützt: ${msg.method}`);
      }
      return isNote ? null : { jsonrpc: '2.0', id: msg.id, result };
    } catch (e) {
      if (e instanceof RpcError) return isNote ? null : rpcErr(msg.id, e.code, e.message);
      log({ error: String(e?.stack || e).slice(0, 500) });
      return isNote ? null : rpcErr(msg.id, -32603, 'Interner Fehler');
    }
  }

  function tokenOk(t) {
    const b = Buffer.from(t || '');
    return b.length === tokenBuf.length && timingSafeEqual(b, tokenBuf);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (code, body, type = 'application/json; charset=utf-8', extra = {}) => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra });
      res.end(body);
    };
    try {
      if (url.pathname === '/health') return send(200, JSON.stringify({ ok: true, version: VERSION }));
      const dl = url.pathname.match(/^\/dl\/([A-Za-z0-9_-]{24})\/([^/]+)$/);
      if (dl && req.method === 'GET') {
        let name; try { name = decodeURIComponent(dl[2]); } catch { return send(404, '{}'); }
        if (name.includes('/') || name.includes('\\') || name.startsWith('.')) return send(404, '{}');
        const p = path.join(cfg.data, 'out', dl[1], name);
        const st = await fsp.stat(p).catch(() => null);
        if (!st || Date.now() - st.mtimeMs > KEEP_MS) return send(404, JSON.stringify({ error: 'nicht (mehr) vorhanden' }));
        const type = name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.png') ? 'image/png' : 'application/json; charset=utf-8';
        res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff',
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" });
        return pipeline(fs.createReadStream(p), res).catch(() => res.destroy());
      }
      const m = url.pathname.match(/^\/mcp\/([^/]+)\/?$/);
      if (!m || !tokenOk(m[1])) return send(404, JSON.stringify({ error: 'nicht gefunden' }));
      if (req.method === 'GET') return send(405, JSON.stringify({ error: 'kein SSE-Strom – nur POST' }), undefined, { allow: 'POST' });
      if (req.method === 'DELETE') return send(200, '{}');
      if (req.method !== 'POST') return send(405, '{}', undefined, { allow: 'POST' });
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 2_000_000) return send(413, JSON.stringify(rpcErr(null, -32600, 'Anfrage zu groß'))); chunks.push(c); }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, JSON.stringify(rpcErr(null, -32700, 'JSON unlesbar'))); }
      // Download-Links: feste Adresse aus der Konfiguration, sonst der aufgerufene Host (hinter Plesk immer https)
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
      const origin = /^[a-z0-9.-]+(:\d+)?$/.test(host) ? `https://${host}` : null;
      if (Array.isArray(body)) {
        const out = (await Promise.all(body.map((m) => handleRpc(m, origin)))).filter(Boolean);
        return out.length ? send(200, JSON.stringify(out)) : send(202, '');
      }
      const out = await handleRpc(body, origin);
      return out ? send(200, JSON.stringify(out)) : send(202, '');
    } catch (e) {
      log({ error: String(e?.stack || e).slice(0, 500) });
      if (!res.headersSent) send(500, JSON.stringify({ error: 'intern' }));
    }
  });
  server.requestTimeout = 300_000;
  server.on('close', () => clearInterval(sweeper));
  return server;
}

class RpcError extends Error { constructor(code, message) { super(message); this.code = code; } }
function rpcErr(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }
function log(o) { if (process.env.CDR_MCP_QUIET !== '1') console.log(JSON.stringify({ t: new Date().toISOString(), ...o })); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cfg = loadConfig();
  const server = createCdrServer(cfg);
  server.listen(cfg.port, cfg.host, () => console.log(`gravuru-cdr-mcp ${VERSION} auf ${cfg.host}:${cfg.port} (Endpunkt /mcp/<token>)`));
}
