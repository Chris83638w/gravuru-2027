"""Stammdaten-Excel aus den Produktfamilien erzeugen – und zurücklesen.

    python scripts/family-excel.py export --out Stammdaten.xlsx [family.json …]
        Ohne Dateiangabe: alle mitgelieferten Familien (app/designs/**/family*.json,
        app/designs/gedenktafeln-30x20/*.json).
    python scripts/family-excel.py import --xlsx Stammdaten.xlsx --out ordner/
        Schreibt je Familie eine JSON-Datei, geprüft mit denselben Regeln wie die
        Werkstatt (node, validateFamily). Nichts wird in die Werkstatt geschrieben.

Blätter: Materialien, Familien, Größen, Befestigungen, Optionen, Staffel. Leere Zelle = offen.
Preise in Euro mit Komma; intern bleiben es ganze Cent.
"""
import argparse, json, subprocess, sys
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
LAYOUTS = {'left-right': 'mittig links/rechts', 'top-bottom': 'mittig oben/unten', 'corners': 'vier Ecken', 'top-center': 'oben mittig', 'none': 'ohne Löcher'}
LAYOUT_BY_TEXT = {v: k for k, v in LAYOUTS.items()}
SHAPES = {'rect': 'eckig', 'ellipse': 'oval', 'plaque': 'eingezogene Ecken'}
SHAPE_BY_TEXT = {v: k for k, v in SHAPES.items()}
ACCESSORY = {'screws': 'Schrauben', 'standoffs': 'Abstandshalter'}
OPTION_KIND = {'accessory': 'Zubehör', 'variant': 'Variante', 'text': 'Textfeld', 'date': 'Datum', 'select': 'Auswahlliste', 'checkbox': 'Ankreuzfeld'}; OPTION_KIND_BY_TEXT = {v: k for k, v in OPTION_KIND.items()}
FIELD_KINDS = ('text', 'date', 'select', 'checkbox')
# K14 / Ü12.1: „Sichtbar wenn“ als „gruppe: wert1, wert2“ (z. B. „mounting: AH02-E10-D8“).
condition_text = lambda c: '' if not c else c['groupId'] + ': ' + ', '.join(c['valueIds'])
def condition_parse(v):
    v = str(v or '').strip()
    if not v: return None
    gid, _, values = v.partition(':')
    return {'groupId': gid.strip(), 'valueIds': [x.strip() for x in values.split(',') if x.strip()]}
OPTION_SEL = {'single': 'eine', 'multiple': 'mehrere'}; OPTION_SEL_BY_TEXT = {v: k for k, v in OPTION_SEL.items()}
ACCESSORY_BY_TEXT = {v: k for k, v in ACCESSORY.items()}
MATERIALS = {'steel': ('Edelstahl', 'Gravur', 'dunkel'), 'slate': ('Schiefer', 'Gravur', 'hell'), 'acrylic': ('Acrylglas', 'Gravur', 'hell')}
PROCESS = {'steel-engraving': 'Gravur', 'slate-engraving': 'Gravur', 'acrylic-engraving': 'Gravur', 'color-print': 'Druck'}
# K10: Spalte „Verfahrensprofil“ trägt die exakte Profilkennung (app/workshop/process-profiles.mjs);
# leer = offen (null). „Verfahren“ bleibt der lesbare Text und dient nur noch als Rückfall.
PROCESS_IDS = ('steel-engraving', 'wood-engraving', 'slate-engraving', 'acrylic-engraving', 'color-print')

euro = lambda c: None if c is None else round(c / 100, 2)
# K14 / Ü15.1: Rückseite je Familie (leer = einseitig; Aufpreis leer = offen, nicht buchbar).
def back_columns(f):
    b = next((s for s in f.get('surfaces') or [] if s['id'] == 'back'), None)
    if not b: return ['', None, '', '']
    return ['ja', euro(b.get('priceCents')), b.get('processingProfileId', ''), {True: 'ja', False: 'nein'}.get(b.get('mirror'), '')]
cents = lambda v: None if v in (None, '') else int(round(float(str(v).replace('€', '').replace(',', '.').strip()) * 100))
num = lambda v: None if v in (None, '') else float(str(v).replace(',', '.'))


def bundled():
    files = sorted(ROOT.glob('app/designs/*/family.json')) + sorted(ROOT.glob('app/designs/gedenktafeln-30x20/*.json'))
    return [p for p in files if not p.name.startswith('shopify-')]


def export(paths, out):
    fams = [json.loads(Path(p).read_text(encoding='utf-8')) for p in paths]
    wb = Workbook()
    head = Font(bold=True, color='FFFFFF'); fill = PatternFill('solid', fgColor='2F5D50')

    def sheet(title, columns, rows, widths):
        ws = wb.create_sheet(title)
        ws.append(columns)
        for c in ws[1]: c.font = head; c.fill = fill; c.alignment = Alignment(vertical='center', wrap_text=True)
        for r in rows: ws.append(r)
        for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
        ws.freeze_panes = 'A2'
        return ws

    wb.remove(wb.active)
    seen = {}
    for f in fams:
        m = f['material']; k = m['kind'] + '|' + (m.get('variant') or '')
        if k not in seen:
            name, proc, ink = MATERIALS.get(m['kind'], (m['kind'], '', ''))
            seen[k] = [m['kind'], m.get('variant') or '', m['label'], m['thicknessMm'], PROCESS.get(m['processingProfileId'], m['processingProfileId']), m['processingProfileId'], ink, '']
    sheet('Materialien', ['Material (Kennung)', 'Variante', 'Bezeichnung', 'Stärke mm', 'Verfahren', 'Verfahrensprofil', 'Gravur erscheint', 'Hinweise'], list(seen.values()), [18, 12, 34, 10, 10, 18, 16, 40])
    sheet('Familien', ['Familie (Kennung)', 'Name', 'Material', 'Variante', 'Stärke mm', 'Verfahren', 'Verfahrensprofil', 'Gravurseite', 'Gestaltungsrand mm', 'Schutzzone mm', 'Ohne Befestigung anbieten', 'Rückplatte', 'Rückplatte Überstand mm', 'Rückplatte Stärke mm', 'Rückplatte Hinweis', 'Schriften', 'Stilnotizen', 'Herkunft', 'Rückseite', 'Rückseite Aufpreis €', 'Rückseite Verfahrensprofil', 'Rückseite gespiegelt'],
          [[f['id'], f['name'], f['material']['kind'], f['material'].get('variant') or '', f['material']['thicknessMm'], PROCESS.get(f['material']['processingProfileId'], f['material']['processingProfileId']), f['material']['processingProfileId'],
            {'back': 'hinten', 'front': 'vorn'}.get(f['material'].get('engravingSide'), ''), f['designArea']['marginMm'], f['designArea']['keepoutMm'], 'ja' if f['withoutMounting'] else 'nein',
            (f.get('backing') or {}).get('label', ''), (f.get('backing') or {}).get('offsetMm'), (f.get('backing') or {}).get('thicknessMm'), (f.get('backing') or {}).get('note', ''),
            ', '.join(f['fonts']), f['briefingNotes'], (f.get('source') or {}).get('note', '')] + back_columns(f) for f in fams],
          [26, 34, 10, 10, 9, 10, 18, 10, 12, 12, 12, 24, 12, 12, 30, 50, 60, 60, 10, 12, 18, 12])
    rows = []
    for f in fams:
        groups = {g['key']: g for g in f['groups']}
        for s in f['sizes']:
            g = groups[s['groupKey']]
            rows.append([f['id'], s['key'], s['groupKey'], g['name'], SHAPES[g['shape']], s.get('cornerRadiusMm', g['cornerRadiusMm']), s.get('backingCornerRadiusMm'), s['label'], s['widthMm'], s['heightMm'], euro(s['baseCents']), s.get('netWeightG'), ', '.join(s['mounting'])])
    sheet('Größen', ['Familie', 'SKU', 'Formgruppe', 'Form', 'eckig/oval', 'Eckenradius mm', 'Rückplatte Eckenradius mm', 'Bezeichnung', 'Breite mm', 'Höhe mm', 'Grundpreis €', 'Gewicht g', 'Befestigungen (Kennungen)'], rows, [22, 26, 10, 22, 16, 12, 14, 14, 10, 10, 12, 10, 50])
    rows = []
    for f in fams:
        for r in f['mountingRules']:
            rows.append([f['id'], r['id'], r['label'], r['skuSuffix'], LAYOUTS[r['layout']], r['count'], r['diameterMm'], r['edgeMm'], ACCESSORY.get(r.get('accessory'), ''), euro(r['priceCents'])])
    sheet('Befestigungen', ['Familie', 'Kennung', 'Bezeichnung', 'SKU-Endung', 'Lage', 'Anzahl Löcher', 'Ø mm', 'Randabstand mm', 'Zubehör', 'Aufpreis €'], rows, [22, 16, 32, 10, 20, 12, 8, 14, 12, 11])
    rows = []
    for f in fams:
        for g in f.get('options', []):
            cond = condition_text(g.get('visibleIf'))
            if g['kind'] in FIELD_KINDS and g['kind'] != 'select':
                rows.append([f['id'], g['id'], g['label'], OPTION_KIND[g['kind']], '', 'ja' if g.get('required') else '', '', '', '', euro(g.get('priceCents')) if 'priceCents' in g else '', '', g.get('note', ''), cond, g.get('maxLength', ''), 'ja' if 'priceCents' in g and g['priceCents'] is None else ''])
                continue
            for c in g['choices']:
                field = g['kind'] in FIELD_KINDS
                rows.append([f['id'], g['id'], g['label'], OPTION_KIND.get(g['kind'], g['kind']), '' if field else OPTION_SEL.get(g['selection'], g['selection']), 'ja' if g.get('required') else '', c['id'], c['label'], '' if field else c.get('skuSuffix', ''), euro(c.get('priceCents')) if 'priceCents' in c else '', '' if field else ('ja' if c.get('default') else ''), (g.get('note', '') if field else c.get('note', '')), cond, '', 'ja' if 'priceCents' in c and c['priceCents'] is None else ''])
    sheet('Optionen', ['Familie', 'Gruppe (Kennung)', 'Gruppe', 'Art', 'Auswahl', 'Pflicht', 'Option (Kennung)', 'Option', 'SKU-Endung', 'Aufpreis €', 'Standard', 'Hinweis', 'Sichtbar wenn', 'Max. Zeichen', 'Aufpreis offen'], rows, [22, 16, 24, 10, 10, 8, 16, 28, 10, 11, 9, 40, 26, 10, 10])
    # K14 / Ü11.1: Mengenstaffel je Familie (SKU leer) oder je Größe. Leerer Rabatt = offen (null).
    rows = []
    def tier_rows(fid, sku, tiers):
        if tiers is None: return
        if not tiers: rows.append([fid, sku, None, None, None]); return
        for t in tiers:
            rows.append([fid, sku, t['minQuantity'], t.get('percentOff') if 'percentOff' in t else None, euro(t['unitCents']) if 'unitCents' in t else None])
    for f in fams:
        tier_rows(f['id'], '', f.get('quantityTiers'))
        for s in f['sizes']: tier_rows(f['id'], s['key'], s.get('quantityTiers'))
    sheet('Staffel', ['Familie', 'SKU', 'ab Stück', 'Rabatt %', 'Stückpreis €'], rows, [22, 26, 10, 10, 12])
    ws = wb.create_sheet('Lesen')
    for line in ['Leere Zelle = offen (noch nicht festgelegt). Nichts wird geraten.', 'Verfahrensprofil: exakte Kennung (' + ', '.join(PROCESS_IDS) + '); sie legt Werkzeuge, Palette, Mindestschriftgröße, Soll-dpi und Spiegelung fest. Leer = offen; dann zählt ersatzweise die Spalte Verfahren (Gravur je Material, Druck = color-print).', 'Blatt Optionen: optionales Zubehör und Varianten je Familie – Gruppe (z. B. Abstandshalter-Set), Art Zubehör/Variante, Auswahl eine/mehrere, je Option Aufpreis in €. Neue Zeilen = neue Optionen. Zusatzfelder ohne Vorschau: Art Textfeld/Datum/Auswahlliste/Ankreuzfeld (Auswahlliste: je Auswahl eine Zeile), Max. Zeichen nur bei Textfeldern; „Sichtbar wenn“ = „mounting: <Befestigungs-Kennung>, …“ oder „<Auswahlliste>: <Auswahl>“; „Aufpreis offen“ = ja, wenn der Aufpreis noch nicht feststeht. Preise je Linie (Unterkategorie) stehen in linien/<linie>.json des Katalogs.', 'Preise in Euro mit Komma, intern ganze Cent.', 'Blatt Staffel: Mengenstaffel je Familie (SKU leer) oder je Größe (SKU). Je Zeile eine Stufe: ab Stück (2–99), Rabatt % auf den Stückpreis inkl. Optionen ODER Stückpreis € (Grundpreis ab dieser Menge). Beides leer = Wert offen – die Staffel wird dann nicht gerechnet und nicht angezeigt. Zeile ohne „ab Stück“ = ausdrücklich keine Staffel.', 'Bohrlöcher: Randabstand = Rand bis Lochmitte. Löcher werden je Größe aus Lage, Ø und Randabstand berechnet, nicht skaliert.',
                 'Befestigungen je Größe als Kennungen aus dem Blatt Befestigungen, mit Komma getrennt. Neue Kennung = neue Zeile dort.', 'Zurücklesen: python scripts/family-excel.py import --xlsx DATEI --out ORDNER']:
        ws.append([line])
    ws.column_dimensions['A'].width = 120
    wb.save(out)
    return fams


def import_(xlsx, out):
    wb = load_workbook(xlsx, data_only=True)
    rows = lambda name: [dict(zip([c.value for c in wb[name][1]], [c.value for c in r])) for r in wb[name].iter_rows(min_row=2) if any(c.value not in (None, '') for c in r)]
    fams = {}
    proc_id = {('steel', 'Gravur'): 'steel-engraving', ('slate', 'Gravur'): 'slate-engraving', ('acrylic', 'Gravur'): 'acrylic-engraving', ('wood', 'Gravur'): 'wood-engraving'}

    def process_id(r):
        explicit = str(r.get('Verfahrensprofil') or '').strip()
        if explicit: return explicit
        text = str(r.get('Verfahren') or '').strip()
        if not text: return None
        if text == 'Druck': return 'color-print'
        return proc_id.get((r['Material'], text), text)
    for r in rows('Familien'):
        fid = r['Familie (Kennung)']
        kind = r['Material']
        fams[fid] = {'schema': 'gravuru-product-family/v2', 'id': fid, 'name': r['Name'],
                     'material': {'kind': kind, **({'variant': r['Variante']} if r.get('Variante') else {}), 'label': '', 'thicknessMm': num(r['Stärke mm']), 'processingProfileId': process_id(r)},
                     'designArea': {'marginMm': num(r['Gestaltungsrand mm']), 'keepoutMm': num(r['Schutzzone mm'])}, 'groups': [], 'mountingRules': [], 'sizes': [],
                     'withoutMounting': str(r['Ohne Befestigung anbieten']).strip().lower() == 'ja', 'fonts': [x.strip() for x in str(r['Schriften'] or '').split(',') if x.strip()],
                     'briefingNotes': r['Stilnotizen'] or '', 'source': {'note': 'Aus Stammdaten-Excel gelesen: ' + Path(xlsx).name}}
        if str(r.get('Rückseite') or '').strip().lower() == 'ja':
            back = {'id': 'back', 'priceCents': cents(r.get('Rückseite Aufpreis €'))}
            if r.get('Rückseite Verfahrensprofil'): back['processingProfileId'] = str(r['Rückseite Verfahrensprofil']).strip()
            if r.get('Rückseite gespiegelt') in ('ja', 'nein'): back['mirror'] = r['Rückseite gespiegelt'] == 'ja'
            fams[fid]['surfaces'] = [{'id': 'front'}, back]
        if r.get('Gravurseite') in ('vorn', 'hinten'): fams[fid]['material']['engravingSide'] = 'front' if r['Gravurseite'] == 'vorn' else 'back'
        if r.get('Rückplatte'):
            fams[fid]['backing'] = {'label': r['Rückplatte'], 'offsetMm': num(r['Rückplatte Überstand mm']) or 0, 'thicknessMm': num(r['Rückplatte Stärke mm'])}
            if r.get('Rückplatte Hinweis'): fams[fid]['backing']['note'] = r['Rückplatte Hinweis']
    for r in rows('Materialien'):
        for f in fams.values():
            if f['material']['kind'] == r['Material (Kennung)'] and (f['material'].get('variant') or '') == (r['Variante'] or ''): f['material']['label'] = r['Bezeichnung']
    for r in rows('Befestigungen'):
        f = fams[r['Familie']]; layout = LAYOUT_BY_TEXT[r['Lage']]
        rule = {'id': r['Kennung'], 'label': r['Bezeichnung'], 'layout': layout, 'count': 0 if layout == 'none' else int(r['Anzahl Löcher']),
                'diameterMm': None if layout == 'none' else num(r['Ø mm']), 'edgeMm': None if layout == 'none' else num(r['Randabstand mm']), 'priceCents': cents(r['Aufpreis €']), 'skuSuffix': r['SKU-Endung']}
        if r.get('Zubehör') in ACCESSORY_BY_TEXT: rule['accessory'] = ACCESSORY_BY_TEXT[r['Zubehör']]
        f['mountingRules'].append(rule)
    if 'Optionen' in wb.sheetnames:
        for r in rows('Optionen'):
            f = fams[r['Familie']]; f.setdefault('options', [])
            g = next((g for g in f['options'] if g['id'] == r['Gruppe (Kennung)']), None)
            kind = OPTION_KIND_BY_TEXT.get(r['Art'], r['Art'])
            open_price = str(r.get('Aufpreis offen') or '').strip().lower() == 'ja'
            price = None if open_price else cents(r['Aufpreis €'])
            if kind in FIELD_KINDS:
                if not g:
                    g = {'id': r['Gruppe (Kennung)'], 'label': r['Gruppe'], 'kind': kind}
                    if str(r.get('Pflicht') or '').strip().lower() == 'ja': g['required'] = True
                    if r.get('Max. Zeichen') not in (None, ''): g['maxLength'] = int(num(r['Max. Zeichen']))
                    if kind != 'select' and (open_price or price is not None): g['priceCents'] = price
                    if r.get('Hinweis'): g['note'] = r['Hinweis']
                    cond = condition_parse(r.get('Sichtbar wenn'))
                    if cond: g['visibleIf'] = cond
                    if kind == 'select': g['choices'] = []
                    f['options'].append(g)
                if kind == 'select':
                    c = {'id': r['Option (Kennung)'], 'label': r['Option']}
                    if open_price or price is not None: c['priceCents'] = price
                    g['choices'].append(c)
                continue
            if not g:
                g = {'id': r['Gruppe (Kennung)'], 'label': r['Gruppe'], 'kind': OPTION_KIND_BY_TEXT.get(r['Art'], r['Art']), 'selection': OPTION_SEL_BY_TEXT.get(r['Auswahl'], r['Auswahl']), 'choices': []}
                if str(r.get('Pflicht') or '').strip().lower() == 'ja': g['required'] = True
                cond = condition_parse(r.get('Sichtbar wenn'))
                if cond: g['visibleIf'] = cond
                f['options'].append(g)
            c = {'id': r['Option (Kennung)'], 'label': r['Option'], 'priceCents': cents(r['Aufpreis €'])}
            if r.get('SKU-Endung'): c['skuSuffix'] = str(r['SKU-Endung'])
            if str(r.get('Standard') or '').strip().lower() == 'ja': c['default'] = True
            if r.get('Hinweis'): c['note'] = r['Hinweis']
            g['choices'].append(c)
    staffel = rows('Staffel') if 'Staffel' in wb.sheetnames else []
    for r in rows('Größen'):
        f = fams[r['Familie']]
        if not any(g['key'] == r['Formgruppe'] for g in f['groups']):
            f['groups'].append({'key': r['Formgruppe'], 'name': r['Form'], 'shape': SHAPE_BY_TEXT[r['eckig/oval']], 'cornerRadiusMm': 0, '_radii': []})
        group = next(g for g in f['groups'] if g['key'] == r['Formgruppe']); radius = num(r['Eckenradius mm']) or 0; group['_radii'].append(radius)
        size = {'key': r['SKU'], 'groupKey': r['Formgruppe'], 'label': r['Bezeichnung'], 'widthMm': num(r['Breite mm']), 'heightMm': num(r['Höhe mm']), 'baseCents': cents(r['Grundpreis €']),
                'mounting': [x.strip() for x in str(r['Befestigungen (Kennungen)'] or '').split(',') if x.strip()], '_radius': radius}
        if r.get('Gewicht g') not in (None, ''): size['netWeightG'] = num(r['Gewicht g'])
        if r.get('Rückplatte Eckenradius mm') not in (None, ''): size['backingCornerRadiusMm'] = num(r['Rückplatte Eckenradius mm'])
        f['sizes'].append(size)
    # Group radius = common radius of its sizes; differing radii stay on the sizes (as drawn in Corel).
    for f in fams.values():
        for g in f['groups']:
            radii = set(g.pop('_radii')); g['cornerRadiusMm'] = radii.pop() if len(radii) == 1 and g['shape'] in ('rect', 'plaque') else 0
        for s in f['sizes']:
            radius = s.pop('_radius'); g = next(g for g in f['groups'] if g['key'] == s['groupKey'])
            if g['shape'] in ('rect', 'plaque') and radius != g['cornerRadiusMm']: s['cornerRadiusMm'] = radius
    for r in staffel:
        f = fams[r['Familie']]; sku = str(r.get('SKU') or '').strip()
        target = f if not sku else next(s for s in f['sizes'] if s['key'] == sku)
        tiers = target.setdefault('quantityTiers', [])
        if r.get('ab Stück') in (None, ''): continue
        tier = {'minQuantity': int(num(r['ab Stück']))}
        if r.get('Stückpreis €') not in (None, ''): tier['unitCents'] = cents(r['Stückpreis €'])
        else:
            pct = num(r.get('Rabatt %'))
            tier['percentOff'] = None if pct is None else (int(pct) if pct == int(pct) else round(pct, 2))
        tiers.append(tier)
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    report = []
    for fid, f in fams.items():
        path = out / f'{fid}.json'; path.write_text(json.dumps(f, ensure_ascii=False, indent=1), encoding='utf-8')
        check = subprocess.run(['node', '--input-type=module', '-e', "import fs from 'node:fs';import {validateFamily,familyGaps} from './app/workshop/product-families.mjs';const f=JSON.parse(fs.readFileSync(process.argv[1]));validateFamily(f);console.log(JSON.stringify(familyGaps(f)));", str(path)], cwd=ROOT, capture_output=True, text=True)
        report.append((fid, 'gültig · offen: ' + (', '.join(json.loads(check.stdout)) or 'nichts') if check.returncode == 0 else 'FEHLER: ' + check.stderr.strip().splitlines()[-1][:200]))
    return report


if __name__ == '__main__':
    p = argparse.ArgumentParser(); sub = p.add_subparsers(dest='cmd', required=True)
    e = sub.add_parser('export'); e.add_argument('--out', required=True); e.add_argument('families', nargs='*')
    i = sub.add_parser('import'); i.add_argument('--xlsx', required=True); i.add_argument('--out', required=True)
    a = p.parse_args()
    if a.cmd == 'export':
        fams = export(a.families or bundled(), a.out)
        print(f'{len(fams)} Familien → {a.out}: ' + ', '.join(f['name'] for f in fams))
    else:
        for fid, status in import_(a.xlsx, a.out): print(fid, '→', status)
