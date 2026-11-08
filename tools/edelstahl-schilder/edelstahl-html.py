import os,html,re,json as JJ
from fractions import Fraction
D=os.path.dirname(os.path.abspath(__file__))
exec(open(D+'/edelstahl-daten.py').read())
OUTDIR=os.environ.get('ES_OUT',D+'/art')
MAXW=450  # größte Breite (45 cm) = volle Kartenbreite
def rlabel(w,h):
  f=Fraction(w/h).limit_denominator(20);return f'{f.numerator}:{f.denominator}'
def edge_at(s,y):
  m=re.match(r'\s*M\s*(-?[\d.]+)[ ,](-?[\d.]+)',s.get('outlinePath') or '')
  return float(m.group(1)) if m and abs(float(m.group(2))-y)<0.6 else 0.0
def notes_for(s):
  out=[];seen=set()
  for mid in s['mounting']:
    r=RULES[mid];hs=holes(s,r)
    if not hs or r['count'] in seen: continue
    seen.add(r['count']);nt=note(s,hs,r['count'])
    e=edge_at(s,hs[0][1])
    if e>0.05 and r['count']==2:
      nt[1]=f'Lochmitte–Kontur: {fmt(hs[0][0]-e)} mm links/rechts · {fmt(hs[0][1])} mm oben/unten'
    out+=nt
  return out or ['ohne Löcher']
BEF={'KGL':'Klebeband glatt','KRA':'Klebeband rau'}
def mlabels(s):
  seen=[];
  for mid in s['mounting']:
    l=RULES[mid]['label'];l=BEF.get(mid,l)
    if l not in seen: seen.append(l)
  return 'ohne Befestigung · '+' · '.join(seen)
BOEGEN={};ALLSETS=[];BLIST='';SEED={};secs='';n=0
for fk,fname,vv in card_rows():
  secs+=f'<section><h2>{html.escape(fname)} <span>{len(vv)} Größen</span></h2>'
  series=[]
  for s in vv:
    lab=rlabel(s['widthMm'],s['heightMm'])
    if not series or series[-1][0]!=lab: series.append((lab,[]))
    series[-1][1].append(s)
  for lab,ss in series:
    secs+=f'<h3>Reihe {lab}</h3><div class="grid">'
    for s in ss:
      n+=1;w,h=s['widthMm'],s['heightMm'];pad=4
      hs=[];[hs.extend(holes(s,RULES[m])) for m in s['mounting']];hs=list({(round(x,3),round(y,3),d) for x,y,d in hs})
      body=shape(s)+''.join(f'<circle cx="{x}" cy="{y}" r="{d/2}" {ST}/>' for x,y,d in hs)
      key=s['key'].lower().replace('gr-es-','').replace('-t15','')
      price=f"{s['baseCents']/100:.2f} €".replace('.',',')
      SEED[key]={'name':fname+' '+s['label'],'form':fname,'familienKey':s['key'],'preisCents':s['baseCents'],'befestigung':s['mounting'],'notiz':''}
      tid=f'groesse-{n}';wpx=w/MAXW*100
      secs+=(f'<figure class="card" id="{tid}" data-comment-target="Edelstahl {html.escape(fname)} {html.escape(s["label"])}">'
        f'<div class="plate"><svg viewBox="{-pad} {-pad} {w+2*pad} {h+2*pad}" style="width:{max(wpx,8):.1f}%" role="img" aria-label="{html.escape(fname)} {html.escape(s["label"])}">{body}</svg></div>'
        f'<figcaption><b>{html.escape(fname)} {html.escape(s["label"])}</b><span class="mm">{fmt(w)} × {fmt(h)} mm · {html.escape(s["key"])}</span><span class="price">{price}</span>'
        +''.join(f'<span class="note">{html.escape(l)}</span>' for l in notes_for(s))+
        f'<span class="note" style="color:var(--muted)">{html.escape(mlabels(s))}</span><span class="ol"></span>'
        f'<details class="ed" open data-key="{key}"><summary>Preis dieser Größe</summary><div class="edb" data-pending>Wird geladen …</div></details>'
        f'<button type="button" class="c" data-target="{tid}">Kommentar</button></figcaption></figure>')
    secs+='</div>'
  secs+='</section>'
exec(open(D+'/template.txt').read())
print(n,len(page)//1024,'KB',len(SEED))
