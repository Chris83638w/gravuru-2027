"""Neue Schiefer-Designs ohne Vorlage (Design-Master §5 „neu“) für die Lücken bis 29 je Zielgruppe (Regel 5.15).

Chris 04.11.2026: „stelle sicher, dass wir für alle Größen alle Zielgruppen Designs haben“.
Je Konzept zwei Master: quer (300 × 200, Motiv seitlich oder oben) und quadratisch (200 × 200, gestapelt).
Danach setzt auffuellen.py/umsetzen.py jede Formatreihe aus dem passenden Master um.
Texte: erfundene Beispielnamen (Hausstil §8), Schriften aus den 84, Motive aus motive/ (einfarbig, unverzerrt).
Fotofeld (Sternenkinder mit Foto): ovales Fenster wie bei Mikas Mastern (data-upload-window, Maske), Musterfoto
aus dem Bestand (designs/bestand/gedenktafeln/Sternenkinder), wird nicht graviert.
"""
import os, re, sys, json, shutil, hashlib, importlib.util
from aelib import Fonts, text_ink

HERE = os.path.dirname(os.path.abspath(__file__))


def _builder(kat_code):
    p = os.path.join(kat_code, 'scripts', 'build-designs-from-spec.py')
    spec = importlib.util.spec_from_file_location('bdfs', p)
    m = importlib.util.module_from_spec(spec)
    sys.argv_bak = sys.argv
    spec.loader.exec_module(m)
    return m


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def meas(fonts, font, size, text):
    b, adv = text_ink(fonts, font, size, text.split('\n'), 0, 0, 1.2 * size, 'middle', 0)
    return (b[2] - b[0], b[1], b[3]) if b else (0, -0.7 * size, 0)


def wrap2(text):
    """Langer Spruch: zwei ausgewogene Zeilen."""
    if len(text) <= 26 or '\n' in text:
        return text
    w = text.split()
    best = min(range(1, len(w)), key=lambda i: abs(len(' '.join(w[:i])) - len(' '.join(w[i:]))))
    return ' '.join(w[:best]) + '\n' + ' '.join(w[best:])


def real_bbox(fonts, svg_text):
    import tempfile
    from aelib import read_design
    p = tempfile.mktemp(suffix='.svg')
    open(p, 'w').write(svg_text)
    D = read_design(p, fonts)
    return {it.id: it.bbox for it in D['items']}, D, p


def motif_aspect(B, kat, rel, fonts=None):
    """Seitenverhältnis aus der echten Tinte (place_motif misst relative Pfade zu knapp)."""
    from pathlib import Path
    paths, b, rule = B.place_motif(Path(kat) / 'motive' / rel, (0, 0, 100, 100))
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g id="motiv-1">%s</g></svg>' % ''.join('<path d="%s"/>' % p for p in paths)
    bb, D, _ = real_bbox(_FONTS[0], svg)
    x0, y0, x1, y1 = bb['motiv-1']
    return (x1 - x0) / (y1 - y0)


_FONTS = [None]


def compose(fonts, B, kat, c, W, H, layout, _probe=False):
    """c: {'rows': [(feld, text, font, rel)], 'motiv': rel|None, 'foto': bool}; liefert Elementliste in mm."""
    m = 0.08 * min(W, H)
    aw, ah = W - 2 * m, H - 2 * m
    mot = c.get('motiv')
    foto = c.get('foto')
    _FONTS[0] = fonts
    asp = motif_aspect(B, kat, mot) if mot else None
    side = layout in ('links', 'rechts')
    # Bildfeld (Motiv oder Foto) und Textfläche
    if foto:
        fw_ = 0.30 * aw if side else 0.36 * aw
        fh_ = fw_ * 1.25 if side else min(0.40 * ah, fw_ * 1.25)
        fw_ = fh_ / 1.25
        pic = ('foto', fw_, fh_)
    elif mot:
        if side:
            mh = 0.62 * ah
            mw = min(mh * asp, 0.34 * aw)
        else:
            mh = 0.30 * ah
            mw = min(mh * asp, 0.55 * aw)
        mh = mw / asp
        pic = ('motiv', mw, mh)
    else:
        pic = None
    gap = 0.05 * min(W, H)
    if side and pic:
        tw = aw - pic[1] - gap
        th = ah
    else:
        tw = aw
        th = ah - ((pic[2] + gap) if pic else 0)
    rows = [(f, wrap2(t) if f.startswith('spruch') else t, fo, r) for f, t, fo, r in c['rows']]

    def block(S):
        hs = []
        for feld, text, font, rel in rows:
            w, top, bot = meas(fonts, font, max(3.0, S * rel), text)
            hs.append((w, top, bot, max(3.0, S * rel)))
        gaps = [0.32 * min(hs[i][2] - hs[i][1], hs[i + 1][2] - hs[i + 1][1]) for i in range(len(hs) - 1)]
        return hs, gaps, max(h[0] for h in hs), sum(h[2] - h[1] for h in hs) + sum(gaps)
    lo, hi = 3.0, min(0.6 * H, 95.0)
    for _ in range(40):
        mid = (lo + hi) / 2
        hs, gaps, bw, bh = block(mid)
        if bw <= 0.96 * tw and bh <= 0.92 * th:
            lo = mid
        else:
            hi = mid
    S = lo
    if _probe:
        return S
    if side and pic and not foto:
        # seitlich nur, wenn der Name dabei nicht deutlich kleiner wird als gestapelt (Hausstil: Name groß)
        s_stack = compose(fonts, B, kat, c, W, H, 'oben', _probe=True)
        if S < 0.78 * s_stack:
            return compose(fonts, B, kat, c, W, H, 'oben')
    hs, gaps, bw, bh = block(S)
    el = []
    if side and pic:
        gw = pic[1] + gap + bw
        x0 = m + (aw - gw) / 2
        if layout == 'links':
            px, tx = x0, x0 + pic[1] + gap + bw / 2
        else:
            tx, px = x0 + bw / 2, x0 + bw + gap
        py = H / 2 - pic[2] / 2
        ty = H / 2 - bh / 2
    else:
        total = bh + ((pic[2] + gap) if pic else 0)
        y0 = H / 2 - total / 2
        tx = W / 2
        if pic and layout == 'unten':
            ty, py = y0, y0 + bh + gap
        elif pic:
            py, ty = y0, y0 + pic[2] + gap
        else:
            ty = y0
        px = W / 2 - (pic[1] / 2 if pic else 0)
    if pic and pic[0] == 'motiv':
        el.append({'motiv': mot, 'box': [round(px, 3), round(py, 3), round(pic[1], 3), round(pic[2], 3)]})
    elif pic:
        el.append({'foto': True, 'box': [round(px, 3), round(py, 3), round(pic[1], 3), round(pic[2], 3)]})
    y = ty
    for i, ((feld, text, font, rel), (w, top, bot, size)) in enumerate(zip(rows, hs)):
        el.append({'feld': feld, 'text': text, 'font': font, 'size': round(size, 3), 'x': round(tx, 3), 'y': round(y - top, 3)})
        el[-1]['top'], el[-1]['bot'] = y, y + (bot - top)
        y += (bot - top) + (gaps[i] if i < len(gaps) else 0)
    return el


def write(B, kat, out, did, name, W, H, el, meta, foto_src=None):
    from pathlib import Path
    os.makedirs(out, exist_ok=True)
    layers, defs, fonts_used, motifs = [], [], set(), []
    nt = nm = 0
    for e in el:
        if 'text' in e:
            nt += 1
            fonts_used.add(e['font'])
            tsp = ''.join('<tspan x="%s" dy="%s">%s</tspan>' % (e['x'], 0 if i == 0 else round(1.2 * e['size'], 3), esc(l)) for i, l in enumerate(e['text'].split('\n')))
            layers.append('<text id="text-%d" data-feld="%s" x="%s" y="%s" font-family="%s" font-size="%s" fill="#000000" text-anchor="middle">%s</text>'
                          % (nt, e['feld'], e['x'], e['y'], esc(e['font']), e['size'], tsp))
        elif 'motiv' in e:
            nm += 1
            paths, b, rule = B.place_motif(Path(kat) / 'motive' / e['motiv'], e['box'])
            er = ' fill-rule="%s"' % rule if rule else ''
            layers.append('<g id="motiv-%d">%s</g>' % (nm, ''.join('<path d="%s" fill="#000000"%s/>' % (p, er) for p in paths)))
            motifs.append('motive/' + e['motiv'])
        elif e.get('foto'):
            x, y, w, h = e['box']
            cx, cy, rx, ry = x + w / 2, y + h / 2, w / 2, h / 2
            d = 'M%s %sA%s %s 0 1 0 %s %sA%s %s 0 1 0 %s %sZ' % (cx - rx, cy, rx, ry, cx + rx, cy, rx, ry, cx - rx, cy)
            defs.append('<clipPath id="clip-foto-1" clipPathUnits="userSpaceOnUse"><path d="%s"/></clipPath>' % d)
            ext = os.path.splitext(foto_src)[1]
            sha = hashlib.sha256(open(foto_src, 'rb').read()).hexdigest()
            shutil.copy2(foto_src, os.path.join(out, 'foto-1' + ext))
            layers.insert(0, '<g id="foto-1" data-upload-window="%s %s %s %s" data-upload-hint="separate" class="foto" clip-path="url(#clip-plattengrenze)" data-platzhalter="ja" data-gravur="nein" data-original-sha256="%s">'
                          '<path d="%s" fill="none" stroke="none"/><image id="originalfoto-1" x="%s" y="%s" width="%s" height="%s" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-foto-1)" href="foto-1%s"/></g>'
                          % (round(x, 4), round(y, 4), round(w, 4), round(h, 4), sha, d, round(x, 4), round(y, 4), round(w, 4), round(h, 4), ext))
            meta['photos'] = [{'file': 'foto-1' + ext, 'sha256': sha, 'bytes': os.path.getsize(foto_src),
                               'source': 'Musterfoto aus Bestandsvorlage %s, unverändert (Platzhalter, wird nicht graviert)' % os.path.relpath(foto_src, kat)}]
    defs.append('<clipPath id="clip-plattengrenze" clipPathUnits="userSpaceOnUse"><path d="M0 0H%sV%sH0Z"/></clipPath>' % (W, H))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="%smm" height="%smm" viewBox="0 0 %s %s"><title>%s</title><defs>%s</defs>%s</svg>\n'
           % (W, H, W, H, esc(name), ''.join(defs), ''.join(layers)))
    open(os.path.join(out, 'design.svg'), 'w', encoding='utf-8').write(svg)
    # Motiv exakt in seine Box setzen (gemessene Tinte → Zielbox, unverzerrt, mittig)
    from aelib import read_design
    from svgedit import apply_tr
    D = read_design(os.path.join(out, 'design.svg'), _FONTS[0])
    boxes = [e['box'] for e in el if 'motiv' in e]
    tr = {it.id: (1, 1, 0, 0) for it in D['items']}
    for it, (bx, by, bw, bh) in zip([i for i in D['items'] if i.kind == 'motiv'], boxes):
        x0, y0, x1, y1 = it.bbox
        k = min(bw / (x1 - x0), bh / (y1 - y0))
        tr[it.id] = (k, k, bx + (bw - (x1 - x0) * k) / 2 - x0 * k, by + (bh - (y1 - y0) * k) / 2 - y0 * k)
    apply_tr(D, tr, _FONTS[0])
    D['tree'].write(os.path.join(out, 'design.svg'), encoding='utf-8', xml_declaration=False)
    meta.update({'id': did, 'name': name, 'plateMm': [W, H], 'fonts': sorted(fonts_used), 'motifs': ['Motiv aus der Bibliothek %s (als Pfad im Design, unverzerrt)' % m for m in motifs], 'movable': True,
                 'material': 'Schiefer', 'process': 'Gravur', 'mode': 'neu',
                 'provenance': {'source': 'ohne Vorlage', 'mode': 'neu', 'by': 'Claude Schiefer 04.11.2026 (Chris: „für alle Größen alle Zielgruppen“; Design-Master §5), gravuru-2027 scripts/schiefer-designs/komponieren.py'}})
    json.dump(meta, open(os.path.join(out, 'design.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
