"""Catalogue/data regression checks for the complete Issue 85 hint package."""
import argparse,importlib.util,re,collections,xml.etree.ElementTree as ET
from pathlib import Path
spec=importlib.util.spec_from_file_location('hints',Path(__file__).with_name('hinweise-transfer.py'));h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);a=ap.parse_args();root=a.katalog;order=root/h.ORDER;series=h.read(order/'reihen.json');mapping=h.read(order/'zuordnung.json');inventory=h.read(root/'designs/bestand/hinweisschilder/designs.json');family=h.read(root/'familien/edelstahl/steel-door-signs.json');sizes={s['key']:s for s in family['sizes']};fonts={f['name']:root/f['file'] for f in h.read(root/'schriften/schriften.json')['fonts'] if f.get('file')};masters={};derived=0;cap_warnings=[]
 assert len(mapping)==len(inventory)==453
 assert {m['sourceKey'] for m in mapping}=={r['key'] for r in inventory}
 assert len({m['sourceKey'] for m in mapping})==453
 for s in series:
  out=root/'designs'/s
  assert not list(out.rglob('*.png'))
  for entry in h.read(out/'index.json'):
   p=out/entry['pfad'];d=h.read(p/'design.json');assert d['id'] not in masters;masters[d['id']]=d
   assert d['id']==entry['key']==p.name and d['movable'] is True
   assert len(d['texts'])+len(d['motifs'])<=20 and not d['photos']
   assert len(d['ziele'])==3 and [t['familie'] for t in d['ziele']]==h.TARGETS and all(t['freigabe'] is None for t in d['ziele'])
   svg=ET.fromstring((p/'design.svg').read_text('utf-8'));assert not list(svg.iter('{http://www.w3.org/2000/svg}image'))
   elements=list(svg);assert len([e for e in elements if e.tag.endswith('text')])==len(d['texts'])
   assert len([e for e in elements if e.get('id','').startswith('motiv-')])==len(d['motifs'])
   w,ht=d['plateMm'];assert [sizes[d['sizes'][0]]['widthMm'],sizes[d['sizes'][0]]['heightMm']]==[w,ht]
   assert all(abs((sizes[k]['widthMm']/sizes[k]['heightMm'])/(w/ht)-1)<=.01 for k in d['sizes'])
   max_scale=max(min(sizes[k]['widthMm']/w,sizes[k]['heightMm']/ht) for k in d['sizes'])
   for t in d['texts']:
    assert t['font'] in fonts and fonts[t['font']].is_file();em=t['sizePt']*h.PT;assert 1<=em and em*max_scale<=100.001,(d['id'],t['text'],em,max_scale)
    assert t['text']!='_' and not re.fullmatch(r'1[0-9]{8}',t['text'])
    b=h.layout.bounds('H',fonts[t['font']],em);cap=b[3]-b[1]
    if cap<3:cap_warnings.append({'id':d['id'],'text':t['text'],'capHeightMm':round(cap,3),'smallestPlateMm':d['plateMm']})
   for m in d['motifs']:
    for pp in m['paths']:assert pp['fill'] in (None,'#000000') and pp['stroke'] in (None,'#000000') and pp['evenodd'] is True;assert h.box(pp['d'])
  for entry in h.read(out/'_groessen/index.json'):
   d=h.read(out/entry['path']/'design.json');master=masters[entry['master']];assert d['derived'] and d['varianteVon']==master['id'];assert len(d['texts'])==len(master['texts']) and len(d['motifs'])==len(master['motifs']);assert [t['text'] for t in d['texts']]==[t['text'] for t in master['texts']];derived+=1
 for m in mapping:assert m['target'] is None or m['target'] in masters
 # A canonical ID outside this package is never silently overwritten/duplicated.
 for p in (root/'designs').glob('*/*/design.json'):
  if p.parent.parent.name in series:continue
  d=h.read(p);assert d.get('id') not in masters,('canonical collision',p)
 result={'sources':len(mapping),'masters':len(masters),'derived':derived,'targets':len(masters)*3,'openSources':[m['sourceKey'] for m in mapping if m['target'] is None],'newDesigns':[d['id'] for d in masters.values() if d['mode']=='neu'],'fonts':sorted({f for d in masters.values() for f in d['fonts']}),'capHeightBelow3mm':len(cap_warnings)}
 h.write(order/'datenpruefung.json',result);h.write(order/'schriftgroessen-pruefen.json',cap_warnings);print(result)
if __name__=='__main__':main()
