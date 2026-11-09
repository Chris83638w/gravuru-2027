"""Schiefer: Lücken je Formatreihe und Zielgruppe mit vorhandenen Mastern füllen (Chris 04.11.2026, 13:10).

Jeder Auftrag: Zielreihe (Familie, Mastergröße, alle Größen der Reihe) ← Quellreihen gleichen oder nächsten
Seitenverhältnisses. Nur angebotene Quellen (ziele nicht leer). Umsetzung mit umsetzen.py.
Aufruf: python3 auffuellen.py <katalog> <auftrag[,auftrag]> [--grenze n]
"""
import sys, os, json, glob, re, collections
from aelib import Fonts
from umsetzen import umsetzen

N, P, G, K = 'schiefer-tafeln-natur', 'schiefer-tafeln-premium', 'schiefer-tafeln-geschnitten', 'schiefer-tafeln-kordel'
GEDENK = ('schiefer-menschen', 'schiefer-sternenkinder', 'schiefer-tiere')
# Zielreihe: (formatreihe, Form, Master W×H, {Familie: [Größen]}, Mastergröße (Familie, Key), Kurzzeichen)
REIHEN = {
    'rechteck-220x140': ('Rechteck', (220, 140), {N: ['GT-SN-RE-220X140']}, (N, 'GT-SN-RE-220X140'), 'n22x14'),
    'kordel-rechteck-30x10': ('Rechteck', (300, 100), {K: ['GT-SK-RE-300X100']}, (K, 'GT-SK-RE-300X100'), 'k30x10'),
    'kordel-rechteck-22x14': ('Rechteck', (220, 140), {K: ['GT-SK-RE-220X140']}, (K, 'GT-SK-RE-220X140'), 'k22x14'),
    'kordel-rechteck-30x20': ('Rechteck', (300, 200), {K: ['GT-SK-RE-300X200']}, (K, 'GT-SK-RE-300X200'), 'k30x20'),
    'kordel-quadrat-20x20': ('Quadrat', (200, 200), {K: ['GT-SK-QU-200X200']}, (K, 'GT-SK-QU-200X200'), 'kqu20'),
    'kordel-rechteck-20x10': ('Rechteck', (200, 100), {K: ['GT-SK-RE-200X100']}, (K, 'GT-SK-RE-200X100'), 'k20x10'),
    'kordel-rechteck-20x25': ('Rechteck', (200, 250), {K: ['GT-SK-RE-200X250']}, (K, 'GT-SK-RE-200X250'), 'k20x25'),
    'kordel-rechteck-25x20': ('Rechteck', (250, 200), {K: ['GT-SK-RE-250X200']}, (K, 'GT-SK-RE-250X200'), 'k25x20'),
    'kordel-herz-10x10': ('Herz', (102, 102), {K: ['GT-SK-HR-102X102']}, (K, 'GT-SK-HR-102X102'), 'kh10'),
    'herz-kordel-225x267': ('Herz', (227, 271.1), {K: ['GT-SK-HR-227X271P1']}, (K, 'GT-SK-HR-227X271P1'), 'kh22'),
    'rechteck-2-3': ('Rechteck', (200, 300), {N: ['GT-SN-RE-200X300'], P: ['GT-SP-RE-200X300']}, (N, 'GT-SN-RE-200X300'), 'n20x30'),
    'rechteck-3-4': ('Rechteck', (150, 200), {P: ['GT-SP-RE-150X200', 'GT-SP-RE-300X400']}, (P, 'GT-SP-RE-150X200'), 'p15x20'),
    'herz': ('Herz', (200, 200), {N: ['GT-SN-HR-102X102', 'GT-SN-HR-200X200', 'GT-SN-HR-250X250']}, (N, 'GT-SN-HR-200X200'), 'h20'),
    'herz-geschnitten-24x19': ('Herz', (240, 192), {G: ['GT-SG-HR-240X192']}, (G, 'GT-SG-HR-240X192'), 'hg24'),
    'herz-schief': ('Herz schief', (182.2, 133.1), {G: ['GT-SG-HS-182P2X133P1', 'GT-SG-HS-259P4X189P6']}, (G, 'GT-SG-HS-182P2X133P1'), 'hs18'),
}
# Türschild-Aufträge: Zielreihe ← Reihe aus schiefer-tuerschilder-*, Kennungsvorsatz, nur Herz-Themen?
TS = {
    't-n20x30': ('rechteck-2-3', 'qu-200x200', 'TRE', False),
    't-p15x20': ('rechteck-3-4', 'qu-200x200', 'TRE', False),
    't-h20': ('herz', 'qu-200x200', 'TH', True),
    't-hg24': ('herz-geschnitten-24x19', 'qu-200x200', 'THG', True),
    't-hs18': ('herz-schief', 're-400x300', 'THS', True),
    't-k20x10': ('kordel-rechteck-20x10', 're-400x200', 'TK', False),
    't-k30x10': ('kordel-rechteck-30x10', 're-300x100', 'TK', False),
    't-k22x14': ('kordel-rechteck-22x14', 're-220x140', 'TK', False),
    't-k20x25': ('kordel-rechteck-20x25', 'qu-200x200', 'TK', False),
    't-k25x20': ('kordel-rechteck-25x20', 're-400x300', 'TK', False),
    't-k30x20': ('kordel-rechteck-30x20', 're-150x100', 'TK', False),
    't-kqu20': ('kordel-quadrat-20x20', 'qu-200x200', 'TK', False),
    't-kh10': ('kordel-herz-10x10', 'qu-200x200', 'TKH', True),
    't-kh22': ('herz-kordel-225x267', 'qu-200x200', 'TKH', True),
}
HERZ_OK = {'familienschilder', 'namensschilder', 'willkommensschilder', 'hochzeitsschilder', 'andenkenschilder'}
HERZ_NEIN = {'hausnummern', 'hundeschilder', 'katzenschilder'}
UK = [('hausnummern', 'Hausnummern'), ('hochzeitsschilder', 'Hochzeit'), ('andenkenschilder', 'Andenken'), ('hundeschilder', 'Hundeschilder'),
      ('katzenschilder', 'Katzenschilder'), ('willkommensschilder', 'Willkommensschilder'), ('familienschilder', 'Familienschilder'), ('namensschilder', 'Familienschilder')]


def cm(v):
    return ('%g' % (v / 10)).replace('.', ',')


def min_text(dj_path):
    import xml.etree.ElementTree as ET
    r = ET.parse(dj_path).getroot()
    sz = [float(e.get('font-size')) for e in r.iter('{http://www.w3.org/2000/svg}text') if e.get('font-size')]
    return min(sz) if sz else 99


def size_w(k):
    return float(re.search(r'-(\d+(?:P\d+)?)X', k).group(1).replace('P', '.'))


def tuer(kat, fonts, job, rep, grenze):
    ziel, quelle, pref, herz = TS[job]
    form, (W, H), targets, (mf, mk), tag = REIHEN[ziel]
    keys = [k for ks in targets.values() for k in ks]
    largest = max(size_w(k) for k in keys)
    series = 'schiefer-tuerschilder-' + ziel
    n = 0
    for sd in sorted(glob.glob(os.path.join(kat, 'designs', 'schiefer-tuerschilder-' + quelle, '*'))):
        d = json.load(open(os.path.join(sd, 'design.json'), encoding='utf-8'))
        th = set(d.get('themes') or [])
        if not d.get('designNo'):
            continue  # Rasse-Übertrag (eigener Auftrag)
        if herz and (th & HERZ_NEIN or not th & HERZ_OK):
            continue
        if n >= grenze:
            break
        nid = '%s-SCH-%sx%s-D%s' % (pref, cm(W), cm(H), d['designNo'])
        uk = next((u for t, u in UK if t in th), 'Familienschilder')
        meta = {'id': nid, 'form': form, 'formatreihe': ziel, 'sizes': keys,
                'ziele': [{'familie': f, 'freigabe': None} for f in targets],
                'katalog': {'key': '%s-D%s' % (series, d['designNo']), 'series': series, 'zielgruppe': 'Familie', 'unterkategorie': uk, 'themen': sorted(th)},
                'plate': {'widthMm': W, 'heightMm': H, 'source': 'Schiefertafel %s × %s cm (Master der Reihe)' % (cm(W), cm(H))},
                'masterSheet': {'base': '%s-SCH-%sx%s' % (pref, cm(W), cm(H)), 'key': nid, 'familySize': mk, 'plateMm': [W, H]}}
        out = os.path.join(kat, 'designs', series, nid)
        try:
            m = umsetzen(kat, fonts, sd, mf, mk, W, H, out, meta, keys_largest_w=largest, stapeln=H > 1.15 * W)
            # Größen, in denen die kleinste Schrift unter 3 mm fiele, nicht anbieten (5.5/5.27)
            mt = min_text(os.path.join(out, 'design.svg'))
            ok_keys = [k for k in keys if mt * size_w(k) / W >= 2.95]
            if ok_keys != keys:
                jp = os.path.join(out, 'design.json')
                dj = json.load(open(jp, encoding='utf-8'))
                dj['sizes'] = ok_keys
                dj['ziele'] = [z for z in dj['ziele'] if any(k in targets[z['familie']] for k in ok_keys)]
                json.dump(dj, open(jp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            rep.append({'job': job, 'id': nid, 'von': d['id'], 'ok': True, 'grow': round(m['grow'], 2), 'fw': round(m['fw'], 2), 'fh': round(m['fh'], 2), 'sizes': len(ok_keys)})
            n += 1
        except Exception as e:
            rep.append({'job': job, 'von': d['id'], 'ok': False, 'fehler': str(e)[:150]})
# Türschild-Reihen aus #178 (Ordnername, formatreihe, Form, Master, Familien→Größen, Masterschlüssel)
TR178 = {
    're-150x100': ('rechteck-3-2', 'Rechteck', (150, 100), {N: ['GT-SN-RE-150X100', 'GT-SN-RE-300X200'], P: ['GT-SP-RE-300X200']}, (N, 'GT-SN-RE-150X100')),
    're-220x140': ('rechteck-220x140', 'Rechteck', (220, 140), {N: ['GT-SN-RE-220X140']}, (N, 'GT-SN-RE-220X140')),
    're-400x300': ('rechteck-4-3', 'Rechteck', (400, 300), {N: ['GT-SN-RE-400X300'], P: ['GT-SP-RE-200X150', 'GT-SP-RE-400X300']}, (N, 'GT-SN-RE-400X300')),
    're-300x100': ('rechteck-3-1', 'Rechteck', (300, 100), {N: ['GT-SN-RE-300X100']}, (N, 'GT-SN-RE-300X100')),
    're-380x130': ('rechteck-3-1', 'Rechteck', (380, 130), {N: ['GT-SN-RE-380X130']}, (N, 'GT-SN-RE-380X130')),
    're-560x180': ('rechteck-3-1', 'Rechteck', (560, 180), {N: ['GT-SN-RE-560X180']}, (N, 'GT-SN-RE-560X180')),
    're-400x200': ('rechteck-2-1', 'Rechteck', (400, 200), {N: ['GT-SN-RE-400X200', 'GT-SN-RE-600X300']}, (N, 'GT-SN-RE-400X200')),
    'qu-200x200': ('quadrat', 'Quadrat', (200, 200), {N: ['GT-SN-QU-100X100', 'GT-SN-QU-130X130', 'GT-SN-QU-160X160', 'GT-SN-QU-200X200', 'GT-SN-QU-220X220', 'GT-SN-QU-250X250', 'GT-SN-QU-300X300']}, (N, 'GT-SN-QU-200X200')),
    'rund-200': ('rund', 'Rund', (200, 200), {N: ['GT-SN-R-200X200', 'GT-SN-R-220X220', 'GT-SN-R-280X280', 'GT-SN-R-355X355']}, (N, 'GT-SN-R-200X200')),
}
PREF = {'Rechteck': 'TRE', 'Quadrat': 'TQ', 'Rund': 'TR'}


def rasse(kat, fonts, tier, anzahl, rep):
    """Hunde-/Katzen-Türschilder aus freigegebenen Rasse-Designs 15×10 (je Rasse eines, Register 4.37/4.66)."""
    thema = 'hundeschilder' if tier == 'dog' else 'katzenschilder'
    src = []
    seen = set()
    for sd in sorted(glob.glob(os.path.join(kat, 'designs', 'rasse-schilder-re-150x100', '*'))):
        jp = os.path.join(sd, 'design.json')
        if not os.path.exists(jp):
            continue
        d = json.load(open(jp, encoding='utf-8'))
        r = d.get('rasseReview') or {}
        ok = any((z.get('freigabe') or {}).get('status') == 'freigegeben' for z in d.get('ziele') or [])
        if r.get('animal') != tier or not ok or r.get('breed') in seen:
            continue
        seen.add(r.get('breed'))
        src.append((sd, d))
        if len(src) >= anzahl:
            break
    ziele = [(k, v) for k, v in TR178.items()] + [(z, None) for z in ('rechteck-2-3', 'rechteck-3-4', 'kordel-rechteck-20x10', 'kordel-rechteck-30x10',
                                                                       'kordel-rechteck-22x14', 'kordel-rechteck-20x25', 'kordel-rechteck-25x20', 'kordel-rechteck-30x20', 'kordel-quadrat-20x20')]
    for name, spec in ziele:
        if spec:
            fr, form, (W, H), targets, (mf, mk) = spec
            series = 'schiefer-tuerschilder-' + name
        else:
            form, (W, H), targets, (mf, mk), tag = REIHEN[name]
            fr, series = name, 'schiefer-tuerschilder-' + name
        keys = [k for ks in targets.values() for k in ks]
        largest = max(size_w(k) for k in keys)
        pref = ('TK' if fr.startswith('kordel') else PREF.get(form, 'TRE'))
        for sd, d in src:
            no = d['id'].split('-D')[-1]
            nid = '%s-SCH-%sx%s-R%s' % (pref, cm(W), cm(H), no)
            meta = {'id': nid, 'material': 'Schiefer', 'form': form, 'formatreihe': fr, 'sizes': keys,
                    'ziele': [{'familie': f, 'freigabe': None} for f in targets],
                    'katalog': {'key': '%s-R%s' % (series, no), 'series': series, 'zielgruppe': 'Familie', 'unterkategorie': 'Hundeschilder' if tier == 'dog' else 'Katzenschilder', 'themen': [thema]},
                    'plate': {'widthMm': W, 'heightMm': H, 'source': 'Schiefertafel %s × %s cm (Master der Reihe)' % (cm(W), cm(H))},
                    'source': 'Rasse-Design %s (rasse-schilder-re-150x100, freigegeben); gleiche Schriften, Texte und Motiv, auf Schiefer %s × %s mm gesetzt' % (d['id'], cm(W), cm(H)),
                    'varianteVon': d['id']}
            out = os.path.join(kat, 'designs', series, nid)
            try:
                m = umsetzen(kat, fonts, sd, mf, mk, W, H, out, meta, keys_largest_w=largest, stapeln=H > 1.15 * W)
                rep.append({'job': 'rasse-' + tier, 'id': nid, 'ok': True, 'grow': round(m['grow'], 2)})
            except Exception as e:
                rep.append({'job': 'rasse-' + tier, 'von': d['id'], 'ziel': name, 'ok': False, 'fehler': str(e)[:150]})


def rahmen_weg(path, fonts):
    """Motiv/Deko, das ein Fotofenster umrahmt (Ring, Rahmenecken), entfernen – sonst landet es im Kreuzstamm."""
    from aelib import read_design
    D = read_design(path, fonts)
    win = [it.bbox for it in D['items'] if it.kind == 'foto']
    n = 0
    for it in D['items']:
        if it.kind not in ('motiv', 'deko') or not win:
            continue
        b = it.bbox
        for w in win:
            ix = max(0, min(b[2], w[2]) - max(b[0], w[0])) * max(0, min(b[3], w[3]) - max(b[1], w[1]))
            if ix > 0.6 * (w[2] - w[0]) * (w[3] - w[1]):
                it.node.getparent().remove(it.node)
                n += 1
                break
    if n:
        D['tree'].write(path, encoding='utf-8', xml_declaration=False)


def kreuz_job(kat, fonts, quellen, rep):
    """Kreuz 21,5 × 30 (Register 4.33 „Kreuz auch bei Tieren“): Quelle Hochformat 2:3, dann Hausstil §8 (kreuz.py)."""
    import kreuz
    for qs in quellen:
        pre = qs.rsplit('-rechteck-2-3', 1)[0]
        series = pre + '-kreuz'
        for sd in sorted(glob.glob(os.path.join(kat, 'designs', qs, '*'))):
            jp = os.path.join(sd, 'design.json')
            if not os.path.exists(jp):
                continue
            d = json.load(open(jp, encoding='utf-8'))
            if not offered(d):
                continue
            nid = d['id'].replace('rechteck-2-3', 'kreuz') if 'rechteck-2-3' in d['id'] else d['id'] + '-kr'
            out = os.path.join(kat, 'designs', series, nid)
            kat_ = dict(d.get('katalog') or {})
            kat_.update({'series': series, 'key': nid})
            meta = {'id': nid, 'form': 'Kreuz', 'formatreihe': 'kreuz', 'sizes': ['GT-SG-KR-215X300'],
                    'ziele': [{'familie': G, 'freigabe': None}], 'katalog': kat_}
            try:
                umsetzen(kat, fonts, sd, G, 'GT-SG-KR-215X300', 215, 300, out, meta, nur_rechteck=True)
                rahmen_weg(os.path.join(out, 'design.svg'), fonts)
                log = []
                D = kreuz.build(os.path.join(out, 'design.svg'), fonts, log)
                if D is None:
                    raise ValueError('kein Name')
                D['tree'].write(os.path.join(out, 'design.svg'), encoding='utf-8', xml_declaration=False)
                rep.append({'job': 'kreuz', 'id': nid, 'ok': True, 'log': [l[1] for l in log]})
            except Exception as e:
                import shutil
                shutil.rmtree(out, ignore_errors=True)
                rep.append({'job': 'kreuz', 'von': d['id'], 'ok': False, 'fehler': str(e)[:150]})


GEDENK_REIHEN = {
    'rechteck-3-2': ('Rechteck', (150, 100), {N: ['GT-SN-RE-150X100', 'GT-SN-RE-300X200'], P: ['GT-SP-RE-300X200']}, (N, 'GT-SN-RE-150X100')),
    'rechteck-3-1': ('Rechteck', (300, 100), {N: ['GT-SN-RE-300X100', 'GT-SN-RE-380X130', 'GT-SN-RE-560X180']}, (N, 'GT-SN-RE-300X100')),
    'rechteck-2-1': ('Rechteck', (400, 200), {N: ['GT-SN-RE-400X200', 'GT-SN-RE-600X300']}, (N, 'GT-SN-RE-400X200')),
    'rechteck-4-3': ('Rechteck', (400, 300), {N: ['GT-SN-RE-400X300'], P: ['GT-SP-RE-200X150', 'GT-SP-RE-400X300']}, (N, 'GT-SN-RE-400X300')),
    'quadrat': ('Quadrat', (200, 200), {N: ['GT-SN-QU-100X100', 'GT-SN-QU-130X130', 'GT-SN-QU-160X160', 'GT-SN-QU-200X200', 'GT-SN-QU-220X220', 'GT-SN-QU-250X250', 'GT-SN-QU-300X300']}, (N, 'GT-SN-QU-200X200')),
    'rund': ('Rund', (200, 200), {N: ['GT-SN-R-200X200', 'GT-SN-R-220X220', 'GT-SN-R-280X280', 'GT-SN-R-355X355']}, (N, 'GT-SN-R-200X200')),
    'stern': ('Stern', (200, 190.6), {G: ['GT-SG-ST-200X190P6']}, (G, 'GT-SG-ST-200X190P6')),
}
for _k, _v in GEDENK_REIHEN.items():
    REIHEN.setdefault(_k, _v + ('x',))


def neu_job(kat, fonts, master_root, gruppe, rep):
    """Neue Konzepte (komponieren.py) auf alle Reihen ihrer Zielgruppe umsetzen."""
    from konzepte import GRUPPEN
    liste, meta0 = GRUPPEN[gruppe]
    sk = gruppe.startswith('sternenkinder')
    if sk:
        reihen = ['rechteck-3-2', 'rechteck-3-1', 'rechteck-2-1', 'rechteck-4-3', 'rechteck-2-3', 'rechteck-3-4', 'quadrat', 'rund', 'herz',
                  'herz-geschnitten-24x19', 'herz-schief', 'stern', 'kordel-herz-10x10', 'herz-kordel-225x267', 'kordel-rechteck-20x10',
                  'kordel-rechteck-20x25', 'kordel-rechteck-25x20', 'kordel-rechteck-30x10', 'kordel-rechteck-22x14', 'kordel-rechteck-30x20',
                  'kordel-quadrat-20x20', 'rechteck-220x140']
    else:
        reihen = [v[0] if v[0] in REIHEN or v[0] in GEDENK_REIHEN else None for v in TR178.values()]
        reihen = list(TR178) + ['rechteck-2-3', 'rechteck-3-4', 'kordel-rechteck-20x10', 'kordel-rechteck-30x10', 'kordel-rechteck-22x14',
                                'kordel-rechteck-20x25', 'kordel-rechteck-25x20', 'kordel-rechteck-30x20', 'kordel-quadrat-20x20']
        if gruppe != 'hausnummern':
            reihen += ['herz', 'herz-geschnitten-24x19', 'herz-schief', 'kordel-herz-10x10', 'herz-kordel-225x267']
    nur = set(filter(None, os.environ.get('NUR_KONZEPTE', '').split(',')))
    for cid, name, motiv, layout, rows in liste:
        if nur and cid not in nur:
            continue
        for foto in ([False] if not meta0.get('nurFoto') else [True]):  # Sternenkinder nur ohne Foto (Chris 04.11. 15:00)
            for r in reihen:
                if r in TR178:
                    fr, form, (W, H), targets, (mf, mk) = TR178[r]
                    series = 'schiefer-tuerschilder-' + r
                else:
                    form, (W, H), targets, (mf, mk) = REIHEN[r][:4]
                    fr = r
                    series = ('schiefer-sternenkinder-' if sk else 'schiefer-tuerschilder-') + r
                if foto:
                    targets = {f: k for f, k in targets.items() if f != P}
                    if not targets:
                        continue
                    if mf == P:
                        mf, mk = next(iter(targets.items()))[0], next(iter(targets.values()))[0]
                keys = [k for ks in targets.values() for k in ks]
                quer = W / H >= 1.25
                var = ('quer' if quer else 'quadrat') + ('-foto' if foto else '')
                src = os.path.join(master_root, var, 'neu-%s-%s%s' % (cid.lower(), var.split('-')[0], '-mf' if foto else ''))
                if sk:
                    nid = 'sternenkinder-neu-%s-%s%s' % (cid.lower(), r, '-mf' if foto else '')
                else:
                    pref = 'TK' if fr.startswith('kordel') else ('TKH' if 'kordel' in fr else ('TH' if fr == 'herz' else 'THG' if fr == 'herz-geschnitten-24x19' else 'THS' if fr == 'herz-schief' else PREF.get(form, 'TRE')))
                    nid = '%s-SCH-%sx%s-N%s' % (pref, cm(W), cm(H), cid)
                kat_ = {'series': series, 'key': nid, 'zielgruppe': meta0['zielgruppe'], 'unterkategorie': meta0['unterkategorie'], 'themen': meta0['themes']}
                meta = {'id': nid, 'form': form, 'formatreihe': fr, 'sizes': keys, 'themes': meta0['themes'],
                        'ziele': [{'familie': f, 'freigabe': None} for f in targets], 'katalog': kat_, 'konzept': cid}
                if sk:
                    meta.update({'withPhoto': foto, 'section': 'Mit Foto' if foto else 'Ohne Foto', 'targetGroup': 'sternenkinder'})
                out = os.path.join(os.environ.get('OUT_KAT', kat), 'designs', series, nid)
                largest = max(size_w(k) for k in keys)
                try:
                    m = umsetzen(kat, fonts, src, mf, mk, W, H, out, meta, keys_largest_w=largest, stapeln=H > 1.15 * W)
                    rep.append({'job': 'neu-' + gruppe, 'id': nid, 'ok': True, 'grow': round(m['grow'], 2)})
                except Exception as e:
                    import shutil
                    shutil.rmtree(out, ignore_errors=True)
                    rep.append({'job': 'neu-' + gruppe, 'id': nid, 'ok': False, 'fehler': str(e)[:150]})


# Auftrag: Zielreihe ← Quell-Formatreihe(n) der Gedenk-Serien
AUFTRAEGE = {
    'g-n22x14': ('rechteck-220x140', ['rechteck-3-2']),
    'g-k30x10': ('kordel-rechteck-30x10', ['rechteck-3-1']),
    'g-k22x14': ('kordel-rechteck-22x14', ['rechteck-3-2']),
    'g-k30x20': ('kordel-rechteck-30x20', ['rechteck-3-2']),
    'g-kqu20': ('kordel-quadrat-20x20', ['quadrat']),
}


def offered(d):
    return bool(d.get('ziele')) and not d.get('nichtAngeboten') and not (d.get('review') or {}).get('nichtAngeboten')


def main():
    kat = sys.argv[1]
    jobs = sys.argv[2].split(',')
    grenze = int(sys.argv[sys.argv.index('--grenze') + 1]) if '--grenze' in sys.argv else 10 ** 9
    fonts = Fonts(kat)
    rep = []
    for job in jobs:
        if job in TS:
            tuer(kat, fonts, job, rep, grenze)
            continue
        if job.startswith('neu-'):
            neu_job(kat, fonts, os.environ.get('NEU_MASTER'), job[4:], rep)
            continue
        if job == 'stern-of':
            # Stern (4.65 auch Tiere): Hund/Katze ohne Foto aus den abgeleiteten Quadrat-Mastern
            for sd in sorted(glob.glob(os.path.join(kat, 'designs', 'schiefer-tiere-quadrat', '*-of'))):
                d = json.load(open(os.path.join(sd, 'design.json'), encoding='utf-8'))
                nid = d['id'].replace('quadrat', 'stern')
                series = 'schiefer-tiere-stern'
                kat_ = dict(d.get('katalog') or {})
                kat_.update({'series': series, 'key': nid})
                meta = {'id': nid, 'form': 'Stern', 'formatreihe': 'stern', 'sizes': ['GT-SG-ST-200X190P6'],
                        'ziele': [{'familie': G, 'freigabe': None}], 'katalog': kat_}
                try:
                    m = umsetzen(kat, fonts, sd, G, 'GT-SG-ST-200X190P6', 200, 190.6, os.path.join(kat, 'designs', series, nid), meta)
                    rep.append({'job': job, 'id': nid, 'ok': True, 'grow': round(m['grow'], 2)})
                except Exception as e:
                    rep.append({'job': job, 'von': d['id'], 'ok': False, 'fehler': str(e)[:150]})
            continue
        if job == 'kreuz':
            kreuz_job(kat, fonts, ['schiefer-tiere-rechteck-2-3', 'schiefer-sternenkinder-rechteck-2-3'], rep)
            continue
        if job.startswith('rasse-'):
            _, tier, anz = job.split('-')
            rasse(kat, fonts, tier, int(anz), rep)
            continue
        ziel, quellen = AUFTRAEGE[job]
        form, (W, H), targets, (mf, mk), tag = REIHEN[ziel]
        keys = [k for ks in targets.values() for k in ks]
        largest = max(float(re.search(r'-(\d+(?:P\d+)?)X', k).group(1).replace('P', '.')) for k in keys)
        n = 0
        for pre in GEDENK:
            for q in quellen:
                for sd in sorted(glob.glob(os.path.join(kat, 'designs', '%s-%s' % (pre, q), '*'))):
                    jp = os.path.join(sd, 'design.json')
                    if not os.path.exists(jp):
                        continue
                    d = json.load(open(jp, encoding='utf-8'))
                    if not offered(d) or n >= grenze:
                        continue
                    series = '%s-%s' % (pre, ziel)
                    nid = '%s-%s' % (d['id'], tag)
                    kat_ = dict(d.get('katalog') or {})
                    kat_.update({'series': series, 'key': nid})
                    meta = {'id': nid, 'form': form, 'formatreihe': ziel, 'sizes': keys,
                            'ziele': [{'familie': f, 'freigabe': None} for f in targets], 'katalog': kat_}
                    try:
                        m = umsetzen(kat, fonts, sd, mf, mk, W, H, os.path.join(kat, 'designs', series, nid), meta,
                                     keys_largest_w=largest)
                        rep.append({'job': job, 'id': nid, 'von': d['id'], 'ok': True, 'grow': round(m['grow'], 2), 'fw': round(m['fw'], 2), 'fh': round(m['fh'], 2)})
                        n += 1
                    except Exception as e:
                        rep.append({'job': job, 'von': d['id'], 'ok': False, 'fehler': str(e)[:150]})
    for r in rep:
        print(json.dumps(r, ensure_ascii=False))
    c = collections.Counter((r['job'], r['ok']) for r in rep)
    print(dict(c), file=sys.stderr)


if __name__ == '__main__':
    main()
