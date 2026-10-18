"""Lagekontrolle der aus Corel gelesenen Designs: jeder Text wird einzeln gerendert, die tatsächliche
Tintenbox mit der Box aus Corel (design.json → texts[].box, mm) verglichen. Abweichungen zeigen
falsche Grundlinie, falsche Ausrichtung oder eine Ersatzschrift mit anderer Laufweite.

    FONTCONFIG_FILE=… python scripts/check-design-layout.py <bestand-ordner> [--limit-mm 2] [--csv bericht.csv]

Bericht: je Text dx_links, dx_rechts, dy_oben, dy_unten (gerendert minus Corel, mm); je Design das Maximum.
Designs mit Ersatzschrift werden getrennt gezählt (dort ist die Breite erwartbar anders).
"""
import argparse, csv, importlib.util, io, json, sys
from pathlib import Path

_spec = importlib.util.spec_from_file_location('corel', Path(__file__).with_name('read-corel-design-sheets.py'))
corel = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(corel)

PX_PER_MM = 4


def text_bbox_mm(d, i):
    """Nur Text i rendern (weiß auf schwarz) und seine Tintenbox in mm liefern."""
    from PIL import Image
    import cairosvg
    one = {**d, 'motifs': [], 'images': [], 'texts': [d['texts'][i]], 'texture': None}
    svg = corel.design_svg(one, preview=True)
    W, H = d['plate']['widthMm'], d['plate']['heightMm']
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=int(W * PX_PER_MM), output_height=int(H * PX_PER_MM))
    im = Image.open(io.BytesIO(png)).convert('L')
    bb = im.point(lambda v: 255 if v > 90 else 0).getbbox()
    if not bb: return None
    return [bb[0] / PX_PER_MM, bb[1] / PX_PER_MM, bb[2] / PX_PER_MM, bb[3] / PX_PER_MM]


def font_ok(family):
    import re, subprocess
    got = subprocess.run(['fc-match', '-f', '%{family}', family], capture_output=True, text=True).stdout
    k = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
    return any(k(g) == k(family) or (k(g) in k(family) or k(family) in k(g)) and min(len(k(g)), len(k(family))) >= 5 for g in got.split(','))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('root'); ap.add_argument('--limit-mm', type=float, default=2.0); ap.add_argument('--csv', default='')
    ap.add_argument('--max', type=int, default=0, help='nur die ersten N Designs (Test)')
    a = ap.parse_args(); root = Path(a.root)
    files = sorted(root.rglob('design.json'))
    if a.max: files = files[:a.max]
    rows = []; worst = []; n_ok = n_bad = n_sub = 0
    for f in files:
        d = json.loads(f.read_text(encoding='utf-8'))
        if d.get('sourceKind', 'corel-bogen') != 'corel-bogen' or not d.get('texts') or not d.get('plate'): continue
        maxdev = 0.0; sub = False
        for i, t in enumerate(d['texts']):
            if t.get('hint') or corel.HINT.search(t['text']) or not t.get('box'): continue
            if not font_ok(t['font']): sub = True
            got = text_bbox_mm(d, i)
            if not got: continue
            x, y, w, h = t['box']; exp = [x, y, x + w, y + h]
            dev = [round(g - e, 2) for g, e in zip(got, exp)]
            rows.append([d['id'], i + 1, t['font'], font_ok(t['font']), t['align'], t['text'].replace('\n', ' / ')[:40], *dev])
            # bewertet werden Grundlinie/Höhe und die Ankerkante (links bei Start, rechts bei Ende); die Breite kann
            # durch Stauchung (Corel-Zeichenbreite) oder Ersatzschrift abweichen und wird nur berichtet
            edge = dev[0] if t['align'] not in ('center', 'right') else dev[2] if t['align'] == 'right' else 0.0
            m = max(abs(dev[1]), abs(dev[3]), abs(edge))
            maxdev = max(maxdev, m)
        if sub: n_sub += 1
        if maxdev > a.limit_mm: n_bad += 1; worst.append((maxdev, d['id'], f.parent.relative_to(root).as_posix()))
        else: n_ok += 1
    worst.sort(reverse=True)
    print(f'{n_ok} Designs innerhalb {a.limit_mm} mm, {n_bad} darüber, {n_sub} mit Ersatzschrift')
    for dev, id_, p in worst[:40]: print(f'  {dev:6.1f} mm  {id_:22} {p}')
    if a.csv:
        with open(a.csv, 'w', newline='', encoding='utf-8') as fh:
            w = csv.writer(fh, delimiter=';'); w.writerow(['Design', 'Text', 'Schrift', 'Schrift vorhanden', 'Ausrichtung', 'Text', 'dx links', 'dy oben', 'dx rechts', 'dy unten']); w.writerows(rows)
        print('Bericht:', a.csv)


if __name__ == '__main__':
    main()
