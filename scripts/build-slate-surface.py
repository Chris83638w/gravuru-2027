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
durch Verlängern der Platte an einer inneren Stelle mit weicher Überblendung;
Ecken und Bruchkanten an den Ecken bleiben original.

Jede Platte sieht anders aus (--variants je Größe): Spiegelung, umgestellte
Innenbereiche und Kantenabfolge, andere Verlängerungsstellen und weiche
Hell-Dunkel-Wolken. Fest je Größe und Variante, also wiederholbar.
Große Platten werden auf --max-px Pixel an der langen Kante und --max-mpx
Megapixel begrenzt, damit die Dateien klein bleiben. Danach Reduktion auf eine Palette
(libimagequant, mit Alpha) für kleine Dateien.

    python scripts/build-slate-surface.py --source foto.png --out ordner \
        --size 300x200 --size 220x140 [--variants 3] [--px-per-mm 4] [--max-px 1600] [--max-mpx 1.0]
Benötigt Pillow, numpy, scipy und imagequant.
"""
import argparse, json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
import imagequant
from scipy.ndimage import gaussian_filter


def trim(im):
    """Cut to the plate (alpha bounding box)."""
    return im.crop(im.split()[-1].point(lambda a: 255 if a > 8 else 0).getbbox())


def _join(a, b, axis, ov):
    """Concatenate a and b along axis. Their last/first 2*ov px overlap; inside the
    overlap the boundary follows the path of least difference (image quilting), so
    no straight seam is visible. A 2-px feather softens the cut."""
    if axis == 0:
        return _join(a.swapaxes(0, 1), b.swapaxes(0, 1), 1, ov).swapaxes(0, 1)
    o = 2 * ov
    A, B = a[:, -o:], b[:, :o]
    cost = ((A - B) ** 2).sum(axis=2)
    M = cost.copy()
    for i in range(1, M.shape[0]):
        prev = M[i - 1]
        best = np.minimum(prev, np.minimum(np.r_[np.inf, prev[:-1]], np.r_[prev[1:], np.inf]))
        M[i] += best
    path = np.empty(M.shape[0], dtype=np.int64); path[-1] = int(M[-1].argmin())
    for i in range(M.shape[0] - 2, -1, -1):
        j = path[i + 1]; lo, hi = max(0, j - 1), min(o, j + 2)
        path[i] = lo + int(M[i, lo:hi].argmin())
    cols = np.arange(o, dtype=np.float32)[None, :]
    mask = np.clip((cols - path[:, None] + 1.5) / 3, 0, 1)[..., None]  # 0 = a, 1 = b
    blend = A * (1 - mask) + B * mask
    return np.concatenate([a[:, :-o], blend, b[:, o:]], axis=1)


def flatten(arr, sigma):
    """Remove the photo's large-scale light fall-off (alpha-weighted), keep the grain.
    Without this, joined areas of different brightness show as bands."""
    w = arr[..., 3:4] / 255
    lum = (arr[..., :3] * [.299, .587, .114]).sum(axis=2, keepdims=True)
    blur = lambda x: gaussian_filter(x[..., 0], sigma)[..., None]
    local = blur(lum * w) / np.maximum(blur(w.astype(np.float32)), 1e-3)
    mean = (lum * w).sum() / max(w.sum(), 1)
    out = arr.copy(); out[..., :3] = arr[..., :3] * np.clip(mean / np.maximum(local, 1), .6, 1.6)
    return out


def extend(arr, target, axis, ov, rng):
    """Lengthen arr along axis to target px: at a random inner position a band of the
    plate is repeated, joined by a soft cross-fade. Corners and the broken edge near
    the corners always stay original."""
    arr = arr.astype(np.float32)
    while arr.shape[axis] < target:
        size = arr.shape[axis]
        pos = int(size * rng.uniform(.33, .67))
        extra = min(target - size, int(size * .3))
        a = np.take(arr, range(0, pos + ov), axis=axis)
        b = np.take(arr, range(pos - extra - ov, size), axis=axis)
        arr = _join(a, b, axis, ov)
    return arr


def shuffle(arr, axis, ov, rng):
    """Remove a band at one inner position and add one at another: same size, but the
    grain and the sequence of edge breaks differ from the photo."""
    size = arr.shape[axis]
    width = int(size * rng.uniform(.12, .22))
    pos = int(size * rng.uniform(.3, .7 - .22))
    cut = _join(np.take(arr, range(0, pos + ov), axis=axis), np.take(arr, range(pos + width - ov, size), axis=axis), axis, ov)
    return extend(cut, size, axis, ov, rng)


def clouds(arr, rng, strength=.08):
    """Soft, low-frequency light/dark variation as on real slate (preview only)."""
    h, w = arr.shape[:2]
    grid = rng.normal(0, 1, (rng.integers(3, 6), rng.integers(4, 8))).astype(np.float32)
    field = np.asarray(Image.fromarray(grid).resize((w, h), Image.BICUBIC), dtype=np.float32)
    field = field / (np.abs(field).max() or 1)
    # plus a soft light fall-off from the upper left (angle varies a little per plate)
    ang = np.deg2rad(rng.uniform(25, 60))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ramp = (xx / w * np.cos(ang) + yy / h * np.sin(ang)); ramp = (ramp - ramp.mean()) / (np.abs(ramp - ramp.mean()).max() or 1)
    gain = 1 + strength * field - .07 * ramp + rng.uniform(-.03, .03)
    arr = arr.copy(); arr[..., :3] = arr[..., :3] * gain[..., None]
    return arr


def fit(plate, w_mm, h_mm, px_per_mm, rng):
    W, H = round(w_mm * px_per_mm), round(h_mm * px_per_mm)
    if rng.random() < .5:  # mirroring left/right keeps the top-left light of the photo
        plate = plate.transpose(Image.FLIP_LEFT_RIGHT)
    pw, ph = plate.size
    k = min(W / pw, H / ph)  # the shorter side fits exactly, the other one is extended
    arr = np.asarray(plate.resize((max(1, round(pw * k)), max(1, round(ph * k))), Image.LANCZOS)).astype(np.float32)
    arr = flatten(arr, max(W, H) / 12)
    ovx, ovy = max(12, W // 50), max(12, H // 50)
    arr = shuffle(arr, 1, ovx, rng); arr = shuffle(arr, 0, ovy, rng)
    arr = extend(arr, W, 1, ovx, rng); arr = extend(arr, H, 0, ovy, rng)
    arr = clouds(arr[:H, :W], rng)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')


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


def save_small(im, path, soft_shadow=False):
    # A 0.5-px softening removes sensor noise that PNG cannot compress; at screen size the
    # stone grain stays the same (compared side by side at 200 %). Alpha stays untouched.
    soft = im.filter(ImageFilter.GaussianBlur(0.5)); soft.putalpha(im.split()[-1])
    # The soft shadow needs more palette entries and dithering, otherwise its fade-out
    # shows visible alpha steps on light backgrounds.
    q = imagequant.quantize_pil_image(soft, dithering_level=1.0 if soft_shadow else 0.4, max_colors=256 if soft_shadow else 96, min_quality=50, max_quality=90 if soft_shadow else 85)
    q.save(path, optimize=True)
    return path.stat().st_size


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', required=True); p.add_argument('--out', required=True)
    p.add_argument('--size', action='append', required=True, help='Breite x Höhe in mm, z. B. 300x200')
    p.add_argument('--px-per-mm', type=float, default=4); p.add_argument('--name', default='schiefer-natur')
    p.add_argument('--variants', type=int, default=3, help='unterschiedlich aussehende Platten je Größe')
    p.add_argument('--max-px', type=int, default=1600, help='längste Bildkante; große Platten werden so begrenzt')
    p.add_argument('--max-mpx', type=float, default=1.0, help='höchstens so viele Megapixel je Platte (Dateigröße)')
    a = p.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    src = Path(a.source); plate = trim(Image.open(src).convert('RGBA'))
    report = {'source': src.name, 'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'maxPxPerMm': a.px_per_mm, 'maxPx': a.max_px, 'maxMpx': a.max_mpx, 'files': []}
    for size in a.size:
        w_mm, h_mm = (float(v) for v in size.lower().split('x'))
        ppm = min(a.px_per_mm, a.max_px / max(w_mm, h_mm), (a.max_mpx * 1e6 / (w_mm * h_mm)) ** .5)
        for v in range(1, a.variants + 1):
            # fixed seed per size and variant: rebuilding gives the same plate again
            rng = np.random.default_rng(int(hashlib.sha256(f'{a.name}|{size}|{v}'.encode()).hexdigest()[:12], 16))
            tag = f'{a.name}-{int(w_mm)}x{int(h_mm)}-v{v}'
            surface = fit(plate, w_mm, h_mm, ppm, rng)
            shadow, pad = with_shadow(surface)
            f1, f2 = out / f'{tag}-flaeche.png', out / f'{tag}-schatten.png'
            report['files'].append({'sizeMm': [w_mm, h_mm], 'variant': v, 'pxPerMm': round(ppm, 3),
                                    'surface': {'file': f1.name, 'px': surface.size, 'bytes': save_small(surface, f1)},
                                    'shadow': {'file': f2.name, 'px': shadow.size, 'bytes': save_small(shadow, f2, soft_shadow=True), 'paddingPx': pad, 'paddingMm': round(pad / ppm, 2)}})
    (out / 'surfaces.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))
    for f in report['files']:
        print(f"{f['sizeMm'][0]:g} × {f['sizeMm'][1]:g} mm v{f['variant']}: Fläche {f['surface']['px'][0]}×{f['surface']['px'][1]} px {f['surface']['bytes']//1024} KB · mit Schatten {f['shadow']['px'][0]}×{f['shadow']['px'][1]} px {f['shadow']['bytes']//1024} KB")


if __name__ == '__main__':
    main()
