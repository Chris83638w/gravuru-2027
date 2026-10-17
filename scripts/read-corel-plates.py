"""Plattenmaße, Bohrlöcher und Rückplatte aus einer CorelDRAW-PDF lesen.

Konvention der Zeichnung (Hausnummer-Namenschilder-2026.cdr):
  rot   = die eigentliche Platte (Kontur) und ihre Bohrlöcher
  cyan  = Rückplatte der S/S-Ausführung (schwarz satiniert), rundum 10 mm größer
  Kreise Ø 8 mm = Bohrlöcher für Abstandshalter
Form: Rechteck, Oval (Ellipse) oder abgerundetes Rechteck mit gemessenem Radius.

    python scripts/read-corel-plates.py datei.pdf --out ordner/
Schreibt platten.json, platten.md (Tabelle) und uebersicht.png (alle Platten
maßstäblich aus den gelesenen Werten gezeichnet – zum Gegenprüfen).
Liest nur; keine Werkstatt, kein Shop.
"""
import argparse, json, math
from pathlib import Path
import pymupdf
from PIL import Image, ImageDraw

MM = 25.4 / 72
HOLE_D = 8.0


def read(pdf):
    doc = pymupdf.open(pdf); page = doc[0]
    items = []
    for d in page.get_drawings():
        bb = d['rect']; col = d.get('color'); kinds = ''.join(it[0] for it in d['items'])
        items.append({'col': 'rot' if col == (1, 0, 0) else 'cyan' if col == (0, 1, 1) else str(col), 'kind': kinds,
                      'x0': bb.x0 * MM, 'y0': bb.y0 * MM, 'w': bb.width * MM, 'h': bb.height * MM, 'items': d['items']})
    is_hole = lambda i: i['kind'] == 'cccc' and abs(i['w'] - HOLE_D) < .5 and abs(i['h'] - HOLE_D) < .5
    holes = [i for i in items if is_hole(i)]
    plates = [i for i in items if i['col'] == 'rot' and not is_hole(i)]
    outers = [i for i in items if i['col'] == 'cyan' and not is_hole(i)]
    other = [i for i in items if not (is_hole(i) or i in plates or i in outers)]

    def shape(it):
        if it['kind'] == 're': return 'rect', 0
        cs = [s for s in it['items'] if s[0] == 'c']
        span = abs(cs[0][1].x - cs[0][4].x) * MM
        if abs(span - it['w'] / 2) < .5 or abs(span - it['h'] / 2) < .5: return 'ellipse', 0
        return 'rect', round(span, 1)

    rows = []
    for pl in plates:
        inside = [h for h in holes if h['col'] == 'rot' and h['x0'] >= pl['x0'] - .1 and h['y0'] >= pl['y0'] - .1 and h['x0'] + h['w'] <= pl['x0'] + pl['w'] + .1 and h['y0'] + h['h'] <= pl['y0'] + pl['h'] + .1]
        outer = [o for o in outers if o['x0'] <= pl['x0'] + .1 and o['y0'] <= pl['y0'] + .1 and o['x0'] + o['w'] >= pl['x0'] + pl['w'] - .1 and o['y0'] + o['h'] >= pl['y0'] + pl['h'] - .1]
        pos = sorted({(round(h['x0'] + HOLE_D / 2 - pl['x0'], 2), round(h['y0'] + HOLE_D / 2 - pl['y0'], 2)) for h in inside})
        sh, radius = shape(pl)
        w, h = round(pl['w'], 2), round(pl['h'], 2)
        edge = sorted({round(min(x, w - x), 2) for x, y in pos} | {round(min(y, h - y), 2) for x, y in pos if len(pos) == 4})
        layout = 'corners' if len(pos) == 4 else 'left-right' if len(pos) == 2 and len({y for x, y in pos}) == 1 else 'top-bottom' if len(pos) == 2 else 'unbekannt'
        rows.append({'widthMm': w, 'heightMm': h, 'shape': sh, 'cornerRadiusMm': radius, 'holes': len(pos), 'layout': layout, 'edgeMm': edge[0] if len(edge) == 1 else edge,
                     'holeDiameterMm': HOLE_D, 'holePositions': pos, 'backPlate': [round(outer[0]['w'], 2), round(outer[0]['h'], 2)] if outer else None,
                     'backMarginMm': round((outer[0]['w'] - pl['w']) / 2, 2) if outer else None})
    rows.sort(key=lambda r: (r['widthMm'], r['heightMm'], r['shape'], r['cornerRadiusMm'], r['holes']))
    return rows, other, {'page_mm': [round(page.rect.width * MM), round(page.rect.height * MM)], 'drawings': len(items), 'creator': doc.metadata.get('creator')}


def label(r):
    form = 'Oval' if r['shape'] == 'ellipse' else f"Eckig R{r['cornerRadiusMm']:g}" if r['cornerRadiusMm'] else 'Eckig'
    return form


def sheet(rows, path):
    scale = .6; pad = 24; cols = 6
    cell_w = int(max(r['backPlate'][0] if r['backPlate'] else r['widthMm'] for r in rows) * scale) + pad
    cell_h = int(max(r['backPlate'][1] if r['backPlate'] else r['heightMm'] for r in rows) * scale) + pad + 30
    n = len(rows); rws = math.ceil(n / cols)
    im = Image.new('RGB', (cols * cell_w, rws * cell_h), (240, 238, 232)); dr = ImageDraw.Draw(im)
    for i, r in enumerate(rows):
        cx, cy = (i % cols) * cell_w + cell_w / 2, (i // cols) * cell_h + (cell_h - 30) / 2
        if r['backPlate']:
            bw, bh = r['backPlate'][0] * scale, r['backPlate'][1] * scale
            dr.rectangle([cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2], fill=(25, 25, 25))
        w, h = r['widthMm'] * scale, r['heightMm'] * scale; box = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
        if r['shape'] == 'ellipse': dr.ellipse(box, fill=(70, 72, 75), outline=(200, 40, 40))
        else: dr.rounded_rectangle(box, radius=r['cornerRadiusMm'] * scale, fill=(70, 72, 75), outline=(200, 40, 40))
        for x, y in r['holePositions']:
            hx, hy, hr = cx - w / 2 + x * scale, cy - h / 2 + y * scale, HOLE_D / 2 * scale
            dr.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(240, 238, 232), outline=(200, 40, 40))
        dr.text((cx - cell_w / 2 + 6, cy + (cell_h - 30) / 2 + 2), f"{r['widthMm']:g}×{r['heightMm']:g} {label(r)} · {r['holes']} Loecher, Rand {r['edgeMm']:g}", fill=(30, 30, 30))
    im.save(path)


def main():
    p = argparse.ArgumentParser(); p.add_argument('pdf'); p.add_argument('--out', required=True); a = p.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    rows, other, meta = read(a.pdf)
    (out / 'platten.json').write_text(json.dumps({'source': Path(a.pdf).name, 'meta': meta, 'plates': rows, 'unclassified': len(other)}, ensure_ascii=False, indent=1), encoding='utf-8')
    md = ['| Platte mm | Form | Löcher | Lage | Randabstand mm | Rückplatte mm |', '| --- | --- | --- | --- | --- | --- |']
    for r in rows:
        md.append(f"| {r['widthMm']:g} × {r['heightMm']:g} | {label(r)} | {r['holes']} | {r['layout']} | {r['edgeMm']} | {('%g × %g' % tuple(r['backPlate'])) if r['backPlate'] else '–'} |")
    (out / 'platten.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    sheet(rows, out / 'uebersicht.png')
    print(f"{len(rows)} Platten, {len(other)} nicht zugeordnete Zeichnungen → {out}")


if __name__ == '__main__':
    main()
