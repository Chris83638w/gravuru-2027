"""Schiefer-Kreuz 21,5 × 30 (Menschen) nach Hausstil §8 neu aufbauen.

Querbalken: Name groß (≤ 85 % Balkenbreite, Versalhöhe ≤ 42 % Balkenhöhe), Daten klein darunter (ca. 1/3 Namenshöhe, ≥ 3,5 mm).
Kopf: Foto bleibt unverändert; ohne Foto ein kurzer Titel (falls vorhanden) klein im Kopf.
Stamm: ein Motiv (alle Motivebenen als Gruppe), ca. 65 % Stammbreite. Spruch nur, wenn es kein Motiv gibt (kurz, ≤ 5 Zeilen).
Aufruf: python3 kreuz.py <katalog> [design-id ...]
"""
import sys, os, glob, json, re
from aelib import Fonts, read_design, union
from svgedit import cap_mm, set_text, ink, move_shapes, move_foto, remove, balanced_wrap
from aelib import fmt, path_transform, q

W, H = 215.0, 300.0
ARM_L, ARM_R = 75.41, 139.59          # Stamm
BAL_T, BAL_B = 74.778, 138.959        # Querbalken
M = 4.0                                # Abstand zur Kontur (Grabkreuz ≥ 2 mm, wir nehmen 4)
STEM_W = ARM_R - ARM_L
BAL_H = BAL_B - BAL_T
CX = (ARM_L + ARM_R) / 2


def norm_date(s):
    s = re.sub(r'\s+', ' ', s).strip()
    s = s.replace('* ', '*').replace('† ', '†')
    s = re.sub(r'\s*-\s*', ' – ', s) if re.search(r'\d\s*-\s*[*†\d]', s) else s
    s = re.sub(r'(\S)†', r'\1 †', s)
    return s.strip(' –')


def move_foto_full(D, f, s, tx, ty):
    """Fotoebene samt referenzierter clipPath-Pfade verschieben (nicht die Plattengrenze)."""
    import re as _re
    ids = set()
    for e in f.node.iter():
        if isinstance(e.tag, str) and e.get('clip-path'):
            m = _re.match(r'url\(#([^)]+)\)', e.get('clip-path'))
            if m and m.group(1) != 'clip-plattengrenze':
                ids.add(m.group(1))
    for cp in D['root'].iter(q('clipPath')):
        if cp.get('id') in ids:
            for e in cp.iter(q('path')):
                e.set('d', path_transform(e.get('d'), s, s, tx, ty))
    move_foto(f, s, tx, ty)


# Stammmotive, die nach Prüfung 04.11. nicht in den Stamm gehören (Hausstil §8: ein Motiv im Stamm)
KREUZ_WEG = {'122': ('motiv-1', 'leerer Ring ohne Inhalt'), '111': ('motiv-1', 'Schriftzug „In loving memory“ als Grafik, Mini-Schrift (A7)')}


def build(path, fonts, log):
    D = read_design(path, fonts)
    items = D['items']
    texts = [i for i in items if i.kind == 'text']
    name = [i for i in texts if (i.feld or '').startswith('name')]
    daten = [i for i in texts if (i.feld or '').startswith('daten')]
    spruch = [i for i in texts if (i.feld or '').startswith('spruch')]
    titel = [i for i in texts if (i.feld or '').startswith('titel')]
    motive = [i for i in items if i.kind in ('motiv', 'deko')]
    foto = [i for i in items if i.kind == 'foto']
    did = os.path.basename(os.path.dirname(path))
    if not name and titel:
        name, titel = titel[:1], titel[1:]
    if not name:
        log.append((did, 'kein Name – unverändert'))
        return None
    # --- Name: erste Namensebene bekommt alle Namen in einer Zeile (bei 2 Ebenen „A & B“ bleibt Text wie geliefert)
    n0 = name[0]
    ntext = ' '.join(' '.join(i.lines) for i in name).strip()
    for extra in name[1:]:
        remove(extra)
    # --- Daten: alles in eine Zeile (A2/A3/A12)
    dtext = norm_date(' '.join(' '.join(i.lines) for i in daten)) if daten else ''
    if daten and not all(fonts.has(daten[0].font, ch) for ch in dtext if not ch.isspace()):
        dtext = dtext.replace('–', '-')
    if daten and not all(fonts.has(daten[0].font, ch) for ch in dtext if not ch.isspace()):
        dtext = re.sub(r'\s+', ' ', ''.join(ch for ch in dtext if ch.isspace() or fonts.has(daten[0].font, ch))).strip()
        dtext = re.sub(r'(\d)\s+(\d)', r'\1 - \2', dtext)
    for extra in daten[1:]:
        remove(extra)
    top_limit = BAL_T + M
    for f in foto:
        uw = f.node.get('data-upload-window')
        if not uw:
            continue
        x, y, w, h = [float(v) for v in uw.split()]
        if y + h > BAL_T + 6:
            # Foto liegt im Querbalken: in den Kopf setzen (Hausstil: Kopf = Foto, Balken = Name + Daten)
            s = min((STEM_W - 2 * M) / w, (BAL_T - M - 3) / h, 1.6)
            nx, ny = CX - w * s / 2, M + (BAL_T - M - 3 - h * s) / 2
            tx, ty = nx - x * s, ny - y * s
            move_foto_full(D, f, s, tx, ty)
            f.node.set('data-upload-window', ' '.join(fmt(v) for v in (nx, ny, w * s, h * s)))
            log.append((did, 'Foto aus dem Balken in den Kopf gesetzt'))
    if foto:
        bottoms = []
        for f in foto:
            uw = f.node.get('data-upload-window')
            if uw:
                x, y, w, h = [float(v) for v in uw.split()]
                bottoms.append(y + h)
            else:
                bottoms.append(f.bbox[3])
        top_limit = max(top_limit, max(bottoms) + 3)
    avail_h = BAL_B - M - top_limit
    max_w = 0.85 * W
    size = n0.size
    # Name so groß wie möglich
    cap_ratio = cap_mm(fonts, n0) / n0.size
    size = min(0.42 * BAL_H / cap_ratio, 60)
    d0 = daten[0] if daten else None
    for _ in range(80):
        nw, nh = ink(fonts, n0, [ntext], size)
        dsize = 0
        dh = 0
        if d0:
            dcap_ratio = cap_mm(fonts, d0) / d0.size
            dsize = max(4.0 / dcap_ratio, size * cap_ratio / 3 / dcap_ratio)
            dw, dh = ink(fonts, d0, [dtext], dsize)
            while dw > max_w and dsize > 3.0 / dcap_ratio:
                dsize *= .95
                dw, dh = ink(fonts, d0, [dtext], dsize)
        gap = 0.18 * size * cap_ratio if d0 else 0
        if nw <= max_w and nh + gap + dh <= avail_h:
            break
        size *= 0.96
    block = nh + gap + dh
    top = top_limit + (avail_h - block) / 2
    set_text(fonts, n0, [ntext], size, W / 2, top)
    if d0:
        set_text(fonts, d0, [dtext], dsize, W / 2, top + nh + gap)
    # --- Kopf ohne Foto: kurzer Titel
    for t in titel:
        ttext = ' '.join(t.lines)
        if foto or len(ttext.split()) > 4:
            remove(t)
            continue
        ts = 6.0
        lines = balanced_wrap(ttext, 3, fonts, t, ts, STEM_W - 2 * M - 6) or [ttext]
        w, h = ink(fonts, t, lines, ts)
        set_text(fonts, t, lines, ts, CX, (BAL_T - h) / 2 + 4)
    # --- Stamm: Trennlinien (Haarlinien) und aussortierte Motive entfernen
    for m in list(motive):
        b = m.bbox
        w_, h_ = b[2] - b[0], b[3] - b[1]
        key = re.search(r'mem-(\d+)', did)
        weg = KREUZ_WEG.get(key.group(1)) if key else None
        if min(w_, h_) < 1.5 and max(w_, h_) > 10 * max(min(w_, h_), 0.01):
            remove(m); motive.remove(m)
            log.append((did, 'Trennlinie im Stamm entfernt'))
        elif weg and m.id == weg[0]:
            remove(m); motive.remove(m)
            log.append((did, 'Motiv entfernt: ' + weg[1]))
    stem_top, stem_bot = BAL_B + M + 4, H - M - 6
    if motive:
        for s in spruch:
            remove(s)
        # weit auseinanderliegende Motivteile (z. B. Flügelpaar links/rechts) zusammenrücken, Abstand höchstens 3 mm
        order = sorted(motive, key=lambda m: (m.bbox[0] + m.bbox[2]) / 2)
        shift = {}
        right = None
        acc = 0.0
        for m in order:
            left = m.bbox[0] + acc
            if right is not None and left > right + 3.0:
                acc -= left - (right + 3.0)
            shift[m.id] = acc
            right = m.bbox[2] + acc if right is None else max(right, m.bbox[2] + acc)
        boxes = [(m.bbox[0] + shift[m.id], m.bbox[1], m.bbox[2] + shift[m.id], m.bbox[3]) for m in motive]
        mb = union(boxes)
        mw, mh = mb[2] - mb[0], mb[3] - mb[1]
        s = (0.72 * STEM_W) / mw
        s = min(s, 0.62 * (stem_bot - stem_top) / mh)
        nw_, nh_ = mw * s, mh * s
        cy = stem_top + (stem_bot - stem_top) * 0.42
        tx = CX - nw_ / 2 - mb[0] * s
        ty = cy - nh_ / 2 - mb[1] * s
        for m in motive:
            move_shapes(m, s, tx + shift[m.id] * s, ty)
    elif spruch:
        stext = ' '.join(' '.join(i.lines) for i in spruch)
        for extra in spruch[1:]:
            remove(extra)
        sp = spruch[0]
        scap = cap_mm(fonts, sp) / sp.size
        ssize = min(sp.size, 5.0 / scap)
        lines = None
        while ssize * scap >= 3.0:
            lines = balanced_wrap(stext, 9, fonts, sp, ssize, STEM_W - 2 * M - 6)
            if lines:
                break
            ssize *= .95
        if not lines:
            remove(sp)
            log.append((did, 'Spruch zu lang für den Stamm – entfernt'))
        else:
            w, h = ink(fonts, sp, lines, ssize)
            set_text(fonts, sp, lines, ssize, CX, stem_top + (stem_bot - stem_top) * 0.30 - h / 2)
    return D


def main():
    K = sys.argv[1]
    ids = set(sys.argv[2:])
    fonts = Fonts(K)
    log = []
    from lxml import etree
    n = 0
    for p in sorted(glob.glob(K + '/designs/schiefer-menschen-kreuz/*/design.svg')):
        did = os.path.basename(os.path.dirname(p))
        if ids and did not in ids:
            continue
        D = build(p, fonts, log)
        if D is None:
            continue
        D['tree'].write(p, encoding='utf-8', xml_declaration=False)
        n += 1
    print(n, 'Kreuze neu aufgebaut')
    for l in log:
        print(' -', *l)


if __name__ == '__main__':
    main()
