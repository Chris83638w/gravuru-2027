"""Browser acceptance of saved revisions and profile impact, synthetic loopback only."""
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/cloud-handoff'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
          'data': 'synthetic only', 'published': False, 'checks': {}}

with tempfile.TemporaryDirectory(prefix='g27-cloud-handoff-') as temporary:
    folder = Path(temporary)
    (folder / 'synthetic-konfi-only').touch()
    env = dict(os.environ, PYTHONPATH=str(ROOT / '.local-data/python'))
    log = (folder / 'server.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/existing-konfi.mjs'), str(folder)],
                              cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 45
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Synthetic loopback fixture failed to start')
            time.sleep(.1)
        fixture = json.loads((folder / 'ready.json').read_text())
        base = fixture['url']
        report['build'] = fixture['built']
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width': 1440, 'height': 1000})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            def get(route):
                response = page.request.get(base + '/api/workshop/' + route)
                assert response.ok, (route, response.status)
                return response.json()

            csrf = get('session')['csrfToken']

            def write(route, data, method='POST'):
                response = page.request.fetch(base + '/api/workshop/' + route, method=method,
                                              headers={'X-Gravuru-CSRF': csrf}, data=data)
                assert response.ok, (route, response.status, response.text()[:300])
                return response.json()

            # Check the real listener's boundaries without changing any data.
            assert page.request.get(base + '/werkstatt/', headers={'Host': 'foreign.invalid'}).status == 403
            assert page.request.get(base + '/werkstatt/', headers={'Origin': 'https://foreign.invalid'}).status == 403
            assert page.request.post(base + '/api/workshop/profiles', data={}).status == 403
            report['checks']['hostOriginCsrfDenied'] = True

            product_route = 'products/' + fixture['id']
            initial = get(product_route)
            document = initial['document']
            document['categoryIds'] = ['cloud-acceptance']
            saved = write(product_route, {'expectedRevision': 1, 'document': document}, 'PATCH')
            profile = write('profiles', {'name': 'Synthetische Prüffarben', 'type': 'colors',
                                         'items': ['#000000', '#ffffff']})
            settings = get('profiles')['settings']
            write('profile-settings', {'expectedRevision': settings['revision'], 'type': 'colors',
                                      'assignment': {'mode': 'override', 'profileId': profile['id']}})

            page.goto(base + '/werkstatt/?configuration=' + fixture['id'])
            page.locator('#tab-details').click()
            name = page.locator('[data-path=name]')
            name.fill('Ungespeicherte Cloud-Prüfung')
            page.locator('#tab-history').click()
            compare = page.locator('[data-compare-revision="1"]')
            compare.click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_contain_text('Stand 1 mit Stand 2 vergleichen')
            expect(dialog.locator('table')).to_be_visible()
            page.screenshot(path=str(OUT / 'revision-desktop.png'), full_page=True)
            dialog.get_by_role('button', name='Schließen', exact=True).click()
            expect(compare).to_be_focused()
            page.locator('#tab-details').click()
            expect(name).to_have_value('Ungespeicherte Cloud-Prüfung')
            assert get(product_route) == saved
            report['checks']['revisionComparePreservesUnsavedDraftAndFocus'] = True

            profiles = context.new_page()
            profiles.on('pageerror', lambda error: errors.append(str(error)))
            profiles.goto(base + '/werkstatt/profile/')
            profiles.locator('[data-profile-open="' + profile['id'] + '"]').click()
            profiles.locator('[data-item-remove="1"]').click()
            profiles.locator('#save-profile').click()
            impact = profiles.get_by_role('dialog')
            expect(impact).to_contain_text('Auswirkungen der Änderung')
            expect(impact).to_contain_text(saved['document']['name'])
            expect(impact).to_contain_text('#000000, #ffffff → #000000')
            profiles.screenshot(path=str(OUT / 'profile-impact-desktop.png'), full_page=True)
            impact.get_by_role('button', name='Zurück zur Bearbeitung').click()
            expect(profiles.locator('#save-profile')).to_be_focused()
            assert get('profiles/' + profile['id']) == profile
            expect(profiles.locator('[data-item-remove]')).to_have_count(1)
            profiles.locator('#save-profile').click()
            impact.get_by_role('button', name='Änderung speichern').click()
            expect(profiles.locator('#profile-save-state')).to_contain_text('Stand 2')
            assert get('profiles/' + profile['id'])['items'] == ['#000000']
            report['checks']['profileImpactCancelAndSave'] = True

            # Exercise both assignment scopes. Escape and cancel retain the chosen input.
            for scope in ['default', 'category']:
                profiles.locator('#assignment-scope').select_option(scope)
                if scope == 'category':
                    profiles.locator('#assignment-category').fill('cloud-acceptance')
                    profiles.locator('#assignment-category').blur()
                profiles.locator('#assignment-type').select_option('colors')
                profiles.locator('#assignment-mode').select_option('empty')
                before = get('profiles')['settings']
                profiles.locator('#save-assignment').click()
                expect(impact).to_contain_text(saved['document']['name'])
                if scope == 'default':
                    expect(impact).to_contain_text('#000000 → Keine')
                profiles.keyboard.press('Escape')
                expect(impact).to_have_count(0)
                expect(profiles.locator('#save-assignment')).to_be_focused()
                expect(profiles.locator('#assignment-mode')).to_have_value('empty')
                assert get('profiles')['settings'] == before
                profiles.locator('#save-assignment').click()
                impact.get_by_role('button', name='Änderung speichern').click()
                expect(profiles.locator('#assignment-state')).to_have_text(
                    'Zuordnungen · Stand ' + str(before['revision'] + 1))
                expect(profiles.locator('#save-assignment')).to_be_disabled()
                after = get('profiles')['settings']
                target = after['defaults'] if scope == 'default' else after['categories']['cloud-acceptance']
                assert target['colors']['mode'] == 'empty'
                report['checks'][scope + 'AssignmentCancelAndSave'] = True

            # A real mobile browser context with touch emulation, no physical device claim.
            mobile = browser.new_context(viewport={'width': 390, 'height': 844},
                                         is_mobile=True, has_touch=True, device_scale_factor=1)
            touch = mobile.new_page()
            touch.on('pageerror', lambda error: errors.append(str(error)))
            touch.goto(base + '/werkstatt/?configuration=' + fixture['id'])
            touch.locator('#tab-history').tap()
            touch.locator('[data-compare-revision="1"]').tap()
            expect(touch.get_by_role('dialog').locator('table')).to_be_visible()
            assert touch.evaluate('document.documentElement.scrollWidth <= innerWidth')
            touch.screenshot(path=str(OUT / 'revision-touch.png'), full_page=True)
            touch.get_by_role('button', name='Schließen', exact=True).tap()
            assert get(product_route) == saved
            report['checks']['touchEmulatedRevisionDialog'] = True
            report['javascriptErrors'] = errors
            assert not errors, errors
            mobile.close()
            browser.close()
            report['result'] = 'PASS'
    except Exception as error:
        report.update(result='FAIL', error=str(error))
        raise
    finally:
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        log.close()
print(json.dumps(report, indent=2))
