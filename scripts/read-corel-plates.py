"""Plattenmaße, Bohrlöcher und Rückplatte aus einer CorelDRAW-PDF lesen.

Konvention der Zeichnung (Hausnummer-Namenschilder-2026.cdr):
  rot   = die eigentliche Platte (Kontur) und ihre Bohrlöcher
  cyan  = Rückplatte der S/S-Ausführung (schwarz satiniert), rundum 10 mm größer
  Kreise Ø 8 mm = Bohrlöcher für Abstandshalter
Form: Rechteck, Oval (Ellipse), abgerundetes Rechteck (konvex) oder Platte mit
eingezogenen Ecken (konkave Viertelkreise, „Plakettenform“), Radius gemessen.
Anordnung: Die Zeichnung ist in Spalten angelegt (je Spalte eine Form/Befestigung,
von oben nach unten aufsteigend). drawingColumn/drawingRow halten diese Ordnung.

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
        # convex (rounded) or concave (eingezogene Ecke)? The curve's midpoint lies close to the
        # plate corner for a rounded corner (≈ 0.29 r) and a full radius away for a concave one.
        p0, p1, p2, p3 = cs[0][1:5]
        mid = ((p0.x + 3 * p1.x + 3 * p2.x + p3.x) / 8, (p0.y + 3 * p1.y + 3 * p2.y + p3.y) / 8)
        bb = it['items'] and (min(p.x for c in cs for p in c[1:5]), min(p.y for c in cs for p in c[1:5]), max(p.x for c in cs for p in c[1:5]), max(p.y for c in cs for p in c[1:5]))
        corner = min([(bb[0], bb[1]), (bb[2], bb[1]), (bb[0], bb[3]), (bb[2], bb[3])], key=lambda c: math.hypot(c[0] - p0.x, c[1] - p0.y) + math.hypot(c[0] - p3.x, c[1] - p3.y))
        dist = math.hypot(mid[0] - corner[0], mid[1] - corner[1]) * MM
        return ('plaque' if dist > .6 * span else 'rect'), round(span, 1)

    def back_radius(o):
        cs = [s for s in o['items'] if s[0] == 'c']
        return round(abs(cs[0][1].x - cs[0][4].x) * MM, 1) if o['kind'] not in ('re', 'cccc') and cs else 0

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
                     'backMarginMm': round((outer[0]['w'] - pl['w']) / 2, 2) if outer else None, 'backCornerRadiusMm': back_radius(outer[0]) if outer else None,
                     '_x': pl['x0'], '_y': pl['y0']})
    # Columns as drawn: plates whose x-ranges overlap form one column; rows top to bottom.
    cols = []
    for r in sorted(rows, key=lambda r: r['_x']):
        for c in cols:
            if any(r['_x'] < q['_x'] + q['widthMm'] and q['_x'] < r['_x'] + r['widthMm'] for q in c): c.append(r); break
        else: cols.append([r])
    cols.sort(key=lambda c: min(r['_x'] for r in c))
    for ci, c in enumerate(cols, 1):
        for ri, r in enumerate(sorted(c, key=lambda r: r['_y']), 1): r['drawingColumn'], r['drawingRow'] = ci, ri
    for r in rows: del r['_x'], r['_y']
    rows.sort(key=lambda r: (r['drawingColumn'], r['drawingRow']))
    return rows, other, {'page_mm': [round(page.rect.width * MM), round(page.rect.height * MM)], 'drawings': len(items), 'creator': doc.metadata.get('creator'), 'columns': len(cols)}


def label(r):
    return 'Oval' if r['shape'] == 'ellipse' else f"Eingezogene Ecken R{r['cornerRadiusMm']:g}" if r['shape'] == 'plaque' else f"Eckig R{r['cornerRadiusMm']:g}" if r['cornerRadiusMm'] else 'Eckig'


def plaque_polygon(box, radius, n=8):
    """Rectangle with concave quarter-circle corners (centre = corner point)."""
    x0, y0, x1, y1 = box; r = radius; pts = []
    for cx, cy, a0 in [(x0, y0, 90), (x1, y0, 180), (x1, y1, 270), (x0, y1, 360)]:  # clockwise, arcs bulge inward
        for i in range(n + 1):
            a = math.radians(a0 - 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw_plate(dr, r, x, y, scale):
    """Plate at top-left (x, y) of the plate itself (backing drawn around it)."""
    w, h = r['widthMm'] * scale, r['heightMm'] * scale
    if r['backPlate']:
        m = (r['backMarginMm'] or 0) * scale; bbox = [x - m, y - m, x + w + m, y + h + m]
        if r['shape'] == 'ellipse': dr.ellipse(bbox, fill=(25, 25, 25))
        elif r['shape'] == 'plaque': dr.polygon(plaque_polygon(bbox, (r['backCornerRadiusMm'] or 0) * scale), fill=(25, 25, 25))
        else: dr.rounded_rectangle(bbox, radius=(r['cornerRadiusMm'] + (r['backMarginMm'] or 0)) * scale if r['cornerRadiusMm'] else 0, fill=(25, 25, 25))
    box = [x, y, x + w, y + h]
    if r['shape'] == 'ellipse': dr.ellipse(box, fill=(70, 72, 75), outline=(200, 40, 40))
    elif r['shape'] == 'plaque': dr.polygon(plaque_polygon(box, r['cornerRadiusMm'] * scale), fill=(70, 72, 75), outline=(200, 40, 40))
    else: dr.rounded_rectangle(box, radius=r['cornerRadiusMm'] * scale, fill=(70, 72, 75), outline=(200, 40, 40))
    for hx, hy in r['holePositions']:
        px, py, hr = x + hx * scale, y + hy * scale, HOLE_D / 2 * scale
        dr.ellipse([px - hr, py - hr, px + hr, py + hr], fill=(240, 238, 232), outline=(200, 40, 40))


def sheet(rows, path):
    """Overview laid out like the drawing: one column per drawing column, top to bottom."""
    scale = .5; pad = 30; text_h = 14
    cols = {}
    for r in rows: cols.setdefault(r['drawingColumn'], []).append(r)
    outer = lambda r: ((r['backPlate'] or [r['widthMm'], r['heightMm']])[0], (r['backPlate'] or [r['widthMm'], r['heightMm']])[1])
    text = lambda r: f"{r['widthMm']:g}x{r['heightMm']:g} {label(r)} · {r['holes']}L Rand {r['edgeMm']:g}"
    widths = {c: max(max(outer(r)[0] * scale, len(text(r)) * 6) for r in rs) + pad for c, rs in cols.items()}
    heights = {c: sum(outer(r)[1] * scale + text_h + pad for r in rs) for c, rs in cols.items()}
    im = Image.new('RGB', (int(sum(widths.values())) + pad, int(max(heights.values())) + pad), (240, 238, 232)); dr = ImageDraw.Draw(im)
    x = pad / 2
    for c in sorted(cols):
        y = pad / 2
        for r in sorted(cols[c], key=lambda r: r['drawingRow']):
            ow, oh = outer(r); m = (r['backMarginMm'] or 0) * scale
            draw_plate(dr, r, x + (widths[c] - pad - ow * scale) / 2 + m, y + m, scale)
            dr.text((x, y + oh * scale + 2), text(r), fill=(30, 30, 30))
            y += oh * scale + text_h + pad
        x += widths[c]
    im.save(path)


def main():
    p = argparse.ArgumentParser(); p.add_argument('pdf'); p.add_argument('--out', required=True); a = p.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    rows, other, meta = read(a.pdf)
    (out / 'platten.json').write_text(json.dumps({'source': Path(a.pdf).name, 'meta': meta, 'plates': rows, 'unclassified': len(other)}, ensure_ascii=False, indent=1), encoding='utf-8')
    md = ['| Spalte | Zeile | Platte mm | Form | Löcher | Lage | Randabstand mm | Rückplatte mm |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
    for r in rows:
        md.append(f"| {r['drawingColumn']} | {r['drawingRow']} | {r['widthMm']:g} × {r['heightMm']:g} | {label(r)} | {r['holes']} | {r['layout']} | {r['edgeMm']} | {('%g × %g' % tuple(r['backPlate'])) if r['backPlate'] else '–'}{(' R%g' % r['backCornerRadiusMm']) if r.get('backCornerRadiusMm') else ''} |")
    (out / 'platten.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    sheet(rows, out / 'uebersicht.png')
    print(f"{len(rows)} Platten in {meta['columns']} Spalten, {len(other)} nicht zugeordnete Zeichnungen → {out}")


if __name__ == '__main__':
    main()
