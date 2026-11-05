"""Chris 05.11.2026 13:20: „Regel, diese Designs [Neue Struktur = Bestand] sind immer Prio … gehe jetzt alles
durch, jede Größe. Diese sollten auch als erstes für andere Größen verwendet werden.“
Jeder 1:1-Master eines Bestandsoriginals wird auf jede Schiefer-Formatreihe übertragen, in der es noch keine
Umsetzung dieses Originals gibt (Referenz nach Design-Master §1.3, umsetzen.py). Ergebnis je Formatreihe in
designs/schiefer-<linie>-katalog-<formatreihe>/, Kennung <Master-ID>-<Kürzel>, katalog.prio = 1.
Aufruf: python3 prio_umsetzen.py <katalog> <jobs.json> [--nur n]"""
import sys, os, json, re
from aelib import Fonts
from umsetzen import umsetzen
from auffuellen import REIHEN as RA, N, P, G, K, min_text, size_w

QU = ['GT-SN-QU-%dX%d' % (s, s) for s in (100, 130, 160, 200, 220, 250, 300)]
REIHEN = dict(RA)
REIHEN.update({
    'quadrat': ('Quadrat', (200, 200), {N: QU}, (N, 'GT-SN-QU-200X200'), 'qu'),
    'rund': ('Rund', (220, 220), {N: ['GT-SN-R-200X200', 'GT-SN-R-220X220', 'GT-SN-R-280X280', 'GT-SN-R-355X355']}, (N, 'GT-SN-R-220X220'), 'r'),
    'rechteck-2-1': ('Rechteck', (400, 200), {N: ['GT-SN-RE-400X200', 'GT-SN-RE-600X300']}, (N, 'GT-SN-RE-400X200'), 'n40x20'),
    'rechteck-3-1': ('Rechteck', (300, 100), {N: ['GT-SN-RE-300X100', 'GT-SN-RE-380X130', 'GT-SN-RE-560X180']}, (N, 'GT-SN-RE-300X100'), 'n30x10'),
    'rechteck-4-3': ('Rechteck', (400, 300), {N: ['GT-SN-RE-400X300'], P: ['GT-SP-RE-200X150', 'GT-SP-RE-400X300']}, (N, 'GT-SN-RE-400X300'), 'n40x30'),
    'rechteck-3-2': ('Rechteck', (300, 200), {N: ['GT-SN-RE-150X100', 'GT-SN-RE-300X200'], P: ['GT-SP-RE-300X200']}, (N, 'GT-SN-RE-300X200'), 'n30x20'),
})

kat, jobs_path = sys.argv[1], sys.argv[2]
nur = int(sys.argv[sys.argv.index('--nur') + 1]) if '--nur' in sys.argv else None
linie = sys.argv[sys.argv.index('--linie') + 1] if '--linie' in sys.argv else 'gedenktafeln'
fonts = Fonts(kat)
jobs = json.load(open(jobs_path, encoding='utf-8'))[:nur]
rep = []
for key, src, zg, uk, foto, fr in jobs:
    form, (W, H), targets, (mf, mk), tag = REIHEN[fr]
    if foto:
        targets = {f: ks for f, ks in targets.items() if f != P}
        if not targets:
            continue
    keys = [k for ks in targets.values() for k in ks]
    sd = os.path.join(kat, 'designs', src)
    d = json.load(open(os.path.join(sd, 'design.json'), encoding='utf-8'))
    series = 'schiefer-%s-katalog-%s' % (linie, fr)
    nid = '%s-%s' % (d['id'], tag)
    kk = dict(d.get('katalog') or {}); kk.update(series=series, key=nid, prio=1)
    meta = {'id': nid, 'form': form, 'formatreihe': fr, 'sizes': keys, 'material': 'Schiefer', 'withPhoto': foto,
            'ziele': [{'familie': f, 'freigabe': None} for f in targets],
            'katalog': kk, 'varianteVon': d['id'],
            'plate': {'widthMm': W, 'heightMm': H, 'source': 'Schiefertafel (Master der Reihe)'},
            'schieferUebernahme': {'am': '2026-11-05', 'mode': 'Referenz', 'von': d['id'], 'original': key,
                                   'by': 'Claude Schiefer (Chris 05.11. 13:20: Originale der Neuen Struktur haben Vorrang, jede Größe)'}}
    out = os.path.join(kat, 'designs', series, nid)
    try:
        m = umsetzen(kat, fonts, sd, mf, mk, W, H, out, meta, keys_largest_w=max(size_w(k) for k in keys), stapeln=(H > 1.15 * W) or form.startswith('Herz') or fr.startswith('kordel-herz'))
        mt = min_text(os.path.join(out, 'design.svg'))
        ok = [k for k in keys if mt * size_w(k) / W >= 2.95]
        jp = os.path.join(out, 'design.json'); dj = json.load(open(jp, encoding='utf-8'))
        dj['sizes'] = ok
        dj['ziele'] = [z for z in dj['ziele'] if any(k in targets[z['familie']] for k in ok)]
        json.dump(dj, open(jp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        rep.append({'id': nid, 'reihe': series, 'ok': True, 'sizes': len(ok)})
    except Exception as e:
        rep.append({'id': nid, 'reihe': series, 'ok': False, 'fehler': str(e)[:200]})
json.dump(rep, open(jobs_path.replace('.json', '-bericht.json'), 'w'), ensure_ascii=False, indent=1)
print(sum(r['ok'] for r in rep), 'ok,', sum(not r['ok'] for r in rep), 'Fehler')
