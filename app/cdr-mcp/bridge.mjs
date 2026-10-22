// Optional outbound-upload receiver. Disabled without an explicit private copy root
// and a separate upload credential. Never mounts or writes the company share.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

class BridgeError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new BridgeError(status, message); };

export function bridgeConfig(v, sourceRoot, mcpToken) {
  const enabled = v('CDR_MCP_BRIDGE_ENABLED', '') === '1';
  if (!enabled) return { bridgeEnabled: false };
  const root = String(v('CDR_MCP_BRIDGE_ROOT', ''));
  const tokenFile = String(v('CDR_MCP_BRIDGE_TOKEN_FILE', ''));
  if (!path.isAbsolute(root) || path.resolve(root) === path.parse(root).root || path.resolve(root) !== path.resolve(sourceRoot || '.'))
    throw Error('Bridge benötigt denselben absoluten privaten Kopienordner wie CDR_MCP_SOURCE_ROOT');
  const st = fs.lstatSync(root);
  if (!st.isDirectory() || st.isSymbolicLink() || (st.mode & 0o077)) throw Error('Bridge-Kopienordner muss ein eigenes privates Verzeichnis (0700) sein');
  if (!path.isAbsolute(tokenFile)) throw Error('Bridge benötigt eine eigene private Token-Datei');
  const ts = fs.lstatSync(tokenFile);
  if (!ts.isFile() || ts.isSymbolicLink() || (ts.mode & 0o077)) throw Error('Bridge-Token-Datei muss privat sein (0600)');
  const token = fs.readFileSync(tokenFile, 'utf8').trim();
  if (!/^[A-Za-z0-9_-]{40,128}$/.test(token) || token === mcpToken) throw Error('Bridge benötigt ein separates Upload-Token mit mindestens 40 Zeichen');
  const quota = Number(v('CDR_MCP_BRIDGE_MAX_MB', 5120)) * 1024 * 1024;
  if (!Number.isSafeInteger(quota) || quota < 1 || quota > 1024 ** 4) throw Error('Bridge-Speichergrenze ungültig');
  return { bridgeEnabled: true, bridgeRoot: fs.realpathSync(root), bridgeToken: token, bridgeQuota: quota };
}

function relativePath(value) {
  let rel;
  try { rel = decodeURIComponent(value || ''); } catch { fail(400, 'Dateipfad unlesbar'); }
  if (!rel || rel.length > 2048 || /[\\:\x00-\x1f\x7f]/.test(rel) || !/\.cdr$/i.test(rel)) fail(400, 'Nur relative CDR-Pfade erlaubt');
  const parts = rel.split('/');
  if (parts.length > 32 || parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.') || /[. ]$/.test(p))) fail(400, 'Dateipfad nicht erlaubt');
  return { rel, parts };
}

async function destination(root, parts, create = false) {
  let p = root;
  const rootStat = await fsp.lstat(p);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || await fsp.realpath(p) !== root) fail(503, 'Kopienordner nicht verfügbar');
  for (const part of parts.slice(0, -1)) {
    p = path.join(p, part);
    if (create) await fsp.mkdir(p, { mode: 0o700 }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    const st = await fsp.lstat(p).catch(e => { if (e.code === 'ENOENT') fail(404, 'Datei noch nicht übertragen'); throw e; });
    if (st.isSymbolicLink() || !st.isDirectory()) fail(400, 'Verknüpfungen sind nicht erlaubt');
  }
  p = path.join(p, parts.at(-1));
  const st = await fsp.lstat(p).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
  if (st && (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1)) fail(400, 'Zieldatei ist nicht regulär');
  return { file: p, stat: st };
}

async function usage(root) {
  let bytes = 0, entries = 0;
  async function walk(dir, depth) {
    if (depth > 32) fail(507, 'Kopienordner zu tief verschachtelt');
    for (const name of await fsp.readdir(dir)) {
      if (++entries > 100000) fail(507, 'Zu viele Einträge im Kopienordner');
      const p = path.join(dir, name), s = await fsp.lstat(p);
      if (s.isSymbolicLink()) fail(503, 'Verknüpfung im Kopienordner');
      if (s.isDirectory()) await walk(p, depth + 1);
      else if (s.isFile()) bytes += s.size;
    }
  }
  await walk(root, 0);
  return bytes;
}

export function createBridge(cfg) {
  return async (req, res) => {
    const send = (status, body = {}, extra = {}) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra });
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
    };
    if (!cfg.bridgeEnabled) return send(404, { error: 'nicht gefunden' });
    const auth = /^Bearer ([A-Za-z0-9_-]+)$/.exec(String(req.headers.authorization || ''));
    const given = Buffer.from(auth?.[1] || '');
    const token = Buffer.from(cfg.bridgeToken);
    if (given.length !== token.length || !timingSafeEqual(given, token)) return send(401, { error: 'Upload-Anmeldung erforderlich' });
    // This endpoint is for the local helper; browser-origin requests have no use here.
    if (req.headers.origin) return send(403, { error: 'Browser-Aufruf nicht erlaubt' });
    if (!['HEAD', 'PUT'].includes(req.method)) return send(405, { error: 'Nur HEAD und PUT' }, { allow: 'HEAD, PUT' });
    let lock, temp;
    const lockPath = path.join(cfg.bridgeRoot, '.bridge-upload.lock');
    try {
      const { rel, parts } = relativePath(req.headers['x-cdr-path']);
      if (req.method === 'HEAD') {
        const { file, stat } = await destination(cfg.bridgeRoot, parts);
        if (!stat) return send(404);
        const handle = await fsp.open(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        try {
          const before = await handle.stat(), hash = createHash('sha256');
          if (before.size > cfg.maxBytes) fail(413, 'Datei zu groß');
          for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
          const after = await handle.stat();
          if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) fail(409, 'Kopie wurde während der Prüfung geändert');
          const sha256 = hash.digest('hex');
          const receipt = await readReceipt(file, rel, sha256, after.size);
          if (!receipt) fail(409, 'Kopie ohne gültige Übertragungsbestätigung; erneut übertragen');
          return send(200, {}, { 'x-cdr-sha256': sha256, 'x-cdr-bytes': String(after.size) });
        } finally { await handle.close(); }
      }
      const length = Number(req.headers['content-length']);
      if (!Number.isSafeInteger(length) || length < 12 || length > cfg.maxBytes) fail(413, 'Dateigröße fehlt oder überschreitet die Grenze');
      const expected = String(req.headers['x-cdr-sha256'] || '');
      if (!/^[a-f0-9]{64}$/.test(expected)) fail(400, 'SHA-256 fehlt');
      if (req.headers['content-type'] !== 'application/octet-stream') fail(415, 'Binärdatei erwartet');
      const sourceModified = String(req.headers['x-cdr-modified'] || '');
      if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(sourceModified) || !Number.isFinite(Date.parse(sourceModified))) fail(400, 'Quellzeit fehlt');
      lock = await fsp.open(lockPath, 'wx', 0o600).catch(e => { if (e.code === 'EEXIST') fail(409, 'Übertragung läuft oder unterbrochene Sperre muss geprüft werden'); throw e; });
      await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      // Reserve space for the full new file plus receipt, retaining the previous copy until verified.
      if (await usage(cfg.bridgeRoot) + length + 8192 > cfg.bridgeQuota) fail(507, 'Speichergrenze für CDR-Kopien erreicht');
      const target = await destination(cfg.bridgeRoot, parts, true);
      temp = path.join(cfg.bridgeRoot, '.upload-' + randomBytes(16).toString('hex') + '.part');
      const out = await fsp.open(temp, 'wx', 0o600), hash = createHash('sha256');
      let size = 0, signature = Buffer.alloc(0);
      const timer = setTimeout(() => req.destroy(), 120000); timer.unref();
      try {
        for await (const chunk of req) {
          size += chunk.length;
          if (size > length) fail(413, 'Übertragung überschreitet die angekündigte Größe');
          if (signature.length < 12) signature = Buffer.concat([signature, chunk]).subarray(0, 12);
          hash.update(chunk);
          // FileHandle.write can write fewer bytes than requested.
          let offset = 0;
          while (offset < chunk.length) { const { bytesWritten } = await out.write(chunk, offset); if (!bytesWritten) throw Error('short write'); offset += bytesWritten; }
        }
        if (size !== length || hash.digest('hex') !== expected) fail(422, 'Übertragung unvollständig oder Prüfsumme falsch');
        if (!(signature.subarray(0, 4).equals(Buffer.from([80,75,3,4])) || (signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 11) === 'CDR')))
          fail(415, 'Keine unterstützte CDR-Signatur');
        await out.sync();
      } finally { clearTimeout(timer); await out.close(); }
      // Recheck before the atomic replacement. The private directory is owned only by the app.
      await destination(cfg.bridgeRoot, parts);
      await fsp.rename(temp, target.file); temp = null;
      const receipt = { server_path: rel, sha256: expected, bytes: size, sourceModified, receivedAt: new Date().toISOString(), source: 'outbound-copy' };
      const receiptTemp = path.join(cfg.bridgeRoot, '.receipt-' + randomBytes(16).toString('hex'));
      temp = receiptTemp;
      await fsp.writeFile(receiptTemp, JSON.stringify(receipt), { flag: 'wx', mode: 0o600 });
      await fsp.rename(receiptTemp, target.file + '.source.json'); temp = null;
      return send(200, receipt);
    } catch (e) {
      if (!res.headersSent && !res.destroyed) send(e instanceof BridgeError ? e.status : 503, { error: e instanceof BridgeError ? e.message : 'Übertragung nicht bestätigt; Verbindung oder Speicher prüfen' });
    } finally {
      if (temp) await fsp.rm(temp, { force: true }).catch(() => {});
      if (lock) { await lock.close(); await fsp.rm(lockPath, { force: true }); }
    }
  };
}

// Used by both HEAD and the read-only MCP source, so unconfirmed copies are never
// mistaken for verified source files. Receipts contain no credentials.
export async function readReceipt(file, rel, sha256, bytes) {
  let handle;
  try {
    handle = await fsp.open(file + '.source.json', fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const st = await handle.stat();
    if (!st.isFile() || st.size > 8192 || st.nlink !== 1) return null;
    const value = JSON.parse(await handle.readFile('utf8'));
    return value.source === 'outbound-copy' && value.server_path === rel && value.sha256 === sha256 && value.bytes === bytes &&
      Number.isFinite(Date.parse(value.sourceModified)) && Number.isFinite(Date.parse(value.receivedAt)) ? value : null;
  } catch { return null; }
  finally { await handle?.close(); }
}
