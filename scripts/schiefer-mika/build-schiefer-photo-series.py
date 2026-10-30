"""Hunde/Katzen: eigenständige SVGs mit bytegleichen Originalfotos und echten Masken."""
from pathlib import Path
import ast,base64,collections,copy,hashlib,html,json,math,mimetypes,os,re,shutil,sys,xml.etree.ElementTree as ET
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.basePen import BasePen
from fontTools.svgLib.path import parse_path
from PIL import Image

ROOT=Path(os.environ.get('GRAVURU_PROJECT_ROOT',Path(__file__).resolve().parent.parent))
OUT=ROOT/'outputs/schiefer-foto-alle-groessen';CAT=ROOT/'Produkte-Design/gravuru-katalog-neu'
OLD=ROOT/'outputs/schiefer-alle-groessen';NS={'s':'http://www.w3.org/2000/svg'};XL='{http://www.w3.org/1999/xlink}'
# Nur die geprüften reinen Geometrie-/Schriftfunktionen des vorhandenen Baus laden.
helperfile=ROOT/'work/build-schiefer-all.py';tree=ast.parse(helperfile.read_text('utf-8'));body=[]
for node in tree.body:
    if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='groups' for t in node.targets):break
    body.append(node)
H={'__file__':str(helperfile)};exec(compile(ast.Module(body=body,type_ignores=[]),str(helperfile),'exec'),H)
width=H['width'];ink=H['ink_bounds'];glyph=H['glyph'];span=H['span'];outline=H['outline'];group_key=H['group_key'];PT=25.4/72
products=json.loads((OLD/'produkte-aus-excel.json').read_text('utf-8'))
inventory=json.loads((OUT/'quellen-inventar.json').read_text('utf-8'));picture_inventory=json.loads((OUT/'fotos-inventar.json').read_text('utf-8'))
replacements=json.loads((CAT/'schriften/ersatz-gedenktafeln-22x14.json').read_text('utf-8'))
image_cache={};path_cache={};glyph_defs={};failures=[];warnings=[]
def esc(s):return html.escape(str(s),quote=True)
def save(p,data):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(data if isinstance(data,str) else json.dumps(data,ensure_ascii=False,indent=1),encoding='utf-8')
def sha(b):return hashlib.sha256(b).hexdigest()
def tf(d,s,dx,dy):
    pen=SVGPathPen(None);parse_path(d,TransformPen(pen,(s,0,0,s,dx,dy)));return pen.getCommands()
def bbox(d):
    if d not in path_cache:
        pen=BoundsPen(None);parse_path(d,pen);a=pen.bounds;path_cache[d]=[a[0],a[1],a[2]-a[0],a[3]-a[1]]
    return path_cache[d]
def union(bs):
    if not bs:return [0,0,1,1]
    x=min(b[0] for b in bs);y=min(b[1] for b in bs);return [x,y,max(b[0]+b[2] for b in bs)-x,max(b[1]+b[3] for b in bs)-y]
def image_info(p):
    p=Path(p)
    if str(p) not in image_cache:
        b=p.read_bytes();im=Image.open(p);mime=mimetypes.guess_type(p.name)[0] or 'image/png'
        # Nur die sichtbare Quellfläche vermessen. Die Bilddatei wird nie neu gespeichert.
        rgba=im.convert('RGBA');px=rgba.load();xs=[];ys=[]
        for y in range(rgba.height):
            for x in range(rgba.width):
                r,g,bl,a=px[x,y]
                if a>30 and max(r,g,bl)>22:xs.append(x);ys.append(y)
        cb=[min(xs),min(ys),max(xs)+1-min(xs),max(ys)+1-min(ys)] if xs else [0,0,im.width,im.height]
        alpha=rgba.getchannel('A').getbbox() or (0,0,im.width,im.height)
        image_cache[str(p)]={'uri':'data:'+mime+';base64,'+base64.b64encode(b).decode(),'sha256':sha(b),'px':[im.width,im.height],'bytes':len(b),'path':str(p),'contentBoxPx':cb,'alphaBoxPx':[alpha[0],alpha[1],alpha[2]-alpha[0],alpha[3]-alpha[1]]}
    return image_cache[str(p)]
cat_photos={12,14,15,23,26,30,35};dog_photos={0,3,4,5,6,7,8,9,10,11,13,16,17,18,19,20,21,22,24,25,28,29,31,32,33,34}
cat_pool=[14,12,23,30,35,15,26];dog_pool=[0,4,7,9,11,13,16,18,19,22,24,25]
photo_class={}
for i,p in enumerate(picture_inventory):photo_class[sha(Path(p['path']).read_bytes())]='katzen' if i in cat_photos else 'hunde' if i in dog_photos else 'andere'
def refill_photo(photo,info):
    x,y,w,h=photo.get('contentWindow',photo['box']);a,b,c,d=info['contentBoxPx'];pw,ph=info['px']
    # Vollständiges Tier in die vorhandene Maske einpassen, nur dessen Anzeigegeometrie ändern.
    s=min(w*.94/c,h*.92/d);photo['imageBox']=[x+(w-c*s)/2-a*s,y+(h-d*s)/2-b*s,pw*s,ph*s]

def read_source(entry,theme,number):
    folder=Path(entry['folder']);raw=ET.parse(folder/'design.svg').getroot();meta=json.loads((folder/'design.json').read_text('utf-8'));W,Hh=meta['plate']['widthMm'],meta['plate']['heightMm']
    texts=[];duplicates=set()
    for el in raw.iter('{'+NS['s']+'}text'):
        if 'hinweis' in el.get('class','') or el.get('display')=='none':continue
        spans=el.findall('s:tspan',NS);lines=[''.join(s.itertext()) for s in spans] or [''.join(el.itertext())]
        value='\n'.join(lines).strip();font0=el.get('font-family');font=replacements.get(font0,font0);size=float(el.get('font-size'));x=float(el.get('x'));y=float(el.get('y'));lh=float(spans[1].get('dy',size*1.2)) if len(spans)>1 else size*1.2
        if not value:continue
        key=(value,font,x,y,size)
        if key in duplicates:continue
        duplicates.add(key)
        if font0!=font:
            src=next((t for t in meta['texts'] if t['text'].replace('\n','')==value.replace('\n','')),None)
            if src and src.get('box'):size*=max(.5,min(3,src['box'][2]/max(width(l,font,size) for l in lines)))
        texts.append({'text':value,'font':font,'fontOriginal':font0,'size':size,'sourceSize':float(el.get('font-size')),'x':x,'y':y,'lh':lh,'anchor':el.get('text-anchor','start')})
    name=max(texts,key=lambda t:t['sourceSize']);name['role']='name'
    for t in texts:t.setdefault('role','daten' if re.search(r'\d{4}|[†*]\s*\d',t['text']) else 'spruch')
    clips={c.get('id'):c for c in raw.iter('{'+NS['s']+'}clipPath')};photos=[]
    for im in raw.iter('{'+NS['s']+'}image'):
        if 'foto' not in im.get('class',''):continue
        href=im.get(XL+'href') or im.get('href');source_info=image_info(folder/href)
        ib=[float(im.get(k)) for k in ['x','y','width','height']];cid=re.search(r'#([^)]+)',im.get('clip-path',''))
        mask=clips[cid.group(1)].find('s:path',NS).get('d') if cid and clips[cid.group(1)].find('s:path',NS) is not None else f'M{ib[0]} {ib[1]}h{ib[2]}v{ib[3]}h{-ib[2]}Z'
        p={'mask':mask,'sourceMask':mask,'box':bbox(mask),'imageBox':ib,'sourceInfo':source_info,'info':source_info,'frames':[],'reassigned':False,'placementAdjusted':False}
        a,b,c,dd=source_info['contentBoxPx'];iw,ih=source_info['px'];bx,by,bw,bh=p['box']
        sx=max(bx,ib[0]+a/iw*ib[2],0);sy=max(by,ib[1]+b/ih*ib[3],0);ex=min(bx+bw,ib[0]+(a+c)/iw*ib[2],W);ey=min(by+bh,ib[1]+(b+dd)/ih*ib[3],Hh)
        p['contentWindow']=[sx,sy,max(1,ex-sx),max(1,ey-sy)]
        if photo_class.get(source_info['sha256'])!=theme:
            pool=cat_pool if theme=='katzen' else dog_pool;p['info']=image_info(picture_inventory[pool[(number-1)%len(pool)]]['path']);p['reassigned']=True;refill_photo(p,p['info'])
        elif entry['designNo'] in [212,213] and entry['series']=='gravur-rechteck':
            refill_photo(p,p['info']);p['placementAdjusted']=True
        photos.append(p)
    paths=[]
    for el in raw.iter('{'+NS['s']+'}path'):
        if not el.get('id','').startswith('motiv-'):continue
        fill=el.get('fill');stroke=el.get('stroke')
        if fill in [None,'none'] and stroke in [None,'none']:continue
        d=el.get('d');b=bbox(d)
        q={'d':d,'fill':fill not in [None,'none'],'stroke':stroke not in [None,'none'],'strokeMm':float(el.get('stroke-width','0')),'evenodd':el.get('fill-rule')=='evenodd','sourceId':el.get('id')}
        matching=next((p for p in photos if max(abs(a-bb) for a,bb in zip(b,p['box']))<1.5 and (d==p['mask'] or not q['fill'])),None)
        if matching:matching['frames'].append(q)
        else:paths.append(q)
    for p in photos:
        # Ein Platten-Clip ist keine riesige Fotofläche: die sichtbare Originalfläche bestimmt die Anordnung.
        if not p['frames']:p['box']=p['contentWindow']
    if not photos:raise ValueError('Kein Originalfotofeld: '+entry['path'])
    return {'key':('H' if theme=='hunde' else 'K')+'-'+entry['series'].replace('gravur-','')+'-D'+str(entry['designNo']),'theme':theme,'number':number,'name':name['text'],'source':entry['path'],'sourceId':meta['id'],'sourcePlate':[W,Hh],'sourceFolder':str(folder),'texts':texts,'photos':photos,'paths':paths,'fonts':sorted(set(t['font'] for t in texts)),'mode':'Bestandsübernahme','notes':[]}

def move_paths(paths,s,dx,dy):return [{**q,'d':tf(q['d'],s,dx,dy),'strokeMm':q['strokeMm']*s} for q in paths]
def move_photo(p,s,dx,dy):
    n={**p};x,y,w,h=p['imageBox'];n['imageBox']=[x*s+dx,y*s+dy,w*s,h*s];n['mask']=tf(p['mask'],s,dx,dy);x,y,w,h=p['box'];n['box']=[x*s+dx,y*s+dy,w*s,h*s];x,y,w,h=p['contentWindow'];n['contentWindow']=[x*s+dx,y*s+dy,w*s,h*s];n['frames']=move_paths(p['frames'],s,dx,dy);return n
def fit_photo(p,area):
    # Auch schwarze, deckende Originalränder gehören zur Bildfläche. Nicht nur
    # das helle Tier einpassen: sonst ragt das unveränderte Foto aus der Platte.
    x,y,w,h=area;ix,iy,iw,ih=p['imageBox'];a,b,c,d=p['info']['alphaBoxPx'];pw,ph=p['info']['px'];mx,my,mw,mh=bbox(p['mask'])
    bx=max(mx,ix+a/pw*iw);by=max(my,iy+b/ph*ih)
    bw=min(mx+mw,ix+(a+c)/pw*iw)-bx;bh=min(my+mh,iy+(b+d)/ph*ih)-by
    s=min(w/bw,h/bh);return move_photo(p,s,x+(w-bw*s)/2-bx*s,y+(h-bh*s)/2-by*s)
def fit_paths(paths,area):
    if not paths:return []
    x,y,w,h=area;bx,by,bw,bh=union([bbox(q['d']) for q in paths]);s=min(w/max(bw,.01),h/max(bh,.01));return move_paths(paths,s,x+(w-bw*s)/2-bx*s,y+(h-bh*s)/2-by*s)
def text_box(t):
    bs=[]
    for k,line in enumerate(t['text'].split('\n')):
        a,b,c,d=ink(line,t['font'],t['size']);tw=width(line,t['font'],t['size']);x=t['x']-(tw/2 if t['anchor']=='middle' else tw if t['anchor']=='end' else 0);y=t['y']+k*t['lh'];bs.append([x+a,y-d,c-a,d-b])
    return union(bs)
def source_groups(d):return next(t for t in d['texts'] if t['role']=='name'),[t for t in d['texts'] if t['role']=='daten'],[t for t in d['texts'] if t['role']=='spruch']
def line(t,value,size,x,y,anchor='middle'):return {**t,'text':value,'size':size,'x':x,'y':y,'lh':size*1.24,'anchor':anchor}
def name_metrics(t,size,max_height):
    b=ink(t['text'],t['font'],size)
    if b[3]-b[1]>max_height:size*=max_height/(b[3]-b[1]);b=ink(t['text'],t['font'],size)
    return size,b
def wrap(p,blocks,y,bottom,size,xclip=None,holes=[]):
    output=[]
    for t in blocks:
        words=t['text'].replace('\n',' ').split();i=0
        if not words:continue
        ib=ink(''.join(words),t['font'],size);step=max(size*1.26,(ib[3]-ib[1])*1.08)
        while i<len(words):
            y+=step
            if y>bottom:return None
            ib=ink(''.join(words),t['font'],size);lim=span(p,y-ib[3]-.2,y-ib[1]+.2,xclip,holes)
            if not lim or width(words[i],t['font'],size)>lim[1]-lim[0]:continue
            val=words[i];i+=1
            while i<len(words) and width(val+' '+words[i],t['font'],size)<=lim[1]-lim[0]:val+=' '+words[i];i+=1
            output.append(line(t,val,size,(lim[0]+lim[1])/2,y))
        y+=size*.28
    return output
def safe_area(p,y,h,xclip=None):
    lim=span(p,y,y+h,xclip)
    if not lim:return None
    return [lim[0],y,lim[1]-lim[0],h]
def artwork(d,p,area):
    x,y,w,h=area;photo=d['photos'][0];isright=photo['box'][0]+photo['box'][2]/2>d['sourcePlate'][0]/2
    if d['paths']:
        pw=w*.68;px=x+w-pw if isright else x;dx=x if isright else x+pw+w*.04
        pa=[px,y,pw,h];da=[dx,y,w*.28,h]
    else:pa=[x,y,w,h];da=None
    photos=[fit_photo(photo,pa)];paths=fit_paths(d['paths'],da) if da else []
    return photos,paths
def scaled(d,p):
    W,Hh=d['sourcePlate'];w,h=p['widthMm'],p['heightMm'];s=min(w/W,h/Hh);dx=(w-W*s)/2;dy=(h-Hh*s)/2
    ts=[{**t,'x':t['x']*s+dx,'y':t['y']*s+dy,'size':t['size']*s,'lh':t['lh']*s} for t in d['texts']]
    return {**d,'texts':ts,'paths':move_paths(d['paths'],s,dx,dy),'photos':[move_photo(a,s,dx,dy) for a in d['photos']],'mode':'proportional-original'}
def reflow(d,p,holes=[]):
    w,h=p['widthMm'],p['heightMm'];short=min(w,h);name,dates,body=source_groups(d)
    if p['form']=='Rechteck' and abs(w/h-d['sourcePlate'][0]/d['sourcePlate'][1])<.12:
        art=scaled(d,p)
        if min(t['size'] for t in art['texts'])>=3:
            for t in art['texts']:
                x,y,tw,th=text_box(t);t['x']+=max(0,.12-x)+min(0,w-.12-x-tw);t['y']+=max(0,.12-y)+min(0,h-.12-y-th)
            inside=all((lambda b:b[0]>=0 and b[1]>=0 and b[0]+b[2]<=w and b[1]+b[3]<=h)(text_box(t)) for t in art['texts'])
            if inside and not any((lambda b:any(b[0]<a['x']+a['diameterMm']/2 and b[0]+b[2]>a['x']-a['diameterMm']/2 and b[1]<a['y']+a['diameterMm']/2 and b[1]+b[3]>a['y']-a['diameterMm']/2 for a in holes))(text_box(t)) for t in art['texts']):return art
    if p['form']=='Kreuz':
        bar=[y for y in range(1,int(h)) if (lambda z:z and z[1]-z[0]>.9*w)(span(p,y,y+.1))];top,bottom=min(bar),max(bar)
        ns,ib=name_metrics(name,min(28,(bottom-top)*.48),(bottom-top)*.65);ny=(top+bottom)/2+(ib[1]+ib[3])/2;lim=span(p,ny-ib[3],ny-ib[1])
        while width(name['text'],name['font'],ns)>lim[1]-lim[0]:ns*=.95
        header=[line(name,name['text'],ns,(lim[0]+lim[1])/2,ny)]
        photoarea=safe_area(p,3,top-6);photos=[fit_photo(d['photos'][0],photoarea)]
        y=bottom+3;dt=wrap(p,dates,y,bottom+35,4.2,holes=holes)
        if dt is None:raise ValueError('Kreuz Lebensdaten')
        header+=dt;y=(dt[-1]['y'] if dt else y)+5;da=safe_area(p,y,26);paths=fit_paths(d['paths'],da);y+=30 if paths else 0
        for sz in [14,12,10,8,6.8,5.8,4.8,4,3.4,3]:
            text=wrap(p,body,y,h-5,sz,holes=holes)
            if text is not None:return {**d,'texts':header+text,'paths':paths,'photos':photos,'mode':'Kreuz neu angeordnet'}
        raise ValueError('Kreuz Text')
    wide=(p['form']=='Rechteck' and w/h>=1.2) or p['form']=='Knochen'
    if wide:
      for fraction in [.36,.30,.25]:
        aw=w*fraction;ax=2 if d['photos'][0]['box'][0]<d['sourcePlate'][0]/2 else w-aw-2
        xclip=(aw+6,w-3) if ax==2 else (3,w-aw-6)
        area=safe_area(p,h*.12,h*.76,(ax,ax+aw))
        if not area:continue
        # Foto oben, Originalmotive darunter; bei wenig Dekoration erhält das Foto mehr Raum.
        if d['paths']:
            ph=area[3]*.72;photos=[fit_photo(d['photos'][0],[area[0],area[1],area[2],ph])];paths=fit_paths(d['paths'],[area[0],area[1]+ph+1,area[2],max(1,area[3]-ph-1)])
        else:photos=[fit_photo(d['photos'][0],area)];paths=[]
        ns=min(38,h*.27);ny=h*.27
        if p['form']=='Knochen':ny=h*.34;ns=min(ns,22)
        ns,ib=name_metrics(name,ns,h*.26);ny=max(ny,ib[3]+h*.04)
        lim=span(p,ny-ib[3]-.1,ny-ib[1]+.1,xclip,holes)
        if not lim:continue
        while width(name['text'],name['font'],ns)>lim[1]-lim[0]:ns*=.95
        header=[line(name,name['text'],ns,(lim[0]+lim[1])/2,ny)]
        bottom=text_box(header[0])[1]+text_box(header[0])[3]
        dt=wrap(p,dates,bottom+1,h*.59,min(10,max(3,short*.045)),xclip,holes)
        if dt is None:continue
        header+=dt;y=max(bottom+4,dt[-1]['y']+3 if dt else bottom+3)
        for sz in [min(20,short*.12),min(18,short*.10),min(15,short*.085),min(12,short*.07),min(10,short*.055),4,3.6,3.2,3]:
            text=wrap(p,body,y,h*.94,sz,xclip,holes)
            if text is not None:return {**d,'texts':header+text,'paths':paths,'photos':photos,'mode':'Querformat neu angeordnet'}
    # Hochformat, Quadrat, Kreis und Herzen: Schriftkopf, Foto-/Motivband, vollständiger Spruch.
    for frac in [.36,.30,.25,.20,.16]:
      for nfrac in [.15,.12,.10]:
        ns=min(32,max(8,short*nfrac));ny=h*(.22 if p['form'] in ['Herz','Herz schief'] else .16)
        ns,ib=name_metrics(name,ns,short*.23);ny=max(ny,ib[3]+short*.035)
        lim=span(p,ny-ib[3]-.1,ny-ib[1]+.1,holes=holes)
        if not lim:continue
        while width(name['text'],name['font'],ns)>lim[1]-lim[0] and ns>5:ns*=.94
        header=[line(name,name['text'],ns,(lim[0]+lim[1])/2,ny)]
        b=text_box(header[0]);ny=b[1]+b[3]+short*.018
        dt=wrap(p,dates,ny,h*.43,min(10,max(3,short*.04)),holes=holes)
        if dt is None:continue
        header+=dt;ay=max(ny,dt[-1]['y']+short*.035 if dt else ny+short*.03)
        area=safe_area(p,ay,h*frac)
        if not area:continue
        photos,paths=artwork(d,p,area);y=ay+h*frac+short*.015
        for sz in [min(18,short*.09),min(16,short*.075),min(14,short*.065),min(11,short*.055),min(9,short*.045),min(7,short*.038),3.4,3.0]:
            text=wrap(p,body,y,h*.96,max(3,sz),holes=holes)
            if text is not None:return {**d,'texts':header+text,'paths':paths,'photos':photos,'mode':'Form neu angeordnet'}
    raise ValueError('Kein vollständiges Layout mit Schriftgröße ≥3 mm')

def render(art,p,preview=False,editable=False,holes=[]):
    w,h=p['widthMm'],p['heightMm'];defs=[];out=[];inkcolor='#eeeeeb' if preview else '#111111';outline_d=outline(p)
    if preview:out.append(f'<path id="ansicht-platte" d="{outline_d}" fill="#242627"/>')
    for i,photo in enumerate(art['photos'],1):
        mask=photo['mask'];defs.append(f'<clipPath id="clip-foto-{i}" clipPathUnits="userSpaceOnUse"><path d="{mask}"/></clipPath>');x,y,pw,ph=photo['imageBox'];info=photo['info']
        out.append(f'<g id="foto-{i}" class="foto" data-platzhalter="ja" data-gravur="nein" data-original-sha256="{info["sha256"]}"><path d="{mask}" fill="none" stroke="none"/><image id="originalfoto-{i}" x="{x:.7f}" y="{y:.7f}" width="{pw:.7f}" height="{ph:.7f}" preserveAspectRatio="xMidYMid meet" clip-path="url(#clip-foto-{i})" href="{info["uri"]}"/></g>')
    paths=art['paths']+[q for photo in art['photos'] for q in photo['frames']]
    for i,q in enumerate(paths,1):out.append(f'<path id="motiv-{i}" d="{q["d"]}" fill="{inkcolor if q["fill"] else "none"}" stroke="{inkcolor if q["stroke"] else "none"}" stroke-width="{q["strokeMm"]:.7f}"'+(' fill-rule="evenodd"' if q['evenodd'] else '')+'/>')
    used={};roles=collections.Counter()
    for i,t in enumerate(art['texts'],1):
        role=t['role'];roles[role]+=1;field=role+(f'-{roles[role]}' if roles[role]>1 else '')
        if editable:
            out.append(f'<text id="text-{i}" data-feld="{field}" x="{t["x"]:.7f}" y="{t["y"]:.7f}" font-family="{esc(t["font"])}" font-size="{t["size"]:.7f}" fill="{inkcolor}" text-anchor="{t["anchor"]}">'+''.join(f'<tspan x="{t["x"]:.7f}" dy="{t["lh"] if j else 0:.7f}">{esc(s)}</tspan>' for j,s in enumerate(t['text'].split('\n')) )+'</text>')
        else:
            out.append(f'<g id="schrift-{i}" data-feld="{field}" fill="{inkcolor}">')
            for j,s in enumerate(t['text'].split('\n')):
                tw=width(s,t['font'],t['size']);xx=t['x']-(tw/2 if t['anchor']=='middle' else tw if t['anchor']=='end' else 0);yy=t['y']+j*t['lh']
                for c in s:
                    key=(t['font'],c);gd,advance,upm=glyph(t['font'],c)
                    if key not in used:gid='g'+str(len(used));used[key]=gid;defs.append(f'<path id="{gid}" d="{gd}"/>')
                    out.append(f'<use href="#{used[key]}" transform="translate({xx:.7f} {yy:.7f}) scale({t["size"]/upm:.10f} {-t["size"]/upm:.10f})"/>');xx+=advance*t['size']/upm
            out.append('</g>')
    if preview:
        for i,photo in enumerate(art['photos'],1):
            ix,iy,iw,ih=photo['imageBox'];ca,cb,cc,cd=photo['info']['contentBoxPx'];ipw,iph=photo['info']['px'];mx,my,mw,mh=photo['box'];x=max(mx,ix+ca/ipw*iw);y=max(my,iy+cb/iph*ih);pw=max(1,min(mx+mw,ix+(ca+cc)/ipw*iw)-x);ph=max(1,min(my+mh,iy+(cb+cd)/iph*ih)-y);bw=min(40,pw*.52);bh=bw*.25;cx=x+pw*.5;cy=y+ph*.77
            out.append(f'<g id="upload-hinweis-{i}" data-gravur="nein" clip-path="url(#clip-foto-{i})"><rect x="{cx-bw/2:.5f}" y="{cy-bh/2:.5f}" width="{bw:.5f}" height="{bh:.5f}" rx="{bh/2:.5f}" fill="#fff" fill-opacity=".95" stroke="#d4d7d2" stroke-width=".15"/><text x="{cx:.5f}" y="{cy+bh*.13:.5f}" text-anchor="middle" font-family="sans-serif" font-size="{bw*.08:.5f}" fill="#242627">＋ Foto hochladen</text></g>')
    out.append('<g id="kontur" fill="none" stroke="#0000ff" stroke-width="0.2"><path id="aussenkontur" d="'+outline_d+'"/>'+''.join(f'<circle cx="{a["x"]}" cy="{a["y"]}" r="{a["diameterMm"]/2}"/>' for a in holes)+'</g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}"><title>{esc(art["name"])} · {esc(art["theme"])} · {w} × {h} mm</title><defs>'+''.join(defs)+'</defs>'+''.join(out)+'</svg>'

def audit_art(d,art,p):
    if ''.join(''.join(t['text'].split()) for t in d['texts'])!=''.join(''.join(t['text'].split()) for t in art['texts']):
        if collections.Counter(''.join(''.join(t['text'].split()) for t in d['texts']))!=collections.Counter(''.join(''.join(t['text'].split()) for t in art['texts'])):raise ValueError('Textinhalt verändert')
    if len(d['paths'])+sum(len(a['frames']) for a in d['photos'])!=len(art['paths'])+sum(len(a['frames']) for a in art['photos']):raise ValueError('Motivpfade fehlen')
    for t in art['texts']:
        x,y,w,h=text_box(t)
        # Schreibschriften können über ihre typografische Grundlinie hinausragen.
        # Nur tatsächliche minimale Überstände in die Platte verschieben, keine Beschneidung.
        if w<=p['widthMm']-.2 and h<=p['heightMm']-.2:
            dx=max(0,.1-x)+min(0,p['widthMm']-.1-x-w);dy=max(0,.1-y)+min(0,p['heightMm']-.1-y-h)
            if dx or dy:
                t['x']+=dx;t['y']+=dy;art.setdefault('corrections',[]).append({'text':t['text'][:35],'offsetMm':[dx,dy]});x,y,w,h=text_box(t)
        if x<-.01 or y<-.01 or x+w>p['widthMm']+.01 or y+h>p['heightMm']+.01:raise ValueError('Schriftüberstand '+t['text'][:24])
    if min(t['size'] for t in art['texts'])<2.999:raise ValueError('Schrift unter 3 mm')
    for photo in art['photos']:
        if photo['info']['sha256']!=sha(base64.b64decode(photo['info']['uri'].split(',',1)[1])):raise ValueError('Foto verändert')
    return {'minFontMm':round(min(t['size'] for t in art['texts']),3),'textPreserved':True,'motifsPreserved':True,'photoByteIdentical':True,'maskUniform':True,'corrections':art.get('corrections',[])}

def clear_of_holes(art,holes):
    for t in art['texts']:
        x,y,w,h=text_box(t)
        if any(x<a['x']+a['diameterMm']/2 and x+w>a['x']-a['diameterMm']/2 and y<a['y']+a['diameterMm']/2 and y+h>a['y']-a['diameterMm']/2 for a in holes):return False
    return True

def main():
    sources=[]
    extras={'hunde':['Tiere/Hund/gravur-herz-24x19-D7','Tiere/Allgemein/gravur-herz-18x13-D14'],'katzen':['Tiere/Katze/gravur-herz-22x22-D25','Tiere/Allgemein/gravur-herz-24x19-D9','Tiere/Allgemein/gravur-acryl-herz-20x16-D4']}
    for theme,exclude in [('hunde',{235,234,223,224,213,220,208}),('katzen',{235,234,232,230,228,220,213,208})]:
        entries=[d for d in inventory if d['series']=='gravur-rechteck' and not d['missingFonts'] and d['designNo'] not in exclude]
        entries+=[d for name in extras[theme] for d in inventory if d['path']==name]
        assert len(entries)==30
        for n,e in enumerate(entries,1):sources.append(read_source(e,theme,n))
    save(OUT/'auswahl.json',[{k:v for k,v in d.items() if k not in ['texts','paths','photos']}|{'photos':[{'source':p['info']['path'],'sha256':p['info']['sha256'],'px':p['info']['px'],'reassigned':p['reassigned'],'placementAdjusted':p['placementAdjusted'],'originalMask':p['sourceMask']} for p in d['photos']]} for d in sources])
    for d in sources:
        shutil.copy2(Path(d['sourceFolder'])/'preview.png',OUT/('quelle-'+d['key']+'.png'))
    groups=collections.defaultdict(list)
    for p in products:
        if p['status']=='passt':groups[group_key(p)].append(p)
    masters=[];results=[];repair=None
    if '--repair' in sys.argv:
        old=json.loads((OUT/'ergebnis.json').read_text('utf-8'));masters=json.loads((OUT/'master-index.json').read_text('utf-8'));results=old['results'];repair={(e['key'],e['row']) for e in old['errors']}
    for group,ps in groups.items():
        if '--base-only' in sys.argv and group!='rechteck-3-2':continue
        preferred=[p for p in ps if any(v['id']=='ohne' for v in p['variants'])] or ps
        representative=next((p for p in ps if p['excelRow']==23),min(preferred,key=lambda p:p['widthMm']*p['heightMm']))
        for d in sources:
            if group=='knochen' and d['theme']!='hunde':continue
            cache={}
            for p in ps:
                if repair is not None and (d['key'],p['excelRow']) not in repair:continue
                if '--base-only' in sys.argv and p['excelRow']!=23:continue
                folder=OUT/'ableitungen'/f'R{p["excelRow"]:02d}'/d['key']
                try:
                    ck=(p['widthMm'],p['heightMm'],p['form'],p['shapeIndex'])
                    if ck not in cache:cache[ck]=reflow(d,p)
                    art=copy.deepcopy(cache[ck]);check=audit_art(d,art,p);variants=[]
                    for v in p['variants']:
                        variant_art=reflow(d,p,v['holes']) if v['holes'] and not clear_of_holes(art,v['holes']) else art
                        audit_art(d,variant_art,p)
                        file=v['id']+('-LOCHMASSE-OFFEN' if v.get('holeStatus','').endswith('offen') else '')
                        save(folder/(file+'.svg'),render(variant_art,p,preview=True,holes=v['holes']))
                        save(folder/(file+'-gravur.svg'),render(variant_art,p,holes=v['holes']))
                        variants.append({**v,'preview':file+'.svg','engraving':file+'-gravur.svg'})
                    mainvariant=next((v for v in variants if v['id']=='ohne'),variants[0]);save(folder/'design.svg',render(art,p,editable=True,holes=mainvariant['holes']))
                    result={'key':d['key'],'theme':d['theme'],'number':d['number'],'name':d['name'],'group':group,'excelRow':p['excelRow'],'sizeMm':[p['widthMm'],p['heightMm']],'product':p['group']+' · '+p['label'],'mode':art['mode'],'variants':variants,'primary':mainvariant['preview'],'path':folder.relative_to(OUT).as_posix(),'source':d['source'],'fonts':d['fonts'],**check}
                    save(folder/'ergebnis.json',result);results.append(result)
                    if p['excelRow']==representative['excelRow']:
                        md=OUT/'master'/group/d['key'];mid='MF-'+group.upper()+'-'+d['key']
                        data={'id':mid,'name':d['name'],'themes':['gedenktafeln'],'targetGroup':d['theme'],'form':p['form'],'material':'Schiefer','process':'Gravur','plateMm':result['sizeMm'],'plate':{'widthMm':p['widthMm'],'heightMm':p['heightMm']},'varianteVon':d['sourceId'],'freigabe':None,'movable':True,'fonts':d['fonts'],'source':d['source'],'mode':art['mode'],'sizes':[f'SCHIEFER-XLSX-R{a["excelRow"]}' for a in ps],'photos':[{'maskPath':a['mask'],'imageBox':a['imageBox'],'source':a['info']['path'],'sha256':a['info']['sha256'],'px':a['info']['px'],'placeholder':True,'engrave':False,'reassigned':a['reassigned']} for a in art['photos']],'texts':art['texts'],'katalog':{'series':'schiefer-foto-'+group,'key':mid,'zielgruppe':'Tiere','unterkategorie':'Hund' if d['theme']=='hunde' else 'Katze'}}
                        if group=='rechteck-3-2':data['ziele']=[{'familie':'gedenktafel-22x14-schiefer-natur','freigabe':None}];data['sizes']=['GT-SN-RE-220X140']
                        save(md/'design.json',data);shutil.copy2(folder/'design.svg',md/'design.svg');shutil.copy2(folder/mainvariant['preview'],md/'vorschau.svg');shutil.copy2(folder/mainvariant['engraving'],md/'gravur.svg')
                        masters.append({**result,'id':mid,'path':md.relative_to(OUT).as_posix(),'representativeRow':p['excelRow']})
                except Exception as e:
                    item={'key':d['key'],'group':group,'row':p['excelRow'],'error':str(e)};failures.append(item);print('FEHLER',item,flush=True)
        print(group,'Master',sum(m['group']==group for m in masters),'Fehler',sum(m['group']==group for m in failures),flush=True)
    save(OUT/'master-index.json',masters);save(OUT/'ergebnis.json',{'masters':len(masters),'derivations':len(results),'results':results,'errors':failures,'excluded':[p for p in products if p['status']!='passt']});save(OUT/'produkte-aus-excel.json',products)
    save(OUT/'fotonachweise.json',[{k:v for k,v in a.items() if k!='uri'} for a in image_cache.values()])
    print('FERTIG',len(masters),len(results),'Fehler',len(failures),flush=True)
    for e in failures[:45]:print(e)
if __name__=='__main__':main()
