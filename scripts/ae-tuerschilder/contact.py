#!/usr/bin/env python3
"""Kontaktbogen AE-Türschilder: native Zielvorschau aus dem echten Konfi (target-preview), Vorlage daneben.

Aufruf: python3 contact.py --server http://127.0.0.1:8971 --liste liste.json --out bogen.jpg [--titel ...]
liste.json: [{"reihe":..., "id":..., "familie":..., "size":..., "vorlage": {"reihe":..., "id":..., "size":...}}]
Gibt je Kachel den Status der Zielprüfung zurück (stdout JSON).
"""
import argparse, io, json, os, subprocess, sys, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def preview(server, reihe, did, familie, size):
    qs = urllib.parse.urlencode({k: v for k, v in {'reihe': reihe, 'id': did, 'familie': familie, 'size': size}.items() if v})
    with urllib.request.urlopen(server + '/api/workshop/designs/target-preview?' + qs, timeout=120) as r:
        return json.load(r)


def raster(svg, width):
    p = subprocess.run(['rsvg-convert', '-w', str(width), '-f', 'png'], input=svg.encode(), capture_output=True, check=True)
    im = Image.open(io.BytesIO(p.stdout)).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    return bg.convert('RGB')


STEEL = ('<defs><linearGradient id="ae-steel" x2=".25" y2="1"><stop stop-color="#aeb6b9"/><stop offset=".45" stop-color="#e6eaea"/>'
         '<stop offset=".55" stop-color="#d5dbdc"/><stop offset="1" stop-color="#a9b1b4"/></linearGradient></defs>')


def with_frame(svg, frame):
    """Edelstahlplatte (rundum 10 mm) hinter die Acryl-Vorschau des Konfis legen."""
    w, h = frame['w'], frame['h']
    if frame['kind'] == 'ellipse':
        el = '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="url(#ae-steel)" stroke="#8d969a" stroke-width=".25"/>' % (w / 2, h / 2, w / 2 + 10, h / 2 + 10)
    elif frame['kind'] == 'path':
        el = '<path d="%s" transform="translate(-10 -10)" fill="url(#ae-steel)" stroke="#8d969a" stroke-width=".25"/>' % frame['d']
    else:
        el = '<rect x="-10" y="-10" width="%s" height="%s" fill="url(#ae-steel)" stroke="#8d969a" stroke-width=".25"/>' % (w + 20, h + 20)
    i = svg.find('<g data-role="guide" data-preview-acrylic-glass')
    if i < 0:
        return svg
    svg = svg[:i] + STEEL + el + svg[i:]
    import re
    pad = 3
    return re.sub(r'viewBox="[^"]*"', 'viewBox="%s %s %s %s"' % (-10 - pad, -10 - pad, w + 20 + 2 * pad, h + 20 + 2 * pad), svg, count=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--server', default='http://127.0.0.1:8971')
    ap.add_argument('--liste', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--titel', default='')
    ap.add_argument('--spalten', type=int, default=2)
    ap.add_argument('--kachel', type=int, default=430)
    a = ap.parse_args()
    rows = json.load(open(a.liste, encoding='utf-8'))
    try:
        font = ImageFont.truetype(FONT, 15)
        small = ImageFont.truetype(FONT, 13)
        big = ImageFont.truetype(FONT, 22)
    except OSError:
        font = small = big = ImageFont.load_default()
    tiles, result = [], []
    T = a.kachel
    for r in rows:
        res = preview(a.server, r['reihe'], r['id'], r['familie'], r['size'])
        status = res['fit']['status']
        issues = res['fit'].get('issues', [])
        svg = res.get('svg')
        if svg and r.get('frame'):
            svg = with_frame(svg, r['frame'])
        img = raster(svg, T) if svg else Image.new('RGB', (T, T // 2), 'white')
        tpl = None
        if r.get('vorlage'):
            v = r['vorlage']
            try:
                rv = preview(a.server, v['reihe'], v['id'], v.get('familie', 'steel-door-signs'), v.get('size'))
                import re as _re
                tsvg = _re.sub(r'<circle[^>]*stroke="#84958c"[^>]*/>', '', rv['svg']) if rv.get('svg') else None
                tpl = raster(tsvg, int(T * 0.62)) if tsvg else None
            except Exception as e:
                tpl = None
        h = max(img.height, tpl.height if tpl else 0) + 46
        w = T + (int(T * 0.62) + 14 if tpl else 0) + 16
        tile = Image.new('RGB', (w, h), 'white')
        tile.paste(img, (8, 40))
        if tpl:
            tile.paste(tpl, (T + 22, 40 + (img.height - tpl.height) // 2))
        d = ImageDraw.Draw(tile)
        col = (20, 140, 60) if status == 'passt' else (200, 120, 0) if status == 'prüfen' else (200, 30, 30)
        d.text((8, 4), '%s · %s' % (r['id'], r.get('label', r['size'])), fill=(20, 20, 20), font=font)
        d.text((8, 21), status + (' – ' + '; '.join(issues)[:90] if issues else ''), fill=col, font=small)
        if tpl:
            d.text((T + 22, 21), ('Vorlage ' + ('Edelstahl ' if r['vorlage'].get('familie', 'steel-door-signs') == 'steel-door-signs' else 'Acryl AA/AS ') + r['vorlage']['id']), fill=(90, 90, 90), font=small)
        tiles.append(tile)
        result.append({'id': r['id'], 'size': r['size'], 'status': status, 'issues': issues})
    cols = a.spalten
    cw = max(t.width for t in tiles)
    rows_h = []
    for i in range(0, len(tiles), cols):
        rows_h.append(max(t.height for t in tiles[i:i + cols]))
    W = cw * cols + 20
    H = sum(rows_h) + 60
    sheet = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(sheet)
    d.text((14, 14), a.titel, fill=(0, 0, 0), font=big)
    y = 56
    for ri, i in enumerate(range(0, len(tiles), cols)):
        for j, t in enumerate(tiles[i:i + cols]):
            sheet.paste(t, (10 + j * cw, y))
        y += rows_h[ri]
    q = 88
    while True:
        sheet.save(a.out, quality=q, optimize=True)
        if os.path.getsize(a.out) <= 2_000_000 or q < 50:
            break
        q -= 6
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
