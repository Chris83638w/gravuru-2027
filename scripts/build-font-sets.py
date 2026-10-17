"""Schrift-Sets je Produktlinie aus der Freigabeliste erzeugen und als Musterblätter rendern.

Liest <katalog>/schriften/schriften.json und sets.json, schreibt schriften/_muster/<set>.png
(Beispieltext je Schrift, echte Dateien aus schriften/dateien; fehlende Dateien als Hinweiszeile)
und schriften/_muster/alle.png (alle freigegebenen Schriften). Kein Schreiben in die Werkstatt.

    python scripts/build-font-sets.py --katalog <katalog> [--text "Familie Niemann 32"]
"""
import argparse, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def label_font(kat, size):
    p = kat / 'schriften/dateien/Lato/Lato-Regular.ttf'
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default()


def sheet(title, entries, kat, text, path, note=''):
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


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--katalog', required=True); ap.add_argument('--text', default='Familie Niemann 32'); a = ap.parse_args()
    kat = Path(a.katalog); fonts = {f['name']: f for f in json.loads((kat / 'schriften/schriften.json').read_text(encoding='utf-8'))['fonts']}
    sets = json.loads((kat / 'schriften/sets.json').read_text(encoding='utf-8'))['sets']
    out = kat / 'schriften/_muster'; out.mkdir(exist_ok=True)
    unknown = [n for s in sets for n in s['fonts'] if n not in fonts]
    if unknown: raise SystemExit('Nicht freigegebene Schrift in einem Set: ' + ', '.join(unknown))
    for s in sets:
        sheet(f"Schrift-Set „{s['name']}“ ({len(s['fonts'])}) – {s['note']}", [fonts[n] for n in s['fonts']], kat, a.text, out / f"{s['id']}.png")
    sheet(f'Alle freigegebenen Schriften ({len(fonts)})', list(fonts.values()), kat, a.text, out / 'alle.png')
    print(f'{len(sets)} Sets, {len(fonts)} Schriften → {out}')


if __name__ == '__main__':
    main()
