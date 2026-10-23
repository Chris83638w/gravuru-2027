#!/usr/bin/env python3
"""Formatreihe aus Corel-Bogen-Bestand → Lieferform 2 (Master je Designnummer).

Dieselbe Strecke wie beim Muster Edelstahl 7x2 (STAND.md, 22.10.2026), für eine ganze
Formatreihe mit mehreren Bögen (z. B. „Rechteckig ab 8x5“ = 8x5, 9x6, 12x8 … 45x30):

  * Quelle sind die Bogen-Ordner `designs/bestand/boegen/<Basis-SKU>/` (designs.json je Bogen,
    je Design design.json/design.svg). Grüne Überschrift (#00ff00) = im Konfigurator wählbar.
  * Je Designnummer entsteht EIN Master: aus dem kleinsten Bogen der Reihe, auf dem die Nummer
    grün ist, 1:1 auf die Familiengröße dieses Bogens übertragen (read-bestand-designs.convert –
    gleichmäßig skaliert, mittig; 80 × 50 → 80 × 53,3 heißt Faktor 1, Versatz 0/1,65 mm).
  * `sizes` = Familiengrößen (Schlüssel), auf deren Bogen die Nummer grün ist; Größen ohne Eintrag
    in der Familie bleiben „offen“ (nie erfinden).
  * Doppel `-PRODUKTION` (Vermerk „Produktion:“ auf dem Bogen) → `design-produktion.svg` + Block
    `production` (Gravurfassung; Konfigurator zeigt design.svg).
  * Doppel `-DOPPELTn`: identische Fassung wird ignoriert, abweichende landet als „prüfen“ in der
    Übersicht. Designs ohne grüne Überschrift (rot) werden nicht übernommen.
  * Namen/Themen aus `zuordnung.json` (D<n> → name, themen, themenVorschlag, pruefen); ohne
    Eintrag bleibt der Bogenname („D23 Vanessa“) und das Standardthema.
  * Text bleibt Text, Motive einfarbig als Pfade, Schriften nur per Name (+ Ersatzliste
    `--ersatz`); fehlende Schriftdateien werden gemeldet, nie ersetzt.

Aufruf (Beispiel):
  python3 -I scripts/build-design-reihe.py --katalog <katalog> --familie steel-door-signs \
      --boegen "TRE-V2A-8x5=GR-ES-RE-80X53P3-T15;TRE-V2A-9x6=GR-ES-RE-90X60-T15;…" \
      --out <katalog>/designs/edelstahl-gravur-80x53 --serie edelstahl-gravur-80x53 \
      --formatreihe "Rechteckig ab 8x5" --zuordnung <…>/zuordnung.json \
      --ersatz <katalog>/schriften/ersatz-tuerschilder.json --themen familienschilder,namensschilder

`--boegen`: Bögen der Reihe von klein nach groß, je Bogen `Basis-SKU=Familiengröße`, Trenner `;`; leerer
Schlüssel (`TR1-V2A-9x6=`) heißt: Größe fehlt in der Familie → Master behält das Bogenmaß, `sizes`
bleibt leer und die Übersicht meldet „Größe offen“.
"""
import argparse, importlib.util, json, re, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('read_bestand_designs', HERE / 'read-bestand-designs.py')
rbd = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(rbd)
rpd = rbd.rpd

GREEN = '#00ff00'


def num(key): return int(re.search(r'-D(\d+)', key).group(1))


def nat(key):
    return [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', key)]


def load_family(katalog, family_id):
    for f in (Path(katalog) / 'familien').glob('*/*.json'):
        d = json.loads(f.read_text())
        if d.get('id') == family_id: return d
    raise SystemExit(f'Familie fehlt: {family_id}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--katalog', required=True); ap.add_argument('--familie', required=True)
    ap.add_argument('--boegen', required=True, help='Basis-SKU=Größenschlüssel;… (klein → groß; Trenner ; oder ,)')
    ap.add_argument('--out', required=True); ap.add_argument('--serie', required=True)
    ap.add_argument('--formatreihe', required=True); ap.add_argument('--zuordnung'); ap.add_argument('--ersatz')
    ap.add_argument('--themen', default='familienschilder,namensschilder')
    ap.add_argument('--praefix', help='Design-Kennung <praefix>-D<n>; Standard: Basis-SKU des ersten Bogens')
    a = ap.parse_args()
    katalog = Path(a.katalog); boegen_dir = katalog / 'designs' / 'bestand' / 'boegen'
    family = load_family(katalog, a.familie); fsizes = {s['key']: s for s in family['sizes']}
    sheets = []
    # Trenner `;` (Basis-SKUs wie TRE-V2A-8x3,5 enthalten Kommas); `,` nur, wenn kein `;` vorkommt
    for part in a.boegen.split(';' if ';' in a.boegen else ','):
        base, _, key = part.strip().partition('=')
        if key and key not in fsizes: raise SystemExit(f'Größe {key} fehlt in Familie {a.familie}')
        sheets.append((base, key or None))
    prefix = a.praefix or sheets[0][0]
    ersatz = {k: v for k, v in (json.loads(Path(a.ersatz).read_text()) if a.ersatz else {}).items() if not k.startswith('_')}
    files = rbd.font_files(katalog)
    zu = json.loads(Path(a.zuordnung).read_text()) if a.zuordnung else {}
    default_themes = [t for t in a.themen.split(',') if t]
    OUT = Path(a.out); OUT.mkdir(parents=True, exist_ok=True); rbd.OUT = OUT

    # ---- Bögen lesen: grün je Nummer, Produktionsfassungen, abweichende Doppel
    per_sheet = {}  # base → {no: entry}
    production = {}  # base → {no: key}
    differing = []  # abweichende Doppel (prüfen)
    red = {}  # base → {no}
    for base, key in sheets:
        entries = json.loads((boegen_dir / base / 'designs.json').read_text())
        g, p, r = {}, {}, set()
        for e in entries:
            if e.get('productionOf'):
                p[num(e['productionOf'])] = e['id']; continue
            if e.get('duplicateOf'):
                if e.get('identicalDuplicate') is False:
                    differing.append({'bogen': base, 'key': e['id'], 'von': e['duplicateOf'], 'gruen': e.get('labelColor') == GREEN})
                continue
            n = num(e['id'])
            if e.get('labelColor') == GREEN: g[n] = e
            else: r.add(n)
        per_sheet[base] = g; production[base] = p; red[base] = r
    numbers = sorted(set().union(*[set(g) for g in per_sheet.values()]))

    index, offen, warn_fonts = [], [], {}
    for n in numbers:
        master_base = next(b for b, _ in sheets if n in per_sheet[b])
        master_key = dict(sheets)[master_base]
        entry = per_sheet[master_base][n]
        folder = boegen_dir / master_base / entry['id']
        if master_key: target = [fsizes[master_key]['widthMm'], fsizes[master_key]['heightMm']]
        else: target = [entry['plate']['widthMm'], entry['plate']['heightMm']]; offen.append(f'D{n}: Größe von {master_base} fehlt in der Familie – Master behält {target[0]:g} × {target[1]:g} mm')
        z = zu.get(f'D{n}', {})
        d = rbd.convert(folder, target, prefix, ersatz, files)
        sheet_name = d['name']
        if z.get('name'): d['name'] = z['name']; d['nameSheet'] = sheet_name
        themes = z.get('themen') or list(default_themes)
        d['themes'] = themes
        if z.get('themenVorschlag'): d['themesVorschlag'] = z['themenVorschlag']
        if z.get('pruefen'): d['review'] = z['pruefen']
        d['formatreihe'] = a.formatreihe
        d['masterSheet'] = {'base': master_base, 'key': entry['id'], 'familySize': master_key, 'plateMm': [entry['plate']['widthMm'], entry['plate']['heightMm']]}
        # Größen: grün je Bogen → Familienschlüssel; Bogen ohne Familiengröße → offen
        sizes, sizes_open, not_sel = [], [], []
        for b, key in sheets:
            if n in per_sheet[b]:
                if key: sizes.append(key)
                else: sizes_open.append(b)
            elif n in red[b]: not_sel.append(key or b)
        d['sizes'] = sizes
        if sizes_open: d['sizesOpen'] = sizes_open
        if not_sel: d['sizesNotSelectable'] = not_sel
        d['katalog'] = {'key': f'{a.serie}-D{n}', 'series': a.serie, 'zielgruppe': z.get('zielgruppe', 'offen'), 'unterkategorie': z.get('unterkategorie', 'offen'), 'themen': themes}
        tgt = rbd.target_dir(d['id'])
        # Produktionsfassung (nur vom Master-Bogen; andere Bögen werden gemeldet)
        prod_key = production[master_base].get(n)
        prod_elsewhere = [b for b, _ in sheets if b != master_base and n in production[b]]
        if prod_key:
            pd = rbd.convert(boegen_dir / master_base / prod_key, target, prefix, ersatz, files)
            (tgt / 'design-produktion.svg').write_text(rpd.design_svg(pd))
            d['production'] = {'file': 'design-produktion.svg', 'source': f'{prod_key} (Bogen, Vermerk „Produktion:“)',
                               'note': 'Gravurfassung: Motiv mit vergrößerten Innenflächen für kleine Schilder (Chris 22.10.2026: „wird wenig größer graviert“). Konfigurator zeigt design.svg, Fertigung nutzt diese Datei.',
                               'motifs': pd['motifs'], 'texts': pd['texts']}
            if pd['warnings']: d['warnings'] += [f'Produktionsfassung: {w}' for w in pd['warnings']]
        if prod_elsewhere: d['productionElsewhere'] = prod_elsewhere
        (tgt / 'design.svg').write_text(rpd.design_svg(d))
        (tgt / 'design.json').write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
        if (folder / 'preview.png').exists(): shutil.copy(folder / 'preview.png', tgt / 'original.png')
        for f in d['fonts']:
            if f not in files: warn_fonts.setdefault(f, []).append(d['id'])
        index.append({'key': d['id'], 'name': d['name'], 'nameSheet': d.get('nameSheet', sheet_name), 'pfad': d['id'], 'quelle': entry['id'],
                      'masterBogen': master_base, 'plateMm': d['plateMm'], 'themen': themes, 'themenVorschlag': d.get('themesVorschlag', []),
                      'groessen': sizes, 'groessenOffen': sizes_open, 'nichtWaehlbar': not_sel, 'texte': len(d['texts']), 'motive': len(d['motifs']),
                      'schriften': d['fonts'], 'schriftenOriginal': d['fontsOriginal'], 'produktion': bool(prod_key), 'produktionWeitereBoegen': prod_elsewhere,
                      'pruefen': z.get('pruefen'), 'warnungen': d['warnings']})
        print(f'{d["id"]}: {d["name"]} – {len(d["texts"])} Texte, {len(d["motifs"])} Motive, Größen {len(sizes)}{" +offen" if sizes_open else ""}, Schriften {", ".join(d["fonts"])}'
              + (' ⚙' if prod_key else '') + (f'  ⚠ {"; ".join(d["warnings"])}' if d['warnings'] else ''))
    index.sort(key=lambda e: nat(e['key']))
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')

    # ---- Übersicht
    L = [f'# {a.formatreihe} – Lieferform 2 ({a.serie})', '',
         f'Quelle: Bögen {", ".join(b for b, _ in sheets)} (`designs/bestand/boegen/`), Familie `{a.familie}`. Master je Designnummer aus dem kleinsten Bogen mit grüner Überschrift, 1:1 auf die Familiengröße übertragen. Erzeugt mit `scripts/build-design-reihe.py` (Repo gravuru-2027); Namen/Themen aus `zuordnung.json`.', '',
         f'**{len(index)} Designs**, davon {sum(1 for e in index if e["produktion"])} mit Produktionsfassung, {sum(1 for e in index if e["themenVorschlag"])} mit Themenvorschlag (unsicher), {sum(1 for e in index if e["pruefen"])} zu prüfen.', '',
         '| Bogen | Familiengröße | grün | rot | Produktion | Doppel abweichend |', '| --- | --- | --- | --- | --- | --- |']
    for b, key in sheets:
        L.append(f'| {b} | {key or "**offen – fehlt in Familie**"} | {len(per_sheet[b])} | {len(red[b])} | {len(production[b])} | {sum(1 for x in differing if x["bogen"] == b)} |')
    L += ['', '| Design | Name | Bogenname | Themen | Vorschlag | Größen | nicht wählbar | Schriften | Prod. | Hinweise |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for e in index:
        hints = ([e['pruefen']] if e['pruefen'] else []) + e['warnungen'] + ([f'Produktionsfassung auch auf {", ".join(e["produktionWeitereBoegen"])}'] if e['produktionWeitereBoegen'] else [])
        L.append(f'| {e["key"]} | {e["name"]} | {e["nameSheet"]} | {", ".join(e["themen"])} | {", ".join(e["themenVorschlag"])} | {len(e["groessen"])}{" + offen: " + ", ".join(e["groessenOffen"]) if e["groessenOffen"] else ""} | {", ".join(e["nichtWaehlbar"])} | {", ".join(e["schriften"])} | {"ja" if e["produktion"] else ""} | {"; ".join(hints)} |')
    if differing:
        L += ['', '## Abweichende Doppel (prüfen)', '', '| Bogen | Doppel | von | grün |', '| --- | --- | --- | --- |']
        L += [f'| {x["bogen"]} | {x["key"]} | {x["von"]} | {"ja" if x["gruen"] else "nein"} |' for x in differing]
    if warn_fonts:
        L += ['', '## Schriften ohne Datei im Katalog', ''] + [f'- {f}: {len(ids)} Designs ({", ".join(ids[:12])}{" …" if len(ids) > 12 else ""})' for f, ids in sorted(warn_fonts.items())]
    if offen:
        L += ['', '## Offen', ''] + [f'- {o}' for o in offen]
    (OUT / 'UEBERSICHT.md').write_text('\n'.join(L) + '\n')
    print(f'\n{len(index)} Designs → {OUT}; abweichende Doppel {len(differing)}; Schriften ohne Datei: {", ".join(sorted(warn_fonts)) or "–"}; offen: {len(offen)}')


if __name__ == '__main__':
    main()
