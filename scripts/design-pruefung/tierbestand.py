"""Issue 85: curated stock compositions, preserving source fonts and motif paths.

No family, price, approval or original-stock mutation. Font gaps remain open.
"""
import argparse, collections, copy, hashlib, html, importlib.util, json, re, shutil
from pathlib import Path
import xml.etree.ElementTree as ET

ap=argparse.ArgumentParser(description=__doc__)
ap.add_argument('--katalog',type=Path,required=True)
ap.add_argument('--out',type=Path,required=True)
a=ap.parse_args(); CAT=a.katalog.resolve(); OUT=a.out.resolve(); OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('rbd',Path(__file__).resolve().parents[1]/'read-bestand-designs.py')
rbd=importlib.util.module_from_spec(spec);spec.loader.exec_module(rbd)
fonts=rbd.font_files(CAT); aliases={n.casefold():n for n in fonts}
NS='{http://www.w3.org/2000/svg}'; W,H=80,53.3
family=json.loads((CAT/'familien/edelstahl/steel-door-signs.json').read_text(encoding='utf8'))
sizes=[s['key'] for s in family['sizes'] if s['groupKey']=='RE' and abs(s['widthMm']/s['heightMm']-W/H)<.015]
targets=[{'familie':f,'freigabe':None} for f in ['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit']]
sources={p.parent.name:(p,json.loads(p.read_text(encoding='utf8'))) for p in (CAT/'designs/bestand/tierschilder').rglob('design.json')}

# Each text tuple: source text index, anchor x, baseline y, size mm, available width.
# Motif tuples: original JSON path index/list, target x/y/w/h, optional outline.
# Rectangle compositions are deliberate source-specific arrangements, never a generated face grid.
plans={
'TSHUV-AD-D1':dict(text=[(0,40,41,3.6,48),(1,40,49,6,48)],motif=[(13,1.5,2,16,48),(14,62.5,2,16,48),(15,24.1,2.9,31.8,31.8),(16,22.7,1.6,34.5,34.5)],photo=[(25.3,4.2,29.4,29.4,'circle')]),
'TSHUV-AD-D3':dict(text=[(0,58,14,4.4,39),(1,58,29,8,36)],motif=[(9,50,34,18,18)],photo=[(1,15,36,36,'circle')]),
'TSUV-A-D5':dict(text=[(0,59,31,7,36)],motif=[(5,10,5,14,9)],photo=[(3,13,34,34,'circle')]),
'TSUV-A-D7':dict(text=[(0,58,33,7,39)],motif=[(5,49,9,17,11)],photo=[(3,9,34,34,'circle')]),
'TSUV-A-D9':dict(text=[(0,57,29,5.3,40)],motif=[(4,3,3,31,46,'outline'),(5,9,34,12,17)],photo=[(6,5,25,25,'circle')]),
'TSBUV-AD-D3':dict(text=[(0,40,14,6,70),(1,23,29,3.4,37)],motif=[(18,3,3,74,14,'outline'),(19,49,21,27,29)],photo=[(50,22,25,27,'rect')],arial='Raleway'),
'TSBUV-AD-D4':dict(text=[(0,58,11,4,37),(1,58,23,6,37),(2,58,32,4.2,37),(3,58,42,3.2,36)],motif=[(17,1,1,35,51),(18,36,1,43,51)],photo=[(2,2,33,49,'rect')]),
'TSBUV-AD-D5':dict(text=[(0,57,28,4,36),(1,57,40,6,36),(2,40,12,4.8,72)],motif=[(17,4,18,28,32),(18,1,1,78,51)],photo=[(5,19,26,30,'rect')]),
'TSBUV-AD-D6':dict(text=[(0,40,14,7.5,72),(1,55,30,7,43),(2,55,41,3.8,43)],motif=[(18,2,3,76,14,'outline'),(19,1,1,78,51),(20,3,24,26,26)]),
'TSHUV-AD-D2':dict(text=[(0,21,10,3.8,37)],motif=[('paw',3,43,9,8),(1229,41,3,36,47)],photo=[(42,4,34,45,'rect')]),
'TSUV-A-D1':dict(text=[(0,40,10,5,74),(1,40,45,3.4,74),(2,40,50,3.4,74)],motif=[(1,14,15,52,24)]),
'TSUV-A-D2':dict(text=[(0,59,18,5.7,37),(1,59,34,3.4,37)],motif=[(1,3,7,36,40)]),
'TSUV-A-D4':dict(text=[(0,40,16,8,72),(1,40,32,6,72),(2,40,46,7,72)],motif=[]),
'TSUV-A-D6':dict(text=[(0,57,22,8.8,38),('quote',40,44,4.2,74)],motif=[(4,0,34.5,80,18.8,'outline')],photo=[(4,3,29,29,'circle')]),
'TSUV-A-D12':dict(text=[(0,54,15,6,46),(1,54,29,4,45)],motif=[(4,1,0,25.5,53.3,'outline')],photo=[(3,6,21,21,'rect')]),
'TSFUV-AD-D3':dict(text=[(0,40,10,5.5,73),(1,24,30,8,39),(2,24,40,3.3,40)],motif=[(6,37,32,8,9.5),(7,39,24,6.2,7),(8,43,18.4,6.2,6.3),(9,43.7,18.4,30.6,32.4),(10,4,15,72,.6)],photo=[(45,20,28,28,'circle')]),
}
def read_texts(p):
    rows=[]
    for el in ET.parse(p.with_suffix('.svg')).getroot().iter(NS+'text'):
        if 'hinweis' in(el.get('class') or ''):continue
        if float(el.get('y','0'))<0:continue # Corel production barcode outside the plate.
        spans=el.findall(NS+'tspan');lines=[''.join(x.itertext()) for x in spans] or [''.join(el.itertext())]
        txt='\n'.join(lines).strip()
        if txt:rows.append({'text':txt,'font':el.get('font-family')})
    return rows
def wrap(text,font,sz,width):
    out=[]
    for line in text.splitlines():
        cur=''
        for word in line.split():
            nxt=(cur+' '+word).strip()
            if cur and rbd.text_width(font,nxt,sz)>width:out.append(cur);cur=word
            else:cur=nxt
        out.append(cur)
    return out
def motif(meta,ref):
    which,x,y,w,h,*style=ref
    if which=='paw':
        ids=[i for i,m in enumerate(meta['motifs']) if m.get('fill')=='#1b1918' and m['box'][0]<20 and m['box'][1]>70]
    else:ids=which if isinstance(which,list) else [which]
    ms=[meta['motifs'][i] for i in ids]; bs=[rbd.path_box(m['d']) for m in ms]
    x0=min(b[0] for b in bs);y0=min(b[1] for b in bs);x1=max(b[0]+b[2] for b in bs);y1=max(b[1]+b[3] for b in bs)
    s=min(w/(x1-x0),h/(y1-y0));ox=x+(w-(x1-x0)*s)/2-x0*s;oy=y+(h-(y1-y0)*s)/2-y0*s
    paths=[]
    for i,m in zip(ids,ms):
        outline=style==['outline'];fill='none' if outline or not m.get('fill') else '#000000'
        stroke='#000000' if outline or m.get('stroke') else 'none'
        paths.append(f'<path d="{rbd.transform_path(m["d"],s,ox,oy)}" fill="{fill}" stroke="{stroke}" stroke-width="{.2 if outline else float(m.get("strokeMm",0))*s:.4f}" fill-rule="evenodd"/>')
    return ''.join(paths),{'indices':ids,'scale':s,'offsetMm':[ox,oy],'outline':bool(style)}
def build(key,plan,new=False,study=False):
    p,meta=sources[plan.get('sourceKey',key)];original=read_texts(p);texts=[];elements=[];changes=[]
    num=int(key.rsplit('D',1)[1]);prefix=key.rsplit('-D',1)[0];did=prefix+'-8x5.33-D'+str(num);series='tierbestand-'+prefix.lower()+'-80x53'
    if study:did=meta['id'];series='studien-tierbestand-80x53'
    base=OUT/series/did;base.mkdir(parents=True,exist_ok=True)
    for i,(idx,x,y,sz,width) in enumerate(plan['text'],1):
        src=copy.deepcopy(original[idx] if isinstance(idx,int) else {'text':' '.join(t['text'] for t in original[1:]),'font':original[1]['font']})
        if new:src=copy.deepcopy(plan['newTexts'][i-1])
        name=src['font'];font=plan.get('arial','Montserrat Light') if name=='Arial' else aliases.get(name.casefold(),name)
        if font not in fonts or not fonts[font].exists():raise ValueError('Schrift fehlt: '+font)
        lines=wrap(src['text'],fonts[font],sz,width)
        while max(rbd.text_width(fonts[font],l,sz) for l in lines)>width and sz>3.01:sz-=.1;lines=wrap(src['text'],fonts[font],sz,width)
        if y+(len(lines)-1)*sz*1.2>H-1:raise ValueError('Textblock zu hoch: '+src['text'])
        text='\n'.join(lines);t={'text':text,'font':font,'fontOriginal':name,'sizePt':round(sz/rbd.PT,4),'align':'center','anchorMm':[x,y],'lineHeightMm':round(sz*1.2,4),'color':'#000000'};texts.append(t)
        elements.append(f'<text id="text-{i}" data-feld="text-{i}" x="{x}" y="{y}" font-family="{html.escape(font,quote=True)}" font-size="{sz:.3f}" fill="#000000" text-anchor="middle">'+''.join(f'<tspan x="{x}" dy="{0 if j==0 else sz*1.2:.4f}">{html.escape(l)}</tspan>' for j,l in enumerate(lines))+'</text>')
        if font!=name:changes.append(name+' → '+font)
    photo=[]
    for i,(x,y,w,h,shape) in enumerate(plan.get('photo',[]),1):
        mask=f'<circle cx="{x+w/2}" cy="{y+h/2}" r="{min(w,h)/2}"/>' if shape=='circle' else f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>'
        photo.append(f'<g id="foto-{i}" data-platzhalter="ja" data-gravur="nein">{mask}</g>')
    arts=[];provenance=[]
    for i,ref in enumerate(plan['motif'],1):
        paths,record=motif(meta,ref);arts.append(f'<g id="motiv-{i}">{paths}</g>');provenance.append(record)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="53.3mm" viewBox="0 0 80 53.3">\n'+ '\n'.join(photo+arts+elements)+'\n</svg>\n'
    d={'id':did,'name':plan.get('title',key+' · '+original[0]['text']),'designNo':num,'process':'Gravur','material':'Edelstahl / Acryl 3 mm','form':'Rechteck','plate':{'widthMm':W,'heightMm':H,'source':'steel-door-signs: GR-ES-RE-80X53P3-T15'},'plateMm':[W,H],'movable':True,'themes':['katzenschilder' if key in ('TSUV-A-D6','TSUV-A-D13') else 'hundeschilder'],'sizes':sizes,'ziele':copy.deepcopy(targets),'freigabe':None,'texts':texts,'fonts':sorted({t['font'] for t in texts}),'source':str(p.relative_to(CAT)).replace('\\','/'),'varianteVon':None if new else meta['id'],'transfer':{'from':None if new else meta['id'],'fromKey':None if new else key,'decided':'2026-11-01','by':'Codex, Issue 85; Fortsetzung Hunde/Katzen','mode':'neu' if new else 'Referenz','note':'Individuelle Neuordnung für kleinste Zielgröße; Originaltexte/-schriften und ausgewählte Originalmotivpfade. Farbflächen des Druckbogens sind keine Materialfläche der Gravur.'},'katalog':{'key':series+'-D'+str(num),'series':series},'sourceMotifs':provenance,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'fontChanges':changes,'previewDependencies':['Katalog PR 11: Acryl-3-mm-Familien','Code 37c41e0: mounting=K00'],'photoFields':plan.get('photo',[])}
    (base/'design.svg').write_text(svg,encoding='utf8',newline='\n');(base/'design.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    shutil.copyfile(p.parent/'preview.png',base/'original.png')
    return {'stockId':key,'targetId':None if study else did,'previewId':did,'study':study,'series':series,'status':'Studie: Formwechsel/Kennung offen' if study else 'komponiert, native Prüfung folgt','source':d['source'],'mode':d['transfer']['mode']}
rows=[]
for key,(p,meta) in sorted(sources.items()):
    if key=='TSFUV-AD-D4':rows.append({'stockId':key,'targetId':'TSFUV-AD-8x5.33-D3','status':'zusammengeführt: visuell gleiche Anordnung, Farb-/Beispielnamenvariante','differences':'Buddy statt Juna; andere Druckfarben; leicht abweichende Ringkontur. D3 als einfarbige Masterfassung gewählt, beide Originale erhalten.','source':str(p.relative_to(CAT))});continue
    if key not in plans:
        missing=sorted({t['font'] for t in read_texts(p) if t['font']!='Arial' and t['font'].casefold() not in aliases})
        rows.append({'stockId':key,'targetId':None,'status':'offen','missingFonts':missing,'reason':'Knochenkontur fehlt in Zielfamilie; Formwechsel/Kennung offen' if key.startswith('TSK-') else 'Schriftdatei/Ersatzentscheidung fehlt','source':str(p.relative_to(CAT))});continue
    try:rows.append(build(key,plans[key]))
    except ValueError as e:rows.append({'stockId':key,'targetId':None,'status':'offen','reason':str(e)});print(key,e)
new_plans={
 'TSUV-A-D13':dict(sourceKey='TSK-S-D3',title='Mila · kleine Pfoten',text=[(0,56,13,3.7,40),(0,56,29,10,40),(0,40,46,3.4,73)],newTexts=[{'text':'Hier tobt','font':'Raleway'},{'text':'Mila','font':'Cookie'},{'text':'Kleine Pfoten, großes Zuhause.','font':'Raleway'}],motif=[(2,3,8,31,29),(1,26,3,6,6),(3,66,3,9,8)]),
 'TSUV-A-D14':dict(sourceKey='TSUV-A-D2',title='Benno · unser treuer Wächter',text=[(0,23,20,6.5,40),(0,23,33,4.8,37)],newTexts=[{'text':'Benno','font':'Michroma'},{'text':'Unser treuer\nWächter','font':'Rochester'}],motif=[(1,44,5,33,43)])}
for key,plan in new_plans.items():
    assert key not in sources, 'Neue D-Nummer bereits im Quellbogen vorhanden'
    rows.append(build(key,plan,new=True))
bone_plans={
 'TSK-S-D2':dict(text=[(0,40,15,3.8,52),(1,40,34,10,54)],motif=[(1,62,4,15,14),(2,4,38,18,12)]),
 'TSK-S-D3':dict(text=[(0,25,20,7,42),(1,25,35,5.4,43)],motif=[(1,45,13,6,6),(2,46,22,28,26),(3,4,3,11,10)]),
 'TSK-S-D4':dict(text=[(0,27,17,5,44),(1,27,35,8,44)],motif=[(1,49,24,28,24),(2,47,16,8,8),(3,4,3,11,10)]),
 'TSK-S-D5':dict(text=[(0,28,29,10,49),(1,28,43,3.8,50)],motif=[(1,57,3,20,47)]),
 'TSK-S-D7':dict(text=[(0,44,32,10,51)],motif=[(1,3,3,18,47),(2,62,4,12,12)]),
 'TSK-S-D10':dict(text=[(0,40,32,10,42)],motif=[(1,4,19,15,15),(2,61,19,15,15)])}
for key,plan in bone_plans.items():
    result=build(key,plan,study=True)
    rows[next(i for i,r in enumerate(rows) if r['stockId']==key)]=result
for series in sorted({r['series'] for r in rows if 'series' in r}):
    entries=[{'key':r['previewId'],'pfad':r['previewId'],'name':r['previewId'],'plateMm':[W,H],'groessen':sizes,'freigabe':None} for r in rows if r.get('series')==series]
    (OUT/series/'index.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
(OUT/'zuordnung.json').write_text(json.dumps({'issue':85,'date':'2026-11-01','sources':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(collections.Counter(r['status'] for r in rows),ensure_ascii=False))
