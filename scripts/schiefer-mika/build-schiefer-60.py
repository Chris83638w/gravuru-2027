from pathlib import Path
import os
import importlib.util,json,shutil,subprocess,xml.etree.ElementTree as ET,copy,re
import openpyxl
ROOT=Path(os.environ.get('GRAVURU_PROJECT_ROOT',Path(__file__).resolve().parent.parent))
CODE=ROOT/'Produkte-Design/gravuru-2027-neu'
SOURCE=ROOT/'Produkte-Design/gravuru-katalog-neu'
OUT=ROOT/'outputs/schiefer-30-hunde-30-katzen'
CAT=OUT/'katalog'
CAT.mkdir(parents=True,exist_ok=True)
for name in ['schriften','motive','materialien']:
    dest=CAT/name
    if not dest.exists(): subprocess.run(['powershell','-NoProfile','-Command',f"New-Item -ItemType Junction -Path '{dest}' -Target '{SOURCE/name}' | Out-Null"],check=True)
for name in ['themen.json','struktur.json']: shutil.copy2(SOURCE/name,CAT/name)
family=json.loads((SOURCE/'familien/schiefer/gedenktafel-22x14-schiefer-natur.json').read_text(encoding='utf-8'))
family['designArea']={'marginMm':0,'keepoutMm':0}
family['source']={'note':'Isolierte Prüffamilie ohne Bohrung; kein produktiver Familienersatz.'}
fontdoc=json.loads((SOURCE/'schriften/schriften.json').read_text(encoding='utf-8'))
family['fonts']=[f['name'] for f in fontdoc['fonts'] if f.get('file')]
family['mountingRules']=[]
for s in family['sizes']: s['mounting']=[]
(CAT/'familien/schiefer').mkdir(parents=True,exist_ok=True)
(CAT/'familien/schiefer/gedenktafel-22x14-schiefer-natur.json').write_text(json.dumps(family,ensure_ascii=False,indent=1),encoding='utf-8')
wb=openpyxl.load_workbook(CODE/'docs/handoffs/design-start-mika/schiefer/Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx',data_only=True)
row=list(wb['Größen & Optionen'].iter_rows(values_only=True))[22]
assert row[4:6]==(220,140) and '(17|70)' in row[12]
(OUT/'excel-quellzeile.json').write_text(json.dumps({'sheet':'Größen & Optionen','row':23,'values':row},ensure_ascii=False,indent=2),encoding='utf-8')
spec=importlib.util.spec_from_file_location('rbd',CODE/'scripts/read-bestand-designs.py');rbd=importlib.util.module_from_spec(spec);spec.loader.exec_module(rbd)
fonts=rbd.font_files(SOURCE)
replacement=json.loads((SOURCE/'schriften/ersatz-gedenktafeln-22x14.json').read_text(encoding='utf-8'))
allmeta=json.loads((SOURCE/'designs/bestand/gedenktafeln/designs.json').read_text(encoding='utf-8'))
candidates=[x for x in allmeta if x['path'].startswith('Tiere/') and x['series']=='gravur-rechteck' and not x.get('photoFiles') and not any('Foto-Upload' in t['text'] for t in x['texts']) and all(replacement.get(f,f) in fonts for f in x['fonts'])]
dogs=[x for x in candidates if x['designNo'] not in [289,282,277,279]]
cats=[x for x in candidates if x['designNo'] not in [291,287,284,283,279,278]]
assert len(dogs)==30 and len(cats)==28
manifest=[]
def save(theme,d,source,mode,source_path=None,number=None):
    series='schiefer-22x14-mika-60'
    rbd.OUT=CAT/'designs'/series
    d['texts']=[t for t in d['texts'] if t['text'].strip()]
    d.update(material='Schiefer',process='Gravur',form='Rechteck',themes=['gedenktafeln'],sizes=['GT-SN-RE-220X140'],ziele=[{'familie':family['id'],'freigabe':None}],freigabe=None)
    d['fonts']=sorted(set(t['font'] for t in d['texts']))
    d['katalog']={'key':d['id'],'series':series,'zielgruppe':'Tiere','unterkategorie':'Allgemein','themen':d['themes']}
    d['review']={'mode':mode,'source':source_path or 'ohne Vorlage; neue Anordnung mit eigenen Bestandsmotiven','contour':'220×140 mm; 2×Ø4 bei (17|70)/(203|70); Außenkontur und Bohrlöcher blau; Excel M23'}
    d.setdefault('transfer',{}).update(decided='2026-10-30',by='Mikail: Bestandsdesigns auf 22×14 ohne Foto; eigene Ergänzungen erlaubt')
    dest=rbd.target_dir(d['id'])
    assert not d['photos']
    (dest/'design.json').write_text(json.dumps(d,ensure_ascii=False,indent=1),encoding='utf-8')
    svg=rbd.rpd.design_svg(d)
    tree=ET.fromstring(svg)
    roles={}
    for i,el in enumerate(tree.findall('{http://www.w3.org/2000/svg}text')):
        text=''.join(el.itertext()).strip()
        # Explizite Rollen statt automatischer Verwechslung von Überschrift und Tiername.
        role=d['texts'][i].get('role')
        if not role:
            role='daten' if re.search(r'\d{4}',text) else 'name' if len(text)<=18 and '\n' not in text and len(text.split())<=2 and text not in ['Wir vermissen Dich','Geliebt','Unvergessen','Treu','Liebevoll'] else 'spruch'
        roles[role]=roles.get(role,0)+1
        el.set('data-feld',role if roles[role]==1 else f'{role}-{roles[role]}')
    svg=ET.tostring(tree,encoding='unicode').replace('ns0:','').replace(':ns0','')
    (dest/'design.svg').write_text(svg,encoding='utf-8')
    if source: shutil.copy2(source/'preview.png',dest/'original.png')
    item={'theme':theme,'series':series,'id':d['id'],'name':d['name'],'number':number,'folder':str(dest),'source':str(source) if source else None,'sourcePath':source_path,'mode':mode,'fonts':d['fonts'],'substitutions':[{'from':t['fontOriginal'],'to':t['font']} for t in d['texts'] if t.get('fontOriginal')],'warnings':d.get('warnings',[])}
    manifest.append(item)
    return d
for theme,selected in [('hunde',dogs),('katzen',cats)]:
    selected.sort(key=lambda x:(x['designNo']!=(287 if theme=='hunde' else 282),-x['designNo']))
    for number,entry in enumerate(selected,1):
        source=SOURCE/'designs/bestand/gedenktafeln'/entry['path']
        d=rbd.convert(source,[220,140],'GT-S-22x14',replacement,fonts)
        for m in d['motifs']:
            bx,by,bw,bh=m['box']
            if bw>220 or bh>140:
                scale=min(219.8/bw,139.8/bh)
                tx=max(.1,min(bx,219.9-bw*scale));ty=max(.1,min(by,139.9-bh*scale))
                for p in m['paths']:
                    p['d']=rbd.transform_path(p['d'],scale,tx-bx*scale,ty-by*scale);p['strokeMm']*=scale
                m['box']=[tx,ty,bw*scale,bh*scale]
                d['warnings'].append(f'Motivgruppe einheitlich Faktor {scale:.6f}, damit überstehende Originalkontur vollständig auf der Platte bleibt; keine Verzerrung.')
        # Bestehende Flächen-/Rahmenattribute werden exakt übernommen.
        name=next((t['text'] for t in entry['texts'] if len(t['text'])<=18 and not re.search(r'\d',t['text']) and '\n' not in t['text']),d['name'])
        d['name']=f'D{entry["designNo"]} {name}'
        save(theme,d,source,'Bestandsübernahme; proportional 0,7, Anordnung erhalten',entry['path'],number)

def motif_from(source_path):
    folder=SOURCE/'designs/bestand/gedenktafeln'/source_path
    return rbd.convert(folder,[220,140],'REF',replacement,fonts)['motifs']
def position(motif,x,y,w):
    m=copy.deepcopy(motif);bx,by,bw,bh=m['box'];s=w/bw;dx=x-bx*s;dy=y-by*s
    for p in m['paths']:
        p['d']=rbd.transform_path(p['d'],s,dx,dy);p['strokeMm']=round(p['strokeMm']*s,3)
    m['box']=[x,y,w,bh*s];return m
def text(value,font,size,x,y,align='left',role='spruch'):
    return {'text':value,'font':font,'sizePt':size/ rbd.PT,'color':'#b3b3b3','align':align,'anchorMm':[x,y],'lineHeightMm':size*1.2,'letterSpacingMm':0,'role':role}
# Neue Layouts verwenden nur echte Motive aus dem eigenen Bestand, keine fremden Bilder.
catmotifs=motif_from('Tiere/Katze/gravur-rechteck-D293')
catmotif=max(catmotifs,key=lambda m:m['box'][2]*m['box'][3])
heartmotifs=motif_from('Tiere/Allgemein/gravur-rechteck-D286')
heart=max(heartmotifs,key=lambda m:m['box'][2]*m['box'][3])
new=[
 {'id':'GT-S-22x14-MIKA-KAT-NEU01','name':'Cleo · Für immer nah','texts':[text('Cleo','Allura',25,102,40,role='name'),text('2011 – 2024','Cinzel',5,104,57,role='daten'),text('Dein leises Schnurren fehlt.','Cormorant Garamond',6.5,103,82),text('Deine Liebe bleibt.','Cormorant Garamond',6.5,103,93),text('Für immer ein Teil von uns.','Allura',8,103,116)],'motifs':[position(catmotif,28,21,55)]},
 {'id':'GT-S-22x14-MIKA-KAT-NEU02','name':'Milo · Im Herzen zu Hause','texts':[text('Milo','Betsy Bailey',26,25,40,role='name'),text('Mai 2014 – März 2025','Arvo',5,27,59,role='daten'),text('Kleine Pfoten.','Arvo',6,27,85),text('Eine große Liebe.','Arvo',6,27,97),text('Im Herzen bleibst du zu Hause.','Allura',7,27,122)],'motifs':[position(heart,133,38,64)]}
]
for n,d in enumerate(new,29):
    d.update(plate={'widthMm':220,'heightMm':140,'source':'Neuentwurf für 22×14'},plateMm=[220,140],photos=[],movable=True,warnings=[],motifSources=['Tiere/Katze/gravur-rechteck-D293' if n==29 else 'Tiere/Allgemein/gravur-rechteck-D286'])
    save('katzen',d,None,'neu – eigene Anordnung; ausschließlich Originalmotive aus eigenem Bestand',number=n)
entries={i['id']:{'id':i['id'],'name':i['name'],'pfad':i['id']} for i in manifest}
(CAT/'designs/schiefer-22x14-mika-60/index.json').write_text(json.dumps(list(entries.values()),ensure_ascii=False,indent=1),encoding='utf-8')
assert len(manifest)==60
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('Fertig:',len(dogs),'Hunde,',len(cats),'+ 2 neue Katzen; 60 native Designs ohne Foto.')
