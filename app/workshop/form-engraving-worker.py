"""Technical engraving proof: grayscale raster or verified vector, no print white."""
import sys,json,io,math,base64,importlib.util,re
from pathlib import Path
import xml.etree.ElementTree as ET
import pymupdf as fitz
from PIL import Image
from cairosvg.parser import Tree
from cairosvg.surface import PDFSurface
spec=importlib.util.spec_from_file_location('form_print',Path(__file__).with_name('form-print-worker.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

def gray(rgba):
 r,g,b,a=rgba;v=.2126*r+.7152*g+.0722*b
 return v,v,v,a

def vector_pdf(root,slate_contour=False):
 out=io.BytesIO();tree=Tree(bytestring=ET.tostring(root),url_fetcher=p.data_fetch)
 surface=PDFSurface(tree,out,96,map_rgba=None if slate_contour else gray);surface.finish()
 if not slate_contour:return out.getvalue()
 # PDF width zero is a device hairline, independent of output scale. Only the
 # separate slate contour is blue; engraving remains grayscale.
 doc=fitz.open(stream=out.getvalue(),filetype='pdf')
 for page in doc:
  for xref in page.get_contents():
   stream=doc.xref_stream(xref)
   doc.update_stream(xref,re.sub(rb'(?<![\w.])(?:\d+(?:\.\d*)?|\.\d+)\s+w\b',b'0 w',stream))
 return doc.tobytes(deflate=True)

def run(data):
 g,s=data['geometry'],data['settings'];w,h=g['widthMm'],g['heightMm']
 limit=600 if data.get('materialKind')=='slate' else 500
 p.c.require(g['schema']=='gravuru-contour/v1' and 0<w<=limit and 0<h<=limit and s['dpi'] in [300,600] and s['mode'] in ['raster','vector'],'Ungültiges Gravurformat.')
 root=p.prepare_svg(data);root.set('width',str(w)+'mm');root.set('height',str(h)+'mm')
 if s['mirror']:
  group=ET.Element(p.S+'g',{'transform':f'translate({w} 0) scale(-1 1)'})
  for child in list(root):root.remove(child);group.append(child)
  root.append(group)
 if s['mode']=='vector':
  p.c.require(not data['photos'],'Fotos benötigen Rastergravur. Sie werden nicht automatisch vektorisiert.')
  pdf=vector_pdf(root);doc=fitz.open(stream=pdf,filetype='pdf')
  p.c.require(not doc[0].get_images(full=True),'Die Designquelle enthält Rasterbilder oder gerasterte Effekte. Bitte Rastergravur wählen; keine automatische Vektorisierung.')
  p.c.require(not doc[0].get_fonts(),'Die Designquelle enthält nicht in Pfade umgewandelte Schrift.')
  width=height=None
 else:
  width,height=math.ceil(w*s['dpi']/25.4),math.ceil(h*s['dpi']/25.4)
  p.c.require(width*height<=32_000_000,'Das Gravurformat überschreitet 32 Megapixel. Bitte 300 dpi oder ein kleineres Format wählen.')
  im=p.raster(ET.tostring(root),width,height);background=Image.new('RGBA',im.size,'white');background.alpha_composite(im);l=background.convert('RGB').convert('L',(.2126,.7152,.0722,0));out=io.BytesIO();l.save(out,format='PNG')
  doc=fitz.open();page=doc.new_page(width=w*72/25.4,height=h*72/25.4);image=page.insert_image(page.rect,stream=out.getvalue());doc.xref_set_key(image,'ColorSpace','/DeviceGray');pdf=doc.tobytes(deflate=True,garbage=4)
 # A separate, identically oriented contour file prevents cutting from being engraved.
 contour=ET.Element(p.S+'svg',{'width':str(w)+'mm','height':str(h)+'mm','viewBox':f'0 0 {w} {h}'})
 group=ET.SubElement(contour,p.S+'g',{'transform':f'translate({w} 0) scale(-1 1)' if s['mirror'] else 'translate(0 0)'})
 slate=data.get('materialKind')=='slate'
 ET.SubElement(group,p.S+'path',{'d':' '.join(r['d']+' Z' for r in g['contours']),'fill':'none','stroke':'#0000ff' if slate else 'black','stroke-width':'.05'})
 return {'pdf':base64.b64encode(pdf).decode(),'contour':base64.b64encode(vector_pdf(contour,slate)).decode(),'svg':ET.tostring(root,encoding='unicode'),'pixelWidth':width,'pixelHeight':height}
try:print(json.dumps(run(json.load(sys.stdin))))
except Exception as e:
 print(json.dumps({'error':str(e) if isinstance(e,p.c.Failure) else 'Die Gravurprüfung konnte die gesicherten Daten nicht zuverlässig verarbeiten.'}));sys.exit(1)
