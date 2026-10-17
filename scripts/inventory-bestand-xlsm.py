"""Bestand.xlsm (Produktregister auf dem Server) in eine flache Tabelle lesen.

Aufbau je Produktblatt: eingerückte Hierarchie in den Spalten B..E – Verfahren (Gravur/UV),
Form/Serie, Material, Größe – und je Größenzeile die Statusflaggen Produktbilder / Fancy /
Amazon / Import (1 = erledigt). Das Skript liest nur und schreibt bestand.csv (eine Zeile je
Größe) sowie eine Zusammenfassung je Produkt in bestand.md.

    python scripts/inventory-bestand-xlsm.py --xlsx Bestand.xlsm --out <ordner>
"""
import argparse, csv, collections, re
from pathlib import Path
from openpyxl import load_workbook

SIZE = re.compile(r'^\s*\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?', re.I)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--xlsx', required=True); ap.add_argument('--out', required=True); a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    wb = load_workbook(a.xlsx, read_only=True, data_only=True)
    rows = []
    for ws in wb.worksheets:
        if ws.title == 'ÜBERSICHT': continue
        head = None; ctx = {}; seen_l1 = set()
        for r in ws.iter_rows(min_row=1, values_only=True):
            r = list(r) + [None] * 14
            if head is None and r[8] == 'Produktbilder': head = [str(v) for v in r[8:12]]; continue
            cells = [(i, str(v).strip()) for i, v in enumerate(r[1:7], 1) if v not in (None, '')]
            if not cells: continue
            i, v = cells[0]
            if v in ('Übersicht', ws.title) or v.startswith('◀'): continue
            if SIZE.match(v) or (i >= 4 and r[7] == 'Ordner öffnen'):
                flags = [1 if str(x) in ('1', '1.0') else 0 if str(x) in ('0', '0.0') else None for x in r[8:12]]
                rows.append({'Produkt': ws.title, 'Verfahren': ctx.get(1, ''), 'Form': ctx.get(2, ''), 'Material': ctx.get(3, ''), 'Größe': v,
                             'Produktbilder': flags[0], 'Fancy': flags[1], 'Amazon': flags[2], 'Import': flags[3]})
            else:
                if i == 1:
                    if v in seen_l1: break  # zweiter Abschnitt (Designliste) wiederholt die Hierarchie – nur das Register lesen
                    seen_l1.add(v)
                ctx[i] = v
                for k in [k for k in ctx if k > i]: ctx.pop(k)
    with (out / 'bestand.csv').open('w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()), delimiter=';'); w.writeheader(); w.writerows(rows)
    by = collections.OrderedDict()
    for r in rows: by.setdefault(r['Produkt'], []).append(r)
    md = ['# Bestand.xlsm – Produktregister (Server, gelesen 17.10.2026)', '', f'{len(rows)} Größenzeilen in {len(by)} Produkten. Flaggen 1 = im alten System erledigt (Produktbilder / Fancy-Konfigurator / Amazon / Import).', '',
          '| Produkt | Größen | Verfahren | Materialien | Fancy fertig | Amazon fertig |', '| --- | --- | --- | --- | --- | --- |']
    for p, rs in by.items():
        md.append(f"| {p} | {len(rs)} | {', '.join(sorted({r['Verfahren'] for r in rs if r['Verfahren']}))} | {', '.join(sorted({r['Material'] for r in rs if r['Material']}))[:120]} | {sum(1 for r in rs if r['Fancy'] == 1)} | {sum(1 for r in rs if r['Amazon'] == 1)} |")
    md += ['', '## Größen je Produkt, Verfahren und Material', '']
    for p, rs in by.items():
        md.append(f'### {p}')
        groups = collections.OrderedDict()
        for r in rs: groups.setdefault((r['Verfahren'], r['Form'], r['Material']), []).append(r)
        for (v, f, m), g in groups.items():
            md.append(f"- **{v or '–'}** · {f or '–'} · {m or '–'}: " + ', '.join(f"{r['Größe']}{'' if r['Fancy'] == 1 else '°'}" for r in g))
        md.append('')
    md.append('° = im Fancy-Konfigurator nicht fertig gemeldet')
    (out / 'bestand.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'{len(rows)} Größen, {len(by)} Produkte → {out}')


if __name__ == '__main__':
    main()
