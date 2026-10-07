"""Saved Excel jobs: real browser, downloads, correction and process restart.
Only fresh synthetic loopback fixtures; no live URL or private database accepted.
"""
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import Workbook, load_workbook
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/saved-excel-resume'


def workbook(file, sheets):
    book = Workbook()
    book.remove(book.active)
    for name, rows in sheets.items():
        sheet = book.create_sheet(name)
        columns = list(dict.fromkeys(key for row in rows for key in row))
        sheet.append(columns)
        for row in rows:
            sheet.append([row.get(key, '') for key in columns])
    book.save(file)


def records(sheet):
    rows = list(sheet.values)
    return [dict(zip(rows[0], row)) for row in rows[1:] if any(v is not None for v in row)]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
              'data': 'fresh synthetic loopback fixtures', 'published': False, 'checks': {}}

    def record(name, value=True):
        report['checks'][name] = value
        print(name + ': PASS', flush=True)
        save()

    def save():
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')

    with tempfile.TemporaryDirectory(prefix='g27-saved-excel-') as temp:
        folder = Path(temp)
        (folder / 'synthetic-flow-only').touch()
        env = dict(os.environ)
        env['PYTHONPATH'] = str(ROOT / '.local-data/python') + os.pathsep + env.get('PYTHONPATH', '')
        log = (folder / 'server.log').open('w')
        server = None

        def start(resume=False):
            nonlocal server
            file = folder / ('resumed.json' if resume else 'ready.json')
            if resume:
                file.unlink(missing_ok=True)
            script = 'resume-synthetic-workshop.mjs' if resume else 'excel-customer-flow.mjs'
            server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures' / script), str(folder)],
                                      cwd=ROOT, env=env, stdout=log, stderr=log)
            deadline = time.monotonic() + 40
            while not file.exists():
                if server.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError('Synthetic fixture did not start')
                time.sleep(.1)
            return json.loads(file.read_text())

        def stop():
            server.terminate()
            server.wait(timeout=10)

        try:
            fixture = start()
            base = fixture['url']
            report['build'] = fixture['built']
            svg = folder / 'Zusatz.svg'
            svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><circle cx="60" cy="40" r="24" fill="#267c91"/></svg>')
            products = [{'import_key': 'saved-product-' + str(i), 'name': 'Serienprodukt ' + str(i + 1),
                         'master_id': fixture['masters'][0]['id'], 'master_revision': 1,
                         'price_eur': 'ungültig' if i == 2 else '19,99'} for i in range(3)]
            designs = [{'import_key': p['import_key'], 'design_id': 'extra', 'design_name': 'Zusatzdesign',
                        'design_file': 'Zusatz.svg', 'design_page': 1, 'design_fit': 'original',
                        'default_design': 1} for p in products]
            workbook(folder / 'Produkte.xlsx', {'Produkte': products, 'Designs': designs})
            errors = []
            with sync_playwright() as pw:
                browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
                page = browser.new_page(viewport={'width': 1440, 'height': 1050})
                page.on('pageerror', lambda error: errors.append(str(error)))

                def get(route):
                    r = page.request.get(base + route)
                    assert r.ok, (route, r.status)
                    return r.json()

                def goto(variant=False):
                    page.goto(base + ('/werkstatt/ausfuehrungen-import/' if variant else '/werkstatt/serien/'))
                    page.wait_for_function("!document.querySelector('#check').disabled")
                    # Wait for saved-list initialization, including an empty list.
                    page.wait_for_function("document.querySelector('#saved-jobs').options[0].textContent==='Gespeicherte Prüfung auswählen'")

                def check(file, count=1):
                    page.locator('#file').set_input_files(str(file))
                    page.click('#check')
                    expect(page.locator('#review')).to_be_visible()
                    expect(page.locator('#check')).to_be_enabled()
                    assert str(count) + ' Fehler' in page.inner_text('#summary'), page.inner_text('#rows')

                def save_job(name):
                    page.locator('#job-name').fill(name)
                    page.click('#save-job')
                    expect(page.locator('#save-job')).to_be_enabled()
                    selected = page.locator('#saved-jobs').input_value()
                    assert selected.startswith('imp_'), page.inner_text('#job-status')
                    return selected

                def reopen(job, variant=False):
                    goto(variant)
                    expect(page.locator('#saved-jobs option[value="' + job + '"]')).to_have_count(1)
                    page.select_option('#saved-jobs', job)
                    page.click('#open-job')
                    expect(page.locator('#review')).to_be_visible()
                    expect(page.locator('#open-job')).to_be_enabled()
                    assert page.locator('#file').input_value() == ''

                def download(button, file):
                    with page.expect_download() as pending:
                        page.click(button)
                    pending.value.save_as(str(file))
                    expect(page.locator(button)).to_be_enabled()

                def inventory():
                    return {p['id']: get('/api/workshop/products/' + p['id'])
                            for p in get('/api/workshop/products')['products'] if p['kind'] == 'product'}

                def lose_response(route, button):
                    def drop_after_commit(intercept):
                        response = intercept.fetch()
                        assert response.ok, response.status
                        intercept.abort('failed')
                    page.route('**' + route, drop_after_commit, times=1)
                    page.click(button)
                    expect(page.locator(button)).to_be_enabled()

                goto()
                page.locator('#design-files').set_input_files(str(svg))
                check(folder / 'Produkte.xlsx')
                expect(page.locator('#import')).to_be_disabled()
                job = save_job('Produktserie mit einer Korrektur')
                assert save_job('Erneut speichern') == job
                assert len(get('/api/workshop/batch/jobs')['jobs']) == 1 and inventory() == {}
                reopen(job)
                assert '1 Fehler' in page.inner_text('#summary')
                assert page.locator('#design-files').input_value() == ''
                page.locator('#skip-errors').check()
                lose_response('/api/workshop/batch/commit', '#import')
                before = inventory()
                assert len(before) == 2
                stop()
                base = start(True)['url']
                reopen(job)
                assert '2 bereits ausgeführt' in page.inner_text('#summary')
                assert inventory() == before
                record('productsSavedReopenedAfterLostResponseAndProcessRestart', {'created': 2, 'errors': 1})
                download('#download-errors', folder / 'Produktkorrektur.xlsx')
                book = load_workbook(folder / 'Produktkorrektur.xlsx')
                assert len(records(book['Produkte'])) == 1 and len(records(book['Designs'])) == 1
                assert records(book['Produkte'])[0]['import_key'] == products[2]['import_key']
                assert records(book['Produkte'])[0]['master_revision'] == 1
                column = [c.value for c in book['Produkte'][1]].index('price_eur') + 1
                book['Produkte'].cell(2, column, '24,99')
                book.save(folder / 'Produktkorrektur.xlsx')
                page.locator('#design-files').set_input_files(str(svg))
                check(folder / 'Produktkorrektur.xlsx', 0)
                corrected_job = save_job('Produktkorrektur')
                assert corrected_job != job
                reopen(corrected_job)
                page.click('#import')
                expect(page.locator('#result')).to_be_visible()
                assert '1 neue Konfigurationen' in page.inner_text('#status')
                all_products = inventory()
                assert len(all_products) == 3
                assert all(all_products[id] == record for id, record in before.items())
                assert all(len(p['document']['designs']) == 2 and p['document']['defaultDesignId'] == 'extra' for p in all_products.values())
                reopen(corrected_job)
                assert '1 bereits ausgeführt' in page.inner_text('#summary')
                page.click('#import')
                expect(page.locator('#result')).to_be_visible()
                assert '0 neue Konfigurationen' in page.inner_text('#status')
                assert inventory() == all_products
                record('productCorrectionRetainsDesignRowsAndExistingProducts', {'totalProducts': 3, 'repeatCreated': 0})
                page.screenshot(path=str(OUT / 'products-desktop.png'), full_page=True)

                ids = list(all_products)
                groups = [{'import_key': 'saved-group-' + str(i), 'name': 'Ausführungsgruppe ' + str(i + 1)} for i in range(3)]
                variants = [{'import_key': group['import_key'], 'variant_id': 'v' + str(j), 'label': 'Ausführung ' + str(j + 1),
                             'product_id': ids[j], 'product_revision': 999 if i == 2 and j == 1 else 1,
                             'default_variant': 1 if j == 0 else 0} for i, group in enumerate(groups) for j in range(2)]
                workbook(folder / 'Gruppen.xlsx', {'Gruppen': groups, 'Varianten': variants})
                goto(True)
                check(folder / 'Gruppen.xlsx')
                expect(page.locator('#apply')).to_be_disabled()
                group_job = save_job('Ausführungen mit einer Korrektur')
                assert save_job('Erneut speichern') == group_job
                assert len(get('/api/workshop/variants/batch/jobs')['jobs']) == 1
                assert len(get('/api/workshop/batch/jobs')['jobs']) == 2
                assert get('/api/workshop/variants')['groups'] == []
                reopen(group_job, True)
                page.locator('#skip-errors').check()
                lose_response('/api/workshop/variants/batch/commit', '#apply')
                before_groups = get('/api/workshop/variants')['groups']
                assert len(before_groups) == 2
                stop()
                base = start(True)['url']
                reopen(group_job, True)
                assert '2 bereits ausgeführt' in page.inner_text('#summary')
                assert get('/api/workshop/variants')['groups'] == before_groups
                record('groupsSavedReopenedAfterLostResponseAndProcessRestart', {'created': 2, 'errors': 1})
                download('#download-errors', folder / 'Gruppenkorrektur.xlsx')
                book = load_workbook(folder / 'Gruppenkorrektur.xlsx')
                assert len(records(book['Gruppen'])) == 1 and len(records(book['Varianten'])) == 2
                assert {row['import_key'] for row in records(book['Varianten'])} == {groups[2]['import_key']}
                column = [c.value for c in book['Varianten'][1]].index('product_revision') + 1
                book['Varianten'].cell(3, column, 1)
                book.save(folder / 'Gruppenkorrektur.xlsx')
                check(folder / 'Gruppenkorrektur.xlsx', 0)
                corrected_group_job = save_job('Korrigierte Ausführungen')
                assert corrected_group_job != group_job
                reopen(corrected_group_job, True)
                page.click('#apply')
                expect(page.locator('#result')).to_be_visible()
                assert '1 neue Gruppen' in page.inner_text('#notice')
                all_groups = get('/api/workshop/variants')['groups']
                assert len(all_groups) == 3
                assert all(g in all_groups for g in before_groups)
                reopen(corrected_group_job, True)
                assert '1 bereits ausgeführt' in page.inner_text('#summary')
                page.click('#apply')
                expect(page.locator('#result')).to_be_visible()
                assert '0 neue Gruppen' in page.inner_text('#notice')
                assert get('/api/workshop/variants')['groups'] == all_groups
                assert inventory() == all_products
                record('groupCorrectionRetainsAllVariantsAndProductRevisions', {'totalGroups': 3, 'repeatCreated': 0})
                page.screenshot(path=str(OUT / 'groups-desktop.png'), full_page=True)
                for variant, saved in [(False, job), (True, group_job)]:
                    reopen(saved, variant)
                    for width in [390, 768]:
                        page.set_viewport_size({'width': width, 'height': 1050})
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (variant, width)
                        if width == 390:
                            page.screenshot(path=str(OUT / ('groups-mobile.png' if variant else 'products-mobile.png')), full_page=True)
                    page.once('dialog', lambda dialog: dialog.dismiss())
                    page.click('#remove-job')
                    expect(page.locator('#saved-jobs')).to_have_value(saved)
                    page.once('dialog', lambda dialog: dialog.accept())
                    page.click('#remove-job')
                    expect(page.locator('#saved-jobs option[value="' + saved + '"]')).to_have_count(0)
                    assert inventory() == all_products and get('/api/workshop/variants')['groups'] == all_groups
                record('removeSnapshotCancelAndConfirmPreservesProductsAndGroups')
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
            save()
            if server and server.poll() is None:
                stop()
            log.close()


if __name__ == '__main__':
    main()
