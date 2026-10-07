"""User-selected directory -> exact XLSX paths -> immutable private design sources."""
import hashlib
import json
import os
import runpy
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from openpyxl import load_workbook
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
workbook = runpy.run_path(str(ROOT / 'scripts/check-saved-excel-resume.py'))['workbook']
OUT = ROOT / '.test-output/design-folder-import'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
          'data': 'fresh synthetic folder and loopback database', 'published': False, 'checks': {}}
with tempfile.TemporaryDirectory(prefix='g27-design-folder-') as temporary:
    folder = Path(temporary)
    (folder / 'synthetic-flow-only').touch()
    source = folder / 'Designordner'
    for sub in ['klein', 'gross', 'nicht-verwendet']:
        (source / sub).mkdir(parents=True)
    for sub, color in [('klein', '#c02d2d'), ('gross', '#2359a1'), ('nicht-verwendet', '#123456')]:
        (source / sub / 'Design.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80" fill="' + color + '"/></svg>')
    (source / 'Hinweise.txt').write_text('Nicht als Design hochladen')
    original = {sub: (source / sub / 'Design.svg').read_bytes() for sub in ['klein', 'gross']}
    env = dict(os.environ)
    env['PYTHONPATH'] = str(ROOT / '.local-data/python') + os.pathsep + env.get('PYTHONPATH', '')
    log = (folder / 'server.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/excel-customer-flow.mjs'), str(folder)], cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 40
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Synthetic fixture did not start')
            time.sleep(.1)
        fixture = json.loads((folder / 'ready.json').read_text())
        base = fixture['url']
        report['build'] = fixture['built']
        products = [{'import_key': 'folder-' + str(i), 'name': 'Ordnerprodukt ' + str(i + 1),
                     'master_id': fixture['masters'][0]['id'], 'master_revision': 1} for i in range(3)]
        designs = [{'import_key': p['import_key'], 'design_id': 'extra', 'design_name': 'Ordnerdesign',
                    'design_file': ['klein/Design.svg', 'gross/Design.svg', 'Design.svg'][i],
                    'design_fit': 'original', 'default_design': 1} for i, p in enumerate(products)]
        workbook(folder / 'Import.xlsx', {'Produkte': products, 'Designs': designs})
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1050})
            errors, uploads = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: uploads.append(request.url) if request.url.endswith('/design-assets/import') else None)

            def get(path):
                response = page.request.get(base + '/api/workshop/' + path)
                assert response.ok, (path, response.status)
                return response.json()

            def inventory():
                return {p['id']: get('products/' + p['id']) for p in get('products')['products'] if p['kind'] == 'product'}

            def check():
                page.click('#check')
                expect(page.locator('#review')).to_be_visible()
                expect(page.locator('#check')).to_be_enabled()

            def open_job(job):
                page.reload()
                expect(page.locator('#saved-jobs option[value="' + job + '"]')).to_have_count(1)
                page.select_option('#saved-jobs', job)
                page.click('#open-job')
                expect(page.locator('#review')).to_be_visible()
                expect(page.locator('#open-job')).to_be_enabled()
                assert page.locator('#design-folder').input_value() == ''

            page.goto(base + '/werkstatt/serien/')
            expect(page.locator('#master option[value="' + fixture['masters'][0]['id'] + '"]')).to_have_count(1)
            page.locator('#design-folder').set_input_files(str(source))
            expect(page.locator('#source-summary')).to_contain_text('3 SVG-/PDF-Dateien')
            expect(page.locator('#source-summary')).to_contain_text('1 andere Dateien')
            assert set(page.locator('#source-paths li').all_text_contents()) == {'gross/Design.svg', 'klein/Design.svg', 'nicht-verwendet/Design.svg'}
            assert uploads == []
            page.locator('#file').set_input_files(str(folder / 'Import.xlsx'))
            check()
            expect(page.locator('#summary')).to_contain_text('1 Fehler')
            expect(page.locator('#rows')).to_contain_text('Design-Datei „Design.svg“')
            assert len(uploads) == 2
            assert inventory() == {}
            page.locator('#job-name').fill('Ordnerimport mit offenen Zeilen')
            page.click('#save-job')
            expect(page.locator('#save-job')).to_be_enabled()
            job = page.locator('#saved-jobs').input_value()
            snapshot = get('batch/jobs/' + job)
            assert {v['name'] for v in snapshot['input']['designFiles']} == {'klein/Design.svg', 'gross/Design.svg'}
            for source_ref in snapshot['input']['designFiles']:
                sub = source_ref['name'].split('/')[0]
                response = page.request.get(base + '/api/workshop/design-assets/' + source_ref['assetId'] + '/original')
                assert response.ok and response.body() == original[sub]
            report['checks']['directoryInventoryNoUploadUntilCheckAndExactPaths'] = True

            page.locator('#skip-errors').check()
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            before = inventory()
            assert len(before) == 2
            by_name = {p['document']['name']: p for p in before.values()}
            for i, sub in enumerate(['klein', 'gross']):
                d = next(d for d in by_name[products[i]['name']]['document']['designs'] if d['id'] == 'extra')
                assert d['sourceSha256'] == hashlib.sha256(original[sub]).hexdigest()
                assert d['originalName'] == 'Design.svg'
            open_job(job)
            expect(page.locator('#summary')).to_contain_text('2 bereits ausgeführt')
            assert len(uploads) == 2 and inventory() == before
            with page.expect_download() as pending:
                page.click('#download-report')
            downloaded = folder / 'Bericht.xlsx'
            pending.value.save_as(str(downloaded))
            rows = list(load_workbook(downloaded)['Designs'].values)
            file_column = rows[0].index('design_file')
            assert {r[file_column] for r in rows[1:]} == {'klein/Design.svg', 'gross/Design.svg', 'Design.svg'}
            report['checks']['privateSnapshotAndReportRetainPathsAndOriginalHashes'] = True

            # Correct only the missing reference in Excel, with the same two selected sources.
            designs[2]['design_file'] = 'klein/Design.svg'
            workbook(folder / 'Korrigiert.xlsx', {'Produkte': products, 'Designs': designs})
            page.locator('#design-folder').set_input_files(str(source))
            page.locator('#file').set_input_files(str(folder / 'Korrigiert.xlsx'))
            check()
            expect(page.locator('#summary')).to_contain_text('0 Fehler')
            expect(page.locator('#summary')).to_contain_text('2 bereits ausgeführt')
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            expect(page.locator('#status')).to_contain_text('1 neue Konfigurationen')
            complete = inventory()
            assert len(complete) == 3 and all(complete[key] == value for key, value in before.items())
            report['checks']['explicitPathCorrectionCreatesOnlyMissingProduct'] = True

            # A changed local file cannot replace private originals in a saved job or old product.
            (source / 'klein/Design.svg').write_bytes(original['klein'].replace(b'#c02d2d', b'#009900'))
            page.locator('#design-folder').set_input_files(str(source))
            check()
            expect(page.locator('#summary')).to_contain_text('2 Fehler')
            expect(page.locator('#rows')).to_contain_text('schon mit anderen Daten')
            assert inventory() == complete
            open_job(job)
            assert get('batch/jobs/' + job)['input'] == snapshot['input']
            assert inventory() == complete
            report['checks']['changedFolderCannotReplaceSavedSourcesOrProducts'] = True

            # Duplicate exact references across folder/direct selection are rejected before upload.
            (source / 'Design.svg').write_bytes(original['klein'])
            count = len(uploads)
            page.locator('#design-folder').set_input_files(str(source))
            page.locator('#design-files').set_input_files(str(source / 'Design.svg'))
            expect(page.locator('#source-summary')).to_contain_text('doppelt')
            page.locator('#file').set_input_files(str(folder / 'Korrigiert.xlsx'))
            page.click('#check')
            expect(page.locator('#status')).to_contain_text('doppelt')
            assert len(uploads) == count
            page.click('#clear-design-folder')
            expect(page.locator('#source-summary')).to_contain_text('1 SVG-/PDF-Dateien')
            expect(page.locator('#review')).to_be_hidden()
            expect(page.locator('#import')).to_be_disabled()
            report['checks']['duplicateExactReferenceRejectedBeforeUploadAndClearInvalidatesPlan'] = True

            page.locator('#design-files').set_input_files([])
            page.locator('#design-folder').set_input_files(str(source))
            page.locator('#source-paths').locator('..').locator('summary').click()
            for width in [1440, 390, 768]:
                page.set_viewport_size({'width': width, 'height': 1050})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if width in [1440, 390]:
                    page.screenshot(path=str(OUT / ('folder-desktop.png' if width == 1440 else 'folder-mobile.png')), full_page=True)
            report['viewports'] = [1440, 390, 768]
            report['javascriptErrors'] = errors
            assert not errors, errors
            browser.close()
        report['result'] = 'PASS'
    except Exception as error:
        report['result'] = 'FAIL'
        report['error'] = str(error)
        raise
    finally:
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        server.terminate()
        server.wait(timeout=10)
        log.close()
print('Design folder import: PASS')
