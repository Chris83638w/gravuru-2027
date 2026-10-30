from pathlib import Path
import collections,hashlib,json,shutil,zipfile
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'outputs/schiefer-foto-alle-groessen'
def read(name):return json.loads((OUT/name).read_text('utf-8'))
def save(name,value):(OUT/name).write_text(value if isinstance(value,str) else json.dumps(value,ensure_ascii=False,indent=2),'utf-8')
def file_hash(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  while chunk:=f.read(8*1024*1024):h.update(chunk)
 return h.hexdigest()
masters=read('master-index.json');result=read('ergebnis.json');selection=read('auswahl.json');audit=read('qualitaetspruefung.json');contacts=read('kontaktboegen-index.json');products=read('produkte-aus-excel.json')
assert not audit['errors'] and not result['errors'] and len(masters)==810 and len(result['results'])==2310
native=read('konfi-pruefung/ergebnis.json');counts=collections.Counter(a['passung'] for a in native['ergebnisse'])
parser=read('konfi-pruefung/parser-ergebnis.json')
reassigned=[d['key'] for d in selection if any(p['reassigned'] for p in d['photos'])]
fonts=sorted({f for d in selection for f in d['fonts']})
groups=sorted({m['group'] for m in masters})
table='\n'.join('| '+g+' | '+str(sum(m['group']==g and m['theme']=='hunde' for m in masters))+' | '+str(sum(m['group']==g and m['theme']=='katzen' for m in masters))+' |' for g in groups)
report=f'''# Hunde und Katzen mit Foto · Schiefer · 30.10.2026

Je 30 ausgewählte Bestandsdesigns für Hunde und Katzen, umgesetzt für alle geometrisch bestätigten Produkte der finalen Excel. **810 Master, 2.310 Größenableitungen, 27 Kontaktbögen.** 39 Hundeprodukte und 38 Katzenprodukte; Knochen nur für Hunde. Skalierbare Reihen teilen einen Master. Premium, Bruchkante und feste Kordelprodukte bleiben getrennt.

Öffnen: [GALERIE.html](GALERIE.html). Dort sind alle Kontaktbögen, Einzel-SVGs, Originalvorlagen und Lochvarianten verlinkt. [Größenüberblick](groessen-ueberblick.png).

## Lieferumfang

| Reihe | Hunde | Katzen |
|---|---:|---:|
{table}

- `master/<reihe>/<design>/vorschau.svg`: eigenständige Kundenansicht, Originalfoto eingebettet, originale Fotomaske, Upload-Hinweis direkt auf dem Foto. Schrift als Vektorpfade.
- `master/<reihe>/<design>/gravur.svg`: gleiche Gestaltung, schwarze Gravurvektoren auf transparentem Hintergrund, Originalfoto eingebettet, ohne Bedienhinweis. Blaue technische Konturen bleiben enthalten. Musterfoto als Platzhalter markiert; erst das bestätigte Kundenfoto wird Produktionsinhalt.
- `master/<reihe>/<design>/design.svg` und `design.json`: editierbare Texte und einzeln benannte Motive/Fotofelder für die Übergabe. Schriften werden aus dem freigegebenen Katalog benötigt.
- `ableitungen/Rxx/<design>/`: konkrete Excel-Produktgröße mit ausschließlich den dort vorgesehenen Bohrvarianten; je Variante Vorschau und SVG ohne Bedienhinweis.
- `originalfotos/`: zusätzlich unveränderte Quelldateien, benannt mit SHA-256. Keine Neucodierung, Neuberechnung oder KI-Erzeugung der Bilddaten. Die vorhandene Quellauflösung bleibt erhalten; es wird keine höhere Auflösung behauptet.
- `quellen/` und `quelle-*.png`: Originalvorlagen zum Vergleich. Alle Bilder und Motive stammen aus dem eigenen Katalog.

## Gestaltung und Herkunft

Grundlage: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md), Issue #76, NEUSTART.md und die nachfolgenden Nutzeranweisungen in diesem Chat. Die Freigabe des Molly-Fotobeispiels einschließlich Upload-Hinweis ist die Ausführungsreferenz.

Passende Rechteckvorlagen wurden proportional übernommen. Bei anderen Formaten wurden Foto, Name, Daten, vollständiger Spruch und vorhandene Motive passend zur Platte angeordnet. Die Originalmaske und Motive werden nur gleichmäßig skaliert/verschoben. Es wurden keine fremden oder neuen Fotos verwendet.

Ein Teil der Tierordner enthält Bilder der jeweils anderen Tierart. Für {len(reassigned)} von 60 Vorlagen wurde deshalb ein passendes Hunde- bzw. Katzenfoto aus dem eigenen Bestand zugeordnet, ebenfalls bytegleich und innerhalb der ursprünglichen Maske. Die Zuordnung steht vollständig in `auswahl.json` und `fotonachweise.json`; die Originalvorlage bleibt daneben sichtbar. Zwei Hunde- und drei Katzenvorlagen stammen aus weiteren Bestandsformaten. Unbrauchbare extrahierte Masken/Motive (D213, D208, D220) und Vorlagen ohne verfügbare freigegebene Schrift wurden nicht verwendet.

{len(fonts)} verwendete Katalogschriften: {', '.join(fonts)}. Nur vorhandene Original- oder bereits freigegebene Ersatzschriften aus `ersatz-gedenktafeln-22x14.json`. Keine neuen Schriftfreigaben angenommen. Quellen und Ersatznamen stehen je Text in `design.json`.

Ohne Bohrlöcher ist die primäre Ansicht. Außenkonturen und vorhandene Bohrlöcher sind `#0000ff`. Zwei Löcher liegen gemäß Excel seitlich mittig; beim 20×30-Hochformat bleibt die ausdrücklich bestätigte Excel-Ausführung oben/unten. Vier Löcher liegen an den Ecken. Bei Textkonflikten werden Zeilen umgebrochen/neu angeordnet. Es werden keine nicht angebotenen Varianten erfunden.

## Prüfung

- {audit['svgFilesChecked']:,} SVG-Dateien geprüft; {audit['originalImagesChecked']:,} Foto-Einbettungen per SHA-256 bytegleich mit den Quelldateien.
- {audit['maskTransformsChecked']:,} Maskentransformationen geprüft: identische Pfadstruktur und gleichmäßige Skalierung, keine Verzerrung.
- {audit['photoPlacementsChecked']:,} Foto-Anordnungen gegen die Plattengeometrie geprüft, einschließlich deckender schwarzer Originalränder.
- Editierstruktur zusätzlich semantisch verglichen (`editierstruktur-pruefung.json`): eindeutige Pfadschreibweise und die Schmetterlingswolke als zusammengehörige Motivgruppe, ohne Bild-, Masken-, Pfad- oder Textänderung.
- {audit['uploadHintsChecked']:,} Upload-Hinweise in den Kundenansichten; keine in den Gravur-/Editierdateien.
- Maße, blaue Konturen, Lochanzahl, Lochmittelpunkte und Durchmesser gegen die Excel-Daten geprüft. Vollständige Texte, Motivanzahl, Mindestschriftgröße 3 mm und Bild-Seitenverhältnisse geprüft.
- Ergebnis der eigenständigen SVG-Prüfung: **0 Fehler**. Vollständiger Nachweis: `qualitaetspruefung.json`.
- Sichtprüfung der gerenderten Kontaktbögen und repräsentativer Einzeldateien; deckende Bildränder bei den Sonderformen wurden durch proportionale Platzierung korrigiert. Rohbilder und Masken bleiben unverändert.

## Noch nicht im Konfigurator freigegeben

Das unveränderte Pflichtwerkzeug `scripts/design-pruefung/konfi-vorschau.mjs` wurde für die 60 Master auf 22×14 mit einer isolierten, Excel-konformen Familie ausgeführt: **{dict(counts)}**. Der originale SVG-Leser wurde außerdem auf allen 810 Mastern ausgeführt; {sum(bool(a.get('error')) for a in parser['masters'])} Parserfehler. Die nativen Ergebnisse sind unverändert unter `konfi-pruefung/` beigefügt.

Diese technische Passungsprüfung ist keine visuelle Foto-Abnahme im Konfi: Der bestehende Import ersetzt freie Pfadmasken durch Rechtecke und übernimmt eingebettete Data-URI-Musterfotos nicht. Die Meldungen „passt nicht“ betreffen die vom Import berechneten Namens-, Motiv- und Maskenbegrenzungen; die eigenständigen SVGs wurden gesondert geprüft. Auch die bekannte Behandlung offener Linien/Rahmen bleibt eine Konfi-Grenze. **Die gelieferten Kontaktbögen zeigen die fertigen eigenständigen SVGs, nicht den noch fehlerhaften nativen Import.** Eine native Integration, Live-Veröffentlichung oder Produktionsfreigabe wird nicht behauptet; `freigabe` bleibt `null`. Das frühere Paket ohne Foto bleibt unangetastet.

## Bewusst ausgelassene bzw. offene Produkte

Wie vom Nutzer entschieden bleiben diese fünf Herzprodukte bis zur Maßklärung mit Claude ausgelassen: R11 geschnittenes Herz 24×19, R12 schiefes Herz 18×13, R39 Bruchkante-Herz 20×20, R40 Bruchkante-Herz 25×25, R49 festes Kordel-Herz 22,5×26,7. Excel-Umhüllungsmaß und tatsächliche SVG-Kontur widersprechen sich. Die Produktarten wurden nicht miteinander ersetzt.

Bei vier festen Kordelprodukten sind Design und Außenkontur vorhanden, die vom Lieferanten vorgegebenen Lochmaße fehlen jedoch: R42 20×10, R45 25×20, R47 20×25, R48 Herz 10×10. Sie heißen ausdrücklich `kordel-fest-LOCHMASSE-OFFEN`; keine erfundenen Bohrkonturen und keine zusätzliche Variante ohne Löcher. Stern R16 gehört ausschließlich zu Sternenkindern und ist außerhalb dieses Auftrags.

Nächster Integrationsschritt: freie SVG-Fotomasken und eingebettete Originalbilder im Konfi übernehmen; danach erneuter nativer Sichtvergleich. Die fünf Maßkonflikte und vier Lieferanten-Lochbilder müssen aus den Originalunterlagen geklärt werden.
'''
save('README.md',report)
files=set()
def add(name):
 p=OUT/name
 assert p.is_file(),str(p)
 files.add(Path(name).as_posix())
for m in masters:
 for name in ['design.json','design.svg','vorschau.svg','gravur.svg','preview.png']:add(Path(m['path'])/name)
for r in result['results']:
 for name in ['design.svg','ergebnis.json']+[v[k] for v in r['variants'] for k in ['preview','engraving']]:add(Path(r['path'])/name)
for d in selection:
 add('quelle-'+d['key']+'.png')
 for name in ['design.svg','design.json','preview.png']:
  source=Path(d['sourceFolder'])/name;dest=OUT/'quellen'/d['key']/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest);add(dest.relative_to(OUT))
 for source in Path(d['sourceFolder']).glob('foto-*'):
  if source.suffix.lower() in ['.png','.jpg','.jpeg']:
   dest=OUT/'quellen'/d['key']/source.name;shutil.copy2(source,dest);add(dest.relative_to(OUT))
for a in read('fotonachweise.json'):
 source=Path(a['path']);dest=OUT/'originalfotos'/(a['sha256']+source.suffix.lower());dest.parent.mkdir(exist_ok=True);shutil.copy2(source,dest);assert hashlib.sha256(dest.read_bytes()).hexdigest()==a['sha256'];add(dest.relative_to(OUT))
for c in contacts:
 add(c['png']);add(c['html'])
for p in (OUT/'konfi-pruefung').iterdir():
 if p.suffix in ['.svg','.json','.html','.png']:add(p.relative_to(OUT))
for name in ['README.md','GALERIE.html','groessen-ueberblick.html','groessen-ueberblick.png','kontaktboegen-index.json','master-index.json','ergebnis.json','auswahl.json','fotonachweise.json','produkte-aus-excel.json','qualitaetspruefung.json','editierstruktur-pruefung.json','quellstand.json']:add(name)
manifest=[{'path':f,'bytes':(OUT/f).stat().st_size,'sha256':hashlib.sha256((OUT/f).read_bytes()).hexdigest()} for f in sorted(files)]
save('datei-manifest.json',manifest);add('datei-manifest.json')
packages=[]
for name,chosen in [('Hunde-Katzen-Foto-Alle-Groessen-SVG.zip',sorted(files)),('Hunde-Katzen-Foto-Kontaktboegen.zip',[c['png'] for c in contacts]+['groessen-ueberblick.png','README.md'])]:
 target=OUT/name
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
  for n,f in enumerate(chosen):
   z.write(OUT/f,f)
   if n and n%2000==0:print(name,n,'Dateien',flush=True)
 with zipfile.ZipFile(target) as z:
  assert set(z.namelist())==set(chosen)
  bad=z.testzip();assert bad is None,bad
 digest=file_hash(target)
 packages.append({'file':name,'files':len(chosen),'bytes':target.stat().st_size,'sha256':digest,'crc':'passed'})
 print(packages[-1],flush=True)
save('paket-pruefung.json',{'packages':packages,'files':len(manifest),'bytesUncompressed':sum(m['bytes'] for m in manifest)})
