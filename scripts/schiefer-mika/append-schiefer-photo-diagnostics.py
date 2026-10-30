from pathlib import Path
import hashlib,json,zipfile
OUT=Path(__file__).resolve().parent.parent/'outputs/schiefer-foto-alle-groessen'
names=['ERGAENZUNGEN.md','galerie-pruefung.json','konfi-pruefung/vergleich.html','konfi-pruefung/vergleich.png']
manifest=[{'path':n,'bytes':(OUT/n).stat().st_size,'sha256':hashlib.sha256((OUT/n).read_bytes()).hexdigest()} for n in names]
(OUT/'ergaenzungen-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
report=json.loads((OUT/'paket-pruefung.json').read_text('utf-8'))
for p in report['packages']:
 target=OUT/p['file'];extra=names+['ergaenzungen-manifest.json'] if p['file'].endswith('SVG.zip') else ['ERGAENZUNGEN.md']
 with zipfile.ZipFile(target) as z:
  before={i.filename:(i.CRC,i.file_size,i.compress_size) for i in z.infolist()}
  assert not set(extra)&set(before),'Ergänzungen bereits enthalten'
 with zipfile.ZipFile(target,'a',compression=zipfile.ZIP_DEFLATED,compresslevel=5) as z:
  for n in extra:z.write(OUT/n,n)
 with zipfile.ZipFile(target) as z:
  after={i.filename:(i.CRC,i.file_size,i.compress_size) for i in z.infolist()}
  assert all(after[n]==v for n,v in before.items())
  for n in extra:assert z.read(n)==(OUT/n).read_bytes() # read verifies CRC
  p['files']=len(z.infolist())
 h=hashlib.sha256()
 with target.open('rb') as f:
  while chunk:=f.read(8*1024*1024):h.update(chunk)
 p.update(bytes=target.stat().st_size,sha256=h.hexdigest(),crc='passed; unchanged prior entries and added entries verified')
 print({k:p[k] for k in ['file','files','bytes','sha256']},flush=True)
report['diagnosticAdditions']=manifest
(OUT/'paket-pruefung.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
