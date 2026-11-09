"""Ganze Gestaltung um die Plattenmitte vergrößern (Freifläche, winzige Zeilen), solange der Renderer
in allen Größen des Designs nicht „passt nicht“ meldet. Schritte 6 %, höchstens Faktor 1,36.
Aufruf: python3 vergroessern.py <katalog> <code-repo> <liste.tsv: reihe, id, familie, groesse, ALLE>"""
import sys, os, json
from aelib import Fonts, read_design
from svgedit import apply_tr
from einzelfix import status

kat, rnd, liste = sys.argv[1:4]
fonts = Fonts(kat)
for line in open(liste):
    reihe, did, fam, size, lid = line.rstrip('\n').split('\t')
    p = os.path.join(kat, 'designs', reihe, did, 'design.svg')
    js = json.load(open(os.path.join(kat, 'designs', reihe, did, 'design.json')))
    FAM = {'SN': 'schiefer-tafeln-natur', 'SP': 'schiefer-tafeln-premium', 'SG': 'schiefer-tafeln-geschnitten', 'SK': 'schiefer-tafeln-kordel'}
    checks = [(FAM[k.split('-')[1]], k) for k in js.get('sizes', [])]
    orig = open(p, encoding='utf-8').read()
    best = None
    for step in range(1, 7):
        s = 1 + 0.06 * step
        open(p, 'w', encoding='utf-8').write(orig)
        D = read_design(p, fonts)
        W, H = D['W'], D['H']
        xs = [v for it in D['items'] for v in (it.bbox[0], it.bbox[2])]
        ys = [v for it in D['items'] for v in (it.bbox[1], it.bbox[3])]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        # Gruppe zur Mitte ziehen (halber Versatz) und vergrößern
        mx, my = (W / 2 - cx) * 0.5, (H / 2 - cy) * 0.5
        tr = {it.id: (s, s, cx * (1 - s) + mx, cy * (1 - s) + my) for it in D['items']}
        apply_tr(D, tr, fonts)
        D['tree'].write(p, encoding='utf-8', xml_declaration=False)
        ok = all(status(kat, rnd, f, k, did)[0] in ('passt', 'prüfen') for f, k in checks)
        if not ok: break
        best = (s, open(p, encoding='utf-8').read())
    open(p, 'w', encoding='utf-8').write(best[1] if best else orig)
    print(did, round(best[0], 2) if best else 'unverändert')
