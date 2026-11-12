"""Existing v7 OOXML cell reader; six workbooks with one new copy-plan sheet each."""
from pathlib import Path
import argparse, json, gzip, zipfile, posixpath, hashlib
from decimal import Decimal
import xml.etree.ElementTree as ET
from importlib.util import spec_from_file_location,module_from_spec

spec=spec_from_file_location('graft',Path(__file__).with_name('graft-appendices.py'));g=module_from_spec(spec);spec.loader.exec_module(g)
Q=g.Q;sha=g.sha
def readbook(p):
    with zipfile.ZipFile(p) as z:files={n:z.read(n) for n in z.namelist()}
    strings=[''.join(e.itertext()) for e in ET.fromstring(files['xl/sharedStrings.xml'])] if 'xl/sharedStrings.xml' in files else []
    sheets={}
    for name,target in g.sheet_parts(files):
        cells={}
        for c in ET.fromstring(files[target]).iter(Q('c')):
            kind=c.get('t','n');v=c.find(Q('v'));f=c.find(Q('f'));raw=None if v is None else v.text
            if kind=='s':value=strings[int(raw)];kind='str'
            elif kind=='inlineStr':value='' if c.find(Q('is')) is None else ''.join(c.find(Q('is')).itertext());kind='str'
            elif kind=='n' and raw is not None:value=Decimal(raw)
            elif kind=='b':value=raw=='1'
            else:value=raw
            if value is not None or f is not None:cells[c.get('r')]=(kind,value,None if f is None else (f.attrib,f.text or ''))
        sheets[name]=cells
    return sheets,files

def main():
    p=argparse.ArgumentParser();p.add_argument('--workspace',type=Path,required=True);p.add_argument('--build-dir',type=Path,required=True)
    a=p.parse_args();build=a.build_dir;index_path=build/'appendix-index.json'
    index=json.loads(index_path.read_text('utf-8'));manifest=json.loads((build/'Manifest.json').read_text('utf-8'))
    assert index['schema']=='gravuru-six-copy-plan-appendix-build/v1' and manifest['schema']=='gravuru-six-copy-plan-xlsx-manifest/v1'
    assert manifest['indexSha256']==sha(index_path.read_bytes()) and len(manifest['records'])==6
    assert manifest['approved'] is False and manifest['executed'] is False and manifest['approvalHash'] is None
    checks=[];prices=0
    for record,r in zip(manifest['records'],index['records']):
        assert record['key']==r['key'] and record['planId']==r['planId'] and record['planHash']==r['planHash']
        source=a.workspace/r['previous'];original=a.workspace/r['original'];final=build/r['output']
        assert sha(source.read_bytes())==r['previousSha256']==record['previousSha256']
        assert sha(original.read_bytes())==r['originalSha256']==record['originalSha256']
        assert sha(final.read_bytes())==record['xlsxSha256']
        before,oldparts=readbook(source);after,newparts=readbook(final);origin,_=readbook(original)
        assert list(after)==['Kopienplan']+list(before)
        assert all(after[k]==v for k,v in before.items()),'previous cells/formulas changed'
        assert all(after[k]==v for k,v in origin.items()),'original price cells/formulas changed'
        preserved=[n for n in oldparts if n not in g.CHANGED]
        assert all(newparts[n]==oldparts[n] for n in preserved),'previous package part changed'
        assert set(newparts)-set(oldparts)==set(record['addedParts']) and len(record['addedParts'])==1
        assert record['preservedParts']==[{'path':n,'sha256':sha(oldparts[n])} for n in preserved]
        spec=r['sheet'];cells=after['Kopienplan'];assert cells['A2'][1]==spec['title']
        for row,values in enumerate([spec['headers'],*spec['body']],7):
            for col,expected in enumerate(values):
                cell=chr(65+col)+str(row);got=cells.get(cell,('n',None,None))
                assert got[2] is None,'unexpected formula in new sheet'
                if isinstance(expected,(int,float)) and not isinstance(expected,bool):assert got[1]==Decimal(str(expected)),cell
                else:assert got[1]==expected,cell
        price_rows=[(i+8,row) for i,row in enumerate(spec['body']) if row[0].startswith('Kombination ')]
        assert len(price_rows)==len(r['variantReview'])
        for (row,_),v in zip(price_rows,r['variantReview']):
            assert cells['C'+str(row)][1]*100==v['unitCents'];prices+=1
        checks.append({'key':r['key'],'xlsxSha256':record['xlsxSha256'],'planId':r['planId'],'planHash':r['planHash'],
          'previousCellCount':sum(map(len,before.values())),'originalCellCount':sum(map(len,origin.values())),
          'allPreviousCellsAndFormulasUnchanged':True,'originalPriceCellsAndFormulasUnchanged':True,
          'allPreviousSheetTableRelationBytesUnchanged':True,'preservedPartCount':len(preserved),'newSheetValuesChecked':True,'priceRows':len(price_rows)})
    assert prices==45
    result={'schema':'gravuru-six-copy-plan-preservation-check/v1','allPassed':True,'checks':checks,'pricesChecked':prices,
      'originalCellCount':sum(c['originalCellCount'] for c in checks),'previousCellCount':sum(c['previousCellCount'] for c in checks),'approved':False,'executed':False}
    with (build/'Inhaltspruefung.json').open('x',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps(result))
if __name__=='__main__':main()
