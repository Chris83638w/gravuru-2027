# BSUV-AD-30x20: Einzel-PDFs (aus bogen_zerlegen.py) -> Lieferform 2 fuer den Prio-Konfi (Druck/UV)
# Ausgabe je Design: design.svg, design.json, RDG_WHITE.svg, CutContour.svg, foto-n.(jpg|png), original.png
import sys, json, re, math, hashlib, unicodedata
from pathlib import Path
import numpy as np, cv2, pymupdf as fitz
from PIL import ImageFont

SRC = Path(sys.argv[1]); OUT = Path(sys.argv[2]); KAT = Path(sys.argv[3])
SOURCE_PDF_SHA = sys.argv[4] if len(sys.argv) > 4 else None
K = 25.4/72
PLATE = fitz.Rect(0, 0, 300/K, 200/K)
FONTS = {f['name']: f for f in json.load(open(KAT/'schriften/schriften.json'))['fonts']}

# Schriftzuordnung: freigegeben bleibt, sonst Ersatz (Quelle: schriften/ersatz-*.json bzw. Auswahl Claude, offen zur Bestätigung)
FONTMAP = {
 'Cookie-Regular': ('Cookie', None), 'Parisienne-Regular': ('Parisienne', None), 'GreatVibes-Regular': ('Great Vibes', None),
 'Cinzel-Regular': ('Cinzel', None), 'CinzelDecorative-Regular': ('Cinzel Decorative', None), 'Lora-Regular': ('Lora', None),
 'CaviarDreams': ('Caviar Dreams', None), 'BernardoModaContrast': ('Bernardo Moda Contrast', None), 'AlexBrush-Regular': ('Alex Brush', None),
 'Champagne&Limousines': ('Montserrat Light', 'schriften/ersatz-tuerschilder.json'),
 'Champagne&Limousines-Italic': ('Montserrat Light', 'schriften/ersatz-tuerschilder.json (Kursiv entfaellt)'), 'Champagne&Limousines-Ita': ('Montserrat Light', 'schriften/ersatz-tuerschilder.json (Kursiv entfaellt)'),
 'Amarillo': ('Kaushan Script', 'schriften/ersatz-gedenktafeln-22x14.json'),
 'SimSun': ('Playfair Display', 'Auswahl Claude 16.11.2026, offen'), 'ArialMT': ('Montserrat', 'Auswahl Claude 16.11.2026, offen'),
 'BeautifulHeart': ('Great Vibes', 'Auswahl Claude 16.11.2026, offen'), 'FelixTitlingMT': ('Cinzel', 'Auswahl Claude 16.11.2026, offen'),
 'aAutoSignature': ('Sacramento', 'Auswahl Claude 16.11.2026, offen'), 'stoner': ('Montserrat Light', 'Auswahl Claude 16.11.2026, offen'),
 'HoneyScript-Light': ('Bad Script', 'Auswahl Claude 16.11.2026, offen'), 'Frenchpress': ('Amatic SC', 'Auswahl Claude 16.11.2026, offen'),
}
HINT_TEXT = {'Foto-Upload', 'hier klicken'}
TEXTFIX = {('D05', 'Bestizer'): 'Besitzer', ('D11', 'Tierarzt.:'): 'Tierarzt:'}

def mm(v): return round(v*K, 4)
def fmt(v): return ('%.4f' % v).rstrip('0').rstrip('.')
def hexc(c): return '#%02x%02x%02x' % tuple(max(0, min(255, round(x*255))) for x in c[:3])
def fontfile(name): return KAT/FONTS[name]['file']
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def text_width_mm(font, text, size_mm):
    f = ImageFont.truetype(str(fontfile(font)), 1000)
    l, t, r, b = f.getbbox(text, anchor='ls')
    return (r-l)/1000*size_mm, l/1000*size_mm, t/1000*size_mm, b/1000*size_mm

def path_d(items, closed):
    out, cur = [], None
    for it in items:
        op = it[0]
        if op == 're':
            r = it[1]; out.append(f"M{fmt(mm(r.x0))} {fmt(mm(r.y0))}H{fmt(mm(r.x1))}V{fmt(mm(r.y1))}H{fmt(mm(r.x0))}Z"); cur = None; continue
        if op == 'qu':
            q = it[1]; pts = [q.ul, q.ur, q.lr, q.ll]
            out.append('M'+' L'.join(f"{fmt(mm(p.x))} {fmt(mm(p.y))}" for p in pts)+'Z'); cur = None; continue
        p0 = it[1]
        if cur is None or abs(cur.x-p0.x) > 1e-3 or abs(cur.y-p0.y) > 1e-3:
            out.append(f"M{fmt(mm(p0.x))} {fmt(mm(p0.y))}")
        if op == 'l': out.append(f"L{fmt(mm(it[2].x))} {fmt(mm(it[2].y))}"); cur = it[2]
        elif op == 'c': out.append('C'+' '.join(f"{fmt(mm(p.x))} {fmt(mm(p.y))}" for p in it[2:5])); cur = it[4]
    if closed and out and not out[-1].endswith('Z'): out.append('Z')
    return ''.join(out)

def is_circle(r): return abs(r.width-r.height) < 2

def convert(pdf_path):
    code = pdf_path.stem; dn = code.split('-')[-1]
    doc = fitz.open(pdf_path); page = doc[0]
    notes, corrections, fontrepl = [], [], {}
    # ---------- Zeichenreihenfolge: Pfade + Bilder ----------
    drawings = page.get_drawings()
    images = page.get_image_info(xrefs=True)
    log = [e for e in page.get_bboxlog() if e[0] in ('fill-path', 'stroke-path', 'fill-image', 'fill-imgmask', 'fill-shade')]
    seq, di, ii, pending_fs = [], 0, 0, False
    for kind, _ in log:
        if kind in ('fill-path', 'stroke-path'):
            if pending_fs and kind == 'stroke-path': pending_fs = False; continue
            if di < len(drawings):
                seq.append(('path', drawings[di])); pending_fs = drawings[di]['type'] == 'fs' and kind == 'fill-path'; di += 1
        elif kind == 'fill-image':
            if ii < len(images): seq.append(('img', images[ii])); ii += 1
            pending_fs = False
    for d in drawings[di:]: seq.append(('path', d))
    for im in images[ii:]: seq.append(('img', im))
    # nur Inhalt dieses Schilds
    def inside(r): return fitz.Rect(r).intersects(PLATE)
    seq = [s for s in seq if inside(s[1]['rect'] if s[0] == 'path' else s[1]['bbox'])]
    # ---------- Spezialfaelle: Text als Bild/Kurve ----------
    curve_rects = {'D11': [fitz.Rect(125/K, 143/K, 176/K, 170/K)], 'D28': [fitz.Rect(118/K, 70/K, 173/K, 175/K)]}.get(dn, [])
    text_images = []
    # ---------- Klassifizieren ----------
    white_src, cut_src, plate_rect = None, None, None
    hints = []  # (center, radius)
    out_seq = []
    skip_next_stroke_center = None
    for kind, o in seq:
        if kind == 'path':
            r = o['rect']; fill = o.get('fill'); col = o.get('color')
            if fill and all(abs(a-b) < 0.02 for a, b in zip(fill, (0.5965, 0.5846, 0.5801))) and r.width > PLATE.width*0.98:
                white_src = o; continue
            if col and col[2] > 0.95 and col[0] < 0.05 and (o.get('width') or 0) < 1:
                cut_src = o
                if o['type'] == 'fs' and fill: plate_rect = (o, fill)
                continue
            if o['type'] == 'f' and fill and min(fill) > 0.99 and abs(r.width-PLATE.width) < 1 and abs(r.height-PLATE.height) < 1 and (o.get('fill_opacity') or 1) == 1:
                plate_rect = (o, fill); continue
            if o['type'] == 'f' and fill and min(fill) > 0.99 and abs((o.get('fill_opacity') or 1)-0.6) < 0.01 and is_circle(r):
                hints.append((fitz.Point((r.x0+r.x1)/2, (r.y0+r.y1)/2), r.width/2)); skip_next_stroke_center = hints[-1][0]; continue
            ringcol = col if o['type'] == 's' else fill
            if skip_next_stroke_center is not None and is_circle(r) and ringcol and max(ringcol) < 0.05 \
               and abs((r.x0+r.x1)/2-skip_next_stroke_center.x) < 3 and abs((r.y0+r.y1)/2-skip_next_stroke_center.y) < 3:
                skip_next_stroke_center = None; continue
            skip_next_stroke_center = None
            if dn == 'D28' and o['type'] == 'f' and fill and max(fill) < 0.2 and abs((o.get('fill_opacity') or 1)-0.49) < 0.01:
                notes.append('Weicher Schatten links (Maskenverlauf) entfaellt – nicht als Vektor abbildbar'); continue
            if any(cr.contains(r) for cr in curve_rects) and fill and max(fill) < 0.2:
                corrections.append('Text in Kurven entfernt und als echter Text neu gesetzt'); continue
            out_seq.append(('path', o))
        else:
            out_seq.append(('img', o))
    # Bilder: Foto (Upload-Fenster) vs. flache Ueberlagerung vs. Text-als-Bild
    ext = page.get_drawings(extended=True)
    clips = [e for e in ext if e['type'] == 'clip' and fitz.Rect(e['scissor']).intersects(PLATE)]
    final, foto_n, files = [], 0, {}
    for kind, o in out_seq:
        if kind == 'path': final.append(('path', o)); continue
        b = fitz.Rect(o['bbox']); x = o['xref']
        if not x:
            notes.append('Graustufen-Maskenbild (weicher Verlauf/Schatten) aus Corel entfaellt'); continue
        filt = doc.xref_get_key(x, 'Filter')[1] if x else ''
        smask = doc.xref_get_key(x, 'SMask')[1] if x else 'null'
        hint_in = [h for h in hints if b.contains(h[0])]
        if dn == 'D08' and 'DCT' not in filt:
            text_images.append(o); corrections.append('Text als Bild entfernt und als echter Text neu gesetzt'); continue
        if hint_in and 'DCT' in filt:
            foto_n += 1
            h = hint_in[-1]
            # Maske: kleinster Clip, der das Hinweis-Zentrum enthaelt und im Bild liegt
            cand = [c for c in clips if fitz.Rect(c['scissor']).contains(h[0]) and (fitz.Rect(c['scissor']) & b).get_area() > 0.8*fitz.Rect(c['scissor']).get_area()]
            cand = sorted(cand, key=lambda c: fitz.Rect(c['scissor']).get_area())
            win = b & PLATE
            if cand and (any(it[0] == 'c' for it in cand[0]['items']) or fitz.Rect(cand[0]['scissor']).get_area() < 0.98*win.get_area()):
                c = cand[0]; mpath = path_d(c['items'], True); win = fitz.Rect(c['scissor']) & PLATE
            else:
                mpath = f"M{fmt(mm(win.x0))} {fmt(mm(win.y0))}H{fmt(mm(win.x1))}V{fmt(mm(win.y1))}H{fmt(mm(win.x0))}Z"
            pix = fitz.Pixmap(doc, x)
            if smask != 'null':
                m = fitz.Pixmap(doc, int(smask.split()[0])); pix = fitz.Pixmap(pix, m) if pix.n < 4 else pix
                fn = f'foto-{foto_n}.png'; pix.save(OUT/code/fn)
            else:
                fn = f'foto-{foto_n}.jpg'; (OUT/code/fn).write_bytes(doc.extract_image(x)['image'])
            final.append(('foto', {'n': foto_n, 'bbox': b, 'mask': mpath, 'win': win, 'file': fn}))
            continue
        # flache Ueberlagerung -> Vektorflaeche mit Deckkraft
        pix = fitz.Pixmap(doc, x); rgb = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3].astype(float) if pix.n >= 3 else np.repeat(np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 1), 3, 2).astype(float)
        if pix.colorspace and pix.colorspace.n == 1 and pix.n < 3: pass
        if smask != 'null':
            a = np.frombuffer(fitz.Pixmap(doc, int(smask.split()[0])).samples, np.uint8).reshape(pix.h, pix.w).astype(float)
        else:
            a = np.full((pix.h, pix.w), 255.0)
        region = a > 8
        if region.sum() == 0: continue
        color = (rgb[region]*a[region, None]).sum(0)/a[region].sum()/255
        opacity = round(float(a[region].mean()/255), 3)
        cnts, _ = cv2.findContours(region.astype(np.uint8)*255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        sx, sy = b.width/pix.w, b.height/pix.h
        d = ''
        for cn in cnts:
            if cv2.contourArea(cn) < 50: continue
            ap = cv2.approxPolyDP(cn, 1.5, True)[:, 0, :]
            d += 'M' + ' L'.join(f"{fmt(mm(b.x0+px*sx))} {fmt(mm(b.y0+py*sy))}" for px, py in ap) + 'Z'
        notes.append(f'Transparente Bildflaeche (Verlauf/Maske) als einfarbige Flaeche {hexc(color)} mit Deckkraft {opacity} uebernommen – Verlauf geht verloren')
        final.append(('overlay', {'d': d, 'fill': hexc(color), 'opacity': opacity, 'bbox': b}))
    # ---------- Texte ----------
    texts = []
    td = page.get_text('dict')
    for blk in td['blocks']:
        for ln in blk.get('lines', []):
            spans = [s for s in ln['spans'] if s['text'].strip() and fitz.Rect(s['bbox']).intersects(PLATE)]
            merged = []
            for s in spans:
                if merged and merged[-1]['font'] == s['font'] and abs(merged[-1]['size']-s['size']) < 0.1 and merged[-1]['color'] == s['color']:
                    merged[-1]['text'] += s['text']; merged[-1]['bbox'] = tuple(fitz.Rect(merged[-1]['bbox']) | fitz.Rect(s['bbox']))
                else: merged.append(dict(s))
            for s in merged:
                t = s['text']
                if t.strip() in HINT_TEXT: continue
                t = unicodedata.normalize('NFKC', t).replace('\u0510', 'ff').replace('Ԑ', 'ff')
                for (dd, a), bb in TEXTFIX.items():
                    if dd == dn and a in t: t = t.replace(a, bb); corrections.append(f'Tippfehler „{a}“ → „{bb}“')
                if t != s['text'] and 'ff' in t and 'Tippfehler' not in ' '.join(corrections[-1:]): corrections.append(f'Ligatur/Kodierung bereinigt: „{t.strip()}“')
                src = re.sub(r'^[A-Z]{6}\+', '', s['font'])
                if src not in FONTMAP: raise SystemExit(f'{code}: Schrift ohne Zuordnung: {src}')
                font, why = FONTMAP[src]
                if why: fontrepl[src] = (font, why)
                texts.append({'srcfont': src, 'text': t.strip(), 'font': font, 'replaced': bool(why), 'size_mm': s['size']*K, 'origin': s['origin'],
                              'bbox': fitz.Rect(s['bbox']), 'color': '#%06x' % s['color'], 'dir': ln['dir']})
    # Texte aus Bild/Kurve (D08, D11, D28)
    def add_fit(text, font, rect, color, anchor='middle', align_x=None):
        w, l, t, b = text_width_mm(font, text, 1.0)
        size = (mm(rect.x1)-mm(rect.x0))/w
        hgt = (b-t)*size
        if hgt > (mm(rect.y1)-mm(rect.y0))*1.15: size *= (mm(rect.y1)-mm(rect.y0))*1.15/hgt
        base = mm(rect.y1) - b*size  # Unterkante Glyphen = Unterkante Box
        texts.append({'text': text, 'font': font, 'replaced': True, 'size_mm': size, 'fit': True, 'anchor': anchor,
                      'x': (mm(rect.x0)+mm(rect.x1))/2 if anchor == 'middle' else (align_x if align_x is not None else mm(rect.x0)), 'y': base,
                      'bbox': rect, 'color': color, 'dir': (1, 0)})
    if dn == 'D08':
        labels = ['Paco', '*03.03.2014', 'von: Kobalt', 'aus der: Sissi']
        for o, lab in zip(sorted(text_images, key=lambda o: o['bbox'][1]), labels):
            pix = fitz.Pixmap(doc, o['xref']); arr = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3]
            lum = arr.mean(2); col = arr[lum > lum.max()*0.6].mean(0)
            r = fitz.Rect(o['bbox'])
            # enge Box aus hellen Pixeln
            ys, xs = np.where(lum > lum.max()*0.35)
            r = fitz.Rect(r.x0+xs.min()*r.width/pix.w, r.y0+ys.min()*r.height/pix.h, r.x0+(xs.max()+1)*r.width/pix.w, r.y0+(ys.max()+1)*r.height/pix.h)
            add_fit(lab, 'Montserrat Light', r, '#%02x%02x%02x' % tuple(int(v) for v in col), anchor='start', align_x=mm(r.x0))
        fontrepl['(Text als Bild)'] = ('Montserrat Light', 'Auswahl Claude 16.11.2026, offen')
    if dn == 'D11':
        date = [t for t in texts if '2014' in t['text']]
        add_fit('Cosima', 'Allura', fitz.Rect(125.2/K, 143.5/K, 175.5/K, 169.4/K), '#1a1a1a')
        c = texts[-1]; w, l, tt, bb = text_width_mm('Allura', 'Cosima', 1.0); c['size_mm'] = 50.3/w
        if date: c['y'] = mm(date[0]['bbox'].y0) - 1.2
        fontrepl['(Text in Kurven)'] = ('Allura', 'Auswahl Claude 16.11.2026, offen')
    if dn == 'D28':
        rows = [('Besitzer:', 75.1, 81.5), ('Telefon:', 91.1, 97.7), ('Tierarzt:', 111.9, 118.5), ('Telefon:', 128.2, 134.8), ('Hufschmied:', 149.5, 156.1), ('Telefon:', 165.7, 172.3)]
        for lab, y0, y1 in rows:
            w, l, t, b = text_width_mm('Caviar Dreams', 'B', 1.0)
            size = (y1-y0)/(b-t)
            texts.append({'text': lab, 'font': 'Caviar Dreams', 'replaced': True, 'size_mm': size, 'fit': True, 'anchor': 'end', 'x': 172.4, 'y': y1 - b*size,
                          'bbox': fitz.Rect(130/K, y0/K, 172.4/K, y1/K), 'color': '#1a1a1a', 'dir': (1, 0)})
        fontrepl['(Text in Kurven)'] = ('Caviar Dreams', 'Auswahl Claude 16.11.2026, offen')
    # Ausrichtung / Ersatzschrift einpassen
    for t in texts:
        if t.get('fit'): continue
        cx = (mm(t['bbox'].x0)+mm(t['bbox'].x1))/2
        if t['replaced']:
            w_orig = mm(t['bbox'].x1)-mm(t['bbox'].x0)
            w_new = text_width_mm(t['font'], t['text'], t['size_mm'])[0]
            f = max(0.75, min(1.15, w_orig/w_new)) if w_new > 0 else 1
            if t.get('srcfont') == 'aAutoSignature' and w_orig > w_new and len(t['text']) > 1:
                f = 1.0; t['ls'] = (w_orig-w_new)/(len(t['text'])-1)
            t['size_mm'] *= f; t['anchor'] = 'middle'; t['x'] = cx; t['y'] = mm(t['origin'][1])
        else:
            t['anchor'] = 'start'; t['x'] = mm(t['origin'][0]); t['y'] = mm(t['origin'][1])
    # ---------- SVG ----------
    (OUT/code).mkdir(parents=True, exist_ok=True)
    W, H = 300, 200
    parts = [f'<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">',
             f'<title>{code} · Pferde-Boxenschild · 30x20</title><desc>Lieferform 2 (Druck/UV) aus Corel-Bogen BSUV-AD-30x20_Designs.cdr: native Texte, Vektorflaechen, austauschbare Fotofelder. RDG_WHITE und CutContour liegen als separate Produktionsquellen bei.</desc>']
    if plate_rect:
        parts.append(f'<rect id="platte" x="0" y="0" width="{W}" height="{H}" fill="{hexc(plate_rect[1])}"/>')
    deko_n, foto_layers = 0, []
    group, gcolor, gbox = [], None, None
    def flush():
        nonlocal group, deko_n
        if group:
            deko_n += 1; parts.append(f'<g id="deko-{deko_n}">' + ''.join(group) + '</g>'); group = []
    for kind, o in final:
        if kind == 'path':
            fill, col = o.get('fill'), o.get('color')
            attrs = []
            attrs.append(f'fill="{hexc(fill)}"' if fill else 'fill="none"')
            if o.get('even_odd') and fill: attrs.append('fill-rule="evenodd"')
            if col and o['type'] in ('s', 'fs'):
                attrs.append(f'stroke="{hexc(col)}" stroke-width="{fmt(mm(o.get("width") or 0))}"')
                lc = (o.get('lineCap') or (0,))[0]; lj = o.get('lineJoin') or 0
                attrs.append(f'stroke-linecap="{["butt","round","square"][int(lc)]}" stroke-linejoin="{["miter","round","bevel"][int(lj)]}"')
            op = o.get('fill_opacity') if fill else o.get('stroke_opacity')
            if op is not None and op < 0.999: attrs.append(f'opacity="{round(op,3)}"')
            d = path_d(o['items'], o.get('closePath'))
            key = (hexc(fill) if fill else None, hexc(col) if col else None)
            r = o['rect']
            near = gbox is not None and fitz.Rect(gbox.x0-15/K, gbox.y0-15/K, gbox.x1+15/K, gbox.y1+15/K).intersects(r)
            if group and (key != gcolor or not near): flush()
            if not group: gbox = fitz.Rect(r); gcolor = key
            else: gbox |= r
            group.append(f'<path d="{d}" ' + ' '.join(attrs) + '/>')
        elif kind == 'overlay':
            flush(); deko_n += 1
            parts.append(f'<g id="deko-{deko_n}" data-quelle="transparente-bildflaeche"><path d="{o["d"]}" fill="{o["fill"]}" opacity="{o["opacity"]}"/></g>')
        elif kind == 'foto':
            flush(); n = o['n']; w = o['win']; b = o['bbox']
            parts.append(f'<defs><clipPath id="FOTO_CLIP_{n}" clipPathUnits="userSpaceOnUse"><path d="{o["mask"]}"/></clipPath></defs>')
            parts.append(f'<g id="foto-{n}" data-upload-hint="separate" data-upload-window="{fmt(mm(w.x0))} {fmt(mm(w.y0))} {fmt(mm(w.width))} {fmt(mm(w.height))}">'
                         f'<path d="{o["mask"]}" fill="none"/>'
                         f'<image id="beispielfoto-{n}" data-field="photo" data-example="true" x="{fmt(mm(b.x0))}" y="{fmt(mm(b.y0))}" width="{fmt(mm(b.width))}" height="{fmt(mm(b.height))}" preserveAspectRatio="none" clip-path="url(#FOTO_CLIP_{n})" href="{o["file"]}"/></g>')
            foto_layers.append(o)
    flush()
    for i, t in enumerate(texts, 1):
        rot = ''
        dx, dy = t['dir']
        if abs(dy) > 1e-3: rot = f' transform="rotate({fmt(math.degrees(math.atan2(dy, dx)))} {fmt(t["x"])} {fmt(t["y"])})"'
        txt = t['text'].replace('&', '&amp;').replace('<', '&lt;')
        parts.append(f'<text id="text-{i}" x="{fmt(t["x"])}" y="{fmt(t["y"])}" font-family="{t["font"]}" font-size="{fmt(t["size_mm"])}" fill="{t["color"]}" text-anchor="{t["anchor"]}"{(' letter-spacing="'+fmt(t['ls'])+'"') if t.get('ls') else ''}{rot}>{txt}</text>')
    parts.append(f'<g id="kontur" inkscape:groupmode="layer" inkscape:label="CutContour" data-spot-name="CutContour" style="display:none"><path d="M0 0H{W}V{H}H0Z" fill="none" stroke="#0000ff" stroke-width="0.2"/></g></svg>')
    (OUT/code/'design.svg').write_text(''.join(parts), encoding='utf-8')
    # ---------- Produktionsquellen ----------
    wr = white_src['rect'] if white_src else fitz.Rect(-1.5/K, -1.5/K, 301.5/K, 201.5/K)
    (OUT/code/'RDG_WHITE.svg').write_text(f'<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}"><g id="RDG_WHITE" inkscape:groupmode="layer" inkscape:label="RDG_WHITE" fill="#ffffff" data-spot-name="RDG_WHITE" data-separation="spot" data-spread-mm="1.5"><path d="M{fmt(mm(wr.x0))} {fmt(mm(wr.y0))}H{fmt(mm(wr.x1))}V{fmt(mm(wr.y1))}H{fmt(mm(wr.x0))}Z"/></g></svg>', encoding='utf-8')
    (OUT/code/'CutContour.svg').write_text(f'<?xml version="1.0" encoding="utf-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}"><g id="kontur" inkscape:groupmode="layer" inkscape:label="CutContour" data-spot-name="CutContour"><path d="M0 0H{W}V{H}H0Z" fill="none" stroke="#0000ff" stroke-width="0.2"/></g></svg>', encoding='utf-8')
    page.get_pixmap(dpi=100).save(OUT/code/'original.png')
    fonts = sorted({t['font'] for t in texts})
    info = {
     'id': code, 'name': next((t['text'] for t in sorted(texts, key=lambda t: -t['size_mm'])), code), 'plateMm': [W, H],
     'themes': ['pferdeschilder'], 'fonts': fonts, 'zielgruppe': 'Tiere', 'unterkategorie': 'Pferde-Boxenschilder',
     'photoDesigns': 'mit' if foto_layers else 'ohne', 'fields': {}, 'ziele': [], 'freigabe': None,
     'process': 'color-print', 'material': 'Alu-Dibond', 'form': 'Rechteck', 'formatreihe': 'alu-dibond-30x20',
     'source': {'kind': 'corel-bogen', 'file': 'V:\\Produkte\\Boxenschilder\\UV\\Aludibond\\30x20\\[CDR]\\BSUV-AD-30x20_Designs.cdr',
                'pdf': 'BSUV-AD-30x20_Designs.pdf (CorelDRAW 2020, Export 16.11.2026 01:54)', 'pdfSha256': SOURCE_PDF_SHA,
                'einzelPdfSha256': sha(pdf_path), 'zerlegung': 'gravuru-2027 scripts/bogen_zerlegen.py'},
     'productionSources': {'white': 'RDG_WHITE.svg', 'cut': 'CutContour.svg', 'whiteName': 'RDG_WHITE', 'whiteSpreadMm': 1.5,
                           'cutColor': '#0000ff', 'direction': 'normal lesbar', 'printSide': 'front'},
     'photos': [{'feld': f'foto-{f["n"]}', 'file': f['file'], 'sha256': sha(OUT/code/f['file']), 'rolle': 'Beispielfoto aus der Corel-Vorlage, nur Vorschau, nie Fertigung'} for f in foto_layers],
     'fontReplacements': [{'original': k, 'ersatz': v[0], 'quelle': v[1]} for k, v in sorted(fontrepl.items())],
     'corrections': sorted(set(corrections)), 'notes': notes,
     'integration': {'status': 'lieferform2-entwurf', 'familyId': None, 'liveImported': False,
                     'note': 'Familie Alu-Dibond 30x20 ist im Katalog noch offen; Produktanlage erst nach Freigabe von Chris (Produktfreigabe-Excel).'},
    }
    (OUT/code/'design.json').write_text(json.dumps(info, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return info

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    rep = []
    for pdf in sorted(SRC.glob('BSUV-AD-30x20-D*.pdf')):
        (OUT/pdf.stem).mkdir(parents=True, exist_ok=True)
        i = convert(pdf)
        rep.append(i); print(i['id'], '| Fotos', len(i['photos']), '| Schriften', ','.join(i['fonts']), '| Ersatz', len(i['fontReplacements']), '| Korr', len(i['corrections']), '| Hinweise', len(i['notes']))
    json.dump(rep, open(OUT/'_bericht.json', 'w'), ensure_ascii=False, indent=1)
