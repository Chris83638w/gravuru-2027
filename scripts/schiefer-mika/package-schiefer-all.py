from pathlib import Path
import json,re,zipfile,hashlib,os,html,urllib.parse,collections
ROOT=Path(os.environ.get('GRAVURU_PROJECT_ROOT',Path(__file__).resolve().parent.parent))
OUT=ROOT/'outputs/schiefer-alle-groessen'
BASE=ROOT/'outputs/schiefer-30-hunde-30-katzen'
results=json.loads((OUT/'ergebnis.json').read_text(encoding='utf-8'))
masters=json.loads((OUT/'master-index.json').read_text(encoding='utf-8'))
products=json.loads((OUT/'produkte-aus-excel.json').read_text(encoding='utf-8'))
manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
quality=json.loads((OUT/'qualitaetspruefung.json').read_text(encoding='utf-8'))
assert not results['errors'] and not quality['masterContentIssues'] and not quality['missingFonts'] and not quality['smallFonts'] and not quality['textOverflows']
def relative_values(obj):
 if isinstance(obj,dict):return {k:relative_values(v) for k,v in obj.items()}
 if isinstance(obj,list):return [relative_values(v) for v in obj]
 if isinstance(obj,str):
  for base,prefix in [(OUT,''),(BASE,'22x14-quellen/'),(ROOT/'Produkte-Design/gravuru-katalog-neu','gravuru-katalog./'),(ROOT/'Produkte-Design/gravuru-2027-neu','gravuru-2027/')]:
   if obj.startswith(str(base)):return prefix+obj[len(str(base)):].lstrip('\\/').replace('\\','/')
 return obj
def portable(file):
 data=file.read_bytes()
 if file.suffix=='.json':return (json.dumps(relative_values(json.loads(data)),ensure_ascii=False,indent=1)+'\n').encode()
 if file.suffix=='.html':
  text=data.decode('utf-8')
  def repl(m):
   raw=urllib.parse.unquote(m.group(0)).replace('file:///','')
   target=Path(raw)
   if str(target).replace('\\','/').startswith(str(BASE).replace('\\','/')) and target.name=='original.png':target=OUT/'quellen'/f'{target.parent.name}.png'
   try:target.relative_to(OUT)
   except ValueError:return m.group(0)
   return os.path.relpath(target,file.parent).replace('\\','/')
  return re.sub(r'file:///[^"<>\s]+',repl,text).encode()
 return data
rows=[]
for e in manifest:
 d=json.loads((Path(e['folder'])/'design.json').read_text(encoding='utf-8'))
 substitutions=sorted(set(t.get('fontOriginal','')+' → '+t['font'] for t in d['texts'] if t.get('fontOriginal')))
 motifs=d.get('motifSources') or [e['sourcePath']+' / Original-Motivgruppen motiv-1 ff.']
 rows.append({'zielgruppe':e['theme'],'nr':e['number'],'id':e['id'],'name':e['name'],'vorlage':e['sourcePath'] or 'ohne Vorlage; neue Anordnung mit eigenen Bestandsmotiven','modus':e['mode'],'schriften':d['fonts'],'schriftersatz':substitutions,'motive':motifs,'freigabe':None})
(OUT/'design-bericht.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
report='''# Schiefer Hunde und Katzen · Gesamtlieferung · 30.10.2026

30 Hunde-Designs und 30 Katzen-Designs je bestätigter Größen-/Formreihe. 30 Hunde-Bestandsübernahmen; Katzen: 28 Bestandsübernahmen plus 2 neue Anordnungen mit ausschließlich Motiven aus dem eigenen Bestand (Cleo: Katzenmotiv D293, Milo: Herz/Taube D286). Grundlage: Design-Master §§1–8; aktuelle Chatentscheidungen ersetzen die älteren 20er-Aufträge. Die 22×14-Muster wurden vom Nutzer bestätigt. Neue Serien-/Fertigungsfreigaben bleiben offen.

## Inhalt und Bedienung

- `GALERIE.html`: nach Entpacken öffnen. 27 Kontaktbögen, Originalvergleich und Verknüpfungen auf alle Größenausführungen.
- `kontaktboegen/`: 30 Designs pro Bogen; 14 Reihen Hunde und 13 Reihen Katzen (Knochen nur Hunde).
- `master/<reihe>/<quell-ID>/`: ein Master je Reihe, keine manuell doppelt angelegten skalierbaren Größen. `design.json`, editierbare `design.svg`, vektorisierte `kontrollansicht.svg`, `preview.png`.
- `ableitungen/Rxx/<quell-ID>/`: maßhaltige, automatisch aus demselben Ausgangsdesign abgeleitete Ausführungen. Rxx entspricht der Excel-Zeile. SVG-Dateimaße in mm, tatsächliche Kontur und reale Bohrkoordinaten. Keine Fonts oder Bilder von extern nötig: Schablonen/Kontrollansichten enthalten Schriftkonturen. Text bleibt im editierbaren SVG Text.
- `design-bericht.json`: Vorlage, Modus, Schriften, Ersatztabelle und Motivquellen je Auswahl.

## Entscheidungen und Geometrie

Ohne Bohrlöcher hat Vorrang. Die gelochten Varianten verwenden nur die Optionen der Excel. Zwei Löcher seitlich mittig; bei 20×30 Hochformat oben/unten (im Chat erneut bestätigt). Vier Löcher nur an den vier Ecken; Rund und kleine Türschilder ohne 4er-Variante. Bohrung Ø4, Abstandshalter Ø8; Lochpositionen exakt aus der finalen Schiefer-Excel, nicht pauschal skaliert. Außenkontur und alle vorhandenen Bohrkonturen blau #0000ff. Gravur schwarz, einfarbig und vollständig. Bei Lochüberschneidungen sind Zeilenumbrüche/Anordnung angepasst, Motive nie verzerrt oder entfernt.

Kordelschilder sind feste Produkte, niemals zusätzliche Ohne-/2er-/4er-Varianten. Bei den vier blauen festen Produkten R42/R45/R47/R48 fehlen in der Excel Lieferanten-Lochkoordinaten. Diese Dateien heißen ausdrücklich `kordel-fest-LOCHMASSE-OFFEN.svg`: Gestaltung und Außenkontur sind vorbereitet, die Bohrschablone ist noch offen; keine Löcher erfunden. Geschnittene Herzen, Bruchkanten-/Herz-Reihe und Kordelherzen bleiben eigene Excel-Produkte.

Fünf widersprüchliche Herz-Produkte sind gemäß Nutzer ausgelassen und an Claude zur Klärung gemeldet: R11 Herz 24×19, R12 Herz schief 18×13, R39 Herz 20×20, R40 Herz 25×25, R49 festes Kordelherz 22,5×26,7. Exakte Excel-/SVG-Messwerte in `konturen-abgleich.json`. Stern ist für diese Zielgruppen nicht vorgesehen.

## Nachweise und Grenzen

485 unterschiedliche geometrische Master, 1360 Größenableitungen; gemeinsam nutzbare Originaldesigns werden für beide Zielgruppen verwendet. 39 maßlich bestätigte Produkte, 2310 logische Design-/Produktzuordnungen. Native Lieferform-Parserprüfung aller 485 Master: 0 Fehler. Textinhalt über Zeichenvergleich vollständig, Anzahl aller Motivpfade erhalten, keine fehlende Schrift, keine Schriftgröße unter 3 mm, keine Schriftüberstände über die Plattenmaße. 5550 vektorisierte Kontroll-/Ausführungsdateien geprüft; zwei minimale Schriftkonturverschiebungen dokumentiert. Original-Namensbänder bleiben mit ihren Texten zusammen.

22×14 ohne Bohrung wurde mit dem echten targetDesignPreview-Code geprüft: 60 Zuordnungen passen. Der vorhandene Konfi-Code ignoriert bei Gravur teilweise Stroke-/Evenodd-Attribute und zeigt offene Rahmen als Flächen; diese Altlast wurde nicht in den Designs nachgebaut oder als Softwarefix ausgegeben. Die endgültigen Kontrollansichten rendern die tatsächlichen Lieferform-2-Pfadattribute direkt. Neue Form-Familien und deren Konfi-Anschluss sind nicht Bestandteil einer behaupteten Live-Abnahme. In der isolierten bestehenden 22×14-Prüffamilie wurde build-katalog.py ausgeführt (1 Familie); keine produktive Familie/globalen Katalogartefakte ersetzt.

Keine neuen Preise, keine neuen Kundenbibliotheks-Motive, keine Änderung an fremden Familien-Dateien, main oder Live-Systemen. Gesperrte/fehlende Größen werden nicht frei ergänzt. Bestehende freigegebene Schriftersätze sind ausdrücklich im Bericht genannt; fehlende Originalschriften wurden nicht willkürlich ersetzt, sondern entsprechende Vorlagen nicht ausgewählt.

Product Design: bestätigte Referenzgestaltung als Ausgangspunkt, eigene Ergänzungen getrennt markiert; keine digitalen Produkt-Workflows auf physische Schablonen übertragen. Firecrawl: eigene Gravuru-Kategorie als Kontext recherchiert, keine fremden Motive/Texte übernommen: https://gravuru.de/kategorie/gedenktafel-mit-gravur/andenken-fuer-hunde-katzen/

Nächster Schritt: Nutzer beurteilt die Kontaktbögen. Claude klärt die fünf Herz-Maßabweichungen und vier festen Lieferanten-Lochbilder; danach nur diese offenen Ausführungen ergänzen. Maschinen-/Materialabnahme und tatsächliche Kundenrechte im Konfi sind gesonderte Systemabnahmen.
'''
(OUT/'README.md').write_text(report,encoding='utf-8')
(OUT/'CLAUDE-FRAGEN.md').write_text('''# An Claude · offene Geometriefragen, 30.10.2026

Nutzer: „die excel muss passen. Wenn nicht erst auslassen und dann Claude im Anschluss fragen … Herzen mit Bruchkante und geschnittene Herzen sind unterschiedliche Produkte.“

1. R11, geschnittenes Herz 24×19: Excel 240×223,8 mm; tatsächliche SVG-Kontur 240×192 mm. Sind die Excel-Maße irrtümlich Kontrollpunkt- statt Kurvenmaße?
2. R12, geschnittenes Herz schief 18×13: Excel 190,8×143,6 mm; SVG ca. 182,195×133,075 mm.
3. R39/R40, eigene Herz-Reihe: Excel 217,4×204,4 / 271,8×255,6 mm; tatsächliche SVG-Konturen 200×200 / 250×250 mm. Material-/Kanten-Produkte getrennt halten. Was ist zu korrigieren?
4. R49, festes blaues Kordelherz 22,5×26,7: Excel 227×271,1 mm; SVG ca. 224,738×267,010 mm. Bitte Hersteller-/Originalmaß und Kontur abgleichen.
5. Bitte die fehlenden festen Lieferanten-Lochbilder für R42 (20×10), R45 (25×20), R47 (20×25), R48 (Herz 10×10) liefern. Nutzer bestätigt: nur diese feste Ausführung, keine Varianten. Es werden keine Bohrungen erfunden.
6. Konfi-Altlast: Stroke-/Evenodd-Pfadattribute bei Gravur werden ignoriert; korrekte Kontur-Lieferdateien und fehlerhafte native Anzeige bleiben getrennt dokumentiert. Bitte mit #72 abgleichen; neue Form-Familien separat anschließen.
''',encoding='utf-8')
selected=[]
for name in ['README.md','CLAUDE-FRAGEN.md','GALERIE.html','groessen-und-produkte.html','groessen-und-produkte.png','master-index.json','ergebnis.json','design-bericht.json','produkte-aus-excel.json','konturen-abgleich.json','qualitaetspruefung.json','lieferform-pruefung.json','vektor-endpruefung.json']:
 selected.append(OUT/name)
for m in masters:
 for name in ['design.json','design.svg','kontrollansicht.svg','preview.png']:selected.append(Path(m['path'])/name)
for r in results['results']:
 folder=Path(r['folder'])
 for name in ['design.svg','kontrollansicht.svg','ergebnis.json']+[v['file'] for v in r['variants']]:selected.append(folder/name)
selected+=list((OUT/'kontaktboegen').glob('*'))+list((OUT/'quellen').glob('*.png'))
selected=list(dict.fromkeys(selected))
zipfile_path=OUT/'Schiefer-Hunde-Katzen-alle-bestaetigten-Groessen.zip'
with zipfile.ZipFile(zipfile_path,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in selected:z.writestr(f.relative_to(OUT).as_posix(),portable(f))
sha=hashlib.sha256(zipfile_path.read_bytes()).hexdigest()
(OUT/'PAKET-SHA256.txt').write_text(f'{sha}  {zipfile_path.name}\n',encoding='utf-8')
# Kleines Prüfpaket: sämtliche Kontaktbögen, Bericht und offene Fragen.
with zipfile.ZipFile(OUT/'Kontaktboegen-Hunde-Katzen.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in [OUT/'README.md',OUT/'CLAUDE-FRAGEN.md',OUT/'groessen-und-produkte.png']+list((OUT/'kontaktboegen').glob('*.png')):z.write(f,f.relative_to(OUT).as_posix())
# GitHub erhält die Master, Quellen und Prüfnachweise. Große Größenableitungen sind reproduzierbare ZIP-Ausgaben.
remote=[f for f in selected if 'ableitungen' not in f.relative_to(OUT).parts and f.name!='GALERIE.html']
stage=OUT/'github-paket';stage.mkdir(exist_ok=True)
files=[]
for f in remote:
 rel=f.relative_to(OUT);dest=stage/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(portable(f));files.append({'file':str(dest),'path':'auftraege/schiefer-alle-groessen-20261030/'+rel.as_posix()})
(OUT/'github-upload-dateien.json').write_text(json.dumps(files,ensure_ascii=False,indent=1),encoding='utf-8')
print('ZIP:',round(zipfile_path.stat().st_size/1024/1024,2),'MiB, Dateien',len(selected),'GitHub-Dateien',len(files),'SHA256',sha)
