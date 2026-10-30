"""Nur die Anzeige von Gravurfotos ändern; sämtliche Quelldaten bleiben identisch."""
from pathlib import Path
import hashlib,json,re,shutil
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'outputs/schiefer-foto-alle-groessen'
def read(n):return json.loads((OUT/n).read_text('utf-8'))
def digest(b):return hashlib.sha256(b).hexdigest()
masters=read('master-index.json');rows=read('ergebnis.json')['results']
targets=[m['path']+'/vorschau.svg' for m in masters]+[r['path']+'/'+v['preview'] for r in rows for v in r['variants']]
assert len(targets)==7140 and len(set(targets))==7140
examples=['H-rechteck-D221','K-rechteck-D217','H-rechteck-D236','K-herz-D9']
example_dir=OUT/'fotorand-korrektur';example_dir.mkdir(exist_ok=True)
for key in examples:
 src=OUT/'master/rechteck-3-2'/key/'vorschau.svg';backup=example_dir/(key+'-vorher.svg')
 if not backup.exists():shutil.copy2(src,backup)
records=[]
for n,name in enumerate(targets,1):
 p=OUT/name;old=p.read_text('utf-8')
 if 'data-foto-darstellung="screen"' in old:continue
 assert old.count('<svg ')==1 and '<image id="originalfoto-' in old,name
 assert 'style="' not in old,name
 new=old.replace('<svg ','<svg style="isolation:isolate" data-foto-darstellung="screen" ',1)
 new=new.replace('<image id="originalfoto-','<image style="mix-blend-mode:screen" id="originalfoto-')
 # Entfernt man genau die neuen Darstellungsattribute, muss die Datei bytegleich sein.
 restored=new.replace(' style="isolation:isolate" data-foto-darstellung="screen"','',1).replace(' style="mix-blend-mode:screen"','')
 assert restored==old,name
 assert new.count('mix-blend-mode:screen')==old.count('<image id="originalfoto-')
 p.write_text(new,'utf-8')
 records.append({'file':name,'beforeSha256':digest(old.encode()),'afterSha256':digest(new.encode()),'onlyPreviewCompositingChanged':True})
 if n%1000==0:print('Vorschauen aktualisiert:',n,flush=True)
for key in examples:shutil.copy2(OUT/'master/rechteck-3-2'/key/'vorschau.svg',example_dir/(key+'-nachher.svg'))
unchanged=[]
for item in read('datei-manifest.json'):
 name=item['path']
 if name.startswith(('master/','ableitungen/')) and (name.endswith('/gravur.svg') or name.endswith('-gravur.svg') or name.endswith('/design.svg') or name.endswith('/design.json')):
  assert digest((OUT/name).read_bytes())==item['sha256'],name
  unchanged.append(name)
report={'previewFiles':len(targets),'changedNow':len(records),'unchangedEngravingAndEditableFiles':len(unchanged),'photosMasksTextContoursUnchanged':True,'mode':'screen','scope':'SVG-Kundenansichten; Originalfotos und Gravur-/Editierdateien unverändert','nativeConfiguratorInstalled':False,'errors':[],'changes':records}
(OUT/'fotorand-pruefung.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
(OUT/'KONFI-FOTO-DARSTELLUNG.md').write_text('''# Schieferfotos ohne sichtbaren schwarzen Bildrand

Nutzerkorrektur, 30.10.2026: Schwarze Bildhintergründe dürfen im Konfi nicht als Rechteck oder Rahmen auf der Schieferplatte erscheinen.

Die 7.140 SVG-Kundenansichten enthalten deshalb `mix-blend-mode:screen` ausschließlich auf dem Originalfoto und `isolation:isolate` am SVG. Schwarz trägt in diesem Darstellungsmodus keine Helligkeit bei; das Material bleibt dort sichtbar. Helle Fotodetails werden auf das Material gerechnet. Dies ist eine reversible Gravurvorschau, keine Änderung oder Neucodierung der Bilddatei. Auch die originale Maske, der Upload-Hinweis, dekorative Vorlagenrahmen und die blauen technischen Konturen bleiben unverändert.

Für die native Konfi-Integration: denselben Darstellungsmodus innerhalb der vorhandenen Fotomaske auf die Schiefer-Gravurfotos anwenden. Material und Foto müssen im gleichen isolierten Vorschaukontext liegen. Upload-Hinweis und Konturen außerhalb der geblendeten Fotoebene halten. Das Originalfoto im Produktions-/Download-Datenpfad unverändert speichern. Diese Einstellung gilt für die Gravurvorschau auf Schiefer, nicht pauschal für Farbdruckprodukte.

Die gelieferten eigenständigen SVG-Vorschauen und Kontaktbögen sind aktualisiert. Die zuvor dokumentierte native Übernahme freier Fotomasken und eingebetteter Fotos bleibt offen. Eine Live-Änderung am Konfi wird nicht behauptet.

Prüfung: `fotorand-pruefung.json` belegt, dass nur die Darstellungsattribute ergänzt wurden. Pixelvergleich und sichtbare Beispiele stehen unter `fotorand-korrektur/`.
''','utf-8')
print({k:v for k,v in report.items() if k!='changes'},flush=True)
