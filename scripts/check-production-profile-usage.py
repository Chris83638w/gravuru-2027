"""Profile usage across draft/activated/archived synthetic products, without rebinding."""
import json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/production-profile-usage';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-profile-usage-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-native-profiles-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/native-production.mjs'),str(folder),'profile-usage'],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1100});page.on('pageerror',lambda e:errors.append(str(e)))
   def get(route):
    r=page.request.get(base+'/api/workshop/'+route);assert r.ok,r.text();return r.json()
   endpoint='production-profiles/'+f['profile']['id']+'/usage';before=get(endpoint);product=get('products/'+f['productId']);assert len(before['products'])==3
   page.goto(base+'/werkstatt/fertigung/');page.locator('[data-profile="'+f['profile']['id']+'"]').click();expect(page.locator('#usage-products li')).to_have_count(3);expect(page.locator('#usage-status')).to_contain_text('2 Produkte / Master');expect(page.locator('#usage-status')).to_contain_text('Davon 2 mit dem angezeigten Profilstand 2');expect(page.locator('#usage-products')).to_contain_text('intern aktiviert');expect(page.locator('#usage-products')).to_contain_text('Produkt archiviert')
   page.locator('#history').select_option('1');expect(page.locator('#profile-version')).to_contain_text('historisch');expect(page.locator('#usage-status')).to_contain_text('Davon 1 mit dem angezeigten Profilstand 1');expect(page.locator('#save')).to_be_disabled()
   page.locator('#history').select_option('2');expect(page.locator('#profile-version')).to_contain_text('Stand 2');page.locator('[name=notes]').fill('Synthetische ungespeicherte Bearbeitung');page.locator('#usage-reload').click();expect(page.locator('#usage-products li')).to_have_count(3);expect(page.locator('[name=notes]')).to_have_value('Synthetische ungespeicherte Bearbeitung')
   page.locator('#save').click();expect(page.locator('#profile-version')).to_contain_text('Stand 3');expect(page.locator('#usage-status')).to_contain_text('Davon 0 mit dem angezeigten Profilstand 3');assert get(endpoint)==before;assert get('products/'+f['productId'])==product
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1100});page.locator('#profile-usage').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('#profile-usage').screenshot(path=str(out/('verwendung-'+str(width)+'.png')))
   link=page.locator('#usage-products a[href*="'+f['productId']+'"]').first
   with page.expect_popup() as pending:link.click()
   editor=pending.value;editor.wait_for_load_state();assert 'configuration='+f['productId'] in editor.url;editor.locator('#tab-production').click();expect(editor.locator('#native-production-profile')).to_have_value(f['profile']['id']+':2');editor.close()
   unused=next(p for p in get('production-profiles')['profiles'] if p['document']['materialId']=='steel');page.locator('[data-profile="'+unused['id']+'"]').click();expect(page.locator('#usage-products li')).to_have_count(0);expect(page.locator('#usage-status')).to_contain_text('Historische Gestaltungen können');assert not errors
   report.update(result='PASS',build=f['built'],productCount=2,productRevisions=3,activatedAndCurrentSeparated=True,archivedMasterIncluded=True,historicalProfileReadable=True,unsavedEditsPreserved=True,profileSaveDoesNotRebindProducts=True,currentProductLinkVerified=True,emptyUsageDoesNotDenyHistoricalUse=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
