#!/usr/bin/env python3
"""Erzeugt amazon/asin-mapping.corel.json aus der produktiven Corel-Zuordnungstabelle (nur lesend).

Führende Quelle bleibt `V:\\Amazon\\Amazon-Import ASIN zu Design-CDR.xlsm` (daraus erzeugt Corel die CSV).
Dieses Skript liest eine **Kopie** der CSV und schreibt eine erzeugte Datei neben die handgepflegte
`amazon/asin-mapping.json`. Die handgepflegte Datei wird nie verändert und hat beim Import Vorrang.

    python3 -I scripts/build-asin-mapping-from-corel.py \
        --asin-csv "<Kopie von V:\\Amazon\\Amazon-Import ASIN zu Design-CDR.csv>" \
        --out amazon/asin-mapping.corel.json

Je ASIN wird nur die Zeile übernommen, die Corel tatsächlich nutzt (erste Fundstelle,
AmazonImportViewManager). Folgezeilen ('>') zählen als weitere Views. Was Corel zur Laufzeit
aus dem Dateisystem ermittelt (Größenordner, Standard-Designname), steht hier nur als Regel,
nicht als fertiger Pfad – das Dateisystem von V: ist beim Import nicht vorhanden.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from datetime import date
from pathlib import Path

HIER = Path(__file__).resolve().parent
SCHEMA = 'gravuru-amazon-corel-mapping/v1'


def _lade_vergleich():
    spec = importlib.util.spec_from_file_location('corel_vergleich', HIER / 'compare-corel-amazon-mapping.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _ja(wert: str | None) -> bool:
    return (wert or '').strip().lower() == 'ja'


def _leer_zu_none(wert: str | None):
    w = (wert or '').strip()
    return w or None


def baue(eintraege: list[dict]) -> dict[str, dict]:
    asins: dict[str, dict] = {}
    for e in eintraege:
        asin = e['ASIN']
        if asin in asins:
            asins[asin]['corelDoppelteZeilen'].append(e['_zeile'])
            continue
        design_nr = _leer_zu_none(e.get('Design-Nummer'))
        asins[asin] = {
            'abschnitt': e.get('_abschnitt'),
            'corelZeile': e['_zeile'],
            'dateipfad': _leer_zu_none(e.get('Dateipfad')),
            'groesseAusOrdner': _ja(e.get('Größe')),
            'designNummer': design_nr,
            'designAuswahlErzwingen': _ja(e.get('Designauswahl verwendung erzwingen')),
            'konfiTyp': _leer_zu_none(e.get('Konfi-Typ')),
            'konfiOptionen': _leer_zu_none(e.get('Konfi-Options-Übersetzungen')),
            'viewSortierung': _leer_zu_none(e.get('View Sortierung')),
            'breiteWieGroessenauswahl': _ja(e.get('Breite wie Größenauswahl')),
            'automatischesGroessenmanagement': _ja(e.get('automatisches Größenmanagement')),
            'aufBreiteSkalieren': _leer_zu_none(e.get('Auf Breite skalieren')),
            'produktbildLaden': _ja(e.get('Produktbild laden')),
            'weitereViews': len(e.get('_folge') or []),
            'corelDoppelteZeilen': [],
        }
    return asins


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--asin-csv', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    a = ap.parse_args(argv)

    vergleich = _lade_vergleich()
    _, eintraege = vergleich.lese_corel_asin_csv(a.asin_csv)
    asins = baue(eintraege)
    dokument = {
        '_quelle': {
            'schema': SCHEMA,
            'datei': a.asin_csv.name,
            'sha256': hashlib.sha256(a.asin_csv.read_bytes()).hexdigest(),
            'erzeugtAm': date.today().isoformat(),
            'erzeugtMit': 'scripts/build-asin-mapping-from-corel.py',
            'hinweis': 'Erzeugt – nicht von Hand ändern. Führende Quelle ist die Corel-xlsm auf V:\\Amazon. '
                       'Handgepflegte Einträge in asin-mapping.json haben Vorrang.',
            'asins': len(asins),
        },
    }
    # Nur belegte Felder schreiben (Standard: False/None/0/[] entfällt) – hält die Datei klein; der Importer liest mit .get().
    kompakt = {k: {f: w for f, w in v.items() if w not in (None, False, 0, [])} for k, v in sorted(asins.items())}
    dokument.update(kompakt)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    zeilen = ',\n'.join(f'{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in dokument.items())
    a.out.write_text('{\n' + zeilen + '\n}\n', encoding='utf-8')
    print(f'{len(asins)} ASINs -> {a.out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
