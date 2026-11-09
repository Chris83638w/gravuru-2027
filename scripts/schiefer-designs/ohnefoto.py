"""Gedenk-Lücken „ohne Foto“ aus vorhandenen Mit-Foto-Mastern ableiten (Chris 04.11.2026: „Einmal mit und ohne Foto“).

Je Quelle: Fotofenster samt Maske entfernen, Text und Motiv bleiben (gleiche Schriften, Texte, Motive) und werden
mit umsetzen.py auf derselben Formatreihe neu als Gruppe mittig gesetzt und vergrößert.
Aufruf: python3 ohnefoto.py <katalog> <unterkategorie: Katze|Hund|Sternenkinder> <anzahl je reihe> [reihe,reihe]
"""
import sys, os, json, glob, shutil, tempfile, re, collections
from lxml import etree
from aelib import Fonts, q, read_design
from svgedit import apply_tr
from kompakt import kompakt
from umsetzen import umsetzen

FAM = {'schiefer-tafeln-natur', 'schiefer-tafeln-premium', 'schiefer-tafeln-geschnitten', 'schiefer-tafeln-kordel'}


def strip_photo(src_dir, tmp, fonts):
    shutil.copytree(src_dir, tmp, dirs_exist_ok=True)
    p = os.path.join(tmp, 'design.svg')
    D = read_design(p, fonts)
    win = [it.bbox for it in D['items'] if it.kind == 'foto']
    t = D['tree']
    r = t.getroot()
    clips = set()
    # Rahmen ums Fotofenster (Ring, Rahmenecken) mit entfernen: Motiv/Deko, dessen Box das Fenster umschließt
    for it in D['items']:
        if it.kind not in ('motiv', 'deko') or not win:
            continue
        b = it.bbox
        for w in win:
            ix = max(0, min(b[2], w[2]) - max(b[0], w[0])) * max(0, min(b[3], w[3]) - max(b[1], w[1]))
            wa = (w[2] - w[0]) * (w[3] - w[1])
            if wa > 0 and ix > 0.6 * wa:
                it.node.getparent().remove(it.node)
                break
    for n in list(r):
        if isinstance(n.tag, str) and (n.get('id') or '').startswith('foto-'):
            for e in n.iter():
                if isinstance(e.tag, str):
                    for a in ('clip-path', 'mask'):
                        m = re.search(r'url\(#([^)]+)\)', e.get(a) or '')
                        if m:
                            clips.add(m.group(1))
            r.remove(n)
    for cp in list(r.iter(q('clipPath'))):
        if cp.get('id') in clips:
            cp.getparent().remove(cp)
    t.write(p, encoding='utf-8', xml_declaration=False)
    kompakt(p, fonts)
    for f in os.listdir(tmp):
        if f.startswith('foto') and f.endswith(('.jpg', '.png', '.webp')):
            os.remove(os.path.join(tmp, f))


def main():
    kat, uk, anzahl = sys.argv[1], sys.argv[2], int(sys.argv[3])
    only = set(sys.argv[4].split(',')) if len(sys.argv) > 4 else None
    fonts = Fonts(kat)
    rep = collections.Counter()
    for jp in sorted(glob.glob(os.path.join(kat, 'designs', 'schiefer-*', '*', 'design.json'))):
        series = jp.split('/')[-3]
        if only and series not in only:
            continue
        d = json.load(open(jp, encoding='utf-8'))
        k = d.get('katalog') or {}
        if not d.get('withPhoto') or not d.get('ziele') or (k.get('unterkategorie') != uk and k.get('zielgruppe') != uk):
            continue
        if rep[series] >= anzahl:
            continue
        sd = os.path.dirname(jp)
        nid = d['id'] + '-of'
        out = os.path.join(kat, 'designs', series, nid)
        if os.path.exists(out):
            rep[series] += 1
            continue
        tmp = tempfile.mkdtemp()
        strip_photo(sd, tmp, fonts)
        W, H = d['plateMm']
        keys = d.get('sizes') or []
        fid = next(z['familie'] for z in d['ziele'] if z['familie'] in FAM)
        F = json.load(open(os.path.join(kat, 'familien/schiefer', fid + '.json'), encoding='utf-8'))
        mk = next((s['key'] for s in F['sizes'] if s['key'] in keys and abs(s['widthMm'] / s['heightMm'] - W / H) < 0.02), keys[0] if keys else None)
        largest = max([s['widthMm'] for s in F['sizes'] if s['key'] in keys] or [W])
        kat_ = dict(k)
        kat_.update({'key': nid})
        if kat_.get('unterkategorie') == 'Mit Foto':
            kat_['unterkategorie'] = 'Ohne Foto'
        meta = {'id': nid, 'withPhoto': False, 'photos': [], 'section': 'Ohne Foto', 'katalog': kat_,
                'name': d.get('name')}
        try:
            # Master: gleiche Platte; die Form kommt aus der Familiengröße mit gleichem Seitenverhältnis
            sw = next(s['widthMm'] for s in F['sizes'] if s['key'] == mk)
            umsetzen(kat, fonts, tmp, fid, mk, W, H, out, meta, keys_largest_w=largest)
            dj = json.load(open(os.path.join(out, 'design.json'), encoding='utf-8'))
            dj['ableitung'] = 'ohne Foto aus %s (Fotofenster entfernt, Text und Motiv neu gesetzt)' % d['id']
            json.dump(dj, open(os.path.join(out, 'design.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            rep[series] += 1
        except Exception as e:
            print('FEHLER', d['id'], str(e)[:120])
            shutil.rmtree(out, ignore_errors=True)
        shutil.rmtree(tmp, ignore_errors=True)
    for s, n in sorted(rep.items()):
        print(s, n)


if __name__ == '__main__':
    main()
