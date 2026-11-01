#!/usr/bin/env python3
"""Freiflächen-Prüfung (Claude, 02.11.2026): misst je Platte eines Kontaktbogens (JPG/PNG, weißer Hintergrund)
den Gestaltungsrahmen (alle Gravurpixel) -> Füllgrad und Versatz zur Plattenmitte. Funktioniert für helle und dunkle Platten.
Aufruf: python3 flaeche-messen.py <bogen.jpg> [<markiert.jpg>]
Richtwerte: Versatz der Gruppe <= 3 % (Breite/Höhe), Gruppe deckt >= ca. 30 % der Plattenfläche, auf Querformat >= ca. 45 % der Höhe.
Darunter: nacharbeiten oder im Bericht begründen (z. B. bewusste Asymmetrie mit Motiv als Gegengewicht)."""
import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
src=sys.argv[1]; out=sys.argv[2] if len(sys.argv)>2 else None
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(int)
lum=(a[...,0]*299+a[...,1]*587+a[...,2]*114)//1000
sat=a.max(-1)-a.min(-1)
plate=(lum<232)&(sat<60)                     # nicht-weiß und nicht farbig (Goldrahmen/Schrift ausgeschlossen)
plate=ndimage.binary_closing(plate,iterations=3)
lab,n=ndimage.label(plate); res=[]
for i,sl in enumerate(ndimage.find_objects(lab)):
    h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start
    if h<120 or w<120: continue
    msk=(lab[sl]==i+1)
    if msk.sum()/(h*w)<0.6: continue          # Rahmen/Linien ausfiltern
    y0,x0=sl[0].start,sl[1].start
    m=max(3,int(min(h,w)*0.012))
    er=ndimage.binary_erosion(msk,iterations=m)
    L=lum[sl]; base=np.median(L[er])
    eng=er&(np.abs(L-base)>55)
    ys,xs=np.nonzero(eng)
    if len(xs)<40: continue
    bx0,bx1=np.quantile(xs,[0.002,0.998]); by0,by1=np.quantile(ys,[0.002,0.998])
    ey,ex=np.nonzero(er); W=ex.max()-ex.min(); H=ey.max()-ey.min(); ox,oy=ex.min(),ey.min()
    r=dict(platte=(x0,y0,x0+w,y0+h),fw=(bx1-bx0)/W,fh=(by1-by0)/H,cx=((bx0+bx1)/2-ox-W/2)/W,cy=((by0+by1)/2-oy-H/2)/H,
           links=(bx0-ox)/W,rechts=(ox+W-bx1)/W,oben=(by0-oy)/H,unten=(oy+H-by1)/H,bb=(x0+bx0,y0+by0,x0+bx1,y0+by1),quer=W>H*1.15)
    r['fa']=r['fw']*r['fh']
    f=[]
    if abs(r['cx'])>0.03: f.append(f"waagerecht {r['cx']*100:+.0f} %")
    if abs(r['cy'])>0.03: f.append(f"senkrecht {r['cy']*100:+.0f} %")
    if r['fa']<0.30: f.append(f"Fläche nur {r['fa']*100:.0f} %")
    if r['quer'] and r['fh']<0.45: f.append(f"Höhe nur {r['fh']*100:.0f} %")
    r['befund']=f; res.append(r)
res.sort(key=lambda r:(round(r['platte'][1]/60),r['platte'][0]))
for k,r in enumerate(res,1):
    print(f"{k:2d} Breite {r['fw']*100:3.0f}% Höhe {r['fh']*100:3.0f}% Fläche {r['fa']*100:3.0f}% | Versatz x {r['cx']*100:+5.1f}% y {r['cy']*100:+5.1f}% | {'PRÜFEN: '+', '.join(r['befund']) if r['befund'] else 'ok'}")
if out:
    d=ImageDraw.Draw(im)
    for r in res:
        x0,y0,x1,y1=r['platte']; col=(255,40,40) if r['befund'] else (40,170,60)
        d.line([((x0+x1)/2,y0),((x0+x1)/2,y1)],fill=(60,140,255),width=2); d.line([(x0,(y0+y1)/2),(x1,(y0+y1)/2)],fill=(60,140,255),width=2)
        d.rectangle(r['bb'],outline=col,width=3)
    im.save(out,quality=88)
