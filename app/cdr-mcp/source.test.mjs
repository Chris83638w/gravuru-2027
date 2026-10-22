// Serverquelle: ausschließlich temporäre synthetische Dateien, kein Firmenserver/Kundendaten.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { sourceConfig, sourceStatus, listSource, snapshotSource, SOURCE_PREFIXES } from './source.mjs';
import { createCdrServer, loadConfig } from './server.mjs';

const TMP = await fs.mkdtemp(path.join(os.tmpdir(), 'cdr-source-test-'));
const ROOT = path.join(TMP, 'Produkte');
const REL = 'Türschilder/Gravur/Edelstahl/__NEU/7x2/[CDR]/TRE-V2A-7x2_Designs.cdr';
const CONTENT = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(64)]);
const cfg = { sourceRoot: ROOT, sourcePrefixes: SOURCE_PREFIXES, data: path.join(TMP, 'work'), maxBytes: 1024 * 1024 };
await fs.mkdir(path.dirname(path.join(ROOT, REL)), { recursive: true });
await fs.mkdir(path.join(cfg.data, 'in'), { recursive: true });
await fs.writeFile(path.join(ROOT, REL), CONTENT);
await fs.writeFile(path.join(ROOT, 'ignore.csv'), 'keine CDR');
await fs.writeFile(path.join(ROOT, 'b.CDR'), CONTENT);
await fs.writeFile(path.join(ROOT, 'a.cdr'), CONTENT);
await fs.mkdir(path.join(TMP, 'outside'));
await fs.writeFile(path.join(TMP, 'outside', 'private.cdr'), CONTENT);
await fs.symlink(path.join(TMP, 'outside'), path.join(ROOT, 'escape'));
await fs.symlink(path.join(TMP, 'outside', 'private.cdr'), path.join(ROOT, 'escape.cdr'));
test.after(async () => { await fs.rm(TMP, { recursive: true, force: true }); });

test('Quelle: fehlende Einrichtung und fehlender Mount werden klar gemeldet', async () => {
  assert.equal((await sourceStatus({ ...cfg, sourceRoot: '' })).eingerichtet, false);
  assert.equal((await sourceStatus({ ...cfg, sourceRoot: path.join(TMP, 'missing') })).erreichbar, false);
  const status = await sourceStatus(cfg);
  assert.equal(status.erreichbar, true);
  assert.match(status.hinweis, /leerer Mountpunkt/);
  assert.equal(JSON.stringify(status).includes(TMP), false);
});

test('Quelle: Root und optionale Alias-Konfiguration validieren', () => {
  const config = (values) => sourceConfig((k, d) => values[k] ?? d);
  assert.throws(() => config({ CDR_MCP_SOURCE_ROOT: '/' }), /Dateisystemwurzel/);
  assert.throws(() => config({ CDR_MCP_SOURCE_ROOT: 'relativ' }), /absoluter/);
  assert.throws(() => config({ CDR_MCP_SOURCE_PREFIXES: '{' }), /JSON-Liste/);
  assert.throws(() => config({ CDR_MCP_SOURCE_PREFIXES: '[1]' }), /ungültig/);
  assert.deepEqual(config({ CDR_MCP_SOURCE_ROOT: ROOT }).sourcePrefixes, SOURCE_PREFIXES);
  assert.deepEqual(config({ CDR_MCP_SOURCE_PREFIXES: ['X:\\Designs'] }).sourcePrefixes, ['X:\\Designs']);
});

test('Quelle: relative, V:- und UNC-Pfade mit Umlauten und Klammern', async () => {
  const before = await fs.stat(path.join(ROOT, REL));
  const paths = [REL, ...SOURCE_PREFIXES.map((p) => p + '\\' + REL.replaceAll('/', '\\'))];
  for (const input of paths) {
    const copy = await snapshotSource(cfg, input);
    assert.deepEqual(await fs.readFile(copy.file), CONTENT);
    assert.equal(copy.source.server_path, REL);
    assert.equal(copy.source.sha256, createHash('sha256').update(CONTENT).digest('hex'));
    assert.equal(copy.source.bytes, CONTENT.length);
    assert.equal((await fs.stat(copy.file)).mode & 0o777, 0o600);
    await fs.rm(copy.file);
  }
  const after = await fs.stat(path.join(ROOT, REL));
  assert.equal(after.mtimeMs, before.mtimeMs);
  assert.equal(after.mode, before.mode);
});

test('Quelle: Traversal, fremde Laufwerke und externe Symlinks werden abgewiesen', async () => {
  for (const input of ['../outside/private.cdr', 'V:\\Produkte\\..\\private.cdr', 'V:\\Produkte2\\private.cdr', 'C:\\private.cdr', '/etc/private.cdr', '\\\\other\\share\\private.cdr', 'https://example.org/x.cdr', 'escape/private.cdr', 'escape.cdr', 'a.cdr\u0000', 'ignore.csv', 'Türschilder']) {
    await assert.rejects(snapshotSource(cfg, input), undefined, input);
  }
  await assert.rejects(listSource(cfg, { server_path: 'escape' }), /außerhalb/);
});

test('Quelle: Liste zeigt nur Ordner/CDR, überspringt Symlinks und paginiert', async () => {
  const first = await listSource(cfg, { server_path: 'V:\\Produkte', limit: 2 });
  assert.deepEqual(first.eintraege.map((e) => e.name), ['Türschilder', 'a.cdr']);
  assert.equal(first.anzahl, 3);
  assert.equal(first.naechsterOffset, 2);
  const second = await listSource(cfg, { offset: first.naechsterOffset, limit: 2 });
  assert.deepEqual(second.eintraege.map((e) => e.name), ['b.CDR']);
  assert.equal(second.naechsterOffset, null);
  const exact = await listSource(cfg, { server_path: path.posix.dirname(REL) });
  assert.equal(exact.eintraege[0].server_path, REL);
  for (const args of [{ offset: -1 }, { offset: 0.5 }, { limit: 201 }, { limit: 0 }]) await assert.rejects(listSource(cfg, args), /offset/);
});

test('Quelle: Größenlimit, aktuelle Dateifassung und keine veraltete Lesekopie', async () => {
  await assert.rejects(snapshotSource({ ...cfg, maxBytes: 5 }, REL), /Größenbegrenzung/);
  const source = path.join(ROOT, 'fresh.cdr');
  await fs.writeFile(source, 'RIFF-version1');
  const first = await snapshotSource(cfg, 'fresh.cdr');
  await fs.writeFile(source, 'RIFF-version2-changed');
  const second = await snapshotSource(cfg, 'fresh.cdr');
  assert.equal(await fs.readFile(first.file, 'utf8'), 'RIFF-version1');
  assert.equal(await fs.readFile(second.file, 'utf8'), 'RIFF-version2-changed');
  assert.notEqual(first.source.sha256, second.source.sha256);
  await Promise.all([fs.rm(first.file), fs.rm(second.file), fs.rm(source)]);
  assert.deepEqual(await fs.readdir(path.join(cfg.data, 'in')), []);
});

test('MCP: Serverpfad liefert D-Nummer/Farbe; Quelle bleibt erhalten, Lesekopien werden gelöscht', async () => {
  const raw = ['startDocument()', 'startPage(svg:height: 1in, svg:width: 3in)', 'startTextObject (svg:height: 0.1in, svg:width: 2in, svg:x: 0.1in, svg:y: 0.1in)', 'openParagraph (fo:text-align: left)', 'openSpan(fo:color: #00ff00, fo:font-size: 10pt, style:font-name: Arial)', 'insertText (TRE-V2A-7x2-D5)', 'closeSpan', 'closeParagraph', 'endTextObject', 'endPage', 'endDocument'].join('\n');
  const rawFile = path.join(TMP, 'fixture.raw');
  const fake = path.join(TMP, 'cdr2raw');
  await fs.writeFile(rawFile, raw);
  await fs.writeFile(fake, '#!/bin/sh\ncat "' + rawFile + '"\n', { mode: 0o755 });
  const token = 'S'.repeat(40);
  const data = path.join(TMP, 'mcp-data');
  const server = createCdrServer(loadConfig([], { CDR_MCP_TOKEN: token, CDR_MCP_SOURCE_ROOT: ROOT, CDR_MCP_DATA: data, CDR2RAW: fake, CDR_MCP_PYTHON: 'python3' }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  async function call(name, args = {}) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/mcp/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
    return (await response.json()).result;
  }
  try {
    assert.equal((await call('cdr_source_status')).structuredContent.erreichbar, true);
    assert.equal((await call('cdr_list_files', { server_path: path.posix.dirname(REL) })).structuredContent.eintraege[0].server_path, REL);
    const result = await call('cdr_texts', { server_path: 'V:\\Produkte\\' + REL.replaceAll('/', '\\') });
    assert.equal(result.isError, false, JSON.stringify(result));
    assert.equal(result.structuredContent.texte[0].text, 'TRE-V2A-7x2-D5');
    assert.deepEqual(result.structuredContent.texte[0].farben, ['#00ff00']);
    assert.equal(result.structuredContent.quelle.server_path, REL);
    assert.deepEqual(await fs.readdir(path.join(data, 'in')), []);
    const mixed = await call('cdr_info', { server_path: REL, url: 'https://example.org/x.cdr' });
    assert.equal(mixed.isError, true);
    assert.match(mixed.content[0].text, /Genau eine Quelle/);
    await fs.writeFile(path.join(ROOT, 'broken.cdr'), 'not corel');
    assert.equal((await call('cdr_info', { server_path: 'broken.cdr' })).isError, true);
    assert.equal((await call('cdr_measure', { server_path: REL, page: 9 })).isError, true);
    assert.deepEqual(await fs.readdir(path.join(data, 'in')), []);
    assert.deepEqual(await fs.readFile(path.join(ROOT, REL)), CONTENT);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
