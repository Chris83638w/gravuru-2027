import copy, importlib.util, json, re, shutil, os
from pathlib import Path
from functools import lru_cache
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
HERE=Path(__file__).resolve().parent; ROOT=HERE.parent
CAT=Path(os.environ.get('GRAVURU_KATALOG',ROOT.parent/'grabkreuze-katzen-katalog'))
WORK=Path(os.environ.get('GRAVURU_CAT_REVIEW',ROOT.parent.parent/'outputs/grabkreuze-katzen-nachauftrag'))
OUT=CAT/'designs/grabkreuze-katzen-11x20'; WORK.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('rbd',HERE/'read-bestand-designs.py'); rbd=importlib.util.module_from_spec(spec);spec.loader.exec_module(rbd);rpd=rbd.rpd
fonts=rbd.font_files(CAT)
replacements={r['from']:r['to'] for r in json.loads((CAT/'schriften/schriften.json').read_text(encoding='utf-8'))['replacements']}
family=json.loads((CAT/'familien/acryl/grabkreuz-acryl-5mm-schwarz.json').read_text(encoding='utf-8'))
contour=next(s['outlinePath'] for s in family['sizes'] if s['key']=='KZ-A-11x20')
def write(p,d):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
@lru_cache(None)
def source(name):
    found=[p for p in (CAT/'designs/bestand').rglob(name) if (p/'design.json').exists()]
    assert len(found)==1,(name,found)
    return found[0]
@lru_cache(None)
def raw(name):return json.loads((source(name)/'design.json').read_text(encoding='utf-8'))
@lru_cache(None)
def ft(name):return TTFont(fonts[name])
@lru_cache(None)
def cap_factor(name):
    f=ft(name);g=f.getGlyphSet();p=BoundsPen(g);g[f.getBestCmap()[ord('H')]].draw(p)
    return (p.bounds[3]-p.bounds[1])/f['head'].unitsPerEm
def width(value,font,size):
    f=ft(font);cmap=f.getBestCmap();hmtx=f['hmtx']
    return max(sum(hmtx[cmap[ord(c)]][0] for c in s)/f['head'].unitsPerEm*size for s in value.splitlines())
def txt(value,font,cap,x,y,maxw,align='center',rotation=0):
    sz=cap/cap_factor(font);w=width(value,font,sz)
    if w>maxw:sz*=maxw/w
    assert sz*cap_factor(font)>=3.005,(value,font,sz*cap_factor(font),maxw)
    return dict(text=value,font=font,sizePt=sz/rpd.PT,color='#000000',align=align,anchorMm=[x,y],lineHeightMm=sz*1.2,letterSpacingMm=0,rotation=rotation)
def wrapped(value,font,cap,x,y,maxw=33):
    sz=cap/cap_factor(font);lines=['']
    for word in value.split():
        candidate=(lines[-1]+' '+word).strip()
        if width(candidate,font,sz)<=maxw:lines[-1]=candidate
        else:lines.append(word)
    return txt('\n'.join(lines),font,cap,x,y,maxw)
def flow(value,font,top=84,bottom=134,maxw=33):
    for step in range(75,30,-1):
        try:t=wrapped(value,font,step/10,55,top,maxw)
        except AssertionError:continue
        sz=t['sizePt']*rpd.PT
        if (len(t['text'].splitlines())-1)*t['lineHeightMm']+sz*.25<=bottom-top:return t
    raise ValueError('Spruch passt bei 3 mm nicht: '+value)
def name_text(value,font,ink_height,x,y,maxw,align='center'):
    f=ft(font);g=f.getGlyphSet();cmap=f.getBestCmap();bounds=[]
    for c in value:
        p=BoundsPen(g);g[cmap[ord(c)]].draw(p)
        if p.bounds:bounds.append(p.bounds)
    factor=(max(b[3] for b in bounds)-min(b[1] for b in bounds))/f['head'].unitsPerEm
    return txt(value,font,ink_height/factor*cap_factor(font),x,y,maxw,align)
def motif(name,indices,x=None,y=None,w=None,h=None,outline=False):
    selected=[raw(name)['motifs'][i] for i in indices]
    boxes=[rbd.path_box(m['d']) for m in selected];x0=min(b[0] for b in boxes);y0=min(b[1] for b in boxes)
    bw=max(b[0]+b[2] for b in boxes)-x0;bh=max(b[1]+b[3] for b in boxes)-y0
    s=1 if x is None else min(w/bw,h/bh);ox=0 if x is None else x+(w-bw*s)/2-x0*s;oy=0 if y is None else y+(h-bh*s)/2-y0*s
    return dict(box=[x0*s+ox,y0*s+oy,bw*s,bh*s],sourceMotif={'source':source(name).relative_to(CAT).as_posix(),'indices':indices,'scale':s},paths=[dict(d=rbd.transform_path(m['d'],s,ox,oy),fill=None if outline else '#000000' if m.get('fill') else None,stroke='#000000' if outline or m.get('stroke') else None,strokeMm=.55 if outline else float(m.get('strokeMm') or 0)*s,evenodd=True,opacity=1) for m in selected])
def convert(name):
    # Temporary text-only source: explicitly no photography, board or photo UI paths.
    folder=WORK/'sources'/name;folder.mkdir(parents=True,exist_ok=True)
    write(folder/'design.json',raw(name))
    import xml.etree.ElementTree as ET
    tree=ET.parse(source(name)/'design.svg');root=tree.getroot()
    for parent in root.iter():
        for child in list(parent):
            if child.tag.rsplit('}',1)[-1] not in ('text','tspan') or 'hinweis' in child.get('class',''):
                parent.remove(child)
    tree.write(folder/'design.svg',encoding='utf-8')
    d=rbd.convert(folder,[110,200],'KZ-A-11x20',replacements,fonts)
    d['motifs']=[];d['photos']=[]
    return d
