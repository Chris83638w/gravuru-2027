"""Delayed reload, stale preview and failed design reads never redirect edits to another draft."""
import json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/customer-draft-loading';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-draft-loading-') as tmp:
 folder=Path(tmp);(folder/'synthetic-completion-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/konfi-completion.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1100});page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
   page.goto(base+'/konfigurator/form/?configuration='+f['products'][0]['id']+'&revision=1&design=memory');expect(page.locator('#customer-workspace')).to_be_visible()
   def select_text():
    page.locator('#konfi-tab-text').click();page.locator('[data-select=name]').click();return page.locator('[data-value=text]')
   def credential(design):return page.evaluate('(d)=>JSON.parse(Object.entries(sessionStorage).find(([k])=>k.endsWith(":"+d))[1])',design)
   def save(text):
    select_text().fill(text);expect(page.locator('#save-draft')).to_be_enabled();page.locator('#save-draft').click();expect(page.locator('#save-state')).to_have_text('Entwurf gespeichert')
   save('Gesicherter Text');memory=credential('memory');memory_url=base+'/api/workshop/customer-drafts/'+memory['id']
   def read(c):
    r=page.request.get(base+'/api/workshop/customer-drafts/'+c['id'],headers={'X-Gravuru-Draft':c['token']});assert r.ok;return r.json()
   def external_save(text):
    current=read(memory);state=current['draft']['state'];state['fields'][0]['text']=text;csrf=page.request.get(base+'/api/workshop/session').json()['csrfToken'];r=page.request.patch(memory_url,headers={'X-Gravuru-Draft':memory['token'],'X-Gravuru-CSRF':csrf},data={'expectedRevision':current['draft']['revision'],'state':state});assert r.ok,r.text()
   def wait_held(queue):
    until=time.monotonic()+10
    while not queue:
     assert time.monotonic()<until,'Expected delayed request did not arrive';page.wait_for_timeout(20)
   external_save('Gesicherter Text');select_text().fill('Konflikt aus anderem Tab');expect(page.locator('#customer-conflict')).to_be_visible()
   # Keep an actual conflict-recovery GET pending, then verify inputs lock until it arrives.
   held=[]
   def hold(route):held.append((route,route.fetch()))
   page.route(memory_url,hold);page.locator('#reload-draft').click()
   wait_held(held)
   expect(page.locator('[data-value=text]')).to_be_disabled();expect(page.locator('#reload-draft')).to_be_disabled();route,response=held.pop();route.fulfill(response=response);page.unroute(memory_url,hold);expect(page.locator('#reload-draft')).to_be_enabled();expect(select_text()).to_have_value('Gesicherter Text')
   # A late conflict response may not invalidate a successfully reloaded newer draft.
   external_save('Extern gesicherter Stand');select_text().fill('Erster Versionskonflikt');expect(page.locator('#customer-conflict')).to_be_visible()
   previews=[]
   def hold_preview(route):previews.append((route,route.fetch()))
   page.route(memory_url+'/preview',hold_preview);select_text().fill('Verspätete Vorschau');wait_held(previews)
   page.locator('#reload-draft').click();expect(page.locator('#save-state')).to_have_text('Entwurf gespeichert');route,response=previews.pop();route.fulfill(response=response);page.unroute(memory_url+'/preview',hold_preview);expect(page.locator('#customer-conflict')).to_be_hidden();expect(select_text()).to_have_value('Extern gesicherter Stand');save('Nach Reload gespeichert');assert read(memory)['draft']['state']['fields'][0]['text']=='Nach Reload gespeichert'
   # Seed a second design, return, then fail its saved-draft GET.
   page.locator('#konfi-tab-design').click();page.locator('[data-design=plain]').click();expect(page.locator('#customer-design')).to_have_value('plain');plain=credential('plain');plain_before=read(plain);page.locator('[data-design=memory]').click();expect(page.locator('#customer-design')).to_have_value('memory')
   plain_url=base+'/api/workshop/customer-drafts/'+plain['id']
   def fail(route):route.fulfill(status=503,content_type='application/json',body=json.dumps({'error':{'message':'Synthetischer Ladefehler'}}))
   page.route(plain_url,fail);page.locator('[data-design=plain]').click();expect(page.locator('#customer-status')).to_contain_text('Synthetischer Ladefehler');expect(page.locator('#customer-design')).to_have_value('memory');save('Im richtigen Entwurf geblieben');page.unroute(plain_url,fail)
   assert read(plain)==plain_before;assert read(memory)['draft']['state']['fields'][0]['text']=='Im richtigen Entwurf geblieben'
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('entwurf-'+str(width)+'.png')),full_page=True)
   assert not errors;report.update(result='PASS',build=f['built'],reloadLocksInputs=True,stalePreviewIgnored=True,newerRevisionSaved=True,failedDesignLoadKeepsPreviousCredential=True,otherDraftUnchanged=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
