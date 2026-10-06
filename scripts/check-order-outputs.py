"""Signed synthetic status deliveries and actual dashboard, no Shopify requests."""
import base64,hashlib,hmac,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/order-outputs';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','shopifyRequestSent':False,'published':False}
with tempfile.TemporaryDirectory(prefix='g27-status-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-order-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/order-outputs.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
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
   line=deliver('orders/paid','browser-paid-1234')['lines'][0]
   original=get('orders/'+line['id']);position=line['id'];route='orders/'+position+'/outputs'
   assert get(route)['jobs']==[];assert get(route)['total']==0
   assert page.request.get(base+'/api/workshop/orders/orderline_00000000-0000-0000-0000-000000000000/outputs').status==404
   page.goto(base+'/werkstatt/bestellungen/?position='+position);expect(page.locator('#order-output-status')).to_contain_text('Noch keine Ausgabe')
   page.locator('#snapshot').click();expect(page.locator('#order-context')).to_be_visible();expect(page.locator('[data-order-title]')).to_contain_text('Menge 2');assert 'position='+position in page.url
   form=page.locator('#print-form');form.locator('[name=profile]').select_option('mimaki')
   with page.expect_download(timeout=120000) as pending:form.locator('[type=submit]').click()
   pending.value.save_as(out/'farbe.pdf')
   href=page.locator('#active-export-job').get_attribute('href');assert 'position='+position in href
   page.goto(base+href);expect(page.locator('#order-context')).to_be_visible();expect(page.locator('[data-format="white-pdf"]')).to_be_enabled()
   job=get(route)['jobs'][0];assert len(get(route)['jobs'])==1 and job['snapshotId']==f['snapshotId']
   for fmt,name in [('white-pdf','weiss.pdf'),('zip','druck.zip')]:
    with page.expect_download() as pending:page.locator('[data-format="'+fmt+'"]').click()
    pending.value.save_as(out/name)
   page.locator('[data-plate="white"]').click();expect(page.locator('#plate-board')).to_be_visible(timeout=30000)
   # A different frozen design of the SAME PRODUCT must not enter this order's files.
   other=post('export-jobs',{'snapshotId':f['otherSnapshotId'],'settings':{'profile':'mimaki','white':'none'}})
   page.locator('#refresh').click();expect(page.locator('#jobs [data-job]')).to_have_count(1);assert other['id'] not in [v['id'] for v in get(route)['jobs']]
   page.screenshot(path=str(out/'ausgaben-bestellung-desktop.png'),full_page=True)
   page.locator('[data-order-back]').click();expect(page.locator('#order-output-status')).to_contain_text('1 Ausgabe');expect(page.locator('#order-output-list a')).to_have_count(1);expect(page.locator('#order-output-list a')).to_contain_text('Mimaki')
   page.locator('#order-output-list a').click();expect(page.locator('#job-id')).to_have_text(job['id']);assert 'position='+position in page.url
   # Wrong output ID is rejected in this context, rather than showing unrelated download buttons.
   page.goto(base+'/werkstatt/ausgaben/?position='+position+'&job='+other['id']);expect(page.locator('#notice')).to_contain_text('gehört nicht');expect(page.locator('#detail')).to_be_hidden()
   page.locator('[data-job="'+job['id']+'"]').click();expect(page.locator('#detail')).to_be_visible();expect(page.locator('#job-id')).to_have_text(job['id']);expect(page.locator('#notice')).to_have_text('')
   deliver('orders/cancelled','browser-cancel-outputs',cancelled_at='2026-10-06T12:30:00Z',financial_status='refunded',updated_at='2026-10-06T13:00:00Z')
   page.locator('#refresh').click();expect(page.locator('[data-order-status]')).to_contain_text('Storniert');expect(page.locator('[data-order-status]')).to_contain_text('prüfen');assert not get(route)['status']['productionReady'];assert not get(route)['status']['customerDownloadAllowed']
   # Archival operator downloads remain byte-identical; cancellation is not a customer release.
   with page.expect_download() as pending:page.locator('[data-format="white-pdf"]').click()
   pending.value.save_as(out/'weiss-nach-storno.pdf');assert (out/'weiss.pdf').read_bytes()==(out/'weiss-nach-storno.pdf').read_bytes()
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('bestellausgaben-'+str(width)+'.png')),full_page=True)
   page.locator('[data-order-back]').click();expect(page.locator('#order-state')).to_contain_text('Storniert');expect(page.locator('#order-output-list a')).to_have_count(1);page.screenshot(path=str(out/'bestellung-dateien-mobil.png'),full_page=True)
   # Opening another snapshot drops the association instead of carrying a stale order label.
   page.goto(base+'/werkstatt/pruefstaende/?snapshot='+f['snapshotId']+'&position='+position);expect(page.locator('#order-context')).to_be_visible();page.locator('[data-proof="'+f['otherSnapshotId']+'"]').click();expect(page.locator('#order-context')).to_be_hidden();assert 'position=' not in page.url
   assert get('orders/'+position)==original;assert get('review-snapshots/'+f['snapshotId'])['manifest']['packageSha256']==line['sourcePackageSha256'];assert not errors
   report.update(result='PASS',build=f['built'],orderSnapshotOutputRoundtrip=True,pairedMimakiDownloads=True,wrongSnapshotExcluded=True,mismatchedJobBlocked=True,orderContextClearedOnOtherSnapshot=True,cancellationVisibleInOutputs=True,unchangedDownloadAfterCancellation=True,sourceOrderUnchanged=True,snapshotUnchanged=True,customerDownloadAllowed=False,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
