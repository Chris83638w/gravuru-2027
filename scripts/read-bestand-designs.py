#!/usr/bin/env python3
"""Bestandsdesigns (Katalog `designs/bestand/<linie>/…`, Master aus den Corel-Bögen) 1:1 auf ein
anderes Plattenmaß übertragen und als Lieferform 2 ablegen – wie `read-pdf-designs.py`, nur mit dem
Bestand als Quelle statt Einzel-PDFs.

Aufruf:
  python3 -I scripts/read-bestand-designs.py --bestand <katalog>/designs/bestand/gedenktafeln \
      --designs gravur-rechteck-D7,gravur-rechteck-D9,… --out <katalog>/designs/gedenktafeln-22x14-menschen \
      --ziel 220x140 --praefix GT-S-22x14 --katalog <katalog> --ersatz <katalog>/schriften/ersatz-gedenktafeln-22x14.json \
      [--themen gedenktafeln] [--zuordnung <json>]

Übertragung (Entscheidung Chris 20.10.2026: „du kannst die auch 1:1 übernehmen“):
  gleichmäßig skaliert auf die Plattenhöhe, waagerecht mittig (30 × 20 → 22 × 14: Faktor 0,7, je Seite 5 mm Rand dazu).
  Nichts wird umgestellt; Texte bleiben Text (Felder name/daten/spruch), Motive bleiben Pfade.
  Unsichtbare Pfade (ohne Füllung und Kontur) und die Plattenfläche fallen weg.
  Fotofeld: sichtbarer Ausschnitt des Musterfotos (Clip ∩ Platte) samt Button „Foto-Upload hier klicken“
  als ein Bild (`foto-1.png`, Platzhalter, wird nie graviert).
  Ersatzschriften wie bei den PDFs (Tabelle `--ersatz`, Größe auf die Originalbreite angepasst).
  Mehr als 20 Elemente: Motivpfade nach Nähe gruppiert (Konfigurator: höchstens 20 Elemente je Design).
"""
import argparse, base64, importlib.util, io, json, math, re, shutil, xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('read_pdf_designs', HERE / 'read-pdf-designs.py')
rpd = importlib.util.module_from_spec(spec); spec.loader.exec_module(rpd)
PT = rpd.PT
NS = {'svg': 'http://www.w3.org/2000/svg', 'xlink': 'http://www.w3.org/1999/xlink'}
TOKEN = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')
MAX_ELEMENTS = 20


def transform_path(d, s, ox, oy):
    """Pfad in mm des Masters → Zielplatte (x·s+ox, y·s+oy). Bogenradien skaliert, Winkel/Flags nicht."""
    out, cmd, k, pts = [], '', 0, []
    for t in TOKEN.findall(d):
        if t.isalpha():
            cmd = t; k = 0; out.append(t); continue
        v = float(t); C = cmd.upper(); rel = cmd.islower()
        if C == 'A':
            pos = k % 7
            if pos in (2, 3, 4): out.append(t)
            elif pos in (0, 1): out.append(f'{v * s:.3f}')
            elif pos == 5: out.append(f'{v * s + (0 if rel else ox):.3f}'); pts.append(('x', v, rel))
            else: out.append(f'{v * s + (0 if rel else oy):.3f}'); pts.append(('y', v, rel))
        elif C == 'H': out.append(f'{v * s + (0 if rel else ox):.3f}')
        elif C == 'V': out.append(f'{v * s + (0 if rel else oy):.3f}')
        else:
            axis = 'x' if k % 2 == 0 else 'y'
            out.append(f'{v * s + (0 if rel else (ox if axis == "x" else oy)):.3f}')
        k += 1
    return ' '.join(out).replace(' Z', ' Z')


def path_box(d):
    """Grobe Box über alle Koordinaten (Kontrollpunkte eingeschlossen) – nur absolute Pfade."""
    xs, ys, cmd, k = [], [], '', 0
    for t in TOKEN.findall(d):
        if t.isalpha(): cmd = t.upper(); k = 0; continue
        v = float(t)
        if cmd == 'H': xs.append(v)
        elif cmd == 'V': ys.append(v)
        elif cmd == 'A':
            if k % 7 == 5: xs.append(v)
            elif k % 7 == 6: ys.append(v)
        else: (xs if k % 2 == 0 else ys).append(v)
        k += 1
    if not xs or not ys: return None
    return [round(min(xs), 2), round(min(ys), 2), round(max(xs) - min(xs), 2), round(max(ys) - min(ys), 2)]


def text_width(font_file, text, size_mm):
    return rpd.advance_width(font_file, text, size_mm / PT)


def font_files(katalog):
    out = {}
    for f in json.loads((Path(katalog) / 'schriften/schriften.json').read_text())['fonts']:
        if f.get('file'): out[f['name']] = Path(katalog) / f['file']
    return out


def placeholder_cutout(photo_file, img_box, area, px_per_mm=8):
    """Musterfoto-Ausschnitt `area` (mm des Masters) als RGBA, Person freigestellt."""
    ax, ay, aw, ah = area
    W, H = max(1, round(aw * px_per_mm)), max(1, round(ah * px_per_mm))
    src = Image.open(photo_file).convert('RGBA')
    ix, iy, iw, ih = img_box
    sx, sy = src.width / iw, src.height / ih
    crop = src.crop((round((ax - ix) * sx), round((ay - iy) * sy), round((ax + aw - ix) * sx), round((ay + ah - iy) * sy))).resize((W, H), Image.LANCZOS)
    # Freistellen (Chris 21.10.2026: „Das Foto auf der Tafel sieht komisch aus“): kein Helligkeits-Alpha mehr
    # (das machte Haare/Kleidung löchrig und gab Säume), sondern eine saubere Maske der Person:
    # – Bild mit Transparenz: dessen Maske, Streupixel entfernt, Rand 2 px nach innen (schwarze Säume weg);
    # – Bild ohne Transparenz: Hintergrund per Flutfüllung vom Rand aus (nur gleichfarbige, zusammenhängende Fläche).
    # Innen bleibt das Foto deckend; der Rand wird leicht weich gezeichnet.
    import numpy as np
    from scipy import ndimage as ndi
    A0 = np.asarray(crop.getchannel('A'), dtype=np.float32)
    L = np.asarray(crop.convert('L'), dtype=np.float32)
    if A0.min() < 250:
        person = A0 > 128
    else:
        bw = max(2, int(min(W, H) * 0.02))
        border = np.concatenate([L[:bw].ravel(), L[-bw:].ravel(), L[:, :bw].ravel(), L[:, -bw:].ravel()])
        bg = float(np.median(border))
        cand = np.abs(ndi.median_filter(L, 3) - bg) < 9
        lab, _ = ndi.label(cand)
        edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
        back = np.isin(lab, edge[edge > 0])
        person = ~back if back.mean() > 0.05 else np.ones_like(back)
    lab, n = ndi.label(person)
    if n > 1:
        sizes = ndi.sum(person, lab, range(1, n + 1))
        person = np.isin(lab, 1 + np.flatnonzero(sizes >= 0.02 * sizes.max()))
    # Taschen, die nur zur Unterkante offen sind (Schultern/Kleidung bei Brustbildern), gehören zur Person.
    person = ndi.binary_fill_holes(np.vstack([person, np.ones((1, person.shape[1]), bool)]))[:-1]
    er = max(1, round(min(W, H) / 400))
    person = ndi.binary_erosion(person, iterations=er + (1 if A0.min() < 250 else 0))
    alpha = ndi.gaussian_filter(person.astype(np.float32) * 255, sigma=max(0.8, er * 0.9))
    crop.putalpha(Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8)))
    return crop


def person_box(crop, area):
    """Außenmaß der freigestellten Person in mm des Masters (oder None)."""
    import numpy as np
    A = np.asarray(crop.getchannel('A')) > 128
    if not A.any(): return None
    ys, xs = np.flatnonzero(A.any(axis=1)), np.flatnonzero(A.any(axis=0))
    k = area[2] / crop.width
    return [area[0] + xs[0] * k, area[1] + ys[0] * k, area[0] + (xs[-1] + 1) * k, area[1] + (ys[-1] + 1) * k]


def avoid_texts(photo_file, img_box, area, texts, px_per_mm=8):
    """Chris 21.10.2026 („der Mann ist im Text“): reicht die Person in einen Textblock, wird das Fotofeld auf der
    Textseite bis vor den Text gekürzt und der Musterausschnitt entsprechend verschoben – nur, wenn auf der
    anderen Seite genug leere Fläche ist (die Person wird nie abgeschnitten). Gibt (Fotofeld, Ausschnitt) zurück."""
    pb = person_box(placeholder_cutout(photo_file, img_box, area, px_per_mm), area)
    ax, ay, aw, ah = area
    if not pb: return area, area
    cx = (pb[0] + pb[2]) / 2; cut_r = cut_l = 0.0
    for t in texts:
        x0, y0, x1, y1 = t
        vert = min(y1, pb[3]) - max(y0, pb[1])
        if vert <= 0.3 * (y1 - y0) or x1 <= pb[0] or x0 >= pb[2]: continue
        if x0 > cx: cut_r = max(cut_r, pb[2] - x0 + 2)
        elif x1 < cx: cut_l = max(cut_l, x1 - pb[0] + 2)
    cut_r = min(cut_r, pb[0] - ax, 0.3 * aw) if cut_r > 0 else 0
    cut_l = min(cut_l, ax + aw - pb[2], 0.3 * aw) if cut_l > 0 else 0
    if cut_r < 1 and cut_l < 1: return area, area
    if cut_r >= cut_l:
        return [ax, ay, aw - cut_r, ah], [ax + cut_r, ay, aw - cut_r, ah]
    return [ax + cut_l, ay, aw - cut_l, ah], [ax, ay, aw - cut_l, ah]


def render_placeholder(photo_file, img_box, area, hints, out_png, px_per_mm=8, window=None):
    """Musterfoto + Button „Foto-Upload hier klicken“ → ein RGBA-Bild für das Fotofeld `area`.
    `window` ist der Bildausschnitt (mm des Masters), falls er vom Fotofeld abweicht (avoid_texts)."""
    import numpy as np
    win = window or area
    crop = placeholder_cutout(photo_file, img_box, win, px_per_mm)
    ax, ay, aw, ah = area; W, H = crop.size
    import cairosvg
    # Button auf der Person (Brusthöhe, nie im Gesicht), mittig über dem sichtbaren Oberkörper; ganz im Fotofeld.
    A = np.asarray(crop.getchannel('A')) > 128; k = aw / W
    btn_w = min(aw * 0.62, 70); btn_h = btn_w * 0.36
    if A.any():
        ys = np.flatnonzero(A.any(axis=1)); top, bot = ys[0] * k, (ys[-1] + 1) * k
        cy = top + 0.74 * (bot - top)
        band = A[max(0, int((cy - btn_h / 2) / k)):max(1, int((cy + btn_h / 2) / k))]
        cols = np.flatnonzero(band.any(axis=0))
        if cols.size:
            pw = (cols[-1] - cols[0] + 1) * k; btn_w = min(btn_w, max(0.75 * pw, 34)); btn_h = btn_w * 0.36
            cxp = (cols[0] + cols[-1] + 1) / 2 * k
        else: cxp = aw / 2
    else: cy, cxp = ah - btn_h, aw / 2
    margin = max(2.0, ah * 0.04)
    bx = ax + min(max(cxp - btn_w / 2, margin), aw - btn_w - margin)
    by = ay + min(max(cy - btn_h / 2, margin), ah - btn_h - margin)
    fs = btn_h * 0.27
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{ax} {ay} {aw} {ah}" width="{W}" height="{H}">'
           f'<rect x="{bx:.2f}" y="{by:.2f}" width="{btn_w:.2f}" height="{btn_h:.2f}" rx="{btn_h * 0.22:.2f}" fill="#ffffff" fill-opacity="0.72" stroke="#1b1b1b" stroke-opacity="0.6" stroke-width="{btn_h * 0.03:.2f}"/>'
           f'<text x="{bx + btn_w / 2:.2f}" y="{by + btn_h * 0.44:.2f}" font-family="Lato, Montserrat, sans-serif" font-weight="700" font-size="{fs:.2f}" fill="#1b1b1b" text-anchor="middle">Foto-Upload</text>'
           f'<text x="{bx + btn_w / 2:.2f}" y="{by + btn_h * 0.78:.2f}" font-family="Lato, Montserrat, sans-serif" font-size="{fs * 0.85:.2f}" fill="#1b1b1b" text-anchor="middle">hier klicken</text></svg>')
    btn = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert('RGBA')
    crop.alpha_composite(btn)
    crop.save(out_png, optimize=True)
    return [W, H]


def convert(folder, target, prefix, ersatz, files, s_fix=None, photo_override=None):
    meta = json.loads((folder / 'design.json').read_text())
    svg = ET.parse(folder / 'design.svg').getroot()
    W0, H0 = meta['plate']['widthMm'], meta['plate']['heightMm']
    W1, H1 = target
    s = s_fix or min(W1 / W0, H1 / H0); ox = (W1 - W0 * s) / 2; oy = (H1 - H0 * s) / 2
    T = lambda x, y: (x * s + ox, y * s + oy)
    no = meta.get('katalog', {}).get('designNo') or int(re.search(r'-D(\d+)', folder.name).group(1)); did = f'{prefix}-D{no}'
    warn = []
    jtexts = [t for t in meta['texts'] if not t.get('hint')]
    # ---- Texte
    texts = []
    for el in svg.iter('{%s}text' % NS['svg']):
        if 'hinweis' in (el.get('class') or ''): continue
        spans = el.findall('svg:tspan', NS)
        lines = [''.join(sp.itertext()) for sp in spans] or [''.join(el.itertext())]
        text = '\n'.join(lines).strip('\n')
        if not text.strip(): continue
        x, y = float(el.get('x')), float(el.get('y')); size = float(el.get('font-size'))
        lh = float(spans[1].get('dy')) if len(spans) > 1 and spans[1].get('dy') else size * 1.2
        anchor = el.get('text-anchor') or 'start'
        font = el.get('font-family')
        src = next((t for t in jtexts if t['text'].replace('\n', '') == text.replace('\n', '')), None)
        ax, ay = T(x, y)
        t = {'text': text, 'font': font, 'sizePt': round(size * s / PT, 2), 'color': el.get('fill') or '#b3b3b3',
             'align': {'middle': 'center', 'end': 'right'}.get(anchor, 'left'), 'anchorMm': [round(ax, 2), round(ay, 2)],
             'lineHeightMm': round(lh * s, 2), 'letterSpacingMm': 0.0, 'source': {'masterSizeMm': size, 'masterXY': [x, y]}}
        if font in ersatz and ersatz[font] != font:
            t['fontOriginal'] = font; t['font'] = ersatz[font]
            new = files.get(t['font']); widest = max(lines, key=len)
            target_w = (src['box'][2] * s) if src else (text_width(files[font], widest, size * s) if font in files else None)
            if new and target_w:
                w = max(text_width(new, l, size * s) for l in lines)
                k = max(0.5, min(3.0, target_w / w)) if w > 0 else 1
                if abs(k - 1) >= 0.03: t['sizePtOriginal'] = t['sizePt']; t['sizePt'] = round(t['sizePt'] * k, 2)
        if t['font'] not in files: warn.append(f'Schrift ohne Datei im Katalog: {t["font"]}')
        # Konfigurator: höchstens 180 Zeichen je Text – lange Mehrzeiler an Zeilengrenzen teilen (Lage bleibt gleich)
        parts, cur = [], []
        if len(lines) > 1 and abs(lh / (size * 1.2) - 1) > 0.08:
            parts = [[l] for l in lines]
            warn.append(f'„{lines[0][:20]}…“: Zeilenabstand {lh * s:.1f} mm statt 1,2 × Größe – je Zeile ein Textfeld (Lage wie im Original)')
            lines_iter = []
        else:
            lines_iter = lines
        for l in lines_iter:
            if cur and len('\n'.join(cur + [l])) > 180: parts.append(cur); cur = []
            cur.append(l)
        if cur: parts.append(cur)
        if len(parts) > 1 and lines_iter: warn.append(f'Text mit {len(text)} Zeichen in {len(parts)} Textfelder geteilt (höchstens 180 Zeichen)')
        row = 0
        # Teilfelder aus der 180-Zeichen-Teilung stehen im Konfigurator mit dessen fester Zeilenhöhe (1,2 × Schriftgröße
        # nach Ersatzschrift-Anpassung) untereinander – sonst überlappen sie (D14, Chris 21.10.2026).
        step = 1.2 * t['sizePt'] * PT if lines_iter else t['lineHeightMm']
        for part in parts:
            u = dict(t, text='\n'.join(part), anchorMm=[t['anchorMm'][0], round(t['anchorMm'][1] + row * step, 2)], group=len(texts) - row if row else len(texts)); row += len(part)
            texts.append(u)
    # ---- Fotofeld (Clip ∩ Platte)
    def text_boxes_master():
        out = []
        for t in texts:
            lines = t['text'].split('\n'); sz = t['sizePt'] * PT
            f = files.get(t['font'])
            w = max(text_width(f, l, sz) for l in lines) if f else max(len(l) for l in lines) * sz * 0.55
            x = t['anchorMm'][0]; x0 = {'left': x, 'center': x - w / 2, 'right': x - w}[t['align']]
            y0 = t['anchorMm'][1] - 0.8 * sz; y1 = t['anchorMm'][1] + (len(lines) - 1) * 1.2 * sz + 0.25 * sz
            out.append([(x0 - ox) / s, (y0 - oy) / s, (x0 + w - ox) / s, (y1 - oy) / s])
        return out
    photos = []
    clips = {c.get('id'): c for c in svg.iter('{%s}clipPath' % NS['svg'])}
    for im in svg.iter('{%s}image' % NS['svg']):
        if 'foto' not in (im.get('class') or ''): continue
        href = im.get('{%s}href' % NS['xlink']) or im.get('href')
        ib = [float(im.get(k)) for k in ('x', 'y', 'width', 'height')]
        cid = re.search(r'#([^)]+)', im.get('clip-path') or '')
        cb = ib
        if cid and cid.group(1) in clips:
            p = clips[cid.group(1)].find('svg:path', NS)
            if p is not None: cb = path_box(p.get('d'))
        x0, y0 = max(cb[0], ib[0], 0), max(cb[1], ib[1], 0)
        x1, y1 = min(cb[0] + cb[2], ib[0] + ib[2], W0), min(cb[1] + cb[3], ib[1] + ib[3], H0)
        area = [x0, y0, x1 - x0, y1 - y0]
        k = len(photos) + 1; file = f'foto-{k}.png'
        # Anderes Musterfoto aus dem Bestand (Zuordnung „musterfoto“, Chris 21.10.2026 zu D14): füllt die Bildbox
        # mittig („cover“), Fotofeld und Clip bleiben wie im Master.
        src_file = folder / href
        if photo_override:
            src_file = Path(photo_override); ow, oh = Image.open(src_file).size
            k_ = max(ib[2] / ow, ib[3] / oh); nw, nh = ow * k_, oh * k_
            ib = [ib[0] + (ib[2] - nw) / 2, ib[1] + (ib[3] - nh) / 2, nw, nh]
            warn.append(f'Musterfoto {k} ersetzt durch {src_file.parent.name}/{src_file.name}')
        area, window = avoid_texts(src_file, ib, area, text_boxes_master())
        if window != area or area[2] != x1 - x0:
            warn.append(f'Fotofeld {k} um {(x1 - x0 - area[2]) * s:.1f} mm gekürzt, damit die Person nicht im Text steht')
        px = render_placeholder(src_file, ib, area, None, target_dir(did) / file, window=window)
        x0, y0 = area[0], area[1]
        tx, ty = T(x0, y0)
        photos.append({'box': [round(tx, 2), round(ty, 2), round(area[2] * s, 2), round(area[3] * s, 2)], 'file': file, 'px': px,
                       'alpha': False, 'customerClip': 'rechteck', 'shape': 'rect', 'placeholder': True, 'engrave': False,
                       'source': {'masterFile': href if not photo_override else f'{Path(photo_override).parent.name}/{Path(photo_override).name}', 'masterArea': [round(v, 2) for v in area], 'masterWindow': [round(v, 2) for v in window]}})
    # ---- Motive
    paths = []
    for el in svg.iter('{%s}path' % NS['svg']):
        pid = el.get('id') or ''
        if not pid.startswith('motiv'): continue
        fill, stroke = el.get('fill'), el.get('stroke')
        if (fill in (None, 'none')) and (stroke in (None, 'none')): continue
        box0 = path_box(el.get('d'))
        if box0 and box0[2] >= W0 - 1 and box0[3] >= H0 - 1: warn.append(f'{pid}: Plattenfläche weggelassen'); continue
        d = transform_path(el.get('d'), s, ox, oy)
        sw = float(el.get('stroke-width') or 0) * s
        paths.append({'d': d, 'fill': None if fill == 'none' else fill, 'stroke': None if stroke == 'none' else stroke,
                      'strokeMm': round(sw, 3), 'evenodd': el.get('fill-rule') == 'evenodd', 'opacity': 1, 'box': path_box(d)})
    budget = MAX_ELEMENTS - len(texts) - len(photos)
    # Ein Motiv besteht in Corel oft aus mehreren Pfaden (Kreuz + Taube, Baum + Blätter). Pfade, deren Boxen
    # sich berühren oder überlappen, sind ein Motiv – sonst zieht der Kunde nur ein Einzelteil weg (Chris 20.10.2026).
    gap = 1.0
    motifs = rpd.cluster(paths, gap) if paths else []
    if len(motifs) > budget:
        motifs = rpd.cluster(paths, gap)
        while len(motifs) > budget and gap < 80: gap *= 1.6; motifs = rpd.cluster(paths, gap)
        warn.append(f'{len(paths)} Motivpfade zu {len(motifs)} Gruppen zusammengefasst (höchstens {MAX_ELEMENTS} Elemente)')
    for m in motifs:
        for p in m['paths']: p.pop('box', None)
    # Konfigurator prüft Textkasten (Breite × 1,2·Größe) und Motivbox gegen die Platte: was nach dem
    # Übertragen knapp übersteht (Schreibschriften mit hohem Kasten, Motive an der Kante), minimal nach innen.
    def inward(lo, hi, size):
        return (-lo + 0.1) if lo < 0 else (size - hi - 0.1) if hi > size else 0.0
    for t in texts:
        if t['font'] not in files: continue
        size = t['sizePt'] * PT; lines = t['text'].split('\n')
        w = max(text_width(files[t['font']], l, size) for l in lines); h = 1.2 * size * len(lines)
        x = t['anchorMm'][0]; cx = x if t['align'] == 'center' else x - w / 2 if t['align'] == 'right' else x + w / 2
        cy = t['anchorMm'][1] - 0.35 * size + (len(lines) - 1) / 2 * 1.2 * size
        dx, dy = inward(cx - w / 2, cx + w / 2, W1), inward(cy - h / 2, cy + h / 2, H1)
        if dx or dy:
            t['anchorMm'] = [round(t['anchorMm'][0] + dx, 2), round(t['anchorMm'][1] + dy, 2)]
            warn.append(f'Text „{lines[0][:24]}“ um {dx:.1f}/{dy:.1f} mm nach innen (Textkasten stand über)')
    for i, m in enumerate(motifs, 1):
        x, y, w, h = m['box']; dx, dy = inward(x, x + w, W1), inward(y, y + h, H1)
        if dx or dy:
            for p in m['paths']: p['d'] = transform_path(p['d'], 1, dx, dy)
            m['box'] = [round(x + dx, 2), round(y + dy, 2), w, h]
            warn.append(f'motiv-{i} um {dx:.1f}/{dy:.1f} mm nach innen (stand über die Kante)')
    big = max(texts, key=lambda t: t['sizePt']) if texts else None
    d = {'id': did, 'source': f'{meta["id"]} (Bestand, {meta.get("sheet")})', 'designNo': no,
         'material': meta.get('material'), 'process': meta.get('process'), 'form': meta.get('form'),
         'plate': {'widthMm': W1, 'heightMm': H1, 'source': f'aus Master {W0:g} × {H0:g} mm übertragen (Faktor {s:g}, Versatz {ox:g}/{oy:g} mm)'},
         'texts': texts, 'fonts': sorted({t['font'] for t in texts}),
         'fontsOriginal': sorted({t['fontOriginal'] for t in texts if t.get('fontOriginal')}),
         'motifs': motifs, 'photos': photos, 'warnings': warn,
         'name': f'D{no} {big["text"].splitlines()[0]}' if big else f'D{no}',
         'plateMm': [W1, H1], 'movable': True,
         'transfer': {'from': meta['id'], 'fromKey': meta.get('katalog', {}).get('key', meta['id']), 'scale': round(s, 4), 'offsetMm': [round(ox, 2), round(oy, 2)],
                      'decided': '2026-10-20', 'by': 'Chris („du kannst die auch 1:1 übernehmen“)'}}
    return d


OUT = None
_field_keys = rpd.field_keys
def field_keys(texts):
    """Wie read-pdf-designs, aber Teile eines geteilten Textes behalten den Feldnamen des ersten Teils (name, name-2 …)."""
    keys = _field_keys(texts); first = {}; used = set()
    # Name (Chris 21.10.2026: beim Designwechsel wandern nur Name und Lebensdaten): kurze, einzeilige Texte ohne
    # Datum und ohne Satzzeichen am Ende, mindestens halb so groß wie der größte Text, die keine Teilzeile eines
    # Spruchs sind. Der größte davon ist „name“; gleich gesetzte Nachbarn (Vor-/Nachname getrennt, D72/D100) auch.
    # Der größte Text allein reicht nicht (D60: der Schlusssatz in Schreibschrift ist größer als der Name).
    if texts:
        big = max(t['sizePt'] for t in texts)
        parents = {t.get('group', i) for i, t in enumerate(texts) if t.get('group', i) != i}
        def cand(i, t):
            x = t['text'].strip()
            return ('\n' not in x or len(x) <= 40) and len(x) <= 40 and not rpd.DATE.search(x) and x[-1:] not in '.!?,;:…' \
                and t['sizePt'] >= 0.5 * big and i not in parents and t.get('group', i) == i
        names = [i for i, t in enumerate(texts) if cand(i, t)]
        if names:
            main = max(names, key=lambda i: texts[i]['sizePt'])
            m = texts[main]; sz = m['sizePt'] * PT
            near = [i for i in names if i == main or (texts[i]['font'] == m['font'] and abs(texts[i]['anchorMm'][1] - m['anchorMm'][1]) <= 3 * sz)]
            for i in range(len(texts)):
                if i in near: keys[i] = 'name'
                elif keys[i] == 'name' or keys[i].startswith('name-'): keys[i] = 'spruch'
            # Zähler neu vergeben (name, name-2 …, spruch, spruch-2 …)
            seen = {}
            for i in range(len(keys)):
                base = keys[i].split('-')[0]; seen[base] = seen.get(base, 0) + 1
                keys[i] = base if seen[base] == 1 else f'{base}-{seen[base]}'
    for i, t in enumerate(texts):
        g = t.get('group', i)
        if g in first and g != i:
            base = first[g].split('-')[0]; n = 2
            while f'{base}-{n}' in used: n += 1
            keys[i] = f'{base}-{n}'
        else:
            if keys[i] in used:
                base = keys[i].split('-')[0]; n = 2
                while f'{base}-{n}' in used: n += 1
                keys[i] = f'{base}-{n}'
            first[g] = keys[i]
        used.add(keys[i])
    return keys
rpd.field_keys = field_keys
def target_dir(did):
    p = OUT / did; p.mkdir(parents=True, exist_ok=True); return p


def main():
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument('--bestand', required=True); ap.add_argument('--designs', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--ziel', default='220x140'); ap.add_argument('--praefix', required=True)
    ap.add_argument('--katalog', required=True); ap.add_argument('--ersatz'); ap.add_argument('--themen', default='gedenktafeln')
    ap.add_argument('--zuordnung'); ap.add_argument('--serie', default='gravur-schiefer-22x14')
    a = ap.parse_args()
    OUT = Path(a.out); OUT.mkdir(parents=True, exist_ok=True)
    target = [float(v) for v in a.ziel.split('x')]
    ersatz = {k: v for k, v in (json.loads(Path(a.ersatz).read_text()) if a.ersatz else {}).items() if not k.startswith('_')}
    files = font_files(a.katalog)
    zu = json.loads(Path(a.zuordnung).read_text()) if a.zuordnung else {}
    # Bestand je Linie (Zielgruppe/Unterkategorie/Schlüssel) oder je Bogen (flach: Schlüssel/design.json)
    folders = {p.parent.name: p.parent for p in list(Path(a.bestand).glob('*/*/*/design.json')) + list(Path(a.bestand).glob('*/design.json'))}
    index = []
    for key in a.designs.split(','):
        folder = folders.get(key.strip())
        if not folder: raise SystemExit(f'Bestandsdesign fehlt: {key}')
        meta0 = json.loads((folder / 'design.json').read_text())
        no = meta0.get('katalog', {}).get('designNo') or int(re.search(r'-D(\d+)', key).group(1))
        z = zu.get(f'D{no}', {})
        override = next((p.parent / z['musterfoto'].split('/')[-1] for p in Path(a.bestand).glob('*/*/' + z['musterfoto'].split('/')[0] + '/design.json')), None) if z.get('musterfoto') else None
        if z.get('musterfoto') and not (override and override.exists()): raise SystemExit(f'Musterfoto fehlt: {z["musterfoto"]}')
        d = convert(folder, target, a.praefix, ersatz, files, photo_override=override)
        themes = z.get('themen') or [t for t in a.themen.split(',') if t]
        zg, uk = (folder.parts[-3], folder.parts[-2]) if 'katalog' in meta0 else ('offen', 'offen')
        if z.get('name'): d['name'] = z['name']  # Kundenname nach Motiv (Chris 21.10.2026)
        d['themes'] = themes
        d['katalog'] = {'key': f'{a.serie}-D{d["designNo"]}', 'series': a.serie, 'zielgruppe': z.get('zielgruppe', zg), 'unterkategorie': z.get('unterkategorie', uk), 'themen': themes}
        tgt = target_dir(d['id'])
        (tgt / 'design.svg').write_text(rpd.design_svg(d))
        (tgt / 'design.json').write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
        if (folder / 'preview.png').exists(): shutil.copy(folder / 'preview.png', tgt / 'original.png')
        index.append({'key': d['id'], 'name': d['name'], 'pfad': d['id'], 'quelle': d['transfer']['fromKey'], 'zielgruppe': d['katalog']['zielgruppe'],
                      'unterkategorie': d['katalog']['unterkategorie'], 'themen': themes, 'texte': len(d['texts']), 'motive': len(d['motifs']),
                      'fotos': len(d['photos']), 'schriften': d['fonts'], 'schriftenOriginal': d['fontsOriginal'], 'warnungen': d['warnings']})
        print(f'{d["id"]}: {len(d["texts"])} Texte, {len(d["motifs"])} Motive, {len(d["photos"])} Foto, Schriften {", ".join(d["fonts"])}'
              + (f'  ⚠ {"; ".join(d["warnings"])}' if d['warnings'] else ''))
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
