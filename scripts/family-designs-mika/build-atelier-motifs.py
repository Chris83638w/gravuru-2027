"""Prepare individually editable vectors from the user's selected ImageGen art.

Input SVGs are Shapesoda traces of our own generated raster artwork. Geometry is
separated by disconnected components, never by clipping a character in half.
"""
import argparse, hashlib, json, math, shutil
from pathlib import Path
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon
from shapely.affinity import scale, translate
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
from svgpathtools import parse_path

def polygons(g):
    if g.is_empty:return []
    if g.geom_type=='Polygon':return [g]
    return [p for part in g.geoms for p in polygons(part)]

def path_geometry(d):
    result=Polygon()
    for sub in parse_path(d).continuous_subpaths():
        points=[]
        for seg in sub:
            count=max(1,math.ceil(seg.length(error=1e-4)/1.4))
            points.extend((seg.point(i/count).real,seg.point(i/count).imag) for i in range(count))
        if len(points)>2:
            p=Polygon(points).buffer(0)
            if not p.is_empty:result=result.symmetric_difference(p)
    return result

def read_art(file):
    root=ET.parse(file).getroot();result=Polygon()
    for el in root.iter():
        tag=el.tag.rsplit('}',1)[-1]
        if tag in ['image','text','use']:raise ValueError('Unsupported raster/text/reference in trace')
        if el.get('transform'):raise ValueError('Trace transform must be flattened first')
        if tag!='path':continue
        fill=el.get('fill','#000000').lower()
        if fill=='none':continue
        if not (fill.startswith('#') and len(fill)==7):raise ValueError('Unexpected fill '+fill)
        level=sum(int(fill[i:i+2],16) for i in [1,3,5])/3
        g=path_geometry(el.get('d',''))
        result=result.union(g) if level<128 else result.difference(g)
    return result.buffer(0)

def caliper(g):
    corners=list(g.minimum_rotated_rectangle.exterior.coords)
    return min(math.dist(corners[i],corners[i+1]) for i in range(4))

def prepare(g,min_box):
    x0,y0,x1,y1=g.bounds;factor=94/max(x1-x0,y1-y0)
    g=translate(scale(g,factor,factor,origin=(x0,y0)),3-x0,3-y0)
    # Preserve the chosen illustration. A blanket 0.5-mm expansion destroys
    # faces at this scale; thin source details remain explicit review findings.
    g=g.buffer(.10,quad_segs=6).simplify(.025,preserve_topology=True)
    clean=[]
    for p in polygons(g):
        if p.area<.025:continue
        for q in polygons(p):
            holes=[list(r.coords) for r in q.interiors if Polygon(r).area>=.12]
            clean.append(Polygon(q.exterior.coords,holes))
    g=unary_union(clean).buffer(0)
    x0,y0,x1,y1=g.bounds
    g=translate(g,2-x0,2-y0)
    return g,(x1-x0+4,y1-y0+4)

def to_svg(g,canvas,label):
    rings=[]
    for p in polygons(g):
        p=orient(p,sign=1)
        for ring in [p.exterior,*p.interiors]:
            rings.append('M'+' L'.join(f'{x:.5f} {y:.5f}' for x,y in list(ring.coords)[:-1])+' Z')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas[0]:.5f} {canvas[1]:.5f}"><title>{label}</title><path fill="#000000" fill-rule="nonzero" d="'+ ' '.join(rings)+'"/></svg>\n'

parser=argparse.ArgumentParser();parser.add_argument('--katalog',required=True);parser.add_argument('--sources',required=True);parser.add_argument('--png-sources',required=True);args=parser.parse_args()
root=Path(args.katalog).resolve();sources=Path(args.sources).resolve();png=Path(args.png_sources).resolve()
folder=root/'motive-eigene/familie-mika-atelier';raw=folder/'quellen';raw.mkdir(parents=True,exist_ok=True)
groups=[
 ('smile',1,'hybrid',[210,540,780,1060,1365],21,['Frau mit Wellenhaar und Culotte','Mann mit Brille und lockerem Hemd','Kind mit Latzhose','Kind mit Pferdeschwanz und Rock','Kleinkind mit offenen Armen']),
 ('slim',2,'slim',[210,550,850,1160,1485],22,['Frau mit Dutt und Strickjacke','Mann mit Wellenhaar und Pullover','Kind mit Bob und Mantel','Kind mit Mütze und Latzhose','Kleinkind mit Zöpfen und Kleid']),
 ('owls',3,'owls',[210,575,850,1185,1530],18,['Sanfte rundliche Eule','Schmale neugierige Eule','Rundes Eulenbaby','Junge Eule mit angehobenem Flügel','Schüchterne lächelnde Eule']),
 ('bees',4,'bees',[200,545,840,1150,1500],20,['Rundliche fröhliche Biene','Längliche neugierige Biene','Kleines rundes Bienchen','Fliegende winkende Biene','Sanfte Biene mit geschlossenen Augen']),
 ('ladybirds',5,'ladybirds',[205,550,850,1135,1500],21,['Rundlicher Glückskäfer','Ovaler neugieriger Glückskäfer','Kleines Käferbaby','Fliegender Glückskäfer','Schüchterner lächelnder Glückskäfer'])]
entries=[];stats=[]
for style,number,source,anchors,min_box,labels in groups:
    trace=sources/(source+'.svg')
    if not trace.exists():trace=sources/(style+'-trace.svg')
    drawing=read_art(trace)
    if trace.resolve()!=(raw/(style+'-trace.svg')).resolve():shutil.copyfile(trace,raw/(style+'-trace.svg'))
    if (png/(style+'-quelle.png')).resolve()!=(raw/(style+'-quelle.png')).resolve():shutil.copyfile(png/(style+'-quelle.png'),raw/(style+'-quelle.png'))
    prompt=png/(style+'-prompt.txt')
    if prompt.exists() and prompt.resolve()!=(raw/prompt.name).resolve():shutil.copyfile(prompt,raw/prompt.name)
    buckets=[[] for _ in anchors];dog=[]
    for p in polygons(drawing):
        x0,y0,x1,y1=p.bounds;cx=(x0+x1)/2;cy=(y0+y1)/2
        if style=='smile' and cy>=716:
            if cx>=1256:dog.append(p)
            continue
        i=min(range(5),key=lambda n:abs(cx-anchors[n]));buckets[i].append(p)
    if any(not b for b in buckets):raise ValueError('Missing figure '+style)
    items=[(i,unary_union(b),labels[i],min_box) for i,b in enumerate(buckets)]
    if style=='smile':items.append((5,unary_union(dog),'Balu mit Schlappohren',16))
    for i,drawing,label,minimum in items:
        key='mika-atelier-dog-balu' if i==5 else f'mika-atelier-{style}-{i+1:02}'
        geom,canvas=prepare(drawing,minimum);text=to_svg(geom,canvas,label);file=key+'.svg';(folder/file).write_bytes(text.encode('utf-8'))
        ids=['FAM-MIKA-01-P5'] if i==5 else [f'FAM-MIKA-{number:02}-P{n}' for n in [3,5] if i<n]
        entries.append({'key':key,'name':label,'thema':'familienschilder','file':'familie-mika-atelier/'+file,'sha256':hashlib.sha256(text.encode()).hexdigest(),'herkunft':{'account':'Astra Mika / Codex','datum':'2026-10-30','auftrag':'Nutzer wählt Bildrichtungen 1 und 3; freundliche natürliche, individuelle süße Figuren','methode':'Eigene Bildgenerierung mit gewählten Projektreferenzen, Shapesoda-Vektorisierung (laser, zwei Farben), schwarze Vektorflächen separiert und für kleine Figuren vereinfacht/verstärkt','quelle':f'quellen/{style}-quelle.png','trace':f'quellen/{style}-trace.svg','traceSha256':hashlib.sha256(trace.read_bytes()).hexdigest()},'design':ids[-1],'designs':ids,'kundenkonfi':False})
        stats.append({'key':key,'viewBox':canvas,'minimumPlacementBoxMm':minimum,'vectorOffsetUnits':.10,'blackComponents':len(polygons(geom)),'thinDetails':'preserved; inspect Konfi findings before manufacture'})
registry_file=root/'motive-eigene/motive-eigene.json';registry=json.loads(registry_file.read_text(encoding='utf-8'))
ours={e['key'] for e in entries};registry['motifs']=[e for e in registry.get('motifs',[]) if e.get('key') not in ours]+entries;registry['count']=len(registry['motifs'])
registry_file.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(folder/'aufbereitung.json').write_text(json.dumps({'datum':'2026-10-30','motive':stats,'hinweis':'Physischer Gravurversuch und Freigabe bleiben offen; kleine Details bewusst vereinfacht.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'newMotifs':len(entries),'totalRegistered':registry['count'],'namespace':'mika-atelier-'}))
