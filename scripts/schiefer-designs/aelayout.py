"""Neu proportionieren eines Edelstahl-Designs auf die AE-Acrylplatte und Lieferform 2 schreiben.

Vorgehen je Design (Design-Master §3/§4, §7 02.11.2026 „keine großen Freiflächen, Gestaltung mittig“):
1. Alle Ebenen bilden die Gruppe; durchgehende dünne Linien (bis an den Rand) werden nur in ihrer Länge
   auf die neue Plattenbreite gezogen, nie verzerrt sonst.
2. Einheitlicher Maßstab s für alle Elemente (Motiv nie verzerrt): so groß, dass die Gruppe die Fläche bis zu
   den Füllgrenzen nutzt (Breite/Höhe), höchstens G_MAX × der reinen Seitenverhältnis-Umrechnung.
3. Ist die Platte relativ breiter als das Original, rücken Elemente nebeneinander (Ankerpunkte: Textausrichtung
   bzw. Motivmitte) proportional auseinander – nur so weit, wie die Breitengrenze erlaubt. Kein neues Überlappen.
4. Gruppe mittig (Hüllrechteck der Gravur), dann Form prüfen (Oval, Retro-Kontur) und notfalls verkleinern.
"""
import copy, json, math
from lxml import etree
from aelib import q, fmt, union, path_transform, shape_to_path, path_abs, path_points, SVG

G_MAX = 1.45
FH_TARGET = 0.48
KV_MAX = 1.3


def anchor_x(it):
    if it.kind in ('text', 'guide') and hasattr(it, 'font'):
        if it.rot:
            return it.pivot[0]
        return it.x
    return (it.bbox[0] + it.bbox[2]) / 2


def classify_spans(D):
    W, H = D['W'], D['H']
    for it in D['items']:
        b = it.bbox
        it.span = None
        if it.kind not in ('text', 'guide') and b[0] <= 0.012 * W and b[2] >= 0.988 * W and (b[3] - b[1]) <= 0.05 * H:
            it.span = 'h'
        elif it.kind not in ('text', 'guide') and b[1] <= 0.012 * H and b[3] >= 0.988 * H and (b[2] - b[0]) <= 0.05 * W:
            it.span = 'v'


def transformed_points(it, tr):
    sx, sy, tx, ty = tr
    return [(x * sx + tx, y * sy + ty) for x, y in it.points]


def inside_ellipse(pts, Wt, Ht, margin):
    a, b = Wt / 2 - margin, Ht / 2 - margin
    return all(((x - Wt / 2) / a) ** 2 + ((y - Ht / 2) / b) ** 2 <= 1.0 for x, y in pts)


def inside_polygon(pts, poly, margin):
    from shapely.geometry import Polygon, Point
    P = poly if margin <= 0 else poly.buffer(-margin)
    return all(P.contains(Point(x, y)) for x, y in pts)


def plan_layout(D, Wt, Ht, shape, caps, contour=None, edge_margin=None, gmax=G_MAX, center=None):
    """Liefert {item_id: (sx, sy, tx, ty)} und Messwerte."""
    W, H = D['W'], D['H']
    classify_spans(D)
    items = D['items']
    grp = [it for it in items if not it.span]
    hsp = [it for it in items if it.span == 'h']
    vsp = [it for it in items if it.span == 'v']
    boxes = [it.bbox for it in grp] + [(W / 2, it.bbox[1], W / 2, it.bbox[3]) for it in hsp] + \
            [(it.bbox[0], H / 2, it.bbox[2], H / 2) for it in vsp]
    B = union(boxes)
    Bw, Bh = max(B[2] - B[0], 1e-6), max(B[3] - B[1], 1e-6)
    gcx, gcy = (B[0] + B[2]) / 2, (B[1] + B[3]) / 2
    capW, capH = caps
    s0 = min(Wt / W, Ht / H)
    s_fit = min(capW * Wt / Bw, capH * Ht / Bh)
    s = min(s_fit, s0 * gmax)
    rs, rt = W / H, Wt / Ht
    k_prop = s * max(1.0, rt / rs)
    if shape == 'ellipse':
        k_prop = min(k_prop, s * 1.15)  # im Oval nicht in die Spitzen auseinanderziehen

    def place(scale, k, kv=None):
        kv = scale if kv is None else kv
        tr = {}

        def vty(it):
            cy = (it.bbox[1] + it.bbox[3]) / 2
            return Ht / 2 + (cy - gcy) * kv - scale * cy
        for it in grp:
            ax = anchor_x(it)
            nax = Wt / 2 + (ax - gcx) * k
            tr[it.id] = (scale, scale, nax - scale * ax, vty(it))
        for it in hsp:
            # Linie bis an den Rand: Länge auf neue Breite, Lage/Stärke mit dem Gruppenmaßstab
            x0, x1 = it.bbox[0], it.bbox[2]
            sx = (Wt - (x0 / W * Wt) - ((W - x1) / W * Wt)) / max(x1 - x0, 1e-6)
            tr[it.id] = (sx, scale, x0 / W * Wt - sx * x0, vty(it))
        for it in vsp:
            y0, y1 = it.bbox[1], it.bbox[3]
            sy = (Ht - (y0 / H * Ht) - ((H - y1) / H * Ht)) / max(y1 - y0, 1e-6)
            ax = (it.bbox[0] + it.bbox[2]) / 2
            nax = Wt / 2 + (ax - gcx) * k
            tr[it.id] = (scale, sy, nax - scale * ax, y0 / H * Ht - sy * y0)
        # Gruppe mittig: Hüllrechteck der Gravur (ohne Randlinien in ihrer Länge)
        bb = []
        for it in grp:
            sx, sy, tx, ty = tr[it.id]
            b = it.bbox
            bb.append((b[0] * sx + tx, b[1] * sy + ty, b[2] * sx + tx, b[3] * sy + ty))
        for it in hsp:
            sx, sy, tx, ty = tr[it.id]
            bb.append((Wt / 2, it.bbox[1] * sy + ty, Wt / 2, it.bbox[3] * sy + ty))
        for it in vsp:
            sx, sy, tx, ty = tr[it.id]
            bb.append((it.bbox[0] * sx + tx, Ht / 2, it.bbox[2] * sx + tx, Ht / 2))
        G = union(bb)
        ccx, ccy = center if center else (Wt / 2, Ht / 2)
        dx, dy = ccx - (G[0] + G[2]) / 2, ccy - (G[1] + G[3]) / 2
        for it in grp + vsp:
            sx, sy, tx, ty = tr[it.id]
            tr[it.id] = (sx, sy, tx + dx, ty + (dy if it.span != 'v' else 0))
        for it in hsp:
            sx, sy, tx, ty = tr[it.id]
            tr[it.id] = (sx, sy, tx, ty + dy)
        G = (G[0] + dx, G[1] + dy, G[2] + dx, G[3] + dy)
        if shape != 'rect' and hsp:
            # Randlinien bei Oval/Kontur: nur bis zur Form (mit Abstand) ziehen
            m = (edge_margin or 0) + 0.3
            for it in hsp:
                sx, sy, tx, ty = tr[it.id]
                y0, y1 = it.bbox[1] * sy + ty, it.bbox[3] * sy + ty
                if shape == 'ellipse':
                    a, b = Wt / 2 - m, Ht / 2 - m
                    dyv = max(abs(y0 - Ht / 2), abs(y1 - Ht / 2))
                    half = a * math.sqrt(max(0.0, 1 - (dyv / b) ** 2)) if dyv < b else 0.0
                    lx, rx = Wt / 2 - half, Wt / 2 + half
                else:
                    from shapely.geometry import box as _box
                    band = contour.buffer(-m).intersection(_box(0, y0, Wt, y1))
                    if band.is_empty:
                        continue
                    lx, rx = band.bounds[0], band.bounds[2]
                    # schmalste Stelle im Band (Kontur-Ecken)
                    xs = []
                    for yy in (y0, (y0 + y1) / 2, y1):
                        seg = contour.buffer(-m).intersection(_box(0, yy - 1e-3, Wt, yy + 1e-3))
                        if not seg.is_empty:
                            xs.append(seg.bounds)
                    if xs:
                        lx, rx = max(b[0] for b in xs), min(b[2] for b in xs)
                x0, x1 = it.bbox[0], it.bbox[2]
                nsx = (rx - lx) / max(x1 - x0, 1e-6)
                tr[it.id] = (nsx, sy, lx - nsx * x0, ty)
        return tr, G

    def ok(tr):
        # Konfi-Prüfung: Textkasten (Laufweite × 1,2 Schriftgröße) muss bei eckigen Platten ganz auf der Platte liegen
        for it in items:
            kb = getattr(it, 'kbox', None)
            if kb is not None and shape == 'rect' and getattr(it, 'span', None) is None:
                sx, sy, tx, ty = tr[it.id]
                if kb[0] * sx + tx < -1e-3 or kb[2] * sx + tx > Wt + 1e-3 or kb[1] * sy + ty < -1e-3 or kb[3] * sy + ty > Ht + 1e-3:
                    return False
        if shape == 'rect' and edge_margin is None:
            return True
        m = edge_margin or 0
        for it in items:
            pts = transformed_points(it, tr[it.id])
            if it.span == 'h':
                pts = [(min(max(x, m + 0.01), Wt - m - 0.01), y) for x, y in pts]
            if shape == 'ellipse':
                if not inside_ellipse(pts, Wt, Ht, m):
                    return False
            elif shape == 'contour':
                if not inside_polygon(pts, contour, m):
                    return False
            else:
                if any(x < m or x > Wt - m or y < m or y > Ht - m for x, y in pts):
                    return False
        return True

    # Breite füllen: größtes k zwischen s und k_prop, bei dem die Gruppe die Breitengrenze hält
    lo, hi = s, k_prop
    tr, G = place(s, lo)
    if (G[2] - G[0]) > capW * Wt + 1e-6:
        k = s
    else:
        for _ in range(30):
            mid = (lo + hi) / 2
            t2, G2 = place(s, mid)
            if (G2[2] - G2[0]) <= capW * Wt + 1e-6:
                lo = mid
            else:
                hi = mid
        k = lo
    # Höhe füllen (Querformat, §7 02.11.: Gruppe ≥ ca. 45 % der Höhe): Abstände übereinander maßvoll strecken
    kv = s
    t1, G1 = place(s, k, s)
    fh0 = (G1[3] - G1[1]) / Ht
    if Wt > 1.15 * Ht and fh0 < FH_TARGET:
        lo, hi = s, s * KV_MAX
        for _ in range(30):
            mid = (lo + hi) / 2
            t2, G2 = place(s, k, mid)
            if (G2[3] - G2[1]) / Ht <= min(FH_TARGET, capH) + 1e-6:
                lo = mid
            else:
                hi = mid
        kv = lo
    shrink = 1.0
    for _ in range(60):
        tr, G = place(s * shrink, k * shrink, kv * shrink)
        if ok(tr):
            break
        shrink *= 0.98
    else:
        raise ValueError('Design passt nicht in die Form')
    metrics = {
        'scale': s * shrink, 's0': s0, 'grow': s * shrink / s0, 'spread': k / s, 'vspread': kv / s,
        'fw': (G[2] - G[0]) / Wt, 'fh': (G[3] - G[1]) / Ht,
        'cx': ((G[0] + G[2]) / 2 - Wt / 2) / Wt, 'cy': ((G[1] + G[3]) / 2 - Ht / 2) / Ht,
        'shrink': shrink,
    }
    metrics['fa'] = metrics['fw'] * metrics['fh']
    return tr, metrics


def _set_num(el, attr, fn):
    v = el.get(attr)
    if v is not None and v.strip() != '':
        el.set(attr, fmt(fn(float(v))))


def write_svg(D, tr, Wt, Ht, plate_kind, contour_path=None):
    root = D['root']
    out = etree.Element(q('svg'), nsmap={None: SVG, 'xlink': 'http://www.w3.org/1999/xlink'})
    out.set('viewBox', '0 0 %s %s' % (fmt(Wt), fmt(Ht)))
    out.set('width', fmt(Wt) + 'mm')
    out.set('height', fmt(Ht) + 'mm')
    out.text = '\n'
    if plate_kind == 'ellipse':
        p = etree.SubElement(out, q('ellipse'), {'id': 'platte', 'cx': fmt(Wt / 2), 'cy': fmt(Ht / 2), 'rx': fmt(Wt / 2), 'ry': fmt(Ht / 2), 'fill': 'none', 'stroke': '#999', 'stroke-width': '0.2'})
    elif plate_kind == 'contour':
        p = etree.SubElement(out, q('path'), {'id': 'platte', 'd': contour_path, 'fill': 'none', 'stroke': '#999', 'stroke-width': '0.2'})
    else:
        p = etree.SubElement(out, q('rect'), {'id': 'platte', 'width': fmt(Wt), 'height': fmt(Ht), 'fill': 'none', 'stroke': '#999', 'stroke-width': '0.2'})
    p.tail = '\n'
    byid = {it.id: it for it in D['items']}
    for node in root:
        if not isinstance(node.tag, str):
            continue
        lid = node.get('id') or ''
        if lid not in byid:
            continue
        it = byid[lid]
        sx, sy, tx, ty = tr[lid]
        n = copy.deepcopy(node)
        n.tail = '\n'
        if it.kind in ('text', 'guide') and hasattr(it, 'font'):
            # Gruppentranslation in den Text übernehmen; Drehung um den Konfi-Drehpunkt neu schreiben
            for k in ('transform',):
                if k in n.attrib:
                    del n.attrib[k]
            el = n if etree.QName(n).localname == 'text' else n.find('.//' + q('text'))
            if el is not None and 'transform' in el.attrib:
                del el.attrib['transform']
            # neue Ankerposition direkt aus it.x/it.y (enthält alle Translationen)
            nx, ny = it.x * sx + tx, it.y * sy + ty
            tsp = el.findall(q('tspan'))
            first_dy = float(tsp[0].get('dy', 0) or 0) if tsp else 0.0
            el.set('x', fmt(nx))
            el.set('y', fmt(ny - first_dy * sy))
            el.set('font-size', fmt(it.size * sy))
            if el.get('letter-spacing'):
                el.set('letter-spacing', fmt(float(el.get('letter-spacing')) * sy))
            for ts in tsp:
                ts.set('x', fmt(nx))
                if ts.get('dy') not in (None, ''):
                    ts.set('dy', fmt(float(ts.get('dy')) * sy))
            if it.rot:
                px, py = it.pivot[0] * sx + tx, it.pivot[1] * sy + ty
                n.set('transform', 'rotate(%s %s %s)' % (fmt(it.rot), fmt(px), fmt(py)))
        else:
            dx0, dy0 = it.translate
            if 'transform' in n.attrib:
                del n.attrib['transform']
            if n.get('stroke-width'):
                n.set('stroke-width', fmt(float(n.get('stroke-width')) * min(sx, sy)))
            shapes = [n] if etree.QName(n).localname != 'g' else [e for e in n.iter() if isinstance(e.tag, str) and etree.QName(e).localname in ('path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline')]
            for e in shapes:
                d = shape_to_path(e)
                if not d:
                    continue
                nd = path_transform(d, sx, sy, dx0 * sx + tx, dy0 * sy + ty)
                tag = etree.QName(e).localname
                if tag != 'path':
                    for a in ('x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points'):
                        if a in e.attrib:
                            del e.attrib[a]
                    e.tag = q('path')
                e.set('d', nd)
                if e.get('stroke-width'):
                    e.set('stroke-width', fmt(float(e.get('stroke-width')) * min(sx, sy)))
        out.append(n)
    return etree.tostring(out, encoding='unicode')
