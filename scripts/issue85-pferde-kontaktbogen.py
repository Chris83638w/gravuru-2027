"""Render the native target SVGs and put original stock previews beside them."""
import argparse,html,json,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--katalog',required=True);p.add_argument('--out',required=True);a=p.parse_args()
r=Path(a.katalog).resolve();o=Path(a.out).resolve();proof=json.loads((o/'Zielvorschau/pruefung.json').read_text(encoding='utf-8'));rows=json.loads((o/'zuordnung.json').read_text(encoding='utf-8'))
dest=r/'auftraege/2026-11-01-issue85-pferde';dest.mkdir(parents=True,exist_ok=True)
shutil.copytree(o/'Zielvorschau',dest/'vorschau',dirs_exist_ok=True)
images=dest/'bestands-vorschau';images.mkdir(exist_ok=True)
for row in rows:
 shutil.copy(r/row['quelle']/'preview.png',images/(row['bestandKey']+'.png'))
 # Explicitly describe the six non-font source-quality holds.
 if row['status']=='Offen' and not row['fontsMissing']:
  row['begruendung']='Lesekopie enthält einen nicht brauchbaren Foto-/Bildplatzhalter oder unklare mehrfarbige Wappenkonturen; Originalquelle vor einer einfarbigen Übernahme prüfen. Kein Motiv ersatzlos entfernt.'
(dest/'zuordnung.json').write_text(json.dumps(rows,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
shutil.copy(o/'zusammenfassung.json',dest/'zusammenfassung.json')
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True);page=browser.new_page(viewport={'width':600,'height':410},device_scale_factor=1)
 for result in proof['results']:
  f=dest/'vorschau'/result['svg'];page.goto(f.as_uri());page.locator('svg').first.evaluate('(e)=>{e.style.width="590px";e.style.height="395px"}');page.screenshot(path=str(f.with_suffix('.png')))
 browser.close()
esc=html.escape;cards=[]
for did in dict.fromkeys(x['id'] for x in proof['results']):
 targets=[x for x in proof['results'] if x['id']==did];source=next(x for x in rows if x['ziel']==did and x['bestandKey']==x['master'])
 cells=[f'<figure><img src="bestands-vorschau/{esc(source["bestandKey"])}.png"><figcaption>Vorlage · {esc(source["bestandId"])}</figcaption></figure>']
 for t in targets:
  label={'steel-door-signs':'Edelstahl','acryl-3mm-tuerschilder-schwarz':'Acryl 3 mm · Schwarz','acryl-3mm-tuerschilder-anthrazit':'Acryl 3 mm · Anthrazit'}[t['familie']]
  cells.append(f'<figure><a href="vorschau/{esc(t["svg"])}"><img src="vorschau/{esc(Path(t["svg"]).with_suffix(".png").name)}"></a><figcaption>{label} · {esc(t["reviewFit"]["status"])} · {len(t["reviewFit"]["sizes"])} Größen</figcaption></figure>')
 cards.append(f'<article id="{esc(did)}"><h2>{esc(did)} · {esc(targets[0]["name"])}</h2><div class="four">'+''.join(cells)+'</div></article>')
inventory=''.join(f'<article class="stock"><img loading="lazy" src="bestands-vorschau/{esc(x["bestandKey"])}.png"><h3>{esc(x["bestandId"])}</h3><p>{esc(x["status"])} · Master {esc(x["master"])}<br>Ziel: {esc(x["ziel"] or "offen")}</p><p>{esc(x["begruendung"])}</p>'+('<p>Schrift fehlt: '+esc(', '.join(x['fontsMissing']))+'</p>' if x['fontsMissing'] else '')+'</article>' for x in rows)
doc='<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Issue 85 · Pferdeschilder</title><style>body{font:15px system-ui;background:#f5f2ec;color:#24231f;margin:24px}header{max-width:1000px}article{background:white;padding:16px;margin:18px 0;border:1px solid #ddd5c8}h2{font-size:18px}.four{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}figure{margin:0}figure img{width:100%;height:250px;object-fit:contain}figcaption{font-size:12px}summary{cursor:pointer}section.stock-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.stock{margin:0}.stock img{width:100%;height:180px;object-fit:contain}.stock p{font-size:12px}h3{font-size:14px}@media(max-width:1000px){.four,section.stock-grid{grid-template-columns:repeat(2,1fr)}}@media print{body{margin:0}.four{grid-template-columns:repeat(4,1fr)}article{break-inside:avoid}details{display:none}}</style><header><h1>Pferdeschilder · Issue 85</h1><p>13 zusätzliche Entwürfe · 39 echte Konfi-Zielvorschauen · 306 Größenprüfungen · 0 Passungsfehler.</p><p>Alle Freigaben offen. Start ohne Befestigung (K00). Original links, dieselbe bearbeitbare Gestaltung auf drei Materialien rechts. „Prüfen“ betrifft kleine Texte, feine Striche oder die optionale Befestigung; die vollständigen Hinweise stehen in <a href="vorschau/pruefung.json">der Prüfung</a>.</p><p>D74–D81 bleiben im bestehenden <a href="https://github.com/Chris83638w/gravuru-katalog./pull/9">Pferdeschilder-PR 9</a>. Rund wird im Chat Firmenschilder bearbeitet. Keine Importe und keine Live-Schaltung.</p></header>'+''.join(cards)+'<details><summary>Alle 111 Bestandszuordnungen und offenen Quellen anzeigen</summary><section class="stock-grid">'+inventory+'</section></details></html>'
(dest/'kontaktbogen.html').write_text(doc,encoding='utf-8')
steel=[x for x in proof['results'] if x['familie']=='steel-door-signs'];board=Image.new('RGB',(1800,((len(steel)+2)//3)*450),'#eeece7');draw=ImageDraw.Draw(board);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
for i,t in enumerate(steel):
 im=Image.open((dest/'vorschau'/t['svg']).with_suffix('.png')).convert('RGB');board.paste(im,((i%3)*600,(i//3)*450));draw.text(((i%3)*600+8,(i//3)*450+418),t['id'],font=font,fill='black')
board.save(dest/'Neue-Entwuerfe.png');shutil.copy(dest/'Neue-Entwuerfe.png',o/'Neue-Entwuerfe.png')
print(json.dumps(proof['summary']))
