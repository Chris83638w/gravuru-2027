"""Stammdaten-Excel aus den Produktfamilien erzeugen – und zurücklesen.

    python scripts/family-excel.py export --out Stammdaten.xlsx [family.json …]
        Ohne Dateiangabe: alle mitgelieferten Familien (app/designs/**/family*.json,
        app/designs/gedenktafeln-30x20/*.json).
    python scripts/family-excel.py import --xlsx Stammdaten.xlsx --out ordner/
        Schreibt je Familie eine JSON-Datei, geprüft mit denselben Regeln wie die
        Werkstatt (node, validateFamily). Nichts wird in die Werkstatt geschrieben.

Blätter: Materialien, Familien, Größen, Befestigungen. Leere Zelle = offen.
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
SHAPES = {'rect': 'eckig', 'ellipse': 'oval'}
SHAPE_BY_TEXT = {v: k for k, v in SHAPES.items()}
MATERIALS = {'steel': ('Edelstahl', 'Gravur', 'dunkel'), 'slate': ('Schiefer', 'Gravur', 'hell'), 'acrylic': ('Acrylglas', 'Gravur', 'hell')}
PROCESS = {'steel-engraving': 'Gravur', 'slate-engraving': 'Gravur', 'acrylic-engraving': 'Gravur', 'color-print': 'Druck'}

euro = lambda c: None if c is None else round(c / 100, 2)
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
            seen[k] = [m['kind'], m.get('variant') or '', m['label'], m['thicknessMm'], PROCESS.get(m['processingProfileId'], m['processingProfileId']), ink, '']
    sheet('Materialien', ['Material (Kennung)', 'Variante', 'Bezeichnung', 'Stärke mm', 'Verfahren', 'Gravur erscheint', 'Hinweise'], list(seen.values()), [18, 12, 34, 10, 10, 16, 40])
    sheet('Familien', ['Familie (Kennung)', 'Name', 'Material', 'Variante', 'Stärke mm', 'Verfahren', 'Gestaltungsrand mm', 'Schutzzone mm', 'Ohne Befestigung anbieten', 'Schriften', 'Stilnotizen', 'Herkunft'],
          [[f['id'], f['name'], f['material']['kind'], f['material'].get('variant') or '', f['material']['thicknessMm'], PROCESS.get(f['material']['processingProfileId'], f['material']['processingProfileId']),
            f['designArea']['marginMm'], f['designArea']['keepoutMm'], 'ja' if f['withoutMounting'] else 'nein', ', '.join(f['fonts']), f['briefingNotes'], (f.get('source') or {}).get('note', '')] for f in fams],
          [26, 34, 10, 10, 9, 10, 12, 12, 12, 50, 60, 60])
    rows = []
    for f in fams:
        groups = {g['key']: g for g in f['groups']}
        for s in f['sizes']:
            g = groups[s['groupKey']]
            rows.append([f['id'], s['key'], s['groupKey'], g['name'], SHAPES[g['shape']], g['cornerRadiusMm'], s['label'], s['widthMm'], s['heightMm'], euro(s['baseCents']), s.get('netWeightG'), ', '.join(s['mounting'])])
    sheet('Größen', ['Familie', 'SKU', 'Formgruppe', 'Form', 'eckig/oval', 'Eckenradius mm', 'Bezeichnung', 'Breite mm', 'Höhe mm', 'Grundpreis €', 'Gewicht g', 'Befestigungen (Kennungen)'], rows, [22, 26, 10, 22, 10, 12, 14, 10, 10, 12, 10, 50])
    rows = []
    for f in fams:
        for r in f['mountingRules']:
            rows.append([f['id'], r['id'], r['label'], r['skuSuffix'], LAYOUTS[r['layout']], r['count'], r['diameterMm'], r['edgeMm'], 'Schrauben' if r.get('accessory') == 'screws' else '', euro(r['priceCents'])])
    sheet('Befestigungen', ['Familie', 'Kennung', 'Bezeichnung', 'SKU-Endung', 'Lage', 'Anzahl Löcher', 'Ø mm', 'Randabstand mm', 'Zubehör', 'Aufpreis €'], rows, [22, 16, 32, 10, 20, 12, 8, 14, 12, 11])
    ws = wb.create_sheet('Lesen')
    for line in ['Leere Zelle = offen (noch nicht festgelegt). Nichts wird geraten.', 'Preise in Euro mit Komma, intern ganze Cent.', 'Bohrlöcher: Randabstand = Rand bis Lochmitte. Löcher werden je Größe aus Lage, Ø und Randabstand berechnet, nicht skaliert.',
                 'Befestigungen je Größe als Kennungen aus dem Blatt Befestigungen, mit Komma getrennt. Neue Kennung = neue Zeile dort.', 'Zurücklesen: python scripts/family-excel.py import --xlsx DATEI --out ORDNER']:
        ws.append([line])
    ws.column_dimensions['A'].width = 120
    wb.save(out)
    return fams


def import_(xlsx, out):
    wb = load_workbook(xlsx, data_only=True)
    rows = lambda name: [dict(zip([c.value for c in wb[name][1]], [c.value for c in r])) for r in wb[name].iter_rows(min_row=2) if any(c.value not in (None, '') for c in r)]
    fams = {}
    proc_id = {('steel', 'Gravur'): 'steel-engraving', ('slate', 'Gravur'): 'slate-engraving', ('acrylic', 'Gravur'): 'acrylic-engraving'}
    for r in rows('Familien'):
        fid = r['Familie (Kennung)']
        kind = r['Material']
        fams[fid] = {'schema': 'gravuru-product-family/v2', 'id': fid, 'name': r['Name'],
                     'material': {'kind': kind, **({'variant': r['Variante']} if r.get('Variante') else {}), 'label': '', 'thicknessMm': num(r['Stärke mm']), 'processingProfileId': proc_id.get((kind, r['Verfahren']), r['Verfahren'])},
                     'designArea': {'marginMm': num(r['Gestaltungsrand mm']), 'keepoutMm': num(r['Schutzzone mm'])}, 'groups': [], 'mountingRules': [], 'sizes': [],
                     'withoutMounting': str(r['Ohne Befestigung anbieten']).strip().lower() == 'ja', 'fonts': [x.strip() for x in str(r['Schriften'] or '').split(',') if x.strip()],
                     'briefingNotes': r['Stilnotizen'] or '', 'source': {'note': 'Aus Stammdaten-Excel gelesen: ' + Path(xlsx).name}}
    for r in rows('Materialien'):
        for f in fams.values():
            if f['material']['kind'] == r['Material (Kennung)'] and (f['material'].get('variant') or '') == (r['Variante'] or ''): f['material']['label'] = r['Bezeichnung']
    for r in rows('Befestigungen'):
        f = fams[r['Familie']]; layout = LAYOUT_BY_TEXT[r['Lage']]
        rule = {'id': r['Kennung'], 'label': r['Bezeichnung'], 'layout': layout, 'count': 0 if layout == 'none' else int(r['Anzahl Löcher']),
                'diameterMm': None if layout == 'none' else num(r['Ø mm']), 'edgeMm': None if layout == 'none' else num(r['Randabstand mm']), 'priceCents': cents(r['Aufpreis €']), 'skuSuffix': r['SKU-Endung']}
        if r.get('Zubehör') == 'Schrauben': rule['accessory'] = 'screws'
        f['mountingRules'].append(rule)
    for r in rows('Größen'):
        f = fams[r['Familie']]
        if not any(g['key'] == r['Formgruppe'] for g in f['groups']):
            f['groups'].append({'key': r['Formgruppe'], 'name': r['Form'], 'shape': SHAPE_BY_TEXT[r['eckig/oval']], 'cornerRadiusMm': num(r['Eckenradius mm']) or 0})
        size = {'key': r['SKU'], 'groupKey': r['Formgruppe'], 'label': r['Bezeichnung'], 'widthMm': num(r['Breite mm']), 'heightMm': num(r['Höhe mm']), 'baseCents': cents(r['Grundpreis €']),
                'mounting': [x.strip() for x in str(r['Befestigungen (Kennungen)'] or '').split(',') if x.strip()]}
        if r.get('Gewicht g') not in (None, ''): size['netWeightG'] = num(r['Gewicht g'])
        f['sizes'].append(size)
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
