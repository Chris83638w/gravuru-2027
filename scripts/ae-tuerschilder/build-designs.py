#!/usr/bin/env python3
"""AE-Türschilder: freigegebene Edelstahl-Designs je Unterkategorie auf die Acrylplatten übertragen.

Je AE-Formatreihe (eigenes Seitenverhältnis der Acrylplatte) ein Master; Quadrat und Rund bleiben im
Seitenverhältnis und decken mit einem Master alle Größen ab. Quelle ist jeweils der Edelstahl-Master, der die
gleiche Edelstahlgröße bedient (z. B. 12 × 8 → TRE-V2A-8x5-Dn). Kennung: <Form>-AV2A-<Edelstahlmaß cm>-D<n>
(D-Nummer des Edelstahl-Designs; Materialkürzel AV2A wie die Bestandsbögen Acryl + Edelstahl).

Aufruf:
  python3 build-designs.py --katalog <pfad> --auswahl auswahl.json [--nur-plan]
auswahl.json: [{"quelle": "edelstahl-gravur-80x53/TRE-V2A-8x5-D200", ...} | {"d": 200, "thema": "..."}]
"""
import argparse, glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from shapely.geometry import Polygon
from aelib import Fonts, read_design, path_points, path_abs, fmt
from aelayout import plan_layout, write_svg

FAMS = ('ae-tuerschilder-schwarz', 'ae-tuerschilder-anthrazit')
CODES = {'ae-tuerschilder-schwarz': 'AS', 'ae-tuerschilder-anthrazit': 'AA'}
FORMNAME = {'re': 'Rechteck', 'qu': 'Quadrat', 'oval': 'Oval', 'ellipse': 'Ellipse', 'rund': 'Rund', 'retro1': 'Retro 1'}
SHAPE = {'re': 'rect', 'qu': 'rect', 'oval': 'ellipse', 'ellipse': 'ellipse', 'rund': 'ellipse', 'retro1': 'contour'}
CAPS = {'re': (0.88, 0.80), 'qu': (0.86, 0.80), 'oval': (0.84, 0.72), 'ellipse': (0.86, 0.70), 'rund': (0.80, 0.70), 'retro1': (0.86, 0.78)}

# (Form, Gruppe, Edelstahlgrößen der Reihe, Quellreihe Edelstahl, Kürzel)
SPECS = []
for w, h in [(90, 60), (120, 80), (150, 100), (180, 120), (210, 140), (240, 160), (300, 200), (420, 280), (450, 300)]:
    SPECS.append(('re', 'RE', [(w, h)], 'edelstahl-gravur-80x53', 'TRE'))
for w, h in [(180, 60), (210, 70), (240, 80), (270, 90)]:
    SPECS.append(('re', 'RE', [(w, h)], 'edelstahl-gravur-90x30', 'TRE'))
for w, h in [(160, 70), (240, 105), (320, 140), (400, 175)]:
    SPECS.append(('re', 'RE', [(w, h)], 'edelstahl-gravur-80x35', 'TRE'))
SPECS.append(('qu', 'QU', [(100, 100), (120, 120), (160, 160), (200, 200), (260, 260), (300, 300)], 'edelstahl-gravur-80x80', 'TQ'))
SPECS.append(('rund', 'R', [(120, 120), (160, 160), (200, 200)], 'edelstahl-gravur-65x65-rund', 'TR'))
for w, h in [(90, 60), (120, 80), (150, 100), (180, 120), (210, 140), (240, 160), (300, 200)]:
    SPECS.append(('oval', 'OV', [(w, h)], 'edelstahl-gravur-oval-90x60', 'TO'))
for w, h in [(150, 80), (225, 120), (300, 160)]:
    SPECS.append(('oval', 'OV', [(w, h)], 'edelstahl-gravur-oval-150x80', 'TO'))
for w, h in [(180, 60), (210, 70), (240, 80), (270, 90), (300, 100)]:
    SPECS.append(('ellipse', 'EL', [(w, h)], 'edelstahl-gravur-oval-120x40', 'TO'))
for w, h in [(90, 60), (120, 80), (150, 100), (180, 120), (210, 140), (240, 160), (300, 200)]:
    SPECS.append(('retro1', 'RT1', [(w, h)], 'edelstahl-gravur-retro1-90x60', 'TR1'))


def grow_small_texts(D, tr, Wt, Ht, shape, poly, edge, minmm=3.0):
    """Texte unter 3 mm (Mindestgröße Gravur) auf 3 mm anheben, wenn nichts überlappt und alles auf der Platte bleibt."""
    from aelayout import inside_ellipse, inside_polygon, transformed_points

    def box(it, t):
        sx, sy, tx, ty = t
        b = it.bbox
        return (b[0] * sx + tx, b[1] * sy + ty, b[2] * sx + tx, b[3] * sy + ty)
    for it in D['items']:
        if not hasattr(it, 'font'):
            continue
        sx, sy, tx, ty = tr[it.id]
        size = it.size * sy
        if size >= minmm - 1e-6:
            continue
        f = (minmm + 0.01) / size
        if it.anchor == 'start' and not it.rot:
            ax = it.x
        elif it.anchor == 'end' and not it.rot:
            ax = it.x
        else:
            ax = (it.bbox[0] + it.bbox[2]) / 2
        ay = (it.bbox[1] + it.bbox[3]) / 2
        nax, nay = ax * sx + tx, ay * sy + ty
        cand = (sx * f, sy * f, nax - ax * sx * f, nay - ay * sy * f)
        nb = box(it, cand)
        clash = any(o is not it and not (nb[2] + .3 <= ob[0] or ob[2] + .3 <= nb[0] or nb[3] + .3 <= ob[1] or ob[3] + .3 <= nb[1])
                    for o in D['items'] for ob in [box(o, tr[o.id])] if getattr(o, 'span', None) is None)
        kb = it.kbox
        kin = kb[0] * cand[0] + cand[2] >= 0 and kb[2] * cand[0] + cand[2] <= Wt and kb[1] * cand[1] + cand[3] >= 0 and kb[3] * cand[1] + cand[3] <= Ht
        pts = transformed_points(it, cand)
        inside = (shape != 'rect' or kin) and (shape != 'ellipse' or inside_ellipse(pts, Wt, Ht, edge or 0)) and (shape != 'contour' or inside_polygon(pts, poly, edge or 0))
        if not clash and inside:
            tr[it.id] = cand
    return tr


def cm(v):
    return ('%g' % (v / 10))


def spec_info(spec, fam):
    form, group, sizes, src, prefix = spec
    w0, h0 = sizes[0]
    aw, ah = w0 - 20, h0 - 20
    keys = {f: ['TS-AE-%s-%s-%dX%d' % (CODES[f], group, w, h) for w, h in sizes] for f in FAMS}
    contour = None
    if group == 'RT1':
        s = next(s for s in fam['sizes'] if s['key'] == keys[FAMS[0]][0])
        contour = s['outlinePath']
    return {
        'form': form, 'group': group, 'sizes': sizes, 'src': src, 'prefix': prefix,
        'aw': aw, 'ah': ah, 'series': 'ae-tuerschilder-%s-%dx%d' % (form, aw, ah),
        'base': '%s-AV2A-%sx%s' % (prefix, cm(w0), cm(h0)), 'keys': keys, 'contour': contour,
    }


# Andere Quellen, wenn es für ein Thema keine freigegebenen Edelstahl-Designs gibt (Auftrag #131):
# Hausnummern aus Acryl mit Abstandshaltern (AA/AS/SS, D600–D606, D640, D641, D661), Firmen aus Rund (D74).
ALT = {
    'aa': {'re': lambda w, h: 'acryl-abstandshalter-150x100' if w / h < 2 else 'acryl-abstandshalter-210x70',
           'qu': lambda w, h: 'acryl-abstandshalter-160x160', 'rund': lambda w, h: 'acryl-abstandshalter-160x160',
           'oval': lambda w, h: 'acryl-abstandshalter-oval-150x100' if w / h < 1.7 else 'acryl-abstandshalter-oval-150x80',
           'ellipse': lambda w, h: 'acryl-abstandshalter-210x70', 'retro1': lambda w, h: 'acryl-abstandshalter-150x100'},
    'rund': {k: (lambda w, h: 'edelstahl-gravur-65x65-rund') for k in ('re', 'qu', 'rund', 'oval', 'ellipse', 'retro1')},
}


def approved_any(d):
    for t in d.get('ziele') or []:
        if (t.get('freigabe') or {}).get('status') == 'freigegeben':
            return t['freigabe'] | {'familie': t['familie']}
    return None


def approved_steel(d):
    for t in d.get('ziele') or []:
        if t.get('familie') == 'steel-door-signs' and (t.get('freigabe') or {}).get('status') == 'freigegeben':
            return t['freigabe']
    return None


def find_source(katalog, series, n):
    for p in glob.glob(os.path.join(katalog, 'designs', series, '*', 'design.json')):
        d = json.load(open(p, encoding='utf-8'))
        if d.get('designNo') == n:
            return p, d
    return None, None


def build_one(katalog, fonts, spec, info, src_json_path, src, theme_note=None, out_root=None, mode_note=None):
    svg_path = src_json_path.replace('design.json', 'design.svg')
    D = read_design(svg_path, fonts)
    shape = SHAPE[info['form']]
    poly = None
    if shape == 'contour':
        poly = Polygon(path_points(path_abs(info['contour']), 24))
    edge = None
    if shape == 'ellipse':
        edge = max(1.0, 0.025 * min(info['aw'], info['ah']))
    elif shape == 'contour':
        edge = max(1.0, 0.02 * min(info['aw'], info['ah']))
    # Konfi: Schriftgröße höchstens 100 mm – auch in der größten Größe der Reihe (Quadrat/Rund skalieren mit)
    fmax = (max(w for w, h in info['sizes']) - 20) / info['aw'] if len(info['sizes']) > 1 else 1.0
    caps = CAPS[info['form']]
    for _ in range(12):
        tr, m = plan_layout(D, info['aw'], info['ah'], shape, caps, contour=poly, edge_margin=edge)
        big = max([it.size * tr[it.id][1] for it in D['items'] if hasattr(it, 'font')] or [0]) * fmax
        if big <= 99:
            break
        caps = (caps[0] * 99 / big, caps[1] * 99 / big)
    tr = grow_small_texts(D, tr, info['aw'], info['ah'], shape, poly, edge)
    svg = write_svg(D, tr, info['aw'], info['ah'], 'contour' if shape == 'contour' else shape, info['contour'])
    n = src['designNo']
    did = '%s-D%s' % (info['base'], n)
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
    same_ratio = abs((D['W'] / D['H']) / (info['aw'] / info['ah']) - 1) < 0.001
    w0, h0 = info['sizes'][0]
    freigabe = approved_steel(src) or approved_any(src)
    dj = {
        'id': did,
        'designNo': n,
        'name': src.get('name'),
        **({'nameSheet': src['nameSheet']} if src.get('nameSheet') else {}),
        'material': 'Acryl+Edelstahl',
        'process': 'Gravur',
        'form': FORMNAME[info['form']],
        'plate': {'widthMm': info['aw'], 'heightMm': info['ah'],
                  'source': 'Acrylplatte AE-Türschild %s × %s cm (Edelstahl rundum 10 mm größer, Chris 02.11.2026 #131)' % (cm(w0).replace('.', ','), cm(h0).replace('.', ','))},
        'plateMm': [info['aw'], info['ah']],
        'mode': '1:1' if same_ratio and abs(m['grow'] - 1) < 0.02 and m['spread'] < 1.001 else 'Referenz',
        'source': 'Design %s (%s, freigegeben %s); gleiche Schriften, Texte, Motive und Aufbau, neu proportioniert auf die Acrylplatte %s × %s mm' % (
            src['id'], os.path.basename(os.path.dirname(os.path.dirname(src_json_path))), (freigabe or {}).get('am', '')[:10], fmt(info['aw']), fmt(info['ah'])),
        'texts': texts,
        'motifs': src.get('motifs', []),
        'photos': [],
        'fonts': sorted({t['font'] for t in texts}),
        'deviations': ([] if same_ratio else ['Seitenverhältnis %s → %s: Anordnung neu proportioniert (Abstände nebeneinander), Motiv und Schrift unverzerrt' % (fmt(D['W'] / D['H']), fmt(info['aw'] / info['ah']))])
                      + (['Gruppe mittig gesetzt und auf die Fläche vergrößert (×%s gegenüber reiner Umrechnung)' % fmt(m['grow'])] if abs(m['grow'] - 1) >= 0.02 else [])
                      + (['Schrift unter 3 mm: ' + ', '.join(small)] if small else []),
        'movable': True,
        'themes': src.get('themes', []),
        'sizes': [k for f in FAMS for k in info['keys'][f]],
        'ziele': [{'familie': f, 'freigabe': None} for f in FAMS],
        'masterSheet': {'base': info['base'], 'key': did, 'familySize': info['keys'][FAMS[0]][0], 'plateMm': [info['aw'], info['ah']]},
        'katalog': {'key': '%s-D%s' % (info['series'], n), 'series': info['series'], 'zielgruppe': 'offen', 'unterkategorie': 'offen',
                    'themen': src.get('themes', [])},
        'varianteVon': src['id'],
        'transfer': {'from': src['id'], 'fromKey': src['id'], 'scale': round(m['scale'], 4), 'decided': '2026-11-02',
                     'by': 'AE-Türschilder-Chat (#131), scripts/ae-tuerschilder/build-designs.py'},
        'formatreihe': 'AE %s Acryl %s × %s' % (FORMNAME[info['form']], fmt(info['aw']), fmt(info['ah'])),
        'flaeche': {k: round(m[k], 3) for k in ('fw', 'fh', 'fa', 'cx', 'cy', 'grow', 'spread', 'vspread')},
    }
    out_dir = os.path.join(out_root or katalog, 'designs', info['series'], did)
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, 'design.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)
    with open(os.path.join(out_dir, 'design.json'), 'w', encoding='utf-8') as f:
        json.dump(dj, f, ensure_ascii=False, indent=1)
        f.write('\n')
    return did, dj, m


def write_index(katalog, series):
    rows = []
    folder = os.path.join(katalog, 'designs', series)
    for p in sorted(glob.glob(os.path.join(folder, '*', 'design.json')), key=lambda p: json.load(open(p))['designNo']):
        d = json.load(open(p, encoding='utf-8'))
        rows.append({'key': d['id'], 'name': d.get('name'), 'nameSheet': d.get('nameSheet'), 'pfad': d['id'], 'quelle': d.get('varianteVon'),
                     'masterBogen': d['masterSheet']['base'], 'plateMm': d['plateMm'], 'themen': d.get('themes', []), 'themenVorschlag': [],
                     'groessen': d['sizes'], 'groessenOffen': [], 'nichtWaehlbar': [], 'texte': len(d['texts']),
                     'motive': len(d.get('motifs') or []), 'schriften': d['fonts'], 'schriftenOriginal': [], 'produktion': False,
                     'produktionWeitereBoegen': [], 'pruefen': None, 'warnungen': [x for x in d.get('deviations', []) if x.startswith('Schrift unter')]})
    with open(os.path.join(folder, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False)
        f.write('\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--katalog', required=True)
    ap.add_argument('--auswahl', required=True, help='JSON: Liste {"d": n, "thema": t} (D-Nummer je Unterkategorie)')
    ap.add_argument('--formen', default='', help='nur diese Formen (re,qu,oval,ellipse,rund,retro1)')
    ap.add_argument('--bericht', default='')
    a = ap.parse_args()
    fam = json.load(open(os.path.join(a.katalog, 'familien/ae/ae-tuerschilder-schwarz.json'), encoding='utf-8'))
    fonts = Fonts(a.katalog)
    auswahl = json.load(open(a.auswahl, encoding='utf-8'))
    forms = set(a.formen.split(',')) if a.formen else None
    report, touched = [], set()
    for entry in auswahl:
        for spec in SPECS:
            if forms and spec[0] not in forms:
                continue
            info = spec_info(spec, fam)
            aw0, ah0 = spec[2][0][0] - 20, spec[2][0][1] - 20
            if entry.get('max_ratio') and aw0 / ah0 > entry['max_ratio']:
                report.append({'d': entry['d'], 'reihe': info['series'], 'status': 'ausgelassen: Langformat braucht eigene Anordnung (Quelle %s)' % entry.get('quelle')})
                continue
            if entry.get('quelle'):
                w0, h0 = spec[2][0]
                info['src'] = ALT[entry['quelle']][spec[0]](w0 - 20, h0 - 20)
                p, src = find_source(a.katalog, info['src'], entry['d'])
                ok = src and approved_any(src)
            else:
                p, src = find_source(a.katalog, info['src'], entry['d'])
                ok = src and approved_steel(src)
            if not ok:
                report.append({'d': entry['d'], 'reihe': info['series'], 'status': 'keine freigegebene Quelle'})
                continue
            try:
                did, dj, m = build_one(a.katalog, fonts, spec, info, p, src)
            except Exception as e:
                report.append({'d': entry['d'], 'reihe': info['series'], 'status': 'Fehler: ' + str(e)[:120]})
                continue
            touched.add(info['series'])
            report.append({'d': entry['d'], 'reihe': info['series'], 'id': did, 'status': 'ok', 'themen': dj['themes'], **dj['flaeche'],
                           'klein': [t['feld'] for t in dj['texts'] if t['sizeMm'] < 3]})
    for s in sorted(touched):
        write_index(a.katalog, s)
    if a.bericht:
        json.dump(report, open(a.bericht, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = [r for r in report if r['status'] == 'ok']
    print(len(ok), 'Designs geschrieben;', len(report) - len(ok), 'ohne Ergebnis')
    for r in report:
        if r['status'] != 'ok':
            print('  ', r)


if __name__ == '__main__':
    main()
