"""Stored output settings vs requested settings, with synthetic isolated data."""
import json,os,subprocess,tempfile,time
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/output-specification';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-specification-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-order-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-order.mjs'),str(folder),'with-profile'],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   def get(route):
    r=page.request.get(base+'/api/workshop/'+route);assert r.ok,r.text();return r.json()
   csrf=get('session')['csrfToken']
   def post(route,data):
    r=page.request.post(base+'/api/workshop/'+route,headers={'X-Gravuru-CSRF':csrf},data=data);assert r.ok,r.text();return r.json()
   old=get('review-snapshots/'+f['snapshotId'])
   job=post('export-jobs',{'snapshotId':f['snapshotId'],'settings':{'bleedMm':1,'whiteBleedMm':1,'mirror':False}})
   page.goto(base+'/werkstatt/ausgaben/?job='+job['id']);expect(page.locator('#job-status')).to_have_text('Fertig',timeout=90000)
   spec=page.locator('#output-specification');expect(spec.locator('[data-profile]')).to_contain_text('Revision 1');expect(spec.locator('[data-profile]')).to_contain_text('Mimaki 2513 EX');expect(spec.locator('[data-override]')).to_contain_text('weichen');expect(spec.locator('[data-color]')).to_contain_text('kein gemessenes')
   for key in ['bleedMm','whiteBleedMm']:
    row=spec.locator('[data-setting='+key+']');expect(row.locator('td').nth(0)).to_have_text('1 mm');expect(row.locator('td').nth(1)).to_have_text('0 mm · abweichend')
   expect(spec.locator('[data-setting=mirror] td').nth(1)).to_have_text('Nein');expect(spec.locator('[data-edge]')).to_contain_text('Nein');expect(spec.locator('[data-warnings]')).to_contain_text('Außenrand')
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1100});spec.scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');spec.screenshot(path=str(out/('einstellungen-'+str(width)+'.png')))
   second=post('export-jobs',{'snapshotId':f['snapshotId'],'settings':{}});page.goto(base+'/werkstatt/ausgaben/?job='+second['id']);expect(page.locator('#job-status')).to_have_text('Fertig',timeout=90000);expect(spec.locator('[data-override]')).to_have_text('');expect(spec.locator('[data-setting=mirror] td').nth(1)).to_have_text('Ja');expect(spec.locator('tr.changed')).to_have_count(0)
   assert get('review-snapshots/'+f['snapshotId'])==old;assert not errors
   report.update(result='PASS',build=f['built'],requestedBleed=1,effectiveBleed=0,frozenProfileRevision=1,currentProfileRevision=2,profileOverrideShown=True,switchClearsPreviousSettings=True,snapshotUnchanged=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
