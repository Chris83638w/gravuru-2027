"""Private technical print rasterization; no external resource access or extraction."""
import sys,json,base64,io,math,importlib.util
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image,ImageOps,ImageFilter
from cairosvg.surface import PNGSurface
from cairosvg.url import fetch
from scipy.spatial import cKDTree
spec=importlib.util.spec_from_file_location('contour',Path(__file__).with_name('contour-converter.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c);c.dependencies()
S='{http://www.w3.org/2000/svg}'
ET.register_namespace('',S[1:-1])
Image.MAX_IMAGE_PIXELS=20_000_000

def number(v):
 return f'{v:.7f}'.rstrip('0').rstrip('.') if v else '0'
def pdf_path(rings):
 out=[]
 for ring in rings:
  path=c.parse_path(ring['d']);c.require(path.isclosed(),'Offene Druckkontur.')
  def xy(z):return number(z.real)+' '+number(z.imag)
  out.append(xy(path.start)+' m')
  for segment in path:
   if isinstance(segment,c.Line):out.append(xy(segment.end)+' l')
   elif isinstance(segment,c.QuadraticBezier):
    a,b,t=segment.start,segment.end,segment.control;out.append(' '.join(xy(z) for z in [a+2*(t-a)/3,b+2*(t-b)/3,b])+' c')
   else:
    pieces=segment.as_cubic_curves(max(1,math.ceil(abs(segment.delta)/22.5))) if isinstance(segment,c.Arc) else [segment]
    for p in pieces:out.append(' '.join(xy(z) for z in p.bpoints()[1:])+' c')
  out.append('h')
 return '\n'.join(out)
def data_fetch(url,kind):
 c.require(str(url).startswith('data:'),'Externe Quellen sind im Prüfexport nicht erlaubt.')
 raw=fetch(url,kind)
 if str(url).startswith('data:image/svg'):
  c.require(not any(n.tag.split('}')[-1]=='mask' for n in ET.fromstring(raw).iter()),'SVG-Masken werden in dieser technischen Druckausgabe noch nicht unterstützt. Bitte die Designquelle ohne Masken vorbereiten.')
 return raw
def raster(svg,w,h):
 return Image.open(io.BytesIO(PNGSurface.convert(bytestring=svg,output_width=w,output_height=h,url_fetcher=data_fetch))).convert('RGBA')
def run(data):
 g,s=data['geometry'],data['settings'];mw,mh=g['widthMm'],g['heightMm'];dpi=s['dpi'];requested=s['bleedMm']
 c.require(g['schema']=='gravuru-contour/v1' and 0<mw<=500 and 0<mh<=500 and dpi in [300,600] and requested in [0,1],'Ungültiges Druckformat.')
 # Originals are decoded at their actual resolution; only the output raster has a DPI.
 root=ET.fromstring(data['svg']);c.require(root.tag==S+'svg','Ungültige Gestaltung.')
 photo_ids=set()
 for p in data['photos']:
  photo_ids.add(p['fieldId']);raw=base64.b64decode(p['bytes'],validate=True)
  with Image.open(io.BytesIO(raw)) as source:
   c.require(source.width*source.height<=20_000_000,'Foto zu groß.')
   im=ImageOps.exif_transpose(source).convert('RGBA');c.require(im.size==(p['width'],p['height']),'Fotoauflösung wurde verändert.')
   alpha=im.getchannel('A')
   if p['tone']=='grayscale':im=ImageOps.grayscale(im).convert('RGBA');im.putalpha(alpha)
   elif p['tone']=='sepia':
    a=np.asarray(im);rgb=a[:,:,:3].astype(np.float32);rgb=np.clip(rgb @ np.array([[.393,.349,.272],[.769,.686,.534],[.189,.168,.131]],dtype=np.float32),0,255).astype(np.uint8);im=Image.fromarray(np.dstack((rgb,a[:,:,3])))
   im.info.clear();out=io.BytesIO();im.save(out,format='PNG')
   nodes=[n for n in root.iter(S+'g') if n.get('data-photo-pan')==p['fieldId']];c.require(len(nodes)==1,'Fotobindung fehlt.')
   images=list(nodes[0].iter(S+'image'));c.require(len(images)==1,'Fotobindung ist nicht eindeutig.')
   images[0].set('href','data:image/png;base64,'+base64.b64encode(out.getvalue()).decode());images[0].attrib.pop('filter',None)
 for parent in list(root.iter()):
  for child in list(parent):
   if child.get('data-field') in data['photoFields'] and child.get('data-field') not in photo_ids:parent.remove(child)
 # Only the outer edge is expanded; original hole paths are never enlarged or filled.
 rings=g['contours'];outer=next(r for r in rings if r['role']=='outer');holes=[r for r in rings if r['role']=='hole'];plain=' '.join(r['d']+' Z' for r in rings)
 polygon=c.Polygon(c.flatten(c.parse_path(outer['d'])));expanded=polygon.buffer(1,quad_segs=32)
 c.require(expanded.geom_type=='Polygon','Überdruckkontur ist nicht eindeutig.')
 coords=list(expanded.exterior.coords);expanded_d='M'+' L'.join(number(x)+' '+number(y) for x,y in coords)+' Z';extended=[{'d':expanded_d},*holes]
 def prepare(bleed):
  W,H=math.ceil((mw+2*bleed)*dpi/25.4),math.ceil((mh+2*bleed)*dpi/25.4);c.require(W*H<=32_000_000,'Das Format überschreitet bei dieser Auflösung 32 Megapixel. Bitte 300 dpi oder ein kleineres Format wählen.')
  root.set('viewBox',f'{-bleed} {-bleed} {mw+2*bleed} {mh+2*bleed}');root.set('width',str(W));root.set('height',str(H))
  rgba=np.array(raster(ET.tostring(root),W,H))
  def mask(d):
   svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-bleed} {-bleed} {mw+2*bleed} {mh+2*bleed}"><path d="{d}" fill="white" fill-rule="evenodd"/></svg>'
   return np.asarray(raster(svg.encode(),W,H))[:,:,3]
  original=mask(plain);rgba[:,:,3]=np.minimum(rgba[:,:,3],original);outer_mask=mask(outer['d']+' Z');edge=(outer_mask>127)&(np.asarray(Image.fromarray(outer_mask).filter(ImageFilter.MinFilter(3)))<128)
  touches=bool(np.any(rgba[:,:,3][edge]>0))
  inner_edge=(outer_mask==255)&(np.asarray(Image.fromarray(outer_mask).filter(ImageFilter.MinFilter(3)))<255)
  return W,H,rgba,original,mask,inner_edge,touches
 W,H,rgba,original,mask,edge,touches=prepare(requested)
 bleed=requested if touches else 0
 if requested and not bleed:W,H,rgba,original,mask,edge,touches=prepare(0)
 if bleed:
  expanded_mask=mask(' '.join(r['d']+' Z' for r in extended));outside=(expanded_mask>0)&(original==0)
  # Sample fully covered inner-edge pixels, not the contour antialias fringe.
  # Actual artwork alpha is preserved, including empty and translucent edges.
  boundary=np.argwhere(edge&(original==255));targets=np.argwhere(outside)
  if len(boundary) and len(targets):
   indices=cKDTree(boundary).query(targets,workers=1)[1];nearest=boundary[indices];rgba[targets[:,0],targets[:,1]]=rgba[nearest[:,0],nearest[:,1]]
  rgba[:,:,3]=np.minimum(rgba[:,:,3],expanded_mask)
 white_bleed=s['whiteBleedMm'] if bleed else 0
 white_allowed=mask(' '.join(r['d']+' Z' for r in extended)) if white_bleed else original
 if s['mirror']:rgba=np.flip(rgba,axis=1).copy();white_allowed=np.flip(white_allowed,axis=1).copy()
 enc=lambda a:base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
 return {'width':W,'height':H,'rgb':enc(rgba[:,:,:3]),'alpha':enc(rgba[:,:,3]),'whiteAllowed':enc(white_allowed),'bleedMm':bleed,'whiteBleedMm':white_bleed,'edgeInk':touches,'paths':{'cut':pdf_path(rings),'color':pdf_path(extended if bleed else rings),'white':pdf_path(extended if white_bleed else rings)}}
try:
 result=run(json.load(sys.stdin));print(json.dumps(result))
except Exception as e:
 message=str(e) if isinstance(e,c.Failure) else 'Der technische Druckexport konnte die gesicherten Daten nicht zuverlässig rendern.'
 print(json.dumps({'error':message}));sys.exit(1)
