// Private operator workflow over an existing, explicitly configured connection.
// No CLI auto-run, HTTP route, credentials, database constructor or live default.
import fs from 'node:fs';
import path from 'node:path';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';

const fail = message => { throw Object.assign(Error(message), {code: 'font_connection_plan_file', status: 409}); };
export function createFontConnectionOperator({connection, planDirectory, webRoots, executionEnabled = false} = {}) {
  if (typeof connection?.plan !== 'function' || typeof connection?.execute !== 'function' || typeof planDirectory !== 'string' || !path.isAbsolute(planDirectory) ||
      !Array.isArray(webRoots) || !webRoots.length || webRoots.some(p => typeof p !== 'string' || !path.isAbsolute(p)))
    fail('Vorhandener Anschlussdienst, absoluter privater Planordner und bestätigte Webverzeichnisse fehlen.');
  webRoots = [...webRoots];
  function physical(input) {
    let current = path.resolve(input), tail = [];
    while (!fs.existsSync(current)) { tail.unshift(path.basename(current)); const parent = path.dirname(current); if (parent === current) fail('Planpfad ist nicht auflösbar.'); current = parent; }
    return path.join(fs.realpathSync(current), ...tail);
  }
  function privateDirectory() {
    const actual = physical(planDirectory);
    for (const root of webRoots) {
      const relative = path.relative(physical(root), actual);
      if (!relative || relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))
        fail('Prüfpläne dürfen nicht innerhalb eines Webverzeichnisses liegen.');
    }
  }
  privateDirectory();
  function file(sha256) {
    privateDirectory();
    if (typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)) fail('Ungültige Prüfplankennung.');
    return path.join(planDirectory, sha256 + '.json');
  }
  function read(sha256) {
    let plan;
    try { plan = JSON.parse(fs.readFileSync(file(sha256), 'utf8')); }
    catch { fail('Der vollständige gespeicherte Prüfplan fehlt oder ist nicht lesbar.'); }
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) fail('Ungültiger gespeicherter Prüfplan.');
    const {sha256: savedHash, ...body} = plan;
    if (savedHash !== sha256 || syncHash(body) !== sha256) fail('Der gespeicherte Prüfplan wurde verändert.');
    return plan;
  }
  async function plan(input) {
    const result = await connection.plan(input), filename = file(result.sha256);
    fs.mkdirSync(planDirectory, {recursive: true, mode: 0o700});
    let fd;
    try {
      // Exclusive creation never replaces an existing review artifact. A crash
      // can leave an incomplete file, which read() rejects before execution.
      fd = fs.openSync(filename, 'wx', 0o600);
      fs.writeFileSync(fd, JSON.stringify(result, null, 2) + '\n');
      fs.fsyncSync(fd);
    } catch (error) { if (error.code !== 'EEXIST') throw error; }
    finally { if (fd !== undefined) fs.closeSync(fd); }
    const saved = read(result.sha256);
    return {sha256: saved.sha256, path: filename, targetId: saved.targetId, fromRevision: saved.fromRevision, boundRevision: saved.binding.boundRevision};
  }
  async function execute(sha256) {
    if (executionEnabled !== true) throw Object.assign(Error('Die Ausführung ist für diesen Operator nicht freigegeben.'), {code: 'font_connection_execution_disabled', status: 403});
    // Reopen immediately before execution; never use an in-memory draft plan.
    return connection.execute(read(sha256));
  }
  return Object.freeze({plan, read, execute});
}
