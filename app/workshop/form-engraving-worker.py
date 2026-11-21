"""Technical engraving proof: grayscale raster or verified vector, no print white."""
import sys,json,io,math,base64,importlib.util,re,copy
from pathlib import Path
import xml.etree.ElementTree as ET
import pymupdf as fitz
from PIL import Image,ImageOps
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

# #265, ENTSCHEIDUNGEN 3.62: Die Bestelldateien (PDF und SVG der Bestellansicht) folgen der Musterdatei von Chris vom 21.11.2026
# („so müssen die dateien aussehen“, app/workshop/test-fixtures/musterdatei-gravur-chris-20261121.pdf):
#  - Seite = Plattenmaß 1:1, nie gespiegelt – unabhängig vom Fertigungsprofil (die Fertigung dreht selbst in Corel). Die Platte ist
#    die, die die Gravur trägt: sonst das ganze Format; bei der zweischichtigen Funkklingel die Acrylauflage, die kleiner sein
#    kann als das gemeinsame Format von Träger und Auflage (`orderFiles.plate`, Lage und Maß in mm). Die Musterdatei ist genau
#    so eine Auflage: 160 × 260 mm aus dem Format 16 × 28 cm mit Rahmen oben und unten;
#  - die ganze Gravur in der Ebene „03 Gravur“, Vektorflächen und -linien in reinem Schwarz;
#  - außerhalb der Ebene und danach die Konturen als Linie von 0,001 mm. Chris, 21.11.2026, 17:17 Uhr: „blaue linien sind nur
#    für die konturen , damit man es in den schablonen anlegen kann. bei schildern aus acrylglas gibt es ausnahmen, weil da die
#    löcher im anschliss der gravur geschnitten werden und daher rot benötigen“. Also: reines Blau = Kontur zum Anlegen (die
#    Außenkontur bei allen Produkten), reines Rot = wird nach der Gravur geschnitten (Löcher und Ausschnitte bei Acrylglas).
#    Welche Rolle die Innenkonturen eines Produkts haben, legt allein print-delivery.mjs (`orderHoleLines`) fest und reicht
#    es als `orderFiles.holes` herein: 'cut' (rot), 'contour' (blau) oder 'omit' (nicht gezeichnet).
# Die Dateien der Seite „Ausgaben“ (Gravur-PDF, getrennte Kontur, Fertigungs-SVG) bleiben davon unberührt.
INK='{http://www.inkscape.org/namespaces/inkscape}';ET.register_namespace('inkscape',INK[1:-1])
ORDER_LAYER,ORDER_LINE_MM,ORDER_CONTOUR,ORDER_CUT='03 Gravur','0.001','#0000ff','#ff0000'
ORDER_HOLES={'cut':('ausschnitte','Ausschnitte (Schnitt)',ORDER_CUT),'contour':('innenkonturen','Innenkonturen (Anlegen)',ORDER_CONTOUR),'omit':None}

def cairo_pdf(root,map_rgba):
 out=io.BytesIO();PDFSurface(Tree(bytestring=ET.tostring(root),url_fetcher=p.data_fetch),out,96,map_rgba=map_rgba).finish()
 return out.getvalue()

# Die Farbe der Vorschau ist kein Maschinenwert (wie beim nativen Produkt: „Schrift und Motive werden als schwarze Gravurpfade
# ausgegeben“). In der Bestelldatei ist deshalb jede gemalte Vektorfarbe reines Schwarz; nur reines Weiß bleibt Weiß (keine Gravur).
def engraving_black(rgba):
 r,g,b,a=rgba
 return (r,g,b,a) if min(r,g,b)>=1 else (0,0,0,a)

# Das Format führt genau eine Außenform an erster Stelle, danach nur Innenkonturen (contours.mjs, contour-converter.py).
def order_rings(g,holes):
 rings=g['contours']
 p.c.require(len(rings)>=1 and rings[0].get('role')=='outer' and all(r.get('role')=='hole' for r in rings[1:]),'Die Kontur hat keine eindeutige Außenform.')
 p.c.require(holes in ORDER_HOLES,'Ungültige Angabe zu den Innenkonturen der Bestelldatei.')
 inner=ORDER_HOLES[holes]
 return [('aussenkontur','Außenkontur (Anlegen)',ORDER_CONTOUR,rings[:1]),*([(*inner,rings[1:])] if inner else [])]

# `taken`: Kennungen, die die Gestaltung schon führt. Eine Ebene der Bestelldatei weicht dann auf „-2“, „-3“ … aus; ihr lesbarer
# Name (`data-layer`) bleibt. So scheitert keine Ausgabe an einer zufällig gleich benannten Kennung einer Designquelle.
def order_id(key,taken):
 free=key;n=1
 while free in taken:n+=1;free=f'{key}-{n}'
 taken.add(free);return free

def order_contour_groups(g,holes,taken=None):
 taken=set() if taken is None else taken
 for key,label,stroke,rings in order_rings(g,holes):
  if not rings:continue
  group=ET.Element(p.S+'g',{'id':order_id(key,taken),'data-layer':label,'fill':'none','stroke':stroke,'stroke-width':ORDER_LINE_MM})
  ET.SubElement(group,p.S+'path',{'d':' '.join(r['d']+' Z' for r in rings)})
  yield group

# Platte der Bestelldatei als (x, y, Breite, Höhe) in mm im Format w × h; ohne Angabe das ganze Format.
def order_plate(order,w,h):
 plate=order.get('plate')
 if plate is None:return None
 ok=isinstance(plate,dict) and set(plate)=={'x','y','width','height'} and all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in plate.values())
 p.c.require(ok and plate['x']>=0 and plate['y']>=0 and plate['width']>0 and plate['height']>0 and plate['x']+plate['width']<=w+1e-6 and plate['y']+plate['height']<=h+1e-6,'Ungültiges Plattenmaß der Bestelldatei.')
 return None if (plate['x'],plate['y'],plate['width'],plate['height'])==(0,0,w,h) else (plate['x'],plate['y'],plate['width'],plate['height'])

MM=72/25.4
def order_page(g,w,h,holes,plate,vector=None,image=None):
 x,y,pw,ph=plate or (0,0,w,h)
 doc=fitz.open();page=doc.new_page(width=pw*MM,height=ph*MM);layer=doc.add_ocg(ORDER_LAYER)
 # Ausschnitt der Formatseite, der 1:1 auf die Seite der Platte kommt.
 clip=fitz.Rect(x*MM,y*MM,(x+pw)*MM,(y+ph)*MM) if plate else None
 def place(source,oc=0):
  p.c.require(len(source)==1 and abs(w*MM-source[0].rect.width)<.01 and abs(h*MM-source[0].rect.height)<.01,'Gravurseite und Plattenmaß sind nicht deckungsgleich.')
  page.show_pdf_page(page.rect,source,0,clip=clip,oc=oc)
 if vector is not None:place(fitz.open(stream=vector,filetype='pdf'),layer)
 else:
  rect=page.rect
  if plate:
   # Auf ganze Pixel um die Platte beschneiden und an der wahren Lage dieser Pixel einsetzen – kein Umrechnen der Pixel.
   with Image.open(io.BytesIO(image)) as full:
    W,H=full.size;x0,y0,x1,y1=math.floor(x*W/w+1e-9),math.floor(y*H/h+1e-9),math.ceil((x+pw)*W/w-1e-9),math.ceil((y+ph)*H/h-1e-9)
    out=io.BytesIO();full.crop((x0,y0,x1,y1)).save(out,format='PNG');image=out.getvalue()
   rect=fitz.Rect((x0*w/W-x)*MM,(y0*h/H-y)*MM,(x1*w/W-x)*MM,(y1*h/H-y)*MM)
  xref=page.insert_image(rect,stream=image,oc=layer);doc.xref_set_key(xref,'ColorSpace','/DeviceGray')
 lines=ET.Element(p.S+'svg',{'width':str(w)+'mm','height':str(h)+'mm','viewBox':f'0 0 {w} {h}'})
 for group in order_contour_groups(g,holes):lines.append(group)
 place(fitz.open(stream=cairo_pdf(lines,None),filetype='pdf'));page.set_trimbox(page.rect)
 return doc.tobytes(deflate=True)

def order_svg(plain,g,w,h,holes,plate):
 root=copy.deepcopy(plain);box=[float(v) for v in re.split(r'[ ,]+',(root.get('viewBox') or '').strip()) if v]
 p.c.require(len(box)==4 and all(abs(a-b)<1e-6 for a,b in zip(box,[0,0,w,h])),'Gestaltung und Plattenmaß sind nicht deckungsgleich.')
 taken={n.get('id') for n in root.iter() if n.get('id')}
 layer=ET.Element(p.S+'g',{'id':order_id('gravur',taken),'data-layer':ORDER_LAYER,INK+'groupmode':'layer',INK+'label':ORDER_LAYER})
 for child in list(root):root.remove(child);layer.append(child)
 groups=[layer,*order_contour_groups(g,holes,taken)]
 if plate:
  # Seite = Platte: Die Gruppen behalten die Koordinaten des Formats und werden als Ganzes an den Ursprung der Platte geschoben.
  x,y,pw,ph=plate;number=lambda v:str(int(v)) if float(v).is_integer() else str(v)
  root.set('width',number(pw)+'mm');root.set('height',number(ph)+'mm');root.set('viewBox',f'0 0 {number(pw)} {number(ph)}')
  for group in groups:group.set('transform',f'translate({number(-x)} {number(-y)})')
 for group in groups:root.append(group)
 return ET.tostring(root,encoding='unicode')

def run(data):
 g,s=data['geometry'],data['settings'];w,h=g['widthMm'],g['heightMm']
 limit=600 if data.get('materialKind')=='slate' else 500
 p.c.require(g['schema']=='gravuru-contour/v1' and 0<w<=limit and 0<h<=limit and s['dpi'] in [300,600] and s['mode'] in ['raster','vector','auto'],'Ungültiges Gravurformat.')
 root=p.prepare_svg(data);root.set('width',str(w)+'mm');root.set('height',str(h)+'mm')
 order=data.get('orderFiles');p.c.require(order is None or isinstance(order,dict) and 'holes' in order and set(order)<={'holes','plate'},'Ungültige Angabe zur Bestelldatei.')
 plate=order_plate(order,w,h) if order else None
 plain=copy.deepcopy(root) if order and s['mirror'] else root
 if s['mirror']:
  group=ET.Element(p.S+'g',{'transform':f'translate({w} 0) scale(-1 1)'})
  for child in list(root):root.remove(child);group.append(child)
  root.append(group)
 mode=s['mode']
 if mode=='auto':
  # #265, ENTSCHEIDUNGEN 3.57 (5): ohne Fertigungsprofil Vektor, wenn die Gestaltung kein Foto enthält, sonst Raster. Enthält sie
  # ohne Kundenfoto doch Rasterbilder (eingefärbte Designquelle, Beispielfoto), wäre Vektor ein Fehlschlag: dann ebenfalls Raster.
  mode='raster' if data['photos'] else 'vector'
  if mode=='vector':
   probe=fitz.open(stream=vector_pdf(root),filetype='pdf')
   if probe[0].get_images(full=True) or probe[0].get_fonts():mode='raster'
 if mode=='vector':
  p.c.require(not data['photos'],'Fotos benötigen Rastergravur. Sie werden nicht automatisch vektorisiert.')
  pdf=vector_pdf(root);doc=fitz.open(stream=pdf,filetype='pdf')
  p.c.require(not doc[0].get_images(full=True),'Die Designquelle enthält Rasterbilder oder gerasterte Effekte. Bitte Rastergravur wählen; keine automatische Vektorisierung.')
  p.c.require(not doc[0].get_fonts(),'Die Designquelle enthält nicht in Pfade umgewandelte Schrift.')
  width=height=None;order_content={'vector':cairo_pdf(plain,engraving_black)} if order else None
 else:
  width,height=math.ceil(w*s['dpi']/25.4),math.ceil(h*s['dpi']/25.4)
  p.c.require(width*height<=32_000_000,'Das Gravurformat überschreitet 32 Megapixel. Bitte 300 dpi oder ein kleineres Format wählen.')
  im=p.raster(ET.tostring(root),width,height);background=Image.new('RGBA',im.size,'white');background.alpha_composite(im);l=background.convert('RGB').convert('L',(.2126,.7152,.0722,0));out=io.BytesIO();l.save(out,format='PNG')
  doc=fitz.open();page=doc.new_page(width=w*72/25.4,height=h*72/25.4);image=page.insert_image(page.rect,stream=out.getvalue());doc.xref_set_key(image,'ColorSpace','/DeviceGray');pdf=doc.tobytes(deflate=True,garbage=4)
  if order:
   # Dieselben Pixel wie die Gravurseite, nur seitenrichtig.
   seen=io.BytesIO();(ImageOps.mirror(l) if s['mirror'] else l).save(seen,format='PNG');order_content={'image':seen.getvalue()}
 # A separate, identically oriented contour file prevents cutting from being engraved.
 contour=ET.Element(p.S+'svg',{'width':str(w)+'mm','height':str(h)+'mm','viewBox':f'0 0 {w} {h}'})
 group=ET.SubElement(contour,p.S+'g',{'transform':f'translate({w} 0) scale(-1 1)' if s['mirror'] else 'translate(0 0)'})
 slate=data.get('materialKind')=='slate'
 ET.SubElement(group,p.S+'path',{'d':' '.join(r['d']+' Z' for r in g['contours']),'fill':'none','stroke':'#0000ff' if slate else 'black','stroke-width':'.05'})
 result={'pdf':base64.b64encode(pdf).decode(),'contour':base64.b64encode(vector_pdf(contour,slate)).decode(),'svg':ET.tostring(root,encoding='unicode'),'pixelWidth':width,'pixelHeight':height,'mode':mode}
 if order:result['orderPdf']=base64.b64encode(order_page(g,w,h,order['holes'],plate,**order_content)).decode();result['orderSvg']=order_svg(plain,g,w,h,order['holes'],plate)
 return result
try:print(json.dumps(run(json.load(sys.stdin))))
except Exception as e:
 print(json.dumps({'error':str(e) if isinstance(e,p.c.Failure) else 'Die Gravurprüfung konnte die gesicherten Daten nicht zuverlässig verarbeiten.'}));sys.exit(1)
