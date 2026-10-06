"""Native acrylic snapshot -> operator cart preparation -> signed local test order.
No Shopify requests, publication, private customer records or real credentials.
"""
import base64,hashlib,hmac,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/acrylic-order';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','shopifyRequestSent':False,'realPayment':False,'published':False}
with tempfile.TemporaryDirectory(prefix='g27-acrylic-order-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-order-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-order.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];report['build']=f['built'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   def get(route):
    r=page.request.get(base+'/api/workshop/'+route);assert r.ok;return r.json()
   csrf=get('session')['csrfToken']
   def post(route,data):return page.request.post(base+'/api/workshop/'+route,headers={'X-Gravuru-CSRF':csrf},data=data)
   page.goto(base+'/werkstatt/pruefstaende/?snapshot='+f['snapshotId']);expect(page.locator('#cart-handoff')).to_be_visible();page.locator('#cart-handoff').click();expect(page.locator('#selection-summary')).to_contain_text('Eiche');expect(page.locator('#quantity')).to_have_value('2');assert page.locator('#quantity').get_attribute('readonly') is not None
   page.locator('#shop').fill(f['webhook']['shopDomain']);page.locator('#variant').fill('301');page.locator('#prepare').click();expect(page.locator('#result')).to_be_visible();expect(page.locator('#result-total')).to_contain_text('73,94');expect(page.locator('#notice')).to_contain_text('nichts an Shopify gesendet')
   binding=get('order-bindings')['bindings'][0];assert binding['unitCents']==3697 and binding['options']=={'size':'large','base':'eiche','wall':'wall'}
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('acryl-bestelluebergabe-'+str(width)+'.png')),full_page=True)
   page.reload();expect(page.locator('#selection-summary')).to_contain_text('Eiche');page.locator('#binding').select_option(binding['id']);expect(page.locator('#shop')).to_have_value(f['webhook']['shopDomain']);expect(page.locator('#variant')).to_have_value('301');expect(page.locator('#quantity')).to_have_value('2')
   assert post('order-cart-preview',{'bindingId':binding['id'],'snapshotId':f['snapshotId'],'quantity':1}).status==422
   r=post('order-cart-preview',{'bindingId':binding['id'],'snapshotId':f['snapshotId'],'quantity':2});assert r.ok;cart=r.json();assert cart['sent'] is False and cart['paymentConfirmed'] is False and cart['summary']['totalCents']==7394
   r=post('order-offers',{'bindingId':binding['id'],'snapshotId':f['snapshotId'],'quantity':2});assert r.ok;offer=r.json();payload={'id':101,'test':True,'financial_status':'paid','currency':'EUR','line_items':[{'id':201,'variant_id':301,'quantity':2,'price':'36.97','properties':[offer['property']]}]};raw=json.dumps(payload,separators=(',',':')).encode();headers={'Content-Type':'application/json','x-shopify-hmac-sha256':base64.b64encode(hmac.new(f['webhook']['secret'].encode(),raw,hashlib.sha256).digest()).decode(),'x-shopify-shop-domain':f['webhook']['shopDomain'],'x-shopify-api-version':f['webhook']['apiVersion'],'x-shopify-topic':'orders/paid','x-shopify-webhook-id':'native-browser-event'}
   r=page.request.post(base+'/api/workshop/order-webhook',headers=headers,data=raw);assert r.ok;line=r.json()['lines'][0];assert line['totalCents']==7394 and line['quantity']==2 and line['selection']['geometry']['insertionMm']==7 and not line['customerDownloadAllowed'];assert page.request.post(base+'/api/workshop/order-webhook',headers=headers,data=raw).json()['duplicate']
   page.goto(base+'/werkstatt/bestellungen/?position='+line['id']);expect(page.locator('#price')).to_contain_text('73,94');expect(page.locator('#summary')).to_contain_text('Eiche');expect(page.locator('#product-draft-form')).to_be_hidden();expect(page.locator('#draft-status')).to_contain_text('Acrylstand');page.locator('#snapshot').click();expect(page.locator('#product-name')).to_contain_text('synthetische Bestellprüfung');assert get('review-snapshots/'+f['snapshotId'])['manifest']['packageSha256']==line['sourcePackageSha256']
   assert not errors;report.update(result='PASS',unitCents=3697,quantity=2,totalCents=7394,options=binding['options'],fixedQuantity=True,reloadBinding=True,signedSyntheticOrder=True,duplicateDelivery=True,sourcePackageUnchanged=True,customerDownloadAllowed=False,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
