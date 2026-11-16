"""Gemeinsame Bausteine zum Umgestalten von Lieferform-2-SVGs (Schiefer-Menschen).

Arbeitet direkt im vorhandenen SVG-Baum: Titel, defs und Kontur bleiben erhalten,
Ebenen-IDs und data-feld bleiben gleich. Nur Position, Größe und Zeilen ändern sich.
"""
import copy, re
from lxml import etree
from aelib import q, fmt, text_ink, shape_to_path, path_transform, parse_transform

CAP = 0.70  # Versalhöhe ≈ 0,70 × Schriftgröße (Richtwert für unsere Schriften)


def cap_mm(fonts, it):
    """Echte Versalhöhe aus der H-Glyphe der Schrift."""
    try:
        f = fonts.face(it.font)
        a, b = fonts.glyph(it.font, 'H')
        return (b[3] - b[1]) / f['upem'] * it.size if b else CAP * it.size
    except KeyError:
        return CAP * it.size


def text_el(it):
    n = it.node
    return n if etree.QName(n).localname == 'text' else n.find('.//' + q('text'))


def set_text(fonts, it, lines, size, cx, top, line_h=None, anchor='middle'):
    """Text neu setzen: Zeilen, Größe, horizontale Mitte cx, Oberkante der Tinte top.
    Gibt die neue Tintenbox zurück."""
    el = text_el(it)
    lh = line_h if line_h else size * (it.line_h / it.size if it.size else 1.2)
    b, adv = text_ink(fonts, it.font, size, lines, cx, 0, lh, anchor, it.ls * size / it.size if it.size else 0)
    base = top - b[1]
    for k in ('transform',):
        if k in it.node.attrib:
            del it.node.attrib[k]
        if k in el.attrib:
            del el.attrib[k]
    el.set('x', fmt(cx))
    el.set('y', fmt(base))
    el.set('font-size', fmt(size))
    el.set('text-anchor', anchor)
    if el.get('letter-spacing'):
        el.set('letter-spacing', fmt(float(el.get('letter-spacing')) * size / it.size))
    tmpl = el.find(q('tspan'))
    for ts in el.findall(q('tspan')):
        el.remove(ts)
    el.text = None
    for i, line in enumerate(lines):
        ts = etree.SubElement(el, q('tspan')) if tmpl is None else copy.deepcopy(tmpl)
        if tmpl is not None:
            el.append(ts)
        for a in ('y',):
            if a in ts.attrib:
                del ts.attrib[a]
        ts.set('x', fmt(cx))
        ts.set('dy', fmt(0 if i == 0 else lh))
        ts.text = line
    it.anchor, it.x = anchor, cx
    return (b[0], top, b[2], top + (b[3] - b[1]))


def ink(fonts, it, lines, size, line_h=None):
    lh = line_h if line_h else size * (it.line_h / it.size if it.size else 1.2)
    b, adv = text_ink(fonts, it.font, size, lines, 0, 0, lh, 'middle', it.ls * size / it.size if it.size else 0)
    return (b[2] - b[0], b[3] - b[1]) if b else (0, 0)


def move_shapes(it, s, tx, ty):
    """Motiv-/Fotoebene gleichmäßig skalieren und verschieben (Pfade direkt umrechnen)."""
    n = it.node
    dx0, dy0 = it.translate
    if 'transform' in n.attrib:
        del n.attrib['transform']
    shapes = [n] if etree.QName(n).localname != 'g' else [e for e in n.iter() if isinstance(e.tag, str) and etree.QName(e).localname in ('path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline')]
    for e in shapes:
        d = shape_to_path(e)
        if not d:
            continue
        nd = path_transform(d, s, s, dx0 * s + tx, dy0 * s + ty)
        tag = etree.QName(e).localname
        if tag != 'path':
            for a in ('x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points'):
                if a in e.attrib:
                    del e.attrib[a]
            e.tag = q('path')
        e.set('d', nd)
        if e.get('stroke-width'):
            e.set('stroke-width', fmt(float(e.get('stroke-width')) * s))
    if n.get('stroke-width'):
        n.set('stroke-width', fmt(float(n.get('stroke-width')) * s))


def move_foto(it, s, tx, ty):
    """Fotoebene (g mit image/clipPath/rect/path): alles mit gleicher Skalierung umrechnen."""
    n = it.node
    dx0, dy0 = it.translate
    if 'transform' in n.attrib:
        del n.attrib['transform']
    for e in n.iter():
        if not isinstance(e.tag, str):
            continue
        tag = etree.QName(e).localname
        if tag == 'image':
            for a, ax in (('x', 0), ('y', 1), ('width', None), ('height', None)):
                v = e.get(a)
                if v is None:
                    continue
                v = float(v)
                if ax == 0:
                    v = (v + dx0) * s + tx
                elif ax == 1:
                    v = (v + dy0) * s + ty
                else:
                    v = v * s
                e.set(a, fmt(v))
        elif tag in ('path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline'):
            d = shape_to_path(e)
            if not d:
                continue
            nd = path_transform(d, s, s, dx0 * s + tx, dy0 * s + ty)
            if tag != 'path':
                for a in ('x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points'):
                    if a in e.attrib:
                        del e.attrib[a]
                e.tag = q('path')
            e.set('d', nd)
            if e.get('stroke-width'):
                e.set('stroke-width', fmt(float(e.get('stroke-width')) * s))
        elif tag == 'text':
            for a, k in (('x', 0), ('y', 1)):
                if e.get(a) is not None:
                    e.set(a, fmt((float(e.get(a)) + (dx0 if k == 0 else dy0)) * s + (tx if k == 0 else ty)))
            if e.get('font-size'):
                e.set('font-size', fmt(float(e.get('font-size')) * s))
            for ts in e.findall(q('tspan')):
                for a, k in (('x', 0), ('y', 1)):
                    if ts.get(a) is not None:
                        ts.set(a, fmt((float(ts.get(a)) + (dx0 if k == 0 else dy0)) * s + (tx if k == 0 else ty)))
                if ts.get('dy'):
                    ts.set('dy', fmt(float(ts.get('dy')) * s))


def remove(it):
    p = it.node.getparent()
    p.remove(it.node)


def wrap_words(words, n_per_line):
    return [' '.join(words[i:i + n_per_line]) for i in range(0, len(words), n_per_line)]


def balanced_wrap(text, max_lines, fonts, it, size, max_w):
    """Wörter möglichst gleichmäßig auf höchstens max_lines Zeilen verteilen, keine Ein-Wort-Waise."""
    words = text.split()
    best = None
    for n in range(1, max_lines + 1):
        if n > len(words):
            break
        # gierig nach Zielbreite
        total = ink(fonts, it, [' '.join(words)], size)[0]
        target = total / n
        lines, cur = [], []
        for w in words:
            trial = ' '.join(cur + [w])
            if cur and ink(fonts, it, [trial], size)[0] > target * 1.08 and len(lines) < n - 1:
                lines.append(' '.join(cur))
                cur = [w]
            else:
                cur.append(w)
        lines.append(' '.join(cur))
        if len(lines) > 1 and len(lines[-1].split()) == 1 and len(lines[-2].split()) > 2:
            a = lines[-2].split()
            lines[-2] = ' '.join(a[:-1])
            lines[-1] = a[-1] + ' ' + lines[-1]
        w = max(ink(fonts, it, [l], size)[0] for l in lines)
        if w <= max_w:
            return lines
        best = lines
    return None


def visual_mm(fonts, it, size=None):
    """Optische Größe: Median der Glyphenhöhen des tatsächlichen Texts (Versalien → Versalhöhe, Kleinbuchstaben → x-Höhe/Oberlängen)."""
    size = size or it.size
    f = fonts.face(it.font)
    hs = []
    for ch in ''.join(it.lines):
        if not ch.isalpha():
            continue
        a, b = fonts.glyph(it.font, ch)
        if b:
            hs.append((b[3] - b[1]) / f['upem'] * size)
    if not hs:
        return cap_mm(fonts, it)
    hs.sort()
    return hs[len(hs) // 2]


def apply_tr(D, tr, fonts):
    """Gleichmäßige Transformation je Ebene (s, s, tx, ty) in den vorhandenen Baum schreiben."""
    from aelib import fmt as _f
    for it in D['items']:
        s, _, tx, ty = tr[it.id]
        if abs(s - 1) < 1e-6 and abs(tx) < 1e-6 and abs(ty) < 1e-6:
            continue
        if it.kind in ('text', 'guide') and hasattr(it, 'font'):
            el = text_el(it)
            for n in (it.node, el):
                if 'transform' in n.attrib:
                    del n.attrib['transform']
            nx, ny = it.x * s + tx, it.y * s + ty
            tsp = el.findall(q('tspan'))
            first_dy = float(tsp[0].get('dy', 0) or 0) if tsp else 0.0
            el.set('x', _f(nx))
            el.set('y', _f(ny - first_dy * s))
            el.set('font-size', _f(it.size * s))
            if el.get('letter-spacing'):
                el.set('letter-spacing', _f(float(el.get('letter-spacing')) * s))
            for ts in tsp:
                ts.set('x', _f(nx))
                if 'y' in ts.attrib:
                    del ts.attrib['y']
                ts.set('dy', _f(float(ts.get('dy', 0) or 0) * s))
            if tsp and tsp[0].get('dy') in (None, ''):
                tsp[0].set('dy', '0')
            if it.rot:
                px, py = it.pivot[0] * s + tx, it.pivot[1] * s + ty
                it.node.set('transform', 'rotate(%s %s %s)' % (_f(it.rot), _f(px), _f(py)))
        elif it.kind == 'foto':
            from kreuz import move_foto_full
            uw = it.node.get('data-upload-window')
            move_foto_full(D, it, s, tx, ty)
            if uw:
                x, y, w, h = [float(v) for v in uw.split()]
                it.node.set('data-upload-window', ' '.join(_f(v) for v in (x * s + tx, y * s + ty, w * s, h * s)))
        else:
            move_shapes(it, s, tx, ty)
