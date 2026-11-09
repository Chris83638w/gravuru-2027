"""Private technical print rasterization; no external resource access or extraction."""
import sys,json,base64,io,math,importlib.util,re
from pathlib import Path
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image,ImageOps,ImageFilter
from cairosvg.surface import PNGSurface
from cairosvg.url import fetch
from scipy.spatial import cKDTree
spec=importlib.util.spec_from_file_location('contour',Path(__file__).with_name('contour-converter.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c);c.dependencies()
text_spec=importlib.util.spec_from_file_location('print_text',Path(__file__).with_name('form-print-text.py'))
text_module=importlib.util.module_from_spec(text_spec);text_spec.loader.exec_module(text_module)
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
  root=ET.fromstring(raw)
  # PDF layers share a defs block. Unreferenced definitions are not artwork
  # and must not block an otherwise mask-free motif. Follow nested references.
  definitions={n.get('id'):n for defs in root.iter(S+'defs') for n in defs.iter() if n.get('id')}
  def refs(node):
   values=[]
   for n in node.iter():
    for key,value in n.attrib.items():
     values.extend(re.findall(r'url\(#([^)]*)\)',value))
     if key.split('}')[-1]=='href' and value.startswith('#'):values.append(value[1:])
   return values
  used=set()
  def visible(node):
   if node.tag==S+'defs':return
   for value in node.attrib.values():used.update(re.findall(r'url\(#([^)]*)\)',value))
   for key,value in node.attrib.items():
    if key.split('}')[-1]=='href' and value.startswith('#'):used.add(value[1:])
   for child in node:visible(child)
  visible(root);pending=list(used)
  while pending:
   key=pending.pop()
   if key not in definitions:continue
   for ref in refs(definitions[key]):
    if ref not in used:used.add(ref);pending.append(ref)
  for defs in root.iter(S+'defs'):
   for node in list(defs):
    if not any(n.get('id') in used for n in node.iter()):defs.remove(node)
  c.require(not any(n.tag==S+'mask' for n in root.iter()),'SVG-Masken werden in dieser technischen Druckausgabe noch nicht unterstützt. Bitte die Designquelle ohne Masken vorbereiten.')
  raw=ET.tostring(root)
 return raw
def raster(svg,w,h):
 return Image.open(io.BytesIO(PNGSurface.convert(bytestring=svg,output_width=w,output_height=h,url_fetcher=data_fetch))).convert('RGBA')
def template_photo_masks(root,dpi):
 # Cairo applies alpha masks, whereas PDF soft masks use luminance. Convert
 # only the generated immutable photo masks; arbitrary artwork stays guarded.
 for mask in root.iter(S+'mask'):
  if mask.get('data-template-photo-mask')!='true':continue
  images=list(mask);c.require(len(images)==1 and images[0].tag==S+'image','Ungültige Original-Fotomaske.')
  image=images[0];href=image.get('href','');c.require(href.startswith('data:image/svg+xml;base64,'),'Original-Fotomaske muss im Prüfstand liegen.')
  source=ET.fromstring(base64.b64decode(href.split(',',1)[1],validate=True))
  for inner in source.iter(S+'mask'):
   c.require(all(n.tag in [S+'mask',S+'g',S+'image'] for n in inner.iter()),'Diese Fotomaske enthält noch nicht unterstützte Maskenformen. Original vor der Ausgabe prüfen.')
   for n in inner.iter(S+'image'):
    key='href' if 'href' in n.attrib else '{http://www.w3.org/1999/xlink}href'
    uri=n.get(key,'');c.require(uri.startswith('data:image/png;base64,'),'Unbekannte Bildmaske.')
    with Image.open(io.BytesIO(base64.b64decode(uri.split(',',1)[1],validate=True))) as raw:
     c.require(raw.width*raw.height<=20_000_000,'Bildmaske zu groß.')
     rgba=np.array(raw.convert('RGBA'));lum=rgba[:,:,:3].astype(np.float32) @ np.array([.2126,.7152,.0722],dtype=np.float32)
     if inner.get('mask-type')!='alpha':rgba[:,:,3]=np.rint(lum*rgba[:,:,3]/255).astype(np.uint8)
     rgba[:,:,:3]=255;out=io.BytesIO();Image.fromarray(rgba).save(out,format='PNG');n.set(key,'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode())
   inner.set('mask-type','alpha')
  # Match the placed physical size. Curves/transforms are rendered at output DPI.
  scale=float(mask.get('data-mask-scale','1'));c.require(math.isfinite(scale) and 0<scale<=100,'Ungültiger Maskenmaßstab.')
  w,h=[math.ceil(float(image.get(k))*dpi*scale/25.4) for k in ['width','height']]
  c.require(0<w and 0<h and w*h<=32_000_000,'Original-Fotomaske überschreitet die Ausgabegröße.')
  rgba=raster(ET.tostring(source),w,h)
  out=io.BytesIO();rgba.save(out,format='PNG');image.set('href','data:image/png;base64,'+base64.b64encode(out.getvalue()).decode())
  mask.set('mask-type','alpha')
def tint_imported_artwork(root,dpi):
 # Match the preview's constant RGB filter while preserving source alpha.
 # Rasterize at placed size/output DPI, never at the browser thumbnail size.
 for image in root.iter(S+'image'):
  ink=image.get('data-native-tint')
  if ink is None:continue
  c.require(bool(re.fullmatch('#[a-fA-F0-9]{6}',ink)),'Ungültige Designfarbe.')
  mw,mh=[float(image.get(k,'0')) for k in ['data-raster-width-mm','data-raster-height-mm']]
  c.require(all(math.isfinite(v) and 0<v<=2000 for v in [mw,mh]),'Ungültiges Maß der eingefärbten Designquelle.')
  w,h=math.ceil(mw*dpi/25.4),math.ceil(mh*dpi/25.4)
  c.require(w*h<=32_000_000,'Eingefärbte Designquelle überschreitet 32 Megapixel. Bitte 300 dpi oder kleiner platzieren.')
  href=image.get('href','');c.require(href.startswith('data:image/svg+xml;base64,'),'Eingefärbte Designquelle muss im Prüfstand liegen.')
  mode=image.get('data-native-tonal','flat');c.require(mode in ['flat','tone','solid'],'Ungültige Gravurdarstellung.')
  rgba=raster(data_fetch(href,'image/svg+xml'),w,h);alpha=rgba.getchannel('A')
  if mode!='flat':
   # Same rule as the studio preview filter: coverage 1-luminance times source
   # alpha; 'solid' thresholds any non-white coverage to full ink (steel vectors).
   a=np.asarray(rgba).astype(np.float32);cover=1-(a[:,:,:3] @ np.array([.2126,.7152,.0722],dtype=np.float32))/255
   if mode=='solid':cover=(cover*256>=1).astype(np.float32)
   alpha=Image.fromarray(np.rint(np.clip(cover,0,1)*a[:,:,3]).astype(np.uint8),'L')
  tinted=Image.new('RGBA',(w,h),tuple(int(ink[i:i+2],16) for i in [1,3,5])+(255,));tinted.putalpha(alpha)
  out=io.BytesIO();tinted.save(out,format='PNG');image.set('href','data:image/png;base64,'+base64.b64encode(out.getvalue()).decode())
  for key in ['data-native-tint','data-native-tonal','data-raster-width-mm','data-raster-height-mm']:image.attrib.pop(key,None)

def remove_guide_layers(root):
 # Ü6.1: Hilfsebenen (data-role="guide": Fotohinweis, Bohrloch-/Abstandshalter-
 # Vorschau, Platzhalter) sind Editor-Darstellung und gehören nie in die
 # Fertigungsdatei. Druck und Gravur teilen diese Stufe.
 for parent in list(root.iter()):
  for child in list(parent):
   if child.get('data-role')=='guide':parent.remove(child)
def prepare_svg(data):
 # Originals are decoded at their actual resolution; only the output raster has a DPI.
 root=ET.fromstring(data['svg']);c.require(root.tag==S+'svg','Ungültige Gestaltung.')
 remove_guide_layers(root)
 template_photo_masks(root,data['settings']['dpi'])
 tint_imported_artwork(root,data['settings']['dpi'])
 photo_ids=set()
 for p in data['photos']:
  photo_ids.add(p['fieldId']);raw=base64.b64decode(p['bytes'],validate=True)
  with Image.open(io.BytesIO(raw)) as source:
   c.require(source.width*source.height<=20_000_000,'Foto zu groß.')
   im=ImageOps.exif_transpose(source).convert('RGBA');c.require(im.size==(p['width'],p['height']),'Fotoauflösung wurde verändert.')
   alpha=im.getchannel('A')
   if p['tone']=='grayscale':im=(im.convert('RGB').convert('L',(.2126,.7152,.0722,0)) if p.get('nativeGrayscale') else ImageOps.grayscale(im)).convert('RGBA');im.putalpha(alpha)
   elif p['tone']=='sepia':
    a=np.asarray(im);rgb=a[:,:,:3].astype(np.float32);rgb=np.clip(rgb @ np.array([[.393,.349,.272],[.769,.686,.534],[.189,.168,.131]],dtype=np.float32),0,255).astype(np.uint8);im=Image.fromarray(np.dstack((rgb,a[:,:,3])))
   if p.get('nativeTint'):
    c.require(bool(re.fullmatch('#[a-fA-F0-9]{6}',p['nativeTint'])),'Ungültige Logofarbe.')
    a=np.asarray(im).copy();lum=a[:,:,:3].astype(np.float32) @ np.array([.2126,.7152,.0722],dtype=np.float32);a[:,:,3]=np.rint((1-lum/255)*a[:,:,3]).astype(np.uint8);a[:,:,:3]=[int(p['nativeTint'][i:i+2],16) for i in [1,3,5]];im=Image.fromarray(a)
   im.info.clear();out=io.BytesIO();im.save(out,format='PNG')
   nodes=[n for n in root.iter(S+'g') if n.get('data-photo-pan')==p['fieldId']];c.require(len(nodes)==1,'Fotobindung fehlt.')
   images=list(nodes[0].iter(S+'image'));c.require(len(images)==1,'Fotobindung ist nicht eindeutig.')
   images[0].set('href','data:image/png;base64,'+base64.b64encode(out.getvalue()).decode());images[0].attrib.pop('filter',None)
 for parent in list(root.iter()):
  for child in list(parent):
   if child.get('data-field') in data['photoFields'] and child.get('data-field') not in photo_ids:parent.remove(child)
 return root
def run(data):
 g,s=data['geometry'],data['settings'];mw,mh=g['widthMm'],g['heightMm'];dpi=s['dpi'];requested=s['bleedMm']
 c.require(g['schema']=='gravuru-contour/v1' and 0<mw<=500 and 0<mh<=500 and dpi in [300,600] and requested in [0,1,1.5] and s['whiteBleedMm'] in [0,1,1.5] and s['whiteBleedMm']<=requested,'Ungültiges Druckformat.')
 root=prepare_svg(data)
 parts,text_vectors,nontext_root=text_module.split_artwork(root,set(data['textFields']),c.require,number)
 # Only the outer edge is expanded; original hole paths are never enlarged or filled.
 rings=g['contours'];outer=next(r for r in rings if r['role']=='outer')
 # Native customer products are engraved/printed first, then drilled (Issue 48/10).
 artwork_rings=[outer] if data.get('fillDrillHoles') is True else rings
 holes=[r for r in artwork_rings if r['role']=='hole'];plain=' '.join(r['d']+' Z' for r in artwork_rings)
 def offset_rings(distance):
  polygon=c.Polygon(c.flatten(c.parse_path(outer['d'])))
  expanded=polygon.buffer(distance,quad_segs=32)
  c.require(expanded.geom_type=='Polygon','Überdruckkontur ist nicht eindeutig.')
  path='M'+' L'.join(number(x)+' '+number(y) for x,y in expanded.exterior.coords)+' Z'
  return [{'d':path},*holes]
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
 color_rings=offset_rings(bleed) if bleed else artwork_rings
 if bleed:
  expanded_mask=mask(' '.join(r['d']+' Z' for r in color_rings));outside=(expanded_mask>0)&(original==0)
  # Sample fully covered inner-edge pixels, not the contour antialias fringe.
  # Actual artwork alpha is preserved, including empty and translucent edges.
  boundary=np.argwhere(edge&(original==255));targets=np.argwhere(outside)
  if len(boundary) and len(targets):
   indices=cKDTree(boundary).query(targets,workers=1)[1];nearest=boundary[indices];rgba[targets[:,0],targets[:,1]]=rgba[nearest[:,0],nearest[:,1]]
  rgba[:,:,3]=np.minimum(rgba[:,:,3],expanded_mask)
 white_bleed=s['whiteBleedMm'] if bleed else 0
 white_rings=color_rings if white_bleed==bleed else offset_rings(white_bleed) if white_bleed else artwork_rings
 white_allowed=mask(' '.join(r['d']+' Z' for r in white_rings)) if white_bleed else original
 # Render non-text batches separately so photos can cover earlier text fields.
 def render_root(r):
  r.set('viewBox',root.get('viewBox'));r.set('width',str(W));r.set('height',str(H))
  a=np.array(raster(ET.tostring(r),W,H));a[:,:,3]=np.minimum(a[:,:,3],original);return a
 enc=lambda a:base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
 layers=[]
 def bitmap(a):
  ys,xs=np.nonzero(a[:,:,3]);
  if not len(xs):return
  x,y,x2,y2=int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1;b=a[y:y2,x:x2]
  layers.append({'type':'raster','x':x*(mw+2*bleed)/W-bleed,'y':y*(mh+2*bleed)/H-bleed,'widthMm':(x2-x)*(mw+2*bleed)/W,'heightMm':(y2-y)*(mh+2*bleed)/H,'width':x2-x,'height':y2-y,'rgb':enc(b[:,:,:3]),'alpha':enc(b[:,:,3])})
 white_alpha=render_root(nontext_root)[:,:,3].copy()
 if bleed:
  outside_ink=rgba.copy();outside_ink[:,:,3][original>0]=0;bitmap(outside_ink)
  white_alpha=np.maximum(white_alpha,outside_ink[:,:,3])
 for part in parts:
  if 'vectors' in part:layers.append({'type':'text','paths':part['vectors']})
  else:bitmap(render_root(part['root']))
 if s['mirror']:white_alpha=np.flip(white_alpha,axis=1).copy()
 if s['mirror']:rgba=np.flip(rgba,axis=1).copy();white_allowed=np.flip(white_allowed,axis=1).copy()
 enc=lambda a:base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
 return {'width':W,'height':H,'rgb':enc(rgba[:,:,:3]),'alpha':enc(rgba[:,:,3]),'whiteAllowed':enc(white_allowed),'whiteAlpha':enc(white_alpha),'artworkLayers':layers,'textVectors':text_vectors,'bleedMm':bleed,'whiteBleedMm':white_bleed,'edgeInk':touches,'paths':{'cut':pdf_path(rings),'artwork':pdf_path(artwork_rings),'color':pdf_path(color_rings),'white':pdf_path(white_rings)}}
if __name__=='__main__':
 try:
  result=run(json.load(sys.stdin));print(json.dumps(result))
 except Exception as e:
  message=str(e) if isinstance(e,c.Failure) else 'Der technische Druckexport konnte die gesicherten Daten nicht zuverlässig rendern.'
  print(json.dumps({'error':message}));sys.exit(1)
