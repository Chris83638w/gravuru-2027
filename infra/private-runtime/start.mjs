// Private central development runtime. Uses the existing application unchanged.
// No restore, build, credential handling or public listener is performed here.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {OUTPUT} from '../../app/configurator/variant-m/build.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const databaseNames = ['workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite'];

export function validateDataDirectory(directory) {
  if (!directory || !path.isAbsolute(directory)) throw Error('An absolute GRAVURU_DATA_DIR is required.');
  const real = fs.realpathSync(directory);
  const relative = path.relative(fs.realpathSync(repositoryRoot), real);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw Error('Private state must be outside the repository.');
  }
  const directoryStat = fs.statSync(real);
  if (!directoryStat.isDirectory() || (directoryStat.mode & 0o077)) {
    throw Error('Private state directory must not grant group or other access.');
  }
  for (const name of databaseNames) {
    const filename = path.join(real, name);
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 100 || (stat.mode & 0o077)) {
      throw Error('All three private database files must already exist with private permissions.');
    }
    const handle = fs.openSync(filename, 'r');
    try {
      const header = Buffer.alloc(16);
      fs.readSync(handle, header, 0, 16, 0);
      if (!header.equals(Buffer.from('SQLite format 3\0'))) throw Error('Invalid SQLite file header.');
    } finally { fs.closeSync(handle); }
  }
  // Prevent createWorkshop from silently creating a synthetic master for an empty store.
  const database = new DatabaseSync(path.join(real, 'workshop.sqlite'), {readOnly: true});
  try {
    if (database.prepare('SELECT COUNT(*) AS total FROM products').get().total < 1) {
      throw Error('An already restored product database is required.');
    }
  } finally { database.close(); }
  return real;
}

export function startPrivateRuntime(environment = process.env) {
  process.umask(0o077);
  const directory = validateDataDirectory(environment.GRAVURU_DATA_DIR);
  const port = Number(environment.GRAVURU_PORT || 8961);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid private runtime port.');
  // Build artifacts are prepared before installation, not when opening private data.
  const models = JSON.parse(fs.readFileSync(path.join(OUTPUT, 'models.json'), 'utf8'));
  if (models.length !== 1 || !models[0].universal || !models[0].legacy) throw Error('A verified single-model build is required.');
  const workshop = createWorkshop({filename: path.join(directory, 'workshop.sqlite'), seedConfig: models[0].universal, legacy: models[0].legacy});
  const server = createPreviewServer({workshop});
  let closed = false;
  const closeWorkshop = () => { if (!closed) { closed = true; workshop.close(); } };
  server.once('close', closeWorkshop);
  server.once('error', () => { closeWorkshop(); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log('Gravuru private runtime ready on loopback.'));
  const shutdown = () => server.close();
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { startPrivateRuntime(); }
  catch { console.error('Private runtime refused startup. Check restored files, permissions, configured paths and build artifacts.'); process.exitCode = 1; }
}
