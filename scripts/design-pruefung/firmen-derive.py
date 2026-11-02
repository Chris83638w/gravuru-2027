"""Derive existing compatible sizes; retain editable texts and vector motifs."""
import argparse,importlib.util,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('firmen',Path(__file__).with_name('firmen-transfer.py'));h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
v=h.v
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);a=ap.parse_args();root=a.katalog
 sizes={s['key']:s for s in v.read(root/'familien/edelstahl/steel-door-signs.json')['sizes']};count=0
 for series in v.read(root/h.ORDER/'reihen.json'):
  out=root/'designs'/series;manifest=[]
  for row in v.read(out/'index.json'):
   master=v.read(out/row['pfad']/'design.json');sw,sh=master['plateMm']
   for key in master['sizes']:
    target=sizes[key];w,ht=target['widthMm'],target['heightMm']
    if [w,ht]==[sw,sh]:continue
    assert abs((w/ht)/(sw/sh)-1)<=.01
    d=h.scale_design(master,w,ht);d['id']=re.sub(r'-[\d.]+x[\d.]+-D',f'-{w/10:g}x{ht/10:g}-D',master['id']);d['plate']['source']=key
    d.update(derived=True,varianteVon=master['id'],sizes=[key]);d['katalog']['key']=d['id'];d['masterSheet']={'base':d['id'].rsplit('-D',1)[0],'key':d['id'],'familySize':key,'plateMm':[w,ht]}
    s=min(w/sw,ht/sh);d['transfer']={'from':master['id'],'scale':s,'offsetMm':[(w-sw*s)/2,(ht-sh*s)/2],'decided':'2026-11-02','by':'Issue 85; vorhandene gleichproportionale Größen'}
    dest=out/'_groessen'/f'{w:g}x{ht:g}'/d['id'];v.write(dest/'design.json',d);(dest/'design.svg').write_text(v.svg(d),encoding='utf-8');manifest.append({'master':master['id'],'id':d['id'],'size':key,'path':dest.relative_to(out).as_posix()});count+=1
  v.write(out/'_groessen/index.json',manifest)
 print(f'{count} Ableitungen (SVG + JSON).')
if __name__=='__main__':main()
