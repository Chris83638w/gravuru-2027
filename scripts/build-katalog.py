"""Gesamtübersicht KATALOG.md für das Katalog-Repo erzeugen (nur Lesen der Stammdaten).

Quelle ist das Katalog-Repo (`gravuru-katalog`): familien/<material>/<familie>.json
(Schema gravuru-product-family/v2). Erzeugt werden KATALOG.md (Linie → Material →
Familie → Formatreihen/Größen/Bohrbilder/Preise/offene Punkte) und je Familie ein
Plattenkatalog-PDF plus PNG der ersten Zeichnungsseite in kataloge/ – damit die
Übersicht im Browser ohne Code lesbar ist. Offene Werte bleiben „offen“.

    python scripts/build-katalog.py --katalog ../gravuru-katalog
"""
import argparse, html, json, math, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAT = {'steel': 'Edelstahl', 'slate': 'Schiefer', 'acrylic': 'Acrylglas', 'aluminium-composite': 'Alu-Dibond'}
SHAPE = {'rect': 'Rechteck', 'ellipse': 'Oval', 'plaque': 'eingezogene Ecken', 'contour': 'Kontur'}
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


INVALID = []  # ungültige Familien → Exit 1 am Ende (CLAUDE.md Regel 3: ungültige Familien nie committen)


def gaps_of(path):
    """Offene Stammdaten über die Werkstatt-Prüfung (node); ohne node: leer."""
    try:
        r = subprocess.run(['node', '--input-type=module', '-e',
                            "import fs from 'node:fs';import {validateFamily,familyGaps} from './app/workshop/product-families.mjs';const f=JSON.parse(fs.readFileSync(process.argv[1]));validateFamily(f);console.log(JSON.stringify(familyGaps(f)));",
                            str(path)], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', timeout=60)
        if r.returncode != 0:
            INVALID.append(f'{path}: ' + (r.stderr.strip().splitlines()[-1][:200] if r.stderr.strip() else 'Prüfung fehlgeschlagen'))
            return ['Prüfung fehlgeschlagen: ' + (r.stderr.strip().splitlines()[-1][:120] if r.stderr.strip() else '')]
        return json.loads(r.stdout)
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError, IndexError):
        return []


def contour_previews(f, out_dir):
    """Show the stored millimetre path and fixed holes, without a rectangular substitute."""
    contours = {g['key'] for g in f['groups'] if g['shape'] == 'contour'}
    if not contours: return
    target = out_dir / 'konturen'
    target.mkdir(parents=True, exist_ok=True)
    for s in f['sizes']:
        if s['groupKey'] not in contours: continue
        w, h = s['widthMm'], s['heightMm']
        path = html.escape(' '.join([s['outlinePath'], *s.get('cutoutPaths', [])]), quote=True)
        circles = ''.join(f'<circle cx="{hole["x"]}" cy="{hole["y"]}" r="{hole["diameterMm"]/2}" fill="white" stroke="#c33" stroke-width="0.3"/>' for hole in s['holesMm'])
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="-0.5 -0.5 {w+1} {h+1}"><title>{html.escape(s["key"])}</title><path d="{path}" fill-rule="evenodd" fill="#63686b" stroke="#c33" stroke-width="0.3"/>{circles}</svg>\n'
        (target / f'{s["key"]}.svg').write_text(svg, encoding='utf-8', newline='\n')


def family_section(f, path, kat, pdf_ok):
    rel = path.relative_to(kat).as_posix()
    m = f['material']; lines = [f"### {f['name']}", '']
    lines.append(f"Stammdaten: [`{rel}`]({rel}) · Material {m['label']}, {m['thicknessMm'] if m['thicknessMm'] is not None else 'Stärke offen'}"
                 + (' mm' if m['thicknessMm'] is not None else '') + f", Verfahren `{m['processingProfileId']}`"
                 + (f", Gravur von {'hinten' if m.get('engravingSide') == 'back' else 'vorn'}" if m.get('engravingSide') else '')
                 + (f" · Rückplatte: {f['backing']['label']}, rundum {f['backing']['offsetMm']} mm" if f.get('backing') else '') + '.')
    gaps = list(dict.fromkeys(gaps_of(path)))
    open_prices = sum(1 for s in f['sizes'] if s['baseCents'] is None)
    gaps = [f'Grundpreis: {"alle" if open_prices == len(f["sizes"]) else str(open_prices) + " von"} {len(f["sizes"])} Größen' if g.startswith('Grundpreis:') and open_prices > 5 else g for g in gaps]
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
    contour_sizes = [s for s in f['sizes'] if groups[s['groupKey']]['shape'] == 'contour']
    if contour_sizes:
        lines += ['', '#### Konturformen aus der Zeichnung', '', 'Pfad und feste Lochmitten in mm aus der Familie; Bohrungen gelten für die gebohrten Befestigungen. Der Konfigurator verwendet diese Kontur mit Gestaltungsrand und Lochschutz.', '', '| Größe | Kontur | Feste Lochmitten (x / y / Ø mm) |', '| --- | --- | --- |']
        for s in contour_sizes:
            holes = '; '.join(f'{h["x"]:g} / {h["y"]:g} / {h["diameterMm"]:g}' for h in s['holesMm'])
            lines.append(f'| {s["key"]} | ![{s["label"]}](kataloge/konturen/{s["key"]}.svg) | {holes} |')
    lines += ['', '| Bohrbild | Lage | Löcher | Ø | Randabstand | Zubehör | Aufpreis |', '| --- | --- | --- | --- | --- | --- | --- |']
    for r in f['mountingRules']:
        usages = [s for s in f['sizes'] if r['id'] in s['mounting']]
        fixed = bool(usages) and all(groups[s['groupKey']]['shape'] == 'contour' for s in usages) and r['layout'] != 'none'
        edge_label = 'feste Lochmitten je Größe' if fixed else r['edgeMm'] if r['edgeMm'] is not None else 'offen'
        lines.append(f"| {r['label']} (`{r['id']}`) | {LAYOUT.get(r['layout'], r['layout'])} | {r['count']} | {r['diameterMm'] if r['diameterMm'] is not None else 'offen'} | {edge_label} | {r.get('accessory', '–')} | {euro(r['priceCents'])} |")
    if f.get('options'):
        lines += ['', '| Optionsgruppe | Art | Auswahl | Option | SKU-Endung | Aufpreis |', '| --- | --- | --- | --- | --- | --- |']
        for g in f['options']:
            for c in g['choices']:
                lines.append(f"| {g['label']} (`{g['id']}`) | {'Zubehör' if g['kind'] == 'accessory' else 'Variante'} | {'eine' if g['selection'] == 'single' else 'mehrere'} | {c['label']} (`{c['id']}`){' · Standard' if c.get('default') else ''} | {c.get('skuSuffix', '')} | {euro(c['priceCents'])} |")
    else:
        lines.append('\nOptionen (Zubehör/Varianten): noch keine hinterlegt – Blatt „Optionen“ der Stammdaten-Excel.')
    lines.append(f"\nSchriften: {', '.join(f['fonts'])}")
    if f.get('source', {}).get('note'): lines.append(f"\nHinweis: {f['source']['note']}")
    return '\n'.join(lines) + '\n'


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--katalog', required=True); ap.add_argument('--metadata-only', action='store_true', help='Nur Markdown aktualisieren, keine PDF- oder Excel-Dateien ersetzen'); a = ap.parse_args()
    kat = Path(a.katalog).resolve(); fam_dir = kat / 'familien'; out_dir = kat / 'kataloge'; (out_dir / 'png').mkdir(parents=True, exist_ok=True)
    families = []
    for p in sorted(fam_dir.glob('*/*.json')):
        f = json.loads(p.read_text(encoding='utf-8'))
        if f.get('schema') != 'gravuru-product-family/v2': continue
        families.append((p, f))
    md = ['# Gravuru-Katalog', '', 'Erzeugt aus den Familien-Stammdaten (`familien/`). Nicht von Hand bearbeiten – Änderungen in den JSON-Dateien oder über die Stammdaten-Excel, dann `python scripts/build-katalog.py` (Repo gravuru-2027).', '']
    lines_md = kat / 'linien' / 'README.md'
    lines = [json.loads(p.read_text(encoding='utf-8')) for p in sorted((kat / 'linien').glob('*.json'))]
    fam_by_id = {f['id']: f for _, f in families}
    themes = {t['id']: t for t in json.loads((kat / 'themen.json').read_text(encoding='utf-8'))['themes']} if (kat / 'themen.json').exists() else {}
    structure_path = kat / 'struktur.json'
    structure = json.loads(structure_path.read_text(encoding='utf-8')) if structure_path.exists() else None
    if structure:
        md += ['## Abgeglichener Werkstattstand', '', 'Produktlinie → Unterkategorie → Hauptprodukt → Ausführungen. Maßgeblich für die Werkstatt ist [struktur.json](struktur.json). Die nachfolgenden älteren Familien bleiben als eigene Quellen erhalten.', '', '| Serie | Ausführungen | Formen / Größen | Designs |', '| --- | --- | --- | --- |']
        for s in structure['series']:
            md.append(f"| [{s['name']}]({s['sourcePath']}) | {s['variantCount']} | {s['shapeSizeCount']} | {s['designCount']} |")
        md += ['', '### Zugeordnete Hauptprodukte', '', '| Linie | Produkt | Shopify-ID | Varianten | Stand |', '| --- | --- | --- | --- | --- |']
        for p in structure['mainProducts']:
            md.append(f"| {p['lineId']} | [{p['title']}]({p['adminUrl']}) | {p['id'].split('/')[-1]} | {p['variantCount']} | {p['role']} · {p['status']} |")
        md += ['', '### Abgleich und offene Punkte', '']
        for c in structure['checks']: md.append(f"- **{c['title']}:** {c['detail']}")
        md += ['', 'Kundenanbindung und Veröffentlichung sind zurückgestellt. Geplante Anzahlen und Zuordnungen werden in der Mitarbeiter-Werkstatt gespeichert; sie erzeugen keine Shopify-Artikel.', '']
    if lines:
        md += ['## Produktlinien und Unterkategorien', '', 'Linie = was physisch verkauft wird (Familien); Unterkategorie = Thema/Zielgruppe innerhalb der Linie (Name im Shop „Linie – Unterkategorie“). Je Unterkategorie: Schrift-Set, Design-Themen und Motivkategorien aus [themen.json](themen.json), eigene Preise nur wo abweichend (`priceOverrides`). Status „Vorschlag“ = vom Nutzer noch zu bestätigen.', '']
        for l in lines:
            fams_txt = ', '.join(f"[{fam_by_id[i]['name']}](#{i})" if i in fam_by_id else f'`{i}` (fehlt)' for i in l.get('families', [])) or 'Familie offen'
            md += [f"### {l['name']}", '', f"Familien: {fams_txt} · Stand: {l.get('status', 'offen')}", '', '| Unterkategorie | Thema | Schrift-Set | Motivkategorien | Preise | Status |', '| --- | --- | --- | --- | --- | --- |']
            normalized = next((x['subcategories'] for x in structure['lines'] if x['id'] == l['id']), l.get('subcategories', [])) if structure else l.get('subcategories', [])
            for sc in normalized:
                t = themes.get(sc.get('themeId'), {}); ov = sc.get('priceOverrides') or {}
                n_ov = sum(len(v.get('sizes', {})) + len(v.get('mounting', {})) + sum(len(x) for x in v.get('options', {}).values()) for v in ov.values())
                md.append(f"| {sc['name']} | `{sc.get('themeId', '')}` | `{sc.get('fontSet', t.get('fontSet', 'offen'))}` | {', '.join(t.get('motifCategories', [])) or '–'} | {'wie Familie' if not n_ov else str(n_ov) + ' abweichend'} | {sc.get('status', 'offen')} |")
            # Hauptprodukte (Linie → Unterkategorie → Hauptprodukt → Ausführungen): eigene Shop-Produkte mit Startdesign
            mains = [(sc, m) for sc in l.get('subcategories', []) for m in (sc.get('mainProducts') or [])]
            if mains:
                md += ['', '| Hauptprodukt | Unterkategorie | Startdesign | Größen | Externe Kennungen | Status |', '| --- | --- | --- | --- | --- | --- |']
                for sc, m in mains:
                    ext = ', '.join(f"{k} {v}" for k, v in (m.get('externalIds') or {}).items()) or '–'
                    md.append(f"| {m.get('name') or m['id']} (`{m['id']}`) | {sc['name']} | `{m['startDesign']}` | {', '.join('`' + k + '`' for k in m['sizesOffered']) if m.get('sizesOffered') else 'alle der Unterkategorie'} | {ext} | {m.get('status', 'offen')} |")
            md.append('')
    elif lines_md.exists(): md += ['## Produktlinien', '', f'Siehe [linien/README.md](linien/README.md).', '']
    md += ['## Familien auf einen Blick', '', '| Material | Familie | Größen | Formen | Bohrbilder | Preise | Stand |', '| --- | --- | --- | --- | --- | --- | --- |']
    sections = []
    for p, f in families:
        gaps = gaps_of(p)
        if not any(str(p) + ':' in issue for issue in INVALID): contour_previews(f, out_dir)
        md.append(f"| {MAT.get(f['material']['kind'], f['material']['kind'])} | [{f['name']}](#{f['id']}) | {len(f['sizes'])} | {', '.join(dict.fromkeys(g['name'] for g in f['groups']))} | {len(f['mountingRules'])} | {'hinterlegt' if all(s['baseCents'] is not None for s in f['sizes']) else 'offen'} | {'vollständig' if not gaps else str(len(gaps)) + ' offen'} |")
        pdf = out_dir / f"{f['id']}.pdf"; pdf_ok = False
        try:
            if a.metadata_only: raise RuntimeError('Metadatenlauf: bestehende PDF bleibt unverändert')
            subprocess.run([sys.executable, str(ROOT / 'scripts/plate-catalog-pdf.py'), str(p), '--out', str(pdf)], check=True, capture_output=True, timeout=300)
            import pymupdf
            d = pymupdf.open(pdf); d[min(1, d.page_count - 1)].get_pixmap(dpi=70).save(out_dir / 'png' / f"{f['id']}.png"); pdf_ok = True
        except Exception as e:
            print('Katalog-PDF für', f['id'], 'nicht erzeugt:', str(e)[:100])
        sections.append(f'<a id="{f["id"]}"></a>\n' + family_section(f, p, kat, pdf_ok))
    md += ['', '## Familien im Einzelnen', ''] + sections
    xlsx = out_dir / 'Stammdaten-Gravuru.xlsx'
    try:
        if a.metadata_only: raise RuntimeError('Metadatenlauf: bestehende Excel bleibt unverändert')
        subprocess.run([sys.executable, str(ROOT / 'scripts/family-excel.py'), 'export', '--out', str(xlsx)] + [str(p) for p, _ in families], check=True, capture_output=True, timeout=300)
        md.append(f'\nStammdaten-Excel (alle Familien): [kataloge/Stammdaten-Gravuru.xlsx](kataloge/Stammdaten-Gravuru.xlsx)')
    except Exception as e:
        print('Excel nicht erzeugt:', str(e)[:100])
    (kat / 'KATALOG.md').write_text('\n'.join(md) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(families)} Familien → {kat / "KATALOG.md"}')
    if INVALID:
        print('UNGÜLTIG (nicht committen):\n  ' + '\n  '.join(INVALID), file=sys.stderr); sys.exit(1)


if __name__ == '__main__':
    main()
