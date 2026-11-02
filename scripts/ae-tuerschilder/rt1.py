import json,re,sys
from shapely.geometry import Polygon
def parse_path(d):
    toks=re.findall(r'[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?',d)
    i=0;cmd=None;x=y=0;pts=[];start=None
    def num():
        nonlocal i; v=float(toks[i]); i+=1; return v
    while i<len(toks):
        t=toks[i]
        if re.match(r'[A-Za-z]',t): cmd=t;i+=1
        if cmd=='M': x,y=num(),num(); pts.append((x,y)); start=(x,y); cmd='L'
        elif cmd=='L': x,y=num(),num(); pts.append((x,y))
        elif cmd=='H': x=num(); pts.append((x,y))
        elif cmd=='V': y=num(); pts.append((x,y))
        elif cmd=='C':
            x1,y1,x2,y2,x3,y3=[num() for _ in range(6)]
            p0=(x,y)
            for k in range(1,41):
                t_=k/40; mt=1-t_
                px=mt**3*p0[0]+3*mt*mt*t_*x1+3*mt*t_*t_*x2+t_**3*x3
                py=mt**3*p0[1]+3*mt*mt*t_*y1+3*mt*t_*t_*y2+t_**3*y3
                pts.append((px,py))
            x,y=x3,y3
        elif cmd in 'Zz': i+=0; cmd=None
        else: raise ValueError(cmd)
        if cmd is None and i<len(toks) and not re.match(r'[A-Za-z]',toks[i]): break
    return pts
def offset_path(d,inset=10.0):
    poly=Polygon(parse_path(d)).buffer(0)
    inner=poly.buffer(-inset,join_style='round',quad_segs=32).simplify(0.01)
    minx,miny,maxx,maxy=inner.bounds
    coords=[(round(px-minx,3),round(py-miny,3)) for px,py in inner.exterior.coords]
    # start at the left-most point with smallest y on the left edge for a tidy path
    coords=coords[:-1]
    path='M'+' L'.join(f'{px:g} {py:g}' for px,py in coords)+' Z'
    return path,(maxx-minx,maxy-miny),len(coords)
if __name__=='__main__':
    fam=json.load(open('/home/claude/kat/familien/edelstahl/steel-door-signs.json'))
    for s in fam['sizes']:
        if s['groupKey']!='RT1': continue
        p,ext,n=offset_path(s['outlinePath'])
        print(s['key'], s['widthMm'], s['heightMm'], '->', [round(e,3) for e in ext], n, len(p))
