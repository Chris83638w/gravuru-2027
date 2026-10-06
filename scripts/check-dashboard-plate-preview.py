"""Saved PDFs -> isolated color/white preview -> unchanged downloads.
No Shopify requests, publication, private customer records or real credentials.
"""
import base64,hashlib,hmac,json,os,subprocess,tempfile,time,zipfile,io
import pymupdf as fitz
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/dashboard-plate-preview';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','shopifyRequestSent':False,'realPayment':False,'published':False}
with tempfile.TemporaryDirectory(prefix='g27-acrylic-order-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-order-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-order.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture failed: '+(folder/'server.log').read_text()[-1800:])
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];report['build']=f['built'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   def get(route):
    r=page.request.get(base+'/api/workshop/'+route);assert r.ok;return r.json()
   csrf=get('session')['csrfToken']
   def post(route,data):return page.request.post(base+'/api/workshop/'+route,headers={'X-Gravuru-CSRF':csrf},data=data)
   page.goto(base+'/werkstatt/pruefstaende/?snapshot='+f['snapshotId']);expect(page.locator('#print-panel')).to_be_visible()
   form=page.locator('#print-form');form.locator('[name=profile]').select_option('mimaki');expect(page.locator('#print-separation-help')).to_contain_text('zwei getrennte PDFs')
   assert form.locator('[name=dpi]').input_value()=='300'
   def download(format,name):
    form.locator('[name=format]').select_option(format)
    with page.expect_download(timeout=120000) as pending:form.locator('[type=submit]').click()
    file=pending.value;file.save_as(out/name);return file.suggested_filename
   assert 'Mimaki-FARBE-ohne-RDG_WHITE.pdf' in download('pdf','farbe.pdf')
   assert 'Mimaki-NUR-RDG_WHITE.pdf' in download('white-pdf','weiss.pdf')
   download('zip','druck.zip');archive=zipfile.ZipFile(out/'druck.zip');assert sorted(n for n in archive.namelist() if n.startswith('Mimaki-'))==['Mimaki-FARBE-ohne-RDG_WHITE.pdf','Mimaki-NUR-RDG_WHITE.pdf'];assert 'technische-druckpruefung.pdf' not in archive.namelist();assert archive.read('Mimaki-NUR-RDG_WHITE.pdf')==(out/'weiss.pdf').read_bytes();assert archive.read('Mimaki-FARBE-ohne-RDG_WHITE.pdf')==(out/'farbe.pdf').read_bytes()
   files={}
   for name in ['farbe.pdf','weiss.pdf']:
    doc=fitz.open(out/name);objects='\n'.join(doc.xref_object(i) for i in range(1,doc.xref_length()));assert not doc.is_repaired;assert not doc[0].get_fonts();assert abs(doc[0].rect.width*25.4/72-200)<.001 and abs(doc[0].rect.height*25.4/72-266.7)<.001
    if name=='weiss.pdf':
     assert '/RDG_WHITE' in objects and '/CutContour' not in objects and not doc[0].get_images();pix=doc[0].get_pixmap(alpha=True);k=72/25.4;assert pix.pixel(round(2*k),round(2*k))[-1]==0 and pix.pixel(round(100*k),round(80*k))[-1]==255
    else:
     assert '/RDG_WHITE' not in objects and '/CutContour' in objects;assert any(x[1].startswith('TextEntry') for x in doc[0].get_xobjects());doc[0].get_pixmap().save(out/'farb-vorschau.png')
    run=subprocess.run(['gs','-q','-dSAFER','-dBATCH','-dNOPAUSE','-dPDFSTOPONERROR','-sDEVICE=nullpage',str(out/name)],capture_output=True);assert run.returncode==0,run.stderr.decode();files[name]={'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest(),'ghostscript':'PASS'}
   form.locator('[name=white]').select_option('none');expect(form.locator('[name=format] [value="white-pdf"]')).to_have_attribute('disabled','');form.locator('[name=white]').select_option('motif')
   href=page.locator('#active-export-job').get_attribute('href');page.goto(base+href);expect(page.locator('[data-format="white-pdf"]')).to_be_visible();expect(page.locator('[data-format="pdf"]')).to_contain_text('Farb-PDF');page.reload();expect(page.locator('[data-format="white-pdf"]')).to_be_enabled()
   with page.expect_download() as pending:page.locator('[data-format="white-pdf"]').click()
   pending.value.save_as(out/'weiss-wiederholt.pdf');assert (out/'weiss-wiederholt.pdf').read_bytes()==(out/'weiss.pdf').read_bytes()
   expect(page.locator('#plate-preview')).to_be_visible()
   for mode,file in [('color','farbe.pdf'),('white','weiss.pdf')]:
    page.locator('[data-plate="'+mode+'"]').click();expect(page.locator('#plate-board')).to_be_visible(timeout=30000);expect(page.locator('#plate-image')).to_have_js_property('complete',True);expect(page.locator('[data-plate="'+mode+'"]')).to_have_attribute('aria-pressed','true');expect(page.locator('#plate-hash')).to_contain_text(hashlib.sha256((out/file).read_bytes()).hexdigest());page.screenshot(path=str(out/('druckebene-'+mode+'-desktop.png')),full_page=True)
   expect(page.locator('#plate-status')).to_contain_text('kein Weißdruck')
   # Switch within the same dashboard: clear old white image and disallow white for no-white jobs.
   original_job=href.split('job=')[1];created=post('export-jobs',{'snapshotId':f['snapshotId'],'settings':{'profile':'mimaki','white':'none'}});assert created.ok;other=created.json();deadline=time.monotonic()+60
   while other['status'] not in ['completed','failed']:
    assert time.monotonic()<deadline;time.sleep(.2);other=get('export-jobs/'+other['id'])
   assert other['status']=='completed';page.locator('#refresh').click();expect(page.locator('[data-job="'+other['id']+'"]').first).to_be_visible();page.locator('[data-job="'+other['id']+'"]').click();expect(page.locator('#job-id')).to_have_text(other['id']);expect(page.locator('[data-plate="white"]')).to_be_hidden();expect(page.locator('#plate-board')).to_be_hidden()
   page.locator('[data-job="'+original_job+'"]').click();expect(page.locator('#job-id')).to_have_text(original_job);expect(page.locator('#plate-board')).to_be_hidden();page.locator('[data-plate="white"]').click();expect(page.locator('#plate-board')).to_be_visible(timeout=30000)

   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('druckebenen-'+str(width)+'.png')),full_page=True)
   page.goto(base+'/werkstatt/pruefstaende/?snapshot='+f['snapshotId']);expect(form.locator('[name=profile]')).to_have_value('roland');expect(form.locator('[name=format] [value="white-pdf"]')).to_have_attribute('disabled','')
   form.locator('[name=profile]').select_option('mimaki');page.screenshot(path=str(out/'getrennte-auswahl-mobil.png'),full_page=True)
   assert not errors;report.update(result='PASS',jobSwitchClearsPreview=True,noWhitePreviewForNoWhiteJob=True,colorAndWhitePreview=True,previewSourceHashesMatchDownloads=True,whiteCheckerboardVisible=True,separateDownloads=True,zipContainsSamePDFs=True,reloadedWhiteIdentical=True,noWhiteOptionWithoutUnderbase=True,whiteVectorOnly=True,colorWithoutRDGWhite=True,textFieldsGrouped=True,files=files,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
