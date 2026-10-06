"""Signed synthetic status deliveries and actual dashboard, no Shopify requests."""
import base64,hashlib,hmac,json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/output-checks';out.mkdir(parents=True,exist_ok=True)
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
   expect(page.locator('#output-checks')).to_be_visible();checks=page.locator('#check-form');expect(checks.locator('[name=format] option')).to_have_count(2)
   endpoint='export-jobs/'+job['id']+'/checks';evidence=get(endpoint);assert evidence['checks']==[]
   descriptor=next(v for v in evidence['files'] if v['format']=='white-pdf');assert not evidence['productionReady'];csrf=get('session')['csrfToken']
   import uuid
   sample={'requestId':str(uuid.uuid4()),'format':'white-pdf','sha256':descriptor['sha256'],'stage':'import','result':'passed','machine':'','software':'Synthetic Corel import','notes':'Synthetic test only'}
   def request(data,token=csrf):return page.request.post(base+'/api/workshop/'+endpoint,headers={'X-Gravuru-CSRF':token},data=data)
   assert request(sample,'wrong').status==403;assert request({**sample,'sha256':'b'*64}).status==409;assert request({**sample,'format':'zip'}).status==422;assert request({**sample,'stage':'print','machine':''}).status==422;assert get(endpoint)['checks']==[]
   checks.locator('[name=format]').select_option('white-pdf');expect(page.locator('#check-hash')).to_contain_text(descriptor['sha256']);checks.locator('[name=software]').fill('CorelDRAW · synthetischer Test');checks.locator('[name=result]').select_option('passed');checks.locator('[name=notes]').fill('Synthetischer Importvermerk, keine echte Maschinenabnahme.');checks.locator('[type=submit]').click();expect(page.locator('#check-status')).to_contain_text('gespeichert');expect(page.locator('#check-history li')).to_have_count(1)
   saved=get(endpoint)['checks'][0];assert saved['sha256']==descriptor['sha256'] and saved['format']=='white-pdf' and saved['productionReady']==False
   checks.locator('[name=stage]').select_option('print');checks.locator('[name=result]').select_option('failed');checks.locator('[name=machine]').fill('Mimaki 2513 EX');checks.locator('[name=software]').fill('Synthetische RIP-Prüfung');checks.locator('[name=notes]').fill('Synthetischer Fehler: Rand prüfen. <img src=x onerror=alert(1)>');checks.locator('[type=submit]').click();expect(page.locator('#check-history li')).to_have_count(2);assert page.locator('#check-history img').count()==0
   # Automatic job polling may not erase partially entered follow-up observations.
   checks.locator('[name=notes]').fill('Noch nicht gespeicherte Korrektur');page.locator('#refresh').click();expect(checks.locator('[name=notes]')).to_have_value('Noch nicht gespeicherte Korrektur')
   page.reload();expect(page.locator('#check-history li')).to_have_count(2);expect(page.locator('#check-history li').first).to_contain_text('Fehler festgestellt');expect(page.locator('#check-history li').nth(1)).to_contain_text('Bestanden')
   a=request(sample);assert a.ok;assert request(sample).json()==a.json();assert request({**sample,'notes':'Changed retry'}).status==409;page.locator('#reload-checks').click();expect(page.locator('#check-history li')).to_have_count(3)
   with page.expect_download() as pending:page.locator('[data-format="white-pdf"]').click()
   pending.value.save_as(out/'weiss.pdf');assert hashlib.sha256((out/'weiss.pdf').read_bytes()).hexdigest()==descriptor['sha256']
   checks.locator('[name=format]').select_option('white-pdf');page.locator('#output-checks').scroll_into_view_if_needed()
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('pruefprotokoll-'+str(width)+'.png')),full_page=True);page.locator('#output-checks').screenshot(path=str(out/('pruefvermerke-'+str(width)+'.png')))
   # Another job has a separate, empty journal; no previous file hash or form data survives.
   other=post('export-jobs',{'snapshotId':f['snapshotId'],'settings':{'profile':'mimaki','white':'none'}});deadline=time.monotonic()+60
   while other['status'] not in ['completed','failed']:
    assert time.monotonic()<deadline;time.sleep(.2);other=get('export-jobs/'+other['id'])
   assert other['status']=='completed';page.locator('#refresh').click();expect(page.locator('[data-job="'+other['id']+'"]').first).to_be_visible();page.locator('[data-job="'+other['id']+'"]').click();expect(page.locator('#job-id')).to_have_text(other['id']);expect(checks.locator('[name=format] option')).to_have_count(1);expect(page.locator('#check-history li')).to_have_count(0);expect(checks.locator('[name=notes]')).to_have_value('');assert descriptor['sha256'] not in page.locator('#check-hash').inner_text()
   assert get('orders/'+position)==original;assert not get('orders/'+position+'/status')['productionReady'];assert not get('orders/'+position+'/status')['customerDownloadAllowed'];assert not errors
   report.update(result='PASS',build=f['built'],csrfEnforced=True,wrongHashRejected=True,zipRejected=True,machineRequiredForPrint=True,importAndPrintSeparate=True,appendOnlyHistory=True,retryDeduplicated=True,retryConflictRejected=True,htmlNotesEscaped=True,formSurvivesPolling=True,checkHistorySurvivesReload=True,downloadHashUnchanged=True,jobSwitchClearsFormAndHistory=True,orderUnchanged=True,productionReady=False,customerDownloadAllowed=False,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
