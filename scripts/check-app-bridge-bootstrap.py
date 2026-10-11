"""Real CDN bootstrap in a simulated admin frame; no merchant session is claimed."""
from pathlib import Path
import hashlib, json, urllib.request
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.test-output/merchant-host'
OUT.mkdir(parents=True,exist_ok=True)
with urllib.request.urlopen('https://cdn.shopify.com/shopifycloud/app-bridge.js',timeout=30) as response:
    script=response.read()
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for shop in [False,True]:
        context=browser.new_context();page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)[:180]))
        def route(r):
            if r.request.url.startswith('https://admin.shopify.com'):
                return r.fulfill(content_type='text/html',body='<iframe src="https://merchant.example/werkstatt/profile/"></iframe>')
            if r.request.url.startswith('https://cdn.shopify.com'):
                return r.fulfill(content_type='text/javascript',body=script)
            return r.fulfill(content_type='text/html',headers={'Content-Security-Policy':"default-src 'self'; script-src 'self' https://cdn.shopify.com/shopifycloud/app-bridge.js; connect-src 'self'; frame-ancestors https://admin.shopify.com"},body='<head><meta name="shopify-api-key" content="9640dd7a6907f0c73e7013ea8c24869b">'+('<meta name="shopify-shop" content="gravuru-design.myshopify.com">' if shop else '')+'<meta name="shopify-disabled-features" content="fetch"><script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script></head><body>Prüfung</body>')
        context.route('**/*',route)
        page.goto('https://admin.shopify.com/store/gravuru-design/apps/test');page.wait_for_timeout(300)
        results.append({'shopMeta':shop,'bridge':page.frames[1].evaluate('typeof window.shopify'),'idToken':page.frames[1].evaluate('typeof window.shopify?.idToken'),'errors':errors})
        context.close()
    browser.close()
assert results[0]['bridge']=='undefined' and any('missing required configuration fields: shop' in error for error in results[0]['errors'])
assert results[1]['idToken']=='function' and not results[1]['errors']
report={'result':'PASS','cdnSha256':hashlib.sha256(script).hexdigest(),'realMerchantLogin':False,'scope':'Actual Shopify CDN bootstrap with cleared storage, no host/shop URL parameters; simulated parent frame','cases':results}
(OUT/'real-app-bridge.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
