from pathlib import Path
import copy,hashlib,json,struct,zipfile
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'outputs/schiefer-foto-alle-groessen'
def hash_file(f):
 h=hashlib.sha256()
 with f.open('rb') as src:
  while chunk:=src.read(8*1024*1024):h.update(chunk)
 return h.hexdigest()
def save(name,obj):(OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2),'utf-8')
notes=(OUT/'README.md').read_text('utf-8')
if '## Korrektur: schwarzer Fotohintergrund' not in notes:
 title,rest=notes.split('\n',1)
 notes=title+'\n\n## Korrektur: schwarzer Fotohintergrund\n\nDie Kundenansichten wurden auf Wunsch vom 30.10.2026 aktualisiert: Der schwarze Hintergrund der Originalfotos geht in die Schieferfläche über. 7.140 Vorschau-SVGs, 810 Einzelvorschauen und alle 27 Kontaktbögen sind aktualisiert. Die 11.070 Gravur-/Editierdateien und sämtliche Originalbilddaten bleiben bytegleich. Masken, Upload-Hinweise und blaue Konturen sind erhalten. Der Bildvergleich ist unter `fotorand-korrektur/VERGLEICH.html` zu finden; Nachweise in `fotorand-pruefung.json` und `fotorand-korrektur/pixel-pruefung.json`.\n\nAktuelle Pakete: `Hunde-Katzen-Foto-Alle-Groessen-SVG-ohne-Fotorand.zip` und `Hunde-Katzen-Foto-Kontaktboegen-ohne-Fotorand.zip`. Die vorherigen ZIPs bleiben als Vorversion erhalten. `datei-manifest.json` beschreibt den neuen vollständigen Paketinhalt (außer der Manifestdatei selbst).\n\nDie Darstellungsregel für den nativen Konfi steht in `KONFI-FOTO-DARSTELLUNG.md`. Seine zuvor dokumentierte Foto-/Maskenübernahme bleibt offen; keine Live-Installation behauptet.\n'+rest
 (OUT/'README.md').write_text(notes,'utf-8')
extra=(OUT/'ERGAENZUNGEN.md').read_text('utf-8')
extra=extra.replace('Diese Ergänzungsdateien erweitern das ursprüngliche Datei-Manifest. Ihre eigenen SHA-256-Werte stehen in `ergaenzungen-manifest.json`; beide Manifeste zusammen beschreiben das vollständige ZIP.','Diese Ergänzungsdateien sind im aktuellen vollständigen `datei-manifest.json` enthalten. Für die aktualisierte Fotodarstellung gilt zusätzlich `KONFI-FOTO-DARSTELLUNG.md`.')
(OUT/'ERGAENZUNGEN.md').write_text(extra,'utf-8')
old_zip=OUT/'Hunde-Katzen-Foto-Alle-Groessen-SVG.zip';new_zip=OUT/'Hunde-Katzen-Foto-Alle-Groessen-SVG-ohne-Fotorand.zip'
report={'version':'ohne-Fotorand','packages':[]}
with zipfile.ZipFile(old_zip) as src:
 old_manifest=json.loads(src.read('datei-manifest.json'));old_manifest+=json.loads(src.read('ergaenzungen-manifest.json'))
 original={a['path']:a for a in old_manifest};names=set(src.namelist())-{'datei-manifest.json','ergaenzungen-manifest.json'}
 names.update(['fotorand-pruefung.json','KONFI-FOTO-DARSTELLUNG.md'])
 names.update(p.relative_to(OUT).as_posix() for p in (OUT/'fotorand-korrektur').iterdir() if p.suffix in ['.svg','.png','.json','.html'])
 manifest=[]
 for name in sorted(names):
  f=(OUT/name).resolve();assert f.is_relative_to(OUT.resolve()) and f.is_file(),name
  manifest.append({'path':name,'bytes':f.stat().st_size,'sha256':hash_file(f)})
 save('datei-manifest.json',manifest);lookup={a['path']:a for a in manifest};names.add('datei-manifest.json')
 copied=0;compressed=0
 with zipfile.ZipFile(new_zip,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as dst:
  for i,name in enumerate(sorted(names),1):
   unchanged=name in original and lookup.get(name,{}).get('sha256')==original[name]['sha256']
   if unchanged:
    # Unveränderte, bereits CRC-geprüfte Einträge einschließlich komprimierter
    # Nutzdaten kopieren. Nur der Zentralverzeichnis-Offset wird neu gesetzt.
    entry=src.getinfo(name);assert not entry.flag_bits&8,'Daten-Deskriptor nicht erwartet'
    src.fp.seek(entry.header_offset);header=src.fp.read(30);assert header[:4]==b'PK\x03\x04'
    filename_len,extra_len=struct.unpack_from('<HH',header,26);remaining=filename_len+extra_len+entry.compress_size
    dst.fp.seek(dst.start_dir);new_entry=copy.copy(entry);new_entry.header_offset=dst.fp.tell();dst.fp.write(header)
    while remaining:
     chunk=src.fp.read(min(8*1024*1024,remaining));assert chunk;dst.fp.write(chunk);remaining-=len(chunk)
    dst.start_dir=dst.fp.tell();dst.filelist.append(new_entry);dst.NameToInfo[name]=new_entry;dst._didModify=True;copied+=1
   else:dst.write(OUT/name,name);compressed+=1
   if i%4000==0:print('ZIP',i,'Einträge;',copied,'unverändert kopiert;',compressed,'aktualisiert',flush=True)
 with zipfile.ZipFile(new_zip) as check:
  assert len(check.namelist())==len(names) and set(check.namelist())==names
  assert check.testzip() is None
 report['packages'].append({'file':new_zip.name,'files':len(names),'bytes':new_zip.stat().st_size,'sha256':hash_file(new_zip),'crc':'passed','unchangedEntriesCopied':copied,'updatedEntriesCompressed':compressed})
contacts=json.loads((OUT/'kontaktboegen-index.json').read_text('utf-8'))
names=[c['png'] for c in contacts]+['groessen-ueberblick.png','README.md','KONFI-FOTO-DARSTELLUNG.md','fotorand-korrektur/vergleich.png']
target=OUT/'Hunde-Katzen-Foto-Kontaktboegen-ohne-Fotorand.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1) as z:
 for name in names:z.write(OUT/name,name)
with zipfile.ZipFile(target) as z:assert z.testzip() is None
report['packages'].append({'file':target.name,'files':len(names),'bytes':target.stat().st_size,'sha256':hash_file(target),'crc':'passed'})
save('paket-pruefung-ohne-Fotorand.json',report);print(json.dumps(report,ensure_ascii=False),flush=True)
