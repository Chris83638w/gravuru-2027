"""Issue 76 latest feedback: 8 originals + 4 UV references + 5 plaques + 8 new.
Only black 11x20. Source folders are read-only; generated images stay outside catalog.
"""
import copy, importlib.util, json, re, shutil, os
from pathlib import Path
from functools import lru_cache
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
HERE=Path(__file__).resolve().parent; ROOT=HERE.parent
CAT=Path(os.environ.get('GRAVURU_KATALOG',ROOT.parent/'grabkreuze-hunde-katalog'))
WORK=Path(os.environ.get('GRAVURU_DOG_REVIEW',ROOT.parent.parent/'outputs/grabkreuze-hunde-nachauftrag'))
OUT=CAT/'designs/grabkreuze-hunde-11x20'; WORK.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('rbd',HERE/'read-bestand-designs.py'); rbd=importlib.util.module_from_spec(spec);spec.loader.exec_module(rbd);rpd=rbd.rpd
fonts=rbd.font_files(CAT)
replacements={r['from']:r['to'] for r in json.loads((CAT/'schriften/schriften.json').read_text(encoding='utf-8'))['replacements']}
contour=json.loads((CAT/'schneidvorlagen/kreuze/kreuze.json').read_text(encoding='utf-8'))['11x20']['outline']
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
masters=[]
def design(no,name,src,group,layout,motifs,notes=None):
    d=dict(id=f'KZ-A-11x20-D{no}',name=name,plate={'widthMm':110,'heightMm':200},plateMm=[110,200],texts=[],motifs=[],photos=[],warnings=[],movable=True,process='Gravur',material='Acryl',form='Originalkontur KZ')
    d.update(source=source(src).relative_to(CAT).as_posix() if src else 'ohne Vorlage',reviewMode='neu' if not src else 'Referenz',reviewGroup=group,layout=layout,motifKinds=motifs,reviewNotes=notes or [],sourceKey=src)
    masters.append(d);return d
def transferred(d,indices):
    d['texts']=convert(d['sourceKey'])['texts'];src=d['sourceKey'];r=raw(src);s=min(110/r['plate']['widthMm'],200/r['plate']['heightMm']);ox=(110-r['plate']['widthMm']*s)/2;oy=(200-r['plate']['heightMm']*s)/2
    for ids in indices:
        m=motif(src,ids)
        for p in m['paths']:p['d']=rbd.transform_path(p['d'],s,ox,oy);p['strokeMm']*=s
        a,b,w,h=m['box'];m['box']=[a*s+ox,b*s+oy,w*s,h*s];d['motifs'].append(m)
    d['reviewNotes'].append('Unverzerrte Übertragung auf die finale 110×200-Kontur; bestätigte Ersatzschriften, Mindesthöhe und Fotofeldentfernung sind einzeln vermerkt.')
    return d
# A: preserve the three accepted reference transfers exactly, including sparse stems.
for no,name,kind in [(0,'Tapsy',['Hund im Herz','Pfotenherz']),(53,'Kira',['Rosenpaar']),(55,'Rocky',['Hund im Herz'])]:
    d=design(no,name,f'KZ-A-D{no}','A','Original: '+name,kind,['Bereits geliefertes Original bleibt gemäß Pflichtliste. Ruhiger Stamm ist Teil dieser Vorlage.'])
    old=rbd.convert(source(d['sourceKey']),[110,200],'KZ-A-11x20',replacements,fonts)
    d['texts']=old['texts'];d['motifs']=old['motifs'];d['reviewMode']='1:1'
d=design(1,'Buffy','KZ-A-D1','A','Name oben, Flügel im Querbalken, Spruch im Stamm',['Flügelpaar','Pfotenduo'],['22×40-Original proportional übertragen; Fotofeld samt Bedienzeichen entfernt. Flügel und Pfoten erhalten; längerer Spruch lesbar neu umbrochen.'])
d['texts']=[txt('Buffy','Allura',12,55,28,29),txt('2016 – 2020','Allura',3.2,55,38,31),flow('Ich bin nicht tot, ich tausche nur die Räume, ich leb’ in euch und geh’ durch eure Träume.','Allura',82,136,31)]
d['motifs']=[motif('KZ-A-D1',[7],4,43,31,24),motif('KZ-A-D1',[8],80,43,26,24),motif('KZ-A-D1',[1,2],46,49,18,20)]
d=transferred(design(41,'Paula','KZ-A-D41','A','Name im Balken, Datum rechts, Hände oben',['Betende Hände'],['Clarissa → Alex Brush; Champagne & Limousines → Montserrat Light. Originalaufteilung mit ruhigem Stamm bleibt.']),[[1]])
d['texts']=[txt('Paula','Alex Brush',18,55,61,68),txt('† 05.04.2021','Montserrat Light',3.1,103,70,31,'right')];d['reviewMode']='1:1'
d=transferred(design(42,'Clarissa','KZ-A-D42','A','Name und Spruch im Balken, Spur im Stamm',['Pfotenspur'],['Playlist → Homage. Pfotenspur um 1 mm nach oben, damit ihr letzter Abdruck vor der Gestaltungsgrenze bleibt.']),[[1]])
d['texts']=[name_text('Clarissa','Homage',19,55,58,79),txt('Für immer in unseren Herzen','Montserrat',4.2,55,69,101)]
d['reviewNotes'].append('Claude/Chris #6562403258: Unterzeile in Montserrat, groß über den Querbalken; Namensschrift Homage bleibt.')
for p in d['motifs'][0]['paths']:p['d']=rbd.transform_path(p['d'],1,0,-1)
d['motifs'][0]['box'][1]-=1;d['reviewMode']='1:1'
d=transferred(design(46,'Balu','KZ-A-D46','A','Großer Name zwischen Pfoten',['Pfotenpaar'],['Clarissa → Alex Brush, optisch auf ursprüngliche Namensbreite eingepasst; ursprüngliche Freiflächen bleiben.']),[[1],[2]])
d['texts']=[txt('Balu','Alex Brush',24,55,64,59)];d['reviewMode']='1:1'
d=transferred(design(48,'Frieda','KZ-A-D48','A','Herz oben, Name im Balken, vier Spruchstufen',['Pfotenherz'],['Standlist → Ashley. Vier Original-Spruchzeilen auf mindestens 3 mm Versalhöhe angehoben, ursprüngliche großzügige Staffelung beibehalten.']),[[1]])
d['texts']=[txt('Frieda','Ashley',15,55,60,57)]+[txt(v,'Ashley',6,55,y,33) for v,y in zip(['Du warst,','du bist,','du bleibst','im Herzen.'],[88,103,118,134])];d['reviewMode']='1:1'
# B: original motifs and visual structure, monochrome and without photography.
d=transferred(design(126,'Cooper','KZUV-A-D26','B','Name zwischen zwei Pfotenspuren',['Pfotenspurenpaar'],['UV-Flächen entfernt; Allura bleibt. Spruch auf Mindesthöhe lesbar und bis in den unteren Stamm gestaffelt.']),[[5],[6]])
d['texts']=[txt('Cooper','Allura',13,55,59,48),txt('2006 – 2022','Allura',3.2,55,70,31)]+[txt(t,'Allura',5,55,y,31) for t,y in zip(['Der Kopf hat','verstanden,','aber das Herz','will nicht','begreifen.'],[87,98,109,120,133])]
d=design(127,'Bella','KZUV-A-D27','B','Reiner Schriftentwurf',['ohne Motiv – Original'],['Original ohne Motiv bleibt typografisch. Times New Roman → Libre Baskerville; Grammatik „meinem Herzen“ korrigiert, Spruch neu umbrochen.'])
d['texts']=[txt('Bella','Allura',20,55,60,72),txt('2006 – 2022','Allura',3.3,55,70,34),wrapped('Deine kleinen Pfoten haben große Spuren in meinem Herzen hinterlassen.','Libre Baskerville',3.8,55,84)]
d=design(132,'Moritz','KZUV-A-D32','B','Datum oben, Knochen-Namensschild im Balken',['Knochen','Versetztes Pfotenpaar'],['Foto und Fotokreis entfernt; Knochenplakette als Gravurkontur erhalten, Name vergrößert. Spruch auf Mindesthöhe umbrochen.'])
d['texts']=[txt('Moritz','Allura',13,55,61,52),txt('† 26. April 2024','Great Vibes',4.5,55,27,31),flow('Du warst mein bester Freund auf vier Pfoten. Dein Platz in meinem Herzen bleibt für immer.','Great Vibes',84,136,31)]
d['motifs']=[motif('KZUV-A-D32',[4],5,41,14,18),motif('KZUV-A-D32',[5],91,54,14,18),motif('KZUV-A-D32',[7],20,40,70,31,True)]
d=design(133,'Flocke','KZUV-A-D33','B','Pfote oben, Name im Balken, schmaler Schriftsatz',['Einzelpfote'],['Vista La Diva → Homage freigegeben durch Chris, bestätigt durch Claude (#76, Kommentar 6562403258). Arial als Corel-Voreinstellung durch Montserrat Light gewählt.'])
d['fontDecision']={'original':'Vista La Diva','replacement':'Homage','decided':'2026-11-01','by':'Chris','issueComment':6562403258}
d['texts']=[name_text('Flocke','Homage',21,55,61,75),txt('* 03.12.2009\n† 13.01.2024','Montserrat Light',3.1,55,82,32),txt('Das Leben\nist begrenzt.\nDoch die\nErinnerung\nist unendlich.','Dream Orphans',4.2,55,104,33)]
d['motifs']=[motif('KZUV-A-D33',[5],41,4,28,29)]
# C: five distinctly different plaque references.
d=design(201,'Lucky','gravur-knochen-D7','C','Betende Hände links, Name rechts, Hundekopf oben',['Betende Hände','Hundekopf'],['Standlist → Ashley. Beide Originalmotive erhalten, Knochen-Plattenform entfällt. Spruch in korrekter Lesereihenfolge.'])
d['texts']=[name_text('Lucky','Ashley',22,65,61,65),txt('† 19.02.2023','Roboto Slab',3.1,55,80,33),wrapped('Du warst als Hund der beste Mensch, den ich zum Freund haben konnte.','Roboto Slab',3.8,55,92)]
d['motifs']=[motif(d['sourceKey'],[2],3,39,25,32),motif(d['sourceKey'],[1],44,5,22,21)]
d=design(202,'Paula','gravur-knochen-D2','C','Pusteblume längs, Name im Balken, Samen rechts',['Pusteblume mit Samen'],['Homage und Cinzel bleiben; Pusteblume und fliegender Samen unverzerrt. Spruch auf Querbalken und Stamm verteilt.'])
d['texts']=[name_text('Paula','Homage',22,56,60,62),txt('† 05.03.2023','Cinzel',3.1,55,82,33),wrapped('Für die Welt warst du nur ein Hund, aber für mich warst du die Welt.','Cinzel',3.5,55,94)]
d['motifs']=[motif(d['sourceKey'],[1],7,40,14,30),motif(d['sourceKey'],[2],88,45,17,17)]
d=design(203,'Robin','gravur-herz-24x19-D7','C','Name quer, Regenbogen unten',['Regenbogen mit Blüten'],['Champagne & Limousines → Montserrat Light. Foto entfernt; unverzerrter Regenbogen schließt den Stamm ab.'])
d['texts']=[txt('Robin','Montserrat Light',14,55,60,85),wrapped('Für die Welt warst du nur ein Hund. Für uns aber warst du die Welt!','Montserrat Light',3.5,55,83)]
d['motifs']=[motif(d['sourceKey'],[4],39,120,32,19)]
d=design(204,'Luke','gravur-edelstahl-20x20-D8','C','Sternenband oben, großer Name quer, langer Spruch',['Sternenschwarm'],['Rounded Elegance bleibt; Arial/Arial Unicode MS als Corel-Voreinstellung passend durch Rounded Elegance ersetzt. Ungültiger Originaltag 29.02.2017 wird als Jahr 2017 wiedergegeben; „Erlöschen“ korrigiert.'])
d['texts']=[txt('Luke','Rounded Elegance',19,55,61,79),txt('1997 – 2017','Rounded Elegance',3.1,55,81,32),wrapped('Hunde sind wie Sterne. Sie können leuchten und strahlen, noch Jahre nach ihrem Erlöschen.','Rounded Elegance',3.1,55,94)]
d['motifs']=[motif(d['sourceKey'],[1],39,9,32,24)]
d=design(205,'Bruno','gravur-herz-18x13-D24','C','Großer Name im Querbalken, Spruch darunter, Spur unten',['Mensch-und-Hund-Spuren'],['Chris präzisiert #6562440730: großer Name in der Kreuzmitte, Jahre darunter, Spruch im Stamm, größere unverzerrte Fuß-/Pfotenspur unten. Italianno bleibt.'])
d['texts']=[name_text('Bruno','Italianno',22,55,63,80),txt('2010 – 2021','Italianno',3.6,55,73,31),flow('Für die Welt warst du nur ein Hund, aber für mich warst du die Welt.','Italianno',84,111,31)]
d['motifs']=[motif(d['sourceKey'],[1],40,113,30,30)]
# D: new individual vectors, never added to the customer motif library.
def own(d,key,label,path,box,stroke=.7):
    m={'box':rbd.path_box(path),'paths':[{'d':path,'fill':None,'stroke':'#000000','strokeMm':stroke,'evenodd':False,'opacity':1}]};d['motifs'].append(m);d['ownMotifId']=key
    folder=CAT/'motive-eigene'/key;folder.mkdir(parents=True,exist_ok=True)
    (folder/'motiv.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 150"><path d="{path}" fill="none" stroke="#000" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>',encoding='utf-8')
    return {'id':key,'name':label,'file':f'motive-eigene/{key}/motiv.svg','source':'Originalvektor Astra Mika · Nachauftrag #76 · 01.11.2026','customerLibrary':False}
own_entries=[]
d=design(301,'Milo',None,'D','Name senkrecht im Stamm, Daten links und rechts',['Halsband mit Medaillon'],['Ohne Vorlage. Senkrechter Name und seitliche Jahreszahlen; eigenes Halsband mit Anhänger.'])
d['texts']=[txt('Milo','Cormorant Garamond',15,55,106,60,rotation=-90),txt('2010','Cormorant Garamond',4,17,58,24),txt('2025','Cormorant Garamond',4,93,58,24),txt('Für immer','Cormorant Garamond',3.2,55,138,33)]
own_entries.append(own(d,'mika-hunde-halsband-20261101','Halsband mit Medaillon','M42 43 Q55 48 68 43 L68 49 Q55 55 42 49 Z M49 45 L49 51 M54 47 L54 52 M54 53 C50 53 50 58 54 58 C58 58 58 53 54 53 M54 59 C44 59 44 72 54 72 C64 72 64 59 54 59 M54 62 L55 64 L57.5 64.5 L55.5 66 L56 68.5 L54 67 L52 68.5 L52.5 66 L50.5 64.5 L53 64 Z',[42,43,26,29],.6))
d=design(302,'Nala',None,'D','Spruch im Querbalken, Name im Stamm, Herzleine unten',['Herzleine'],['Ohne Vorlage. Breiter, ruhiger Spruch, großer Name darunter, frei gezeichnete Leine mit Herzschlaufe.'])
d['texts']=[txt('Jeder Weg mit dir','Lora',4,55,49,96),txt('war ein Stück Zuhause.','Lora',4,55,63,96),txt('Nala','Sacramento',15,55,96,29),txt('2012 – 2026','Lora',3.1,55,106,31)]
own_entries.append(own(d,'mika-hunde-herzleine-20261101','Leine mit Herzschlaufe','M45 116 C39 110 39 119 45 125 C54 119 52 110 45 116 M45 125 C46 134 63 122 65 131 Q66 135 62 138 M60 136 L64 140 M61 135 L66 139',[39,112,27,28],.75))
d=design(303,'Oskar',None,'D','Name links, Hund am Kreuzungspunkt, Zitat im Stamm',['Schlafender Hund'],['Ohne Vorlage. Name seitlich im Querbalken; eigener eingerollter Hund rechts, ruhig gestaffelter Spruch im Stamm.'])
d['texts']=[txt('Oskar','Josefin Sans',11,8,59,60,'left'),txt('2009 – 2024','Josefin Sans',3.3,55,84,32),txt('Du bleibst\nin jedem\nSonnenstrahl,\nin jedem\nschönen Tag.','Josefin Sans',3.5,55,101,33)]
own_entries.append(own(d,'mika-hunde-schlafend-20261101','Schlafender Hund','M76 61 C70 48 85 42 96 47 C104 50 106 62 96 66 C90 69 80 68 76 63 M80 58 C77 55 81 50 86 51 C89 45 94 49 91 55 C98 57 97 64 90 65 C86 66 82 63 83 60 M85 57 L87 57 M92 60 Q89 59 88 61 M76 63 Q81 70 89 65',[73,45,31,23],.65))
# Five additional originals requested by Chris in #6562417227. Only dog designs.
d=design(304,'Luna',None,'D','Name quer, seitliche Jahre, Ball unten',['Lieblingsball'],['Ohne Vorlage. Persönliche Erinnerung an gemeinsame Spiele; geschwungener Name, seitliche Jahreszahlen und eigener Ball.'])
d['texts']=[name_text('Luna','Dancing Script',20,55,59,73),txt('2011','Cinzel',3.5,15,69,24),txt('2026','Cinzel',3.5,95,69,24),txt('Jeder Tag\nmit dir war\nein kleines\nAbenteuer.','Cinzel',3.5,55,86,31)]
own_entries.append(own(d,'mika-hunde-lieblingsball-20261101','Lieblingsball','M68 127 C68 110 42 110 42 127 C42 144 68 144 68 127 Z M46 117 C55 118 59 127 56 139 M65 119 C57 122 50 131 45 135',[42,114,26,26],.65))
d=design(305,'Ben',None,'D','Kräftiger Name, Napf oben, ruhige Spruchstufen',['Futternapf'],['Ohne Vorlage. Klarer, kräftiger Namenszug mit eigenem Napf als Erinnerung an den vertrauten Alltag.'])
d['texts']=[name_text('BEN','Oswald',24,55,63,74),txt('2008 – 2024','Roboto Slab',3.3,55,82,31),txt('Dein Platz\nbleibt bei uns.','Roboto Slab',3.7,55,102,31),txt('Für immer\nunser Freund.','Roboto Slab',3.7,55,128,31)]
own_entries.append(own(d,'mika-hunde-napf-20261101','Futternapf','M42 17 C42 12 68 12 68 17 C68 22 42 22 42 17 Z M42 17 L40 31 Q55 35 70 31 L68 17 M40 31 Q55 27 70 31 M51 24 Q55 27 59 24',[40,12,30,23],.65))
d=design(306,'Pippa',None,'D','Widmung oben, Name quer, Spielseil im Stamm',['Spielseil mit Knoten'],['Ohne Vorlage. Lockerer Pinselname, kurze Widmung und eigenes geknotetes Spielseil; luftige Kombination aus Schrift und langen Linien.'])
d['texts']=[txt('Unser\nSonnenschein','Caveat',3.8,55,20,31),name_text('Pippa','Kaushan Script',22,55,61,82),txt('2014 – 2025','Caveat',3.8,55,81,31),txt('Du fehlst\nbei jedem Spiel.','Caveat',4.1,55,97,31)]
own_entries.append(own(d,'mika-hunde-spielseil-20261101','Spielseil mit Knoten','M43 117 C45 110 52 112 55 119 C58 126 66 128 68 121 C70 114 63 110 59 116 C55 122 50 132 45 127 C40 123 45 117 50 120 C57 124 59 136 66 136 M43 117 L41 113 M45 114 L43 110 M47 114 L46 110 M64 134 L67 140 M66 133 L70 137 M62 135 L64 141',[40,110,30,31],.7))
d=design(307,'Fiete',None,'D','Name quer, Feder und Widmung nebeneinander im Stamm',['Erinnerungsfeder'],['Ohne Vorlage. Eigene schmale Feder links im Stamm, Widmung rechts; klassischer Namenszug und Datum oben.'])
d['texts']=[txt('2010 – 2026','Lato',3.2,55,26,31),name_text('Fiete','Playfair Display',21,55,61,86)]+[txt(v,'Lato',3.2,63.5,y,15) for v,y in zip(['Für','immer','bei','uns'],[89,101,113,125])]
own_entries.append(own(d,'mika-hunde-erinnerungsfeder-20261101','Erinnerungsfeder','M44 139 Q50 112 50 86 C39 91 39 105 42 115 L46 111 L43 119 Q45 123 47 125 M50 86 C58 97 54 110 48 118 M50 94 L44 100 M50 101 L43 107 M49 107 L45 113 M50 96 L53 99 M50 103 L52 105',[39,86,19,53],.55))
d=design(308,'Juna',None,'D','Name und Jahre quer, Zuhause-Symbol unten',['Hundehütte'],['Ohne Vorlage. Neues Zuhause-Motiv unter einem warmen Gedenktext; Name und Lebensjahre im Querbalken.'])
d['texts']=[name_text('Juna','Rochester',23,55,57,78),txt('2012 – 2026','Bellefair',3.4,55,69,32),txt('Dein Platz\nbleibt in\nunserem\nHerzen.','Bellefair',4,55,86,31)]
own_entries.append(own(d,'mika-hunde-zuhause-20261101','Hundehütte','M40 125 L55 114 L70 125 M43 123 L43 140 L67 140 L67 123 M51 140 L51 132 C51 126 59 126 59 132 L59 140 M48 121 L50 119 M60 119 L62 121',[40,114,30,26],.7))
order=[0,1,41,42,46,48,53,55,126,127,132,133,201,202,203,204,205,301,302,303,304,305,306,307,308]
masters.sort(key=lambda d:order.index(int(d['id'].split('-D')[-1])))
# Archive previous rejected delivery, then remove only its explicitly owned D100-D116 folders.
archive=WORK/'vorher'
if not archive.exists():shutil.copytree(OUT,archive)
for no in range(100,117):
    p=(OUT/f'KZ-A-11x20-D{no}').resolve();assert p.parent==OUT.resolve()
    if p.exists():shutil.rmtree(p)
for d in masters:
    d['minimumContourMarginMm']=2
    d['marginDecision']='Chris 01.11.2026, #76 Kommentar 6562491600 (ersetzt die frühere 3-mm-Angabe).'
    d.update(themes=['hundegedenktafeln'],freigabe=None,ziele=[{'familie':'grabkreuz-acryl-5mm-schwarz','freigabe':None}],sizes=['KZ-A-11x20'],formatreihe='Grabkreuze Acryl – Erstprüfung Schwarz 11×20')
    d['fonts']=sorted({t['font'] for t in d['texts']});d['katalog']={'key':d['id'],'series':OUT.name,'zielgruppe':'Tiere','unterkategorie':'Hund'}
    for t in d['texts']:t['color']='#000000'
    for m in d['motifs']:
        for p in m['paths']:
            if p['fill'] not in (None,'none'):p['fill']='#000000'
            if p['stroke'] not in (None,'none'):p['stroke']='#000000'
    folder=OUT/d['id'];folder.mkdir(parents=True,exist_ok=True);write(folder/'design.json',d)
    svg=rpd.design_svg(d);svg=re.sub(r'<rect id="platte"[^>]*/>',f'<path id="platte" d="{contour}" fill="none" stroke="#FF0000" stroke-width="0.0762"/>',svg)
    for i,t in enumerate(d['texts'],1):
        if t.get('rotation'):
            sz=t['sizePt']*rpd.PT;x,y=t['anchorMm'];cy=y-.35*sz
            svg=re.sub(fr'<text id="text-{i}"(.*?)</text>',lambda m:f'<g id="text-{i}" transform="rotate({t["rotation"]} {x} {cy})"><text'+m.group(1)+'</text></g>',svg,flags=re.S)
    (folder/'design.svg').write_text(svg,encoding='utf-8')
write(OUT/'index.json',{'name':'Grabkreuz Acryl – Hunde · Nachauftrag','designs':[{'id':d['id'],'path':d['id'],'name':d['name']} for d in masters]})
indexfile=CAT/'motive-eigene/motive-eigene.json';idx=json.loads(indexfile.read_text(encoding='utf-8'));ids={m['id'] for m in own_entries}
idx['motifs']=[m for m in idx['motifs'] if m['id'] not in ids and m['id'] not in {'mika-grabkreuz-hunde-109-20261101','mika-grabkreuz-hunde-116-20261101'}]+own_entries;idx['count']=len(idx['motifs']);write(indexfile,idx)
write(WORK/'auswahl.json',[{k:d[k] for k in ['id','name','source','sourceKey','reviewMode','reviewGroup','layout','fonts','motifKinds','reviewNotes']} for d in masters])
print('25 Master geschrieben; ausschließlich Schwarz 11×20; Homage ist freigegeben. Randprüfung mit 2 mm folgt.')
