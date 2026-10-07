"""Browser checks for failed job loading and stale saved update revisions."""
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from openpyxl import load_workbook
from playwright.sync_api import sync_playwright, expect
import runpy

ROOT = Path(__file__).resolve().parents[1]
helpers = runpy.run_path(str(ROOT / 'scripts/check-saved-excel-resume.py'))
workbook, records = helpers['workbook'], helpers['records']
OUT = ROOT / '.test-output/saved-excel-conflicts'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
          'data': 'fresh synthetic loopback fixtures', 'published': False, 'checks': {}, 'findings': []}

with tempfile.TemporaryDirectory(prefix='g27-saved-excel-conflicts-') as temp:
    folder = Path(temp)
    (folder / 'synthetic-flow-only').touch()
    env = dict(os.environ)
    env['PYTHONPATH'] = str(ROOT / '.local-data/python') + os.pathsep + env.get('PYTHONPATH', '')
    log = (folder / 'server.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/excel-customer-flow.mjs'), str(folder)],
                              cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 40
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Synthetic fixture did not start')
            time.sleep(.1)
        fixture = json.loads((folder / 'ready.json').read_text())
        base = fixture['url']
        report['build'] = fixture['built']
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1050})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/werkstatt/serien/')

            def get(route):
                response = page.request.get(base + route)
                assert response.ok, (route, response.status)
                return response.json()

            def write(route, data, method='POST'):
                csrf = get('/api/workshop/session')['csrfToken']
                response = page.request.fetch(base + route, method=method,
                                              headers={'X-Gravuru-CSRF': csrf}, data=data)
                assert response.ok, (route, response.status)
                return response.json()

            # Seed dependencies with the existing planner; tested actions below use the UI.
            seed = {'rows': [{'import_key': 'seed-' + str(i), 'name': 'Referenz ' + str(i),
                             'master_id': fixture['masters'][0]['id'], 'master_revision': 1} for i in range(2)]}
            plan = write('/api/workshop/batch/plan', seed)
            products = write('/api/workshop/batch/commit', {**seed, 'token': plan['token']})['products']
            group_input = {'rows': [{'import_key': 'seed-group', 'name': 'Referenzgruppe'}],
                           'variantRows': [{'import_key': 'seed-group', 'variant_id': 'v' + str(i),
                                            'label': 'Ausführung ' + str(i), 'product_id': p['id'],
                                            'product_revision': 1} for i, p in enumerate(products)]}
            plan = write('/api/workshop/variants/batch/plan', group_input)
            group = write('/api/workshop/variants/batch/commit', {**group_input, 'token': plan['token']})['groups'][0]

            for variant in [False, True]:
                label = 'groups' if variant else 'products'
                route = '/api/workshop/variants/batch' if variant else '/api/workshop/batch'
                page.goto(base + ('/werkstatt/ausfuehrungen-import/' if variant else '/werkstatt/serien/'))
                target = group['id'] if variant else products[0]['id']
                row = {'import_key': 'update-' + label, 'action': 'update', 'name': 'Name aus Excel',
                       'group_id' if variant else 'product_id': target, 'expected_revision': 1}
                workbook(folder / 'Update.xlsx', {'Gruppen' if variant else 'Produkte': [row]})
                page.locator('#file').set_input_files(str(folder / 'Update.xlsx'))
                page.click('#check')
                expect(page.locator('#review')).to_be_visible()
                expect(page.locator('#check')).to_be_enabled()
                assert '0 Fehler' in page.inner_text('#summary'), page.inner_text('#rows')
                page.locator('#job-name').fill('Gesicherte ' + label + '-Änderung')
                page.click('#save-job')
                expect(page.locator('#save-job')).to_be_enabled()
                job = page.locator('#saved-jobs').input_value()
                assert job.startswith('imp_')
                apply = page.locator('#apply' if variant else '#import')
                expect(apply).to_be_enabled()

                # A failed fresh review must not leave the earlier plan applicable.
                page.route('**' + route + '/jobs/' + job,
                           lambda r: r.fulfill(status=503, content_type='application/json',
                                               body=json.dumps({'error': {'message': 'Prüfablage vorübergehend nicht erreichbar.'}})), times=1)
                page.click('#open-job')
                expect(page.locator('#job-status')).to_contain_text('nicht erreichbar')
                expect(page.locator('#open-job')).to_be_enabled()
                if not apply.is_disabled():
                    report['findings'].append(label + ': alter Prüfplan bleibt nach fehlgeschlagenem Öffnen anwendbar')
                assert page.locator('#job-name').input_value() == 'Gesicherte ' + label + '-Änderung'
                page.screenshot(path=str(OUT / (label + '-load-error.png')), full_page=True)
                page.click('#open-job')
                expect(page.locator('#job-status')).not_to_contain_text('nicht erreichbar')
                expect(apply).to_be_enabled()

                # Change the target outside this tab; reopening must retain the old expected revision.
                endpoint = '/api/workshop/variants/' + target if variant else '/api/workshop/products/' + target
                existing = next(g for g in get('/api/workshop/variants')['groups'] if g['id'] == target) if variant else get(endpoint)
                changed = json.loads(json.dumps(existing['document']))
                changed['name'] = 'Zwischenzeitlich bearbeitet'
                newer = write(endpoint, {'document': changed, 'expectedRevision': 1}, 'PATCH')
                page.click('#open-job')
                expect(page.locator('#summary')).to_contain_text('1 Fehler')
                expect(apply).to_be_disabled()
                with page.expect_download() as pending:
                    page.click('#download-errors')
                correction = folder / (label + '-Korrektur.xlsx')
                pending.value.save_as(str(correction))
                book = load_workbook(correction)
                sheet = book['Gruppen' if variant else 'Produkte']
                saved_row = records(sheet)[0]
                assert saved_row['expected_revision'] == 1 and saved_row['import_key'] == row['import_key']
                snapshot = get(route + '/jobs/' + job)
                assert snapshot['input']['rows'][0]['expected_revision'] == 1
                assert newer['revision'] == 2
                current = next(g for g in get('/api/workshop/variants')['groups'] if g['id'] == target) if variant else get(endpoint)
                assert current['document'] == changed and current['revision'] == 2
                page.screenshot(path=str(OUT / (label + '-revision-conflict.png')), full_page=True)

                # Explicit operator correction of the revision, followed by preview and commit.
                column = [cell.value for cell in sheet[1]].index('expected_revision') + 1
                sheet.cell(2, column, 2)
                book.save(correction)
                page.locator('#file').set_input_files(str(correction))
                page.click('#check')
                expect(page.locator('#summary')).to_contain_text('0 Fehler')
                expect(apply).to_be_enabled()
                apply.click()
                expect(page.locator('#result')).to_be_visible()
                current = next(g for g in get('/api/workshop/variants')['groups'] if g['id'] == target) if variant else get(endpoint)
                assert current['revision'] == 3 and current['document']['name'] == row['name']
                assert {k: v for k, v in current['document'].items() if k != 'name'} == {k: v for k, v in changed.items() if k != 'name'}
                report['checks'][label + 'ConflictCorrectionPreservesOtherFields'] = True
                print(label + ': conflict and explicit correction PASS', flush=True)
            report['javascriptErrors'] = errors
            assert not errors, errors
            assert not report['findings'], report['findings']
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
