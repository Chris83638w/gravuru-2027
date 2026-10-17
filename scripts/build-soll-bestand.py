"""Soll-Bestandsliste aus der Server-Inventur erzeugen (Arbeitsliste für den Nutzer).

Quellen (nur gelesen): linien/_inventar/inventar.json (Ordnerbaum), linien/_inventar/bestand.csv
(Produktregister Bestand.xlsm) und quellen/server-produkte-20261017/Produkte Schriftartenhäufigkeit.xlsx
(je Design-Ordner [CDR] die genutzten Schriften). Ergebnis: linien/SOLL-BESTAND.xlsx mit den Blättern
  Linien   – je Serverprodukt: Umfang, Verfahren, Materialien, Größen, Designordner, SKU-Präfixe,
             Vorschlag Linie/Unterkategorien; Spalten „Soll“, „Priorität“, „Bemerkung“ zum Ausfüllen
  Größen   – je Produkt/Verfahren/Form/Material/Größe: Status altes System, Designordner; Spalten „Soll“, „Zielfamilie“
  Designs  – je [CDR]-Ordner (= eine SKU-Größe): Pfad, Produkt, Größe, genutzte Schriften; Spalte „Kopieren“
  Schriften je Produkt – Nutzung der Schriften (Summe über die Designordner), Grundlage für Schrift-Sets
  Lesen
Nichts wird geraten: Soll-Spalten bleiben leer, bis der Nutzer sie füllt.

    python scripts/build-soll-bestand.py --katalog <katalog>
"""
import argparse, collections, csv, json, re
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

SIZE = re.compile(r'(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)', re.I)
THEME_HINT = {'Hausnummern': 'hausnummern', 'Namenschilder': 'namensschilder', 'Firmenschilder': 'firmenschilder', 'Hochzeitsschilder': 'hochzeitsschilder', 'Hinweisschilder': 'hinweisschilder',
              'Tierschilder': 'hundeschilder / katzenschilder', 'Boxenschilder': 'pferdeschilder', 'Gedenktafeln': 'gedenktafeln / tiergedenktafeln', 'Gedenktafeln Sternenkinder': 'gedenktafeln',
              'Gedenkstandbilder': 'gedenktafeln / tiergedenktafeln', 'Grabstecker': 'gedenktafeln', 'Kreuze': 'gedenktafeln', 'Türschilder': 'namensschilder, familienschilder, hundeschilder, hochzeitsschilder, firmenschilder, willkommensschilder',
              'Türklingel': 'namensschilder, hausnummern, firmenschilder', 'Schlüsselanhänger': 'namensschilder, hochzeitsschilder, hundeschilder, geschenkartikel', 'Hunde-Ecke': 'hundeschilder',
              'Tierzubehör': 'hundeschilder', 'Wandbilder': 'wanddeko, geschenkartikel', 'Standbilder': 'geschenkartikel, hochzeitsschilder, babyschilder', 'Kordelschilder': 'willkommensschilder, geschenkartikel'}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--katalog', required=True); ap.add_argument('--exclude', default='', help='kommagetrennte Wörter; Zeilen/Pfade damit bleiben außen vor (z. B. Funkklingel)'); a = ap.parse_args()
    kat = Path(a.katalog); excl = [w.strip().lower() for w in a.exclude.split(',') if w.strip()]
    hit = lambda *texts: any(w in str(t).lower() for t in texts for w in excl)
    inv = json.loads((kat / 'linien/_inventar/inventar.json').read_text(encoding='utf-8'))
    bestand = [b for b in csv.DictReader((kat / 'linien/_inventar/bestand.csv').open(encoding='utf-8'), delimiter=';') if not hit(b['Verfahren'], b['Form'], b['Material'], b['Größe'])]
    # Schriftnutzung je Designordner
    ws = load_workbook(kat / 'quellen/server-produkte-20261017/Produkte Schriftartenhäufigkeit.xlsx', read_only=True, data_only=True)['Tabelle1']
    it = ws.iter_rows(values_only=True); head = list(next(it)); paths = list(next(it))
    designs = []
    for i in range(2, len(head)):
        p = str(paths[i] or ''); parts = p.split('\\')
        prod = parts[2] if len(parts) > 2 else ''
        m = next((SIZE.search(s) for s in reversed(parts) if SIZE.search(s)), None)
        if hit(p): designs.append(None); continue
        designs.append({'sku': str(head[i]).replace('_Designs', '').replace('-Designs', ''), 'path': p, 'product': prod, 'size': f'{m.group(1)}x{m.group(2)}' if m else '', 'fonts': collections.Counter(), 'ids': set()})
    # Zellen enthalten die Design-Kennungen je Schrift („D17, D6, D1“) – also welche Designs des Ordners die Schrift nutzen.
    for r in it:
        name = r[0]
        if not name or name == 'Pfad': continue
        for i in range(2, len(head)):
            v = r[i]
            if v in (None, ''): continue
            if designs[i - 2] is None: continue
            ids = {t.strip() for t in str(v).split(',') if t.strip()}
            if ids: designs[i - 2]['fonts'][name] += len(ids); designs[i - 2]['ids'] |= ids
    designs = [d for d in designs if d]
    by_prod_designs = collections.Counter(d['product'] for d in designs)
    by_prod_size_designs = collections.Counter((d['product'], d['size']) for d in designs)
    fonts_by_prod = collections.defaultdict(collections.Counter)
    for d in designs:
        for f, n in d['fonts'].items(): fonts_by_prod[d['product']][f] += n

    wb = Workbook(); wb.remove(wb.active)
    head_font = Font(bold=True, color='FFFFFF'); fill = PatternFill('solid', fgColor='2F5D50'); todo = PatternFill('solid', fgColor='FFF2CC')

    def sheet(title, cols, rows, widths, todo_cols=()):
        s = wb.create_sheet(title); s.append(cols)
        for c in s[1]: c.font = head_font; c.fill = fill; c.alignment = Alignment(wrap_text=True, vertical='center')
        for r in rows: s.append(r)
        for i, w in enumerate(widths, 1): s.column_dimensions[get_column_letter(i)].width = w
        for name in todo_cols:
            ci = cols.index(name) + 1
            for row in range(2, len(rows) + 2): s.cell(row, ci).fill = todo
        s.freeze_panes = 'B2'; s.auto_filter.ref = s.dimensions
        return s

    # Linien
    rows = []
    for name, r in inv.items():
        bz = [b for b in bestand if b['Produkt'].replace(' ', '') == name.replace(' ', '').replace('-', '')]
        n_designs = sum(len(d['ids']) for d in designs if d['product'] == name)
        rows.append([name, r['folders'], ', '.join(f'{k} {v}' for k, v in r['processes'].items()), ', '.join(k for k, _ in r['materials'][:8]), len(r['sizes']), len(bz), f"{by_prod_designs.get(name, 0)} / {n_designs}",
                     ', '.join(k for k, _ in r['skuPrefixes'][:8]), ', '.join(k for k, _ in r['flags'][:5]), name, THEME_HINT.get(name, ''), '', '', ''])
    sheet('Linien', ['Serverprodukt', 'Ordner', 'Verfahren', 'Materialien (Ordnernamen)', 'Größen (Baum)', 'Größen (Register)', 'Designordner [CDR] / Designs mit Text', 'SKU-Präfixe', 'Markierungen (Archiv/Neu/Alt)', 'Linie (Vorschlag)', 'Unterkategorien (Vorschlag, Themen-Kennungen)', 'Soll (ja/nein/später)', 'Priorität (1–3)', 'Bemerkung'],
          rows, [26, 8, 22, 40, 9, 9, 10, 30, 28, 26, 44, 12, 9, 40], ['Linie (Vorschlag)', 'Unterkategorien (Vorschlag, Themen-Kennungen)', 'Soll (ja/nein/später)', 'Priorität (1–3)', 'Bemerkung'])
    # Größen
    rows = []
    seen = set()
    for b in bestand:
        prod = b['Produkt']; key = (prod, b['Verfahren'], b['Form'], b['Material'], b['Größe']); seen.add(key)
        inv_name = next((n for n in inv if n.replace(' ', '').replace('-', '') == prod.replace(' ', '')), prod)
        m = SIZE.search(b['Größe']); size = f'{m.group(1)}x{m.group(2)}' if m else b['Größe']
        rows.append([inv_name, b['Verfahren'], b['Form'], b['Material'], b['Größe'], 'Register', b['Produktbilder'], b['Fancy'], b['Amazon'], b['Import'], by_prod_size_designs.get((inv_name, size), 0), '', '', ''])
    for name, r in inv.items():
        for k, s in r['sizes'].items():
            ctx = s['contexts'][0][0] if s['contexts'] else ''
            if any(name == row[0] and row[4].startswith(k) for row in rows): continue
            rows.append([name, ctx.split(' / ')[0] if ctx else '', '', ' / '.join(ctx.split(' / ')[1:]), k, 'nur Ordnerbaum' + (' (Archiv)' if s['archivedShare'] >= .99 else ''), '', '', '', '', by_prod_size_designs.get((name, k), 0), '', '', ''])
    sheet('Größen', ['Produkt', 'Verfahren', 'Form/Serie', 'Material', 'Größe', 'Quelle', 'Produktbilder (alt)', 'Fancy (alt)', 'Amazon (alt)', 'Import (alt)', 'Designordner', 'Soll (ja/nein)', 'Zielfamilie (Katalog)', 'Bemerkung'],
          rows, [24, 12, 22, 26, 16, 20, 9, 9, 9, 9, 10, 12, 28, 36], ['Soll (ja/nein)', 'Zielfamilie (Katalog)', 'Bemerkung'])
    # Designs
    rows = [[d['sku'], d['product'], d['size'], d['path'], len(d['ids']), len(d['fonts']), ', '.join(f for f, _ in d['fonts'].most_common(5)), 'ja', ''] for d in designs]
    sheet('Designs', ['SKU', 'Produkt', 'Größe', 'Designordner (Server)', 'Designs (mit Text)', 'Schriften genutzt', 'häufigste Schriften', 'Kopieren (ja/nein)', 'Bemerkung'], rows, [26, 20, 12, 70, 10, 10, 50, 12, 30], ['Kopieren (ja/nein)', 'Bemerkung'])
    # Schriften je Produkt
    all_fonts = sorted({f for c in fonts_by_prod.values() for f in c})
    prods = sorted(fonts_by_prod, key=lambda p: -sum(fonts_by_prod[p].values()))
    rows = [[f, sum(fonts_by_prod[p][f] for p in prods)] + [fonts_by_prod[p].get(f, '') for p in prods] for f in all_fonts]
    rows.sort(key=lambda r: -r[1])
    sheet('Schriften je Produkt', ['Schrift', 'gesamt'] + prods, rows, [28, 8] + [14] * len(prods))
    info = wb.create_sheet('Lesen')
    for line in ['Soll-Bestandsliste – erzeugt aus der Server-Inventur vom 17.10.2026 (Ordnerbaum, Bestand.xlsm, Schriftartenhäufigkeit). Gelbe Spalten füllt der Nutzer.' + (f' Ausgeschlossen (Nutzer): {", ".join(excl)}.' if excl else ''),
                 'Linien: ein Serverprodukt = ein Linien-Kandidat. „Soll“ = ja (weiterführen), nein (nicht mehr), später. Priorität 1 = zuerst.',
                 'Größen: alle Größen aus Register und Ordnerbaum. „Soll“ = ja/nein; „Zielfamilie“ = Familie im Katalog (z. B. acryl-ss-abstandshalter), wenn die Größe dort weiterlebt. Alte Größen ohne Soll bleiben Bestand.',
                 'Designs: ein [CDR]-Ordner je SKU-Größe = die Corel-Designs dieser Größe. „Kopieren“ steuert den Extraktionslauf (Standard ja). Schriften aus der Schriftartenhäufigkeit.',
                 'Schriften je Produkt: wie oft welche Schrift in den Designs eines Produkts vorkommt – Grundlage für die Schrift-Sets je Linie.',
                 'Zurück an Claude: ausgefüllte Datei im Chat oder im Katalog-Repo ablegen; daraus entstehen Linien-Dateien, Zielfamilien-Zuordnung und der Kopierplan.']:
        info.append([line])
    info.column_dimensions['A'].width = 160
    out = kat / 'linien/SOLL-BESTAND.xlsx'; wb.save(out)
    print(f"{len(inv)} Linien-Kandidaten, {len(bestand)} Registergrößen, {len(designs)} Designordner, {len(all_fonts)} Schriften → {out}")


if __name__ == '__main__':
    main()
