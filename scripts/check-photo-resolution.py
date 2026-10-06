"""Native photo editor -> frozen review uses source-sized crop, never preview pixels.
Disposable synthetic photo/workshop only. No external services or publication.
"""
import json,os,subprocess,tempfile,time,hashlib,io,zipfile,math
from datetime import datetime,timezone
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'.test-output/photo-resolution';out.mkdir(parents=True,exist_ok=True)
report={'startedAt':datetime.now(timezone.utc).isoformat(),'result':'RUNNING','data':'synthetic only','published':False}
with tempfile.TemporaryDirectory(prefix='g27-photo-resolution-') as tmp:
 folder=Path(tmp);(folder/'synthetic-konfi-only').touch();photo=folder/'photo.png'
 # A deterministic smooth 12-MP color source makes crop/tone errors measurable.
 small=Image.new('RGB',(400,300));small.putdata([(round(x*255/399),round(y*255/299),round((399-x)*255/399)) for y in range(300) for x in range(400)]);original=small.resize((4000,3000));original.save(photo)
 env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w');server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/existing-konfi.mjs'),str(folder)],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+40
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic fixture startup failed')
   time.sleep(.1)
  f=json.loads((folder/'ready.json').read_text());base=f['url'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1100});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/?configuration='+f['id']+'&revision=1');page.wait_for_selector('iframe');frame=page.frames[1];expect(frame.locator('.completion-finish')).to_be_visible(timeout=30000)
   frame.locator('[data-ux-file]').set_input_files(str(photo));expect(frame.locator('.ux-upload-thumb')).to_be_visible();frame.locator('[data-ux=edit-upload]').click();frame.locator('[data-photo-color]').select_option('grayscale')
   for name,value in [('zoom','1.25'),('x','.4'),('y','-.2')]:frame.locator('[data-photo-'+name+']').evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}',value)
   preview=frame.locator('.ux-photo-canvas').evaluate('c=>({width:c.width,height:c.height})');assert max(preview.values())==1200
   for width in [1440,390,768]:
    page.set_viewport_size({'width':width,'height':1100});assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth');frame.locator('[data-photo-color]').is_visible();frame.locator('.ux-photo-workspace').screenshot(path=str(out/('editor-'+str(width)+'.png')))
   page.set_viewport_size({'width':1440,'height':1100});frame.locator('[data-ux=photo-apply]').click();
   try:expect(frame.locator('[data-photo-color]')).not_to_be_visible(timeout=15000)
   except Exception:raise RuntimeError(frame.locator('[data-photo-status]').inner_text())
   expect(frame.locator('[data-ux-status]')).to_contain_text('Pixeln übernommen')
   csrf=page.request.get(base+'/api/workshop/session').json()['csrfToken']
   def snapshot():
    frame.locator('.completion-finish').click();frame.locator('[data-acrylic-review]').click();link=frame.locator('[data-acrylic-review-link]');expect(link).to_be_visible(timeout=30000);sid=link.get_attribute('href').split('snapshot=')[1]
    res=page.request.get(base+'/api/workshop/review-snapshots/'+sid);assert res.ok,res.text();manifest=res.json()['manifest'];res=page.request.post(base+'/api/workshop/review-snapshots/'+sid+'/download',headers={'X-Gravuru-CSRF':csrf},data={'kind':'package'});assert res.ok,res.text();archive=zipfile.ZipFile(io.BytesIO(res.body()));frame.locator('[data-ux=review-edit]').click();return manifest,archive
   m,z=snapshot();entry=m['photos'][0];edited=Image.open(io.BytesIO(z.read(entry['edited']['path']))).convert('RGB');assert z.read(entry['path'])==photo.read_bytes()
   saved=json.loads(z.read('produkt-und-gestaltung.json'));slot=next(o for o in saved['state']['design']['objects'] if o.get('uxUploadId'));aspect=slot['w']/slot['h'];available_h=min(3000,4000/aspect)/1.25;expected=(math.floor(available_h*aspect),math.floor(available_h));assert edited.size==expected,(edited.size,expected);assert max(edited.size)>1200
   # Independent pixel mapping for pan/zoom and Rec.709 grayscale conversion.
   w,h=edited.size;scale=max(w/4000,h/3000)*1.25;dx=max(0,(4000*scale-w)/2);dy=max(0,(3000*scale-h)/2)
   for x,y in [(w//4,h//4),(w//2,h//2),(w*3//4,h*3//4)]:
    sx=(x-w/2-.4*dx)/scale+2000;sy=(y-h/2+.2*dy)/scale+1500;rgb=original.getpixel((round(sx),round(sy)));gray=round(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]);pixel=edited.getpixel((x,y));assert max(pixel)-min(pixel)<=1;assert abs(pixel[0]-gray)<=3,(pixel,gray)
   first=z.read(entry['edited']['path']);frame.locator('#ux-tab-upload').click();frame.locator('[data-ux=edit-upload]').click();expect(frame.locator('[data-photo-color]')).to_have_value('grayscale');frame.locator('[data-ux=photo-reset]').click();expect(frame.locator('[data-photo-color]')).to_have_value('original');frame.locator('[data-ux=photo-undo]').click();expect(frame.locator('[data-photo-color]')).to_have_value('grayscale');frame.locator('[data-ux=photo-apply]').click();expect(frame.locator('[data-photo-color]')).not_to_be_visible();m2,z2=snapshot();assert z2.read(m2['photos'][0]['edited']['path'])==first,'Reopening/reset/undo must not lose source pixels or double-apply crop';assert z2.read(m2['photos'][0]['path'])==photo.read_bytes()
   edited.thumbnail((600,600));edited.save(out/'edited-grayscale.png');assert not errors,errors
   report.update(result='PASS',build=f['built'],sourcePixels=[4000,3000],previewPixels=preview,editedPixels=list(expected),originalSha256=hashlib.sha256(photo.read_bytes()).hexdigest(),originalByteIdentical=True,cropAndGrayscaleChecked=True,reopenResetUndoByteIdentical=True,viewports=[1440,390,768],javascriptErrors=errors);browser.close()
 except Exception as e:report.update(result='FAIL',error=str(e));raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(out/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
print(json.dumps(report,indent=2))
