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
OUT = ROOT / '.test-output/merchant-specimens'
OUT.mkdir(parents=True, exist_ok=True)
report = {'result': 'RUNNING', 'scope': 'local real runtime; simulated HTTPS ingress and App Bridge',
          'shopifyMerchantLoginVerified': False, 'httpsVerified': False, 'checks': {}}
with tempfile.TemporaryDirectory(prefix='g27-merchant-browser-') as tmp:
    folder = Path(tmp)
    (folder / '.synthetic-merchant-runtime').touch()
    photo=folder/'synthetic.png';Image.new('RGB',(600,800),'#748da4').save(photo)
    log = (folder / 'fixture.log').open('w')
    server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/merchant-host.mjs'), str(folder),'specimens'],
                              cwd=ROOT, env=dict(os.environ), stdout=log, stderr=log)
    try:
        deadline = time.monotonic() + 45
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > deadline:
                raise RuntimeError('Merchant fixture startup failed; no real credentials used')
            time.sleep(.1)
        ready = json.loads((folder / 'ready.json').read_text())
        signing_key = (folder / 'synthetic-key').read_text().encode()
        def encode(v):
            return base64.urlsafe_b64encode(json.dumps(v, separators=(',', ':')).encode()).rstrip(b'=')
        mode = {'offset': 2}
        def id_token():
            now = int(time.time()) + mode['offset']
            data = encode({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + encode({
                'aud': '9640dd7a6907f0c73e7013ea8c24869b', 'iss': 'https://gravuru-design.myshopify.com/admin',
                'dest': 'https://gravuru-design.myshopify.com', 'sub': '123456', 'iat': now,
                'nbf': now, 'exp': now + 60, 'jti': 'synthetic-browser-review'})
            return (data + b'.' + base64.urlsafe_b64encode(hmac.new(signing_key, data, hashlib.sha256).digest()).rstrip(b'=')).decode()
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
                try:
                    upstream=loopback.open(urllib.request.Request(target,method=req.method,headers=headers,data=req.post_data_buffer),timeout=45)
                except urllib.error.HTTPError as error:
                    upstream=error
                payload=upstream.read()
                response=SimpleNamespace(status=upstream.status,headers=dict(upstream.headers),body=lambda:payload,json=lambda:json.loads(payload))
                upstream.close()
                if response.status>=400: print('API FAILURE',url.path,response.status,payload[:450],flush=True)
                if url.path.startswith('/api/workshop/'):
                    api_checks.append({'path': url.path, 'status': response.status, 'method': req.method,
                                       'authenticated': headers.get('authorization', '').startswith('Bearer ')})
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
            expect(page.locator('#product-count')).to_have_text('4', timeout=30000)
            expect(page.locator('[data-workshop-session]')).to_have_text('Shopify · Testbetrieb', timeout=30000)
            page.wait_for_function("() => [...document.querySelectorAll('#product-list .product-image')].every(img => img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0)", timeout=30000)
            page.screenshot(path=str(OUT/'products.png'), full_page=True)
            for row in ready['specimens']:
                key=row['key'];pid=row['product']['id']
                page.goto(ready['origin']+'/werkstatt/?configuration='+pid)
                expect(page.locator('#editor-preview > svg')).to_be_visible(timeout=30000)
                page.wait_for_load_state('networkidle')
                count=40 if key=='aosu-labrador' else 1
                expect(page.locator('#stage-options option')).to_have_count(count)
                expect(page.locator('#stage-price')).to_contain_text('49,99' if key=='aosu-labrador' else '10,99')
                if key=='aosu-labrador':
                    page.locator('#stage-options').select_option('FK-SEITLICH|anthrazit|B04S')
                    expect(page.locator('#stage-price')).to_contain_text('53,68')
                    expect(page.locator('#editor-preview [data-mounting-screw]')).to_have_count(4)
                page.screenshot(path=str(OUT/(key+'-editor.png')), full_page=True)
                text=page.locator('#editor-elements [data-editor-object]').nth(1)
                oid=text.get_attribute('data-editor-object');text.click()
                field=page.locator('[data-editor-prop="text"]');expect(field).to_be_visible()
                original=field.input_value();field.fill('Heimat' if key=='aosu-labrador' else 'ZUHAUSE');field.press('Tab')
                expect(page.locator('#stage-status')).to_contain_text('Entwurf',timeout=30000)
                x=float(page.locator('[data-editor-prop="x"]').input_value())
                group=page.locator('#editor-preview [data-object="'+oid+'"]')
                group.scroll_into_view_if_needed();bounds=group.bounding_box();page.mouse.move(bounds['x']+bounds['width']/2,bounds['y']+bounds['height']/2)
                page.mouse.down();page.mouse.move(bounds['x']+bounds['width']/2+8,bounds['y']+bounds['height']/2,steps=6);page.mouse.up()
                expect(page.locator('#stage-status')).to_contain_text('Entwurf',timeout=30000)
                page.wait_for_function("(x)=>Number(document.querySelector('[data-editor-prop=x]').value)>x",arg=x,timeout=5000)
                print('SAVING',key,flush=True)
                page.locator('#save-product').click()
                expect(page.locator('#stage-status')).to_contain_text('Gespeicherter Stand',timeout=30000)
                page.reload();expect(page.locator('#editor-preview > svg')).to_be_visible(timeout=30000)
                page.locator('#editor-elements [data-editor-object="'+oid+'"]').click()
                expect(page.locator('[data-editor-prop="text"]')).to_have_value('Heimat' if key=='aosu-labrador' else 'ZUHAUSE')
                page.goto(ready['origin']+'/werkstatt/kundenansicht/?configuration='+pid+'&revision=2')
                frame=page.frame_locator('#editor iframe')
                expect(frame.locator('.plate-holder svg').first).to_be_visible(timeout=30000)
                page.wait_for_load_state('networkidle')
                page.screenshot(path=str(OUT/(key+'-customer.png')),full_page=True)
                frame.locator('.completion-finish').click()
                frame.locator('[data-acrylic-review]').click()
                expect(frame.locator('[data-acrylic-review-link]')).to_be_visible(timeout=30000)
                report['checks'][key+'EditorOptionsDragSaveReloadCustomer']=True
            page.set_viewport_size({'width':390,'height':844})
            page.screenshot(path=str(OUT/'steel-mobile.png'),full_page=True)
            assert not errors,errors
            assert all(c['status'] in [200,201] for c in api_checks),[c for c in api_checks if c['status'] not in [200,201]]
            report['checks']['allAuthenticatedApisSucceeded']=True
            report['apiRequests']=len(api_checks)
            report['result']='PASS'
            browser.close()
    except Exception:
        print('API results',api_checks[-8:] if 'api_checks' in locals() else [],flush=True)
        print('JS errors',errors if 'errors' in locals() else [],flush=True)
        raise
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill();server.wait()
        log.close()
        (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
