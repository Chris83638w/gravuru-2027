"""Photo upload must not offer controls while its preview is still pending."""
import json, os, subprocess, tempfile, time
from pathlib import Path
from datetime import datetime, timezone
from PIL import Image
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.test-output/form-photo-busy';OUT.mkdir(parents=True,exist_ok=True)
report={'result':'RUNNING','scope':'synthetic local photo; delayed real preview response','checks':{}}
with tempfile.TemporaryDirectory(prefix='g27-photo-busy-') as tmp:
 folder=Path(tmp);(folder/'synthetic-completion-only').touch();photo=folder/'synthetic.png';Image.new('RGB',(600,400),'#b56a42').save(photo)
 env=dict(os.environ,PYTHONPATH=str(ROOT/'.local-data/python'));log=(folder/'server.log').open('w')
 server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/konfi-completion.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+45
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture startup failed')
   time.sleep(.1)
  fixture=json.loads((folder/'ready.json').read_text());base=fixture['url']
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base+'/konfigurator/form/?configuration='+fixture['products'][0]['id']+'&revision=1&design=memory');expect(page.locator('#customer-workspace')).to_be_visible()
   credential=page.evaluate('()=>JSON.parse(Object.entries(sessionStorage).find(([k])=>k.endsWith(":memory"))[1])');draft_url=base+'/api/workshop/customer-drafts/'+credential['id'];held=[]
   def hold(route):held.append((route,route.fetch()))
   page.route(draft_url+'/preview',hold);page.locator('#konfi-tab-photo').click();page.locator('[data-select=photo]').click();page.locator('#customer-photo-input').set_input_files(str(photo))
   deadline=time.monotonic()+20
   while not held:
    assert time.monotonic()<deadline,'Photo preview request expected';page.wait_for_timeout(20)
   tone=page.locator('[data-value=tone]');expect(tone).to_be_disabled();expect(page.locator('[data-photo=reset]')).to_be_disabled();expect(page.locator('#save-draft')).to_be_disabled()
   route,response=held.pop();route.fulfill(response=response);page.unroute(draft_url+'/preview',hold);expect(tone).to_be_enabled();tone.select_option('grayscale');expect(page.locator('#save-draft')).to_be_enabled();page.locator('#save-draft').click();expect(page.locator('#save-state')).to_have_text('Entwurf gespeichert')
   response=page.request.get(draft_url,headers={'X-Gravuru-Draft':credential['token']});assert response.ok
   assert next(f for f in response.json()['draft']['state']['fields'] if f['id']=='photo')['tone']=='grayscale'
   page.reload();expect(page.locator('#customer-workspace')).to_be_visible();page.locator('#konfi-tab-photo').click();page.locator('[data-select=photo]').click();expect(page.locator('[data-value=tone]')).to_have_value('grayscale');page.screenshot(path=str(OUT/'grayscale-saved.png'),full_page=True)
   assert not errors;report.update(result='PASS',checks={'controlsLockedWhileUploadPreviewPending':True,'grayscaleSavedAndReopened':True},javascriptErrors=errors);browser.close()
 except Exception as error:report.update(result='FAIL',error=str(error).split('Call log:')[0]);raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate();server.wait(timeout=10);log.close()
print('Form photo upload controls: PASS')
