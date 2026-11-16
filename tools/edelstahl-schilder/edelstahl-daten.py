import json,html,re,os
S=os.environ.get('ES_WORK',os.path.dirname(os.path.abspath(__file__)))
FAM=json.load(open(os.environ['ES_FAMILY']))
fmt=lambda v:('%g'%round(float(v),1)).replace('.',',')
G={g['key']:g for g in FAM['groups']};RULES={m['id']:m for m in FAM['mountingRules']}
# Formen wie im Konfi (Ellipse unter „Oval“, Chris 01.11.: eine Form Oval)
FORMS=[('RE','Rechteck'),('AB','Rechteck abgerundet (R5)'),('QU','Quadrat'),('OV','Oval'),('R','Rund'),('RT1','Retro 1'),('RT2','Retro 2')]
FORMOF={'EL':'OV'}
def ratio(w,h):
  from math import gcd
  a,b=round(w*10),round(h*10);g=gcd(a,b);r=(a//g,b//g)
  return r if max(r)<=20 else None
def holes(s,rule):
  if rule['layout']=='none':return []
  if s.get('holesMm') and rule['edgeMm'] is None: return [(h['x'],h['y'],h.get('diameterMm',4)) for h in s['holesMm']]
  w,h,e,d=s['widthMm'],s['heightMm'],rule['edgeMm'],rule['diameterMm']
  pts={'left-right':[(e,h/2),(w-e,h/2)],'top-bottom':[(w/2,e),(w/2,h-e)],'corners':[(e,e),(w-e,e),(e,h-e),(w-e,h-e)]}[rule['layout']]
  return [(x,y,d) for x,y in pts]
def note(s,hs,count):
  W,H=s['widthMm'],s['heightMm'];xs=sorted({round(x,3) for x,_,_ in hs});ys=sorted({round(y,3) for _,y,_ in hs});d=fmt(hs[0][2])
  l,r,t,b=xs[0],W-xs[-1],ys[0],H-ys[-1]
  if count==2:
    dx,dy=xs[-1]-xs[0],ys[-1]-ys[0]
    head=f'{count}er Ø {d} '+('links/rechts' if dx else 'oben/unten')+f': Lochabstand {fmt(dx or dy)} mm (Mitte–Mitte)'
  else: head=f'{count}er Ø {d} Ecken: Lochabstand {fmt(xs[-1]-xs[0])} × {fmt(ys[-1]-ys[0])} mm (Mitte–Mitte)'
  if abs(l-r)<.05 and abs(t-b)<.05 and abs(l-t)<.05: rd=f'Lochmitte–Rand: {fmt(l)} mm zu allen Seiten'
  else:
    sx=f'{fmt(l)} mm links/rechts' if abs(l-r)<.05 else f'{fmt(l)} mm links, {fmt(r)} mm rechts'
    sy=f'{fmt(t)} mm oben/unten' if abs(t-b)<.05 else f'{fmt(t)} mm oben, {fmt(b)} mm unten'
    rd='Lochmitte–Rand: '+sx+' · '+sy
  return [head,rd]
NS='vector-effect="non-scaling-stroke"';ST=f'stroke="var(--cut)" stroke-width="1.2" fill="none" {NS}'
def shape(s):
  w,h=s['widthMm'],s['heightMm'];g=G[s['groupKey']]
  if s.get('outlinePath'): return f'<path d="{s["outlinePath"]}" {ST}/>'
  if g['shape']=='ellipse': return f'<ellipse cx="{w/2}" cy="{h/2}" rx="{w/2}" ry="{h/2}" {ST}/>'
  rr=g.get('cornerRadiusMm') or 0
  return f'<rect width="{w}" height="{h}" rx="{rr}" {ST}/>'
SIZES=[]
for s in FAM['sizes']:
  f=FORMOF.get(s['groupKey'],s['groupKey']);SIZES.append(dict(s,form=f))
def card_rows():
  out=[]
  for fk,fname in FORMS:
    vv=[s for s in SIZES if s['form']==fk]
    # nach skalierbaren Reihen (gleiches Seitenverhältnis), dann Größe
    def rk(s):
      r=s['widthMm']/s['heightMm'];return (round(r,2),s['widthMm']*s['heightMm'])
    vv.sort(key=rk);out.append((fk,fname,vv))
  return out
