"""Chris/Claude #76, 6562929837 + 6562964893: 20 house style + 5 signatures.
Applied to source-derived masters before export. Original source data stays read-only.
"""
import copy, json, math, re
import pathops
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

def apply(c):
    masters=c['masters'];rbd=c['rbd'];ft=c['ft'];txt=c['txt'];CAT=c['CAT'];entries=c['own_entries']
    by={int(d['id'].split('-D')[-1]):d for d in masters}
    original=copy.deepcopy(by)
    def bounds(paths):
        b=[rbd.path_box(p['d']) for p in paths]
        x=min(v[0] for v in b);y=min(v[1] for v in b)
        return [x,y,max(v[0]+v[2] for v in b)-x,max(v[1]+v[3] for v in b)-y]
    def bundle(paths,**meta):return dict(box=bounds(paths),paths=paths,**meta)
    def ink(p,stroke=.6,fill=False,evenodd=False):
        return dict(d=p,fill='#000000' if fill else None,stroke=None if fill else '#000000',strokeMm=0 if fill else stroke,evenodd=evenodd,opacity=1)
    def placed(m,x,y,w,h):
        p=copy.deepcopy(m['paths']);a,b,bw,bh=bounds(p);s=min(w/bw,h/bh);ox=x+(w-bw*s)/2-a*s;oy=y+(h-bh*s)/2-b*s
        for q in p:
            q['d']=rbd.transform_path(q['d'],s,ox,oy)
            if q.get('stroke'):q['strokeMm']=max(.4,q.get('strokeMm',0)*s)
        return bundle(p,sourceMotif=m.get('sourceMotif'),scalePreserved=True)
    def allmot(d):return bundle([p for m in d['motifs'] for p in m['paths']])
    def affine(p,s,x,y,angle=0):
        a=math.radians(angle);pen=SVGPathPen(None)
        parse_path(p,TransformPen(pen,(s*math.cos(a),s*math.sin(a),-s*math.sin(a),s*math.cos(a),x,y)))
        return pen.getCommands()
    def name(value,font):
        f=ft(font);gs=f.getGlyphSet();cm=f.getBestCmap();upm=f['head'].unitsPerEm;bs=[];adv=0
        for ch in value:
            pen=BoundsPen(gs);gs[cm[ord(ch)]].draw(pen)
            if pen.bounds:bs.append((adv+pen.bounds[0],pen.bounds[1],adv+pen.bounds[2],pen.bounds[3]))
            adv+=f['hmtx'][cm[ord(ch)]][0]
        l=min(b[0] for b in bs);r=max(b[2] for b in bs);bottom=min(b[1] for b in bs);top=max(b[3] for b in bs)
        scale=min(94/(r-l),23.3/(top-bottom))
        size=scale*upm;cap=size*c['cap_factor'](font)
        # Correct actual ink centre, including swashes, not only advance width.
        x=55-(l+r-adv)/2*scale;y=62.6+bottom*scale
        t=txt(value,font,cap,x,y,300)
        return t,{'nameInkWidthMm':round((r-l)*scale,3),'nameCapMm':round(cap,3),'nameInkBox':[55-(r-l)*scale/2,62.6-(top-bottom)*scale,(r-l)*scale,(top-bottom)*scale]}
    def own(d,key,title,paths):
        # Exact stroke outlines allow the existing native contour validator to
        # inspect the painted shape of the inset cross, without box exemptions.
        for p in paths:
            if p.get('stroke'):
                src=pathops.Path();parse_path(p['d'],src.getPen())
                src.stroke(p['strokeMm'],pathops.LineCap.ROUND_CAP,pathops.LineJoin.ROUND_JOIN,4)
                src.convertConicsToQuads(.001)
                pen=SVGPathPen(None);src.draw(pen)
                p.update(d=pen.getCommands(),sourceStrokeMm=p['strokeMm'],fill='#000000',stroke=None,strokeMm=0,evenodd=False)
        m=bundle(paths);d['motifs']=[m];d['ownMotifId']=key
        folder=CAT/'motive-eigene'/key;folder.mkdir(parents=True,exist_ok=True)
        shapes=[]
        for p in paths:
            shapes.append(f'<path d="{p["d"]}" fill="{p["fill"] or "none"}" stroke="{p["stroke"] or "none"}" stroke-width="{p["strokeMm"]}" fill-rule="{"evenodd" if p.get("evenodd") else "nonzero"}" stroke-linecap="round" stroke-linejoin="round"/>')
        (folder/'motiv.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 150">'+''.join(shapes)+'</svg>',encoding='utf-8')
        provenance='Eigenentwurf Astra Mika nach Chris/Claude #76 Hausstil und Signature, 01.11.2026'
        if any(v in key for v in ['pfotensiegel','erinnerungsband','regenbogenweg']):
            provenance+='; Pfotenform aus Chris’ Original KZ-A-D46, Motiv 1, neue Komposition'
            d['sourceElements']=['KZ-A-D46 / Motiv 1: Pfotenform; eigene neue Gesamtkomposition']
        entries.append(dict(id=key,name=title,file=f'motive-eigene/{key}/motiv.svg',source=provenance,customerLibrary=False))
    fontmap={0:'Tangerine',1:'Allura',41:'Alex Brush',42:'Homage',46:'Alex Brush',48:'Ashley',53:'Great Vibes',55:'Parisienne',126:'Allura',127:'Allura',132:'Great Vibes',133:'Homage',201:'Ashley',202:'Homage',203:'Dancing Script',204:'Sacramento',205:'Italianno',301:'Sacramento',302:'Sacramento',303:'Satisfy',304:'Italianno',305:'Sacramento',306:'Alex Brush',307:'Parisienne',308:'Allura'}
    years={0:'2004 – 2019',1:'2016 – 2020',41:'2009 – 2021',42:'2012 – 2025',46:'2011 – 2024',48:'2014 – 2026',53:'2010 – 2023',55:'2004 – 2020',126:'2009 – 2022',127:'2008 – 2022',132:'2011 – 2023',133:'2008 – 2024',201:'2011 – 2023',202:'2010 – 2023',203:'2009 – 2022',204:'1997 – 2017',205:'2010 – 2021',301:'2010 – 2025',302:'2012 – 2026',303:'2009 – 2024',304:'2011 – 2026',305:'2008 – 2024',306:'2014 – 2025',307:'2010 – 2026',308:'2012 – 2026'}
    for no,d in by.items():
        t,metrics=name(d['name'],fontmap[no]);datecap=max(3.5,min(5.3,metrics['nameCapMm']/3))
        d['texts']=[t,txt(years[no],'Montserrat' if no%2 else 'Lato',datecap,55,70.2,80)]
        d['designTier']='signature' if no>=304 else 'standard'
        d['houseStyleSource']='Chris/Claude #76 comments 6562929837, 6562964893; DESIGN-MASTER §8, main f6194d158'
        d['proportions']=metrics;d['reviewMode']='neu' if not d['sourceKey'] else 'Hausstil-Referenz'
        d['reviewNotes']=['Hausstil §8 ersetzt die frühere Flächennutzung: großer einzeiliger Schreibschriftname und Jahre im Querbalken, kein Spruch im Stamm. Originalmotiv proportional neu angeordnet. Beispieljahre sind fiktiv.']
        if no in [203,204,301,303,305,307]:d['reviewNotes'].append('Namensschrift nach der neuen Hausstil-Anweisung bewusst auf Schreibschrift umgestellt; frühere Schrift war keine Schreibschrift.')
        d['layout']='Großer Schreibschriftname und Jahre im Querbalken; Originalmotiv im Stamm'
        if d['motifs']:d['motifs']=[placed(allmot(original[no]),41.5,82,27,58)]
        d.pop('ownMotifId',None)
    # Existing paired motifs stay intact, with independent proportional placement.
    for no in [0,1,53,201]:
        src=original[no]['motifs'];paths=[]
        if no==0:
            for i,m in enumerate(src[:2]):paths+=placed(m,43,84+i*30,24,25)['paths']
            by[no]['reviewNotes'].append('Das frühere kleine Todeskreuz gehörte zur Datumszeile und wird mit der neuen Jahreszeile ersetzt; beide Herzmotive bleiben.')
        elif no==201:
            paths=placed(src[0],42,84,26,47)['paths']
            if len(src)>1:paths+=placed(src[1],47,12,16,18)['paths']
        else:
            for i,m in enumerate(src):
                x=41.5 if i%2==0 else 54;y=87+(i//2)*28
                paths+=placed(m,x,y,14.5,37 if len(src)==2 else 28)['paths']
        by[no]['motifs']=[bundle(paths)]
    # Keep original single paw art; six staggered impressions instead of miniature pairs.
    pawSource=original[46]['motifs'][0];pb=pawSource['box'];pawPath=pawSource['paths'][0]['d']
    def original_paw(x,y,width,angle):
        centred=affine(pawPath,1,-pb[0]-pb[2]/2,-pb[1]-pb[3]/2)
        return ink(affine(centred,width/pb[2],x,y,angle),fill=True,evenodd=True)
    for no in [42,46,126,133]:
        paths=[]
        count={42:7,46:5,126:6,133:6}[no]
        for i in range(count):
            drift={42:.3,46:-.45,126:.5,133:-.3}[no]
            x=48.5+(i%2)*12+(i-(count-1)/2)*drift;y=84.5+i*50/(count-1)
            paths.append(original_paw(x,y,11.4,165 if i%2==0 else 195))
        by[no]['motifs']=[bundle(paths,sourceMotif={'source':'KZ-A-D46','indices':[1],'composition':f'{count} proportional impressions; no mirrored design'})]
        by[no]['motifKinds']=[f'{count} originale Hundepfoten, diagonal versetzt']
        by[no]['pawCount']=count
        by[no]['reviewNotes'].append(f'Neue Hausstil-Spur mit {count} großen Abdrücken aus Chris’ Originalpfote KZ-A-D46; frühere Pfotenanordnung ersetzt nach #6562929837.')
    # Moritz: the original bone becomes the small upper-arm sign; original paws below.
    if len(original[132]['motifs'])>1:
        by[132]['motifs']=[bundle(placed(original[132]['motifs'][2],46,15,18,14)['paths']+placed(original[132]['motifs'][0],43,89,17,20)['paths']+placed(original[132]['motifs'][1],51,114,17,20)['paths'])]
    by[202]['motifs']=[bundle(placed(original[202]['motifs'][0],42,89,24,49)['paths']+placed(original[202]['motifs'][1],56,79,12,12)['paths'])]
    stars=allmot(original[204]);a,b,w,h=stars['box']
    for p in stars['paths']:p['d']=affine(affine(p['d'],1,-a-w/2,-b-h/2),1,0,0,90)
    by[204]['motifs']=[placed(stars,42,82,26,58)]
    for no in [202,204]:
        # Preserve every original seed/star, but reinforce the finest old marks
        # with a 0.32-mm contour for the smallest production size.
        for m in by[no]['motifs']:
            for p in m['paths']:
                p['stroke']='#000000';p['strokeMm']=max(.32,p.get('strokeMm',0))
        by[no]['reviewNotes'].append('Feine Bestandsdetails vollständig erhalten und für 11×20 mit mindestens 0,32 mm Kontur verstärkt; keine Sterne oder Samen entfernt.')
    # Former own motifs remain identifiable in the standard series.
    for no in [301,302,303]:by[no]['ownMotifId']=original[no]['ownMotifId']
    # Signature 1 — moon watch. A sitting dog looks towards a crescent in a broken halo.
    d=by[304];d['signatureTitle']='Mondwache';d['motifKinds']=['Hund unter dem Mond'];d['layout']='SIGNATURE · Mondwache: Hundesilhouette und offene Mondbahn'
    dog='M48 137 C46 135 47 132 50 131 C49 127 49 122 51 119 L50 117 C46 118 44 114 46 110 C47 107 50 106 53 105 L57 103 Q58 102 60 104 L63 102 Q65 102 64 105 L63 108 Q61 112 57 114 L56 118 C57 123 60 125 60 130 L62 136 L65 137 L65 139 L56 139 L55 128 L53 134 L55 139 L46 139 C40 138 40 133 43 130 Q42 136 48 137 Z'
    paths=[ink(dog,fill=True),ink('M43 125 C35 105 43 80 58 79 C69 80 73 94 67 104',.65),ink('M61 83 C52 85 52 97 61 99 C49 101 45 87 54 81 C56 80 59 81 61 83 Z',fill=True),ink('M66 91 L67 94 L70 95 L67 96 L66 99 L65 96 L62 95 L65 94 Z',fill=True)]
    own(d,'mika-signature-mondwache-20261101','Mondwache – Hund und Mondsichel',paths)
    # Signature 2 — one uninterrupted line: heart, dog's face and a resting body.
    d=by[305];d['signatureTitle']='Herzenslinie';d['motifKinds']=['Hund und Herz als durchgehende Linie'];d['layout']='SIGNATURE · Herzenslinie: ein zusammenhängender Linienzug'
    line='M46 83 C40 78 39 85 46 91 C53 85 52 78 46 83 C44 90 53 93 59 96 C65 99 67 105 65 110 C64 114 61 114 60 110 L59 102 C54 97 47 99 45 104 C39 104 39 117 43 119 C47 121 47 110 46 107 M46 107 C46 114 48 119 53 119 C58 119 60 116 60 111 M53 119 L53 114 M50 112 Q53 110 56 112 Q54 115 53 114 Q51 115 50 112 M49 106 L49.8 106 M56 105 L56.8 105 M60 111 C68 118 69 132 61 137 C54 142 42 139 42 132 C42 126 52 124 57 129 C61 133 58 138 52 136'
    # One editable line-art motif; the facial details are short separate strokes.
    own(d,'mika-signature-herzenslinie-20261101','Herzenslinie – Hund und Herz', [ink(line,.7)])
    # Signature 3 — jeweller-like inner cross contour and a single paw seal.
    d=by[306];d['signatureTitle']='Pfoten-Siegel';d['motifKinds']=['Innenkontur und Pfoten-Siegel'];d['layout']='SIGNATURE · Pfoten-Siegel: feine Innenkontur, klare Gravurfläche'
    frame='M41 35 L41 7.5 Q41 4.5 44 4.5 L66 4.5 Q69 4.5 69 7.5 L69 35 M80 40.8 L102.5 40.8 Q105.5 40.8 105.5 44 L105.5 65.8 Q105.5 69 102.5 69 L78 69 M32 69 L7.5 69 Q4.5 69 4.5 65.8 L4.5 44 Q4.5 40.8 7.5 40.8 L30 40.8 M41 77 L41 140 Q41 143 44 143 L66 143 Q69 143 69 140 L69 77'
    seal='M55 91 C72 91 72 120 55 120 C38 120 38 91 55 91 Z M55 85 L55 88 M55 123 L55 127 M46 129 Q55 134 64 129'
    own(d,'mika-signature-pfotensiegel-20261101','Pfoten-Siegel – Innenkontur', [ink(frame,.55),ink(seal,.6),original_paw(55,105,16.5,0)])
    # Signature 4 — five falling paws cut out from a sweeping, solid remembrance ribbon.
    d=by[307];d['signatureTitle']='Erinnerungsband';d['motifKinds']=['Geschwungenes Band mit fünf ausgesparten Hundepfoten'];d['layout']='SIGNATURE · Erinnerungsband: Pfoten als Negativgravur in einer fallenden Bewegung'
    ribbon='M43 79 C70 81 74 94 58 106 C42 118 39 130 66 143 C35 137 36 119 49 105 C60 94 62 89 43 79 Z'
    # Wide ribbon with generous negative spaces; all strokes are robust at 11x20.
    ribbon='M43 79 C70 80 76 96 61 110 C48 122 46 131 66 143 C37 140 33 124 47 108 C61 93 57 87 43 79 Z'
    band=pathops.Path();parse_path(ribbon,band.getPen())
    cutouts=[];cutmetrics=[]
    for wanted,y,a in [(59,89,155),(61,100,180),(53,112,210),(45,124,180),(52,134,150)]:
        chosen=None
        for w in [9,8.5,8,7.5,7,6.5]:
            for x in sorted([40+i*.5 for i in range(61)],key=lambda x:abs(x-wanted)):
                p=pathops.Path();parse_path(original_paw(x,y,w,a)['d'],p.getPen())
                edge=pathops.Path(p);edge.stroke(.65,pathops.LineCap.ROUND_CAP,pathops.LineJoin.ROUND_JOIN,4);edge.convertConicsToQuads(.001)
                guard=pathops.op(p,edge,pathops.PathOp.UNION)
                if abs(pathops.op(guard,band,pathops.PathOp.DIFFERENCE).area)<.0001:
                    chosen=p;cutmetrics.append({'widthMm':w,'center':[x,y],'edgeClearanceMm':.325});break
            if chosen is not None:break
        assert chosen is not None,('Ribbon paw cannot fit',y)
        cutouts.append(chosen)
    for p in cutouts:band=pathops.op(band,p,pathops.PathOp.DIFFERENCE)
    d['negativePawProof']=cutmetrics
    pen=SVGPathPen(None);band.draw(pen)
    own(d,'mika-signature-erinnerungsband-20261101','Erinnerungsband – fallende Hundepfoten',[ink(pen.getCommands(),fill=True)])
    d['pawCount']=5;d['reviewNotes'].append('Chris’ Wunsch nach fallenden Pfötchen als eigener Signature-Ansatz: ausgesparte Pfoten in einem geschwungenen Gravurband.')
    # Signature 5 — an airy bridge, two distant paw prints, a curved horizon.
    d=by[308];d['signatureTitle']='Regenbogenweg';d['motifKinds']=['Regenbogenbrücke mit aufsteigenden Pfoten'];d['layout']='SIGNATURE · Regenbogenweg: offene Brückenbögen und ansteigende Spur'
    bridge='M42 139 L42 113 C42 92 68 92 68 113 L68 139 M46 138 L46 113 C46 98 64 98 64 113 L64 138 M50 137 L50 113 C50 105 60 105 60 113 L60 137 M41 141 Q55 136 69 141'
    own(d,'mika-signature-regenbogenweg-20261101','Regenbogenweg – Brücke und Pfoten',[ink(bridge,.65),original_paw(50,90,11.5,-22),original_paw(62,81.5,10,18)])
    for no in range(304,309):
        d=by[no];d['reviewNotes']=['Ohne Vorlage. Eigenständiger Signature-Entwurf nach #6562964893: '+d['signatureTitle']+'. Native Texte bleiben editierbar; Motiv einfarbig und normal lesbar, keine gespiegelte Gesamtgestaltung.']+([d['reviewNotes'][-1]] if no==307 else [])
    import importlib.util
    spec=importlib.util.spec_from_file_location('individual',c['HERE']/'grabkreuze-einzelentwuerfe.py')
    revision=importlib.util.module_from_spec(spec);spec.loader.exec_module(revision)
    revision.apply(c,locals())
    # Complete source-derived design grouping; always normal/legible, never mirrored output.
    for d in masters:
        d['normalReadingDirection']=True
        d['elementCount']=len(d['texts'])+len(d['motifs'])
        assert d['elementCount']<=20 if d['designTier']=='original' else d['elementCount']<=4
        for m in d['motifs']:m['box']=bounds(m['paths'])

