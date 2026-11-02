"""Hilfsfunktionen für die AE-Türschilder: Lieferform-2-SVG lesen, Tintengrenzen (Schrift über fontTools,
Pfade über Abtastung) bestimmen, Ebenen skalieren/verschieben und wieder schreiben.

Text wird wie im Konfigurator gesetzt: Laufweiten aus hmtx, kein Kerning, Zeichenabstand (n-1) × letter-spacing.
Nur translate/rotate in Lieferform 2 – Pfade werden deshalb direkt umgerechnet.
"""
import json, math, os, re
from lxml import etree
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

SVG = 'http://www.w3.org/2000/svg'
LAYER = re.compile(r'^(text|motiv|deko|foto|guide)-([A-Za-z0-9_.-]+)$')


def q(tag):
    return '{%s}%s' % (SVG, tag)


def fmt(v):
    s = ('%.3f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


# ---------------------------------------------------------------- Schriften
class Fonts:
    def __init__(self, katalog):
        meta = json.load(open(os.path.join(katalog, 'schriften/schriften.json'), encoding='utf-8'))['fonts']
        self.files = {f['name']: os.path.join(katalog, f['file']) for f in meta if f.get('file')}
        self.faces = {}

    def face(self, name):
        if name not in self.faces:
            if name not in self.files or not os.path.exists(self.files[name]):
                raise KeyError('Schrift fehlt: ' + name)
            tt = TTFont(self.files[name], lazy=True)
            self.faces[name] = {'upem': tt['head'].unitsPerEm, 'cmap': tt.getBestCmap(), 'gs': tt.getGlyphSet(),
                                'hmtx': tt['hmtx'], 'cache': {}}
        return self.faces[name]

    def glyph(self, name, ch):
        f = self.face(name)
        if ch in f['cache']:
            return f['cache'][ch]
        g = f['cmap'].get(ord(ch))
        if g is None:
            u = f['upem']
            res = (u * .6, (u * .05, 0, u * .55, u * .7))
        else:
            bp = BoundsPen(f['gs'])
            f['gs'][g].draw(bp)
            res = (f['hmtx'][g][0], bp.bounds)
        f['cache'][ch] = res
        return res

    def has(self, name, ch):
        return ord(ch) in self.face(name)['cmap']


def text_ink(fonts, font, size, lines, x, y, line_h, anchor, ls):
    """Tintengrenzen eines (mehrzeiligen) Texts ohne Drehung; y = Grundlinie Zeile 1."""
    f = fonts.face(font)
    sc = size / f['upem']
    xs, ys, adv_max = [], [], 0
    for i, line in enumerate(lines):
        chars = list(line)
        adv = sum(fonts.glyph(font, c)[0] for c in chars) * sc + max(0, len(chars) - 1) * ls
        adv_max = max(adv_max, adv)
        start = x if anchor == 'start' else x - adv / 2 if anchor == 'middle' else x - adv
        cx, base = start, y + i * line_h
        for c in chars:
            a, b = fonts.glyph(font, c)
            if b:
                xs += [cx + b[0] * sc, cx + b[2] * sc]
                ys += [base - b[3] * sc, base - b[1] * sc]
            cx += a * sc + ls
    if not xs:
        return None, adv_max
    return (min(xs), min(ys), max(xs), max(ys)), adv_max


def glyph_points(fonts, it, px, py):
    """Eckpunkte je Glyphe (für Kontur-/Ovalprüfung), gedreht um den Konfi-Drehpunkt."""
    f = fonts.face(it.font)
    sc = it.size / f['upem']
    pts = []
    for i, line in enumerate(it.lines):
        chars = list(line)
        adv = sum(fonts.glyph(it.font, c)[0] for c in chars) * sc + max(0, len(chars) - 1) * it.ls
        start = it.x if it.anchor == 'start' else it.x - adv / 2 if it.anchor == 'middle' else it.x - adv
        cx, base = start, it.y + i * it.line_h
        for c in chars:
            a, b = fonts.glyph(it.font, c)
            if b:
                pts += [(cx + b[0] * sc, base - b[3] * sc), (cx + b[2] * sc, base - b[3] * sc),
                        (cx + b[2] * sc, base - b[1] * sc), (cx + b[0] * sc, base - b[1] * sc)]
            cx += a * sc + it.ls
    if it.rot:
        r = math.radians(it.rot)
        c, s = math.cos(r), math.sin(r)
        pts = [(px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c) for x, y in pts]
    return pts


def rot_bbox(b, deg, px, py):
    if not deg:
        return b
    r = math.radians(deg)
    c, s = math.cos(r), math.sin(r)
    pts = [(b[0], b[1]), (b[2], b[1]), (b[2], b[3]), (b[0], b[3])]
    out = [(px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c) for x, y in pts]
    return (min(p[0] for p in out), min(p[1] for p in out), max(p[0] for p in out), max(p[1] for p in out))


# ---------------------------------------------------------------- Pfade
NUM = r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?'
TOK = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|' + NUM)
ARITY = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'T': 2, 'A': 7, 'Z': 0}


def path_abs(d):
    """Pfad → Liste absoluter Segmente (cmd, args) mit M, L, C, Q, A, Z."""
    toks = TOK.findall(d)
    i, cmd, out = 0, None, []
    x = y = sx = sy = 0.0
    lc = None  # letzter Kontrollpunkt für S/T
    lt = None
    while i < len(toks):
        if re.match(r'[A-Za-z]', toks[i]):
            cmd = toks[i]
            i += 1
            if cmd in 'Zz':
                out.append(('Z', []))
                x, y = sx, sy
                lc = lt = None
                continue
        if cmd is None:
            raise ValueError('Pfad ohne Befehl')
        n = ARITY[cmd.upper()]
        a = [float(t) for t in toks[i:i + n]]
        if len(a) < n:
            raise ValueError('Pfad unvollständig')
        i += n
        rel = cmd.islower()
        C = cmd.upper()
        if C == 'M':
            nx, ny = (x + a[0], y + a[1]) if rel else (a[0], a[1])
            out.append(('M', [nx, ny]))
            x, y = sx, sy = nx, ny
            cmd = 'l' if rel else 'L'
            lc = lt = None
        elif C == 'L':
            nx, ny = (x + a[0], y + a[1]) if rel else (a[0], a[1])
            out.append(('L', [nx, ny]))
            x, y = nx, ny
            lc = lt = None
        elif C == 'H':
            nx = x + a[0] if rel else a[0]
            out.append(('L', [nx, y]))
            x = nx
            lc = lt = None
        elif C == 'V':
            ny = y + a[0] if rel else a[0]
            out.append(('L', [x, ny]))
            y = ny
            lc = lt = None
        elif C == 'C':
            p = [a[k] + (x if k % 2 == 0 else y) if rel else a[k] for k in range(6)]
            out.append(('C', p))
            lc = (p[2], p[3])
            x, y = p[4], p[5]
            lt = None
        elif C == 'S':
            p = [a[k] + (x if k % 2 == 0 else y) if rel else a[k] for k in range(4)]
            c1 = (2 * x - lc[0], 2 * y - lc[1]) if lc else (x, y)
            out.append(('C', [c1[0], c1[1]] + p))
            lc = (p[0], p[1])
            x, y = p[2], p[3]
            lt = None
        elif C == 'Q':
            p = [a[k] + (x if k % 2 == 0 else y) if rel else a[k] for k in range(4)]
            out.append(('Q', p))
            lt = (p[0], p[1])
            x, y = p[2], p[3]
            lc = None
        elif C == 'T':
            p = [a[k] + (x if k % 2 == 0 else y) if rel else a[k] for k in range(2)]
            c1 = (2 * x - lt[0], 2 * y - lt[1]) if lt else (x, y)
            out.append(('Q', [c1[0], c1[1]] + p))
            lt = c1
            x, y = p[0], p[1]
            lc = None
        elif C == 'A':
            nx, ny = (x + a[5], y + a[6]) if rel else (a[5], a[6])
            out.append(('A', [a[0], a[1], a[2], a[3], a[4], nx, ny, x, y]))
            x, y = nx, ny
            lc = lt = None
    return out


def _arc_points(x1, y1, rx, ry, phi, fa, fs, x2, y2, n=16):
    if rx == 0 or ry == 0:
        return [(x2, y2)]
    p = math.radians(phi)
    cp, sp = math.cos(p), math.sin(p)
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    x1p, y1p = cp * dx + sp * dy, -sp * dx + cp * dy
    rx, ry = abs(rx), abs(ry)
    lam = x1p ** 2 / rx ** 2 + y1p ** 2 / ry ** 2
    if lam > 1:
        rx, ry = rx * math.sqrt(lam), ry * math.sqrt(lam)
    num = rx ** 2 * ry ** 2 - rx ** 2 * y1p ** 2 - ry ** 2 * x1p ** 2
    den = rx ** 2 * y1p ** 2 + ry ** 2 * x1p ** 2
    co = math.sqrt(max(0, num / den)) if den else 0
    if fa == fs:
        co = -co
    cxp, cyp = co * rx * y1p / ry, -co * ry * x1p / rx
    cx = cp * cxp - sp * cyp + (x1 + x2) / 2
    cy = sp * cxp + cp * cyp + (y1 + y2) / 2

    def ang(ux, uy, vx, vy):
        a = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        return a
    t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not fs and dt > 0:
        dt -= 2 * math.pi
    elif fs and dt < 0:
        dt += 2 * math.pi
    pts = []
    for k in range(1, n + 1):
        t = t1 + dt * k / n
        pts.append((cx + rx * math.cos(t) * cp - ry * math.sin(t) * sp, cy + rx * math.cos(t) * sp + ry * math.sin(t) * cp))
    return pts


def path_points(segs, n=12):
    pts = []
    x = y = 0
    for c, a in segs:
        if c in ('M', 'L'):
            x, y = a
            pts.append((x, y))
        elif c == 'C':
            for k in range(1, n + 1):
                t = k / n
                mt = 1 - t
                pts.append((mt ** 3 * x + 3 * mt * mt * t * a[0] + 3 * mt * t * t * a[2] + t ** 3 * a[4],
                            mt ** 3 * y + 3 * mt * mt * t * a[1] + 3 * mt * t * t * a[3] + t ** 3 * a[5]))
            x, y = a[4], a[5]
        elif c == 'Q':
            for k in range(1, n + 1):
                t = k / n
                mt = 1 - t
                pts.append((mt * mt * x + 2 * mt * t * a[0] + t * t * a[2], mt * mt * y + 2 * mt * t * a[1] + t * t * a[3]))
            x, y = a[2], a[3]
        elif c == 'A':
            pts += _arc_points(a[7], a[8], a[0], a[1], a[2], int(a[3]), int(a[4]), a[5], a[6])
            x, y = a[5], a[6]
    return pts


def path_bbox(d):
    pts = path_points(path_abs(d))
    if not pts:
        return None
    return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))


def path_transform(d, sx, sy, tx, ty):
    out = []
    for c, a in path_abs(d):
        if c == 'Z':
            out.append('Z')
        elif c == 'A':
            out.append('A%s %s %s %d %d %s %s' % (fmt(a[0] * sx), fmt(a[1] * sy), fmt(a[2]), int(a[3]), int(a[4]),
                                                 fmt(a[5] * sx + tx), fmt(a[6] * sy + ty)))
        else:
            vals = [a[k] * (sx if k % 2 == 0 else sy) + (tx if k % 2 == 0 else ty) for k in range(len(a))]
            out.append(c + ' '.join(fmt(v) for v in vals))
    return ' '.join(out)


def shape_to_path(el):
    tag = etree.QName(el).localname
    g = lambda k, d=0.0: float(el.get(k, d))
    if tag == 'path':
        return el.get('d')
    if tag == 'rect':
        x, y, w, h = g('x'), g('y'), g('width'), g('height')
        return 'M%s %s H%s V%s H%s Z' % (fmt(x), fmt(y), fmt(x + w), fmt(y + h), fmt(x))
    if tag in ('circle', 'ellipse'):
        cx, cy = g('cx'), g('cy')
        rx = g('r') if tag == 'circle' else g('rx')
        ry = g('r') if tag == 'circle' else g('ry')
        return 'M%s %s A%s %s 0 1 0 %s %s A%s %s 0 1 0 %s %s Z' % (
            fmt(cx - rx), fmt(cy), fmt(rx), fmt(ry), fmt(cx + rx), fmt(cy), fmt(rx), fmt(ry), fmt(cx - rx), fmt(cy))
    if tag == 'line':
        return 'M%s %s L%s %s' % (el.get('x1'), el.get('y1'), el.get('x2'), el.get('y2'))
    if tag in ('polygon', 'polyline'):
        nums = [float(v) for v in re.findall(NUM, el.get('points', ''))]
        pts = ['%s %s' % (fmt(nums[i]), fmt(nums[i + 1])) for i in range(0, len(nums) - 1, 2)]
        return 'M' + ' L'.join(pts) + (' Z' if tag == 'polygon' else '')
    return None


# ---------------------------------------------------------------- Design lesen
def parse_transform(v):
    t = {'dx': 0.0, 'dy': 0.0, 'rot': 0.0, 'pivot': None}
    if not v:
        return t
    for fn, args in re.findall(r'(\w+)\s*\(([^)]*)\)', v):
        a = [float(x) for x in re.split(r'[\s,]+', args.strip()) if x]
        if fn == 'translate':
            t['dx'] += a[0]
            t['dy'] += a[1] if len(a) > 1 else 0
        elif fn == 'rotate':
            t['rot'] += a[0]
            if len(a) == 3:
                t['pivot'] = (a[1], a[2])
        else:
            raise ValueError('Transformation nicht unterstützt: ' + fn)
    return t


class Item:
    pass


def read_design(svg_path, fonts):
    tree = etree.parse(svg_path)
    root = tree.getroot()
    vb = [float(v) for v in re.split(r'[\s,]+', root.get('viewBox').strip())]
    W, H = vb[2], vb[3]
    items = []
    for node in root:
        if not isinstance(node.tag, str):
            continue
        lid = node.get('id') or ''
        m = LAYER.match(lid)
        if not m:
            continue
        kind = m.group(1)
        it = Item()
        it.id, it.kind, it.node = lid, kind, node
        t = parse_transform(node.get('transform'))
        texts = [node] if etree.QName(node).localname == 'text' else node.findall('.//' + q('text'))
        if kind in ('text', 'guide') and texts:
            el = texts[0]
            inner = parse_transform(el.get('transform'))
            tsp = el.findall(q('tspan'))
            lines = [ts.text or '' for ts in tsp] if tsp else [el.text or '']
            if len(texts) > 1:
                raise ValueError(lid + ': mehrere <text> in einer Ebene')
            size = float(el.get('font-size'))
            x = float(el.get('x', 0)) + t['dx'] + inner['dx']
            y = float(el.get('y', 0)) + t['dy'] + inner['dy']
            dys = [float(ts.get('dy', 0) or 0) for ts in tsp]
            if tsp:
                y += dys[0]
            line_h = dys[1] if len(dys) > 1 else size * 1.2
            it.font = el.get('font-family').split(',')[0].strip().strip('"\'')
            it.size, it.x, it.y, it.lines, it.line_h = size, x, y, lines, line_h
            it.anchor = el.get('text-anchor') or node.get('text-anchor') or 'start'
            it.ls = float(el.get('letter-spacing', 0) or 0)
            it.rot = t['rot'] + inner['rot']
            b, adv = text_ink(fonts, it.font, size, lines, x, y, line_h, it.anchor, it.ls)
            it.adv = adv
            # Drehpunkt wie im Konfigurator: Mitte des Textkastens
            ocx = x if it.anchor == 'middle' else x + adv / 2 if it.anchor == 'start' else x - adv / 2
            ocy = y - 0.35 * size + (len(lines) - 1) / 2 * line_h
            it.pivot = (ocx, ocy)
            hb = 1.2 * size + (len(lines) - 1) * line_h
            kb = (ocx - adv / 2, ocy - hb / 2, ocx + adv / 2, ocy + hb / 2)
            it.kbox = rot_bbox(kb, it.rot, ocx, ocy)
            it.bbox = rot_bbox(b, it.rot, ocx, ocy) if b else None
            it.points = glyph_points(fonts, it, ocx, ocy)
            it.text = '\n'.join(lines)
            it.feld = node.get('data-feld') or el.get('data-feld')
        else:
            shapes = [node] if etree.QName(node).localname != 'g' else [e for e in node.iter() if isinstance(e.tag, str) and etree.QName(e).localname in ('path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline')]
            if t['rot']:
                raise ValueError(lid + ': gedrehte Motivebene')
            boxes = []
            it.points = []
            for e in shapes:
                if parse_transform(e.get('transform'))['rot'] or parse_transform(e.get('transform'))['dx']:
                    raise ValueError(lid + ': transformierter Einzelpfad')
                d = shape_to_path(e)
                if not d:
                    continue
                pts = path_points(path_abs(d))
                it.points += [(px + t['dx'], py + t['dy']) for px, py in pts]
                b = path_bbox(d)
                if b:
                    boxes.append((b[0] + t['dx'], b[1] + t['dy'], b[2] + t['dx'], b[3] + t['dy']))
            it.bbox = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)) if boxes else None
            it.translate = (t['dx'], t['dy'])
            it.shapes = shapes
        if it.bbox:
            items.append(it)
    return {'tree': tree, 'root': root, 'W': W, 'H': H, 'items': items}


def union(boxes):
    boxes = [b for b in boxes if b]
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
