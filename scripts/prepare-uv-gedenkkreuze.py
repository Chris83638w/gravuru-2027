"""Convert approved cross masters to existing Lieferform 2, without runtime changes.

Usage: python scripts/prepare-uv-gedenkkreuze.py --package PATH --catalog PATH
Reads the R1 SVG package; never rasterizes text or artwork. Requires fontTools.
"""
import argparse, base64, copy, hashlib, json, math, re, shutil
from pathlib import Path
import xml.etree.ElementTree as ET
from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

NS = 'http://www.w3.org/2000/svg'
XL = 'http://www.w3.org/1999/xlink'
INK = 'http://www.inkscape.org/namespaces/inkscape'
ET.register_namespace('', NS)
ET.register_namespace('xlink', XL)
ET.register_namespace('inkscape', INK)
SIZES = ('11x20', '14x25', '22x40')
GROUPS = [('H-O','Hunde ohne Foto','hundegedenktafeln'),
          ('H-F','Hunde mit Foto','hundegedenktafeln'),
          ('K-O','Katzen ohne Foto','katzengedenktafeln'),
          ('K-F','Katzen mit Foto','katzengedenktafeln')]

def tag(e): return e.tag.split('}')[-1]
def num(v): return format(v, '.9f').rstrip('0').rstrip('.') or '0'
def digest(file): return hashlib.sha256(file.read_bytes()).hexdigest()
def write_json(file, data):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def matrix(raw):
    t = Transform()
    for kind, params in re.findall(r'(\w+)\(([^)]*)\)', raw or ''):
        v = [float(x) for x in re.split(r'[ ,]+', params.strip())]
        if kind == 'translate': q=Transform().translate(v[0],v[1] if len(v)>1 else 0)
        elif kind == 'scale': q=Transform().scale(v[0],v[1] if len(v)>1 else v[0])
        elif kind == 'rotate':
            q=Transform()
            if len(v)==3:q=q.translate(v[1],v[2])
            q=q.rotate(math.radians(v[0]))
            if len(v)==3:q=q.translate(-v[1],-v[2])
        elif kind == 'matrix': q=Transform(*v)
        else: raise ValueError('Unsupported transform '+kind)
        t=t.transform(q)
    return t

def path_mm(d, t):
    pen=SVGPathPen(None, ntos=num)
    parse_path(d,TransformPen(pen,t))
    return pen.getCommands()

def flatten_paths(node, parent=Transform(), inherited=None):
    t=parent.transform(matrix(node.get('transform')))
    paint=dict(inherited or {})
    for k in ('fill','fill-rule','stroke','stroke-width'):
        if node.get(k) is not None: paint[k]=node.get(k)
    result=[]
    if tag(node)=='path':
        attrs={'d':path_mm(node.get('d'),t),**paint}
        result.append(ET.Element('{'+NS+'}path',attrs))
    for child in node: result.extend(flatten_paths(child,t,paint))
    return result

def flat_text(group, out_id, field):
    matches=[]
    def visit(node,parent,paint):
        t=parent.transform(matrix(node.get('transform')))
        p=node.get('fill',paint)
        if tag(node)=='text':matches.append((node,t,p))
        for child in node:visit(child,t,p)
    visit(group,Transform(),'#000000')
    assert len(matches)==1
    original,t,color=matches[0]
    a,b,c,d,tx,ty=t
    scale=math.hypot(a,b)
    assert abs(scale-math.hypot(c,d))<1e-5
    angle=math.degrees(math.atan2(b,a))
    x,y=t.transformPoint((float(original.get('x',0)),float(original.get('y',0))))
    attrs={'id':out_id,'data-feld':field,'x':num(x),'y':num(y),
           'font-family':original.get('font-family'),'font-size':num(float(original.get('font-size'))*scale),
           'fill':color,'text-anchor':'start','font-kerning':'none',
           'style':"font-feature-settings:'kern' 0,'liga' 0,'calt' 0; font-variant-ligatures:none"}
    if abs(angle)>1e-7:attrs['transform']=f'rotate({num(angle)} {num(x)} {num(y)})'
    output=ET.Element('{'+NS+'}text',attrs)
    output.text=''.join(original.itertext())
    return output

def convert(src, target, design_id, source_id, group, theme, order, size):
    root=ET.parse(src).getroot()
    meta=json.loads(root.find('{'+NS+'}metadata').text)
    title=root.find('{'+NS+'}title').text.split(' · ')[1]
    dest=ET.Element(root.tag,dict(root.attrib))
    ET.SubElement(dest,'{'+NS+'}title').text=f'{source_id} · {title} · {size}'
    ET.SubElement(dest,'{'+NS+'}desc').text='Lieferform 2: native Texte, Motive und austauschbares Fotofeld. RDG_WHITE und Schnittkontur liegen als separate Produktionsquellen bei.'
    defs=copy.deepcopy(root.find('{'+NS+'}defs'))
    dest.append(defs)
    color=root.find("{*}g[@id='COLOR']")
    texts=color.find("{*}g[@id='TEXTE']")
    fields={}; motifs=0;photos=0
    for child in color:
        if child is texts:continue
        if child.get('id')=='FOTOFELD':
            photos+=1
            x,y,w,h=meta['photo']['box']
            slot=ET.SubElement(dest,'{'+NS+'}g',{'id':'foto-1','data-upload-window':' '.join(num(v) for v in (x,y,w,h))})
            clip=defs.find("{*}clipPath[@id='PHOTO_CLIP_1']")
            mask=copy.deepcopy(clip[0]);mask.set('fill','none')
            slot.append(mask)
            image=copy.deepcopy(next(child.iter('{'+NS+'}image')))
            image.set('clip-path','url(#PHOTO_CLIP_1)')
            href=image.get('{'+XL+'}href')
            assert href.startswith('data:image/jpeg;base64,')
            (target/'beispielfoto.jpg').write_bytes(base64.b64decode(href.split(',',1)[1]))
            image.attrib.pop('{'+XL+'}href');image.set('href','beispielfoto.jpg')
            slot.append(image)
            fields['foto-1']={'label':'Foto','required':True}
        else:
            motifs+=1
            layer=ET.SubElement(dest,'{'+NS+'}g',{'id':f'motiv-{motifs}', 'data-source-layer':child.get('id','')})
            layer.extend(flatten_paths(child))
    for i,child in enumerate(texts,1):
        field={'NAME':'name','DATUM':'lebensdaten','DATUM-VON':'geburtsjahr','DATUM-BIS':'sterbejahr'}[child.get('id')]
        dest.append(flat_text(child,f'text-{i}',field))
        fields[f'text-{i}']={'label':{'name':'Name','lebensdaten':'Lebensdaten','geburtsjahr':'Geburtsjahr','sterbejahr':'Sterbejahr'}[field]}
    cut=copy.deepcopy(root.find("{*}g[@id='CutContour']"));cut.set('id','kontur');dest.append(cut)
    ET.ElementTree(dest).write(target/'design.svg',encoding='utf-8',xml_declaration=True)
    # Full source masters and white remain immutable production references.
    shutil.copy2(src,target/'druck-master.svg')
    white=ET.Element(root.tag,dict(root.attrib))
    white.append(copy.deepcopy(root.find("{*}g[@id='RDG_WHITE']")))
    ET.ElementTree(white).write(target/'RDG_WHITE.svg',encoding='utf-8',xml_declaration=True)
    contour=ET.Element(root.tag,dict(root.attrib)); cc=copy.deepcopy(cut);cc.attrib.pop('style',None);contour.append(cc)
    ET.ElementTree(contour).write(target/'CutContour.svg',encoding='utf-8',xml_declaration=True)
    data={'id':design_id,'name':title,'plateMm':[meta['widthMm'],meta['heightMm']],
          'themes':['tiergedenktafeln',theme],'fonts':sorted({e.get('font-family') for e in dest if tag(e)=='text'}),
          'zielgruppe':'Tiere','unterkategorie':'Hund' if source_id.startswith('UV-H') else 'Katze',
          'photoDesigns':'mit' if photos else 'ohne','movable':True,'fields':fields,
          'sizes':['UV-KREUZ-'+size.upper()],'ziele':[],
          'freigabe':{'status':'freigegeben','am':'2026-11-09','von':'Christopher Koch','umfang':'20 letzte Designversionen als SVG; drei Größen und Konfi-Einbindung im Chat ausdrücklich beauftragt'},
          'sourceDesignId':source_id,'sourceVersion':meta['sourceVersion'],'svgRevision':'R1',
          'sortOrder':order,'sortGroup':group,'process':'color-print',
          'source':{'kind':'approved-chat-design','file':'druck-master.svg','sha256':digest(src),'imageSHA256':meta['sourceSHA256']},
          'productionSources':{'white':'RDG_WHITE.svg','cut':'CutContour.svg','master':'druck-master.svg','whiteName':'RDG_WHITE','whiteSpreadMm':0,'direction':'normal lesbar'},
          'integration':{'status':'native-source-prepared','familyId':None,'liveImported':False,'note':'Produktfamilie/Material/Preise und produktiver Import sind getrennt von der Gestaltungsfreigabe.'}}
    if size!='11x20':data['varianteVon']=source_id
    write_json(target/'design.json',data)
    return {'key':design_id,'sourceDesignId':source_id,'name':title,'pfad':target.name,
            'zielgruppe':'Tiere','unterkategorie':data['unterkategorie'],'themen':data['themes'],
            'texte':len(texts),'motive':motifs,'fotos':photos,'schriften':data['fonts'],
            'sortOrder':order,'sortGroup':group,'sourceVersion':meta['sourceVersion']}

def main():
    p=argparse.ArgumentParser();p.add_argument('--package',type=Path,required=True);p.add_argument('--catalog',type=Path,required=True)
    args=p.parse_args();indices={}
    for size in SIZES:
        series=args.catalog/'designs'/('uv-gedenkkreuze-'+size);index=[]
        for gi,(prefix,label,theme) in enumerate(GROUPS):
            for n in range(1,6):
                original=f'UV-{prefix}{n:02}';order=gi*5+n
                design_id=original if size=='11x20' else original+'-'+size
                source=list((args.package/'SVG'/size).glob(original+'-V*-SVG-R1-'+size+'.svg'))
                assert len(source)==1,(original,size)
                target=series/f'{order:02}-{design_id}';target.mkdir(parents=True,exist_ok=True)
                existing=target/'design.json'
                if existing.exists():
                    prior=json.loads(existing.read_text('utf-8'))
                    assert prior['source']['sha256']==digest(source[0]),'Source changed; create an explicit revision.'
                    assert not prior.get('ziele'),'Target approval exists; do not overwrite.'
                index.append(convert(source[0],target,design_id,original,label,theme,order,size))
        write_json(series/'index.json',index);indices[size]=index
    write_json(args.catalog/'designs'/'uv-gedenkkreuze-register.json',{
        'schema':'gravuru-uv-cross-design-register/v1','sourceApprovalDate':'2026-11-09',
        'groupOrder':[x[1] for x in GROUPS],'sizeOrder':list(SIZES),'designCount':20,'sizeVariantCount':60,
        'sourceVersions':{r['sourceDesignId']:r['sourceVersion'] for r in indices['11x20']},
        'designOrder':[r['sourceDesignId'] for r in indices['11x20']],
        'series':['uv-gedenkkreuze-'+x for x in SIZES],
        'status':'native-sources-prepared','liveImported':False})
    print('Prepared 20 approved designs / 60 native SVG sources in 4 ordered groups.')

if __name__=='__main__':main()
