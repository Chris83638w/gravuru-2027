"""Existing acrylic Konfi -> private native review; disposable synthetic fixture only."""
import json,os,subprocess,tempfile,time,hashlib,io,zipfile
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'.test-output/acrylic-review';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'data':'synthetic only','result':'RUNNING','published':False}
with tempfile.TemporaryDirectory(prefix='g27-acrylic-browser-') as temporary:
 folder=Path(temporary);(folder/'synthetic-konfi-only').touch();photo=folder/'photo.png';im=Image.new('RGB',(600,800),'#eee6dc');draw=ImageDraw.Draw(im);draw.rectangle((80,80,360,400),fill='#b56943');draw.ellipse((240,320,540,650),fill='#5d7284');draw.text((100,720),'SYNTHETISCHE PRUEFDATEI',fill='black');im.save(photo)
 env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python')+os.pathsep+env.get('PYTHONPATH','');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/existing-konfi.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+40
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Fixture startup failed')
   time.sleep(.1)
  meta=json.loads((folder/'ready.json').read_text());base=meta['url'];report['build']=meta['built'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1100});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/?configuration='+meta['id']+'&revision=1');page.wait_for_selector('iframe');frame=page.frames[1];expect(frame.locator('.completion-finish')).to_be_visible(timeout=30000)
   frame.locator('[data-m-option=base]').select_option('eiche');frame.locator('[data-m-option=size]').select_option('large');frame.locator('[data-m-option=wall]').select_option('wall');frame.locator('[data-ux-file]').set_input_files(str(photo));expect(frame.locator('.ux-upload-thumb')).to_be_visible();frame.locator('#ux-tab-text').click();field=frame.locator('[data-ux-text="names"]');field.fill('Mika & Chris');field.blur()
   frame.locator('.completion-finish').click();expect(frame.locator('[data-review-details]')).to_contain_text('Mika & Chris');frame.locator('[data-acrylic-review]').click();link=frame.locator('[data-acrylic-review-link]')
   try:expect(link).to_be_visible(timeout=30000)
   except Exception:raise RuntimeError(frame.locator('.completion-review-footer').inner_text())
   href=link.get_attribute('href');snapshot=href.split('snapshot=')[1];review=browser.new_page(viewport={'width':1440,'height':1050});review.on('pageerror',lambda e:errors.append(str(e)));review.goto(base+href);expect(review.locator('#product-name')).to_contain_text('Prüfmuster');expect(review.locator('#snapshot-preview svg')).to_be_visible();assert review.locator('#print-panel').is_hidden();assert review.locator('#cart-handoff').is_hidden();expect(review.locator('#saved-selection')).to_contain_text('Eiche');expect(review.locator('#price')).to_have_text('36,97 €')
   m=review.request.get(base+'/api/workshop/review-snapshots/'+snapshot).json()['manifest'];csrf=review.request.get(base+'/api/workshop/session').json()['csrfToken']
   def package():return review.request.post(base+'/api/workshop/review-snapshots/'+snapshot+'/download',headers={'X-Gravuru-CSRF':csrf},data={'kind':'package'}).body()
   original=package();assert hashlib.sha256(original).hexdigest()==m['packageSha256'];z=zipfile.ZipFile(io.BytesIO(original));assert z.read('fotos/1-original.png')==photo.read_bytes();saved=json.loads(z.read('produkt-und-gestaltung.json'));assert next(o for o in saved['state']['design']['objects'] if o['id']=='names')['text']=='Mika & Chris'
   review.screenshot(path=str(out/'acrylic-review-desktop.png'),full_page=True)
   for width in [390,768]:
    review.set_viewport_size({'width':width,'height':1000});assert review.evaluate('document.documentElement.scrollWidth<=innerWidth');page.set_viewport_size({'width':width,'height':1000});assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if width==390:review.screenshot(path=str(out/'acrylic-review-mobile.png'),full_page=True)
   frame.locator('[data-ux=review-edit]').click();frame.locator('#ux-tab-text').click();field.fill('Anderer Stand');field.blur();assert package()==original
   frame.locator('.completion-finish').click();frame.locator('[data-acrylic-review]').click();expect(link).to_be_visible(timeout=30000);assert link.get_attribute('href')!=href;assert package()==original
   assert not errors,errors;report.update(result='PASS',nativeEditor=True,originalPhotoHash=hashlib.sha256(photo.read_bytes()).hexdigest(),immutableAfterEdit=True,secondEditCreatesSeparateSnapshot=True,price=m['selection']['price'],geometry=m['selection']['geometry'],viewports=[1440,390,768],javascriptErrors=errors,productionExport=False);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
