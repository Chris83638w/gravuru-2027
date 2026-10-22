#!/usr/bin/env python3
"""Erzeugt amazon/design-overlays.corel.json aus Corel-Design-CDRs (nur lesend, Kopien).

Je Design-CDR (`GT-<…>-<B>x<H>-D<n>.cdr`, Ordner `Export` der Produktstruktur auf V:) wird gelesen:
  - Platte  = erste Kontur mit Strichfarbe #ff0000 (rote Schnittlinie),
  - Motiv   = Vereinigung aller schwarz gefüllten Pfade (#000000), exakt über die Bézierkurven,
  - Foto    = gelbe Kontur (#ffff00), nur zur Information.
Daraus entstehen je Design
  - `bbox400`: Lage im Amazon-Konfigurator, berechnet aus der CDR der Konfigurator-Größe
    (`--konfi-groesse`, z. B. 30x20) mit der Corel-Formel: 400er Raster, 10 px Rand, längere Seite = 380 px, Platte mittig,
  - `vorlageMm["<B>x<H>"]`: Lage des Motivs in der Vorlage jeder gelesenen Größe, in mm relativ zur Platte –
    so setzt Corel das Motiv beim Amazon-Import.

Die handgepflegte amazon/design-overlays.json wird nie verändert und hat beim Import Vorrang.

    python3 -I scripts/build-design-overlays-from-corel.py --cdr-ordner <Kopien> --konfi-groesse 30x20 \
        --linie gedenktafeln --out amazon/design-overlays.corel.json

Benötigt `cdr2raw` (Paket libcdr-tools).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import date
from pathlib import Path

IN = 25.4
KONFI_PX, KONFI_RAND_PX = 400.0, 10.0
SCHEMA = 'gravuru-amazon-design-overlays-corel/v1'
DATEI = re.compile(r'^(?P<praefix>[A-Z]+(?:-[A-Z0-9]+)*)-(?P<b>\d+(?:[.,]\d+)?)x(?P<h>\d+(?:[.,]\d+)?)-D(?P<nr>\d+)\.cdr$', re.I)
AKTION = re.compile(r'\(librevenge:path-action: ([MLCQZ])([^()]*)\)')


def _wert(s: str, k: str):
    m = re.search(re.escape(k) + r': (-?[\d.]+)in', s)
    return float(m.group(1)) if m else None


def punkte(zeile: str, schritte: int = 64) -> list[tuple[float, float]]:
    """Punkte eines libcdr-Pfads in Zoll; Kurven werden abgetastet (Bounding-Box der Kurve, nicht der Stützpunkte)."""
    pts, cur, start = [], None, None
    for a, s in AKTION.findall(zeile):
        if a in 'ML':
            cur = (_wert(s, 'svg:x'), _wert(s, 'svg:y'))
            if a == 'M':
                start = cur
            pts.append(cur)
        elif a == 'C' and cur is not None:
            p0, p1, p2 = cur, (_wert(s, 'svg:x1'), _wert(s, 'svg:y1')), (_wert(s, 'svg:x2'), _wert(s, 'svg:y2'))
            p3 = (_wert(s, 'svg:x'), _wert(s, 'svg:y'))
            for i in range(1, schritte + 1):
                t = i / schritte
                u = 1 - t
                pts.append(tuple(u ** 3 * p0[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t ** 3 * p3[j] for j in (0, 1)))
            cur = p3
        elif a == 'Q' and cur is not None:
            p0, p1, p2 = cur, (_wert(s, 'svg:x1'), _wert(s, 'svg:y1')), (_wert(s, 'svg:x'), _wert(s, 'svg:y'))
            for i in range(1, schritte + 1):
                t = i / schritte
                u = 1 - t
                pts.append(tuple(u * u * p0[j] + 2 * u * t * p1[j] + t * t * p2[j] for j in (0, 1)))
            cur = p2
        elif a == 'Z':
            cur = start
    return [p for p in pts if p[0] is not None and p[1] is not None]


def bbox(pts):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return [min(xs), min(ys), max(xs), max(ys)]


def lies_raw(text: str) -> dict:
    """libcdr-Rohtext -> {'platte': [x0,y0,x1,y1] in, 'motiv': [...] | None, 'foto': [...] | None, 'motive': n}."""
    stil, platte, motiv, foto, anzahl = '', None, None, None, 0
    for zeile in text.split('\n'):
        z = zeile.strip()
        if z.startswith('setStyle('):
            stil = z
        elif z.startswith('drawPath'):
            pts = punkte(z)
            if not pts:
                continue
            b = bbox(pts)
            if 'svg:stroke-color: #ff0000' in stil and 'draw:fill: none' in stil and platte is None:
                platte = b
            elif 'draw:fill: solid' in stil and 'draw:fill-color: #000000' in stil:
                anzahl += 1
                motiv = b if motiv is None else [min(motiv[0], b[0]), min(motiv[1], b[1]), max(motiv[2], b[2]), max(motiv[3], b[3])]
            elif 'svg:stroke-color: #ffff00' in stil and foto is None:
                foto = b
    return {'platte': platte, 'motiv': motiv, 'foto': foto, 'motive': anzahl}


def relativ_mm(box, platte):
    return [(box[0] - platte[0]) * IN, (box[1] - platte[1]) * IN, (box[2] - box[0]) * IN, (box[3] - box[1]) * IN]


def corel_bbox400(motiv_mm, breite, hoehe):
    s = (KONFI_PX - 2 * KONFI_RAND_PX) / max(breite, hoehe)
    ox, oy = (KONFI_PX - breite * s) / 2, (KONFI_PX - hoehe * s) / 2
    return [ox + motiv_mm[0] * s, oy + motiv_mm[1] * s, motiv_mm[2] * s, motiv_mm[3] * s]


def r2(v):
    return round(v + 0.0, 2)


def baue(dateien: list[tuple[Path, str]], konfi_groesse: str, linie: str, heute: str) -> tuple[dict, list[str]]:
    """dateien: [(Pfad, libcdr-Rohtext)]. Gibt ({linie: {nr: eintrag}}, Hinweise) zurück."""
    eintraege: dict[str, dict] = {}
    hinweise: list[str] = []
    for pfad, raw in sorted(dateien, key=lambda x: x[0].name):
        m = DATEI.match(pfad.name)
        if not m:
            hinweise.append(f'{pfad.name}: Dateiname passt nicht zum Muster <Präfix>-<B>x<H>-D<n>.cdr – übersprungen')
            continue
        g = lies_raw(raw)
        if g['platte'] is None:
            hinweise.append(f'{pfad.name}: keine rote Plattenkontur – übersprungen')
            continue
        if g['motiv'] is None:
            hinweise.append(f'{pfad.name}: kein schwarz gefülltes Motiv – übersprungen')
            continue
        breite = round((g['platte'][2] - g['platte'][0]) * IN, 1)
        hoehe = round((g['platte'][3] - g['platte'][1]) * IN, 1)
        groesse_name = f'{m["b"]}x{m["h"]}'.replace(',', '.')
        mm = relativ_mm(g['motiv'], g['platte'])
        nr = str(int(m['nr']))
        e = eintraege.setdefault(nr, {})
        quelle = f'berechnet {heute} aus {pfad.name}'
        # Schlüssel = Nennmaß aus dem Dateinamen (cm -> mm), wie die Familie im Importer (widthMm x heightMm).
        nb, nh = float(m['b'].replace(',', '.')) * 10, float(m['h'].replace(',', '.')) * 10
        eintrag = {'boxMm': [r2(v) for v in mm], 'quelle': quelle, 'motive': g['motive']}
        if abs(breite - nb) > 0.5 or abs(hoehe - nh) > 0.5:
            eintrag['platteGemessenMm'] = [breite, hoehe]
            hinweise.append(f'{pfad.name}: Plattenkontur {breite:g} × {hoehe:g} mm statt Nennmaß {nb:g} × {nh:g} mm – Lage relativ zur gemessenen Kontur')
        e.setdefault('vorlageMm', {})[f'{nb:g}x{nh:g}'] = eintrag
        if groesse_name == konfi_groesse:
            e['bbox400'] = [r2(v) for v in corel_bbox400(mm, breite, hoehe)]
            e['quelle'] = quelle
            e['hinweis'] = (f'Konfigurator-Lage aus der {konfi_groesse}-Vorlage mit der Corel-Formel (400er Raster, 10 px Rand, '
                            f'längere Seite = 380 px, Platte mittig); Platte gemessen {breite:g} × {hoehe:g} mm.')
    for nr, e in eintraege.items():
        if 'bbox400' not in e:
            hinweise.append(f'D{nr}: keine {konfi_groesse}-Vorlage gelesen – nur vorlageMm, keine Konfigurator-Lage')
    return {linie: dict(sorted(eintraege.items(), key=lambda kv: int(kv[0])))}, hinweise


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--cdr-ordner', required=True, type=Path, help='Ordner mit Kopien der Design-CDRs (rekursiv)')
    ap.add_argument('--konfi-groesse', required=True, help='Größe, deren Vorlage der Amazon-Konfigurator zeigt, z. B. 30x20')
    ap.add_argument('--linie', required=True)
    ap.add_argument('--out', required=True, type=Path)
    a = ap.parse_args(argv)
    dateien = []
    for p in sorted(a.cdr_ordner.rglob('*.cdr')):
        r = subprocess.run(['cdr2raw', str(p)], capture_output=True, text=True, errors='replace', timeout=120)
        dateien.append((p, r.stdout))
    heute = date.today().isoformat()
    daten, hinweise = baue(dateien, a.konfi_groesse, a.linie, heute)
    dokument = {'_quelle': {'schema': SCHEMA, 'erzeugtAm': heute, 'erzeugtMit': 'scripts/build-design-overlays-from-corel.py',
                            'konfiGroesse': a.konfi_groesse, 'dateien': len(dateien),
                            'hinweis': 'Erzeugt – nicht von Hand ändern. Handgepflegte Einträge in design-overlays.json haben Vorrang.',
                            'uebersprungen': hinweise}}
    dokument.update(daten)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(dokument, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    n = sum(len(v) for k, v in daten.items())
    print(f'{len(dateien)} CDRs, {n} Designs -> {a.out} ({len(hinweise)} Hinweise)')
    for h in hinweise:
        print('  ' + h)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
