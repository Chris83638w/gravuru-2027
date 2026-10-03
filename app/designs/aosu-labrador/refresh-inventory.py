"""Maintainer-only: regenerate checksums after reviewing intentional resource changes."""
from pathlib import Path
import csv, hashlib, json
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
meta=json.loads((HERE/'resource-provenance.json').read_text(encoding='utf-8'))
known={e['path']:e for e in meta['resources']}
paths=set(known)
for p in HERE.rglob('*'):
    if p.is_file() and '.preview' not in p.parts and '__pycache__' not in p.parts and p.name not in ['RESOURCE-INVENTORY.json','RESOURCE-INVENTORY.csv']:
        paths.add(p.relative_to(ROOT).as_posix())
for p in (ROOT/'continuation/werkstatt-source-20260923').rglob('*'):
    if p.is_file(): paths.add(p.relative_to(ROOT).as_posix())
for name in ['editor-source.html','profile-source.json']:
    paths.add('references/aosu-upgrade-2026-09-21/verification/'+name)
rows=[]
for name in sorted(paths):
    data=(ROOT/name).read_bytes();old=known.get(name,{})
    rows.append(dict(path=name,purpose=old.get('purpose','Reviewed specimen setup, documentation or retained source'),source=old.get('source','Git repository; see file documentation and history'),bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
(HERE/'RESOURCE-INVENTORY.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with (HERE/'RESOURCE-INVENTORY.csv').open('w',encoding='utf-8',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=['path','purpose','source','bytes','sha256']);writer.writeheader();writer.writerows(rows)
print('Inventory:',len(rows),'files;',sum(r['bytes'] for r in rows),'bytes')
