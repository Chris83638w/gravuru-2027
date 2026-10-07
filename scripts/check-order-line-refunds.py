"""New line-refund UI on signed synthetic order snapshots, loopback only."""
import base64
import hashlib
import hmac
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/order-line-refunds'
OUT.mkdir(parents=True, exist_ok=True)
report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'result': 'RUNNING',
          'data': 'synthetic only', 'shopifyRequestSent': False, 'published': False}
with tempfile.TemporaryDirectory(prefix='g27-refund-browser-') as temporary:
    folder = Path(temporary)
    (folder / 'synthetic-acrylic-order-only').touch()
    env = dict(os.environ, PYTHONPATH=str(ROOT / '.local-data/python'))
    log = (folder / 'server.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/acrylic-order.mjs'), str(folder)],
                              cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 60
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Synthetic fixture failed to start')
            time.sleep(.1)
        fixture = json.loads((folder / 'ready.json').read_text())
        base = fixture['url']
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))

            def get(route):
                response = page.request.get(base + '/api/workshop/' + route)
                assert response.ok, response.status
                return response.json()

            csrf = get('session')['csrfToken']

            def post(route, data):
                response = page.request.post(base + '/api/workshop/' + route,
                                             headers={'X-Gravuru-CSRF': csrf}, data=data)
                assert response.ok, response.status
                return response.json()

            binding = post('order-bindings', {'shopDomain': fixture['webhook']['shopDomain'],
                'variantId': '301', 'productId': fixture['productId'], 'productRevision': 1,
                'snapshotId': fixture['snapshotId']})
            offers = [post('order-offers', {'bindingId': binding['id'],
                      'snapshotId': fixture['snapshotId'], 'quantity': 2}) for _ in range(2)]
            paid = {'id': 101, 'test': True, 'currency': 'EUR', 'financial_status': 'paid',
                    'updated_at': '2026-10-07T10:00:00Z', 'line_items': [
                        {'id': 201 + i, 'variant_id': 301, 'quantity': 2, 'price': '36.97',
                         'properties': [offer['property']]} for i, offer in enumerate(offers)]}

            def deliver(payload, event, topic='orders/updated'):
                raw = json.dumps(payload, separators=(',', ':')).encode()
                headers = {'Content-Type': 'application/json',
                    'x-shopify-hmac-sha256': base64.b64encode(hmac.new(
                        fixture['webhook']['secret'].encode(), raw, hashlib.sha256).digest()).decode(),
                    'x-shopify-shop-domain': fixture['webhook']['shopDomain'],
                    'x-shopify-api-version': fixture['webhook']['apiVersion'],
                    'x-shopify-topic': topic, 'x-shopify-webhook-id': event}
                response = page.request.post(base + '/api/workshop/order-webhook', headers=headers, data=raw)
                assert response.ok, response.status
                return response.json()

            lines = deliver(paid, 'line-refund-paid-1001', 'orders/paid')['lines']
            page.goto(base + '/werkstatt/bestellungen/?position=' + lines[0]['id'])
            expect(page.locator('#line-refunds-state')).to_contain_text('Keine positionsbezogenen')
            expect(page.locator('#line-refunds-values')).to_be_hidden()
            allocation = {'id': 501, 'refund_line_items': [
                {'line_item_id': 201, 'quantity': 1, 'subtotal': '30.00', 'total_tax': '6.97'}]}
            partial = {**paid, 'financial_status': 'partially_refunded',
                       'updated_at': '2026-10-07T11:00:00Z', 'refunds': [allocation]}
            deliver(partial, 'line-refund-partial-1001')
            assert deliver(partial, 'line-refund-partial-1001')['duplicate']
            page.locator('#reload').click()
            values = page.locator('#line-refunds-values')
            expect(values).to_be_visible()
            expect(values.locator('dd').nth(0)).to_have_text('1')
            expect(values.locator('dd').nth(1)).to_contain_text('30,00')
            expect(values.locator('dd').nth(2)).to_contain_text('6,97')
            expect(page.locator('#price')).to_contain_text('73,94')
            expect(page.locator('#line-refunds')).to_contain_text('kein Nachweis einer erfolgreichen Rückzahlung')
            for width in [1440, 390, 768]:
                page.set_viewport_size({'width': width, 'height': 1000})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.locator('#line-refunds').screenshot(path=str(OUT / ('allocation-' + str(width) + '.png')))

            page.locator('[data-order="' + lines[1]['id'] + '"]').click()
            expect(values.locator('dd').nth(0)).to_have_text('0')
            expect(values.locator('dd').nth(1)).to_contain_text('0,00')
            expect(page.locator('#line-refunds-state')).to_contain_text('keine Erstattungszeile')
            page.locator('[data-order="' + lines[0]['id'] + '"]').click()
            expect(values.locator('dd').nth(1)).to_contain_text('30,00')

            # Latest status without details must label the previous allocation as older.
            deliver({**paid, 'updated_at': '2026-10-07T12:00:00Z'}, 'line-refund-stale-1001')
            page.locator('#reload').click()
            expect(page.locator('#line-refunds-state')).to_contain_text('Ältere Zuordnung')
            expect(values.locator('dd').nth(1)).to_contain_text('30,00')
            assert get('orders/' + lines[0]['id'] + '/status')['requiresReview']

            # Contradictory cumulative reports hide totals and remain flagged after reload.
            deliver({**paid, 'updated_at': '2026-10-07T13:00:00Z', 'refunds': []}, 'line-refund-conflict-1001')
            page.reload()
            expect(page.locator('#line-refunds-state')).to_contain_text('Erstattungszuordnung prüfen')
            expect(values).to_be_hidden()
            page.locator('#line-refunds').screenshot(path=str(OUT / 'conflict-768.png'))
            for line in lines:
                assert get('orders/' + line['id']) == line
                assert get('orders/' + line['id'] + '/status')['customerDownloadAllowed'] is False
            assert get('review-snapshots/' + fixture['snapshotId'])['manifest']['packageSha256'] == lines[0]['sourcePackageSha256']
            assert not errors, errors
            report.update(result='PASS', build=fixture['built'], separateLineValues=True,
                          missingIsNotZero=True, duplicateNotAdded=True, staleDetailsLabelled=True,
                          conflictHidesTotals=True, originalOrderAndSnapshotUnchanged=True,
                          paymentNotClaimed=True, customerDownloadAllowed=False,
                          viewports=[1440, 390, 768], javascriptErrors=errors)
            browser.close()
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
