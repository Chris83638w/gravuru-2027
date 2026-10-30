"""Original family characters: hand-defined geometry, outlined for engraving.
No raster tracing, external clipart or changes to the general motif library.
"""
import argparse, hashlib, json, math
from pathlib import Path
from shapely.geometry import Point, Polygon, LineString, box
from shapely.affinity import scale, rotate, translate
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
from svgpathtools import parse_path

WIDTH=3.6  # >= 0.576 mm at the smallest 16-mm character box
class Art:
    def __init__(self): self.black=Polygon()
    def add(self,g): self.black=self.black.union(g)
    def erase(self,g): self.black=self.black.difference(g)
    def line(self,d,w=WIDTH):
        p=parse_path(d)
        for segment in p:
            count=max(3,math.ceil(segment.length(error=1e-5)/.6))
            points=[(segment.point(i/count).real,segment.point(i/count).imag) for i in range(count+1)]
            self.add(LineString(points).buffer(w/2,quad_segs=8))
    def shape(self,g,filled=False):
        if filled:self.add(g)
        else:self.add(g.boundary.buffer(WIDTH/2,quad_segs=8))
    def face(self,cx,cy,rx,ry):
        f=ellipse(cx,cy,rx,ry);self.erase(f);self.shape(f)
    def eyes(self,cx,cy,spread=13,big=False,wink=False,glasses=False):
        for side in [-1,1]:
            x=cx+side*spread
            if wink and side==1:self.line(f'M{x-4} {cy+1} Q{x} {cy-4} {x+4} {cy+1}')
            elif big:
                self.face(x,cy,10.8,12)
                self.add(ellipse(x+1,cy+1,4.3,5))
                self.erase(ellipse(x-.1,cy-1,1.65,1.65))
            else:self.add(ellipse(x,cy,2.8,3.4))
            if glasses:self.shape(ellipse(x,cy,14 if big else 7.5,15 if big else 7.5))
        if glasses:self.line(f'M{cx-4} {cy-1} Q{cx} {cy-3} {cx+4} {cy-1}')
    def smile(self,cx,cy,width=6):self.line(f'M{cx-width} {cy} Q{cx} {cy+7} {cx+width} {cy}')

def ellipse(cx,cy,rx,ry):return translate(scale(Point(0,0).buffer(1,quad_segs=24),rx,ry),cx,cy)
def rounded(x,y,w,h,r):return box(x+r,y+r,x+w-r,y+h-r).buffer(r,quad_segs=12)
def filled_path(d):
    p=parse_path(d);points=[]
    for segment in p:
        n=max(3,math.ceil(segment.length(error=1e-5)/.6))
        points.extend((segment.point(i/n).real,segment.point(i/n).imag) for i in range(n))
    return Polygon(points).buffer(0)
def heart(x,y,size):
    return translate(scale(filled_path('M0 5 C-13 -3 -8 -12 0 -5 C8 -12 13 -3 0 5 Z'),size/20,size/20),x,y)
def star(x,y,size):
    return Polygon([(x+math.cos(-math.pi/2+i*math.pi/5)*(size if i%2==0 else size*.47),y+math.sin(-math.pi/2+i*math.pi/5)*(size if i%2==0 else size*.47)) for i in range(10)])
def bow(a,x,y,size=7):
    a.add(ellipse(x-size*.6,y,size*.65,size*.5));a.add(ellipse(x+size*.6,y,size*.65,size*.5));a.add(ellipse(x,y,3,3.2))
def flower(a,x,y):
    for i in range(5):
        t=i*2*math.pi/5;a.add(ellipse(x+math.cos(t)*5,y+math.sin(t)*5,4.3,4.3))
    a.erase(ellipse(x,y,2.5,2.5))

def owl(i):
    a=Art()
    if i==2:
        a.shape(ellipse(50,55,31,32));a.line('M49 23 Q40 11 52 11 Q62 11 56 19')
    else:
        bodies=[
          'M20 23 Q14 9 30 17 Q49 5 70 17 Q87 8 79 25 C98 51 80 88 51 88 C22 89 5 52 20 23 Z',
          'M17 24 L15 10 L31 17 Q50 8 69 17 L85 9 L82 26 C96 50 83 87 50 90 C16 88 3 50 17 24 Z',
          '',
          'M20 25 Q13 8 34 17 Q58 4 73 20 Q84 11 83 28 C93 56 77 89 48 88 C20 84 9 55 20 25 Z',
          'M20 27 Q21 11 38 15 Q60 7 75 21 C95 40 87 75 62 86 C28 99 4 61 20 27 Z']
        a.shape(filled_path(bodies[i]))
    a.line('M24 52 Q13 65 29 76 Q35 65 32 57')
    a.line('M76 52 Q87 65 71 76 Q65 65 68 57')
    a.eyes(50,40 if i!=2 else 44,14,big=True,wink=i==4,glasses=i==1)
    a.add(Polygon([(45,56),(55,56),(50,64)]))
    a.add(ellipse(36,90,8,2.8));a.add(ellipse(65,90,8,2.8))
    if i==0:flower(a,26,19);a.add(heart(50,74,15))
    if i==1:bow(a,50,70,7)
    if i==2:a.add(heart(50,77,17));a.line('M23 66 Q16 59 17 52')
    if i==3:
        a.line('M38 19 Q48 9 61 19')
        for y in [70,79]:a.add(ellipse(50,y,2.8,2.8))
    if i==4:a.add(star(50,73,8));a.line('M68 19 Q76 11 80 16')
    return a

def bee(i):
    a=Art();cx=50;body=ellipse(cx,62,19 if i==2 else 24+(i==1)*3,22 if i==2 else 27)
    wing=(12,15) if i==2 else (20,12) if i==4 else (14,20)
    a.shape(rotate(ellipse(25,46,*wing),-28,origin=(25,46)))
    a.shape(rotate(ellipse(75,46,*wing),28,origin=(75,46)))
    a.line('M17 43 Q23 46 31 54');a.line('M83 43 Q77 46 69 54')
    a.shape(body)
    for y in [60,72,82]:a.add(LineString([(21,y),(79,y)]).buffer(3).intersection(body.buffer(-2)))
    a.line('M35 82 L29 91');a.line('M65 82 L71 91')
    a.add(Polygon([(47,89),(53,89),(50,96)]))
    a.face(50,33,23 if i==2 else 21,22 if i==2 else 20)
    a.line('M40 15 Q33 2 29 8');a.line('M60 15 Q67 2 71 8')
    a.add(ellipse(29,8,3,3));a.add(ellipse(71,8,3,3))
    a.eyes(50,31,8,wink=i==4,glasses=i==1);a.smile(50,41,6)
    if i==0:flower(a,31,17)
    if i==1:bow(a,50,54,6)
    if i==2:a.erase(ellipse(50,62,9,8));a.add(heart(50,64,15));a.line('M43 13 Q50 3 57 13')
    if i==3:
        cap=filled_path('M31 20 Q33 3 50 5 Q67 3 69 20 Z');a.erase(cap);a.shape(cap);a.line('M30 20 L70 20')
    if i==4:a.line('M36 52 Q50 58 65 51');a.line('M63 53 L76 66 L69 70 L60 57')
    return a

def ladybird(i):
    a=Art()
    for y,delta in [(52,-7),(66,0),(79,7)]:
        a.line(f'M24 {y} L11 {y+delta}');a.line(f'M76 {y} L89 {y+delta}')
    if i==4:
        left=rotate(filled_path('M49 46 C23 28 7 47 17 75 Q28 92 48 88 Z'),15,origin=(49,46))
        right=rotate(filled_path('M52 46 C77 29 94 48 83 76 Q70 92 52 88 Z'),-15,origin=(52,46))
        a.shape(ellipse(50,65,9,24));a.erase(left.union(right));a.shape(left);a.shape(right)
    else:
        a.shape(ellipse(50,63,25 if i in [2,3] else 29+(i==1)*2,31 if i==3 else 25 if i==2 else 29))
        a.line('M50 45 Q47 66 50 90')
    spots=[(35,54),(65,54),(34,70),(66,70),(40,82),(60,82)]
    if i==0:
        for x,y in spots[:4]:a.add(heart(x,y,10))
    elif i==2:
        for x,y in [(34,61),(65,62),(39,78),(61,78)]:a.add(ellipse(x,y,4.8,4.8))
    else:
        for k,(x,y) in enumerate(spots):
            if (i==3 and k==4) or (i==4 and k==5):continue
            a.add(ellipse(x,y,3.8+(k%2)*.6,3.8+(k%2)*.6))
    a.face(50,30,21,19)
    a.line('M39 13 Q32 1 26 8');a.line('M61 13 Q68 1 74 8')
    a.add(ellipse(26,8,3,3));a.add(ellipse(74,8,3,3))
    a.eyes(50,28,8,wink=i==4,glasses=i==1);a.smile(50,38)
    if i==0:bow(a,31,16,6)
    if i==1:bow(a,50,49,6)
    if i==2:a.line('M45 12 Q40 3 49 3 Q57 3 52 11')
    if i==3:flower(a,69,15)
    return a

def human(i,cozy=False):
    a=Art();y=26
    if cozy:
        a.shape(rounded(31,49,38,31,8))
        a.line('M31 56 Q19 65 26 75');a.line('M69 56 Q79 64 75 75')
        a.line('M40 80 L39 94 L30 94');a.line('M60 80 L61 94 L70 94')
        if i in [0,2]:a.add(heart(50,66,14))
        elif i==3:a.add(star(50,65,8))
        else:a.line('M40 70 Q50 76 60 70')
    else:
        if i in [0,2]:a.shape(filled_path('M38 49 Q50 45 62 49 L72 77 Q50 84 28 77 Z'))
        else:a.shape(rounded(34,49,32,28,5))
        a.line('M41 79 L40 94 L31 94');a.line('M59 79 L60 94 L69 94')
        if i in [0,2]:
            a.line('M36 54 Q23 45 23 35');a.add(ellipse(22,33,3.8,4.3))
            a.line('M65 54 Q75 63 76 70')
        elif i==1:
            a.line('M34 54 Q20 67 33 71');a.line('M66 54 Q80 64 68 70')
        else:
            a.line('M34 54 L22 65');a.line('M66 54 L78 65')
        if i in [0,4]:a.add(heart(50,63,12))
        if i==3:a.add(star(50,63,6.5))
    a.face(50,y,19,20)
    a.shape(ellipse(29,y+1,4,6));a.shape(ellipse(71,y+1,4,6))
    if cozy and i==0:
        a.shape(rounded(28,5,44,12,5));a.add(ellipse(50,5,6,5));a.line('M33 14 L67 14')
    elif i==0:
        a.line('M33 14 Q23 30 29 47');a.line('M67 14 Q77 30 71 47');a.line('M35 14 Q49 1 65 15')
    elif i==1:
        a.line('M31 17 Q29 4 41 9 Q43 0 52 8 Q65 1 69 17')
    elif i==2:
        a.line('M31 17 Q28 6 41 8 Q50 0 65 10 L70 30');a.shape(ellipse(30,9,6,6))
    elif i==3:
        a.line('M31 19 Q31 2 47 9 Q56 -1 65 9 L70 18')
        if cozy:a.shape(rounded(30,10,40,8,3))
    else:
        a.line('M32 17 Q50 2 67 17');a.shape(ellipse(25,17,7,6));a.shape(ellipse(75,17,7,6));bow(a,75,17,4.8)
    a.eyes(50,y,7.8,wink=i==4,glasses=i==1)
    a.smile(50,y+10,6)
    a.add(ellipse(36,y+7,2.3,2));a.add(ellipse(64,y+7,2.3,2))
    return a

def dog():
    a=Art();a.shape(rounded(27,57,46,29,12))
    a.line('M29 82 L28 94 L38 94');a.line('M70 82 L72 94 L62 94')
    a.line('M72 67 Q93 63 88 48')
    a.shape(ellipse(25,36,12,24));a.shape(ellipse(75,36,12,24))
    a.face(50,35,26,25);a.eyes(50,31,10)
    a.add(ellipse(50,43,6.5,4.7));a.line('M50 47 L50 54');a.smile(50,51,10)
    a.line('M30 60 Q50 69 70 60');a.add(heart(50,72,12))
    return a

def svg_of(art,label):
    geom=art.black.buffer(0).simplify(.04,preserve_topology=True)
    lowx,lowy,highx,highy=geom.bounds
    if min(lowx,lowy)<2 or max(highx,highy)>98:
        factor=min(96/(highx-lowx),96/(highy-lowy),1)
        geom=translate(scale(geom,factor,factor,origin=(lowx,lowy)),2-lowx,2-lowy)
    polygons=list(geom.geoms) if geom.geom_type=='MultiPolygon' else [geom]
    parts=[]
    for polygon in polygons:
        if polygon.area<.25:continue
        polygon=orient(polygon,sign=1)
        # Intersections of outlines can leave hairline white slivers. Fill those
        # deliberately in the drawing; retain broad facial and clothing spaces.
        # Evaluate after fitting the source into its 100-unit viewBox.
        def caliper_width(shape):
            corners=list(shape.minimum_rotated_rectangle.exterior.coords)
            return min(math.dist(corners[i],corners[i+1]) for i in range(4))
        if caliper_width(polygon)<3.4:continue
        holes=[ring for ring in polygon.interiors if caliper_width(Polygon(ring))>=3.4]
        for ring in [polygon.exterior,*holes]:
            points=list(ring.coords)[:-1]
            parts.append('M'+' L'.join(f'{x:.4f} {y:.4f}' for x,y in points)+' Z')
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>'+label+'</title><path fill="#000000" fill-rule="nonzero" d="'+' '.join(parts)+'"/></svg>\n'

parser=argparse.ArgumentParser();parser.add_argument('--katalog',required=True);args=parser.parse_args()
root=Path(args.katalog).resolve();folder=root/'motive-eigene/familie-mika';folder.mkdir(parents=True,exist_ok=True)
groups=[('smile',1,lambda i:human(i,False),['Winkende Herzensfigur','Brillenfigur mit Wellenhaar','Kleine Figur mit Dutt','Figur mit Stern und frecher Tolle','Figur mit Zöpfen und Augenzwinkern']),('slim',2,lambda i:human(i,True),['Kuschelige Mützenfigur','Lockige Brillenfigur','Kleine Herzpulli-Figur','Sternpulli-Figur mit Kappe','Zopf-Figur mit Augenzwinkern']),('owls',3,owl,['Blüten- und Herzeule','Brilleneule mit Schleife','Runde Babyeule mit Federlocke','Knopfeule mit Schopf','Zwinkereule mit Stern']),('bees',4,bee,['Blütenbiene','Brillenbiene mit Fliege','Herzbienchen','Mützenbiene','Zwinkerbiene mit Schal']),('ladybirds',5,ladybird,['Herzpunkt-Käfer mit Schleife','Brillenkäfer mit Fliege','Runder Käfer mit Locke','Blütenkäfer','Zwinkerkäfer mit offenen Flügeln'])]
entries=[]
for style,number,draw,labels in groups:
    for i,label in enumerate(labels):
        key=f'mika-cute-{style}-{i+1:02}'
        text=svg_of(draw(i),label);target=folder/(key+'.svg');target.write_bytes(text.encode('utf-8'))
        entries.append({'key':key,'name':label,'thema':'familienschilder','file':'familie-mika/'+key+'.svg','sha256':hashlib.sha256(text.encode()).hexdigest(),'herkunft':{'account':'Astra Mika / Codex','datum':'2026-10-30','auftrag':'Nutzer: unterschiedliche, süße eigene Figuren, nicht nur skalierte Kopien','methode':'Eigenständige parametrische Vektorzeichnung; Strichkonturen in gefüllte Vektorflächen umgewandelt; keine Fremdvorlage oder Rastervektorisierung'},'design':f'FAM-MIKA-{number:02}-P5','designs':[f'FAM-MIKA-{number:02}-P{n}' for n in [3,5] if i<n],'kundenkonfi':False,'sourceStrokeUnits':WIDTH})
key='mika-cute-dog-balu';text=svg_of(dog(),'Balu mit Schlappohren und Herzhalsband');(folder/(key+'.svg')).write_bytes(text.encode('utf-8'))
entries.append({'key':key,'name':'Balu mit Schlappohren und Herzhalsband','thema':'familienschilder','file':'familie-mika/'+key+'.svg','sha256':hashlib.sha256(text.encode()).hexdigest(),'herkunft':{'account':'Astra Mika / Codex','datum':'2026-10-30','auftrag':'Nutzer: unterschiedliche süße Figuren','methode':'Eigene parametrische Vektorzeichnung, keine Fremdvorlage'},'design':'FAM-MIKA-01-P5','designs':['FAM-MIKA-01-P5'],'kundenkonfi':False,'sourceStrokeUnits':WIDTH})
registry_path=root/'motive-eigene/motive-eigene.json';registry=json.loads(registry_path.read_text(encoding='utf-8'))
ours={m['key'] for m in entries};registry['motifs']=[m for m in registry.get('motifs',[]) if m.get('key') not in ours]+entries;registry['count']=len(registry['motifs'])
registry_path.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'newCharacters':len(entries),'differentVariantsPerStyle':5,'generalLibraryUnchanged':True}))
