"""Source-folder defaults and overrides; synthetic XLSX/ZIP, private loopback only."""
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
from openpyxl import load_workbook
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(ROOT / 'scripts/check-saved-excel-resume.py'))
workbook, records = helpers['workbook'], helpers['records']
OUT = ROOT / '.test-output/design-source-settings'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
          'data': 'fresh synthetic source folders/XLSX/ZIP and loopback database', 'published': False, 'checks': {}}
with tempfile.TemporaryDirectory(prefix='g27-source-settings-') as temporary:
    folder = Path(temporary)
    (folder / 'synthetic-flow-only').touch()
    sources = {name: ('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80" fill="' + color + '"/></svg>').encode()
               for name, color in [('Kollektion/klein/Design.svg', '#ba2525'), ('Andere/Design.svg', '#2266ab'), ('Design.svg', '#23854c')]}
    archive = folder / 'Designs.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in sources.items():
            z.writestr(name, data)
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
        products = [{'import_key': 'source-' + str(i), 'name': name, 'master_id': fixture['masters'][0]['id'], 'master_revision': 1}
                    for i, name in enumerate(['Gemeinsamer Ordner', 'Abweichender Ordner', 'Datei in der Wurzel', 'Ordner korrigieren'])]
        products[2].update(design_file='Design.svg', design_folder='.', design_fit='contain')
        designs = [{'import_key': 'source-0', 'design_id': 'extra', 'design_file': 'klein/Design.svg', 'design_folder': '', 'default_design': 1},
                   {'import_key': 'source-1', 'design_id': 'extra', 'design_file': 'Design.svg', 'design_folder': 'Andere', 'default_design': 1},
                   {'import_key': 'source-3', 'design_id': 'extra', 'design_file': 'Design.svg', 'design_folder': 'Fehlt', 'default_design': 1}]
        settings = [{'key': 'schema_version', 'value': '1'}, {'key': 'design_root', 'value': 'Kollektion'}]
        sheets = {'Produkte': products, 'Designs': designs, 'Einstellungen': settings}
        workbook(folder / 'Import.xlsx', sheets)
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

            def select_zip():
                page.locator('#design-zip').set_input_files(str(archive))
                expect(page.locator('#check')).to_be_enabled()
                expect(page.locator('#source-summary')).to_contain_text('3 SVG-/PDF-Dateien')

            def check():
                page.click('#check')
                expect(page.locator('#review')).to_be_visible()
                expect(page.locator('#check')).to_be_enabled()

            page.goto(base + '/werkstatt/serien/')
            expect(page.locator('#master option[value="' + fixture['masters'][0]['id'] + '"]')).to_have_count(1)
            select_zip()
            page.locator('#file').set_input_files(str(folder / 'Import.xlsx'))
            check()
            expect(page.locator('#summary')).to_contain_text('1 Fehler')
            expect(page.locator('#import-settings')).to_contain_text('Gemeinsamer Design-Ordner: Kollektion')
            for name in sources:
                expect(page.locator('#rows')).to_contain_text(name)
            expect(page.locator('#rows')).to_contain_text('Fehlt/Design.svg')
            assert len(uploads) == 3 and inventory() == {}
            page.locator('#job-name').fill('Quellordner mit einer Korrektur')
            page.click('#save-job')
            expect(page.locator('#save-job')).to_be_enabled()
            job = page.locator('#saved-jobs').input_value()
            snapshot = get('batch/jobs/' + job)
            assert snapshot['input']['settings'] == {'schema_version': '1', 'design_root': 'Kollektion'}
            assert {f['name'] for f in snapshot['input']['designFiles']} == set(sources)
            for ref in snapshot['input']['designFiles']:
                response = page.request.get(base + '/api/workshop/design-assets/' + ref['assetId'] + '/original')
                assert response.ok and response.body() == sources[ref['name']]
            report['checks']['defaultOverrideAndRootResolveExactOriginalsBeforeCommit'] = True

            page.locator('#skip-errors').check()
            page.click('#import')
            expect(page.locator('#result')).to_be_visible()
            before = inventory()
            assert len(before) == 3
            for i, source in enumerate(sources):
                product = next(p for p in before.values() if p['document']['name'] == products[i]['name'])
                assert product['document']['designs'][-1 if i < 2 else 0]['sourceSha256'] == hashlib.sha256(sources[source]).hexdigest()
            page.reload()
            expect(page.locator('#saved-jobs option[value="' + job + '"]')).to_have_count(1)
            page.select_option('#saved-jobs', job)
            page.click('#open-job')
            expect(page.locator('#summary')).to_contain_text('3 bereits ausgeführt')
            expect(page.locator('#import-settings')).to_contain_text('Kollektion')
            assert len(uploads) == 3 and inventory() == before
            assert page.locator('#design-zip').input_value() == ''
            report['checks']['savedDefaultsAndOverridesResumeWithoutReselectingArchive'] = True

            with page.expect_download() as pending:
                page.click('#download-errors')
            correction = folder / 'Korrektur.xlsx'
            pending.value.save_as(str(correction))
            book = load_workbook(correction)
            assert records(book['Einstellungen']) == settings
            assert len(records(book['Produkte'])) == len(records(book['Designs'])) == 1
            assert records(book['Designs'])[0]['design_folder'] == 'Fehlt'
            column = [c.value for c in book['Designs'][1]].index('design_folder') + 1
            book['Designs'].cell(2, column, 'Kollektion/klein')
            book.save(correction)
            select_zip()
            page.locator('#file').set_input_files(str(correction))
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
            assert inventory() == complete and get('batch/jobs/' + job)['input'] == snapshot['input']
            report['checks']['correctionRetainsDefaultsAndOnlyCreatesMissingProductOnce'] = True

            for values, message in [([{'key': 'design_root', 'value': '../Kollektion'}], 'relativen Ordnerpfad'),
                                    ([{'key': 'schema_version', 'value': '2'}], 'schema_version'),
                                    ([{'key': 'design_root', 'value': 'A'}, {'key': 'design_root', 'value': 'B'}], 'doppelter Schlüssel'),
                                    ([{'key': 'drive_token', 'value': 'synthetic-invalid-field'}], 'unbekannter'),
                                    ([{'key': 'design_root', 'value': '=1+1'}], 'Formeln')]:
                invalid = folder / 'Ungueltig.xlsx'
                workbook(invalid, {**sheets, 'Einstellungen': values})
                if message == 'Formeln':
                    bad = load_workbook(invalid)
                    bad['Einstellungen']['B2'] = '=1+1'
                    bad.save(invalid)
                count = len(uploads)
                page.locator('#file').set_input_files(str(invalid))
                expect(page.locator('#import')).to_be_disabled()
                page.click('#check')
                expect(page.locator('#status')).to_contain_text(message)
                expect(page.locator('#import')).to_be_disabled()
                assert len(uploads) == count and inventory() == complete
            report['checks']['invalidSettingsBlockBeforeUploadsAndInvalidatePriorReview'] = True

            csv = folder / 'Zeilenordner.csv'
            csv.write_text('import_key;name;master_id;master_revision;design_file;design_folder\nsource-csv;CSV-Ordner;' + fixture['masters'][0]['id'] + ';1;Design.svg;Andere\n')
            page.locator('#file').set_input_files(str(csv))
            check()
            expect(page.locator('#summary')).to_contain_text('0 Fehler')
            expect(page.locator('#rows')).to_contain_text('Andere/Design.svg')
            assert inventory() == complete  # CSV review only.
            template = page.request.get(base + '/api/workshop/import-template')
            assert template.ok
            template_path = folder / 'Vorlage.xlsx'
            template_path.write_bytes(template.body())
            book = load_workbook(template_path)
            assert book['Produkte']['W1'].value == book['Designs']['H1'].value == 'design_folder'
            assert records(book['Einstellungen']) == [{'key': 'schema_version', 'value': '1'}, {'key': 'design_root', 'value': None}]
            # Actual shipped template is parsed too; its original example remains valid.
            page.locator('#file').set_input_files(str(template_path))
            native = next(p for p in get('products')['products'] if p['kind'] == 'master' and not p.get('overview', {}).get('formProduct'))
            page.select_option('#master', native['id'])
            check()
            expect(page.locator('#summary')).to_contain_text('0 Fehler')
            report['checks']['csvRowOverrideAndShippedTemplateRemainUsable'] = True

            page.select_option('#saved-jobs', job)
            page.click('#open-job')
            expect(page.locator('#summary')).to_contain_text('3 bereits ausgeführt')
            for width in [1440, 390, 768]:
                page.set_viewport_size({'width': width, 'height': 1050})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if width in [1440, 390]:
                    page.locator('#review').screenshot(path=str(OUT / ('source-settings-desktop.png' if width == 1440 else 'source-settings-mobile.png')))
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
print('Design source settings: PASS')
