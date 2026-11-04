"""Korrekturen aus #128 (Operator 2, 02.11.2026) an Mikas Schiefer-Menschen-Mastern – alle Formen außer Kreuz.

1. Textfehler (Teil 1) je MEM-Schlüssel.
2. Datum (A2/A3/A12): nie mitten im Datum umbrechen; „*Geburt“ / „† Tod“ bzw. einzeilig; „†“ vor das Sterbedatum.
3. Rangfolge (A1): Spruch höchstens 62 % der Versalhöhe des Namens (nicht unter 3 mm Versalhöhe).
4. A6/MEM-036: verwaiste Haarlinien neben der Rose entfernen.
5. Motiv-Abstand (A11): mindestens 3 mm Luft zwischen Motiv und Text, sonst Motiv um seine Mitte verkleinern (bis 75 %).
6. Dubletten (A8/A9) und schwache Sternenkinder-Ringe (A15/A16): Ziele leeren = nicht angeboten.
7. Doppelte Beispielnamen im selben Produkt: neue, erfundene Namen.
Aufruf: python3 korrektur.py <katalog>  → schreibt SVG/JSON, Bericht nach stdout (JSON-Zeilen).
"""
import sys, os, glob, json, re
from aelib import Fonts, read_design, union
from svgedit import cap_mm, set_text, ink, move_shapes, remove, visual_mm

TYPO = {
    None: [('Dein !', 'Dein!')],
    '109': [('leibst', 'bleibst')],
    '121': [('† 15.10.1950 - 14.04.2020', '* 15.10.1950 – † 14.04.2020')],
    '122': [('Jahre In', 'Jahre in'), ('Jahren. *', 'Jahren.')],
    '124': [('Bleibt!', 'bleibt!')],
    '138': [('In unseres', 'In unserem')],
    '379': [('Weiteren', 'weiteren')],
    '047': [('08.Juni.1922', '08. Juni 1922')],
    '152': [('unerwartet,-', 'unerwartet –')],
    '116': [('unbegreiflichen', 'Unbegreiflichen')],
    '141': [('unbegreiflichen', 'Unbegreiflichen')],
    '087': [('kostbarem', 'Kostbarem'), ('ewigem', 'Ewigem')],
    '342': [('Paar Tagen', 'paar Tagen')],
    '338': [('Anna - Lena', 'Anna-Lena')],
    '366': [('Anne- Marie', 'Anne-Marie')],
    '103': [('Freude ist der Tag', 'Freude ist der Tag,'), ('Trauer die Nacht', 'Trauer die Nacht.'),
            ('Leben ist unendlich', 'Leben ist unendlich,'), ('Es verändert nur die Form', 'es verändert nur die Form.')],
    '044': [('Ich bin gegangen die', 'Ich bin gegangen, die')],
    '114': [('Träumen', 'Träumen,'), ('Gedanken', 'Gedanken,')],
}
LINE_END = {'374': [('Lebens', 'Lebens.')]}
# Dubletten/Schwache: nicht anbieten (eines je Paar bleibt)
NICHT = {'377': 'Fast-Dublette zu MEM-376 (A8)', '148': 'Fast-Dublette zu MEM-142/143 (A9)', '119': 'Fast-Dublette zu MEM-091 (A9, Teil 1)',
         '353': 'Fast-Dublette zu MEM-352 (A9)', '115': 'Fast-Dublette zu MEM-112 (A9)', '378': 'leerer Mond-Ring wie zweites Fotofeld (A15)',
         '372': 'Ring-Gruppe außermittig, Foto zu klein (A16); Maja 4× (Teil 1)',
         '338': 'Mini-Schrift in großen Zeilen (A7)'}
# Doppelte Beispielnamen: zweite und weitere bekommen eigene Namen (gleiche Länge ±2 Zeichen)
RENAME = {'113': ('Elisabeth Meyer', 'Gisela Brenner'), '091': ('Klaus Herrmann', 'Werner Lindner'),
          '108': ('Julia Bayer', 'Sabine Kort'), '125': ('Thomas Wolf', 'Peter Lange'), '140': ('Ursula Böhnke', 'Renate Vogt'),
          '143': ('Barbara Nolte', 'Monika Seidel'), '373': ('Maja', 'Lea'), '376': ('Maja', 'Ida'),
          '135': ('Noah', 'Ben'), '352': ('Paul Neumann', 'Finn Albers')}
SPRUCH_MAX = 0.62
MOTIV_GAP = 3.0


def key_of(did):
    m = re.search(r'mem-(\d{3})', did)
    return m.group(1) if m else None


def apply_text(it, pairs, line_end=()):
    changed = False
    lines = list(it.lines)
    joined = '\n'.join(lines)
    for a, b in pairs:
        if a in joined and b not in joined:
            joined = joined.replace(a, b)
            changed = True
    lines = joined.split('\n')
    for a, b in line_end:
        lines2 = [(l[:-len(a)] + b) if l.rstrip().endswith(a) else l for l in lines]
        if lines2 != lines:
            lines, changed = lines2, True
    return lines, changed


def split_date(t):
    t = re.sub(r'\s+', ' ', t).strip()
    if t.endswith('†'):  # „… 01.09.2017 †“ → † vor das Sterbedatum
        t = t[:-1].strip()
        m = re.search(r'(\d{1,2}\.\s?\d{1,2}\.\s?\d{4}|\d{4})\s*$', t)
        if m:
            t = t[:m.start()] + '† ' + m.group(1)
    t = re.sub(r'\s*[-–]\s*†', ' – †', t)
    t = re.sub(r'(\d)\s*-\s*(\d)', r'\1 – \2', t)
    t = re.sub(r'(\d)-\s', r'\1 – ', t)
    if '†' in t:
        i = t.index('†')
        a, b = t[:i].strip().rstrip('–-').strip(), t[i:].replace('† ', '†').replace('†', '† ', 1).strip()
        return [a, b] if a else [b]
    if 'gestorben' in t:
        i = t.index('gestorben')
        return [t[:i].strip(), t[i:].strip()]
    return [t]


def maximize(path, fonts):
    from aelayout import plan_layout
    from aelib import path_points, path_abs
    from svgedit import apply_tr
    D = read_design(path, fonts)
    W, H = D['W'], D['H']
    ak = D['root'].find('.//*[@id="aussenkontur"]')
    d = ak.get('d') if ak is not None else ''
    form = os.path.basename(os.path.dirname(os.path.dirname(path)))
    if form.endswith('-rund'):
        shape, poly, edge, caps = 'ellipse', None, 3.0, (0.80, 0.72)
    elif re.search(r'(rechteck|quadrat)', form):
        shape, poly, edge, caps = 'rect', None, None, (0.88, 0.80)
    else:
        return None  # Herz/Stern: optische Mitte liegt nicht in der Box-Mitte – Lage bleibt wie geprüft
    tr, m = plan_layout(D, W, H, shape, caps, contour=poly, edge_margin=edge, gmax=1.25)
    if abs(m['scale'] - 1) < 0.02 and abs(m['cx']) < 0.01 and abs(m['cy']) < 0.01:
        return None
    if m['scale'] < 0.97:
        return None  # nie verkleinern
    apply_tr(D, tr, fonts)
    D['tree'].write(path, encoding='utf-8', xml_declaration=False)
    return 'Gruppe mittig ×%.2f (Fläche %.0f %%)' % (m['scale'], m['fa'] * 100)


def fix(path, fonts, rep):
    did = os.path.basename(os.path.dirname(path))
    k = key_of(did)
    D = read_design(path, fonts)
    items = D['items']
    texts = [i for i in items if i.kind == 'text']
    W, H = D['W'], D['H']
    notes = []
    # 1. Textfehler
    pairs = TYPO.get(None, []) + TYPO.get(k, [])
    if k in RENAME:
        pairs = pairs + [RENAME[k]]
    for it in texts:
        lines, ch = apply_text(it, pairs, LINE_END.get(k, ()))
        if ch and not all(fonts.has(it.font, c) for c in ''.join(lines) if not c.isspace()):
            lines = [l.replace('–', '-') for l in lines]
        if ch:
            top = it.bbox[1]
            cx = (it.bbox[0] + it.bbox[2]) / 2 if it.anchor == 'middle' else it.x
            nb = set_text(fonts, it, lines, it.size, cx, top, it.line_h, it.anchor)
            it.lines, it.bbox = lines, nb
            notes.append('Text: ' + ' / '.join(lines)[:60])
    kreuz = '/schiefer-menschen-kreuz/' in path
    # 2. Datum
    daten = [i for i in texts if (i.feld or '').startswith('daten')]
    if daten and not kreuz:
        d0 = daten[0]
        raw = ' '.join(' '.join(i.lines) for i in daten)
        parts = split_date(raw)
        b0 = union([i.bbox for i in daten])
        cx, cy = (b0[0] + b0[2]) / 2, (b0[1] + b0[3]) / 2
        orig_multi = len(daten) > 1 or len(d0.lines) > 1
        new = parts if orig_multi else [' '.join(parts)]
        if orig_multi and len(new) == 1 and ' – ' in new[0] and ink(fonts, d0, new, d0.size)[0] > max(1.25 * (b0[2] - b0[0]), 0.5 * W):
            a_, b_ = new[0].split(' – ', 1)
            new = [a_ + ' –', b_]
        if not all(fonts.has(d0.font, ch) for ch in ''.join(new) if not ch.isspace()):
            new = [l.replace('–', '-') for l in new]
        if not all(fonts.has(d0.font, ch) for ch in ''.join(new) if not ch.isspace()):
            notes.append('Datum unverändert (Zeichen fehlt in Schrift)')
            new = d0.lines if len(daten) == 1 else None
        if new is not None and (new != d0.lines or len(daten) > 1):
            for extra in daten[1:]:
                remove(extra)
                items.remove(extra)
            size = d0.size
            w, h = ink(fonts, d0, new, size)
            ax = cx if d0.anchor == 'middle' else d0.x
            nb = set_text(fonts, d0, new, size, ax, cy - h / 2, d0.line_h if len(d0.lines) > 1 else size * 1.25, d0.anchor)
            d0.lines, d0.bbox = new, nb
            notes.append('Datum: ' + ' / '.join(new))
    # 3. Rangfolge Name > Spruch (optische Größe = Median der Glyphenhöhen)
    name = [i for i in texts if (i.feld or '').startswith('name') or (i.feld or '').startswith('titel')]
    spruch = [i for i in texts if (i.feld or '').startswith('spruch')]
    if name and spruch and not kreuz:
        nv = max(visual_mm(fonts, i) for i in name)
        sv = max(visual_mm(fonts, i) for i in spruch)
        if sv > 0.70 * nv:
            scap = max(cap_mm(fonts, i) for i in spruch)
            f = max(0.75 if sv / nv < 1.3 else 0.65, 3.0 / scap)  # wie die Prüfung #128: Spruch ca. 25–35 % kleiner
            if f < 0.98:
                g = union([i.bbox for i in spruch])
                gx, gy = (g[0] + g[2]) / 2, (g[1] + g[3]) / 2
                for i in spruch:
                    c = ((i.bbox[0] + i.bbox[2]) / 2, (i.bbox[1] + i.bbox[3]) / 2)
                    ns = i.size * f
                    w, h = ink(fonts, i, i.lines, ns, i.line_h * f)
                    ncx, ncy = gx + (c[0] - gx) * f, gy + (c[1] - gy) * f
                    ax = ncx if i.anchor == 'middle' else gx + (i.x - gx) * f
                    i.bbox = set_text(fonts, i, i.lines, ns, ax, ncy - h / 2, i.line_h * f, i.anchor)
                    i.size = ns
                notes.append('Spruch %.0f %% (Rangfolge %.2f)' % (f * 100, sv / nv))
            sv2 = max(visual_mm(fonts, i) for i in spruch)
            rect = D['root'].find('.//*[@id="aussenkontur"]') is not None and re.match(r'^\s*M\s*0', D['root'].find('.//*[@id="aussenkontur"]').get('d') or '') and 'H' in (D['root'].find('.//*[@id="aussenkontur"]').get('d') or '')
            if sv2 > 0.75 * nv and rect and len(name) == 1:
                # Name vergrößern, solange nichts kollidiert und alles 4 mm vom Rand bleibt
                n0 = name[0]
                others = [i.bbox for i in items if i is not n0 and i.bbox]
                want = min(sv2 / 0.70 / nv, 1.45)
                fn = want
                while fn > 1.04:
                    ns = n0.size * fn
                    w, h = ink(fonts, n0, n0.lines, ns, n0.line_h * fn)
                    b = n0.bbox
                    cx = (b[0] + b[2]) / 2 if n0.anchor == 'middle' else n0.x
                    cy = (b[1] + b[3]) / 2
                    if n0.anchor == 'middle':
                        nb = (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
                    elif n0.anchor == 'start':
                        nb = (cx, cy - h / 2, cx + w, cy + h / 2)
                    else:
                        nb = (cx - w, cy - h / 2, cx, cy + h / 2)
                    inside = nb[0] >= 4 and nb[1] >= 4 and nb[2] <= W - 4 and nb[3] <= H - 4
                    free = all(nb[2] + 2 <= o[0] or o[2] + 2 <= nb[0] or nb[3] + 2 <= o[1] or o[3] + 2 <= nb[1] for o in others)
                    if inside and free:
                        n0.bbox = set_text(fonts, n0, n0.lines, ns, cx, nb[1], n0.line_h * fn, n0.anchor)
                        notes.append('Name %.0f %% größer' % ((fn - 1) * 100))
                        break
                    fn *= 0.97
                else:
                    notes.append('Rangfolge: Name nicht vergrößerbar (Platz)')
    # 4. MEM-036 Haarlinien
    if k == '036' and not kreuz:
        for m in [i for i in items if i.kind in ('motiv', 'deko')]:
            b = m.bbox
            if (b[3] - b[1]) < 1.2 and (b[2] - b[0]) > 4:
                remove(m)
                items.remove(m)
                notes.append('Haarlinie entfernt')
    if k == '090':
        mm = {i.id: i for i in items if i.kind in ('motiv', 'deko')}
        if 'motiv-1' in mm and 'motiv-2' in mm:
            remove(mm['motiv-2'])
            items.remove(mm['motiv-2'])
            notes.append('Doppelkontur (Geisterkreuz) entfernt')
    # 5. Motiv-Abstand
    tboxes = [i.bbox for i in items if i.kind == 'text' and i.bbox]
    for m in ([] if kreuz else [i for i in items if i.kind in ('motiv', 'deko')]):
        b = m.bbox
        if (b[3] - b[1]) < 1.5 or (b[2] - b[0]) < 1.5:
            continue

        def gap(bb):
            g = 1e9
            for t in tboxes:
                dx = max(t[0] - bb[2], bb[0] - t[2], 0)
                dy = max(t[1] - bb[3], bb[1] - t[3], 0)
                g = min(g, (dx * dx + dy * dy) ** .5 if dx and dy else max(dx, dy))
            return g
        g0 = gap(b)
        if g0 >= MOTIV_GAP or g0 == 0:
            continue  # 0 = Motiv hinter/um Text (Rahmen, Ring) – bewusst
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        f = 1.0
        while f > 0.75:
            f *= 0.97
            nb = (cx - (cx - b[0]) * f, cy - (cy - b[1]) * f, cx + (b[2] - cx) * f, cy + (b[3] - cy) * f)
            if gap(nb) >= MOTIV_GAP:
                break
        move_shapes(m, f, cx - cx * f, cy - cy * f)
        m.bbox = nb
        notes.append('Motiv %s %.0f %% (Abstand %.1f→%.1f mm)' % (m.id, f * 100, g0, gap(nb)))
    D['tree'].write(path, encoding='utf-8', xml_declaration=False)
    # 7. Nach Verkleinerungen: Gruppe mittig und Fläche nutzen (§7), außer Kordel (feste Löcher) und Kreuz
    if not kreuz and 'kordel' not in path and any(n.startswith(('Spruch', 'Motiv', 'Haarlinie', 'Doppelkontur')) for n in notes):
        try:
            g = maximize(path, fonts)
            if g:
                notes.append(g)
        except Exception as e:
            notes.append('Gruppe nicht neu gesetzt: ' + str(e)[:60])
    # 6. Nicht anbieten
    if k in NICHT:
        jp = os.path.join(os.path.dirname(path), 'design.json')
        d = json.load(open(jp))
        if d.get('ziele'):
            d['ziele'] = []
            d.setdefault('review', {})['nichtAngeboten'] = NICHT[k] + ' – Claude 04.11.2026 nach #128'
            open(jp, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
            notes.append('nicht angeboten: ' + NICHT[k])
    # Namen auch in design.json
    if k in RENAME:
        jp = os.path.join(os.path.dirname(path), 'design.json')
        d = json.load(open(jp))
        a, b = RENAME[k]
        if d.get('name', '').startswith(a):
            d['name'] = d['name'].replace(a, b)
            open(jp, 'w').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    if notes:
        rep.append({'id': did, 'reihe': os.path.basename(os.path.dirname(os.path.dirname(path))), 'aenderungen': notes})


def main():
    K = sys.argv[1]
    only = [a for a in sys.argv[2:] if not a.startswith('--')]
    fonts = Fonts(K)
    rep, err = [], []
    for p in sorted(glob.glob(K + '/designs/schiefer-menschen-*/*/design.svg')):
        if '/schiefer-menschen-kreuz/' in p and '--kreuz' not in sys.argv:
            continue
        if '--kreuz' in sys.argv and '/schiefer-menschen-kreuz/' not in p:
            continue
        if only and not any(o in p for o in only):
            continue
        try:
            fix(p, fonts, rep)
        except Exception as e:
            err.append((p, repr(e)[:150]))
    for r in rep:
        print(json.dumps(r, ensure_ascii=False))
    for e in err:
        print('FEHLER', *e, file=sys.stderr)


if __name__ == '__main__':
    main()
