"""Read-only inventory for Issue 85 / 62. Source numbers are not deduplication keys."""
import argparse, json, collections, re
from pathlib import Path
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args()
 base=a.katalog/'designs/bestand/firmenschilder';rows=read(base/'designs.json');items=[]
 for r in rows:
  p=base/r['path'];d=read(p/'design.json');w,h=d['plate']['widthMm'],d['plate']['heightMm']
  ts=[t for t in d['texts'] if not t.get('hint') and t['box'][1]>=0 and t['box'][1]<h and t['text'].strip() and not re.fullmatch(r'1\d{8}',t['text'].strip())]
  items.append({'key':r['key'],'path':p.relative_to(a.katalog).as_posix(),'id':d['id'],'number':r['designNo'],'series':r['series'],'plate':[w,h],'texts':ts,'motifs':[{k:v for k,v in m.items() if k!='d'} for m in d['motifs']],'images':len(re.findall(r'<image\b',(p/'design.svg').read_text(encoding='utf-8'))),'photo':r.get('photo'),'photoFiles':r.get('photoFiles'),'fonts':sorted({t['font'] for t in ts})})
 existing=[]
 for p in (a.katalog/'designs').glob('*/index.json'):
  for row in read(p):
   if 'FS-' in str(row.get('quelle','')):existing.append({'series':p.parent.name,'id':row['key'],'source':row['quelle']})
 a.out.mkdir(parents=True,exist_ok=True);(a.out/'inventory.json').write_text(json.dumps({'sources':items,'existing':existing},ensure_ascii=False,indent=1),encoding='utf-8')
 print(json.dumps({'sources':len(items),'existing':len(existing),'fonts':sorted({f for r in items for f in r['fonts']}),'images':sum(r['images'] for r in items),'series':dict(collections.Counter(r['series'] for r in items))},ensure_ascii=False))
 for r in items:
  if r['series']=='FS-V2A' or r['number']==0:print(r['key'],r['plate'],len(r['texts']),len(r['motifs']),r['texts'][0]['text'] if r['texts'] else 'KEIN TEXT')
if __name__=='__main__':main()
