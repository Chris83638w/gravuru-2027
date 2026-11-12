"""Final execution appendix: existing combine/readbook reused, no workbook content rebuilt."""
from pathlib import Path
import argparse,json,hashlib,zipfile
from decimal import Decimal
from importlib.util import spec_from_file_location,module_from_spec
def module(name,file):
    spec=spec_from_file_location(name,file);m=module_from_spec(spec);spec.loader.exec_module(m);return m
def sha(b):return hashlib.sha256(b).hexdigest()
p=argparse.ArgumentParser();p.add_argument('--workspace',type=Path,required=True);p.add_argument('--build-dir',type=Path,required=True)
args=p.parse_args();root=args.workspace;out=args.build_dir
g=module('graft_old',root/'work/restabschluss/six-plan-excel/graft-appendices.py')
reader=module('readbook_old',root/'work/restabschluss/six-plan-excel/verify-preservation.py')
index_bytes=(out/'appendix-index.json').read_bytes();index=json.loads(index_bytes)
assert index['schema']=='issue230-six-execution-appendix-build/v1' and len(index['records'])==6
names=['Ausfuehrung','Shopzuordnung'];records=[];checks=[]
for r in index['records']:
    source=root/r['previous']['path'];appendix=out/r['appendix'];target=out/r['output']
    assert sha(source.read_bytes())==r['previous']['sha256']
    assert sha(appendix.read_bytes())==r['appendixSha256']
    with zipfile.ZipFile(source) as old,zipfile.ZipFile(appendix) as extra:
        entries={i.filename:old.read(i.filename) for i in old.infolist()}
        additions={i.filename:extra.read(i.filename) for i in extra.infolist()}
        assert len(entries)==len(old.infolist()) and len(additions)==len(extra.infolist())
        changed,added=g.combine(entries,additions,names=names)
        with zipfile.ZipFile(target,'x',compression=zipfile.ZIP_DEFLATED) as z:
            for info in old.infolist():z.writestr(info,changed.get(info.filename,entries[info.filename]))
            for name,data in added.items():z.writestr(name,data)
    before,oldparts=reader.readbook(source);after,newparts=reader.readbook(target)
    original,_=reader.readbook(root/r['originalExcel']['path'])
    assert all(after[k]==v for k,v in before.items()),'Previous cells/formulas changed'
    assert all(after[k]==v for k,v in original.items()),'Original cells/formulas changed'
    preserved=[n for n in oldparts if n not in g.CHANGED]
    assert all(newparts[n]==oldparts[n] for n in preserved),'Previous part bytes changed'
    assert set(newparts)-set(oldparts)==set(added) and len(added)==2
    assert [n for n,_ in g.sheet_parts(newparts)]==names+[n for n,_ in g.sheet_parts(oldparts)]
    new_cells=0
    for s in r['sheets']:
        cells=after[s['name']]
        assert cells['A2'][1]==s['title']
        for rn,row in enumerate([s['headers']]+s['body'],s['headerRow']):
            for cn,wanted in enumerate(row):
                address=chr(65+cn)+str(rn);got=cells.get(address)
                if wanted=='':assert got is None or got[1] in ('',None),(s['name'],address)
                else:
                    assert got is not None and got[2] is None,(s['name'],address,'missing or formula')
                    assert got[1]==(Decimal(str(wanted)) if isinstance(wanted,(int,float)) and not isinstance(wanted,bool) else wanted),(s['name'],address,wanted,got)
                    new_cells+=1
    assert sha(source.read_bytes())==r['previous']['sha256']
    with zipfile.ZipFile(target) as z:assert z.testzip() is None
    finalsha=sha(target.read_bytes())
    checks.append({'group':r['group'],'allPassed':True,'originalCells':sum(map(len,original.values())),'previousCells':sum(map(len,before.values())),'newCellsCompared':new_cells,'previousPartsPreserved':len(preserved),'addedSheets':2,'allPreviousCellsIdentical':True,'allOriginalCellsIdentical':True,'allPreservedPartsByteIdentical':True})
    records.append({'group':r['group'],'output':r['output'],'xlsxBytes':target.stat().st_size,'xlsxSha256':finalsha,'previous':r['previous'],'originalExcel':r['originalExcel'],'creationKey':r['creationKey'],'preparation':r['preparation'],'execution':r['execution'],'shop':r['shop'],'variantIds':[v['variantId'] for v in r['variantRows']],'preservedParts':[{'path':n,'sha256':sha(oldparts[n])} for n in preserved]})
manifest={'schema':'issue230-six-execution-xlsx-manifest/v1','purpose':'completion-evidence-only-not-import','approval':index['approval'],'receipt':index['receipt'],'indexSha256':sha(index_bytes),'inputSha256':index['inputSha256'],'sources':index['sources'],'records':records,'mainWorkbookWritten':False}
result={'schema':'issue230-six-execution-preservation-check/v1','allPassed':True,'workbooks':6,'variantRows':45,'originalCells':sum(x['originalCells'] for x in checks),'previousCells':sum(x['previousCells'] for x in checks),'records':checks}
for name,value in [('Manifest.json',manifest),('Erhaltungspruefung.json',result)]:
    with (out/name).open('x',encoding='utf-8',newline='\n') as f:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({k:result[k] for k in ['allPassed','workbooks','variantRows','originalCells','previousCells']}))
