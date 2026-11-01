"""Issue 76: cat-only engraving review. Original sources remain read-only.
Design-Master and Chris' distinct-design instruction apply; no product logic changes.
"""
import importlib.util, json, re, hashlib, math
from pathlib import Path
import pathops
from fontTools.svgLib.path import parse_path
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('u',HERE/'grabkreuze-katzen-utils.py')
u=importlib.util.module_from_spec(spec);spec.loader.exec_module(u)
CAT=u.CAT;OUT=u.OUT;WORK=u.WORK;masters=[];own_entries=[]
txt=u.txt;name=u.name_text;motif=u.motif;write=u.write

def bounds(d):
    p=u.BoundsPen(None);parse_path(d,p)
    a,b,c,e=p.bounds;return [a,b,c-a,e-b]

def ink(d,w=.7,fill=False):
    if not fill:
        p=pathops.Path();parse_path(d,p.getPen());p.stroke(w,pathops.LineCap.ROUND_CAP,pathops.LineJoin.ROUND_JOIN,4)
        p.convertConicsToQuads(.001);pen=SVGPathPen(None);p.draw(pen);d=pen.getCommands()
    return dict(d=d,fill='#000000',stroke=None,strokeMm=0,sourceStrokeMm=0 if fill else w,evenodd=False,opacity=1)

def bundle(paths):
    boxes=[bounds(p['d']) for p in paths];a=min(b[0] for b in boxes);b=min(b[1] for b in boxes)
    return dict(box=[a,b,max(x+w for x,y,w,h in boxes)-a,max(y+h for x,y,w,h in boxes)-b],paths=paths)

def transform(d,s=1,x=0,y=0,angle=0):
    a=math.radians(angle);pen=SVGPathPen(None)
    parse_path(d,TransformPen(pen,(s*math.cos(a),s*math.sin(a),-s*math.sin(a),s*math.cos(a),x,y)))
    return pen.getCommands()

def circle(x,y,r):
    return f'M{x+r} {y} A{r} {r} 0 1 0 {x-r} {y} A{r} {r} 0 1 0 {x+r} {y} Z'

def subtract(d,hole):
    a=pathops.Path();b=pathops.Path();parse_path(d,a.getPen());parse_path(hole,b.getPen())
    c=pathops.op(a,b,pathops.PathOp.DIFFERENCE);c.convertConicsToQuads(.001)
    pen=SVGPathPen(None);c.draw(pen);return pen.getCommands()

def optical(t,x,top,height,maxw):
    f=u.ft(t['font']);gs=f.getGlyphSet();cmap=f.getBestCmap();boxes=[];advance=0
    for char in t['text']:
        p=u.BoundsPen(gs);gs[cmap[ord(char)]].draw(p)
        if p.bounds:
            a,b,c,e=p.bounds;boxes.append((a+advance,b,c+advance,e))
        advance+=f['hmtx'][cmap[ord(char)]][0]
    a=min(b[0] for b in boxes);b=min(b[1] for b in boxes);c=max(b[2] for b in boxes);e=max(b[3] for b in boxes)
    scale=min(height/(e-b),maxw/(c-a));sz=scale*f['head'].unitsPerEm
    t.update(sizePt=sz/u.rpd.PT,anchorMm=[x+(advance/2-(a+c)/2)*scale,top+e*scale],lineHeightMm=sz*1.2)
    return t

def standard(no,n,font,idea,src=None,tier='standard',datefont='Montserrat'):
    d=dict(id=f'KZ-A-11x20-D{no}',name=n,plate={'widthMm':110,'heightMm':200},plateMm=[110,200],texts=[name(n,font,21,55,59,94),txt('2011 – 2026',datefont,4.2,55,69,65)],motifs=[],photos=[],warnings=[],movable=True,process='Gravur',material='Acryl',form='Originalkontur KZ',source=u.source(src).relative_to(CAT).as_posix() if src else 'ohne Vorlage',sourceKey=src,reviewMode='Referenz' if src else 'neu',reviewGroup='ORIGINAL' if tier=='original' else 'REFERENZ' if src else 'NEU',designTier=tier,layout=idea,distinctiveIdea=idea,motifKinds=[idea],reviewNotes=[],pawTrail=False,normalReadingDirection=True)
    if tier=='signature':d['signatureTitle']=idea
    masters.append(d);return d

def own(d,slug,paths):
    if slug=='bluetenkatze':
        for p in paths:p['d']=transform(p['d'],.97,1.65,3.45)
    d['motifs']=[bundle(paths)];key='mika-katzen-'+slug+'-20261101';d['ownMotifId']=key
    folder=CAT/'motive-eigene'/key;folder.mkdir(parents=True,exist_ok=True)
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 150"><g id="motiv-1">'+''.join(f'<path d="{p["d"]}" fill="#000000" fill-rule="nonzero"/>' for p in paths)+'</g></svg>\n'
    (folder/'motiv.svg').write_text(svg,encoding='utf-8',newline='\n')
    own_entries.append(dict(id=key,name=d['distinctiveIdea'],file=f'motive-eigene/{key}/motiv.svg',source='Originalvektor Astra Mika; Katzen-Auftrag im Chat, 01.11.2026; keine Hundevorlage.',customerLibrary=False))

# One actual sales original, three size variants count as ONE design.
d=standard(54,'Tiger','Homage','Original: Katzenherz oben, Name quer, Erinnerung im Stamm','KZ-A-D54','original')
d['texts']=[name('Tiger','Homage',27,55,62,59),u.wrapped('Keine Zeit wird jemals die Erinnerung an eine gute Katze auslöschen.','Libre Baskerville',3.1,55,85,31)]
d['motifs']=[motif('KZ-A-D54',[1],39.2,8.25,31.6,28.13)]
d['reviewNotes']=['D40, D54 und D58 zeigen dieselbe Gestaltung; nur D54 als kleinste passende Vorlage gezählt. Originalaufteilung bleibt. Motiv für mindestens 2 mm Rand geringfügig verkleinert. Vista La Diva → Homage laut #6562403258; Georgia → Libre Baskerville laut schriften/ersatz-gedenktafeln-22x14.json. Text bei 3,1 mm H-Versalhöhe neu umbrochen.']

# Strong motif references; adapted from other shapes, explicitly not 1:1 copies.
d=standard(223,'Felix','Stylish','Offenes Pinselherz mit Pfoten','gravur-rechteck-D223',datefont='Cormorant Garamond')
d['motifs']=[motif(d['sourceKey'],[1,2],41.5,86,27,39)]
d=standard(282,'Minka','Cinzel','Engelskatze mit erhobener Pfote und Namensband','gravur-rechteck-D282',datefont='Arvo')
d['texts']=[name('Minka','Cinzel',18,55,59,85),txt('2013–2025','Arvo',3.1,55,113.4,26)]
d['motifs']=[motif(d['sourceKey'],[1],40,80,30,56)]
d=standard(25,'Minnie','Betsy Bailey','Vier offene Katzenpfoten aus der Herzvorlage','gravur-herz-22x22-D25',datefont='Cinzel')
d['motifs']=[motif(d['sourceKey'],[4,5,6,7],40,80,30,58)]
for p in d['motifs'][0]['paths']:
    p.update(stroke='#000000',strokeMm=.55)
d['pawTrail']=True
d=standard(421,'Nori','Tangerine','Zwei Katzen sitzen eng aneinandergelehnt')
own(d,'zweisamkeit',[ink('M44 132 C39 127 43 116 46 112 L44 103 L50 106 L55 104 L55 112 C59 121 58 130 54 133 M57 131 C54 124 57 115 60 112 L59 103 L64 106 L68 103 L67 113 C71 122 69 131 64 133 M45 132 C38 139 52 141 55 135 C58 141 70 139 66 133',.8)])
for d in masters[1:4]:
    d['reviewNotes']=['Motiv vollständig und proportional aus der genannten Katzenvorlage. Andere Form: neue Anordnung als Referenz. Nur Name und Jahre, Hausstil für neue Kreuzentwürfe; lange Vorlagensprüche und Fotofelder entfallen. Keine 1:1-Übernahme behauptet.']

# Fifteen new standard designs. Each has a different scene, pose, or object.
d=standard(401,'Lilly','Allura','Fensterplatz: Katze auf dem Sims unter einem Rundbogen')
own(d,'fensterplatz',[ink('M42 137 L42 96 C42 78 68 78 68 96 L68 137 M40 138 L70 138 M55 84 L55 107 M42 107 L68 107',.65),ink('M49 132 C45 126 49 120 50 118 L49 112 L53 115 L57 115 L61 112 L60 120 C66 126 63 133 58 133 L49 133 M58 132 C69 132 67 120 64 121',.8)])
d=standard(402,'Simba','Dancing Script','Wollknäuel mit Katzenohren und losem Faden')
own(d,'wollknaeuel',[ink('M44 107 L42 94 L50 99 Q55 96 61 99 L68 94 L66 107 C73 124 64 135 54 134 C40 133 36 118 44 107 Z M42 115 Q54 106 66 108 M41 122 Q54 111 69 115 M44 129 Q55 118 69 122 M51 132 Q57 125 65 128 M44 107 Q42 122 56 133 M49 101 Q47 118 64 130 M56 134 C56 143 68 136 66 141',.7)])
d=standard(403,'Smilla','Parisienne','Schlafende Katze, Nase an der Schwanzspitze')
own(d,'schlummer',[ink('M43 118 C39 101 57 93 66 106 C73 118 63 132 50 130 C39 129 38 120 43 118 M43 118 L44 109 L49 113 Q54 111 57 115 L63 111 L61 122 C58 128 48 127 43 118 M47 118 Q49 120 51 118 M55 119 Q57 121 59 119 M52 122 L54 123 M63 106 C54 98 43 109 48 114 M63 125 C55 135 43 128 46 124',.8)])
d=standard(404,'Leo','Rochester','Schreitende Katze mit hoch erhobenem Schwanz')
own(d,'spaziergang',[ink('M43 113 L41 108 L46 109 L49 106 L51 112 C58 110 64 110 65 116 C69 113 68 100 65 99 C60 97 62 105 65 102 M43 113 Q39 115 43 117 L46 118 L45 128 L49 128 L51 120 L58 121 L59 129 L63 129 L62 119 Q67 120 65 116 M49 128 L51 128 M63 129 L66 129',.85)])
d=standard(405,'Pünktchen','Sacramento','Schnurrhaare, Herz-Nase und zwei kleine Herzen')
own(d,'schnurrnase',[ink('M55 105 C51 100 47 106 55 111 C63 106 59 100 55 105 Z',fill=True),ink('M55 112 L55 116 Q51 121 47 116 M55 116 Q59 121 63 116 M48 111 L41 108 M48 114 L40 114 M62 111 L69 108 M62 114 L70 114 M45 128 C39 122 40 135 45 135 C51 135 50 122 45 128 M64 128 C58 122 59 135 64 135 C70 135 69 122 64 128',.75)])
d=standard(406,'Nelly','Great Vibes','Spielende Katze greift nach einer fallenden Feder')
own(d,'federfang',[ink('M63 84 C52 83 51 97 58 101 C66 98 68 89 63 84 M62 87 L55 106 M59 93 L63 91 M57 98 L54 94 M45 135 C40 129 44 119 48 116 L47 109 L52 112 L58 109 L57 118 Q61 120 62 126 L65 115 Q68 112 68 116 L66 132 Q58 140 45 135 M45 133 C38 139 51 143 57 137',.75)])
d=standard(407,'Fritzi','Ashley','Lesekatze auf einem offenen Buch')
own(d,'lesekatze',[ink('M40 123 Q47 119 55 123 Q63 119 70 123 L70 137 Q62 133 55 138 Q47 133 40 137 Z M55 124 L55 138 M43 127 L51 127 M43 131 L51 131 M59 127 L67 127 M59 131 L67 131 M47 119 Q45 113 48 108 L47 99 L53 103 L59 103 L65 99 L63 111 Q63 119 57 120 M57 119 C66 122 68 114 65 111 M50 110 L52 111 M58 111 L60 110',.7)])
d=standard(408,'Suki','Sweetie','Katzenkopf in einer einzelnen großen Blüte')
own(d,'bluetenkatze',[ink('M49 102 C37 96 37 110 43 113 C35 121 46 129 52 125 C57 137 68 127 64 121 C76 117 70 105 64 106 C64 93 52 94 49 102 Z M47 113 L46 105 L52 109 L58 109 L64 105 L63 115 C62 123 48 123 47 113 M52 116 L53 116 M58 116 L59 116 M55 120 L56 120 M55 129 L55 140 M55 136 Q45 131 44 136 Q49 141 55 139',.7)])
d=standard(409,'Merlin','Kaushan Script','Wachsame Katzenaugen mit Stirnzeichnung')
own(d,'katzenblick',[ink('M41 111 Q48 103 53 112 Q47 117 41 111 Z M57 112 Q62 103 69 111 Q63 117 57 112 Z M48 108 L48 113 M62 108 L62 113 M51 100 L54 104 M55 98 L55 103 M59 100 L57 104 M52 120 L58 120 L55 123 Z M55 123 L55 127 M49 125 L41 123 M49 128 L41 129 M61 125 L69 123 M61 128 L69 129',.8)])
d=standard(410,'Zora','Italianno','Katze hinter hohen Grashalmen')
own(d,'wiesenkind',[ink('M45 136 C44 124 45 115 49 109 L48 102 L53 105 L59 105 L64 101 L63 110 C67 119 65 130 61 137 M58 137 C69 137 70 123 68 120 M42 140 Q40 122 43 116 M48 140 Q44 128 42 125 M54 140 Q57 125 60 123 M62 140 Q67 133 69 132 M50 112 L52 112 M59 112 L61 112',.75)])
PAW='M-3 2 C-3 0 -1 -1 0 0 C1 -1 3 0 3 2 C4 5 1 5 0 4 C-1 5 -4 5 -3 2 Z M-3 -4 C-5 -4 -5 -1 -3 -1 C-1 -1 -1 -4 -3 -4 Z M0 -6 C-2 -6 -2 -2 0 -2 C2 -2 2 -6 0 -6 Z M3 -4 C1 -4 1 -1 3 -1 C5 -1 5 -4 3 -4 Z M5 -1 C4 -1 3 2 5 2 C7 2 7 -1 5 -1 Z'
d=standard(411,'Pepper','Betsy Bailey','Sechs versetzte Katzenpfoten fallen durch den Stamm');d['pawTrail']=True
own(d,'pfotentanz',[ink(transform(PAW,1.12,x,y,a),fill=True) for x,y,a in [(49,85,-18),(59,95,15),(48,106,-22),(59,117,18),(49,128,-13),(59,138,13)]])
d=standard(412,'Tinka','Courgette','Eine Katzenpfote ruht in einer offenen Hand')
own(d,'pfote-in-hand',[ink('M43 138 L42 125 Q40 120 42 119 Q45 118 46 123 L48 126 L47 111 Q47 108 49 110 L52 124 L52 108 Q53 105 55 108 L55 123 L58 110 Q60 108 61 111 L59 126 L63 116 Q66 114 66 118 L64 133 Q61 139 56 140',.7),ink(transform(PAW,.9,54.5,130),fill=True)])
d=standard(413,'Findus','Cookie','Rückenansicht mit langem Schwanz und einem Stern')
own(d,'sternengucker',[ink('M49 114 L48 105 L53 109 L59 109 L64 105 L63 114 C67 123 69 134 62 137 L48 137 C41 134 45 122 49 114 Z M61 137 C70 141 67 126 64 127 M54 112 L54 125',.75),ink('M56 83 L58 89 L64 89 L59 93 L61 99 L56 95 L51 99 L53 93 L48 89 L54 89 Z',.65)])
d=standard(414,'Pia','Alex Brush','Neugierige Katze hängt mit den Vorderpfoten am Querbalken')
d['texts']=[name('Pia','Alex Brush',21,32,61,45),txt('2012 – 2026','Montserrat',3.5,29,70,45)]
own(d,'querbalkenkatze',[ink('M67 53 L65 41 L73 46 L83 46 L91 40 L89 54 Q89 62 82 63 L82 66 C82 71 75 71 75 66 L75 62 L72 62 L72 67 C72 72 65 72 65 67 L65 61 M72 53 L74 53 M82 53 L84 53 M76 58 L79 60 L82 58 M66 69 C65 80 65 99 60 107 C53 117 43 112 45 104 C46 99 51 101 50 105',.8)])
d=standard(415,'Mochi','Satisfy','Katze schaut aus ihrem Karton')
own(d,'kartonplatz',[ink('M42 117 L68 117 L68 139 L42 139 Z M42 117 L39.5 124 L52 128 L55 120 L58 128 L70.5 124 L68 117 M55 129 L55 138 M47 116 L46 104 L52 108 L59 108 L65 103 L64 116 M51 113 L53 113 M58 113 L60 113 M66 136 C70 129 69 120 67 121',.75)])

# Five Signature compositions; all break the usual name-above-motif layout.
d=standard(416,'Yuki','Allura','SIGNATURE: großes Katzenporträt über rechtem Arm und Stamm',tier='signature')
d['texts']=[name('Yuki','Allura',20,29,60,44),txt('2010 – 2026','Montserrat',3.3,28,70,44)]
own(d,'signature-portrait',[ink('M61 69 C59 62 61 57 64 54 L62 40 L72 46 Q78 44 85 46 L95 40 L93 55 C97 62 92 68 82 70 C77 70 72 68 68 69 C68 84 70 96 69 109 C68 125 57 138 43 140 M68 55 Q72 52 76 56 M83 56 Q87 52 91 55 M77 61 Q81 58 84 61 L81 64 Z M81 64 L81 68 M70 62 L57 59 M70 66 L56 69 M88 62 L102 59 M88 66 L102 69 M65 71 C53 89 43 103 44 118',.85)])
d=standard(417,'Kiki','Dancing Script','SIGNATURE: senkrechter Name im langen Katzen-Schwanzbogen',tier='signature')
d['texts']=[txt('Kiki','Dancing Script',13,53,111,54,rotation=-90),txt('2011','Montserrat',4,18,60,25),txt('2026','Montserrat',4,92,60,25)]
own(d,'signature-schwanzbogen',[ink('M43 70 C40 62 43 54 46 51 L44 42 L51 47 L58 47 L65 42 L63 52 C68 60 66 70 61 75 C72 93 70 126 64 136 C58 145 40 144 41 132 C42 125 46 126 46 130 M48 57 L50 57 M57 57 L59 57 M53 62 L56 62 M49 65 Q54 69 59 65',.8)])
d=standard(418,'Cleo','Parisienne','SIGNATURE: Schriftzug in einer weit gespannten Katzen-Silhouette',tier='signature')
d['texts']=[name('Cleo','Parisienne',20,55,63,62),txt('2012 – 2026','Montserrat',4.1,55,87,32)]
own(d,'signature-silhouette',[ink(subtract('M12 68 C7 57 13 45 27 47 L25 40 L34 44 L42 41 L43 48 C59 42 77 44 85 52 C95 57 103 47 99 44 C96 41 93 44 95 47 C96 52 90 53 87 49 C85 41 97 39 103 45 C109 57 97 67 84 63 L77 69 L73 69 L76 62 C65 69 45 69 34 65 L29 70 L24 70 L27 61 C16 57 12 63 16 68 Z','M41 51 Q58 46 76 52 L76 60 Q58 66 41 61 Z'),fill=True)])
# The name lives in an intentionally open body area, never on top of white engraving.
d['texts'][0]=optical(name('Cleo','Parisienne',10,58,59,31),58,51,10,31)
d=standard(419,'Nero','Rochester','SIGNATURE: springende Katze über dem Querbalken, Name im Stamm',tier='signature')
d['texts']=[name('Nero','Rochester',11,55,101,31),txt('2011 – 2025','Montserrat',3.2,55,112,31)]
own(d,'signature-sprung',[ink('M21 59 C26 46 43 44 58 50 L71 47 L73 40 L79 46 L84 42 L84 50 Q91 53 86 57 L81 59 L77 64 L87 67 L87 70 L72 69 L62 61 L48 61 L39 68 L30 69 L29 66 L39 61 L30 56 C21 59 18 65 25 67 C46 67 46 76 45 88 M78 51 L79 51 M83 54 L92 51 M83 57 L92 59',.9)])
d=standard(420,'Lotte','Homage','SIGNATURE: Katzenpfoten tragen den Namen wie ein Namensschild',tier='signature')
d['texts']=[optical(name('Lotte','Betsy Bailey',19,55,62,54),55,46,19,54),txt('2010 – 2026','Montserrat',4,55,86,38)]
own(d,'signature-namensschild',[ink('M12 44 L98 44 L98 69 L12 69 Z M41 40 L40 27 L47 32 L61 32 L68 27 L67 40 M47 37 L49 37 M59 37 L61 37 M18 44 C18 39 25 39 25 44 L25 48 C25 54 18 54 18 48 Z M85 44 C85 39 92 39 92 44 L92 48 C92 54 85 54 85 48 Z M66 95 C70 104 68 118 60 120 C52 123 49 115 54 112',.75)])

for d in masters:
    if d['designTier']=='standard' and d['id'] not in ['KZ-A-11x20-D282','KZ-A-11x20-D414']:
        optical(d['texts'][0],55,40,24,94)
        d['texts'][1]['anchorMm'][1]=70
    d['breaksStandardLayout']=d['designTier']=='signature'
    d['fonts']=sorted({t['font'] for t in d['texts']})
    d.update(minimumContourMarginMm=2,marginDecision='Chris #76 Kommentar 6562491600; gleiche Gravurfamilie.',themes=['katzengedenktafeln'],freigabe=None,ziele=[{'familie':'grabkreuz-acryl-5mm-schwarz','freigabe':None}],sizes=['KZ-A-11x20'],formatreihe='Grabkreuze Acryl – Katzen Erstprüfung Schwarz 11×20')
    d['katalog']={'key':d['id'],'series':OUT.name,'zielgruppe':'Tiere','unterkategorie':'Katze'}
    d['elementCount']=len(d['texts'])+len(d['motifs'])
    d['compositionFingerprint']=hashlib.sha256(json.dumps(d['motifs'],sort_keys=True).encode()).hexdigest()
    folder=OUT/d['id'];folder.mkdir(parents=True,exist_ok=True);write(folder/'design.json',d)
    svg=u.rpd.design_svg(d);svg=re.sub(r'<rect id="platte"[^>]*/>',f'<path id="platte" d="{u.contour}" fill="none" stroke="#FF0000" stroke-width="0.0762"/>',svg)
    for i,t in enumerate(d['texts'],1):
        if t.get('rotation'):
            x,y=t['anchorMm'];cy=y-.35*t['sizePt']*u.rpd.PT
            svg=re.sub(fr'<text id="text-{i}"(.*?)</text>',lambda m:f'<g id="text-{i}" transform="rotate({t["rotation"]} {x} {cy})"><text'+m.group(1)+'</text></g>',svg,flags=re.S)
    (folder/'design.svg').write_text(svg.replace('\r',''),encoding='utf-8',newline='\n')
write(OUT/'index.json',{'name':'Grabkreuz Acryl – Katzen · Erstprüfung','designs':[{'id':d['id'],'path':d['id'],'name':d['name']} for d in masters]})
idxfile=CAT/'motive-eigene/motive-eigene.json';idx=json.loads(idxfile.read_text(encoding='utf-8'));ids={d['id'] for d in own_entries}
idx['motifs']=[d for d in idx['motifs'] if d['id'] not in ids]+own_entries;idx['count']=len(idx['motifs']);write(idxfile,idx)
write(WORK/'auswahl.json',[{k:d[k] for k in ['id','name','source','sourceKey','reviewMode','reviewGroup','layout','fonts','motifKinds','reviewNotes','designTier']} for d in masters])
assert len(masters)==25 and len({d['name'] for d in masters})==25
print('25 Katzen: 1 Verkaufsoriginal, 3 Motiv-Referenzen, 16 neue Standard- und 5 Signature-Entwürfe.')
