"""Pixel acceptance of real shared SVG renderer with synthetic SVG, PDF and photo."""
import base64,io,json,os,subprocess,tempfile
from pathlib import Path
from PIL import Image
import pymupdf
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.test-output/steel-ink';OUT.mkdir(parents=True,exist_ok=True)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60"><rect x="5" y="5" width="90" height="50" fill="#999999"/><rect x="70" y="15" width="15" height="30" fill="white"/></svg>'
photo=io.BytesIO();Image.new('RGB',(100,60),'#999999').save(photo,format='PNG')
raster='<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="60mm" viewBox="0 0 100 60"><image width="100" height="60" href="data:image/png;base64,'+base64.b64encode(photo.getvalue()).decode()+'"/></svg>'
d=pymupdf.open();p=d.new_page(width=100*72/25.4,height=60*72/25.4);p.draw_rect(pymupdf.Rect(5,5,95,55)*pymupdf.Matrix(72/25.4,72/25.4),color=None,fill=(.6,.6,.6));p.draw_rect(pymupdf.Rect(70,15,85,45)*pymupdf.Matrix(72/25.4,72/25.4),color=None,fill=(1,1,1));pdf=d.tobytes();d.close()
with tempfile.TemporaryDirectory(prefix='g27-ink-') as tmp:
 a=Path(tmp)/'input.json';b=Path(tmp)/'result.json'
 a.write_text(json.dumps({k:base64.b64encode(v).decode() for k,v in [('vector',svg.encode()),('vector-pdf',pdf),('photo',raster.encode())]}))
 subprocess.run(['node','scripts/fixtures/steel-ink.mjs',str(a),str(b)],cwd=ROOT,check=True)
 samples=json.loads(b.read_text());assert samples['vector']['vectorOnly'] and samples['vector-pdf']['vectorOnly'] and not samples['photo']['vectorOnly']
 result={}
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1100,'height':750})
  for key,sample in samples.items():
   page.set_content(sample['svg'])
   # Isolate the actual rendered engraving group on white for exact pixel assertions.
   source=page.evaluate('''() => { const o=document.querySelector('[data-object]');return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" viewBox="0 0 100 60"><rect width="100" height="60" fill="white"/>'+o.outerHTML+'</svg>'; }''')
   page.set_content('<img id="sample" src="data:image/svg+xml;base64,'+base64.b64encode(source.encode()).decode()+'">')
   page.wait_for_function('document.querySelector("img").complete && document.querySelector("img").naturalWidth>0')
   png=page.locator('#sample').screenshot();(OUT/(key+'.png')).write_bytes(png)
   im=Image.open(io.BytesIO(png));paint=im.getpixel((300,300))[:3];hole=im.getpixel((780,300))[:3]
   if key in ['vector','vector-pdf']:
    assert paint==(0,0,0),(key,paint);assert hole==(255,255,255),(key,hole)
   else:assert all(145<=v<=160 for v in paint),(key,paint)
   result[key]={'paint':paint,'whiteKnockout':hole}
  browser.close()
(OUT/'report.json').write_text(json.dumps({'result':'PASS','syntheticOnly':True,'pixels':result},indent=2)+'\n')
print(json.dumps(result))
