#!/usr/bin/env python3
"""AE-Türschilder (Acrylglas 3 mm auf Edelstahl 1,5 mm) – Familien und Linie im Katalog anlegen.

Quelle: Chris 02.11.2026 (Issue gravuru-2027 #131): „Alle Edelstahl Türschilder Größen ab ca. 9x6 gibt es
auch als AE Produkt. Das Acrylglas ist jeweils 2 cm kleiner. Retro 2 bleibt raus.“

- Edelstahlmaß (Nennmaß) = Größe aus familien/edelstahl/steel-door-signs.json.
- Acrylplatte = Gestaltungsfläche: Breite und Höhe je 20 mm kleiner (rundum 10 mm Edelstahlrand).
  RE/QU −20 mm, OV/EL/R Achsen −20 mm, RT1 Parallelkontur 10 mm nach innen.
- Nur die im Auftrag als „klar dabei“ genannten Größen. Offen und deshalb NICHT angelegt (Frage #131):
  AB (R5) wegen Acryl-Eckradius, Grenzfälle QU 80, R 85, RE 150×50, RE 120×52,5, EL 150×50.
- Preise null, keine Bohrbilder (Start „ohne Befestigung“).

Aufruf: python3 scripts/ae-tuerschilder/build-family.py --katalog <pfad>
"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from rt1 import offset_path

CLEAR = {
    'RE': [(90, 60), (120, 80), (150, 100), (180, 120), (210, 140), (240, 160), (300, 200), (420, 280), (450, 300),
           (180, 60), (210, 70), (240, 80), (270, 90),
           (160, 70), (240, 105), (320, 140), (400, 175)],
    'QU': [(100, 100), (120, 120), (160, 160), (200, 200), (260, 260), (300, 300)],
    'OV': [(90, 60), (120, 80), (150, 100), (180, 120), (210, 140), (240, 160), (300, 200),
           (150, 80), (225, 120), (300, 160)],
    'EL': [(180, 60), (210, 70), (240, 80), (270, 90), (300, 100)],
    'R': [(120, 120), (160, 160), (200, 200)],
    'RT1': [(90, 60), (120, 80), (150, 100), (180, 120), (210, 140), (240, 160), (300, 200)],
}
GROUPS = [
    {'key': 'RE', 'name': 'Rechteck', 'shape': 'rect', 'cornerRadiusMm': 0},
    {'key': 'QU', 'name': 'Quadrat', 'shape': 'rect', 'cornerRadiusMm': 0},
    {'key': 'OV', 'name': 'Oval', 'shape': 'ellipse', 'cornerRadiusMm': 0},
    {'key': 'EL', 'name': 'Ellipse', 'shape': 'ellipse', 'cornerRadiusMm': 0},
    {'key': 'R', 'name': 'Rund', 'shape': 'ellipse', 'cornerRadiusMm': 0},
    {'key': 'RT1', 'name': 'Retro 1 (eckig)', 'shape': 'contour', 'cornerRadiusMm': 0},
]
COLORS = {
    'schwarz': {'code': 'AS', 'label': 'Acrylglas schwarz'},
    'anthrazit': {'code': 'AA', 'label': 'Acrylglas anthrazit'},
}


def cm(v):
    s = ('%g' % (v / 10)).replace('.', ',')
    return s


def steel_size(fam, group, w, h):
    for s in fam['sizes']:
        if s['groupKey'] == group and abs(s['widthMm'] - w) < 0.6 and abs(s['heightMm'] - h) < 0.6:
            return s
    raise SystemExit('Edelstahlgröße fehlt: %s %sx%s' % (group, w, h))


def build(katalog, variant):
    steel = json.load(open(os.path.join(katalog, 'familien/edelstahl/steel-door-signs.json'), encoding='utf-8'))
    code = COLORS[variant]['code']
    sizes = []
    for group, dims in CLEAR.items():
        for (w, h) in dims:
            s = steel_size(steel, group, w, h)
            aw, ah = w - 20, h - 20
            entry = {
                'key': 'TS-AE-%s-%s-%dX%d' % (code, group, w, h),
                'groupKey': group,
                'label': '%s × %s cm (Acryl %s × %s cm)' % (cm(w), cm(h), cm(aw), cm(ah)),
                'widthMm': aw,
                'heightMm': ah,
                'baseCents': None,
                'mounting': [],
            }
            if group == 'RT1':
                path, ext, _ = offset_path(s['outlinePath'], 10.0)
                if abs(ext[0] - aw) > 0.05 or abs(ext[1] - ah) > 0.05:
                    raise SystemExit('RT1-Kontur passt nicht: %s %s' % (s['key'], ext))
                entry['outlinePath'] = path
                entry['holesMm'] = []
            sizes.append(entry)
    fam = {
        'schema': 'gravuru-product-family/v2',
        'id': 'ae-tuerschilder-' + variant,
        'name': 'AE-Türschilder · Acrylglas %s 3 mm auf Edelstahl' % variant,
        'material': {
            'kind': 'acrylic', 'variant': variant, 'label': COLORS[variant]['label'],
            'thicknessMm': 3, 'processingProfileId': 'acrylic-engraving', 'engravingSide': 'back',
        },
        'designArea': {'marginMm': 0, 'keepoutMm': 1},
        'groups': GROUPS,
        'mountingRules': [],
        'sizes': sizes,
        'withoutMounting': True,
        'fonts': steel['fonts'],
        'briefingNotes': (
            'AE-Türschild (eigenständige Reihe, Chris 02.11.2026): Acrylglas 3 mm, von hinten graviert (erscheint hell), '
            'mittig auf gebürstetem Edelstahl 1,5 mm. Gestaltet wird nur die Acrylplatte; sie ist in Breite und Höhe je '
            '20 mm kleiner als das Edelstahlschild (rundum 10 mm Edelstahlrand, Retro 1 als Parallelkontur). Die '
            'Größenbezeichnung nennt das Edelstahlmaß. Designs aus den freigegebenen Edelstahl-Türschildern, neu '
            'proportioniert auf das Acrylmaß; ohne Befestigung beurteilt. Keine großen gefüllten Flächen (Gravur von hinten).'
        ),
        'sizeKeyPrefix': 'TS-AE-' + code,
        'options': [{
            'id': 'edelstahlplatte',
            'label': 'Edelstahlplatte',
            'kind': 'variant',
            'selection': 'single',
            'required': True,
            'note': ('Wie Option „edelstahlplatte“ der AE-Gedenktafeln (#129), hier nur „Rahmen“: Edelstahl rundum 10 mm '
                     'größer als die Acrylplatte. Export nach Bestellung nur die Acrylplatte. Preis offen (Chris).'),
            'choices': [{
                'id': 'rahmen', 'label': 'Mit Edelstahlrahmen', 'priceCents': None, 'default': True,
                'note': ('Acrylglas 3 mm auf Edelstahl 1,5 mm gebürstet; Edelstahl = Nennmaß des Edelstahl-Türschilds, '
                         'Acryl je 20 mm kleiner (z. B. 12 × 8 auf 10 × 6, 30 × 20 auf 28 × 18).'),
            }],
        }],
        'source': {
            'repository': 'Chris83638w/gravuru-2027',
            'path': 'issues/131',
            'note': ('Chris 02.11.2026 (Issue #131): AE-Produkt für alle Edelstahl-Türschilder ab ca. 9 × 6, Acryl je 2 cm '
                     'kleiner, Retro 2 raus, eigenständige Produktreihe. Edelstahlmaße aus familien/edelstahl/'
                     'steel-door-signs.json; Retro 1 = Edelstahlkontur 10 mm parallel nach innen. Offen (Frage #131): '
                     'Acrylfarben für Türschilder (vorläufig wie AE-Gedenktafeln schwarz/anthrazit), Acryl-Eckradius AB (R5) '
                     '– AB deshalb noch nicht angelegt, Grenzfälle QU 80, R 85, RE 150×50, RE 120×52,5, EL 150×50, '
                     'Bohrbilder, alle Preise.'),
        },
    }
    return fam


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--katalog', required=True)
    a = ap.parse_args()
    os.makedirs(os.path.join(a.katalog, 'familien/ae'), exist_ok=True)
    for variant in COLORS:
        fam = build(a.katalog, variant)
        out = os.path.join(a.katalog, 'familien/ae/ae-tuerschilder-%s.json' % variant)
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(fam, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(out, len(fam['sizes']), 'Größen')


if __name__ == '__main__':
    main()
