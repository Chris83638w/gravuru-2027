from pathlib import Path
import os
import json,re,collections,xml.etree.ElementTree as ET
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
ROOT=Path(os.environ.get('GRAVURU_PROJECT_ROOT',Path(__file__).resolve().parent.parent))
OUT=ROOT/'outputs/schiefer-alle-groessen'
BASE=ROOT/'outputs/schiefer-30-hunde-30-katzen'
SOURCE=ROOT/'Produkte-Design/gravuru-katalog-neu'
fontdoc=json.loads((SOURCE/'schriften/schriften.json').read_text(encoding='utf-8'))
files={f['name']:SOURCE/f['file'] for f in fontdoc['fonts'] if f.get('file')}
fonts={};glyphs={}
def font(name):
 if name not in fonts:
  tt=TTFont(files[name]);fonts[name]=(tt,tt.getBestCmap(),tt.getGlyphSet(),tt['head'].unitsPerEm)
 return fonts[name]
def text_bounds(text,name,size):
 tt,cmap,gs,upm=font(name);x=0;boxes=[]
 for ch in text:
  g=cmap.get(ord(ch),'.notdef');key=(name,g)
  if key not in glyphs:
   pen=BoundsPen(gs);gs[g].draw(pen);glyphs[key]=pen.bounds
  b=glyphs[key]
  if b:boxes.append([x+b[0],b[1],x+b[2],b[3]])
  x+=tt['hmtx'][g][0]
 if not boxes:return None,x*size/upm
 return [min(b[0] for b in boxes)*size/upm,min(b[1] for b in boxes)*size/upm,max(b[2] for b in boxes)*size/upm,max(b[3] for b in boxes)*size/upm],x*size/upm
masters=json.loads((OUT/'master-index.json').read_text(encoding='utf-8'))
manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
base={i['id']:json.loads((Path(i['folder'])/'design.json').read_text(encoding='utf-8')) for i in manifest}
problems=[];identities=set();stats=collections.Counter()
for m in masters:
 d=json.loads((Path(m['path'])/'design.json').read_text(encoding='utf-8'));source=base[m['id']]
 def chars(x):return collections.Counter(re.sub(r'\s','', ''.join(t['text'] for t in x['texts'])))
 if chars(d)!=chars(source):problems.append({'id':d['id'],'issue':'Textinhalt weicht ab'})
 if sum(len(x['paths']) for x in d['motifs'])!=sum(len(x['paths']) for x in source['motifs']):problems.append({'id':d['id'],'issue':'Motivpfade fehlen'})
 if d['id'] in identities:problems.append({'id':d['id'],'issue':'Design-ID doppelt'})
 identities.add(d['id'])
 if d['photos']:problems.append({'id':d['id'],'issue':'Fotofeld vorhanden'})
 stats[m['group']]+=1
results=json.loads((OUT/'ergebnis.json').read_text(encoding='utf-8'))['results']
overflow=[];missing=[];small=[]
ns={'s':'http://www.w3.org/2000/svg'}
for r in results:
 w,h=r['sizeMm'];tree=ET.parse(Path(r['folder'])/'design.svg').getroot()
 for t in tree.findall('s:text',ns):
  family=t.get('font-family');size=float(t.get('font-size'));y=float(t.get('y'));anchor=t.get('text-anchor')
  if family not in files:missing.append([r['excelRow'],r['id'],family]);continue
  if size<2.995:small.append([r['excelRow'],r['id'],size])
  for sp in t.findall('s:tspan',ns):
   y+=float(sp.get('dy','0'));x=float(sp.get('x',t.get('x')));text=''.join(sp.itertext());b,tw=text_bounds(text,family,size)
   if not b:continue
   dx=-tw/2 if anchor=='middle' else -tw if anchor=='end' else 0
   box=[x+dx+b[0],y-b[3],x+dx+b[2],y-b[1]]
   if box[0]<-.06 or box[1]<-.06 or box[2]>w+.06 or box[3]>h+.06:
    overflow.append({'row':r['excelRow'],'id':r['id'],'text':text,'box':box,'size':[w,h]})
summary={'masters':len(masters),'uniqueIDs':len(identities),'sizeDerivations':len(results),'logicalProductSelections':sum(len(r['themes']) for r in results),'masterContentIssues':problems,'missingFonts':missing,'smallFonts':small,'textOverflows':overflow,'byGroup':dict(stats)}
(OUT/'qualitaetspruefung.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print({k:len(v) if isinstance(v,list) else v for k,v in summary.items() if k!='byGroup'})
for p in overflow[:25]:print(p)
