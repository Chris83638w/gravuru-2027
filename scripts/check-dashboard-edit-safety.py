"""Real editor reload with delayed/failed responses and synthetic revision conflicts."""
import json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/dashboard-edit-safety';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-editor-safety-') as tmp:
 folder=Path(tmp);(folder/'synthetic-native-profiles-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/native-production.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   endpoint=base+'/api/workshop/products/'+f['productId']
   def get(url):
    r=page.request.get(url);assert r.ok,r.text();return r.json()
   page.goto(base+'/werkstatt/?configuration='+f['productId']);page.locator('#tab-details').click();name=page.locator('[data-path=name]');expect(name).to_be_enabled()
   csrf=get(base+'/api/workshop/session')['csrfToken'];record=get(endpoint);remote=json.loads(json.dumps(record['document']));remote['name']='Extern gesicherter Teststand';remote['config']['profile']['name']=remote['name']
   response=page.request.patch(endpoint,headers={'X-Gravuru-CSRF':csrf},data={'expectedRevision':record['revision'],'document':remote});assert response.ok,response.text()
   name.fill('Meine ungespeicherte Änderung');page.locator('#save-product').click();expect(page.locator('#conflict-banner')).to_be_visible();expect(name).to_have_value('Meine ungespeicherte Änderung')
   held=[]
   def hold(route):
    if route.request.method=='GET':held.append(route)
    else:route.continue_()
   page.route(endpoint,hold)
   def request_reload():
    page.locator('[data-action=reload-record]').click();page.locator('#discard-dialog [value=discard]').click()
    deadline=time.monotonic()+10
    while not held:
     if time.monotonic()>deadline:raise RuntimeError('Reload request missing')
     page.wait_for_timeout(25)
   request_reload();expect(name).to_be_disabled();expect(page.locator('#save-product')).to_be_disabled();expect(page.locator('#new-product')).to_be_disabled()
   expect(page.locator('#save-indicator')).to_have_text('Produkt wird geladen …');expect(page.locator('[data-action=overview]')).to_be_disabled()
   held.pop().fulfill(status=503,content_type='application/json',body=json.dumps({'error':{'message':'Synthetischer Ladefehler'}}))
   expect(name).to_be_enabled();expect(name).to_have_value('Meine ungespeicherte Änderung');expect(page.locator('#save-indicator')).to_have_text('Ungespeicherte Änderungen');expect(page.locator('#notice')).to_contain_text('Synthetischer Ladefehler')
   request_reload();expect(name).to_be_disabled();held.pop().continue_();expect(name).to_have_value('Extern gesicherter Teststand');expect(name).to_be_enabled();expect(page.locator('#record-revision')).to_contain_text('Stand 2');expect(page.locator('#save-indicator')).to_have_text('Alle Änderungen gespeichert')
   page.unroute(endpoint,hold);name.fill('Nach Fehler wieder bearbeitbar');page.locator('#save-product').click();expect(page.locator('#record-revision')).to_contain_text('Stand 3');expect(page.locator('#save-indicator')).to_have_text('Alle Änderungen gespeichert');assert get(endpoint)['document']['name']=='Nach Fehler wieder bearbeitbar'
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('#panel-details').screenshot(path=str(out/('editor-'+str(width)+'.png')))
   # A failed history request for another product must never retain A's restore buttons.
   other=json.loads(json.dumps(remote));other['name']='Anderes Produkt ohne alte Stände';other['config']['profile']['name']=other['name']
   response=page.request.post(base+'/api/workshop/products',headers={'X-Gravuru-CSRF':csrf},data={'document':other});assert response.ok,response.text();other_id=response.json()['id']
   page.set_viewport_size({'width':1440,'height':1000});page.locator('[data-action=overview]').click();page.locator('[data-action=refresh]').click();expect(page.locator('[data-card-id="'+other_id+'"]').first).to_be_visible()
   history_url=base+'/api/workshop/products/'+other_id+'/revisions'
   def fail_history(route):route.fulfill(status=503,content_type='application/json',body=json.dumps({'error':{'message':'Synthetischer Verlaufsausfall'}}))
   page.route(history_url,fail_history);page.locator('[data-product-id="'+other_id+'"]').first.click();page.locator('#tab-history').click();expect(page.locator('#panel-history')).to_contain_text('Verlauf konnte nicht geladen werden');expect(page.locator('#panel-history [data-restore]')).to_have_count(0);expect(page.locator('#panel-history .revision-row')).to_have_count(0)
   page.locator('#panel-history').screenshot(path=str(out/'verlauf-fehler.png'));page.locator('#tab-details').click();name.fill('Entwurf bleibt beim Nachladen erhalten');page.locator('#tab-history').click();page.unroute(history_url,fail_history);page.locator('[data-action=reload-history]').click();expect(page.locator('#panel-history .revision-row')).to_have_count(1);expect(page.locator('#panel-history')).to_contain_text('Anderes Produkt ohne alte Stände');expect(page.locator('#panel-history [data-restore]')).to_be_disabled()
   expect(name).to_have_value('Entwurf bleibt beim Nachladen erhalten');expect(page.locator('#save-indicator')).to_have_text('Ungespeicherte Änderungen')
   assert get(endpoint)['revision']==3;assert get(base+'/api/workshop/products/'+other_id)['revision']==1
   # Older success AND older error for the same product cannot replace history
   # loaded by a newer successful save. The product ID alone is not enough.
   for outcome in ['success','failure']:
    page.locator('#tab-details').click();name.fill('Erster Stand '+outcome);page.route(history_url,fail_history);page.locator('#save-product').click();page.locator('#tab-history').click();expect(page.locator('[data-action=reload-history]')).to_be_visible();expect(page.locator('[data-action=reload-history]')).to_be_enabled();page.unroute(history_url,fail_history)
    old_history=get(history_url);held_history=[]
    def hold_history(route):
     if not held_history:held_history.append(route)
     else:route.continue_()
    page.route(history_url,hold_history);page.locator('[data-action=reload-history]').click();expect(page.locator('[data-action=reload-history]')).to_be_disabled()
    page.locator('#tab-details').click();name.fill('Neuerer Stand '+outcome);page.locator('#save-product').click();expect(page.locator('#save-indicator')).to_have_text('Alle Änderungen gespeichert');page.locator('#tab-history').click()
    expected_revision=get(base+'/api/workshop/products/'+other_id)['revision'];expect(page.locator('#panel-history .revision-row')).to_have_count(expected_revision)
    if outcome=='success':held_history[0].fulfill(status=200,content_type='application/json',body=json.dumps(old_history))
    else:held_history[0].fulfill(status=503,content_type='application/json',body=json.dumps({'error':{'message':'Veralteter Verlaufsfehler'}}))
    page.wait_for_load_state('networkidle');expect(page.locator('#panel-history .revision-row')).to_have_count(expected_revision);expect(page.locator('#notice')).to_contain_text('Gespeichert.');expect(page.locator('#panel-history')).not_to_contain_text('Verlauf konnte nicht geladen werden');page.unroute(history_url,hold_history)
   assert not errors;report.update(result='PASS',build=f['built'],revisionConflictPreservesDraft=True,pendingReloadLocksEditor=True,failedReloadPreservesDraft=True,successfulReloadUsesRemoteRevision=True,retryAndSaveWork=True,failedHistoryNeverShowsAnotherProduct=True,historyRetryWithoutReloadingDraft=True,staleSameProductSuccessIgnored=True,staleSameProductFailureIgnored=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
