"""Design-Bögen aus CorelDRAW (Bestand auf dem Server) ohne Corel lesen.

Ein Bogen (z. B. `D1-D49 Mensch mit Foto.cdr`) enthält je Design eine Gruppe mit Platte,
Motiven, Texten und einem SKU-Etikett (`GT-S-30x20-D7`). Gelesen wird über `cdr2raw`
(libcdr-tools); Bitmaps werden nur als Rahmen übernommen (keine Bilddaten). Je Design
entstehen `design.json` (Texte mit Schrift/Größe/Lage in mm, Motivpfade, Platte),
`design.svg` (Text bleibt Text, Motive als Pfade) und `preview.png`; je Bogen eine
Übersicht. Nichts wird erfunden: fehlende Schriften bleiben als Name stehen.

    python scripts/read-corel-design-sheets.py --out <ordner> --label "Mensch mit Foto" bogen.cdr [...]
    python scripts/read-corel-design-sheets.py --out <ordner> --from-list bogenliste.json

bogenliste.json: [{"file": ".../x.cdr", "label": "Tier ohne Foto", "material": "Schiefer", "process": "Gravur", "form": "Rechteck"}]
"""
import argparse, json, math, os, re, subprocess, sys
from pathlib import Path

IN = 25.4
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


ZERO_BITMAPS_OVER_MB = 300


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


def raw_lines(cdr):
    """cdr2raw streamen; Bitmapzeilen auf Kopf + Ende kürzen (dort stehen Lage und Größe)."""
    src, zeroed = zero_bitmaps(cdr)
    if zeroed: print(f'{Path(cdr).name}: Bitmap-Speicher genullt (zu groß für libcdr) – Bitmap-Rahmen entfallen')
    proc = subprocess.Popen(['cdr2raw', str(src)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    for raw in proc.stdout:
        if b'drawGraphicObject' in raw[:60]:
            yield (raw[:60] + b' ... ' + raw[-600:]).decode('utf-8', 'replace').rstrip('\n')
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
    text = None
    for line in raw_lines(cdr):
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
                target.append({'kind': 'image', 'bbox': [x, y, x + w, y + h], 'mime': p.get('librevenge:mime-type', '')})
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


def build_design(sku, items, label_item, meta):
    rest = [it for it in items if it is not label_item]
    area = lambda b: max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])
    xs = [b for it in rest for b in (it['bbox'][0], it['bbox'][2])]; ys = [b for it in rest for b in (it['bbox'][1], it['bbox'][3])]
    union = [min(xs), min(ys), max(xs), max(ys)] if xs else [0, 0, 1, 1]
    # Platte = größter Pfad oder größte Bitmap (Rechteck, Herz, Stern …), wenn er den Inhalt im Wesentlichen umschließt; sonst Umriss aller Elemente
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
            texts.append({'text': tp, 'font': sp0['font'], 'sizePt': round(sp0['sizePt'], 1), 'color': sp0['color'], 'align': it['paras'][0]['align'] if it['paras'] else 'left', 'box': rel(it['bbox'])})
        elif it['kind'] == 'path':
            if it is plate: continue
            st = it['style']
            motifs.append({'fill': st.get('draw:fill-color') if st.get('draw:fill') == 'solid' else None, 'stroke': st.get('svg:stroke-color') if st.get('draw:stroke') == 'solid' else None,
                           'strokeMm': round(inch(st.get('svg:stroke-width', '0')) * IN, 3), 'box': rel(it['bbox']), 'rect': it['rect'], 'd': to_svg_d(it['acts'], ox, oy)})
        elif it['kind'] == 'image':
            images.append({'box': rel(it['bbox']), 'mime': it['mime']})
    return {'id': sku, **meta, 'plate': {'widthMm': round(W, 1), 'heightMm': round(H, 1), 'source': plate_source}, 'texts': texts, 'fonts': fonts, 'motifs': motifs, 'images': images}


def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def light(c):
    """Gravurfarben (Grau/Weiß) für die Vorschau hell, Rot (Schnitt/Foto) rot."""
    if not c: return None
    c = c.lower()
    if c in ('#ff0000', '#00ff00'): return c
    return '#f2f2f2'


def design_svg(d, preview=False):
    W, H = d['plate']['widthMm'], d['plate']['heightMm']
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}mm" height="{H}mm">']
    if preview: out.append(f'<rect width="{W}" height="{H}" fill="#2a2a2a"/>')
    else: out.append(f'<rect id="platte" width="{W}" height="{H}" fill="none" stroke="#999" stroke-width="0.2"/>')
    for i, im in enumerate(d['images']):
        x, y, w, h = im['box']
        if abs(w - W) < 2 and abs(h - H) < 2: continue  # Plattenbitmap
        out.append(f'<rect id="foto-{i + 1}" x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#ff8080" stroke-width="0.3" stroke-dasharray="2 1"/>')
    for i, m in enumerate(d['motifs']):
        fill = light(m['fill']) if preview else (m['fill'] or 'none'); stroke = light(m['stroke']) if preview else (m['stroke'] or 'none')
        bx = m['box']; big = m['fill'] and bx[2] * bx[3] > 0.3 * W * H
        if big and preview:
            # große gefüllte Fläche = Fotoplatzhalter/Maske: nur Umriss, sonst verdeckt sie das Design
            out.append(f'<path id="motiv-{i + 1}" d="{m["d"]}" fill="none" stroke="#bbbbbb" stroke-width="0.5" stroke-dasharray="3 1.5"/>'); continue
        out.append(f'<path id="motiv-{i + 1}"{" data-role=\"foto?\"" if big else ""} d="{m["d"]}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{m["strokeMm"]}" fill-rule="evenodd"/>')
    for i, t in enumerate(d['texts']):
        x, y, w, h = t['box']; size = t['sizePt'] * 0.3528
        anchor = {'center': 'middle', 'right': 'end'}.get(t['align'], 'start'); tx = x + (w / 2 if anchor == 'middle' else w if anchor == 'end' else 0)
        fill = light(t['color']) if preview else (t['color'] or '#000')
        lines = t['text'].split('\n')
        out.append(f'<text id="text-{i + 1}" x="{tx:.2f}" y="{y + size * 0.85:.2f}" font-family="{esc(t["font"])}" font-size="{size:.2f}" fill="{fill}" text-anchor="{anchor}">'
                   + ''.join(f'<tspan x="{tx:.2f}" dy="{0 if j == 0 else size * 1.15:.2f}">{esc(l) or " "}</tspan>' for j, l in enumerate(lines)) + '</text>')
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
            (dd / 'design.json').write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
            (dd / 'design.svg').write_text(design_svg(d), encoding='utf-8')
            if not a.no_png and render_png(design_svg(d, preview=True), dd / 'preview.png'): n_png += 1
            slim = {k: v for k, v in d.items() if k != 'motifs'}; slim['motifCount'] = len(d['motifs']); slim['texts'] = [{k: t[k] for k in ('text', 'font', 'sizePt', 'align')} for t in d['texts']]
            if d['id'] in seen: index[seen[d['id']]] = slim
            else: seen[d['id']] = len(index); index.append(slim)
        if not a.no_png: contact_sheet(designs, out, f"{meta['process']} {meta['material']} {meta['form']} – {meta['sheetLabel'] or cdr.stem}")
        print(f"{cdr.name}: {len(groups)} Gruppen → {len(designs)} Designs, {sum(len(d['texts']) for d in designs)} Texte, {n_png} Vorschauen")
    (out / 'designs.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
