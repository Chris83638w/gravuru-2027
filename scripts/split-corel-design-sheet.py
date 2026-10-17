"""Corel-Designbogen (viele Schilder auf einer Seite) in Einzeldesigns zerlegen – Lieferform 2.

Konvention des Bogens (Hausnummer-/Namensschilder): je Design eine graue Platte
(Fläche), dahinter eine dunkle Rückplatte, Bohrlöcher als rote Ø-8-Kreise, weiße
Gestaltung (Text und Vektormotive) auf der Platte. Schraubenköpfe sind Fotos und
werden ignoriert.

Je Design entsteht ein Ordner nach Lieferform 2 (Plugin-Designstrecke, Paket D):
    <ordner>/<id>/design.svg   viewBox in mm = Plattenmaß; Ebenen text-<n> (echter
                               Text, text-anchor middle) und motiv-<n> (Pfade),
                               schwarz auf weiß (Gravur-Konvention)
    <ordner>/<id>/design.json  Name, Quelle, Plattenmaß, Schriften, Hinweise
Dazu bericht.md / bericht.csv (Felder, Schriften, Auffälligkeiten) und
uebersicht.png (aus den erzeugten SVGs gerendert – zum Gegenprüfen der Zerlegung).

    python scripts/split-corel-design-sheet.py bogen.pdf --out ordner/ [--prefix beispiele]
        [--fonts "Cinzel,Great Vibes,…"] [--numbers "1,3,7,…"]
--fonts: zugelassene Werkstatt-Schriften (sonst aus app/designs/steel-door-signs/family.json);
         nicht zugelassene Schriften bleiben im SVG stehen und werden gemeldet, nie ersetzt.
--numbers: Platzhalter-Hausnummern je Design der Reihe nach (nur Textfelder, die genau
         eine Zahl enthalten). Ohne Angabe bleibt der gezeichnete Text.
Liest nur. Keine Werkstatt, kein Shop, nichts wird importiert.
"""
import argparse, csv, hashlib, json, re, io
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
MM = 25.4 / 72
HOLE_D = 8.0


def rgb(c): return None if c is None else tuple(round(v, 2) for v in c)


def path_d(items, ox, oy):
    """PyMuPDF drawing items → SVG path (mm, relative to plate origin)."""
    f = lambda p: f'{(p.x * MM - ox):.3f} {(p.y * MM - oy):.3f}'
    out, last = [], None
    for it in items:
        k = it[0]
        if k == 're':
            r = it[1]; out.append(f'M{f(r.top_left)}L{f(r.top_right)}L{f(r.bottom_right)}L{f(r.bottom_left)}Z'); last = None; continue
        if k == 'qu':
            q = it[1]; out.append(f'M{f(q.ul)}L{f(q.ur)}L{f(q.lr)}L{f(q.ll)}Z'); last = None; continue
        p0 = it[1]
        if last is None or abs(p0.x - last.x) > 1e-6 or abs(p0.y - last.y) > 1e-6: out.append('M' + f(p0))
        if k == 'l': out.append('L' + f(it[2])); last = it[2]
        elif k == 'c': out.append(f'C{f(it[2])} {f(it[3])} {f(it[4])}'); last = it[4]
    return ''.join(out)


def esc(t): return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def font_name(pdf_font):
    """Corel-Schriftname (z. B. 'GreatVibes-Regular', 'ABCDEF+Cinzel-Regular') → lesbarer Name."""
    n = re.sub(r'^[A-Z]{6}\+', '', pdf_font).split('-')[0].replace('Regular', '')
    n = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', n)  # GreatVibes → Great Vibes
    return n.strip()


def split(pdf, out, prefix, fonts, numbers):
    doc = pymupdf.open(pdf); page = doc[0]
    drawings = page.get_drawings()
    plates = [d for d in drawings if d.get('fill') and 0.6 < d['fill'][0] < 0.9 and d['fill'][0] == d['fill'][1] == d['fill'][2] and d['rect'].width * MM > 40]
    plate_fill = rgb(plates[0]['fill']) if plates else None
    images = page.get_image_info()
    spans = [s for b in page.get_text('dict')['blocks'] if b['type'] == 0 for l in b['lines'] for s in l['spans']]
    plates.sort(key=lambda d: (round(d['rect'].y0 / 150), d['rect'].x0))
    out.mkdir(parents=True, exist_ok=True)
    rows, overview = [], []
    sha = hashlib.sha256(Path(pdf).read_bytes()).hexdigest()
    allowed = {f.lower() for f in fonts}
    for n, pl in enumerate(plates, 1):
        r = pl['rect']; ox, oy = r.x0 * MM, r.y0 * MM; w, h = round(r.width * MM, 1), round(r.height * MM, 1)
        # Zugehörigkeit: Textgrundlinie bzw. Flächenmitte liegt auf der Platte (Glyphenboxen dürfen überstehen).
        on_plate = lambda x, y: r.x0 <= x <= r.x1 and r.y0 <= y <= r.y1
        centre = lambda bb: on_plate((bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2)
        holes = [d for d in drawings if d.get('color') == (1.0, 0.0, 0.0) and abs(d['rect'].width * MM - HOLE_D) < .5 and centre(d['rect'])]
        texts = [s for s in spans if on_plate(*s['origin']) and s['text'].strip()]
        empty = [s for s in spans if on_plate(*s['origin']) and not s['text'].strip()]
        shapes = [d for d in drawings if d is not pl and d not in holes and d.get('fill') is not None and centre(d['rect']) and not d['rect'].contains(r)]
        layers, notes, used_fonts = [], [], []
        # Texte: echter Text, mittig verankert (Lieferform 2)
        texts.sort(key=lambda s: (round(s['bbox'][1]), s['bbox'][0]))
        number_idx = 0
        for i, s in enumerate(texts, 1):
            bb = s['bbox']; cx = (bb[0] + bb[2]) / 2 * MM - ox; base = s['origin'][1] * MM - oy; size = s['size'] * MM
            fam = font_name(s['font']); used_fonts.append(fam)
            text = s['text'].strip()
            if numbers and re.fullmatch(r'\d+[a-zA-Z]?', text) and number_idx == 0:
                text = numbers[(n - 1) % len(numbers)]; number_idx += 1; notes.append(f'Hausnummer-Platzhalter {s["text"].strip()} → {text}')
            if fam.lower() not in allowed: notes.append(f'Schrift nicht in der Werkstatt: {fam}')
            key = 'hausnummer' if re.fullmatch(r'\d+[a-zA-Z]?', s['text'].strip()) else 'text'
            layers.append(f'<g id="text-{i}" data-feld="{key}"><text x="{cx:.2f}" y="{base:.2f}" font-family="{esc(fam)}" font-size="{size:.2f}" text-anchor="middle" fill="#000">{esc(text)}</text></g>')
        if empty: notes.append(f'{len(empty)} leere Textobjekte ignoriert')
        # Motive: weiße Flächen → schwarz; plattenfarbene Flächen auf Motiven → weiß (Aussparung).
        # Alle Flächen eines Designs bilden eine Motivebene (Importgrenze: höchstens 20 Bestandteile je Design).
        paths = []
        for d in shapes:
            fill = rgb(d['fill'])
            if fill == (1.0, 1.0, 1.0): col = '#000'
            elif fill == plate_fill: col = '#fff'
            else: notes.append(f'Fläche mit Farbe {fill} als Motiv übernommen (Graustufe?)'); col = '#000'
            rule = ' fill-rule="evenodd"' if d.get('even_odd') else ''
            paths.append(f'<path d="{path_d(d["items"], ox, oy)}" fill="{col}"{rule}/>')
        if paths: layers.append(f'<g id="motiv-1" data-flaechen="{len(paths)}">' + ''.join(paths) + '</g>')
        if not texts and shapes: notes.append('kein echter Text – Schrift vermutlich in Kurven umgewandelt (nicht bearbeitbar)')
        notes = list(dict.fromkeys(notes))
        hole_pos = sorted((round((d['rect'].x0 + d['rect'].width / 2) * MM - ox, 1), round((d['rect'].y0 + d['rect'].height / 2) * MM - oy, 1)) for d in holes)
        did = f'{prefix}-{n:02d}'
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}">'
               f'<title>{esc(did)}</title>' + ''.join(layers) + '</svg>')
        folder = out / did; folder.mkdir(exist_ok=True)
        (folder / 'design.svg').write_text(svg, encoding='utf-8')
        meta = {'id': did, 'name': f'{prefix.capitalize()} {n:02d}', 'source': {'file': Path(pdf).name, 'sha256': sha, 'plateIndex': n},
                'plateMm': [w, h], 'holes': hole_pos, 'holeDiameterMm': HOLE_D, 'textFields': len(texts), 'motifs': len(shapes), 'fonts': sorted(set(used_fonts)), 'notes': notes}
        (folder / 'design.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
        rows.append({'id': did, 'Platte mm': f'{w:g} × {h:g}', 'Textfelder': len(texts), 'Texte': ' | '.join(s['text'].strip() for s in texts), 'Motive': len(shapes),
                     'Schriften': ', '.join(sorted(set(used_fonts))), 'Löcher': len(holes), 'Hinweise': '; '.join(notes)})
        overview.append((did, svg, w, h))
    # Bericht
    with (out / 'bericht.csv').open('w', newline='', encoding='utf-8') as fh:
        wr = csv.DictWriter(fh, fieldnames=list(rows[0].keys()), delimiter=';'); wr.writeheader(); wr.writerows(rows)
    md = [f'# Zerlegung {Path(pdf).name}', '', f'{len(rows)} Designs, Platte {rows[0]["Platte mm"]} mm, Quelle SHA-256 `{sha[:16]}…`', '',
          '| Design | Textfelder | Texte | Motive | Schriften | Hinweise |', '| --- | --- | --- | --- | --- | --- |']
    md += [f"| {r['id']} | {r['Textfelder']} | {r['Texte']} | {r['Motive']} | {r['Schriften']} | {r['Hinweise']} |" for r in rows]
    (out / 'bericht.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    # Übersicht aus den erzeugten SVGs (Schriften: Systemersatz, nur Geometrieprüfung)
    try:
        import cairosvg
        from PIL import Image, ImageDraw
        cols = 5; scale = 2.2; pad = 14
        cw, ch = int(overview[0][2] * scale) + pad, int(overview[0][3] * scale) + pad + 14
        im = Image.new('RGB', (cols * cw, ((len(overview) + cols - 1) // cols) * ch), (235, 233, 228)); dr = ImageDraw.Draw(im)
        for i, (did, svg, w, h) in enumerate(overview):
            png = cairosvg.svg2png(bytestring=svg.encode('utf-8'), output_width=int(w * scale), output_height=int(h * scale), background_color='white')
            x, y = (i % cols) * cw + pad // 2, (i // cols) * ch + pad // 2
            im.paste(Image.open(io.BytesIO(png)), (x, y)); dr.text((x, y + int(h * scale) + 2), did, fill=(40, 40, 40))
        im.save(out / 'uebersicht.png')
    except ImportError:
        pass
    return rows


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('pdf'); ap.add_argument('--out', required=True); ap.add_argument('--prefix', default='design')
    ap.add_argument('--fonts'); ap.add_argument('--numbers')
    a = ap.parse_args()
    fonts = [f.strip() for f in a.fonts.split(',')] if a.fonts else json.loads((ROOT / 'app/designs/steel-door-signs/family.json').read_text(encoding='utf-8'))['fonts']
    numbers = [v.strip() for v in a.numbers.split(',') if v.strip()] if a.numbers else None
    rows = split(a.pdf, Path(a.out), a.prefix, fonts, numbers)
    flagged = sum(1 for r in rows if r['Hinweise'])
    print(f'{len(rows)} Designs → {a.out} · {flagged} mit Hinweisen · Bericht: bericht.md / bericht.csv · uebersicht.png')


if __name__ == '__main__':
    main()
