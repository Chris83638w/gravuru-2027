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
OUT = ROOT / '.test-output/merchant-steel-tabs'
OUT.mkdir(parents=True, exist_ok=True)
report = {'result': 'RUNNING', 'scope': 'local real runtime; simulated HTTPS ingress and App Bridge',
          'shopifyMerchantLoginVerified': False, 'httpsVerified': False, 'checks': {}}
with tempfile.TemporaryDirectory(prefix='g27-merchant-browser-') as tmp:
    folder = Path(tmp)
    (folder / '.synthetic-merchant-runtime').touch()
    photo=folder/'synthetic.png';Image.new('RGB',(600,800),'#748da4').save(photo)
    import pymupdf
    pdf=folder/'Grosses-Design.pdf';doc=pymupdf.open();p=doc.new_page(width=624,height=397);p.insert_text((40,90),'Unser Heimathafen',fontsize=28);p.draw_rect(pymupdf.Rect(40,130,580,350),color=None,fill=(.6,.6,.6));doc.save(pdf);doc.close()
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
            # Material filtering and category assignment use paginated summaries.
            page.locator('#catalog-material').select_option('steel')
            expect(page.locator('#product-count')).to_have_text('1')
            page.locator('#select-visible').check()
            page.locator('#catalog-group-selection').click()
            page.locator('#catalog-group-name').fill('hausschilder')
            page.locator('[data-group-apply]').click()
            expect(page.locator('#notice')).to_contain_text('1 Produkte zugeordnet',timeout=30000)
            page.locator('#catalog-category').select_option('hausschilder')
            expect(page.locator('#product-count')).to_have_text('1')
            page.wait_for_function("() => [...document.querySelectorAll('#product-list .product-image')].every(img => img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0)", timeout=30000)
            page.screenshot(path=str(OUT/'catalog.png'),full_page=True)
            report['checks']['materialCategoryListAndBulkAssignment']=True
            row=next(r for r in ready['specimens'] if r['key']=='steel-heimathafen')
            pid=row['product']['id']
            page.goto(ready['origin']+'/werkstatt/?configuration='+pid)
            expect(page.locator('#editor-preview > svg')).to_be_visible(timeout=30000)
            expect(page.locator('#workspace-designs-tab')).to_have_attribute('aria-selected','true')
            page.locator('#editor-design-search').fill('NICHTVORHANDEN')
            expect(page.locator('#editor-design-empty')).to_be_visible()
            page.locator('#editor-design-search').fill('')
            expect(page.locator('#editor-design-empty')).not_to_be_visible()
            page.locator('#workspace-product-tab').click()
            expect(page.locator('#panel-details')).to_be_visible()
            expect(page.locator('#editor-designs')).not_to_be_visible()
            page.locator('#workspace-product-tab').press('ArrowRight')
            expect(page.locator('#workspace-designs')).to_be_visible()
            page.locator('#workspace-designs-tab').press('Home')
            expect(page.locator('#workspace-product')).to_be_visible()
            report['checks']['workspaceTabsKeyboardAndDesignSearch']=True
            page.locator('#tab-details').click()
            page.locator('[data-steel-geometry="width"]').fill('180')
            page.locator('[data-steel-geometry="height"]').fill('120')
            page.locator('[data-steel-geometry="shape"]').select_option('ellipse')
            page.locator('[data-steel-refit]').click()
            expect(page.locator('#notice')).to_contain_text('Übernommen',timeout=30000)
            expect(page.locator('#editor-preview ellipse')).not_to_have_count(0)
            page.locator('#tab-prices').click()
            page.locator('[data-steel-add]').click()
            size=page.locator('[data-steel-row]').last
            size.locator('[data-steel-width]').fill('270')
            size.locator('[data-steel-price]').fill('29,99')
            size_id=size.get_attribute('data-steel-row')
            page.locator('[data-steel-save]').click()
            expect(page.locator('#stage-options option')).to_have_count(2,timeout=30000)
            page.locator('#stage-options').select_option(size_id+'|K00')
            expect(page.locator('#stage-price')).to_contain_text('29,99',timeout=30000)
            page.locator('#tab-scene').click()
            page.locator('#scene-background-file').set_input_files(str(photo))
            expect(page.locator('#scene-background-status')).to_contain_text('ausgetauscht',timeout=30000)
            expect(page.locator('#editor-preview [data-scene-background]')).to_have_count(1,timeout=30000)
            page.locator('#material-surface-file').set_input_files(str(photo))
            expect(page.locator('#material-surface-status')).to_contain_text('ausgetauscht',timeout=30000)
            page.locator('#tab-designs').click()
            button=page.locator('#editor-elements [data-editor-object]').nth(2)
            oid=button.get_attribute('data-editor-object');button.click()
            expect(page.locator('#stage-status')).to_contain_text('Entwurf',timeout=30000)
            group=page.locator('#editor-preview [data-object="'+oid+'"]')
            group.scroll_into_view_if_needed();bounds=group.bounding_box()
            page.mouse.move(bounds['x']+bounds['width']/2,bounds['y']+bounds['height']/2)
            page.mouse.down();page.mouse.move(bounds['x']+bounds['width']/2+12,bounds['y']+bounds['height']/2+8,steps=8)
            expect(page.locator('[data-editor-guides] line')).not_to_have_count(0)
            page.screenshot(path=str(OUT/'drag-guides.png'),full_page=True)
            page.mouse.up()
            expect(page.locator('[data-editor-guides]')).to_have_count(0)
            # Guides can be hidden independently of object editing.
            page.locator('#editor-guides-enabled').uncheck()
            group=page.locator('#editor-preview [data-object="'+oid+'"]');group.scroll_into_view_if_needed();bounds=group.bounding_box()
            page.mouse.move(bounds['x']+bounds['width']/2,bounds['y']+bounds['height']/2);page.mouse.down()
            page.mouse.move(bounds['x']+bounds['width']/2+6,bounds['y']+bounds['height']/2+4,steps=4)
            expect(page.locator('[data-editor-guides]')).to_have_count(0)
            page.mouse.up();page.locator('#editor-guides-enabled').check()
            # Save also adopts pending size edits, including after switching tabs.
            page.locator('#tab-prices').click()
            page.locator('[data-steel-price]').last.fill('29,99')
            page.locator('#tab-designs').click()
            page.locator('#save-product').click()
            expect(page.locator('#stage-status')).to_contain_text('Gespeicherter Stand',timeout=30000)
            page.reload();expect(page.locator('#editor-preview > svg')).to_be_visible(timeout=30000)
            expect(page.locator('#editor-preview ellipse')).not_to_have_count(0)
            expect(page.locator('#editor-preview [data-scene-background]')).to_have_count(1)
            page.screenshot(path=str(OUT/'steel-oval.png'),full_page=True)
            record=page.evaluate("async id=>(await (await import('/workshop-ui/merchant-request.mjs')).merchantRequest('/api/workshop/products/'+id)).json()",pid)
            revision=record['revision']
            assert record['document']['categoryIds']==['hausschilder']
            page.goto(ready['origin']+'/werkstatt/kundenansicht/?configuration='+pid+'&revision='+str(revision))
            frame=page.frame_locator('#editor iframe')
            expect(frame.locator('.plate-holder svg').first).to_be_visible(timeout=30000)
            frame.locator('[data-m-option="size"]').select_option(size_id)
            expect(frame.locator('[data-fk-total]')).to_contain_text('29,99')
            expect(frame.locator('.stage-top>span')).to_contain_text('270 × 180')
            expect(frame.locator('[data-m-invalid]')).to_have_text('')
            frame.locator('.completion-finish').click();frame.locator('[data-acrylic-review]').click()
            expect(frame.locator('[data-acrylic-review-link]')).to_be_visible(timeout=30000)
            report['checks']['ovalSizePriceSceneGuidesSaveReloadCustomerReview']=True
            # PDF import into the smaller steel contour used to use acrylic dimensions.
            page.goto(ready['origin']+'/werkstatt/?configuration='+pid)
            expect(page.locator('#editor-preview > svg')).to_be_visible(timeout=30000)
            page.locator('[data-design-action="import"]').first.click()
            page.locator('#design-import-file').set_input_files(str(pdf))
            expect(page.locator('#design-import-margin')).to_have_value('0')
            page.locator('#design-import-check').click()
            expect(page.locator('#design-import-apply')).to_be_enabled(timeout=30000)
            page.screenshot(path=str(OUT/'pdf-fit.png'),full_page=True)
            page.locator('#design-import-apply').click()
            expect(page.locator('#stage-status')).to_contain_text('Gespeicherter Stand',timeout=30000)
            saved=page.evaluate("async id=>(await (await import('/workshop-ui/merchant-request.mjs')).merchantRequest('/api/workshop/products/'+id)).json()",pid)
            assert saved['document']['config']['profile']['geometry']['safeMarginMm']==0
            expect(page.locator('#editor-preview feFuncA[type=discrete]')).not_to_have_count(0)
            page.locator('#workspace-designs-tab').click()
            page.locator('[data-editor-name]').fill('Geprüfte PDF-Gestaltung')
            page.locator('#workspace-product-tab').click()
            page.locator('#workspace-designs-tab').click()
            expect(page.locator('[data-editor-name]')).to_have_value('Geprüfte PDF-Gestaltung')
            expect(page.locator('#panel-designs')).to_contain_text('Gravurfarbe: Schwarz')
            page.screenshot(path=str(OUT/'steel-designs.png'),full_page=True)
            page.locator('#save-product').click()
            expect(page.locator('#stage-status')).to_contain_text('Gespeicherter Stand',timeout=30000)
            page.set_viewport_size({'width':390,'height':844})
            page.locator('#workspace-designs-tab').click()
            page.locator('#workspace-designs').scroll_into_view_if_needed()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path=str(OUT/'steel-designs-mobile.png'),full_page=True)
            page.locator('#workspace-product-tab').click()
            expect(page.locator('#workspace-product')).to_be_visible()
            page.set_viewport_size({'width':1440,'height':1000})
            report['checks']['pdfFitZeroMarginBlackVectorSaveAndMobileTabs']=True
            page.goto(ready['origin']+'/werkstatt/')
            expect(page.locator('#product-count')).to_have_text('4',timeout=30000)
            page.wait_for_function("() => [...document.querySelectorAll('#product-list .product-image')].every(img => img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0)", timeout=30000)
            page.set_viewport_size({'width':390,'height':844})
            page.screenshot(path=str(OUT/'catalog-mobile.png'),full_page=True)
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
