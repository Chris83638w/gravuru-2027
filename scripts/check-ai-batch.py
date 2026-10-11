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
import urllib.request
import urllib.error
from types import SimpleNamespace
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect, Error as PlaywrightError
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/ai-batch'
OUT.mkdir(parents=True, exist_ok=True)
report = {'result': 'RUNNING', 'scope': 'local real runtime; simulated HTTPS ingress and App Bridge',
          'shopifyMerchantLoginVerified': False, 'httpsVerified': False, 'checks': {}}
with tempfile.TemporaryDirectory(prefix='g27-merchant-browser-') as tmp:
    folder = Path(tmp)
    (folder / '.synthetic-merchant-runtime').touch()
    photo=folder/'synthetic.png';Image.new('RGB',(600,800),'#748da4').save(photo)
    sample=Image.new('RGBA',(512,512),(0,0,0,0));draw=ImageDraw.Draw(sample);draw.ellipse((80,50,432,400),fill='#256f51');draw.rectangle((240,270,273,480),fill='#6d4b33');sample.save(folder/'synthetic-ai.png')
    log = (folder / 'fixture.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/merchant-host.mjs'), str(folder), 'ai-batch'],
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
            expect(page.locator('[data-select-product="'+ready['slate']['id']+'"]')).to_be_visible(timeout=30000)
            ids=[p['id'] for p in ready['batchSlates']]
            def select_products():
                for id in ids: page.locator('[data-select-product="'+id+'"]').check()
                page.locator('#ai-batch-selection').click()
                expect(page.locator('#aib-form')).to_be_visible(timeout=30000)
            select_products()
            expect(page.locator('#aib-targets fieldset')).to_have_count(3)
            page.locator('#aib-instruction').fill('Ordne den Namen etwas tiefer an.')
            page.locator('#aib-start').click()
            expect(page.locator('#aib-progress')).to_contain_text('3 von 3',timeout=30000)
            expect(page.locator('[data-aib-review]')).to_have_count(3)
            expect(page.locator('#aib-history')).to_contain_text('Bearbeitet',timeout=10000)
            page.locator('[data-aib-review]').first.click()
            expect(page.locator('#aib-after > svg')).to_be_visible()
            assert page.locator('#aib-before').inner_html()!=page.locator('#aib-after').inner_html()
            page.screenshot(path=str(OUT/'review-desktop.png'))
            page.set_viewport_size({'width':390,'height':844})
            assert page.locator('#ai-batch-dialog').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
            page.locator('#aib-apply').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/'review-mobile.png'))
            page.locator('#aib-apply').click()
            expect(page.locator('#aib-items')).to_contain_text('Übernommen')
            page.locator('#aib-close').click()
            page.reload()
            page.locator('#ai-batch-history').click()
            expect(page.locator('[data-aib-open]')).to_have_count(1)
            page.locator('[data-aib-open]').click()
            expect(page.locator('#aib-items')).to_contain_text('Übernommen')
            page.locator('#aib-close').click()
            page.set_viewport_size({'width':1440,'height':1000})
            select_products()
            page.locator('#aib-instruction').fill('LANGSAM: Name tiefer anordnen')
            page.locator('#aib-start').click()
            expect(page.locator('#aib-items')).to_contain_text('Wird erstellt',timeout=30000)
            page.locator('#aib-cancel').click()
            expect(page.locator('#aib-items')).to_contain_text('Antwort unbestätigt')
            expect(page.locator('#aib-items')).to_contain_text('Abgebrochen')
            page.locator('#aib-close').click()
            select_products()
            page.locator('#aib-kind').select_option('photo_edit')
            expect(page.locator('#aib-start')).to_be_disabled()
            for i in range(3):
                select=page.locator('[data-aib-photo="'+str(i)+'"]')
                select.select_option(index=1)
            page.locator('#aib-instruction').fill('Passe das Musterfoto an.')
            page.locator('#aib-start').click()
            expect(page.locator('#aib-progress')).to_contain_text('3 von 3',timeout=60000)
            page.locator('[data-aib-review]').first.click()
            expect(page.locator('#aib-summary')).to_contain_text('Musterfoto bearbeitet')
            expect(page.locator('#aib-after image')).not_to_have_count(0)
            page.screenshot(path=str(OUT/'photo-review.png'))
            page.locator('#aib-discard').click()
            expect(page.locator('#aib-items')).to_contain_text('Verworfen')
            page.locator('#aib-close').click()
            select_products()
            page.locator('#aib-kind').select_option('image_generate')
            page.locator('#aib-instruction').fill('Ein einzelner Baum als neues Motiv.')
            page.locator('#aib-start').click()
            expect(page.locator('#aib-progress')).to_contain_text('3 von 3',timeout=60000)
            page.locator('[data-aib-review]').first.click()
            expect(page.locator('#aib-summary')).to_contain_text('Neues KI-Motiv')
            page.locator('#aib-apply').click()
            expect(page.locator('#aib-items')).to_contain_text('Übernommen')
            assert not errors, errors
            report.update(result='PASS',apiRequests=len(api_checks),consoleErrors=errors,checks={'threeProducts':True,'separateReviews':True,'mobileNoHorizontalOverflow':True,'individualApplyAndReload':True,'durableHistory':True,'cancelSkipsQueued':True,'explicitPhotoAssignment':True,'photoBatch':True,'generatedMotifBatch':True},provider='synthetic; no OpenAI requests',privateData='synthetic products only')
            (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
            print(json.dumps(report))
            browser.close()
    finally:
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        server.terminate()
        server.wait(timeout=15)
        log.close()
print('Local merchant host browser check: PASS (synthetic identity; no real Shopify login)')
