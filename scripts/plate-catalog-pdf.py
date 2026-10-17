"""Plattenkatalog als PDF aus einer Produktfamilie – zum Gegenprüfen und Abstimmen.

Zeichnet je Größe und Befestigung eine Platte wie in der Corel-Vorlage: Rückplatte
(blau), Platte (rot), Bohrlöcher; dazu Bezeichnung, SKU, Randabstand, Formatklasse.
Optional eine Seite „Vorschläge“ aus einer JSON-Datei mit Text und Zusatzplatten.

    python scripts/plate-catalog-pdf.py familie.json --out katalog.pdf [--proposals vorschlaege.json] [--scale 0.5]
Nur Lesen und Zeichnen; keine Werkstatt, kein Shop.
"""
import argparse, json, math, io
from pathlib import Path
import cairosvg, pymupdf

PAGE_W, PAGE_H, MARGIN = 420, 297, 12  # A3 quer in mm
LAYOUT_DE = {'left-right': 'seitlich mittig', 'top-bottom': 'oben/unten', 'corners': 'in den Ecken', 'top-center': 'oben mittig', 'none': 'ohne Löcher'}


def holes_for(w, h, rule):
    e, d = rule['edgeMm'], rule['diameterMm']
    pts = {'left-right': [(e, h / 2), (w - e, h / 2)], 'top-bottom': [(w / 2, e), (w / 2, h - e)], 'corners': [(e, e), (w - e, e), (e, h - e), (w - e, h - e)], 'top-center': [(w / 2, e)]}.get(rule['layout'], [])
    return [(x, y, d) for x, y in pts]


def ratio(w, h):
    g = math.gcd(int(round(w)), int(round(h))); a, b = int(round(w)) // g, int(round(h)) // g
    return f'{a}:{b}' if a <= 20 and b <= 20 else f'{w / h:.2f}:1'


def esc(t): return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def plate_svg(x, y, w, h, shape, radius, holes, backing, scale, label, lines, dashed=False):
    s = scale; out = []
    if backing:
        b = backing * s; bw, bh = w * s + 2 * b, h * s + 2 * b
        if shape == 'ellipse': out.append(f'<ellipse cx="{x + w * s / 2}" cy="{y + h * s / 2}" rx="{bw / 2}" ry="{bh / 2}" fill="#1c1c1c" stroke="#06c" stroke-width="0.35"/>')
        else: out.append(f'<rect x="{x - b}" y="{y - b}" width="{bw}" height="{bh}" rx="{(radius + backing) * s if radius else 0}" fill="#1c1c1c" stroke="#06c" stroke-width="0.35"/>')
    dash = ' stroke-dasharray="2 1.2"' if dashed else ''
    if shape == 'ellipse': out.append(f'<ellipse cx="{x + w * s / 2}" cy="{y + h * s / 2}" rx="{w * s / 2}" ry="{h * s / 2}" fill="#4a4d50" stroke="#d22" stroke-width="0.35"{dash}/>')
    else: out.append(f'<rect x="{x}" y="{y}" width="{w * s}" height="{h * s}" rx="{radius * s}" fill="#4a4d50" stroke="#d22" stroke-width="0.35"{dash}/>')
    for hx, hy, d in holes:
        out.append(f'<circle cx="{x + hx * s}" cy="{y + hy * s}" r="{d / 2 * s}" fill="#f2efe8" stroke="#d22" stroke-width="0.3"/>')
    ty = y + h * s + (backing or 0) * s + 4
    out.append(f'<text x="{x}" y="{ty}" font-family="Helvetica, Arial, sans-serif" font-size="3.2" font-weight="bold" fill="#222">{esc(label)}</text>')
    for i, l in enumerate(lines):
        out.append(f'<text x="{x}" y="{ty + 3.6 * (i + 1)}" font-family="Helvetica, Arial, sans-serif" font-size="2.7" fill="#444">{esc(l)}</text>')
    return '\n'.join(out)


def page_svg(title, subtitle, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W}mm" height="{PAGE_H}mm" viewBox="0 0 {PAGE_W} {PAGE_H}"><rect width="{PAGE_W}" height="{PAGE_H}" fill="#f2efe8"/>'
            f'<text x="{MARGIN}" y="{MARGIN + 4}" font-family="Helvetica, Arial, sans-serif" font-size="6" font-weight="bold" fill="#1d3b33">{esc(title)}</text>'
            f'<text x="{MARGIN}" y="{MARGIN + 10}" font-family="Helvetica, Arial, sans-serif" font-size="3.2" fill="#555">{esc(subtitle)}</text>{body}</svg>')


def flow(items, title, subtitle, scale):
    """items: list of dict(w,h,shape,radius,holes,backing,label,lines,dashed). Returns list of page svgs."""
    pages, body, x, y, row_h = [], [], MARGIN, MARGIN + 18, 0
    gap = 8
    for it in items:
        b = it.get('backing') or 0
        text_w = max([len(it['label']) * 1.75] + [len(l) * 1.45 for l in it['lines']])
        cw = max((it['w'] + 2 * b) * scale, text_w) + gap; ch = (it['h'] + 2 * b) * scale + 4 + 3.6 * (len(it['lines']) + 1) + gap
        if x + cw > PAGE_W - MARGIN: x, y, row_h = MARGIN, y + row_h, 0
        if y + ch > PAGE_H - MARGIN:
            pages.append(page_svg(title, subtitle, '\n'.join(body))); body, x, y, row_h = [], MARGIN, MARGIN + 18, 0
        body.append(plate_svg(x + b * scale, y + b * scale, it['w'], it['h'], it['shape'], it['radius'], it['holes'], b, scale, it['label'], it['lines'], it.get('dashed', False)))
        x += cw; row_h = max(row_h, ch)
    if body: pages.append(page_svg(title, subtitle, '\n'.join(body)))
    return pages


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


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('family'); ap.add_argument('--out', required=True); ap.add_argument('--proposals'); ap.add_argument('--scale', type=float, default=0.45)
    a = ap.parse_args()
    f = json.loads(Path(a.family).read_text(encoding='utf-8'))
    groups = {g['key']: g for g in f['groups']}; rules = {r['id']: r for r in f['mountingRules']}
    backing = f.get('backing', {}).get('offsetMm')
    pages = []
    intro = [f"# {f['name']}", f"Material: {f['material']['label']}, {f['material']['thicknessMm']} mm, Gravur {'von hinten' if f['material'].get('engravingSide') == 'back' else 'von vorn'}.",
             (f"Rückplatte: {f['backing']['label']}, rundum {backing} mm größer. " if backing else '') + f"Gestaltungsrand {f['designArea']['marginMm']} mm, Schutzzone {f['designArea']['keepoutMm']} mm.",
             f"{len(f['sizes'])} Größen in {len(f['groups'])} Formgruppen, {len(f['mountingRules'])} Bohrbilder. Preise: {'offen' if all(s['baseCents'] is None for s in f['sizes']) else 'hinterlegt'}.",
             'Lesen: Platte rot umrandet, Rückplatte blau, Bohrlöcher als helle Kreise. Maßstab ' + f'1 : {1 / a.scale:g}' + '. Unter jeder Platte: Größe · Form · Befestigung · Randabstand · SKU · Formatklasse (gleiche Klasse = gleiche Designs).']
    if f.get('source', {}).get('note'): intro.append('Hinweis: ' + f['source']['note'])
    pages.append(text_page('Plattenkatalog', intro))
    # Pages per format class (same aspect ratio = scalable series), sizes ascending, forms side by side.
    # Same series = aspect ratio within ±1 % (e.g. 70 × 23,3 belongs to 3:1).
    classes = []
    for s in sorted(f['sizes'], key=lambda s: -s['widthMm'] / s['heightMm']):
        r = s['widthMm'] / s['heightMm']
        if classes and abs(r - classes[-1][0]) / classes[-1][0] <= .01: classes[-1][1].append(s)
        else: classes.append([r, [s]])
    gorder = [g['key'] for g in f['groups']]
    for _, members in classes:
        members = sorted(members, key=lambda s: (s['widthMm'], gorder.index(s['groupKey'])))
        lead = min(members, key=lambda s: sum(int(v) for v in ratio(s['widthMm'], s['heightMm']).replace('.', '').split(':')) if ':' in ratio(s['widthMm'], s['heightMm']) else 999)
        items = []
        for s in members:
            g = groups[s['groupKey']]; radius = s.get('cornerRadiusMm', g['cornerRadiusMm'])
            for rid in s['mounting']:
                r = rules[rid]; holes = [] if r['layout'] == 'none' else holes_for(s['widthMm'], s['heightMm'], r)
                items.append({'w': s['widthMm'], 'h': s['heightMm'], 'shape': g['shape'], 'radius': radius, 'holes': holes, 'backing': backing,
                              'label': f"{s['label']} · {g['name']}" + (f' R{radius:g}' if radius and not g['cornerRadiusMm'] else ''),
                              'lines': [r['label'] + (f", {LAYOUT_DE.get(r['layout'], r['layout'])}, Ø {r['diameterMm']:g} mm, Rand {r['edgeMm']:g} mm" if r['layout'] != 'none' else ', ohne Löcher') + (f" · +{r['priceCents'] / 100:.2f} €".replace('.', ',') if r['priceCents'] else ''), f"{s['key']}-{r['skuSuffix']}"]})
        sizes_txt = ', '.join(dict.fromkeys(m['label'] for m in members))
        pages += flow(items, f"Format {ratio(lead['widthMm'], lead['heightMm'])} · {f['name']}", f'skalierbare Reihe: {sizes_txt} · {len(items)} Zeichnungen · Maßstab 1 : {1 / a.scale:.1f}'.replace('.', ','), a.scale)
    if a.proposals:
        pr = json.loads(Path(a.proposals).read_text(encoding='utf-8'))
        pages.append(text_page('Vorschläge', pr['text']))
        items = []
        for p in pr.get('plates', []):
            r = {'layout': p['layout'], 'edgeMm': p['edgeMm'], 'diameterMm': p.get('diameterMm', 8)}
            items.append({'w': p['widthMm'], 'h': p['heightMm'], 'shape': p.get('shape', 'rect'), 'radius': p.get('cornerRadiusMm', 0), 'holes': holes_for(p['widthMm'], p['heightMm'], r), 'backing': backing, 'dashed': True,
                          'label': 'VORSCHLAG · ' + p['label'], 'lines': p.get('lines', [])})
        if items: pages += flow(items, 'Vorschläge · zusätzliche Platten (gestrichelt)', 'noch nicht in den Stammdaten', a.scale)
    doc = pymupdf.open()
    for svg in pages:
        pdf = cairosvg.svg2pdf(bytestring=svg.encode('utf-8')); doc.insert_pdf(pymupdf.open('pdf', pdf))
    doc.save(a.out); print(f'{len(pages)} Seiten → {a.out}')


if __name__ == '__main__':
    main()
