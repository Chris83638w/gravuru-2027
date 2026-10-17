"""Inventur des Produktordners auf dem Firmenserver aus einer Ordnerliste (dir /s /b /ad).

Struktur dort (beobachtet 17.10.2026): Produkt \\ Verfahren (Gravur|UV) \\ … Form/Material/Serie … \\ Größe (BxH)
\\ SKU-Ordner \\ FPD_Amazon \\ Ansicht_n \\ Variants \\ attr_… (Exporte des alten Konfigurators).
Das Skript liest nur die Liste (keine Dateien) und verdichtet je Produkt: Verfahren, Zwischenebenen
(Form, Material, Serie, Archiv/Neu-Markierungen), Größen und SKU-Präfixe. Ausgabe: inventar.json
und inventar.md (Lesefassung) für das Katalog-Repo (linien/_inventar/).

    python scripts/inventory-product-tree.py --list _ordnerliste.txt --root "\\\\server\\...\\Produkte\\" --out <ordner>
"""
import argparse, collections, json, re
from pathlib import Path

SIZE = re.compile(r'^(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)(?:\s*cm)?$', re.I)
SKIP = {'FPD_Amazon', 'Variants', 'Export', 'MUSTER', 'Statische Varianten'}
MATERIAL = re.compile(r'acryl|edelstahl|schiefer|holz|alu|dibond|glas|stein|granit|kunststoff|messing|kupfer|bambus|leder|filz|kork|metall|porzellan|keramik', re.I)
FLAG = re.compile(r'archiv|__neu|_neu|alt\b|veraltet|neu\b', re.I)


def mm(v):
    v = float(v.replace(',', '.'))
    return v * 10 if v < 100 else v  # cm → mm, wenn plausibel klein


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--list', required=True); ap.add_argument('--root', required=True); ap.add_argument('--out', required=True); ap.add_argument('--encoding', default='cp850')
    ap.add_argument('--exclude', default='', help='kommagetrennte Wörter; Pfade, die eines enthalten, bleiben außen vor (z. B. Funkklingel)')
    a = ap.parse_args(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    excl = [w.strip().lower() for w in a.exclude.split(',') if w.strip()]
    raw = Path(a.list).read_bytes().decode(a.encoding)
    root = a.root
    paths = [l.rstrip('\r')[len(root):].split('\\') for l in raw.split('\n') if l.startswith(root)]
    if excl: paths = [p for p in paths if not any(w in seg.lower() for seg in p for w in excl)]
    products = {}
    for p in paths:
        if not p or not p[0] or p[0].startswith(('_', '[', '.')): continue
        pr = products.setdefault(p[0], {'folders': 0, 'processes': collections.Counter(), 'levels': collections.Counter(), 'materials': collections.Counter(), 'flags': collections.Counter(), 'sizes': {}, 'skus': collections.Counter(), 'fpd': 0, 'examples': []})
        pr['folders'] += 1
        if len(p) > 1 and p[1] in ('Gravur', 'UV', 'Druck'): pr['processes'][p[1]] += 1
        if 'FPD_Amazon' in p: pr['fpd'] += 1
        # Größe finden
        for i, seg in enumerate(p[1:], 1):
            m = SIZE.match(seg.strip())
            if m:
                key = f'{m.group(1)}x{m.group(2)}'.replace(',', '.')
                ctx = tuple(s for s in p[1:i] if s not in SKIP)
                e = pr['sizes'].setdefault(key, {'count': 0, 'contexts': collections.Counter(), 'skus': set(), 'archived': 0})
                e['count'] += 1; e['contexts'][' / '.join(ctx)] += 1
                if any(FLAG.search(s) and 'archiv' in s.lower() for s in p[:i]): e['archived'] += 1
                if i + 1 < len(p) and p[i + 1] not in SKIP and not SIZE.match(p[i + 1]) and re.match(r'^[A-Z]{2,6}[A-Z0-9-]*', p[i + 1]): e['skus'].add(p[i + 1]); pr['skus'][re.split(r'[-_]', p[i + 1])[0]] += 1
                break
        for seg in p[1:]:
            if seg in SKIP or seg.startswith(('Ansicht', 'attr_')): break
            if MATERIAL.search(seg): pr['materials'][seg] += 1
            if FLAG.search(seg): pr['flags'][seg] += 1
        for seg in p[1:4]:
            if seg in SKIP or SIZE.match(seg) or seg.startswith(('Ansicht', 'attr_')): continue
            pr['levels'][seg] += 1
        if len(pr['examples']) < 3 and 'FPD_Amazon' in p and p.index('FPD_Amazon') >= 3: pr['examples'].append('\\'.join(p[:p.index('FPD_Amazon')]))
    # Verdichten
    report = {}
    for name, pr in sorted(products.items(), key=lambda kv: -kv[1]['folders']):
        sizes = {}
        for k, e in pr['sizes'].items():
            try: w, h = (mm(v) for v in k.split('x'))
            except ValueError: w = h = None
            sizes[k] = {'count': e['count'], 'wMm': w, 'hMm': h, 'contexts': e['contexts'].most_common(6), 'skuCount': len(e['skus']), 'skuExamples': sorted(e['skus'])[:3], 'archivedShare': round(e['archived'] / e['count'], 2)}
        report[name] = {'folders': pr['folders'], 'processes': dict(pr['processes']), 'topLevels': pr['levels'].most_common(12), 'materials': pr['materials'].most_common(10), 'flags': pr['flags'].most_common(8),
                        'sizes': dict(sorted(sizes.items(), key=lambda kv: (kv[1]['wMm'] or 0, kv[1]['hMm'] or 0))), 'skuPrefixes': pr['skus'].most_common(10), 'fpdFolders': pr['fpd'], 'examples': pr['examples']}
    (out / 'inventar.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    md = ['# Inventur Produktordner (Server)', '', f'Quelle: `{root}` – Ordnerliste mit {len(paths)} Ordnern, {len(report)} Produktordner. Nur gelesen; Dateien noch nicht geöffnet.' + (f' Ausgeschlossen: {", ".join(excl)}.' if excl else ''), '',
          '| Produkt | Ordner | Verfahren | Größen | davon mit Archiv-Anteil | SKU-Präfixe | Materialien (Ordnernamen) |', '| --- | --- | --- | --- | --- | --- | --- |']
    for name, r in report.items():
        arch = sum(1 for s in r['sizes'].values() if s['archivedShare'] >= .99)
        md.append(f"| {name} | {r['folders']} | {', '.join(f'{k} {v}' for k, v in r['processes'].items()) or '–'} | {len(r['sizes'])} | {arch} | {', '.join(k for k, _ in r['skuPrefixes'][:6]) or '–'} | {', '.join(k for k, _ in r['materials'][:6]) or '–'} |")
    md += ['', '## Größen je Produkt', '']
    for name, r in report.items():
        if not r['sizes']: continue
        md.append(f"### {name}")
        md.append('| Größe | Ordner | Kontext (häufigster Pfad) | SKU-Beispiel | nur Archiv |'); md.append('| --- | --- | --- | --- | --- |')
        for k, s in r['sizes'].items():
            md.append(f"| {k} | {s['count']} | {s['contexts'][0][0] if s['contexts'] else ''} | {', '.join(s['skuExamples'])} | {'ja' if s['archivedShare'] >= .99 else ''} |")
        md.append('')
    (out / 'inventar.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f"{len(report)} Produkte, {sum(len(r['sizes']) for r in report.values())} Größenordner → {out}")


if __name__ == '__main__':
    main()
