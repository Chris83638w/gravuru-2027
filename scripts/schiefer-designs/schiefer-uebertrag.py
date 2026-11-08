#!/usr/bin/env python3
"""Schiefer: freigegebene Edelstahl-Türschild-Designs je Unterkategorie auf die Schiefertafeln übertragen.

Chris 04.11.2026: „Deine Aufgabe ist es für alle Größen … Designs anzufertigen … für unterschiedliche Zielgruppen und
Unterkategorien wie z. B. Hausnummern, Andenken, Familienschilder“ – „kannst im Zweifel Designs von Edelstahl auf
Schiefer übertragen“. Register 1.7: ein Design-Pool für alle Materialien.

Je Schiefer-Formatreihe ein Master (gleiches Seitenverhältnis = gleiche Reihe). Quelle: freigegebener Edelstahl-Master
der Reihe mit dem nächsten Seitenverhältnis. Gleiche Schriften, Texte, Motive; neu proportioniert, Gruppe mittig,
Fläche genutzt (§7). Kennung <Form>-SCH-<Master cm>-D<n> (D-Nummer der Quelle).
Aufruf: python3 schiefer-uebertrag.py --katalog <pfad> [--themen a,b] [--max-familie 30] [--bericht out.json]
"""
import argparse, glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from aelib import Fonts, read_design, fmt
from aelayout import plan_layout, write_svg

THEMEN = ['familienschilder', 'hausnummern', 'willkommensschilder', 'andenkenschilder', 'hochzeitsschilder', 'hundeschilder', 'katzenschilder']
CAPS = {'rect': (0.88, 0.80), 'ellipse': (0.80, 0.70)}

# (Reihe, Form, Plattenmaß Master, Ziel-Familie → Größen, Edelstahl-Quellreihe, Kennungsform)
SPECS = [
    ('re-150x100', 'Rechteck', (150, 100), {'schiefer-tafeln-natur': ['GT-SN-RE-150X100', 'GT-SN-RE-300X200'], 'schiefer-tafeln-premium': ['GT-SP-RE-300X200']}, 'edelstahl-gravur-80x53', 'TRE'),
    ('re-220x140', 'Rechteck', (220, 140), {'schiefer-tafeln-natur': ['GT-SN-RE-220X140']}, 'edelstahl-gravur-80x53', 'TRE'),
    ('re-400x300', 'Rechteck', (400, 300), {'schiefer-tafeln-natur': ['GT-SN-RE-400X300'], 'schiefer-tafeln-premium': ['GT-SP-RE-200X150', 'GT-SP-RE-400X300']}, 'edelstahl-gravur-80x53', 'TRE'),
    ('re-300x100', 'Rechteck', (300, 100), {'schiefer-tafeln-natur': ['GT-SN-RE-300X100']}, 'edelstahl-gravur-90x30', 'TRE'),
    ('re-380x130', 'Rechteck', (380, 130), {'schiefer-tafeln-natur': ['GT-SN-RE-380X130']}, 'edelstahl-gravur-90x30', 'TRE'),
    ('re-560x180', 'Rechteck', (560, 180), {'schiefer-tafeln-natur': ['GT-SN-RE-560X180']}, 'edelstahl-gravur-90x30', 'TRE'),
    ('re-400x200', 'Rechteck', (400, 200), {'schiefer-tafeln-natur': ['GT-SN-RE-400X200', 'GT-SN-RE-600X300']}, 'edelstahl-gravur-80x35', 'TRE'),
    ('qu-200x200', 'Quadrat', (200, 200), {'schiefer-tafeln-natur': ['GT-SN-QU-100X100', 'GT-SN-QU-130X130', 'GT-SN-QU-160X160', 'GT-SN-QU-200X200', 'GT-SN-QU-220X220', 'GT-SN-QU-250X250', 'GT-SN-QU-300X300']}, 'edelstahl-gravur-80x80', 'TQ'),
    ('rund-200', 'Rund', (200, 200), {'schiefer-tafeln-natur': ['GT-SN-R-200X200', 'GT-SN-R-220X220', 'GT-SN-R-280X280', 'GT-SN-R-355X355']}, 'edelstahl-gravur-65x65-rund', 'TR'),
    ('re-70x20', 'Rechteck', (70, 20), {'schiefer-tafeln-geschnitten': ['GT-SG-RE-70X20']}, 'edelstahl-gravur-70x23', 'TRE'),
    ('re-80x35', 'Rechteck', (80, 35), {'schiefer-tafeln-geschnitten': ['GT-SG-RE-80X35']}, 'edelstahl-gravur-80x35', 'TRE'),
    ('re-80x50', 'Rechteck', (80, 50), {'schiefer-tafeln-geschnitten': ['GT-SG-RE-80X50']}, 'edelstahl-gravur-80x53', 'TRE'),
]
# kleine Tafeln: Quelle muss für genau diese Edelstahlgröße freigegeben sein (Filigran/Mindestgröße, Register 5.5/5.27)
SRC_SIZE = {'re-70x20': 'GR-ES-RE-70X23P3-T15', 're-80x35': 'GR-ES-RE-80X35-T15', 're-80x50': 'GR-ES-RE-80X53P3-T15'}


def approved(d):
    for t in d.get('ziele') or []:
        if t.get('familie') == 'steel-door-signs' and (t.get('freigabe') or {}).get('status') == 'freigegeben':
            return t['freigabe']
    return None


def cm(v):
    return ('%g' % (v / 10)).replace('.', ',')


def sources(katalog, series, themen, maxn, size_key=None):
    out = {t: [] for t in themen}
    for p in glob.glob(os.path.join(katalog, 'designs', series, '*', 'design.json')):
        d = json.load(open(p, encoding='utf-8'))
        if not approved(d) or not d.get('designNo'):
            continue
        if size_key and size_key not in (d.get('sizes') or []):
            continue
        if d.get('mindestFlaecheCm2'):
            continue  # filigrane Designs (Mindestgröße) nicht auf Schiefer übertragen
        for t in d.get('themes') or []:
            if t in out:
                out[t].append((d['designNo'], p, d))
    sel = {}
    for t, rows in out.items():
        rows.sort(key=lambda r: r[0])
        sel[t] = rows[:maxn.get(t, maxn['*'])]
    return sel


def build(katalog, fonts, spec, src_path, src, out_root):
    reihe, form, (W, H), targets, srcseries, prefix = spec
    D = read_design(src_path.replace('design.json', 'design.svg'), fonts)
    shape = 'ellipse' if form == 'Rund' else 'rect'
    edge = max(1.0, 0.03 * min(W, H)) if shape == 'ellipse' else None
    caps = CAPS[shape]
    # Konfi: Schrift höchstens 100 mm – auch in der größten Zielgröße der Reihe (Design skaliert mit der Platte)
    fmax = max(1.0, max(float(k.split('-')[-1].split('X')[0].replace('P', '.')) for ks in targets.values() for k in ks) / W)
    for _ in range(12):
        tr, m = plan_layout(D, W, H, shape, caps, edge_margin=edge)
        big = max([it.size * tr[it.id][1] for it in D['items'] if hasattr(it, 'font')] or [0]) * fmax
        if big <= 99:
            break
        caps = (caps[0] * 99 / big, caps[1] * 99 / big)
    from build_helpers import grow_small_texts
    tr = grow_small_texts(D, tr, W, H, shape, None, edge)
    svg = write_svg(D, tr, W, H, shape)
    n = src['designNo']
    did = '%s-SCH-%sx%s-D%s' % (prefix, cm(W), cm(H), n)
    series = 'schiefer-tuerschilder-' + reihe
    texts = []
    for it in D['items']:
        if it.kind != 'text' or not hasattr(it, 'font'):
            continue
        sx, sy, tx, ty = tr[it.id]
        texts.append({'feld': it.feld or it.id, 'text': it.text, 'font': it.font, 'color': '#000000',
                      'sizeMm': round(it.size * sy, 3), 'sizePt': round(it.size * sy * 72 / 25.4, 3),
                      'anchorMm': [round(it.x * sx + tx, 3), round(it.y * sy + ty, 3)], 'align': {'start': 'left', 'middle': 'center', 'end': 'right'}[it.anchor],
                      'letterSpacingMm': round(it.ls * sy, 3), 'lineHeightMm': round(it.line_h * sy, 3), **({'rotation': it.rot} if it.rot else {})})
    small = [t['feld'] for t in texts if t['sizeMm'] < 3]
    same_ratio = abs((D['W'] / D['H']) / (W / H) - 1) < 0.01
    fr = approved(src)
    keys = [k for ks in targets.values() for k in ks]
    dj = {
        'id': did, 'designNo': n, 'name': src.get('name'),
        **({'nameSheet': src['nameSheet']} if src.get('nameSheet') else {}),
        'material': 'Schiefer', 'process': 'Gravur', 'form': form,
        'plate': {'widthMm': W, 'heightMm': H, 'source': 'Schiefertafel %s × %s cm (Master der Reihe)' % (cm(W), cm(H))},
        'plateMm': [W, H],
        'mode': '1:1' if same_ratio and abs(m['grow'] - 1) < 0.02 else 'Referenz',
        'source': 'Edelstahl-Design %s (%s, freigegeben %s); gleiche Schriften, Texte, Motive und Aufbau, neu proportioniert auf Schiefer %s × %s mm' % (
            src['id'], srcseries, (fr or {}).get('am', '')[:10], fmt(W), fmt(H)),
        'texts': texts, 'motifs': src.get('motifs', []), 'photos': [], 'fonts': sorted({t['font'] for t in texts}),
        'deviations': ([] if same_ratio else ['Seitenverhältnis %s → %s: Anordnung neu proportioniert, Motiv und Schrift unverzerrt' % (fmt(D['W'] / D['H']), fmt(W / H))])
                      + (['Gruppe mittig gesetzt und auf die Fläche vergrößert (×%s)' % fmt(m['grow'])] if abs(m['grow'] - 1) >= 0.02 else [])
                      + (['Schrift unter 3 mm: ' + ', '.join(small)] if small else []),
        'movable': True, 'themes': src.get('themes', []), 'sizes': keys,
        'ziele': [{'familie': f, 'freigabe': None} for f in targets],
        'masterSheet': {'base': '%s-SCH-%sx%s' % (prefix, cm(W), cm(H)), 'key': did, 'familySize': keys[0], 'plateMm': [W, H]},
        'katalog': {'key': '%s-D%s' % (series, n), 'series': series, 'zielgruppe': 'offen', 'unterkategorie': 'offen', 'themen': src.get('themes', [])},
        'varianteVon': src['id'],
        'transfer': {'from': src['id'], 'scale': round(m['scale'], 4), 'decided': '2026-11-04',
                     'by': 'Schiefer-Claude-Chat (Chris 04.11.: Designs von Edelstahl auf Schiefer übertragen), scripts/schiefer-uebertrag/schiefer-uebertrag.py'},
        'formatreihe': 'Schiefer %s %s × %s' % (form, fmt(W), fmt(H)),
        'flaeche': {k: round(m[k], 3) for k in ('fw', 'fh', 'fa', 'cx', 'cy', 'grow', 'spread', 'vspread')},
    }
    out_dir = os.path.join(out_root, 'designs', series, did)
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, 'design.svg'), 'w', encoding='utf-8').write(svg)
    with open(os.path.join(out_dir, 'design.json'), 'w', encoding='utf-8') as f:
        json.dump(dj, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return did, dj, m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--katalog', required=True)
    ap.add_argument('--themen', default=','.join(THEMEN))
    ap.add_argument('--max-familie', type=int, default=30)
    ap.add_argument('--max', type=int, default=20)
    ap.add_argument('--reihen', default='')
    ap.add_argument('--bericht', default='')
    a = ap.parse_args()
    fonts = Fonts(a.katalog)
    themen = a.themen.split(',')
    maxn = {'*': a.max, 'familienschilder': a.max_familie}
    only = set(a.reihen.split(',')) if a.reihen else None
    rep = []
    for spec in SPECS:
        if only and spec[0] not in only:
            continue
        sel = sources(a.katalog, spec[4], themen, maxn, SRC_SIZE.get(spec[0]))
        done = set()
        for t, rows in sel.items():
            for n, p, d in rows:
                if n in done:
                    continue
                done.add(n)
                try:
                    did, dj, m = build(a.katalog, fonts, spec, p, d, a.katalog)
                    rep.append({'reihe': spec[0], 'id': did, 'thema': t, 'status': 'ok', **dj['flaeche']})
                except Exception as e:
                    rep.append({'reihe': spec[0], 'quelle': d['id'], 'thema': t, 'status': 'Fehler: ' + str(e)[:120]})
    if a.bericht:
        json.dump(rep, open(a.bericht, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = [r for r in rep if r['status'] == 'ok']
    import collections
    print(len(ok), 'Designs;', len(rep) - len(ok), 'Fehler')
    print(collections.Counter(r['reihe'] for r in ok))
    for r in rep:
        if r['status'] != 'ok':
            print('  ', r)


if __name__ == '__main__':
    main()
