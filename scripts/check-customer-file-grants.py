"""Merchant file-grant UI with locally signed synthetic sessions and orders.
No actual Shopify credentials, API requests, payments or production PDFs.
"""
import base64
import hashlib
import hmac
import json
import os
import subprocess
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/customer-file-grants'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
          'data': 'synthetic sessions, orders and file bytes only', 'published': False,
          'shopifyRequestSent': False, 'checks': {}}

with tempfile.TemporaryDirectory(prefix='g27-customer-file-grants-') as temp:
    folder = Path(temp)
    (folder / 'synthetic-file-grants-only').touch()
    env = dict(os.environ)
    env['PYTHONPATH'] = str(ROOT / '.local-data/python') + os.pathsep + env.get('PYTHONPATH', '')
    log = (folder / 'server.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/customer-file-grants.mjs'), str(folder)],
                              cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 40
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Synthetic fixture did not start')
            time.sleep(.1)
        fixture = json.loads((folder / 'ready.json').read_text())
        config, base = fixture['config'], fixture['url']
        first, second = fixture['fixtures']
        report['build'] = fixture['built']

        def b64(value):
            return base64.urlsafe_b64encode(value).decode().rstrip('=')

        def token(customer=None):
            now = int(time.time())
            payload = {'aud': config['clientId'], 'dest': config['shopDomain'] if customer else 'https://' + config['shopDomain'],
                       'sub': 'gid://shopify/Customer/' + customer if customer else '123',
                       'exp': now + 120, 'nbf': now, 'iat': now, 'jti': str(uuid.uuid4())}
            if not customer:
                payload['iss'] = 'https://' + config['shopDomain'] + '/admin'
            value = '.'.join(b64(json.dumps(p, separators=(',', ':')).encode()) for p in [{'alg': 'HS256', 'typ': 'JWT'}, payload])
            return value + '.' + b64(hmac.new(config['secret'].encode(), value.encode(), hashlib.sha256).digest())

        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1050})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.expose_function('syntheticMerchantToken', token)
            page.add_init_script('window.shopify={idToken:()=>window.syntheticMerchantToken()};')

            def get(route, customer=None):
                response = page.request.get(base + '/api/workshop/' + route,
                                            headers={'Authorization': 'Bearer ' + token(customer)})
                assert response.ok, (route, response.status)
                return response.json()

            def customer_download(grant, customer):
                return page.request.post(base + '/api/workshop/customer-files/' + grant,
                                         headers={'Authorization': 'Bearer ' + token(customer)}, data={})

            def grants(position=first):
                return get('orders/' + position['lineId'] + '/file-grants')['grants']

            def open_order(position):
                page.goto(base + '/werkstatt/bestellungen/?position=' + position['lineId'])
                expect(section.locator('form')).to_be_visible()
                expect(section.get_by_role('button', name='Für dieses Test-Kundenkonto freigeben')).to_be_enabled()

            section = page.get_by_role('heading', name='Dateien im Kundenkonto', exact=True).locator('..')
            submit = section.get_by_role('button', name='Für dieses Test-Kundenkonto freigeben')
            status = section.locator('[role=status]')
            original = get('orders/' + first['lineId'])
            assert get('customer-files', first['customerId'])['files'] == []
            open_order(first)
            expect(section.locator('select[name=format]')).to_have_value('pdf')
            assert grants() == []
            submit.click()
            expect(status).to_contain_text('Gesichert.')
            pdf = grants()[0]
            assert pdf['format'] == 'pdf' and pdf['sha256'] == first['pdfSha256']
            submit.click()
            expect(submit).to_be_enabled()
            assert len(grants()) == 1
            download = customer_download(pdf['id'], first['customerId'])
            assert download.status == 200 and hashlib.sha256(download.body()).hexdigest() == first['pdfSha256']
            assert download.headers['cache-control'] == 'no-store'
            assert customer_download(pdf['id'], second['customerId']).status == 404
            report['checks']['explicitDefaultPdfIdempotentCorrectCustomerAndHash'] = True

            # Separate white is absent in this access fixture; no grant may be created.
            section.locator('select[name=format]').select_option('white-pdf')
            submit.click()
            expect(submit).to_be_enabled()
            assert len(grants()) == 1
            assert 'Gesichert.' not in status.inner_text()
            section.locator('select[name=format]').select_option('zip')
            submit.click()
            expect(status).to_contain_text('Gesichert.')
            zip_grant = next(g for g in grants() if g['format'] == 'zip')
            assert hashlib.sha256(customer_download(zip_grant['id'], first['customerId']).body()).hexdigest() == first['zipSha256']
            report['checks']['explicitZipOnlyAndUnavailableWhiteRejected'] = True

            # Fresh reload restores grants but defaults to PDF rather than retaining ZIP.
            open_order(first)
            expect(section.locator('select[name=format]')).to_have_value('pdf')
            expect(section.locator('li')).to_have_count(2)
            pdf_row = section.locator('li').filter(has_text='PDF ·')
            pdf_row.get_by_role('button', name='Widerrufen').click()
            expect(pdf_row).to_contain_text('Widerrufen')
            expect(pdf_row.get_by_role('button', name='Widerrufen')).to_have_count(0)
            assert customer_download(pdf['id'], first['customerId']).status == 404
            assert customer_download(zip_grant['id'], first['customerId']).status == 200
            open_order(first)
            expect(section.locator('li').filter(has_text='PDF ·')).to_contain_text('Widerrufen')
            report['checks']['revocationSurvivesReloadAndKeepsOtherFormat'] = True
            section.screenshot(path=str(OUT / 'file-grants-desktop.png'))

            # Stale reads for another position must not replace the current form.
            pending = []
            page.route('**/orders/' + first['lineId'] + '/file-grants', lambda route: pending.append(route), times=1)
            page.click('#reload')
            deadline = time.monotonic() + 10
            while not pending:
                assert time.monotonic() < deadline
                page.wait_for_timeout(30)
            page.click('[data-order="' + second['lineId'] + '"]')
            expect(section.locator('form')).to_be_visible()
            expect(section.locator('select[name=job]')).to_have_value(second['jobId'])
            with page.expect_response(lambda r: r.url.endswith('/orders/' + first['lineId'] + '/file-grants')):
                pending[0].continue_()
            page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
            expect(section.locator('select[name=job]')).to_have_value(second['jobId'])
            expect(section.locator('li')).to_have_count(0)
            submit.click()
            expect(status).to_contain_text('Gesichert.')
            assert len(grants(second)) == 1 and len(grants()) == 2
            report['checks']['positionSwitchIgnoresStaleGrantRead'] = True

            # Signed test refund blocks both existing customer access and new UI grants.
            raw = json.dumps({**first['payload'], 'financial_status': 'refunded', 'updated_at': '2026-10-07T12:00:00Z'}, separators=(',', ':')).encode()
            response = page.request.post(base + '/api/workshop/order-webhook', data=raw, headers={
                'Content-Type': 'application/json', 'x-shopify-hmac-sha256': base64.b64encode(hmac.new(config['secret'].encode(), raw, hashlib.sha256).digest()).decode(),
                'x-shopify-shop-domain': config['shopDomain'], 'x-shopify-api-version': config['apiVersion'],
                'x-shopify-topic': 'orders/updated', 'x-shopify-webhook-id': str(uuid.uuid4())})
            assert response.ok
            open_order(first)
            submit.click()
            expect(submit).to_be_enabled()
            expect(status).to_contain_text('Zahlungsstatus')
            assert len(grants()) == 2
            assert customer_download(zip_grant['id'], first['customerId']).status == 409
            assert get('customer-files', first['customerId'])['files'] == []
            assert get('orders/' + first['lineId']) == original
            report['checks']['refundBlocksGrantAndCustomerDownloadWithoutChangingOrder'] = True
            for width in [390, 768]:
                page.set_viewport_size({'width': width, 'height': 1050})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                if width == 390:
                    section.screenshot(path=str(OUT / 'file-grants-mobile.png'))
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
print('Customer file-grant UI: PASS')
