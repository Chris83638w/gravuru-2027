"""Plattenkatalog als PDF aus einer Produktfamilie – zum Gegenprüfen und Abstimmen.

Aufbau wie die Corel-Zeichnung: Spalten, je Spalte eine Form mit einer Befestigung,
Größen von oben nach unten aufsteigend. Die Spaltenfolge kommt aus der Zeichnung
(drawingColumn in der Platten-JSON, auf die family.source.path zeigt); Familien ohne
Zeichnung bekommen Spalten je Form × Befestigung × Formatreihe. Ergänzte Größen, die
nicht in der Zeichnung stehen, kommen als eigene Spalte ans Ende.

Je Platte: Rückplatte (blau), Platte (rot), Bohrlöcher; darunter Größe, Form, Randabstand, SKU.

    python scripts/plate-catalog-pdf.py familie.json --out katalog.pdf [--scale 0.3]
Der Maßstab wird verkleinert, wenn die höchste Spalte sonst nicht auf eine Seite passt.
Nur Lesen und Zeichnen; keine Werkstatt, kein Shop.
"""
import argparse, json, math
from pathlib import Path
import cairosvg, pymupdf

ROOT = Path(__file__).resolve().parents[1]
PAGE_W, PAGE_H, MARGIN, HEAD = 420, 297, 12, 28  # A3 quer in mm
LAYOUT_DE = {'left-right': 'seitlich mittig', 'top-bottom': 'oben/unten', 'corners': 'in den Ecken', 'top-center': 'oben mittig', 'none': 'ohne Löcher'}
SHAPE_DE = {'rect': 'Rechteck', 'ellipse': 'Oval', 'plaque': 'Eingezogene Ecken'}
GAP, LABEL_H, LINE_H = 6, 4, 3.4


def holes_for(w, h, rule):
    e, d = rule['edgeMm'], rule['diameterMm']
    pts = {'left-right': [(e, h / 2), (w - e, h / 2)], 'top-bottom': [(w / 2, e), (w / 2, h - e)], 'corners': [(e, e), (w - e, e), (e, h - e), (w - e, h - e)], 'top-center': [(w / 2, e)]}.get(rule['layout'], [])
    return [(x, y, d) for x, y in pts]


def ratio(w, h):
    g = math.gcd(int(round(w)), int(round(h))); a, b = int(round(w)) // g, int(round(h)) // g
    return f'{a}:{b}' if a <= 20 and b <= 20 else f'{w / h:.2f}:1'


def esc(t): return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def contour(x, y, w, h, shape, radius):
    """SVG path of a plate at (x, y): rect, rounded rect, oval or plaque (concave corners)."""
    if shape == 'ellipse':
        return f'M{x} {y + h / 2}a{w / 2} {h / 2} 0 1 0 {w} 0a{w / 2} {h / 2} 0 1 0 {-w} 0Z'
    r = radius or 0
    if not r: return f'M{x} {y}h{w}v{h}h{-w}Z'
    sw = 0 if shape == 'plaque' else 1  # 0 = Bogen nach innen (eingezogene Ecke), 1 = abgerundet
    return (f'M{x + r} {y}H{x + w - r}A{r} {r} 0 0 {sw} {x + w} {y + r}V{y + h - r}A{r} {r} 0 0 {sw} {x + w - r} {y + h}'
            f'H{x + r}A{r} {r} 0 0 {sw} {x} {y + h - r}V{y + r}A{r} {r} 0 0 {sw} {x + r} {y}Z')


def plate_svg(x, y, it, s):
    """Plate with top-left corner of the plate itself at (x, y); backing drawn around it."""
    w, h, out = it['w'] * s, it['h'] * s, []
    b = (it['backing'] or 0) * s
    if b:
        out.append(f'<path d="{contour(x - b, y - b, w + 2 * b, h + 2 * b, it["shape"], it["backingRadius"] * s)}" fill="#1c1c1c" stroke="#06c" stroke-width="0.35"/>')
    out.append(f'<path d="{contour(x, y, w, h, it["shape"], it["radius"] * s)}" fill="#4a4d50" stroke="#d22" stroke-width="0.35"/>')
    for hx, hy, d in it['holes']:
        out.append(f'<circle cx="{x + hx * s}" cy="{y + hy * s}" r="{d / 2 * s}" fill="#f2efe8" stroke="#d22" stroke-width="0.3"/>')
    ty = y + h + b + LABEL_H
    out.append(f'<text x="{x - b}" y="{ty}" font-family="Helvetica, Arial, sans-serif" font-size="3.2" font-weight="bold" fill="#222">{esc(it["label"])}</text>')
    for i, l in enumerate(it['lines']):
        out.append(f'<text x="{x - b}" y="{ty + LINE_H * (i + 1)}" font-family="Helvetica, Arial, sans-serif" font-size="2.7" fill="#444">{esc(l)}</text>')
    return '\n'.join(out)


def page_svg(title, subtitle, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W}mm" height="{PAGE_H}mm" viewBox="0 0 {PAGE_W} {PAGE_H}"><rect width="{PAGE_W}" height="{PAGE_H}" fill="#f2efe8"/>'
            f'<text x="{MARGIN}" y="{MARGIN + 4}" font-family="Helvetica, Arial, sans-serif" font-size="6" font-weight="bold" fill="#1d3b33">{esc(title)}</text>'
            f'<text x="{MARGIN}" y="{MARGIN + 10}" font-family="Helvetica, Arial, sans-serif" font-size="3.2" fill="#555">{esc(subtitle)}</text>{body}</svg>')


def text_page(title, paragraphs):
    y = MARGIN + 20; body = []
    for p in paragraphs:
        bold = p.startswith('#'); t = p.lstrip('# ')
        for line in wrap(t, 150 if not bold else 90):
            body.append(f'<text x="{MARGIN}" y="{y}" font-family="Helvetica, Arial, sans-serif" font-size="{4.4 if bold else 3.4}" font-weight="{"bold" if bold else "normal"}" fill="#222">{esc(line)}</text>'); y += 6 if bold else 5
        y += 2
    return page_svg(title, '', '\n'.join(body))


def wrap(t, n):
    words, lines, cur = t.split(), [], ''
    for w in words:
        if len(cur) + len(w) + 1 > n: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    return lines + [cur] if cur else lines


def item_h(it, s): return (it['h'] + 2 * (it['backing'] or 0)) * s + LABEL_H + LINE_H * len(it['lines']) + GAP


def item_w(it, s): return max((it['w'] + 2 * (it['backing'] or 0)) * s, len(it['label']) * 1.75, *[len(l) * 1.45 for l in it['lines']])


def layout_columns(cols, title, scale, drawn=True):
    SUBTITLE = ('Spalten wie in der Zeichnung' if drawn else 'eine Spalte je Form und Formatreihe') + ' · von oben nach unten aufsteigend · Maßstab 1 : '
    """cols: list of (header, items). Columns side by side, each stacked top→bottom; a column too
    tall for the page continues in a further sub-column with the same header. Returns page svgs."""
    pages, body, x = [], [], MARGIN
    avail = PAGE_H - MARGIN - HEAD - 4
    for header, items in cols:
        stacks, cur, h = [], [], 0
        for it in items:
            ih = item_h(it, scale)
            if cur and h + ih > avail: stacks.append(cur); cur, h = [], 0
            cur.append(it); h += ih
        if cur: stacks.append(cur)
        for n, stack in enumerate(stacks):
            cw = max([item_w(it, scale) for it in stack] + [len(l) * 1.55 for l in header]) + GAP
            if x + cw > PAGE_W - MARGIN:
                pages.append(page_svg(title, SUBTITLE + f'{1 / scale:.1f}'.replace('.', ','), '\n'.join(body))); body, x = [], MARGIN
            y = MARGIN + HEAD
            for i, line in enumerate(header):
                body.append(f'<text x="{x}" y="{y - 8 + 4 * i}" font-family="Helvetica, Arial, sans-serif" font-size="3.2" font-weight="{"bold" if i == 0 else "normal"}" fill="#1d3b33">{esc(line + (" (Forts.)" if n and i == 0 else ""))}</text>')
            for it in stack:
                b = (it['backing'] or 0) * scale
                body.append(plate_svg(x + b, y + b, it, scale)); y += item_h(it, scale)
            x += cw
    if body: pages.append(page_svg(title, SUBTITLE + f'{1 / scale:.1f}'.replace('.', ','), '\n'.join(body)))
    return pages


def drawing_columns(f):
    """(width, height, shape, holes, edge) → (column, row) from the Corel plate list, if the family has one."""
    src = (f.get('source') or {}).get('path')
    if not src or not (ROOT / src).exists(): return {}
    plates = json.loads((ROOT / src).read_text(encoding='utf-8')).get('plates', [])
    if not plates or 'drawingColumn' not in plates[0]: return {}
    return {(p['widthMm'], p['heightMm'], p['shape'], p['cornerRadiusMm'], p['holes'], p['edgeMm'] if not isinstance(p['edgeMm'], list) else p['edgeMm'][0]): (p['drawingColumn'], p['drawingRow']) for p in plates}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('family'); ap.add_argument('--out', required=True); ap.add_argument('--scale', type=float, default=0.3)
    a = ap.parse_args()
    f = json.loads(Path(a.family).read_text(encoding='utf-8'))
    groups = {g['key']: g for g in f['groups']}; rules = {r['id']: r for r in f['mountingRules']}
    backing = f.get('backing', {}).get('offsetMm')
    drawn = drawing_columns(f)
    # One entry per size × mounting rule, keyed to a column.
    entries = []
    for s in f['sizes']:
        g = groups[s['groupKey']]; radius = s.get('cornerRadiusMm', g['cornerRadiusMm'])
        for rid in s['mounting']:
            r = rules[rid]; holes = [] if r['layout'] == 'none' else holes_for(s['widthMm'], s['heightMm'], r)
            key = (s['widthMm'], s['heightMm'], g['shape'], radius or 0, r['count'], r['edgeMm'])
            col = drawn.get(key)
            # Without a drawing: one column per form and format series, mounting options stacked per size.
            colkey = ('drawn', col[0]) if col else ('extra', g['key'], (r['count'], r['layout']) if drawn else '', round(s['widthMm'] / s['heightMm'], 2))
            item = {'w': s['widthMm'], 'h': s['heightMm'], 'shape': g['shape'], 'radius': radius, 'holes': holes, 'backing': backing,
                    'backingRadius': s.get('backingCornerRadiusMm', (max(0, radius - backing) if g['shape'] == 'plaque' else radius + backing if radius else 0) if backing else 0),
                    'label': f"{s['label']} · {g['name']}" + (f' R{radius:g}' if radius and not g['cornerRadiusMm'] else ''),
                    'lines': [r['label'] + (f", Rand {r['edgeMm']:g} mm" if r['layout'] != 'none' else ', ohne Löcher') + (f" · +{r['priceCents'] / 100:.2f} €".replace('.', ',') if r['priceCents'] else ''), f"{s['key']}-{r['skuSuffix']}"],
                    'sort': (col[1] if col else (s['widthMm'] * s['heightMm'], list(rules).index(rid)))}
            entries.append((colkey, g, r, item))
    order = {}
    for colkey, g, r, item in entries: order.setdefault(colkey, (g, r, []))[2].append(item)
    cols = []
    for colkey in sorted(order, key=lambda k: (k[0] != 'drawn', k[1:] if k[0] == 'drawn' else (list(groups).index(k[1]), -k[3], k[2]))):
        g, r, items = order[colkey]; items.sort(key=lambda it: it['sort'])
        series = ', '.join(dict.fromkeys(ratio(it['w'], it['h']) for it in items))
        head = [(f'Spalte {colkey[1]}' if colkey[0] == 'drawn' else 'Ergänzt' if drawn else 'Reihe') + f' · {SHAPE_DE[g["shape"]]}' + (f' R{g["cornerRadiusMm"]:g}' if g['cornerRadiusMm'] else '') + f' · {series}']
        if colkey[0] == 'drawn' or drawn: head.append(r['label'] + (f', {LAYOUT_DE.get(r["layout"], r["layout"])}, Ø {r["diameterMm"]:g} mm' if r['layout'] != 'none' else ', ohne Löcher'))
        cols.append((head, items))
    # Scale so that the tallest column fits on one page (no sub-columns), never larger than requested
    # and not below the requested scale / 2.6 – beyond that a column continues in a sub-column.
    avail = PAGE_H - MARGIN - HEAD - 4
    scale = a.scale
    for _, items in cols:
        fixed = sum(LABEL_H + LINE_H * len(it['lines']) + GAP for it in items); plates = sum(it['h'] + 2 * (it['backing'] or 0) for it in items)
        if fixed + plates * scale > avail: scale = max(min(scale, (avail - 1 - fixed) / plates), a.scale / 2.6)
    intro = [f"# {f['name']}", f"Material: {f['material']['label']}, {f['material']['thicknessMm']} mm, Gravur {'von hinten' if f['material'].get('engravingSide') == 'back' else 'von vorn'}.",
             (f"Rückplatte: {f['backing']['label']}, rundum {backing} mm größer. " if backing else '') + f"Gestaltungsrand {f['designArea']['marginMm']} mm, Schutzzone {f['designArea']['keepoutMm']} mm.",
             f"{len(f['sizes'])} Größen in {len(f['groups'])} Formgruppen, {len(f['mountingRules'])} Bohrbilder, {len(entries)} Zeichnungen. Preise: {'offen' if all(s['baseCents'] is None for s in f['sizes']) else 'hinterlegt'}.",
             ('Aufbau wie die Zeichnung: eine Spalte je Form und Befestigung, Größen von oben nach unten aufsteigend; ergänzte Größen als eigene Spalte am Ende. ' if drawn else 'Eine Spalte je Form und Formatreihe (gleiches Seitenverhältnis = skalierbar), Größen von oben nach unten aufsteigend, je Größe alle Befestigungen. ') +
             'Platte rot umrandet, Rückplatte blau, Bohrlöcher als helle Kreise. Maßstab ' + f'1 : {1 / scale:.1f}'.replace('.', ',') + '. Unter jeder Platte: Größe · Form · Befestigung · Randabstand · SKU.']
    if f.get('source', {}).get('note'): intro.append('Hinweis: ' + f['source']['note'])
    pages = [text_page('Plattenkatalog', intro)] + layout_columns(cols, f['name'], scale, bool(drawn))
    doc = pymupdf.open()
    for svg in pages:
        pdf = cairosvg.svg2pdf(bytestring=svg.encode('utf-8')); doc.insert_pdf(pymupdf.open('pdf', pdf))
    doc.save(a.out); print(f'{len(pages)} Seiten, {len(cols)} Spalten, Maßstab 1:{1 / scale:.1f} → {a.out}')


if __name__ == '__main__':
    main()
