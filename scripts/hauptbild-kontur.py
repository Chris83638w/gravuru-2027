#!/usr/bin/env python3
"""Hauptbild aus einem Katalog-Design (design.svg) mit voller Kontur, z. B. Grabstecker mit ganzem Stiel.

Chris 02.11.2026: „Bei Grabsteckern soll der Stiel im Hauptbild vermerkt werden. Der Kunde muss sehen, dass es sich
um einen Grabstecker handelt.“ Das Bild zeigt die echte Schnittkontur (id="platte") mit Materialoberfläche und die
Gravur exakt aus dem Katalog – keine KI-Erfindung, freigestellt auf hellem Grund, quadratisch, WebP ≤ 2000 px.

Aufruf: python3 scripts/hauptbild-kontur.py --svg <design.svg> --material <textur.png> --out <datei.webp>
        [--groesse 2000] [--hintergrund F3F2EF] [--gravur 1E1E1E] [--fuellung 0.86]
"""
import argparse, io, re
import cairosvg
from PIL import Image, ImageFilter, ImageOps, ImageChops


def render(svg_text, width):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg_text.encode(), output_width=width))).convert('RGBA')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--svg', required=True); ap.add_argument('--material', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--groesse', type=int, default=2000); ap.add_argument('--hintergrund', default='F3F2EF')
    ap.add_argument('--gravur', default='1E1E1E'); ap.add_argument('--fuellung', type=float, default=0.86)
    a = ap.parse_args()
    svg = open(a.svg, encoding='utf-8').read()
    vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
    w_mm, h_mm = vb[2], vb[3]
    S = a.groesse
    scale = a.fuellung * S / max(w_mm, h_mm)
    pw, ph = max(1, round(w_mm * scale)), max(1, round(h_mm * scale))
    plate = re.search(r'<path[^>]*id="platte"[^>]*/?>', svg)
    if not plate:
        raise SystemExit('design.svg ohne Kontur id="platte"')
    # Maske der Kontur: nur die Platte schwarz gefüllt.
    d = re.search(r'\sd="([^"]+)"', plate.group(0)).group(1)
    mask_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str, vb))}"><path d="{d}" fill="#000"/></svg>'
    mask = render(mask_svg, pw).split()[3].resize((pw, ph))
    # Gravur: alles außer der Platte, Platte unsichtbar.
    eng_svg = svg.replace(plate.group(0), '')
    eng = render(eng_svg, pw).resize((pw, ph))
    eng_alpha = ImageChops.multiply(eng.split()[3], mask)
    # Material: Textur deckend über die Plattengröße (Bürstrichtung waagerecht wie im Konfi).
    tex = Image.open(a.material).convert('RGB')
    tex = ImageOps.fit(tex, (pw, ph), method=Image.LANCZOS) if pw * ph else tex
    canvas = Image.new('RGB', (S, S), '#' + a.hintergrund)
    ox, oy = (S - pw) // 2, (S - ph) // 2
    # Weicher Schatten nach unten rechts.
    shadow = Image.new('L', (S, S), 0); shadow.paste(mask, (ox + round(S * 0.008), oy + round(S * 0.012)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(S * 0.01)).point(lambda v: int(v * 0.28))
    canvas.paste(Image.new('RGB', (S, S), '#5A5853'), (0, 0), shadow)
    canvas.paste(tex, (ox, oy), mask)
    canvas.paste(Image.new('RGB', (pw, ph), '#' + a.gravur), (ox, oy), eng_alpha)
    canvas.save(a.out, 'WEBP', quality=86, method=6)
    print(a.out, canvas.size)


if __name__ == '__main__':
    main()
