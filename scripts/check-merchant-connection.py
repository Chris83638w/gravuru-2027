"""Connection recovery and dirty editor preservation: local real runtime, synthetic App Bridge.

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
import urllib.request
import urllib.error
from types import SimpleNamespace
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect, Error as PlaywrightError
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/merchant-connection'
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
        mode = {'offset': 2}
        def id_token():
            now = int(time.time()) + mode['offset']
            data = encode({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + encode({
                'aud': '9640dd7a6907f0c73e7013ea8c24869b', 'iss': 'https://gravuru-design.myshopify.com/admin',
                'dest': 'https://gravuru-design.myshopify.com', 'sub': '123456', 'iat': now,
                'nbf': now, 'exp': now + 60, 'jti': 'synthetic-browser-review'})
            return (data + b'.' + base64.urlsafe_b64encode(hmac.new(key, data, hashlib.sha256).digest()).rstrip(b'=')).decode()
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(ignore_https_errors=False, viewport={'width': 1440, 'height': 1000})
            context.expose_function('__syntheticIdToken', id_token)
            api_checks, errors, cancelled_previews = [], [], []
            loopback = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            cart_fixture = {'productId': None, 'productRevision': None, 'calls': 0}
            def route_request(route):
                req = route.request
                url = urlsplit(req.url)
                if req.url == 'https://cdn.shopify.com/shopifycloud/app-bridge.js':
                    return route.fulfill(content_type='text/javascript', body="if(!document.querySelector('meta[name=shopify-shop]'))throw Error('Missing Shopify context');setTimeout(()=>{window.shopify={idToken:()=>window.__syntheticIdToken()};},100);")
                if url.scheme != 'https' or url.netloc != 'merchant.example':
                    return route.abort()
                target = 'http://127.0.0.1:' + str(ready['port']) + url.path + ('?' + url.query if url.query else '')
                headers = {**req.all_headers(), 'host': 'merchant.example', 'x-forwarded-proto': 'https'}
                if url.path.startswith('/api/workshop/customer-model/'):
                    cart_fixture.update(productId=url.path.rsplit('/',1)[1], productRevision=int(parse_qs(url.query)['revision'][0]))
                if url.path == '/api/workshop/merchant-test-cart':
                    assert headers.get('authorization','').startswith('Bearer ') and len(headers.get('x-gravuru-draft','')) == 64 and len(headers.get('x-gravuru-csrf','')) == 64
                    assert set(json.loads(req.post_data)) == {'draftId','expectedRevision'}
                    cart_fixture['calls'] += 1
                    return route.fulfill(json={'checkoutUrl':'https://gravuru-design.myshopify.com/checkout/synthetic','testOnly':True,'productionReady':False,'paymentConfirmed':False,'totalCents':1499})
                try:
                    upstream=loopback.open(urllib.request.Request(target,method=req.method,headers=headers,data=req.post_data_buffer),timeout=45)
                except urllib.error.HTTPError as error:
                    upstream=error
                payload=upstream.read()
                response=SimpleNamespace(status=upstream.status,headers=dict(upstream.headers),body=lambda:payload,json=lambda:json.loads(payload))
                upstream.close()
                if url.path.startswith('/api/workshop/'):
                    api_checks.append({'path': url.path, 'status': response.status, 'method': req.method,
                                       'authenticated': headers.get('authorization', '').startswith('Bearer ')})
                if url.path == '/api/workshop/session' and response.status == 200:
                    data=response.json();data['merchantTestCart']={k:cart_fixture[k] for k in ['productId','productRevision']}
                    return route.fulfill(status=200,json=data)
                try:
                    route.fulfill(status=response.status, headers=response.headers, body=response.body())
                except PlaywrightError as error:
                    # Navigation can cancel an intercepted thumbnail/preview while
                    # its real backend response is in flight. Never mask API errors.
                    if 'Route is already handled' not in str(error):
                        raise
                    cancelled_previews.append(url.path)
            context.route('**/*', route_request)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e).splitlines()[0][:180]))
            page.goto(ready['origin'] + '/werkstatt/')
            expect(page.locator('#product-count')).to_have_text('2', timeout=30000)
            expect(page.locator('[data-workshop-session]')).to_have_text('Shopify · Testbetrieb', timeout=30000)
            page.wait_for_load_state('networkidle')
            assert api_checks and all(c['status'] == 200 for c in api_checks)
            report['checks']['signedTokensTwoSecondsAheadLoadProductsAndProfiles'] = True
            # Reproduce the reported empty overview with a rejected signed token.
            mode['offset'] = 30
            page.reload()
            expect(page.locator('#notice')).to_contain_text('Anmeldung', timeout=30000)
            expect(page.locator('[data-workshop-session]')).to_have_text('Verbindung prüfen', timeout=30000)
            expect(page.locator('#product-list')).to_contain_text('konnte noch nicht geladen werden')
            page.screenshot(path=str(OUT/'rejected-session.png'), full_page=True)
            mode['offset'] = 2
            page.locator('[data-workshop-session]').click()
            expect(page.locator('#product-count')).to_have_text('2', timeout=30000)
            expect(page.locator('#notice')).to_contain_text('Produkte und Profile sind geladen', timeout=30000)
            report['checks']['overviewRecoversWithoutPageReload'] = True
            page.wait_for_function("() => [...document.querySelectorAll('#product-list .product-image')].every(img => img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0)", timeout=30000)
            report['checks']['authenticatedProductImagesLoadedAfterReconnect'] = True
            page.screenshot(path=str(OUT/'recovered-desktop.png'), full_page=True)
            page.locator('[data-product-id="'+ready['slate']['id']+'"]').first.click()
            expect(page.locator('#editor-preview > svg')).to_be_visible(timeout=30000)
            page.locator('[data-tab="details"]').click()
            page.locator('[data-path="name"]').fill('Ungespeicherte Gestaltung bleibt erhalten')
            page.locator('[data-path="name"]').press('Tab')
            expect(page.locator('#save-product')).to_be_enabled()
            expect(page.locator('#stage-status')).to_contain_text('Entwurf')
            mode['offset'] = 30
            page.evaluate("async()=>{const m=await import('/workshop-ui/merchant-request.mjs');try{await m.merchantRequest('/api/workshop/session')}catch{}}")
            expect(page.locator('[data-workshop-session]')).to_have_text('Verbindung prüfen')
            mode['offset'] = 2
            page.locator('[data-workshop-session]').click()
            expect(page.locator('#notice')).to_contain_text('Produkte und Profile sind geladen', timeout=30000)
            expect(page.locator('[data-path="name"]')).to_have_value('Ungespeicherte Gestaltung bleibt erhalten')
            expect(page.locator('#save-product')).to_be_enabled()
            report['checks']['reconnectionKeepsUnsavedEditorName'] = True
            # An explicit save still works after the recovered session, with CSRF.
            page.locator('#save-product').click()
            expect(page.locator('#stage-status')).to_contain_text('Gespeicherter Stand', timeout=30000)
            page.reload()
            expect(page.locator('#record-title')).to_have_text('Ungespeicherte Gestaltung bleibt erhalten', timeout=30000)
            report['checks']['explicitSaveAndReopenAfterReconnect'] = True
            page.set_viewport_size({'width':390,'height':844})
            expect(page.locator('#record-title')).to_be_visible()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            page.screenshot(path=str(OUT/'recovered-mobile.png'), full_page=True)
            assert not errors, errors
            report.update(result='PASS',apiRequests=api_checks,javascriptErrors=errors,cancelledIntercepts=cancelled_previews)
            context.unroute_all(behavior='wait')
            browser.close()
    except Exception as error:
        report.update(result='FAIL',apiRequests=api_checks if 'api_checks' in locals() else [],javascriptErrors=errors if 'errors' in locals() else [],error=str(error).split('Call log:')[0][:500])
        raise
    finally:
        (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
        server.terminate()
        server.wait(timeout=15)
        log.close()
print('Merchant connection browser check: PASS (synthetic signed tokens; no real Shopify login)')
