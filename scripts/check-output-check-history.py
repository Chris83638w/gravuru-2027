"""Read the complete, filtered output journal using isolated synthetic observations."""
import json,os,subprocess,tempfile,time,uuid
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/output-check-history';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-check-history-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-order-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-order.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
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
   csrf=get('session')['csrfToken']
   def post(route,data):
    r=page.request.post(base+'/api/workshop/'+route,headers={'X-Gravuru-CSRF':csrf},data=data);assert r.ok,r.text();return r.json()
   job=post('export-jobs',{'snapshotId':f['snapshotId'],'settings':{'profile':'mimaki'}});page.goto(base+'/werkstatt/ausgaben/?job='+job['id']);expect(page.locator('#job-status')).to_have_text('Fertig',timeout=90000)
   endpoint='export-jobs/'+job['id']+'/checks';original=get('export-jobs/'+job['id']);files={v['format']:v for v in get(endpoint)['files']}
   def add(format,stage,n):
    file=files[format];return post(endpoint,{'requestId':str(uuid.uuid4()),'format':format,'sha256':file['sha256'],'stage':stage,'result':'passed','machine':'Synthetische Maschine','software':'Synthetischer Test','notes':'SYNTHETISCH '+str(n)})
   for i in range(55):add('white-pdf','import',i)
   for i in range(151):add('pdf','print',i)
   for suffix in ['?format=zip','?stage=approval','?before=bad']:
    assert page.request.get(base+'/api/workshop/'+endpoint+suffix).status==422
   page.locator('#reload-checks').click();expect(page.locator('#check-history li')).to_have_count(50);expect(page.locator('#check-count')).to_contain_text('50 von 206')
   page.locator('#check-form [name=notes]').fill('Nicht gespeicherte Beobachtung bleibt erhalten')
   page.locator('#check-filter-format').select_option('white-pdf');expect(page.locator('#check-count')).to_contain_text('50 von 55');page.locator('#check-filter-stage').select_option('import');expect(page.locator('#check-count')).to_contain_text('50 von 55')
   add('white-pdf','import','NEU')
   page.locator('#more-checks').click();expect(page.locator('#check-history li')).to_have_count(55);expect(page.locator('#check-count')).to_contain_text('55 von 56');expect(page.locator('#more-checks')).to_be_hidden();texts=page.locator('#check-history li').all_text_contents();assert len(set(texts))==55;assert not any('NEU' in t for t in texts);assert all('Dateiimport' in t and 'weiss' in t.lower() for t in texts)
   expect(page.locator('#check-form [name=notes]')).to_have_value('Nicht gespeicherte Beobachtung bleibt erhalten')
   page.locator('#reload-checks').click();expect(page.locator('#check-history li').first).to_contain_text('NEU');expect(page.locator('#check-count')).to_contain_text('50 von 56')
   page.locator('#check-filter-stage').select_option('print');expect(page.locator('#check-history li')).to_have_count(0);expect(page.locator('#check-count')).to_have_text('Keine passenden Prüfvermerke.');expect(page.locator('#more-checks')).to_be_hidden()
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('#output-checks').screenshot(path=str(out/('verlauf-'+str(width)+'.png')))
   # File filter and history filter must not select the file being signed in the entry form.
   expect(page.locator('#check-form [name=format]')).to_have_value('pdf');assert get('export-jobs/'+job['id'])==original
   other=post('export-jobs',{'snapshotId':f['snapshotId'],'settings':{'profile':'mimaki','white':'none'}});deadline=time.monotonic()+60
   while get('export-jobs/'+other['id'])['status']!='completed':
    assert time.monotonic()<deadline;time.sleep(.2)
   page.locator('#refresh').click();page.locator('[data-job="'+other['id']+'"]').click();expect(page.locator('#job-id')).to_have_text(other['id']);expect(page.locator('#check-filter-format')).to_have_value('');expect(page.locator('#check-filter-stage')).to_have_value('');expect(page.locator('#check-history li')).to_have_count(0);expect(page.locator('#check-form [name=notes]')).to_have_value('');assert not errors
   report.update(result='PASS',build=f['built'],initialObservations=206,filteredOlderObservations=55,concurrentInsertNoDuplicateOrLoss=True,newerEntryAfterReload=True,emptyFilterSupported=True,entryFormPreserved=True,historyFilterDoesNotChangeSignedFile=True,jobSwitchResetsHistory=True,invalidQueriesRejected=True,outputJobUnchanged=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
