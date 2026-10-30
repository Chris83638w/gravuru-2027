from pathlib import Path
import base64,collections,copy,hashlib,json,math,re,xml.etree.ElementTree as ET
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.svgLib.path import parse_path

ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'outputs/schiefer-foto-alle-groessen';S='http://www.w3.org/2000/svg';ET.register_namespace('',S)
results=json.loads((OUT/'ergebnis.json').read_text('utf-8'));masters=json.loads((OUT/'master-index.json').read_text('utf-8'));selection=json.loads((OUT/'auswahl.json').read_text('utf-8'));source={d['key']:d for d in selection}
products={p['excelRow']:p for p in json.loads((OUT/'produkte-aus-excel.json').read_text('utf-8'))};errors=[];checked=0;image_checks=0;hint_checks=0;mask_cache={};photo_cache={};merged=0
original_shape_cache={}
mask_bounds_cache={};placement_cache={};image_info={a['sha256']:a for a in json.loads((OUT/'fotonachweise.json').read_text('utf-8'))};shape_polys={a['index']:a['points'] for a in json.loads((ROOT/'outputs/schiefer-alle-groessen/konturen-abgleich.json').read_text('utf-8'))}

def intervals(p,y):
 if y<-.001 or y>p['heightMm']+.001:return []
 if p['form']=='Rund':
  w,h=p['widthMm'],p['heightMm'];dx=w/2*math.sqrt(max(0,1-((y-h/2)/(h/2))**2));return [(w/2-dx,w/2+dx)]
 if p['shapeIndex'] is None:return [(0,p['widthMm'])]
 pts=shape_polys[p['shapeIndex']];xs=[]
 for a,b in zip(pts,pts[1:]+pts[:1]):
  if (a[1]<=y<b[1]) or (b[1]<=y<a[1]):xs.append(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]))
 xs.sort();return list(zip(xs[::2],xs[1::2]))

def placement_valid(im,mask,digest,p):
 ib=tuple(float(im.get(a)) for a in ['x','y','width','height']);key=(ib,mask,digest,p['excelRow'])
 if key not in placement_cache:
  ix,iy,iw,ih=ib;info=image_info[digest];a,b,c,d=info['alphaBoxPx'];pw,ph=info['px'];mx,my,ex,ey=mask_bounds_cache[mask]
  x=max(mx,ix+a/pw*iw);y=max(my,iy+b/ph*ih);right=min(ex,ix+(a+c)/pw*iw);bottom=min(ey,iy+(b+d)/ph*ih)
  placement_cache[key]=all(any(x>=l-.02 and right<=r+.02 for l,r in intervals(p,y+(bottom-y)*(k+.01)/40.02)) for k in range(41))
 return placement_cache[key]
def fail(f,why):errors.append({'file':str(f.relative_to(OUT)),'error':why})
def canonical(d):
 p=SVGPathPen(None);parse_path(d,p);return p.getCommands()
def shape(d):
 d=canonical(d);p=RecordingPen();parse_path(d,p);b=BoundsPen(None);parse_path(d,b);return p.value,b.bounds
def mask_valid(original,current):
 key=(original,current)
 if key not in mask_cache:
  if original not in original_shape_cache:original_shape_cache[original]=shape(original)
  aa,a=original_shape_cache[original];bb,b=shape(current);sx=(b[2]-b[0])/(a[2]-a[0]);sy=(b[3]-b[1])/(a[3]-a[1]);dx=b[0]-a[0]*sx;dy=b[1]-a[1]*sx;ok=abs(sx-sy)<1e-5 and len(aa)==len(bb)
  mask_bounds_cache[current]=b
  if ok:
   for (ca,pa),(cb,pb) in zip(aa,bb):
    if ca!=cb or len(pa)!=len(pb):ok=False;break
    for (ax,ay),(bx,by) in zip(pa,pb):
     if abs(ax*sx+dx-bx)>1e-4 or abs(ay*sx+dy-by)>1e-4:ok=False;break
  mask_cache[key]=ok
 return mask_cache[key]
def compact_text(f):
 global merged
 root=ET.parse(f).getroot();original=list(root);alltext=[]
 for t in original:
  if t.tag!='{'+S+'}text':continue
  spans=list(t);y=float(t.get('y','0'));lines=[]
  for s in spans:
   y=float(s.get('y',y))+float(s.get('dy','0'));lines.append((''.join(s.itertext()),float(s.get('x',t.get('x','0'))),y))
  if not spans:lines=[(''.join(t.itertext()),float(t.get('x','0')),y)]
  for text,x,y in lines:alltext.append((t,text,x,y))
 if not alltext:return
 # Nur gleich formatierte, unmittelbar aufeinanderfolgende Zeilen zusammenfassen.
 groups=[]
 for t,text,x,y in alltext:
  key=(t.get('font-family'),t.get('font-size'),t.get('text-anchor'),t.get('fill'),t.get('data-feld','').split('-')[0],round(x,5));candidate=None
  if groups:
   g=groups[-1];dy=y-g['lines'][-1][2]
   if g['key']==key and len('\n'.join([a[0] for a in g['lines']]+[text]))<=180 and 0<dy<4*float(t.get('font-size')) and (len(g['lines'])==1 or abs(dy-(g['lines'][-1][2]-g['lines'][-2][2]))<1e-4):candidate=g
  if candidate:candidate['lines'].append((text,x,y))
  else:groups.append({'key':key,'node':t,'lines':[(text,x,y)]})
 old_count=len([t for t in original if t.tag=='{'+S+'}text']);idx=min(i for i,t in enumerate(original) if t.tag=='{'+S+'}text')
 for t in original:
  if t.tag=='{'+S+'}text':root.remove(t)
 roles=collections.Counter()
 for i,g in enumerate(groups):
  t=ET.Element('{'+S+'}text',dict(g['node'].attrib));t.set('id','text-'+str(i+1));role=g['key'][4];roles[role]+=1;t.set('data-feld',role+(f'-{roles[role]}' if roles[role]>1 else ''));t.set('x',str(g['lines'][0][1]));t.set('y',str(g['lines'][0][2]));previous=g['lines'][0][2]
  for value,x,y in g['lines']:
   sp=ET.SubElement(t,'{'+S+'}tspan',{'x':str(x),'dy':str(y-previous)});sp.text=value;previous=y
  root.insert(idx+i,t)
 root_text=''.join(''.join(t.itertext()).split() for t in []) if False else ''.join(''.join(t.itertext()) for t in root if t.tag=='{'+S+'}text')
 assert ''.join(root_text.split())==''.join(''.join(a[1].split()) for a in alltext)
 if old_count!=len(groups):merged+=1
 f.write_text(ET.tostring(root,encoding='unicode'),encoding='utf-8')

def check(f,key,p,holes,preview):
 global checked,image_checks,hint_checks
 root=ET.parse(f).getroot();checked+=1
 if root.get('viewBox')!=f'0 0 {p["widthMm"]} {p["heightMm"]}':fail(f,'Falsches Plattenmaß')
 contour=next((x for x in root if x.get('id')=='kontur'),None)
 if contour is None or contour.get('stroke')!='#0000ff':fail(f,'Kontur nicht blau')
 else:
  circles=[x for x in contour if x.tag.endswith('}circle')]
  if len(circles)!=len(holes):fail(f,'Falsche Anzahl Bohrungen')
  for c,h in zip(circles,holes):
   if any(abs(float(c.get(a))-v)>1e-7 for a,v in [('cx',h['x']),('cy',h['y']),('r',h['diameterMm']/2)]):fail(f,'Abweichendes Lochmaß')
 photos=[x for x in root if x.get('class')=='foto'];clips={x.get('id'):x for x in root.iter('{'+S+'}clipPath')};hints=[x for x in root if x.get('id','').startswith('upload-hinweis-')]
 if len(photos)!=len(source[key]['photos']):fail(f,'Foto fehlt')
 if preview and len(hints)!=len(photos):fail(f,'Upload-Hinweis fehlt')
 if not preview and hints:fail(f,'Upload-Hinweis im Gravurexport')
 hint_checks+=len(hints)
 for i,(photo,original) in enumerate(zip(photos,source[key]['photos']),1):
  im=photo.find('{'+S+'}image');uri=im.get('href');expected=original['sha256'];digest=photo_cache.get(uri)
  if digest is None:digest=hashlib.sha256(base64.b64decode(uri.split(',',1)[1])).hexdigest();photo_cache[uri]=digest
  if digest!=expected:fail(f,'Originalfoto nicht bytegleich')
  image_checks+=1;mask=clips['clip-foto-'+str(i)][0].get('d')
  if not mask_valid(original['originalMask'],mask):fail(f,'Originalmaske verändert oder verzerrt')
  if not placement_valid(im,mask,digest,p):fail(f,'Fotofläche außerhalb der Platte')
  pw,ph=original['px'];ar=float(im.get('width'))/float(im.get('height'))
  if abs(ar/(pw/ph)-1)>.002:fail(f,'Foto verzerrt')

assert len(selection)==60 and all(sum(d['theme']==t for d in selection)==30 for t in ['hunde','katzen'])
assert len(masters)==810 and len(results['results'])==2310 and not results['errors']
for group in set(m['group'] for m in masters):
 for theme in ['hunde','katzen']:
  want=0 if group=='knochen' and theme=='katzen' else 30
  assert sum(m['group']==group and m['theme']==theme for m in masters)==want
for m in masters:
 p=products[m['excelRow']];folder=OUT/m['path'];primary=next((v for v in m['variants'] if v['id']=='ohne'),m['variants'][0]);compact_text(folder/'design.svg');check(folder/'vorschau.svg',m['key'],p,primary['holes'],True);check(folder/'gravur.svg',m['key'],p,primary['holes'],False);check(folder/'design.svg',m['key'],p,primary['holes'],False)
for n,r in enumerate(results['results']):
 p=products[r['excelRow']];folder=OUT/r['path'];compact_text(folder/'design.svg');primary=next((v for v in r['variants'] if v['id']=='ohne'),r['variants'][0]);check(folder/'design.svg',r['key'],p,primary['holes'],False)
 for v in r['variants']:check(folder/v['preview'],r['key'],p,v['holes'],True);check(folder/v['engraving'],r['key'],p,v['holes'],False)
 if n%300==0:print('SVG geprüft',checked,flush=True)
report={'masters':len(masters),'sizeDerivations':len(results['results']),'svgFilesChecked':checked,'originalImagesChecked':image_checks,'uniqueEmbeddedImageBytes':len(photo_cache),'uploadHintsChecked':hint_checks,'maskTransformsChecked':len(mask_cache),'photoPlacementsChecked':len(placement_cache),'editableFilesCompacted':merged,'errors':errors,'nativeMaskImportReady':False}
(OUT/'qualitaetspruefung.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8');print(json.dumps(report,ensure_ascii=False))
if errors:raise SystemExit(1)
