"""Integrate only complete 12-motif source sets; preserve all other designs byte-for-byte."""
import argparse,json,subprocess,sys,hashlib,shutil
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('--sources',type=Path,required=True);ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--originals',type=Path,required=True);ap.add_argument('--validation',type=Path,required=True);a=ap.parse_args()
def read(p):return json.loads(p.read_text(encoding='utf8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scripts=Path(__file__).parent;mp=a.katalog/'auftraege/rasse-15x10-20261102/manifest.json';m=read(mp);hp=a.katalog/'motive-eigene/hunde-vielfalt-20261102/herkunft.json'
if (a.validation/'validation.json').exists():shutil.copyfile(a.validation/'validation.json',a.validation/'previous.json')
changed=[]
for breed in [b['breed'] for b in m['breeds'] if b['animal']=='dog']:
 folder=a.sources/breed;ready=all((folder/f'{i:02d}-source.png').exists() and (folder/f'{i:02d}-prompt.txt').exists() for i in range(1,13))
 if breed=='deutscher-schaeferhund':ready=all((folder/f'{i:02d}-source.png').exists() for i in range(1,11))
 if not ready:continue
 records=[r for r in read(hp) if r['breed']==breed] if hp.exists() else []
 needs_trace=any(not any(r['variant']==i and r.get('traceRevision')==2 and r.get('sourceSha256')==sha(folder/f'{i:02d}-source.png') for r in records) for i in range(1,11 if breed=='deutscher-schaeferhund' else 13))
 if needs_trace:
  subprocess.run([sys.executable,str(scripts/'vectorize-dog-variety.py'),'--sources',str(a.sources),'--katalog',str(a.katalog),'--breed',breed],check=True)
 records=[r for r in read(hp) if r['breed']==breed];assert len(records)==12,(breed,len(records))
 by_variant={r['variant']:r for r in records};rows=[r for r in m['designs'] if r['breed']==breed]
 metas=[read(a.katalog/r['folder']/'design.json') for r in rows]
 dirty=any(d['source']!=by_variant[r['layout']]['portrait'] or d['rasseReview'].get('sourceSha256')!=sha(a.katalog/by_variant[r['layout']]['portrait']) or d['rasseReview'].get('varietyRevision')!=5 for r,d in zip(rows,metas))
 if dirty:
  subprocess.run([sys.executable,str(scripts/'build-rasse-15x10.py'),'--sources',str(a.originals),'--katalog',str(a.katalog),'--dog-variants',str(hp),'--only-breed',breed],check=True);changed.append(breed)
subprocess.run([sys.executable,str(scripts/'register-dog-variety.py'),str(a.katalog)],check=True)
print(json.dumps({'updatedBreeds':changed},ensure_ascii=False))
