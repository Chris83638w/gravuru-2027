from pathlib import Path
import hashlib,json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'outputs/schiefer-foto-alle-groessen';S='http://www.w3.org/2000/svg';ET.register_namespace('',S)
masters=json.loads((OUT/'master-index.json').read_text('utf-8'));rows=json.loads((OUT/'ergebnis.json').read_text('utf-8'))['results'];changes=[]
for item in masters+rows:
 f=OUT/item['path']/'design.svg';root=ET.parse(f).getroot()
 images=[dict(x.attrib) for x in root.iter('{'+S+'}image')]
 paths=[dict(x.attrib) for x in root.iter('{'+S+'}path')]
 text=[''.join(x.itertext()) for x in root.iter('{'+S+'}text')]
 changed=False;grouped=False
 for p in root.iter('{'+S+'}path'):
  d=p.get('d','')
  if d.startswith('M0'):p.set('d','M '+d[1:]);changed=True
 # Die zusammengehörige Schmetterlingswolke ist ein Motiv mit allen Originalpfaden.
 # Dies erhält die Pfade und umgeht keine Elementgrenze durch verlorene Inhalte.
 if item['key'].endswith('rechteck-D216'):
  motifs=[x for x in root if x.get('id','').startswith('motiv-') and x.tag=='{'+S+'}path']
  if len(motifs)>10:
   idx=list(root).index(motifs[0]);group=ET.Element('{'+S+'}g',{'id':'motiv-schmetterlingswolke'})
   for m in motifs:root.remove(m);group.append(m)
   root.insert(idx,group);changed=True;grouped=True
 if not changed:continue
 assert images==[dict(x.attrib) for x in root.iter('{'+S+'}image')]
 after=[dict(x.attrib) for x in root.iter('{'+S+'}path')]
 for a in paths:
  if a.get('d','').startswith('M0'):a['d']='M '+a['d'][1:]
 assert after==paths
 assert text==[''.join(x.itertext()) for x in root.iter('{'+S+'}text')]
 f.write_text(ET.tostring(root,encoding='unicode'),'utf-8')
 changes.append({'file':f.relative_to(OUT).as_posix(),'groupedButterflies':grouped,'photoBytesUnchanged':True,'pathGeometryUnchanged':True,'textUnchanged':True,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(OUT/'editierstruktur-pruefung.json').write_text(json.dumps({'files':len(changes),'errors':[],'changes':changes},ensure_ascii=False,indent=2),'utf-8')
print('Editierstruktur semantisch unverändert:',len(changes),'Dateien')
