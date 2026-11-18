'use strict';
// Operator transport only: caller supplies hashes verified after staging.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
module.exports = async function launch({phase, toolSha256, configSha256}) {
  const base = '/var/www/vhosts/gravuru-designwerkstatt.de/private';
  const folder = base + '/font-online-tool-20261118-01';
  const tool = folder + '/snapshot-native-online.py';
  const python = base + '/gravuru-2027-test-python311/bin/python';
  const requireOk = (v, code) => { if (!v) throw Error(code); };
  const sha = b => crypto.createHash('sha256').update(b).digest('hex');
  requireOk(['capture', 'restore'].includes(phase), 'phase');
  requireOk(/^[a-f0-9]{64}$/.test(toolSha256) && /^[a-f0-9]{64}$/.test(configSha256), 'hash');
  const configFile = folder + '/' + phase + '.json';
  for (const p of [folder, tool, configFile]) {
    requireOk(fs.realpathSync(p) === p && !fs.lstatSync(p).isSymbolicLink(), 'canonical');
    const s = fs.statSync(p);
    requireOk(s.uid === process.getuid() && !(s.mode & 0o077), 'private_owner');
  }
  const toolBytes = fs.readFileSync(tool), configBytes = fs.readFileSync(configFile);
  requireOk(sha(toolBytes) === toolSha256 && sha(configBytes) === configSha256, 'changed');
  const config = JSON.parse(configBytes);
  requireOk(config.limits.maxSeconds === 1800, 'deadline');
  requireOk(!fs.existsSync(config.destination), 'destination_exists');
  for (const bin of ['/bin/sh', '/usr/bin/ionice', '/usr/bin/timeout', python]) fs.accessSync(bin, fs.constants.X_OK);
  const log = folder + '/' + phase + '.log', exit = folder + '/' + phase + '.exit';
  const claim = folder + '/' + phase + '-launched.json', pid = folder + '/' + phase + '-pid.json';
  for (const p of [log, exit, claim, pid]) requireOk(!fs.existsSync(p), 'already_started');
  function writeExclusive(p, value) {
    const fd = fs.openSync(p, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value) + '\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
  }
  const script = 'umask 077\nset -C\n"$1" -c3 "$2" --signal=TERM --kill-after=15s "$3" "$4" -I -B "$5" "$6" --config "$7" > "$8" 2>&1\nrc=$?\nprintf \'%s\\n\' "$rc" > "$9"\nexit "$rc"\n';
  const command = '/bin/sh';
  const args = ['-c', script, 'font-snapshot', '/usr/bin/ionice', '/usr/bin/timeout', '1800s', python, tool, phase, configFile, log, exit];
  writeExclusive(claim, {phase, at: new Date().toISOString(), toolSha256, configSha256, destination: config.destination, launcher: {command, args}});
  const dirfd = fs.openSync(folder, 'r');
  try { fs.fsyncSync(dirfd); } finally { fs.closeSync(dirfd); }
  const child = spawn(command, args, {
    cwd: folder, detached: true, stdio: 'ignore', env: {PATH: '/usr/bin:/bin', LANG: 'C.UTF-8'}
  });
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  writeExclusive(pid, {pid: child.pid, phase, at: new Date().toISOString()});
  child.unref();
  return {audit: 'font-online-launched', phase, pid: child.pid, toolSha256, configSha256, applicationChanged: false, noAutomaticRetry: true};
};

module.exports({phase:"restore",toolSha256:"e4268a0c3311e0d5d2bfc9f962cab0e9678d5b45aa2ee5c9dfcf7ac4f9cd96d1",configSha256:"106a63bc3b990c61657e628e93d2dfa2dc948cbf94321037533b7c7da996b645"}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.log(JSON.stringify({audit:"font-online-launch-failed",error:/^[a-z_]+$/.test(e.message)?e.message:"launch_failed",noAutomaticRetry:true}));process.exitCode=1;});