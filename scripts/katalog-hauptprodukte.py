#!/usr/bin/env python3
"""Hauptprodukte aus FancyCustomizationIDs.csv in eine Katalog-Linie eintragen (Dry-run, `--apply` schreibt).

Je CSV-Zeile (CustomizationID; Export-Name; Hauptdesign Artikelnummer; CDR Pfad) entsteht ein
Hauptprodukt `{id, name, startDesign, sizesOffered, externalIds, status}` in der Unterkategorie
`linien/<linie>.json → subcategories[].mainProducts` (Schema seit 22.10.2026):

  * Hauptdesign `TRE-V2A-9x6-D5` → Bogen `TRE-V2A-9x6` → Formatreihe + Familiengröße aus der ersten
    Tabelle der `designs/<reihe>/UEBERSICHT.md` (Spalten Bogen | Familiengröße); Master der Reihe
    `<Präfix der Reihe>-D5` muss als Ordner existieren und die Größe in `design.json.sizes` nennen
    (grüne Überschrift auf dem Bogen). Sonst bleibt das Produkt „offen“ und wird nicht eingetragen.
  * Unterkategorie = erstes Thema aus `design.json.themes` (muss `themeId` einer Unterkategorie der
    Linie sein); weitere Themen stehen als Hinweis im Status – Zuordnung prüft Chris.
  * Name = Shopify-Titel (Datei `--shop`, Zeilen `SKU|ProduktID|Status|Handle|Preis|Varianten|CustomizationID|Titel`
    aus dem Vollexport), sonst „<Linie> <B> × <H> cm – <Designname>“ mit Hinweis.
  * externalIds: customizationId (CSV) und shopifyProductId (Export), nie erfunden; die Shop-SKU steht im Status
    (externalIds-Werte erlauben kein Komma, z. B. TRE-V2A-8x3,5-D4).
  * Bestehende Hauptprodukte (gleiche id) bleiben unverändert.

Aufruf:
  python3 -I scripts/katalog-hauptprodukte.py --katalog <katalog> --linie edelstahl-tuerschilder \
      --csv linien/_inventar/FancyCustomizationIDs.csv --pfad "__NEU" --sku-praefix "V2A" \
      --shop docs/handoffs/2026-10-23-shopify-edelstahl-hauptprodukte.txt --bericht <datei.md> [--apply]
"""
import argparse, csv, json, re
from pathlib import Path


def load_sheets(katalog, series_prefix):
    """Bogen (Basis-SKU) → (Formatreihe, Familiengröße|None) aus der ersten UEBERSICHT-Tabelle je Reihe."""
    sheets = {}
    for u in sorted((katalog / 'designs').glob(f'{series_prefix}*/UEBERSICHT.md')):
        series = u.parent.name
        for line in u.read_text(encoding='utf-8').splitlines():
            if line.startswith('| Design |'): break
            m = re.match(r'\|\s*([A-Z0-9]+-[^|\s]+)\s*\|\s*([^|]+?)\s*\|', line)
            if m and m.group(1) != 'Bogen':
                sheets[m.group(1)] = (series, None if 'offen' in m.group(2) else m.group(2))
    return sheets


def series_prefix(katalog, series):
    idx = json.loads((katalog / 'designs' / series / 'index.json').read_text(encoding='utf-8'))
    return re.sub(r'-D\d+$', '', idx[0]['key'])


def load_shop(path):
    shop = {}
    if not path: return shop
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if not line or line.startswith('#'): continue
        p = line.split('|')
        if len(p) < 8: continue
        shop[p[0]] = {'productId': p[1], 'status': p[2], 'handle': p[3], 'price': p[4], 'variants': p[5], 'customizationId': p[6], 'title': '|'.join(p[7:])}
    return shop


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--katalog', required=True); ap.add_argument('--linie', required=True)
    ap.add_argument('--csv', required=True, help='relativ zum Katalog oder absolut')
    ap.add_argument('--pfad', default='', help='Teilstring, den „CDR Pfad“ enthalten muss (z. B. __NEU)')
    ap.add_argument('--sku-praefix', default='', help='Teilstring, den „Hauptdesign Artikelnummer“ enthalten muss (z. B. V2A)')
    ap.add_argument('--reihen', default='edelstahl-gravur-', help='Präfix der Design-Reihenordner')
    ap.add_argument('--extra-bogen', action='append', default=[], help='Bogen=Reihe=Größe für Reihen ohne Bogentabelle (z. B. TRE-V2A-7x2=edelstahl-gravur-70x23=GR-ES-RE-70X23P3-T15)')
    ap.add_argument('--shop'); ap.add_argument('--bericht'); ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    katalog = Path(a.katalog)
    line_file = katalog / 'linien' / f'{a.linie}.json'
    line = json.loads(line_file.read_text(encoding='utf-8'))
    subs = {s.get('themeId') or s['id']: s for s in line['subcategories']}
    family_sizes = {}
    for f in (katalog / 'familien').glob('*/*.json'):
        d = json.loads(f.read_text(encoding='utf-8'))
        if d.get('id') in line['families']:
            for s in d['sizes']: family_sizes[s['key']] = s
    csv_path = Path(a.csv) if Path(a.csv).is_absolute() else katalog / a.csv
    rows = [r for r in csv.DictReader(csv_path.open(encoding='utf-8-sig'), delimiter=';')
            if r.get('CustomizationID') and a.pfad in (r.get('CDR Pfad') or '') and a.sku_praefix in (r.get('Hauptdesign Artikelnummer') or '')]
    sheets = load_sheets(katalog, a.reihen)
    for x in a.extra_bogen:
        b, s, k = x.split('='); sheets.setdefault(b, (s, k or None))
    shop = load_shop(a.shop)
    existing = {m['id'] for s in line['subcategories'] for m in (s.get('mainProducts') or [])}
    added, kept, offen, warn = [], [], [], []
    for r in rows:
        cid, sku = r['CustomizationID'].strip(), r['Hauptdesign Artikelnummer'].strip()
        if cid in existing: kept.append((cid, sku)); continue
        if re.match(r'(?i)\s*test', r.get('Export-Name') or ''): offen.append((cid, sku, f'Testeintrag „{r["Export-Name"].strip()}“ – übersprungen')); continue
        m = re.match(r'(.+)-D(\d+)$', sku)
        if not m: offen.append((cid, sku, 'Hauptdesign ohne D-Nummer')); continue
        base, n = m.groups()
        if base not in sheets: offen.append((cid, sku, f'Bogen {base} in keiner Reihe (UEBERSICHT.md)')); continue
        series, key = sheets[base]
        did = f'{series_prefix(katalog, series)}-D{n}'
        dj = katalog / 'designs' / series / did / 'design.json'
        if not dj.exists(): offen.append((cid, sku, f'Master {did} fehlt in {series}')); continue
        d = json.loads(dj.read_text(encoding='utf-8'))
        if key is None: offen.append((cid, sku, f'Bogen {base}: Größe fehlt in der Familie (Reihe {series})')); continue
        if key not in family_sizes: offen.append((cid, sku, f'Größe {key} nicht in den Familien der Linie')); continue
        if isinstance(d.get('sizes'), list) and key not in d['sizes']: offen.append((cid, sku, f'{did}: Größe {key} auf dem Bogen nicht wählbar (nicht grün)')); continue
        themes = [t for t in (d.get('themes') or []) if t in subs]
        if not themes: offen.append((cid, sku, f'{did}: kein Thema, das einer Unterkategorie der Linie entspricht ({d.get("themes")})')); continue
        sub = subs[themes[0]]
        sz = family_sizes[key]
        s = shop.get(sku)
        notes = [f'Hauptdesign {sku} (Bogen {base}, Reihe {series}, Master {did})']
        if s:
            name = s['title']
            notes.append(f'Titel aus Shopify (Produkt {s["productId"]}, {s["status"]}, {s["variants"]} Variante(n), {s["price"]} €)')
            if s['customizationId'] and s['customizationId'] != cid: warn.append((cid, sku, f'Shopify custom.customization_id {s["customizationId"]} ≠ CSV {cid}'))
        else:
            w, h = sz.get('widthMm'), sz.get('heightMm')
            name = f'{line["name"]} {w/10:g} × {h/10:g} cm – {d.get("name") or did}'
            notes.append('kein Shopify-Produkt mit dieser SKU im Export – Name aus Katalog, prüfen')
        if len(themes) > 1: notes.append('Themen laut Design: ' + ', '.join(d['themes']) + ' – Unterkategorie „' + sub['id'] + '“ gewählt, prüfen')
        if d.get('katalog', {}).get('themenVorschlag') or d.get('themesVorschlag'): notes.append('Themenvorschlag unsicher: ' + ', '.join(d.get('themesVorschlag') or d['katalog'].get('themenVorschlag')))
        if d.get('review'): notes.append('Design prüfen: ' + str(d['review']))
        entry = {'id': cid, 'name': name[:160], 'startDesign': did, 'sizesOffered': [key],
                 'externalIds': {'customizationId': cid, **({'shopifyProductId': s['productId']} if s else {})},
                 'status': '; '.join(notes) + ' (eingetragen 23.10.2026, katalog-hauptprodukte.py)'}
        sub.setdefault('mainProducts', [])
        if sub['mainProducts'] is None: sub['mainProducts'] = []
        sub['mainProducts'].append(entry); added.append((cid, sku, sub['id'], did, key, name))
    rep = [f'# Hauptprodukte {line["name"]} · aus {csv_path.name}', '',
           f'{len(rows)} Zeilen, **{len(added)} eingetragen**, {len(kept)} schon vorhanden, {len(offen)} offen, {len(warn)} Warnungen. {"Geschrieben." if a.apply else "Dry-run – nichts geschrieben."}', '',
           '| CustomizationID | Hauptdesign | Unterkategorie | Startdesign | Größe | Name |', '| --- | --- | --- | --- | --- | --- |']
    rep += [f'| {c} | {s} | {u} | {d} | {k} | {n} |' for c, s, u, d, k, n in added]
    if kept: rep += ['', '## Schon vorhanden', ''] + [f'- {c} ({s})' for c, s in kept]
    if offen: rep += ['', '## Offen (nicht eingetragen)', ''] + [f'- {c} {s}: {why}' for c, s, why in offen]
    if warn: rep += ['', '## Warnungen', ''] + [f'- {c} {s}: {why}' for c, s, why in warn]
    text = '\n'.join(rep) + '\n'
    if a.bericht: Path(a.bericht).write_text(text, encoding='utf-8')
    print(text if not a.bericht else rep[2])
    if a.apply:
        line_file.write_text(json.dumps(line, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{line_file} geschrieben.')


if __name__ == '__main__':
    main()
