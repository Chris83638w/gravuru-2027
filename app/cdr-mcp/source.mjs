// Lesender Zugriff auf genau einen vom Betreiber eingebundenen Produktordner.
// Keine Netzwerkverbindung, Anmeldung, Freigabeänderung oder Schreiboperation an der Quelle.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export class SourceError extends Error {}
export const SOURCE_PREFIXES = ['V:\\Produkte', '\\\\bi-srv01-fs01\\Neue-Struktur\\Produkte', '\\\\bi-srv01-fs01.lan.gravuru.de\\Neue-Struktur\\Produkte'];
const MAX_ENTRIES = 10000;
const slash = (s) => s.replace(/\\/g, '/');
const inside = (root, target) => {
  const rel = path.relative(root, target);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
};

export function sourceConfig(v) {
  const root = String(v('CDR_MCP_SOURCE_ROOT', '')).trim();
  let prefixes;
  try {
    const value = v('CDR_MCP_SOURCE_PREFIXES', SOURCE_PREFIXES);
    prefixes = Array.isArray(value) ? value : JSON.parse(value);
  }
  catch { throw new Error('CDR_MCP_SOURCE_PREFIXES muss eine JSON-Liste von Pfadpräfixen sein'); }
  if (!Array.isArray(prefixes) || prefixes.length > 10 || prefixes.some((p) => typeof p !== 'string' || p.length < 3 || /[\x00-\x1f]/.test(p)))
    throw new Error('CDR_MCP_SOURCE_PREFIXES ist ungültig');
  if (root && (!path.isAbsolute(root) || path.resolve(root) === path.parse(path.resolve(root)).root))
    throw new Error('CDR_MCP_SOURCE_ROOT muss ein absoluter Produktordner sein, nicht die Dateisystemwurzel');
  return { sourceRoot: root, sourcePrefixes: prefixes };
}

function relativeInput(input, prefixes) {
  if (typeof input !== 'string' || input.length > 4096 || /[\x00-\x1f]/.test(input)) throw new SourceError('server_path ist ungültig');
  let rel = slash(input);
  for (const prefix of [...prefixes].sort((a, b) => b.length - a.length)) {
    const p = slash(prefix).replace(/\/+$/, '');
    if (rel.toLowerCase() === p.toLowerCase()) { rel = ''; break; }
    if (rel.toLowerCase().startsWith(p.toLowerCase() + '/')) { rel = rel.slice(p.length + 1); break; }
  }
  // Auch Windows-Laufwerke, UNC-Pfade, ADS und URLs müssen durch die erlaubten Präfixe gehen.
  if (rel.startsWith('/') || rel.includes(':') || rel.split('/').some((p) => p === '..' || p === '.'))
    throw new SourceError('Pfad liegt nicht im freigegebenen Produktordner');
  return rel.replace(/\/+$/, '');
}

async function rootPath(cfg) {
  if (!cfg.sourceRoot) throw new SourceError('Produktordner nicht eingerichtet: CDR_MCP_SOURCE_ROOT auf Plesk setzen');
  try {
    const root = await fsp.realpath(cfg.sourceRoot);
    if (root === path.parse(root).root || !(await fsp.stat(root)).isDirectory()) throw new Error();
    await fsp.access(root, fs.constants.R_OK | fs.constants.X_OK);
    return root;
  } catch { throw new SourceError('Produktordner nicht erreichbar oder nicht lesbar; Einbindung und Rechte des Plesk-App-Benutzers prüfen'); }
}

async function resolveSource(cfg, input, directory = false) {
  const rel = relativeInput(input, cfg.sourcePrefixes || SOURCE_PREFIXES);
  const root = await rootPath(cfg);
  if (!directory && !/\.cdr$/i.test(rel)) throw new SourceError('Nur .cdr-Dateien sind als Quelle erlaubt');
  try {
    const real = await fsp.realpath(path.join(root, rel));
    if (!inside(root, real)) throw new SourceError('Verknüpfung führt außerhalb des freigegebenen Produktordners');
    const stat = await fsp.stat(real);
    if (directory ? !stat.isDirectory() : !stat.isFile()) throw new SourceError(directory ? 'Pfad ist kein Ordner' : 'Pfad ist keine reguläre CDR-Datei');
    return { root, real, rel, stat };
  } catch (e) {
    if (e instanceof SourceError) throw e;
    throw new SourceError('Quellpfad nicht gefunden oder nicht lesbar; Schreibweise und Einbindung prüfen');
  }
}

export async function sourceStatus(cfg) {
  const result = { eingerichtet: Boolean(cfg.sourceRoot), erreichbar: false, pfadpraefixe: cfg.sourcePrefixes || SOURCE_PREFIXES, zugriff: 'nur lesen' };
  try {
    const root = await rootPath(cfg);
    const dir = await fsp.opendir(root);
    await dir.close();
    result.erreichbar = true;
    result.hinweis = 'Ordner lesbar. Mit cdr_list_files die erwarteten Unterordner und eine bekannte CDR prüfen; ein leerer Mountpunkt belegt keine Serververbindung.';
  } catch (e) { result.hinweis = e.message; }
  return result;
}

export async function listSource(cfg, { server_path = '', offset = 0, limit = 100 } = {}) {
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_ENTRIES || !Number.isInteger(limit) || limit < 1 || limit > 200)
    throw new SourceError('offset muss 0–10000 und limit 1–200 sein');
  const { root, real, rel } = await resolveSource(cfg, server_path, true);
  const entries = [];
  let count = 0;
  try {
    const dir = await fsp.opendir(real);
    for await (const item of dir) {
      if (++count > MAX_ENTRIES) throw new SourceError('Ordner enthält mehr als 10000 Einträge; gezielt einen Unterordner angeben');
      // Verknüpfungen nicht auflisten. Direkter Dateizugriff prüft zusätzlich den aufgelösten Pfad.
      if (item.isSymbolicLink() || (!item.isDirectory() && !(item.isFile() && /\.cdr$/i.test(item.name)))) continue;
      const child = await fsp.realpath(path.join(real, item.name)).catch(() => null);
      if (!child || !inside(root, child)) continue;
      entries.push({ name: item.name, typ: item.isDirectory() ? 'ordner' : 'cdr', server_path: [rel, item.name].filter(Boolean).join('/') });
    }
  } catch (e) {
    if (e instanceof SourceError) throw e;
    throw new SourceError('Ordner kann nicht aufgelistet werden; Einbindung und Leserechte prüfen');
  }
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const slice = entries.slice(offset, offset + limit);
  return { server_path: rel, eintraege: slice, anzahl: entries.length, naechsterOffset: offset + slice.length < entries.length ? offset + slice.length : null, hinweis: 'Eine Ordnerebene, keine rekursive Vollinventur. Ändert sich der Ordner während der Abfrage, erneut ab offset 0 lesen.' };
}

export async function snapshotSource(cfg, input, activeSources = new Set()) {
  const { root, real, rel } = await resolveSource(cfg, input);
  let handle, target;
  try {
    handle = await fsp.open(real, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    // Auf Plesk/Linux auch nach dem Öffnen die tatsächlich geöffnete Datei prüfen.
    if (process.platform === 'linux') {
      const opened = await fsp.realpath(`/proc/self/fd/${handle.fd}`);
      if (!inside(root, opened)) throw new SourceError('Geöffnete Datei liegt außerhalb des Produktordners');
    }
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw new SourceError('Quelle ist keine reguläre Datei');
    if (before.size > BigInt(cfg.maxBytes)) throw new SourceError('CDR-Datei überschreitet die konfigurierte Größenbegrenzung');
    const signature = Buffer.alloc(4);
    await handle.read(signature, 0, 4, 0);
    if (!(signature[0] === 0x50 && signature[1] === 0x4b) && signature.toString('latin1') !== 'RIFF')
      throw new SourceError('Das ist keine CorelDRAW-Datei (.cdr)');
    target = path.join(cfg.data, 'in', 'source-' + randomBytes(16).toString('hex') + '.cdr');
    activeSources.add(target);
    let bytes = 0;
    const hash = createHash('sha256');
    const meter = new Transform({ transform(chunk, enc, next) {
      bytes += chunk.length;
      if (bytes > cfg.maxBytes) return next(new SourceError('CDR-Datei überschreitet die konfigurierte Größenbegrenzung'));
      hash.update(chunk); next(null, chunk);
    } });
    await pipeline(handle.createReadStream({ autoClose: false }), meter, fs.createWriteStream(target, { flags: 'wx', mode: 0o600 }), { signal: AbortSignal.timeout(120000) });
    const after = await handle.stat({ bigint: true });
    if (after.size !== before.size || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs || BigInt(bytes) !== after.size)
      throw new SourceError('Quelldatei wurde während des Lesens geändert; bitte erneut versuchen');
    return { file: target, name: path.basename(real), cached: false, temporary: true, source: { server_path: rel, sha256: hash.digest('hex'), bytes, geaendert: new Date(Number(after.mtimeMs)).toISOString() } };
  } catch (e) {
    if (target) await fsp.rm(target, { force: true }).catch(() => {});
    activeSources.delete(target);
    if (e instanceof SourceError) throw e;
    throw new SourceError('CDR-Datei konnte nicht gelesen werden; Verbindung, Leserechte und Arbeitsordner prüfen');
  } finally { await handle?.close().catch(() => {}); }
}
