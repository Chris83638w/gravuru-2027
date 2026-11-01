"""Checks for the explicitly limited first review; no new colors/sizes generated."""
import json, math, os
from pathlib import Path
from collections import Counter
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
ROOT=Path(__file__).resolve().parent.parent
CAT=Path(os.environ.get('GRAVURU_KATALOG',ROOT.parent/'grabkreuze-hunde-katalog'))
WORK=Path(os.environ.get('GRAVURU_DOG_REVIEW',ROOT.parent.parent/'outputs/grabkreuze-hunde-nachauftrag'))
DEST=ROOT/'docs/handoffs/grabkreuze-hunde-20261101'
SERIES=CAT/'designs/grabkreuze-hunde-11x20'
fontfiles={f['name']:CAT/f['file'] for f in json.loads((CAT/'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
data=[json.loads(p.read_text(encoding='utf-8')) for p in SERIES.glob('*/design.json')]
assert len(data)==20
assert Counter(d['reviewGroup'] for d in data)=={'A':8,'B':4,'C':5,'D':3}
assert {d['sourceKey'] for d in data if d['reviewGroup']=='A'}=={f'KZ-A-D{n}' for n in [0,1,41,42,46,48,53,55]}
assert {d['sourceKey'] for d in data if d['reviewGroup']=='B'}=={f'KZUV-A-D{n}' for n in [26,27,32,33]}
fonts={};caps=[];checks=[]
for d in data:
 assert d['texts'] and not d['photos'] and d['freigabe'] is None and 1<=len(d['fonts'])<=3
 assert d['sizes']==['KZ-A-11x20'] and d['ziele']==[{'familie':'grabkreuz-acryl-5mm-schwarz','freigabe':None}]
 assert len(d['texts'])+len(d['motifs'])<=20
 textbounds=[];missing=[];dcaps=[]
 for t in d['texts']:
  if t['font'] not in fonts:fonts[t['font']]=TTFont(fontfiles[t['font']])
  f=fonts[t['font']];gs=f.getGlyphSet();cmap=f.getBestCmap();upm=f['head'].unitsPerEm;sz=t['sizePt']*25.4/72
  p=BoundsPen(gs);gs[cmap[ord('H')]].draw(p);cap=(p.bounds[3]-p.bounds[1])/upm*sz
  assert cap>=2.995,(d['id'],t['text'],cap)
  caps.append(cap);dcaps.append(cap)
  ax,ay=t['anchorMm'];points=[]
  for row,line in enumerate(t['text'].splitlines()):
   for c in line:
    assert ord(c) in cmap,(d['id'],t['font'],c)
   adv=sum(f['hmtx'][cmap[ord(c)]][0] for c in line)
   x=ax-(adv/upm*sz/2 if t['align']=='center' else adv/upm*sz if t['align']=='right' else 0);y=ay+row*t['lineHeightMm']
   for c in line:
    p=BoundsPen(gs);gs[cmap[ord(c)]].draw(p)
    if p.bounds:
     a,b,cx,dy=p.bounds
     points.extend([(x+a/upm*sz,y-dy/upm*sz),(x+cx/upm*sz,y-b/upm*sz)])
    x+=f['hmtx'][cmap[ord(c)]][0]/upm*sz
  angle=math.radians(t.get('rotation',0));cy=ay-.35*sz+(len(t['text'].splitlines())-1)/2*t['lineHeightMm']
  if angle:points=[(ax+(x-ax)*math.cos(angle)-(y-cy)*math.sin(angle),cy+(x-ax)*math.sin(angle)+(y-cy)*math.cos(angle)) for x,y in points]
  textbounds.extend(points)
 bottom=max(y for x,y in textbounds)
 for m in d['motifs']:
  assert all(p.get('fill') in (None,'none','#000000') and p.get('stroke') in (None,'none','#000000') for p in m['paths'])
  bottom=max(bottom,m['box'][1]+m['box'][3]+max(p.get('strokeMm',0) for p in m['paths'])/2)
 assert bottom<=145.01,(d['id'],bottom)
 checks.append({'id':d['id'],'minCapHeightMm':round(min(dcaps),3),'artworkBottomMm':round(bottom,3),'groundClearanceMm':round(150-bottom,3),'fonts':d['fonts']})
native=json.loads((WORK/'native-pruefung.json').read_text(encoding='utf-8'))
assert len(native)==20 and all(r.get('fit',{}).get('status')=='passt' and r['nativeGround'] for r in native)
assert all(len(r['reviewFit']['sizes'])==1 for r in native),'No checks of unrequested sizes'
jpg=DEST/'kontaktbogen-schwarz-11x20.jpg';assert jpg.stat().st_size<=2_000_000
motifs=Counter(m for d in data for m in d['motifKinds'] if not m.startswith('ohne Motiv'))
assert len(motifs)>=8 and max(motifs.values())<=3
assert len({d['layout'] for d in data})>=5
report={'scope':'Ausschließlich Schwarz 11×20; keine weiteren Varianten','groups':dict(Counter(d['reviewGroup'] for d in data)),'designs':20,'nativeFits':{'passt':20,'prüfen':0,'passt nicht':0},'fontsUsed':sorted(fonts),'minimumCapMm':round(min(caps),3),'motifCompositions':dict(motifs),'motifCountingNote':'Gezählt werden unterscheidbare Original-Motivzeichnungen/-gruppen, nicht Oberbegriffe. Die Pflichtliste selbst enthält sechs Gestaltungen mit Pfoten/Pfotenspuren; diese bleiben erhalten. Hund im Herz und Pfotenherz erscheinen je zweimal.','layoutEvidence':['D301: senkrechter Name, Daten außen','D205/D302: Spruch quer, Name im Stamm','D0/D41: Datum im Querbalken, Motive seitlich/oben','D42: lange Pfotenspur im Stamm','D203: Regenbogen unten','D303: Name links, Hund rechts'],'jpgBytes':jpg.stat().st_size,'browserCheck':'Offen; übernimmt Claude nach Designabnahme. JPG ist gerasterte native Zielvorschau, kein Browser-Screenshot.','fontDecisionPending':next(d['fontDecisionPending'] for d in data if d.get('fontDecisionPending')),'checks':checks}
(DEST/'nachauftrag-pruefung.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ['designs','nativeFits','minimumCapMm','jpgBytes']},ensure_ascii=False))
