"""Real ZIP selection + XLSX mapping in Chromium; fresh synthetic loopback only."""
import hashlib
import json
import os
import runpy
import subprocess
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
import pymupdf
from openpyxl import load_workbook
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
workbook = runpy.run_path(str(ROOT / 'scripts/check-saved-excel-resume.py'))['workbook']
OUT = ROOT / '.test-output/design-zip-import'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
          'data': 'fresh synthetic ZIP/XLSX and loopback database', 'published': False, 'checks': {}}
with tempfile.TemporaryDirectory(prefix='g27-design-zip-') as temporary:
    folder = Path(temporary)
    (folder / 'synthetic-flow-only').touch()
    svg = lambda color: ('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80" fill="' + color + '"/></svg>').encode()
    pdf = pymupdf.open()
    for color in [(1, 0, 0), (0, 0, 1)]:
        p = pdf.new_page(width=120 * 72 / 25.4, height=80 * 72 / 25.4)
        p.draw_rect(pymupdf.Rect(20, 20, 200, 150), fill=color)
    pdf_bytes = pdf.tobytes()
    pdf.close()
    sources = {'Kollektion/klein/Design.svg': svg('#bc2828'), 'Kollektion/groß/Design.svg': svg('#2256ab'), 'Kollektion/Vorlage.pdf': pdf_bytes}
    archive = folder / 'Designs.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in sources.items():
            z.writestr(name, data)
        z.writestr('ungenutzt.svg', svg('#888888'))
        z.writestr('Hinweise.txt', 'Nicht importieren')
        z.writestr('weiteres.zip', 'Nicht rekursiv entpacken')
    with zipfile.ZipFile(folder / 'Unsicher.zip', 'w') as z:
        z.writestr('../Design.svg', svg('#000000'))
    with zipfile.ZipFile(folder / 'Kaputt.zip', 'w') as z:
        z.writestr('Design.svg', svg('#000000'))
    damaged = bytearray((folder / 'Kaputt.zip').read_bytes())
    damaged[30 + len('Design.svg')] ^= 1
    (folder / 'Kaputt.zip').write_bytes(damaged)
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
        products = [{'import_key': 'zip-' + str(i), 'name': 'ZIP-Produkt ' + str(i + 1), 'master_id': fixture['masters'][0]['id'], 'master_revision': 1} for i in range(4)]
        paths = list(sources) + ['Design.svg']
        designs = [{'import_key': p['import_key'], 'design_id': 'extra', 'design_name': 'ZIP-Design', 'design_file': paths[i], 'design_page': 2 if i == 2 else 1, 'design_fit': 'contain', 'default_design': 1} for i, p in enumerate(products)]
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

            def select_zip(file=archive):
                page.locator('#design-zip').set_input_files(str(file))
                expect(page.locator('#check')).to_be_enabled()
                expect(page.locator('#source-summary')).not_to_contain_text('wird im Browser geprüft')

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
                assert page.locator('#design-zip').input_value() == ''

            page.goto(base + '/werkstatt/serien/')
            expect(page.locator('#master option[value="' + fixture['masters'][0]['id'] + '"]')).to_have_count(1)
            select_zip()
            expect(page.locator('#source-summary')).to_contain_text('4 SVG-/PDF-Dateien')
            expect(page.locator('#source-summary')).to_contain_text('2 andere Dateien im ZIP')
            assert set(page.locator('#source-paths li').all_text_contents()) == set(sources) | {'ungenutzt.svg'}
            assert uploads == []
            page.locator('#file').set_input_files(str(folder / 'Import.xlsx'))
            check()
            expect(page.locator('#summary')).to_contain_text('1 Fehler')
            assert len(uploads) == 3 and inventory() == {}
            expect(page.locator('#rows')).to_contain_text('Design-Datei „Design.svg“')
            page.locator('#job-name').fill('ZIP mit fester Quellenzuordnung')
            page.click('#save-job')
            expect(page.locator('#save-job')).to_be_enabled()
            job = page.locator('#saved-jobs').input_value()
            snapshot = get('batch/jobs/' + job)
            assert {v['name'] for v in snapshot['input']['designFiles']} == set(sources)
            for ref in snapshot['input']['designFiles']:
                response = page.request.get(base + '/api/workshop/design-assets/' + ref['assetId'] + '/original')
                assert response.ok and response.body() == sources[ref['name']]
            assert next(v for v in snapshot['input']['designFiles'] if v['name'].endswith('.pdf'))['page'] == 2
            report['checks']['zipInventoryExactUnicodePathsPdfPageAndOnlyReferencedUploads'] = True

            page.locator('#skip-errors').check()
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            before = inventory()
            assert len(before) == 3
            for i, path in enumerate(sources):
                product = next(p for p in before.values() if p['document']['name'] == products[i]['name'])
                design = next(d for d in product['document']['designs'] if d['id'] == 'extra')
                assert design['sourceSha256'] == hashlib.sha256(sources[path]).hexdigest()
            open_job(job)
            expect(page.locator('#summary')).to_contain_text('3 bereits ausgeführt')
            assert len(uploads) == 3 and inventory() == before
            report['checks']['savedZipInputReopensWithoutArchiveOrUpload'] = True

            with page.expect_download() as pending:
                page.click('#download-errors')
            correction = folder / 'Korrektur.xlsx'
            pending.value.save_as(str(correction))
            book = load_workbook(correction)
            assert book['Produkte'].max_row == 2 and book['Designs'].max_row == 2
            column = [c.value for c in book['Designs'][1]].index('design_file') + 1
            book['Designs'].cell(2, column, paths[0])
            book.save(correction)
            page.locator('#file').set_input_files(str(correction))
            select_zip()
            check()
            expect(page.locator('#summary')).to_contain_text('0 Fehler')
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            complete = inventory()
            assert len(complete) == 4 and all(complete[key] == value for key, value in before.items())
            check()
            expect(page.locator('#summary')).to_contain_text('1 bereits ausgeführt')
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            assert inventory() == complete
            report['checks']['zipCorrectionCreatesOnlyMissingProductAndRepeatCreatesNone'] = True

            # Failed ZIP selection invalidates the old plan and cannot use cached originals.
            for name, message in [('Unsicher.zip', 'relativer Pfad'), ('Kaputt.zip', 'Prüfsumme')]:
                count = len(uploads)
                select_zip(folder / name)
                expect(page.locator('#source-summary')).to_contain_text(message)
                expect(page.locator('#import')).to_be_disabled()
                page.click('#check')
                expect(page.locator('#status')).to_contain_text(message)
                assert len(uploads) == count and inventory() == complete
            page.click('#clear-design-zip')
            expect(page.locator('#source-summary')).to_contain_text('0 SVG-/PDF-Dateien')
            assert get('batch/jobs/' + job)['input'] == snapshot['input']
            report['checks']['unsafeAndCorruptZipBlockedWithoutStaleFallbackOrProductChanges'] = True

            # Combining folder and ZIP uses the same exact references, with no silent precedence.
            duplicate_root = folder / 'Ordner'
            duplicate = duplicate_root / paths[0]
            duplicate.parent.mkdir(parents=True)
            duplicate.write_bytes(sources[paths[0]])
            page.locator('#design-folder').set_input_files(str(duplicate_root))
            select_zip()
            expect(page.locator('#source-summary')).to_contain_text('doppelt')
            count = len(uploads)
            page.click('#check')
            expect(page.locator('#status')).to_contain_text('doppelt')
            assert len(uploads) == count
            page.click('#clear-design-folder')
            expect(page.locator('#source-summary')).to_contain_text('4 SVG-/PDF-Dateien')
            report['checks']['zipFolderCollisionRejectedAndClearRecovers'] = True
            page.locator('#source-paths').locator('..').locator('summary').click()
            for width in [1440, 390, 768]:
                page.set_viewport_size({'width': width, 'height': 1050})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if width in [1440, 390]:
                    page.screenshot(path=str(OUT / ('zip-desktop.png' if width == 1440 else 'zip-mobile.png')), full_page=True)
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
print('Design ZIP import: PASS')
