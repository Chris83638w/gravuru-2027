"""Approximate own generated dog drawings as monochrome vectors; originals stay local."""
import argparse,json,hashlib,re,tempfile
from pathlib import Path
import xml.etree.ElementTree as ET
import vtracer
from PIL import Image
from svgpathtools import parse_path
ap=argparse.ArgumentParser();ap.add_argument('--sources',type=Path,required=True);ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--breed');a=ap.parse_args()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
dest=a.katalog/'motive-eigene/hunde-vielfalt-20261102';dest.mkdir(parents=True,exist_ok=True)
manifest=dest/'herkunft.json';records=json.loads(manifest.read_text(encoding='utf8')) if manifest.exists() else []
for src in sorted(a.sources.glob('*/??-source.png')):
 if a.breed and src.parent.name!=a.breed:continue
 breed=src.parent.name;variant=int(src.name[:2]);key=f'hunde-vielfalt-{breed}-{variant:02d}';target=dest/breed/f'{variant:02d}.svg';target.parent.mkdir(parents=True,exist_ok=True)
 old=next((r for r in records if r['key']==key),None)
 if old and target.exists() and old['sourceSha256']==sha(src) and old['svgSha256']==sha(target) and old.get('traceRevision')==2:continue
 with tempfile.TemporaryDirectory() as temp:
  binary=Path(temp)/'binary.png'
  Image.open(src).convert('L').point(lambda p:0 if p<200 else 255).save(binary)
  traced=Path(temp)/'trace.svg';vtracer.convert_image_to_svg_py(str(binary),str(traced),colormode='binary',mode='spline',filter_speckle=4,corner_threshold=60,length_threshold=3,max_iterations=10,splice_threshold=45,path_precision=3)
  paths=[]
  for e in ET.parse(traced).getroot().iter('{http://www.w3.org/2000/svg}path'):
   p=parse_path(e.get('d'));t=e.get('transform','')
   if t:
    m=re.fullmatch(r'translate\(([-.\d]+)[ ,]+([-.\d]+)\)',t);assert m,t;p=p.translated(complex(float(m[1]),float(m[2])))
   paths.append(p)
  bounds=[p.bbox() for p in paths];x0=min(b[0] for b in bounds);x1=max(b[1] for b in bounds);y0=min(b[2] for b in bounds);y1=max(b[3] for b in bounds)
  scale=190/max(x1-x0,y1-y0);delta=complex(100-(x0+x1)*scale/2,100-(y0+y1)*scale/2)
  d=' '.join(p.scaled(scale).translated(delta).d() for p in paths);d=re.sub(r'-?\d*\.\d+(?:e[+-]?\d+)?',lambda m:format(float(m[0]),'.4f').rstrip('0').rstrip('.') or '0',d)
  target.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path fill="#000000" d="'+d+'"/></svg>\n',encoding='utf8',newline='\n')
 record={'key':key,'breed':breed,'variant':variant,'portrait':target.relative_to(a.katalog).as_posix(),'sourceSha256':sha(src),'svgSha256':sha(target),'sourceLocal':src.name,'prompt':src.with_name(f'{variant:02d}-prompt.txt').read_text(encoding='utf8') if src.with_name(f'{variant:02d}-prompt.txt').exists() else 'Original German Shepherd puppy, curious tilted head and front paws; built-in ImageGen 02.11.2026.','generator':'Codex built-in ImageGen','conversion':'VTracer binary spline; approximation, not lossless','freigabe':None}
 record['traceRevision']=2
 record['conversion']='VTracer binary spline, luminance threshold 200, speckle 4; approximation, not lossless'
 record['style']='fein/naturgetreu' if (breed=='deutscher-schaeferhund' and variant in (2,3,4,5)) or (breed!='deutscher-schaeferhund' and variant in (2,5,8,11)) else 'suess/verspielt'
 records=[r for r in records if r['key']!=key]+[record];save(manifest,records);print(key,flush=True)
print('Available own dog motifs:',len(records))
