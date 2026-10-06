"""Imported SVG tint: existing Konfi and native dashboard downloads, synthetic only."""
import os,json,subprocess,tempfile,time,io,zipfile
from pathlib import Path
from datetime import datetime,timezone
import pymupdf as fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/acrylic-import-tint';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-tint-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-tint-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-import-tint.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  until=time.monotonic()+45
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>until:raise RuntimeError((folder/'server.log').read_text()[-1200:])
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/?configuration='+f['productId']+'&revision=1');page.wait_for_selector('iframe');frame=page.frames[1];expect(frame.locator('.completion-finish')).to_be_visible(timeout=30000)
   matrices=frame.locator('feColorMatrix').evaluate_all('(els)=>els.map(e=>e.getAttribute("values"))');assert any('0.533333' in m for m in matrices if m),matrices
   page.screenshot(path=str(out/'konfi-tint.png'),full_page=True)
   page.goto(base+'/werkstatt/pruefstaende/?snapshot='+f['snapshotId']);expect(page.locator('#print-panel')).to_be_visible()
   def download(name):
    with page.expect_download(timeout=120000) as pending:page.locator('#print-form [type=submit]').click()
    pending.value.save_as(out/name);return (out/name).read_bytes()
   pdf=download('import-roland.pdf');doc=fitz.open(stream=pdf,filetype='pdf');layers=doc.get_ocgs();doc.set_layer(-1,on=[i for i,v in layers.items() if v['name']=='Farbmotiv'],off=[i for i,v in layers.items() if v['name']!='Farbmotiv']);doc=fitz.open(stream=doc.tobytes(),filetype='pdf');pix=doc[0].get_pixmap(alpha=True);k=72/25.4;opaque=pix.pixel(round(50*k),round(55*k));half=pix.pixel(round(90*k),round(55*k));empty=pix.pixel(round(28*k),round(33*k));assert opaque[1]>opaque[0] and opaque[1]>opaque[2];assert 126<=half[3]<=130;assert empty[3]==0
   page.locator('#print-form [name=profile]').select_option('mimaki');page.locator('#print-form [name=format]').select_option('zip');z=zipfile.ZipFile(io.BytesIO(download('import-mimaki.zip')));assert 'Mimaki-Weissersatz-separat.pdf' in z.namelist();meta=json.loads(z.read('druckpruefung.json'));assert meta['settings']['colorSpace']=='DeviceCMYK' and meta['settings']['dpi']==300
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('dashboard-'+str(width)+'.png')),full_page=True)
   assert not errors;report.update(result='PASS',build=f['built'],previewTint=True,downloadTint=True,alphaPreserved=True,mimakiWhiteSeparate=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
