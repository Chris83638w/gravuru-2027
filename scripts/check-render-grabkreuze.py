import json, re, math
from pathlib import Path
from html import escape
import cairosvg
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
ROOT=Path(__file__).resolve().parent.parent
CAT=ROOT.parent/'grabkreuze-hunde-katalog'
SERIES=CAT/'designs/grabkreuze-hunde-11x20'
PACK=CAT/'auftraege/2026-11-01-grabkreuze-hunde'
OUT=PACK/'vorschau'
fonts={f['name']:CAT/f['file'] for f in json.loads((CAT/'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
titlefont=ImageFont.truetype(str(fonts['Lato']),22)
labelfont=ImageFont.truetype(str(fonts['Lato']),14)
smallfont=ImageFont.truetype(str(fonts['Lato']),12)
checks=[]
for f in SERIES.glob('*/design.json'):
 d=json.loads(f.read_text(encoding='utf-8')); max_y=0
 assert d['texts'] and not d['photos'] and d['freigabe'] is None
 for t in d['texts']:
  font=TTFont(fonts[t['font']]);gs=font.getGlyphSet();cmap=font.getBestCmap();upm=font['head'].unitsPerEm
  pen=BoundsPen(gs);gs[cmap[ord('H')]].draw(pen)
  size=t['sizePt']*25.4/72;cap=(pen.bounds[3]-pen.bounds[1])/upm*size
  assert cap>=2.99,(d['id'],t['text'],cap)
  for n,line in enumerate(t['text'].splitlines()):
   lows=[]
   for c in line:
    if c not in '\r\n' and ord(c) not in cmap: raise ValueError(f'Missing glyph {c} {d["id"]}')
    if ord(c) in cmap:
     p=BoundsPen(gs);gs[cmap[ord(c)]].draw(p)
     if p.bounds:lows.append(p.bounds[1])
   y=t['anchorMm'][1]+n*t['lineHeightMm']-(min(lows) if lows else 0)/upm*size
   max_y=max(max_y,y)
  font.close()
 for m in d['motifs']:
  max_y=max(max_y,m['box'][1]+m['box'][3]+max(p.get('strokeMm',0) for p in m['paths'])/2)
 variants=[]
 for w,h in [(110,200),(140,250),(220,400)]:
  scale=min(w/110,h/200);oy=(h-200*scale)/2
  bottom=max_y*scale+oy;limit=h-55
  assert bottom<=limit+0.01,(d['id'],w,h,bottom,limit)
  variants.append({'sizeMm':[w,h],'artworkBottomMm':round(bottom,3),'maximumMm':limit,'clearanceMm':round(h-50-bottom,3)})
 checks.append({'id':d['id'],'capHeightMinimumMm':3,'variants':variants})
html=['<!doctype html><meta charset="utf-8"><title>Grabkreuze Hunde · Prüfkontaktbögen</title><style>body{font:16px system-ui;background:#f5f3ee;max-width:1400px;margin:30px auto}img{max-width:100%}a{color:#324a52}nav{display:flex;gap:20px;flex-wrap:wrap}</style><h1>Grabkreuz Acryl – Hunde</h1><p>20 vorläufige Designs · drei Größen · Schwarz und Anthrazit. Native Zielvorschau; untere 50 mm im Prüf-Viewport ausgeblendet. Kundeneditor-Sperre und Shop-Import noch offen. Keine Freigabe.</p><nav>']
dirs=sorted(p for p in OUT.iterdir() if p.is_dir())
for directory in dirs:html.append(f'<a href="#{directory.name}">{directory.name}</a>')
html.append('</nav>')
for directory in dirs:
 files=sorted(f for f in directory.glob('*.svg') if not f.stem.endswith('-voll'))
 board=Image.new('RGB',(1500,1910),'#f5f3ee');draw=ImageDraw.Draw(board)
 draw.text((22,18),f'Grabkreuz Acryl – Hunde · {directory.name}',font=titlefont,fill='#252a2d')
 draw.text((22,51),'Native Konfi-Zielvorschau · Erdteil im Prüf-Viewport ausgeblendet · keine Freigabe',font=labelfont,fill='#555555')
 for i,f in enumerate(files):
  png=f.with_suffix('.png');cairosvg.svg2png(url=str(f),write_to=str(png),output_width=280,output_height=360)
  im=Image.open(png).convert('RGBA');x=(i%5)*300;y=90+(i//5)*450
  board.paste(im,(x+10,y),im)
  d=json.loads((SERIES/f.stem/'design.json').read_text(encoding='utf-8'))
  draw.text((x+15,y+363),f'{f.stem} · {d["name"]}',font=smallfont,fill='#252a2d')
  draw.text((x+15,y+380),d['reviewMode'],font=smallfont,fill='#555555')
  original=SERIES/f.stem/'original.png'
  if original.exists():
   ref=Image.open(original).convert('RGB');ref.thumbnail((70,50));board.paste(ref,(x+215,y+390));draw.text((x+15,y+400),'Original rechts →',font=smallfont,fill='#555555')
  if directory.name=='schwarz-KZ-A-11x20':
   Image.open(png).save(SERIES/f.stem/'preview.png')
 board.save(OUT/(directory.name+'.png'))
 html.append(f'<section id="{directory.name}"><h2>{directory.name}</h2><img src="{directory.name}.png" alt="20 Hundedesigns in {directory.name}"></section>')
(OUT/'kontaktbogen.html').write_text('\n'.join(html),encoding='utf-8')
(PACK/'erdteil-und-schrifthoehe.json').write_text(json.dumps({'checks':checks,'designCount':len(checks),'sizeChecks':len(checks)*3,'failures':0},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(checks)} Master, {len(checks)*3} Erdteil-Prüfungen, 6 Kontaktbögen, 0 Fehler.')
