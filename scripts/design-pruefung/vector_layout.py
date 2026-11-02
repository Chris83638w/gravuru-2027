"""Vector/font helpers extracted from the reviewed Issue-85 transfer tools.
No raster conversion. Glyph bounds and isotropic path transforms only.
"""
import json,html
from functools import lru_cache
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
PT=25.4/72
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
@lru_cache(None)
def font(p):return TTFont(p)
def bounds(text,p,size=1):
 f=font(str(p));gs=f.getGlyphSet();cmap=f.getBestCmap();pen=BoundsPen(gs);x=0;s=size/f['head'].unitsPerEm
 for c in text:
  name=cmap.get(ord(c));assert name is not None,(str(p),c)
  gs[name].draw(TransformPen(pen,(s,0,0,-s,x,0)));x+=f['hmtx'][name][0]*s
 return pen.bounds or (0,0,x,size)
def box(d):
 p=BoundsPen(None);parse_path(d,p)
 if not p.bounds:return None
 x,y,r,b=p.bounds;return [x,y,r-x,b-y]
def union(bs):
 x=min(b[0] for b in bs);y=min(b[1] for b in bs);return [x,y,max(b[0]+b[2] for b in bs)-x,max(b[1]+b[3] for b in bs)-y]
def transform(d,s,ox=0,oy=0):
 p=SVGPathPen(None);parse_path(d,TransformPen(p,(s,0,0,s,ox,oy)));return p.getCommands()
def place_text(text,font,slot,fonts):
 cx,cy,w,h=slot;b=bounds(text,fonts[font]);size=min(w/(b[2]-b[0]),h/(b[3]-b[1]))
 return {'text':text,'font':font,'sizePt':size/PT,'anchorMm':[cx-(b[0]+b[2])*size/2,cy-(b[1]+b[3])*size/2],'align':'left','letterSpacingMm':0,'lineHeightMm':size*1.2,'color':'#000000'}
def fit_block(text,font,b,fonts,align='center'):
 lines=[l.strip() for l in text.replace('\u2029','').splitlines() if l.strip()];x,y,w,h=b;bs=[bounds(l,fonts[font]) for l in lines];step=1.2
 lo=min(i*step+v[1] for i,v in enumerate(bs));hi=max(i*step+v[3] for i,v in enumerate(bs));size=min(w/max(v[2]-v[0] for v in bs),h/(hi-lo));out=[]
 for i,(line,v) in enumerate(zip(lines,bs)):
  ax=x-v[0]*size if align=='left' else x+w-v[2]*size if align=='right' else x+w/2-(v[0]+v[2])*size/2
  out.append({'text':line,'font':font,'sizePt':size/PT,'anchorMm':[ax,y+(i*step-lo)*size],'align':'left','lineHeightMm':size*step,'letterSpacingMm':0,'color':'#000000'})
 return out
def svg(d):
 w,h=d['plateMm'];parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}mm" height="{h:g}mm">']
 parts.append(f'<ellipse id="platte" cx="{w/2:g}" cy="{h/2:g}" rx="{w/2:g}" ry="{h/2:g}" fill="none" stroke="#999" stroke-width="0.2"/>' if d['form'] in ['Oval','Rund'] else f'<rect id="platte" width="{w:g}" height="{h:g}" fill="none" stroke="#999" stroke-width="0.2"/>')
 for i,m in enumerate(d['motifs'],1):
  parts.append(f'<g id="motiv-{i}">')
  for p in m['paths']:parts.append(f'<path d="{p["d"]}" fill="{p.get("fill") or "none"}" stroke="{p.get("stroke") or "none"}" stroke-width="{p.get("strokeMm",0):.6f}" fill-rule="{"evenodd" if p.get("evenodd") else "nonzero"}"/>')
  parts.append('</g>')
 for i,t in enumerate(d['texts'],1):
  x,y=t['anchorMm'];parts.append(f'<text id="text-{i}" data-feld="text-{i}" x="{x:.6f}" y="{y:.6f}" font-family="{html.escape(t["font"])}" font-size="{t["sizePt"]*PT:.6f}" fill="#000000">{html.escape(t["text"])}</text>')
 return '\n'.join(parts+['</svg>'])
