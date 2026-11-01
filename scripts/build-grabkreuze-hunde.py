"""Issue 76: provisional native dog masters and review-only product families."""
import copy, importlib.util, json, re, shutil
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
CAT=ROOT.parent/'grabkreuze-hunde-katalog'
OUT=CAT/'designs/grabkreuze-hunde-11x20'
PACK=CAT/'auftraege/2026-11-01-grabkreuze-hunde'
spec=importlib.util.spec_from_file_location('rbd',HERE/'read-bestand-designs.py')
rbd=importlib.util.module_from_spec(spec); spec.loader.exec_module(rbd)
rpd=rbd.rpd
rbd.OUT=OUT
fonts=rbd.font_files(CAT)
contours=json.loads((CAT/'schneidvorlagen/kreuze/kreuze.json').read_text(encoding='utf-8'))
sources={}
for file in (CAT/'designs/bestand/kreuze').rglob('design.json'):
    d=json.loads(file.read_text(encoding='utf-8'))
    if d['id'].startswith('KZ-A-11x20-') and d['texts']:
        sources[d['katalog']['designNo']]=file.parent
OUT.mkdir(parents=True,exist_ok=True); PACK.mkdir(parents=True,exist_ok=True)
def write(p,d):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def original(n):
    return rbd.convert(sources[n],[110,200],'KZ-A-11x20',{'Champagne & Limousines':'Montserrat Light'},fonts)
def cap_factor(name):
    f=TTFont(fonts[name]); g=f.getGlyphSet(); p=BoundsPen(g); g[f.getBestCmap()[ord('H')]].draw(p)
    v=(p.bounds[3]-p.bounds[1])/f['head'].unitsPerEm; f.close(); return v
def text(value,font,cap,x,y,maxwidth):
    size=cap/cap_factor(font)
    width=max(rbd.text_width(fonts[font],line,size) for line in value.splitlines())
    if width>maxwidth: size*=maxwidth/width
    if size*cap_factor(font)<3-1e-6: raise ValueError(f'Text below 3 mm: {value}')
    return dict(text=value,font=font,sizePt=size/rpd.PT,color='#000000',align='center',anchorMm=[x,y],lineHeightMm=size*1.2,letterSpacingMm=0)
def motif(source,idx,x,y,w,h):
    m=copy.deepcopy(source['motifs'][idx]); bx,by,bw,bh=m['box']; s=min(w/bw,h/bh); ox=x+(w-bw*s)/2-bx*s; oy=y+(h-bh*s)/2-by*s
    for p in m['paths']:
        p['d']=rbd.transform_path(p['d'],s,ox,oy)
        if p['fill'] not in (None,'none'): p['fill']='#000000'
        if p['stroke'] not in (None,'none'): p['stroke']='#000000'
        p['strokeMm']*=s
    m['box']=[bx*s+ox,by*s+oy,bw*s,bh*s]
    return m
base={n:original(n) for n in [0,46,53,55]}
masters=[]
for n in [0,53,55]:
    d=copy.deepcopy(base[n]); d['reviewMode']='Referenz'
    d['reviewNotes']=['Originalelemente unverzerrt; auf finaler 110×200-Kontur um 0,75 mm vertikal versetzt.'] + ([] if n!=0 else ['Bestätigter Schriftersatz Champagne & Limousines → Montserrat Light.'])
    masters.append(d)
# Missing-font originals remain in the report; no silent replacements.
new=[
 ('Luna','Allura','Cinzel','2011 – 2025','Für immer\nin unserem\nHerzen',0,0),
 ('Sam','Rochester','Lora','2009 – 2024','Deine Spuren\nbleiben\nbei uns',46,0),
 ('Nala','Great Vibes','Bellefair','2013 – 2026','Geliebt.\nVermisst.\nUnvergessen.',55,0),
 ('Milo','Parisienne','Cinzel','2012 – 2025','Ein Leben\nan unserer\nSeite',0,0),
 ('Fiete','Dancing Script','Lora','2010 – 2024','Du fehlst\njeden Tag',46,1),
 ('Emma','Allura','Bellefair','2014 – 2026','Kleine Pfoten,\ngroße Liebe',53,0),
 ('Ben','Rochester','Cinzel','2008 – 2023','Danke für\nall die\nguten Jahre',55,0),
 ('Lotte','Parisienne','Lora','2011 – 2025','Dein Platz\nbleibt\nin uns',46,0),
 ('Finn','Great Vibes','Bellefair','2015 – 2026','Im Herzen\ngehst du\nmit uns',0,0),
 ('Maja','Dancing Script','Cinzel','2009 – 2024','Unsere Liebe\nbleibt',55,0),
 ('Oskar','Allura','Lora','2012 – 2026','Du warst\nunser Glück',46,1),
 ('Kalle','Rochester','Bellefair','2010 – 2025','So viele\nschöne Wege\nmit dir',53,1),
 ('Amy','Parisienne','Cinzel','2014 – 2026','Für immer\nunser\nFreund',0,0),
 ('Theo','Great Vibes','Lora','2008 – 2024','Ein treuer\nFreund\nfür immer',55,0),
 ('Josie','Dancing Script','Bellefair','2013 – 2025','Du bleibst\nein Teil\nvon uns',46,0),
 ('Bruno','Rochester','Cinzel','2011 – 2026','Voller Liebe\nerinnern\nwir uns',53,0),
 ('Bella','Allura','Lora','2010 – 2025','In Liebe\nverbunden',55,0),
]
for i,(name,nf,bf,years,quote,src,idx) in enumerate(new):
    no=100+i
    if any(CAT.glob(f'designs/*/*KZ-A-11x20-D{no}*/design.json')) and not (OUT/f'KZ-A-11x20-D{no}').exists(): raise ValueError('ID collision')
    d=dict(id=f'KZ-A-11x20-D{no}',name=name,plate={'widthMm':110,'heightMm':200},plateMm=[110,200],photos=[],warnings=[],movable=True,process='Gravur',material='Acryl',form='Kreuz',texts=[],motifs=[])
    d['texts']=[text(name,nf,22,55,62,86),text(years,bf,3.1,55,82,33),text(quote,bf,3.2,55,101,33)]
    if i%3==0:
        d['motifs']=[motif(base[src],min(idx,len(base[src]['motifs'])-1),43,7,24,25)]
    elif i%3==1:
        d['motifs']=[motif(base[src],min(idx,len(base[src]['motifs'])-1),43,7,24,25),motif(base[46],0,7,45,12,15)]
        d['texts'][0]=text(name,nf,20,62,62,64)
    else:
        d['motifs']=[motif(base[src],min(idx,len(base[src]['motifs'])-1),43,7,24,25)]
        d['texts'].append(text('In Liebe',bf,3.2,55,137,32))
    d['reviewMode']='neu'
    d['source']='Ohne Gesamtvorlage; neue Komposition mit vorhandenem Originalmotiv'
    d['reviewNotes']=[f'Motivpfade unverändert proportional aus {sources[src].relative_to(CAT).as_posix()}; kein Ersatz einer gesperrten Vorlagenschrift.']
    masters.append(d)

family_ids=[f'grabkreuz-acryl-5mm-{c}' for c in ['schwarz','anthrazit']]
sizes=[f'KZ-A-{s}' for s in ['11x20','14x25','22x40']]
own_motifs=[]
for number,pathdata,label in [
    (109,'M55 30 C52 27 43 22 43 16 C43 9 51 8 55 14 C59 8 67 9 67 16 C67 22 58 27 55 30 Z','Herz der Erinnerung'),
    (116,'M45 28 C46 24 48 21 51 21 C54 21 57 25 56 28 C55 31 52 28 50 28 C48 28 46 31 45 28 Z M45 20 C41 20 41 14 44 14 C47 14 48 20 45 20 Z M50 17 C47 17 46 10 49 10 C53 10 53 17 50 17 Z M56 18 C52 17 54 10 57 11 C61 12 60 19 56 18 Z M61 22 C58 21 61 16 64 17 C67 19 64 24 61 22 Z','Eine Pfote bleibt')]:
    mid=f'mika-grabkreuz-hunde-{number}-20261101'
    motif_data={'box':rbd.path_box(pathdata),'paths':[{'d':pathdata,'fill':'#000000' if number==116 else None,'stroke':None if number==116 else '#000000','strokeMm':0 if number==116 else .8,'evenodd':True,'opacity':1}]}
    master=next(d for d in masters if d['id'].endswith(f'-D{number}'))
    master['motifs']=[motif_data]
    master['ownMotifId']=mid
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 7 30 28"><path d="{pathdata}" fill="'+('#000000' if number==116 else 'none')+'" stroke="'+('none' if number==116 else '#000000')+'" stroke-width="0.8"/></svg>'
    folder=CAT/'motive-eigene'/mid;folder.mkdir(parents=True,exist_ok=True);(folder/'motiv.svg').write_text(svg,encoding='utf-8')
    own_motifs.append({'id':mid,'name':label,'file':f'motive-eigene/{mid}/motiv.svg','source':'Originalvektor Astra Mika, 01.11.2026','customerLibrary':False})
index_file=CAT/'motive-eigene/motive-eigene.json'
own_index=json.loads(index_file.read_text(encoding='utf-8'))
other=[m for m in own_index['motifs'] if m.get('id') not in {x['id'] for x in own_motifs}]
own_index['motifs']=other+own_motifs;own_index['count']=len(own_index['motifs']);write(index_file,own_index)
for d in masters:
    d['form']='Originalkontur KZ'
    d['masterSheet']={'familySize':'KZ-A-11x20','plateMm':[110,200],'source':'kontur-11x20.svg'}
    d.update(themes=['hundegedenktafeln'],freigabe=None,ziele=[{'familie':fid,'freigabe':None} for fid in family_ids],sizes=sizes,formatreihe='Grabkreuze Acryl 11x20/14x25/22x40')
    d['fonts']=sorted({t['font'] for t in d['texts']})
    for t in d['texts']: t['color']='#000000'
    for m in d['motifs']:
        for p in m['paths']:
            if p['fill'] not in (None,'none'): p['fill']='#000000'
            if p['stroke'] not in (None,'none'): p['stroke']='#000000'
    d['katalog']={'key':d['id'],'series':OUT.name,'zielgruppe':'Tiere','unterkategorie':'Hund'}
    folder=OUT/d['id']; folder.mkdir(exist_ok=True)
    write(folder/'design.json',d)
    svg=rpd.design_svg(d)
    svg=re.sub(r'<rect id="platte"[^>]*/>',f'<path id="platte" d="{contours["11x20"]["outline"]}" fill="none" stroke="#FF0000" stroke-width="0.0762"/>',svg)
    (folder/'design.svg').write_text(svg,encoding='utf-8')
    if d.get('designNo') in [0,53,55]: shutil.copyfile(sources[d['designNo']]/'preview.png',folder/'original.png')
write(OUT/'index.json',{'name':'Grabkreuz Acryl – Hunde','designs':[{'id':d['id'],'path':d['id'],'name':d['name']} for d in masters]})
for color,fid in zip(['schwarz','anthrazit'],family_ids):
    family={'schema':'gravuru-product-family/v2','id':fid,'name':'Grabkreuz Acryl 5 mm – '+color,
      'material':{'kind':'acrylic','label':'Acrylglas '+color,'thicknessMm':5,'processingProfileId':'acrylic-engraving','variant':color,'engravingSide':'back'},
      'groundInsertion':{'depthMm':50,'clearanceMm':5},'designArea':{'marginMm':0,'keepoutMm':0},'groups':[{'key':'KZ','name':'Grabkreuz','shape':'contour','cornerRadiusMm':0}],
      'mountingRules':[],'withoutMounting':True,'sizes':[],
      'fonts':sorted({f for d in masters for f in d['fonts']}),'quantityTiers':[{'minQuantity':2,'percentOff':6},{'minQuantity':3,'percentOff':10}],
      'briefingNotes':'PRÜFSTAND, NICHT IMPORTIEREN: unten 50 mm Erdteil, weitere 5 mm Gestaltungsabstand. Native Erdteilsperre und Vorschau im zugehörigen Code-Entwurf; gemeinsame Abnahme noch offen. Alle Designs ohne Fotofeld, ohne Zubehör. Motivaufpreis 169 ct im Produktplan; keine Freigabe.',
      'source':{'repository':'Chris83638w/gravuru-katalog.','commit':'48abf763','path':'schneidvorlagen/kreuze/kreuze.json','note':'Preise: gravuru-2027/docs/handoffs/design-start-mika/kreuze/AUFTRAG.md, Issue 76. Finale symmetrische Konturen laut Kommentar 6560468022. Nur lokaler Prüfstand bis nativer Erdteil-Unterstützung.'}}
    for key,price in zip(['11x20','14x25','22x40'],[1499,2399,2999]):
        c=contours[key]; family['sizes'].append({'key':'KZ-A-'+key,'groupKey':'KZ','label':key.replace('x',' × ')+' cm','widthMm':c['widthMm'],'heightMm':c['heightMm'],'outlinePath':c['outline'],'holesMm':[],'baseCents':price,'mounting':[]})
    write(CAT/f'familien/acryl/{fid}.json',family)
write(PACK/'produktplan.json',{'name':'Grabkreuz Acryl – Hunde','status':'PRUEFSTAND_NICHT_IMPORTIEREN','shopStatus':'DRAFT','shopWritePerformed':False,'colors':['schwarz','anthrazit'],'families':family_ids,'groundInsertionMm':50,'groundDesignClearanceMm':5,'extraMotifCents':169,'photoEnabled':False,'accessories':[],'freigabe':None,'designCount':len(masters),'open':['Vorlagenschriften Clarissa, Playlist, Standlist','Sichtbare Browser-/Bedienprüfung der nativen Erdteilsperre nachholen','Konfi-Abnahme durch Claude und Freigabe durch Chris'],'source':'gravuru-2027 #76 / AUFTRAG.md'})
print(f'{len(masters)} vorläufige Master und 2 Prüffamilien geschrieben.')
