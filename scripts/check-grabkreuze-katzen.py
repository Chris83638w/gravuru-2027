"""Independent content and evidence checks for the 25 cat cross designs."""
import json, math, os, hashlib, subprocess
from pathlib import Path
from collections import Counter
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
ROOT=Path(__file__).resolve().parent.parent
CAT=Path(os.environ.get('GRAVURU_KATALOG',ROOT.parent/'grabkreuze-katzen-katalog'))
WORK=Path(os.environ.get('GRAVURU_CAT_REVIEW',ROOT.parent.parent/'outputs/grabkreuze-katzen-nachauftrag'))
DEST=ROOT/'docs/handoffs/grabkreuze-katzen-20261101'
SERIES=CAT/'designs/grabkreuze-katzen-11x20'
index=json.loads((SERIES/'index.json').read_text(encoding='utf-8'))['designs']
data=[json.loads((SERIES/d['id']/'design.json').read_text(encoding='utf-8')) for d in index]
fontfiles={f['name']:CAT/f['file'] for f in json.loads((CAT/'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
assert len(data)==25 and len({d['id'] for d in data})==25 and len({d['name'] for d in data})==25
assert Counter(d['designTier'] for d in data)=={'original':1,'standard':19,'signature':5}
fonts={};caps=[];checks=[]
for d in data:
 assert d['texts'] and not d['photos'] and d['freigabe'] is None and 1<=len(d['fonts'])<=3
 assert d['sizes']==['KZ-A-11x20'] and d['ziele']==[{'familie':'grabkreuz-acryl-5mm-schwarz','freigabe':None}]
 assert d['themes']==['katzengedenktafeln'] and d['elementCount']<=4 and d['normalReadingDirection']
 assert not (SERIES/d['id']/'foto-1.png').exists()
 dcaps=[];textbounds=[];namebounds=None
 for t in d['texts']:
  if t['font'] not in fonts:fonts[t['font']]=TTFont(fontfiles[t['font']])
  f=fonts[t['font']];gs=f.getGlyphSet();cmap=f.getBestCmap();upm=f['head'].unitsPerEm;sz=t['sizePt']*25.4/72
  p=BoundsPen(gs);gs[cmap[ord('H')]].draw(p);cap=(p.bounds[3]-p.bounds[1])/upm*sz
  assert cap>=2.995,(d['id'],t['text'],cap)
  caps.append(cap);dcaps.append(cap);ax,ay=t['anchorMm'];points=[]
  for row,line in enumerate(t['text'].splitlines()):
   assert all(ord(c) in cmap for c in line),(d['id'],t['font'],line)
   adv=sum(f['hmtx'][cmap[ord(c)]][0] for c in line)
   x=ax-(adv/upm*sz/2 if t['align']=='center' else adv/upm*sz if t['align']=='right' else 0);y=ay+row*t['lineHeightMm']
   for c in line:
    p=BoundsPen(gs);gs[cmap[ord(c)]].draw(p)
    if p.bounds:
     a,b,cx,dy=p.bounds;points.extend([(x+a/upm*sz,y-dy/upm*sz),(x+cx/upm*sz,y-b/upm*sz)])
    x+=f['hmtx'][cmap[ord(c)]][0]/upm*sz
  angle=math.radians(t.get('rotation',0));cy=ay-.35*sz+(len(t['text'].splitlines())-1)/2*t['lineHeightMm']
  if angle:points=[(ax+(x-ax)*math.cos(angle)-(y-cy)*math.sin(angle),cy+(x-ax)*math.sin(angle)+(y-cy)*math.cos(angle)) for x,y in points]
  if t['text']==d['name']:namebounds=[min(x for x,y in points),min(y for x,y in points),max(x for x,y in points),max(y for x,y in points)]
  textbounds.extend(points)
 bottom=max(y for x,y in textbounds)
 for m in d['motifs']:
  assert all(p.get('fill') in (None,'none','#000000') and p.get('stroke') in (None,'none','#000000') for p in m['paths'])
  bottom=max(bottom,m['box'][1]+m['box'][3]+max(p.get('strokeMm',0) for p in m['paths'])/2)
 assert bottom<=145.01,(d['id'],bottom)
 fingerprint=hashlib.sha256(json.dumps(d['motifs'],sort_keys=True).encode()).hexdigest()
 assert fingerprint==d['compositionFingerprint']
 checks.append({'id':d['id'],'name':d['name'],'minCapHeightMm':round(min(dcaps),3),'artworkBottomMm':round(bottom,3),'groundClearanceMm':round(150-bottom,3),'nameInkBoundsMm':namebounds,'fonts':d['fonts'],'idea':d['distinctiveIdea'],'source':d['source']})
assert len({d['compositionFingerprint'] for d in data})==25 and len({d['distinctiveIdea'] for d in data})==25
assert sum(d['pawTrail'] for d in data)==2
assert sum(bool(d.get('breaksStandardLayout')) for d in data)==5
assert sum(bool(t.get('rotation')) for d in data for t in d['texts'])==1
native=json.loads((WORK/'native-pruefung.json').read_text(encoding='utf-8'))
assert len(native)==25 and all(r.get('fit',{}).get('status')=='passt' and r['nativeGround'] for r in native)
assert all(len(r['reviewFit']['sizes'])==1 for r in native)
margin=json.loads((WORK/'randabstand-pruefung.json').read_text(encoding='utf-8'))
assert len(margin['designs'])==25 and all(d['passes2mm'] and d['minimumCertifiedMarginMm']>=2 for d in margin['designs'])
jpg=DEST/'kontaktbogen-schwarz-11x20.jpg';assert jpg.stat().st_size<=2_000_000
# Byte comparison to the task branch base, including all previous dog designs.
base='ec1a51ad5279e24394810e6c618f1e9bd671495b';preserved=[]
for prefix in ['designs/bestand/kreuze/Tiere/Katze/','designs/bestand/gedenktafeln/Tiere/Katze/','designs/grabkreuze-hunde-11x20/']:
 paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base,'--',prefix],cwd=CAT,text=True).splitlines()
 for rel in paths:
  old=subprocess.check_output(['git','show',base+':'+rel],cwd=CAT);new=(CAT/rel).read_bytes()
  if Path(rel).suffix in ['.json','.svg','.md']:old=old.replace(b'\r\n',b'\n');new=new.replace(b'\r\n',b'\n')
  assert old==new,rel
  preserved.append({'path':rel,'sha256':hashlib.sha256(new).hexdigest()})
own=json.loads((CAT/'motive-eigene/motive-eigene.json').read_text(encoding='utf-8'))['motifs']
for d in data:
 if not d['sourceKey']:
  assert sum(m['id']==d['ownMotifId'] for m in own)==1
  assert (CAT/'motive-eigene'/d['ownMotifId']/'motiv.svg').exists()
report={'scope':'Katzen: Gravur Schwarz 11×20; 1 Verkaufsoriginal, 3 Motiv-Referenzen, 21 neue Entwürfe (davon 5 Signature).',
 'designs':25,'nativeFits':25,'minimumCapMm':round(min(caps),3),'minimumCertifiedContourMarginMm':min(d['minimumCertifiedMarginMm'] for d in margin['designs']),
 'requiredContourMarginMm':2,'jpgBytes':jpg.stat().st_size,'fontsUsed':sorted(fonts),'checks':checks,
 'individuality':{'uniqueNames':25,'distinctMotifGeometryFingerprints':25,'pawTrailDesigns':2,'signatureLayoutBreaks':5,'verticalNames':1,
 'limitation':'Fingerprints catch exact repeats only. Visual assessment of the contact sheet is required separately.'},
 'preservedFiles':preserved,'browserCheck':'Offen; native Zielvorschau ist kein Browser-Screenshot. Claude nach Gestaltungsabnahme.',
 'fontLimits':'Kein genereller Nachweis sämtlicher Schriftstrichstärken. Soulmate fehlt und wurde nicht ersetzt; betreffende Vorlage nicht übernommen.',
 'productionApproval':None}
(DEST/'pruefung.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({k:report[k] for k in ['designs','nativeFits','minimumCapMm','minimumCertifiedContourMarginMm','jpgBytes']},ensure_ascii=False))
print(len(preserved),'Original- und Hunde-Dateien unverändert')
