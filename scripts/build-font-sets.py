"""Schrift-Sets je Produktlinie aus der Freigabeliste erzeugen und als Musterblätter rendern.

Liest <katalog>/schriften/schriften.json und sets.json, schreibt schriften/_muster/<set>.png
(Beispieltext je Schrift, echte Dateien aus schriften/dateien; fehlende Dateien als Hinweiszeile)
und schriften/_muster/alle.png (alle freigegebenen Schriften). Kein Schreiben in die Werkstatt.

    python scripts/build-font-sets.py --katalog <katalog> [--text "Familie Niemann 32"]
schriften/sets.xlsx ist eine Lesekopie. Änderungen erfolgen ausschließlich über
/werkstatt/schriftgruppen/ mit Wirkungsprüfung und Änderungsprotokoll.
Der frühere --import-xlsx-Schreibweg ist gesperrt.
"""
import argparse, json
from pathlib import Path


def label_font(kat, size):
    from PIL import ImageFont
    p = kat / 'schriften/dateien/Lato/Lato-Regular.ttf'
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default()


def sheet(title, entries, kat, text, path, note=''):
    from PIL import Image, ImageDraw, ImageFont
    rows = len(entries); line_h = 74; w = 1400; lf, lt = label_font(kat, 18), label_font(kat, 22)
    im = Image.new('RGB', (w, 70 + rows * line_h + (30 if note else 0)), 'white'); dr = ImageDraw.Draw(im)
    dr.text((24, 18), title, font=lt, fill=(30, 50, 45)); dr.text((24, 36), note, font=lf, fill=(90, 90, 90)) if note else None
    y = 70
    for e in entries:
        dr.text((24, y + 26), e['name'][:28], font=lf, fill=(40, 40, 40))
        if e.get('file') and (kat / e['file']).exists():
            try:
                f = ImageFont.truetype(str(kat / e['file']), 44); dr.text((330, y + 8), text, font=f, fill=(0, 0, 0))
            except OSError:
                dr.text((330, y + 26), '(Datei nicht lesbar)', font=lf, fill=(180, 60, 60))
        else:
            dr.text((330, y + 26), '(Datei fehlt – Nutzer liefert)', font=lf, fill=(180, 60, 60))
        if e.get('thin'): dr.text((1180, y + 26), 'feine Linien', font=lf, fill=(150, 110, 40))
        y += line_h
    im.save(path, optimize=True)


def export_xlsx(kat, fonts, data):
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill
    wb = Workbook(); ws = wb.active; ws.title = 'Schrift-Sets'
    sets = data['sets']; head = ['Schrift', 'Kategorie', 'Datei im Repo', 'feine Linien'] + [s['name'] for s in sets]
    ws.append(head)
    for c in ws[1]: c.font = Font(bold=True); c.alignment = Alignment(wrap_text=True, vertical='top')
    for f in fonts.values():
        ws.append([f['name'], f['category'], 'ja' if f.get('file') else 'fehlt', 'ja' if f.get('thin') else ''] + ['x' if f['name'] in s['fonts'] else '' for s in sets])
    for row in ws.iter_rows(min_row=2):
        if row[0].value in data.get('always', []):
            for c in row: c.fill = PatternFill('solid', fgColor='FFF2CC')
    ws.freeze_panes = 'B2'; ws.column_dimensions['A'].width = 24; ws.column_dimensions['B'].width = 26
    for i in range(5, 5 + len(sets)): ws.column_dimensions[ws.cell(1, i).column_letter].width = 14
    info = wb.create_sheet('Lesen')
    for line in ['„x“ in einer Set-Spalte = Schrift gehört zum Set dieser Produktlinie. Leer = nicht enthalten.',
                 'Gelb hinterlegt: Schriften, die laut Vorgabe in jedem Set bleiben (' + ', '.join(data.get('always', [])) + ').',
                 'Lesekopie des aktuellen Katalogstands; Änderungen hier werden nicht zurückgespielt.',
                 'Schriftgruppen ändern: /werkstatt/schriftgruppen/ (Werkstatt). Der frühere Excel-Import ist gesperrt.',
                 'Set-Reihenfolge und Namen stehen in sets.json; neue Sets dort anlegen (id, name, note), dann erscheint die Spalte hier.']:
        info.append([line])
    info.column_dimensions['A'].width = 140
    wb.save(kat / 'schriften/sets.xlsx')


def import_xlsx(kat, fonts, data, path):
    raise SystemExit('Excel-Import gesperrt. Bitte Schriftgruppen unter /werkstatt/schriftgruppen/ ändern; dort werden Auswirkungen geprüft und Änderungen protokolliert.')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--katalog', required=True); ap.add_argument('--text', default='Familie Niemann 32'); ap.add_argument('--import-xlsx'); a = ap.parse_args()
    if a.import_xlsx: import_xlsx(None, None, None, a.import_xlsx)
    kat = Path(a.katalog); fonts = {f['name']: f for f in json.loads((kat / 'schriften/schriften.json').read_text(encoding='utf-8'))['fonts']}
    data = json.loads((kat / 'schriften/sets.json').read_text(encoding='utf-8'))
    sets = data['sets']
    export_xlsx(kat, fonts, data)
    out = kat / 'schriften/_muster'; out.mkdir(exist_ok=True)
    unknown = [n for s in sets for n in s['fonts'] if n not in fonts]
    if unknown: raise SystemExit('Nicht freigegebene Schrift in einem Set: ' + ', '.join(unknown))
    for s in sets:
        sheet(f"Schrift-Set „{s['name']}“ ({len(s['fonts'])}) – {s['note']}", [fonts[n] for n in s['fonts']], kat, a.text, out / f"{s['id']}.png")
    sheet(f'Alle freigegebenen Schriften ({len(fonts)})', list(fonts.values()), kat, a.text, out / 'alle.png')
    print(f'{len(sets)} Sets, {len(fonts)} Schriften → {out} · Matrix: schriften/sets.xlsx')


if __name__ == '__main__':
    main()
