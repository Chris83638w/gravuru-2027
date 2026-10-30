from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont
parser=argparse.ArgumentParser(description='Historischer Kontaktbogen aus den Editor-JPGs vom 29.10.; aktuelle Fassung mit render-family-contact.mjs erzeugen.')
parser.add_argument('--katalog',required=True)
args=parser.parse_args()
root=Path(args.katalog).resolve()/'designs/familie-mika-120x80'
qa=root/'pruefung'
fontpath='C:/Windows/Fonts/arial.ttf'
font=lambda size:ImageFont.truetype(fontpath,size)
sheet=Image.new('RGB',(1470,2470),'#f7f5ef');draw=ImageDraw.Draw(sheet)
draw.text((24,20),'FAMILIENSCHILDER · ASTRA MIKA',font=font(34),fill='#163f3b')
draw.text((24,67),'5 neue Kompositionen · Edelstahl 120 × 80 mm · lokale Editoransichten · Freigabe offen',font=font(21),fill='#364441')
draw.text((24,108),'Original-Einzelmotive',font=font(18),fill='#163f3b')
draw.text((270,108),'3 Personen',font=font(20),fill='#163f3b')
draw.text((870,108),'5 Personen (01 zusätzlich Hund)',font=font(20),fill='#163f3b')
original=Image.open(qa/'originalmotive.jpg')
titles=['Das sind wir','Unser kleines Wir','Die Nachtschwärmer','Hier summt das Leben','Unser kleines Glück']
sourceboxes=[[(24,83,318,283),(332,83,626,283),(24,735,318,936)],[(24,300,318,502),(332,300,626,502)],[(24,517,318,719)],[(640,517,934,719)],[(948,517,1242,719)]]
for row,title in enumerate(titles):
 y=150+row*460
 draw.line((24,y-8,1446,y-8),fill='#d4d9d3',width=1)
 draw.text((24,y+6),f'{row+1:02} · {title}',font=font(23),fill='#163f3b')
 for j,box in enumerate(sourceboxes[row]):
  im=original.crop(box);im.thumbnail((220,120 if len(sourceboxes[row])>1 else 240))
  sheet.paste(im,(24+(220-im.width)//2,y+54+j*124))
 draw.text((24,y+420),'neu · Quellen erhalten',font=font(16),fill='#55645c')
 for count,x in [(3,270),(5,870)]:
  id=f'FAM-MIKA-{row+1:02}-P{count}'
  full=Image.open(qa/(id+'.jpg'))
  # Unretouched 565×376 pixel crop from the actual full-page editor screenshot.
  plate=full.crop((312,388,877,764))
  plate.save(root/id/'preview.png')
  sheet.paste(plate,(x,y+40))
  draw.text((x,y+420),id,font=font(17),fill='#55645c')
draw.text((24,2450),'Bildquelle: echter lokaler Gravuru-Editor. Vollständige Ansichten und Quellen im Prüfungsordner.',font=font(16),fill='#55645c')
sheet.save(qa/'kontaktbogen.jpg',quality=94)
print(str(qa/'kontaktbogen.jpg'))
