import json,re,glob,html,openpyxl
import os
S=os.environ.get('SCHIEFER_WORK',os.path.abspath('schiefer-arbeit'))
SRC=os.environ.get('SCHIEFER_SRC',os.path.join(os.path.dirname(__file__),'../../docs/handoffs/design-start-mika/schiefer'))
KM=os.environ.get('GRAVURU_KATALOG',os.path.abspath('../gravuru-katalog'))
OUT=None
U=72/25.4
items=json.load(open(SRC+'/konturen-und-loecher.json'))
svg=open(SRC+'/Gedenktafeln_Schiefer.svg').read()
paths=re.findall(r'<path d="([^"]+)"\s*style="([^"]+)"',svg)
def first(d):
  m=re.search(r'M\s*(-?[\d.]+),(-?[\d.]+)',d);return float(m.group(1)),float(m.group(2))
def band(it):
  y=it['y']
  if it['holes'] and it['holes'][0]['d']==8: return 'AH'
  if 5000<y<6000: return 'KO'
  if 8500<y<9500: return 'TK'
  if y>11000: return 'HR'
  if it['kind']=='curve': return 'FO'
  if not it['holes'] and it['x']<-19000: return 'PR'
  return 'BK'
for it in items:
  it['band']=band(it);x0,y0=it['x'],it['y'];w,h=it['w']*U,it['h']*U
  it['paths']=[d for d,st in paths if x0-3<=first(d)[0]<=x0+w+3 and y0-3<=first(d)[1]<=y0+h+3]
# korrigierte Herzkonturen (01.11.) aus den Aufträgen
geo={}
for p in glob.glob(KM+'/auftraege/2026-10-31-menschen-schiefer/*/produkt-geometrien.json'):
  for r in json.load(open(p)): geo.setdefault((r['group'][:12],r['form'],r['label'].replace(' ','')),r)
ws=openpyxl.load_workbook(SRC+'/Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx',data_only=True)['Größen & Optionen']
rows=[r for r in ws.iter_rows(min_row=5,values_only=True) if r[0]]
# Türschild klein ohne Bruchkante (Excel 02.11., nicht in der Zeichnung 29.10.): Rechteck ohne Löcher
for p in json.load(open(KM+'/preise/preise-chris-20261102.json'))['schiefer'][1:]:
  if p['gruppe'].startswith('Naturschiefer – Türschild klein'):
    rows.append((p['gruppe'],p['form'],None,p['groesse'],p['mm'][0],p['mm'][1],'ja',None,None,None,None,None,None))
prices={(p['gruppe'][:12],p['form'],p['groesse'].replace(' ','')):p for p in json.load(open(KM+'/preise/preise-chris-20261102.json'))['schiefer'][1:]}
BANDS={'Premium':'PR','Formen':'FO','Naturschi':'BK','Herz (Reih':'HR','Kordel':'KO'}
def match(r):
  g,f,gr,w,h=r[0],r[1],r[3],float(r[4]),float(r[5])
  b=next(v for k,v in BANDS.items() if g.startswith(k))
  if b=='BK' and w<=150 and h<=130 and 'ja'!=r[8]: b='TK'
  kind='circle' if f=='Rund' else 'rect' if f in('Rechteck','Quadrat') else 'curve'
  c=[it for it in items if it['band']==b and it['kind']==kind and abs(it['w']-w)<3 and abs(it['h']-h)<3]
  if not c and b=='FO': c=[it for it in items if it['band']==b and abs(it['w']-w)<3]
  return c[0] if c else None
def holes(text):
  return [(float(a.replace(',','.')),float(b.replace(',','.'))) for a,b in re.findall(r'\((-?[\d.,]+)\|(-?[\d.,]+)\)',text or '')]
fmt=lambda v:('%g'%round(v,1)).replace('.',',')
def notes(r):
  m=r[12] or ''
  if not m: return ['ohne Löcher']
  W,H=float(r[4]),float(r[5]);out=[]
  def rand(l,rr,t,bb):
    if abs(l-rr)<.05 and abs(t-bb)<.05 and abs(l-t)<.05: return f'Lochmitte–Rand: {fmt(l)} mm zu allen Seiten'
    sx=f'{fmt(l)} mm links/rechts' if abs(l-rr)<.05 else f'{fmt(l)} mm links, {fmt(rr)} mm rechts'
    sy=f'{fmt(t)} mm oben/unten' if abs(t-bb)<.05 else f'{fmt(t)} mm oben, {fmt(bb)} mm unten'
    return 'Lochmitte–Rand: '+sx+' · '+sy
  if m.startswith('Kordel'):
    hs=holes(m);dm=re.search(r'Ø([\d.]+)',m).group(1).replace('.',',')
    if len(hs)>=2: out=[f'Kordel Ø {dm} mm: Lochabstand {fmt(abs(hs[1][0]-hs[0][0]))} mm (Mitte–Mitte)',f'Lochmitte–Rand: {fmt(hs[0][0])} mm links/rechts · {fmt(hs[0][1])} mm oben']
    elif hs: out=[f'Kordel Ø {dm} mm: 1 Loch mittig',f'Lochmitte–Rand: {fmt(hs[0][1])} mm oben']
    else: out=[f'Kordel Ø {dm} mm: 1 Loch mittig','Lochmitte–Rand: 42,9 mm oben']
    return out
  part=m.split('||')[0];two=holes(part.split('2er')[1].split('4er')[0]) if '2er' in part else [];four=holes(part.split('4er')[1]) if '4er' in part else []
  if two:
    xs=sorted(p[0] for p in two);ys=sorted(p[1] for p in two);dx,dy=xs[-1]-xs[0],ys[-1]-ys[0]
    out.append('2er Ø 4 '+('links/rechts' if dx else 'oben/unten')+f': Lochabstand {fmt(dx or dy)} mm (Mitte–Mitte)')
    out.append(rand(xs[0],W-xs[-1],ys[0],H-ys[-1]))
  if four:
    xs=sorted({p[0] for p in four});ys=sorted({p[1] for p in four})
    out.append(f'4er Ø 4 Ecken: Lochabstand {fmt(xs[-1]-xs[0])} × {fmt(ys[-1]-ys[0])} mm (Mitte–Mitte)')
    out.append(rand(xs[0],W-xs[-1],ys[0],H-ys[-1]))
  ah=r[9]=='ja' or r[10]=='ja'
  out.append('Abstandshalter 12 mm breit: '+('2er/4er' if r[10]=='ja' else '2er')+' auf den Löchern' if ah else 'keine Abstandshalter')
  return out
def kat(g):
  return 'Premium-Schiefer (geschnitten, gerade Kanten, bis 12 mm)' if g.startswith('Premium') else 'Geschnittene Formen (ohne Bruchkante)' if g.startswith(('Formen','Naturschiefer – Türschild klein')) else 'Naturschiefer mit Bruchkante' if g.startswith(('Naturschiefer','Herz')) else 'Kordelschilder (nur Kordel, keine Varianten)'
ORDER=['Premium-Schiefer (geschnitten, gerade Kanten, bis 12 mm)','Geschnittene Formen (ohne Bruchkante)','Naturschiefer mit Bruchkante','Kordelschilder (nur Kordel, keine Varianten)']
FORM=['Rechteck','Quadrat','Rund','Herz','Herz schief','Kreuz','Stern','Knochen']
groups={k:[] for k in ORDER}
for r in rows: groups[kat(r[0])].append(r)
for k in groups: groups[k].sort(key=lambda r:(FORM.index(r[1]),float(r[4])*float(r[5]),float(r[4])))
# Zeichnung in mm, 1:1, Haarlinie
W=2600;X0=20;HL='stroke="#0000ff" stroke-width="0.076" fill="none"'
out=[];y=30;missing=[]
out.append(f'<text x="{X0}" y="{y}" font-size="14" font-weight="700">Schiefer – alle {len(rows)} Tafeln · Konturen 1:1 aus „Gedenktafeln_Schiefer.cdr“ (Chris, final 29.10.), blaue Haarlinie (Corel 0,076 mm), Maße in mm</text>');y+=10
out.append(f'<text x="{X0}" y="{y}" font-size="6">Lochabstand = Mitte zu Mitte. Lochbilder aus der Excel „Schiefer-Gedenktafeln-Groessen-2026-10-29“ (Spalte M). Preise aus der Excel 02.11. In der Zeichnung sind 2er und 4er zusammen eingezeichnet.</text>');y+=22
import copy
for cat in ORDER:
  out=[];y=30
  out.append(f'<text x="{X0}" y="{y}" font-size="14" font-weight="700">Schiefer · {html.escape(cat)} · Originalgröße 1:1 (mm), blaue Haarlinie (0,076 mm), Konturen aus „Gedenktafeln_Schiefer.cdr“ (final 29.10.)</text>');y+=16
  v=groups[cat]
  out.append(f'<text x="{X0}" y="{y}" font-size="11" font-weight="700">{html.escape(cat)} ({len(v)})</text>');y+=12
  for f in FORM:
    vv=[r for r in v if r[1]==f]
    if not vv: continue
    out.append(f'<text x="{X0}" y="{y}" font-size="8" font-weight="700">{f} ({len(vv)})</text>');y+=6
    rowsl=[];cur=[];cx=0
    for r in vv:
      cw=max(float(r[4]),150)
      if cur and cx+cw>W: rowsl.append(cur);cur=[];cx=0
      cur.append((r,cx,cw));cx+=cw+25
    if cur: rowsl.append(cur)
    for rl in rowsl:
      hmax=max(float(r[5]) for r,_,_ in rl)
      for r,cx,cw in rl:
        w,h=float(r[4]),float(r[5]);bx=X0+cx+(cw-w)/2;by=y+hmax-h
        g=geo.get((r[0][:12],r[1],r[3].replace(' ','')));it=match(r)
        if g and g.get('outlinePath') and r[1] in('Herz','Herz schief'):
          body=f'<path d="{g["outlinePath"]}" {HL}/>'
          for v_ in g['variants']:
            for hl in v_['holes']: body+=f'<circle cx="{hl["x"]}" cy="{hl["y"]}" r="{hl.get("diameterMm",5)/2}" {HL}/>'
        elif it:
          body=f'<g transform="scale({1/U}) translate({-it["x"]},{-it["y"]})">'+''.join(f'<path d="{d}" stroke="#0000ff" stroke-width="{0.076*U}" fill="none"/>' for d in it['paths'])+'</g>'
          if not it['holes'] and (r[12] or '').startswith('Kordel'):
            for hx,hy in holes(r[12]):
              dm=float(re.search(r'Ø([\d.]+)',r[12]).group(1));body+=f'<circle cx="{hx}" cy="{hy}" r="{dm/2}" {HL}/>'
        elif r[0].startswith('Naturschiefer – Türschild klein'):
          body=f'<rect width="{w}" height="{h}" {HL}/>'
        else:
          missing.append(r[1]+' '+r[3]);body=f'<rect width="{w}" height="{h}" stroke="#0000ff" stroke-width="0.076" fill="none" stroke-dasharray="4 3"/>'
        out.append(f'<g transform="translate({bx:.2f},{by:.2f})">{body}</g>')
        tx=X0+cx+cw/2;ty=y+hmax+8
        p=prices.get((r[0][:12],r[1],r[3].replace(' ','')))
        price=(f"{p['preis']/100:.2f} €".replace('.',',') if p and p['preis'] else '–')+(f" · mit Foto {p['preisMitFoto']/100:.2f} €".replace('.',',') if p and p.get('preisMitFoto') else '')
        out.append(f'<text x="{tx:.1f}" y="{ty:.1f}" font-size="7" font-weight="700" text-anchor="middle">{html.escape(r[1])} {html.escape(r[3])} cm · {fmt(w)} × {fmt(h)} mm</text>')
        out.append(f'<text x="{tx:.1f}" y="{ty+7:.1f}" font-size="6" text-anchor="middle">{price}</text>')
        for i,l in enumerate(notes(r)): out.append(f'<text x="{tx:.1f}" y="{ty+14+i*6.5:.1f}" font-size="5.5" text-anchor="middle">{html.escape(l)}</text>')
      y+=hmax+44
  H=y+10;Wd=min(W,max(cx for rl in [[0]] for cx in [0])+W)
  name={'Premium':'1-premium','Geschnitt':'2-geschnittene-formen','Naturschi':'3-naturschiefer-bruchkante','Kordelsch':'4-kordelschilder'}[next(k for k in ['Premium','Geschnitt','Naturschi','Kordelsch'] if cat.startswith(k))]
  doc=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W+40}mm" height="{H}mm" viewBox="0 0 {W+40} {H}" font-family="Arial, Helvetica, sans-serif"><rect width="100%" height="100%" fill="#fff"/>'+''.join(out)+'</svg>'
  open(S+'/schiefer-'+name+'.svg','w').write(doc);print(name,round(H),'mm hoch')
