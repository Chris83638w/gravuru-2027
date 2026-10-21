"""CDR-Werkzeug ohne CorelDRAW: liest .cdr über libcdr (`cdr2raw`) und liefert Maße in mm.

Befehle (Ausgabe JSON auf stdout, Fehler als {"error": ...} mit Exitcode 2):

    python3 cdr_engine.py info    datei.cdr
    python3 cdr_engine.py measure datei.cdr [--page N] [--max 400]
    python3 cdr_engine.py texts   datei.cdr [--page N] [--max 2000]
    python3 cdr_engine.py svg     datei.cdr --out seite.svg [--page N]
    python3 cdr_engine.py png     datei.cdr --out seite.png [--page N] [--px 1600]

Nur Standardbibliothek; `png` braucht zusätzlich CairoSVG. Bitmaps werden nicht gelesen
(Bitmap-Speicher wird vor dem Lesen genullt): Maße, Texte und Pfade bleiben vollständig,
Bitmap-Rahmen erscheinen als Rahmen. Nichts wird geschätzt: was libcdr nicht liefert,
fehlt im Ergebnis und steht in `hinweise`.

Bekannte libcdr-Eigenheiten (geprüft an Gravuru-Bögen, siehe STAND.md im Katalog):
- Textbox: Tintenhöhe stimmt, Breite ist doppelt (zentriert [C−w, C+w]) → korrigiert.
- Von Corel horizontal gestauchte Texte erscheinen mit natürlicher Breite.
- Gedrehter Text erscheint nur als hohe, schmale Box.
"""
import json, math, os, re, subprocess, sys, tempfile, zipfile
from pathlib import Path

IN = 25.4
PT = 25.4 / 72
CDR2RAW = os.environ.get('CDR2RAW', 'cdr2raw')
TIMEOUT = int(os.environ.get('CDR_TIMEOUT_S', '150'))
PROP = re.compile(r'([a-z0-9:-]+): ([^,()]+?)(?=, [a-z0-9:-]+: |\)$|$)')
NUM = re.compile(r'-?\d+(?:\.\d+)?(?:e-?\d+)?')
HOLE_MAX_MM = 12.0     # Kreis bis Ø 12 mm = Bohrloch
PLATE_MIN_MM = 8.0     # geschlossene Kontur ab 8 mm in beiden Richtungen = Platte/Form


class EngineError(Exception):
    pass


def props(s):
    return {k: v.strip() for k, v in PROP.findall(s)}


def length_mm(v):
    """'1.2in' / '20.5pt' / '3mm' → mm"""
    if not v: return 0.0
    m = NUM.search(v)
    if not m: return 0.0
    x = float(m.group(0)); unit = v[m.end():].strip()
    if unit.startswith('pt'): return x * PT
    if unit.startswith('mm'): return x
    if unit.startswith('cm'): return x * 10
    return x * IN  # libcdr: Standard ist Zoll


def r2(v): return round(v + 0.0, 2)


# ---------------------------------------------------------------- Einlesen

MAX_UNZIP = 2000 * 1024 * 1024       # Summe aller entpackten Einträge (Schutz vor Zip-Bomben)
MAX_RAW = 1000 * 1024 * 1024         # größte cdr2raw-Ausgabe
MEM_MB = int(os.environ.get('CDR_MEM_MB', '3072'))


def limit_child():
    """Grenzen für cdr2raw: Arbeitsspeicher und Dateigröße (nur Linux/Unix)."""
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (MEM_MB * 1024 * 1024,) * 2)
        resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_RAW + 1,) * 2)
    except Exception:
        pass


def light_copy(cdr, tmpdir):
    """Kopie mit genulltem Bitmap-Speicher (libcdr liest dann Sekunden statt Minuten, ohne Bitmaps)."""
    try:
        z = zipfile.ZipFile(cdr)
    except zipfile.BadZipFile:
        return cdr, False  # ältere CDR (vor X4) sind kein ZIP – libcdr liest sie direkt
    with z:
        infos = z.infolist()
        if sum(i.file_size for i in infos) > MAX_UNZIP or len(infos) > 20000:
            raise EngineError('Datei ist entpackt zu groß (über 2 GB) – bitte Bilder aus der Datei entfernen oder Seiten einzeln speichern')
        if not any(i.filename.lower().endswith('bitmaps.dat') for i in infos):
            return cdr, False
        dst_path = Path(tmpdir) / 'light.cdr'
        block = bytes(1 << 20)
        with zipfile.ZipFile(dst_path, 'w') as dst:
            # librevenge liest keine Zip64-Einträge: klassische Einträge, blockweise kopiert und mitgezählt
            for i in infos:
                if i.is_dir(): continue
                zi = zipfile.ZipInfo(i.filename, date_time=i.date_time)
                zi.compress_type = zipfile.ZIP_STORED if i.filename == 'mimetype' else zipfile.ZIP_DEFLATED
                zi.file_size = i.file_size
                with dst.open(zi, 'w') as out:
                    if i.filename.lower().endswith('bitmaps.dat'):
                        left = i.file_size
                        while left > 0:
                            n = min(left, len(block)); out.write(block[:n]); left -= n
                    else:
                        got = 0
                        with z.open(i) as src:
                            while True:
                                b = src.read(1 << 20)
                                if not b: break
                                got += len(b)
                                if got > i.file_size: raise EngineError('Datei ist beschädigt (Größenangabe falsch)')
                                out.write(b)
        return dst_path, True


def raw_lines(cdr):
    with tempfile.TemporaryDirectory() as td:
        try:
            src, light = light_copy(cdr, td)
        except EngineError:
            raise
        except (zipfile.BadZipFile, zipfile.LargeZipFile, NotImplementedError, RuntimeError, EOFError, OSError, ValueError) as e:
            raise EngineError('Datei ist beschädigt oder verschlüsselt (' + type(e).__name__ + ')')
        except Exception as e:
            import zlib
            if isinstance(e, zlib.error): raise EngineError('Datei ist beschädigt (Kompression)')
            raise
        raw_path = Path(td) / 'raw.txt'
        try:
            with open(raw_path, 'wb') as out, open(Path(td) / 'err.txt', 'wb') as errf:
                proc = subprocess.Popen([CDR2RAW, str(src)], stdout=out, stderr=errf, preexec_fn=limit_child if os.name == 'posix' else None)
                try:
                    proc.wait(timeout=TIMEOUT)
                except subprocess.TimeoutExpired:
                    proc.kill(); proc.wait()
                    raise EngineError(f'libcdr brauchte länger als {TIMEOUT} s – Datei zu komplex')
        except FileNotFoundError:
            raise EngineError('cdr2raw (libcdr) ist auf dem Server nicht installiert')
        if raw_path.stat().st_size > MAX_RAW:
            raise EngineError('Datei ist zu komplex (Ausgabe über 1 GB)')
        lines = []; has_page = False
        with open(raw_path, 'rb') as f:
            for raw in f:
                if b'drawGraphicObject' in raw[:80]:
                    raw = raw[:80] + b' ... ' + raw.rstrip(b'\n')[-600:]  # Bilddaten weg, Lage/Größe stehen am Ende
                line = raw.decode('utf-8', 'replace').rstrip('\n')
                if not has_page and line.lstrip().startswith('startPage'): has_page = True
                lines.append(line)
        if not has_page:
            msg = (Path(td) / 'err.txt').read_bytes().decode('utf-8', 'replace').strip()[:200]
            if proc.returncode and proc.returncode < 0: msg = 'libcdr abgebrochen (Speichergrenze)'
            raise EngineError('Datei ist keine lesbare CorelDRAW-Datei' + (f' ({msg})' if msg else ''))
        return lines, light


def path_actions(d):
    acts = []
    for part in re.findall(r'\(([^()]*)\)', d):
        p = props(part)
        a = p.get('librevenge:path-action')
        if a: acts.append((a, p))
    return acts


def subpaths(acts):
    """→ Liste von Teilpfaden: {'pts': [(x,y) mm, …] (Kurven abgetastet), 'curved': bool, 'closed': bool, 'segs': [...]}"""
    out = []; cur = None; last = (0.0, 0.0)
    def pt(p, kx='svg:x', ky='svg:y'): return (length_mm(p.get(kx)), length_mm(p.get(ky)))
    for a, p in acts:
        if a == 'M':
            last = pt(p); cur = {'pts': [last], 'curved': False, 'closed': False, 'segs': [('M', last)]}; out.append(cur)
            continue
        if cur is None:
            cur = {'pts': [last], 'curved': False, 'closed': False, 'segs': [('M', last)]}; out.append(cur)
        if a == 'L':
            last = pt(p); cur['pts'].append(last); cur['segs'].append(('L', last))
        elif a == 'C':
            p0 = last; c1 = pt(p, 'svg:x1', 'svg:y1'); c2 = pt(p, 'svg:x2', 'svg:y2'); p3 = pt(p)
            for i in range(1, 17):
                t = i / 16; u = 1 - t
                cur['pts'].append((u**3*p0[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t**3*p3[1]))
            cur['curved'] = True; cur['segs'].append(('C', c1, c2, p3)); last = p3
        elif a == 'Q':
            p0 = last; c1 = pt(p, 'svg:x1', 'svg:y1'); p2 = pt(p)
            for i in range(1, 13):
                t = i / 12; u = 1 - t
                cur['pts'].append((u*u*p0[0] + 2*u*t*c1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*c1[1] + t*t*p2[1]))
            cur['curved'] = True; cur['segs'].append(('Q', c1, p2)); last = p2
        elif a == 'A':
            p1 = pt(p); cur['pts'].append(p1); cur['curved'] = True
            cur['segs'].append(('A', length_mm(p.get('svg:rx')), length_mm(p.get('svg:ry')), float(NUM.search(p.get('librevenge:rotate', '0') or '0').group(0)) if p.get('librevenge:rotate') else 0.0,
                                1 if p.get('librevenge:large-arc') == 'true' else 0, 1 if p.get('librevenge:sweep') == 'true' else 0, p1))
            last = p1
        elif a == 'Z':
            cur['closed'] = True; cur['segs'].append(('Z',))
            last = cur['pts'][0]
    for s in out:
        if not s['closed'] and len(s['pts']) > 2 and math.dist(s['pts'][0], s['pts'][-1]) < 0.01: s['closed'] = True
    return [s for s in out if len(s['pts']) > 1]


def parse(cdr):
    """→ {'pages': [{'widthMm','heightMm','paths':[...],'texts':[...],'images':[...]}], 'light': bool}"""
    lines, light = raw_lines(cdr)
    pages = []; page = None; style = {}; text = None; layer = 0
    for line in lines:
        s = line.strip()
        if not s: continue
        if s.startswith('startPage'):
            p = props(s[s.find('(') + 1:-1])
            page = {'widthMm': r2(length_mm(p.get('svg:width'))), 'heightMm': r2(length_mm(p.get('svg:height'))), 'paths': [], 'texts': [], 'images': []}
            pages.append(page); continue
        if page is None: continue
        if s.startswith('startLayer'): layer += 1; continue
        if s.startswith('endLayer'): layer -= 1; continue
        if s.startswith('setStyle'):
            style = props(s[len('setStyle('):-1]); continue
        if s.startswith('drawPath') or s.startswith('drawPolygon') or s.startswith('drawPolyline'):
            sp = subpaths(path_actions(s))
            if sp:
                stroke = style.get('draw:stroke', 'none') != 'none'
                fill = style.get('draw:fill', 'none') not in ('none', '')
                page['paths'].append({'sub': sp, 'stroke': style.get('svg:stroke-color', '#000000') if stroke else None,
                                      'strokeMm': r2(length_mm(style.get('svg:stroke-width'))) if stroke else None,
                                      'fill': (style.get('draw:fill-color') or '#000000') if fill and style.get('draw:fill') == 'solid' else ('Verlauf' if fill else None),
                                      'evenodd': style.get('svg:fill-rule') == 'evenodd'})
            continue
        if s.startswith('drawRectangle') or s.startswith('drawEllipse'):
            p = props(s[s.find('(') + 1:-1])  # libcdr gibt fast alles als Pfad aus; Sicherheitsnetz
            continue
        if s.startswith('drawGraphicObject'):
            p = props(s.rsplit(' ... ', 1)[-1].rstrip(')'))
            if 'svg:x' in p and 'svg:width' in p:
                x, y, w, h = (length_mm(p.get(k)) for k in ('svg:x', 'svg:y', 'svg:width', 'svg:height'))
                page['images'].append({'x': r2(x), 'y': r2(y), 'w': r2(w), 'h': r2(h)})
            continue
        if s.startswith('startTextObject'):
            p = props(s[s.find('(') + 1:-1])
            x, y, w, h = (length_mm(p.get(k)) for k in ('svg:x', 'svg:y', 'svg:width', 'svg:height'))
            text = {'box': [x, y, w, h], 'paras': []}; continue
        if text is not None:
            if s.startswith('openParagraph'):
                p = props(s[s.find('(') + 1:-1]) if '(' in s else {}
                text['paras'].append({'align': p.get('fo:text-align', 'left'), 'spans': []})
            elif s.startswith('openSpan'):
                p = props(s[len('openSpan('):-1])
                if not text['paras']: text['paras'].append({'align': 'left', 'spans': []})
                text['paras'][-1]['spans'].append({'font': p.get('style:font-name', ''), 'sizePt': round(float(NUM.search(p.get('fo:font-size', '0')).group(0)), 2) if p.get('fo:font-size') else None,
                                                   'color': p.get('fo:color'), 'bold': p.get('fo:font-weight') == 'bold', 'italic': p.get('fo:font-style') == 'italic', 'text': ''})
            elif s.startswith('insertText'):
                m = re.match(r'insertText \((.*)\)$', s)
                if m and text['paras'] and text['paras'][-1]['spans']: text['paras'][-1]['spans'][-1]['text'] += m.group(1).replace('​', '')
            elif s.startswith('insertLineBreak'):
                if text['paras'] and text['paras'][-1]['spans']: text['paras'][-1]['spans'][-1]['text'] += '\n'
            elif s.startswith('insertSpace') or s.startswith('insertTab'):
                if text['paras'] and text['paras'][-1]['spans']: text['paras'][-1]['spans'][-1]['text'] += ' '
            elif s.startswith('endTextObject'):
                page['texts'].append(finish_text(text)); text = None
    if not pages: raise EngineError('keine Seite gefunden')
    return {'pages': pages, 'light': light}


def finish_text(t):
    x, y, w, h = t['box']
    al = t['paras'][0]['align'] if t['paras'] else 'left'
    w2 = w / 2  # libcdr meldet doppelte Breite
    x0 = x + (w2 / 2 if al == 'center' else w2 if al in ('right', 'end') else 0)
    plain = '\n'.join(''.join(sp['text'] for sp in p['spans']) for p in t['paras']).strip()
    spans = [sp for p in t['paras'] for sp in p['spans'] if sp['text'].strip()]
    fonts = []
    for sp in spans:
        k = (sp['font'], sp['sizePt'], sp['bold'], sp['italic'])
        if k not in fonts: fonts.append(k)
    colors = sorted({sp['color'] for sp in spans if sp['color']})
    return {'text': plain, 'x': r2(x0), 'y': r2(y), 'w': r2(w2), 'h': r2(h), 'align': al,
            'fonts': [{'font': f, 'sizePt': s, 'capHeightMmCa': r2(s * PT * 0.7) if s else None, 'bold': b, 'italic': i} for f, s, b, i in fonts],
            'colors': colors, 'paras': t['paras']}


# ---------------------------------------------------------------- Geometrie

def poly_area(pts):
    a = 0.0
    for i in range(len(pts) - 1): a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    a += pts[-1][0] * pts[0][1] - pts[0][0] * pts[-1][1]
    return a / 2


def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def inside(pt, poly):
    x, y = pt; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c


def seg_dist(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def contour_dist(p, poly):
    return min(seg_dist(p, poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly)))


def ray_hits(p, poly, axis):
    """Schnittpunkte einer waagerechten (axis='x') bzw. senkrechten Linie durch p mit der Kontur."""
    hits = []; n = len(poly)
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        if axis == 'x' and (y1 > p[1]) != (y2 > p[1]): hits.append(x1 + (p[1] - y1) * (x2 - x1) / (y2 - y1))
        if axis == 'y' and (x1 > p[0]) != (x2 > p[0]): hits.append(y1 + (p[0] - x1) * (y2 - y1) / (x2 - x1))
    return sorted(hits)


def classify(sp):
    pts = sp['pts']; x0, y0, x1, y1 = bbox(pts); w, h = x1 - x0, y1 - y0
    A = abs(poly_area(pts)) if sp['closed'] else 0.0
    out = {'x': x0, 'y': y0, 'w': w, 'h': h, 'area': A}
    if not sp['closed'] or w <= 0 or h <= 0:
        out['form'] = 'offene Linie'; return out
    ratio = A / (w * h)
    if not sp['curved'] and len(pts) in (4, 5) and ratio > 0.995:
        out['form'] = 'Quadrat' if abs(w - h) < 0.05 else 'Rechteck'
    elif (sp['curved'] or len(pts) >= 12) and abs(ratio - math.pi / 4) < 0.012 and is_ellipse(pts, x0, y0, w, h):
        # auch als Vieleck gezeichnete Kreise (z. B. 80 Punkte) zählen – entscheidend ist die Geometrie
        out['form'] = 'Kreis' if abs(w - h) / max(w, h) < 0.01 else 'Oval (Ellipse)'
    elif sp['curved'] and math.pi / 4 + 0.012 <= ratio < 0.999:
        # abgerundetes Rechteck? Fläche = w·h − (4 − π)·r²
        r = math.sqrt(max(0.0, (w * h - A) / (4 - math.pi)))
        straight = sum(1 for s in sp['segs'] if s[0] == 'L')
        if r < min(w, h) / 2 - 0.05 and (straight >= 2 or r < min(w, h) * 0.45) and edges_straight(pts, x0, y0, x1, y1, r):
            out['form'] = 'Rechteck mit runden Ecken'; out['eckenradius'] = r2(r)
        else:
            out['form'] = 'Freiform'
    else:
        out['form'] = 'Freiform'
    return out


def is_ellipse(pts, x0, y0, w, h):
    cx, cy, a, b = x0 + w / 2, y0 + h / 2, w / 2, h / 2
    return all(abs(math.hypot((x - cx) / a, (y - cy) / b) - 1) < 0.02 for x, y in pts)


def edges_straight(pts, x0, y0, x1, y1, r):
    """Liegen die Kanten (außerhalb der Ecken) auf der Bounding-Box? Unterscheidet Langloch/Rechteck von Freiformen."""
    tol = 0.05; on = 0; mid = 0
    for x, y in pts:
        if x0 + r + tol < x < x1 - r - tol or y0 + r + tol < y < y1 - r - tol:
            mid += 1
            if min(abs(x - x0), abs(x - x1), abs(y - y0), abs(y - y1)) < tol: on += 1
    return mid == 0 or on / mid > 0.98


def shapes_of(page):
    """Alle geschlossenen Formen der Seite mit Klassifikation."""
    shapes = []
    for pi, p in enumerate(page['paths']):
        n_sub = len(p['sub'])
        for si, sp in enumerate(p['sub']):
            c = classify(sp)
            c.update({'path': pi, 'sub': si, 'nSub': n_sub, 'stroke': p['stroke'], 'strokeMm': p['strokeMm'], 'fill': p['fill'], 'poly': sp['pts'], 'closed': sp['closed']})
            shapes.append(c)
    return shapes


def line_rects(page, tol=0.05):
    """Platten, die als einzelne Schnittlinien gezeichnet sind (Bögen mit gemeinsamen Kanten):
    waagerechte/senkrechte Linienstücke sammeln und die kleinsten rundum geschlossenen Rechtecke bilden."""
    hs, vs = [], []
    for p in page['paths']:
        if not p['stroke']: continue
        for sp in p['sub']:
            if sp['closed'] or sp['curved']: continue
            pts = sp['pts']
            for a, b in zip(pts, pts[1:]):
                if abs(a[1] - b[1]) < tol and abs(a[0] - b[0]) >= PLATE_MIN_MM: hs.append((a[1], min(a[0], b[0]), max(a[0], b[0]), p))
                elif abs(a[0] - b[0]) < tol and abs(a[1] - b[1]) >= PLATE_MIN_MM: vs.append((a[0], min(a[1], b[1]), max(a[1], b[1]), p))
    if not hs or not vs or len(hs) * len(vs) > 4_000_000: return []
    def covered(segs, at, lo, hi):
        """Ist die Strecke lo..hi auf Höhe/Spalte `at` lückenlos von Segmenten bedeckt?"""
        parts = sorted((s[1], s[2]) for s in segs if abs(s[0] - at) < tol and s[2] > lo - tol and s[1] < hi + tol)
        pos = lo
        for a, b in parts:
            if a > pos + tol: return False
            pos = max(pos, b)
            if pos >= hi - tol: return True
        return pos >= hi - tol
    xs = sorted({round(v[0], 2) for v in vs}); ys = sorted({round(h[0], 2) for h in hs})
    rects = set()
    for top in ys:
        for left in xs:
            if not any(abs(h[0] - top) < tol and h[1] - tol <= left < h[2] - tol for h in hs): continue
            if not any(abs(v[0] - left) < tol and v[1] - tol <= top < v[2] - tol for v in vs): continue
            found = None
            for right in (x for x in xs if x > left + PLATE_MIN_MM - tol):
                if not covered(hs, top, left, right): break
                if not any(abs(v[0] - right) < tol and v[1] - tol <= top < v[2] - tol for v in vs): continue
                for bottom in (y for y in ys if y > top + PLATE_MIN_MM - tol):
                    if not (covered(vs, left, top, bottom) and covered(vs, right, top, bottom)): break
                    if covered(hs, bottom, left, right): found = (left, top, right, bottom); break
                if found: break
            if found: rects.add(found)
    out = []
    for l, t, r, b in sorted(rects, key=lambda q: (q[1], q[0])):
        seg = next((h for h in hs if abs(h[0] - t) < tol and h[1] - tol <= l < h[2]), None)
        p = seg[3] if seg else {'stroke': None, 'strokeMm': None}
        out.append({'x': l, 'y': t, 'w': r - l, 'h': b - t, 'area': (r - l) * (b - t), 'form': 'Quadrat' if abs((r - l) - (b - t)) < 0.05 else 'Rechteck',
                    'ausLinien': True, 'path': -1, 'sub': -1, 'nSub': 1, 'stroke': p['stroke'], 'strokeMm': p['strokeMm'], 'fill': None,
                    'poly': [(l, t), (r, t), (r, b), (l, b)], 'closed': True})
    return out


def color_name(c):
    if not c: return None
    c = c.lower()
    names = {'#ff0000': 'rot', '#000000': 'schwarz', '#ffffff': 'weiß', '#0000ff': 'blau', '#00ff00': 'grün', '#000f00': 'fast schwarz (#000f00)', '#ffff00': 'gelb', '#ff00ff': 'magenta', '#00ffff': 'cyan'}
    return names.get(c, c)


def measure_page(page, max_plates=400):
    shapes = shapes_of(page)
    holes, plates, other = [], [], 0
    for s in shapes:
        if not s['closed']: continue
        if s['form'] == 'Kreis' and s['w'] <= HOLE_MAX_MM:
            holes.append(s)
        elif s['w'] >= PLATE_MIN_MM and s['h'] >= PLATE_MIN_MM:
            # Text in Kurven/Motive: gefüllte Pfade mit vielen Teilpfaden, ohne Kontur → keine Platte
            if s['nSub'] > 6 and not s['stroke']: other += 1; continue
            plates.append(s)
        else:
            other += 1
    plates += line_rects(page)
    # Gefüllte Flächen (oder Flächen ohne Kontur), die in einer Platte liegen, sind Motive/Gestaltung – keine Platten
    def encloses(o, s):
        return o is not s and o['w'] * o['h'] > s['w'] * s['h'] and o['x'] - 0.01 <= s['x'] and o['y'] - 0.01 <= s['y'] and s['x'] + s['w'] <= o['x'] + o['w'] + 0.01 and s['y'] + s['h'] <= o['y'] + o['h'] + 0.01 and inside((s['x'] + s['w'] / 2, s['y'] + s['h'] / 2), o['poly'])
    keep = []
    for s in plates:
        if (s['fill'] or not s['stroke']) and any(encloses(o, s) for o in plates): other += 1
        else: keep.append(s)
    plates = keep
    # Doppelte Konturen (Füllung + Linie übereinander) zusammenfassen
    def dedupe(items):
        out = []
        for s in sorted(items, key=lambda s: (round(s['y'], 1), round(s['x'], 1))):
            twin = next((o for o in out if abs(o['x'] - s['x']) < 0.05 and abs(o['y'] - s['y']) < 0.05 and abs(o['w'] - s['w']) < 0.05 and abs(o['h'] - s['h']) < 0.05 and o['form'] == s['form']), None)
            if twin:
                twin['doppelt'] = twin.get('doppelt', 1) + 1
                if s['stroke'] and not twin['stroke']: twin['stroke'], twin['strokeMm'] = s['stroke'], s['strokeMm']
                if s['fill'] and not twin['fill']: twin['fill'] = s['fill']
            else:
                out.append(s)
        return out
    plates = dedupe(plates); holes = dedupe(holes)
    # Eltern: kleinste umschließende Platte
    for s in plates:
        cands = [o for o in plates if o is not s and o['w'] * o['h'] > s['w'] * s['h'] and o['x'] - 0.01 <= s['x'] and o['y'] - 0.01 <= s['y'] and s['x'] + s['w'] <= o['x'] + o['w'] + 0.01 and s['y'] + s['h'] <= o['y'] + o['h'] + 0.01 and inside((s['x'] + s['w'] / 2, s['y'] + s['h'] / 2), o['poly'])]
        s['parent'] = min(cands, key=lambda o: o['w'] * o['h']) if cands else None
    for h in holes:
        c = (h['x'] + h['w'] / 2, h['y'] + h['h'] / 2)
        cands = [o for o in plates if inside(c, o['poly'])]
        h['plate'] = min(cands, key=lambda o: o['w'] * o['h']) if cands else None
    texts = page['texts']
    for t in texts:
        c = (t['x'] + t['w'] / 2, t['y'] + t['h'] / 2)
        cands = [o for o in plates if inside(c, o['poly'])]
        t['_plate'] = min(cands, key=lambda o: o['w'] * o['h']) if cands else None
    # Reihenfolge: Zeilen von oben nach unten, je Zeile von links nach rechts
    plates.sort(key=lambda s: (round(s['y'] / 5), s['x']))
    for i, s in enumerate(plates, 1): s['nr'] = i
    out_plates = []
    for s in plates[:max_plates]:
        hs = sorted([h for h in holes if h['plate'] is s], key=lambda h: (round(h['y'] + h['h'] / 2, 1), h['x']))
        hole_out = []
        for h in hs:
            cx, cy = h['x'] + h['w'] / 2, h['y'] + h['h'] / 2
            e = {'mitteX': r2(cx - s['x']), 'mitteY': r2(cy - s['y']), 'durchmesser': r2((h['w'] + h['h']) / 2),
                 'randLinks': r2(cx - s['x']), 'randRechts': r2(s['x'] + s['w'] - cx), 'randOben': r2(cy - s['y']), 'randUnten': r2(s['y'] + s['h'] - cy)}
            if s['form'] not in ('Rechteck', 'Quadrat'):
                e['kleinsterAbstandZurKontur'] = r2(contour_dist((cx, cy), s['poly']))
                hx = ray_hits((cx, cy), s['poly'], 'x'); hy = ray_hits((cx, cy), s['poly'], 'y')
                lft = [x for x in hx if x < cx]; rgt = [x for x in hx if x > cx]; top = [y for y in hy if y < cy]; bot = [y for y in hy if y > cy]
                if lft and rgt: e['konturLinksAufLochhoehe'], e['konturRechtsAufLochhoehe'] = r2(cx - max(lft)), r2(min(rgt) - cx)
                if top and bot: e['konturObenSenkrecht'], e['konturUntenSenkrecht'] = r2(cy - max(top)), r2(min(bot) - cy)
            if h['stroke']: e['linie'] = color_name(h['stroke'])
            if h['fill']: e['fuellung'] = color_name(h['fill'])
            hole_out.append(e)
        spacing = []
        for a, b in zip(hole_out, hole_out[1:]):
            if abs(a['mitteY'] - b['mitteY']) < 0.3: spacing.append({'richtung': 'waagerecht', 'abstandMitteMitte': r2(b['mitteX'] - a['mitteX'])})
        cols = sorted(hole_out, key=lambda e: (round(e['mitteX'], 1), e['mitteY']))
        for a, b in zip(cols, cols[1:]):
            if abs(a['mitteX'] - b['mitteX']) < 0.3: spacing.append({'richtung': 'senkrecht', 'abstandMitteMitte': r2(b['mitteY'] - a['mitteY'])})
        labels = [(t['text'][:77] + '…') if len(t['text']) > 80 else t['text'] for t in texts if t['_plate'] is s and t['text']][:6]
        e = {'nr': s['nr'], 'form': s['form'], 'breite': r2(s['w']), 'hoehe': r2(s['h']), 'x': r2(s['x']), 'y': r2(s['y'])}
        if 'eckenradius' in s: e['eckenradius'] = s['eckenradius']
        if s['form'] not in ('Rechteck', 'Quadrat'): e['flaecheCm2'] = round(s['area'] / 100, 2)
        if s['stroke']: e['linie'] = color_name(s['stroke']); e['linienstaerke'] = s['strokeMm']
        if s['fill']: e['fuellung'] = color_name(s['fill'])
        if s.get('doppelt'): e['konturMehrfach'] = s['doppelt']
        if s.get('ausLinien'): e['ausEinzellinien'] = True
        if s['parent'] is not None: e['liegtIn'] = s['parent']['nr']
        e['bohrloecher'] = hole_out
        if spacing: e['lochabstaende'] = spacing
        if labels: e['texte'] = labels
        out_plates.append(e)
    loose = [{'mitteX': r2(h['x'] + h['w'] / 2), 'mitteY': r2(h['y'] + h['h'] / 2), 'durchmesser': r2((h['w'] + h['h']) / 2)} for h in holes if h['plate'] is None]
    for t in texts: t.pop('_plate', None)
    sizes = {}
    for s in plates:
        k = f"{fmt(s['w'] / 10)}x{fmt(s['h'] / 10)} cm {s['form']}, {sum(1 for h in holes if h['plate'] is s)} Loch"
        sizes[k] = sizes.get(k, 0) + 1
    return {'seitenmass': {'breite': page['widthMm'], 'hoehe': page['heightMm']}, 'anzahlPlatten': len(plates), 'anzahlBohrloecher': len(holes),
            'groessen': [{'groesse': k, 'anzahl': v} for k, v in sorted(sizes.items(), key=lambda kv: -kv[1])],
            'platten': out_plates, 'loseBohrloecher': loose[:200], 'sonstigeFormen': other, 'texteGesamt': len(texts), 'bitmapRahmen': len(page['images']),
            'gekuerzt': len(plates) > max_plates}


def fmt(v):
    return ('%g' % round(v, 2)).replace('.', ',')


# ---------------------------------------------------------------- SVG / PNG

def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def seg_d(segs):
    f = lambda v: f'{v:.3f}'.rstrip('0').rstrip('.')
    out = []
    for s in segs:
        if s[0] in ('M', 'L'): out.append(f'{s[0]}{f(s[1][0])} {f(s[1][1])}')
        elif s[0] == 'C': out.append(f'C{f(s[1][0])} {f(s[1][1])} {f(s[2][0])} {f(s[2][1])} {f(s[3][0])} {f(s[3][1])}')
        elif s[0] == 'Q': out.append(f'Q{f(s[1][0])} {f(s[1][1])} {f(s[2][0])} {f(s[2][1])}')
        elif s[0] == 'A': out.append(f'A{f(s[1])} {f(s[2])} {f(s[3])} {s[4]} {s[5]} {f(s[6][0])} {f(s[6][1])}')
        elif s[0] == 'Z': out.append('Z')
    return ' '.join(out)


def page_svg(page, title='', min_stroke=0.05):
    W, H = page['widthMm'], page['heightMm']
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">',
         f'<title>{esc(title)}</title>' if title else '', '<g id="pfade">']
    for p in page['paths']:
        d = ' '.join(seg_d(sp['segs']) for sp in p['sub'])
        fill = p['fill'] if p['fill'] and p['fill'].startswith('#') else ('#888888' if p['fill'] else 'none')
        st = f' stroke="{p["stroke"]}" stroke-width="{round(max(p["strokeMm"] or 0.1, min_stroke), 3)}"' if p['stroke'] else ''
        rule = ' fill-rule="evenodd"' if p['evenodd'] else ''
        o.append(f'<path d="{d}" fill="{fill}"{st}{rule}/>')
    o.append('</g><g id="bitmaps">')
    for im in page['images']:
        o.append(f'<rect x="{im["x"]}" y="{im["y"]}" width="{im["w"]}" height="{im["h"]}" fill="none" stroke="#999" stroke-width="0.3" stroke-dasharray="2 1"><title>Bitmap (nicht übertragen)</title></rect>')
    o.append('</g><g id="texte">')
    for t in page['texts']:
        if not t['text']: continue
        anchor = {'center': 'middle', 'right': 'end', 'end': 'end'}.get(t['align'], 'start')
        x = t['x'] + (t['w'] / 2 if anchor == 'middle' else t['w'] if anchor == 'end' else 0)
        f0 = t['fonts'][0] if t['fonts'] else {'font': '', 'sizePt': 10, 'bold': False, 'italic': False}
        size = (f0['sizePt'] or 10) * PT
        lines = t['text'].split('\n'); n = len(lines)
        # Grundlinie: Box = Tintenhöhe; erste Zeile ≈ Oberkante + Versalhöhe
        y = t['y'] + min(size * 0.72, t['h'] if n == 1 else size * 0.72)
        col = t['colors'][0] if t['colors'] else '#000000'
        attrs = f'font-family="{esc(f0["font"])}" font-size="{size:.3f}" fill="{col}" text-anchor="{anchor}"' + (' font-weight="bold"' if f0['bold'] else '') + (' font-style="italic"' if f0['italic'] else '')
        if n == 1:
            o.append(f'<text x="{x:.3f}" y="{y:.3f}" {attrs}>{esc(lines[0])}</text>')
        else:
            step = (t['h'] - size * 0.72) / (n - 1) if n > 1 and t['h'] > size else size * 1.2
            o.append(f'<text {attrs}>' + ''.join(f'<tspan x="{x:.3f}" y="{y + i * step:.3f}">{esc(l)}</tspan>' for i, l in enumerate(lines)) + '</text>')
    o.append('</g></svg>')
    return '\n'.join(x for x in o if x)


# ---------------------------------------------------------------- Befehle

def pick(doc, page):
    n = len(doc['pages'])
    if page is None: return list(range(n))
    if not 1 <= page <= n: raise EngineError(f'Seite {page} gibt es nicht (Datei hat {n} Seite(n))')
    return [page - 1]


def notes(doc):
    h = ['Maße in mm, Nullpunkt oben links der Seite bzw. der Platte; aus libcdr ohne CorelDRAW gelesen.']
    if doc['light']: h.append('Bitmaps (Fotos/Texturen) wurden nicht gelesen; ihre Rahmen sind als bitmapRahmen gezählt.')
    h.append('Textbreiten aus libcdr sind korrigiert, von Corel gestauchte oder gedrehte Texte können in der Breite abweichen.')
    return h


def cmd_info(doc, a):
    pages = []
    for i, p in enumerate(doc['pages'], 1):
        fonts = {}
        for t in p['texts']:
            for f in t['fonts']: fonts[f['font']] = fonts.get(f['font'], 0) + 1
        pages.append({'seite': i, 'breite': p['widthMm'], 'hoehe': p['heightMm'], 'pfade': len(p['paths']), 'texte': len(p['texts']), 'bitmapRahmen': len(p['images']),
                      'schriften': [{'schrift': k, 'verwendungen': v} for k, v in sorted(fonts.items(), key=lambda kv: -kv[1])]})
    return {'seiten': pages, 'hinweise': notes(doc)}


def cmd_measure(doc, a):
    return {'seiten': [dict(seite=i + 1, **measure_page(doc['pages'][i], a.max or 400)) for i in pick(doc, a.page)],
            'regeln': {'bohrloch': f'geschlossener Kreis bis Ø {HOLE_MAX_MM:g} mm', 'platte': f'geschlossene Kontur ab {PLATE_MIN_MM:g} × {PLATE_MIN_MM:g} mm (gefüllte Pfade mit vielen Teilpfaden = Text in Kurven/Motiv, nicht gezählt)',
                       'koordinaten': 'x/y der Platte = linke obere Ecke auf der Seite; Lochwerte relativ zur linken oberen Ecke der Platte'},
            'hinweise': notes(doc)}


def cmd_texts(doc, a):
    out = []; total = 0; limit = a.max or 2000
    fonts = {}
    for i in pick(doc, a.page):
        for t in doc['pages'][i]['texts']:
            if not t['text']: continue
            total += 1
            for f in t['fonts']: fonts[f['font']] = fonts.get(f['font'], 0) + 1
            if len(out) < limit:
                out.append({'seite': i + 1, 'text': t['text'], 'x': t['x'], 'y': t['y'], 'breite': t['w'], 'hoehe': t['h'], 'ausrichtung': t['align'], 'schriften': t['fonts'], 'farben': t['colors']})
    return {'texte': out, 'anzahl': total, 'gekuerzt': total > len(out), 'schriften': [{'schrift': k, 'verwendungen': v} for k, v in sorted(fonts.items(), key=lambda kv: -kv[1])], 'hinweise': notes(doc)}


def cmd_svg(doc, a):
    i = pick(doc, a.page or 1)[0]
    svg = page_svg(doc['pages'][i], title=Path(a.file).stem + f' · Seite {i + 1}')
    Path(a.out).write_text(svg, encoding='utf-8')
    p = doc['pages'][i]
    return {'seite': i + 1, 'seiten': len(doc['pages']), 'breite': p['widthMm'], 'hoehe': p['heightMm'], 'bytes': len(svg.encode()), 'datei': str(a.out),
            'hinweise': notes(doc) + ['SVG im Maßstab 1:1 (Einheit mm), Texte bleiben Text (Schrift muss beim Öffnen installiert sein).']}


def cmd_png(doc, a):
    try:
        import cairosvg
    except Exception:
        raise EngineError('Vorschau auf diesem Server nicht verfügbar (CairoSVG fehlt) – Maße, Texte und SVG funktionieren')
    i = pick(doc, a.page or 1)[0]
    p = doc['pages'][i]
    if p['widthMm'] <= 0 or p['heightMm'] <= 0: raise EngineError('Seite hat kein Maß – keine Vorschau möglich')
    px = a.px or 1600
    scale = px / max(p['widthMm'], p['heightMm'])
    svg = page_svg(p, min_stroke=1.2 / scale).replace('<g id="pfade">', f'<rect width="{p["widthMm"]}" height="{p["heightMm"]}" fill="#ffffff"/><g id="pfade">', 1)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=str(a.out), output_width=max(1, round(p['widthMm'] * scale)), output_height=max(1, round(p['heightMm'] * scale)))
    return {'seite': i + 1, 'seiten': len(doc['pages']), 'pixel': [round(p['widthMm'] * scale), round(p['heightMm'] * scale)], 'pxJeMm': round(scale, 3), 'datei': str(a.out),
            'hinweise': ['Vorschau aus den gelesenen Daten; fehlende Schriften werden durch Ersatzschriften dargestellt.']}


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['info', 'measure', 'texts', 'svg', 'png'])
    ap.add_argument('file'); ap.add_argument('--page', type=int); ap.add_argument('--max', type=int)
    ap.add_argument('--out'); ap.add_argument('--px', type=int)
    a = ap.parse_args(argv)
    try:
        if a.cmd in ('svg', 'png') and not a.out: raise EngineError('--out fehlt')
        if a.px and not 100 <= a.px <= 4000: raise EngineError('--px muss zwischen 100 und 4000 liegen')
        doc = parse(a.file)
        res = {'info': cmd_info, 'measure': cmd_measure, 'texts': cmd_texts, 'svg': cmd_svg, 'png': cmd_png}[a.cmd](doc, a)
    except EngineError as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False)); return 2
    except MemoryError:
        print(json.dumps({'error': 'Datei ist zu groß für den Arbeitsspeicher des Servers'}, ensure_ascii=False)); return 2
    print(json.dumps(res, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
