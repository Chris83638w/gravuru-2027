"""Extract the deliverable and test its actual entry point; no Plesk/server access."""
import argparse
import base64
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import threading
import time
import zipfile
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/plesk-package'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
parser.add_argument('--litespeed', action='store_true', help='Model LiteSpeed HTTP listen/address interception')
args = parser.parse_args()
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING', 'checks': {},
          'scope': 'extracted package; synthetic loopback proxy, not real Plesk or public TLS', 'published': False}
report['httpListener'] = 'simulated LiteSpeed interception' if args.litespeed else 'plain Node.js'


def unused_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


with tempfile.TemporaryDirectory(prefix='g27-plesk-package-') as temporary:
    folder = Path(temporary)
    application, data, python_dir = folder / 'application', folder / 'data', folder / 'python'
    application.mkdir()
    with zipfile.ZipFile(args.archive) as z:
        for name in z.namelist():
            assert not name.startswith('/') and '..' not in Path(name).parts
        z.extractall(application)
    manifest = json.loads((application / 'PACKAGE-MANIFEST.json').read_text())
    report['sourceCommit'] = manifest['sourceCommit']
    report['archiveSha256'] = hashlib.sha256(args.archive.read_bytes()).hexdigest()
    for item in manifest['files']:
        raw = (application / item['path']).read_bytes()
        assert len(raw) == item['bytes'] and hashlib.sha256(raw).hexdigest() == item['sha256']
    assert (application / 'app/workshop/design-zip.mjs').is_file()
    assert 'designSourceSettings' in (application / 'app/workshop/design-source-path.mjs').read_text()
    assert not any(application.rglob('*.sqlite'))
    report['checks']['manifestAndCurrentZipSourceSettingsVerifiedNoDatabases'] = True
    port = unused_port()
    env = {k: v for k, v in os.environ.items() if not k.startswith(('GRAVURU_', 'PIP_')) and k != 'PYTHONPATH'}
    env.update(GRAVURU_TEST_ORIGIN='https://private-test.example', GRAVURU_PRIVATE_DATA_DIR=str(data),
               GRAVURU_TEST_PYTHON_DIR=str(python_dir), GRAVURU_BOOTSTRAP_PYTHON=sys.executable,
               GRAVURU_TEST_USERNAME='synthetic-test', GRAVURU_TEST_PASSWORD=secrets.token_hex(24),
               GRAVURU_TEST_PORT=str(port), PIP_NO_INDEX='1')
    authorization = 'Basic ' + base64.b64encode((env['GRAVURU_TEST_USERNAME'] + ':' + env['GRAVURU_TEST_PASSWORD']).encode()).decode()
    runtime_command = ['node', 'app.cjs']
    if args.litespeed:
        # lsnode.js captures the first HTTP listener and replaces address() for
        # every HTTP server. A private inner listener must not reach that hook.
        preload = folder / 'litespeed-listener.cjs'
        preload.write_text('''const http = require('node:http');
const nativeListen = http.Server.prototype.listen;
let captured = false;
http.Server.prototype.realListen = nativeListen;
http.Server.prototype.address = function () { return '/synthetic/lsnode.sock'; };
http.Server.prototype.listen = function () {
  if (captured) throw Error('LiteSpeed listener was captured more than once');
  captured = true;
  return nativeListen.call(this, Number(process.env.GRAVURU_TEST_PORT), '127.0.0.1');
};
''')
        runtime_command = ['node', '--require', str(preload), 'app.cjs']

    def run(command, override=None, ok=True):
        result = subprocess.run(command, cwd=application, env={**env, **(override or {})}, capture_output=True, text=True, timeout=120)
        assert env['GRAVURU_TEST_PASSWORD'] not in result.stdout + result.stderr
        assert (result.returncode == 0) == ok, result.stdout + result.stderr
        return result

    # The test venv reuses already installed dependencies, without a second network installation.
    # The actual prepare command still runs pip against its isolated environment.
    init = "const {testConfig,markerValue,PYTHON_MARKER}=await import('./ops/plesk/config.mjs');const {initializeDirectory}=await import('./ops/plesk/prepare.mjs');const c=testConfig(process.env);initializeDirectory(c.pythonDir,PYTHON_MARKER,markerValue(c,'test-python'));"
    run(['node', '--input-type=module', '-e', init])
    run([sys.executable, '-m', 'venv', '--system-site-packages', str(python_dir)])
    site = Path(run([str(python_dir / 'bin/python'), '-c', 'import site; print(site.getsitepackages()[0])']).stdout.strip())
    (site / 'synthetic-test-dependencies.pth').write_text(str(ROOT / '.local-data/python') + '\n')
    foreign = folder / 'foreign'
    foreign.mkdir()
    (foreign / 'workshop.sqlite').write_bytes(b'not test data')
    run(['node', 'ops/plesk/prepare.mjs'], {'GRAVURU_PRIVATE_DATA_DIR': str(foreign)}, ok=False)
    assert (foreign / 'workshop.sqlite').read_bytes() == b'not test data'
    assert list(foreign.iterdir()) == [foreign / 'workshop.sqlite']
    run(['node', 'ops/plesk/prepare.mjs'])
    checked = json.loads(run(['node', 'ops/plesk/check.mjs']).stdout)
    assert checked['configured'] and checked['dependencies'] and checked['sqlite'] and checked['cairo']
    report['runtimeCheck'] = checked
    for change in [{'GRAVURU_TEST_ORIGIN': 'https://gravuru-designwerkstatt.de'}, {'GRAVURU_PRIVATE_DATA_DIR': str(application / 'public/data')}, {'GRAVURU_TEST_PASSWORD': 'short'}]:
        run(['node', 'ops/plesk/check.mjs'], change, ok=False)
    data.chmod(0o755)
    run(['node', 'ops/plesk/check.mjs'], ok=False)
    data.chmod(0o700)
    report['checks']['prepareCheckCairoAndForeignLivePublicPathGuards'] = True

    def request(path, headers=None, body=None, method='GET'):
        connection = http.client.HTTPConnection('127.0.0.1', port, timeout=20)
        connection.request(method, path, body=body, headers={'Host': 'private-test.example', 'X-Forwarded-Proto': 'https', **(headers or {})})
        response = connection.getresponse()
        result = response.status, response.read(), dict(response.getheaders())
        connection.close()
        return result

    log = (folder / 'runtime.log').open('w')
    server = None
    proxy = None

    def start():
        process = subprocess.Popen(runtime_command, cwd=application, env=env, stdout=log, stderr=log)
        deadline = time.monotonic() + 25
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise AssertionError('Packaged runtime failed to start; private log retained until cleanup')
            try:
                if request('/__test/health')[0] == 401:
                    return process
            except OSError:
                pass
            time.sleep(.1)
        raise AssertionError('Packaged runtime startup timeout')

    def stop(process):
        process.terminate()
        process.wait(timeout=10)

    try:
        server = start()
        assert request('/api/workshop/products')[0] == 401
        assert request('/__test/health', {'Authorization': authorization})[0] == 200
        for headers in [{'Authorization': 'Basic aW52YWxpZA=='}, {'Host': 'foreign.example', 'Authorization': authorization},
                        {'Origin': 'https://foreign.example', 'Authorization': authorization}, {'X-Forwarded-Proto': 'http', 'Authorization': authorization},
                        {'Sec-Fetch-Site': 'cross-site', 'Authorization': authorization}]:
            assert request('/api/workshop/products', headers)[0] in [401, 403]
        for path in ['/.env', '/PACKAGE-MANIFEST.json', '/ops/plesk/config.mjs', '/private/']:
            assert request(path, {'Authorization': authorization})[0] == 404
        assert request('/api/workshop/products', {'Authorization': authorization}, '{}', 'POST')[0] == 403
        second = run(runtime_command, {'GRAVURU_TEST_PORT': str(unused_port())}, ok=False)
        assert request('/__test/health', {'Authorization': authorization})[0] == 200
        report['checks']['passwordHostOriginHttpsCsrfPrivatePathsAndSingleProcessGuard'] = True

        class Proxy(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def handle_request(self):
                headers = {k: v for k, v in self.headers.items() if k.lower() not in ['host', 'connection', 'origin', 'x-forwarded-proto']}
                if self.headers.get('Origin'):
                    headers['Origin'] = 'https://private-test.example'
                body = self.rfile.read(int(self.headers.get('Content-Length', '0'))) or None
                status, content, response_headers = request(self.path, headers, body, self.command)
                self.send_response(status)
                for name, value in response_headers.items():
                    if name.lower() not in ['connection', 'transfer-encoding', 'content-length', 'date', 'server']:
                        self.send_header(name, value)
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)

            do_GET = do_POST = do_PATCH = do_DELETE = do_HEAD = handle_request

        proxy = ThreadingHTTPServer(('127.0.0.1', 0), Proxy)
        threading.Thread(target=proxy.serve_forever, daemon=True).start()
        base = 'http://127.0.0.1:' + str(proxy.server_port)
        svg = folder / 'Design.svg'
        svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="80mm" viewBox="0 0 100 80"><rect width="100" height="80" fill="#326694"/></svg>')
        csv = folder / 'Serie.csv'
        csv.write_text('import_key;name;design_file\nplesk-package-proof;Privater Pakettest;Design.svg\n')
        errors = []
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(http_credentials={'username': env['GRAVURU_TEST_USERNAME'], 'password': env['GRAVURU_TEST_PASSWORD']}, viewport={'width': 1440, 'height': 1000})
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/werkstatt/serien/')
            expect(page.locator('#master option')).to_have_count(1)
            page.locator('#file').set_input_files(str(csv))
            page.locator('#design-files').set_input_files(str(svg))
            page.click('#check')
            expect(page.locator('#summary')).to_contain_text('0 Fehler')
            expect(page.locator('#import')).to_be_enabled()
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            state = json.loads(request('/api/workshop/products', {'Authorization': authorization})[1])
            assert len(state['products']) == 2
            with page.expect_download() as download:
                page.click('#download-report')
            download.value.save_as(str(folder / 'report.xlsx'))
            with zipfile.ZipFile(folder / 'report.xlsx') as book:
                assert book.testzip() is None
            for width in [1440, 390]:
                page.set_viewport_size({'width': width, 'height': 1000})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.locator('#review').screenshot(path=str(OUT / ('package-desktop.png' if width == 1440 else 'package-mobile.png')))
            report['checks']['packagedBrowserSvgPythonExcelAndSqliteFlow'] = True
            stop(server)
            server = start()
            assert json.loads(request('/api/workshop/products', {'Authorization': authorization})[1]) == state
            page.reload()
            page.locator('#file').set_input_files(str(csv))
            page.locator('#design-files').set_input_files(str(svg))
            page.click('#check')
            expect(page.locator('#summary')).to_contain_text('1 bereits ausgeführt')
            expect(page.locator('#import')).to_be_enabled()
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            assert json.loads(request('/api/workshop/products', {'Authorization': authorization})[1]) == state
            assert not errors, errors
            browser.close()
        report['checks']['restartReleasesLockRetainsDataAndDoesNotDuplicate'] = True
        report['javascriptErrors'] = errors
        report['result'] = 'PASS'
    except Exception as error:
        report['result'] = 'FAIL'
        report['error'] = str(error)
        raise
    finally:
        if server is not None and server.poll() is None:
            stop(server)
        if proxy:
            proxy.shutdown()
        log.close()
        assert env['GRAVURU_TEST_PASSWORD'] not in (folder / 'runtime.log').read_text()
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print('Plesk extracted package: PASS')
