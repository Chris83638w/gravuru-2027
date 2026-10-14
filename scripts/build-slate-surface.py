"""Schiefer-Rohling für den Konfigurator aus einem Musterfoto erzeugen.

Je Produktgröße (mm) entstehen zwei PNG-Dateien:
  <name>-flaeche.png   genau die Platte, außen transparent (Bruchkante bleibt),
                       ohne Schatten. Für die Materialfläche im Konfigurator,
                       die das Bild exakt auf die Plattenmaße legt.
  <name>-schatten.png  dieselbe Platte mit natürlichem Schlagschatten und
                       transparentem Rand. Für Produktbild, Szene und Listen.
                       Rand je Seite steht in surfaces.json (für eine spätere
                       Einbindung im Konfigurator).

Seitenverhältnis: Das Foto wird nicht verzerrt. Fehlende Breite/Höhe entsteht
durch Verlängern der Platte in der Mitte mit weicher Überblendung, damit die
Bruchkanten an den Ecken original bleiben. Danach Reduktion auf eine Palette
(libimagequant, mit Alpha) für kleine Dateien.

    python scripts/build-slate-surface.py --source foto.png --out ordner \
        --size 300x200 --size 220x140 [--px-per-mm 4]
Benötigt Pillow, numpy und imagequant.
"""
import argparse, json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
import imagequant


def trim(im):
    """Cut to the plate (alpha bounding box)."""
    return im.crop(im.split()[-1].point(lambda a: 255 if a > 8 else 0).getbbox())


def extend(arr, target, axis, overlap):
    """Lengthen arr along axis to target px by repeating the middle with a cross-fade."""
    size = arr.shape[axis]
    if target <= size:
        return arr
    mid = size // 2
    ov = max(4, min(overlap, mid // 3))
    extra = min(target - size, mid - ov)  # longer extensions run in several passes
    # part a ends at mid+ov, part b starts at mid-extra-ov: the middle band appears twice,
    # joined by a cross-fade of 2*ov px, so the result is exactly `extra` px longer
    a = np.take(arr, range(0, mid + ov), axis=axis).astype(np.float32)
    b = np.take(arr, range(mid - extra - ov, size), axis=axis).astype(np.float32)
    shape = [1] * arr.ndim; shape[axis] = 2 * ov
    ramp = np.linspace(0, 1, 2 * ov, dtype=np.float32).reshape(shape)
    head = np.take(a, range(0, a.shape[axis] - 2 * ov), axis=axis)
    blend = np.take(a, range(a.shape[axis] - 2 * ov, a.shape[axis]), axis=axis) * (1 - ramp) + np.take(b, range(0, 2 * ov), axis=axis) * ramp
    tail = np.take(b, range(2 * ov, b.shape[axis]), axis=axis)
    out = np.concatenate([head, blend, tail], axis=axis)
    if out.shape[axis] != target:  # long extensions: repeat until long enough
        return extend(out.astype(np.uint8), target, axis, overlap)
    return np.clip(out, 0, 255).astype(np.uint8)


def fit(plate, w_mm, h_mm, px_per_mm):
    W, H = round(w_mm * px_per_mm), round(h_mm * px_per_mm)
    pw, ph = plate.size
    # scale so the plate covers the shorter dimension exactly, then extend the other one
    k = min(W / pw, H / ph)
    base = plate.resize((max(1, round(pw * k)), max(1, round(ph * k))), Image.LANCZOS)
    arr = np.asarray(base)
    arr = extend(arr, W, 1, max(8, W // 40))
    arr = extend(arr, H, 0, max(8, H // 40))
    return Image.fromarray(arr[:H, :W], 'RGBA')


def with_shadow(plate):
    """Soft cast shadow (light from top left) plus a tight contact shadow."""
    w, h = plate.size
    s = max(w, h)
    pad = round(s * 0.06)
    canvas = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    alpha = plate.split()[-1]

    def layer(dx, dy, blur, opacity):
        a = Image.new('L', canvas.size, 0)
        a.paste(alpha, (pad + dx, pad + dy))
        a = a.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: round(v * opacity))
        sh = Image.new('RGBA', canvas.size, (12, 10, 8, 0)); sh.putalpha(a)
        return sh

    canvas = Image.alpha_composite(canvas, layer(round(s * .006), round(s * .016), s * .022, .7))  # cast
    canvas = Image.alpha_composite(canvas, layer(round(s * .001), round(s * .003), s * .004, .5))   # contact
    canvas.alpha_composite(plate, (pad, pad))
    return canvas, pad


def save_small(im, path):
    # A 0.5-px softening removes sensor noise that PNG cannot compress; at screen size the
    # stone grain stays the same (compared side by side at 200 %). Alpha stays untouched.
    soft = im.filter(ImageFilter.GaussianBlur(0.5)); soft.putalpha(im.split()[-1])
    q = imagequant.quantize_pil_image(soft, dithering_level=0.4, max_colors=96, min_quality=50, max_quality=85)
    q.save(path, optimize=True)
    return path.stat().st_size


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', required=True); p.add_argument('--out', required=True)
    p.add_argument('--size', action='append', required=True, help='Breite x Höhe in mm, z. B. 300x200')
    p.add_argument('--px-per-mm', type=float, default=4); p.add_argument('--name', default='schiefer-natur')
    a = p.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    src = Path(a.source); plate = trim(Image.open(src).convert('RGBA'))
    report = {'source': src.name, 'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'pxPerMm': a.px_per_mm, 'files': []}
    for size in a.size:
        w_mm, h_mm = (float(v) for v in size.lower().split('x'))
        tag = f'{a.name}-{int(w_mm)}x{int(h_mm)}'
        surface = fit(plate, w_mm, h_mm, a.px_per_mm)
        shadow, pad = with_shadow(surface)
        f1, f2 = out / f'{tag}-flaeche.png', out / f'{tag}-schatten.png'
        report['files'].append({'sizeMm': [w_mm, h_mm], 'surface': {'file': f1.name, 'px': surface.size, 'bytes': save_small(surface, f1)},
                                'shadow': {'file': f2.name, 'px': shadow.size, 'bytes': save_small(shadow, f2), 'paddingPx': pad, 'paddingMm': round(pad / a.px_per_mm, 2)}})
    (out / 'surfaces.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))
    for f in report['files']:
        print(f"{f['sizeMm'][0]:g} × {f['sizeMm'][1]:g} mm: Fläche {f['surface']['px'][0]}×{f['surface']['px'][1]} px {f['surface']['bytes']//1024} KB · mit Schatten {f['shadow']['px'][0]}×{f['shadow']['px'][1]} px {f['shadow']['bytes']//1024} KB")


if __name__ == '__main__':
    main()
