"""Proportional hint-sign derivatives, preserving real text and motif layers."""
import argparse,copy,importlib.util,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('hints',Path(__file__).with_name('hinweise-transfer.py'));h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);a=ap.parse_args();root=a.katalog;family=h.read(root/'familien/edelstahl/steel-door-signs.json');sizes={s['key']:s for s in family['sizes']};count=0
 for series in h.read(root/h.ORDER/'reihen.json'):
  out=root/'designs'/series;manifest=[]
  for row in h.read(out/'index.json'):
   master=h.read(out/row['pfad']/'design.json');sw,sh=master['plateMm']
   for key in master['sizes']:
    target=sizes[key];w,ht=target['widthMm'],target['heightMm']
    if [w,ht]==[sw,sh]:continue
    assert abs((w/ht)/(sw/sh)-1)<=.01
    # The family contains rounded decimal sizes (80×53.3, 70×23.3): contain,
    # never independent x/y stretching, matching the native target preview.
    s=min(w/sw,ht/sh);ox=(w-sw*s)/2;oy=(ht-sh*s)/2;d=copy.deepcopy(master)
    d['id']=re.sub(r'-[\d.]+x[\d.]+-D',f'-{w/10:g}x{ht/10:g}-D',master['id']);d['plateMm']=[w,ht];d['plate'].update(widthMm=w,heightMm=ht,source=key)
    for t in d['texts']:
     t['anchorMm']=[t['anchorMm'][0]*s+ox,t['anchorMm'][1]*s+oy];t['sizePt']*=s;t['lineHeightMm']*=s;t['letterSpacingMm']*=s
     if 'sizeMm' in t:t['sizeMm']*=s
    for m in d['motifs']:
     for p in m['paths']:p['d']=h.transform(p['d'],s,ox,oy);p['strokeMm']*=s
     m['box']=h.union([h.box(p['d']) for p in m['paths']])
    d['derived']=True;d['varianteVon']=master['id'];d['sizes']=[key];d['katalog']['key']=d['id'];d['masterSheet']={'base':d['id'].rsplit('-D',1)[0],'key':d['id'],'familySize':key,'plateMm':[w,ht]};d['transfer']={'from':master['id'],'fromKey':master['id'],'scale':s,'offsetMm':[ox,oy],'decided':'2026-11-01','by':'Issue 85; gültige Größen aus steel-door-signs'}
    dest=out/'_groessen'/f'{w:g}x{ht:g}'/d['id'];h.write(dest/'design.json',d);(dest/'design.svg').write_text(h.svg(d),encoding='utf-8');manifest.append({'master':master['id'],'id':d['id'],'size':key,'path':dest.relative_to(out).as_posix()});count+=1
  if (out/'_groessen/index.json').exists():
   keep={m['path'] for m in manifest}
   for old in h.read(out/'_groessen/index.json'):
    if old['path'] not in keep:h.remove_generated_pair(out/old['path'],out)
  h.write(out/'_groessen/index.json',manifest)
 print(f'{count} proportional abgeleitete SVG/JSON-Designs; keine zusätzlichen Master.')
if __name__=='__main__':main()
