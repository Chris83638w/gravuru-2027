"""Werkstatt-Zusammenfassung als eine A4-Seite aus summary.json; keine Fertigungsfreigabe."""
import sys,json,base64,os
from datetime import datetime,timezone
import pymupdf as fitz
fitz.TOOLS.mupdf_display_errors(False);fitz.TOOLS.mupdf_display_warnings(False)

W,H=595.28,841.89;MARGIN=36;CONTENT=W-2*MARGIN
INK=(.13,.16,.19);MUTED=(.36,.42,.47);LINE=(.78,.81,.84);HEAD=(.94,.95,.96)
AMPEL={'gruen':((.18,.6,.33),'grün'),'gelb':((.85,.62,.1),'gelb'),'rot':((.78,.2,.18),'rot'),'offen':((.55,.58,.62),'offen')}
FONT_CANDIDATES=[
 ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
 ('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf','/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'),
 ('C:/Windows/Fonts/arial.ttf','C:/Windows/Fonts/arialbd.ttf'),
 ('/Library/Fonts/Arial.ttf','/Library/Fonts/Arial Bold.ttf'),
]

def load_fonts():
 for regular,bold in FONT_CANDIDATES:
  if os.path.isfile(regular) and os.path.isfile(bold):
   try:return fitz.Font(fontfile=regular),fitz.Font(fontfile=bold)
   except Exception:continue
 return fitz.Font('helv'),fitz.Font('hebo')

def money(cents,currency='EUR'):
 if not isinstance(cents,int):return '–'
 sign='-' if cents<0 else '';cents=abs(cents)
 return f'{sign}{cents//100},{cents%100:02d} {currency}'
def mm(v,digits=2):
 if v is None:return '–'
 s=f'{v:.{digits}f}'.rstrip('0').rstrip('.');return s.replace('.',',')
def stamp(iso):
 try:
  dt=datetime.fromisoformat(iso.replace('Z','+00:00'))
  try:
   from zoneinfo import ZoneInfo
   return dt.astimezone(ZoneInfo('Europe/Berlin')).strftime('%d.%m.%Y %H:%M')+' (Europe/Berlin)'
  except Exception:
   return dt.astimezone(timezone.utc).strftime('%d.%m.%Y %H:%M')+' UTC'
 except Exception:return str(iso)

class Sheet:
 def __init__(self):
  self.doc=fitz.open();self.page=self.doc.new_page(width=W,height=H);self.tw=fitz.TextWriter(self.page.rect,color=INK)
  self.regular,self.bold=load_fonts();self.y=MARGIN
 def font(self,bold):return self.bold if bold else self.regular
 def width(self,text,size,bold=False):return self.font(bold).text_length(text,fontsize=size)
 def wrap(self,text,width,size,bold=False):
  lines=[]
  for raw in str(text).replace('\r','').split('\n'):
   words=raw.split(' ');line=''
   for word in words:
    probe=word if not line else line+' '+word
    if self.width(probe,size,bold)<=width:line=probe;continue
    if line:lines.append(line)
    # Einzelnes überlanges Wort hart umbrechen, damit die Spalte nicht überläuft.
    while self.width(word,size,bold)>width and len(word)>1:
     cut=len(word)
     while cut>1 and self.width(word[:cut],size,bold)>width:cut-=1
     lines.append(word[:cut]);word=word[cut:]
    line=word
   lines.append(line)
  return lines
 def text(self,x,y,s,size=8.5,bold=False):
  self.tw.append((x,y),str(s),font=self.font(bold),fontsize=size)
 def paragraph(self,x,y,width,s,size=8.5,bold=False,leading=1.3):
  for line in self.wrap(s,width,size,bold):
   self.text(x,y,line,size,bold);y+=size*leading
  return y
 def heading(self,s):
  self.y+=4;self.text(MARGIN,self.y+9,s,10,True);self.y+=13
  self.page.draw_line((MARGIN,self.y),(MARGIN+CONTENT,self.y),color=LINE,width=.5);self.y+=6
 def key_values(self,rows,x=MARGIN,width=CONTENT,label_width=118,size=8.5):
  y=self.y
  for label,value in rows:
   lines=self.wrap(value,width-label_width-4,size)
   self.text(x,y+size,label,size,True)
   for line in lines:self.text(x+label_width,y+size,line,size);y+=size*1.35
   if not lines:y+=size*1.35
  self.y=y
  return y
 def table(self,columns,rows,size=8,limit_y=None,empty='–'):
  """columns: [(title,width)]; rows: list of lists of cell strings or ('ampel',status)."""
  x0=MARGIN;total=sum(w for _,w in columns);scale=CONTENT/total if total>CONTENT else 1
  widths=[w*scale for _,w in columns];pad=3;lh=size*1.3
  self.page.draw_rect(fitz.Rect(x0,self.y,x0+CONTENT,self.y+lh+2*pad),color=None,fill=HEAD)
  x=x0
  for (title,_),w in zip(columns,widths):self.text(x+pad,self.y+pad+size,title,size,True);x+=w
  self.y+=lh+2*pad;shown=0
  if not rows:
   self.text(x0+pad,self.y+pad+size,empty,size);self.y+=lh+2*pad;return 0
  for row in rows:
   cells=[]
   for cell,w in zip(row,widths):
    if isinstance(cell,tuple):cells.append(cell)
    else:cells.append(self.wrap('–' if cell in (None,'') else cell,w-2*pad,size))
   height=max(len(c) if isinstance(c,list) else 1 for c in cells)*lh+2*pad
   if limit_y is not None and self.y+height>limit_y:
    left=len(rows)-shown;self.text(x0+pad,self.y+pad+size,f'… {left} weitere Einträge in summary.json',size,False);self.y+=lh+2*pad;return shown
   x=x0
   for cell,w in zip(cells,widths):
    if isinstance(cell,tuple):
     color,label=AMPEL.get(cell[1],AMPEL['offen'])
     self.page.draw_circle((x+pad+4,self.y+pad+size-3),3.2,color=color,fill=color)
     self.text(x+pad+11,self.y+pad+size,label,size)
    else:
     yy=self.y+pad+size
     for line in cell:self.text(x+pad,yy,line,size);yy+=lh
    x+=w
   self.y+=height;self.page.draw_line((x0,self.y),(x0+CONTENT,self.y),color=LINE,width=.3);shown+=1
  return shown
 def finish(self,summary):
  self.tw.write_text(self.page)
  self.doc.set_metadata({'title':'Gravuru Fertigungspaket · Zusammenfassung','subject':summary['configuration']['snapshotId'],'creator':'Gravuru 2027 · Werkstatt','keywords':'Fertigungspaket, Zusammenfassung, keine Fertigungsfreigabe'})
  return self.doc.tobytes(garbage=4,deflate=True)

def build(data):
 s=data['summary'];preview=data.get('preview');sheet=Sheet();page=sheet.page
 cfg=s['configuration'];product=s['product'];profile=s['profile'];price=product.get('price') or {}
 # Kopf
 sheet.text(MARGIN,MARGIN+12,'Fertigungspaket · Zusammenfassung',14,True)
 sheet.text(MARGIN,MARGIN+26,cfg.get('productName') or '',10)
 created='Erzeugt: '+stamp(s['createdAt']);sheet.text(MARGIN+CONTENT-sheet.width(created,8),MARGIN+12,created,8)
 note='Keine Fertigungsfreigabe · Prüfstand '+cfg['snapshotId'];sheet.text(MARGIN+CONTENT-sheet.width(note,7),MARGIN+24,note,7)
 sheet.y=MARGIN+36;page.draw_line((MARGIN,sheet.y),(MARGIN+CONTENT,sheet.y),color=INK,width=.8);sheet.y+=4
 # Zwei Spalten: links Auftrag/Produkt, rechts Vorschau
 right_w=200;left_w=CONTENT-right_w-14;top=sheet.y
 box=fitz.Rect(MARGIN+left_w+14,top+6,MARGIN+CONTENT,top+6+right_w)
 page.draw_rect(box,color=LINE,width=.5)
 if preview and preview.get('png'):
  try:
   png=base64.b64decode(preview['png']);inner=fitz.Rect(box.x0+4,box.y0+4,box.x1-4,box.y1-4)
   page.insert_image(inner,stream=png,keep_proportion=True)
   caption='Vorschau aus der Produktionsdatei'
  except Exception:caption='Vorschau konnte nicht eingebettet werden'
 else:caption=s.get('previewNote') or 'Keine Vorschau verfügbar'
 sheet.text(box.x0,box.y1+10,caption[:70],7)
 mirror_note=' · Vorschau ungespiegelt dargestellt' if profile.get('mirror') else ''
 if mirror_note:sheet.text(box.x0,box.y1+19,'Produktionsdatei ist gespiegelt',7)
 # Auftrag
 sheet.y=top;sheet.text(MARGIN,sheet.y+9,'Auftrag',10,True);sheet.y+=14
 orders=s.get('order') or []
 rows=[]
 if orders:
  rows.append(('Bestellnummer',', '.join(str(o['orderId']) for o in orders)))
  rows.append(('Positions-ID',', '.join(f"{o['positionId']} (Shop-Position {o['lineId']})" for o in orders)))
 else:rows.append(('Bestellbezug',s.get('orderNote') or 'offen'))
 rows.append(('Konfiguration',f"{cfg['snapshotId']} · Entwurf {cfg.get('draftId') or '–'} Rev. {cfg.get('draftRevision') if cfg.get('draftRevision') is not None else '–'}"))
 rows.append(('Produktstand',f"{cfg['productId']} · Revision {cfg['productRevision']}"))
 rows.append(('Design',str(cfg.get('designId') or '–')))
 qty=product.get('quantity');rows.append(('Menge · Preis',f"{qty if qty is not None else '–'} × {money(price.get('unitCents'),price.get('currency','EUR'))}"+(f" = {money(price.get('totalCents'),price.get('currency','EUR'))}" if isinstance(price.get('totalCents'),int) else '')))
 sheet.key_values(rows,width=left_w,label_width=100)
 # Produkt
 sheet.y+=4;sheet.text(MARGIN,sheet.y+9,'Produkt',10,True);sheet.y+=14
 mat=product['material'];material=mat.get('label') or 'offen'
 if mat.get('thicknessMm') is not None:material+=f" · {mm(mat['thicknessMm'])} mm"
 if mat.get('colorHex'):material+=f" · {mat['colorHex']}"
 mount=product.get('mounting') or {};holes=mount.get('holes') or []
 if mount.get('option'):mounting=f"{mount['option']['group']}: {mount['option']['value']}"
 else:mounting='Keine Bohrungen · Befestigung laut Optionen' if not holes and not mount.get('holeCount') else 'laut Bohrbild'
 if holes:mounting+=f" · {len(holes)} Bohrung(en): "+', '.join(f"Ø {mm(h['diameterMm'])} mm bei {mm(h['xMm'])} | {mm(h['yMm'])} mm" for h in holes)
 elif mount.get('holeCount'):mounting+=f" · {mount['holeCount']} Ausschnitt(e) laut Kontur"
 rows=[('Material',material),('Größe',f"{mm(product['widthMm'])} × {mm(product['heightMm'])} mm"+(f" · Radius {mm(product['cornerRadiusMm'])} mm" if product.get('cornerRadiusMm') else '')),('Befestigung',mounting),('Verfahren',product.get('methodLabel') or '–')]
 options=product.get('options') or []
 def option_price(o):
  c=o.get('priceCents')
  if not isinstance(c,int):return 'Preis offen'
  return ('Grundpreis ' if o.get('priceKind')=='base' else '+' if c>0 else '')+money(c)
 rows.append(('Optionen','; '.join(f"{o['group']}: {o['value']} ({option_price(o)})" for o in options) if options else 'Keine Optionsgruppen'))
 sheet.key_values(rows,width=left_w,label_width=100)
 sheet.y=max(sheet.y,box.y1+26)
 # Textfelder
 sheet.heading('Textfelder')
 fields=s.get('textFields') or []
 trows=[]
 for f in fields:
  font=f.get('font') or '–'
  style=[k for k,v in (('fett',f.get('bold')),('kursiv',f.get('italic'))) if v]
  if style:font+=' ('+', '.join(style)+')'
  trows.append([f.get('label') or f.get('id'),f.get('text') or '',font,mm(f.get('sizeMm')),mm(f.get('xMm')),mm(f.get('yMm')),mm(f.get('rotationDeg'),1)+'°'])
 sheet.table([('Feld',70),('Text',170),('Schrift',100),('Größe mm',54),('x mm',44),('y mm',44),('Drehung',41)],trows,limit_y=H-250,empty='Keine Textfelder')
 sheet.text(MARGIN,sheet.y+8,'Position = Mittelpunkt des Felds in mm vom linken oberen Plattenrand; Größe = Schriftgröße in mm auf der Platte.',6.5);sheet.y+=10
 # Fotos
 sheet.heading('Fotos')
 prows=[]
 for p in s.get('photos') or []:
  dpi=f"{p['effectiveDpi']} dpi" if isinstance(p.get('effectiveDpi'),(int,float)) else 'offen'
  if p.get('targetDpi'):dpi+=f" (Soll {p['targetDpi']})"
  prows.append([p.get('label') or p.get('fieldId') or '–',p.get('fileName') or '–',f"{p.get('width')} × {p.get('height')} px",dpi,('ampel',p.get('status','offen')),p.get('note') or ''])
 sheet.table([('Feld',70),('Datei (fotos/)',130),('Pixel',80),('Effektive Auflösung',100),('Ampel',55),('Vermerk',88)],prows,limit_y=H-150,empty='Keine Kundenfotos')
 # Fertigungsprofil
 sheet.heading('Fertigungsprofil')
 mirror=profile.get('mirror');mirror_text='ja' if mirror is True else 'nein' if mirror is False else 'offen'
 out=s.get('output') or {};st=out.get('settings') or {}
 show=lambda v:'ja' if v is True else 'nein' if v is False else v
 setting_text=', '.join(f"{k}: {show(v)}" for k,v in st.items() if k in ('profile','mode','dpi','white','bleedMm','whiteBleedMm','mirror'))
 rows=[('Profil',(profile.get('name') or 'Kein Fertigungsprofil gebunden')+(f" · Stand {profile['revision']}" if profile.get('revision') else '')),('Verfahren',profile.get('methodLabel') or '–'),('Maschine',profile.get('machine') or 'offen'),('RIP / Software',profile.get('rip') or 'offen'),('Spiegelung',mirror_text+(' · Einstellungen weichen vom Profil ab' if profile.get('settingsOverridden') else '')),('Ausgabe',(out.get('recipe') or '')+(' · '+setting_text if setting_text else '')),('Dateien',', '.join(out.get('files') or []) or '–')]
 sheet.key_values(rows,label_width=92,size=8)
 footer='Erzeugt '+stamp(s['createdAt'])+' · productionReady: nein · Gleiche Daten maschinenlesbar in summary.json'
 sheet.text(MARGIN,H-MARGIN+6,footer,7)
 return sheet.finish(s)

try:
 data=json.loads(sys.stdin.buffer.read(32*1024*1024));sys.stdout.buffer.write(build(data))
except Exception:
 # Keine Kundendaten oder Parser-Details in Serverprotokollen.
 sys.stderr.write('Die Zusammenfassung konnte nicht erstellt werden.\n');sys.exit(1)
