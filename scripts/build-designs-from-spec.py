#!/usr/bin/env python3
"""Neue Designs aus einer Gestaltungsliste (JSON) als Lieferform 2 erzeugen – so wie Claude am 20.10.2026 die
fünf Andenken-Designs für das Edelstahlschild 9 × 3 cm gestaltet hat, nur als Dateien im Katalog statt direkt
in der Werkstatt. Gedacht für ChatGPT/Kollegen: Gestaltet wird in der Liste (Text, Schrift, Größe, Lage in mm,
Motiv aus der Bibliothek mit Zielbox), das Skript schreibt `design.svg` + `design.json` und prüft alles, was die
Werkstatt später auch prüft.

Aufruf:
  python3 -I scripts/build-designs-from-spec.py --katalog <katalog> --spec <liste.json> [--out <ordner>] [--trocken]

Liste (Beispiel: <katalog>/auftraege/2026-10-21-design-anleitungen/beispiel-edelstahl-90x30.json):
  {
    "reihe": "edelstahl-90x30-andenken",        # Ordner designs/<reihe>/ (eine Formatreihe = ein Seitenverhältnis)
    "plateMm": [90, 30],                         # Master-Maß in mm (kleinste Größe der Reihe, aus der Familie)
    "randMm": 1,                                 # Gestaltungsrand: designArea.marginMm der Familie, mindestens 1
    "schriftSet": "andenken",                    # schriften/sets.json – nur diese Schriften sind erlaubt
    "themes": ["gedenktafeln"], "zielgruppe": "Menschen", "unterkategorie": "Allgemein",
    "designs": [
      {"id": "ES-90x30-A02", "name": "Kreuz · Ruhe in Frieden", "elemente": [
        {"motiv": "kreuze/kreuz-2.svg", "box": [2, 4, 22, 22]},
        {"feld": "spruch", "text": "Ruhe in Frieden", "font": "Lora Italic", "size": 3.8, "x": 53, "y": 8.3, "anchor": "middle"},
        {"feld": "name", "text": "ERIKA MÜLLER", "font": "Cinzel", "size": 6, "x": 53, "y": 17.6, "anchor": "middle"},
        {"feld": "daten", "text": "* 12.03.1941  † 08.09.2025", "font": "Lora", "size": 3.8, "x": 53, "y": 25.3, "anchor": "middle"}
      ]}
    ]
  }

Elemente:
  Text   feld (name, name-2, daten, spruch, zusatz …, je Design eindeutig), text („\\n“ = neue Zeile), font (exakter
         Name aus schriften/schriften.json), size (Schriftgröße in mm, Gravur mindestens 3), x (Ankerpunkt),
         y (Grundlinie der ERSTEN Zeile), anchor start|middle|end. Zeilenabstand ist immer 1,2 × size (wie im
         Konfigurator) – andere Abstände = eigene Textfelder.
  Motiv  motiv (Datei relativ zu motive/, siehe motive/INDEX.md) oder deko (eigene SVG-Datei, bleibt beim Design),
         box [x, y, breite, höhe] in mm – das Motiv wird seitengerecht in die Box eingepasst und mittig gesetzt.
  Foto   foto: true, box [x, y, b, h], form rect|circle, optional musterfoto (Bilddatei, nur Vorschau).

Geprüft wird: Plattenmaß, Rand, Schriften (Datei vorhanden, im Schrift-Set), Mindestgröße, Feldnamen eindeutig,
höchstens 20 Elemente, höchstens 180 Zeichen je Text, Textbreite aus den echten Zeichenbreiten der Schrift.
Mit --trocken wird nur geprüft und nichts geschrieben.
"""
import argparse, importlib.util, json, re, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec_ = importlib.util.spec_from_file_location('read_bestand_designs', HERE / 'read-bestand-designs.py')
rbd = importlib.util.module_from_spec(spec_); spec_.loader.exec_module(rbd)
import xml.etree.ElementTree as ET

SVGNS = '{http://www.w3.org/2000/svg}'
MIN_TEXT_MM = 3.0
MAX_TEXT = 180
FIELD = re.compile(r'^[a-z][a-z0-9]*(-[0-9]+)?$')


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def shape_paths(node, out):
    """Alle Formen einer Motivdatei als absolute Pfade (Koordinaten der Datei)."""
    tag = node.tag.replace(SVGNS, '')
    if tag in ('defs', 'clipPath', 'mask', 'title', 'desc', 'style'): return
    if node.get('transform'): raise SystemExit(f'Motiv mit transform wird nicht unterstützt ({tag}); bitte ein anderes Motiv wählen.')
    a = node.attrib
    if tag == 'path' and a.get('d'): out.append(a['d'])
    elif tag in ('polygon', 'polyline'):
        p = [float(v) for v in re.split(r'[\s,]+', a.get('points', '').strip()) if v]
        if len(p) >= 4: out.append('M' + ' L'.join(f'{p[i]} {p[i+1]}' for i in range(0, len(p) - 1, 2)) + (' Z' if tag == 'polygon' else ''))
    elif tag == 'rect':
        x, y, w, h = (float(a.get(k, 0)) for k in ('x', 'y', 'width', 'height'))
        out.append(f'M{x} {y} H{x + w} V{y + h} H{x} Z')
    elif tag in ('circle', 'ellipse'):
        cx, cy = float(a.get('cx', 0)), float(a.get('cy', 0))
        rx = float(a.get('r', a.get('rx', 0))); ry = float(a.get('r', a.get('ry', 0)))
        out.append(f'M{cx - rx} {cy} A{rx} {ry} 0 1 0 {cx + rx} {cy} A{rx} {ry} 0 1 0 {cx - rx} {cy} Z')
    for c in node: shape_paths(c, out)


def place_motif(file, box):
    root = ET.parse(file).getroot(); paths = []
    for c in root: shape_paths(c, paths)
    if not paths: raise SystemExit(f'{file}: keine Vektorformen gefunden.')
    boxes = [rbd.path_box(d) for d in paths]; boxes = [b for b in boxes if b]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[0] + b[2] for b in boxes); y1 = max(b[1] + b[3] for b in boxes)
    bx, by, bw, bh = box; s = min(bw / (x1 - x0), bh / (y1 - y0))
    ox = bx + (bw - (x1 - x0) * s) / 2 - x0 * s; oy = by + (bh - (y1 - y0) * s) / 2 - y0 * s
    rule = root.get('fill-rule') or ('evenodd' if 'evenodd' in file.read_text() else None)
    return [rbd.transform_path(d, s, ox, oy) for d in paths], [round(bx + (bw - (x1 - x0) * s) / 2, 2), round(by + (bh - (y1 - y0) * s) / 2, 2), round((x1 - x0) * s, 2), round((y1 - y0) * s, 2)], rule


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--katalog', required=True); ap.add_argument('--spec', required=True)
    ap.add_argument('--out'); ap.add_argument('--trocken', action='store_true')
    a = ap.parse_args(); K = Path(a.katalog); S = json.loads(Path(a.spec).read_text())
    W, H = S['plateMm']; rand = max(float(S.get('randMm', 1)), 1.0)
    files = rbd.font_files(K)
    sj = json.loads((K / 'schriften/sets.json').read_text()) if (K / 'schriften/sets.json').exists() else {}
    sets = {s['id']: s['fonts'] for s in sj.get('sets', [])}
    if S.get('schriftSet') and S['schriftSet'] not in sets: sys.exit(f'Schrift-Set „{S["schriftSet"]}“ gibt es nicht (schriften/sets.json).')
    allowed = set(sets.get(S.get('schriftSet'), [])) | set(sj.get('always', [])) if S.get('schriftSet') else None
    out_root = Path(a.out) if a.out else K / 'designs' / S['reihe']
    problems = 0
    for d in S['designs']:
        did, errs, warns, layers, fields, fonts, motifs = d['id'], [], [], [], set(), set(), []
        if not re.match(r'^[A-Za-z0-9][A-Za-z0-9_.,:-]{0,119}$', did): errs.append('ungültige Design-Kennung')
        if len(d['elemente']) > 20: errs.append(f'{len(d["elemente"])} Elemente (höchstens 20)')
        nt = nm = nf = 0
        for e in d['elemente']:
            if 'text' in e:
                nt += 1; lines = str(e['text']).split('\n'); size = float(e['size']); font = e['font']; f = e.get('feld')
                if not f or not FIELD.match(f) or f in fields: errs.append(f'Feldname „{f}“ fehlt, ungültig oder doppelt')
                fields.add(f)
                if font not in files: errs.append(f'Schrift „{font}“ hat keine Datei im Katalog'); continue
                if allowed is not None and font not in allowed: errs.append(f'Schrift „{font}“ ist nicht im Schrift-Set „{S["schriftSet"]}“')
                if size < MIN_TEXT_MM: warns.append(f'„{lines[0][:20]}“: {size} mm < {MIN_TEXT_MM} mm (Gravur)')
                if len(e['text']) > MAX_TEXT: errs.append(f'„{lines[0][:20]}…“: mehr als {MAX_TEXT} Zeichen – in zwei Felder teilen')
                w = max(rbd.text_width(files[font], l, size) for l in lines); anchor = e.get('anchor', 'start')
                x0 = {'start': e['x'], 'middle': e['x'] - w / 2, 'end': e['x'] - w}[anchor]
                top = e['y'] - 0.8 * size; bottom = e['y'] + (len(lines) - 1) * 1.2 * size + 0.25 * size
                if x0 < rand or x0 + w > W - rand or top < rand or bottom > H - rand:
                    errs.append(f'„{lines[0][:20]}“ liegt außerhalb des Gestaltungsrands ({x0:.1f}…{x0 + w:.1f} × {top:.1f}…{bottom:.1f} mm, Platte {W} × {H}, Rand {rand})')
                fonts.add(font); nt_id = f'text-{nt}'
                tsp = ''.join(f'<tspan x="{e["x"]}" dy="{0 if i == 0 else round(1.2 * size, 3)}">{esc(l)}</tspan>' for i, l in enumerate(lines))
                layers.append(f'<text id="{nt_id}" data-feld="{f}" x="{e["x"]}" y="{e["y"]}" font-family="{esc(font)}" font-size="{size}" fill="#000000" text-anchor="{anchor}">{tsp}</text>')
            elif 'motiv' in e or 'deko' in e:
                lib = 'motiv' in e; src = (K / 'motive' / e['motiv']) if lib else Path(e['datei'])
                if not src.exists(): errs.append(f'Motivdatei fehlt: {src}'); continue
                paths, b, rule = place_motif(src, e['box'])
                if b[0] < rand or b[1] < rand or b[0] + b[2] > W - rand or b[1] + b[3] > H - rand: errs.append(f'Motiv {src.name} liegt außerhalb des Gestaltungsrands')
                nm += 1; lid = f'motiv-{nm}' if lib else f'deko-{e["deko"]}'
                er = f' fill-rule="{rule}"' if rule else ''
                layers.append(f'<g id="{lid}"' + (f' data-quelle="motive/{e["motiv"]}"' if lib else '') + '>' + ''.join(f'<path d="{p}" fill="#000000"{er}/>' for p in paths) + '</g>')
                motifs.append(f'motive/{e["motiv"]}' if lib else f'eigenes Motiv {e["deko"]}')
            elif e.get('foto'):
                nf += 1; x, y, w, h = e['box']
                if x < rand or y < rand or x + w > W - rand or y + h > H - rand: errs.append('Fotofeld liegt außerhalb des Gestaltungsrands')
                mask = f'<circle cx="{x + w / 2}" cy="{y + h / 2}" r="{min(w, h) / 2}" fill="none"/>' if e.get('form') == 'circle' else f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none"/>'
                img = f'<image x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice" xlink:href="foto-{nf}.png"/>' if e.get('musterfoto') else ''
                layers.append(f'<g id="foto-{nf}" class="foto" data-platzhalter="ja" data-gravur="nein">{mask}{img}</g>')
            else: errs.append(f'unbekanntes Element {e}')
        print(f'{did}: {nt} Texte, {nm} Motive, {nf} Foto' + (f'  ⚠ {"; ".join(warns)}' if warns else '') + (f'  ✗ {"; ".join(errs)}' if errs else '  ✓'))
        if errs: problems += 1; continue
        if a.trocken: continue
        tgt = out_root / did; tgt.mkdir(parents=True, exist_ok=True)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}mm" height="{H}mm">\n'
               f'<rect id="platte" width="{W}" height="{H}" fill="none" stroke="#999" stroke-width="0.2"/>\n' + '\n'.join(layers) + '\n</svg>\n')
        (tgt / 'design.svg').write_text(svg)
        for i, e in enumerate([e for e in d['elemente'] if e.get('foto') and e.get('musterfoto')], 1): shutil.copy(e['musterfoto'], tgt / f'foto-{i}.png')
        meta = {'id': did, 'name': d['name'], 'themes': S.get('themes', []), 'plateMm': [W, H], 'movable': S.get('movable', True),
                'fonts': sorted(fonts), 'motifs': motifs, 'source': S.get('quelle', 'eigener Entwurf'),
                'katalog': {'series': S['reihe'], 'zielgruppe': S.get('zielgruppe'), 'unterkategorie': S.get('unterkategorie'), 'themen': S.get('themes', [])}}
        (tgt / 'design.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
    if problems: sys.exit(f'{problems} Design(s) mit Fehlern – nichts davon geschrieben.')


if __name__ == '__main__':
    main()
