#!/usr/bin/env python3
"""Issue 85: Kreis-Kompositionen vorbereiten, ohne neue Katalogkennungen zu vergeben.

Aufruf: python rund-studien.py --katalog <Quelle> --out <Studienordner>
Ausgabe ist ein Prüfstand, keine importierbare/freigegebene Designreihe.
Die Text- und Motivplätze sind je Vorlage bewusst gesetzt. Schriftgrößen werden
innerhalb dieser Plätze anhand der tatsächlichen Glyphen eingepasst. Motive
werden nur gleichmäßig transformiert; ihre Pfade und Füllregeln bleiben erhalten.
"""
import argparse, copy, html, json, math, sys
from pathlib import Path
from functools import lru_cache
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

PT = 25.4 / 72
# Plätze [optische Mitte x/y, maximale Breite/Höhe] in mm.
# Reihenfolge jeweils wie texts/motifs in der dokumentierten Originaldatei.
PLANS = {
1: ([[32.5,38,52,9],[32.5,25,37,6]], []),
2: ([[36,39,45,8],[24,25,32,6]], []),
3: ([[32.5,41,51,8],[32.5,24,34,6]], [[32.5,32,49,.5]]),
4: ([[36,41,45,8],[25,24,32,6]], [[32.5,32,49,.5]]),
5: ([[35,39,47,8],[25,26,32,6]], [[32.5,17,37,.5],[32.5,49,37,.5]]),
6: ([[32.5,35,33,7],[32.5,47,49,10],[26,17,30,4],[26,24,10,3]], [[48,21,10,13]]),
7: ([[36,38,47,10],[26,26,35,8],[32.5,14,31,4]], [[25,51,22,14]]),
9: ([[32.5,15,35,4],[36,29,33,6],[40,41,38,10]], [[18,47,12,23]]),
10: ([[32.5,16,38,4],[32.5,28,47,8],[26,39,26,3],[45,39,13,5]], [[32.5,51,23,16]]),
12: ([[40,26,30,4],[40,42,32,9],[40,33,20,3]], [[21,32.5,25,43]]),
15: ([[32.5,35,51,8],[32.5,25,12,4],[32.5,16,39,4]], [[32.5,49,43,12]]),
16: ([[32.5,17,36,4],[35,29,29,6],[35,41,44,7]], [[23,53,12,10]]),
17: ([[32.5,17,40,4],[40,43,36,10],[32,30,30,8]], [[16,45,9,20]]),
18: ([[29,26,43,8],[36,47,46,8],[32.5,37,8,6]], [[44,14,13,13]]),
19: ([[40,44,34,9],[32.5,18,40,4],[35,30,10,5]], [[17,40,9,22]]),
20: ([[32.5,35,51,7],[32.5,23,34,5]], [[32.5,50,16,17]]),
21: ([[40,16,22,4],[41,23,28,4],[32.5,37,53,8],[32.5,49,42,3.5]], [[17,20,13,13]]),
22: ([[32.5,32,53,7],[32.5,21,29,5],[40,53,28,4]], [[18,48,13,14]]),
23: ([[27,26,36,9],[39,38,38,10]], [[23,51,18,15]]),
24: ([[32.5,45,52,8],[32.5,32,34,5]], [[32.5,17,34,16]]),
25: ([[24,52,23,3.5],[32.5,32,51,10],[32.5,17,37,4]], [[45,47,15,21]]),
26: ([[32.5,42,51,7],[27,28,29,7]], [[44,17,11,13]]),
27: ([[32.5,43,46,11],[28,31,35,4],[26,23,27,4]], [[45,15,13,10]]),
28: ([[32.5,37,49,8],[30,24,33,7]], [[38,51,12,12]]),
29: ([[32.5,28,30,6],[32.5,13,35,3.5],[32.5,20,8,3.5],[42,50,22,4],[32.5,38,49,8]], [[23,52,12,14]]),
30: ([[32.5,31,52,10],[32.5,19,28,5],[24,46,21,5]], [[45,48,16,15]]),
31: ([[32.5,18,32,4],[32.5,33,52,9]], [[32.5,50,23,17]]),
32: ([[27,24,26,4],[32.5,37,52,10],[39,51,24,5],[22,51,10,3.5]], [[44,15,13,14]]),
33: ([[27,24,29,5],[32.5,49,37,7],[32.5,36,49,8]], [[43,15,13,13]]),
34: ([[29,35,44,8],[24,24,26,4],[32.5,14,37,6],[27,50,23,6]], [[45,51,14,14]]),
35: ([[27,51,24,4],[32.5,16,30,4],[32.5,27,46,5],[30,38,23,5]], [[45,50,17,13]]),
36: ([[32.5,19,43,4],[32.5,33,51,7]], [[32.5,50,22,15]]),
37: ([[27,31,37,10],[38,45,39,10]], [[32.5,16,19,11]]),
38: ([[30,27,46,10],[32.5,39,14,6],[34,50,43,9]], [[43,14,13,10]]),
39: ([[32.5,24,37,7],[32.5,33,9,5],[32.5,43,47,8],[32.5,15,27,6]], [[32.5,54,18,10]]),
40: ([[32.5,46,49,8],[29,28,37,8],[32.5,37,10,5]], [[43,15,14,14]]),
41: ([[37,42,43,13],[25,27,33,7]], [[47,16,12,16]]),
42: ([[29,29,40,6],[32.5,43,48,12]], [[46,17,13,14]]),
43: ([[32.5,33,44,9],[32.5,20,29,5]], [[32.5,50,22,17]]),
44: ([[30,19,39,4],[30,34,49,11]], [[36,49,23,15]]),
45: ([[28,28,31,8],[30,17,32,4],[30,41,42,10]], [[43,53,10,11]]),
46: ([[38,34,43,12],[26,21,32,6]], [[28,50,24,14]]),
47: ([[32.5,15,41,6],[32.5,24,9,5],[26,33,20,6],[36,41,40,6]], [[32.5,53,18,12]]),
48: ([[32.5,42,53,11],[32.5,29,30,5]], [[23,16,20,12]]),
49: ([], [[32.5,32.5,54,30]]),
50: ([], [[32.5,32.5,55,30]]),
51: ([], [[32.5,32.5,55,30]]),
52: ([[27,29,34,8],[32.5,44,51,10]], [[43,16,19,12]]),
53: ([[32.5,20,37,5],[32.5,35,49,12]], [[32.5,52,13,13]]),
54: ([[32.5,23,30,5],[32.5,36,51,7]], [[32.5,51,14,15]]),
55: ([[32.5,30,34,5],[32.5,44,52,10]], [[32.5,18,39,5]]),
56: ([[32.5,30,33,8],[32.5,44,52,10]], [[32.5,17,39,6]]),
57: ([[32.5,29,30,5],[32.5,44,52,13]], [[32.5,17,39,6]]),
58: ([[32.5,17,40,5],[32.5,29,29,5],[32.5,40,48,8]], [[32.5,52,39,7]]),
59: ([[32.5,22,42,9],[32.5,38,47,12]], [[32.5,52,40,8]]),
60: ([[32.5,16,37,5],[32.5,27,25,5],[32.5,39,52,6]], [[32.5,52,39,9]]),
61: ([[32.5,34,52,11],[32.5,19,37,4]], [[32.5,50,39,12]]),
62: ([[32.5,36,52,11],[32.5,21,30,7]], [[32.5,52,39,8]]),
63: ([[32.5,31,32,5],[32.5,45,44,10]], [[32.5,17,40,10]]),
64: ([[32.5,25,35,6],[32.5,39,49,8]], []),
65: ([[49,47,11,3.4],[32.5,47,10,3.4],[16,47,11,3.4],[32.5,31,51,7],[32.5,18,31,5]], [[32.5,39,47,.5],[24,47,2,2],[41,47,2,2]]),
66: ([[32.5,42,52,7]], [[32.5,24,40,17]]),
67: ([[32.5,44,52,11],[49,26,12,8],[16,26,12,8]], [[32.5,26,15,11]]),
68: ([[32.5,36,50,9],[32.5,22,33,5]], [[29,51,39,6]]),
69: ([[36,36,37,9],[27,23,33,5]], [[36,51,39,6]]),
70: ([[25,24,31,6],[29,34,29,6],[30,48,47,11]], [[49,29,5,29]]),
71: ([[27,24,33,6],[26,39,36,9]], [[49,35,5,29]]),
72: ([[25,23,30,4],[26,16,23,4],[32.5,48,49,9],[32.5,36,30,5]], [[49,18,11,12]]),
73: ([[45,39,27,7],[43,27,23,7],[19,33,14,4]], [[19,32.5,19,19]]),
}

@lru_cache(None)
def font(path):
    return TTFont(path)

def bounds(text, font_path, size):
    f = font(str(font_path)); gs = f.getGlyphSet(); cmap = f.getBestCmap()
    pen = BoundsPen(gs); x = 0; scale = size / f['head'].unitsPerEm
    for char in text:
        name = cmap.get(ord(char))
        if name is None:
            raise ValueError(f'Schrift {font_path.name}: Zeichen {char!r} fehlt')
        gs[name].draw(TransformPen(pen, (scale,0,0,-scale,x,0)))
        x += f['hmtx'][name][0] * scale
    return pen.bounds or (0,0,x,size)

def place_text(t, slot, fonts):
    cx,cy,w,h = slot
    if '\n' in t['text']: raise ValueError('Mehrzeiliger Text benötigt eigene Planung')
    b = bounds(t['text'], fonts[t['font']], 1)
    size = min(w/(b[2]-b[0]),h/(b[3]-b[1]))
    t['sizePt'] = size/PT
    t['anchorMm'] = [cx-(b[0]+b[2])*size/2,cy-(b[1]+b[3])*size/2]
    t['align'] = 'left'; t['letterSpacingMm'] = 0; t['lineHeightMm'] = size*1.2

def place_motif(m, slot):
    cx,cy,w,h=slot; x,y,mw,mh=m['box']; scale=min(w/mw,h/mh)
    ox=cx-(x+mw/2)*scale; oy=cy-(y+mh/2)*scale
    for p in m['paths']:
        pen=SVGPathPen(None); parse_path(p['d'],TransformPen(pen,(scale,0,0,scale,ox,oy)))
        p['d']=pen.getCommands(); p['strokeMm']*=scale
    m['box']=[cx-mw*scale/2,cy-mh*scale/2,mw*scale,mh*scale]

def svg(d):
    out=['<svg xmlns="http://www.w3.org/2000/svg" width="65mm" height="65mm" viewBox="0 0 65 65">',
         '<circle id="platte" cx="32.5" cy="32.5" r="32.5" fill="none" stroke="#999" stroke-width="0.2"/>']
    for i,m in enumerate(d['motifs'],1):
        out.append(f'<g id="motiv-{i}">')
        for p in m['paths']:
            out.append(f'<path d="{p["d"]}" fill="{p.get("fill") or "none"}" stroke="{p.get("stroke") or "none"}" stroke-width="{p["strokeMm"]:.5f}" opacity="{p.get("opacity",1)}" fill-rule="{"evenodd" if p.get("evenodd") else "nonzero"}"/>')
        out.append('</g>')
    for i,t in enumerate(d['texts'],1):
        x,y=t['anchorMm']; size=t['sizePt']*PT
        out.append(f'<text id="text-{i}" data-feld="text-{i}" x="{x:.4f}" y="{y:.4f}" font-family="{html.escape(t["font"])}" font-size="{size:.4f}" fill="#000000">{html.escape(t["text"])}</text>')
    return '\n'.join(out+['</svg>'])

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--katalog',type=Path,required=True); ap.add_argument('--out',type=Path,required=True); a=ap.parse_args()
    a.out.mkdir(parents=True,exist_ok=True)
    fonts={f['name']:a.katalog/f['file'] for f in json.loads((a.katalog/'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
    source=a.katalog/'designs/edelstahl-gravur-80x80'; report=[]
    for row in json.loads((source/'index.json').read_text(encoding='utf-8')):
        original=json.loads((source/row['pfad']/'design.json').read_text(encoding='utf-8')); d=copy.deepcopy(original); n=d['designNo']
        if n not in PLANS:
            report.append({'source':d['id'],'status':'offen','grund':'D14: Schrift Welcome fehlt; Original bleibt unverändert.'}); continue
        texts,motifs=PLANS[n]; assert len(texts)==len(d['texts'])
        if n==64: d['motifs']=[]
        assert len(motifs)==len(d['motifs'])
        for t,slot in zip(d['texts'],texts): place_text(t,slot,fonts)
        for m,slot in zip(d['motifs'],motifs): place_motif(m,slot)
        # Bewusst keine neue ID, Größen-Zuordnung, Freigabe oder Katalogreferenz.
        study={'sourceId':original['id'],'targetId':None,'status':'Kennung offen','name':d['name'],
               'plate':{'widthMm':65,'heightMm':65},'plateMm':[65,65],'form':'Rund',
               'texts':d['texts'],'motifs':d['motifs'],'photos':[],'fonts':d['fonts'],
               'note':'Kompositionsstudie nach Issue 85 Nachricht 4; kein Katalogdesign.',
               'deviations':['Eckornamente gemäß Nachricht 4 entfallen.'] if n==64 else []}
        dest=a.out/f'D{n}'; dest.mkdir(exist_ok=True)
        (dest/'studie.json').write_text(json.dumps(study,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
        (dest/'studie.svg').write_text(svg(study),encoding='utf-8')
        report.append({'source':original['id'],'study':f'D{n}','status':'Kennung offen','deviations':study['deviations']})
    (a.out/'zuordnung.json').write_text(json.dumps(report,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    print(f'{sum("study" in r for r in report)} Studien; {sum(r["status"]=="offen" for r in report)} offen; keine Katalogkennungen vergeben.')

if __name__=='__main__': main()
