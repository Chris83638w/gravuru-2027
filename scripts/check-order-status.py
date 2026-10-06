"""Signed synthetic status deliveries and actual dashboard, no Shopify requests."""
import base64,hashlib,hmac,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/order-status';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','shopifyRequestSent':False,'published':False}
with tempfile.TemporaryDirectory(prefix='g27-status-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-order-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-order.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  until=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>until:raise RuntimeError('Synthetic fixture failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   def get(route):
    r=page.request.get(base+'/api/workshop/'+route);assert r.ok;return r.json()
   csrf=get('session')['csrfToken']
   def post(route,data):
    r=page.request.post(base+'/api/workshop/'+route,headers={'X-Gravuru-CSRF':csrf},data=data);assert r.ok,r.text();return r.json()
   binding=post('order-bindings',{'shopDomain':f['webhook']['shopDomain'],'variantId':'301','productId':f['productId'],'productRevision':1,'snapshotId':f['snapshotId']})
   offer=post('order-offers',{'bindingId':binding['id'],'snapshotId':f['snapshotId'],'quantity':2})
   payload={'id':101,'test':True,'currency':'EUR','financial_status':'paid','updated_at':'2026-10-06T10:00:00Z','line_items':[{'id':201,'variant_id':301,'quantity':2,'price':'36.97','properties':[offer['property']]}]}
   def deliver(topic,event,**change):
    raw=json.dumps({**payload,**change},separators=(',',':')).encode();headers={'Content-Type':'application/json','x-shopify-hmac-sha256':base64.b64encode(hmac.new(f['webhook']['secret'].encode(),raw,hashlib.sha256).digest()).decode(),'x-shopify-shop-domain':f['webhook']['shopDomain'],'x-shopify-api-version':f['webhook']['apiVersion'],'x-shopify-topic':topic,'x-shopify-webhook-id':event};r=page.request.post(base+'/api/workshop/order-webhook',headers=headers,data=raw);assert r.ok,r.text();return r.json()
   line=deliver('orders/paid','browser-paid-1234')['lines'][0];page.goto(base+'/werkstatt/bestellungen/?position='+line['id']);expect(page.locator('#order-state')).to_contain_text('Bezahlt')
   deliver('orders/updated','browser-partial-1234',financial_status='partially_refunded',updated_at='2026-10-06T11:00:00Z');page.locator('#reload').click();expect(page.locator('#order-state')).to_contain_text('Teilweise erstattet');expect(page.locator('#price')).to_contain_text('Ursprünglicher Positionswert: 73,94');expect(page.locator('#status-detail')).to_contain_text('prüfen')
   deliver('orders/updated','browser-refund-1234',financial_status='refunded',updated_at='2026-10-06T12:00:00Z');page.locator('#reload').click();expect(page.locator('#order-state')).to_contain_text('Erstattet')
   deliver('orders/cancelled','browser-cancel-1234',cancelled_at='2026-10-06T12:30:00Z',financial_status='refunded',updated_at='2026-10-06T13:00:00Z');page.locator('#reload').click();expect(page.locator('#order-state')).to_contain_text('Storniert');expect(page.locator('#status-detail')).to_contain_text('Zahlungsstand: Erstattet')
   deliver('orders/updated','browser-old-1234',updated_at='2026-10-06T10:30:00Z');page.reload();expect(page.locator('#order-state')).to_contain_text('Storniert');assert get('orders/'+line['id'])==line;assert not get('orders/'+line['id']+'/status')['customerDownloadAllowed'];assert get('review-snapshots/'+f['snapshotId'])['manifest']['packageSha256']==line['sourcePackageSha256']
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');expect(page.locator('#snapshot')).to_be_visible();page.screenshot(path=str(out/('order-status-'+str(width)+'.png')),full_page=True)
   assert not errors;report.update(result='PASS',build=f['built'],states=['paid','partially_refunded','refunded','cancelled'],staleDeliveryPreservesState=True,sourceOrderUnchanged=True,snapshotUnchanged=True,customerDownloadAllowed=False,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
