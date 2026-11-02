"""Issue 85 / 62: catalogue-only editable company sign transfer.
Sources: Design-Master (02.11.2026), real family sizes, user's fine-font request.
No live writes, approvals, source deletion, bitmap design or library additions.
"""
import argparse,copy,collections,re,math
from pathlib import Path
from fontTools.pens.areaPen import AreaPen
from fontTools.svgLib.path import parse_path
import vector_layout as v
class FillAreaPen(AreaPen):
 def _endPath(self):
  # SVG fills implicitly close open subpaths; strokes remain open in output.
  self._closePath()
ORDER='auftraege/2026-11-02-issue85-firmen'
TARGETS=['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit']
EXISTING={15:554,20:555,22:556,23:557,7:558}
REPLACE={'Times New Roman':'Libre Baskerville','Champagne & Limousines':'Montserrat Light','Comic Sans MS':'Comic Neue','Baskerville Old Face':'Libre Baskerville','Bauhaus 93':'Comfortaa','BOLICA':'Allura','Castellar':'Cinzel','Century751 BT':'Cormorant Garamond','Futura Md BT':'Josefin Sans','Abuget':'Allura','Georgia':'Lora','kindergarten':'Patrick Hand'}
NAMES={'Hans Christian Beisser':'Lena Morgenfeld','Dr. Gottschalk':'Dr. Winterfeld','Ulrich Hamacher':'Hansen Haustechnik','Klausen':'Fernblick','Max Müller':'Mara Linden','Dr. Müller':'Dr. Linden','Dr. Klose':'Dr. Faber','Horst Höfer':'Lars Heller','Karl Werner':'Nils Weber','Schmidt':'Morgenrot','Michael Braun':'Jonas Lindner','Petra Altmann':'Nora Sommer','Verena´s Haarkreation':'Lenis Haaratelier','Verena Seidensticker':'Leni Sommer','Bestattungen Krämer':'Bestattungen Abendruh','Ströhlein Immobilen':'Lindenhof Immobilien','Alexander Ströhlein':'Felix Linden','Alexander Seidler':'Jonas Berger','Joseph Stark':'Jonas Stark','Annika Seifert':'Lena Sommer','Marianne Nolting':'Mara Winter','Dr. Mustermann':'Dr. Mara Linden'}
def fictional(text):
 for old,new in NAMES.items():text=text.replace(old,new)
 text=text.replace('Öffnungzeiten','Öffnungszeiten').replace('Öffnungszieten','Öffnungszeiten')
 text=re.sub(r'[\w.\-]+@[\w.\-]+','kontakt@beispiel.example',text)
 text=re.sub(r'www\.[\w.\-]+','www.beispiel.example',text)
 text=text.replace('Gustav-Ruthe-Straße 12','Musterstraße 12').replace('49479 Ibbenbüren','12345 Musterstadt')
 text=re.sub(r'(?<![\w:])0\d[\d /\-]{5,}\d(?![\w:])','01234 / 567890',text)
 return text
def clean_texts(d):
 h=d['plate']['heightMm'];return [t for t in d['texts'] if not t.get('hint') and -.1<=t['box'][1]<h and t['text'].strip() and not re.fullmatch(r'1\d{8}',t['text'].strip())]
def choose_font(name,n):return ['Raleway','Montserrat Light','Josefin Sans','Lato'][n%4] if name=='Arial' else REPLACE.get(name,name)
def get_motifs(d,n):
 w,h=d['plate']['widthMm'],d['plate']['heightMm'];paths=[];extra=[];excluded=[]
 for i,m in enumerate(d['motifs']):
  if not m.get('fill') and not m.get('stroke'):continue
  b=v.box(m['d'])
  if not b:continue
  if m.get('rect') and b[2]*b[3]>.65*w*h:
   excluded.append({'sourceMotif':i+1,'reason':'Materialplatte / Schnittkontur, keine Gravur'});continue
  if m.get('stroke')=='#ff0000':
   excluded.append({'sourceMotif':i+1,'reason':'Schnitt-/Bohrmarkierung'});continue
  if n==6 and i in (7,8):
   extra.append({'text':'Montag' if i==7 else 'Sprechzeiten:','font':'Comfortaa','box':m['box'],'align':'left'});excluded.append({'sourceMotif':i+1,'reason':'Originalbeschriftung in echte Textebene zurückgeführt'});continue
  if n in (9,26) and i>=len(d['motifs'])-3:
   if i==len(d['motifs'])-3:extra.append({'text':'Tel. 01234 / 567890','font':'Raleway','box':v.union([mm['box'] for mm in d['motifs'][-3:]]),'align':'center'})
   excluded.append({'sourceMotif':i+1,'reason':'Telefonzeile in echte Textebene zurückgeführt, erfundene Beispieldaten'});continue
  p={'d':m['d'],'fill':'#000000' if m.get('fill') else None,'stroke':'#000000' if m.get('stroke') else None,'strokeMm':m.get('strokeMm',0),'evenodd':True,'sourceMotif':i+1}
  area=FillAreaPen(None);parse_path(p['d'],area)
  if p['fill'] and abs(area.value)>.15*w*h:
   p.update(fill=None,stroke='#000000',strokeMm=.3);excluded.append({'sourceMotif':i+1,'reason':'Große Füllfläche gemäß Master als Originalkontur, 0,3 mm'})
  paths.append(p)
 # Related components retain their compound contours. Bounding-box grouping keeps
 # original letter/line details together, avoiding hundreds of editor objects.
 groups=[]
 for p in paths:
  b=v.box(p['d']);hits=[]
  for j,g in enumerate(groups):
   a=v.union([v.box(q['d']) for q in g]);gap=max(a[0]-b[0]-b[2],b[0]-a[0]-a[2],a[1]-b[1]-b[3],b[1]-a[1]-a[3])
   if gap<2:hits.append(j)
  if not hits:groups.append([p]);continue
  groups[hits[0]].append(p)
  for j in reversed(hits[1:]):groups[hits[0]].extend(groups.pop(j))
 return [{'box':v.union([v.box(p['d']) for p in g]),'paths':g} for g in groups],extra,excluded
def scale_design(d,w,h):
 sw,sh=d['plateMm'];s=min(w/sw,h/sh);ox=(w-sw*s)/2;oy=(h-sh*s)/2;d=copy.deepcopy(d);d['plateMm']=[w,h];d['plate'].update(widthMm=w,heightMm=h)
 for t in d['texts']:
  t['anchorMm']=[t['anchorMm'][0]*s+ox,t['anchorMm'][1]*s+oy];t['sizePt']*=s;t['lineHeightMm']*=s;t['letterSpacingMm']*=s
 for m in d['motifs']:
  for p in m['paths']:p['d']=v.transform(p['d'],s,ox,oy);p['strokeMm']*=s
  m['box']=v.union([v.box(p['d']) for p in m['paths']])
 return d
def place_motif(m,slot):
 cx,cy,w,h=slot;x,y,mw,mh=m['box'];s=min(w/mw,h/mh);ox=cx-(x+mw/2)*s;oy=cy-(y+mh/2)*s
 for p in m['paths']:p['d']=v.transform(p['d'],s,ox,oy);p['strokeMm']*=s
 m['box']=v.union([v.box(p['d']) for p in m['paths']])
def assemble(row,source,fonts):
 w,h=source['plate']['widthMm'],source['plate']['heightMm'];n=row['designNo'];motifs,extra,removed=get_motifs(source,n)
 d={'plateMm':[w,h],'plate':{'widthMm':w,'heightMm':h},'form':'Quadrat' if abs(w-h)<.1 else 'Rechteck','texts':[],'motifs':motifs,'photos':[],'mode':'Referenz','source':row['sourcePath'],'varianteVon':source['id'],'deviations':['Originalanordnung und Motivkonturen erhalten; echte Texte und erfundene Kontakt-/Beispieldaten.'],'fontSubstitutions':[],'sourceExclusions':removed,'designNo':n,'themes':['firmenschilder'],'movable':True}
 for t in clean_texts(source)+extra:
  f=choose_font(t['font'],n);assert f in fonts,(row['key'],f)
  if f!=t['font']:d['fontSubstitutions'].append({'from':t['font'],'to':f,'reason':'Nutzer: feine Schriften; vorhandener Katalogschnitt / Ersatztabelle'})
  text=fictional(t['text'])
  if set(text)=={'_'}:
   x,y,tw,th=t['box'];cy=y+th/2;thickness=.36 if w!=h else .3
   p={'d':f'M{x} {cy-thickness/2}H{x+tw}V{cy+thickness/2}H{x}Z','fill':'#000000','stroke':None,'strokeMm':0,'evenodd':False};d['motifs'].append({'box':[x,cy-thickness/2,tw,thickness],'paths':[p]});continue
  if row['key']=='FS-V2A-D1':text='PRAXIS' if text=='Dein' else 'SONNENHOF'
  if n==4 and t['box'][0]<0:
   t=copy.deepcopy(t);t['box'][0]=(w-t['box'][2])/2;t['align']='center'
   d['deviations'].append('Beschädigte negative X-Position der zweizeiligen Fußzeile korrigiert; mittig unter dem Originalmotiv.')
  d['texts']+=v.fit_block(text,f,t['box'],fonts,t.get('align','center'))
 # Two source aspect ratios have no exact family. Preserve their original motifs
 # and build a genuine new composition on existing formats, never stretch.
 if row['key']=='FS-AV2A-D0':
  d.update(plateMm=[150,80],plate={'widthMm':150,'heightMm':80},form='Oval',texts=[])
  place_motif(d['motifs'][0],[43,40,43,58])
  for text,f,slot in [('YOGA','Raleway',[103,25,45,10]),('ZENTRUM','Raleway',[103,40,52,9]),('Lena Sommer','Montserrat Light',[103,56,42,5])]:d['texts'].append(v.place_text(text,f,slot,fonts))
  d['deviations'].append('Original 230×120 ohne passende Rechteckreihe: neue ovale Komposition, Original-Traumfänger links als Gegengewicht.')
 if row['key']=='FS-S-D0':
  d.update(plateMm=[180,120],plate={'widthMm':180,'heightMm':120},form='Rechteck',texts=[])
  combined={'paths':[p for m in d['motifs'] for p in m['paths']]};combined['box']=v.union([v.box(p['d']) for p in combined['paths']]);place_motif(combined,[139,59,40,61]);d['motifs']=[combined]
  for text,f,slot in [('SCHLÜSSELDIENST','Lora',[90,18,150,12]),('Mara Winter','Lora',[63,53,94,11]),('Tel. 01234 / 567890','Raleway',[65,77,95,7]),('kontakt@beispiel.example','Raleway',[65,91,104,6]),('www.beispiel.example','Raleway',[65,104,98,6])]:d['texts'].append(v.place_text(text,f,slot,fonts))
  d['deviations'].append('Originalhochformat ohne passende Familie: eigenständiges Querlayout mit beiden Originalschlüsseln rechts.')
 d['fonts']=list(dict.fromkeys(t['font'] for t in d['texts']));assert 1<=len(d['fonts'])<=3
 if len(d['texts'])+len(d['motifs'])>20:
  ps=[p for m in d['motifs'] for p in m['paths']];d['motifs']=[{'box':v.union([v.box(p['d']) for p in ps]),'paths':ps}];d['deviations'].append('Zusammengehörige Originalgrafik als eine bearbeitbare Motivgruppe.')
 d['name']=' · '.join(t['text'] for t in d['texts'][:2]);return d
def finalize(d,prefix,family,fonts):
 sw,sh=d['plateMm'];group={'Quadrat':'QU','Rechteck':'RE','Oval':'OV','Rund':'R'}[d['form']]
 sizes=[s for s in family['sizes'] if s['groupKey']==group and abs((s['widthMm']/s['heightMm'])/(sw/sh)-1)<.01];sizes.sort(key=lambda s:s['widthMm']*s['heightMm'])
 # The operator already applies actual 3-mm capitals to company signs (D554).
 # Select the smallest legible existing size; do not invent a new plate.
 caps=[v.bounds('H',fonts[t['font']],t['sizePt']*v.PT)[3]-v.bounds('H',fonts[t['font']],t['sizePt']*v.PT)[1] for t in d['texts']]
 eligible=[s for s in sizes if min(caps)*min(s['widthMm']/sw,s['heightMm']/sh)>=2.99 and (not d['motifs'] or s['widthMm']*s['heightMm']>=5400)]
 if not eligible:raise ValueError(f'Kein lesbares Format: {prefix} D{d["designNo"]}, cap={min(caps):.2f}')
 target=eligible[0];w,h=target['widthMm'],target['heightMm'];d=scale_design(d,w,h)
 ident=f'{prefix}-{w/10:g}x{h/10:g}-D{d["designNo"]}';series=f'firmen-{prefix.lower()}-{w:g}x{h:g}'+('-oval' if d['form']=='Oval' else '-rund' if d['form']=='Rund' else '')
 d.update(id=ident,material='Edelstahl',process='Gravur',sizes=[s['key'] for s in eligible],ziele=[{'familie':f,'freigabe':None} for f in TARGETS],katalog={'key':series+f'-D{d["designNo"]}','series':series,'themen':['firmenschilder'],'zielgruppe':'Beruf','unterkategorie':'Firmen- und Praxisschilder'},masterSheet={'base':ident.rsplit('-D',1)[0],'key':ident,'familySize':target['key'],'plateMm':[w,h]},transfer={'from':d.get('varianteVon'),'scale':min(w/sw,h/sh),'by':'Issue 85 / 62; Nutzer 02.11.2026, feine Schriften','decided':'2026-11-02'})
 d['plate']['source']=target['key'];d['hinweisGroessen']='Kleinste gültige Größe mit mindestens 3 mm tatsächlicher Versalhöhe; filigrane Originalmotive nicht unter 54 cm².'
 return d
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);a=ap.parse_args();root=a.katalog;src=root/'designs/bestand/firmenschilder';rows=v.read(src/'designs.json');fonts={f['name']:root/f['file'] for f in v.read(root/'schriften/schriften.json')['fonts'] if f.get('file')};family=v.read(root/'familien/edelstahl/steel-door-signs.json')
 existing=[]
 for p in (root/'designs').glob('*/index.json'):
  for r in v.read(p):
   if 'FS-' in str(r.get('quelle','')):existing.append({'id':r['key'],'series':p.parent.name,'source':r['quelle']})
 groups=collections.defaultdict(list);mapping=[]
 for r in rows:
  n=r['designNo'];d=v.read(src/r['path']/'design.json');r=dict(r,sourcePath=(src/r['path']/'design.json').relative_to(root).as_posix())
  if n in EXISTING:
   refs=[e for e in existing if e['id'].endswith('-D'+str(EXISTING[n]))];assert refs
   mapping.append({'source':r['key'],'status':'bereits vorhanden','targets':refs});continue
  key=(n,round(d['plate']['widthMm']/d['plate']['heightMm'],3))
  if n==0 or r['key']=='FS-V2A-D1':key=(r['key'],)
  groups[key].append((r,d))
 designs=[]
 for items in groups.values():
  items.sort(key=lambda p:['FS-V2A','FS-A','FS-S','FS-AV2A'].index(p[0]['series']));r,s=items[0]
  d=finalize(assemble(r,s,fonts),r['series'],family,fonts);designs.append(d)
  for rr,ss in items:mapping.append({'source':rr['key'],'status':'übernommen' if rr==r else 'Materialdublette','target':d['id'],'series':d['katalog']['series'],'preferredSource':r['key']})
 fresh=[(27,'Praxis Linden · Rund','Rund',[85,85],[('PRAXIS','Montserrat Light',[42.5,22,43,7]),('Dr. Mara Linden','Bellefair',[42.5,42,67,10]),('Allgemeinmedizin','Raleway',[42.5,60,52,5])]),(28,'Physiotherapie · Oval','Oval',[150,80],[('PHYSIOTHERAPIE','Montserrat Light',[75,23,105,9]),('Lena Winter','Bellefair',[75,42,93,15]),('Termine nach Vereinbarung','Raleway',[75,61,100,5])]),(29,'Kanzlei Morgenrot · Rechteck','Rechteck',[120,80],[('KANZLEI','Montserrat Light',[60,19,63,8]),('Morgenrot','Cormorant Garamond',[60,40,98,20]),('Rechtsberatung · Mediation','Raleway',[60,62,100,6])])]
 for n,name,form,plate,plan in fresh:
  d={'name':name,'designNo':n,'form':form,'plateMm':plate,'plate':{'widthMm':plate[0],'heightMm':plate[1]},'texts':[v.place_text(t,f,s,fonts) for t,f,s in plan],'motifs':[],'photos':[],'fonts':list(dict.fromkeys(p[1] for p in plan)),'mode':'neu','source':'ohne Vorlage','varianteVon':None,'themes':['firmenschilder'],'movable':True,'deviations':['Neuer typografischer Entwurf mit erfundenen Beispieldaten.'],'fontSubstitutions':[],'sourceExclusions':[]};designs.append(finalize(d,'FS-A',family,fonts))
 by_series=collections.defaultdict(list)
 for d in designs:by_series[d['katalog']['series']].append(d)
 # No overwrite of an unrelated canonical design.
 own=set(by_series);ids={d['id'] for d in designs};assert len(ids)==len(designs)
 for p in (root/'designs').glob('*/*/design.json'):
  if p.parent.parent.name not in own:assert v.read(p).get('id') not in ids,p
 for series,ds in by_series.items():
  for d in ds:
   dest=root/'designs'/series/d['id'];v.write(dest/'design.json',d);(dest/'design.svg').write_text(v.svg(d),encoding='utf-8')
  v.write(root/'designs'/series/'index.json',[{'key':d['id'],'pfad':d['id'],'name':d['name'],'quelle':d['source'],'plateMm':d['plateMm'],'themen':d['themes'],'groessen':d['sizes'],'texte':len(d['texts']),'motive':len(d['motifs']),'schriften':d['fonts'],'modus':d['mode']} for d in ds])
 v.write(root/ORDER/'zuordnung.json',mapping);v.write(root/ORDER/'reihen.json',list(by_series));v.write(root/ORDER/'ersatzschriften.json',{'authorization':'Nutzer: feine Schriften; Ersatzfreigabe im laufenden Auftrag. Katalog-Ersatztabelle bleibt global unverändert.','replacements':REPLACE,'arialChoices':['Raleway','Montserrat Light','Josefin Sans','Lato']})
 print({'sources':len(rows),'masters':len(designs),'series':len(by_series),'alreadyMapped':sum(r['status']=='bereits vorhanden' for r in mapping),'fonts':sorted({f for d in designs for f in d['fonts']})})
if __name__=='__main__':main()
