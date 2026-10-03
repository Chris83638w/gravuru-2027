// Run from a fresh checkout after installing requirements-import.txt.
// This checks development readiness; it never deploys or contacts Shopify.
import {spawnSync} from 'node:child_process';
import {mkdirSync, readdirSync, writeFileSync} from 'node:fs';
import {delimiter, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.GRAVURU_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const env = {...process.env, GRAVURU_PYTHON: python,
  PYTHONPATH: [join(root, '.local-data/python'), process.env.PYTHONPATH].filter(Boolean).join(delimiter)};
const out = join(root, '.test-output', 'cloud-check-' + new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(out, {recursive: true});
const report = {startedAt: new Date().toISOString(), platform: process.platform, node: process.version,
  scope: 'Development checks only; no cloud execution, data restore, visual acceptance or production release implied.', steps: [], result: 'RUNNING'};
function save() { writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
function step(name, binary, args, timeout = 180000) {
  const run = spawnSync(binary, args, {cwd: root, env, windowsHide: true, encoding: 'utf8',
    timeout, maxBuffer: 16 * 1024 * 1024});
  const output = (run.stdout || '') + (run.stderr || '');
  writeFileSync(join(out, name + '.log'), output);
  const item = {name, exitCode: run.status, result: run.status === 0 && !run.error ? 'PASS' : 'FAIL'};
  if (run.error) item.error = run.error.code || 'process_error';
  report.steps.push(item);
  save();
  if (item.result !== 'PASS') throw Error(name + ' failed; see ' + join(out, name + '.log'));
  return output;
}
try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Node.js >= 24 required');
  step('python-pdf', python, ['-c', 'import sys,sqlite3,pymupdf; assert sys.version_info >= (3,10); assert callable(pymupdf.open); assert pymupdf.VersionBind == "1.28.2"; print("Python",sys.version.split()[0],"PyMuPDF",pymupdf.VersionBind,"SQLite",sqlite3.sqlite_version)']);
  step('references', process.execPath, ['verify-reference.mjs']);
  const tests = ['app/configurator/variant-m', 'app/workshop'].flatMap(dir =>
    readdirSync(join(root, dir)).filter(name => name.endsWith('.test.mjs')).sort().map(name => join(dir, name)));
  const output = step('tests', process.execPath, ['--test', '--test-reporter=tap', ...tests]);
  const count = Number(output.match(/^# tests (\d+)\s*$/m)?.[1]);
  const skipped = Number(output.match(/^# skipped (\d+)\s*$/m)?.[1]);
  const failures = Number(output.match(/^# fail (\d+)\s*$/m)?.[1]);
  report.tests = {count, skipped, failures};
  if (!(count > 0) || skipped !== 0 || failures !== 0) throw Error('Tests must run without failures or skips');
  step('build', process.execPath, ['app/configurator/variant-m/build.mjs']);
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL';
  report.error = error.message;
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({...report, reportDirectory: out}, null, 2));
}
