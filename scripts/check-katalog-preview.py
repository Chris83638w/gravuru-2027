"""Sichtprüfung Katalog-Linie im Konfigurator (synthetische DB): je Produkt Startansicht als PNG.

    python3 scripts/check-katalog-preview.py --katalog <pfad> --linie gedenktafeln-22x14-tiere [--out .test-output/katalog-preview]

Prüft je Produkt: Konfigurator lädt ohne Seitenfehler, erstes Design = Startdesign, Fotofeld zeigt
das Platzhalterbild (Klickfläche „Foto hochladen“). Schreibt bericht.json und <produkt>.png.
"""
import argparse, json, os, subprocess, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SLATE = (0x34, 0x3b, 0x3d)  # Vorschaufarbe Schiefer (product-families.mjs)


def crop_plate(png):
    """Platte (Schieferfläche) aus dem Screenshot schneiden: Zeilen und Spalten, in denen Schieferfarbe überwiegt."""
    from PIL import Image
    im = Image.open(png).convert('RGB'); w, h = im.size; px = im.load(); rows = [0] * h; cols = [0] * w
    for y in range(0, h, 2):
        for x in range(0, w * 11 // 20, 2):
            r, g, b = px[x, y]
            if abs(r - SLATE[0]) < 8 and abs(g - SLATE[1]) < 8 and abs(b - SLATE[2]) < 8: rows[y] += 1; cols[x] += 1
    if max(rows) < 50: return None
    ys = [y for y, n in enumerate(rows) if n > 0.4 * max(rows)]; xs = [x for x, n in enumerate(cols) if n > 0.4 * max(cols)]
    return im.crop((min(xs), min(ys), max(xs) + 2, max(ys) + 2))

def crop_white_plate(png, frame, product, scale):
    from PIL import Image
    width = product['widthMm']
    height = product['heightMm']
    locator = frame.locator(f'svg.scene rect[width="{width}"][height="{height}"][fill^="url("]').first
    bounds = locator.bounding_box()
    if not bounds:
        raise RuntimeError('Alu-Dibond-Platte ist in der Vorschau nicht sichtbar.')
    x, y, w, h = (bounds[k] for k in ('x', 'y', 'width', 'height'))
    with Image.open(png) as image:
        return image.convert('RGB').crop(tuple(round(v * scale) for v in (x, y, x + w, y + h)))


def main_image(plate, target, size=2000):
    """Shop-Hauptbild: Platte mittig auf hellem Grund mit weichem Schatten (Seitenverhältnis bleibt)."""
    from PIL import Image, ImageDraw, ImageFilter
    pl = plate.crop((3, 3, plate.width - 3, plate.height - 3)); tw = round(size * 0.88); th = round(tw * pl.height / pl.width)
    pl = pl.resize((tw, th), Image.LANCZOS); bg = Image.new('RGB', (size, size), (244, 242, 238))
    sh = Image.new('L', (size, size), 0); x, y = (size - tw) // 2, (size - th) // 2
    ImageDraw.Draw(sh).rectangle((x + 16, y + 28, x + tw + 16, y + th + 28), fill=120); sh = sh.filter(ImageFilter.GaussianBlur(26))
    bg.paste((110, 105, 98), (0, 0), sh); bg.paste(pl, (x, y)); bg.save(target, quality=90)


ap = argparse.ArgumentParser(); ap.add_argument('--katalog', required=True); ap.add_argument('--linie', required=True)
ap.add_argument('--out', default=str(ROOT / '.test-output/katalog-preview'))
ap.add_argument('--hauptbilder', action='store_true', help='je Produkt zusätzlich ein quadratisches Shop-Hauptbild (2000 px) aus der Startansicht')
a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
report = {'linie': a.linie, 'products': [], 'errors': []}
with tempfile.TemporaryDirectory(prefix='g27-katalog-preview-') as tmp:
    folder = Path(tmp); env = dict(os.environ); env['PYTHONPATH'] = str(ROOT / '.local-data/python')
    with (folder / 'server.log').open('w', encoding='utf-8') as log:
        server = subprocess.Popen(['node', str(ROOT / 'scripts/fixtures/katalog-preview.mjs'), str(folder), a.katalog, a.linie], cwd=ROOT, env=env, stdout=log, stderr=log)
    try:
        until = time.monotonic() + 600
        while not (folder / 'ready.json').exists():
            if server.poll() is not None or time.monotonic() > until: raise RuntimeError((folder / 'server.log').read_text(encoding='utf-8')[-2000:])
            time.sleep(.2)
        f = json.loads((folder / 'ready.json').read_text()); base = f['url']
        with sync_playwright() as pw:
            browser = pw.chromium.launch(args=['--no-sandbox'])
            for p in f['products']:
                scale = 3
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=scale); errs = []
                page.on('pageerror', lambda e: errs.append(str(e)))
                page.goto(base + '/?configuration=' + p['id'] + '&revision=' + str(p['revision']))
                page.wait_for_selector('iframe', timeout=60000); frame = page.frames[1]
                if p['startPhotoFields']:
                    frame.wait_for_selector('[data-ux-empty-photo-slot]', timeout=60000)
                else:
                    frame.wait_for_selector('svg.scene', timeout=60000)
                time.sleep(1.5)
                slug = p['start'].replace('katalog-', '')
                page.screenshot(path=str(out / f'{slug}.png'))
                screenshot = out / f'{slug}.png'
                plate = crop_white_plate(screenshot, frame, p, scale) if p['material'] == 'aluDibond' else crop_plate(screenshot)
                if plate:
                    plate.save(out / f'{slug}-platte.png')
                    if a.hauptbilder: main_image(plate, out / f'hauptbild-{p["sub"]}-{slug}.jpg')
                scene = frame.locator('svg.scene').first
                info = {
                    'photoSlots': scene.locator('[data-ux-empty-photo-slot]').count(),
                    'placeholderImages': scene.locator('[data-ux-placeholder] image').count(),
                }
                report['products'].append({**p, **info, 'pageErrors': errs, 'screenshot': f'{slug}.png'})
                page.close()
            browser.close()
    except Exception as e:
        report['errors'].append(str(e)[:2000])
    finally:
        server.terminate(); server.wait(timeout=20)
(out / 'bericht.json').write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=1)[:3000])
