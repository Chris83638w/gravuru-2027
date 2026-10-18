"""Motive aus frei lizenzierten Icon-Bibliotheken als Vorschlag für die Motivbibliothek aufbereiten.

Quellen (Sparse-Klone von GitHub, nur Lesen):
  phosphor  phosphor-icons/core      assets/fill/<name>-fill.svg   MIT          viewBox 0 0 256 256, gefüllte Pfade
  gameicons game-icons/icons         <autor>/<name>.svg            CC BY 3.0    viewBox 0 0 512 512, schwarzer Grund + weiße Form
Ausgabe: <out>/<kategorie>/<slug>.svg (schwarz auf transparent, Original-viewBox), <out>/motive-neu.json,
<out>/INDEX.md, <out>/LIZENZEN.md (Autor/Lizenz je Motiv), <out>/_uebersicht/<kategorie>.png.
Nichts wird in motive/ übernommen – das entscheidet der Nutzer nach Sicht.

    python scripts/import-motif-icons.py --list motive-liste.json --phosphor /tmp/icons-core --gameicons /tmp/icons-icons --out <katalog>/motive/_neu
"""
import argparse, hashlib, io, json, math, re, unicodedata
from pathlib import Path

SVG_NS = 'http://www.w3.org/2000/svg'
LICENSES = {'phosphor': ('MIT', 'Phosphor Icons (phosphor-icons/core)', 'https://github.com/phosphor-icons/core'),
            'gameicons': ('CC BY 3.0', 'game-icons.net', 'https://game-icons.net')}


def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower().replace('&', ' und ')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', t)).strip('-') or 'motiv'


def convert(src_svg, source):
    raw = src_svg
    if re.search(r'<(image|script|foreignObject|use|style)\b|href=', raw): raise ValueError('unerlaubter Inhalt')
    vb = re.search(r'viewBox="([^"]+)"', raw); vb = vb.group(1) if vb else '0 0 256 256'
    body = re.search(r'<svg\b[^>]*>(.*)</svg>', raw, re.S).group(1)
    if source == 'gameicons':
        # schwarzer Hintergrund (erstes Rechteck) entfernen, weiße Form schwarz
        body = re.sub(r'<path d="M0 0h512v512H0z"/>', '', body, count=1)
        body = body.replace('fill="#fff"', 'fill="#000"').replace("fill='#fff'", 'fill="#000"').replace('fill="#ffffff"', 'fill="#000"')
    body = re.sub(r'\s(fill|stroke)="(?!none)[^"]*"', '', body)  # Farben raus, Füllung kommt vom Wurzelelement
    body = re.sub(r'\s(width|height)="[^"]*"', '', body)
    return f'<svg xmlns="{SVG_NS}" viewBox="{vb}" fill="#000">{body.strip()}</svg>'


def render(svg, size=180):
    import cairosvg
    from PIL import Image
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert('RGBA')


def contact_sheet(entries, out, cat, cols=6):
    from PIL import Image, ImageDraw
    tiles = [(e, out / e['file']) for e in entries]
    tw, th = 180, 215; rows = math.ceil(len(tiles) / cols)
    sheet = Image.new('RGB', (cols * (tw + 12) + 12, rows * (th + 12) + 40), 'white'); dr = ImageDraw.Draw(sheet)
    dr.text((12, 10), f'{cat} – Vorschlag ({len(tiles)} Motive)', fill='black')
    for i, (e, p) in enumerate(tiles):
        im = render(p.read_text(encoding='utf-8'), tw)
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
        x = 12 + (i % cols) * (tw + 12); y = 40 + (i // cols) * (th + 12)
        sheet.paste(bg.convert('RGB'), (x, y)); dr.text((x, y + tw + 4), e['name'][:26], fill='black'); dr.text((x, y + tw + 17), f"{e['source']} · {e['license']}"[:30], fill=(110, 110, 110))
    (out / '_uebersicht').mkdir(exist_ok=True); sheet.save(out / '_uebersicht' / f'{slug(cat)}.png')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--list', required=True); ap.add_argument('--phosphor', required=True); ap.add_argument('--gameicons', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    wanted = json.loads(Path(a.list).read_text(encoding='utf-8'))
    index = []; missing = []; used = set()
    for w in wanted:
        src = w['source']
        if src == 'phosphor': p = Path(a.phosphor) / 'assets' / 'fill' / f"{w['file']}-fill.svg"; author = 'Phosphor Icons'
        else: p = Path(a.gameicons) / f"{w['file']}.svg"; author = w['file'].split('/')[0]
        if not p.exists(): missing.append(w); continue
        try: svg = convert(p.read_text(encoding='utf-8'), src)
        except ValueError as e: missing.append({**w, 'fehler': str(e)}); continue
        cat = slug(w['kategorie']); base = slug(w['name']); name = base; n = 2
        while f'{cat}/{name}' in used: name = f'{base}-{n}'; n += 1
        used.add(f'{cat}/{name}')
        dst = out / cat / f'{name}.svg'; dst.parent.mkdir(exist_ok=True); dst.write_text(svg, encoding='utf-8')
        lic, licname, url = LICENSES[src]
        index.append({'key': f'icon-{src}-{slug(w["file"])}', 'name': w['name'], 'category': w['kategorie'], 'file': dst.relative_to(out).as_posix(), 'bounds': None,
                      'sha256': hashlib.sha256(svg.encode()).hexdigest(), 'origin': f'{licname}: {w["file"]}', 'source': src, 'license': lic, 'author': author, 'url': url, 'status': 'Vorschlag'})
    (out / 'motive-neu.json').write_text(json.dumps({'count': len(index), 'motifs': index}, ensure_ascii=False, indent=1), encoding='utf-8')
    cats = {}
    for e in index: cats.setdefault(e['category'], []).append(e)
    md = ['# Motive – Vorschlag zur Aufnahme (noch nicht in der Bibliothek)', '', f'{len(index)} Motive aus frei lizenzierten Icon-Bibliotheken, schwarz auf transparent, Original-viewBox. Übernahme in `motive/` erst nach Freigabe (Kontaktbögen in `_uebersicht/`).', '',
          '| Kategorie | Anzahl | Kontaktbogen | Motive |', '| --- | --- | --- | --- |']
    for c, es in sorted(cats.items()):
        contact_sheet(es, out, c)
        md.append(f'| {c} | {len(es)} | ![{c}](_uebersicht/{slug(c)}.png) | ' + ', '.join(f"{e['name']} ({e['license']})" for e in es) + ' |')
    (out / 'INDEX.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    lz = ['# Lizenzen der vorgeschlagenen Motive', '',
          '- **Phosphor Icons** – MIT-Lizenz (freie kommerzielle Nutzung, Lizenztext muss in der Software/Dokumentation mitgeführt werden): https://github.com/phosphor-icons/core/blob/main/LICENSE',
          '- **game-icons.net** – CC BY 3.0 (freie kommerzielle Nutzung, **Namensnennung des Autors** erforderlich, z. B. auf einer Lizenzseite im Shop: „Icons von Lorc, Delapouite u. a. – game-icons.net, CC BY 3.0“): https://creativecommons.org/licenses/by/3.0/', '',
          '| Motiv | Datei | Quelle | Autor | Lizenz |', '| --- | --- | --- | --- | --- |']
    for e in index: lz.append(f"| {e['name']} | {e['file']} | {e['origin']} | {e['author']} | {e['license']} |")
    (out / 'LIZENZEN.md').write_text('\n'.join(lz) + '\n', encoding='utf-8')
    print(f'{len(index)} Motive → {out}; fehlend: {len(missing)}')
    for m in missing: print('  fehlt:', m['name'], m['source'], m['file'], m.get('fehler', ''))


if __name__ == '__main__':
    main()
