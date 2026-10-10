"""New merchant host boundary only: local real runtime, synthetic App Bridge.

No Shopify login, live API, actual HTTPS or production acceptance is implied.
"""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/merchant-host'
OUT.mkdir(parents=True, exist_ok=True)
report = {'result': 'RUNNING', 'scope': 'local real runtime; simulated HTTPS ingress and App Bridge',
          'shopifyMerchantLoginVerified': False, 'httpsVerified': False, 'checks': {}}
with tempfile.TemporaryDirectory(prefix='g27-merchant-browser-') as tmp:
    folder = Path(tmp)
    (folder / '.synthetic-merchant-runtime').touch()
    photo=folder/'synthetic.png';Image.new('RGB',(600,800),'#748da4').save(photo)
    log = (folder / 'fixture.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/merchant-host.mjs'), str(folder)],
                              cwd=ROOT, env=dict(os.environ), stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 45
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Merchant fixture startup failed; no real credentials used')
            time.sleep(.1)
        ready = json.loads((folder / 'ready.json').read_text())
        key = (folder / 'synthetic-key').read_text().encode()
        def encode(v):
            return base64.urlsafe_b64encode(json.dumps(v, separators=(',', ':')).encode()).rstrip(b'=')
        def id_token():
            now = int(time.time())
            data = encode({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + encode({
                'aud': '9640dd7a6907f0c73e7013ea8c24869b', 'iss': 'https://gravuru-design.myshopify.com/admin',
                'dest': 'https://gravuru-design.myshopify.com', 'sub': '123456', 'iat': now - 1,
                'nbf': now - 1, 'exp': now + 59, 'jti': 'synthetic-browser-review'})
            return (data + b'.' + base64.urlsafe_b64encode(hmac.new(key, data, hashlib.sha256).digest()).rstrip(b'=')).decode()
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(ignore_https_errors=False, viewport={'width': 1440, 'height': 1000})
            context.expose_function('__syntheticIdToken', id_token)
            api_checks, errors = [], []
            def route_request(route):
                req = route.request
                url = urlsplit(req.url)
                if req.url == 'https://cdn.shopify.com/shopifycloud/app-bridge.js':
                    return route.fulfill(content_type='text/javascript', body='window.shopify={idToken:()=>window.__syntheticIdToken()};')
                if url.scheme != 'https' or url.netloc != 'merchant.example':
                    return route.abort()
                target = 'http://127.0.0.1:' + str(ready['port']) + url.path + ('?' + url.query if url.query else '')
                headers = {**req.all_headers(), 'host': 'merchant.example', 'x-forwarded-proto': 'https'}
                response = context.request.fetch(target, method=req.method, headers=headers, data=req.post_data_buffer)
                if url.path.startswith('/api/workshop/'):
                    api_checks.append({'path': url.path, 'status': response.status,
                                       'authenticated': headers.get('authorization', '').startswith('Bearer ')})
                route.fulfill(status=response.status, headers=response.headers, body=response.body())
            context.route('**/*', route_request)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e).splitlines()[0][:180]))
            page.goto(ready['origin'] + '/werkstatt/')
            expect(page.locator('#overview-title')).to_have_text('Deine Konfi-Produkte')
            expect(page.locator('#product-count')).not_to_have_text('–', timeout=30000)
            page.locator('#new-product').click()
            page.locator('#create-name').fill('Synthetischer Händlerstart')
            page.locator('#create-submit').click()
            expect(page.locator('#create-dialog')).not_to_be_visible(timeout=30000)
            page.goto(ready['origin'] + '/werkstatt/')
            expect(page.locator('#product-count')).to_have_text('2', timeout=30000)
            expect(page.locator('#product-list')).to_contain_text('Synthetischer Händlerstart')
            page.wait_for_function("() => [...document.querySelectorAll('#product-list img')].some(img => img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0)", timeout=30000)
            page.screenshot(path=str(OUT / 'merchant-desktop.png'), full_page=True)
            page.locator('#product-list .product-card').filter(has_text='Synthetischer Händlerstart').locator('[data-product-id]').first.click()
            expect(page.locator('#customer-view')).to_be_visible(timeout=30000)
            page.locator('#customer-view').click()
            expect(page.locator('#editor iframe')).to_be_visible(timeout=30000)
            frame = page.frame_locator('#editor iframe')
            expect(frame.locator('.completion-finish')).to_be_visible(timeout=30000)
            frame.locator('[data-ux-file]').set_input_files(str(photo))
            expect(frame.locator('.ux-upload-thumb')).to_be_visible(timeout=30000)
            frame.locator('.completion-finish').click()
            frame.locator('[data-acrylic-review]').click()
            expect(frame.locator('[data-acrylic-review-link]')).to_be_visible(timeout=30000)
            page.screenshot(path=str(OUT / 'merchant-customer-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.screenshot(path=str(OUT / 'merchant-mobile.png'), full_page=True)
            overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            assert not overflow and not errors
            page.goto(ready['origin']+'/werkstatt/formprodukt/?configuration='+ready['form']['id'])
            expect(page.locator('#customer-view')).to_be_visible(timeout=30000)
            page.locator('#customer-view').click()
            form_frame=page.frame_locator('#editor iframe')
            expect(form_frame.locator('#customer-workspace')).to_be_visible(timeout=30000)
            expect(form_frame.locator('#customer-title')).to_have_text('Synthetische Händlerform')
            form_frame.locator('#capture-review').click()
            expect(form_frame.locator('#review-receipt')).to_contain_text('gesichert',timeout=30000)
            page.screenshot(path=str(OUT/'merchant-form-mobile.png'),full_page=True)
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            assert not errors

            report.update(apiRequests=api_checks,javascriptErrors=errors)
            assert api_checks and all(c['authenticated'] and c['status'] < 400 for c in api_checks), 'Authenticated UI requests must succeed: '+str([c for c in api_checks if not c['authenticated'] or c['status']>=400])
            report.update(result='PASS', apiRequests=api_checks, javascriptErrors=errors,
                          checks={'realMerchantUiLoaded': True, 'freshSyntheticBearerUsed': True,
                                  'productCreatedAndReopened': True, 'authenticatedPreviewLoaded': True,
                                  'customerEditorLoaded': True, 'privateCustomerSnapshotSaved': True,
                                  'freeFormCustomerEditorLoaded': True, 'freeFormSnapshotSaved': True,
                                  'mobileOverflow': False, 'privateBackendDataRequiresBearer': True})
            context.unroute_all(behavior='wait')
            browser.close()
    except Exception as error:
        report.update(result='FAIL', error=str(error).split('Call log:')[0][:500])
        raise
    finally:
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        server.terminate()
        server.wait(timeout=15)
        log.close()
print('Local merchant host browser check: PASS (synthetic identity; no real Shopify login)')
