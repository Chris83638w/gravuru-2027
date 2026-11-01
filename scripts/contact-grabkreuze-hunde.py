"""One JPG review contact sheet with catalog originals alongside native previews."""
import json, os, io
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import cairosvg
ROOT=Path(__file__).resolve().parent.parent
CAT=Path(os.environ.get('GRAVURU_KATALOG',ROOT.parent/'grabkreuze-hunde-katalog'))
WORK=Path(os.environ.get('GRAVURU_DOG_REVIEW',ROOT.parent.parent/'outputs/grabkreuze-hunde-nachauftrag'))
DEST=ROOT/'docs/handoffs/grabkreuze-hunde-20261101';DEST.mkdir(parents=True,exist_ok=True)
fonts={f['name']:CAT/f['file'] for f in json.loads((CAT/'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
def font(n):return ImageFont.truetype(str(fonts['Lato']),n)
data=json.loads((WORK/'auswahl.json').read_text(encoding='utf-8'))
W,H=4200,3500;board=Image.new('RGB',(W,H),'#eeeae2');draw=ImageDraw.Draw(board)
draw.text((45,28),'HUNDE / SCHWARZ 11×20',fill='#1d292a',font=font(51))
draw.text((46,94),'25 Entwürfe · Rückmeldung #76 · mindestens 2 mm Rand · Original jeweils rechts · 01.11.2026',fill='#34474a',font=font(25))
draw.text((46,134),'Native Konfi-Zielvorschau, keine Browser-Screenshots. Browserprüfung nach Designabnahme durch Claude. Keine Freigabe.',fill='#586064',font=font(23))
for i,d in enumerate(data):
 x=30+(i%5)*830;y=195+(i//5)*650
 draw.rounded_rectangle((x,y,x+805,y+625),radius=14,fill='#fffdf8')
 draw.text((x+23,y+16),f'{i+1:02d}  {d["reviewGroup"]} · {d["name"]}',fill='#17292d',font=font(31))
 draw.text((x+23,y+58),d['id']+'  /  '+d['reviewMode'],fill='#656b69',font=font(21))
 svg=WORK/'native'/(d['id']+'.svg')
 if svg.exists():
  png=cairosvg.svg2png(url=str(svg),output_width=440,output_height=490)
  im=Image.open(io.BytesIO(png)).convert('RGBA');im.save(WORK/'native'/(d['id']+'.png'))
  board.paste(im,(x+2,y+90),im)
 draw.text((x+506,y+101),'ORIGINAL' if d['sourceKey'] else 'NEU',fill='#747a77',font=font(19))
 if d['sourceKey']:
  ref=Image.open(CAT/d['source']/'preview.png').convert('RGB');ref.thumbnail((310,365),Image.Resampling.LANCZOS)
  board.paste(ref,(x+465+(310-ref.width)//2,y+136+(365-ref.height)//2))
  label=d['sourceKey']
 else:label='Ohne Vorlage\nEigenes Motiv'
 if len(label)>28:label=label.replace('gravur-','gravur-\n',1)
 draw.multiline_text((x+468,y+516),label,fill='#5e6664',font=font(19),spacing=5)
 label=', '.join(d['fonts']);label=label if len(label)<63 else label[:60]+'…'
 draw.text((x+23,y+591),label,fill='#586660',font=font(18))
draw.text((46,3460),'A: 8 Gravur-Originale   /   B: 4 UV-Referenzen   /   C: 5 Gedenktafel-Referenzen   /   D: 8 neue Entwürfe (davon 5 ergänzt)',fill='#34474a',font=font(22))
for quality in [92,89,86,83,80,76,72]:
 dest=DEST/'kontaktbogen-schwarz-11x20.jpg';board.save(dest,'JPEG',quality=quality,optimize=True,subsampling=0)
 if dest.stat().st_size<=2_000_000:break
assert dest.stat().st_size<=2_000_000
print(dest, dest.stat().st_size,'bytes, quality',quality)
