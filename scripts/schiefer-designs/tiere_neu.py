"""Eigene neue Tier-Gedenktafeln (Design-Master §5, Chris 05.11.: „zusätzlich ein paar eigene Designs“).
3 Hund + 3 Katze, ohne Foto, Motiv seitlich als Gegengewicht; je 22×14 und 3:2.
Aufruf: python3 tiere_neu.py <katalog> <code-repo>"""
import sys, os, json
from aelib import Fonts
import komponieren as K

kat, code = sys.argv[1], sys.argv[2]
fonts = Fonts(kat); B = K._builder(code)
KONZEPTE = [
 ('TH01', 'Hund', 'Bruno', 'hunderassen/labrador-05.svg', 'links', [('name', 'Bruno', 'Great Vibes', 1), ('daten', '2011 – 2025', 'Josefin Sans', .24), ('spruch', 'Du warst mein treuester Begleiter', 'Cormorant Garamond', .3)]),
 ('TH02', 'Hund', 'Luna', 'hunde/hund-mit-flugeln-1.svg', 'rechts', [('name', 'Luna', 'Playfair Display', 1), ('daten', '* 03.04.2013  † 18.09.2025', 'Lato', .22), ('spruch', 'Lauf frei über die Regenbogenbrücke', 'Italianno', .36)]),
 ('TH03', 'Hund', 'Rocky', 'pfoten/pfotenspur.svg', 'links', [('name', 'Rocky', 'Kaushan Script', 1), ('daten', '2009 – 2024', 'Montserrat', .22), ('spruch', 'Deine Spuren bleiben für immer in unseren Herzen', 'Lora', .26)]),
 ('TK01', 'Katze', 'Minka', 'katzen/katze-im-mond.svg', 'links', [('name', 'Minka', 'Parisienne', 1), ('daten', '2008 – 2025', 'Josefin Sans', .24), ('spruch', 'Schlaf gut, kleine Samtpfote', 'Cormorant Garamond', .3)]),
 ('TK02', 'Katze', 'Felix', 'katzen/katze-sitzend-mit-flugeln.svg', 'rechts', [('name', 'Felix', 'Alex Brush', 1), ('daten', '* 12.06.2010  † 02.03.2025', 'Lato', .22), ('spruch', 'Du fehlst uns jeden Tag', 'Bellefair', .3)]),
 ('TK03', 'Katze', 'Mimi', 'katzen/katze-mit-schmetterlingen.svg', 'links', [('name', 'Mimi', 'Magnolia Script', 1), ('daten', '2012 – 2025', 'Montserrat Light', .24), ('spruch', 'Für immer in unseren Herzen', 'Cormorant Garamond', .3)]),
]
FORM = [('rechteck-220x140', 220, 140, ['GT-SN-RE-220X140'], 'n22x14'), ('rechteck-3-2', 300, 200, ['GT-SN-RE-150X100', 'GT-SN-RE-300X200', 'GT-SP-RE-300X200'], 'r32')]
for cid, uk, name, motiv, lay, rows in KONZEPTE:
    for fr, W, H, sizes, suf in FORM:
        ser = 'schiefer-tiere-neu-' + fr
        did = f'tiere-neu-{cid.lower()}-{suf}'
        el = K.compose(fonts, B, kat, {'rows': rows, 'motiv': motiv, 'foto': False}, W, H, lay)
        fams = sorted({'schiefer-tafeln-premium' if '-SP-' in s else 'schiefer-tafeln-natur' for s in sizes})
        meta = {'themes': ['tiergedenktafeln'], 'withPhoto': False, 'section': 'Ohne Foto', 'material': 'Schiefer', 'form': 'Rechteck',
                'formatreihe': fr, 'sizes': sizes, 'ziele': [{'familie': f, 'freigabe': None} for f in fams], 'mode': 'neu',
                'katalog': {'zielgruppe': 'Tiere', 'unterkategorie': uk, 'themen': ['tiergedenktafeln'], 'series': ser, 'key': did},
                'konzept': cid, 'provenance': {'mode': 'neu', 'note': 'ohne Vorlage, Claude Schiefer 05.11. (Design-Master §5), Motive aus motive/'}}
        K.write(B, kat, os.path.join(kat, 'designs', ser, did), did, name, W, H, el, meta)
        print(did)
