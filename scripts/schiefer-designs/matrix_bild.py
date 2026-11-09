"""Abdeckungsmatrix (Größe × Zielgruppe) als HTML; grau = bewusst nicht angeboten."""
import json, sys
kat, mjson, out, titel = sys.argv[1:5]
M = json.load(open(mjson))
fams = []
for fn, nm in [('natur', 'Natur'), ('premium', 'Premium'), ('geschnitten', 'Geschnitten'), ('kordel', 'Kordel')]:
    F = json.load(open(f'{kat}/familien/schiefer/schiefer-tafeln-{fn}.json'))
    gn = {g['key']: g['name'] for g in F['groups']}
    for z in F['sizes']:
        fams.append((F['id'], z['key'], nm, z['groupKey'], gn.get(z['groupKey'], z['groupKey']), z.get('label', ''), z['widthMm'], z['heightMm']))
cols = [('Mensch+F', 'Menschen mit Foto'), ('Mensch-F', 'Menschen ohne Foto'), ('Sternk+F', 'Sternenk. mit Foto'), ('Sternk-F', 'Sternenk. ohne Foto'), ('Hund+F', 'Hund mit Foto'), ('Hund-F', 'Hund ohne Foto'), ('Katze+F', 'Katze mit Foto'), ('Katze-F', 'Katze ohne Foto'), ('Tier+F', 'Tier allg. mit Foto'), ('Tier-F', 'Tier allg. ohne Foto'), ('Familie', 'Familie'), ('Hausnr', 'Hausnummer'), ('Willk', 'Willkommen'), ('Andenken', 'Andenken'), ('Hochzeit', 'Hochzeit'), ('Hund-T', 'Hunde (Tür)'), ('Katze-T', 'Katzen (Tür)')]


def na(nm, gk, w, h, c):
    foto = c.endswith('+F')
    ged = c[-2:] in ('+F', '-F')
    if foto and nm == 'Premium': return 'kein Fotopreis'
    if w * h < 10000 and ged: return 'unter 10×10'
    if gk in ('KR', 'ST', 'KN') and not ged: return 'Gedenkform'
    if gk == 'KN' and ged and not c.startswith('Hund'): return 'nur Hunde'
    if gk == 'ST' and c.startswith('Mensch'): return 'Stern nur Sternenkinder/Tiere'
    if gk == 'ST' and foto: return 'Stern mit Foto: offen (Chris)'
    if gk in ('HR', 'HS') and c in ('Hausnr', 'Hund-T', 'Katze-T'): return 'Herz ohne'
    return None


h = ['<html><head><meta charset=utf-8><style>body{font:12px system-ui;margin:12px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:3px 5px;text-align:right}th{background:#eee;font-size:11px;writing-mode:vertical-rl;transform:rotate(180deg);height:110px}td.l{text-align:left;white-space:nowrap}.z{background:#f8b4b4}.w{background:#fde68a}.ok{background:#bbf7d0}.na{background:#e5e7eb;color:#9ca3af}tr.sep td{border-top:3px solid #333}</style></head><body><h3>%s</h3><p>grün = ab 29 (Sternenkinder mit Foto: ab 1) · gelb = unter 29 · rot = 0 · grau = gibt es bewusst nicht (Premium ohne Fotopreis, Gedenken unter 10×10, Kreuz/Stern/Knochen nur Gedenken, Herz ohne Hausnummer/Tier-Türschild, Stern mit Foto offen)</p><table><tr><th>Linie</th><th>Form</th><th>Größe</th>' % titel]
h += ['<th>%s</th>' % n for _, n in cols] + ['</tr>']
last = None
gaps = []
for fid, key, nm, gk, form, lab, w, hh in fams:
    m = M.get(f'{fid}|{key}', {})
    cls = ' class=sep' if nm != last else ''
    last = nm
    h.append(f'<tr{cls}><td class=l>{nm}</td><td class=l>{form}</td><td class=l>{lab}</td>')
    for c, _ in cols:
        v = m.get(c, 0)
        n = na(nm, gk, w, hh, c)
        if n and v == 0:
            h.append(f'<td class=na title="{n}">–</td>')
            continue
        ziel = 1 if c == 'Sternk+F' else 29  # Chris 04.11. 15:00: Sternenkinder mit Foto – einmal reicht
        k = 'z' if v == 0 else ('w' if v < ziel else 'ok')
        if v < ziel and w * hh >= 10000:
            gaps.append((nm, form, lab, c, v))
        h.append(f'<td class={k}>{v}</td>')
    h.append('</tr>')
h.append('</table></body></html>')
open(out, 'w').write(''.join(h))
for g in gaps:
    print(g)
