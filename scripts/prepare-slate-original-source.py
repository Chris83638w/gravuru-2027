"""Technical SVG adapter for the immutable Neue-Struktur catalogue originals.

Only explicitly approved documented font replacements; no repositioning or
image processing. Original viewport clipping is baked where required.
The caller creates size variants through the existing native proportional scaler.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET
from functools import lru_cache
from fontTools.ttLib import TTFont
from picosvg.svg import SVG

NS = 'http://www.w3.org/2000/svg'
XL = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', NS)
ET.register_namespace('xlink', XL)
def tag(n): return n.tag.split('}')[-1]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

@lru_cache(maxsize=100)
def font_metrics(filename):
    f=TTFont(filename); cmap=f.getBestCmap(); hmtx=f['hmtx'].metrics
    return f['head'].unitsPerEm,{chr(c):hmtx[n][0] for c,n in cmap.items()}

def source_clip(el, plate, changes, *, mask=False):
    """Bake only the original viewport clip; never move or shrink visible ink."""
    wrapper=ET.Element(f'{{{NS}}}svg',{'viewBox':f'0 0 {plate[0]} {plate[1]}'})
    node=copy.deepcopy(el)
    if mask: node.set('fill','#000000');node.set('stroke','none')
    wrapper.append(node)
    class PreciseSVG(SVG):
        @property
        def tolerance(self): return 0.0001
    svg=PreciseSVG.fromstring(ET.tostring(wrapper,encoding='unicode'))
    # Simple source paths need no overlap simplification (potentially quadratic
    # on Corel motifs). Normalize only transforms/strokes before clipping.
    if any(n.get('transform') or n.get('stroke','none')!='none' for n in node.iter()):
        svg.topicosvg(ndigits=9,inplace=True)
    bounds=svg.bounding_box()
    if not bounds: return el
    if bounds.x>=0 and bounds.y>=0 and bounds.x+bounds.w<=plate[0] and bounds.y+bounds.h<=plate[1]:
        el.set('data-painted-bounds',json.dumps(list(bounds)))
        return el
    svg.clip_to_viewbox(inplace=True)
    parsed=ET.fromstring(svg.tostring())
    visible=[n for n in parsed if tag(n) not in ('defs','title','desc')]
    if not visible: raise ValueError(el.get('id','')+': no visible source geometry inside plate')
    result=ET.Element(f'{{{NS}}}g',{'id':el.get('id','deko-original-clip')})
    result.extend(visible)
    if mask:
        paths=list(svg.shapes())
        if len(paths)!=1: raise ValueError('source photo mask clip must remain a single path')
        result=ET.Element(f'{{{NS}}}path',{'d':paths[0].as_path().d,'fill-rule':paths[0].fill_rule})
    changes.append({'id':el.get('id'),'action':'original viewport clip baked; visible artwork position and scale unchanged','beforeBoundsMm':list(bounds)})
    result.set('data-painted-bounds',json.dumps(list(svg.bounding_box())))
    return result

def adapt(folder, destination, metadata, replacements=None, font_files=None, photo_rule=None):
    tree = ET.parse(folder / 'design.svg')
    root = tree.getroot()
    changes = []
    photo_rule = photo_rule or {}
    sample = Path(photo_rule['samplePath']) if photo_rule.get('samplePath') else None
    sample_name = 'beispiel-20261106'+sample.suffix if sample else None
    if sample and not sample.is_file(): raise ValueError('Documented thematic sample missing: '+str(sample))
    if photo_rule.get('maskId') and not any(n.get('id')==photo_rule['maskId'] for n in root):
        raise ValueError('Documented original photo mask missing')
    plate=[metadata['plate']['widthMm'],metadata['plate']['heightMm']]
    clips = {n.get('id'): n for n in root.iter() if tag(n) == 'clipPath'}
    defs = ET.Element(f'{{{NS}}}defs')
    children = []
    vectors = []
    text_nodes = []
    for el in list(root):
        t, ident = tag(el), el.get('id', '')
        if ident == photo_rule.get('removeEmptyOverlay'):
            changes.append({'id':ident,'action':'empty white sample overlay removed to reveal existing original photo','reason':photo_rule['reason']})
            continue
        if ident == photo_rule.get('maskId'):
            if t!='path' or el.get('fill','none')!='none' or el.get('stroke','none')!='none':
                raise ValueError('Recovery requires the exact invisible original mask path')
            mask=copy.deepcopy(el);mask.attrib.pop('id',None)
            mask=source_clip(mask,plate,changes,mask=True)
            bounds=json.loads(mask.get('data-painted-bounds'));x,y,w,h=bounds
            clip_id='original-photo-'+ident
            clip=ET.Element(f'{{{NS}}}clipPath',{'id':clip_id});clip.append(copy.deepcopy(mask));defs.append(clip)
            group=ET.Element(f'{{{NS}}}g',{'id':'foto-ergaenzt','data-upload-hint':'separate'})
            mask.set('fill','none');mask.set('stroke','none');group.append(mask)
            group.append(ET.Element(f'{{{NS}}}image',{'class':'foto','x':str(x),'y':str(y),'width':str(w),'height':str(h),'preserveAspectRatio':'xMidYMid slice','clip-path':'url(#'+clip_id+')',f'{{{XL}}}href':sample_name}))
            children.append(group)
            changes.append({'id':ident,'action':'original invisible photo mask restored with thematic catalogue example','sampleId':photo_rule['sampleId'],'sampleFile':photo_rule['sampleFile'],'sampleSha256':sha(sample),'theme':photo_rule['theme'],'maskPathSha256':hashlib.sha256(el.get('d','').encode()).hexdigest(),'boundsMm':bounds})
            continue
        if t == 'clipPath':
            defs.append(copy.deepcopy(el)); continue
        if t in ('defs', 'title', 'desc', 'metadata', 'style'):
            children.append(copy.deepcopy(el)); continue
        if ident in ('platte', 'kontur', 'rueckplatte') or ident.startswith('bohrbild'):
            changes.append({'id':ident, 'action':'plate/guide excluded from engraving'}); continue
        if el.get('display') == 'none' or 'hinweis' in el.get('class', '').split():
            changes.append({'id':ident, 'action':'source-only upload hint excluded'}); continue
        if t == 'text':
            el = copy.deepcopy(el)
            el.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
            el.set('data-source-font-size',el.get('font-size','0'))
            old = el.get('font-family')
            replacement = (replacements or {}).get(old)
            if replacement and replacement['to'] != old:
                el.set('font-family', replacement['to'])
                changes.append({'id':ident,'action':'documented font replacement approved by Chris 2026-11-05','from':old,**replacement})
                # Match the catalogue's measured Corel text width for changed
                # faces; SVG anchors, baselines and leading remain unchanged.
                filename=(font_files or {}).get(replacement['to'])
                source_text=''.join(el.itertext()).replace('\n','')
                source=next((v for v in metadata.get('texts',[]) if v['text'].replace('\n','')==source_text),None)
                if filename and Path(filename).is_file() and source and old.casefold()!=replacement['to'].casefold():
                    units,widths=font_metrics(str(filename)); size=float(el.get('font-size'))
                    lines=[''.join(s.itertext()) for s in el] or [''.join(el.itertext())]
                    if all(c in widths for line in lines for c in line):
                        width=max(sum(widths[c] for c in line)*size/units for line in lines)
                        target=source['box'][2]; factor=target/width if width else 1
                        if not 0.5<=factor<=3: raise ValueError(f'{ident}: replacement width factor {factor:.3f} needs review')
                        el.set('font-size',str(size*factor))
                        changes.append({'id':ident,'action':'replacement font size matched to original Corel text width; anchor and baselines unchanged','beforeSizeMm':size,'afterSizeMm':size*factor,'sourceWidthMm':target})
            spans=list(el)
            rows=[]; baseline=float(el.get('y','0'))
            for span in spans:
                baseline=float(span.get('y',baseline))+float(span.get('dy','0'))
                rows.append((span,baseline))
            if spans and (len(spans)>10 or sum(len(''.join(s.itertext()))+1 for s in spans)>180):
                chunks=[]; chunk=[]; count=0
                for item in rows:
                    n=len(''.join(item[0].itertext()))+1
                    if chunk and (len(chunk)>=10 or count+n>180): chunks.append(chunk);chunk=[];count=0
                    chunk.append(item);count+=n
                if chunk: chunks.append(chunk)
                for i,chunk in enumerate(chunks):
                    part=copy.deepcopy(el);part[:]=[];part.text=None
                    part.set('id',ident+f'-part{i+1}');part.set('y',str(chunk[0][1]))
                    for k,(span,y) in enumerate(chunk):
                        sp=copy.deepcopy(span);sp.attrib.pop('dy',None);sp.set('y',str(y));part.append(sp)
                    text_nodes.append(part);children.append(part)
                changes.append({'id':ident,'action':'long source text split at line boundaries; baselines unchanged','parts':len(chunks)})
            else: text_nodes.append(el); children.append(el)
            continue
        if t == 'image' and 'foto' in el.get('class', '').split():
            m = re.fullmatch(r'url\(#([^)]*)\)', el.get('clip-path', ''))
            group = ET.Element(f'{{{NS}}}g', {'id':ident, 'data-upload-hint':'separate'})
            if m:
                clip = clips.get(m[1])
                if clip is None or len(clip) != 1:
                    raise ValueError(f'{ident}: single source photo mask required')
                mask = copy.deepcopy(clip[0])
            else:
                mask = ET.Element(f'{{{NS}}}rect', {k:el.get(k,'0') for k in ('x','y','width','height')})
            mask = source_clip(mask,plate,changes,mask=True)
            mask.set('fill','none'); mask.set('stroke','none')
            group.append(mask)
            im = copy.deepcopy(el); im.attrib.pop('id', None)
            if ident == photo_rule.get('replaceImageId'):
                im.attrib.pop('href',None);im.set(f'{{{XL}}}href',sample_name)
                # Fill the original mask; do not inherit a crop tuned for another animal.
                x,y,w,h=json.loads(mask.get('data-painted-bounds'))
                for k,v in zip(('x','y','width','height'),(x,y,w,h)):im.set(k,str(v))
                im.set('preserveAspectRatio','xMidYMid slice')
                changes.append({'id':ident,'action':'thematic catalogue example replaced; original mask unchanged','sampleId':photo_rule['sampleId'],'sampleFile':photo_rule['sampleFile'],'sampleSha256':sha(sample),'theme':photo_rule['theme']})
            group.append(im)
            children.append(group)
            changes.append({'id':ident,'action':'source image and unchanged clip wrapped as native photo field'})
            continue
        # The historical reader labels some filled vector shapes as "foto" even
        # when no image exists. Keep the exact visible vector; do not invent a photo.
        if t == 'g' and ident.startswith('foto-') and not any(tag(n)=='image' for n in el.iter()):
            el=copy.deepcopy(el); el.set('id','deko-'+ident)
            changes.append({'id':ident,'action':'image-free source shape retained as vector'})
        if t in ('path','rect','circle','ellipse','polygon','polyline') and el.get('fill')=='none' and el.get('stroke','none')=='none':
            changes.append({'id':ident,'action':'invisible source geometry excluded'}); continue
        if t not in ('path','rect','circle','ellipse','polygon','polyline','g'):
            raise ValueError(f'unsupported visible source element {t}/{ident}')
        el=source_clip(el,plate,changes)
        vectors.append(el); children.append(copy.deepcopy(el))
    # Existing field convention: dates transfer as daten; a short display name as
    # name; longer memorial wording remains design-specific (spruch).
    texts = [(n,''.join(n.itertext()).strip()) for n in text_nodes]
    date = re.compile(r'(?:\d{4}|\d{1,2}[./]\d{1,2}|[†*]\s*\d)')
    name_candidates = [n for n,s in texts if len(s)<=45 and not date.search(s) and not s.endswith(('.', '!', '?'))]
    main = max(name_candidates or text_nodes,key=lambda n:float(n.get('data-source-font-size','0')),default=None)
    names=[main] if main is not None else []
    if main is not None:
        for n in name_candidates:
            if n is not main and n.get('font-family')==main.get('font-family') and abs(float(n.get('data-source-font-size'))-float(main.get('data-source-font-size')))<0.02 and abs(float(n.get('y'))-float(main.get('y')))<3*float(main.get('data-source-font-size')): names.append(n)
    counts={}
    for n,s in texts:
        role='daten' if date.search(s) and len(s)<90 else 'name' if n in names else 'spruch'
        counts[role]=counts.get(role,0)+1
        n.set('data-feld',role if counts[role]==1 else f'{role}-{counts[role]}')
    # Preserve stacking order: consecutive paths may share one editable native
    # vector object if the original has more than the native element budget.
    if len(children)>20:
        grouped=[]; current=None
        for el in children:
            is_vector=tag(el) in ('path','rect','circle','ellipse','polygon','polyline') or tag(el)=='g' and el.get('id','').startswith(('motiv-','deko-'))
            if is_vector:
                if current is None:
                    current=ET.Element(f'{{{NS}}}g',{'id':f'deko-original-{len(grouped)+1}'}); grouped.append(current)
                current.append(el)
            else: current=None; grouped.append(el)
        changes.append({'action':'consecutive source vectors grouped without path or order changes','before':len(children),'after':len(grouped)})
        children=grouped
    root[:]=([defs] if len(defs) else [])+children
    destination.mkdir(parents=True,exist_ok=True)
    for p in folder.iterdir():
        if p.is_file() and p.name not in ('design.svg','design.json'): shutil.copyfile(p,destination/p.name)
    if sample: shutil.copyfile(sample,destination/sample_name)
    tree.write(destination/'design.svg',encoding='utf-8',xml_declaration=False)
    j=copy.deepcopy(metadata)
    source_path=folder.as_posix().split('/designs/bestand/',1)[1]
    group=source_path.split('/')[1]
    sub=source_path.split('/')[2]
    themes=['sternenkinder'] if group=='Sternenkinder' else ['gedenktafeln'] if group=='Menschen' else ['tiergedenktafeln']
    if sub=='Hund': themes.append('hundegedenktafeln')
    if sub=='Katze': themes.append('katzengedenktafeln')
    j.update(plateMm=[metadata['plate']['widthMm'],metadata['plate']['heightMm']],themes=themes,movable=True,freigabe=None)
    j['katalog']={**j.get('katalog',{}),'prio':1,'zielgruppe':group,'unterkategorie':sub}
    j['name']=metadata['id']+' · '+(''.join(main.itertext()).strip() if main is not None else 'Original')
    j['source']='designs/bestand/'+source_path
    j['fonts']=sorted({n.get('font-family') for n in text_nodes if n.get('font-family')})
    j['nativeVectorBounds']={}
    for node in children:
        if not node.get('id','').startswith(('motiv-','deko-')): continue
        boxes=[json.loads(n.get('data-painted-bounds')) for n in node.iter() if n.get('data-painted-bounds')]
        if boxes:
            left=min(b[0] for b in boxes);top=min(b[1] for b in boxes)
            right=max(b[0]+b[2] for b in boxes);bottom=max(b[1]+b[3] for b in boxes)
            j['nativeVectorBounds'][node.get('id')]=[left,top,right-left,bottom-top]
    j['originalPreparation']={'source':j['source'],'sourceSvgSha256':sha(folder/'design.svg'),'fontReplacement':any('from' in c for c in changes),'layoutChanged':False,'technicalChanges':changes}
    (destination/'design.json').write_text(json.dumps(j,ensure_ascii=False,indent=2),encoding='utf-8')
    return changes

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--katalog',required=True);ap.add_argument('--out',required=True);ap.add_argument('--replacements');ap.add_argument('--photo-plan');a=ap.parse_args()
    root=Path(a.katalog).resolve();out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
    rows=[]
    replacements=json.loads(Path(a.replacements).read_text(encoding='utf-8')) if a.replacements else {}
    photo_plan=json.loads(Path(a.photo_plan).read_text(encoding='utf-8'))['designs'] if a.photo_plan else {}
    source_by_id={json.loads(p.read_text(encoding='utf-8'))['id']:p.parent for p in (root/'designs/bestand/gedenktafeln').rglob('design.json')}
    font_files={f['name']:root/f['file'] for f in json.loads((root/'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
    for p in sorted((root/'designs/bestand/gedenktafeln').rglob('design.json')):
        j=json.loads(p.read_text(encoding='utf-8'));plate=j.get('plateMm') or [j.get('plate',{}).get('widthMm'),j.get('plate',{}).get('heightMm')]
        if j.get('material')!='Schiefer' or plate not in ([300,200],[220,140]): continue
        folder=p.parent;original=out/'originals'/j['id'];original.mkdir(parents=True,exist_ok=True)
        source_files=[]
        for f in folder.iterdir():
            if f.is_file():
                shutil.copyfile(f,original/f.name);source_files.append({'name':f.name,'sha256':sha(f),'bytes':f.stat().st_size})
        row={'id':j['id'],'source':p.relative_to(root).as_posix(),'sourcePlateMm':plate,'process':j.get('process'),'group':p.parts[-4],'subcategory':p.parts[-3],'files':source_files}
        if j.get('process')=='Gravur':
            try:
                rule=copy.deepcopy(photo_plan.get(j['id'],{}))
                if rule.get('sampleId'):rule['samplePath']=str(source_by_id[rule['sampleId']]/rule['sampleFile'])
                row['technicalChanges']=adapt(folder,out/'native-source'/j['id'],j,replacements,font_files,rule);row['normalized']=True
            except Exception as e: row['error']=str(e)
        else: row['status']='UV original preserved; separate print configuration required'
        rows.append(row)
        if len(rows)%10==0: print(json.dumps({'sourceDone':len(rows)}),flush=True)
    (out/'source-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'originals':len(rows),'normalized':sum(r.get('normalized',False) for r in rows),'errors':[r for r in rows if 'error' in r]}))

if __name__=='__main__': main()
