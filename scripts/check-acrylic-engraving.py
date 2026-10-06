"""Private synthetic native engraving browser proof. No real shop or machine."""
import hashlib,io,json,os,subprocess,sys,tempfile,time,zipfile
from pathlib import Path
from datetime import datetime,timezone
import pymupdf as fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];coverage='--coverage' in sys.argv;out=ROOT/('.test-output/acrylic-photo-coverage' if coverage else '.test-output/acrylic-engraving');out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False,'machineApproved':False}
with tempfile.TemporaryDirectory(prefix='g27-engraving-browser-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-engraving-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-engraving.mjs'),str(folder),*(['uncovered-photo'] if coverage else [])],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Fixture failed: '+(folder/'server.log').read_text()[-1400:])
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];report['build']=f['built'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/werkstatt/pruefstaende/?snapshot='+f['snapshotId']);expect(page.locator('#engraving-panel')).to_be_visible();expect(page.locator('#print-panel')).to_be_hidden();assert page.locator('#engraving-form [name=dpi]').input_value()=='300';expect(page.locator('#photo-quality')).to_be_visible();expect(page.locator('#photo-resolution')).to_contain_text('300 × 400 Pixel');expect(page.locator('#photo-resolution')).to_contain_text('unter 300 dpi');expect(page.locator('#warnings')).to_contain_text('600 dpi beim Export ergänzen keine fehlenden Bilddetails')
   expect(page.locator('.photo-coverage')).to_contain_text('Fotofenster teilweise frei' if coverage else 'vollständig abgedeckt')
   def download(name):
    with page.expect_download(timeout=90000) as pending:page.locator('#engraving-form [type=submit]').click()
    pending.value.save_as(out/name);return (out/name).read_bytes()
   data=download('acryl-gravur-300dpi.pdf');doc=fitz.open(stream=data,filetype='pdf');p=doc[0];objects='\n'.join(doc.xref_object(i) for i in range(1,doc.xref_length()));assert abs(p.rect.width*25.4/72-200)<.001 and abs(p.rect.height*25.4/72-266.7)<.001;assert 'RDG_WHITE' not in objects and 'CutContour' not in objects;assert all(i[5]=='DeviceGray' for i in p.get_images());assert not p.get_fonts();p.get_pixmap().save(str(out/'acryl-gravur-vorschau.png'))
   page.locator('#engraving-form [name=format]').select_option('zip');archive=download('acryl-gravur-paket.zip');z=zipfile.ZipFile(io.BytesIO(archive));assert z.read('technische-gravurpruefung.pdf')==data;assert 'gravur-kontur-1zu1.pdf' in z.namelist();metadata=json.loads(z.read('gravurpruefung.json'));assert not metadata['productionReady'] and metadata['settings']['dpi']==300;manifest=json.loads(z.read('manifest.json'));assert hashlib.sha256(z.read(manifest['photos'][0]['path'])).hexdigest()==manifest['photos'][0]['sha256'];assert manifest['photoResolution'][0]['frameCovered']==(not coverage);assert len(manifest['photoResolution'])==1 and manifest['photoResolution'][0]['effectiveDpi']<300;assert manifest['capabilities']['engraving'] and not manifest['capabilities']['print'];contour=fitz.open(stream=z.read('gravur-kontur-1zu1.pdf'),filetype='pdf');assert not contour[0].get_images() and contour[0].get_drawings()
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1050});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/('gravur-dashboard-'+str(width)+'.png')),full_page=True)
   page.locator('#engraving-form [name=mode]').select_option('vector');page.locator('#engraving-form [type=submit]').click();expect(page.locator('#engraving-status')).to_contain_text('Fotos benötigen Rastergravur',timeout=30000);page.locator('#engraving-form [name=mode]').select_option('raster');page.locator('#engraving-form [name=format]').select_option('pdf');assert download('acryl-gravur-wiederholung.pdf')==data
   assert not errors;report.update(result='PASS',widthMm=200,heightMm=266.7,dpi=300,deviceGray=True,noPrintWhite=True,separateContour=True,originalPreserved=True,vectorWithPhotoRejected=True,repeatPdfByteIdentical=True,photoQualityVisible=True,photoFrameCovered=manifest['photoResolution'][0]['frameCovered'],photoEffectiveDpi=manifest['photoResolution'][0]['effectiveDpi'],viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
