import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// No application import, network call, environment/config dump, database open or write.
const MAX_MANIFEST = 4 * 1024 * 1024;
const MAX_FILE = 64 * 1024 * 1024;
const MAX_TOTAL = 512 * 1024 * 1024;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const errorCode = error => /^[A-Z_0-9]{1,40}$/.test(error?.code || '') ? error.code : 'UNAVAILABLE';
const version = value => typeof value === 'string' && /^[A-Za-z0-9.+_-]{1,100}$/.test(value) ? value : null;
const canonicalChild = (root, target) => target !== root && target.startsWith(root + path.sep);

async function readSmall(file, max = 65536) {
  const s = await fs.stat(file);
  if (!s.isFile() || s.size > max) throw Object.assign(Error('Read bound'), {code:'READ_BOUND'});
  return fs.readFile(file);
}
async function optionalText(file) {
  try { return (await readSmall(file)).toString('utf8'); } catch { return null; }
}
function manifestPath(relative) {
  if (typeof relative !== 'string' || !relative || relative.length > 240 || relative.includes('\\') || path.posix.isAbsolute(relative)) return false;
  const parts = relative.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.') || !/^[A-Za-z0-9_+ .()-]+$/.test(p))) return false;
  return !/(?:^|\/)(?:private|secrets|node_modules)(?:\/|$)|\.(?:sqlite(?:-wal|-shm)?|db|pem|key|log)$/i.test(relative);
}

export async function releasePreflight(releaseRoot) {
  if (!releaseRoot) return {provided:false};
  let root;
  try { root = await fs.realpath(releaseRoot); } catch (e) { return {provided:true,available:false,error:errorCode(e)}; }
  const result = {provided:true,available:true,manifestPresent:false,verified:false};
  try {
    const manifestFile = path.join(root, 'PACKAGE-MANIFEST.json');
    if (await fs.realpath(manifestFile) !== manifestFile) throw Object.assign(Error('Manifest link'), {code:'MANIFEST_LINK'});
    const bytes = await readSmall(manifestFile, MAX_MANIFEST), m = JSON.parse(bytes.toString('utf8'));
    result.manifestPresent = true;
    result.manifestSha256 = sha256(bytes);
    result.sourceCommit = /^[a-f0-9]{40}$/.test(m.sourceCommit || '') ? m.sourceCommit : null;
    result.version = version(m.version);
    result.scope = ['private-operator-test','shopify-merchant-test'].includes(m.scope) ? m.scope : 'unrecognized';
    if (!Array.isArray(m.files) || m.files.length < 1 || m.files.length > 10000) throw Object.assign(Error('Manifest shape'), {code:'MANIFEST_SHAPE'});
    let bytesRead = 0, matched = 0, failed = 0, invalid = 0;
    const seen = new Set(), failures = [];
    for (const entry of m.files) {
      if (!entry || !manifestPath(entry.path) || seen.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256 || '') || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || entry.bytes > MAX_FILE) { invalid++; continue; }
      seen.add(entry.path);
      const target = path.resolve(root, entry.path);
      try {
        if (!canonicalChild(root, target) || await fs.realpath(target) !== target) throw Object.assign(Error('Entry link'), {code:'ENTRY_LINK'});
        const s = await fs.stat(target);
        if (!s.isFile() || s.size !== entry.bytes) throw Object.assign(Error('Size mismatch'), {code:'SIZE_MISMATCH'});
        if (bytesRead + s.size > MAX_TOTAL) throw Object.assign(Error('Total bound'), {code:'TOTAL_READ_BOUND'});
        const data = await fs.readFile(target); bytesRead += data.length;
        if (data.length !== entry.bytes || sha256(data) !== entry.sha256) throw Object.assign(Error('Hash mismatch'), {code:'HASH_MISMATCH'});
        matched++;
      } catch (e) { failed++; if (failures.length < 20) failures.push({path:entry.path,code:errorCode(e)}); }
    }
    Object.assign(result, {entries:m.files.length,matched,failed,invalid,bytesRead,failures,verified:failed === 0 && invalid === 0 && matched === m.files.length});
    // A matching package is code provenance, not proof of the running process or database version.
  } catch (e) { result.error = errorCode(e); }
  return result;
}

export async function storagePreflight(dataDirectory) {
  if (!dataDirectory) return {provided:false,databasesOpened:false};
  let root;
  try { root = await fs.realpath(dataDirectory); } catch (e) { return {provided:true,available:false,error:errorCode(e),databasesOpened:false}; }
  const result = {provided:true,available:true,databasesOpened:false,files:[]};
  try {
    const stat = await fs.stat(root), volume = await fs.statfs(root);
    result.directoryMode = (stat.mode & 0o777).toString(8);
    result.volumeAvailableBytes = Number(volume.bavail) * Number(volume.bsize);
    result.volumeTotalBytes = Number(volume.blocks) * Number(volume.bsize);
  } catch (e) { result.volumeError = errorCode(e); }
  for (const name of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite','.runtime.lock']) {
    const target = path.join(root, name), record = {name};
    try {
      const s = await fs.lstat(target);
      Object.assign(record,{present:true,regular:s.isFile(),symlink:s.isSymbolicLink(),bytes:s.size,mode:(s.mode & 0o777).toString(8)});
      if (name.endsWith('.sqlite')) {
        for (const suffix of ['-wal','-shm']) {
          try { const side = await fs.lstat(target + suffix); record[suffix.slice(1)] = {present:true,bytes:side.size,symlink:side.isSymbolicLink()}; }
          catch (e) { record[suffix.slice(1)] = {present:false,error:errorCode(e)}; }
        }
      }
    } catch (e) { Object.assign(record,{present:false,error:errorCode(e)}); }
    result.files.push(record);
  }
  result.runtimeLockOwnership = 'not-tested';
  result.consistency = 'not-tested; do not copy live sqlite files';
  return result;
}

export async function processPreflight(pid) {
  const result = {requestedPid:pid ?? null,platform:process.platform};
  if (pid === undefined) return {...result,measured:false,reason:'explicit app PID required; probe process is not app process'};
  if (!Number.isSafeInteger(pid) || pid < 1 || pid > 2147483647) throw Error('Invalid PID');
  if (process.platform !== 'linux') return {...result,measured:false,reason:'Linux proc/cgroup inspection only'};
  const status = await optionalText(`/proc/${pid}/status`);
  if (!status) return {...result,measured:false,reason:'process unavailable or access denied'};
  result.measured = true;
  result.nodeNamedProcess = /^Name:\s+node(?:js)?\s*$/m.test(status);
  for (const [key,unit] of [['Threads',1],['VmRSS',1024],['VmPeak',1024],['FDSize',1]]) {
    const m = status.match(new RegExp('^' + key + ':\\s+(\\d+)', 'm'));
    if (m) result[key + (unit === 1024 ? 'Bytes' : '')] = Number(m[1]) * unit;
  }
  const limits = await optionalText(`/proc/${pid}/limits`);
  result.limits = {};
  if (limits) for (const label of ['Max open files','Max processes','Max address space','Max resident set','Max cpu time']) {
    const line = limits.split('\n').find(l => l.startsWith(label + ' '));
    const parts = line?.slice(label.length).trim().split(/\s+/);
    if (parts && parts.length >= 2) result.limits[label] = {soft:parts[0] === 'unlimited' ? null : Number(parts[0]),hard:parts[1] === 'unlimited' ? null : Number(parts[1])};
  }
  try { result.openFileDescriptors = (await fs.readdir(`/proc/${pid}/fd`)).length; } catch { result.openFileDescriptors = null; }
  // Never read cmdline, environ, Plesk settings, private runtime configuration or logs.
  const cg = await optionalText(`/proc/${pid}/cgroup`), unified = cg?.split('\n').find(l => l.startsWith('0::'))?.slice(3);
  result.cgroupV2 = {available:false};
  if (unified && !unified.split('/').includes('..')) {
    const base = '/sys/fs/cgroup', directory = path.resolve(base, '.' + unified);
    if (directory === base || canonicalChild(base,directory)) {
      const values = {};
      for (const file of ['memory.max','memory.current','pids.max','pids.current','cpu.max']) {
        const value = (await optionalText(path.join(directory,file)))?.trim();
        if (value && /^(?:max|[0-9]+)(?: [0-9]+)?$/.test(value)) values[file] = value;
      }
      result.cgroupV2 = {available:Object.keys(values).length > 0,...values};
    }
  }
  result.cloudLinuxAccountLimits = 'not-inferred; inspect effective account/LVE limits separately';
  return result;
}

export async function collectPreflight({releaseRoot,dataDirectory,pid} = {}) {
  const cpus = os.cpus();
  const [release,storage,appProcess] = await Promise.all([releasePreflight(releaseRoot),storagePreflight(dataDirectory),processPreflight(pid)]);
  return {
    schema:'gravuru-readonly-preflight/v1',checkedAt:new Date().toISOString(),readOnly:true,networkRequests:0,configurationOrEnvironmentDumped:false,
    probe:{node:process.version,platform:process.platform,architecture:process.arch},
    host:{logicalCpuCount:cpus.length,availableParallelism:os.availableParallelism?.() ?? cpus.length,totalMemoryBytes:os.totalmem(),freeMemoryBytes:os.freemem(),loadAverage:os.loadavg()},
    release,storage,appProcess,
    reference:{repository:'Chris83638w/gravuru-2027',commit:'bf5c059f13e0868d7c554616b7c35ff7a328ae62',runtime:'one outer HTTP server + one inner loopback HTTP server in one Node process, held by exclusive data-directory flock',backup:'ops/plesk/snapshot-merchant-data.py: same exclusive flock, sqlite3.Connection.backup, restored quick_check; offline coordinated snapshot of 3 databases',reviewConcurrencyPerProcess:2,photoConcurrencyPerProcess:2,httpUpstreamTimeoutMs:120000},
    limits:['Host resources are not the Plesk subscription/CloudLinux limits.','Manifest match does not prove that this release is running.','No database integrity, restoration, lock ownership or multi-instance readiness has been tested.','Reference architecture describes the inspected source commit, not an inferred live release.']
  };
}

async function cli() {
  const options = {}, known = new Map([['--release-root','releaseRoot'],['--data-dir','dataDirectory'],['--pid','pid']]);
  for (let i=2;i<process.argv.length;i++) {
    const key = known.get(process.argv[i]);
    if (!key || i+1 >= process.argv.length || options[key] !== undefined) throw Error('Arguments');
    options[key] = key === 'pid' ? Number(process.argv[++i]) : process.argv[++i];
  }
  process.stdout.write(JSON.stringify(await collectPreflight(options),null,2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli().catch(() => {process.stderr.write('Preflight nicht ausgeführt: Argumente oder Zugriff prüfen; keine Geheimnisse ausgegeben.\n');process.exitCode=1;});
}
