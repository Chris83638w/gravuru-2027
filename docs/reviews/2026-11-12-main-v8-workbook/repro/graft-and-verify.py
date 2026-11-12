from pathlib import Path
import argparse,json,hashlib,zipfile
from decimal import Decimal
from importlib.util import spec_from_file_location,module_from_spec
def module(name,file):
 s=spec_from_file_location(name,file);m=module_from_spec(s);s.loader.exec_module(m);return m
def sha(b):return hashlib.sha256(b).hexdigest()
p=argparse.ArgumentParser();p.add_argument('--workspace',type=Path,required=True);p.add_argument('--build-dir',type=Path,required=True);a=p.parse_args();root=a.workspace;out=a.build_dir
g=module('graft_existing',root/'work/restabschluss/six-plan-excel/graft-appendices.py');reader=module('readbook_existing',root/'work/restabschluss/six-plan-excel/verify-preservation.py')
ib=(out/'appendix-index.json').read_bytes();index=json.loads(ib)
assert index['schema']=='issue230-main-v8-appendix-build/v1' and len(index['records'])==1
r=index['records'][0];names=[s['name'] for s in r['sheets']];assert names==['AusfuehrungV8','Varianten808','BelegeV8']
source=root/r['previous']['path'];original=root/r['originalExcel']['path'];appendix=out/r['appendix'];target=out/r['output']
assert sha(source.read_bytes())==r['previous']['sha256'] and sha(original.read_bytes())==r['originalExcel']['sha256'] and sha(appendix.read_bytes())==r['appendixSha256']
with zipfile.ZipFile(source) as old,zipfile.ZipFile(appendix) as extra:
 entries={i.filename:old.read(i.filename) for i in old.infolist()};additions={i.filename:extra.read(i.filename) for i in extra.infolist()}
 assert len(entries)==len(old.infolist()) and len(additions)==len(extra.infolist())
 changed,added=g.combine(entries,additions,names=names)
 with zipfile.ZipFile(target,'x',compression=zipfile.ZIP_DEFLATED) as z:
  for info in old.infolist():z.writestr(info,changed.get(info.filename,entries[info.filename]))
  for name,data in added.items():z.writestr(name,data)
before,oldparts=reader.readbook(source);after,newparts=reader.readbook(target);originalcells,_=reader.readbook(original)
assert all(after[k]==v for k,v in before.items()),'Previous cells/formulas changed'
assert all(after[k]==v for k,v in originalcells.items()),'Original cells/formulas changed'
preserved=[n for n in oldparts if n not in g.CHANGED]
assert all(newparts[n]==oldparts[n] for n in preserved),'Old part changed'
assert set(newparts)-set(oldparts)==set(added) and len(added)==3
assert [n for n,_ in g.sheet_parts(newparts)]==names+[n for n,_ in g.sheet_parts(oldparts)]
newcells=0
for s in r['sheets']:
 cells=after[s['name']];assert cells['A2'][1]==s['title']
 for rn,row in enumerate([s['headers']]+s['body'],s['headerRow']):
  for cn,wanted in enumerate(row):
   address=chr(65+cn)+str(rn);got=cells.get(address)
   if wanted=='':assert got is None or got[1] in ('',None),(s['name'],address)
   else:
    assert got is not None and got[2] is None,(s['name'],address,'missing/formula')
    assert got[1]==(Decimal(str(wanted)) if isinstance(wanted,(int,float)) and not isinstance(wanted,bool) else wanted),(s['name'],address,wanted,got)
    newcells+=1
assert sha(source.read_bytes())==r['previous']['sha256']
with zipfile.ZipFile(target) as z:assert z.testzip() is None
record={'group':r['group'],'output':r['output'],'xlsxBytes':target.stat().st_size,'xlsxSha256':sha(target.read_bytes()),'previous':r['previous'],'originalExcel':r['originalExcel'],'variantIds':[v['id'] for v in r['variantRows']],'preservedParts':[{'path':n,'sha256':sha(oldparts[n])} for n in preserved]}
manifest={'schema':'issue230-main-v8-xlsx-manifest/v1','purpose':'completion-evidence-only-not-import','approval':index['approval'],'receiptProvenance':index['receiptProvenance'],'inputSha256':index['inputSha256'],'indexSha256':sha(ib),'sources':index['sources'],'records':[record]}
check={'schema':'issue230-main-v8-preservation-check/v1','allPassed':True,'workbooks':1,'variantRows':808,'originalCells':sum(map(len,originalcells.values())),'previousCells':sum(map(len,before.values())),'newCellsCompared':newcells,'oldSheets':len(before),'newSheets':3,'previousPartsPreserved':len(preserved),'allPreviousCellsIdentical':True,'allOriginalCellsIdentical':True,'allPreservedPartsByteIdentical':True}
for name,value in [('Manifest.json',manifest),('Erhaltungspruefung.json',check)]:
 with (out/name).open('x',encoding='utf-8',newline='\n') as f:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(check))
