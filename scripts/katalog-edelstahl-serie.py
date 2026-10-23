#!/usr/bin/env python3
"""Edelstahl-Serie 2027 (lokale Werkstatt, Codex 21.10.2026) in die Katalog-Familie `steel-door-signs` übernehmen.

Quelle ist `zeichnungen/edelstahl-schilder-2027/geometrie.json` im Katalog: 81 Zeilen aus der Excel
`Edelstahlschilder_final_CDR_2.xlsx` (Chris) und der Zeichnung `EDELSTAHL_SCHILDER_NEUE_GROESSEN_v2.svg`
(SHA-256 in der Datei). Je Zeile: Form, Maße, Grundpreis, Gewicht, Löcher, Optionen, Quellhinweis.

Regeln (CLAUDE.md des Katalogs: nichts erfinden, Zeichnung ist das Maß, Kennungen stabil):
  * Bestehende Größe (Form + Maße, OV/EL gleichwertig): Grundpreis aus der Excel übernehmen, wenn der
    Quellhinweis keinen „Vorschlag“ nennt; alter Wert kommt in den Bericht. Maße/Löcher/Gewicht werden nur
    gemeldet, nicht verändert (Ausnahme: Höhe 159,9 → 160,0 laut Zeichnung v2, Schlüssel bleibt).
  * Neue Größe in bekannter Form (Rund = Ellipse mit gleicher Breite/Höhe, Formgruppe R): wird angelegt;
    Grundpreis nur, wenn er von Chris oder der Excel stammt – „Vorschlag Claude“ bleibt `null` (offen),
    der Vorschlag steht im Bericht. Befestigungen aus den Optionen und dem Lochabstand der Zeichnung
    (Regel B02-E<rand>-D4 / B02S-… muss in der Familie existieren).
  * Retro 1 (eckig) und Retro 2 (geschwungen) haben freie Konturen; das Familienschema v2 kennt nur
    rect/ellipse/plaque → werden NICHT angelegt, sondern als offen gemeldet (Entscheidung: Schema um
    Konturform erweitern).
  * Größen der Familie ohne Zeile in der Serie bleiben unverändert (gemeldet).

Aufruf:
  python3 -I scripts/katalog-edelstahl-serie.py --katalog <katalog> [--bericht <datei.md>] [--apply]
"""
import argparse, json, re
from pathlib import Path

FORM = {'Rechteckig': 'RE', 'Abgerundete Ecken': 'AB', 'Quadratisch': 'QU', 'Oval': 'OV', 'Rund': 'R',
        'Retro 1 (eckig)': 'RT1', 'Retro 2 (geschwungen)': 'RT2'}
CONTOUR = {'RT1', 'RT2'}


def mm_key(v):
    s = f'{v:g}'
    return s.replace('.', 'P')


def label_cm(w, h):
    return f'{w/10:g} × {h/10:g} cm'.replace('.', ',')  # Katalogkonvention: „12 × 5,25 cm“


def price_source(note):
    # „Preis 15,99 € – Vorschlag Claude …“ = Vorschlag; „Preis 13,99 € (Vorgabe Chris)“ = Chris; sonst Excel-Wert.
    m = re.search(r'Preis[^;]*', note)
    if m and 'Vorschlag' in m.group(0): return 'vorschlag'
    if m and 'Vorgabe Chris' in m.group(0): return 'chris'
    return 'excel'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--katalog', required=True); ap.add_argument('--bericht'); ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    katalog = Path(a.katalog)
    geo_file = katalog / 'zeichnungen' / 'edelstahl-schilder-2027' / 'geometrie.json'
    fam_file = katalog / 'familien' / 'edelstahl' / 'steel-door-signs.json'
    geo = json.loads(geo_file.read_text(encoding='utf-8'))
    fam = json.loads(fam_file.read_text(encoding='utf-8'))
    rules = {r['id']: r for r in fam['mountingRules']}
    by_geom = {}
    for s in fam['sizes']:
        by_geom[(s['groupKey'], float(s['widthMm']), float(s['heightMm']))] = s
    groups = {g['key'] for g in fam['groups']}
    prices, new, open_, skipped, notes, seen = [], [], [], [], [], set()
    for r in geo['rows']:
        gk = FORM[r['form']]; w, h = float(r['widthMm']), float(r['heightMm'])
        hit = None
        for x in (['OV', 'EL'] if gk == 'OV' else [gk]):
            hit = by_geom.get((x, w, h)) or hit
        if hit is None and gk == 'OV' and (w, h) == (300.0, 160.0):
            hit = by_geom.get(('OV', 300.0, 159.9))
            if hit and hit['heightMm'] != 160:
                notes.append(f'{hit["key"]}: Höhe 159,9 → 160 mm laut Zeichnung v2 ({r["drawingExtentMm"][1]:.3f} mm), Schlüssel bleibt')
                if a.apply: hit['heightMm'] = 160
        if hit is not None:
            seen.add(hit['key'])
            src = price_source(r['sourceNote'])
            if hit['baseCents'] != r['baseCents']:
                if src == 'vorschlag':
                    open_.append(f'{hit["key"]}: Familie {hit["baseCents"]} ct, Serie {r["baseCents"]} ct ist nur Vorschlag – unverändert ({r["sourceNote"]})')
                else:
                    prices.append((hit['key'], hit['baseCents'], r['baseCents'], src, r['sourceNote']))
                    if a.apply: hit['baseCents'] = r['baseCents']
            if hit.get('netWeightG') != r.get('weightG') and r.get('weightG') is not None:
                notes.append(f'{hit["key"]}: Gewicht Familie {hit.get("netWeightG")} g, Serie {r["weightG"]} g – unverändert')
            continue
        if gk in CONTOUR:
            skipped.append(f'{r["id"]} ({r["form"]}, {label_cm(w, h)}, {r["baseCents"]} ct, {price_source(r["sourceNote"])}): freie Kontur – Familienschema v2 kennt nur rect/ellipse/plaque')
            continue
        if gk not in groups:
            if gk == 'R':
                fam['groups'].append({'key': 'R', 'name': 'Rund', 'shape': 'ellipse', 'cornerRadiusMm': 0}); groups.add('R')
            else:
                skipped.append(f'{r["id"]}: Formgruppe {gk} fehlt in der Familie'); continue
        holes = r['holes']
        edge = sorted({round(min(x['x'], w - x['x'], x['y'], h - x['y']), 1) for x in holes})
        mounting = []
        for opt in r['options']:
            if opt == 'K00': continue
            if opt in ('KGL', 'KRA'): mounting.append(opt); continue
            if len(edge) != 1: skipped.append(f'{r["id"]}: Lochabstand uneindeutig {edge}'); break
            rid = f'{opt}-E{edge[0]:g}-D{holes[0]["diameter"]:g}'
            if rid not in rules: skipped.append(f'{r["id"]}: Befestigungsregel {rid} fehlt in der Familie'); break
            mounting.append(rid)
        else:
            src = price_source(r['sourceNote'])
            key = f'GR-ES-{gk}-{mm_key(w)}X{mm_key(h)}-T15'
            size = {'key': key, 'groupKey': gk, 'label': label_cm(w, h), 'widthMm': w if w != int(w) else int(w), 'heightMm': h if h != int(h) else int(h),
                    'baseCents': r['baseCents'] if src != 'vorschlag' else None, 'mounting': mounting, 'netWeightG': r['weightG']}
            new.append((key, r['id'], size['baseCents'], src, r['sourceNote']))
            if src == 'vorschlag': open_.append(f'{key}: Grundpreis offen – Serie schlägt {r["baseCents"]} ct vor ({r["sourceNote"]})')
            if a.apply: fam['sizes'].append(size)
    unmatched = [s['key'] for s in fam['sizes'] if s['key'] not in seen and not any(s['key'] == n[0] for n in new)]
    rep = ['# Edelstahl-Serie 2027 → Familie steel-door-signs', '',
           f'Quelle: {geo["sourceExcel"]} (SHA-256 {geo["excelSha256"][:12]}…), Zeichnung {Path(geo["sourceDrawing"]).name} (SHA-256 {geo["drawingSha256"][:12]}…), {geo["rowCount"]} Zeilen.',
           f'**{len(prices)} Grundpreise geändert, {len(new)} Größen neu, {len(skipped)} übersprungen, {len(open_)} offen.** {"Geschrieben." if a.apply else "Dry-run – nichts geschrieben."}', '',
           '## Grundpreise (Excel von Chris, Familie hatte Shop „Variante C“ vom 16.10.2026)', '', '| Größe | alt | neu | Quelle | Hinweis |', '| --- | --- | --- | --- | --- |']
    rep += [f'| {k} | {o/100:.2f} € | {n/100:.2f} € | {s} | {h} |' for k, o, n, s, h in prices]
    rep += ['', '## Neue Größen', '', '| Schlüssel | Serie | Grundpreis | Quelle | Hinweis |', '| --- | --- | --- | --- | --- |']
    rep += [f'| {k} | {i} | {"offen" if c is None else f"{c/100:.2f} €"} | {s} | {h} |' for k, i, c, s, h in new]
    if skipped: rep += ['', '## Übersprungen (Entscheidung nötig)', ''] + [f'- {x}' for x in skipped]
    if open_: rep += ['', '## Offen', ''] + [f'- {x}' for x in open_]
    if notes: rep += ['', '## Hinweise', ''] + [f'- {x}' for x in notes]
    if unmatched: rep += ['', '## Familie ohne Serienzeile (unverändert)', ''] + [f'- {k}' for k in unmatched]
    text = '\n'.join(rep) + '\n'
    if a.bericht: Path(a.bericht).write_text(text, encoding='utf-8')
    print(text if not a.bericht else rep[3])
    if a.apply:
        src = fam.setdefault('source', {})  # erlaubt nur repository/commit/path/sha256/note/shopVariants (validateFamily)
        src['note'] = (src.get('note') or '') + f' · Serie 2027 (23.10.2026): Grundpreise aus der Excel von Chris (21.10.) übernommen, Rund (R) neu; Quelle zeichnungen/edelstahl-schilder-2027/geometrie.json (Excel-SHA {geo["excelSha256"][:12]}…, Zeichnung-SHA {geo["drawingSha256"][:12]}…); Retro 1/2 offen (Kontur im Schema v2 nicht abbildbar). Bericht familien/edelstahl/quellen/edelstahl-serie-2027-abgleich.md'
        fam_file.write_text(json.dumps(fam, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print(f'{fam_file} geschrieben.')


if __name__ == '__main__':
    main()
