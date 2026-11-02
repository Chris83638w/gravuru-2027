"""Issue 61 / Chris 02.11.2026: twelve text-led signs per breed, only 150x100 mm.
Sources: existing catalogue dog vectors and previously authored cat motif manifest.
No family geometry, prices, libraries or approvals are changed.
"""
import argparse,json,re,hashlib,html,shutil
from pathlib import Path
from functools import lru_cache
from svgpathtools import parse_path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
import xml.etree.ElementTree as ET
ap=argparse.ArgumentParser();ap.add_argument('--sources',type=Path,required=True);ap.add_argument('--katalog',type=Path,required=True);a=ap.parse_args();src=a.sources;cat=a.katalog
def read(p):return json.loads(p.read_text(encoding='utf8'))
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
old=read(src/'auftraege/rasse-schilder-20261029/manifest.json')
aliases={'austrailian-shepherd':'australian-shepherd','dachshund':'dackel','labrador-retriver':'labrador'}
dogs={}
for m in read(src/'motive/motive.json')['motifs']:
 if not m['file'].startswith('hunderassen/'):continue
 slug=re.sub(r'-\d+$','',Path(m['file']).stem);slug=aliases.get(slug,slug)
 dogs.setdefault(slug,{'breed':slug,'name':re.sub(r'_\d+$','',m['name']),'animal':'dog','portrait':'motive/'+m['file']})
for b in old['breeds']:
 if b['animal']=='dog':
  slug={'deutscher-schaeferhund':'deutscher-schaferhund','franzoesische-bulldogge':'french-bulldog'}.get(b['breed'],b['breed']);dogs[slug]=dict(b,breed=slug)
old_dog_keys={'deutscher-schaferhund','french-bulldog','labrador','golden-retriever','dackel'}
breeds=old['breeds']+[b for slug,b in dogs.items() if slug not in old_dog_keys]
labels={'australian-shepherd':'Australian Shepherd','bernadoodle':'Bernedoodle','carne-corso':'Cane Corso'}
for b in breeds:b['name']=labels.get(b['breed'],b['name'])
fonts={f['name']:cat/f['file'] for f in read(cat/'schriften/schriften.json')['fonts'] if f.get('file')}
pairs=[('Comfortaa','Pacifico'),('Lora','Cinzel'),('Josefin Sans','Lora'),('Montserrat','Caveat'),('Patrick Hand','Roboto Slab'),('Lora','Caveat'),('Bebas Neue','Comfortaa'),('Cinzel','Lora'),('Chewy','Montserrat'),('Josefin Sans','Pacifico'),('Roboto Slab','Patrick Hand'),('Montserrat','Cinzel')]
dogtexts=[('Vorsicht Hund','Ich passe hier auf'),('Hier wacht','Mit Herz und Pfoten'),('Achtung Hund','Bitte erst klingeln'),('Hier passt auf','Mein Zuhause. Mein Revier.'),('Vorsicht, Wachhund','Ich melde jeden Besuch'),('Hier wohnt','Treuer Freund auf vier Pfoten'),('Achtung','Wachsame Augen, treues Herz'),('Hier wacht','Klein oder groß: immer wachsam'),('Vorsicht Hund','Besuch bitte anmelden'),('Willkommen bei','Chef auf vier Pfoten'),('Achtung, Hund im Haus','Ich habe euch schon gehört'),('Hier bin ich zuhause','Mein Mensch gehört zu mir')]
cattexts=[('Hier schnurrt','Kleine Pfoten, großes Glück'),('Hier wohnt','Zuhause ist, wo du schnurrst'),('Achtung, Kuschelkatze','Streicheleinheiten willkommen'),('Hier regiert','Mit Samtpfoten und Charme'),('Vorsicht, verlieb dich','Schnurren ausdrücklich erlaubt'),('Lieblingsplatz von','Hier wohnt das Katzenglück'),('Achtung, Samtpfoten','Bitte leise: Ich träume'),('Hier wacht','Über unsere Kuschelzeit'),('Willkommen bei','Mit Herz und Schnurrhaaren'),('Hier wird gekuschelt','Ein Zuhause voller Pfotenliebe'),('Kleine Pfoten','Große Liebe'),('Unser Schnurrparadies','Zwei Herzen auf Samtpfoten')]
names=['Balu','Milo','Rex','Oskar','Bruno','Luna','Nala','Mimi','Bella','Lilly','Leo','Freya','Mila','Kira','Lucy','Fiona','Simba','Charly','Mika','Oscar','Felix','Sammy','Coco','Nico','Zora','Alba','Tara','Loki','Momo','Cleo']
oldnames={b['breed']:names[i] for i,b in enumerate(old['breeds'])}
@lru_cache(None)
def font(n):
 f=TTFont(fonts[n]);return f.getBestCmap(),f['hmtx'].metrics,f['head'].unitsPerEm
def width(n,t,s):
 c,m,u=font(n);return sum(m[c[ord(ch)]][0] for ch in t)/u*s
@lru_cache(None)
def ink(n,t):
 f=TTFont(fonts[n]);gs=f.getGlyphSet();c=f.getBestCmap();u=f['head'].unitsPerEm;offset=0;bounds=[]
 for ch in t:
  g=c[ord(ch)];pen=BoundsPen(gs);gs[g].draw(pen)
  if pen.bounds:
   l,b,r,top=pen.bounds;bounds.append((l+offset,b,r+offset,top))
  offset+=f['hmtx'].metrics[g][0]
 return tuple(v/u for v in (min(b[0] for b in bounds)-offset/2,min(b[1] for b in bounds),max(b[2] for b in bounds)-offset/2,max(b[3] for b in bounds)))
@lru_cache(None)
def motif(p):
 root=ET.parse(p).getroot();assert not any(e.get('transform') for e in root.iter())
 paths=[parse_path(e.get('d')) for e in root.iter('{http://www.w3.org/2000/svg}path') if e.get('d')];bs=[p.bbox() for p in paths]
 rules={e.get('fill-rule',root.get('fill-rule','nonzero')) for e in root.iter('{http://www.w3.org/2000/svg}path') if e.get('d')};assert len(rules)==1
 return paths,(min(b[0] for b in bs),max(b[1] for b in bs),min(b[2] for b in bs),max(b[3] for b in bs)),rules.pop()
family=read(cat/'familien/edelstahl/steel-door-signs.json');size=next(s for s in family['sizes'] if s['groupKey']=='RE' and s['widthMm']==150 and s['heightMm']==100)
manifest={'date':'2026-11-02','issue':61,'plateMm':[150,100],'designsPerBreed':12,'breeds':breeds,'designs':[],'authority':'Chris 02.11.2026: nur 15x10, Warn-/Wachtexte Hunde, liebevolle Katzentexte, Tiername im Fokus. DESIGN-MASTER §7/8; Issue 61 Review 6543539547.'}
row='rasse-schilder-re-150x100';entries=[]
for bi,b in enumerate(breeds):
 pet=oldnames.get(b['breed'],names[bi%5]);animal=b['animal']
 for li in range(12):
  source=b['motifs'][li] if animal=='cat' else b;rel=source['portrait'];p=src/rel;assert p.exists()
  target=cat/rel;target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists():shutil.copyfile(p,target)
  pp,(x0,x1,y0,y1),fillrule=motif(str(p));kind=li%3
  box=([11,21,56,60] if kind==0 else [83,21,56,60] if kind==1 else [51,24,48,40])
  x,y,w,h=box;s=min(w/(x1-x0),h/(y1-y0));dx=x+(w-(x1-x0)*s)/2-x0*s;dy=y+(h-(y1-y0)*s)/2-y0*s
  title,foot=(dogtexts if animal=='dog' else cattexts)[li];name=pet+' & Milo' if animal=='cat' and li==11 else pet
  xtext=106 if kind==0 else 44 if kind==1 else 75;tw=65 if kind!=2 else 130
  positions=[(title,pairs[li][0],xtext,32 if kind!=2 else 17,6.5 if kind!=2 else 10,tw),(name,pairs[li][1],xtext,61 if kind!=2 else 82,18 if kind!=2 else 21,tw),(foot,pairs[li][0],xtext,78 if kind!=2 else 94,4.2 if kind!=2 else 6,tw)]
  texts=[]
  for ti,(text,fn,x,y,sz,mw) in enumerate(positions,1):
   sz=min(sz,mw/width(fn,text,1));assert sz>=3,(b['breed'],li,text,sz)
   texts.append({'text':text,'font':fn,'sizeMm':sz,'anchorMm':[x,y]})
  bounds=[(x0*s+dx,y0*s+dy,x1*s+dx,y1*s+dy)]
  for t in texts:
   l,bottom,r,top=ink(t['font'],t['text']);z=t['sizeMm'];tx,ty=t['anchorMm'];bounds.append((tx+l*z,ty-top*z,tx+r*z,ty-bottom*z))
  shiftx=75-(min(b[0] for b in bounds)+max(b[2] for b in bounds))/2;shifty=50-(min(b[1] for b in bounds)+max(b[3] for b in bounds))/2
  d=' '.join(q.scaled(s).translated(complex(dx+shiftx,dy+shifty)).d() for q in pp)
  rule=' fill-rule="evenodd"' if fillrule=='evenodd' else ''
  parts=[f'<g id="motiv-1"><path d="{d}" fill="#000000"{rule}/></g>']
  for ti,t in enumerate(texts,1):
   tx,ty=t['anchorMm'];tx+=shiftx;ty+=shifty;t['anchorMm']=[tx,ty]
   parts.append(f'<text id="text-{ti}" data-feld="'+('name' if ti==2 else 'spruch-'+str(ti))+f'" x="{tx:.4f}" y="{ty:.4f}" font-family="{t["font"]}" font-size="{t["sizeMm"]:.4f}" text-anchor="middle" fill="#000000">{html.escape(t["text"])}</text>')
  number=1001+bi*12+li;did=f'TRE-V2A-15x10-D{number}';folder=cat/'designs'/row/did;folder.mkdir(parents=True,exist_ok=True)
  svg='<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="100mm" viewBox="0 0 150 100">\n'+'\n'.join(parts)+'\n</svg>\n';(folder/'design.svg').write_text(svg,encoding='utf8',newline='\n')
  meta={'id':did,'name':b['name']+' · '+title,'plateMm':[150,100],'sizes':[size['key']],'material':'Edelstahl','process':'Gravur','form':'Rechteck','themes':['hundeschilder' if animal=='dog' else 'katzenschilder'],'movable':True,'fonts':list(pairs[li]),'texts':texts,'source':rel,'freigabe':None,'ziele':[{'familie':'steel-door-signs','freigabe':None}],'katalog':{'series':row,'key':row+'-D'+str(number)},'rasseReview':{'breed':b['breed'],'animal':animal,'layout':li+1,'sourceSha256':sha(p),'mode':'Referenz','note':'Neuer Textauftrag 02.11.2026, nur 15x10; Originalmotiv proportional erhalten. Vorherige andere Formate nicht Bestandteil dieser Lieferung.'}}
  save(folder/'design.json',meta);entries.append({'key':did,'pfad':did,'name':meta['name'],'plateMm':[150,100],'groessen':[size['key']],'freigabe':None})
  manifest['designs'].append({'id':did,'breed':b['breed'],'animal':animal,'layout':li+1,'folder':folder.relative_to(cat).as_posix(),'familySizeKey':size['key'],'svgSha256':sha(folder/'design.svg'),'motifSha256':sha(p),'form':'RE','plateMm':[150,100]})
save(cat/'designs'/row/'index.json',entries);save(cat/'auftraege/rasse-15x10-20261102/manifest.json',manifest)
print(json.dumps({'breeds':len(breeds),'dogs':len(dogs),'cats':len(breeds)-len(dogs),'designs':len(entries)}))
