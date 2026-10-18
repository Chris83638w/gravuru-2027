"""Design-Bögen aus CorelDRAW (Bestand auf dem Server) ohne Corel lesen.

Ein Bogen (z. B. `D1-D49 Mensch mit Foto.cdr`) enthält je Design eine Gruppe mit Platte,
Motiven, Texten und einem SKU-Etikett (`GT-S-30x20-D7`). Gelesen wird über `cdr2raw`
(libcdr-tools). Bitmaps werden dekodiert: Musterfotos liegen verkleinert als `foto-n.jpg`
beim Design (in `design.svg` als `<image>` unter der Fotomaske), Materialtexturen (Platte)
einmal je Ausgabeordner unter `_texturen/<key>.jpg`. Je Design entstehen `design.json`
(Texte mit Schrift/Größe/Lage in mm, Motivpfade, Platte, Fotos), `design.svg` (Text bleibt
Text, Motive als Pfade) und `preview.png`; je Bogen eine Übersicht. Nichts wird erfunden:
fehlende Schriften bleiben als Name stehen (Vorschau mit Ersatz, siehe FONTCONFIG_FILE).

    python scripts/read-corel-design-sheets.py --out <ordner> --label "Mensch mit Foto" bogen.cdr [...]
    python scripts/read-corel-design-sheets.py --out <ordner> --from-list bogenliste.json

bogenliste.json: [{"file": ".../x.cdr", "label": "Tier ohne Foto", "material": "Schiefer", "process": "Gravur", "form": "Rechteck"}]
"""
import argparse, base64, hashlib, io, json, math, os, re, subprocess, sys
from pathlib import Path

IN = 25.4
PHOTO_MAX_PX = 800     # längste Seite eines Musterfotos in foto-n.jpg
TEXTURE_MAX_PX = 700   # längste Seite einer Materialtextur in _texturen/<key>.jpg
SKU = re.compile(r'^[A-Z]{2,6}[A-Z0-9]*-[A-Z0-9]+-[\d.,]+x[\d.,]+-D\d+$')
PROP = re.compile(r'([a-z0-9:-]+): ([^,()]+?)(?=, [a-z0-9:-]+: |\)$|$)')
NUM = re.compile(r'-?\d+(?:\.\d+)?')


def props(s):
    out = {}
    for k, v in PROP.findall(s):
        out[k] = v.strip()
    return out


def inch(v):
    m = NUM.search(v or '')
    return float(m.group(0)) if m else 0.0


def path_actions(d):
    """svg:d: ((librevenge:path-action: M, svg:x: 1in, svg:y: 2in), (...))"""
    acts = []
    for part in re.findall(r'\(([^()]*)\)', d):
        p = props(part)
        a = p.get('librevenge:path-action')
        if a: acts.append((a, p))
    return acts


def bbox_of(acts):
    xs, ys = [], []
    for a, p in acts:
        for k, v in p.items():
            if k in ('svg:x', 'svg:x1', 'svg:x2'): xs.append(inch(v))
            if k in ('svg:y', 'svg:y1', 'svg:y2'): ys.append(inch(v))
    if not xs: return None
    return [min(xs), min(ys), max(xs), max(ys)]


def is_rect(acts):
    pts = [(inch(p['svg:x']), inch(p['svg:y'])) for a, p in acts if a in ('M', 'L')]
    if not 4 <= len(pts) <= 5 or any(a == 'C' for a, _ in acts): return False
    xs = sorted({round(x, 3) for x, _ in pts}); ys = sorted({round(y, 3) for _, y in pts})
    return len(xs) == 2 and len(ys) == 2


def to_svg_d(acts, ox, oy):
    f = lambda v, o: f'{(inch(v) - o) * IN:.3f}'
    out = []
    for a, p in acts:
        if 'svg:x' not in p and a != 'Z': continue
        x1, y1, x2, y2 = p.get('svg:x1', p.get('svg:x')), p.get('svg:y1', p.get('svg:y')), p.get('svg:x2', p.get('svg:x')), p.get('svg:y2', p.get('svg:y'))
        if a == 'M' or a == 'L': out.append(f"{a}{f(p['svg:x'], ox)} {f(p['svg:y'], oy)}")
        elif a == 'C': out.append(f"C{f(x1, ox)} {f(y1, oy)} {f(x2, ox)} {f(y2, oy)} {f(p['svg:x'], ox)} {f(p['svg:y'], oy)}")
        elif a == 'Q': out.append(f"Q{f(x1, ox)} {f(y1, oy)} {f(p['svg:x'], ox)} {f(p['svg:y'], oy)}")
        elif a == 'A': out.append(f"A{inch(p.get('svg:rx', '0')) * IN:.3f} {inch(p.get('svg:ry', '0')) * IN:.3f} {inch(p.get('librevenge:rotate', '0')):.2f} {1 if p.get('librevenge:large-arc') == 'true' else 0} {1 if p.get('librevenge:sweep') == 'true' else 0} {f(p['svg:x'], ox)} {f(p['svg:y'], oy)}")
        elif a == 'Z': out.append('Z')
    return ' '.join(out)


ZERO_BITMAPS_OVER_MB = 4000  # mit 12-GB-Swap liest libcdr auch 1-GB-Bitmapspeicher; Nullung nur als Notbremse


def decode_bitmap(b64, max_px):
    """base64-Bitmap (BMP/PNG/JPEG aus cdr2raw) → (Bilddaten verkleinert, Pixelmaß Original, Dateiendung).
    32-Bit-BMPs tragen in Corel den Alphakanal (freigestellte Fotos): wird er genutzt, bleibt er erhalten (PNG), sonst JPEG."""
    from PIL import Image
    raw = base64.b64decode(b64)
    im = None
    if raw[:2] == b'BM' and int.from_bytes(raw[28:30], 'little') == 32 and int.from_bytes(raw[30:34], 'little') in (0, 3):
        w = int.from_bytes(raw[18:22], 'little', signed=True); h = int.from_bytes(raw[22:26], 'little', signed=True); off = int.from_bytes(raw[10:14], 'little')
        try:
            im = Image.frombuffer('RGBA', (w, abs(h)), raw[off:off + w * abs(h) * 4], 'raw', 'BGRA', 0, -1 if h > 0 else 1)
            lo, hi = im.getchannel('A').getextrema()
            if lo == hi: im = im.convert('RGB')  # Alphakanal ungenutzt (0 oder 255 überall)
        except Exception:
            im = None
    if im is None:
        im = Image.open(io.BytesIO(raw)); im.load()
        if im.mode not in ('RGB', 'L', 'RGBA'): im = im.convert('RGB')
    px = im.size
    im.thumbnail((max_px, max_px))
    buf = io.BytesIO()
    if im.mode == 'RGBA': return png_small(im), px, '.png'
    im.save(buf, 'JPEG', quality=82, optimize=True)
    return buf.getvalue(), px, '.jpg'


def zero_bitmaps(cdr):
    """Bögen mit riesigem Bitmap-Speicher (> ZERO_BITMAPS_OVER_MB MB entpackt) lassen libcdr am
    Arbeitsspeicher scheitern. Dann wird eine Kopie mit gleich großem, aber genulltem
    content/data/Bitmaps.dat gelesen: Texte, Pfade und Platten bleiben, Bitmap-Rahmen entfallen."""
    import tempfile, zipfile
    try:
        z = zipfile.ZipFile(cdr)
        info = next((i for i in z.infolist() if i.filename.endswith('Bitmaps.dat')), None)
    except zipfile.BadZipFile:
        return cdr, False
    if not info or info.file_size < ZERO_BITMAPS_OVER_MB * 1024 * 1024: return cdr, False
    tmp = Path(tempfile.gettempdir()) / (Path(cdr).stem + '.nobmp.cdr')
    with zipfile.ZipFile(tmp, 'w') as dst:
        dst.writestr(zipfile.ZipInfo('mimetype'), z.read('mimetype'), compress_type=zipfile.ZIP_STORED)
        for i in z.infolist():
            if i.filename == 'mimetype': continue
            if i.filename.endswith('Bitmaps.dat'):
                dst.writestr(i.filename, bytes(i.file_size), compress_type=zipfile.ZIP_DEFLATED)
            else:
                dst.writestr(i.filename, z.read(i.filename), compress_type=zipfile.ZIP_DEFLATED)
    return tmp, True


def raw_lines(cdr, bitmaps=None):
    """cdr2raw streamen. Bitmapzeilen: Bilddaten dekodieren (Cache je Bildinhalt, denn die
    Materialtextur liegt auf einem Bogen dutzendfach) und als Eintrag in `bitmaps` ablegen;
    die Zeile wird auf Kopf + Ende gekürzt (dort stehen Lage und Größe) plus `bitmap-index: n`."""
    src, zeroed = zero_bitmaps(cdr)
    if zeroed: print(f'{Path(cdr).name}: Bitmap-Speicher genullt (zu groß für libcdr) – Bitmap-Rahmen entfallen')
    proc = subprocess.Popen(['cdr2raw', str(src)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    cache = {}
    for raw in proc.stdout:
        if b'drawGraphicObject' in raw[:60]:
            entry = None
            if bitmaps is not None:
                i0 = raw.find(b'office:binary-data: ')
                if i0 > 0:
                    i0 += len(b'office:binary-data: '); i1 = raw.find(b',', i0)
                    b64 = raw[i0:i1 if i1 > 0 else None]
                    h = hashlib.md5(); h.update(len(b64).to_bytes(8, 'big')); h.update(b64[:1 << 20]); h.update(b64[-(1 << 20):])
                    key = h.hexdigest()[:16]
                    if key not in cache:
                        try:
                            jpeg, px, ext = decode_bitmap(b64, PHOTO_MAX_PX)
                            cache[key] = {'key': key, 'jpeg': jpeg, 'px': px, 'ext': ext, 'uses': 0}
                        except Exception as e:
                            print('Bitmap nicht lesbar:', key, str(e)[:60]); cache[key] = None
                    entry = cache[key]
                    if entry: entry['uses'] += 1
                    del b64
                bitmaps.append(entry)
            line = (raw[:60] + b' ... ' + raw[-600:]).decode('utf-8', 'replace').rstrip('\n')
            yield line[:-1] + f', bitmap-index: {len(bitmaps) - 1 if bitmaps is not None else -1})' if line.endswith(')') else line
        else:
            yield raw.decode('utf-8', 'replace').rstrip('\n')
    proc.wait()
    if zeroed:
        try: Path(src).unlink()
        except OSError: pass


def parse_sheet(cdr):
    """Liefert Gruppen (Liste von Elementen) der obersten Ebene."""
    groups = []; stack = []; cur_style = {}
    page_level = []  # Elemente außerhalb jeder Gruppe
    text = None; bitmaps = []
    for line in raw_lines(cdr, bitmaps):
        s = line.strip()
        if not s: continue
        ind = len(line) - len(line.lstrip(' '))
        target = stack[-1]['items'] if stack else page_level
        if s.startswith('startLayer'):
            stack.append({'indent': ind, 'items': []}); continue
        if s.startswith('endLayer'):
            g = stack.pop()
            if stack: stack[-1]['items'].extend(g['items'])
            else: groups.append(g['items'])
            continue
        if s.startswith('setStyle'):
            cur_style = props(s[len('setStyle('):-1]); continue
        if s.startswith('drawPath'):
            acts = path_actions(s)
            bb = bbox_of(acts)
            if bb: target.append({'kind': 'path', 'style': dict(cur_style), 'acts': acts, 'bbox': bb, 'rect': is_rect(acts)})
            continue
        if s.startswith('drawGraphicObject'):
            p = props(s.rsplit(' ... ', 1)[-1].rstrip(')'))
            if 'svg:x' in p and 'svg:width' in p:
                x, y, w, h = (inch(p.get(k, '0')) for k in ('svg:x', 'svg:y', 'svg:width', 'svg:height'))
                bi = int(p.get('bitmap-index', '-1') or -1); mm = re.search(r'mime-type: ([^,)]+)', s[:80])
                target.append({'kind': 'image', 'bbox': [x, y, x + w, y + h], 'mime': mm.group(1) if mm else '', 'bm': bitmaps[bi] if 0 <= bi < len(bitmaps) else None})
            continue
        if s.startswith('startTextObject'):
            p = props(s[len('startTextObject ('):-1])
            x, y, w, h = (inch(p.get(k, '0')) for k in ('svg:x', 'svg:y', 'svg:width', 'svg:height'))
            text = {'kind': 'text', 'bbox': [x, y, x + w, y + h], 'paras': []}; continue
        if text is not None:
            if s.startswith('openParagraph'):
                p = props(s[len('openParagraph ('):-1]) if '(' in s else {}
                text['paras'].append({'align': p.get('fo:text-align', 'left'), 'spans': []})
            elif s.startswith('openSpan'):
                p = props(s[len('openSpan('):-1])
                text['paras'][-1]['spans'].append({'font': p.get('style:font-name', ''), 'sizePt': inch(p.get('fo:font-size', '0')), 'color': p.get('fo:color', ''), 'bold': p.get('fo:font-weight') == 'bold', 'italic': p.get('fo:font-style') == 'italic', 'text': ''})
            elif s.startswith('insertText'):
                m = re.match(r'insertText \((.*)\)$', s)
                if m and text['paras'] and text['paras'][-1]['spans']: text['paras'][-1]['spans'][-1]['text'] += m.group(1)
            elif s.startswith('insertLineBreak'):
                if text['paras'] and text['paras'][-1]['spans']: text['paras'][-1]['spans'][-1]['text'] += '\n'
            elif s.startswith('insertSpace') or s.startswith('insertTab'):
                if text['paras'] and text['paras'][-1]['spans']: text['paras'][-1]['spans'][-1]['text'] += ' '
            elif s.startswith('endTextObject'):
                target.append(text); text = None
            continue
    # Elemente ohne Gruppe: später per Lage zuordnen
    return groups, page_level


def text_plain(t):
    return '\n'.join(''.join(sp['text'] for sp in p['spans']) for p in t['paras']).strip()


def label_of(items):
    for it in items:
        if it['kind'] == 'text':
            tp = text_plain(it).strip()
            if SKU.match(tp): return tp, it
    return None, None


def contains(bb, inner, tol=0.3):
    cx, cy = (inner[0] + inner[2]) / 2, (inner[1] + inner[3]) / 2
    return bb[0] - tol <= cx <= bb[2] + tol and bb[1] - tol <= cy <= bb[3] + tol


def fix_text_boxes(items):
    """libcdr liefert für Text die Tintenhöhe, aber die doppelte Tintenbreite (geprüft an 100 Texten mit Originalschrift,
    Lage gegen Konfigurator-Vorschau): zentriert = [C - w, C + w], linksbündig = [L, L + 2w], rechtsbündig = [R - 2w, R] (Annahme)."""
    for it in items:
        if it['kind'] == 'text' and not it.get('boxFixed'):
            b = it['bbox']; w2 = (b[2] - b[0]) / 2; al = it['paras'][0]['align'] if it['paras'] else 'left'
            x0 = b[0] + (w2 / 2 if al == 'center' else w2 if al == 'right' else 0)
            it['bbox'] = [x0, b[1], x0 + w2, b[3]]; it['boxFixed'] = True


def build_design(sku, items, label_item, meta):
    rest = [it for it in items if it is not label_item]
    area = lambda b: max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])
    fix_text_boxes(rest)
    # Umriss aus Pfaden und Texten (Bitmaps können über die Platte hinausragen – Musterfoto im PowerClip)
    base = [it for it in rest if it['kind'] != 'image'] or rest
    xs = [b for it in base for b in (it['bbox'][0], it['bbox'][2])]; ys = [b for it in base for b in (it['bbox'][1], it['bbox'][3])]
    union = [min(xs), min(ys), max(xs), max(ys)] if xs else [0, 0, 1, 1]
    # Platte: 1. rote Schnittlinie (Kontur #ff0000: Rechteck, Herz, Stern …), 2. größter Pfad/größte Bitmap, wenn er den Inhalt umschließt, 3. Umriss
    red = [it for it in rest if it['kind'] == 'path' and (it['style'].get('svg:stroke-color') or '').lower() in CUT_COLORS and it['style'].get('draw:stroke') == 'solid']
    plate = max(red, key=lambda r: area(r['bbox']), default=None)
    if plate is not None and area(plate['bbox']) >= 0.3 * area(union):
        pb = plate['bbox']; plate_source = 'schnittlinie'
    else:
        cands = [it for it in rest if it['kind'] in ('path', 'image')]
        plate = max(cands, key=lambda r: area(r['bbox']), default=None)
        if plate is not None and area(plate['bbox']) >= 0.6 * area(union):
            pb = plate['bbox']; plate_source = 'rechteck' if plate['kind'] == 'path' and plate['rect'] else 'form' if plate['kind'] == 'path' else 'bitmap'
            if plate['kind'] == 'image': plate = None
        else:
            pb = union; plate = None; plate_source = 'umriss'
    ox, oy = pb[0], pb[1]
    W, H = (pb[2] - pb[0]) * IN, (pb[3] - pb[1]) * IN
    rel = lambda bb: [round((bb[0] - ox) * IN, 2), round((bb[1] - oy) * IN, 2), round((bb[2] - bb[0]) * IN, 2), round((bb[3] - bb[1]) * IN, 2)]
    texts, motifs, images, fonts = [], [], [], []
    for it in rest:
        if it['kind'] == 'text':
            lines = []
            for p in it['paras']:
                for sp in p['spans']:
                    if sp['font'] and sp['font'] not in fonts: fonts.append(sp['font'])
            tp = text_plain(it)
            if not tp: continue
            sp0 = next((sp for p in it['paras'] for sp in p['spans'] if sp['text'].strip()), None) or {'font': '', 'sizePt': 0, 'color': ''}
            bx = rel(it['bbox'])  # Box bereits korrigiert (siehe oben)
            texts.append({'text': tp, 'font': sp0['font'], 'sizePt': round(sp0['sizePt'], 1), 'color': sp0['color'], 'align': it['paras'][0]['align'] if it['paras'] else 'left', 'box': bx, **({'hint': True} if HINT.search(tp) else {})})
        elif it['kind'] == 'path':
            if it is plate: continue
            st = it['style']
            motifs.append({'fill': st.get('draw:fill-color') if st.get('draw:fill') == 'solid' else None, 'stroke': st.get('svg:stroke-color') if st.get('draw:stroke') == 'solid' else None,
                           'strokeMm': round(inch(st.get('svg:stroke-width', '0')) * IN, 3), 'box': rel(it['bbox']), 'rect': it['rect'], 'd': to_svg_d(it['acts'], ox, oy)})
        elif it['kind'] == 'image':
            box = rel(it['bbox']); bm = it.get('bm') or {}
            covers = box[0] <= 2 and box[1] <= 2 and box[0] + box[2] >= W - 2 and box[1] + box[3] >= H - 2
            images.append({'box': box, 'mime': it['mime'], 'px': list(bm.get('px', ())) or None, 'key': bm.get('key'), 'uses': bm.get('uses', 0), 'covers': covers, 'plate': False, 'alpha': bm.get('ext') == '.png', '_jpeg': bm.get('jpeg')})
    # Textur = plattendeckende Bitmap, die auf dem Bogen am häufigsten vorkommt (Material); weitere deckende Bitmaps sind Fotos
    covering = [im for im in images if im['covers']]
    if covering:
        tex = max(covering, key=lambda im: (im['uses'], -images.index(im)))
        if tex['uses'] >= 2 or len(covering) == 1: tex['plate'] = True
    # Bedienhinweis der Vorlage („Foto-Upload / hier klicken“ mit schwarz-weißem Knopf): Texte und reine Schwarz/Weiß-Flächen daneben
    hint_boxes = [t['box'] for t in texts if t.get('hint')]
    def touches(a, b, pad=5):
        return a[0] - pad < b[0] + b[2] and b[0] - pad < a[0] + a[2] and a[1] - pad < b[1] + b[3] and b[1] - pad < a[1] + a[3]
    for m in motifs:
        if (m.get('fill') or '').lower() in ('#000000', '#ffffff') and any(touches(m['box'], hb) for hb in hint_boxes): m['hint'] = True
    plate_rec = {'widthMm': round(W, 1), 'heightMm': round(H, 1), 'source': plate_source}
    if plate is not None and not plate['rect']: plate_rec['outline'] = to_svg_d(plate['acts'], ox, oy)
    return {'id': sku, **meta, 'plate': plate_rec, 'texts': texts, 'fonts': fonts, 'motifs': motifs, 'images': images}


def cutout_white(data):
    """Musterfoto auf weißem Grund (Corel-Freistellung geht über libcdr verloren): weißen Rand von den Ecken aus
    transparent machen. Liefert PNG-Bytes oder None, wenn das Bild keinen weißen Rand hat oder die Fläche unplausibel ist."""
    from PIL import Image, ImageDraw
    im = Image.open(io.BytesIO(data))
    if im.mode == 'RGBA': return None
    im = im.convert('RGB'); w, h = im.size
    corners = [im.getpixel(p) for p in ((1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2))]
    if not all(min(c) >= 232 for c in corners): return None
    g = im.convert('L').point(lambda v: 255 if v >= 222 else 0)
    for seed in ((1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2), (w // 2, 1), (w // 2, h - 2), (1, h // 2), (w - 2, h // 2)):
        if g.getpixel(seed) == 255: ImageDraw.floodfill(g, seed, 128)
    mask = g.point(lambda v: 0 if v == 128 else 255)
    share = 1 - sum(mask.histogram()[255:]) / (w * h)
    if not 0.08 <= share <= 0.85: return None
    out = im.copy(); out.putalpha(mask.filter(__import__('PIL.ImageFilter', fromlist=['GaussianBlur']).GaussianBlur(0.8)))
    return png_small(out)


def png_small(im, max_px=640):
    """RGBA-Bild als Palette-PNG (256 Farben, Alpha bleibt) – ein Viertel der Größe eines RGBA-PNG."""
    from PIL import Image
    im = im.copy(); im.thumbnail((max_px, max_px))
    q = im.quantize(256, method=Image.Quantize.FASTOCTREE)
    buf = io.BytesIO(); q.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def write_bitmaps(d, dd, out):
    """Fotos als foto-n.jpg beim Design, Plattentextur einmal je Ausgabeordner (_texturen/<key>.jpg).
    Setzt images[].file bzw. d['texture'] und entfernt die Bilddaten aus dem Datensatz."""
    n = 0
    for im in d['images']:
        jpeg = im.pop('_jpeg', None)
        if not jpeg: continue
        if im['plate']:
            tdir = out / '_texturen'; tdir.mkdir(exist_ok=True); tf = tdir / f"{im['key']}.jpg"
            if not tf.exists():
                from PIL import Image
                t = Image.open(io.BytesIO(jpeg)).convert('RGB'); t.thumbnail((TEXTURE_MAX_PX, TEXTURE_MAX_PX)); t.save(tf, 'JPEG', quality=80, optimize=True)
            d['texture'] = tf.name
        else:
            if not im.get('alpha'):
                cut = cutout_white(jpeg)
                if cut: jpeg = cut; im['alpha'] = True; im['alphaGuess'] = True
            n += 1; im['file'] = f"foto-{n}{'.png' if im.get('alpha') else '.jpg'}"; (dd / im['file']).write_bytes(jpeg)


CUT_COLORS = ('#ff0000', '#000f00')  # Schnittlinie: Rot (Gravur-Bögen) bzw. #000f00 (UV-Bögen)


HINT = re.compile(r'foto-?\s*upload|hier\s+klicken|^\s*dein\s*\n?\s*foto\s*$|ihr\s*foto\s*hier', re.I)


def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def light(c, process='Gravur'):
    """Vorschaufarbe. Gravur: Grau/Weiß (gravierte Fläche) hell, Schwarz (ungraviert) dunkel, Rot/Grün (Schnitt) unverändert.
    UV-Druck: Farben wie gezeichnet."""
    if not c: return None
    c = c.lower()
    if c in ('#ff0000', '#00ff00'): return c
    if process != 'Gravur': return c
    if c == '#000000': return '#141414'
    return '#f2f2f2'


def is_photo_mask(m, W, H):
    """Fotoplatzhalter: gefüllte, einfache geschlossene Form (Kreis, Oval, Rechteck, Herz …) mit 3–95 % der Plattenfläche,
    ein Teilpfad (ein Ring aus zwei Kreisen ist keine Maske)."""
    if not m.get('fill') or m.get('hint'): return False
    bx = m['box']; share = bx[2] * bx[3] / max(1.0, W * H)
    if not 0.03 <= share <= 0.95: return False
    cmds = len(re.findall(r'[MLCQAZ]', m['d']))
    return cmds <= 40 and m['d'].count('M') == 1


def photo_svg(idx, d, box, preview):
    x, y, w, h = box; cx, cy = x + w / 2, y + h / 2; r = min(w, h)
    fill = '#8c8c8c' if preview else '#dddddd'
    icon = (f'<g fill="none" stroke="#2a2a2a" stroke-width="{max(0.4, r * 0.025):.2f}" stroke-linejoin="round">'
            f'<rect x="{cx - r * 0.17:.2f}" y="{cy - r * 0.11:.2f}" width="{r * 0.34:.2f}" height="{r * 0.24:.2f}" rx="{r * 0.03:.2f}"/>'
            f'<circle cx="{cx:.2f}" cy="{cy + r * 0.015:.2f}" r="{r * 0.065:.2f}"/><path d="M{cx - r * 0.07:.2f} {cy - r * 0.11:.2f} l{r * 0.03:.2f} -{r * 0.05:.2f} h{r * 0.08:.2f} l{r * 0.03:.2f} {r * 0.05:.2f}"/></g>') if preview and r > 15 else ''
    return f'<g id="foto-{idx}" class="foto"><path d="{d}" fill="{fill}" fill-rule="evenodd"/>{icon}</g>'


_CMAP = {}
FALLBACK_FONTS = ('Arial', 'DejaVu Sans', 'Segoe UI Emoji')


def cmap_of(family):
    """Zeichenvorrat der Schrift, die fontconfig für den Familiennamen liefert (Ersatz eingeschlossen)."""
    if family in _CMAP: return _CMAP[family]
    cm = None
    try:
        f = subprocess.run(['fc-match', '-f', '%{file}', family], capture_output=True, text=True, timeout=30).stdout.strip()
        from fontTools.ttLib import TTFont
        cm = set((TTFont(f, lazy=True).getBestCmap() or {}).keys())
    except Exception:
        pass
    _CMAP[family] = cm; return cm


_FONT = {}


def font_of(family):
    """TTFont der Schrift, die fontconfig für den Familiennamen liefert (None, wenn nicht lesbar)."""
    if family in _FONT: return _FONT[family]
    f = None
    try:
        path = subprocess.run(['fc-match', '-f', '%{file}', family], capture_output=True, text=True, timeout=30).stdout.strip()
        from fontTools.ttLib import TTFont
        f = TTFont(path, lazy=True)
    except Exception:
        pass
    _FONT[family] = f; return f


def ink_metrics(family, text):
    """Tintenbox einer Zeile in em: (Oberkante über Grundlinie, Unterkante unter Grundlinie).
    Corel liefert für Artistic Text die Tintenbox, nicht den Geviertkasten – so landet die
    Grundlinie dort, wo sie in der Zeichnung liegt. Ohne Glyphendaten: (0.72, 0.22)."""
    f = font_of(family)
    try:
        if f is None or 'glyf' not in f: raise ValueError
        upem = f['head'].unitsPerEm; cmap = f.getBestCmap() or {}; glyf = f['glyf']
        tops, bots = [], []
        for ch in text:
            g = cmap.get(ord(ch))
            if not g: continue
            gl = glyf[g]
            if gl.numberOfContours == 0: continue
            tops.append(gl.yMax); bots.append(gl.yMin)
        if not tops: raise ValueError
        return max(tops) / upem, -min(bots) / upem
    except Exception:
        return 0.72, 0.22


def ink_width(family, text):
    """Tintenbreite einer Zeile in em (Vorschübe, erste linke und letzte rechte Nachbreite abgezogen); None ohne Glyphendaten."""
    f = font_of(family)
    try:
        if f is None or 'glyf' not in f: return None
        upem = f['head'].unitsPerEm; cmap = f.getBestCmap() or {}; glyf = f['glyf']; hmtx = f['hmtx']
        names = [cmap.get(ord(ch)) for ch in text]
        names = [n for n in names if n]
        if not names: return None
        adv = sum(hmtx[n][0] for n in names)
        first = glyf[names[0]]; last = glyf[names[-1]]
        lsb = hmtx[names[0]][1] if first.numberOfContours else 0
        rsb = (hmtx[names[-1]][0] - last.xMax) if last.numberOfContours else 0
        return max(0.0, adv - lsb - rsb) / upem
    except Exception:
        return None


def ink_sides(family, text):
    """Linke Vorbreite des ersten und rechte Nachbreite des letzten Zeichens in em (negativ bei Schwüngen über den Ursprung hinaus)."""
    f = font_of(family)
    try:
        if f is None or 'glyf' not in f: return 0.0, 0.0
        upem = f['head'].unitsPerEm; cmap = f.getBestCmap() or {}; glyf = f['glyf']; hmtx = f['hmtx']
        names = [cmap.get(ord(ch)) for ch in text if cmap.get(ord(ch))]
        if not names: return 0.0, 0.0
        first, last = glyf[names[0]], glyf[names[-1]]
        lsb = hmtx[names[0]][1] if first.numberOfContours else 0
        rsb = (hmtx[names[-1]][0] - last.xMax) if last.numberOfContours else 0
        return lsb / upem, rsb / upem
    except Exception:
        return 0.0, 0.0


def font_runs(text, family):
    """Zeichen, die der Schrift fehlen (✝, –, ♥ …), in Läufe mit Ersatzschrift aufteilen: [(familie|None, text)]."""
    cm = cmap_of(family)
    if not cm: return [(None, text)]
    out = []
    for ch in text:
        o = ord(ch); fam = None
        if o > 32 and o not in cm:
            fam = next((fb for fb in FALLBACK_FONTS if o in (cmap_of(fb) or ())), None)
        if out and out[-1][0] == fam: out[-1] = (fam, out[-1][1] + ch)
        else: out.append((fam, ch))
    return out


def image_href(file, assets, preview):
    if preview and assets is not None and (Path(assets) / file).exists():
        mime = 'image/png' if file.lower().endswith('.png') else 'image/jpeg'
        return f'data:{mime};base64,' + base64.b64encode((Path(assets) / file).read_bytes()).decode()
    return file


def design_svg(d, preview=False, assets=None, textures=None):
    """SVG eines Designs. preview=True: dunkle Platte (mit Materialtextur, wenn `textures/<d.texture>` vorliegt),
    Texte hell, Fotos als eingebettete Bilder; sonst Arbeitsdatei mit relativen Bildverweisen (foto-n.jpg)."""
    W, H = d['plate']['widthMm'], d['plate']['heightMm']
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}mm" height="{H}mm">']
    outline = (d.get('plate') or {}).get('outline')
    plate_d = outline or f'M0 0 h{W} v{H} h{-W} Z'
    tex = Path(textures) / d['texture'] if preview and textures and d.get('texture') else None
    if preview:
        if tex is not None and tex.exists():
            out.append(f'<clipPath id="clip-platte"><path d="{plate_d}"/></clipPath>')
            out.append(f'<image id="platte" x="0" y="0" width="{W}" height="{H}" preserveAspectRatio="none" clip-path="url(#clip-platte)" xlink:href="data:image/jpeg;base64,{base64.b64encode(tex.read_bytes()).decode()}"/>')
        elif outline: out.append(f'<path id="platte" d="{outline}" fill="#2a2a2a"/>')
        else: out.append(f'<rect id="platte" width="{W}" height="{H}" fill="#2a2a2a"/>')
    else:
        if outline: out.append(f'<path id="platte" d="{outline}" fill="none" stroke="#999" stroke-width="0.2"/>')
        else: out.append(f'<rect id="platte" width="{W}" height="{H}" fill="none" stroke="#999" stroke-width="0.2"/>')
    def overlap(a, b):
        ix = max(0.0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])); iy = max(0.0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
        return ix * iy
    proc = d.get('process') or 'Gravur'
    masks = [m for m in d['motifs'] if is_photo_mask(m, W, H)]
    # Rahmen ohne Füllung (nur Kontur) oder unsichtbare Form (PowerClip-Rahmen), einfach geformt: Beschnitt des Fotos darunter
    frames = [m for m in d['motifs'] if not m.get('fill') and not m.get('hint') and is_photo_mask({**m, 'fill': '#000'}, W, H)]
    n_foto = 0; used_frames = set(); used_masks = set()
    def image_svg(idx, im, clip_d):
        x, y, w, h = im['box']
        return (f'<clipPath id="clip-foto-{idx}"><path d="{clip_d}"/></clipPath>'
                f'<image id="foto-{idx}" class="foto" x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" preserveAspectRatio="none" clip-path="url(#clip-foto-{idx})" xlink:href="{image_href(im["file"], assets, preview)}"/>')
    for im in d['images']:
        x, y, w, h = im['box']
        if im.get('plate'): continue  # Plattenbitmap (Materialtextur)
        mk = next((m for m in masks if id(m) not in used_masks and overlap(im['box'], m['box']) >= 0.5 * m['box'][2] * m['box'][3]), None)
        fr = next((f for f in frames if id(f) not in used_frames and overlap(im['box'], f['box']) >= 0.5 * f['box'][2] * f['box'][3]), None)
        if im.get('file'):
            n_foto += 1
            if mk is not None: used_masks.add(id(mk)); out.append(image_svg(n_foto, im, mk['d']))
            elif fr is not None: used_frames.add(id(fr)); out.append(image_svg(n_foto, im, fr['d']))
            else: out.append(image_svg(n_foto, im, plate_d))
            continue
        if mk is not None: continue  # ohne Bilddaten: Maske wird unten als Platzhalter gezeichnet
        n_foto += 1
        if fr is not None: used_frames.add(id(fr)); out.append(photo_svg(n_foto, fr['d'], fr['box'], preview))
        else: out.append(photo_svg(n_foto, f'M{x} {y} h{w} v{h} h{-w} Z', im['box'], preview))
    for i, m in enumerate(d['motifs']):
        if id(m) in used_masks: continue
        if m.get('hint'):
            if not preview: out.append(f'<path id="hinweis-{i + 1}" class="hinweis" d="{m["d"]}" fill="{m["fill"] or "none"}" stroke="{m["stroke"] or "none"}" stroke-width="{m["strokeMm"]}" display="none"/>')
            continue
        if m in masks:
            n_foto += 1; out.append(photo_svg(n_foto, m['d'], m['box'], preview)); continue
        if id(m) in used_frames:
            if m.get('stroke'): out.append(f'<path id="motiv-{i + 1}" d="{m["d"]}" fill="none" stroke="{light(m["stroke"], proc) if preview else m["stroke"]}" stroke-width="{m["strokeMm"]}"/>')
            continue
        if preview and (m.get('stroke') or '').lower() in CUT_COLORS and not m.get('fill'): continue  # Schnittlinie
        fill = light(m['fill'], proc) if preview else (m['fill'] or 'none'); stroke = light(m['stroke'], proc) if preview else (m['stroke'] or 'none')
        if preview and fill is None and stroke is None: continue
        out.append(f'<path id="motiv-{i + 1}" d="{m["d"]}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{m["strokeMm"]}" fill-rule="evenodd"/>')
    for i, t in enumerate(d['texts']):
        if t.get('hint') or HINT.search(t['text']): continue  # Bedienhinweis der Vorlage, kein Designtext
        x, y, w, h = t['box']; size = t['sizePt'] * 0.3528
        anchor = {'center': 'middle', 'right': 'end'}.get(t['align'], 'start'); tx = x + (w / 2 if anchor == 'middle' else w if anchor == 'end' else 0)
        if preview and anchor != 'middle':
            # Corel-Box = Tinte: Ursprung so setzen, dass die Tinte an der Boxkante beginnt (Vorbreite, Schwünge)
            lsb, rsb = ink_sides(t['font'], t['text'].split('\n')[0] if anchor == 'start' else t['text'].split('\n')[-1])
            tx += -lsb * t['sizePt'] * 0.3528 if anchor == 'start' else rsb * t['sizePt'] * 0.3528
        fill = (light(t['color'], proc) or '#f2f2f2') if preview else (t['color'] or '#000')
        lines = t['text'].split('\n'); n = len(lines)
        # Grundlinie aus der Tintenbox (Corel: Box = Tinte): erste Grundlinie = Oberkante + Oberlänge der ersten Zeile,
        # Zeilenabstand aus Boxhöhe, Oberlänge der ersten und Unterlänge der letzten Zeile
        top1, _ = ink_metrics(t['font'], lines[0]); _, botn = ink_metrics(t['font'], lines[-1])
        base0 = y + top1 * size
        ls = (h - (top1 + botn) * size) / (n - 1) if n > 1 else size * 1.15
        if not 0.7 * size <= ls <= 3 * size: ls = size * 1.15
        # Laufweite: Corel-Box = Tintenbreite; weicht die Schrift (Zeichenabstand in Corel) ab, Laufweite anpassen (nur einzeilig, Originalschrift, ±35 %)
        spacing = ''
        if n == 1 and len(lines[0].strip()) > 1 and preview:
            iw = ink_width(t['font'], lines[0])
            if iw and 0.65 <= (iw * size) / max(w, 0.1) <= 1.35:
                spacing = f' letter-spacing="{(w - iw * size) / (len(lines[0]) - 1):.3f}"'
        # Zeichenbreite: libcdr kennt die horizontale Stauchung von Corel-Text nicht (Breite = natürliche Breite). Ragt der Text
        # über die Platte hinaus, wird er um den Ankerpunkt so gestaucht, dass er 6 mm vor dem Plattenrand endet.
        squeeze = ''
        if preview:
            nat = max((ink_width(t['font'], l) or 0) for l in lines) * size
            if nat > 0:
                margin = 6.0
                if anchor == 'start' and tx + nat > W - 3: sx = max(0.3, (W - margin - tx) / nat)
                elif anchor == 'end' and tx - nat < 3: sx = max(0.3, (tx - margin) / nat)
                elif anchor == 'middle' and nat > W - 2 * margin and (tx - nat / 2 < 3 or tx + nat / 2 > W - 3): sx = max(0.3, (W - 2 * margin) / nat)
                else: sx = 1.0
                if sx < 0.995: squeeze = f' transform="matrix({sx:.4f} 0 0 1 {tx * (1 - sx):.3f} 0)"'
        def line_svg(l):
            if not l: return ' '
            return ''.join(esc(seg) if fam is None else f'<tspan font-family="{esc(fam)}">{esc(seg)}</tspan>' for fam, seg in (font_runs(l, t['font']) if preview else [(None, l)]))
        out.append(f'<text id="text-{i + 1}" x="{tx:.2f}" y="{base0:.2f}" font-family="{esc(t["font"])}" font-size="{size:.2f}" fill="{fill}" text-anchor="{anchor}"{spacing}{squeeze}>'
                   + ''.join(f'<tspan x="{tx:.2f}" dy="{0 if j == 0 else ls:.2f}">{line_svg(l)}</tspan>' for j, l in enumerate(lines)) + '</text>')
    out.append('</svg>')
    return '\n'.join(out)


def render_png(svg, out, width=700):
    try:
        import cairosvg
        cairosvg.svg2png(bytestring=svg.encode(), write_to=str(out), output_width=width)
        return True
    except Exception as e:
        print('PNG nicht erzeugt:', out.name, str(e)[:80]); return False


def contact_sheet(designs, out_dir, title, cols=4):
    from PIL import Image, ImageDraw
    tiles = [(d, out_dir / d['id'] / 'preview.png') for d in designs if (out_dir / d['id'] / 'preview.png').exists()]
    if not tiles: return
    tw = 420; th = int(tw * max(d['plate']['heightMm'] / d['plate']['widthMm'] for d, _ in tiles)) + 30
    rows = math.ceil(len(tiles) / cols)
    sheet = Image.new('RGB', (cols * (tw + 10) + 10, rows * (th + 10) + 40), 'white'); dr = ImageDraw.Draw(sheet)
    dr.text((10, 10), title, fill='black')
    for i, (d, p) in enumerate(tiles):
        im = Image.open(p).convert('RGB'); im.thumbnail((tw, th - 30))
        x = 10 + (i % cols) * (tw + 10); y = 40 + (i // cols) * (th + 10)
        sheet.paste(im, (x, y)); dr.text((x, y + im.height + 4), d['id'] + '  ' + ', '.join(d['fonts'])[:50], fill='black')
    sheet.save(out_dir / f'_uebersicht-{re.sub(r"[^A-Za-z0-9]+", "-", title)}.png')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='*'); ap.add_argument('--out', required=True); ap.add_argument('--label', default='')
    ap.add_argument('--material', default=''); ap.add_argument('--process', default=''); ap.add_argument('--form', default='')
    ap.add_argument('--from-list', help='JSON-Liste von Bögen mit Metadaten'); ap.add_argument('--no-png', action='store_true')
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    jobs = json.loads(Path(a.from_list).read_text(encoding='utf-8')) if a.from_list else [{'file': f, 'label': a.label, 'material': a.material, 'process': a.process, 'form': a.form} for f in a.files]
    index = json.loads((out / 'designs.json').read_text(encoding='utf-8')) if (out / 'designs.json').exists() else []
    seen = {d['id']: i for i, d in enumerate(index)}
    for job in jobs:
        cdr = Path(job['file'])
        if not cdr.exists(): print('fehlt:', cdr); continue
        groups, loose = parse_sheet(cdr)
        for g in groups: fix_text_boxes(g)
        fix_text_boxes(loose)
        meta = {'sheet': cdr.name, 'sheetLabel': job.get('label', ''), 'material': job.get('material', ''), 'process': job.get('process', ''), 'form': job.get('form', '')}
        designs = []
        unlabeled = []
        for items in groups:
            sku, li = label_of(items)
            if sku: designs.append(build_design(sku, items, li, meta))
            else: unlabeled.extend(items)
        # lose Elemente (ohne Gruppe) und Gruppen ohne Etikett per Lage zuordnen
        loose += unlabeled
        labels = [(text_plain(it), it) for it in loose if it['kind'] == 'text' and SKU.match(text_plain(it).strip())]
        if labels:
            rects = [it for it in loose if it['kind'] == 'path' and it['rect']]
            for sku, li in labels:
                lx, ly = (li['bbox'][0] + li['bbox'][2]) / 2, li['bbox'][1]
                near = sorted(rects, key=lambda r: abs((r['bbox'][0] + r['bbox'][2]) / 2 - lx) + min(abs(r['bbox'][3] - ly), abs(r['bbox'][1] - li['bbox'][3])))
                if not near: continue
                pb = near[0]['bbox']
                items = [near[0]] + [it for it in loose if it is not li and it is not near[0] and contains(pb, it['bbox'])]
                designs.append(build_design(sku.strip(), items, li, meta))
        if not designs and SKU.match(cdr.stem):
            # Einzel-Export eines Designs (ohne SKU-Etikett): alles gehört zu diesem Design
            items = [it for g in groups for it in g] + loose
            if items: designs.append(build_design(cdr.stem, items, None, meta))
        n_png = 0
        for d in designs:
            dd = out / d['id']; dd.mkdir(exist_ok=True)
            for old in list(dd.glob('foto-*.jpg')) + list(dd.glob('foto-*.png')): old.unlink()
            write_bitmaps(d, dd, out)
            d['photoFiles'] = [im['file'] for im in d['images'] if im.get('file')]
            (dd / 'design.json').write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
            (dd / 'design.svg').write_text(design_svg(d), encoding='utf-8')
            if not a.no_png and render_png(design_svg(d, preview=True, assets=dd, textures=out / '_texturen'), dd / 'preview.png'): n_png += 1
            slim = {k: v for k, v in d.items() if k != 'motifs'}; slim['motifCount'] = len(d['motifs']); slim['texts'] = [{k: t[k] for k in ('text', 'font', 'sizePt', 'align')} for t in d['texts']]
            if d['id'] in seen: index[seen[d['id']]] = slim
            else: seen[d['id']] = len(index); index.append(slim)
        if not a.no_png: contact_sheet(designs, out, f"{meta['process']} {meta['material']} {meta['form']} – {meta['sheetLabel'] or cdr.stem}")
        print(f"{cdr.name}: {len(groups)} Gruppen → {len(designs)} Designs, {sum(len(d['texts']) for d in designs)} Texte, {n_png} Vorschauen")
    (out / 'designs.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
