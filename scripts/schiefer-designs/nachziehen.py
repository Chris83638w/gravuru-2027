"""Einzelne Ebene (Foto/Motiv/Datum) eines Designs verkleinern und Richtung Formmitte schieben, bis der
Renderer „passt“ meldet; ganze Gestaltung skalieren, wenn eine Schrift über 100 mm läge.
Aufruf: python3 nachziehen.py <katalog> <code-repo> <liste.tsv: reihe, id, familie, groesse, ebene|ALLE>"""
import sys, os, json
from aelib import Fonts, read_design
from svgedit import apply_tr
from einzelfix import status

kat, rnd, liste = sys.argv[1:4]
fonts = Fonts(kat)
for line in open(liste):
    reihe, did, fam, size, lid = line.rstrip('\n').split('\t')
    p = os.path.join(kat, 'designs', reihe, did, 'design.svg')
    orig = open(p, encoding='utf-8').read()
    done = None
    for step in range(1, 7):
        s = 1 - 0.05 * step
        open(p, 'w', encoding='utf-8').write(orig)
        D = read_design(p, fonts)
        W, H = D['W'], D['H']
        tr = {it.id: (1, 1, 0, 0) for it in D['items']}
        ziel = D['items'] if lid == 'ALLE' else [i for i in D['items'] if i.id == lid]
        xs = [v for it in ziel for v in (it.bbox[0], it.bbox[2])]
        ys = [v for it in ziel for v in (it.bbox[1], it.bbox[3])]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        mx, my = (W / 2 - cx) * 0.06 * step, (H * 0.45 - cy) * 0.06 * step
        for it in ziel:
            tr[it.id] = (s, s, cx * (1 - s) + mx, cy * (1 - s) + my)
        apply_tr(D, tr, fonts)
        D['tree'].write(p, encoding='utf-8', xml_declaration=False)
        st, iss = status(kat, rnd, fam, size, did)
        if st in ('passt', 'prüfen'):
            done = (s, st)
            break
    if done is None:
        open(p, 'w', encoding='utf-8').write(orig)
    print(did, done or ('nicht lösbar', iss[:1]))
