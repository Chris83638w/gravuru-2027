"""Existing acrylic Konfi -> private native review; disposable synthetic fixture only."""
import json,os,subprocess,tempfile,time,hashlib,io,zipfile,base64
import pymupdf as fitz
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'.test-output/acrylic-output';out.mkdir(parents=True,exist_ok=True)
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
   frame.locator('[data-m-option=base]').select_option('eiche');frame.locator('[data-m-option=size]').select_option('large');frame.locator('[data-m-option=wall]').select_option('wall');frame.locator('[data-ux-file]').set_input_files(str(photo));expect(frame.locator('.ux-upload-thumb')).to_be_visible();frame.locator('[data-ux=edit-upload]').click();frame.locator('[data-photo-color]').select_option('grayscale');frame.locator('[data-photo-zoom]').evaluate("e=>{e.value='1.35';e.dispatchEvent(new Event('input',{bubbles:true}));}");frame.locator('[data-ux=photo-apply]').click();expect(frame.locator('[data-photo-color]')).not_to_be_visible();frame.locator('#ux-tab-text').click();field=frame.locator('[data-ux-text="names"]');field.fill('Mika & Chris');field.blur()
   frame.locator('.completion-finish').click();expect(frame.locator('[data-review-details]')).to_contain_text('Mika & Chris');frame.locator('[data-acrylic-review]').click();link=frame.locator('[data-acrylic-review-link]')
   try:expect(link).to_be_visible(timeout=30000)
   except Exception:raise RuntimeError(frame.locator('.completion-review-footer').inner_text())
   href=link.get_attribute('href');snapshot=href.split('snapshot=')[1];review=browser.new_page(viewport={'width':1440,'height':1050});review.on('pageerror',lambda e:errors.append(str(e)));review.goto(base+href);expect(review.locator('#product-name')).to_contain_text('Prüfmuster');expect(review.locator('#snapshot-preview svg')).to_be_visible();expect(review.locator('#print-panel')).to_be_visible();expect(review.locator('#cart-handoff')).to_be_visible();expect(review.locator('#saved-selection')).to_contain_text('Eiche');expect(review.locator('#price')).to_have_text('36,97 €')
   m=review.request.get(base+'/api/workshop/review-snapshots/'+snapshot).json()['manifest'];csrf=review.request.get(base+'/api/workshop/session').json()['csrfToken']
   def package():return review.request.post(base+'/api/workshop/review-snapshots/'+snapshot+'/download',headers={'X-Gravuru-CSRF':csrf},data={'kind':'package'}).body()
   original=package();assert hashlib.sha256(original).hexdigest()==m['packageSha256'];z=zipfile.ZipFile(io.BytesIO(original));assert z.read('fotos/1-original.png')==photo.read_bytes();saved=json.loads(z.read('produkt-und-gestaltung.json'));assert next(o for o in saved['state']['design']['objects'] if o['id']=='names')['text']=='Mika & Chris'
   assert review.locator('#print-form [name=dpi]').input_value()=='300';assert review.locator('#print-form [name=bleedMm]').input_value()=='0';assert review.locator('#print-form [name=white]').input_value()=='motif'
   with review.expect_download(timeout=120000) as pending:review.locator('#print-form [type=submit]').click()
   download=pending.value;download.save_as(out/'acryl-roland-pruefung.pdf');pdf=(out/'acryl-roland-pruefung.pdf').read_bytes()
   def inspect(raw,white_raw=None):
    doc=fitz.open(stream=raw,filetype='pdf');p=doc[0];k=72/25.4;layers=doc.get_ocgs();assert abs(p.rect.width/k-200)<.001 and abs(p.rect.height/k-266.7)<.001
    pix=p.get_pixmap(matrix=fitz.Matrix(1,1),alpha=True);a=pix.pixel(round(100*k),round(80*k));assert max(a[:3])-min(a[:3])<6,'Foto muss grau bleiben'
    white_doc=fitz.open(stream=white_raw,filetype='pdf') if white_raw else doc;white_layers=white_doc.get_ocgs();white=[i for i,v in white_layers.items() if v['name']=='RDG_WHITE'];white_doc.set_layer(-1,on=white,off=[i for i in white_layers if i not in white]);w=fitz.open(stream=white_doc.tobytes(),filetype='pdf');wp=w[0].get_pixmap(alpha=True);assert wp.pixel(round(2*k),round(2*k))[-1]==0;assert wp.pixel(round(100*k),round(80*k))[-1]==255
    return {'widthMm':p.rect.width/k,'heightMm':p.rect.height/k,'layers':[v['name'] for v in layers.values()],'photoGrayscale':True,'whiteOnlyUnderInk':True}
   roland=inspect(pdf);fitz.open(stream=pdf,filetype='pdf')[0].get_pixmap(matrix=fitz.Matrix(1,1)).save(str(out/'acryl-pdf-vorschau.png'))
   review.locator('#print-form [name=profile]').select_option('mimaki');review.locator('#print-form [name=format]').select_option('zip')
   with review.expect_download(timeout=120000) as pending:review.locator('#print-form [type=submit]').click()
   pending.value.save_as(out/'acryl-mimaki-pruefung.zip');mz=zipfile.ZipFile(out/'acryl-mimaki-pruefung.zip');mimaki=inspect(mz.read('Mimaki-FARBE-ohne-RDG_WHITE.pdf'),mz.read('Mimaki-NUR-RDG_WHITE.pdf'));assert 'Mimaki-FARBE-ohne-RDG_WHITE.pdf' in mz.namelist();assert mz.read('fotos/1-original.png')==photo.read_bytes();settings=json.loads(mz.read('druckpruefung.json'));assert settings['vectorGlyphs']>0 and settings['settings']['colorSpace']=='DeviceCMYK'
   # Compare independent server composition to the actual browser print artwork.
   comparison=review.evaluate('''async ({svg,reference})=>{async function render(source){const im=new Image();im.src=source;await im.decode();const c=document.createElement('canvas');c.height=900;c.width=Math.round(900*200/266.7);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const a=await render(url),b=await render('data:image/png;base64,'+reference);let total=0;for(let i=0;i<a.length;i++)total+=Math.abs(a[i]-b[i]);return total/a.length;}finally{URL.revokeObjectURL(url);}}''',{'svg':mz.read('gesicherte-gestaltung.svg').decode(),'reference':base64.b64encode(z.read('gestaltung-referenz.png')).decode()});assert comparison<.5,comparison
   report['output']={'roland':roland,'mimaki':mimaki,'nativeSvgVsBrowserMeanAbsoluteError':comparison,'vectorGlyphs':settings['vectorGlyphs'],'originalPhotoPreserved':True,'editedPhotoPreserved':bool(m['photos'][0].get('edited')),'dpi':settings['settings']['dpi']}
   review.screenshot(path=str(out/'acrylic-review-desktop.png'),full_page=True)
   for width in [390,768]:
    review.set_viewport_size({'width':width,'height':1000});assert review.evaluate('document.documentElement.scrollWidth<=innerWidth');page.set_viewport_size({'width':width,'height':1000});assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
    if width==390:review.screenshot(path=str(out/'acrylic-review-mobile.png'),full_page=True)
   frame.locator('[data-ux=review-edit]').click();frame.locator('#ux-tab-text').click();field.fill('Anderer Stand');field.blur();assert package()==original
   frame.locator('.completion-finish').click();frame.locator('[data-acrylic-review]').click();expect(link).to_be_visible(timeout=30000);assert link.get_attribute('href')!=href;assert package()==original
   repeated=review.request.post(base+'/api/workshop/review-snapshots/'+snapshot+'/print',headers={'X-Gravuru-CSRF':csrf},data={'settings':{},'format':'pdf'},timeout=120000);assert repeated.status==200;assert repeated.body()==pdf;report['repeatPdfAfterCustomerEdit']='byte-identical'
   assert not errors,errors;report.update(result='PASS',nativeEditor=True,originalPhotoHash=hashlib.sha256(photo.read_bytes()).hexdigest(),immutableAfterEdit=True,secondEditCreatesSeparateSnapshot=True,price=m['selection']['price'],geometry=m['selection']['geometry'],viewports=[1440,390,768],javascriptErrors=errors,technicalPdfExport=True,productionApproved=False);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
