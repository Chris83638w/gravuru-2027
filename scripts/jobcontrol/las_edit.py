#!/usr/bin/env python3
"""Ändert Leistung/Geschwindigkeit je Farbblock in einer L-Solution-Jobdatei (.las) – als neue Datei.

Sendet nichts, überschreibt nie die Eingabe. Raster- und Vektordaten bleiben Byte für Byte
gleich; geändert werden nur die 16-Bit-Werte von PW (Leistung %), VD (Geschwindigkeit ganze %)
und vd (Geschwindigkeit Zehntel-%) des gewählten Blocks, bei Block 1 zusätzlich die
Kopffelder 8, 9 und Wort 40. Blöcke mit Leistung oder Geschwindigkeit 0 werden nicht
verändert: die Maschine graviert sie mit eigener Vorgabe (Stand J1, 19.10.2026).

Aufruf:
  python3 -I scripts/jobcontrol/las_edit.py <ein.las> --bloecke
  python3 -I scripts/jobcontrol/las_edit.py <ein.las> <aus.las> --block 1 --leistung 80 --geschwindigkeit 12.5
"""
import argparse
import os
import struct
import sys

MARK = b"\xff\xfd"
PARAMS = {"DP", "PW", "VD", "vd", "AI", "FR", "SL"}
RASTER = {"RX", "RY", "C1", "C2", "R5", "RE", "RS", "RF"}
VECTOR = {"PD", "BX", "BY"}
DATA = {"C1", "C2"}


def header_base(data):
    start = data.find(b"!LA ", 0, 32)
    if start < 0:
        raise ValueError("Keine L-Solution-Jobdatei (Kopf '!LA' fehlt).")
    return start + 0x18, start > 0


def commands(data, base):
    i = data.find(MARK, base + 160)
    while 0 <= i < len(data) - 5:
        op = data[i + 2:i + 4].decode("latin1", "replace")
        value = struct.unpack(">H", data[i + 4:i + 6])[0]
        yield i, op, value
        i = data.find(MARK, i + 6 + (2 * value if op in DATA else 0))


def blocks(data):
    """Farbblöcke: zusammenhängende Parameterbefehle mit PW, Art nach dem folgenden Datenbefehl."""
    base, _ = header_base(data)
    result, current = [], None
    for offset, op, value in commands(data, base):
        if op in PARAMS:
            if current is None or current.get("art"):
                current = {"param": {}, "art": None}
                result.append(current)
            current["param"].setdefault(op, []).append((offset, value))
        elif current is not None and current["art"] is None:
            if op in RASTER:
                current["art"] = "Raster"
            elif op in VECTOR:
                current["art"] = "Vektor"
    out = []
    for b in result:
        if "PW" not in b["param"]:
            continue
        val = lambda k: b["param"][k][-1][1] if k in b["param"] else None
        out.append({"nummer": len(out) + 1, "art": b["art"] or "leer", "leistung": val("PW"),
                    "geschwindigkeit": (val("vd") / 10) if val("vd") is not None else val("VD"),
                    "dpi": val("DP"), "frequenz": val("FR"), "param": b["param"]})
    return out


def edit(data, nummer, leistung=None, geschwindigkeit=None):
    if leistung is not None and not 1 <= leistung <= 100:
        raise ValueError("Leistung muss zwischen 1 und 100 % liegen.")
    if geschwindigkeit is not None and not 0.1 <= geschwindigkeit <= 100:
        raise ValueError("Geschwindigkeit muss zwischen 0,1 und 100 % liegen.")
    found = blocks(data)
    if not 1 <= nummer <= len(found):
        raise ValueError(f"Block {nummer} gibt es nicht (Datei hat {len(found)}).")
    b = found[nummer - 1]
    if not b["leistung"] or not b["geschwindigkeit"]:
        raise ValueError(f"Block {nummer} steht auf 0 – die Maschine graviert ihn mit eigener Vorgabe. "
                         "Erst klären (J2), solange wird er nicht verändert.")
    out, changes = bytearray(data), []

    def put16(key, value):
        for offset, old in b["param"].get(key, []):
            struct.pack_into(">H", out, offset + 4, value)
            changes.append((offset + 4, key, old, value))

    if leistung is not None:
        put16("PW", leistung)
    if geschwindigkeit is not None:
        put16("VD", int(geschwindigkeit))
        put16("vd", round(geschwindigkeit * 10))
    base, _ = header_base(data)
    if nummer == 1:
        def put32(offset, key, value):
            old = struct.unpack_from(">i", out, offset)[0]
            struct.pack_into(">i", out, offset, value)
            changes.append((offset, key, old, value))
        if leistung is not None and struct.unpack_from(">i", data, base + 32)[0] == b["leistung"]:
            put32(base + 32, "Kopf Leistung", leistung)
        if geschwindigkeit is not None and struct.unpack_from(">i", data, base + 36)[0] == int(b["geschwindigkeit"]):
            put32(base + 36, "Kopf Geschwindigkeit", int(geschwindigkeit))
            if struct.unpack_from(">i", data, base + 160)[0] == round(b["geschwindigkeit"] * 10):
                put32(base + 160, "Kopf Geschwindigkeit Zehntel", round(geschwindigkeit * 10))
    return bytes(out), changes


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ein")
    ap.add_argument("aus", nargs="?")
    ap.add_argument("--bloecke", action="store_true")
    ap.add_argument("--block", type=int)
    ap.add_argument("--leistung", type=int)
    ap.add_argument("--geschwindigkeit", type=float)
    a = ap.parse_args(argv[1:])
    data = open(a.ein, "rb").read()
    if a.bloecke or not a.aus:
        for b in blocks(data):
            print(f"Block {b['nummer']}: {b['art']:6s} Leistung {b['leistung']} %  Geschwindigkeit {b['geschwindigkeit']:g} %  dpi {b['dpi']}  Frequenz {b['frequenz']}")
        return 0
    if os.path.abspath(a.ein) == os.path.abspath(a.aus) or os.path.exists(a.aus):
        print("Ausgabedatei existiert schon oder ist die Eingabe – bitte neuen Namen wählen.", file=sys.stderr)
        return 1
    if a.block is None or (a.leistung is None and a.geschwindigkeit is None):
        print("--block und mindestens --leistung oder --geschwindigkeit angeben.", file=sys.stderr)
        return 2
    try:
        out, changes = edit(data, a.block, a.leistung, a.geschwindigkeit)
    except ValueError as e:
        print(e, file=sys.stderr)
        return 1
    open(a.aus, "wb").write(out)
    for offset, key, old, new in changes:
        print(f"  {offset:#08x}  {key}: {old} → {new}")
    diff = sum(1 for x, y in zip(data, out) if x != y)
    print(f"{len(changes)} Werte geändert, {diff} Bytes verschieden, Länge gleich ({len(out)} Bytes). Nichts gesendet.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
