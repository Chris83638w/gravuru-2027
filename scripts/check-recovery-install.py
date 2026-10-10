"""Exercise the distributed installer, fresh dependencies and actual packaged entry point."""
import argparse
import base64
import hashlib
import http.client
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import zipfile

p = argparse.ArgumentParser()
p.add_argument('archive', type=Path)
p.add_argument('--installer', type=Path, required=True)
p.add_argument('--report', type=Path, required=True)
args = p.parse_args()
archive = args.archive.resolve()
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
env = {k: v for k, v in os.environ.items() if not k.startswith(('GRAVURU_', 'GH_', 'GITHUB_')) and k != 'PYTHONPATH'}
checks = {}
with tempfile.TemporaryDirectory(prefix='g27-install-') as temporary:
    folder = Path(temporary)
    target, private = folder / 'application', folder / 'private'
    command = [sys.executable, str(args.installer.resolve()), '--archive', str(archive), '--sha256', digest,
               '--target', str(target), '--private-root', str(private), '--origin', 'https://recovery.example']

    def run(cmd, ok=True):
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=1100)
        if (result.returncode == 0) != ok:
            raise AssertionError('Unexpected installer result: ' + result.stdout + result.stderr)
        return result

    bad = command.copy(); bad[bad.index('--sha256') + 1] = '0' * 64
    run(bad, False)
    assert not target.exists() and not private.exists()
    altered = folder / 'altered.zip'
    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(altered, 'w') as dest:
        for item in source.infolist():
            data = source.read(item)
            dest.writestr(item, data + b'\n// changed\n' if item.filename == 'app.cjs' else data)
    bad = command.copy(); bad[bad.index('--archive') + 1] = str(altered)
    bad[bad.index('--sha256') + 1] = hashlib.sha256(altered.read_bytes()).hexdigest()
    run(bad, False)
    assert not target.exists() and not private.exists()
    checks['outerChecksumAndInnerManifestTamperingRejectedBeforeWrites'] = True
    foreign = folder / 'foreign'; foreign.mkdir(); sentinel = foreign / 'keep.txt'; sentinel.write_bytes(b'untouched')
    bad = command.copy(); bad[bad.index('--target') + 1] = str(foreign)
    run(bad, False)
    assert sentinel.read_bytes() == b'untouched' and not private.exists()
    checks['existingInstallationRefusedUnchanged'] = True
    installed = json.loads(run(command).stdout)
    assert installed['prepared'] and not installed['serverStarted']
    config = json.loads((private / 'config.json').read_text())['values']
    assert private.stat().st_mode & 0o777 == 0o700
    assert (private / 'config.json').stat().st_mode & 0o777 == 0o600
    checks['actualInstallerFreshVenvPrepareCheckAndPrivatePermissions'] = True
    config_hash = hashlib.sha256((private / 'config.json').read_bytes()).hexdigest()
    run(command, False)
    assert hashlib.sha256((private / 'config.json').read_bytes()).hexdigest() == config_hash
    checks['repeatInstallRefusedWithoutChangingCredentials'] = True
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]
    runtime = dict(env, GRAVURU_TEST_CONFIG_FILE=str(private / 'config.json'), GRAVURU_TEST_PORT=str(port))
    auth = 'Basic ' + base64.b64encode((config['GRAVURU_TEST_USERNAME'] + ':' + config['GRAVURU_TEST_PASSWORD']).encode()).decode()

    def request(path, body=None, extra=None, method='GET'):
        conn = http.client.HTTPConnection('127.0.0.1', port, timeout=20)
        headers = {'Host': 'recovery.example', 'X-Forwarded-Proto': 'https', **(extra or {})}
        conn.request(method, path, body, headers)
        response = conn.getresponse(); result = response.status, response.read(); conn.close()
        return result

    log = (private / 'runtime.log').open('w')
    def start():
        server = subprocess.Popen(['node', 'app.cjs'], cwd=target, env=runtime, stdout=log, stderr=log)
        for _ in range(200):
            if server.poll() is not None:raise AssertionError('Packaged server exited')
            try:
                if request('/__test/health')[0] == 401:return server
            except OSError:pass
            time.sleep(.1)
        server.terminate(); server.wait(timeout=10); raise AssertionError('Startup timeout')
    server = None
    try:
        server = start()
        headers = {'Authorization': auth, 'Content-Type': 'application/json'}
        assert request('/__test/health', extra=headers)[0] == 200
        assert request('/werkstatt/', extra=headers)[0] == 200
        assert request('/api/workshop/products')[0] == 401
        assert request('/api/workshop/products', extra={**headers, 'Host': 'wrong.example'})[0] == 403
        for path in ['/.env', '/PACKAGE-MANIFEST.json', '/ops/plesk/install-archive.py', '/private/']:
            assert request(path, extra=headers)[0] == 404
        assert request('/api/workshop/profiles', '{}', headers, 'POST')[0] == 403
        session = json.loads(request('/api/workshop/session', extra=headers)[1])
        headers['X-Gravuru-CSRF'] = session['csrfToken']
        payload = json.dumps({'name': 'Recovery synthetic colors', 'type': 'colors', 'items': ['#000000', '#ffffff']})
        status, body = request('/api/workshop/profiles', payload, headers, 'POST')
        assert status == 201
        before = request('/api/workshop/profiles', extra=headers)[1]
        checks['authenticatedDashboardHostCsrfPrivatePathGuardsAndSyntheticWrite'] = True
        server.terminate(); server.wait(timeout=10); server = start()
        assert request('/api/workshop/profiles', extra=headers)[1] == before
        assert json.loads(request('/api/workshop/session', extra=headers)[1])['csrfToken'] == session['csrfToken']
        checks['sqliteAndOpenSessionSurviveProcessRestart'] = True
        second = subprocess.run(['node', 'app.cjs'], cwd=target, env={**runtime, 'GRAVURU_TEST_PORT': '0'}, capture_output=True, timeout=20)
        assert second.returncode != 0 and request('/__test/health', extra=headers)[0] == 200
        checks['secondProcessRejectedWithoutDisruptingFirst'] = True
    finally:
        if server and server.poll() is None:server.terminate(); server.wait(timeout=10)
        log.close()
    versions = subprocess.check_output([str(private / 'python/bin/python'), '-m', 'pip', 'freeze'], text=True)
    report = {'result': 'PASS', 'archiveSha256': digest, 'version': installed['version'], 'sourceCommit': installed['sourceCommit'],
              'scope': 'fresh directories and Python venv; actual packaged process; synthetic data and loopback; no hosted TLS/Shopify/live test',
              'checks': checks, 'installedPythonPackages': versions.splitlines(), 'liveSystemChanged': False}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
