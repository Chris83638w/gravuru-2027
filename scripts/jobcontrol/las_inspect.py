#!/usr/bin/env python3
"""Liest Gravograph-LS-Jobdateien (.las, Treiber L-Solution 7.28) und zeigt Kopf und Befehle.

Nur lesen, nichts senden. Grundlage: Analyse der Beispieljobs aus dem Treiberpaket
(docs/plans/JOBCONTROL-GRAVOTECH-ANALYSE-20261019.md). Feldbedeutungen, die nicht durch
mehrere Beispiele belegt sind, stehen als "unbekannt_<offset>" in der Ausgabe.

Aufruf:  python3 -I scripts/jobcontrol/las_inspect.py <datei.las> [--json] [--alle-befehle]
"""
import json
import struct
import sys
from collections import Counter

MARK = b"\xff\xfd"
HEADER_OFFSET = 0x18          # nach "!LA 192;" + 16 Zeichen Name
HEADER_WORDS = 40             # 40 × int32 big-endian

# Belegt durch Vergleich der Beispieljobs (Werte stimmen mit PW/VD/DPI im Befehlsstrom überein).
HEADER_FIELDS = {
    6: "dpi_x",
    7: "dpi_y",
    8: "leistung_prozent",
    9: "geschwindigkeit_prozent",
    10: "platte_breite_einheit",   # Einheit offen (vermutlich 1/1000 Zoll oder 1/100 mm)
    11: "platte_hoehe_einheit",
}

# Befehle mit 16-Bit-Wert; Bedeutung nach Beispielen, Rest "offen".
COMMANDS = {
    "SL": "Start/Slot (offen)",
    "PW": "Leistung %",
    "VD": "Geschwindigkeit % (Raster)",
    "vd": "Geschwindigkeit % (Vektor)",
    "FR": "Frequenz/PPI",
    "AI": "Luftunterstützung an/aus",
    "ZA": "Z-Achse / Fokus",
    "FA": "Fokus-Anpassung (Testjob)",
    "RX": "Rasterposition X (zweiteilig)",
    "RY": "Rasterposition Y (zweiteilig)",
    "RE": "Rasterbereich Anfang/Ende",
    "RS": "Rasterbereich (Variante)",
    "RF": "Raster-Füllung (offen)",
    "R5": "Rasterblock (offen)",
    "TI": "offen",
    "C1": "gepackte Rasterzeile vorwärts",
    "C2": "gepackte Rasterzeile rückwärts",
    "DP": "Vektor-DPI",
    "PU": "Laser aus, fahren (Pen Up)",
    "PD": "Laser an, gravieren (Pen Down)",
    "BX": "Vektor X (offen)",
    "BY": "Vektor Y (offen)",
    "V2": "offen",
    "OP": "offen",
    "TE": "Testende/Teil-Ende (offen)",
    "JF": "Jobende",
}
DATA_COMMANDS = {"C1", "C2"}   # danach: 16-Bit-Länge + Daten


def parse(data: bytes):
    semi = data.index(b";")
    name_end = data.index(b"\x00", semi)
    title = data[:name_end].decode("latin1")
    if not title.startswith("!LA "):
        raise ValueError("Keine L-Solution-Jobdatei (Kopf '!LA' fehlt).")
    words = struct.unpack(">" + "i" * HEADER_WORDS, data[HEADER_OFFSET:HEADER_OFFSET + 4 * HEADER_WORDS])
    header = {HEADER_FIELDS.get(i, f"unbekannt_{i}"): v for i, v in enumerate(words)}
    commands, counts = [], Counter()
    i = data.find(MARK, HEADER_OFFSET + 4 * HEADER_WORDS)
    while 0 <= i < len(data) - 5:
        op = data[i + 2:i + 4].decode("latin1", "replace")
        value = struct.unpack(">H", data[i + 4:i + 6])[0]
        counts[op] += 1
        if op in DATA_COMMANDS:
            # Länge = Anzahl 16-Bit-Wörter gepackter Rasterdaten (an den Beispielen geprüft).
            i = data.find(MARK, i + 6 + 2 * value)
            continue
        commands.append({"offset": i, "befehl": op, "wert": value, "bedeutung": COMMANDS.get(op, "unbekannt")})
        i = data.find(MARK, i + 6)
    return {
        "titel": title,
        "version": title.split(";")[0][4:].strip(),
        "jobname": title.split(";", 1)[1].strip(),
        "bytes": len(data),
        "kopf": header,
        "befehle_anzahl": dict(counts),
        "befehle": commands,
        "unbekannte_befehle": sorted(op for op in counts if op not in COMMANDS),
    }


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    result = parse(open(argv[1], "rb").read())
    if "--alle-befehle" not in argv:
        result["befehle"] = result["befehle"][:30]
    if "--json" in argv:
        print(json.dumps(result, ensure_ascii=False, indent=1))
        return 0
    k = result["kopf"]
    print(f"{result['jobname']}  (LA {result['version']}, {result['bytes']} Bytes)")
    print(f"  dpi {k['dpi_x']}×{k['dpi_y']}  Leistung {k['leistung_prozent']} %  Geschwindigkeit {k['geschwindigkeit_prozent']} %  Platte {k['platte_breite_einheit']}×{k['platte_hoehe_einheit']}")
    print("  Befehle:", ", ".join(f"{op} {n}" for op, n in result["befehle_anzahl"].items()))
    for c in result["befehle"]:
        print(f"    {c['offset']:#08x}  {c['befehl']:2s} = {c['wert']:<6d} {c['bedeutung']}")
    if result["unbekannte_befehle"]:
        print("  Unbekannt:", result["unbekannte_befehle"])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
