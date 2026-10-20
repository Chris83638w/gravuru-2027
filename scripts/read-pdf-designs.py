#!/usr/bin/env python3
"""Einzel-Design-PDFs (Corel-Export, eine Platte je Datei) in Katalog-Designs zerlegen.

Aufruf:
  python3 -I scripts/read-pdf-designs.py --pdf <ordner> --out <katalog>/designs/bestand/<linie> \
      [--zuordnung <json>] [--serie <schlüssel>] [--prozess Gravur]

Je PDF entsteht ein Ordner `<Zielgruppe>/<Unterkategorie>/<serie>-D<n>/` mit
  design.json   Texte (echter Text, Schrift, Größe, Grundlinie), Motive (Pfade in mm), Fotofeld
  design.svg    Lieferform 2: text-<n>, motiv-<n> (Gruppe), foto-1 (Platzhalterbild, wird nicht graviert)
  foto-1.png    Platzhalter: freigestelltes Musterfoto samt „Foto-Upload hier klicken“ (RGBA)
  original.png  Rendering des PDFs (Sichtkontrolle)

Erkennung im PDF (so exportiert Corel die Gedenktafel-Vorlagen):
  rote Haarlinie (Kontur 1/0/0, ohne Füllung) = Plattenrand → Nullpunkt und Plattenmaß
  gefüllte/konturierte Pfade (Hellgrau)      = Motive, nach Nähe zu Motivgruppen zusammengefasst
  Text-Objekte                               = Kundentexte (bleiben Text; Pfade erst in der Fertigung)
  Bild mit SMask                             = Fotofeld mit Upload-Hinweis (Kundenfoto ersetzt es)
Nichts wird erfunden: unbekannte Schriften bleiben mit Originalnamen stehen und werden markiert.
"""
import argparse, json, math, re, subprocess, sys, io
from pathlib import Path

import pdfplumber, pikepdf
from PIL import Image

PT = 25.4 / 72  # pt → mm
MAX_MOTIFS = 12

# PostScript-Name (ohne Subset-Präfix) → (Familie wie in der Zeichnung, Schnitt)
PS_FAMILY = {
    'Allura-Regular': ('Allura', None), 'Stylish': ('Stylish', None), 'Homage': ('Homage', None),
    'BetsyBailey': ('Betsy Bailey', None), 'Poppins-ExtraLight': ('Poppins', 'ExtraLight'),
    'Cinzel-Regular': ('Cinzel', None), 'Centaur': ('Centaur', None),
    'Champagne&Limousines': ('Champagne & Limousines', None), 'Bellefair-Regular': ('Bellefair', None),
    'GreatVibes-Regular': ('Great Vibes', None), 'Arvo': ('Arvo', None), 'Arial-ItalicMT': ('Arial', 'Italic'),
    'ArialMT': ('Arial', None), 'BabyBohoScript': ('Baby Boho Script', None), 'SunflowerRegular': ('Sunflower', None),
    'Georgia': ('Georgia', None), 'Mondevilla': ('Mondevilla', None), 'HelloGeorgia': ('Hello Georgia', None),
    'AshleyRegular': ('Ashley', None), 'SweetieRegular': ('Sweetie', None), 'Desyrel': ('Desyrel', None),
    'Tangerine-Bold': ('Tangerine', 'Bold'), 'Tangerine-Regular': ('Tangerine', None), 'Amarillo': ('Amarillo', None),
    'Ampera': ('Ampera', None), 'CaviarDreams': ('Caviar Dreams', None),
    'AnthoniSignatureRegular': ('Anthoni Signature', None), 'TimesNewRomanPSMT': ('Times New Roman', None),
}


def hexcol(c):
    if c is None: return None
    if isinstance(c, (int, float)): c = (c, c, c)
    if len(c) == 1: c = (c[0],) * 3
    if len(c) == 4:  # CMYK grob nach RGB
        k = c[3]; c = tuple((1 - min(1, v + k)) for v in c[:3])
    return '#' + ''.join(f'{round(max(0, min(1, v)) * 255):02x}' for v in c[:3])


def family_of(fontname):
    ps = re.sub(r'^[A-Z]{6}\+', '', fontname)
    if ps in PS_FAMILY: return PS_FAMILY[ps], ps
    base = re.sub(r'-(Regular|Roman)$', '', ps)
    return (re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', base), None), ps


# ---------------------------------------------------------------- Platte

def find_plate(page):
    """Rote Haarlinie ohne Füllung, größte Fläche = Plattenrand (Box in pt, top-basiert)."""
    best = None
    for o in page.curves + page.rects:
        sc = o.get('stroking_color')
        if not o.get('stroke') or o.get('fill'): continue
        if sc is None or hexcol(sc) not in ('#ff0000',): continue
        a = (o['x1'] - o['x0']) * (o['bottom'] - o['top'])
        if best is None or a > best[0]: best = (a, o)
    if best is None: return None, None
    o = best[1]
    return (o['x0'], o['top'], o['x1'], o['bottom']), o


# ---------------------------------------------------------------- Texte

def pua_map(pdf_path):
    """Corel setzt Ligaturen/Alternativen (z. B. „ll“ in Homage) als Zeichen im Private-Use-Bereich.
    Über ToUnicode → CID → Glyph-ID → Glyphname der eingebetteten Schrift wird daraus wieder Text
    („ll.liga“ → „ll“). Ergebnis: {BaseFont: {PUA-Zeichen: Text}}."""
    import io
    from fontTools.ttLib import TTFont
    res = {}
    with pikepdf.open(pdf_path) as pdf:
        for _, f in pdf.pages[0].Resources.Font.items():
            base = str(f.get('/BaseFont', '')).lstrip('/')
            tu = f.get('/ToUnicode')
            if tu is None or '/DescendantFonts' not in f: continue
            cmap = tu.read_bytes().decode('latin1')
            pairs = re.findall(r'<([0-9a-fA-F]{4})>\s*<([0-9a-fA-F]{4})>', cmap)
            pua = {int(c, 16): chr(int(u, 16)) for c, u in pairs if 0xE000 <= int(u, 16) <= 0xF8FF}
            if not pua: continue
            df = f.DescendantFonts[0]; fd = df.get('/FontDescriptor')
            ff = fd.get('/FontFile2') if fd is not None else None
            if ff is None: continue
            try: names = TTFont(io.BytesIO(ff.read_bytes())).getGlyphOrder()
            except Exception: continue
            c2g = df.get('/CIDToGIDMap'); table = c2g.read_bytes() if isinstance(c2g, pikepdf.Stream) else None
            m = {}
            for cid, ch in pua.items():
                gid = int.from_bytes(table[cid * 2:cid * 2 + 2], 'big') if table else cid
                name = names[gid] if gid < len(names) else ''
                letters = ''.join(name.split('.')[0].split('_'))
                if letters and re.fullmatch(r'[A-Za-zÄÖÜäöüß]+', letters): m[ch] = letters
            res[base] = m
    return res


def text_blocks(page, ox, oy, pua=None):
    pua = pua or {}
    chars = [c for c in page.chars if c['text'].strip() or c['text'] == ' ']
    warn = []
    for c in chars:
        if len(c['text']) == 1 and 0xE000 <= ord(c['text']) <= 0xF8FF:
            rep = (pua.get(c['fontname']) or {}).get(c['text'])
            if rep: c['text'] = rep
            else: warn.append(f'Sonderglyphe U+{ord(c["text"]):04X} in {c["fontname"]} nicht lesbar')
    H = page.height
    # Zeilen: gleiche Schrift, Grundlinie innerhalb ±25 % der Schriftgröße (Corel skaliert Zeichen einzeln)
    chars.sort(key=lambda c: (c['fontname'], H - c['matrix'][5]))
    rows = []
    for c in chars:
        base = H - c['matrix'][5]
        r = next((r for r in rows if r['font'] == c['fontname'] and abs(r['base'] - base) <= 0.25 * max(r['size'], c['size'])), None)
        if r is None: rows.append({'font': c['fontname'], 'base': base, 'size': c['size'], 'chars': [c]})
        else: r['chars'].append(c)
    lines = []
    for r in rows:
        cs = sorted(r['chars'], key=lambda c: c['matrix'][4])
        # doppelt gesetzte Zeichen (Text mit Kontur + Füllung, leicht versetzt) nur einmal
        dd = []
        for c in cs:
            if dd and dd[-1]['text'] == c['text'] and abs(dd[-1]['matrix'][4] - c['matrix'][4]) < 0.15 * c['size']: continue
            dd.append(c)
        cs = dd
        sizes = sorted(c['size'] for c in cs); size = sizes[len(sizes) // 2]
        seg = [cs[0]]
        for c in cs[1:]:
            if c['x0'] - seg[-1]['x1'] > 0.6 * size: lines.append((r['font'], size, seg)); seg = [c]
            else: seg.append(c)
        lines.append((r['font'], size, seg))
    out = []
    for fn, size, cs in lines:
        txt = ''
        for i, c in enumerate(cs):
            if i and c['x0'] - cs[i - 1]['x1'] > 0.18 * size and not txt.endswith(' ') and c['text'] != ' ': txt += ' '
            txt += c['text']
        txt = re.sub(r'\s+', ' ', txt).strip()
        if not txt: continue
        bs = sorted(H - c['matrix'][5] for c in cs); base = bs[len(bs) // 2]
        # Laufweite (Corel: Zeichenabstand): tatsächlicher Abstand zum nächsten Zeichen minus Vorschub der Schrift
        # (Mittel über alle Zeichenpaare: Corel setzt Paare einzeln, die Gesamtbreite bleibt so erhalten)
        gaps = [cs[i + 1]['matrix'][4] - cs[i]['matrix'][4] - cs[i]['adv'] for i in range(len(cs) - 1)
                if cs[i]['text'] != ' ' and cs[i + 1]['text'] != ' ']
        ls = sum(gaps) / len(gaps) if gaps else 0.0
        out.append({'font': fn, 'size': size, 'text': txt, 'ls': ls, 'x0': min(c['x0'] for c in cs), 'x1': max(c['x1'] for c in cs),
                    'base': base, 'top': min(c['top'] for c in cs), 'bottom': max(c['bottom'] for c in cs),
                    'color': hexcol(cs[0].get('non_stroking_color')), 'xstart': cs[0]['matrix'][4]})
    # Zeilen zu Blöcken: gleiche Schrift/Größe, Zeilenabstand 0,9–2,6 × Größe, waagerecht überlappend
    out.sort(key=lambda l: (l['base'], l['x0']))
    blocks = []
    for l in out:
        hit = None
        for b in blocks:
            p = b[-1]
            if p['font'] != l['font'] or abs(p['size'] - l['size']) > 0.2: continue
            dy = l['base'] - p['base']
            if not 0.9 * l['size'] <= dy <= 2.6 * l['size']: continue
            if min(p['x1'], l['x1']) - max(p['x0'], l['x0']) < -0.5 * l['size']: continue
            hit = b; break
        if hit is not None: hit.append(l)
        else: blocks.append([l])
    # versetzte Zeilen (keine gemeinsame Ausrichtung, z. B. „Hier / ruhe / ich“) als einzelne Texte
    split = []
    for b in blocks:
        if len(b) > 1:
            sp = lambda v: max(v) - min(v)
            best = min(sp([l['x0'] for l in b]), sp([l['x1'] for l in b]), sp([(l['x0'] + l['x1']) / 2 for l in b]))
            if best > 0.35 * b[0]['size']: split += [[l] for l in b]; continue
        split.append(b)
    blocks = split
    # Werkstatt: höchstens 180 Zeichen je Textfeld → lange Sprüche zeilenweise auf mehrere Felder verteilen
    split = []
    for b in blocks:
        cur, n = [], 0
        for l in b:
            if cur and n + len(l['text']) + 1 > 180: split.append(cur); cur, n = [], 0
            cur.append(l); n += len(l['text']) + 1
        split.append(cur)
    blocks = split
    res = []
    for b in blocks:
        lefts = [l['x0'] for l in b]; rights = [l['x1'] for l in b]; cents = [(l['x0'] + l['x1']) / 2 for l in b]
        spread = lambda v: max(v) - min(v)
        if len(b) == 1: align = 'center'
        else:
            s = {'left': spread(lefts), 'right': spread(rights), 'center': spread(cents)}
            align = min(s, key=s.get)
        (fam, style), ps = family_of(b[0]['font'])
        x0, x1 = min(lefts), max(rights)
        anchor_x = {'left': x0, 'right': x1, 'center': (x0 + x1) / 2}[align]
        lh = (b[-1]['base'] - b[0]['base']) / (len(b) - 1) if len(b) > 1 else b[0]['size'] * 1.2
        res.append({
            'text': '\n'.join(l['text'] for l in b),
            'font': fam, 'fontStyle': style, 'fontPostScript': ps,
            'sizePt': round(b[0]['size'], 2), 'color': b[0]['color'], 'align': align,
            'box': [round((x0 - ox) * PT, 2), round((min(l['top'] for l in b) - oy) * PT, 2),
                    round((x1 - x0) * PT, 2), round((max(l['bottom'] for l in b) - min(l['top'] for l in b)) * PT, 2)],
            'anchorMm': [round((anchor_x - ox) * PT, 2), round((b[0]['base'] - oy) * PT, 2)],
            'lineHeightMm': round(lh * PT, 2),
            'lineWidthsMm': [round((l['x1'] - l['x0']) * PT, 2) for l in b],
            'letterSpacingMm': (lambda v: round(v * PT, 3) if abs(v) > 0.005 * b[0]['size'] else 0.0)(sum(l['ls'] for l in b) / len(b)),
        })
    res.sort(key=lambda t: (t['box'][1], t['box'][0]))
    return res, warn


# ---------------------------------------------------------------- Motive

def _mul(a, b):
    return (a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
            a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5])


def _col(vals):
    v = [float(x) for x in vals if not isinstance(x, pikepdf.Name)]
    if not v: return None
    return hexcol(tuple(v) if len(v) in (3, 4) else (v[0],))


def vector_paths(pdf_path, ox, oy):
    """Pfade direkt aus dem Inhaltsstrom: ein Malbefehl (f, f*, S, B …) = ein Pfad mit allen Teilpfaden.
    (pdfplumber trennt Teilpfade, dadurch würden Löcher – z. B. ein Herz als Kontur – zugefüllt.)
    Rückgabe in mm relativ zum Plattenrand; rote Haarlinien ohne Füllung (Plattenrand, Schnitt) entfallen."""
    out = []
    with pikepdf.open(pdf_path) as pdf:
        page = pdf.pages[0]; H = float(page.MediaBox[3]) - float(page.MediaBox[1])
        gstates = page.Resources.get('/ExtGState', {})
        st = {'ctm': (1, 0, 0, 1, 0, 0), 'fill': '#000000', 'stroke': '#000000', 'lw': 1.0, 'ca': 1.0, 'CA': 1.0}
        stack = []; sub = []; cur = (0.0, 0.0); in_text = False
        def pt(x, y):
            a, b, c, d, e, f = st['ctm']; X = a * x + c * y + e; Y = b * x + d * y + f
            return ((X - ox) * PT, (H - Y - oy) * PT)
        def fmt(q): return ' '.join(f'{x:.3f} {y:.3f}' for x, y in q)
        def emit(rule, do_fill, do_stroke):
            nonlocal sub
            if not sub: return
            d = ' '.join(sub); sub = []
            nums = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', d)]
            X, Y = nums[0::2], nums[1::2]
            if not X: return
            sc = math.sqrt(abs(st['ctm'][0] * st['ctm'][3] - st['ctm'][1] * st['ctm'][2]))
            out.append({'d': d, 'fill': st['fill'] if do_fill else None, 'stroke': st['stroke'] if do_stroke else None,
                        'strokeMm': round(st['lw'] * sc * PT, 3) if do_stroke else 0, 'evenodd': rule == 'evenodd',
                        'opacity': round(st['ca'] if do_fill else st['CA'], 3),
                        'box': [min(X), min(Y), max(X) - min(X), max(Y) - min(Y)]})
        for operands, op in pikepdf.parse_content_stream(page):
            op = str(op); o = operands
            if op == 'BT': in_text = True; continue
            if op == 'ET': in_text = False; continue
            if in_text: continue
            if op == 'q': stack.append(dict(st))
            elif op == 'Q': st = stack.pop() if stack else st
            elif op == 'cm': st['ctm'] = _mul(tuple(float(v) for v in o), st['ctm'])
            elif op == 'w': st['lw'] = float(o[0])
            elif op in ('g', 'rg', 'k', 'sc', 'scn'): st['fill'] = _col(o) or st['fill']
            elif op in ('G', 'RG', 'K', 'SC', 'SCN'): st['stroke'] = _col(o) or st['stroke']
            elif op == 'gs':
                g = gstates.get(str(o[0]), {})
                if '/ca' in g: st['ca'] = float(g['/ca'])
                if '/CA' in g: st['CA'] = float(g['/CA'])
            elif op == 'm': cur = (float(o[0]), float(o[1])); sub.append('M' + fmt([pt(*cur)]))
            elif op == 'l': cur = (float(o[0]), float(o[1])); sub.append('L' + fmt([pt(*cur)]))
            elif op == 'c':
                v = [float(x) for x in o]; sub.append('C' + fmt([pt(v[0], v[1]), pt(v[2], v[3]), pt(v[4], v[5])])); cur = (v[4], v[5])
            elif op == 'v':
                v = [float(x) for x in o]; sub.append('C' + fmt([pt(*cur), pt(v[0], v[1]), pt(v[2], v[3])])); cur = (v[2], v[3])
            elif op == 'y':
                v = [float(x) for x in o]; sub.append('C' + fmt([pt(v[0], v[1]), pt(v[2], v[3]), pt(v[2], v[3])])); cur = (v[2], v[3])
            elif op == 'h': sub.append('Z')
            elif op == 're':
                x, y, w, h = (float(v) for v in o)
                sub.append('M' + fmt([pt(x, y)]) + ' L' + fmt([pt(x + w, y)]) + ' L' + fmt([pt(x + w, y + h)]) + ' L' + fmt([pt(x, y + h)]) + ' Z')
            elif op in ('f', 'F'): emit('nonzero', True, False)
            elif op == 'f*': emit('evenodd', True, False)
            elif op == 'S': emit('nonzero', False, True)
            elif op == 's': sub.append('Z'); emit('nonzero', False, True)
            elif op == 'B': emit('nonzero', True, True)
            elif op == 'B*': emit('evenodd', True, True)
            elif op == 'b': sub.append('Z'); emit('nonzero', True, True)
            elif op == 'b*': sub.append('Z'); emit('evenodd', True, True)
            elif op == 'n': sub = []
    return [p for p in out if not (p['fill'] is None and (p['stroke'] or '').lower() == '#ff0000') and (p['fill'] or p['stroke'])]


def cluster(paths, gap=2.0):
    """Pfade, deren Boxen sich bis auf `gap` mm nähern, zu einer Motivgruppe zusammenfassen (Union-Find über ein Raster)."""
    n = len(paths); parent = list(range(n))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    cell = 8.0; grid = {}
    for i, p in enumerate(paths):
        x, y, w, h = p['box']
        for gx in range(int((x - gap) // cell), int((x + w + gap) // cell) + 1):
            for gy in range(int((y - gap) // cell), int((y + h + gap) // cell) + 1):
                grid.setdefault((gx, gy), []).append(i)
    def near(a, b):
        ax, ay, aw, ah = a['box']; bx, by, bw, bh = b['box']
        return ax - gap <= bx + bw and bx - gap <= ax + aw and ay - gap <= by + bh and by - gap <= ay + ah
    for ids in grid.values():
        for k, i in enumerate(ids):
            for j in ids[k + 1:]:
                ri, rj = find(i), find(j)
                if ri != rj and near(paths[i], paths[j]): parent[ri] = rj
    groups = {}
    for i in range(n): groups.setdefault(find(i), []).append(paths[i])
    out = []
    for g in groups.values():
        x0 = min(p['box'][0] for p in g); y0 = min(p['box'][1] for p in g)
        x1 = max(p['box'][0] + p['box'][2] for p in g); y1 = max(p['box'][1] + p['box'][3] for p in g)
        out.append({'box': [round(x0, 2), round(y0, 2), round(x1 - x0, 2), round(y1 - y0, 2)], 'paths': g})
    out.sort(key=lambda m: (m['box'][1], m['box'][0]))
    return out


# ---------------------------------------------------------------- Foto

def photo_images(pdf_path):
    """Bilder der Seite mit SMask als RGBA (pikepdf), Reihenfolge wie im Inhaltsstrom."""
    out = []
    with pikepdf.open(pdf_path) as pdf:
        page = pdf.pages[0]
        masks = {raw.SMask.objgen for raw in page.images.values() if '/SMask' in raw}
        for name, raw in page.images.items():  # noqa
            if raw.objgen in masks: continue  # SMask eines anderen Bildes
            pim = pikepdf.PdfImage(raw)
            img = pim.as_pil_image().convert('RGB')
            alpha = None
            if '/SMask' in raw:
                alpha = pikepdf.PdfImage(raw.SMask).as_pil_image().convert('L')
                if alpha.size != img.size: alpha = alpha.resize(img.size)
            rgba = img.convert('RGBA')
            if alpha is not None: rgba.putalpha(alpha)
            out.append((str(name).lstrip('/'), rgba, alpha is not None))
    return out


def coverage(alpha):
    a = alpha.point(lambda v: 255 if v > 127 else 0); h = a.histogram()
    return h[255] / max(1, a.size[0] * a.size[1])


def solidity(alpha):
    """Fläche der Maske / Fläche ihrer konvexen Hülle (Kreis, Herz, Rechteck ≈ 0,9–1; freigestelltes Tier deutlich kleiner)."""
    a = alpha.point(lambda v: 255 if v > 127 else 0)
    w, h = a.size; px = a.load()
    area = 0; pts = []
    for y in range(0, h, 2):
        row = [x for x in range(0, w, 2) if px[x, y]]
        if row: area += len(row) * 4; pts += [(row[0], y), (row[-1], y)]
    if len(pts) < 3: return 0.0
    pts = sorted(set(pts))
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    hull = lo[:-1] + hi[:-1]
    ha = abs(sum(hull[i][0] * hull[(i + 1) % len(hull)][1] - hull[(i + 1) % len(hull)][0] * hull[i][1] for i in range(len(hull)))) / 2
    return area / ha if ha else 0.0


# ---------------------------------------------------------------- SVG

EVENODD = ' fill-rule="evenodd"'


def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


DATE = re.compile(r'\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}|(19|20)\d{2}')


def field_keys(texts):
    """Feldnamen fürs Kundenformular: größter Text = name, kurze Zeilen mit Datum = daten, Rest = spruch."""
    if not texts: return []
    big = max(range(len(texts)), key=lambda i: texts[i]['sizePt']); seen = {}; out = []
    for i, t in enumerate(texts):
        k = 'name' if i == big else 'daten' if DATE.search(t['text']) and len(t['text']) <= 40 else 'spruch'
        seen[k] = seen.get(k, 0) + 1; out.append(k if seen[k] == 1 else f'{k}-{seen[k]}')
    return out


def design_svg(d, foto_href='foto-1.png'):
    W, H = d['plate']['widthMm'], d['plate']['heightMm']
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}mm" height="{H}mm">',
           f'<rect id="platte" width="{W}" height="{H}" fill="none" stroke="#999" stroke-width="0.2"/>']
    for i, f in enumerate(d['photos'], 1):
        x, y, w, h = f['box']
        # Platzhalter: Musterfoto + Upload-Hinweis als ein Bild; Klick lädt das Kundenfoto, nicht graviert
        mask = (f'<circle cx="{x + w / 2:.2f}" cy="{y + h / 2:.2f}" r="{min(w, h) / 2:.2f}" fill="none"/>' if f.get('shape') == 'circle'
                else f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="none"/>')
        out.append(f'<g id="foto-{i}" class="foto" data-platzhalter="ja" data-gravur="nein">{mask}'
                   f'<image x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" preserveAspectRatio="none" xlink:href="{f["file"]}"/></g>')
    for i, m in enumerate(d['motifs'], 1):
        paths = ''.join(f'<path d="{p["d"]}" fill="{p["fill"] or "none"}" stroke="{p["stroke"] or "none"}" stroke-width="{p["strokeMm"]}"'
                        + (f' opacity="{p["opacity"]}"' if p.get("opacity", 1) < 1 else '')
                        + (EVENODD if p["evenodd"] else "") + '/>' for p in m['paths'])
        out.append(f'<g id="motiv-{i}">{paths}</g>')
    keys = field_keys(d['texts'])
    for i, t in enumerate(d['texts'], 1):
        ax, ay = t['anchorMm']; size = t['sizePt'] * PT
        anchor = {'center': 'middle', 'right': 'end'}.get(t['align'], 'start')
        lines = t['text'].split('\n')
        out.append(f'<text id="text-{i}" data-feld="{keys[i - 1]}" x="{ax:.2f}" y="{ay:.2f}" font-family="{esc(t["font"])}" font-size="{size:.2f}" fill="{t["color"] or "#000"}" text-anchor="{anchor}"'
                   + (f' letter-spacing="{t["letterSpacingMm"]:.3f}"' if t.get('letterSpacingMm') else '') + '>'
                   + ''.join(f'<tspan x="{ax:.2f}" dy="{0 if j == 0 else t["lineHeightMm"]:.2f}">{esc(l) or " "}</tspan>' for j, l in enumerate(lines)) + '</text>')
    out.append('</svg>')
    return '\n'.join(out)


# ---------------------------------------------------------------- Lauf

def read_pdf(path, serie, prozess):
    no = re.search(r'D(\d+)', path.stem)
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[0]
        box, plate_obj = find_plate(page)
        warn = []
        if box is None:
            box = (0, 0, page.width, page.height); warn.append('Plattenrand (rote Haarlinie) fehlt – Seite als Platte')
        ox, oy = box[0], box[1]
        W = round((box[2] - box[0]) * PT, 1); H = round((box[3] - box[1]) * PT, 1)
        texts, twarn = text_blocks(page, ox, oy, pua_map(path)); warn += twarn
        vp = vector_paths(path, ox, oy); motifs = cluster(vp)
        gap = 2.0
        while len(motifs) > MAX_MOTIFS and gap < 60:  # Konfigurator: höchstens 20 Elemente je Design
            gap *= 1.6; motifs = cluster(vp, gap)
        imgs = [(round((im['x0'] - ox) * PT, 2), round((im['top'] - oy) * PT, 2), round((im['x1'] - im['x0']) * PT, 2), round((im['bottom'] - im['top']) * PT, 2)) for im in page.images]
    raws = photo_images(path)
    photos = []
    for k, (b, (name, rgba, has_alpha)) in enumerate(zip(imgs, raws), 1):
        sol = solidity(rgba.getchannel('A')) if has_alpha else 1.0
        photos.append({'box': list(b), 'file': f'foto-{k}.png', 'px': list(rgba.size), 'alpha': has_alpha,
                       'solidity': round(sol, 3),
                       # einfache Form (Kreis/Herz/Rechteck) = Beschnitt auch für das Kundenfoto; sonst Rechteck (Freistellen offen)
                       'customerClip': 'maske' if has_alpha and sol >= 0.9 else 'rechteck',
                       'shape': 'circle' if has_alpha and sol >= 0.95 and abs(b[2] / b[3] - 1) < 0.04 and abs(coverage(rgba.getchannel('A')) - math.pi / 4) < 0.05 else 'rect',
                       'placeholder': True, 'engrave': False, '_img': rgba})
    if len(raws) != len(imgs): warn.append(f'Bilder: {len(imgs)} auf der Seite, {len(raws)} gelesen')
    d = {
        'id': f'{path.stem}', 'source': path.name, 'designNo': int(no.group(1)) if no else None,
        'material': 'Schiefer', 'process': prozess, 'form': 'Rechteck',
        'plate': {'widthMm': W, 'heightMm': H, 'source': 'rote Haarlinie'},
        'texts': texts, 'fonts': sorted({t['font'] for t in texts}),
        'motifs': motifs, 'photos': photos, 'warnings': warn,
        'editable': {'move': True, 'texts': True, 'motifs': True, 'photo': True},
        'katalog': {'key': f'{serie}-D{no.group(1) if no else path.stem}', 'series': serie},
    }
    return d


def advance_width(font_file, text, size_pt):
    from fontTools.ttLib import TTFont
    f = TTFont(font_file, lazy=True); cmap = f.getBestCmap() or {}; hmtx = f['hmtx']; upem = f['head'].unitsPerEm
    adv = sum(hmtx[cmap[ord(ch)]][0] for ch in text if ord(ch) in cmap)
    return adv / upem * size_pt * PT


def rescale(t, katalog_fonts):
    """Ersatzschrift auf die Breite der Originalzeile bringen (Schriften laufen unterschiedlich groß:
    Baby Boho Script 26 pt wirkt wie Sacramento 60 pt). Breiteste Zeile zählt; Faktor 0,5–3."""
    file = katalog_fonts.get(t['font'])
    if not file or not t.get('lineWidthsMm'): return
    lines = t['text'].split('\n'); i = max(range(len(lines)), key=lambda k: t['lineWidthsMm'][k] if k < len(t['lineWidthsMm']) else 0)
    w = advance_width(file, lines[i], t['sizePt'])
    if w <= 0: return
    k = max(0.5, min(3.0, t['lineWidthsMm'][i] / w))
    if abs(k - 1) < 0.03: return
    t['sizePtOriginal'] = t['sizePt']; t['sizePt'] = round(t['sizePt'] * k, 2); t['lineHeightMm'] = round(t['lineHeightMm'] * (k if len(lines) == 1 else 1), 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pdf', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--zuordnung', help='JSON {"D204": {"zielgruppe": "Tiere", "unterkategorie": "Hund", "themen": […]}, …}')
    ap.add_argument('--ersatz', help='JSON {"<Schrift wie im PDF>": "<freigegebene Schrift>"} – Original bleibt als fontOriginal stehen')
    ap.add_argument('--katalog', help='Katalog-Repo: Schriftdateien für die Größenanpassung der Ersatzschriften')
    ap.add_argument('--flach', action='store_true', help='Master-Ablage: <out>/<Design-ID>/ statt Zielgruppe/Unterkategorie/…')
    ap.add_argument('--serie', default='gravur-schiefer-22x14'); ap.add_argument('--prozess', default='Gravur')
    a = ap.parse_args()
    zu = json.loads(Path(a.zuordnung).read_text()) if a.zuordnung else {}
    ersatz = {k: v for k, v in (json.loads(Path(a.ersatz).read_text()) if a.ersatz else {}).items() if not k.startswith('_')}
    katalog_fonts = {}
    if a.katalog:
        for f in json.loads((Path(a.katalog) / 'schriften/schriften.json').read_text())['fonts']:
            if f.get('file'): katalog_fonts[f['name']] = Path(a.katalog) / f['file']
    out = Path(a.out); index = []
    for pdf in sorted(Path(a.pdf).glob('*.pdf')):
        d = read_pdf(pdf, a.serie, a.prozess)
        key = f'D{d["designNo"]}'
        z = zu.get(key, {})
        tgt = out / d['id'] if a.flach else out / z.get('zielgruppe', 'Unsortiert') / z.get('unterkategorie', 'Allgemein') / d['katalog']['key']
        tgt.mkdir(parents=True, exist_ok=True)
        for t in d['texts']:  # sichtbar geprüfte Korrekturen (z. B. Ligatur ohne lesbaren Glyphnamen)
            for a_, b_ in (z.get('textFix') or {}).items():
                if a_ in t['text']: t['text'] = t['text'].replace(a_, b_); d['warnings'] = [w for w in d['warnings'] if 'Sonderglyphe' not in w]
            name = t['font'] + (' ' + t['fontStyle'] if t.get('fontStyle') else '')
            if name in ersatz or t['font'] in ersatz:
                t['fontOriginal'] = name; t['font'] = ersatz.get(name, ersatz.get(t['font']))
                if name != t['font']: rescale(t, katalog_fonts)
        d['fonts'] = sorted({t['font'] for t in d['texts']})
        d['fontsOriginal'] = sorted({t.get('fontOriginal') for t in d['texts'] if t.get('fontOriginal')})
        if z.get('hinweis'): d['warnings'].append(z['hinweis'])
        d['themes'] = [] if z.get('gesperrt') else z.get('themen', [])
        if z.get('gesperrt'): d['katalog']['gesperrt'] = True
        d['katalog'].update({'zielgruppe': z.get('zielgruppe'), 'unterkategorie': z.get('unterkategorie'), 'themen': z.get('themen', [])})
        big = max(d['texts'], key=lambda t: t['sizePt']) if d['texts'] else None
        d['name'] = f'{key} {big["text"].splitlines()[0]}' if big else key
        d['plateMm'] = [d['plate']['widthMm'], d['plate']['heightMm']]
        d['movable'] = True  # alle Elemente inkl. Foto verschiebbar (Vorgabe Chris 20.10.2026)
        d.pop('editable', None)
        for i, f in enumerate(d['photos'], 1):
            f.pop('_img').save(tgt / f['file'], optimize=True)
        (tgt / 'design.svg').write_text(design_svg(d))
        subprocess.run(['pdftoppm', '-r', '150', '-png', '-singlefile', str(pdf), str(tgt / 'original')], check=True)
        (tgt / 'design.json').write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
        index.append({'key': d['id'], 'name': d['name'], 'pfad': str(tgt.relative_to(out)), 'zielgruppe': z.get('zielgruppe'), 'unterkategorie': z.get('unterkategorie'),
                      'themen': d['themes'], 'texte': len(d['texts']), 'motive': len(d['motifs']), 'fotos': len(d['photos']),
                      'schriften': d['fonts'], 'schriftenOriginal': d['fontsOriginal'], 'warnungen': d['warnings']})
        print(f'{key}: {len(d["texts"])} Texte, {len(d["motifs"])} Motive, {len(d["photos"])} Foto ({",".join(f["shape"] for f in d["photos"])}), Schriften {", ".join(d["fonts"])}{"  ⚠ " + "; ".join(d["warnings"]) if d["warnings"] else ""}')
    (out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
