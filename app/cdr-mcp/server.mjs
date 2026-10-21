// CDR-Werkzeuge als MCP-Server (Streamable HTTP, zustandslos) für ChatGPT (Entwicklermodus/Apps) und Claude.
// Keine npm-Abhängigkeiten. Die Arbeit macht cdr_engine.py (libcdr); dieser Server lädt die Datei,
// begrenzt Größe/Zeit/Parallelität und übersetzt Ergebnisse in MCP-Antworten.
//
//   node app/cdr-mcp/server.mjs                      (Konfiguration aus Umgebung oder --config=<json>)
//
// Konfiguration (Umgebung oder JSON-Datei {"values": {...}}):
//   CDR_MCP_TOKEN    geheimer Pfadteil, ≥ 32 Zeichen → Endpunkt https://<host>/mcp/<token>
//   CDR_MCP_ORIGIN   öffentliche Adresse ohne / am Ende (für Download-Links), z. B. https://cdr.example.de
//   CDR_MCP_PYTHON   Python 3.10+ (Standard: python3)
//   CDR2RAW          Pfad zu cdr2raw (Standard: cdr2raw bzw. ./vendor/libcdr/cdr2raw)
//   CDR_MCP_DATA     Arbeitsordner für Downloads/Ergebnisse (Standard: Systemtemp)
//   CDR_MCP_MAX_MB   größte Eingabedatei (Standard 200)
//   PORT / CDR_MCP_HOST   Standard 8975 / 127.0.0.1 (Plesk/Passenger setzt PORT selbst)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '1.0.0';
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_TEXT = 120_000;           // größte Textantwort an das Modell (Zeichen); Rest als Download
const KEEP_MS = 24 * 3600_000;      // Downloads/Ergebnisse 24 h
const CACHE_MS = 30 * 60_000;       // geladene CDR 30 min (mehrere Werkzeuge auf dieselbe Datei)

export function loadConfig(argv = process.argv.slice(2), env = process.env) {
  const arg = argv.find((a) => a.startsWith('--config='));
  let file = {};
  const cfgPath = arg ? arg.slice(9) : env.CDR_MCP_CONFIG;
  if (cfgPath) file = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).values || {};
  const v = (k, d) => (env[k] ?? file[k] ?? d);
  const vendored = path.join(HERE, 'vendor', 'libcdr', 'cdr2raw');
  const cfg = {
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
  };
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
  page: { type: 'integer', minimum: 1, description: 'Seite (ab 1). Ohne Angabe: alle Seiten bzw. Seite 1.' },
};
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true };

export const TOOLS = [
  {
    name: 'cdr_info',
    title: 'CDR: Überblick',
    description: 'Überblick über eine CorelDRAW-Datei (.cdr) ohne CorelDRAW: Seiten mit Maß in mm, Anzahl Pfade/Texte/Bitmaps, verwendete Schriften. Zuerst aufrufen, wenn unklar ist, was in der Datei steckt.',
    inputSchema: { type: 'object', properties: { file: COMMON.file, url: COMMON.url }, additionalProperties: false },
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
];

function toolList() {
  return TOOLS.map(({ cmd, ...t }) => ({ ...t, annotations: READ_ONLY, _meta: { 'openai/fileParams': ['file'], 'openai/toolInvocation/invoking': 'Lese CDR …', 'openai/toolInvocation/invoked': 'CDR gelesen' } }));
}

// ------------------------------------------------------------------ Hilfen

class ToolError extends Error {}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = ip.toLowerCase();
  if (s.startsWith('::ffff:')) return isPrivateIp(s.slice(7));
  return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb') || s.startsWith('ff');
}

async function checkUrl(u, cfg) {
  let url;
  try { url = new URL(u); } catch { throw new ToolError('Adresse der Datei ist ungültig'); }
  if (url.protocol !== 'https:' && !(cfg.allowPrivate && url.protocol === 'http:')) throw new ToolError('Nur https-Adressen sind erlaubt');
  if (url.username || url.password) throw new ToolError('Adressen mit Zugangsdaten sind nicht erlaubt');
  if (!cfg.allowPrivate) {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw new ToolError('Server der Datei nicht erreichbar'); });
    if (addrs.some((a) => isPrivateIp(a.address))) throw new ToolError('Interne Adressen sind nicht erlaubt');
  }
  return url;
}

async function download(u, dest, cfg, redirects = 3) {
  const url = await checkUrl(u, cfg);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 120_000);
  try {
    const res = await fetch(url, { redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': `gravuru-cdr-mcp/${VERSION}` } });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      if (!redirects) throw new ToolError('Zu viele Weiterleitungen');
      const next = new URL(res.headers.get('location') || '', url).toString();
      return download(next, dest, cfg, redirects - 1);
    }
    if (!res.ok) throw new ToolError(`Datei nicht abrufbar (HTTP ${res.status})`);
    const len = Number(res.headers.get('content-length') || 0);
    if (len > cfg.maxBytes) throw new ToolError(`Datei ist größer als ${cfg.maxBytes / 1048576} MB`);
    const out = fs.createWriteStream(dest);
    let n = 0; const head = [];
    for await (const chunk of res.body) {
      n += chunk.length;
      if (n > cfg.maxBytes) { out.destroy(); throw new ToolError(`Datei ist größer als ${cfg.maxBytes / 1048576} MB`); }
      if (head.length < 1) head.push(Buffer.from(chunk.subarray(0, 8)));
      if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    }
    await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
    const sig = head[0] || Buffer.alloc(0);
    // CDR ab X4 = ZIP (PK), ältere = RIFF
    if (!(sig[0] === 0x50 && sig[1] === 0x4b) && sig.toString('latin1', 0, 4) !== 'RIFF') throw new ToolError('Das ist keine CorelDRAW-Datei (.cdr)');
    return n;
  } catch (e) {
    if (e.name === 'AbortError') throw new ToolError('Download dauerte zu lange');
    throw e;
  } finally { clearTimeout(timer); }
}

function runEngine(cfg, args, timeoutMs = 170_000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cfg.python, ['-I', path.join(HERE, 'cdr_engine.py'), ...args], {
      env: { PATH: process.env.PATH || '/usr/bin:/bin', CDR2RAW: cfg.cdr2raw, CDR_TIMEOUT_S: '150', HOME: cfg.data, LANG: 'C.UTF-8', ...(process.env.FONTCONFIG_FILE ? { FONTCONFIG_FILE: process.env.FONTCONFIG_FILE } : {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const out = []; const err = [];
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new ToolError('Auswertung dauerte zu lange')); }, timeoutMs);
    p.stdout.on('data', (d) => out.push(d)); p.stderr.on('data', (d) => { if (err.length < 50) err.push(d); });
    p.on('error', (e) => { clearTimeout(t); reject(new ToolError('Python nicht startbar: ' + e.message)); });
    p.on('close', () => {
      clearTimeout(t);
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
  const tokenBuf = Buffer.from(cfg.token);

  async function cleanup() {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.at > CACHE_MS) { cache.delete(k); fsp.rm(v.file, { force: true }).catch(() => {}); }
    for (const sub of ['out']) {
      for (const d of await fsp.readdir(path.join(cfg.data, sub)).catch(() => [])) {
        const p = path.join(cfg.data, sub, d);
        const st = await fsp.stat(p).catch(() => null);
        if (st && now - st.mtimeMs > KEEP_MS) await fsp.rm(p, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
  const sweeper = setInterval(() => cleanup().catch(() => {}), 10 * 60_000); sweeper.unref();

  async function fetchInput(args) {
    const f = args.file;
    const src = f && typeof f === 'object' ? f.download_url : args.url;
    if (!src || typeof src !== 'string') throw new ToolError('Keine Datei: bitte eine .cdr hochladen (file) oder eine https-Adresse angeben (url)');
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

  function publish(id, name) { return cfg.origin ? `${cfg.origin}/dl/${id}/${encodeURIComponent(name)}` : null; }

  async function storeOut(name, data) {
    const id = randomBytes(18).toString('base64url');
    const dir = path.join(cfg.data, 'out', id);
    await fsp.mkdir(dir, { mode: 0o700 });
    await fsp.writeFile(path.join(dir, name), data);
    return { id, url: publish(id, name) };
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

  async function callTool(name, args = {}) {
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) throw new RpcError(-32602, `Unbekanntes Werkzeug: ${name}`);
    if (args.page != null && (!Number.isInteger(args.page) || args.page < 1)) throw new ToolError('page muss eine ganze Zahl ab 1 sein');
    return limit(async () => {
      const t0 = Date.now();
      const input = await fetchInput(args);
      const base = input.name.replace(/\.cdr$/i, '').replace(/[^\p{L}\p{N} ._-]+/gu, '_').slice(0, 80) || 'datei';
      const ea = [tool.cmd, input.file];
      if (args.page) ea.push('--page', String(args.page));
      if (tool.cmd === 'measure' && args.max_plates) ea.push('--max', String(Math.min(2000, args.max_plates | 0)));
      if (tool.cmd === 'texts' && args.max_texts) ea.push('--max', String(Math.min(5000, args.max_texts | 0)));
      let outFile = null;
      if (tool.cmd === 'svg' || tool.cmd === 'png') {
        outFile = path.join(cfg.data, 'out', randomBytes(9).toString('hex') + (tool.cmd === 'svg' ? '.svg' : '.png'));
        ea.push('--out', outFile);
        if (tool.cmd === 'png') ea.push('--px', String(Math.max(300, Math.min(2400, args.pixels | 0 || 1600))));
      }
      try {
        const res = await runEngine(cfg, ea);
        res.datei = input.name;
        const content = [];
        if (tool.cmd === 'svg') {
          const svg = await fsp.readFile(outFile);
          const st = await storeOut(`${base}-seite-${res.seite}.svg`, svg);
          res.download = st.url;

          content.push({ type: 'text', text: JSON.stringify(res) });
          if (svg.length <= 60_000) content.push({ type: 'text', text: svg.toString('utf8') });
        } else if (tool.cmd === 'png') {
          const png = await fsp.readFile(outFile);
          const st = await storeOut(`${base}-seite-${res.seite}.png`, png);
          res.download = st.url;
          content.push({ type: 'image', data: png.toString('base64'), mimeType: 'image/png' });
          content.push({ type: 'text', text: JSON.stringify(res) });
        } else {
          const { res: small, full } = shrink(res, tool.cmd);
          if (full) { const st = await storeOut(`${base}-${tool.cmd}.json`, full); small.vollstaendigesErgebnis = st.url; }
          content.push({ type: 'text', text: JSON.stringify(small) });
          log({ tool: name, ms: Date.now() - t0, cached: input.cached });
          return { content, structuredContent: small, isError: false };
        }
        log({ tool: name, ms: Date.now() - t0, cached: input.cached });
        return { content, structuredContent: res, isError: false };
      } finally {
        if (outFile) fsp.rm(outFile, { force: true }).catch(() => {});
      }
    });
  }

  async function handleRpc(msg) {
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
            instructions: 'Werkzeuge für CorelDRAW-Dateien (.cdr) ohne CorelDRAW. Maße immer in mm, 1:1 aus der Datei. Für Plattengrößen und Bohrbilder cdr_measure, für Texte/Schriften cdr_texts, zum Ansehen cdr_preview, zum Weiterverarbeiten cdr_to_svg. Werte nicht runden oder „vereinheitlichen“; was die Datei nicht enthält, als unbekannt nennen.',
          };
          break;
        }
        case 'ping': result = {}; break;
        case 'tools/list': result = { tools: toolList() }; break;
        case 'tools/call':
          try { result = await callTool(msg.params?.name, msg.params?.arguments || {}); }
          catch (e) {
            if (e instanceof RpcError) throw e;
            const text = e instanceof ToolError ? e.message : 'Interner Fehler beim Lesen der Datei';
            if (!(e instanceof ToolError)) log({ error: String(e?.stack || e).slice(0, 500) });
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
        const name = decodeURIComponent(dl[2]);
        if (name.includes('/') || name.includes('\\') || name.startsWith('.')) return send(404, '{}');
        const p = path.join(cfg.data, 'out', dl[1], name);
        const st = await fsp.stat(p).catch(() => null);
        if (!st || Date.now() - st.mtimeMs > KEEP_MS) return send(404, JSON.stringify({ error: 'nicht (mehr) vorhanden' }));
        const type = name.endsWith('.svg') ? 'image/svg+xml' : name.endsWith('.png') ? 'image/png' : 'application/json; charset=utf-8';
        res.writeHead(200, { 'content-type': type, 'content-length': st.size, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff',
          'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" });
        return fs.createReadStream(p).pipe(res);
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
      if (Array.isArray(body)) {
        const out = (await Promise.all(body.map(handleRpc))).filter(Boolean);
        return out.length ? send(200, JSON.stringify(out)) : send(202, '');
      }
      const out = await handleRpc(body);
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
