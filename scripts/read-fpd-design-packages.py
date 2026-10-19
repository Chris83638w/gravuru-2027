"""UV-Designs aus den Konfigurator-Paketen des Bestands lesen (ohne Corel).

Zwei Quellen je Design-SKU-Ordner auf dem Server:
  1. `<SKU>.zip` – Fancy-Product-Designer-Paket: product.json (Textelemente mit Schrift, Größe,
     Ausrichtung, Lage), Ebenenbilder (Bild_1.jpg = Druckmotiv), `<SKU>_front.jpg` (Vorschau).
  2. `[Amazon-Konfi]/<SKU> View-1 Design.png` – nur das gerenderte Design; Texte werden per
     tesseract (deu) gelesen und als „OCR“ markiert, Schriften bleiben offen.
Ausgabe wie read-corel-design-sheets.py: je Design ein Ordner mit design.json, preview.png,
dazu designs.json (Index) und Übersichtsbögen. Nichts wird erfunden.

    python scripts/read-fpd-design-packages.py --out <ordner> --process UV --material Granit --form Rechteck datei.zip [...]
"""
import argparse, io, json, math, re, subprocess, zipfile
from pathlib import Path
from PIL import Image, ImageOps

SKU = re.compile(r'^([A-Z]{2,6}[A-Z0-9]*(?:-[A-Z0-9]+)*?-(?:\([\d.,]+x[\d.,]+\))?[\d.,]+(?:x[\d.,]+)?(?:\([\d.,]+x[\d.,]+\))?[a-zA-Z]{0,3})-D(\d+)$')


def plate_mm_from_sku(sku):
    m = re.search(r'-(\d+(?:[.,]\d+)?)x(\d+(?:[.,]\d+)?)-D', sku)
    return (float(m.group(1).replace(',', '.')) * 10, float(m.group(2).replace(',', '.')) * 10) if m else (None, None)


def svg_size(data):
    m = re.search(rb'viewBox="([^"]+)"', data) or re.search(rb"viewBox='([^']+)'", data)
    if m:
        p = m.group(1).split(); return float(p[2]), float(p[3])
    w = re.search(rb'width="([\d.]+)', data); h = re.search(rb'height="([\d.]+)', data)
    return (float(w.group(1)), float(h.group(1))) if w and h else (None, None)


NO_OCR = False


class DirPackage:
    """Entpackter Paketauszug (Light-Kopie: product.json, *_front.jpg, Hauptform*.svg) mit Zip-Schnittstelle."""
    def __init__(self, d): self.d = Path(d)
    def namelist(self): return [p.name for p in sorted(self.d.iterdir()) if p.is_file()]
    def read(self, n): return (self.d / n).read_bytes()


def open_pkg(zp):
    return DirPackage(zp) if Path(zp).is_dir() else zipfile.ZipFile(zp)


def read_zip(zp, meta):
    z = open_pkg(zp); names = z.namelist()
    pj = json.loads(z.read('product.json'))
    stem = Path(zp).name if Path(zp).is_dir() else Path(zp).stem
    sku = stem if SKU.match(stem) else (pj.get('title') or stem)
    W, H = plate_mm_from_sku(sku)
    # Maßstab: Hauptform (Plattenumriss) in Stage-Pixeln ↔ Plattenmaß in mm
    scale = None
    for n in names:
        if n.lower().startswith('hauptform') and n.lower().endswith('.svg'):
            pw, ph = svg_size(z.read(n))
            if pw and W: scale = W / pw
            break
    texts, images, fonts = [], [], []
    for v in pj.get('views', [])[:1]:
        for e in v.get('elements', []):
            p = e.get('parameters', {})
            if e.get('type') == 'text':
                t = e.get('source') if isinstance(e.get('source'), str) and not e.get('source', '').lower().endswith(('.svg', '.png', '.jpg')) else p.get('text', '')
                t = t or ''
                if not t.strip(): continue
                f = p.get('fontFamily', '')
                if f and f not in fonts: fonts.append(f)
                box = None
                if scale and 'left' in p and 'top' in p:
                    w = p.get('width', 0) * scale; h = (p.get('height') or p.get('fontSize', 0) * 1.2) * scale
                    # FPD: left/top = Mittelpunkt (originX/Y center) – ohne Angabe als Mitte angenommen
                    box = [round(p['left'] * scale - w / 2, 2), round(p['top'] * scale - h / 2, 2), round(w, 2), round(h, 2)]
                texts.append({'text': t, 'font': f, 'sizePt': round(p.get('fontSize', 0) * (scale or 0) / 0.3528, 1) if scale else None, 'sizePx': p.get('fontSize'), 'color': p.get('fill') if isinstance(p.get('fill'), str) else '', 'align': p.get('textAlign', 'left'), 'box': box, 'curved': bool(p.get('curved'))})
            elif e.get('type') == 'image':
                images.append({'title': e.get('title', ''), 'source': e.get('source', ''), 'uploadZone': bool(p.get('uploadZone'))})
    if not texts and not NO_OCR:
        # Paket ohne Textelemente (Text im Druckbild): Vorschau per OCR lesen, als OCR markiert
        front = next((n for n in names if n.lower().endswith('_front.jpg')), None)
        if front:
            im = Image.open(io.BytesIO(z.read(front))).convert('RGB'); im = im.resize((im.width * 3, im.height * 3), Image.LANCZOS)
            buf = io.BytesIO(); ImageOps.autocontrast(im.convert('L')).save(buf, 'PNG')
            try:
                r = subprocess.run(['tesseract', 'stdin', 'stdout', '-l', 'deu', '--psm', '6'], input=buf.getvalue(), capture_output=True, timeout=120)
                lines = [l.strip() for l in r.stdout.decode('utf-8', 'replace').splitlines() if len(l.strip()) > 2 and re.search(r'[A-Za-zÄÖÜäöüß]{3,}|\d{4}', l)]
                texts = [{'text': l, 'font': '', 'sizePt': None, 'color': '', 'align': '', 'box': None, 'ocr': True} for l in lines]
            except Exception:
                pass
    return {'id': sku, **meta, 'plate': {'widthMm': W, 'heightMm': H, 'source': 'sku'}, 'texts': texts, 'fonts': fonts, 'motifs': [], 'images': images,
            'photo': any(i['uploadZone'] for i in images), 'sourceKind': 'fpd-zip'}, z


def ocr(png):
    try:
        im = Image.open(png).convert('RGBA'); bg = Image.new('RGBA', im.size, (40, 40, 40, 255)); bg.alpha_composite(im)
        g = ImageOps.autocontrast(bg.convert('L'))
        # helle Schrift auf dunklem Grund → invertieren für tesseract
        if g.getpixel((2, 2)) < 128: g = ImageOps.invert(g)
        buf = io.BytesIO(); g.save(buf, 'PNG')
        r = subprocess.run(['tesseract', 'stdin', 'stdout', '-l', 'deu', '--psm', '6'], input=buf.getvalue(), capture_output=True, timeout=120)
        lines = [l.strip() for l in r.stdout.decode('utf-8', 'replace').splitlines() if len(l.strip()) > 1]
        return [l for l in lines if re.search(r'[A-Za-zÄÖÜäöüß]{2,}|\d{4}', l)]
    except Exception as e:
        return []


def read_png(png, meta):
    sku = Path(png).name.split(' View-1')[0]
    W, H = plate_mm_from_sku(sku)
    lines = ocr(png)
    return {'id': sku, **meta, 'plate': {'widthMm': W, 'heightMm': H, 'source': 'sku'}, 'texts': [{'text': l, 'font': '', 'sizePt': None, 'color': '', 'align': '', 'box': None, 'ocr': True} for l in lines],
            'fonts': [], 'motifs': [], 'images': [], 'photo': None, 'sourceKind': 'konfi-png'}


def preview_from_png(png, out, width=700):
    im = Image.open(png).convert('RGBA'); bg = Image.new('RGBA', im.size, (42, 42, 42, 255)); bg.alpha_composite(im)
    im = bg.convert('RGB'); im.thumbnail((width, width)); im.save(out)


def contact_sheet(designs, out_dir, title, cols=4):
    from PIL import ImageDraw
    tiles = [(d, out_dir / d['id'] / 'preview.png') for d in designs if (out_dir / d['id'] / 'preview.png').exists()]
    if not tiles: return
    tw = 420; th = int(tw * max((d['plate']['heightMm'] or 1) / (d['plate']['widthMm'] or 1) for d, _ in tiles)) + 30
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
    ap.add_argument('files', nargs='*'); ap.add_argument('--out', required=True)
    ap.add_argument('--process', default='UV'); ap.add_argument('--material', default=''); ap.add_argument('--form', default='Rechteck'); ap.add_argument('--label', default='')
    ap.add_argument('--no-ocr', action='store_true', help='Pakete ohne Textelemente nicht per tesseract lesen (Massenlauf)')
    ap.add_argument('--from-list', default='', help='Textdatei: ein Paket (Zip oder entpackter Ordner) je Zeile')
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    global NO_OCR; NO_OCR = a.no_ocr
    if a.from_list: a.files = [l.strip() for l in Path(a.from_list).read_text(encoding='utf-8').splitlines() if l.strip()]
    meta = {'sheet': '', 'sheetLabel': a.label, 'material': a.material, 'process': a.process, 'form': a.form}
    index = json.loads((out / 'designs.json').read_text(encoding='utf-8')) if (out / 'designs.json').exists() else []
    seen = {d['id']: i for i, d in enumerate(index)}
    designs = []
    for f in a.files:
        f = Path(f)
        if not f.exists(): print('fehlt:', f); continue
        try:
            if f.suffix.lower() == '.zip' or f.is_dir():
                d, z = read_zip(f, {**meta, 'sheet': f.name}); dd = out / d['id']; dd.mkdir(exist_ok=True)
                front = next((n for n in z.namelist() if n.lower().endswith('_front.jpg')), None)
                if front:
                    im = Image.open(io.BytesIO(z.read(front))).convert('RGB'); im.thumbnail((700, 700)); im.save(dd / 'preview.png')
                keep = [n for n in z.namelist() if n == 'product.json' or n.lower().endswith('.svg') or n.lower().startswith('bild')]
                for n in keep: (dd / Path(n).name).write_bytes(z.read(n))
                d['files'] = [Path(n).name for n in keep]
            else:
                d = read_png(f, {**meta, 'sheet': f.name}); dd = out / d['id']; dd.mkdir(exist_ok=True)
                preview_from_png(f, dd / 'preview.png'); (dd / 'design.png').write_bytes(f.read_bytes()); d['files'] = ['design.png']
        except Exception as e:
            print('Fehler', f.name, str(e)[:100]); continue
        (dd / 'design.json').write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding='utf-8')
        slim = {k: v for k, v in d.items() if k != 'motifs'}; slim['motifCount'] = 0; slim['texts'] = [{k: t.get(k) for k in ('text', 'font', 'sizePt', 'align', 'ocr', 'box')} for t in d['texts']]
        if d['id'] in seen: index[seen[d['id']]] = slim
        else: seen[d['id']] = len(index); index.append(slim)
        designs.append(d)
    (out / 'designs.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding='utf-8')
    contact_sheet(designs, out, f"{a.process} {a.material} {a.form} {a.label}".strip())
    print(f'{len(designs)} Designs → {out}')


if __name__ == '__main__':
    main()
