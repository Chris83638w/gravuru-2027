#!/usr/bin/env python3
"""Liest gespeicherte Treiber-Einstellungen des Gravograph-Treibers L-Solution (.job, 1308 Bytes).

Eine .job-Datei ist KEIN Gravurauftrag, sondern der gespeicherte Parametersatz der
Treiberoberfläche (Farbtabelle, Arbeitsfläche, Name). Grundlage: Test_JOB19102026.job von
Chris' Laptop, abgeglichen mit dem Screenshot der Druckeinstellungen (19.10.2026).
Felder, die nur an diesem einen Beispiel gedeutet sind, tragen "vermutet" im Namen.

Aufruf:  python3 -I scripts/jobcontrol/job_inspect.py <datei.job> [--json]
"""
import json
import struct
import sys

SIZE = 1308
COLOR_OFFSET, COLOR_STRIDE, COLORS = 0x58, 0x14, 8
FREQ_OFFSET, FREQ_STRIDE = 0x124, 0x1C
MODES = {0: "Überspringen", 1: "Raster", 2: "Vektor"}
COLOR_NAMES = ["Farbe 1 (Schwarz)", "Farbe 2 (Rot)", "Farbe 3", "Farbe 4", "Farbe 5", "Farbe 6", "Farbe 7", "Farbe 8"]


def parse(data: bytes):
    if len(data) != SIZE:
        raise ValueError(f"Unerwartete Größe {len(data)} Bytes (bekannt: {SIZE}).")
    u16 = lambda o: struct.unpack_from("<H", data, o)[0]
    u32 = lambda o: struct.unpack_from("<I", data, o)[0]
    name_end = data.index(b"\x00", 0xF8)
    colors = []
    for n in range(COLORS):
        o = COLOR_OFFSET + n * COLOR_STRIDE
        colors.append({
            "farbe": COLOR_NAMES[n],
            "leistung_prozent": u16(o),
            "geschwindigkeit_prozent": u16(o + 2) / 10,
            "durchgaenge": u16(o + 4),
            "z_mm_vermutet": struct.unpack_from("<f", data, o + 8)[0],
            "unbekannt_0c": u16(o + 0x0C),
            "modus": MODES.get(u16(o + 0x0E), f"unbekannt {u16(o + 0x0E)}"),
            "frequenz_vermutet": u16(FREQ_OFFSET + n * FREQ_STRIDE),
        })
    return {
        "kennung": u16(0x00),
        "name": data[0xF8:name_end].decode("latin1"),
        "platte_breite_mm": u32(0x08) / 1000,
        "platte_hoehe_mm": u32(0x0C) / 1000,
        "prozent_feld_vermutet": u16(0x120),
        "offen": {"0x28": u16(0x28), "0x2a": u16(0x2A), "0x3e": u16(0x3E), "0x48": u16(0x48),
                  "0x10a": u16(0x10A), "0x10c": u16(0x10C), "0x11a": u16(0x11A), "0x204": u16(0x204)},
        "farben": colors,
    }


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    r = parse(open(argv[1], "rb").read())
    if "--json" in argv:
        print(json.dumps(r, ensure_ascii=False, indent=1))
        return 0
    print(f"{r['name']}  Platte {r['platte_breite_mm']:g} × {r['platte_hoehe_mm']:g} mm")
    for c in r["farben"]:
        print(f"  {c['farbe']:18s} {c['leistung_prozent']:3d} % | {c['geschwindigkeit_prozent']:4.1f} % | {c['durchgaenge']} | {c['z_mm_vermutet']:.2f} | {c['modus']}  (Frequenz? {c['frequenz_vermutet']})")
    print("  offen:", r["offen"])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
