"""Contact sheets from native configurator screenshots; never redraw the artwork."""
import argparse,json,html,subprocess,sys,collections,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
from scipy import ndimage
ap=argparse.ArgumentParser();ap.add_argument('--katalog',type=Path,required=True);ap.add_argument('--captures',type=Path,required=True);ap.add_argument('--before',type=Path,required=True);ap.add_argument('--before-contact',type=Path);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--breed');a=ap.parse_args();a.out.mkdir(parents=True,exist_ok=True)
m=json.loads((a.katalog/'auftraege/rasse-15x10-20261102/manifest.json').read_text(encoding='utf8'));font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
if a.breed:m['breeds']=[b for b in m['breeds'] if b['breed'] in a.breed.split(',')]
groups=collections.defaultdict(list)
for r in m['designs']:groups[r['breed']].append(r)
allmetrics=[];links=[]
for b in m['breeds']:
 rows=groups[b['breed']];sheet=Image.new('RGB',(1830,1790),'white');draw=ImageDraw.Draw(sheet);draw.text((20,12),b['name']+' | 15 x 10 cm | 12 Entwürfe',font=font,fill='black')
 comparison=Image.new('RGB',(1830,1150),'white');cd=ImageDraw.Draw(comparison);cd.text((20,12),b['name']+' | links vorher (12x8) / rechts neu (15x10)',font=font,fill='black');has_before=False
 for i,r in enumerate(rows):
  im=Image.open(a.captures/(r['id']+'.png')).convert('RGB');x=15+(i%3)*610;y=60+(i//3)*430
  draw.text((x,y),r['id'],font=font,fill='black');im.thumbnail((600,400));sheet.paste(im,(x,y+28))
  # Largest connected dark engraving component: high threshold excludes the steel texture.
  data=np.asarray(im);gray=data.mean(axis=2);mask=(gray<40);labels,n=ndimage.label(mask);counts=np.bincount(labels.ravel())
  py,px=np.nonzero(gray<232);plate_area=(px.max()-px.min()+1)*(py.max()-py.min()+1)
  max_fraction=float(counts[1:].max()/plate_area) if n else 0
  allmetrics.append({'id':r['id'],'largestConnectedFillFraction':max_fraction});assert max_fraction<.15,(r['id'],max_fraction)
  old=a.before/(r['id'].replace('15x10','12x8')+'.png')
  if old.exists() and not a.before_contact:
   has_before=True;cx=15+(i%3)*610;cy=60+(i//3)*270;cd.text((cx,cy),r['id'],font=font,fill='black')
   for j,p in enumerate([old,a.captures/(r['id']+'.png')]):
    v=Image.open(p).convert('RGB');v.thumbnail((295,210));comparison.paste(v,(cx+j*305,cy+30))
 file=a.out/(b['breed']+'.jpg');sheet.save(file,quality=88);assert file.stat().st_size<=2000000
 result=subprocess.run([sys.executable,str(Path(__file__).with_name('flaeche-messen.py')),str(file),str(a.out/(b['breed']+'-messung.jpg'))],capture_output=True,text=True,encoding='utf8',check=True)
 (a.out/(b['breed']+'-messung.txt')).write_text(result.stdout,encoding='utf8')
 if a.before_contact and (a.before_contact/(b['breed']+'.jpg')).exists():
  previous=Image.open(a.before_contact/(b['breed']+'.jpg')).convert('RGB');comparison=Image.new('RGB',(3660,1840),'white');cd=ImageDraw.Draw(comparison)
  cd.text((20,12),'VORHER · 15 x 10 cm · wiederholtes Hundemotiv',font=font,fill='black');cd.text((1850,12),'JETZT · 15 x 10 cm · verschiedene Motive und Stile',font=font,fill='black');comparison.paste(previous,(0,50));comparison.paste(sheet,(1830,50));has_before=True
 if has_before:
  beforefile=a.out/(b['breed']+'-vorher-nachher.jpg');comparison.save(beforefile,quality=82);assert beforefile.stat().st_size<=2000000
 links.append('<section id="'+b['breed']+'"><h2>'+html.escape(b['name'])+'</h2><img loading="lazy" src="'+file.name+'"><p><a href="'+b['breed']+'-messung.jpg">Flächenmessung</a>'+(' · <a href="'+b['breed']+'-vorher-nachher.jpg">Vorher / Nachher</a>' if has_before else '')+'</p></section>')
 print(b['breed'],flush=True)
(a.out/'flaechen.json').write_text(json.dumps(allmetrics,indent=2)+'\n',encoding='utf8')
nav=''.join('<a href="#'+b['breed']+'">'+html.escape(b['name'])+'</a> ' for b in m['breeds'])
(a.out/'index.html').write_text('<!doctype html><html lang="de"><meta charset="utf-8"><title>Rasseschilder 15 × 10 cm</title><style>body{font:17px system-ui;margin:24px;background:#faf8f3;color:#222}nav{display:flex;flex-wrap:wrap;gap:12px}img{width:100%;max-width:1830px}section{margin-top:48px}a{color:#295b49}</style><h1>Ein Zuhause mit Pfoten</h1><p>'+str(len(m['breeds']))+' Rassen in dieser Ansicht · je zwölf Entwürfe · ausschließlich 15 × 10 cm · echte Konfiguratorvorschau · Freigabe offen</p><nav>'+nav+'</nav>'+''.join(links),encoding='utf8')
print('Largest connected fill:',max(x['largestConnectedFillFraction'] for x in allmetrics))
