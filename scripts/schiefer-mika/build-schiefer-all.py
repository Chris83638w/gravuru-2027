from pathlib import Path
import os
import json,math,re,copy,importlib.util,html,collections
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
ROOT=Path(os.environ.get('GRAVURU_PROJECT_ROOT',Path(__file__).resolve().parent.parent))
OUT=ROOT/'outputs/schiefer-alle-groessen'
BASE=ROOT/'outputs/schiefer-30-hunde-30-katzen'
SOURCE=ROOT/'Produkte-Design/gravuru-katalog-neu'
CODE=ROOT/'Produkte-Design/gravuru-2027-neu'
spec=importlib.util.spec_from_file_location('rbd',CODE/'scripts/read-bestand-designs.py');rbd=importlib.util.module_from_spec(spec);spec.loader.exec_module(rbd)
manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
unique={x['id']:x for x in manifest}
products=json.loads((OUT/'produkte-aus-excel.json').read_text(encoding='utf-8'))
shapes={x['index']:x for x in json.loads((OUT/'konturen-abgleich.json').read_text(encoding='utf-8'))}
fontdoc=json.loads((SOURCE/'schriften/schriften.json').read_text(encoding='utf-8'))
files={f['name']:SOURCE/f['file'] for f in fontdoc['fonts'] if f.get('file')}
fontcache={};glyphcache={};boundcache={}
def font(name):
    if name not in fontcache:
        tt=TTFont(files[name]);fontcache[name]=(tt,tt.getBestCmap(),tt['head'].unitsPerEm,tt.getGlyphSet())
    return fontcache[name]
def width(text,name,size):
    tt,cmap,upm,gs=font(name)
    return sum(tt['hmtx'][cmap.get(ord(c),'.notdef')][0] for c in text)*size/upm
def glyph(name,ch):
    key=(name,ch)
    if key not in glyphcache:
        tt,cmap,upm,gs=font(name);g=cmap.get(ord(ch),'.notdef');pen=SVGPathPen(gs);gs[g].draw(pen)
        glyphcache[key]=(pen.getCommands(),tt['hmtx'][g][0],upm)
    return glyphcache[key]
def ink_bounds(text,name,size):
    tt,cmap,upm,gs=font(name);boxes=[];x=0
    for ch in text:
        g=cmap.get(ord(ch),'.notdef');key=(name,g)
        if key not in boundcache:
            pen=BoundsPen(gs);gs[g].draw(pen);boundcache[key]=pen.bounds
        b=boundcache[key]
        if b:boxes.append([x+b[0],b[1],x+b[2],b[3]])
        x+=tt['hmtx'][g][0]
    return [min(b[0] for b in boxes)*size/upm,min(b[1] for b in boxes)*size/upm,max(b[2] for b in boxes)*size/upm,max(b[3] for b in boxes)*size/upm] if boxes else [0,0,0,0]
def esc(x):return html.escape(str(x),quote=True)
def outline(p):
    w,h=p['widthMm'],p['heightMm']
    if p['form']=='Rund':return f'M {w/2} 0 A {w/2} {h/2} 0 1 1 {w/2-.00001} 0 Z'
    if p['shapeIndex'] is not None:
        s=shapes[p['shapeIndex']];x,y=s['sourceOrigin']
        return rbd.transform_path(s['sourceD'],25.4/72,-x*25.4/72,-y*25.4/72)
    return f'M 0 0 H {w} V {h} H 0 Z'
def intervals(p,y):
    w,h=p['widthMm'],p['heightMm']
    if y<0 or y>h:return []
    if p['form']=='Rund':
        dx=w/2*math.sqrt(max(0,1-((y-h/2)/(h/2))**2));return [(w/2-dx,w/2+dx)]
    if p['shapeIndex'] is None:return [(0,w)]
    pts=shapes[p['shapeIndex']]['points'];xs=[]
    for a,b in zip(pts,pts[1:]+pts[:1]):
        if (a[1]<=y<b[1]) or (b[1]<=y<a[1]):xs.append(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]))
    xs.sort();return list(zip(xs[::2],xs[1::2]))
def intersect(a,b):return [(max(x,u),min(y,v)) for x,y in a for u,v in b if min(y,v)>max(x,u)]
def span(p,y0,y1,xclip=None,holes=[]):
    w=p['widthMm'];ranges=[(0,w)]
    for k in range(9):ranges=intersect(ranges,intervals(p,y0+(y1-y0)*k/8))
    if xclip:ranges=intersect(ranges,[xclip])
    for hole in holes:
        rad=hole['diameterMm']/2+.6
        if y0-rad<=hole['y']<=y1+rad:
            lo,hi=hole['x']-rad,hole['x']+rad
            ranges=[part for x,y in ranges for part in [(x,min(y,lo)),(max(x,hi),y)] if part[1]-part[0]>1]
    if not ranges:return None
    x,y=max(ranges,key=lambda a:a[1]-a[0]);pad=min(1.5,(y-x)*.025)
    return x+pad,y-pad
def pathsbox(motifs):
    boxes=[m['box'] for m in motifs]
    if not boxes:return [0,0,1,1]
    x=min(b[0] for b in boxes);y=min(b[1] for b in boxes)
    return [x,y,max(b[0]+b[2] for b in boxes)-x,max(b[1]+b[3] for b in boxes)-y]
def move_motifs(motifs,box):
    x,y,w,h=box;bx,by,bw,bh=pathsbox(motifs);s=min(w/bw,h/bh)
    dx=x+(w-bw*s)/2-bx*s;dy=y+(h-bh*s)/2-by*s
    new=copy.deepcopy(motifs)
    for m in new:
        xx,yy,ww,hh=m['box'];m['box']=[xx*s+dx,yy*s+dy,ww*s,hh*s]
        for q in m['paths']:q['d']=rbd.transform_path(q['d'],s,dx,dy);q['strokeMm']*=s
    return new
def make_text(t,value,size,x,y,align='left'):
    return dict(t,text=value,sizePt=size/rbd.PT,anchorMm=[round(x,3),round(y,3)],lineHeightMm=round(size*1.22,3),align=align)
def coalesce(texts):
    result=[]
    for t in texts:
        if result:
            a=result[-1];n=len(a['text'].split('\n'))
            if a['font']==t['font'] and a['align']==t['align'] and abs(a['sizePt']-t['sizePt'])<.001 and abs(a['anchorMm'][0]-t['anchorMm'][0])<.02 and abs(a['anchorMm'][1]+n*a['lineHeightMm']-t['anchorMm'][1])<.03 and n<7 and len(a['text']+'\n'+t['text'])<=180:
                a['text']+='\n'+t['text'];continue
        result.append(copy.deepcopy(t))
    return result
def source_parts(d):
    texts=d['texts'];cand=[t for t in texts if '\n' not in t['text'] and len(t['text'].strip().split())==1 and len(t['text'].strip())>1 and not re.search(r'\d',t['text']) and t['text'].strip() not in ['Geliebt','Unvergessen','Liebevoll','Treu','Dich','†','Wir']]
    name=next((t for t in texts if t.get('role')=='name'),None) or (max(cand,key=lambda t:t['sizePt']) if cand else max(texts,key=lambda t:t['sizePt']))
    dates=[t for t in texts if t is not name and (re.search(r'\d',t['text']) or t['text'].strip() in ['†','*'])]
    body=[t for t in texts if t is not name and t not in dates]
    grouped=[]
    for t in body:
        key=(t.get('group',id(t)),t['font'])
        if grouped and grouped[-1][0]==key:grouped[-1][1]['text']+=' '+t['text'].strip()
        else:grouped.append((key,dict(t,text=t['text'].strip())))
    return name,dates,[t for key,t in grouped]
def attached_name(new,d,mode,p):
    if mode=='proportional-original' or d['id'] not in {f'GT-S-22x14-D{x}' for x in [276,278,281,282,283,277]}:return new
    originalName,dates,body=source_parts(d)
    names=[t for t in new['texts'] if t['text']==originalName['text']]
    if not names:return new
    old=pathsbox(d['motifs']);current=pathsbox(new['motifs']);s=current[2]/old[2]
    clone=copy.deepcopy(originalName);clone['role']='name';clone['anchorMm']=[current[0]+(originalName['anchorMm'][0]-old[0])*s,current[1]+(originalName['anchorMm'][1]-old[1])*s];clone['sizePt']=max(3/rbd.PT,originalName['sizePt']*s);clone['lineHeightMm']=originalName['lineHeightMm']*s
    new['texts']=[t for t in new['texts'] if t['text']!=originalName['text']]+[clone]
    new.setdefault('warnings',[]).append('Name bleibt proportional auf dem Original-Namensband/der Original-Plakette des Motivs; kein leeres Namensband durch Umstellung.')
    return new
def wrap_body(p,blocks,y,bottom,base,xclip=None,holes=[]):
    result=[]
    for block in blocks:
        size=base*min(1.3,max(.85,block['sizePt']*rbd.PT/6));size=max(3.0,size)
        words=block['text'].replace('\n',' ').split();i=0
        while i<len(words):
            y+=size*1.23
            if y>bottom:return None
            lim=span(p,y-size*.85,y+size*.2,xclip,holes)
            if not lim or lim[1]-lim[0]<width(words[i],block['font'],size):continue
            line=words[i];i+=1
            while i<len(words) and width(line+' '+words[i],block['font'],size)<=lim[1]-lim[0]:line+=' '+words[i];i+=1
            result.append(make_text(block,line,size,(lim[0]+lim[1])/2,y,'center'))
        y+=size*.25
    return result
def scaled_original(d,p,holes=[]):
    w,h=p['widthMm'],p['heightMm'];s=min(w/220,h/140);dx=(w-220*s)/2;dy=(h-140*s)/2
    new=copy.deepcopy(d);new['motifs']=move_motifs(d['motifs'],[dx,dy,220*s,140*s])
    # Transform relative to original 220×140 plate, not to an artwork's tight bounding box.
    for old,m in zip(d['motifs'],new['motifs']):
        m['box']=[old['box'][0]*s+dx,old['box'][1]*s+dy,old['box'][2]*s,old['box'][3]*s]
        for a,b in zip(old['paths'],m['paths']):b['d']=rbd.transform_path(a['d'],s,dx,dy);b['strokeMm']=a['strokeMm']*s
    new['texts']=[]
    for t in d['texts']:
        u=copy.deepcopy(t);u['sizePt']*=s;u['lineHeightMm']*=s;u['anchorMm']=[t['anchorMm'][0]*s+dx,t['anchorMm'][1]*s+dy]
        new['texts'].append(u)
    return new
def reflow(d,p,holes=[]):
    w,h=p['widthMm'],p['heightMm'];name,dates,body=source_parts(d)
    if p['form']=='Kreuz':
        bar=[y for y in range(1,int(h)) if (lambda z:z and z[1]-z[0]>.9*w)(span(p,y,y+.1))]
        top,bottom=min(bar),max(bar);nameY=top+(bottom-top)*.66
        nameSize=min(31,(bottom-top)*.42);lim=span(p,nameY-nameSize*.85,nameY+nameSize*.2)
        while width(name['text'],name['font'],nameSize)>lim[1]-lim[0]:nameSize*=.96
        head=[make_text(name,name['text'],nameSize,(lim[0]+lim[1])/2,nameY,'center')]
        dateY=max(bottom+7,nameY-ink_bounds(name['text'],name['font'],nameSize)[1]+8)
        if dates:
            dt=dict(dates[0],text='  '.join(t['text'].replace('\n',' ').strip() for t in dates))
            dl=wrap_body(p,[dt],dateY-5,dateY+25,4.5,holes=holes)
            if dl is None:raise ValueError('Kreuz: Lebensdaten passen nicht')
            head+=dl
        artLim=span(p,4,top-4)
        artbox=[artLim[0],4,artLim[1]-artLim[0],top-8]
        for sz in [7.5,6.3,5.5,4.0,3.2,3.0]:
            bodyLines=wrap_body(p,body,head[-1]['anchorMm'][1]+8,h-7,sz,holes=holes)
            if bodyLines is not None:
                if bodyLines:
                    availableTop=head[-1]['anchorMm'][1]+8
                    currentBottom=bodyLines[-1]['anchorMm'][1]+2
                    shift=max(0,(h-7-currentBottom)*.50)
                    for t in bodyLines:t['anchorMm'][1]+=shift
                else:
                    lower=span(p,bottom+16,h-8)
                    artbox=[lower[0],bottom+16,lower[1]-lower[0],h-bottom-24]
                new=copy.deepcopy(d);new['texts']=coalesce(head+bodyLines);new['motifs']=move_motifs(d['motifs'],artbox)
                return new,'referenz-kreuz-neu-angeordnet'
        raise ValueError('Kreuz: Text passt nicht')
    # Ähnliche Querformate behalten die Originalanordnung (einschließlich 22×14).
    if p['form']=='Rechteck' and abs(w/h-220/140)<.12:
        n=scaled_original(d,p,holes)
        if min(t['sizePt']*rbd.PT for t in n['texts'])>=3 and not holes:return n,'proportional-original'
        if min(t['sizePt']*rbd.PT for t in n['texts'])>=3:
            # Nur wirklich betroffene Textzeilen um die vorhandenen Bohrkonturen umbrechen.
            good=True
            for t in n['texts']:
                sz=t['sizePt']*rbd.PT;tw=max(width(line,t['font'],sz) for line in t['text'].split('\n'));x,y=t['anchorMm'];left=x-tw/2 if t['align']=='center' else x-tw if t['align']=='right' else x
                if any(left<hole['x']+hole['diameterMm']/2 and left+tw>hole['x']-hole['diameterMm']/2 and y-sz<hole['y']+hole['diameterMm']/2 and y+sz*.3>hole['y']-hole['diameterMm']/2 for hole in holes):good=False
            if good:return n,'proportional-original'
    short=min(w,h);wide=(p['form']=='Rechteck' and w/h>=1.85) or p['form']=='Knochen'
    for artfraction in [.32,.26,.20,.14]:
      nameSize=max(7,min(short*(.26 if wide else .15),42 if wide else 30));nameY=h*.15
      if p['form'] in ['Herz','Herz schief']:nameY=h*.26;nameSize=min(nameSize,h*.12)
      xclip=None
      bx,by,bw,bh=pathsbox(d['motifs'])
      # Breite Formate: Originalmotiv auf seiner ursprünglichen Seite, Texte daneben.
      if wide:
        right=(bx+bw/2)>110;artw=min(w*.37,h*.95);artx=w-artw-3 if right else 3
        artbox=[artx,h*.12,artw,h*.76]
        xclip=(3,w-artw-9) if right else (artw+9,w-3)
        nameY=h*(.44 if p['form']=='Knochen' else .30)
        if p['form']=='Knochen':
            al=span(p,artbox[1],artbox[1]+artbox[3],(artx,artx+artw))
            if not al:continue
            artbox[0]=al[0];artbox[2]=al[1]-al[0]
      else:
        artTop=h*.30;artH=h*(.57 if not body else artfraction)
        lim=span(p,artTop,artTop+artH)
        if not lim:continue
        artbox=[lim[0],artTop,lim[1]-lim[0],artH]
      lim=span(p,nameY-nameSize*.85,nameY+nameSize*.25,xclip,holes)
      if not lim:continue
      while width(name['text'],name['font'],nameSize)>lim[1]-lim[0] and nameSize>5:nameSize*=.95
      nameInk=ink_bounds(name['text'],name['font'],nameSize)
      nameY=max(nameY,nameInk[3]+.2)
      header=[make_text(name,name['text'],nameSize,(lim[0]+lim[1])/2,nameY,'center')]
      dateY=nameY+max(4,short*.065)
      if dates:
        datefont=dates[0]['font'];datetext='  '.join(t['text'].replace('\n',' ').strip() for t in dates)
        dt=dict(dates[0],font=datefont,text=datetext)
        dateBase=min(8,max(3.2,short*.036))
        dateInk=ink_bounds(datetext,datefont,dateBase*1.3)
        dateY=max(dateY,nameY-nameInk[1]+dateInk[3]+max(1,short*.018))
        dateLines=wrap_body(p,[dt],dateY-dateBase*1.16,dateY+short*.12,dateBase,xclip,holes)
        if dateLines is None:continue
        header+=dateLines
      else:dateLines=[]
      if wide:bodyY=(header[-1]['anchorMm'][1] if header else dateY)+h*.045
      else:
        start=max(artbox[1],header[-1]['anchorMm'][1]+short*.04)
        artbox[1]=start
        # Die Kunst wird als Ganzes proportional eingepasst; alle Originalpfade bleiben erhalten.
        lim=span(p,artbox[1],artbox[1]+artbox[3])
        if not lim:continue
        artbox[0]=lim[0];artbox[2]=lim[1]-lim[0]
        bodyY=artbox[1]+artbox[3]+short*.015
      for baseSize in [min(12,short*.085) if wide else min(7,short*.043),min(10,short*.07) if wide else min(6,short*.037),3.2,3.0]:
        result=wrap_body(p,body,bodyY,h*.96,baseSize,xclip,holes)
        if result is not None:
          new=copy.deepcopy(d);new['texts']=coalesce(header+result);new['motifs']=move_motifs(d['motifs'],artbox)
          return new,'referenz-neu-angeordnet'
    # Letzter Versuch bei stark konkaven Konturen: flacheres Motivband und höhere Textnutzung.
    raise ValueError(f'Layout passt nicht: {d["id"]} / {p["form"]} {w}x{h}')

def svg_art(d,p,vector=False,holes=[],contour=True):
    w,h=p['widthMm'],p['heightMm'];out=[];defs=[];used={}
    nameText=source_parts(d)[0]['text'];roles={}
    for i,m in enumerate(d['motifs'],1):
        paths=[]
        for q in m['paths']:
            fill='none' if not q.get('fill') else '#111111';stroke='none' if not q.get('stroke') else '#111111'
            paths.append(f'<path d="{q["d"]}" fill="{fill}" stroke="{stroke}" stroke-width="{q["strokeMm"]:.5f}"'+(' fill-rule="evenodd"' if q.get('evenodd') else '')+'/>')
        out.append(f'<g id="motiv-{i}">'+''.join(paths)+'</g>')
    for i,t in enumerate(d['texts'],1):
        size=t['sizePt']*rbd.PT;x,y=t['anchorMm'];anchor={'center':'middle','right':'end'}.get(t['align'],'start')
        if not vector:
            role='name' if t['text']==nameText else 'daten' if re.search(r'\d',t['text']) else 'spruch'
            roles[role]=roles.get(role,0)+1;field=role if roles[role]==1 else role+'-'+str(roles[role])
            out.append(f'<text id="text-{i}" data-feld="{field}" x="{x:.4f}" y="{y:.4f}" font-family="{esc(t["font"])}" font-size="{size:.5f}" text-anchor="{anchor}" fill="#111111">'+''.join(f'<tspan x="{x:.4f}" dy="{0 if k==0 else t["lineHeightMm"]:.5f}">{esc(line)}</tspan>' for k,line in enumerate(t['text'].split('\n')) )+'</text>')
        else:
            for k,line in enumerate(t['text'].split('\n')):
                tw=width(line,t['font'],size);xx=x-tw/2 if t['align']=='center' else x-tw if t['align']=='right' else x
                yy=y+k*t['lineHeightMm']
                for ch in line:
                    gd,advance,upm=glyph(t['font'],ch);key=(t['font'],ch)
                    if key not in used:
                        gid='glyph-'+str(len(used));used[key]=gid
                        defs.append(f'<path id="{gid}" d="{gd}"/>')
                    out.append(f'<use href="#{used[key]}" transform="translate({xx:.5f} {yy:.5f}) scale({size/upm:.9f} {-size/upm:.9f})" fill="#111111"/>')
                    xx+=advance*size/upm
    if contour:
        out.append('<g id="schablone" fill="none" stroke="#0000ff" stroke-width="0.2"><path id="aussenkontur" d="'+outline(p)+'"/>'+''.join(f'<circle cx="{b["x"]}" cy="{b["y"]}" r="{b["diameterMm"]/2}"/>' for b in holes)+'</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}"><defs>'+''.join(defs)+'</defs>'+''.join(out)+'</svg>'

def group_key(p):
    if p['form']=='Rechteck':return 'rechteck-'+p['series'].replace(' : ','-')
    if p['form']=='Quadrat':return 'quadrat'
    if p['form']=='Rund':return 'rund'
    if p['form']=='Herz':return 'herz-102'
    if p['form']=='Herz schief':return 'herz-schief-26x19'
    return p['form'].lower()
groups=collections.defaultdict(list)
for p in products:
    if p['status']=='passt':groups[group_key(p)].append(p)
allrows=[];errors=[];masters=[]
for group,ps in groups.items():
    preferred=[p for p in ps if any(v['id']=='ohne' for v in p['variants'])] or ps
    representative=next((p for p in ps if p['excelRow']==23),min(preferred,key=lambda p:p['widthMm']*p['heightMm']))
    entries=[v for v in unique.values() if group!='knochen' or any(i['id']==v['id'] and i['theme']=='hunde' for i in manifest)]
    for entry in entries:
        d=json.loads((Path(entry['folder'])/'design.json').read_text(encoding='utf-8'))
        themes=[theme for theme in ['hunde','katzen'] if any(i['id']==entry['id'] and i['theme']==theme for i in manifest) and (group!='knochen' or theme=='hunde')]
        masterDir=OUT/'master'/group/entry['id'];masterDir.mkdir(parents=True,exist_ok=True)
        try:
            md,mode=reflow(d,representative)
            md=attached_name(md,d,mode,representative)
            designId=entry['id'] if group=='rechteck-3-2' else entry['id'].replace('22x14',group.upper())
            md['id']=designId;md['varianteVon']=entry['id']
            md['katalog']={**md.get('katalog',{}),'key':designId,'series':'schiefer-'+group+'-mika'}
            md['form']=representative['form']
            if group!='rechteck-3-2':md.pop('ziele',None)
            md.update(plateMm=[representative['widthMm'],representative['heightMm']],plate={'widthMm':representative['widthMm'],'heightMm':representative['heightMm']},sizes=[f'SCHIEFER-XLSX-R{p["excelRow"]}' for p in ps],formatreihe=group,sourceDesign=entry['id'],freigabe=None)
            (masterDir/'design.json').write_text(json.dumps(md,ensure_ascii=False,indent=1),encoding='utf-8')
            (masterDir/'design.svg').write_text(svg_art(md,representative),encoding='utf-8')
            (masterDir/'kontrollansicht.svg').write_text(svg_art(md,representative,True),encoding='utf-8')
            masters.append({'group':group,'id':entry['id'],'designId':designId,'name':entry['name'],'themes':themes,'path':str(masterDir),'representativeRow':representative['excelRow'],'mode':mode,'sourcePath':entry.get('sourcePath'),'originMode':entry['mode']})
        except Exception as e:errors.append({'group':group,'id':entry['id'],'row':representative['excelRow'],'error':str(e)});continue
        for p in ps:
            # Jede Größe wird aus demselben Master abgeleitet; keine eigenständige Designkopie als neue Gestaltung.
            folder=OUT/'ableitungen'/f'R{p["excelRow"]:02d}'/entry['id'];folder.mkdir(parents=True,exist_ok=True)
            try:
                art,mode=reflow(d,p)
                art=attached_name(art,d,mode,p)
                baseSvg=svg_art(art,p,True)
                (folder/'kontrollansicht.svg').write_text(baseSvg,encoding='utf-8')
                (folder/'design.svg').write_text(svg_art(art,p),encoding='utf-8')
                variants=[]
                for variant in p['variants']:
                    vd,vm=(art,mode) if not variant['holes'] else reflow(d,p,variant['holes'])
                    if variant['holes']:vd=attached_name(vd,d,vm,p)
                    filename=variant['id']+('-LOCHMASSE-OFFEN' if variant.get('holeStatus','').endswith('offen') else '')+'.svg'
                    (folder/filename).write_text(svg_art(vd,p,True,variant['holes']),encoding='utf-8')
                    variants.append({'id':variant['id'],'file':filename,'holes':variant['holes'],'holeStatus':variant.get('holeStatus','bekannt'),'textReflow':vm})
                result={'id':entry['id'],'group':group,'themes':themes,'excelRow':p['excelRow'],'sizeMm':[p['widthMm'],p['heightMm']],'product':p['group']+' · '+p['label'],'primary':'ohne' if any(v['id']=='ohne' for v in variants) else 'kordel-fest','variants':variants,'mode':mode,'minFontMm':round(min(t['sizePt']*rbd.PT for t in art['texts']),3),'folder':str(folder),'master':str(masterDir),'source':entry.get('sourcePath') or 'neu','status':'erstellt'}
                (folder/'ergebnis.json').write_text(json.dumps(result,ensure_ascii=False,indent=1),encoding='utf-8')
                allrows.append(result)
            except Exception as e:errors.append({'group':group,'id':entry['id'],'row':p['excelRow'],'error':str(e)})
    print(group,'Master',sum(m['group']==group for m in masters),'Fehler',sum(m['group']==group for m in errors),flush=True)
(OUT/'master-index.json').write_text(json.dumps(masters,ensure_ascii=False,indent=1),encoding='utf-8')
(OUT/'ergebnis.json').write_text(json.dumps({'masters':len(masters),'sizeDerivations':len(allrows),'results':allrows,'errors':errors,'excludedProducts':[p for p in products if p['status']!='passt'],'notes':['Konturen/Bohrungen blau. Ohne-Bohrung als erste Ausführung, soweit Excel erlaubt. Kordelprodukte unverändert feste Ausführungen.','Kontrollansichten aus Lieferform 2; bestehender Konfi ignoriert teilweise Stroke-/Evenodd-Attribute. Kein Softwarefix in diesem Paket.']},ensure_ascii=False,indent=1),encoding='utf-8')
print('Master:',len(masters),'Größenableitungen:',len(allrows),'Fehler:',len(errors))
for err in errors[:25]:print(err)
