"""Read-only source audit; no catalogue mutation."""
import argparse,json,html,xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter

def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args()
 base=a.katalog/'designs/bestand/hinweisschilder';rows=read(base/'designs.json');data=[];cards=[]
 for row in rows:
  folder=base/row['path'];d=read(folder/'design.json');w,h=d['plate']['widthMm'],d['plate']['heightMm']
  texts=[t for t in d['texts'] if not t.get('hint') and t['box'][1]+t['box'][3]>0 and t['box'][1]<h]
  item={'key':row['key'],'id':d['id'],'path':row['path'],'series':row['series'],'size':[w,h],'form':d['form'],'texts':texts,'images':len(d.get('images',[])),'photoFiles':d.get('photoFiles',[])};data.append(item)
  if '-V2A-' not in row['key'] and row['series'] not in ['HSH-A','HSH-KS','HSH-S','HSHF-S','HSHO-KS']:continue
  svg=(folder/'design.svg').read_text(encoding='utf-8');svg=svg.replace('fill="#ffffff"','fill="#000000"').replace('fill="#b3b3b3"','fill="#000000"')
  cards.append('<article><h2>'+html.escape(row['key'])+'</h2><p>'+str(w)+' × '+str(h)+' · '+d['form']+'</p>'+svg+'<small>'+html.escape(' / '.join(t['text'] for t in texts))+'</small></article>')
 a.out.mkdir(parents=True,exist_ok=True);(a.out/'inventory.json').write_text(json.dumps(data,ensure_ascii=False,indent=1),encoding='utf-8')
 head='<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;background:#eee;margin:20px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}article{padding:10px;background:white}h2{font-size:15px}svg{width:100%;height:150px}small{white-space:pre-line}nav{position:sticky;top:0;background:white;padding:10px}a{padding:10px}</style><nav>'
 pages=[cards[i:i+20] for i in range(0,len(cards),20)]
 for i,p in enumerate(pages):
  (a.out/f'source-{i+1}.html').write_text(head+''.join(f'<a href="source-{j+1}.html">{j+1}</a>' for j in range(len(pages)))+'</nav><main>'+''.join(p)+'</main>',encoding='utf-8')
 print(json.dumps({'sources':len(data),'gallery':len(cards),'pages':len(pages),'images':sum(i['images'] for i in data),'photoFiles':sum(len(i['photoFiles']) for i in data),'series':dict(Counter(i['series'] for i in data))}))
if __name__=='__main__':main()
