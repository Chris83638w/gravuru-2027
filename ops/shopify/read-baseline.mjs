import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const CLIENT_ID = '9640dd7a6907f0c73e7013ea8c24869b';
export const CLI_VERSION = '4.9.0';
export const PRIVATE_DIRECTORY = '/var/www/vhosts/gravuru-designwerkstatt.de/private';
class BaselineError extends Error {}
const fail = code => {throw Object.assign(new BaselineError('Shopify-Konfigurationssicherung nicht bestätigt.'), {code});};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function privateDirectory(directory) {
  try {
    const s = fs.lstatSync(directory);
    if (!path.isAbsolute(directory) || path.resolve(directory) !== directory || fs.realpathSync(directory) !== directory || !s.isDirectory() || s.uid !== process.getuid() || s.mode & 0o077) fail('private_directory');
    for (let p = directory;; p = path.dirname(p)) {
      if (fs.existsSync(path.join(p, '.git'))) fail('private_directory');
      if (p === path.dirname(p)) break;
    }
  } catch {fail('private_directory');}
}
function readFile(file, {privateMode = true, limit = 1024 * 1024} = {}) {
  let fd;
  try {
    if (fs.realpathSync(file) !== file) fail('private_file');
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const s = fs.fstatSync(fd);
    if (!s.isFile() || s.uid !== process.getuid() || privateMode && s.mode & 0o077 || s.size < 1 || s.size > limit) fail('private_file');
    return fs.readFileSync(fd);
  } catch {fail('private_file');}
  finally {if (fd !== undefined) fs.closeSync(fd);}
}
function versionsFrom(output, token) {
  let rows; try {rows = JSON.parse(output);} catch {fail('versions_format');}
  if (!Array.isArray(rows) || !rows.length || rows.length > 1000 || output.includes(token)) fail('versions_format');
  const seen = new Set();
  const versions = rows.map(v => {
    if (typeof v?.versionId !== 'string' || !/^[A-Za-z0-9:/_-]{1,255}$/.test(v.versionId) || seen.has(v.versionId) || typeof v.status !== 'string' || !/^[a-z_-]{1,30}$/.test(v.status) || v.versionTag !== undefined && v.versionTag !== null && (typeof v.versionTag !== 'string' || v.versionTag.length < 1 || v.versionTag.length > 255 || /[\x00-\x1f\x7f]/.test(v.versionTag))) fail('versions_format');
    seen.add(v.versionId);
    // No employee names, release messages, raw responses or credentials in output.
    return {versionId: v.versionId, versionTag: v.versionTag ?? null, status: v.status};
  });
  const active = versions.filter(v => v.status === 'active');
  if (active.length !== 1 || !active[0].versionTag) fail('active_version_unconfirmed');
  return {versions, active: active[0]};
}

// Only configuration reads and version-list reads. No deploy/release, product
// mutation, token creation or interactive login. Each attempt gets new storage.
export function readReleaseBaseline({directory = PRIVATE_DIRECTORY} = {}, {run = spawnSync} = {}) {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') fail('tls_verification_disabled');
  privateDirectory(directory);
  let token;
  try {token = readFile(path.join(directory, 'gravuru-shopify-app-automation-token'), {limit: 8192}).toString('utf8').trim();}
  catch {fail('automation_token_missing_or_private_file');}
  if (!/^[\x21-\x7e]{16,8192}$/.test(token)) fail('automation_token_format');
  const tools = path.join(directory, 'gravuru-shopify-deploy-tools'); privateDirectory(tools);
  const packageDirectory = path.join(tools, 'node_modules/@shopify/cli');
  let metadata; try {metadata = JSON.parse(readFile(path.join(packageDirectory, 'package.json'), {privateMode: false}));} catch {fail('cli_installation');}
  if (metadata.name !== '@shopify/cli' || metadata.version !== CLI_VERSION || metadata.bin?.shopify !== './bin/run.js') fail('cli_version');
  const entry = path.join(packageDirectory, 'bin/run.js'); readFile(entry, {privateMode: false});
  const originalMask = process.umask(0o077);
  try {
    const work = fs.mkdtempSync(path.join(directory, 'gravuru-release-baseline-'));
    const save = (name, bytes) => fs.writeFileSync(path.join(work, name), bytes, {flag: 'wx', mode: 0o600});
    save('package.json', JSON.stringify({name: 'gravuru-private-release-baseline', version: '1.0.0', private: true, devDependencies: {'@shopify/cli': CLI_VERSION}}) + '\n');
    fs.mkdirSync(path.join(work, '.cli-config'), {mode: 0o700});
    const env = {...process.env};
    for (const key of Object.keys(env)) if (key.startsWith('SHOPIFY_') || ['DEBUG', 'NODE_DEBUG'].includes(key)) delete env[key];
    Object.assign(env, {CI: 'true', NO_COLOR: '1', SHOPIFY_CLI_NO_ANALYTICS: '1', SHOPIFY_APP_AUTOMATION_TOKEN: token, XDG_CONFIG_HOME: path.join(work, '.cli-config')});
    const execute = (args, stage) => {
      let r; try {r = run(process.execPath, [entry, ...args, '--no-color'], {cwd: work, env, encoding: 'utf8', timeout: 90000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});} catch {fail(stage + '_failed');}
      if (r.status !== 0 || r.error || typeof r.stdout !== 'string' || r.stdout.includes(token) || String(r.stderr || '').includes(token)) fail(stage + '_failed');
      return r.stdout;
    };
    const capture = name => {
      execute(['app', 'config', 'link', '--client-id', CLIENT_ID, '--file-name', name, '--path', work], 'config_read');
      const filename = 'shopify.app.' + name + '.toml', bytes = readFile(path.join(work, filename)), text = bytes.toString('utf8');
      const root = text.split(/^\s*\[/m)[0], identities = [...root.matchAll(/^\s*client_id\s*=\s*"([a-zA-Z0-9_-]+)"\s*(?:#.*)?$/gm)];
      if (identities.length !== 1 || identities[0][1] !== CLIENT_ID || text.includes(token)) fail('config_identity');
      const result = versionsFrom(execute(['app', 'versions', 'list', '--client-id', CLIENT_ID, '--config', name, '--path', work, '--json'], 'versions_read'), token);
      return {filename, bytes, ...result};
    };
    const first = capture('before'), second = capture('confirmed');
    if (sha(first.bytes) !== sha(second.bytes) || JSON.stringify(first.active) !== JSON.stringify(second.active)) fail('remote_changed_during_capture');
    save('versions.json', JSON.stringify(second.versions, null, 2) + '\n');
    const report = {schema: 'gravuru-shopify-release-baseline/v1', capturedAt: new Date().toISOString(), clientId: CLIENT_ID, cliVersion: CLI_VERSION,
      activeVersion: second.active, versionCount: second.versions.length, configurationSha256: sha(first.bytes), stableAcrossCapture: true,
      configurationFiles: [first.filename, second.filename], extensionsSourceBackupComplete: false,
      deploymentReady: false, released: false};
    // Write this completion marker last. Failed captures never get one.
    save('BASELINE.json', JSON.stringify(report, null, 2) + '\n');
    return {...report, privateBaselineDirectory: work};
  } finally {process.umask(originalMask);}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {if (process.argv.length !== 2) fail('arguments'); console.log(JSON.stringify(readReleaseBaseline()));}
  catch (error) {console.log(JSON.stringify({ok: false, code: error instanceof BaselineError ? error.code : 'baseline_failed', released: false})); process.exitCode = 1;}
}
