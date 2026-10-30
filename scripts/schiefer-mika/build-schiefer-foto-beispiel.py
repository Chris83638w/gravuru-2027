"""Originalfoto bytegleich einbetten; Original-Herzmaske als Vektor erhalten."""
from pathlib import Path
import base64, copy, hashlib, html, json, shutil, xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
CAT=ROOT/'Produkte-Design/gravuru-katalog-neu'
SOURCE=CAT/'designs/bestand/gedenktafeln/Tiere/Allgemein/gravur-rechteck-D236'
OUT=ROOT/'outputs/schiefer-foto-beispiel-molly'
OUT.mkdir(parents=True,exist_ok=True)
NS='http://www.w3.org/2000/svg'; XL='http://www.w3.org/1999/xlink'
ET.register_namespace('',NS); ET.register_namespace('xlink',XL)
def el(tag,attrs=None): return ET.Element('{'+NS+'}'+tag,attrs or {})
def dump(x):return ET.tostring(x,encoding='unicode')
def write(name,value): (OUT/name).write_text(value,encoding='utf-8')
def sha(b):return hashlib.sha256(b).hexdigest()
def path_scale(d):
    pen=SVGPathPen(None);parse_path(d,TransformPen(pen,(.7,0,0,.7,5,0)));return pen.getCommands()
def bounds(d):
    pen=BoundsPen(None);parse_path(d,pen);return pen.bounds
raw=ET.parse(SOURCE/'design.svg').getroot()
photo=next(x for x in raw if x.tag.endswith('}image'))
photo_file=SOURCE/photo.get('{'+XL+'}href')
photo_bytes=photo_file.read_bytes()
image_url='data:image/jpeg;base64,'+base64.b64encode(photo_bytes).decode()
clip=next(x for x in raw if x.tag.endswith('}clipPath'))
source_mask=next(iter(clip)).get('d');mask=path_scale(source_mask)
box=bounds(mask); box=[box[0],box[1],box[2]-box[0],box[3]-box[1]]
font_meta=next(f for f in json.loads((CAT/'schriften/schriften.json').read_text('utf-8'))['fonts'] if f['name']=='Betsy Bailey')
font_path=CAT/font_meta['file'];tt=TTFont(font_path);gs=tt.getGlyphSet();cmap=tt.getBestCmap();upm=tt['head'].unitsPerEm
def glyph_line(value,size,x,y,anchor):
    glyphs=[cmap[ord(c)] for c in value];adv=[tt['hmtx'][g][0]*size/upm for g in glyphs]
    width=sum(adv);x-=width/2 if anchor=='middle' else width if anchor=='end' else 0
    parts=[]; boxes=[]
    for g,a in zip(glyphs,adv):
        pen=SVGPathPen(gs);gs[g].draw(TransformPen(pen,(size/upm,0,0,-size/upm,x,y)))
        d=pen.getCommands()
        if d:parts.append(d);boxes.append(bounds(d))
        x+=a
    return ' '.join(parts),boxes

root=el('svg',{'width':'220mm','height':'140mm','viewBox':'0 0 220 140','version':'1.1'})
title=el('title');title.text='Molly · Originalfoto in Herzmaske · 22 × 14 cm';root.append(title)
defs=el('defs');cp=el('clipPath',{'id':'clip-foto-1','clipPathUnits':'userSpaceOnUse'});cp.append(el('path',{'d':mask}));defs.append(cp);root.append(defs)
group=el('g',{'id':'foto-1','class':'foto','data-feld':'foto','data-platzhalter':'ja','data-gravur':'nein','data-mask-id':'clip-foto-1'})
# Der unsichtbare Pfad beschreibt die echte Fotomaske auch für Lieferform-2-Leser.
group.append(el('path',{'d':mask,'fill':'none','stroke':'none','data-role':'fotomaske'}))
im=copy.deepcopy(photo);im.set('id','originalfoto');im.attrib.pop('class',None)
for k in ['x','y','width','height']:im.set(k,f"{float(photo.get(k))*.7+(5 if k=='x' else 0):.8f}")
im.set('{'+XL+'}href',image_url);im.set('preserveAspectRatio','xMidYMid meet');group.append(im);root.append(group)
motif_count=0
for old in raw:
    if not old.get('id','').startswith('motiv-'):continue
    if old.get('fill') in [None,'none'] and old.get('stroke') in [None,'none']:continue
    p=copy.deepcopy(old);p.set('d',path_scale(old.get('d')))
    p.set('stroke-width',str(float(old.get('stroke-width','0'))*.7))
    for k in ['fill','stroke']:
        if p.get(k) not in [None,'none']:p.set(k,'#111111')
    root.append(p);motif_count+=1
texts=[];text_bounds=[]
for i,old in enumerate([x for x in raw if x.tag.endswith('}text')],1):
    t=copy.deepcopy(old);t.set('x',str(float(old.get('x'))*.7+5));t.set('y',str(float(old.get('y'))*.7));t.set('font-size',str(float(old.get('font-size'))*.7));t.set('fill','#111111')
    t.set('data-feld',['name','daten','spruch'][i-1])
    for span in t:
        if span.get('x') is not None:span.set('x',str(float(span.get('x'))*.7+5))
        if span.get('dy') is not None:span.set('dy',str(float(span.get('dy'))*.7))
    # Quelllayout unverändert; spätere Prüfung nennt sichtbare Grenzen.
    root.append(t);texts.append(t)
contour=el('g',{'id':'kontur','fill':'none','stroke':'#0000ff','stroke-width':'0.2'})
contour.append(el('path',{'id':'aussenkontur','d':'M0 0H220V140H0Z'}));root.append(contour)
write('design.svg',dump(root))
outlined=copy.deepcopy(root)
for t in list(outlined):
    if not t.tag.endswith('}text'):continue
    g=el('g',{'id':t.get('id')+'-pfade','data-feld':t.get('data-feld'),'fill':'#111111'})
    y=float(t.get('y'));size=float(t.get('font-size'))
    for sp in t:
        y+=float(sp.get('dy','0'));line=''.join(sp.itertext());d,bb=glyph_line(line,size,float(sp.get('x',t.get('x'))),y,t.get('text-anchor','start'))
        g.append(el('path',{'d':d}));text_bounds.extend(bb)
    idx=list(outlined).index(t);outlined.remove(t);outlined.insert(idx,g)
write('Molly-22x14-mit-Foto.svg',dump(outlined))
preview=copy.deepcopy(outlined)
bg=el('rect',{'id':'ansicht-hintergrund','width':'220','height':'140','fill':'#242627'})
preview.insert(1,bg)
for p in preview.iter():
    for k in ['fill','stroke']:
        if p.get(k)=='#111111':p.set(k,'#eeeeeb')
write('vorschau.svg',dump(preview))
shutil.copy2(SOURCE/'preview.png',OUT/'vorlage.png')
shutil.copy2(photo_file,OUT/'originalfoto.jpg')
metadata={
 'id':'GT-S-22x14-D236','name':'Molly · mit Foto in Original-Herzmaske','plateMm':[220,140],'plate':{'widthMm':220,'heightMm':140},
 'material':'Schiefer','process':'Gravur','form':'Rechteck','themes':['gedenktafeln'],'sizes':['GT-SN-RE-220X140'],
 'ziele':[{'familie':'gedenktafel-22x14-schiefer-natur','freigabe':None}],'freigabe':None,'movable':True,
 'source':str(SOURCE.relative_to(CAT)),'varianteVon':'GT-S-30x20-D236',
 'katalog':{'series':'schiefer-foto-mika-beispiel','key':'schiefer-foto-mika-beispiel-D236','zielgruppe':'Tiere','unterkategorie':'Hund'},
 'transfer':{'scale':.7,'offsetMm':[5,0],'by':'Mikail: Originalfotos verlustfrei; Maske erhalten; Upload-Hinweis nur Bedienung'},
 'fonts':['Betsy Bailey'],'photos':[{'box':box,'file':'originalfoto.jpg','px':list(Image.open(photo_file).size),'originalSha256':sha(photo_bytes),'maskSvgPath':mask,'placeholder':True,'engrave':False,'embeddedByteIdentical':True}],
 'fields':{'foto-1':{'label':'Foto hochladen'}},
 'delivery':{'singleFile':'Molly-22x14-mit-Foto.svg','textEditable':'design.svg','view':'vorschau.svg','buttonIsUiOnly':True,'productionNote':'Musterfoto als Original eingebettet; Kundenupload ersetzt nur Foto. SVG enthält keinen Upload-Hinweis.'}
}
write('design.json',json.dumps(metadata,ensure_ascii=False,indent=2))
actual=ET.fromstring((OUT/'Molly-22x14-mit-Foto.svg').read_text('utf-8'))
embedded=next(e for e in actual.iter() if e.tag.endswith('}image')).get('{'+XL+'}href').split(',',1)[1]
assert base64.b64decode(embedded)==photo_bytes
assert next(e for e in actual.iter() if e.tag.endswith('}clipPath'))[0].get('d')==mask
assert not any('hinweis' in e.get('id','') for e in actual.iter())
report={'originalBytes':len(photo_bytes),'originalPx':list(Image.open(photo_file).size),'sha256':sha(photo_bytes),'embeddedByteIdentical':True,'reencoded':False,'maskSourcePath':source_mask,'maskTargetPath':mask,'maskBoxMm':box,'uniformScale':.7,'contourBlue':True,'holes':0,'motifCount':motif_count,'font':'Betsy Bailey','textOutside':[b for b in text_bounds if b[0]<0 or b[1]<0 or b[2]>220 or b[3]>140]}
write('pruefung.json',json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
