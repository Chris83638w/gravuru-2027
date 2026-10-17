"""Gesamtübersicht KATALOG.md für das Katalog-Repo erzeugen (nur Lesen der Stammdaten).

Quelle ist das Katalog-Repo (`gravuru-katalog`): familien/<material>/<familie>.json
(Schema gravuru-product-family/v2). Erzeugt werden KATALOG.md (Linie → Material →
Familie → Formatreihen/Größen/Bohrbilder/Preise/offene Punkte) und je Familie ein
Plattenkatalog-PDF plus PNG der ersten Zeichnungsseite in kataloge/ – damit die
Übersicht im Browser ohne Code lesbar ist. Offene Werte bleiben „offen“.

    python scripts/build-katalog.py --katalog ../gravuru-katalog
"""
import argparse, json, math, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAT = {'steel': 'Edelstahl', 'slate': 'Schiefer', 'acrylic': 'Acrylglas', 'aluminium-composite': 'Alu-Dibond'}
SHAPE = {'rect': 'Rechteck', 'ellipse': 'Oval', 'plaque': 'eingezogene Ecken'}
LAYOUT = {'left-right': 'seitlich mittig', 'top-bottom': 'oben/unten', 'corners': 'in den Ecken', 'top-center': 'oben mittig', 'none': 'ohne Löcher'}


def ratio(w, h):
    g = math.gcd(int(round(w)), int(round(h))); a, b = int(round(w)) // g, int(round(h)) // g
    return f'{a}:{b}' if a <= 20 and b <= 20 else f'{w / h:.2f}:1'


def series(sizes):
    """Formatreihen: gleiches Seitenverhältnis ±1 %, von breit nach quadratisch."""
    out = []
    for s in sorted(sizes, key=lambda s: -s['widthMm'] / s['heightMm']):
        r = s['widthMm'] / s['heightMm']
        if out and abs(r - out[-1][0]) / out[-1][0] <= .01: out[-1][1].append(s)
        else: out.append([r, [s]])
    return out


def euro(c): return 'offen' if c is None else f'{c / 100:.2f} €'.replace('.', ',')


def gaps_of(path):
    """Offene Stammdaten über die Werkstatt-Prüfung (node); ohne node: leer."""
    try:
        r = subprocess.run(['node', '--input-type=module', '-e',
                            "import fs from 'node:fs';import {validateFamily,familyGaps} from './app/workshop/product-families.mjs';const f=JSON.parse(fs.readFileSync(process.argv[1]));validateFamily(f);console.log(JSON.stringify(familyGaps(f)));",
                            str(path)], cwd=ROOT, capture_output=True, text=True, timeout=60)
        return json.loads(r.stdout) if r.returncode == 0 else ['Prüfung fehlgeschlagen: ' + r.stderr.strip().splitlines()[-1][:120]]
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError, IndexError):
        return []


def family_section(f, path, kat, pdf_ok):
    rel = path.relative_to(kat).as_posix()
    m = f['material']; lines = [f"### {f['name']}", '']
    lines.append(f"Stammdaten: [`{rel}`]({rel}) · Material {m['label']}, {m['thicknessMm'] if m['thicknessMm'] is not None else 'Stärke offen'}"
                 + (' mm' if m['thicknessMm'] is not None else '') + f", Verfahren `{m['processingProfileId']}`"
                 + (f", Gravur von {'hinten' if m.get('engravingSide') == 'back' else 'vorn'}" if m.get('engravingSide') else '')
                 + (f" · Rückplatte: {f['backing']['label']}, rundum {f['backing']['offsetMm']} mm" if f.get('backing') else '') + '.')
    gaps = list(dict.fromkeys(gaps_of(path)))
    open_prices = sum(1 for s in f['sizes'] if s['baseCents'] is None)
    gaps = [f'Grundpreis: {"alle" if open_prices == len(f["sizes"]) else open_prices} {len(f["sizes"])} Größen'.replace('alle ' + str(len(f['sizes'])), 'alle ' + str(len(f['sizes']))) if g.startswith('Grundpreis:') and open_prices > 5 else g for g in gaps]
    lines.append(('**Offen:** ' + '; '.join(gaps)) if gaps else '**Stammdaten vollständig.**')
    if pdf_ok:
        lines += ['', f"![{f['name']}](kataloge/png/{f['id']}.png)", '', f"Plattenkatalog: [kataloge/{f['id']}.pdf](kataloge/{f['id']}.pdf)"]
    lines += ['', '| Formatreihe | Form | Größen (SKU-Schlüssel · Grundpreis) |', '| --- | --- | --- |']
    groups = {g['key']: g for g in f['groups']}
    for r, members in series(f['sizes']):
        by_group = {}
        for s in sorted(members, key=lambda s: s['widthMm']): by_group.setdefault(s['groupKey'], []).append(s)
        for gk, ss in by_group.items():
            g = groups[gk]; label = g['name'] + (f" R{g['cornerRadiusMm']:g}" if g['cornerRadiusMm'] and not g['name'].endswith(f"R{g['cornerRadiusMm']:g}") else '')
            cells = ', '.join(f"{s['label']}" + (f" R{s['cornerRadiusMm']:g}" if s.get('cornerRadiusMm') else '') + f" (`{s['key']}` · {euro(s['baseCents'])})" for s in ss)
            lines.append(f"| {ratio(ss[0]['widthMm'], ss[0]['heightMm'])} | {label} | {cells} |")
    lines += ['', '| Bohrbild | Lage | Löcher | Ø | Randabstand | Zubehör | Aufpreis |', '| --- | --- | --- | --- | --- | --- | --- |']
    for r in f['mountingRules']:
        lines.append(f"| {r['label']} (`{r['id']}`) | {LAYOUT.get(r['layout'], r['layout'])} | {r['count']} | {r['diameterMm'] if r['diameterMm'] is not None else 'offen'} | {r['edgeMm'] if r['edgeMm'] is not None else 'offen'} | {r.get('accessory', '–')} | {euro(r['priceCents'])} |")
    lines.append(f"\nSchriften: {', '.join(f['fonts'])}")
    if f.get('source', {}).get('note'): lines.append(f"\nHinweis: {f['source']['note']}")
    return '\n'.join(lines) + '\n'


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--katalog', required=True); a = ap.parse_args()
    kat = Path(a.katalog).resolve(); fam_dir = kat / 'familien'; out_dir = kat / 'kataloge'; (out_dir / 'png').mkdir(parents=True, exist_ok=True)
    families = []
    for p in sorted(fam_dir.glob('*/*.json')):
        f = json.loads(p.read_text(encoding='utf-8'))
        if f.get('schema') != 'gravuru-product-family/v2': continue
        families.append((p, f))
    md = ['# Gravuru-Katalog', '', 'Erzeugt aus den Familien-Stammdaten (`familien/`). Nicht von Hand bearbeiten – Änderungen in den JSON-Dateien oder über die Stammdaten-Excel, dann `python scripts/build-katalog.py` (Repo gravuru-2027).', '']
    lines_md = kat / 'linien' / 'README.md'
    if lines_md.exists(): md += ['## Produktlinien', '', f'Siehe [linien/README.md](linien/README.md).', '']
    md += ['## Familien auf einen Blick', '', '| Material | Familie | Größen | Formen | Bohrbilder | Preise | Stand |', '| --- | --- | --- | --- | --- | --- | --- |']
    sections = []
    for p, f in families:
        gaps = gaps_of(p)
        md.append(f"| {MAT.get(f['material']['kind'], f['material']['kind'])} | [{f['name']}](#{f['id']}) | {len(f['sizes'])} | {', '.join(dict.fromkeys(g['name'] for g in f['groups']))} | {len(f['mountingRules'])} | {'hinterlegt' if all(s['baseCents'] is not None for s in f['sizes']) else 'offen'} | {'vollständig' if not gaps else str(len(gaps)) + ' offen'} |")
        pdf = out_dir / f"{f['id']}.pdf"; pdf_ok = False
        try:
            subprocess.run([sys.executable, str(ROOT / 'scripts/plate-catalog-pdf.py'), str(p), '--out', str(pdf)], check=True, capture_output=True, timeout=300)
            import pymupdf
            d = pymupdf.open(pdf); d[min(1, d.page_count - 1)].get_pixmap(dpi=70).save(out_dir / 'png' / f"{f['id']}.png"); pdf_ok = True
        except Exception as e:
            print('Katalog-PDF für', f['id'], 'nicht erzeugt:', str(e)[:100])
        sections.append(f'<a id="{f["id"]}"></a>\n' + family_section(f, p, kat, pdf_ok))
    md += ['', '## Familien im Einzelnen', ''] + sections
    xlsx = out_dir / 'Stammdaten-Gravuru.xlsx'
    try:
        subprocess.run([sys.executable, str(ROOT / 'scripts/family-excel.py'), 'export', '--out', str(xlsx)] + [str(p) for p, _ in families], check=True, capture_output=True, timeout=300)
        md.append(f'\nStammdaten-Excel (alle Familien): [kataloge/Stammdaten-Gravuru.xlsx](kataloge/Stammdaten-Gravuru.xlsx)')
    except Exception as e:
        print('Excel nicht erzeugt:', str(e)[:100])
    (kat / 'KATALOG.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'{len(families)} Familien → {kat / "KATALOG.md"}')


if __name__ == '__main__':
    main()
