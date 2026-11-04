"""Gestaltung verdichten: Zeilen ohne Leerraum übereinander, je Zeile mittig (einzeln=True: jede Ebene eine Zeile, für Hochformat/Herz)."""
from aelib import read_design
from svgedit import apply_tr


def kompakt(p, fonts, einzeln=False):
    """Lücken schließen: Elemente zu Zeilen (vertikal überlappend) bündeln, Zeilen ohne Leerraum übereinander
    (Abstand 0,35 × kleinere Zeilenhöhe, mind. 3 mm) und jede Zeile waagrecht auf die gemeinsame Mitte."""
    D = read_design(p, fonts)
    items = [it for it in D['items'] if it.bbox]
    items.sort(key=lambda it: (it.bbox[1] + it.bbox[3]) / 2)
    rows = []
    for it in items:
        b = it.bbox
        for row in rows:
            rb = row['b']
            ov = min(rb[3], b[3]) - max(rb[1], b[1])
            if not einzeln and ov > 0.3 * min(rb[3] - rb[1], b[3] - b[1]):
                row['it'].append(it)
                row['b'] = (min(rb[0], b[0]), min(rb[1], b[1]), max(rb[2], b[2]), max(rb[3], b[3]))
                break
        else:
            rows.append({'it': [it], 'b': tuple(b)})
    rows.sort(key=lambda r: r['b'][1])
    # Name-Zeile = Zeile mit der größten Schrift; reine Motivzeilen mindestens ca. 0,9 × Namenshöhe (max. ×3)
    def fs(r):
        return max([getattr(i, 'size', 0) for i in r['it'] if hasattr(i, 'font')] or [0])
    nh = max([(r['b'][3] - r['b'][1]) for r in rows if fs(r) == max(fs(x) for x in rows)] or [0])
    scale = {}
    for r in rows:
        if all(i.kind in ('motiv', 'deko') for i in r['it']) and nh:
            h = r['b'][3] - r['b'][1]
            w = r['b'][2] - r['b'][0]
            f = min(3.0, 0.9 * nh / max(h, 1e-6), 0.5 * D['W'] / max(w, 1e-6))
            if f > 1.05:
                c = ((r['b'][0] + r['b'][2]) / 2, (r['b'][1] + r['b'][3]) / 2)
                scale[id(r)] = (f, c)
                r['b'] = (c[0] - w * f / 2, c[1] - h * f / 2, c[0] + w * f / 2, c[1] + h * f / 2)
    cx = D['W'] / 2
    y = rows[0]['b'][1] if rows else 0
    tr = {it.id: (1, 1, 0, 0) for it in D['items']}
    prev_h = None
    for row in rows:
        b = row['b']
        h = b[3] - b[1]
        if prev_h is not None:
            y += max(3.0, 0.35 * min(h, prev_h))
        dy = y - b[1]
        dx = cx - (b[0] + b[2]) / 2
        f, c = scale.get(id(row), (1.0, (0, 0)))
        for it in row['it']:
            # Skalierung um die Zeilenmitte c, dann verschieben
            tr[it.id] = (f, f, c[0] * (1 - f) + dx, c[1] * (1 - f) + dy)
        y += h
        prev_h = h
    apply_tr(D, tr, fonts)
    D['tree'].write(p, encoding='utf-8', xml_declaration=False)


