"""Check source coverage, editable objects, fonts and actual target-size geometry."""
import argparse,importlib.util,re,xml.etree.ElementTree as ET
from pathlib import Path
spec=importlib.util.spec_from_file_location('firmen',Path(__file__).with_name('firmen-transfer.py'));h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
v=h.v
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);a=ap.parse_args();root=a.katalog;order=root/h.ORDER
 series=v.read(order/'reihen.json');mapping=v.read(order/'zuordnung.json');inventory=v.read(root/'designs/bestand/firmenschilder/designs.json');masters={};derived=0
 sizes={s['key']:s for s in v.read(root/'familien/edelstahl/steel-door-signs.json')['sizes']};fonts={f['name']:root/f['file'] for f in v.read(root/'schriften/schriften.json')['fonts'] if f.get('file')}
 assert len(mapping)==len(inventory)==len({m['source'] for m in mapping})==107
 assert {m['source'] for m in mapping}=={r['key'] for r in inventory}
 for s in series:
  out=root/'designs'/s;assert not list(out.rglob('*.png'))
  for entry in v.read(out/'index.json'):
   p=out/entry['pfad'];d=v.read(p/'design.json');assert d['id'] not in masters;masters[d['id']]=d
   assert d['id']==entry['key']==p.name and d['movable'] is True
   assert 1<=len(d['texts']) and len(d['texts'])+len(d['motifs'])<=20 and not d['photos']
   assert [t['familie'] for t in d['ziele']]==h.TARGETS and all(t['freigabe'] is None for t in d['ziele'])
   svg=ET.fromstring((p/'design.svg').read_text('utf-8'));assert not list(svg.iter('{http://www.w3.org/2000/svg}image'))
   assert len([e for e in svg if e.tag.endswith('text')])==len(d['texts'])
   assert len([e for e in svg if e.get('id','').startswith('motiv-')])==len(d['motifs'])
   w,ht=d['plateMm'];assert [sizes[d['sizes'][0]]['widthMm'],sizes[d['sizes'][0]]['heightMm']]==[w,ht]
   assert all(abs((sizes[k]['widthMm']/sizes[k]['heightMm'])/(w/ht)-1)<=.01 for k in d['sizes'])
   assert 1<=len(d['fonts'])<=3 and set(d['fonts'])=={t['font'] for t in d['texts']}
   for t in d['texts']:
    assert t['font'] in fonts and fonts[t['font']].is_file();em=t['sizePt']*v.PT
    assert t['text']!='_' and not re.fullmatch(r'1[0-9]{8}',t['text'])
    b=v.bounds('H',fonts[t['font']],em);assert b[3]-b[1]>=2.99,(d['id'],t['text'],b[3]-b[1])
    for key in d['sizes']:
     size=sizes[key];scale=min(size['widthMm']/w,size['heightMm']/ht);assert 1<=em*scale<=100.001,(d['id'],t['text'],em*scale,key)
   for m in d['motifs']:
    for pp in m['paths']:assert pp['fill'] in (None,'#000000') and pp['stroke'] in (None,'#000000');assert v.box(pp['d'])
  for e in v.read(out/'_groessen/index.json'):
   d=v.read(out/e['path']/'design.json');master=masters[e['master']];assert d['derived'] and d['varianteVon']==master['id'];assert len(d['motifs'])==len(master['motifs']);assert [t['text'] for t in d['texts']]==[t['text'] for t in master['texts']];derived+=1
 for m in mapping:
  if m['status']=='bereits vorhanden':
   for t in m['targets']:assert (root/'designs'/t['series']/t['id']/'design.json').is_file()
  else:assert m['target'] in masters
 for p in (root/'designs').glob('*/*/design.json'):
  if p.parent.parent.name not in series:assert v.read(p).get('id') not in masters,('canonical collision',p)
 result={'sources':len(mapping),'masters':len(masters),'derived':derived,'targets':len(masters)*3,'reusedSourceRecords':sum(m['status']=='bereits vorhanden' for m in mapping),'newDesigns':[d['id'] for d in masters.values() if d['mode']=='neu'],'fonts':sorted({f for d in masters.values() for f in d['fonts']}),'minCapitalHeightMm':2.99,'rasterDesigns':0}
 v.write(order/'datenpruefung.json',result);print(result)
if __name__=='__main__':main()
