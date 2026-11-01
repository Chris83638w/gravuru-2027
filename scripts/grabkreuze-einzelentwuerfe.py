"""Latest #76 corrections + Chris: no interchangeable compositions.
Eight sales originals are protected. Three signature layouts break the standard.
"""
import copy, hashlib, json
import pathops
from fontTools.svgLib.path import parse_path
from fontTools.pens.svgPathPen import SVGPathPen

def apply(c,h):
    by=h['by'];old=h['original'];placed=h['placed'];bundle=h['bundle'];ink=h['ink'];own=h['own'];txt=c['txt'];name=c['name_text'];affine=h['affine']
    for no in [0,1,41,42,46,48,53,55]:
        d=by[no];d.clear();d.update(copy.deepcopy(old[no]));d['designTier']='original'
        d['reviewMode']='Originalaufteilung'
        d['reviewNotes']=['Korrektur #6563417298/#6563434541: Originalaufteilung aus '+d['sourceKey']+' wiederhergestellt; Hausstil gilt hier nicht. Bestätigte Ersatzschriften, mindestens 2 mm Rand, Mindestlesbarkeit und Fotofeldentfernung bleiben.']
    # Buffy: flowers stay in opposing cross arms; the original paw pair sits below.
    d=by[1];d['motifKinds']=['Original-Blumenzweige und Pfotenpaar']
    d['motifs']=[c['motif']('KZ-A-D1',[7],4,47,31,23),c['motif']('KZ-A-D1',[8],80,40,26,23),c['motif']('KZ-A-D1',[1,2],44,78,22,22)]
    d['texts']=d['texts'][:2]+[c['flow']('Ich bin nicht tot, ich tausche nur die Räume, ich leb’ in euch und geh’ durch eure Träume.','Allura',107,140,31)]
    by[48]['motifs']=[placed(old[48]['motifs'][0],43,10,24,24)]
    # Explicitly distinguish trail from pairs, a single paw or a paw-heart.
    for d in by.values():d.pop('pawCount',None);d['pawTrail']=False
    for no in [42,205,307]:by[no]['pawTrail']=True
    # Cooper has a tree of remembrance, not a fourth copy of the same paw trail.
    d=by[126];d['motifKinds']=['Lebensbaum mit Herz'];d['layout']='Lebensbaum im Stamm, ruhiger Name und Jahre darüber'
    tree='M55 137 L55 105 M55 120 C50 116 47 109 45 102 M55 114 C61 110 64 104 65 98 M55 109 C54 101 56 94 58 88 M49 112 L43 110 M61 108 L67 109 M55 137 Q49 140 43 139 M55 137 Q61 140 67 139'
    leaves='M45 102 C36 99 40 91 45 94 C49 86 56 89 55 95 C60 87 68 91 66 98 C74 101 69 109 63 106 C61 113 54 111 54 106 C49 113 42 110 45 102 Z'
    heart='M55 101 C51 96 47 102 55 107 C63 102 59 96 55 101 Z'
    own(d,'mika-hunde-lebensbaum-20261101','Lebensbaum mit Herz',[ink(tree,.7),ink(leaves,.65),ink(heart,fill=True)])
    d['reviewNotes']=['Chris: keine duplizierten Designs. Die austauschbare Pfotenspur ist durch einen eigenen Lebensbaum ersetzt; früherer UV-Entwurf dient nur noch als historische Namensreferenz, Ausgabe ausschließlich Gravur.']
    # Bone plaque surrounds the word; empty stem differentiates it from a trail.
    d=by[132];d['texts']=[name('Moritz','Allura',14,55,59,57),txt('2011 – 2023','Lato',3.5,55,71,58)]
    d['motifs']=[placed(old[132]['motifs'][2],9,39,92,28)];d['motifKinds']=['Original-Knochenplakette'];d['layout']='Name in breiter Knochenplakette; Stamm bleibt frei'
    d['reviewNotes']=['Original-Knochenplakette um den Namen als eigenständige Bildidee. Pfotenpaar zugunsten der Vielfalt ausdrücklich entfernt nach #6563417298.']
    d=by[133];d['motifs']=[placed(old[133]['motifs'][0],43,7,24,25)];d['motifKinds']=['Große einzelne Originalpfote oben'];d['layout']='Einzelpfote im oberen Arm, Name und Jahre quer, ruhiger Stamm'
    d=by[201];d['motifs']=[placed(old[201]['motifs'][1],41,85,28,43)];d['motifKinds']=['Original-Hundekopf'];d['layout']='Hundekopf als einzelnes Profil im Stamm'
    d['reviewNotes']=['Original-Hundekopf groß als einziges Stammmotiv; betende Hände entfallen zugunsten der Unterscheidung zu Paula, gemäß Motivauswahl-Korrektur #6563417298.']
    d=by[202];d['name']='Maja';t,metrics=h['name']('Maja','Homage');d['texts'][0]=t;d['proportions']=metrics
    d['reviewNotes'].append('Beispielname von Paula in Maja geändert; Quelle bleibt gravur-knochen-D2.')
    # Enlarge three own standard motifs; each gets a different visual axis.
    d=by[301];d['motifs']=[placed(old[301]['motifs'][0],40,84,30,45)];d['layout']='Breites Halsband mit hängendem Medaillon als zentrales Zeichen'
    d=by[302];d['layout']='Großes offenes Herz mit langer, abwärts schwingender Leine';d['motifKinds']=['Herzleine mit langem Schwung']
    own(d,'mika-hunde-herzleine-lang-20261101','Große Herzleine',[ink('M55 91 C42 76 35 96 55 110 C75 96 68 76 55 91 M55 110 C44 120 70 125 62 136 Q58 141 52 137 M51 135 L55 140 M53 133 L58 138',.75)])
    d=by[303];d['motifs']=[placed(old[303]['motifs'][0],40,84,30,45)];d['layout']='Großer eingerollter Hund, tief und ruhig unter dem Namenszug'
    # Luna: vertical calligraphy + a negative dog medallion at the crossing.
    d=by[304];d['signatureTitle']='Mondmedaillon';d['layout']='SIGNATURE · Mondmedaillon: senkrechter Name, Hund als Aussparung in der Kreuzmitte'
    d['texts']=[txt('Luna','Italianno',17,55,115,61,rotation=-90),txt('2011','Lato',4.3,19,59,29),txt('2026','Lato',4.3,91,59,29)]
    dog=h['dog'];dm=placed(bundle([ink(dog,fill=True)]),44,40,22,27)
    disk=pathops.Path();parse_path('M55 38 C77 38 77 70 55 70 C33 70 33 38 55 38 Z',disk.getPen())
    cut=pathops.Path();parse_path(dm['paths'][0]['d'],cut.getPen());disk=pathops.op(disk,cut,pathops.PathOp.DIFFERENCE)
    pen=SVGPathPen(None);disk.draw(pen)
    own(d,'mika-signature-mondmedaillon-20261101','Mondmedaillon und senkrechter Name',[ink(pen.getCommands(),fill=True),ink('M60 10 C48 12 48 25 60 28 C44 29 42 10 55 8 Q58 8 60 10 Z',fill=True)])
    d['motifKinds']=['Negativ-Hundesilhouette und Mondsichel'];d['breaksStandardLayout']=True
    # Ben: large line drawing crosses the right arm and flows down the stem.
    d=by[305];d['signatureTitle']='Herzgefährte';d['layout']='SIGNATURE · Herzgefährte: Name links, großflächiger Hund rechts und im Stamm'
    d['texts']=[name('Ben','Sacramento',19,24,61,37),txt('2008 – 2024','Montserrat',3.5,25,70,38)]
    line='M52 18 C44 9 39 20 52 29 C65 20 60 9 52 18 C53 31 65 34 75 41 C84 38 92 45 92 54 C98 56 99 66 92 68 C88 69 86 59 87 50 M75 41 C68 42 64 46 64 52 C57 52 58 67 64 68 C68 68 70 59 68 50 M68 50 C69 43 83 43 87 50 M68 56 C68 67 72 70 78 70 C84 70 88 65 87 56 M77 70 L77 63 M73 61 Q77 58 81 61 Q79 65 77 63 Q74 65 73 61 M72 52 L73 52 M82 52 L83 52 M78 70 C67 69 62 77 61 84 C70 98 70 112 57 120 C44 128 43 138 55 140 C64 142 68 132 61 129 C55 127 50 133 55 135'
    own(d,'mika-signature-herzgefaehrte-20261101','Herzgefährte – großflächige Hundelinie',[ink(line,.7)])
    d['motifKinds']=['Großflächiger Linienhund mit Herz'];d['breaksStandardLayout']=True
    # Juna: a sweeping bridge enters from the left arm; word sits on the right.
    d=by[308];d['signatureTitle']='Brücke ins Licht';d['layout']='SIGNATURE · Brücke ins Licht: Name rechts, geschwungene Brücke von links in den Stamm'
    d['texts']=[name('Juna','Allura',19,81,60,44),txt('2012 – 2026','Lato',3.5,82,70,40)]
    rails='M9 46 C34 43 58 59 65 83 C73 108 61 125 50 140 M9 51 C32 48 53 64 60 85 C67 107 55 124 46 138 M9 56 C29 54 49 68 55 87 C61 105 49 122 42 136 M9 61 C27 59 44 73 50 89'
    planks='M18 46 L16 61 M28 48 L24 63 M39 53 L32 67 M48 60 L39 73 M56 70 L46 81 M62 81 L51 91 M66 94 L56 97 M65 107 L54 106 M60 119 L49 117 M54 131 L44 129 M50 140 L42 136'
    sun='M55 11 L55 15 M45 15 L48 18 M65 15 L62 18 M45 25 L41 25 M65 25 L69 25 M49 28 C46 20 64 20 61 28 M47 30 L63 30'
    own(d,'mika-signature-bruecke-ins-licht-20261101','Brücke ins Licht',[ink(affine(rails,1,3,0),.65),ink(affine(planks,1,3,0),.55),ink(sun,.65)])
    d['motifKinds']=['Geschwungene Regenbogenbrücke mit Stufen und Lichtzeichen'];d['breaksStandardLayout']=True
    for no in [304,305,308]:
        by[no]['reviewNotes']=['Nach #6563417298 und Chris’ direkter Kritik neu komponiert: '+by[no]['layout']+'. Keine weitere Variante Name-oben/Motiv-unten.']
        by[no].pop('sourceElements',None)
    ideas={0:'Herzen links/rechts mit mittigem Originalnamen und Datumszeile',1:'Name oben, gegenläufige Blumenzweige, Pfotenpaar und Spruch unten',41:'Betende Hände im oberen Arm, Name quer und Datum rechts',42:'Widmung im Querbalken, originale lange Pfotenspur im Stamm',46:'Großer Name zwischen zwei seitlichen Einzelpfoten',48:'Pfotenherz oben und vier originale Spruchstufen im Stamm',53:'Rosenpaar flankiert den Namen, originaler Spruch darunter',55:'Hundeherz oben, Name und persönliche Daten darunter',126:'Lebensbaum mit Herz im Stamm',127:'Reiner Schriftentwurf ohne Motiv',132:'Knochen bildet eine breite Namensplakette',133:'Eine große Pfote oben, ruhiger Stamm',201:'Einzelnes Hundeprofil im Stamm',202:'Aufsteigende Pusteblume mit fliegenden Samen',203:'Original-Regenbogen mit Blüten',204:'Langer Sternenschwarm',205:'Gemeinsame Mensch-und-Hund-Spur',301:'Halsband mit hängendem Medaillon',302:'Offenes Herz mit schwingender Leine',303:'Eingerollter schlafender Hund',304:'Negativ-Hundemedaillon mit senkrechtem Namen',305:'Großflächiger Linienhund rechts, Name links',306:'Kreuz-Innenkontur und Pfotensiegel',307:'Fünf ausgesparte Pfoten im geschwungenen Band',308:'Brückenbogen von links in den Stamm, Name rechts'}
    for no,d in by.items():
        d['distinctiveIdea']=ideas[no]
        d['reviewNotes'].append('Eigenständigkeit: '+ideas[no]+'.')
        d['layout']=ideas[no] if no<304 else d['layout']
        d['normalReadingDirection']=True
        # The stored design is still editable; this key excludes names/fonts.
        shape=[{'paths':m['paths'],'box':m['box']} for m in d['motifs']]
        d['compositionFingerprint']=hashlib.sha256(json.dumps(shape,sort_keys=True).encode()).hexdigest()
        d['elementCount']=len(d['texts'])+len(d['motifs'])
    assert len({d['name'] for d in by.values()})==25
    assert len({d['compositionFingerprint'] for d in by.values()})==25
    assert sum(d['pawTrail'] for d in by.values())==3
