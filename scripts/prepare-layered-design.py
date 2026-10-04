"""Prepare reviewed layered SVG sources; never infer editability from arbitrary PDF paths.

A small explicit mapping defines text roles/fonts and the photo rectangle. The
parser checks that the selected layer has the expected canonical arch mask.
Unmapped text/photos, transforms, scripts and unsupported masks fail closed.
No source scripts are executed. No generated package belongs in Git.
"""
import argparse, base64, copy, hashlib, importlib.util, json, math, os, re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('converter',ROOT/'app/workshop/design-converter.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
NS='{http://www.w3.org/2000/svg}'

def prepare(source,mapping):
 raw=source.read_bytes();c.require(len(raw)<=c.MAX_INPUT,'Quelldatei ist zu groß.')
 c.require(not re.search(br'<!DOCTYPE|<!ENTITY',raw,re.I),'XML-Entitäten sind nicht erlaubt.')
 root=ET.fromstring(raw)
 c.require(root.tag==NS+'svg','Eine SVG-Datei wird benötigt.')
 w,_=c.dimension(root.get('width',''));h,_=c.dimension(root.get('height',''))
 c.require(list(map(float,root.get('viewBox','').split()))==[0,0,w,h],'SVG-Koordinaten müssen mm entsprechen.')
 c.require(len(list(root.iter()))<1000,'Zu viele SVG-Knoten.')
 for e in root.iter():
  c.require(not any(a.rsplit('}',1)[-1].lower().startswith('on') for a in e.attrib),'Skriptereignisse sind nicht erlaubt.')
  c.require('transform' not in e.attrib and 'style' not in e.attrib,'Transformation/Stil zuerst ausdrücklich auflösen.')
  c.require(e.tag.rsplit('}',1)[-1] not in ['script','foreignObject','use'],'Aktive oder referenzierte Inhalte werden nicht übernommen.')
 texts=mapping['textLayers'];photo=mapping['photo'];layers=[];found=set()
 for layer in root:
  tag=layer.tag.rsplit('}',1)[-1]
  if tag=='defs':continue
  c.require(tag=='g' and layer.get('id'),'Jede Gestaltungsebene braucht eine Kennung.')
  layer_id=layer.get('id');nodes=list(layer.iter())
  if layer_id==photo['layerId']:
   found.add(layer_id)
   c.require(sum(e.tag==NS+'image' for e in nodes)==1 and all(e.tag in [NS+'g',NS+'image'] for e in nodes),'Fotoebene muss genau ein Foto enthalten.')
   image=next(e for e in nodes if e.tag==NS+'image');c.raster(image.get('href',''))
   x,y,pw,ph=[photo[k] for k in ['x','y','width','height']]
   c.require(all(isinstance(v,(int,float)) and math.isfinite(v) for v in [x,y,pw,ph]) and pw>0 and ph>=pw/2,'Ungültige Fotomaske.')
   clip=next((e.get('clip-path') for e in nodes if e.get('clip-path')),None)
   c.require(clip and re.fullmatch(r'url\(#[\w-]+\)',clip),'Fotomaske fehlt.')
   mask=root.find('.//'+NS+'clipPath[@id="'+clip[5:-1]+'"]')
   c.require(mask is not None and len(mask)==1 and mask[0].tag==NS+'path','Bogenpfad fehlt.')
   # Canonical semicircle using the source's cubic command layout. Reject custom paths.
   d=mask[0].get('d','');commands=re.findall('[A-Za-z]',d)
   values=[float(v) for v in re.findall(c.NUMBER,d)]
   r=pw/2;k=r*.5522847498307936
   expected=[x,y+ph,y+r,x,y+r-k,x+r-k,y,x+r,y,x+r+k,y,x+pw,y+r-k,x+pw,y+r,y+ph]
   c.require(commands==list('MVCCVZ') and len(values)==len(expected) and all(abs(a-b)<.002 for a,b in zip(values,expected)),'Die Bogenmaske weicht vom freigegebenen Format ab.')
   layers.append(dict(id='customer-'+photo['fieldKey'],type='photoSlot',label=photo['label'],fieldKey=photo['fieldKey'],x=x+pw/2,y=y+ph/2,widthMm=pw,heightMm=ph,shape='arch',required=True))
  elif layer_id in texts:
   found.add(layer_id);cfg=texts[layer_id]
   c.require(len(layer)==1 and layer[0].tag==NS+'text' and not len(layer[0]),'Textfeld muss ein einfacher Text sein.')
   t=layer[0];c.require(t.get('text-anchor')=='middle','Nur mittig verankerte Textfelder unterstützt.')
   family=t.get('font-family');c.require(family in mapping['fonts'],'Schriftzuordnung fehlt.')
   size=float(t.get('font-size'));spacing=float(t.get('letter-spacing','0'))
   layers.append(dict(id='customer-'+cfg['fieldKey'],type='text',label=cfg['label'],fieldKey=cfg['fieldKey'],x=float(t.get('x')),y=float(t.get('y'))-.35*size,text=t.text,font=mapping['fonts'][family],size=size,letterSpacing=spacing,color=t.get('fill'),allowColor=cfg.get('allowColor',False)))
  else:
   c.require(not any(e.tag==NS+'text' for e in nodes),'Nicht zugeordnetes Textfeld: '+layer_id)
   r=ET.Element(NS+'svg',{'width':str(w)+'mm','height':str(h)+'mm','viewBox':f'0 0 {w} {h}'})
   copied=copy.deepcopy(layer)
   for e in copied.iter():
    for attr in list(e.attrib):
     if attr in ['{http://www.inkscape.org/namespaces/inkscape}groupmode','{http://www.inkscape.org/namespaces/inkscape}label']:del e.attrib[attr]
   r.append(copied)
   svg=c.sanitize_svg(ET.tostring(r))['svg']
   # Standalone sanitizer rejects unsupported external references and unbound masks.
   layers.append(dict(id='art-'+layer_id,type='artwork',name=layer_id+'.svg',bytes=base64.b64encode(svg.encode()).decode()))
 c.require(found==set(texts)|{photo['layerId']},'Zuordnung und tatsächliche Ebenen unterscheiden sich.')
 c.require(len(layers)<=20,'Höchstens 20 Ebenen.')
 return dict(schema='gravuru-prepared-design/v1',designId=mapping['designId'],name=mapping['name'],widthMm=w,heightMm=h,sourceSha256=hashlib.sha256(raw).hexdigest(),layers=layers)

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--source',type=Path,required=True);a.add_argument('--mapping',type=Path,required=True);a.add_argument('--output',type=Path,required=True);args=a.parse_args()
 result=prepare(args.source,json.loads(args.mapping.read_text()))
 with os.fdopen(os.open(args.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as f:json.dump(result,f,ensure_ascii=False,separators=(',',':'))
 print(json.dumps({'schema':result['schema'],'layers':len(result['layers']),'fields':sum(l['type']!='artwork' for l in result['layers']),'sourceSha256':result['sourceSha256']}))
