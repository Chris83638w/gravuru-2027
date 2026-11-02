"""Check delivered sources, editable text geometry and provenance without rendering."""
import argparse,json,hashlib
import xml.etree.ElementTree as ET
from pathlib import Path
from functools import lru_cache
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
ap=argparse.ArgumentParser();ap.add_argument('catalog',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args()
def read(p):return json.loads(p.read_text(encoding='utf8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
m=read(a.catalog/'auftraege/rasse-15x10-20261102/manifest.json')
fonts={f['name']:a.catalog/f['file'] for f in read(a.catalog/'schriften/schriften.json')['fonts'] if f.get('file')}
@lru_cache(None)
def ink(name,text):
 f=TTFont(fonts[name]);gs=f.getGlyphSet();cm=f.getBestCmap();u=f['head'].unitsPerEm;off=0;bs=[]
 for ch in text:
  g=cm[ord(ch)];p=BoundsPen(gs);gs[g].draw(p)
  if p.bounds:
   l,b,r,t=p.bounds;bs.append((l+off,b,r+off,t))
  off+=f['hmtx'].metrics[g][0]
 return [v/u for v in (min(b[0] for b in bs)-off/2,min(b[1] for b in bs),max(b[2] for b in bs)-off/2,max(b[3] for b in bs))]
errors=[];cats=set();minimum=100
for row in m['designs']:
 d=read(a.catalog/row['folder']/'design.json');path=a.catalog/row['folder']/'design.svg';source=a.catalog/d['source']
 assert row['plateMm']==d['plateMm']==[150,100]
 assert sha(path)==row['svgSha256'] and sha(source)==row['motifSha256']
 original=ET.parse(source).getroot();delivered=ET.parse(path).getroot()
 originalRules={e.get('fill-rule',original.get('fill-rule','nonzero')) for e in original.iter('{http://www.w3.org/2000/svg}path')}
 deliveredRules={e.get('fill-rule','nonzero') for e in delivered.iter('{http://www.w3.org/2000/svg}path')}
 assert originalRules==deliveredRules,(row['id'],'source fill rule changed')
 assert d['freigabe'] is None and all(z['freigabe'] is None for z in d['ziele'])
 if row['animal']=='cat':cats.add(sha(source))
 assert len(d['texts'])==3
 boxes=[]
 for t in d['texts']:
  l,b,r,top=ink(t['font'],t['text']);s=t['sizeMm'];x,y=t['anchorMm'];minimum=min(minimum,s)
  box=(x+l*s,y-top*s,x+r*s,y-b*s);boxes.append(box)
  if box[0]<0 or box[1]<0 or box[2]>150 or box[3]>100:errors.append([row['id'],'text outside plate'])
 for i,p in enumerate(boxes):
  for q in boxes[i+1:]:
   if min(p[2],q[2])>max(p[0],q[0]) and min(p[3],q[3])>max(p[1],q[1]):errors.append([row['id'],'text overlap'])
result={'designs':len(m['designs']),'breeds':len(m['breeds']),'distinctCatMotifHashes':len(cats),'minimumTextSizeMm':minimum,'errors':errors}
assert len(cats)==300
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf8');print(json.dumps(result));assert not errors
