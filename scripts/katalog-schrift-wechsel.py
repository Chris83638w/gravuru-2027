#!/usr/bin/env python3
"""Schriftentscheidungen von Chris auf Lieferform-2-Designs anwenden (design.json + design.svg, Protokoll).

Drei Aktionen, je Design-Reihe `designs/<reihe>/<id>/`:
  --zurueck ALT=NEU   Ersatz rückgängig: Texte mit `fontOriginal: ALT` bekommen wieder `font: NEU` (Name laut
                      schriften.json) und ihre Originalgröße (`sizePtOriginal`); SVG font-family/font-size folgen.
                      Beispiel: MINIMALIST=Minimalist (Datei liegt jetzt im Katalog, Ersatz Montserrat Light entfällt).
  --ersatz ALT=NEU    Schrift ohne Datei durch eine Katalogschrift ersetzen, wie read-bestand-designs.py: Breite der
                      Originalzeile (Textkasten des Bestands × Übertragungsfaktor) hält die Zeile gleich breit
                      (Faktor 0,5–3, unter 3 % Abweichung unverändert). `fontOriginal`/`sizePtOriginal` bleiben erhalten.
                      Beispiel: "Comic Sans MS=Comic Neue".
  --ausblenden A,B    Designs, die eine dieser Schriften verwenden, bekommen `hidden: true` (Grund in `hiddenReason`),
                      bleiben aber im Katalog. Beispiel: ParmaPetit,Welcome (Chris: „raus“).

Warnung „Schrift ohne Datei im Katalog: X“ wird je Design neu berechnet. Jede Änderung steht in
`designs/<reihe>/_aenderungen.jsonl` (actor „katalog-schrift-wechsel.py“). Dry-run ohne --apply.

  python3 -I scripts/katalog-schrift-wechsel.py --katalog <katalog> --reihen "edelstahl-gravur-*" \
      --zurueck MINIMALIST=Minimalist --ersatz "Comic Sans MS=Comic Neue" --ausblenden ParmaPetit,Welcome [--apply]
"""
import argparse, importlib.util, json, re, sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('rpd', HERE / 'read-pdf-designs.py')
rpd = importlib.util.module_from_spec(spec); spec.loader.exec_module(rpd)
PT = rpd.PT


def font_files(katalog):
    out = {}
    for f in json.loads((katalog / 'schriften/schriften.json').read_text(encoding='utf-8'))['fonts']:
        if f.get('file') and (katalog / f['file']).exists(): out[f['name']] = katalog / f['file']
    return out


def bestand_box(katalog, design, text):
    """Textkasten des Bestandsdesigns (Breite in mm des Masters) für denselben Text, sonst None."""
    m = re.match(r'(.+?) \(Bestand, (.+?)\)$', design.get('source') or '')
    if not m: return None
    did = m.group(1); base = did.rsplit('-D', 1)[0]
    f = katalog / 'designs/bestand/boegen' / base / did / 'design.json'
    if not f.exists(): return None
    for t in json.loads(f.read_text(encoding='utf-8')).get('texts', []):
        if t.get('text', '').replace('\n', '') == text.replace('\n', '') and t.get('box'): return t['box']
    return None


def svg_set(svg, text_el_index, **attrs):
    """Attribut(e) am n-ten <text>-Element setzen (Reihenfolge wie texts[] in design.json)."""
    i = -1
    def repl(m):
        nonlocal i
        i += 1
        if i != text_el_index: return m.group(0)
        s = m.group(0)
        for k, v in attrs.items():
            if re.search(rf'\s{k}="[^"]*"', s): s = re.sub(rf'(\s{k}=")[^"]*(")', lambda mm: mm.group(1) + str(v) + mm.group(2), s)
            else: s = s[:-1] + f' {k}="{v}">'
        return s
    return re.sub(r'<text\b[^>]*>', repl, svg)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--katalog', required=True); ap.add_argument('--reihen', default='*')
    ap.add_argument('--zurueck', action='append', default=[]); ap.add_argument('--ersatz', action='append', default=[])
    ap.add_argument('--ausblenden', default=''); ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    katalog = Path(a.katalog).resolve(); files = font_files(katalog)
    back = dict(x.split('=', 1) for x in a.zurueck); repl = dict(x.split('=', 1) for x in a.ersatz)
    hide = [x.strip() for x in a.ausblenden.split(',') if x.strip()]
    for new in list(back.values()) + list(repl.values()):
        if new not in files: sys.exit(f'Schrift „{new}“ hat keine Datei im Katalog (schriften.json) – Abbruch.')
    now = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
    totals = {'zurueck': 0, 'ersatz': 0, 'ausgeblendet': 0, 'designs': 0}
    for jf in sorted(katalog.glob(f'designs/{a.reihen}/*/design.json')):
        reihe = jf.parent.parent.name
        if reihe.startswith('_') or reihe == 'bestand': continue
        d = json.loads(jf.read_text(encoding='utf-8')); svgf = jf.parent / 'design.svg'
        svg = svgf.read_text(encoding='utf-8') if svgf.exists() else None
        changes = []
        for i, t in enumerate(d.get('texts', [])):
            fo = t.get('fontOriginal')
            if fo in back:
                new = back[fo]; size = t.get('sizePtOriginal', t['sizePt'])
                changes.append({'text': i, 'font': {'from': t['font'], 'to': new}, 'sizePt': {'from': t['sizePt'], 'to': size}, 'grund': 'Ersatz zurückgenommen'})
                t['font'] = new; t['sizePt'] = size; t.pop('fontOriginal', None); t.pop('sizePtOriginal', None)
                if svg: svg = svg_set(svg, i, **{'font-family': new, 'font-size': round(size * PT, 2)})
                totals['zurueck'] += 1
            elif t.get('font') in repl:
                old = t['font']; new = repl[old]; lines = t['text'].split('\n'); widest = max(lines, key=len)
                s = (d.get('transfer') or {}).get('scale', 1.0); box = bestand_box(katalog, d, t['text'])
                size_mm = t['sizePt'] * PT; k = 1.0
                if box:
                    w = max(rpd.advance_width(files[new], l, size_mm / PT) for l in lines)
                    k = max(0.5, min(3.0, box[2] * s / w)) if w > 0 else 1.0
                ch = {'text': i, 'font': {'from': old, 'to': new}, 'grund': 'Ersatz (Entscheidung Chris)'}
                t['fontOriginal'] = old; t['font'] = new
                if abs(k - 1) >= 0.03:
                    ch['sizePt'] = {'from': t['sizePt'], 'to': round(t['sizePt'] * k, 2)}; t['sizePtOriginal'] = t['sizePt']; t['sizePt'] = round(t['sizePt'] * k, 2)
                if not box: ch['hinweis'] = 'kein Bestands-Textkasten – Größe unverändert'
                changes.append(ch)
                if svg: svg = svg_set(svg, i, **{'font-family': new, 'font-size': round(t['sizePt'] * PT, 2)})
                totals['ersatz'] += 1
        used = sorted({t['font'] for t in d.get('texts', [])})
        if changes:
            d['fonts'] = used
            d['fontsOriginal'] = sorted({t['fontOriginal'] for t in d.get('texts', []) if t.get('fontOriginal')})
        if hide and any(f in hide for f in used) and not d.get('hidden'):
            d['hidden'] = True; d['hiddenReason'] = 'Schrift ohne Lizenz/Datei: ' + ', '.join(f for f in used if f in hide) + ' (Chris 23.10.2026: raus)'
            changes.append({'hidden': {'from': False, 'to': True}, 'grund': d['hiddenReason']}); totals['ausgeblendet'] += 1
        if changes:
            warn = [w for w in d.get('warnings', []) if not w.startswith('Schrift ohne Datei im Katalog')]
            warn += [f'Schrift ohne Datei im Katalog: {f}' for f in used if f not in files]
            d['warnings'] = warn; totals['designs'] += 1
            print(f'{reihe}/{d["id"]}: ' + '; '.join(json.dumps(c, ensure_ascii=False) for c in changes))
            if a.apply:
                jf.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
                if svg is not None: svgf.write_text(svg, encoding='utf-8')
                with (katalog / 'designs' / reihe / '_aenderungen.jsonl').open('a', encoding='utf-8') as p:
                    p.write(json.dumps({'at': now, 'actor': 'katalog-schrift-wechsel.py', 'reihe': reihe, 'designId': d['id'], 'changes': changes, 'files': ['design.json', 'design.svg']}, ensure_ascii=False) + '\n')
    print(f'{totals["designs"]} Designs: {totals["zurueck"]} Texte zurück, {totals["ersatz"]} Texte ersetzt, {totals["ausgeblendet"]} ausgeblendet. {"Geschrieben." if a.apply else "Dry-run."}')


if __name__ == '__main__':
    main()
