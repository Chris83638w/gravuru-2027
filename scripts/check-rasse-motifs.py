"""Inspect original cat image files; this is file QA, not manufacturing approval."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--katalog',required=True);a=ap.parse_args()
    k=Path(a.katalog);base=k/'motive-eigene/rasse-schilder-20261029'
    original=json.loads((base/'herkunft.json').read_text(encoding='utf-8'))
    variants=json.loads((base/'varianten/herkunft.json').read_text(encoding='utf-8'))
    sources=[dict(p,variant=1) for p in original]+variants
    rows=[];errors=[]
    for p in sources:
        source=k/p['sourceFile'];actual=hashlib.sha256(source.read_bytes()).hexdigest()
        if actual!=p['sourceSha256']:errors.append(p['sourceFile']+': hash mismatch')
        prompt=source.with_name(source.name.replace('-source.png','-prompt.txt'))
        if not prompt.is_file() or not prompt.read_text(encoding='utf-8').strip():errors.append(p['sourceFile']+': missing prompt')
        if p['variant']>1:
            provenance=source.with_name(source.name.replace('-source.png','-provenance.json'))
            try:json.loads(provenance.read_text(encoding='utf-8'))
            except (OSError,ValueError):errors.append(p['sourceFile']+': missing or invalid generation provenance')
        with Image.open(source) as im:
            im.load();size=im.size;ink=im.convert('L').point(lambda x:255 if x<96 else 0);box=ink.getbbox()
            pixels=hashlib.sha256(im.convert('RGB').tobytes()).hexdigest()
            if im.format!='PNG' or box is None:errors.append(p['sourceFile']+': invalid original')
        edge=bool(box and (box[0]==0 or box[1]==0 or box[2]==size[0] or box[3]==size[1]))
        rows.append({'breed':p['breed'],'variant':p['variant'],'sourceFile':p['sourceFile'],'sha256':actual,'pixelSha256':pixels,'sizePx':size,'inkBoxPx':box,'inkTouchesImageEdge':edge})
    breeds={r['breed'] for r in rows}
    if len(rows)!=300 or len(breeds)!=25:errors.append('Expected 300 originals in 25 breed series')
    if len({r['sha256'] for r in rows})!=len(rows):errors.append('Repeated original image bytes')
    if len({(tuple(r['sizePx']),r['pixelSha256']) for r in rows})!=len(rows):errors.append('Repeated original image pixels')
    for breed in breeds:
        if sorted(r['variant'] for r in rows if r['breed']==breed)!=list(range(1,13)):errors.append(breed+': incomplete motif numbers')
    # An edge flag requests visual inspection; it does not invent a production margin.
    report={'originals':len(rows),'breeds':len(breeds),'edgeFlags':[{'breed':r['breed'],'variant':r['variant']} for r in rows if r['inkTouchesImageEdge']],'errors':errors,'records':rows}
    target=k/'auftraege/rasse-schilder-20261029/pruefung/motiv-dateien.json';target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:report[key] for key in ['originals','breeds','edgeFlags','errors']},ensure_ascii=False))
    if errors:raise SystemExit(1)

if __name__=='__main__':main()
