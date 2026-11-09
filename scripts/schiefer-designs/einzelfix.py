"""Einzelfälle nach korrektur.py: Element über der Gestaltungsfläche um seine Mitte verkleinern
(und optional zur Plattenmitte schieben), bis der Renderer „passt“ meldet.

Aufruf: python3 einzelfix.py <katalog> <renderer-repo>
Jeder Fall: (Reihe, Design-ID, Familie, Größe, Ebene, Schub Richtung Mitte in mm je Schritt).
Verkleinert in Schritten von 5 % bis höchstens 75 %; Text weicht nie dem Motiv – hier betrifft es nur
Motiv, Foto oder Datum, die nach der Korrektur die Kontur berühren.
"""
import sys, os, json, subprocess, tempfile, shutil
from aelib import Fonts, read_design
from svgedit import apply_tr

FAELLE = [
    ('schiefer-menschen-herz-geschnitten-24x19', 'menschen-mem-090-r11-ohne', 'schiefer-tafeln-geschnitten', 'GT-SG-HR-240X192', 'motiv-1', 0),
    # Foto sitzt in der Kerbe zwischen den Bögen: in den rechten Bogen (Mitte 150/86 mm) setzen
    ('schiefer-menschen-herz-schief', 'menschen-mem-049-r12-ohne', 'schiefer-tafeln-geschnitten', 'GT-SG-HS-259P4X189P6', 'foto-1', (150, 86)),
    ('schiefer-menschen-herz-kordel-225x267', 'menschen-mem-094-r49-kordel-fest', 'schiefer-tafeln-kordel', 'GT-SK-HR-227X271P1', 'foto-1', 1.5),
    ('schiefer-menschen-kordel-herz-10x10', 'menschen-neu-erinnerung-02-r48-kordel-fest', 'schiefer-tafeln-kordel', 'GT-SK-HR-102X102', 'text-review-daten-1', 1.0),
    ('schiefer-menschen-rund', 'menschen-mem-106-r34-ohne', 'schiefer-tafeln-natur', 'GT-SN-R-200X200', 'motiv-1', 1.0),
]


def status(kat, rnd, fam, size, did):
    out = tempfile.mkdtemp()
    env = dict(os.environ, PRUEF_KONTUR='1')
    subprocess.run(['node', 'scripts/render-vorlagen.mjs', '--katalog', kat, '--familie', fam, '--design', did,
                    '--groesse', size, '--out', out], cwd=rnd, env=env, capture_output=True)
    try:
        e = json.load(open(os.path.join(out, 'index.json')))['ergebnisse'][0]
        return e['status'], e['issues']
    finally:
        shutil.rmtree(out, ignore_errors=True)


def main():
    kat, rnd = sys.argv[1], sys.argv[2]
    fonts = Fonts(kat)
    for reihe, did, fam, size, lid, push in FAELLE:
        p = os.path.join(kat, 'designs', reihe, did, 'design.svg')
        orig = open(p, encoding='utf-8').read()
        if '--neu' in sys.argv and did not in sys.argv:
            continue
        st, iss = status(kat, rnd, fam, size, did)
        bad = [i for i in iss if 'ragt' in str(i)]
        if not bad:
            print(json.dumps({'id': did, 'ergebnis': 'schon gut', 'status': st}, ensure_ascii=False))
            continue
        done = None
        for step in range(1, 6):
            s = 1 - 0.05 * step
            open(p, 'w', encoding='utf-8').write(orig)
            D = read_design(p, fonts)
            W, H = D['W'], D['H']
            tr = {it.id: (1, 1, 0, 0) for it in D['items']}
            it = next(i for i in D['items'] if i.id == lid)
            b = it.bbox
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            dx, dy = W / 2 - cx, H / 2 - cy
            n = (dx * dx + dy * dy) ** 0.5 or 1
            if isinstance(push, tuple):
                mx, my = push[0] - cx, push[1] - cy
            else:
                mx, my = dx / n * push * step, dy / n * push * step
            if lid.startswith('text-'):
                s = max(s, 0.95)  # Text nur wenig verkleinern, lieber zur Mitte rücken
            tr[lid] = (s, s, cx * (1 - s) + mx, cy * (1 - s) + my)
            apply_tr(D, tr, fonts)
            D['tree'].write(p, encoding='utf-8', xml_declaration=False)
            st, iss = status(kat, rnd, fam, size, did)
            if not [i for i in iss if 'ragt' in str(i)]:
                done = (s, round(mx, 1), round(my, 1), st)
                break
        if done is None:
            open(p, 'w', encoding='utf-8').write(orig)
        print(json.dumps({'id': did, 'ebene': lid, 'ergebnis': done or 'nicht lösbar', 'issues': iss}, ensure_ascii=False))


if __name__ == '__main__':
    main()
