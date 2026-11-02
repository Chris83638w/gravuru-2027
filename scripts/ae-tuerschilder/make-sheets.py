#!/usr/bin/env python3
"""Kontaktbögen je Unterkategorie aus dem Bericht von build-designs.py (native Konfi-Vorschau, Vorlage daneben).

Aufruf: python3 make-sheets.py --katalog <pfad> --bericht bericht.json --out <ordner> --prefix bogen [--thema t]
"""
import argparse, json, os, re, subprocess, sys
HERE = os.path.dirname(__file__)
THEMEN = {'familienschilder': 'Familienschilder', 'hausnummern': 'Hausnummern', 'willkommensschilder': 'Willkommensschilder',
          'hundeschilder': 'Hundeschilder', 'katzenschilder': 'Katzenschilder', 'andenkenschilder': 'Andenkenschilder',
          'hochzeitsschilder': 'Hochzeitsschilder', 'hinweisschilder': 'Hinweisschilder', 'firmenschilder': 'Firmen- und Praxisschilder',
          'namensschilder': 'Namensschilder', 'pferdeschilder': 'Pferdeschilder'}
ORDER = ['re', 'qu', 'oval', 'ellipse', 'rund', 'retro1']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--katalog', required=True)
    ap.add_argument('--bericht', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--prefix', default='bogen')
    ap.add_argument('--gruppe', default='d', help='d = je D-Nummer ein Bogen')
    ap.add_argument('--server', default='http://127.0.0.1:8971')
    ap.add_argument('--spalten', type=int, default=3)
    ap.add_argument('--kachel', type=int, default=360)
    a = ap.parse_args()
    steel = json.load(open(os.path.join(a.katalog, 'familien/edelstahl/steel-door-signs.json'), encoding='utf-8'))
    ae = json.load(open(os.path.join(a.katalog, 'familien/ae/ae-tuerschilder-schwarz.json'), encoding='utf-8'))
    aes = {s['key']: s for s in ae['sizes']}
    rep = [r for r in json.load(open(a.bericht, encoding='utf-8')) if r['status'] == 'ok']
    os.makedirs(a.out, exist_ok=True)
    groups = {}
    for r in rep:
        groups.setdefault(r['d'], []).append(r)
    results = {}
    for d, rows in groups.items():
        lst = []
        rows.sort(key=lambda r: (ORDER.index(r['reihe'].split('-')[2]), int(re.findall(r'(\d+)x', r['reihe'])[0])))
        for r in rows:
            dj = json.load(open(os.path.join(a.katalog, 'designs', r['reihe'], r['id'], 'design.json'), encoding='utf-8'))
            key = dj['sizes'][0]
            size = aes[key]
            grp = size['groupKey']
            sw, sh = size['widthMm'] + 20, size['heightMm'] + 20
            st = next(s for s in steel['sizes'] if s['groupKey'] == grp and abs(s['widthMm'] - sw) < .6 and abs(s['heightMm'] - sh) < .6)
            src_series = re.search(r'\(([^,]+),', dj['source']).group(1)
            frame = {'kind': 'path', 'w': size['widthMm'], 'h': size['heightMm'], 'd': st['outlinePath']} if grp == 'RT1' else \
                    {'kind': 'ellipse' if grp in ('OV', 'EL', 'R') else 'rect', 'w': size['widthMm'], 'h': size['heightMm']}
            lst.append({'reihe': r['reihe'], 'id': r['id'], 'familie': 'ae-tuerschilder-schwarz', 'size': key, 'label': size['label'],
                        'vorlage': ({'reihe': src_series, 'id': dj['varianteVon'], 'familie': 'acryl-as-abstandshalter'} if src_series.startswith('acryl-abstandshalter')
                                    else {'reihe': src_series, 'id': dj['varianteVon'], 'size': st['key'] if src_series != 'edelstahl-gravur-65x65-rund' or grp == 'R' else 'GR-ES-R-120X120-T15'}), 'frame': frame})
        tmp = os.path.join(a.out, '_liste-%s.json' % d)
        json.dump(lst, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False)
        themes = rows[0].get('themen', [])
        title = 'AE-Türschilder · D%s · %s · Acryl schwarz auf Edelstahl (Rahmen ergänzt) – Vorlage Edelstahl daneben' % (d, ', '.join(THEMEN.get(t, t) for t in themes))
        out = os.path.join(a.out, '%s-D%s.jpg' % (a.prefix, d))
        p = subprocess.run([sys.executable, os.path.join(HERE, 'contact.py'), '--server', a.server, '--liste', tmp, '--out', out, '--titel', title,
                            '--spalten', str(a.spalten), '--kachel', str(a.kachel)], capture_output=True, text=True)
        os.remove(tmp)
        if p.returncode:
            print('Fehler', d, p.stderr[-400:])
            continue
        results[d] = json.loads(p.stdout.strip().splitlines()[-1])
        bad = [x for x in results[d] if x['status'] != 'passt']
        print('D%s: %d Kacheln, %d nicht „passt“ → %s (%d KB)' % (d, len(results[d]), len(bad), out, os.path.getsize(out) // 1024))
    json.dump(results, open(os.path.join(a.out, '_status-%s.json' % a.prefix), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
