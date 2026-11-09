"""Ein vorhandenes Lieferform-2-Design auf eine andere Schiefer-Formatreihe umsetzen.

Chris 04.11.2026: „stelle sicher, dass wir für alle Größen alle Zielgruppen Designs haben“.
Quelle ist immer ein vorhandener Master (Text bleibt Text, Motiv/Foto unverzerrt, gleiche Schriften).
Ziel ist eine Formatreihe aus den vier Schieferfamilien: Rechteck, Oval/Rund oder Kontur (outlinePath der
Familie, z. B. Herz, Kreuz); Kordellöcher (holesMm) sind Sperrflächen. Die Gruppe wird gleichmäßig skaliert
(aelayout.plan_layout), bei Konturen um den Formmittelpunkt (polylabel) gesetzt und notfalls verkleinert, bis
alles mit Rand in der Form liegt. Fotofenster, Masken und data-upload-window werden mit umgerechnet.
"""
import copy, json, os, re, shutil
from lxml import etree
from shapely.geometry import Polygon, Point, box
from shapely.ops import polylabel
from aelib import read_design, q, fmt, path_abs, path_points
from aelayout import plan_layout
from svgedit import apply_tr
from build_helpers import grow_small_texts

KAT = None
CAPS = {'rect': (0.86, 0.78), 'ellipse': (0.80, 0.70), 'contour': (0.86, 0.80)}


def family(kat, fid):
    return json.load(open(os.path.join(kat, 'familien/schiefer', fid + '.json'), encoding='utf-8'))


def size_of(kat, fid, key):
    F = family(kat, fid)
    s = next(x for x in F['sizes'] if x['key'] == key)
    g = next(x for x in F['groups'] if x['key'] == s['groupKey'])
    return s, g


def outline_poly(size):
    d = size.get('outlinePath')
    if not d:
        return None
    pts = []
    for sub in path_points(path_abs(d), n=24):
        pts.extend(sub if isinstance(sub, list) else [sub])
    pts = [p for p in pts if isinstance(p, tuple) and len(p) == 2] or pts
    P = Polygon(pts)
    return P if P.is_valid else P.buffer(0)


def target_geometry(kat, fid, key, W, H, margin):
    """Form der Masterplatte W×H (aus der Familiengröße key, gleichmäßig auf W×H skaliert)."""
    s, g = size_of(kat, fid, key)
    k = W / s['widthMm']
    shape = 'rect'
    P = None
    gs = (g.get('shape') or '').lower()
    if gs in ('ellipse', 'circle', 'oval', 'round') or s['groupKey'] in ('R', 'EL'):
        shape = 'ellipse'
    poly = outline_poly(s)
    holes = s.get('holesMm') or []
    if shape == 'rect' and poly is not None and not holes:
        bx = poly.bounds
        if abs(poly.area - (bx[2] - bx[0]) * (bx[3] - bx[1])) > 0.01 * poly.area:
            shape = 'contour'
            P = poly
    if holes:
        shape = 'contour'
        P = (poly if poly is not None else box(0, 0, s['widthMm'], s['heightMm']))
        for h in holes:
            # Kordelloch: Lochrand + 4 mm frei
            P = P.difference(Point(h['x'], h['y']).buffer(h['diameterMm'] / 2 + 4))
    if P is not None:
        from shapely import affinity
        P = affinity.scale(P, k, k, origin=(0, 0))
        if P.geom_type == 'MultiPolygon':
            P = max(P.geoms, key=lambda x: x.area)
    return shape, P, holes, k, s


def center_of(shape, P, W, H, margin):
    if shape != 'contour':
        return None
    inner = P.buffer(-margin)
    c = polylabel(inner, tolerance=0.5)
    # nur leicht Richtung Formmitte ziehen: Rahmenmitte und Formmittelpunkt mischen
    return (0.5 * c.x + 0.5 * W / 2 if abs(c.x - W / 2) < 0.15 * W else c.x, 0.35 * H / 2 + 0.65 * c.y)


def outline_svg(shape, P, W, H, holes, k):
    if shape == 'ellipse':
        d = 'M0 %s A%s %s 0 1 0 %s %s A%s %s 0 1 0 0 %s Z' % (fmt(H / 2), fmt(W / 2), fmt(H / 2), fmt(W), fmt(H / 2), fmt(W / 2), fmt(H / 2), fmt(H / 2))
    elif shape == 'contour':
        ext = P.exterior if not holes else None
        if holes:
            d = 'M0 0H%sV%sH0Z' % (fmt(W), fmt(H))
        else:
            d = 'M' + 'L'.join('%s %s' % (fmt(x), fmt(y)) for x, y in ext.coords) + 'Z'
    else:
        d = 'M0 0H%sV%sH0Z' % (fmt(W), fmt(H))
    return d


def umsetzen(kat, fonts, src_dir, fid, master_key, W, H, out_dir, meta, edge=None, keys_largest_w=None, extra_cb=None, nur_rechteck=False, stapeln=False):
    """Quelle src_dir → out_dir (design.svg/.json + Fotodateien). meta: Felder für design.json."""
    src_svg = os.path.join(src_dir, 'design.svg')
    if stapeln:
        import tempfile
        from kompakt import kompakt
        tmp = tempfile.mktemp(suffix='.svg')
        shutil.copy2(src_svg, tmp)
        kompakt(tmp, fonts, einzeln=True)
        src_svg = tmp
    D = read_design(src_svg, fonts)
    margin = edge if edge is not None else max(1.5, 0.03 * min(W, H))
    shape, P, holes, k, s = target_geometry(kat, fid, master_key, W, H, margin)
    lay_shape, lay_P = ('rect', None) if nur_rechteck else (shape, P)
    caps = CAPS[lay_shape]
    center = None if nur_rechteck else center_of(shape, P, W, H, margin)
    fmax = (keys_largest_w or W) / W
    for _ in range(12):
        tr, m = plan_layout(D, W, H, lay_shape, caps, contour=lay_P, edge_margin=margin, center=center, gmax=2.4 if stapeln else 1.45)
        big = max([it.size * tr[it.id][1] for it in D['items'] if hasattr(it, 'font')] or [0]) * fmax
        if big <= 99:
            break
        caps = (caps[0] * 99 / big, caps[1] * 99 / big)
    tr = grow_small_texts(D, tr, W, H, lay_shape, lay_P, margin)
    # Baum der Quelle umschreiben (defs/Masken/Foto bleiben erhalten)
    apply_tr(D, tr, fonts)
    root = D['root']
    for n in list(root):
        if not isinstance(n.tag, str):
            continue
        if (n.get('id') or '') in ('kontur', 'aussenkontur', 'platte'):
            root.remove(n)
    for cp in root.iter(q('clipPath')):
        if cp.get('id') == 'clip-plattengrenze':
            for c in list(cp):
                cp.remove(c)
            etree.SubElement(cp, q('path'), {'d': outline_svg(shape, P, W, H, holes, k)})
    root.set('viewBox', '0 0 %s %s' % (fmt(W), fmt(H)))
    root.set('width', fmt(W) + 'mm')
    root.set('height', fmt(H) + 'mm')
    t = root.find(q('title'))
    if t is not None and meta.get('name'):
        t.text = '%s · %s × %s mm' % (meta['name'], fmt(W), fmt(H))
    g = etree.SubElement(root, q('g'), {'id': 'kontur', 'fill': 'none', 'stroke': '#0000ff', 'stroke-width': '0.2'})
    etree.SubElement(g, q('path'), {'id': 'aussenkontur', 'd': outline_svg(shape, P, W, H, holes, k)})
    for i, h in enumerate(holes, 1):
        etree.SubElement(g, q('circle'), {'id': 'bohrung-%d' % i, 'cx': fmt(h['x'] * k), 'cy': fmt(h['y'] * k), 'r': fmt(h['diameterMm'] / 2 * k)})
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(src_dir):
        if f not in ('design.svg', 'design.json') and os.path.isfile(os.path.join(src_dir, f)):
            shutil.copy2(os.path.join(src_dir, f), os.path.join(out_dir, f))
    D['tree'].write(os.path.join(out_dir, 'design.svg'), encoding='utf-8', xml_declaration=False)
    src = json.load(open(os.path.join(src_dir, 'design.json'), encoding='utf-8'))
    dj = copy.deepcopy(src)
    for kk in ('freigabe', 'review', 'nichtAngeboten', 'emptyPhotoSlots'):
        dj.pop(kk, None)
    dj.update(meta)
    dj['plateMm'] = [W, H]
    dj['umsetzung'] = {'von': src.get('id'), 'reihe': (src.get('katalog') or {}).get('series'), 'scale': round(m['scale'], 4),
                       'flaeche': {kk: round(m[kk], 3) for kk in ('fw', 'fh', 'grow')},
                       'by': 'Claude Schiefer 04.11.2026 (Chris: „für alle Größen alle Zielgruppen“), gravuru-2027 scripts/schiefer-designs/umsetzen.py'}
    with open(os.path.join(out_dir, 'design.json'), 'w', encoding='utf-8') as f:
        json.dump(dj, f, ensure_ascii=False, indent=2)
        f.write('\n')
    return m
