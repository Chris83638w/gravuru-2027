"""Read-only source audit for Issue 76. Never changes original designs."""
import argparse
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

ap = argparse.ArgumentParser()
ap.add_argument('--katalog', required=True)
ap.add_argument('--out', required=True)
a = ap.parse_args()
root, out = Path(a.katalog), Path(a.out)
out.mkdir(parents=True, exist_ok=True)
catalog = json.loads((root/'schriften/schriften.json').read_text(encoding='utf-8'))
fonts = {f['name']: f for f in catalog['fonts']}
replacements = {'Champagne & Limousines': 'Montserrat Light'}
duplicates = {41: 19, 42: 20, 56: 52, 57: 53, 58: 54, 59: 55}
dogs = {0, 1, 18, 19, 20, 30, 34, 39, 41, 42, 43, 46, 48, 53, 55, 57, 59}
rows = []
for file in sorted((root/'designs/bestand/kreuze').rglob('design.json')):
    d = json.loads(file.read_text(encoding='utf-8'))
    if d.get('katalog', {}).get('series') != 'KZ-A':
        continue
    no = d['katalog']['designNo']
    plate = d['plate']
    target_shape = ((abs(plate['widthMm']-110)<.2 and abs(plate['heightMm']-198.5)<.2)
                    or (abs(plate['widthMm']-221.6)<.2 and abs(plate['heightMm']-400)<.2))
    scale = min(110/plate['widthMm'], 198.5/plate['heightMm'])
    text_rows = []
    for t in d.get('texts', []):
        name = t['font']
        chosen = replacements.get(name, name)
        f = fonts.get(chosen, {})
        fp = root/f['file'] if f.get('file') else None
        cap = None
        if fp and fp.exists():
            font = TTFont(fp)
            glyphs = font.getGlyphSet()
            glyph = font.getBestCmap().get(ord('H'))
            if glyph:
                pen = BoundsPen(glyphs)
                glyphs[glyph].draw(pen)
                if pen.bounds:
                    cap = round((pen.bounds[3]-pen.bounds[1])/font['head'].unitsPerEm*t['sizePt']*25.4/72*scale, 3)
            font.close()
        text_rows.append({'text': t['text'], 'font': name, 'approvedReplacement': replacements.get(name),
                          'fontFileAvailable': bool(fp and fp.exists()), 'capHeightAtSmallestMm': cap,
                          'below3mm': cap is not None and cap < 3})
    rows.append({'source': file.relative_to(root).as_posix(), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                 'id': d['id'], 'key': d['katalog']['key'], 'designNo': no,
                 'plateMm': [plate['widthMm'], plate['heightMm']], 'orderedContour': target_shape,
                 'dogCandidateRequiresVisualReview': no in dogs,
                 'duplicateOfDesignNo': duplicates.get(no),
                 'hasEditableText': bool(text_rows),
                 'hasPhotoHint': any('Foto-Upload' in t['text'] or 'hier klicken' in t['text'] for t in text_rows),
                 'texts': text_rows})
summary = {'sourceRows': len(rows), 'orderedContourRows': sum(r['orderedContour'] for r in rows),
           'otherContourRows': sum(not r['orderedContour'] for r in rows),
           'rowsWithoutEditableText': sum(not r['hasEditableText'] for r in rows),
           'dogCandidateRows': sum(r['dogCandidateRequiresVisualReview'] for r in rows)}
(out/'quellenpruefung.json').write_text(json.dumps({'summary':summary,'designs':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
dog_rows = [r for r in rows if r['dogCandidateRequiresVisualReview']]
lines = ['# Grabkreuze Hunde – Quellenprüfung', '',
         'Quelle: Issue #76, Auftrag auf Code-main d5bb996; Katalog-main ec48c782. Stand 01.11.2026.', '',
         'Dies ist eine Quellenprüfung, kein fertiger Kontaktbogen und keine Designfreigabe.', '',
         '## Verbindliche Vorgaben', '',
         '- Acryl 5 mm, Schwarz/Anthrazit, Rückseitengravur, keine Fotofelder, kein Zubehör.',
         '- 20 Hundedesigns; zuerst Prüfung dieses Produkts, danach die übrigen elf Produkte.',
         '- 11×20: 1499 ct; 14×25: 2399 ct; 22×40: 2999 ct. Zusatzmotiv 169 ct; ab 2 Stück 6 %, ab 3 Stück 10 %.',
         '- Untere 50 mm unsichtbar und ohne Gravur; Gestaltung mindestens 5 mm oberhalb der Erdlinie.',
         '- Mindestens 3 mm Versalhöhe auf der kleinsten Größe; jedes Design mit Text.', '',
         '## Offene Quellen und Abgleich', '',
         '- 14×25: Originalkontur fehlt im Auftrag und im lokalen Projekt; V: nicht erreichbar.',
         '- Zeichnungsmaße 110×198,5 bzw. 221,6×400 mm weichen von Verkaufsmaßen ab. Keine stillschweigende Verformung.',
         '- Zusammengefasste Bestandsdateien enthalten teilweise andere Kreuzformen. Diese sind keine 1:1-Quelle der bestellten Kontur.',
         '- Clarissa (u. a. Balu D46) fehlt in der freigegebenen Schriftliste. Kein freigegebener Ersatz gefunden.',
         '- Versalhöhen sind aus dem H-Glyph der verfügbaren Schrift gemessen. Bei genehmigtem Ersatz ist dies eine Vorprüfung bei ursprünglicher Punktgröße; kein finaler Layoutnachweis.',
         '- Foto-Hinweise und fehlende editierbare Texte werden separat ausgewiesen. Leere Texte bedeuten nicht automatisch ein leeres sichtbares Design: Text kann in Pfaden vorliegen.', '',
         '## Hundekandidaten (Zuordnung noch visuell zu prüfen)', '',
         '| Quelle | Maß mm | Bestellte Kontur | Dublette | Schrift fehlt | Zeilen unter 3 mm |',
         '|---|---|---|---|---|---|']
for r in dog_rows:
    missing = ', '.join(sorted({t['font'] for t in r['texts'] if not t['fontFileAvailable']})) or '–'
    small = ', '.join(f"{t['text'].splitlines()[0]} ({t['capHeightAtSmallestMm']} mm)" for t in r['texts'] if t['below3mm']) or '–'
    lines.append(f"| {r['id']} | {r['plateMm']} | {'ja' if r['orderedContour'] else 'nein'} | {r['duplicateOfDesignNo'] or '–'} | {missing} | {small} |")
lines += ['', 'Vollständige Zählung und Herkunftsprüfsummen: `quellenpruefung.json`.',
          'Nächster Schritt: Originalkontur 14×25 und Schriftentscheidung für Clarissa beschaffen; verfügbare Originale unter Einhaltung der 3-mm-Regel als native Master aufbereiten.']
(out/'README.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False))
