"""Existing native editor -> fixed profile -> frozen review -> actual separated PDF, synthetic data only."""
import json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/native-production';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-native-profile-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-native-profiles-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/native-production.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  until=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>until:raise RuntimeError('Synthetic fixture failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   def get(route):
    r=page.request.get(base+'/api/workshop/'+route);assert r.ok,r.text();return r.json()
   csrf=get('session')['csrfToken']
   def post(route,data,method='POST'):
    r=page.request.fetch(base+'/api/workshop/'+route,method=method,headers={'X-Gravuru-CSRF':csrf},data=data);assert r.ok,r.text();return r.json()
   url=base+'/werkstatt/?configuration='+f['productId'];page.goto(url);page.locator('#tab-production').click();picker=page.locator('#native-production-profile');expect(picker.locator('option')).to_have_count(2)
   picker.select_option(f['profile']['id']+':1');expect(page.locator('#save-indicator')).to_have_text('Ungespeicherte Änderungen');page.locator('#save-product').click();expect(page.locator('#save-indicator')).to_have_text('Alle Änderungen gespeichert');expect(picker).to_have_value(f['profile']['id']+':1');page.reload();page.locator('#tab-production').click();expect(picker).to_have_value(f['profile']['id']+':1')
   record=get('products/'+f['productId']);record=record.get('record',record);assert record['revision']==2;assert record['metadata']['productionProfile']['sha256']==f['profile']['sha256']
   newer=json.loads(json.dumps(f['profile']['document']));newer['output']['profile']='roland';newer['output']['mirror']=False
   post('production-profiles/'+f['profile']['id'],{'document':newer,'expectedRevision':1},'PATCH');page.locator('[data-profile-reload]').click();expect(picker.locator('option')).to_have_count(3);expect(picker).to_have_value(f['profile']['id']+':1');expect(page.locator('#save-indicator')).to_have_text('Alle Änderungen gespeichert')
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});page.locator('#native-production').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('#native-production').screenshot(path=str(out/('fertigungsprofil-'+str(width)+'.png')))
   # A new review of old product revision retains profile 1 despite current profile 2.
   snapshot=post('acrylic-reviews',{**f['input'],'productRevision':2});detail=get('review-snapshots/'+snapshot['id']);assert detail['manifest']['productionProfile']==f['profile'];assert not detail['manifest']['productionReady']
   page.goto(base+'/werkstatt/pruefstaende/?snapshot='+snapshot['id']);expect(page.locator('#proof-profile')).to_contain_text('Stand 1');form=page.locator('#print-form');expect(form.locator('[name=profile]')).to_have_value('mimaki');expect(form.locator('[name=mirror]')).to_be_checked()
   with page.expect_download(timeout=120000) as pending:form.locator('[type=submit]').click()
   pending.value.save_as(out/'farbe.pdf');page.goto(base+page.locator('#active-export-job').get_attribute('href'));expect(page.locator('[data-format="white-pdf"]')).to_be_enabled()
   with page.expect_download() as pending:page.locator('[data-format="white-pdf"]').click()
   pending.value.save_as(out/'weiss.pdf')
   # Explicitly selecting the new profile creates only a new product revision.
   page.goto(url);page.locator('#tab-production').click();expect(picker).to_have_value(f['profile']['id']+':1');picker.select_option(f['profile']['id']+':2');page.locator('#save-product').click();expect(page.locator('#save-indicator')).to_have_text('Alle Änderungen gespeichert');expect(picker).to_have_value(f['profile']['id']+':2');assert get('review-snapshots/'+snapshot['id'])['manifest']==detail['manifest']
   picker.select_option('');page.locator('#save-product').click();expect(page.locator('#save-indicator')).to_have_text('Alle Änderungen gespeichert');expect(picker).to_have_value('');assert get('review-snapshots/'+snapshot['id'])['manifest']==detail['manifest'];assert not errors
   report.update(result='PASS',build=f['built'],viewports=[1440,390,768],incompatibleProfilesHidden=True,saveReload=True,newerRevisionRequiresExplicitSelection=True,oldReviewUnchanged=True,profileDefaultsInReview=True,colorAndWhiteDownloaded=True,unbindSupported=True,javascriptErrors=errors);browser.close()
 except Exception as error:
  report.update(result='FAIL',error=str(error));raise
 finally:
  server.terminate();server.wait(timeout=10);log.close();report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
