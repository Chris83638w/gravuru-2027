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
from urllib.parse import urlsplit, parse_qs
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
                response = context.request.fetch(target, method=req.method, headers=headers, data=req.post_data_buffer)
                if url.path.startswith('/api/workshop/'):
                    api_checks.append({'path': url.path, 'status': response.status, 'method': req.method,
                                       'authenticated': headers.get('authorization', '').startswith('Bearer ')})
                if url.path == '/api/workshop/session' and response.status == 200:
                    data=response.json();data['merchantTestCart']={k:cart_fixture[k] for k in ['productId','productRevision']}
                    return route.fulfill(status=200,json=data)
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
            expect(page.locator('#product-count')).to_have_text('3', timeout=30000)
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
            expect(frame.locator('[data-merchant-test-cart]')).to_be_visible()
            expect(frame.locator('button[data-unconnected-cart]')).not_to_be_visible()
            frame.locator('[data-merchant-test-cart]').click()
            expect(frame.locator('[data-merchant-test-checkout]')).to_be_visible()
            expect(frame.locator('[data-acrylic-review] + [role=status]')).to_contain_text('Keine Fertigung freigegeben.')
            assert cart_fixture['calls']==1
            page.screenshot(path=str(OUT / 'merchant-customer-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.screenshot(path=str(OUT / 'merchant-mobile.png'), full_page=True)
            frame.locator('[data-ux=review-edit]').click()
            quantity=frame.locator('[data-fk-quantity]')
            quantity.fill(str(int(quantity.input_value())+1))
            quantity.press('Tab')
            frame.locator('.completion-finish').click()
            frame.locator('[data-merchant-test-checkout]').click()
            expect(frame.locator('[data-merchant-test-checkout]')).not_to_be_visible()
            frame.locator('[data-merchant-test-cart]').click()
            expect(frame.locator('[data-acrylic-review] + [role=status]')).to_contain_text('Bitte zuerst erneut sichern.')
            assert cart_fixture['calls']==1
            report['checks']['merchantTestCartUiSyntheticResponse']=True
            report['checks']['changedQuantityBlocksStaleCheckout']=True
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

            page.goto(ready['origin']+'/werkstatt/warenkorbpruefung/')
            expect(page.locator('#prepare')).to_be_enabled(timeout=30000)
            options=page.locator('#snapshot option').evaluate_all('(items)=>items.map(o=>({value:o.value,label:o.textContent}))')
            form_snapshot=next(o['value'] for o in options if 'Synthetische Händlerform' in o['label'])
            page.locator('#snapshot').select_option(form_snapshot)
            expect(page.locator('#prepare')).to_be_enabled(timeout=30000)
            page.locator('#shop').fill('gravuru-design.myshopify.com')
            page.locator('#variant').fill('301')
            page.locator('#prepare').click()
            expect(page.locator('#notice')).to_contain_text('nichts an Shopify gesendet',timeout=30000)
            expect(page.locator('#result-total')).to_contain_text('14,99')
            page.locator('#prepare').click()
            expect(page.locator('#notice')).to_contain_text('nichts an Shopify gesendet',timeout=30000)
            assert sum(c['path']=='/api/workshop/order-bindings' and c['method']=='POST' for c in api_checks)==1
            page.screenshot(path=str(OUT/'merchant-cart-mobile.png'),full_page=True)

            page.set_viewport_size({'width':1440,'height':1000})
            page.goto(ready['origin']+'/werkstatt/?shop=gravuru-design.myshopify.com&host=YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvZ3JhdnVydS1kZXNpZ24=&embedded=1')
            expect(page.locator('#product-count')).to_have_text('3',timeout=30000)
            page.locator('a[href="/werkstatt/profile/"]').first.click()
            expect(page.locator('#profile-count')).to_have_text('0',timeout=30000)
            expect(page.locator('#new-profile')).to_be_enabled(timeout=30000)
            assert parse_qs(urlsplit(page.url).query)['embedded']==['1']
            page.locator('#font-upload-file').set_input_files('/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf')
            expect(page.locator('#font-upload-status')).to_contain_text('883 Zeichen',timeout=30000)
            page.locator('#new-profile').click()
            page.locator('#profile-name').fill('Prüfung Schriftgruppe')
            page.locator('#catalog-search').fill('e64e508b2aa2')
            page.locator('#catalog-list input').check()
            font_id=page.locator('#catalog-list input').get_attribute('data-catalog-id')
            page.locator('#save-profile').click()
            expect(page.locator('#profile-notice')).to_contain_text('gespeichert',timeout=30000)
            page.reload()
            expect(page.locator('#profile-list')).to_contain_text('Prüfung Schriftgruppe',timeout=30000)
            page.screenshot(path=str(OUT/'merchant-font-library.png'),full_page=True)
            page.locator('a.nav-item').filter(has_text='Produkte').click()
            expect(page.locator('#product-count')).to_have_text('3',timeout=30000)
            page.locator('[data-product-id="'+ready['slate']['id']+'"]').first.click()
            expect(page.locator('#editor-preview > svg')).to_be_visible(timeout=30000)
            page.locator('[data-editor-object="motif"]').click()
            before=page.locator('#editor-preview').screenshot()
            page.locator('[data-editor-object="name"]').click()
            after=page.locator('#editor-preview').screenshot()
            assert before==after,'Selecting an element must not paint any new frame into the product preview'
            page.locator('[data-editor-prop="font"]').select_option(font_id)
            expect(page.locator('#stage-status')).to_contain_text('Entwurf',timeout=30000)
            page.locator('[data-tab="scene"]').click()
            page.locator('#material-surface-file').set_input_files(str(photo))
            expect(page.locator('#material-surface-status')).to_contain_text('ausgetauscht',timeout=30000)
            expect(page.locator('#editor-preview image[data-material-surface]')).to_have_attribute('href',__import__('re').compile(r'^data:image/png;base64,'),timeout=30000)
            page.locator('#save-product').click()
            expect(page.locator('#stage-status')).to_contain_text('Gespeicherter Stand',timeout=30000)
            page.reload()
            expect(page.locator('#editor-preview image[data-material-surface]')).to_have_attribute('href',__import__('re').compile(r'^data:image/png;base64,'),timeout=30000)
            page.locator('[data-editor-object="name"]').click()
            expect(page.locator('[data-editor-prop="font"]')).to_have_value(font_id)
            page.screenshot(path=str(OUT/'merchant-slate-repaired.png'),full_page=True)
            import pymupdf
            pdf=folder/'synthetic-design.pdf'
            document=pymupdf.open();pdfpage=document.new_page(width=100*72/25.4,height=200*72/25.4)
            pdfpage.draw_rect(pymupdf.Rect(10,10,90,190),color=(0,0,0));document.save(pdf);document.close()
            page.locator('.import-design-tile').click()
            page.locator('#design-import-file').set_input_files(str(pdf))
            page.locator('#design-import-check').click()
            expect(page.locator('#design-import-apply')).to_be_enabled(timeout=30000)
            expect(page.locator('#design-import-review svg').first).to_have_attribute('viewBox','0 0 220 140')
            page.locator('#design-import-apply').click()
            expect(page.locator('.design-import-dialog')).not_to_be_visible(timeout=30000)
            expect(page.locator('#stage-status')).to_contain_text('Gespeicherter Stand',timeout=30000)
            page.reload()
            expect(page.locator('#editor-preview [data-object="imported-artwork"]')).to_be_visible(timeout=30000)
            page.locator('[data-view="masters"]').click()
            page.locator('#new-product').click()
            page.locator('#create-name').fill('Geprüfte Mastervorlage')
            expect(page.locator('#create-kind')).to_have_value('master')
            page.locator('#create-submit').click()
            expect(page.locator('#create-dialog')).not_to_be_visible(timeout=30000)
            expect(page.locator('#record-title')).to_contain_text('Geprüfte Mastervorlage',timeout=30000)
            repair_checks={'masterCreated':True,'slatePdfImportedAndReopened':True,'fontUploadedAndGrouped':True,'fontGroupSurvivesReload':True,'navigationKeepsEmbedding':True,'selectionDoesNotChangeArtworkPixels':True,'slateMaterialAndFontSavedAndReopened':True}

            page.wait_for_load_state('networkidle')
            assert not errors
            report.update(apiRequests=api_checks,javascriptErrors=errors)
            assert api_checks and all(c['authenticated'] and c['status'] < 400 for c in api_checks), 'Authenticated UI requests must succeed: '+str([c for c in api_checks if not c['authenticated'] or c['status']>=400])
            report.update(result='PASS', apiRequests=api_checks, javascriptErrors=errors,
                          checks={**repair_checks,'merchantTestCartUiSyntheticResponse':True,'changedQuantityBlocksStaleCheckout':True,'realMerchantUiLoaded': True, 'freshSyntheticBearerUsed': True,
                                  'productCreatedAndReopened': True, 'authenticatedPreviewLoaded': True,
                                  'customerEditorLoaded': True, 'privateCustomerSnapshotSaved': True,
                                  'freeFormCustomerEditorLoaded': True, 'freeFormSnapshotSaved': True,
                                  'cartPreparationAndSavedBindingReuse': True,
                                  'mobileOverflow': False, 'privateBackendDataRequiresBearer': True})
            context.unroute_all(behavior='wait')
            browser.close()
    except Exception as error:
        report.update(result='FAIL', javascriptErrors=errors if 'errors' in locals() else [], error=str(error).split('Call log:')[0][:500])
        raise
    finally:
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        server.terminate()
        server.wait(timeout=15)
        log.close()
print('Local merchant host browser check: PASS (synthetic identity; no real Shopify login)')
