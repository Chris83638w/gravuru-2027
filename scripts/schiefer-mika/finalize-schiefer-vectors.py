from pathlib import Path
import os
import json,re,xml.etree.ElementTree as ET,hashlib
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
ROOT=Path(os.environ.get('GRAVURU_PROJECT_ROOT',Path(__file__).resolve().parent.parent))
OUT=ROOT/'outputs/schiefer-alle-groessen'
report=json.loads((OUT/'ergebnis.json').read_text(encoding='utf-8'))
ns={'s':'http://www.w3.org/2000/svg'}
ET.register_namespace('','http://www.w3.org/2000/svg')
cache={};corrections=[];failures=[];checked=0
BASE=ROOT/'outputs/schiefer-30-hunde-30-katzen'
sourceNames={}
for entry in json.loads((BASE/'manifest.json').read_text(encoding='utf-8')):
 d=json.loads((Path(entry['folder'])/'design.json').read_text(encoding='utf-8'));ts=d['texts']
 candidates=[t for t in ts if '\n' not in t['text'] and len(t['text'].strip().split())==1 and len(t['text'].strip())>1 and not re.search(r'\d',t['text']) and t['text'].strip() not in ['Geliebt','Unvergessen','Liebevoll','Treu','Dich','†','Wir']]
 name=next((t for t in ts if t.get('role')=='name'),None) or max(candidates or ts,key=lambda t:t['sizePt'])
 sourceNames[entry['id']]=name['text']
def field_roles(filename,name):
 tree=ET.parse(filename);counts={}
 for t in tree.getroot().findall('s:text',ns):
  text=''.join(t.itertext()).strip();role='name' if text==name else 'daten' if re.search(r'\d',text) else 'spruch'
  counts[role]=counts.get(role,0)+1;t.set('data-feld',role if counts[role]==1 else role+'-'+str(counts[role]))
 tree.write(filename,encoding='unicode')
for m in json.loads((OUT/'master-index.json').read_text(encoding='utf-8')):
 folder=Path(m['path']);name=sourceNames[m['id']];d=json.loads((folder/'design.json').read_text(encoding='utf-8'))
 for t in d['texts']:
  if t['text']==name:t['role']='name'
 (folder/'design.json').write_text(json.dumps(d,ensure_ascii=False,indent=1),encoding='utf-8')
 field_roles(folder/'design.svg',name)
for r in report['results']:field_roles(Path(r['folder'])/'design.svg',sourceNames[r['id']])
import sys
if '--fields-only' in sys.argv:
 print('Namens-/Datumsfelder der Lieferdateien geprüft und eindeutig zugeordnet.')
 sys.exit(0)
# Die einzige in der Schriftkonturprüfung gefundene kleine Überhöhung wird am editierbaren Feld korrigiert.
for r in report['results']:
 if r['excelRow']==42 and r['id']=='GT-S-22x14-D287':
  f=Path(r['folder'])/'design.svg';tree=ET.parse(f);changed=False
  for t in tree.getroot().findall('s:text',ns):
   if 'Regenbogenbrücke.' in ''.join(t.itertext()) and t.get('data-y-korrigiert')!='ja':t.set('y',str(float(t.get('y'))-.35));t.set('data-y-korrigiert','ja');changed=True
  if changed:tree.write(f,encoding='unicode')

files={}
for r in report['results']:
 for filename in ['kontrollansicht.svg']+[v['file'] for v in r['variants']]:files[str(Path(r['folder'])/filename)]=r['sizeMm']
for m in json.loads((OUT/'master-index.json').read_text(encoding='utf-8')):
 d=json.loads((Path(m['path'])/'design.json').read_text(encoding='utf-8'));files[str(Path(m['path'])/'kontrollansicht.svg')]=d['plateMm']
for filename,(w,h) in files.items():
 tree=ET.parse(filename);root=tree.getroot();defs={}
 for p in root.findall('.//s:defs/s:path',ns):
  d=p.get('d','')
  if d not in cache:
   pen=BoundsPen(None)
   if d:parse_path(d,pen)
   cache[d]=pen.bounds
  defs[p.get('id')]=cache[d]
 lines={}
 for el in root.findall('s:use',ns):
  m=re.match(r'translate\(([-.\d]+) ([-.\d]+)\) scale\(([-.\d]+) ([-.\d]+)\)',el.get('transform',''))
  b=defs.get(el.get('href','')[1:])
  if not m or not b:continue
  x,y,sx,sy=map(float,m.groups());box=[x+b[0]*sx,y+b[3]*sy,x+b[2]*sx,y+b[1]*sy]
  lines.setdefault((y,sx,sy),[]).append((el,x,y,sx,sy,box))
 changed=False
 for key,items in lines.items():
  boxes=[i[-1] for i in items];b=[min(x[0] for x in boxes),min(x[1] for x in boxes),max(x[2] for x in boxes),max(x[3] for x in boxes)]
  dx=.1-b[0] if b[0]<-.01 else w-.1-b[2] if b[2]>w+.01 else 0
  dy=.1-b[1] if b[1]<-.01 else h-.1-b[3] if b[3]>h+.01 else 0
  if dx or dy:
   if b[2]-b[0]>w-.1 or b[3]-b[1]>h-.1:failures.append({'file':filename,'box':b});continue
   for el,x,y,sx,sy,box in items:el.set('transform',f'translate({x+dx:.5f} {y+dy:.5f}) scale({sx:.9f} {sy:.9f})')
   corrections.append({'file':str(Path(filename).relative_to(OUT)),'shiftMm':[round(dx,5),round(dy,5)]});changed=True
 if changed:tree.write(filename,encoding='unicode')
 checked+=1
(OUT/'vektor-endpruefung.json').write_text(json.dumps({'checkedSVG':checked,'fontContourCorrections':corrections,'errors':failures,'note':'Nur Schriftkontur-Überstände auf der tatsächlichen Platte korrigiert; keine Schrift, kein Motiv und kein Lochmaß geändert.'},ensure_ascii=False,indent=2),encoding='utf-8')
print('Vektordateien:',checked,'kleine Schriftkonturkorrekturen:',len(corrections),'Fehler:',len(failures))
