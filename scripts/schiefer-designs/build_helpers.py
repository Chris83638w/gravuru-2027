"""Aus scripts/ae-tuerschilder/build-designs.py (AE-Chat #131) übernommen."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

def grow_small_texts(D, tr, Wt, Ht, shape, poly, edge, minmm=3.0):
    """Texte unter 3 mm (Mindestgröße Gravur) auf 3 mm anheben, wenn nichts überlappt und alles auf der Platte bleibt."""
    from aelayout import inside_ellipse, inside_polygon, transformed_points

    def box(it, t):
        sx, sy, tx, ty = t
        b = it.bbox
        return (b[0] * sx + tx, b[1] * sy + ty, b[2] * sx + tx, b[3] * sy + ty)
    for it in D['items']:
        if not hasattr(it, 'font'):
            continue
        sx, sy, tx, ty = tr[it.id]
        size = it.size * sy
        if size >= minmm - 1e-6:
            continue
        f = (minmm + 0.01) / size
        if it.anchor == 'start' and not it.rot:
            ax = it.x
        elif it.anchor == 'end' and not it.rot:
            ax = it.x
        else:
            ax = (it.bbox[0] + it.bbox[2]) / 2
        ay = (it.bbox[1] + it.bbox[3]) / 2
        nax, nay = ax * sx + tx, ay * sy + ty
        cand = (sx * f, sy * f, nax - ax * sx * f, nay - ay * sy * f)
        nb = box(it, cand)
        clash = any(o is not it and not (nb[2] + .3 <= ob[0] or ob[2] + .3 <= nb[0] or nb[3] + .3 <= ob[1] or ob[3] + .3 <= nb[1])
                    for o in D['items'] for ob in [box(o, tr[o.id])] if getattr(o, 'span', None) is None)
        kb = it.kbox
        kin = kb[0] * cand[0] + cand[2] >= 0 and kb[2] * cand[0] + cand[2] <= Wt and kb[1] * cand[1] + cand[3] >= 0 and kb[3] * cand[1] + cand[3] <= Ht
        pts = transformed_points(it, cand)
        inside = (shape != 'rect' or kin) and (shape != 'ellipse' or inside_ellipse(pts, Wt, Ht, edge or 0)) and (shape != 'contour' or inside_polygon(pts, poly, edge or 0))
        if not clash and inside:
            tr[it.id] = cand
    return tr


