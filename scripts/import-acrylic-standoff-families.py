"""Acryl-Namens-/Hausnummernschilder mit Abstandshaltern: Familien aus der Corel-Zeichnung.

Quelle: app/designs/acrylic-standoff-signs/corel-platten-20261017.json (gelesen aus
Hausnummer-Namenschilder-2026.pdf). Werte genau wie gezeichnet: Randabstand je
Platte (10 oder 15 mm), Eckenradius je Platte, Rückplatte rundum 10 mm größer.
Nutzerangaben 17.10.2026: AA/AS = 5 mm, Gravur von hinten; S/S = je 3 mm, Front
satiniert von vorn graviert, Rückplatte schwarz. Preise: offen.

    python scripts/import-acrylic-standoff-families.py
Schreibt app/designs/acrylic-standoff-signs/{aa,as,ss}.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'app/designs/acrylic-standoff-signs/corel-platten-20261017.json'
OUT = ROOT / 'app/designs/acrylic-standoff-signs'
FONTS = json.loads((ROOT / 'app/designs/steel-door-signs/family.json').read_text(encoding='utf-8'))['fonts']
NOTE = ('Randabstand der Bohrlöcher je Platte wie in der Corel-Zeichnung: 10 mm bei kleinen, 15 mm bei größeren Platten, '
        'aus optischen Gründen und damit die Platten unter Spannung hängen und nicht durchhängen (Nutzer, 17.10.2026). Nicht vereinheitlichen.')

plates = json.loads(SRC.read_text(encoding='utf-8'))['plates']
cm = lambda v: ('%g' % (v / 10)).replace('.', ',')


def build(fid, name, prefix, material, backing, notes):
    sizes, rules, groups = {}, {}, {}
    for p in plates:
        shape, radius = p['shape'], p['cornerRadiusMm']
        gkey = 'OV' if shape == 'ellipse' else 'AB' if radius else 'RE'
        groups.setdefault(gkey, {'key': gkey, 'name': {'OV': 'Oval', 'AB': 'Abgerundete Ecken', 'RE': 'Rechteck'}[gkey], 'shape': shape, 'cornerRadiusMm': 0})
        key = f"{prefix}-{gkey}-{p['widthMm']:g}X{p['heightMm']:g}"
        edge = p['edgeMm']; n = p['holes']
        rid = f"AH{n:02d}-E{edge:g}-D8"
        rules.setdefault(rid, {'id': rid, 'label': f'{n} Abstandshalter', 'layout': p['layout'], 'count': n, 'diameterMm': 8, 'edgeMm': edge, 'priceCents': None, 'skuSuffix': f'AH{n:02d}', 'accessory': 'standoffs'})
        s = sizes.setdefault(key, {'key': key, 'groupKey': gkey, 'label': f"{cm(p['widthMm'])} × {cm(p['heightMm'])} cm", 'widthMm': p['widthMm'], 'heightMm': p['heightMm'], 'baseCents': None, 'mounting': []})
        if radius: s['cornerRadiusMm'] = radius
        if rid not in s['mounting']: s['mounting'].append(rid)
    # Nutzerwunsch 17.10.2026: zusätzlich jede rechteckige Größe mit Eckenradius 5 mm (R5),
    # gleiche Bohrbilder wie das Rechteck derselben Größe.
    groups['R5'] = {'key': 'R5', 'name': 'Abgerundete Ecken R5', 'shape': 'rect', 'cornerRadiusMm': 5}
    for s in [x for x in sizes.values() if x['groupKey'] == 'RE']:
        key = s['key'].replace(f'{prefix}-RE-', f'{prefix}-R5-')
        sizes[key] = {**s, 'key': key, 'groupKey': 'R5', 'mounting': list(s['mounting'])}
    order = ['RE', 'R5', 'AB', 'OV']
    fam = {'schema': 'gravuru-product-family/v2', 'id': fid, 'name': name, 'material': material, 'designArea': {'marginMm': 0, 'keepoutMm': 1},
           'groups': [groups[k] for k in order if k in groups],
           'mountingRules': sorted(rules.values(), key=lambda r: (r['count'], r['edgeMm'])),
           'sizes': sorted(sizes.values(), key=lambda s: (order.index(s['groupKey']), s['widthMm'], s['heightMm'])),
           'withoutMounting': False, 'fonts': FONTS, 'briefingNotes': notes, 'sizeKeyPrefix': prefix, 'sizeKeySuffix': '',
           'source': {'path': 'app/designs/acrylic-standoff-signs/corel-platten-20261017.json', 'note': NOTE + ' Preise und Aufpreise offen. Schutzzone 1 mm vorläufig; Kopfdurchmesser der Abstandshalter noch nicht bekannt.'}}
    if backing: fam['backing'] = backing
    return fam


families = [
    build('acryl-aa-abstandshalter', 'Acrylglas anthrazit 5 mm · Abstandshalter (AA)', 'AA',
          {'kind': 'acrylic', 'variant': 'anthrazit', 'label': 'Acrylglas anthrazit', 'thicknessMm': 5, 'processingProfileId': 'acrylic-engraving', 'engravingSide': 'back'}, None,
          'Namens- und Hausnummernschilder. Gravur von hinten, erscheint hell auf Anthrazit. Texte groß und ruhig; Abstandshalter in den Ecken oder seitlich freihalten.'),
    build('acryl-as-abstandshalter', 'Acrylglas schwarz 5 mm · Abstandshalter (AS)', 'AS',
          {'kind': 'acrylic', 'variant': 'schwarz', 'label': 'Acrylglas schwarz', 'thicknessMm': 5, 'processingProfileId': 'acrylic-engraving', 'engravingSide': 'back'}, None,
          'Namens- und Hausnummernschilder. Gravur von hinten, erscheint hell auf Schwarz. Texte groß und ruhig; Abstandshalter in den Ecken oder seitlich freihalten.'),
    build('acryl-ss-abstandshalter', 'Acrylglas schwarz satiniert 3 mm + Rückplatte schwarz (S/S)', 'SS',
          {'kind': 'acrylic', 'variant': 'satiniert', 'label': 'Acrylglas satiniert, Front', 'thicknessMm': 3, 'processingProfileId': 'acrylic-engraving', 'engravingSide': 'front'},
          {'label': 'Rückplatte Acrylglas schwarz 3 mm', 'offsetMm': 10, 'thicknessMm': 3, 'note': 'Abstandsringe zwischen den Platten; beide Platten mit denselben Abstandshaltern an der Wand.'},
          'Namens- und Hausnummernschilder, zweilagig. Frontplatte satiniert, von vorn graviert; schwarze Rückplatte rundum 10 mm größer als Rahmen. Gestaltet wird nur die Frontplatte.'),
]
for f in families:
    (OUT / f"{f['id'].split('-')[1]}.json").write_text(json.dumps(f, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f['id'], len(f['sizes']), 'Größen,', len(f['mountingRules']), 'Bohrbilder,', sum(len(s['mounting']) for s in f['sizes']), 'Zuordnungen')
