// Tests für CDR-Engine und MCP-Server. libcdr wird durch ein Skript ersetzt, das eine feste
// cdr2raw-Ausgabe liefert (keine Kundendateien im Repo). Echte Dateien: siehe README „Prüfung“.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCdrServer, loadConfig, TOOLS, isPrivateIp } from './server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cdr-mcp-test-'));
const IN = (mm) => (mm / 25.4).toFixed(5) + 'in';
const P = (a, x, y, extra = '') => `(librevenge:path-action: ${a}, svg:x: ${IN(x)}, svg:y: ${IN(y)}${extra})`;
const rectPath = (x, y, w, h) => `drawPath (svg:d: (${[P('M', x, y), P('L', x + w, y), P('L', x + w, y + h), P('L', x, y + h), '(librevenge:path-action: Z)'].join(', ')}))`;
function circlePath(cx, cy, r) {
  const k = 0.5522847498 * r; const c = (x1, y1, x2, y2, x, y) => `(librevenge:path-action: C, svg:x: ${IN(x)}, svg:x1: ${IN(x1)}, svg:x2: ${IN(x2)}, svg:y: ${IN(y)}, svg:y1: ${IN(y1)}, svg:y2: ${IN(y2)})`;
  return `drawPath (svg:d: (${[P('M', cx + r, cy), c(cx + r, cy + k, cx + k, cy + r, cx, cy + r), c(cx - k, cy + r, cx - r, cy + k, cx - r, cy), c(cx - r, cy - k, cx - k, cy - r, cx, cy - r), c(cx + k, cy - r, cx + r, cy - k, cx + r, cy), '(librevenge:path-action: Z)'].join(', ')}))`;
}
const line = (x1, y1, x2, y2) => `drawPath (svg:d: (${P('M', x1, y1)}, ${P('L', x2, y2)}))`;
const RED = 'setStyle(draw:fill: none, draw:stroke: solid, svg:stroke-color: #ff0000, svg:stroke-width: 0.0030in)';
const RAW = [
  'startDocument()',
  `  startPage(svg:height: ${IN(100)}, svg:width: ${IN(200)})`,
  '    startLayer ()',
  `      ${RED}`,
  // Platte 90 × 30 mit 2 Löchern Ø 4, 6 mm vom Rand, mittig
  `      ${rectPath(10, 10, 90, 30)}`,
  `      ${circlePath(16, 25, 2)}`,
  `      ${circlePath(94, 25, 2)}`,
  // Platte aus Einzellinien 50 × 40 (gemeinsame Kante mit zweiter 50 × 40 darunter), ein Loch
  `      ${line(110, 10, 160, 10)}`, `      ${line(110, 50, 160, 50)}`, `      ${line(110, 90, 160, 90)}`,
  `      ${line(110, 10, 110, 90)}`, `      ${line(160, 10, 160, 90)}`,
  `      ${circlePath(118, 18, 2)}`,
  // Oval 60 × 20 als Freiform-Kontrolle: aus Kreis skaliert nicht nötig – Kreis Ø 30 als Platte
  `      ${circlePath(40, 70, 15)}`,
  `      startTextObject (svg:height: ${IN(5)}, svg:width: ${IN(60)}, svg:x: ${IN(25)}, svg:y: ${IN(20)})`,
  '        openParagraph (fo:text-align: center)',
  '          openSpan(fo:color: #000000, fo:font-size: 20.0000pt, style:font-name: Michroma)',
  '            insertText (Familie Muster)',
  '          closeSpan',
  '        closeParagraph',
  '      endTextObject',
  '    endLayer',
  '  endPage',
  'endDocument',
].join('\n');
const FAKE = path.join(TMP, 'cdr2raw');
fs.writeFileSync(path.join(TMP, 'fixture.raw'), RAW + '\n');
fs.writeFileSync(FAKE, `#!/bin/sh\ncat "${path.join(TMP, 'fixture.raw')}"\n`, { mode: 0o755 });
fs.writeFileSync(path.join(TMP, 'probe.cdr'), Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(64)]));
fs.writeFileSync(path.join(TMP, 'keine.cdr'), 'hallo welt, keine cdr');

function engine(...args) {
  const r = spawnSync('python3', ['-I', path.join(HERE, 'cdr_engine.py'), ...args], { env: { ...process.env, CDR2RAW: FAKE }, encoding: 'utf8' });
  return JSON.parse(r.stdout);
}

test('Engine: Platte, Bohrlöcher, Randabstände und Lochabstand', () => {
  const m = engine('measure', path.join(TMP, 'probe.cdr')).seiten[0];
  const p = m.platten.find((x) => x.breite === 90 && x.hoehe === 30);
  assert.ok(p, 'Platte 90 × 30 gefunden');
  assert.equal(p.form, 'Rechteck');
  assert.equal(p.linie, 'rot');
  assert.equal(p.bohrloecher.length, 2);
  assert.deepEqual(p.bohrloecher.map((h) => [h.mitteX, h.mitteY, h.durchmesser, h.randLinks, h.randRechts]), [[6, 15, 4, 6, 84], [84, 15, 4, 84, 6]]);
  assert.deepEqual(p.lochabstaende, [{ richtung: 'waagerecht', abstandMitteMitte: 78 }]);
  assert.deepEqual(p.texte, ['Familie Muster']);
});

test('Engine: Rechtecke aus Einzellinien mit gemeinsamer Kante', () => {
  const m = engine('measure', path.join(TMP, 'probe.cdr')).seiten[0];
  const lr = m.platten.filter((x) => x.ausEinzellinien);
  assert.equal(lr.length, 2);
  assert.ok(lr.every((x) => x.breite === 50 && x.hoehe === 40));
  const top = lr.find((x) => x.y === 10);
  assert.deepEqual(top.bohrloecher.map((h) => [h.mitteX, h.mitteY]), [[8, 8]]);
});

test('Engine: Kreis-Platte und Kreis-Bohrloch werden unterschieden', () => {
  const m = engine('measure', path.join(TMP, 'probe.cdr')).seiten[0];
  const k = m.platten.find((x) => x.form === 'Kreis');
  assert.equal(k.breite, 30);
  assert.equal(m.anzahlBohrloecher, 3);
});

test('Engine: Texte mit Schrift, Größe und korrigierter Breite', () => {
  const t = engine('texts', path.join(TMP, 'probe.cdr'));
  assert.equal(t.anzahl, 1);
  assert.equal(t.texte[0].text, 'Familie Muster');
  assert.equal(t.texte[0].schriften[0].font, 'Michroma');
  assert.equal(t.texte[0].schriften[0].sizePt, 20);
  assert.equal(t.texte[0].breite, 30);   // libcdr meldet doppelte Breite (60)
  assert.equal(t.texte[0].x, 40);        // zentriert: 25 + 60/4
});

test('Engine: SVG 1:1 in mm, Text bleibt Text', () => {
  const out = path.join(TMP, 'a.svg');
  const r = engine('svg', path.join(TMP, 'probe.cdr'), '--out', out);
  assert.equal(r.breite, 200);
  const svg = fs.readFileSync(out, 'utf8');
  assert.match(svg, /width="200(\.0)?mm" height="100(\.0)?mm" viewBox="0 0 200(\.0)? 100(\.0)?"/);
  assert.match(svg, /<text [^>]*font-family="Michroma"[^>]*>Familie Muster<\/text>/);
});

test('Engine: Fehler als Meldung, keine Ausnahme', () => {
  const r = engine('measure', path.join(TMP, 'probe.cdr'), '--page', '4');
  assert.match(r.error, /Seite 4 gibt es nicht/);
});

test('Engine: Zip mit gefälschter Größenangabe wird abgelehnt (keine Speicherbombe)', () => {
  const bomb = path.join(TMP, 'bombe.cdr');
  const py = `
import zipfile, struct, sys
p = sys.argv[1]
with zipfile.ZipFile(p, 'w') as z:
    z.writestr('mimetype', 'application/x-vnd.corel.zcf.draw.document+zip')
    z.writestr('content/data/Bitmaps.dat', b'x' * 10)
b = bytearray(open(p, 'rb').read())
i = b.find(b'PK\\x01\\x02', b.find(b'PK\\x01\\x02') + 4)
struct.pack_into('<I', b, i + 24, 0xF0000000)
open(p, 'wb').write(b)
`;
  spawnSync('python3', ['-I', '-c', py, bomb]);
  const r = engine('info', bomb);
  assert.match(r.error, /zu groß/);
});

test('Sperrliste interner Adressen', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '198.18.0.1', '::1', '::', '::ffff:127.0.0.1', '::ffff:7f00:1', '0:0:0:0:0:ffff:7f00:1', 'fe80::1', 'fd00::1', 'fec0::1', '64:ff9b::7f00:1', '2002:7f00:1::', '::7f00:1', 'kein-ip'])
    assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['8.8.8.8', '20.60.1.1', '2a00:1450:4001:80b::200e', '2606:4700::1111'])
    assert.equal(isPrivateIp(ip), false, ip);
});

test('Konfiguration verlangt langes Token', () => {
  assert.throws(() => loadConfig([], { CDR_MCP_TOKEN: 'kurz' }), /CDR_MCP_TOKEN/);
});

// ------------------------------------------------------------ Server

const TOKEN = 'T'.repeat(40);
let base, files, srv;
test.before(async () => {
  files = http.createServer((req, res) => {
    const f = path.join(TMP, path.basename(req.url));
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200); fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => files.listen(0, '127.0.0.1', r));
  const cfg = loadConfig([], { CDR_MCP_TOKEN: TOKEN, CDR2RAW: FAKE, CDR_MCP_DATA: path.join(TMP, 'data'), CDR_MCP_ALLOW_PRIVATE_URLS: '1', CDR_MCP_ORIGIN: 'https://cdr.example', CDR_MCP_PYTHON: 'python3' });
  process.env.CDR_MCP_QUIET = '1';
  srv = createCdrServer(cfg);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${srv.address().port}`;
});
test.after(() => { srv?.close(); files?.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

async function rpc(method, params, token = TOKEN) {
  const r = await fetch(`${base}/mcp/${token}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  return { status: r.status, body: r.status === 200 ? await r.json() : null };
}
const fileArg = (name) => ({ download_url: `http://127.0.0.1:${files.address().port}/${name}`, file_id: 'file_' + name, file_name: name });

test('MCP: initialize, tools/list mit Datei-Parametern für ChatGPT', async () => {
  const i = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  assert.equal(i.body.result.protocolVersion, '2025-06-18');
  assert.equal(i.body.result.serverInfo.name, 'gravuru-cdr');
  const l = await rpc('tools/list', {});
  const tools = l.body.result.tools;
  assert.deepEqual(tools.map((t) => t.name), TOOLS.map((t) => t.name));
  for (const t of tools) {
    assert.deepEqual(t._meta['openai/fileParams'], ['file']);
    const f = t.inputSchema.properties.file;
    assert.deepEqual(Object.keys(f.properties).sort(), ['download_url', 'file_id', 'file_name', 'mime_type']);
    assert.deepEqual(f.required, ['download_url', 'file_id']);
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.annotations.destructiveHint, false);
    assert.equal(t.annotations.openWorldHint, false);
  }
});

test('MCP: falsches Token → 404, Benachrichtigung → 202, GET → 405', async () => {
  assert.equal((await rpc('tools/list', {}, 'X'.repeat(40))).status, 404);
  const n = await fetch(`${base}/mcp/${TOKEN}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","method":"notifications/initialized"}' });
  assert.equal(n.status, 202);
  assert.equal((await fetch(`${base}/mcp/${TOKEN}`)).status, 405);
});

test('MCP: cdr_measure über hochgeladene Datei', async () => {
  const r = await rpc('tools/call', { name: 'cdr_measure', arguments: { file: fileArg('probe.cdr') } });
  const res = r.body.result;
  assert.equal(res.isError, false);
  const p = res.structuredContent.seiten[0].platten.find((x) => x.breite === 90);
  assert.equal(p.bohrloecher[0].randLinks, 6);
  assert.equal(JSON.parse(res.content[0].text).datei, 'probe.cdr');
});

test('MCP: cdr_to_svg liefert Download-Link, der funktioniert', async () => {
  const r = await rpc('tools/call', { name: 'cdr_to_svg', arguments: { file: fileArg('probe.cdr') } });
  const res = r.body.result.structuredContent;
  assert.match(res.download, /^https:\/\/cdr\.example\/dl\/[A-Za-z0-9_-]{24}\/probe-seite-1\.svg$/);
  const dl = await fetch(res.download.replace('https://cdr.example', base));
  assert.equal(dl.status, 200);
  assert.equal(dl.headers.get('content-type'), 'image/svg+xml');
  assert.match(await dl.text(), /Familie Muster/);
});

test('MCP: Fehler kommen als isError zurück (keine Datei, keine CDR, unbekanntes Werkzeug)', async () => {
  const a = (await rpc('tools/call', { name: 'cdr_measure', arguments: {} })).body.result;
  assert.equal(a.isError, true); assert.match(a.content[0].text, /Keine Datei/);
  const b = (await rpc('tools/call', { name: 'cdr_measure', arguments: { file: fileArg('keine.cdr') } })).body.result;
  assert.equal(b.isError, true); assert.match(b.content[0].text, /keine CorelDRAW-Datei/);
  const c = (await rpc('tools/call', { name: 'gibtsnicht', arguments: {} })).body;
  assert.equal(c.error.code, -32602);
  for (const args of [{ file: fileArg('probe.cdr'), max_plates: -5 }, { file: fileArg('probe.cdr'), page: 0 }, { file: { download_url: 1, file_id: 'x' } }, { file: { ...fileArg('probe.cdr'), file_name: 7 } }]) {
    const d = (await rpc('tools/call', { name: 'cdr_measure', arguments: args })).body.result;
    assert.equal(d.isError, true, JSON.stringify(args));
  }
});

test('MCP: interne Adressen sind ohne Testschalter gesperrt', async () => {
  const cfg = loadConfig([], { CDR_MCP_TOKEN: TOKEN, CDR2RAW: FAKE, CDR_MCP_DATA: path.join(TMP, 'data2') });
  const s2 = createCdrServer(cfg);
  await new Promise((r) => s2.listen(0, '127.0.0.1', r));
  try {
    for (const u of ['http://127.0.0.1/x.cdr', 'https://127.0.0.1/x.cdr', 'https://10.0.0.5/x.cdr', 'https://[::1]/x.cdr', 'https://[::ffff:127.0.0.1]/x.cdr', 'https://user:pw@example.com/x.cdr', 'https://example.com:8443/x.cdr', 'https://localhost/x.cdr']) {
      const r = await fetch(`http://127.0.0.1:${s2.address().port}/mcp/${TOKEN}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'cdr_info', arguments: { url: u } } }) });
      const res = (await r.json()).result;
      assert.equal(res.isError, true, u);
      assert.match(res.content[0].text, /https|Interne|Zugangsdaten|Port|nicht erreichbar/, u);
    }
  } finally { s2.close(); }
});
