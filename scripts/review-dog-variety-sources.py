"""Review montage of generated source drawings; no alteration of original artworks."""
import argparse,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ap=argparse.ArgumentParser();ap.add_argument('sources',type=Path);ap.add_argument('output',type=Path);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
for folder in sorted(p for p in a.sources.iterdir() if p.is_dir()):
 files=sorted(folder.glob('??-source.png'))
 if not files:continue
 target=a.output/(folder.name+'.jpg')
 sheet=Image.new('RGB',(1560,60+math.ceil(len(files)/3)*420),'white');d=ImageDraw.Draw(sheet);d.text((18,15),folder.name+' | '+str(len(files))+' vorhandene neue Motive',font=font,fill='black')
 for i,p in enumerate(files):
  im=Image.open(p).convert('RGB');im.thumbnail((490,365));x=(i%3)*520;y=60+(i//3)*420;d.text((x+15,y+6),p.name[:2],font=font,fill='black');sheet.paste(im,(x+(520-im.width)//2,y+40+(365-im.height)//2))
 sheet.save(target,quality=87);assert target.stat().st_size<2000000
 print(folder.name,len(files),flush=True)
