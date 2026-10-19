#!/usr/bin/env python3
"""Extrahiert den VBA-Quellcode aus einer CorelDRAW-Makrodatei (.gms).

Eine .gms-Datei ist ein OLE-Container (wie .xls/.doc) mit 18 Byte Corel-Header
davor. Darin liegt ein normales VBA-Projekt unter
``apc/The VBA Project/_VBA_Project``. Dieses Skript

1. schneidet den GMS-Header ab,
2. dekomprimiert alle Module (MS-OVBA) per oletools,
3. sortiert nach Typ (module/class/form/document) laut PROJECT-Stream,
4. setzt bei Formularen den textuellen VBFrame-Kopf davor (Caption, Größe),
5. schwärzt Klartext-Passwörter (``password = "..."``),
6. schreibt ``MANIFEST.json`` (Dateien, Zeilen, SHA-256 der Quelle).

Aufruf:
    python3 -I extract-gms.py "<Pfad>/Tools 52.5.2.gms" <Zielordner>

Benötigt: ``pip install oletools`` (bringt olefile mit). Nur lesend auf die
Quelle; der Zielordner wird überschrieben (bestehende src/ wird geleert).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
from datetime import date

import olefile
from oletools.olevba import _extract_vba

OLE_MAGIC = bytes.fromhex("D0CF11E0A1B11AE1")
VBA_ROOT = "apc/The VBA Project/_VBA_Project"
EXT = {"Module": ".bas", "Class": ".cls", "BaseClass": ".frm", "Document": ".cls"}
SUBDIR = {"Module": "module", "Class": "class", "BaseClass": "form", "Document": "document"}
# Nur nicht-leere Klartextwerte; leere Zuweisungen wie `.OpenPassword = ""` sind kein Geheimnis.
REDACT = re.compile(r'(password\s*=\s*)"[^"]+"', re.IGNORECASE)
REDACT_TEXT = r'\1"<ENTFERNT – Zugangsdaten nicht im Repository>"'


def main(gms_path: str, out_dir: str) -> int:
    raw = open(gms_path, "rb").read()
    pos = raw.find(OLE_MAGIC)
    if pos < 0:
        print("Kein OLE-Container in der Datei gefunden.", file=sys.stderr)
        return 2
    ole = olefile.OleFileIO(raw[pos:])

    project = ole.openstream(f"{VBA_ROOT}/PROJECT").read().decode("latin-1")
    types: dict[str, str] = {}
    for line in project.splitlines():
        m = re.match(r"(Module|Class|BaseClass|Document)=(.+)", line.strip())
        if m:
            types[m.group(2).split("/")[0]] = m.group(1)

    frames = {e[-2].lower(): e for e in ole.listdir(streams=True) if e[-1] == "\x03VBFrame"}

    src = os.path.join(out_dir, "src")
    if os.path.isdir(src):
        shutil.rmtree(src)
    files = []
    redactions = 0
    for stream_path, vba_filename, vba_code in _extract_vba(
        ole, VBA_ROOT + "/", f"{VBA_ROOT}/PROJECT", f"{VBA_ROOT}/VBA/dir", relaxed=True
    ):
        if vba_code is None:
            continue
        name = vba_filename.rsplit(".", 1)[0] if vba_filename else stream_path.rsplit("/", 1)[-1]
        kind = types.get(name, "Module")
        code = vba_code if isinstance(vba_code, str) else vba_code.decode("cp1252", "replace")
        code = code.replace("\r\n", "\n")
        if kind == "BaseClass" and name.lower() in frames:
            hdr = ole.openstream(frames[name.lower()]).read().decode("cp1252", "replace")
            code = hdr.replace("\r\n", "\n").rstrip("\n") + "\n" + code
        code, n = REDACT.subn(REDACT_TEXT, code)
        redactions += n
        rel = os.path.join("src", SUBDIR[kind], name + EXT[kind])
        dest = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(code)
        files.append({"path": rel.replace(os.sep, "/"), "type": kind, "lines": code.count("\n")})

    with open(os.path.join(out_dir, "PROJECT.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(project.replace("\r\n", "\n"))

    manifest = {
        "quelle": os.path.basename(gms_path),
        "quelle_sha256": hashlib.sha256(raw).hexdigest(),
        "quelle_bytes": len(raw),
        "extrahiert_am": date.today().isoformat(),
        "module": len(files),
        "zeilen": sum(f["lines"] for f in files),
        "geschwaerzte_passwoerter": redactions,
        "dateien": sorted(files, key=lambda f: f["path"]),
    }
    with open(os.path.join(out_dir, "MANIFEST.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"{len(files)} Module, {manifest['zeilen']} Zeilen, {redactions} Passwörter geschwärzt -> {out_dir}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    sys.exit(main(sys.argv[1], sys.argv[2]))
