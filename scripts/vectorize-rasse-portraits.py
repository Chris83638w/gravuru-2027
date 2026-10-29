"""Convert our original ImageGen portrait sources to review SVGs (never third-party photos).

Binary vectorization is an approximation, not lossless reproduction or machine approval.
The full native PNG, prompt and checksums remain beside the provenance manifest.
"""
import argparse, hashlib, json, re, shutil, tempfile, xml.etree.ElementTree as ET
from pathlib import Path
from svgpathtools import parse_path
import vtracer

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--sources',required=True);ap.add_argument('--katalog',required=True);a=ap.parse_args()
    src=Path(a.sources);k=Path(a.katalog);out=k/'motive-eigene/rasse-schilder-20261029';out.mkdir(parents=True,exist_ok=True)
    provenance=[]
    for raster in sorted(src.glob('*-source.png')):
        breed=raster.name.removesuffix('-source.png')
        dest=out/(breed+'.svg')
        with tempfile.TemporaryDirectory() as tmp:
            trace=Path(tmp)/'trace.svg'
            vtracer.convert_image_to_svg_py(str(raster),str(trace),colormode='binary',mode='spline',filter_speckle=24,corner_threshold=60,length_threshold=4,max_iterations=10,splice_threshold=45,path_precision=3)
            root=ET.parse(trace).getroot();pp=[]
            for n in root.iter('{http://www.w3.org/2000/svg}path'):
                p=parse_path(n.get('d'));t=n.get('transform','')
                if t:
                    m=re.fullmatch(r'translate\(([-.\d]+)[ ,]+([-.\d]+)\)',t)
                    if not m:raise ValueError('Unexpected trace transform '+t)
                    p=p.translated(complex(float(m[1]),float(m[2])))
                pp.append(p)
            boxes=[p.bbox() for p in pp];x0=min(b[0] for b in boxes);x1=max(b[1] for b in boxes);y0=min(b[2] for b in boxes);y1=max(b[3] for b in boxes)
            scale=190/max(x1-x0,y1-y0);dx=(200-(x1-x0)*scale)/2-x0*scale;dy=(200-(y1-y0)*scale)/2-y0*scale
            d=' '.join(p.scaled(scale).translated(complex(dx,dy)).d() for p in pp)
            d=re.sub(r'-?\d*\.\d+(?:e[+-]?\d+)?',lambda m:format(float(m[0]),'.4f').rstrip('0').rstrip('.') or '0',d)
            dest.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">\n<title>'+breed+' – Originalillustration Codex ImageGen, Vektorstudie</title>\n<path fill="#000000" d="'+d+'"/>\n</svg>\n',encoding='utf-8')
        sources=k/'auftraege/rasse-schilder-20261029/portrait-quellen';sources.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(raster,sources/raster.name)
        for extra in src.glob(breed+'-*'):
            if extra.suffix in ['.txt','.json']:shutil.copyfile(extra,sources/extra.name)
        provenance.append({'breed':breed,'file':dest.relative_to(k).as_posix(),'svgSha256':sha(dest),'sourceFile':(sources/raster.name).relative_to(k).as_posix(),'sourceSha256':sha(raster),'generator':'Codex built-in ImageGen','styleReference':'Eigene Katalog-Hundeübersicht, keine fremden Fotos oder Stockbilder','vectorizer':'VTracer 0.6.15, binary spline, speckle 24, length 4, precision 3','pathCountBeforeMerge':len(pp),'machineMinStrokeMm':None,'machineApproval':'offen','kundenkonfi':False})
    (out/'herkunft.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([{'breed':p['breed'],'paths':p['pathCountBeforeMerge']} for p in provenance]))

if __name__=='__main__':main()
