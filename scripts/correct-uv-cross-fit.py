"""Audited 0.04 mm circle/frame clearance correction; retain immutable R1 source."""
import argparse,copy,json,shutil
from pathlib import Path
import xml.etree.ElementTree as E
from fontTools.misc.transform import Transform
from fontTools.svgLib.path import parse_path
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.svgPathPen import SVGPathPen
E.register_namespace('','http://www.w3.org/2000/svg');E.register_namespace('xlink','http://www.w3.org/1999/xlink');E.register_namespace('inkscape','http://www.inkscape.org/namespaces/inkscape')
def move_path(e):
 p=SVGPathPen(None);parse_path(e.get('d'),TransformPen(p,Transform().translate(0,.04)));e.set('d',p.getCommands())
arg=argparse.ArgumentParser();arg.add_argument('catalog',type=Path);a=arg.parse_args()
for series in a.catalog.glob('designs/uv-gedenkkreuze-*'):
 if not series.is_dir():continue
 for folder in series.iterdir():
  if not folder.is_dir():continue
  mf=folder/'design.json';m=json.loads(mf.read_text('utf-8'));sv=folder/'design.svg';root=E.parse(sv).getroot()
  # Use the established field family for names/dates across design changes.
  for el in root:
   if el.get('data-feld') in ['lebensdaten','geburtsjahr','sterbejahr']:el.set('data-feld',{'lebensdaten':'daten','geburtsjahr':'daten-1','sterbejahr':'daten-2'}[el.get('data-feld')])
  if series.name.endswith('11x20') and m['sourceDesignId'] in ['UV-H-F03','UV-K-F03'] and 'nativeFitAdjustment' not in m:
   for el in root.findall("{*}defs/{*}clipPath[@id='PHOTO_CLIP_1']/{*}path"):move_path(el)
   photo=root.find("{*}g[@id='foto-1']");v=list(map(float,photo.get('data-upload-window').split()));v[1]+=.04;photo.set('data-upload-window',' '.join(map(str,v)))
   for el in photo:
    if el.tag.endswith('path'):move_path(el)
    if el.tag.endswith('image'):el.set('y',str(float(el.get('y'))+.04))
   for el in root.findall("{*}g[@id='motiv-1']/{*}path"):move_path(el)
   shutil.copy2(folder/'druck-master.svg',folder/'druck-master-R1.svg')
   for file in ['druck-master.svg','RDG_WHITE.svg']:
    pr=E.parse(folder/file).getroot()
    for el in pr.iter():
     if el.get('id') in ['WHITE-PHOTO','Fotorahmen']:el.set('transform','translate(0 0.04)')
     if el.get('id')=='PHOTO_UPLOAD_1':el.set('y',str(float(el.get('y'))+.04))
     if el.get('id')=='PHOTO_CLIP_1':
      for child in el:move_path(child)
    md=pr.find('{*}metadata')
    if md is not None:
     v=json.loads(md.text);v['svgRevision']='R1a';v['nativeFitAdjustment']={'photoAndFrameDyMm':.04,'reason':'Strict 2 mm native contour margin'};md.text=json.dumps(v,ensure_ascii=False)
    E.ElementTree(pr).write(folder/file,encoding='utf-8',xml_declaration=True)
   m['source']['file']='druck-master-R1.svg';m['nativeFitAdjustment']={'photoAndFrameDyMm':.04,'reason':'Kreisrahmen lag bei 1,98 mm; unverzerrt 0,04 mm nach unten, jetzt 2,02 mm. R1-Quelle erhalten.'};m['svgRevision']='R1a'
  E.ElementTree(root).write(sv,encoding='utf-8',xml_declaration=True)
  mf.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Native date-field mapping applied; two 11x20 photo/frame pairs shifted by 0.04 mm.')
