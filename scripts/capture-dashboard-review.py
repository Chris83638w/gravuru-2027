"""Capture the real dashboard on synthetic data; create a portable visual review.
No public hosting, production connections, private databases, or live operations.
"""
import base64,html,json,os,subprocess,tempfile,time,zipfile,io
from pathlib import Path
from datetime import datetime,timezone
import pymupdf as fitz
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.test-output/dashboard-review';OUT.mkdir(parents=True,exist_ok=True)
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
report={'startedAt':datetime.now(timezone.utc).isoformat(),'sourceCommit':sha,'data':'synthetic only','published':False,'result':'RUNNING','screens':[]}
with tempfile.TemporaryDirectory(prefix='g27-visible-review-') as tmp:
 folder=Path(tmp);(folder/'synthetic-acrylic-engraving-only').touch();env=dict(os.environ);env['PYTHONPATH']=str(ROOT/'.local-data/python');log=(folder/'server.log').open('w')
 server=subprocess.Popen(['node',str(ROOT/'scripts/fixtures/acrylic-engraving.mjs'),str(folder),'uncovered-photo'],cwd=ROOT,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+60
  while not (folder/'ready.json').exists():
   if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Synthetic preview could not start.')
   time.sleep(.1)
  fixture=json.loads((folder/'ready.json').read_text());base=fixture['url'];report['build']=fixture['built'];errors=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
   def capture(key,title,note,selector=None):
    page.evaluate('document.fonts.ready');target=page.locator(selector) if selector else page;target.screenshot(path=str(OUT/(key+'.png')))
    report['screens'].append({'file':key+'.png','title':title,'note':note})
   page.goto(base+'/werkstatt/');expect(page.locator('#product-list')).to_contain_text('synthetische Prüfung');capture('01-produkte','Produktübersicht','Echte Werkstatt mit frisch angelegten synthetischen Prüfprodukten. Kein privater Produktbestand.')
   page.goto(base+'/werkstatt/?configuration='+fixture['productId']);expect(page.locator('#editor-section')).to_be_visible();capture('02-editor','Produkt bearbeiten','Vorhandener Acryl-Produkteditor. Die Aufnahme zeigt den aktuellen Code; es wurde kein Produkt veröffentlicht.')
   page.goto(base+'/werkstatt/serien/');expect(page.get_by_role('heading',name='Produkte als Serie anlegen oder aktualisieren.')).to_be_visible();capture('03-excel','Produktserien und Excel','Echte Importoberfläche. Die beiden mitgelieferten Excel-Dateien sind leere Vorlagen für eure eigenen Daten.')
   for route,name in [('/api/workshop/import-template','Gravuru-Produktserie.xlsx'),('/api/workshop/variant-import-template','Gravuru-Ausfuehrungen.xlsx')]:
    response=page.request.get(base+route)
    if response.status!=200:raise RuntimeError('Template download failed: '+route+' '+str(response.status))
    data=response.body();archive=zipfile.ZipFile(io.BytesIO(data));assert 'xl/workbook.xml' in archive.namelist();(OUT/name).write_bytes(data)
   page.goto(base+'/werkstatt/pruefstaende/?snapshot='+fixture['snapshotId']);expect(page.locator('#photo-quality')).to_be_visible();expect(page.locator('.photo-coverage')).to_contain_text('teilweise frei');capture('04-pruefstand','Gesicherte Gestaltung','Unveränderlicher Prüfstand mit Ausführung, Preis und Originaldateien. Das blaue Bild ist ein künstliches Testfoto.')
   capture('05-bildpruefung','Fotoqualität und Ausschnitt','Geprüfte Pixeldichte und Abdeckung des Fotofensters. Freies Ausrichten bleibt möglich; die Anzeige blockiert keine Ausgabe.','#photo-quality')
   capture('06-gravur','Gravurausgabe','PDF mit 300 dpi als Standard; ZIP mit separater Kontur optional. Noch keine realen Maschinenparameter freigegeben.','#engraving-panel')
   assert not errors;report['javascriptErrors']=errors;browser.close()
  report['result']='PASS'
 except Exception as error:report['error']=str(error);raise
 finally:
  report['finishedAt']=datetime.now(timezone.utc).isoformat();(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');server.terminate()
  try:server.wait(timeout=10)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  log.close()
# Portable, self-contained review of screenshots, not an imitation backend.
sections=[];pdf=fitz.open()
for i,screen in enumerate(report['screens'],1):
 image=OUT/screen['file'];encoded=base64.b64encode(image.read_bytes()).decode();title=screen['title'];note=screen['note']
 sections.append('<section id="bild-'+str(i)+'"><h2>'+html.escape(title)+'</h2><p>'+html.escape(note)+'</p><a href="#navigation">Zur Übersicht ↑</a><img alt="'+html.escape(title,quote=True)+'" src="data:image/png;base64,'+encoded+'"></section>')
 p=pdf.new_page(width=842,height=650);p.insert_text((30,32),title,fontsize=18);p.insert_textbox(fitz.Rect(30,45,812,85),note,fontsize=10);p.insert_image(fitz.Rect(30,90,812,610),filename=str(image),keep_proportion=True);p.insert_text((30,632),'Sichtprüfung · synthetische Daten · Code '+sha[:12]+' · '+str(i)+'/6',fontsize=9)
pdf.save(OUT/'Gravuru-Dashboard-Sichtpruefung.pdf',garbage=4,deflate=True);pdf.close()
links=''.join('<a href="#bild-'+str(i)+'">'+html.escape(s['title'])+'</a>' for i,s in enumerate(report['screens'],1))
(OUT/'Gravuru-Dashboard-Sichtpruefung.html').write_text('<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gravuru · Dashboard-Sichtprüfung</title><style>body{margin:0;background:#f4f5f6;color:#29313a;font:16px/1.55 system-ui}main{max-width:1300px;margin:auto;padding:28px}header,section{background:white;padding:24px;border:1px solid #dde1e5;border-radius:14px;margin-bottom:24px}h1{font-size:30px}h2{font-size:23px}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#334b61}nav a{padding:8px 12px;border:1px solid #d9dfe5;border-radius:9px}img{display:block;width:100%;height:auto;margin-top:16px}small{overflow-wrap:anywhere}@media(max-width:600px){main{padding:12px}header,section{padding:16px}}</style><main><header><h1>Gravuru · aktuelles Dashboard</h1><p><strong>Sichtprüfung mit echten Bildschirmaufnahmen.</strong> Diese Datei ist keine bedienbare App. Sie zeigt die laufende Oberfläche in der Cloud mit synthetischen Daten; ein öffentlicher Dashboard-Zugang wurde nicht eingerichtet.</p><small>Geprüfter Code: '+sha+' · Aufnahme: '+report['finishedAt']+'</small><nav id="navigation">'+links+'</nav></header>'+''.join(sections)+'</main></html>')
print(json.dumps(report,indent=2))
