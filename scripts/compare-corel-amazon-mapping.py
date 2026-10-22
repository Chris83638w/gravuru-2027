#!/usr/bin/env python3
"""K15-Abgleich: Corel-Zuordnungen (produktiv) gegen die Mapping-Dateien des Python-Importers.

Nur lesend. Liest Kopien der Corel-Dateien und schreibt einen Abgleich in einen neuen Ordner.

    python3 -I scripts/compare-corel-amazon-mapping.py \
        --asin-csv  "<Kopie von V:\\Amazon\\Amazon-Import ASIN zu Design-CDR.csv>" \
        --aliase    "<Kopie von Y:\\20_Martin\\Corel\\Amazon Import\\Schiften Aliasse.csv>" \
        --katalog   <Pfad zu gravuru-katalog> \
        --mapping   amazon/ \
        --out       docs/reviews/k15-corel-abgleich-<datum>/

Ausgabe:
  corel-asin-index.json   jede ASIN-Zeile der Corel-Tabelle (Abschnitt, Dateipfad, Flags, Folgezeilen '>')
  schrift-abgleich.csv    Corel-Alias -> Zielschrift -> im Katalog ja/nein
  abgleich.json           Kennzahlen (für den Bericht)

Die Corel-CSV ist cp1252 mit CRLF und ';'. Folgezeilen einer ASIN beginnen mit '>'; Abschnittsüberschriften stehen
in Spalte B als 'NAME -----'. Kommentarzeilen beginnen mit ';'. Keine Kunden- oder Bestelldaten.
"""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import re
from pathlib import Path

ASIN_RE = re.compile(r"[A-Z0-9]{10}")


def lese_corel_asin_csv(pfad: Path) -> tuple[list[str], list[dict]]:
    roh = pfad.read_bytes()
    text = roh.decode("cp1252", errors="replace")
    zeilen = [z.split(";") for z in text.replace("\r\n", "\n").split("\n")]
    kopf = [k.strip() for k in zeilen[0]]
    abschnitt = None
    eintraege: list[dict] = []
    for nr, z in enumerate(zeilen[1:], start=2):
        z = z + [""] * (len(kopf) - len(z))
        a = z[0].strip()
        if a == "" and re.search(r"-{5,}", z[1]):
            abschnitt = z[1].split("-")[0].strip()
            continue
        if ASIN_RE.fullmatch(a):
            e = {k: v.strip() for k, v in zip(kopf, z) if v.strip()}
            e.update({"_zeile": nr, "_abschnitt": abschnitt, "_folge": []})
            eintraege.append(e)
        elif a.startswith(">") and eintraege:
            f = {k: v.strip() for k, v in zip(kopf, z) if v.strip()}
            f["_zeile"] = nr
            eintraege[-1]["_folge"].append(f)
    return kopf, eintraege


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--asin-csv", required=True, type=Path)
    ap.add_argument("--aliase", required=True, type=Path)
    ap.add_argument("--katalog", required=True, type=Path)
    ap.add_argument("--mapping", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    a = ap.parse_args()

    kopf, eintraege = lese_corel_asin_csv(a.asin_csv)
    asin_liste = [e["ASIN"] for e in eintraege]
    zaehler = collections.Counter(asin_liste)
    abschnitte = collections.Counter(e["_abschnitt"] for e in eintraege)

    py_asin = json.loads((a.mapping / "asin-mapping.json").read_text(encoding="utf-8"))
    py_alias = json.loads((a.mapping / "font-aliases.json").read_text(encoding="utf-8"))
    katalog = {f["name"] for f in json.loads((a.katalog / "schriften" / "schriften.json").read_text(encoding="utf-8"))["fonts"]}
    katalog_cf = {n.casefold(): n for n in katalog}

    # Schriften
    alias_zeilen = []
    for z in a.aliase.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")[1:]:
        if z.strip():
            amazon, ziel = (x.strip() for x in z.split(";", 1))
            alias_zeilen.append((amazon, ziel, katalog_cf.get(ziel.casefold(), "")))
    ziele = collections.OrderedDict()
    for amazon, ziel, treffer in alias_zeilen:
        ziele.setdefault(ziel, treffer)

    a.out.mkdir(parents=True, exist_ok=True)
    # Eine Zeile je ASIN: klein und gut diffbar. Bei mehrfachen ASINs nutzt Corel nur die erste Zeile
    # (AmazonImportViewManager: erste Fundstelle, dann Exit For) -> Feld "_corel_aktiv".
    gesehen: set[str] = set()
    for e in eintraege:
        e["_corel_aktiv"] = e["ASIN"] not in gesehen
        gesehen.add(e["ASIN"])
    kopfteil = json.dumps({"quelle": a.asin_csv.name, "kopf": kopf}, ensure_ascii=False)[:-1]
    zeilen = ",\n".join(json.dumps(e, ensure_ascii=False) for e in eintraege)
    (a.out / "corel-asin-index.json").write_text(f'{kopfteil}, "eintraege": [\n{zeilen}\n]}}\n', encoding="utf-8")
    with (a.out / "schrift-abgleich.csv").open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["amazon_name", "corel_zielschrift", "katalog_name", "im_katalog", "in_font_aliases_json"])
        for amazon, ziel, treffer in alias_zeilen:
            w.writerow([amazon, ziel, treffer, "ja" if treffer else "nein", "ja" if amazon in py_alias else "nein"])

    kennzahlen = {
        "quellen": {
            p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (a.asin_csv, a.aliase)
        },
        "corel_asin_zeilen": len(asin_liste),
        "corel_asin_eindeutig": len(zaehler),
        "corel_asin_mehrfach": sorted(k for k, v in zaehler.items() if v > 1),
        "corel_asin_mehrfach_widerspruechlich": sorted(
            k for k, v in zaehler.items() if v > 1 and len({
                json.dumps({x: y for x, y in e.items() if not x.startswith("_")}, sort_keys=True)
                for e in eintraege if e["ASIN"] == k
            }) > 1
        ),
        "corel_folgezeilen": sum(len(e["_folge"]) for e in eintraege),
        "corel_abschnitte": dict(abschnitte),
        "corel_spalten_belegt": {
            k: sum(1 for e in eintraege if e.get(k)) for k in kopf if k != "ASIN"
        },
        "python_asins": sorted(py_asin),
        "python_asins_in_corel": sorted(x for x in py_asin if x in zaehler),
        "python_asins_nicht_in_corel": sorted(x for x in py_asin if x not in zaehler),
        "abdeckung_python_von_corel": f"{len(set(py_asin) & set(zaehler))}/{len(zaehler)}",
        "schrift_alias_zeilen": len(alias_zeilen),
        "schrift_zielschriften": len(ziele),
        "schrift_zielschriften_im_katalog": sum(1 for t in ziele.values() if t),
        "schrift_zielschriften_fehlen": [z for z, t in ziele.items() if not t],
        "font_aliases_json_eintraege": len(py_alias),
        "katalog_schriften": len(katalog),
    }
    (a.out / "abgleich.json").write_text(json.dumps(kennzahlen, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in kennzahlen.items() if not isinstance(v, (list, dict))}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
