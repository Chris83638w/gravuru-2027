// Plesk „Skript ausführen“: `check` prüft Konfiguration, Python, libcdr und Vorschau; `setup` legt zusätzlich
// eine eigene Python-Umgebung mit CairoSVG (für Vorschaubilder) im privaten Ordner an. Gibt keine Geheimnisse aus.
//   node check.cjs [--setup]
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appDir = __dirname;
const privDir = path.join(path.dirname(appDir), 'private');
const cfgPath = process.env.CDR_MCP_CONFIG || path.join(privDir, path.basename(appDir) + '-config.json');
const out = { config: cfgPath, configured: false };
let values = {};
try {
  values = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).values || {};
  const mode = fs.statSync(cfgPath).mode & 0o777;
  out.configured = typeof values.CDR_MCP_TOKEN === 'string' && values.CDR_MCP_TOKEN.length >= 32;
  out.configPrivate = (mode & 0o077) === 0;
  out.origin = values.CDR_MCP_ORIGIN || null;
} catch (e) { out.configError = e.code === 'ENOENT' ? 'Konfigurationsdatei fehlt' : 'Konfigurationsdatei unlesbar'; }

if (process.argv.includes('--setup')) {
  const venv = path.join(privDir, path.basename(appDir) + '-python');
  const base = values.CDR_MCP_BOOTSTRAP_PYTHON || 'python3';
  const r1 = spawnSync(base, ['-m', 'venv', venv], { encoding: 'utf8' });
  const pip = path.join(venv, 'bin', 'pip');
  const r2 = r1.status === 0 ? spawnSync(pip, ['install', '--disable-pip-version-check', '-q', '-r', path.join(appDir, 'requirements.txt')], { encoding: 'utf8' }) : null;
  out.setup = { venv, venv_ok: r1.status === 0, pip_ok: r2 ? r2.status === 0 : false, hint: 'CDR_MCP_PYTHON in der Konfiguration auf <venv>/bin/python setzen', error: (r1.stderr || r2?.stderr || '').slice(-300) || undefined };
}

const python = values.CDR_MCP_PYTHON || 'python3';
const py = spawnSync(python, ['-I', '-c', 'import sys;print(sys.version.split()[0])'], { encoding: 'utf8' });
out.python = py.status === 0 ? py.stdout.trim() : 'nicht startbar: ' + python;
const cairo = spawnSync(python, ['-I', '-c', 'import cairosvg;cairosvg.svg2png(bytestring=b"<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'/>");print("ok")'], { encoding: 'utf8' });
out.preview = cairo.status === 0 ? true : 'CairoSVG fehlt – Vorschau aus, alles andere geht';
const vendored = path.join(appDir, 'vendor', 'libcdr', 'cdr2raw');
const cdr = values.CDR2RAW || (fs.existsSync(vendored) ? vendored : 'cdr2raw');
const r = spawnSync(cdr, ['/dev/null'], { encoding: 'utf8' });
out.libcdr = r.error ? 'nicht startbar: ' + r.error.code : true;
const nodeMajor = Number(process.versions.node.split('.')[0]);
out.node = process.versions.node + (nodeMajor >= 22 ? '' : ' (zu alt, mindestens 22)');
out.ready = out.configured && py.status === 0 && out.libcdr === true && nodeMajor >= 22;
console.log(JSON.stringify(out, null, 2));
process.exitCode = out.ready ? 0 : 1;
