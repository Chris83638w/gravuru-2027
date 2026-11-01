#!/usr/bin/env python3
"""Explicit proportional derivatives of round delivery-form-2 masters.
Only family-listed sizes of the same circle form; never new catalogue sizes.
Files live below _groessen, outside the master loader's two-level search.
No whole-design flattening: actual texts and individual motif paths remain.
"""
import argparse,copy,importlib.util,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('round_layout',HERE/'design-pruefung/rund-studien.py')
layout=importlib.util.module_from_spec(spec);spec.loader.exec_module(layout)
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(d,ensure_ascii=False,indent=1)+'\n').encode('utf-8'))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--reihe',required=True);a=ap.parse_args()
 root=a.katalog;series=root/'designs'/a.reihe;assert series.resolve().is_relative_to((root/'designs').resolve())
 family=read(root/'familien/edelstahl/steel-door-signs.json');sizes={s['key']:s for s in family['sizes'] if s['groupKey']=='R'};manifest=[]
 for row in read(series/'index.json'):
  source=read(series/row['pfad']/'design.json');assert source['form']=='Rund' and not source.get('photos')
  sw,sh=source['plateMm'];assert sw==sh
  for key in source['sizes']:
   target=sizes[key];w,h=target['widthMm'],target['heightMm'];assert w==h
   if w==sw:continue
   factor=w/sw;d=copy.deepcopy(source);fmt=f'{w/10:g}x{h/10:g}';d['id']=re.sub(r'-[\d.]+x[\d.]+-D',f'-{fmt}-D',source['id']);d['plateMm']=[w,h];d['plate'].update(widthMm=w,heightMm=h,source=f'{source["id"]}, proportionaler Faktor {factor:g}')
   for t in d['texts']:
    t['anchorMm']=[v*factor for v in t['anchorMm']];t['sizePt']*=factor;t['lineHeightMm']*=factor;t['letterSpacingMm']*=factor
   for m in d['motifs']:
    x,y,mw,mh=m['box'];layout.place_motif(m,[(x+mw/2)*factor,(y+mh/2)*factor,mw*factor,mh*factor])
   d['varianteVon']=source['id'];d['sizes']=[key];d['masterSheet']={'base':d['id'].rsplit('-D',1)[0],'key':d['id'],'familySize':key,'plateMm':[w,h]}
   d['transfer']={'from':source['id'],'fromKey':source['id'],'scale':factor,'offsetMm':[0,0],'decided':'2026-11-01','by':'Issue 85 Nachricht 4; TR durch Chris bestätigt'}
   d['derived']=True;d['katalog']['key']=d['id'];dest=series/'_groessen'/f'{w:g}x{h:g}'/d['id'];write(dest/'design.json',d);(dest/'design.svg').write_bytes(layout.svg(d).encode('utf-8'));manifest.append({'master':source['id'],'id':d['id'],'size':key,'factor':factor,'path':str(dest.relative_to(series)).replace('\\','/')})
 write(series/'_groessen/index.json',manifest);print(f'{len(manifest)} abgeleitete Größen, keine zusätzlichen Master.')
if __name__=='__main__':main()
