"""Bestandsdesigns einer Linie zusammenführen, über Größen/Materialien zusammenfassen,
nach Zielgruppe und Unterkategorie vorsortieren und im Katalog ablegen.

Quelle: Ausgabeordner von read-corel-design-sheets.py / read-fpd-design-packages.py
(je Design ein Ordner mit design.json, design.svg, preview.png). Gleiche Design-Nummern
derselben Reihe (z. B. GT-S-30x20-D7, GT-A-30x20-D7, GT-PS-20x30-D7) werden zu EINEM Design
mit Materialvarianten; Reihen mit eigener Nummerierung (Herz-Größen, Edelstahl-Größen,
UV-Materialien mit eigenen Sets) bleiben getrennt.

Kategorisierung nur aus den vorhandenen Texten und Bogen-Bezeichnungen (Mensch/Tier, mit/ohne
Foto) – kein KI-Aufruf. Unsichere Zuordnungen stehen als „Vorschlag“; der Nutzer korrigiert in
der Excel (gelbe Spalten) und `--import-xlsx` liest die Korrekturen zurück.

    python scripts/build-design-bestand.py --line gedenktafeln --sources /tmp/.../out --tree _ordnerliste.txt.gz --out <katalog>/designs/bestand/gedenktafeln
"""
import argparse, collections, gzip, importlib.util, json, re, shutil
from pathlib import Path

_spec = importlib.util.spec_from_file_location('corel', Path(__file__).with_name('read-corel-design-sheets.py'))
corel = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(corel)

SKU = re.compile(r'^(?P<prefix>[A-Z]{2,6}[A-Z0-9]*-[A-Z0-9]+)-(?P<size>[\d.,]+x[\d.,]+)-D(?P<n>\d+)$')

# Quellordner → Reihe. split=True: jede Größe ist eine eigene Reihe (eigene Nummerierung).
SERIES = {
    'gravur-schiefer-rechteck': ('gravur-rechteck', False), 'gravur-acryl-rechteck': ('gravur-rechteck', False),
    'gravur-acryl-edelstahl-rechteck': ('gravur-rechteck', False), 'gravur-premium-schiefer-rechteck': ('gravur-rechteck', False),
    'gravur-premium-schiefer-hochformat': ('gravur-rechteck', False),
    'gravur-schiefer-herz': ('gravur-herz', True), 'gravur-acryl-herz': ('gravur-acryl-herz', True),
    'gravur-schiefer-stern': ('gravur-stern', False), 'gravur-schiefer-knochen': ('gravur-knochen', False),
    'gravur-edelstahl': ('gravur-edelstahl', True), 'gravur-sternenkinder': ('gravur-sternenkinder', False),
    'uv-granit': ('uv-granit', False), 'uv-premium-schiefer': ('uv-granit', False),
    'uv-acryl': ('uv-acryl', False), 'uv-acryl-edelstahl': ('uv-acryl', False),
    'uv-edelstahl': ('uv-edelstahl', False), 'uv-aludibond': ('uv-aludibond', False), 'uv-acryl-rund': ('uv-acryl-rund', False),
    'uv-marmor': ('uv-marmor', False), 'uv-marmor-herz': ('uv-marmor-herz', False),
    'uv-schiefer-rechteck': ('uv-schiefer-rechteck', False), 'uv-schiefer-quadrat': ('uv-schiefer-quadrat', False),
    'uv-schiefer-rund': ('uv-schiefer-rund', False), 'uv-schiefer-herz': ('uv-schiefer-herz', False), 'uv-schiefer-stern': ('uv-schiefer-stern', False),
}
SERIES_LABEL = {'gravur-rechteck': 'Gravur Rechteck/Hochformat (Schiefer, Acryl, Acryl+Edelstahl, Premium Schiefer)', 'gravur-herz': 'Gravur Schiefer Herz', 'gravur-acryl-herz': 'Gravur Acryl Herz',
                'gravur-stern': 'Gravur Schiefer Stern', 'gravur-knochen': 'Gravur Schiefer Knochen', 'gravur-edelstahl': 'Gravur Edelstahl', 'gravur-sternenkinder': 'Gravur Sternenkinder (Schiefer)',
                'uv-granit': 'UV Granit / Premium Schiefer', 'uv-acryl': 'UV Acryl / Acryl+Edelstahl', 'uv-edelstahl': 'UV Edelstahl', 'uv-aludibond': 'UV Alu-Dibond', 'uv-acryl-rund': 'UV Acryl rund',
                'uv-marmor': 'UV Marmor', 'uv-marmor-herz': 'UV Marmor Herz liegend', 'uv-schiefer-rechteck': 'UV Schiefer Rechteck', 'uv-schiefer-quadrat': 'UV Schiefer Quadrat', 'uv-schiefer-rund': 'UV Schiefer rund',
                'uv-schiefer-herz': 'UV Schiefer Herz', 'uv-schiefer-stern': 'UV Schiefer Stern'}

# Schlüsselwörter (Kleinschreibung, Wortgrenzen) → Unterkategorie
MENSCH = [('Oma', r'\b(oma|omi|omama|großmutter|grossmutter|großmama|grossmama)\b'), ('Opa', r'\b(opa|opi|opapa|großvater|grossvater|großpapa)\b'),
          ('Mama', r'\b(mama|mami|mutti|mutter|mum|mom)\b'), ('Papa', r'\b(papa|papi|vati|vater|dad)\b'), ('Eltern', r'\b(eltern|mama\s*(&|und)\s*papa)\b'),
          ('Kind', r'\b(sohn|tochter|söhnchen|töchterchen|unser kind|mein kind|unsere kinder|baby|kleiner engel|kleine engel|engelchen)\b'),
          ('Partner', r'\b(ehemann|ehefrau|mein mann|meine frau|liebling|schatz|lebensgefährt\w*|partner\w*|geliebte\w*)\b'),
          ('Geschwister', r'\b(bruder|schwester|brüderchen|schwesterchen)\b'), ('Freund', r'\b(freund|freundin|kollege|kollegin|kumpel)\b')]
TIER = [('Hund', r'\b(hund|hündin|hunde\w*|wuff|bell\w*|herrchen|frauchen|leckerli|vierbeiner|gassi|bello|knochen)\b'),
        ('Katze', r'\b(katze|kater|kätzchen|katzen\w*|schnurr\w*|miau\w*|samtpfot\w*|stubentiger|fellnase)\b'),
        ('Pferd', r'\b(pferd\w*|pony|stute|wallach|hengst|huf\w*|wiehern|galopp\w*|reit\w*|sattel)\b'),
        ('Kleintier', r'\b(hase|häschen|kaninchen|meerschwein\w*|hamster|vogel|wellensittich|papagei|schildkröte|maus|ratte)\b')]
TIER_ANY = r'\b(pfot\w*|regenbogenbrücke|tier\w*|fell|treuer (freund|begleiter|gefährte)|vierbeiner|schnurr\w*|bell\w*|wedel\w*|herrchen|frauchen|hund\w*|katze\w*|kater|pferd\w*)\b'
STERNENKIND = r'\b(sternenkind\w*|sternenkinder|zu früh|still ?geboren|ungeboren|stern am himmel|kleiner stern|unser stern|dein kleines herz)\b'


def norm(t): return re.sub(r'\s+', ' ', t.lower()).strip()


FULLNAME = re.compile(r'^[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\s+(?:von\s+|de\s+)?[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?$')
DATE = re.compile(r'(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})')
YEAR = re.compile(r'\b(1[89]\d\d|20\d\d)\b')


def lifespan_years(txt):
    """Lebenszeit aus Beispieldaten (*tt.mm.jjjj – †tt.mm.jjjj oder jjjj – jjjj); None wenn nicht lesbar."""
    ds = DATE.findall(txt)
    if len(ds) >= 2:
        (d1, m1, y1), (d2, m2, y2) = ds[0], ds[1]
        try: return (int(y2) - int(y1)) + (int(m2) - int(m1)) / 12 + (int(d2) - int(d1)) / 365
        except ValueError: return None
    ys = [int(y) for y in YEAR.findall(txt)]
    if len(ys) >= 2 and ys[1] >= ys[0]: return float(ys[1] - ys[0])
    return None


def classify(rec):
    txt = ' '.join(norm(t['text']) for t in rec['texts'])
    label = (rec.get('sheetLabel') or '').lower(); series = rec['series']
    reasons = []
    if series == 'gravur-sternenkinder' or re.search(STERNENKIND, txt):
        ziel = 'Sternenkinder'; reasons.append('Sternenkind-Reihe' if series == 'gravur-sternenkinder' else 'Text')
    elif 'tier' in label:
        ziel = 'Tiere'; reasons.append('Bogen „Tier“')
    elif 'mensch' in label:
        ziel = 'Menschen'; reasons.append('Bogen „Mensch“')
    elif re.search(TIER_ANY, txt):
        ziel = 'Tiere'; reasons.append('Tier-Wörter im Text')
    elif txt:
        ziel = 'Menschen'; reasons.append('kein Tier-Wort im Text')
    else:
        ziel = 'offen'; reasons.append('kein Text lesbar')
    unter = 'Allgemein'; conf = 'Vorschlag'
    table = TIER if ziel == 'Tiere' else MENSCH if ziel == 'Menschen' else []
    hits = [(name, len(re.findall(pat, txt))) for name, pat in table]
    hits = [h for h in hits if h[1]]
    if hits:
        hits.sort(key=lambda h: -h[1]); unter = hits[0][0]; conf = 'sicher' if hits[0][1] >= 1 and (len(hits) == 1 or hits[0][1] > hits[1][1]) else 'Vorschlag'
        reasons.append('Wort: ' + ', '.join(f'{n}×{c}' for n, c in hits))
    age = lifespan_years(txt)
    labeled = 'tier' in label or 'mensch' in label or series == 'gravur-sternenkinder'
    full_name = any(FULLNAME.match(t['text'].strip()) and not re.search(r'\b(dein|deine|foto|name|text|unser|unsere|mein|meine|liebe|lieber|kleiner|kleine|engel|ruhe|frieden|erinnerung)\b', t['text'].lower()) for t in rec['texts'])
    if ziel == 'Menschen' and age is not None and age < 1.0:
        ziel, unter, conf = 'Sternenkinder', 'Sternenkind', 'Vorschlag'; reasons.append(f'Beispieldaten: Lebenszeit {age:.1f} Jahre')
    elif series == 'gravur-knochen' and not hits and ziel != 'Sternenkinder':
        ziel, unter, conf = 'Tiere', 'Hund', 'Vorschlag'; reasons.append('Knochenform')
    elif ziel == 'Menschen' and not labeled and not hits and age is not None and age < 20 and not full_name:
        # kurze Lebenszeit + nur Vorname ohne Bogen-Angabe: eher Tier als Kind
        ziel, unter, conf = 'Tiere', 'Allgemein', 'Vorschlag'; reasons.append(f'kurze Lebenszeit ({age:.0f} J.), nur Vorname – vermutlich Tier')
    elif ziel == 'Menschen' and age is not None and not hits:
        if age < 1.0: ziel, unter, conf = 'Sternenkinder', 'Sternenkind', 'Vorschlag'; reasons.append(f'Beispieldaten: Lebenszeit {age:.1f} Jahre')
        elif age < 18 and (labeled or full_name): unter, conf = 'Kind', 'Vorschlag'; reasons.append(f'Beispieldaten: {age:.0f} Jahre alt')
    if ziel == 'Sternenkinder': unter = 'Sternenkind'; conf = 'sicher' if series == 'gravur-sternenkinder' else conf
    if ziel == 'offen': unter = 'offen'
    if any(t.get('ocr') for t in rec['texts']): conf = 'Vorschlag (OCR)'
    photo = 'ja' if 'mit foto' in label else 'nein' if 'ohne foto' in label else ('ja' if rec.get('photo') else 'offen')
    return {'ziel': ziel, 'unter': unter, 'sicherheit': conf, 'foto': photo, 'begruendung': '; '.join(reasons)}


def size_key(id_):
    m = SKU.match(id_); return m.group('size') if m else ''


def load_tree(path):
    """Ordnerliste → (prefix, kontext, D) → Größen; kontext = Materialordner ohne Größe (z. B. 'Gravur/Schiefer/Herz')."""
    if not path: return {}
    raw = gzip.open(path, 'rb').read() if str(path).endswith('.gz') else Path(path).read_bytes()
    out = collections.defaultdict(set)
    for l in raw.decode('cp850').split('\n'):
        l = l.rstrip('\r')
        if '\\Produkte\\' not in l: continue
        segs = l.split('\\Produkte\\', 1)[1].split('\\')
        if 'Archiv' in l: continue
        m = SKU.match(segs[-1])
        if not m: continue
        ctx = [s for s in segs[1:-1] if not re.match(r'^[\d.,]+x[\d.,]+', s)]
        suffix = re.sub(r'^[\d.,]+x[\d.,]+\s*-?\s*', '', segs[-2]) if len(segs) >= 2 and re.match(r'^[\d.,]+x[\d.,]+', segs[-2]) else ''
        key = (m.group('prefix'), '/'.join(ctx + ([suffix] if suffix else [])), m.group('n'))
        out[key].add(m.group('size'))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--line', required=True); ap.add_argument('--sources', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--tree', default=''); ap.add_argument('--no-copy', action='store_true')
    ap.add_argument('--overrides', default='', help='JSON Schlüssel → {ziel, unter, foto, begruendung}; Standard <out>/_korrekturen.json')
    a = ap.parse_args(); src = Path(a.sources); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    tree = load_tree(a.tree)
    ov_path = Path(a.overrides) if a.overrides else out / '_korrekturen.json'
    overrides = json.loads(ov_path.read_text(encoding='utf-8')) if ov_path.exists() else {}
    groups = collections.OrderedDict()
    for d in sorted(src.iterdir()):
        if d.name not in SERIES or not (d / 'designs.json').exists(): continue
        series, split = SERIES[d.name]
        for rec in json.loads((d / 'designs.json').read_text(encoding='utf-8')):
            m = SKU.match(rec['id'])
            if not m: continue
            key = f"{series}-{m.group('size')}-D{m.group('n')}" if split else f"{series}-D{m.group('n')}"
            rec['_dir'] = d / rec['id']; rec['series'] = series
            groups.setdefault(key, []).append(rec)
    designs = []
    for key, recs in groups.items():
        # Master: Datensatz mit Texten (Bogen vor Paket), sonst erster
        MAT_PRIO = {'Schiefer': 0, 'Granit': 0, 'Acryl': 1, 'Premium Schiefer': 2, 'Acryl + Edelstahl': 3}
        recs.sort(key=lambda r: (0 if r['texts'] and not any(t.get('ocr') for t in r['texts']) else 1 if r['texts'] else 2, 0 if r.get('sourceKind') != 'fpd-zip' else 1, MAT_PRIO.get(r['material'], 5)))
        master = recs[0]
        mats = list(dict.fromkeys(r['material'] for r in recs))
        sizes = set()
        for r in recs:
            m = SKU.match(r['id'])
            for (pre, ctx, n), ss in tree.items():
                if pre == m.group('prefix') and n == m.group('n'):
                    # gleicher Kontext wie der Datensatz: Form muss passen (Herz/Stern/Knochen/rund/Quadrat)
                    form = (r.get('form') or '').lower()
                    if any(w in ctx.lower() for w in ('herz', 'stern', 'knochen', 'rund')) != any(w in form for w in ('herz', 'stern', 'knochen', 'rund')): continue
                    if 'herz' in form and 'herz' not in ctx.lower(): continue
                    sizes |= ss
        base_texts = [norm(t['text']) for t in master['texts']]
        diff = [r['id'] for r in recs[1:] if r['texts'] and sorted(norm(t['text']) for t in r['texts']) != sorted(base_texts)]
        rec = {'key': key, 'series': master['series'], 'seriesLabel': SERIES_LABEL.get(master['series'], master['series']), 'process': master['process'], 'form': master.get('form', ''),
               'material': master['material'], 'materials': mats, 'designNo': int(SKU.match(master['id']).group('n')), 'masterId': master['id'], 'ids': [r['id'] for r in recs],
               'sizesInStock': sorted(sizes, key=lambda s: [float(x.replace(',', '.')) for x in s.split('x')]), 'sheetLabel': master.get('sheetLabel', ''),
               'plate': master.get('plate'), 'texts': master['texts'], 'fonts': master.get('fonts', []), 'photo': master.get('photo'), 'textsDiffer': diff, 'sourceKind': master.get('sourceKind', 'corel-bogen')}
        rec['kategorie'] = classify(rec)
        if key in overrides:
            o = overrides[key]; rec['kategorie'].update({k: v for k, v in o.items() if k in ('ziel', 'unter', 'foto')})
            rec['kategorie']['sicherheit'] = o.get('sicherheit', 'korrigiert'); rec['kategorie']['begruendung'] = o.get('begruendung', 'Korrektur') 
        lf = lifespan_years(' '.join(norm(t['text']) for t in rec['texts'])); rec['beispielAlter'] = round(lf, 1) if lf is not None else None
        rec['_dirs'] = [r['_dir'] for r in recs]
        designs.append(rec)
    # Ablage: Zielgruppe/Unterkategorie/Schlüssel
    for d in designs:
        k = d['kategorie']; folder = out / k['ziel'] / k['unter'] / d['key']
        d['path'] = folder.relative_to(out).as_posix()
        if a.no_copy: continue
        folder.mkdir(parents=True, exist_ok=True)
        srcdir = d['_dirs'][0]
        for n in ('design.svg', 'design.json', 'preview.png', 'product.json', 'design.png'):
            if (srcdir / n).exists(): shutil.copy(srcdir / n, folder / n)
        full = json.loads((srcdir / 'design.json').read_text(encoding='utf-8'))
        if full.get('motifs') is not None and full.get('sourceKind', 'corel-bogen') == 'corel-bogen' and not (srcdir / 'product.json').exists():
            # Vorschau aus den Vektordaten neu rendern (aktuelle Darstellungsregeln, Katalogschriften)
            (folder / 'design.svg').write_text(corel.design_svg(full), encoding='utf-8')
            corel.render_png(corel.design_svg(full, preview=True), folder / 'preview.png', width=600)
        for extra in srcdir.glob('*.svg'):
            if extra.name != 'design.svg': shutil.copy(extra, folder / extra.name)
        for extra in list(srcdir.glob('Bild*')): shutil.copy(extra, folder / extra.name)
        # Vorschauen der Varianten (anderes Material) nur als Verweis, Datei nur wenn abweichender Text
        (folder / 'design.json').write_text(json.dumps({**json.loads((srcdir / 'design.json').read_text(encoding='utf-8')), 'katalog': {kk: v for kk, v in d.items() if not kk.startswith('_')}}, ensure_ascii=False, indent=1), encoding='utf-8')
    index = [{kk: v for kk, v in d.items() if not kk.startswith('_')} for d in designs]
    (out / 'designs.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')
    write_xlsx(index, out / f'{a.line.upper()}-DESIGNS.xlsx', out)
    write_contact_sheets(designs, out)
    write_readme(index, out, a.line)
    print(f'{len(designs)} Designs aus {sum(len(v) for v in groups.values())} Datensätzen → {out}')


def write_xlsx(index, path, out):
    from openpyxl import Workbook
    from openpyxl.styles import PatternFill, Font, Alignment
    wb = Workbook(); ws = wb.active; ws.title = 'Designs'
    head = ['Schlüssel', 'Reihe', 'Verfahren', 'Form', 'Material (Master)', 'weitere Materialien', 'Design-Nr', 'Zielgruppe', 'Unterkategorie', 'Sicherheit', 'Foto', 'Texte', 'Alter (Beispieldaten)', 'Schriften', 'Größen im Bestand', 'SKUs', 'Vorschau', 'Begründung', 'Bemerkung']
    ws.append(head); yellow = PatternFill('solid', fgColor='FFF2CC')
    for c in ws[1]: c.font = Font(bold=True)
    for d in index:
        k = d['kategorie']
        ws.append([d['key'], d['seriesLabel'], d['process'], d['form'], d['material'], ', '.join(d['materials'][1:]), d['designNo'], k['ziel'], k['unter'], k['sicherheit'], k['foto'],
                   ' | '.join(t['text'].replace('\n', ' / ') for t in d['texts'])[:500], d.get('beispielAlter'), ', '.join(d['fonts']), ', '.join(d['sizesInStock']), ', '.join(d['ids']), d['path'] + '/preview.png', k['begruendung'], ''])
        r = ws.max_row
        for col in (8, 9, 11, 19): ws.cell(r, col).fill = yellow
        ws.cell(r, 17).hyperlink = d['path'] + '/preview.png'
    widths = [34, 30, 9, 12, 16, 22, 9, 12, 14, 14, 7, 80, 9, 30, 30, 40, 40, 40, 30]
    for i, w in enumerate(widths, 1): ws.column_dimensions[ws.cell(1, i).column_letter].width = w
    ws.freeze_panes = 'B2'; ws.auto_filter.ref = ws.dimensions
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(vertical='top', wrap_text=False)
    s = wb.create_sheet('Zusammenfassung'); s.append(['Zielgruppe', 'Unterkategorie', 'Designs', 'davon sicher', 'davon Vorschlag']);
    for c in s[1]: c.font = Font(bold=True)
    cnt = collections.OrderedDict()
    for d in index:
        k = d['kategorie']; e = cnt.setdefault((k['ziel'], k['unter']), [0, 0, 0]); e[0] += 1; e[1 if k['sicherheit'] == 'sicher' else 2] += 1
    for (z, u), (n, si, vo) in sorted(cnt.items()): s.append([z, u, n, si, vo])
    s.append([]); s.append(['Reihe', 'Designs'])
    for ser, n in collections.Counter(d['seriesLabel'] for d in index).most_common(): s.append([ser, n])
    l = wb.create_sheet('Lesen')
    for line in ['Gelbe Spalten ändern: Zielgruppe (Menschen / Tiere / Sternenkinder), Unterkategorie (Oma, Opa, Mama, Papa, Eltern, Kind, Partner, Geschwister, Freund, Allgemein; Hund, Katze, Pferd, Kleintier, Allgemein; Sternenkind), Foto (ja/nein), Bemerkung.',
                 'Ein Design kann mehreren Themen gehören: weitere Zielgruppen/Unterkategorien kommagetrennt in die Bemerkung („auch: Kinderzimmer“).',
                 'Sicherheit „sicher“ = eindeutiges Wort im Text; „Vorschlag“ = kein eindeutiges Wort (meist Allgemein) – bitte prüfen; „Vorschlag (OCR)“ = Text nur aus Bild gelesen.',
                 'Rückimport: python scripts/build-design-bestand.py --import-xlsx <diese Datei> (verschiebt die Ordner in die neue Kategorie).',
                 'Vorschau-Spalte: Pfad relativ zu diesem Ordner; Übersichtsbögen je Kategorie liegen in _uebersicht/.']:
        l.append([line])
    l.column_dimensions['A'].width = 160
    wb.save(path)


def write_contact_sheets(designs, out, cols=5):
    from PIL import Image, ImageDraw
    ud = out / '_uebersicht'; ud.mkdir(exist_ok=True)
    by = collections.defaultdict(list)
    for d in designs: by[(d['kategorie']['ziel'], d['kategorie']['unter'])].append(d)
    for (z, u), ds in sorted(by.items()):
        tiles = [(d, out / d['path'] / 'preview.png') for d in ds]
        tiles = [(d, p) for d, p in tiles if p.exists()]
        if not tiles: continue
        tw = 360; th = 300
        for part in range(0, len(tiles), 60):
            chunk = tiles[part:part + 60]; rows = (len(chunk) + cols - 1) // cols
            sheet = Image.new('RGB', (cols * (tw + 10) + 10, rows * (th + 10) + 50), 'white'); dr = ImageDraw.Draw(sheet)
            dr.text((10, 10), f'{z} – {u}  ({len(ds)} Designs{", Teil " + str(part // 60 + 1) if len(tiles) > 60 else ""})', fill='black')
            for i, (d, p) in enumerate(chunk):
                im = Image.open(p).convert('RGB'); im.thumbnail((tw, th - 40))
                x = 10 + (i % cols) * (tw + 10); y = 50 + (i // cols) * (th + 10)
                sheet.paste(im, (x, y)); dr.text((x, y + im.height + 3), d['key'], fill='black')
                dr.text((x, y + im.height + 16), (d['kategorie']['sicherheit'] + ' · ' + ', '.join(d['materials']))[:60], fill=(90, 90, 90))
            sheet.save(ud / f"{z}-{u}{'-' + str(part // 60 + 1) if len(tiles) > 60 else ''}.png")


def write_readme(index, out, line):
    cnt = collections.Counter((d['kategorie']['ziel'], d['kategorie']['unter']) for d in index)
    ser = collections.Counter(d['seriesLabel'] for d in index)
    md = [f'# Bestandsdesigns {line.capitalize()} – aus dem Server-Bestand extrahiert', '',
          f'{len(index)} Designs (über Größen und Materialien zusammengefasst), gelesen aus den Corel-Bögen (`[CDR]`) und Konfigurator-Paketen auf `V:\\Produkte\\Gedenktafeln`. '
          'Je Design ein Ordner `Zielgruppe/Unterkategorie/<Schlüssel>/` mit `design.svg` (Text bleibt Text, Motive als Pfade, Maße in mm), `design.json` (Texte, Schriften, Lage, Varianten, Kategorie) und `preview.png`. '
          'UV-Designs aus Paketen tragen zusätzlich `product.json` und die Ebenen (`Bild_*.png`, `*.svg`).', '',
          '**Kategorien sind Vorschläge aus den Texten** – Korrektur in [`' + f'{line.upper()}-DESIGNS.xlsx' + '`](' + f'{line.upper()}-DESIGNS.xlsx' + ') (gelbe Spalten), Übersichtsbögen je Kategorie in `_uebersicht/`.', '',
          '| Zielgruppe | Unterkategorie | Designs |', '| --- | --- | --- |'] + [f'| {z} | {u} | {n} |' for (z, u), n in sorted(cnt.items())]
    md += ['', '| Reihe | Designs |', '| --- | --- |'] + [f'| {s} | {n} |' for s, n in ser.most_common()]
    md += ['', '## Regeln', '', '- Eigene Motive dieser Designs bleiben beim Design (keine Übernahme in `motive/`).', '- Alte Größen sind nur dokumentiert (`sizesInStock`); welche Größen die Linie künftig hat, entscheidet der Nutzer.',
           '- Texte sind Beispieltexte des Bestands (Kundenfelder im Konfigurator); Schriften sind die im Bestand verwendeten – Ersatz für nicht freigegebene Schriften folgt je Linie.',
           '- Lücken: Designs ohne lesbaren Text (`offen`) stammen aus reinen Bildpaketen; dort hilft nur Sichtprüfung über `preview.png`.']
    (out / 'README.md').write_text('\n'.join(md) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
