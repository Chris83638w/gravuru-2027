import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readReleaseBaseline, CLIENT_ID, CLI_VERSION} from './read-baseline.mjs';
const token = 'synthetic_automation_token_never_print';
function fixture(t, alter = () => {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'g27-release-read-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const tokenFile = path.join(directory, 'gravuru-shopify-app-automation-token'); fs.writeFileSync(tokenFile, token, {mode: 0o600});
  const tools = path.join(directory, 'gravuru-shopify-deploy-tools'); fs.mkdirSync(tools, {mode: 0o700});
  const cli = path.join(tools, 'node_modules/@shopify/cli'); fs.mkdirSync(path.join(cli, 'bin'), {recursive: true});
  fs.writeFileSync(path.join(cli, 'package.json'), JSON.stringify({name: '@shopify/cli', version: CLI_VERSION, bin: {shopify: './bin/run.js'}}));
  fs.writeFileSync(path.join(cli, 'bin/run.js'), '// synthetic runner'); const calls = [];
  const run = (command, args, options) => {
    assert.equal(command, process.execPath); assert.equal(options.env.SHOPIFY_APP_AUTOMATION_TOKEN, token);
    assert.equal(options.env.CI, 'true'); assert.equal(options.stdio[0], 'ignore'); assert.equal(options.shell, undefined);
    assert.ok(!args.join(' ').includes(token)); assert.ok(!args.includes('--force')); assert.ok(!args.includes('--reset'));
    // Real CLI parser rejects these flags together, before any network call.
    assert.ok(!(args.includes('--client-id') && args.includes('--config')), 'CLI app selectors must be exclusive');
    calls.push({args, work: options.cwd}); const index = calls.length;
    const result = {status: 0, stdout: '', stderr: ''};
    if (args[2] === 'config') {
      assert.equal(args[args.indexOf('--client-id') + 1], CLIENT_ID);
      assert.deepEqual(args.slice(1, 4), ['app', 'config', 'link']); const name = args[args.indexOf('--file-name') + 1];
      fs.writeFileSync(path.join(options.cwd, 'shopify.app.' + name + '.toml'), `client_id = "${CLIENT_ID}"\napplication_url = "https://fixture.invalid/werkstatt/"\nembedded = true\n`, {mode: 0o600});
    } else {
      assert.deepEqual(args.slice(1, 4), ['app', 'versions', 'list']);
      const name = args[args.indexOf('--config') + 1];
      assert.ok(['before', 'confirmed'].includes(name));
      assert.match(fs.readFileSync(path.join(options.cwd, 'shopify.app.' + name + '.toml'), 'utf8'), new RegExp('^client_id = "' + CLIENT_ID + '"', 'm'));
      result.stdout = JSON.stringify([{versionId: 'gid://shopify/AppVersion/42', versionTag: 'version-42', status: 'active', createdBy: 'private person', message: 'private release message'}]);
    }
    alter({args, options, result, index}); return result;
  };
  return {directory, tokenFile, cli, calls, run, execute: () => readReleaseBaseline({directory, python: 'python3'}, {run})};
}
test('captures only the fixed app, keeps two matching configs and a real rollback version, without release or leaked token', t => {
  const f = fixture(t), result = f.execute();
  assert.equal(f.calls.length, 4); assert.equal(result.activeVersion.versionTag, 'version-42'); assert.equal(result.stableAcrossCapture, true);
  assert.equal(result.deploymentReady, false); assert.equal(result.extensionsSourceBackupComplete, false); assert.equal(result.released, false);
  assert.equal(fs.statSync(result.privateBaselineDirectory).mode & 0o077, 0);
  for (const name of ['BASELINE.json', 'versions.json', 'shopify.app.before.toml', 'shopify.app.confirmed.toml']) {
    const file = path.join(result.privateBaselineDirectory, name), content = fs.readFileSync(file, 'utf8');
    assert.equal(fs.statSync(file).mode & 0o077, 0); assert.ok(!content.includes(token)); assert.ok(!content.includes('private person')); assert.ok(!content.includes('private release message'));
  }
  assert.ok(!JSON.stringify(result).includes(token));
  const again = f.execute(); assert.notEqual(again.privateBaselineDirectory, result.privateBaselineDirectory);
  assert.ok(fs.existsSync(path.join(result.privateBaselineDirectory, 'BASELINE.json')));
});
test('missing, empty, public or symlinked token fails before any CLI call or baseline creation', t => {
  for (const change of [f => fs.unlinkSync(f.tokenFile), f => fs.writeFileSync(f.tokenFile, ''), f => fs.chmodSync(f.tokenFile, 0o644), f => {const real = path.join(f.directory, 'actual'); fs.renameSync(f.tokenFile, real); fs.symlinkSync(real, f.tokenFile);}]) {
    const f = fixture(t); change(f); assert.throws(f.execute, {code: 'automation_token_missing_or_private_file'}); assert.equal(f.calls.length, 0);
    assert.equal(fs.readdirSync(f.directory).filter(n => n.startsWith('gravuru-release-baseline-')).length, 0);
  }
});
test('Git directories and unexpected CLI versions are rejected before network', t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.directory, '.git'), 'synthetic gitdir'); assert.throws(f.execute, {code: 'private_directory'});
  fs.unlinkSync(path.join(f.directory, '.git')); fs.writeFileSync(path.join(f.cli, 'package.json'), JSON.stringify({name: '@shopify/cli', version: '0.0.1', bin: {shopify: './bin/run.js'}}));
  assert.throws(f.execute, {code: 'cli_version'}); assert.equal(f.calls.length, 0);
});
for (const mode of ['release_changed', 'config_changed', 'wrong_app', 'no_active_version', 'duplicate_active_version']) test(mode + ' cannot produce a completion marker', t => {
  const f = fixture(t, ({args, options, result, index}) => {
    if (mode === 'wrong_app' && index === 1) fs.writeFileSync(path.join(options.cwd, 'shopify.app.before.toml'), 'client_id = "other_app"\n');
    if (mode === 'config_changed' && index === 3) fs.appendFileSync(path.join(options.cwd, 'shopify.app.confirmed.toml'), 'new_setting = true\n');
    if (index === 4 && ['release_changed', 'no_active_version', 'duplicate_active_version'].includes(mode)) {
      const rows = JSON.parse(result.stdout);
      if (mode === 'release_changed') rows[0].versionTag = 'version-43';
      if (mode === 'no_active_version') rows[0].status = 'unreleased';
      if (mode === 'duplicate_active_version') rows.push({...rows[0], versionId: 'gid://shopify/AppVersion/43'});
      result.stdout = JSON.stringify(rows);
    }
  });
  assert.throws(f.execute); assert.ok(f.calls.every(c => !fs.existsSync(path.join(c.work, 'BASELINE.json'))));
});
test('TOML ordering and comments may differ while all original files and semantic values remain verified', t => {
  const f = fixture(t, ({options, index}) => {
    if (index === 3) fs.writeFileSync(path.join(options.cwd, 'shopify.app.confirmed.toml'), `# Different serialization, same configuration\nembedded = true\napplication_url = "https://fixture.invalid/werkstatt/"\nclient_id = "${CLIENT_ID}"\n`);
  });
  const result = f.execute();
  assert.equal(result.stableAcrossCapture, true);
  assert.equal(result.configurationHashFormat, 'sorted-json-values-v1');
  assert.notEqual(result.rawConfigurationSha256['shopify.app.before.toml'], result.rawConfigurationSha256['shopify.app.confirmed.toml']);
});
test('invalid TOML and configuration changes by a CLI invocation cannot complete a baseline', t => {
  for (const stage of [1, 2]) {
    const f = fixture(t, ({options, index}) => {
      if (index === stage) fs.appendFileSync(path.join(options.cwd, 'shopify.app.before.toml'), stage === 1 ? 'broken = [\n' : 'changed_by_cli = true\n');
    });
    assert.throws(f.execute, {code: stage === 1 ? 'configuration_parse' : 'local_configuration_changed'});
    assert.ok(f.calls.every(c => !fs.existsSync(path.join(c.work, 'BASELINE.json'))));
  }
});
test('upstream error, timeout and token echo are never printed or stored as successful capture', t => {
  for (const patch of [r => {r.status = 1; r.stderr = token;}, r => {r.status = null; r.error = Error(token);}, r => {r.stdout = token;}]) {
    const f = fixture(t, ({result}) => patch(result)); assert.throws(f.execute, e => e.code === 'config_read_failed' && !String(e).includes(token));
    assert.equal(f.calls.length, 1); assert.ok(!fs.existsSync(path.join(f.calls[0].work, 'BASELINE.json')));
  }
});
test('umask is restored even when capture fails', t => {
  const f = fixture(t, ({result}) => {result.status = 1;}); const before = process.umask(); assert.throws(f.execute); assert.equal(process.umask(), before);
});
test('CLI names with spaces are preserved as data, without any shell invocation', t => {
  const f = fixture(t, ({result, index}) => {if (index % 2 === 0) {const rows = JSON.parse(result.stdout); rows[0].versionTag = 'Existing version 42'; result.stdout = JSON.stringify(rows);}});
  assert.equal(f.execute().activeVersion.versionTag, 'Existing version 42');
});
test('linked output symlink is rejected and its external target is left intact', t => {
  const f = fixture(t, ({options, index}) => {
    if (index !== 1) return;
    const target = path.join(f.directory, 'external-config'), output = path.join(options.cwd, 'shopify.app.before.toml');
    fs.writeFileSync(target, 'unchanged'); fs.unlinkSync(output); fs.symlinkSync(target, output);
  });
  assert.throws(f.execute, {code: 'private_file'}); assert.equal(fs.readFileSync(path.join(f.directory, 'external-config'), 'utf8'), 'unchanged');
});
test('disabled TLS verification is rejected before any CLI request', t => {
  const f = fixture(t), old = process.env.NODE_TLS_REJECT_UNAUTHORIZED; process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {assert.throws(f.execute, {code: 'tls_verification_disabled'}); assert.equal(f.calls.length, 0);}
  finally {if (old === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; else process.env.NODE_TLS_REJECT_UNAUTHORIZED = old;}
});
