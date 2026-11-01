#!/usr/bin/env python3
"""Issue 85: auditable, editable vector transfer of the hint-sign inventory.

Authority: designs/DESIGN-MASTER.md; issue 85 messages 1–3; user 2026-11-01
approves fine catalogue substitutes for missing fonts. No releases or import.
Source motifs stay in their design; no raster generation, tracing or font files.
"""
import argparse,copy,html,importlib.util,json,re,collections,hashlib
from pathlib import Path
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('layout',HERE/'rund-studien.py');layout=importlib.util.module_from_spec(spec);spec.loader.exec_module(layout)
PT=layout.PT
TARGETS=['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit']
ORDER='auftraege/2026-11-01-issue85-hinweise'
REPLACEMENTS={'Georgia':'Lora','Copperplate Gothic Bold':'Cinzel','Copperplate Gothic':'Cinzel','Copperplate Gothic Light':'Cinzel','Felix Titling':'Cinzel','Constantine':'Cinzel','ParmaPetit':'Poiret One','kindergarten':'Patrick Hand','Melloner Fun':'Comic Neue','EngraversGothic BT':'Roboto Condensed','Bodoni Bd BT':'Cormorant Garamond','Bodoni MT':'Cormorant Garamond','Friday Vibes':'Sacramento','Annie Use Your Telescope':'Patrick Hand','Champagne & Limousines':'Montserrat Light','Comic Sans MS':'Comic Neue','Righteous':'Comfortaa'}
# Verified visually in the source contact sheet. These are duplicate word layouts,
# not new designs merely because Corel stores one as curves and one as text.
HP_DUP={2:49,10:40,11:43,14:42,15:45,32:46,33:48,34:38,35:47,37:41,53:46}
# Outlined lettering transcribed from the original, with tightly bounded regions.
# Only contours wholly inside these regions become editable text; motifs survive.
HP_TEXT={
 0:[('WC',[50,30,20,8])],1:[('WC',[50,30,20,8])],
 5:[('BITTE',[61,10,28,6]),('SETZEN!',[55,21,40,6])],
 12:[('Bitte',[24,4,72,14]),('klingeln!',[14,21,92,14])],
 13:[('Für Garderobe',[18,7,84,10]),('keine Haftung',[18,22,84,10])],
 16:[('TOR BITTE',[18,7,84,11]),('SCHLIEßEN',[14,22,92,11])],
 18:[('Maskenpflicht',[31,29,58,6])],22:[('WLAN',[40,29,40,9])],
 24:[('Aufenthaltsraum',[31,29,58,5])],25:[('Küche',[36,25,48,12])],
 27:[('Küche',[40,28,40,9])],28:[('Dieser Bereich',[48,25,38,4]),('wird überwacht!',[48,31,38,4])],
 30:[('Kein Eingang!',[38,30,44,5])],31:[('Stop!',[28,2,64,16]),('Kein Eingang',[13,22,94,12])],
 36:[('STOP!',[28,3,64,13]),('ZUTRITT NUR',[28,21,64,6]),('FÜR PERSONAL',[24,29,72,6])],
 51:[('WC',[56,62,38,16])],52:[('WC',[56,62,38,16])],
 53:[('AUSGANG',[30,48,150,24])]
}
HP_TEXT_REGIONS={0:[0,30,120,10],1:[0,30,120,10],5:[55,0,65,40],18:[0,28,120,12],22:[0,29,120,11],24:[0,28,120,12],25:[0,24,120,16],27:[0,28,120,12],28:[0,24,120,16],30:[0,30,120,10],51:[0,62,150,18],52:[0,62,150,18]}
HP_NAMES={0:'WC · Damen',1:'WC · Herren',3:'Toilette',4:'Toilette · sitzend',5:'Bitte setzen',6:'Bitte im Sitzen',7:'Wickelraum',8:'Treppe aufwärts',9:'Treppe abwärts',17:'Maske',19:'Barrierefrei',20:'Erste Hilfe · Fläche',21:'Rauchen verboten',23:'Aufenthaltsraum · Symbol',26:'Besteck',29:'Kamera',39:'Erste Hilfe · Kontur',51:'WC · Damen · Kontur',52:'WC · Herren · Kontur'}

def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
def remove_generated_pair(folder,series_root):
 # Only our exact two generated design files, never recursive deletion or sources.
 assert folder.resolve().is_relative_to(series_root.resolve()) and series_root.name.startswith('hinweise-')
 d=read(folder/'design.json');assert 'Issue 85' in d.get('transfer',{}).get('by','')
 assert {p.name for p in folder.iterdir()}=={'design.json','design.svg'}
 (folder/'design.json').unlink();(folder/'design.svg').unlink();folder.rmdir()
def box(path):
 p=BoundsPen(None);parse_path(path,p)
 if not p.bounds:return None
 x,y,x1,y1=p.bounds;return [x,y,x1-x,y1-y]
def transform(path,s,ox=0,oy=0):
 p=SVGPathPen(None);parse_path(path,TransformPen(p,(s,0,0,s,ox,oy)));return p.getCommands()
def union(bs):
 x=min(b[0] for b in bs);y=min(b[1] for b in bs);return [x,y,max(b[0]+b[2] for b in bs)-x,max(b[1]+b[3] for b in bs)-y]
def inside(a,b,tol=.15):return a[0]>=b[0]-tol and a[1]>=b[1]-tol and a[0]+a[2]<=b[0]+b[2]+tol and a[1]+a[3]<=b[1]+b[3]+tol
def texts_of(d):
 h=d['plate']['heightMm'];return [t for t in d['texts'] if not t.get('hint') and t['box'][1]>=-.1 and t['box'][1]<h and t['text'].strip()]
def select_font(original,n):
 if original=='Arial':return ['Raleway','Montserrat Light','Lato','Josefin Sans'][n%4]
 return REPLACEMENTS.get(original,original)
def fit_block(text,font,b,fonts,align='center'):
 lines=text.replace('\u2029','').splitlines();lines=[l.strip() for l in lines if l.strip()];x,y,w,h=b
 bounds=[layout.bounds(l,fonts[font],1) for l in lines];step=1.2
 low=min(i*step+v[1] for i,v in enumerate(bounds));high=max(i*step+v[3] for i,v in enumerate(bounds))
 sz=min(w/max(v[2]-v[0] for v in bounds),h/(high-low));out=[]
 for i,(line,v) in enumerate(zip(lines,bounds)):
  ax=x-v[0]*sz if align=='left' else x+w-v[2]*sz if align=='right' else x+w/2-(v[0]+v[2])*sz/2
  out.append({'text':line,'font':font,'sizePt':sz/PT,'anchorMm':[ax,y+(i*step-low)*sz],'align':'left','lineHeightMm':sz*step,'letterSpacingMm':0,'color':'#000000'})
 return out
def svg(d):
 w,h=d['plateMm'];parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}mm" height="{h:g}mm">']
 parts.append(f'<ellipse id="platte" cx="{w/2:g}" cy="{h/2:g}" rx="{w/2:g}" ry="{h/2:g}" fill="none" stroke="#999" stroke-width="0.2"/>' if d['form']=='Oval' else f'<rect id="platte" width="{w:g}" height="{h:g}" fill="none" stroke="#999" stroke-width="0.2"/>')
 for i,m in enumerate(d['motifs'],1):
  parts.append(f'<g id="motiv-{i}">')
  for p in m['paths']:parts.append(f'<path d="{p["d"]}" fill="{p["fill"] or "none"}" stroke="{p["stroke"] or "none"}" stroke-width="{p["strokeMm"]:.6f}" fill-rule="{"evenodd" if p["evenodd"] else "nonzero"}"/>')
  parts.append('</g>')
 for i,t in enumerate(d['texts'],1):
  x,y=t['anchorMm'];parts.append(f'<text id="text-{i}" data-feld="text-{i}" x="{x:.6f}" y="{y:.6f}" font-family="{html.escape(t["font"])}" font-size="{t["sizePt"]*PT:.6f}" fill="#000000">{html.escape(t["text"])}</text>')
 return '\n'.join(parts+['</svg>'])

def source_group(row,d):
 n=row['designNo'];series=row['series'];w,h=d['plate']['widthMm'],d['plate']['heightMm']
 if series.startswith('HP-'):return ('HP',HP_DUP.get(n,n))
 if series.startswith('HSW-'):return ('HSW',round(w/h,2),{16:13,17:14,18:8}.get(n,n))
 if series.startswith('HSHF-RE-'):return ('HSHF-RE',n)
 if series.startswith('HSHF-') and not series.endswith('-S'):return ('HSHF',n)
 if series.startswith('HSH-') and not series.endswith('-S'):
  # Square plastic versions carry different portraits and captions than V2A.
  return ('HSH',round(w/h,2),n)
 return (series,n)

def paths_of(d,exclusions=()):
 w,h=d['plate']['widthMm'],d['plate']['heightMm'];out=[];removed=[]
 for i,m in enumerate(d['motifs']):
  if not m.get('fill') and not m.get('stroke'):continue
  b=box(m['d'])
  if not b:continue
  if b[2]>=w-.3 and b[3]>=h-.3:
   removed.append({'sourceMotif':i+1,'reason':'Plattenfläche, keine Gravurebene'});continue
  if m.get('stroke')=='#ff0000' and b[2]<10 and b[3]<10 and (b[0]<15 or b[0]>w-25) and (b[1]<15 or b[1]>h-25):
   removed.append({'sourceMotif':i+1,'reason':'Corel-Bohrmarkierung; Befestigung kommt aus der Zielfamilie'});continue
  pieces=[]
  for part in re.findall(r'[Mm][^Mm]*',m['d']):
   bb=box(part)
   if bb and any(inside(bb,region) for region in exclusions):continue
   pieces.append(part)
  if not pieces:continue
  p={'d':' '.join(pieces),'fill':'#000000' if m.get('fill') else None,'stroke':'#000000' if m.get('stroke') else None,'strokeMm':m.get('strokeMm',0),'evenodd':True,'opacity':1,'sourceMotif':i+1}
  out.append(p)
 return out,removed

def cluster_paths(paths):
 # Keep connected source motifs together, and disconnected decorations separately.
 # The source's internal compound contours (holes) are never split or flattened.
 groups=[]
 for p in paths:
  b=box(p['d']);matches=[]
  for i,g in enumerate(groups):
   a=union([box(q['d']) for q in g]);gap=max(a[0]-b[0]-b[2],b[0]-a[0]-a[2],a[1]-b[1]-b[3],b[1]-a[1]-a[3])
   if gap<1:matches.append(i)
  if not matches:groups.append([p]);continue
  dest=matches[0];groups[dest].append(p)
  for i in reversed(matches[1:]):groups[dest].extend(groups.pop(i))
 return [{'box':union([box(p['d']) for p in g]),'paths':g} for g in groups]

def make_design(row,source,family,fonts):
 sw,sh=source['plate']['widthMm'],source['plate']['heightMm'];n=row['designNo'];dev=[]
 form='Oval' if source['form']=='Oval' else 'Quadrat' if abs(sw-sh)<.2 else 'Rechteck'
 group='EL' if form=='Oval' and abs(sw/sh-3)<.03 else 'OV' if form=='Oval' else 'QU' if form=='Quadrat' else 'RE'
 sizes=[s for s in family['sizes'] if s['groupKey']==group and abs(s['widthMm']/s['heightMm']/(sw/sh)-1)<=.01]
 if not sizes:
  # The 20×15 slate sources have no target 4:3 family. This is an explicit
  # reference composition on the existing 3:2 rectangle, never a new size.
  assert row['series'] in ['HSH-S','HSHF-S'],row['key']
  sizes=[s for s in family['sizes'] if s['groupKey']=='RE' and abs(s['widthMm']/s['heightMm']/1.5-1)<=.01]
  dev.append('Alte Größe 200×150 mm: Vorlage bewusst proportional in die gültige Rechteckreihe 3:2 gesetzt; keine Rohlinggröße angelegt.')
 sizes.sort(key=lambda s:s['widthMm']*s['heightMm']);target=sizes[0];w,h=target['widthMm'],target['heightMm'];scale=min(w/sw,h/sh);ox=(w-sw*scale)/2;oy=(h-sh*scale)/2
 text_sources=copy.deepcopy(texts_of(source));exclusions=[]
 if row['series'].startswith('HP-') and n in HP_TEXT:
  text_sources=[{'text':text,'font':'Arial','align':'center','box':b} for text,b in HP_TEXT[n]];exclusions=[b for text,b in HP_TEXT[n]]
  dev.append('Schriftzüge aus Kurven anhand der Originalansicht als echte Textfelder rekonstruiert; ausschließlich ihre Konturen ersetzt.')
  if n in [12,13,16,31,36]:exclusions=[[0,0,sw,sh]]
  if n in HP_TEXT_REGIONS:exclusions=[HP_TEXT_REGIONS[n]]
 # 47 separate tally letters become five editable tally rows; no flattened text.
 tally=[t for t in text_sources if t['text']=='I']
 if len(tally)>10:
  text_sources=[t for t in text_sources if t['text']!='I'];labels=sorted([t for t in text_sources if t['text'].endswith(':')],key=lambda t:t['box'][1]);assert len(labels)==5
  lines=[[] for _ in labels]
  for t in tally:
   cy=t['box'][1]+t['box'][3]/2;i=min(range(5),key=lambda i:abs(labels[i]['box'][1]+labels[i]['box'][3]/2-cy));lines[i].append(t)
  for g in lines:
   text_sources.append({'text':' '.join('I' for t in g),'font':'Arial','box':union([t['box'] for t in g]),'align':'left'})
  dev.append('Strichlisten je Zeile zu einem bearbeitbaren Textfeld zusammengefasst, Anzahl der Striche erhalten.')
 texts=[];substitutions=[]
 for t in text_sources:
  if t['text'].strip()=='_':
   dev.append('Einzelner verirrter Unterstrich aus dem Corel-Text entfernt (Original RE-D26).');continue
  font=select_font(t['font'],n);assert font in fonts and fonts[font].is_file(),(row['key'],t['font'],font)
  if t['font'] in ['Felix Titling','EngraversGothic BT']:t['text']=t['text'].upper()
  if font!=t['font']:substitutions.append({'from':t['font'],'to':font})
  x,y,bw,bh=t['box'];dest=[x*scale+ox,y*scale+oy,bw*scale,bh*scale]
  for item in fit_block(t['text'],font,dest,fonts,t.get('align','center')):
   item['source']={'text':t['text'],'font':t['font'],'box':t['box']};texts.append(item)
 max_factor=max(min(s['widthMm']/w,s['heightMm']/h) for s in sizes)
 for t in texts:
  current=t['sizePt']*PT;limit=99.9/max_factor
  if current>limit:
   b=layout.bounds(t['text'],fonts[t['font']],current);cx=t['anchorMm'][0]+(b[0]+b[2])/2;cy=t['anchorMm'][1]+(b[1]+b[3])/2
   factor=limit/current;layout.place_text(t,[cx,cy,(b[2]-b[0])*factor,(b[3]-b[1])*factor],fonts)
   dev.append('Schrift optisch zentriert leicht verkleinert, damit auch die größte Familiengröße innerhalb der vorhandenen 100-mm-Editorgrenze bleibt.')
 paths,removed=paths_of(source,exclusions)
 for p in paths:p['d']=transform(p['d'],scale,ox,oy);p['strokeMm']*=scale
 motifs=cluster_paths(paths)
 if row['series'].startswith('HP-') and n in [39,51,52]:
  for m in motifs:
   for p in m['paths']:
    if p['stroke']:p['strokeMm']=.5
  dev.append('Originale 0,076-mm-Haarlinie als sichtbarer 0,5-mm-Konturstrich umgesetzt; Pfad und Proportion unverändert (V2A-Prüfwert im nativen Konfi).')
 if row['series']=='HSHF-S' and 7<=n<=16:
  # Deliberate 3:2 layout, not a tiny 4:3 design floating inside a wider plate.
  headings=[t for t in texts if t['source']['text'].lower() in ['achtung','freilaufender hund']]
  for t in headings:
   t['font']='Cinzel';t['text']=t['text'].upper();layout.place_text(t,[40,8 if t['text']=='ACHTUNG' else 17,60,6 if t['text']=='ACHTUNG' else 4],fonts)
  labels=sorted([t for t in texts if t['text'].endswith(':')],key=lambda t:t['anchorMm'][1])
  tallies=sorted([t for t in texts if set(t['text'])<={'I',' '}],key=lambda t:t['anchorMm'][1])
  assert len(labels)==len(tallies)==5,row['key']
  for i,t in enumerate(labels):
   t['font']='Roboto Condensed';t['text']=t['text'].upper();layout.place_text(t,[15.5,25+5*i,21,3],fonts)
  for i,t in enumerate(tallies):
   t['font']='Lato';layout.place_text(t,[34,25+5*i,14,3],fonts)
  assert len(motifs)==1,row['key'];layout.place_motif(motifs[0],[62,36,28,29])
  dev.append('Strichlisten-Vorlage von 4:3 bewusst für 3:2 neu proportioniert: Überschrift und fünf Zeilen vergrößert, Originalporträt rechts unverzerrt erhalten.')
 if row['series']=='HSHF-S' and n==18:
  for t in texts:
   text=t['text'].lower()
   if text in ['hier','wache','ich!']:layout.place_text(t,[20,14+9*['hier','wache','ich!'].index(text),24,5],fonts)
   elif 'betreten' in text:layout.place_text(t,[40,46,67,3.5],fonts)
  assert len(motifs)==1;layout.place_motif(motifs[0],[54,27,38,23]);dev.append('Dreizeilige Warnung und Fußzeile auf 3:2 vergrößert; Hund rechts proportional erhalten.')
 if row['series']=='HSH-S' and n in [4,5,6]:
  names=[t for t in texts if t['text'] in ['Nala','Rocky','Balou']]
  for t in names:
   b=layout.bounds(t['text'],fonts[t['font']],t['sizePt']*PT);cx=t['anchorMm'][0]+(b[0]+b[2])/2
   substitutions.append({'from':t['source']['font'],'to':'Bad Script','reason':'Namenszeile auf kleinem 3:2-Master lesbarer'});t['font']='Bad Script';layout.place_text(t,[cx,45,18 if len(names)==3 else 24 if len(names)==2 else 32,4.5 if len(names)==3 else 5 if len(names)==2 else 6],fonts)
  dev.append('Namen unter den Originalpfoten für den 3:2-Master vergrößert; feine Handschrift Bad Script gemäß Ersatzfreigabe.')
 if len(texts)+len(motifs)>20:
  motifs=[{'box':union([m['box'] for m in motifs]),'paths':[p for m in motifs for p in m['paths']]}]
 assert len(texts)+len(motifs)<=20,(row['key'],len(texts),len(motifs))
 fmt=f'{w/10:g}x{h/10:g}';prefix=source['id'].rsplit('-',2)[0];did=f'{prefix}-{fmt}-D{n}'
 series='hinweise-'+prefix.lower()+f'-{w:g}x{h:g}'
 name=HP_NAMES.get(n) if row['series'].startswith('HP-') else None
 name=name or ' · '.join(t['text'].replace('\n',' ') for t in text_sources if t['text'].strip()!='_')[:150] or 'Piktogramm'
 if row['series']=='HSHF-S' and 7<=n<=16:name=f'Achtung · Strichliste · Originalmotiv {n}'
 themes=['hinweisschilder']+(['hundeschilder'] if row['series'].startswith('HSH') else [])
 d={'id':did,'name':name,'designNo':n,'source':str((Path('designs/bestand/hinweisschilder')/row['path']/'design.json')).replace('\\','/'),'varianteVon':source['id'],'material':source['material'],'process':'Gravur','form':form,'plateMm':[w,h],'plate':{'widthMm':w,'heightMm':h,'source':target['key']},'texts':texts,'motifs':motifs,'photos':[],'fonts':list(dict.fromkeys(t['font'] for t in texts)),'fontsOriginal':list(dict.fromkeys(t['font'] for t in text_sources)),'themes':themes,'movable':True,'mode':'Referenz' if dev or substitutions else '1:1','sizes':[s['key'] for s in sizes],'ziele':[{'familie':f,'freigabe':None} for f in TARGETS],'katalog':{'key':series+f'-D{n}','series':series,'themen':themes},'masterSheet':{'base':did.rsplit('-D',1)[0],'key':did,'familySize':target['key'],'plateMm':[w,h]},'transfer':{'from':source['id'],'fromKey':row['key'],'scale':scale,'offsetMm':[ox,oy],'decided':'2026-11-01','by':'Issue 85 Nachricht 1–3; Nutzer: feine Ersatzschriften aus vorhandenem Katalog erlaubt'},'deviations':dev,'fontSubstitutions':substitutions,'sourceExclusions':removed}
 return d

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--plan-only',action='store_true');a=ap.parse_args();root=a.katalog
 base=root/'designs/bestand/hinweisschilder';rows=read(base/'designs.json');groups=collections.defaultdict(list)
 for row in rows:
  d=read(base/row['path']/'design.json');groups[source_group(row,d)].append((row,d))
 selected=[]
 for key,items in groups.items():
  items.sort(key=lambda rd:(0 if '-V2A-' in rd[0]['key'] else 1,1 if rd[0]['designNo'] in (HP_DUP if rd[0]['series'].startswith('HP-') else {16:13,17:14,18:8} if rd[0]['series'].startswith('HSW-') else {}) else 0,rd[0]['key']))
  selected.append((key,items[0],items))
 if a.plan_only:
  print(json.dumps([{'source':r['key'],'size':[d['plate']['widthMm'],d['plate']['heightMm']],'copies':[i[0]['key'] for i in items]} for key,(r,d),items in selected],ensure_ascii=False,indent=1));return
 fonts={f['name']:root/f['file'] for f in read(root/'schriften/schriften.json')['fonts'] if f.get('file')}
 family=read(root/'familien/edelstahl/steel-door-signs.json');designs=[];mapping=[];open_items=[]
 for key,(row,source),items in selected:
  if row['series']=='HSHO-KS':
   reason='Originalmotiv ist im Bestand nur als geschlossene schwarze Fläche vorhanden; keine erkennbare Hundezeichnung. Keine erfundene Rekonstruktion.'
   open_items.append({'source':row['key'],'reason':reason})
   for rr,ss in items:mapping.append({'sourceKey':rr['key'],'sourceId':ss['id'],'target':None,'reason':reason})
   continue
  d=make_design(row,source,family,fonts);designs.append(d)
  for rr,ss in items:mapping.append({'sourceKey':rr['key'],'sourceId':ss['id'],'target':d['id'],'series':d['katalog']['series'],'preferredSource':row['key'],'reason':'Vorlage' if rr['key']==row['key'] else 'Gleiches Motiv/Layout; Material-/Bogenkopie zusammengeführt'})
 # Three deliberately new, restrained typographic directions; the established HP
 # prefix and free numbers continue the existing hint-sign sheet.
 seed=next(d for d in designs if d['id']=='HP-V2A-12x4-D49')
 fresh=[(54,'Praxis · Willkommen',[('PRAXIS','Bellefair',[60,15,65,12]),('Herzlich willkommen','Raleway',[60,29,70,4.5])]),(55,'Behandlung · bitte warten',[('BEHANDLUNG','Montserrat Light',[60,14,78,7]),('Bitte kurz warten','Lora',[60,27,64,7])]),(56,'Zimmer 1 · Orientierung',[('1','Poiret One',[32,20,18,24]),('ZIMMER','Montserrat Light',[77,15,40,6]),('Bitte eintreten','Raleway',[77,26,43,5])])]
 for n,name,plan in fresh:
  d=copy.deepcopy(seed);d.update(id=f'HP-V2A-12x4-D{n}',designNo=n,name=name,source='ohne Vorlage',varianteVon=None,texts=[],motifs=[],mode='neu',deviations=[],fontSubstitutions=[],sourceExclusions=[],fontsOriginal=[],transfer={'mode':'neu','decided':'2026-11-01','by':'Design-Master Abschnitt 5; Nutzer wünscht auch Praxis und Zimmer 1'})
  for text,font,slot in plan:
   t={'text':text,'font':font,'color':'#000000'};layout.place_text(t,slot,fonts);d['texts'].append(t)
  # Final manual catalogue-editor adjustment, saved and reloaded on 2026-11-01:
  # PRAXIS geometric centre X = 60 mm (native editor uses glyph advance bounds).
  if n==54:d['texts'][0]['anchorMm'][0]=32.033492
  d['fonts']=list(dict.fromkeys(t['font'] for t in d['texts']));d['katalog']['key']=d['katalog']['series']+f'-D{n}';d['masterSheet']['key']=d['id'];designs.append(d)
 by_series=collections.defaultdict(list)
 for d in designs:by_series[d['katalog']['series']].append(d)
 for series,ds in by_series.items():
  out=root/'designs'/series
  if (out/'index.json').exists():
   keep={d['id'] for d in ds}
   for old in read(out/'index.json'):
    if old['key'] not in keep:remove_generated_pair(out/old['pfad'],out)
  for d in ds:
   dest=out/d['id'];write(dest/'design.json',d);(dest/'design.svg').write_text(svg(d),encoding='utf-8')
  write(out/'index.json',[{'key':d['id'],'pfad':d['id'],'name':d['name'],'quelle':d['varianteVon'],'plateMm':d['plateMm'],'themen':d['themes'],'groessen':d['sizes'],'texte':len(d['texts']),'motive':len(d['motifs']),'schriften':d['fonts'],'modus':d['mode']} for d in ds])
 write(root/ORDER/'zuordnung.json',mapping);write(root/ORDER/'offen.json',open_items);write(root/ORDER/'reihen.json',list(by_series));write(root/ORDER/'ersatzschriften.json',{'authorization':'Nutzer im Chat, 2026-11-01: Ja, passende feine Ersatzschriften wählen','scope':'Nur Hinweisschilder aus Issue 85','replacements':REPLACEMENTS,'arialChoices':['Raleway','Montserrat Light','Lato','Josefin Sans']})
 print(json.dumps({'sources':len(mapping),'masters':len(designs),'series':len(by_series),'open':open_items,'fonts':sorted(set(f for d in designs for f in d['fonts']))},ensure_ascii=False))
if __name__=='__main__':main()
