"""The explicitly authorized 59 stock layouts; scoped fonts, no release or import."""
import argparse,importlib.util,json,re,shutil,subprocess,tempfile,xml.etree.ElementTree as ET
from pathlib import Path
from fontTools.svgLib.path import parse_path
from fontTools.pens.svgPathPen import SVGPathPen
p=argparse.ArgumentParser();p.add_argument('--katalog',required=True);a=p.parse_args();root=Path(a.katalog).resolve();report=root/'auftraege/2026-11-01-issue85-pferde'
brief=json.loads((report/'bestand-59-auftrag.json').read_text(encoding='utf-8'));assert len(brief['sources'])==59 and len(brief['leaveOpen'])==6
spec=importlib.util.spec_from_file_location('stock',Path(__file__).with_name('read-bestand-designs.py'));stock=importlib.util.module_from_spec(spec);spec.loader.exec_module(stock)
files=stock.font_files(root);family=json.loads((root/'familien/edelstahl/steel-door-signs.json').read_text(encoding='utf-8'))
fallback=next((root/'designs/bestand/boxenschilder').rglob('BSUV-AD-D28/foto-1.jpg'));made=[]
for i,cfg in enumerate(brief['sources']):
 key=cfg['key'];assert key not in brief['leaveOpen'];src=root/cfg['source'];meta=json.loads((src/'design.json').read_text(encoding='utf-8'));oval=key.startswith('BS-V2A');W,H=([150,80] if oval else [80,53.3]);series='boxenschilder-gravur-oval-150x80' if oval else 'boxenschilder-gravur-80x53'
 prefix=meta['id'].rsplit('-D',1)[0].rsplit('-',1)[0]+('-15x8' if oval else '-8x5');did=prefix+'-D'+str(meta['katalog']['designNo']);dest=root/'designs'/series;dest.mkdir(exist_ok=True);folder=dest/did;folder.mkdir(exist_ok=True)
 # Existing original IDs may be promoted from stock; any other master is protected.
 for existing in (root/'designs').glob('*/'+did+'/design.json'):
  if existing.parent!=folder:raise RuntimeError('Kennung belegt: '+str(existing))
 removed=[];preserved=[];photomasks=[];technical=[];text_outlines=[]
 with tempfile.TemporaryDirectory() as tmp:
  clean=Path(tmp)/key;clean.mkdir();tree=ET.parse(src/'design.svg');svg=tree.getroot();sw,sh=meta['plate']['widthMm'],meta['plate']['heightMm'];cleanmeta=dict(meta)
  if oval:
   dx=75 if sw==75 else 10
   for el in svg.iter():
    if el.tag.endswith('path') and el.get('d'):el.set('d',stock.transform_path(el.get('d'),1,dx,0))
   sw,sh=150,80
  if key.startswith('BSS'):sw+=20;sh+=20 # keep the source contour as a motif, not as a new physical blank
  cleanmeta['plate']={'widthMm':sw,'heightMm':sh};(clean/'design.json').write_text(json.dumps(cleanmeta,ensure_ascii=False),encoding='utf-8')
  for parent in list(svg.iter()):
   for el in list(parent):
    tag=el.tag.split('}')[-1];eid=el.get('id') or ''
    if tag in ['text','image','defs'] or 'foto' in (el.get('class') or '') or 'hinweis' in (el.get('class') or ''):
     parent.remove(el);continue
    if tag!='path' or not eid.startswith('motiv'):continue
    fill=el.get('fill');stroke=el.get('stroke');raw=el.get('d','');b=stock.path_box(raw)
    if key=='BSUV-A-D11' and eid=='motiv-7':text_outlines.append(eid);parent.remove(el);continue # old name in curves, replaced with editable authorized type
    if stroke=='#ff0000' and fill in [None,'none']:technical.append(eid);parent.remove(el);continue
    if fill in [None,'none'] and stroke in [None,'none']:parent.remove(el);continue
    # The original simple circle is a photo mask, not an engraving ring.
    if cfg['photoCount'] and len(raw)<180 and fill in [None,'none'] and re.search('[Aa]',raw):photomasks.append(eid);parent.remove(el);continue
    background=b and not key.startswith('BSS') and ((fill not in [None,'none'] and b[2]>=sw*.9 and b[3]>=sh*.9 and len(raw)<300) or ('UV' in key and fill not in [None,'none'] and b[2]>=sw*.65 and b[3]>=sh*.12 and len(raw)<300) or (stroke in ['#001600','#000f00'] and b[2]>=sw*.97 and b[3]>=sh*.97) or (key=='BSUV-A-D5' and b[2]>=sw*.97 and b[3]>=sh*.97))
    if background:removed.append(eid);parent.remove(el);continue
    if re.search('[Aa]',raw):pen=SVGPathPen(None);parse_path(raw,pen);el.set('d',pen.getCommands())
    if fill not in [None,'none']:el.set('fill','#000000')
    if stroke not in [None,'none']:el.set('stroke','#000000')
    preserved.append(eid)
  # Already classified every plate path above. Padding disables the old reader's
  # broad full-canvas deletion, which would otherwise also remove valid contours.
  cleanmeta['plate']={'widthMm':sw+4,'heightMm':sh+4};(clean/'design.json').write_text(json.dumps(cleanmeta,ensure_ascii=False),encoding='utf-8')
  tree.write(clean/'design.svg',encoding='utf-8');stock.OUT=dest;d=stock.convert(clean,[W,H],prefix,cfg['fonts'],files)
 # A frame's bounding rectangle encloses every ornament. Keep the frame separate
 # so a crown/brand inside it can be positioned independently of the border.
 allpaths=[dict(p,box=stock.path_box(p['d'])) for m in d['motifs'] for p in m['paths']];borders=[];art=[]
 for q in allpaths:
  b=q['box'];(borders if not key.startswith('BSS') and b[2]>W*.7 and b[3]>H*.6 else art).append(q)
 d['motifs']=[{'box':q['box'],'paths':[q]} for q in borders]+stock.rpd.cluster(art,.4)
 for m in d['motifs']:
  for q in m['paths']:q.pop('box',None)
 roles=[];texts=[]
 def field(role,text,font=None):
  roles.append(role);texts.append({'text':text,'font':font or cfg['bodyFont'],'sizePt':18 if role=='name' else 10,'align':'center','anchorMm':[W/2,10+len(texts)*5],'lineHeightMm':3.6,'color':'#000000'})
 field('name',cfg['name'],cfg['nameFont']);field('date','geb. '+cfg['date'])
 if cfg['pedigree']:
  field('father','von: '+cfg['father']);field('mother','aus der: '+cfg['mother'])
  if key in ['BS-S-D3','BSUV-A-D22']:
   field('grandfather','VV: '+['Sternenfels','Goldkristall'][i%2]);field('grandmother','MV: '+['Elfenrose','Silberfee'][i%2])
 original=' '.join(t['text'].replace('\n',' ') for t in meta['texts'] if not t.get('hint'))
 if any(b in original for b in ['Trakehner','Quarter Horse','Shetlandpony','Holsteiner']):field('breed',next(b for b in ['Trakehner','Quarter Horse','Shetlandpony','Holsteiner'] if b in original))
 if 'Westfalenmeister' in original:field('title','Westfalenmeister 2024');field('discipline','Senior Reining')
 if 'All-Around Champion' in original:field('title','All-Around Champion')
 if 'Hufschlag' in original:field('motto','Dein Hufschlag\nist mein Herzschlag',cfg['nameFont'])
 feed=[]
 for t in meta['texts']:
  text=t['text'].replace('\n',' ')
  if any(w in text.lower() for w in ['he u','heu','hafer','kraftfutter','möhr','müsli']) and not any(w in text.lower() for w in ['besitzer','telefon']):feed.append(text)
 if feed:field('feed','\n'.join(dict.fromkeys(feed)))
 if 'Bitte' in original:
  warning='Bitte keine Leckerlis · Kolikgefahr' if 'Leckerlis' in original else 'Bitte nicht aus der Hand füttern!';field('warning',warning)
 field('owner','Besitz: '+cfg['owner']);field('phone','030 23125 '+str(cfg['phoneBase']).zfill(3))
 if cfg['vetField']:field('vet','Tierarzt: '+cfg['vet']);field('vet-phone','030 23125 '+str(cfg['phoneBase']+1).zfill(3))
 if cfg['farrierField']:field('farrier','Hufschmied: '+cfg['farrier']);field('farrier-phone','030 23125 '+str(cfg['phoneBase']+2).zfill(3))
 d['texts']=texts;d['fonts']=sorted({t['font'] for t in texts});assert len(d['fonts'])<=3 and all(f in files for f in d['fonts']);d['photos']=[]
 ownphotos=[src/f for f in meta.get('photoFiles',[]) if (src/f).is_file()]
 # Screw-head images from the old material mockup are mounting, never engraving/photo fields.
 if key=='BSUV-A-D5':technical+=['Muster-Schrauben foto-1.png bis foto-4.png'];ownphotos=[]
 for n in range(cfg['photoCount']):
  image=ownphotos[n%len(ownphotos)] if ownphotos else (fallback if i%2==0 else next((root/'designs/bestand/boxenschilder').rglob('BSUV-A-D26/foto-2.jpg')))
  if key=='BSUV-A-D27' and n==0:image=fallback # original is a flat peach background, not a horse photograph
  name=f'musterfoto-{n+1}'+image.suffix.lower();shutil.copyfile(image,folder/name)
  d['photos'].append({'box':[2+n*10,17,26,32],'file':name,'shape':'circle' if cfg['photoCount']>1 or key in ['BS-S-D19','BSUV-A-D5','BSUV-A-D10','BSUV-A-D17','BSUV-A-D18'] else 'rect','placeholder':True,'engrave':False,'source':image.relative_to(root).as_posix()})
 d.update(id=did,name=cfg['name']+' · Bestand '+key,themes=['pferdeschilder'],source=cfg['source'],plateMm=[W,H],form='Oval' if oval else 'Rechteck',process='Gravur',fontsOriginal=meta['fonts'],freigabe=None,ziele=[{'familie':f,'freigabe':None} for f in ['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit']],katalog={'key':did,'series':series},roles=roles)
 d['sizes']=[s['key'] for s in family['sizes'] if (s['groupKey']=='OV' and abs(s['widthMm']/s['heightMm']/1.875-1)<.01 if oval else s['groupKey']=='RE' and abs(s['widthMm']/s['heightMm']/1.5-1)<.01)]
 if did!=meta['id']:d['varianteVon']=meta['id']
 d['review']={'mode':'Referenz','fontAuthorization':'Nutzerchat 01.11.2026: passende freigegebene Ersatzschriften für diese 59 Vorlagen','fontReplacements':{f:v for f,v in cfg['fonts'].items() if f!=v},'preservedSourcePaths':preserved,'sourceNameOutlinesReplacedByEditableText':text_outlines,'removedPlatePanels':removed,'photoMasksConverted':photomasks,'technicalGuidesRemoved':technical,'sourceMotifPaths':len(preserved),'sample':cfg,'sourceFormNote':'Sonderkontur als Motiv auf vorhandenem Rechteck; keine neue Rohlingform' if key.startswith('BSS') else 'Vorlage als starke Referenz; neues gefülltes Layout','previewPhotos':'Unveränderte Fotos aus dem Bestand, als austauschbare Muster im Fotofeld; keine Kundenfotos/Produktanlage.'}
 count=sum(len(m['paths']) for m in d['motifs']);assert count==len(preserved),(key,count,len(preserved))
 if key=='BS-V2A-D15':
  # Four hoofprints were one widely spaced compound path. Keep all eight
  # contours/holes, expose the four intact prints so each can be enlarged.
  parts=[]
  for m in d['motifs']:
   for q in m['paths']:
    for segment in re.split(r'(?=M\s)',q['d']):
     if segment.strip():parts.append(dict(q,d=segment,box=stock.path_box(segment)))
  d['motifs']=stock.rpd.cluster(parts,.1);assert len(d['motifs'])==4 and len(parts)==8
  for m in d['motifs']:
   for q in m['paths']:q.pop('box',None)
  d['review']['separatedHoofprints']={'sourcePaths':1,'sourceContours':8,'outputContours':8,'intactPrints':4}
 (folder/'design.svg').write_text(stock.rpd.design_svg(d),encoding='utf-8');(folder/'design.json').write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8');shutil.copyfile(src/'preview.png',folder/'original.png');made.append({'id':did,'key':key,'series':series,'fontReplacements':d['review']['fontReplacements'],'fonts':d['fonts'],'texts':len(texts),'photos':len(d['photos']),'sourcePaths':count});print(key,'->',did,'Texte',len(texts),'Motive',len(d['motifs']),'Fotos',len(d['photos']),flush=True)
for series in {m['series'] for m in made}:
 folder=root/'designs'/series;old=json.loads((folder/'index.json').read_text(encoding='utf-8'));newids={m['id'] for m in made};old=[x for x in old if x['key'] not in newids]
 for m in made:
  if m['series']==series:
   d=json.loads((folder/m['id']/'design.json').read_text(encoding='utf-8'));old.append({'key':m['id'],'name':d['name'],'pfad':m['id'],'quelle':m['key'],'plateMm':d['plateMm'],'groessen':d['sizes'],'themen':['pferdeschilder'],'schriften':d['fonts'],'mode':'Referenz','freigabe':None,'series':series})
 (folder/'index.json').write_text(json.dumps(old,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
(report/'schriftwechsel-59.json').write_text(json.dumps(made,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
