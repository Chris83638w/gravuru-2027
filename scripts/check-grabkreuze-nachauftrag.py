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
assert len(data)==25
assert Counter(d['reviewGroup'] for d in data)=={'A':8,'B':4,'C':5,'D':8}
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
  if t is d['texts'][0]:
   assert abs((min(x for x,y in points)+max(x for x,y in points))/2-55)<.02,'Name ink must be optically centred'
  textbounds.extend(points)
 bottom=max(y for x,y in textbounds)
 for m in d['motifs']:
  assert all(p.get('fill') in (None,'none','#000000') and p.get('stroke') in (None,'none','#000000') for p in m['paths'])
  bottom=max(bottom,m['box'][1]+m['box'][3]+max(p.get('strokeMm',0) for p in m['paths'])/2)
 assert bottom<=145.01,(d['id'],bottom)
 checks.append({'id':d['id'],'minCapHeightMm':round(min(dcaps),3),'artworkBottomMm':round(bottom,3),'groundClearanceMm':round(150-bottom,3),'fonts':d['fonts']})
native=json.loads((WORK/'native-pruefung.json').read_text(encoding='utf-8'))
assert len(native)==25 and all(r.get('fit',{}).get('status')=='passt' and r['nativeGround'] for r in native)
assert all(len(r['reviewFit']['sizes'])==1 for r in native),'No checks of unrequested sizes'
jpg=DEST/'kontaktbogen-schwarz-11x20.jpg';assert jpg.stat().st_size<=2_000_000
motifs=Counter(m for d in data for m in d['motifKinds'] if not m.startswith('ohne Motiv'))
assert len(motifs)>=8
# House style deliberately repeats a quiet name/dates layout and paw trails.
assert Counter(d['designTier'] for d in data)=={'standard':20,'signature':5}
assert all(2<=d['elementCount']<=4 and d['normalReadingDirection'] for d in data)
assert all(len(d['texts'])==2 and d['texts'][0]['text']==d['name'] for d in data)
assert all(all(36.667<t['anchorMm'][1]<73.333 and not t.get('rotation') and '\n' not in t['text'] for t in d['texts']) for d in data),'Name + years only in crossbar'
assert len({d['signatureTitle'] for d in data if d['designTier']=='signature'})==5
assert all(5<=d['pawCount']<=7 for d in data if d.get('pawCount'))
assert all(p.get('sourceStrokeMm',.3)>=.3 for d in data if d['designTier']=='signature' for m in d['motifs'] for p in m['paths'])
assert all(v['edgeClearanceMm']>=.3 for d in data for v in d.get('negativePawProof',[]))
margin=json.loads((WORK/'randabstand-pruefung.json').read_text(encoding='utf-8'))
assert len(margin['designs'])==25 and all(d['passes2mm'] and d['minimumCertifiedMarginMm']>=2 for d in margin['designs'])
assert not any(d.get('fontDecisionPending') for d in data)
clarissa=next(d for d in data if d['id'].endswith('-D42'))
assert clarissa['pawCount']==7 and not any('Für immer' in t['text'] for t in clarissa['texts'])
bruno=next(d for d in data if d['id'].endswith('-D205'));name=next(t for t in bruno['texts'] if t['text']=='Bruno')
assert 37<name['anchorMm'][1]<74 and name['sizePt']==max(t['sizePt'] for t in bruno['texts'])
assert bruno['motifs'][0]['box'][3]>=29.99
new=[d for d in data if int(d['id'].split('-D')[-1]) in range(304,309)]
assert len(new)==5 and all(d['source']=='ohne Vorlage' and d['ownMotifId'] for d in new)
report={'scope':'Ausschließlich Schwarz 11×20; 20 Hausstil + 5 Signature nach #6562929837/#6562964893','groups':dict(Counter(d['reviewGroup'] for d in data)),'tiers':dict(Counter(d['designTier'] for d in data)),'designs':25,'nativeFits':{'passt':25,'prüfen':0,'passt nicht':0},'fontsUsed':sorted(fonts),'minimumCapMm':round(min(caps),3),'minimumCertifiedContourMarginMm':min(d['minimumCertifiedMarginMm'] for d in margin['designs']),'requiredContourMarginMm':2,'motifCompositions':dict(motifs),'houseStyleChecks':{'nameAndDatesInCrossbar':25,'stemTextCount':0,'elements2to4':25,'verticalNames':0,'signatureTitles':[d['signatureTitle'] for d in data if d['designTier']=='signature'],'newSignatureStrokeMm':sorted({p['sourceStrokeMm'] for d in data if d['designTier']=='signature' for m in d['motifs'] for p in m['paths'] if 'sourceStrokeMm' in p}),'negativePawEdgeClearanceMm':.325},'proportions':[{'id':d['id'],**d['proportions']} for d in data],'proportionNote':'80–90 % Namensbreite und 35–45 % Versalhöhe sind optische Richtwerte. Kurze Namen und Originalschriften bleiben unverzerrt; tatsächliche Breiten/Höhen sind einzeln ausgewiesen. Schriftstriche sind nicht pauschal auf 0,3 mm vermessen; die feinen Bestandsmotive und Schriften brauchen die übliche Fertigungsabnahme. Neue Signature-Linien sind explizit mindestens 0,55 mm.','jpgBytes':jpg.stat().st_size,'browserCheck':'Offen; übernimmt Claude nach Designabnahme. JPG ist gerasterte native Zielvorschau ohne Rand-Hilfslinien, kein Browser-Screenshot.','fontDecision':next(d['fontDecision'] for d in data if d.get('fontDecision')),'checks':checks}
(DEST/'nachauftrag-pruefung.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ['designs','nativeFits','minimumCapMm','jpgBytes']},ensure_ascii=False))
