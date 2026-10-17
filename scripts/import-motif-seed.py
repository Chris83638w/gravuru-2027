"""Motivbibliothek aus dem Altprojekt in das Katalog-Repo übernehmen (einmalig, nur Lesen der Quelle).

Quelle: gravuru-shopify `platform/sources/workshop-seed/motifs.json` (703 Motive, 46 Kategorien,
je Motiv svgFragment mit viewBox 0 0 200 200, Füllung currentColor) und
`platform/sources/motif-originals/*.svg` (18 Gravuru-Originale) = zusammen 721.

Ziel im Katalog:
    motive/<kategorie>/<slug>.svg      einzelne, eigenständige SVGs (schwarz auf transparent)
    motive/motive.json                 Index: key, name, Kategorie, Datei, SHA-256, Herkunft
    motive/INDEX.md                    Kategorien mit Namen (zum Lesen)
    motive/_uebersicht/<kategorie>.png Kontaktbogen je Kategorie (zum Anschauen im Browser)

    python scripts/import-motif-seed.py --motifs motifs.json --originals <ordner> --out <katalog>/motive
"""
import argparse, hashlib, io, json, re, unicodedata
from pathlib import Path

SVG_NS = 'http://www.w3.org/2000/svg'


def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    t = t.replace('&', ' und ')
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', t)).strip('-') or 'motiv'


def standalone(fragment):
    """svgFragment (<svg …viewBox…>…</svg>) → eigenständiges SVG, Füllung schwarz."""
    m = re.match(r'\s*<svg\b([^>]*)>(.*)</svg>\s*$', fragment, re.S)
    if not m: raise ValueError('kein svg-Fragment')
    vb = re.search(r'viewBox="([^"]+)"', m.group(1))
    inner = m.group(2).replace('currentColor', '#000')
    if re.search(r'<(image|script|foreignObject|use)\b|href=', inner): raise ValueError('unerlaubter Inhalt')
    return f'<svg xmlns="{SVG_NS}" viewBox="{vb.group(1) if vb else "0 0 200 200"}" fill="#000">{inner}</svg>'


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--motifs', required=True); ap.add_argument('--originals'); ap.add_argument('--out', required=True)
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    items = json.loads(Path(a.motifs).read_text(encoding='utf-8'))
    index, used, skipped = [], set(), []
    for m in items:
        try: svg = standalone(m['svgFragment'])
        except ValueError as e: skipped.append((m['key'], str(e))); continue
        cat = slug(m['category']); base = slug(m['name']); name = base; n = 2
        while f'{cat}/{name}' in used: name = f'{base}-{n}'; n += 1
        used.add(f'{cat}/{name}')
        p = out / cat / f'{name}.svg'; p.parent.mkdir(exist_ok=True); p.write_text(svg, encoding='utf-8')
        index.append({'key': m['key'], 'name': m['name'], 'category': m['category'], 'file': p.relative_to(out).as_posix(), 'bounds': m.get('bounds'),
                      'sha256': hashlib.sha256(svg.encode()).hexdigest(), 'origin': 'gravuru-shopify workshop-seed/motifs.json'})
    if a.originals:
        for src in sorted(Path(a.originals).glob('*.svg')):
            raw = src.read_text(encoding='utf-8')
            if re.search(r'<(image|script|foreignObject)\b', raw): skipped.append((src.name, 'unerlaubter Inhalt')); continue
            name = slug(src.stem.replace('gravuru-motiv-', '')); p = out / 'gravuru-originale' / f'{name}.svg'; p.parent.mkdir(exist_ok=True); p.write_text(raw, encoding='utf-8')
            index.append({'key': 'original-' + name, 'name': src.stem.replace('gravuru-motiv-', '').replace('-', ' ').title(), 'category': 'Gravuru Originale', 'file': p.relative_to(out).as_posix(),
                          'bounds': None, 'sha256': hashlib.sha256(raw.encode()).hexdigest(), 'origin': 'gravuru-shopify platform/sources/motif-originals'})
    (out / 'motive.json').write_text(json.dumps({'count': len(index), 'motifs': index}, ensure_ascii=False, indent=1), encoding='utf-8')
    cats = {}
    for e in index: cats.setdefault(e['category'], []).append(e)
    md = ['# Motivbibliothek', '', f'{len(index)} Motive in {len(cats)} Kategorien. Quelle: Altprojekt gravuru-shopify (workshop-seed). Herkunft/Lizenz der importierten Motive: offen (vom Nutzer zu bestätigen). Einfarbige Vektoren, Füllung schwarz; die Werkstatt färbt je Material.', '',
          '| Kategorie | Anzahl | Kontaktbogen | Motive |', '| --- | --- | --- | --- |']
    for c in sorted(cats): md.append(f"| {c} | {len(cats[c])} | ![{c}](_uebersicht/{slug(c)}.png) | {', '.join(e['name'] for e in cats[c])} |")
    if skipped: md += ['', '## Übersprungen', ''] + [f'- {k}: {why}' for k, why in skipped]
    (out / 'INDEX.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    # Kontaktbögen
    try:
        import cairosvg
        from PIL import Image, ImageDraw
        (out / '_uebersicht').mkdir(exist_ok=True)
        cell, cols, label_h = 96, 10, 14
        for c, entries in cats.items():
            rows = (len(entries) + cols - 1) // cols
            im = Image.new('RGB', (cols * cell, rows * (cell + label_h)), 'white'); dr = ImageDraw.Draw(im)
            for i, e in enumerate(entries):
                try:
                    png = cairosvg.svg2png(url=str(out / e['file']), output_width=cell - 12, output_height=cell - 12, background_color='white')
                    tile = Image.open(io.BytesIO(png)); x, y = (i % cols) * cell + 6, (i // cols) * (cell + label_h) + 4; im.paste(tile, (x, y))
                    dr.text((x, y + cell - 10), e['name'][:16], fill=(60, 60, 60))
                except Exception: pass
            im.save(out / '_uebersicht' / f'{slug(c)}.png', optimize=True)
    except ImportError:
        pass
    print(f'{len(index)} Motive, {len(cats)} Kategorien → {out} · übersprungen: {len(skipped)}')


if __name__ == '__main__':
    main()
