"""Product variants -> atomic local mapping -> saved customer snapshot offer.
No Shopify requests, publication, private customer records or real credentials.
"""
import base64,hashlib,hmac,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/shop-variant-mapping';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','shopifyRequestSent':False,'realPayment':False,'published':False}
with tempfile.TemporaryDirectory(prefix='g27-acrylic-order-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-order-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-order.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed: '+(folder/'server.log').read_text()[-1800:])
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];report['build']=f['built'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   def get(route):
    r=page.request.get(base+'/api/workshop/'+route);assert r.ok;return r.json()
   csrf=get('session')['csrfToken']
   def post(route,data):return page.request.post(base+'/api/workshop/'+route,headers={'X-Gravuru-CSRF':csrf},data=data)
   page.goto(base+'/werkstatt/shopvorbereitung/?configuration='+f['productId']+'&revision=1')
   inputs=page.locator('[data-variant-key]');expect(inputs).to_have_count(28)
   page.locator('#mapping-shop').fill(f['webhook']['shopDomain']);page.locator('#mapping-shop').press('Tab')
   inputs.nth(0).fill('1000');inputs.nth(1).fill('1000');page.locator('#mapping-save').click()
   expect(page.locator('#mapping-save')).to_be_enabled();assert len(get('order-bindings')['bindings'])==0
   for i in range(28):inputs.nth(i).fill(str(1000+i))
   page.locator('#mapping-save').click();expect(page.locator('#mapping-status')).to_contain_text('28 Zuordnungen bestätigt, 28 neu.')
   links=get('order-bindings')['bindings'];assert len(links)==28
   page.reload();expect(inputs).to_have_count(28);expect(page.locator('#mapping-shop')).to_have_value(f['webhook']['shopDomain'])
   assert all(inputs.nth(i).get_attribute('readonly') is not None for i in range(28))
   page.locator('#mapping-save').click();expect(page.locator('#mapping-status')).to_contain_text('28 Zuordnungen bestätigt, 0 neu.')
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('shop-varianten-'+str(width)+'.png')),full_page=True)
   binding=next(b for b in links if b['options']=={'size':'large','base':'eiche','wall':'wall'});assert binding['unitCents']==3697
   r=post('order-offers',{'bindingId':binding['id'],'snapshotId':f['snapshotId'],'quantity':2});assert r.ok;offer=r.json();assert offer['unitCents']==3697 and offer['quantity']*offer['unitCents']==7394
   assert not errors;report.update(result='PASS',variants=28,duplicateInputRejected=True,atomicSave=True,reloadReadOnly=True,repeatedSaveCreates=0,existingSnapshotOffer=True,unitCents=3697,quantity=2,totalCents=7394,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
