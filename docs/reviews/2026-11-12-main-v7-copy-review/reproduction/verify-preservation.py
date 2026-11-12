"""Adapted from v9 independent OOXML check: all old parts/cells, six new sheets and mapping."""
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

def check(source,build,mapping_path):
    manifest=json.loads((build/'Manifest.json').read_text('utf-8'));index=json.loads((build/'appendix-index.json').read_text('utf-8'))
    final=build/manifest['output'];before,oldparts=readbook(source);after,newparts=readbook(final)
    assert sha(source.read_bytes())==g.SOURCE_SHA==manifest['sourceSha256']
    assert sha(final.read_bytes())==manifest['xlsxSha256'];assert sha((build/'appendix-index.json').read_bytes())==manifest['indexSha256']
    assert list(after)==g.SHEETS+list(before)
    assert all(after[k]==v for k,v in before.items()),'old cells/formulas changed'
    preserved=[n for n in oldparts if n not in g.CHANGED]
    assert all(newparts[n]==oldparts[n] for n in preserved),'old package part changed'
    assert set(newparts)-set(oldparts)==set(manifest['addedParts']) and len(manifest['addedParts'])==6
    assert manifest['preservedParts']==[{'path':n,'sha256':sha(oldparts[n])} for n in preserved]
    assert manifest['reviewHash']==index['reviewHash'] and manifest['approved'] is False and manifest['executed'] is False
    new_cells=0
    for sheet in index['sheets']:
        cells=after[sheet['name']]; formula_cells=dict(sheet['formulas'])
        assert cells['A2'][1]==sheet['title']
        for r,values in enumerate([sheet['headers'],*sheet['body']],7):
            for col,expected in enumerate(values):
                cell=chr(65+col)+str(r);got=cells.get(cell,('n',None,None))
                if cell in formula_cells:
                    assert got[2][1]==formula_cells[cell].removeprefix('=')
                elif expected is None:assert got[1] is None
                elif isinstance(expected,(int,float)) and not isinstance(expected,bool):assert got[1]==Decimal(str(expected)),(sheet['name'],cell)
                else:assert got[1]==expected,(sheet['name'],cell)
                new_cells+=1
    mapping_bytes=mapping_path.read_bytes()
    assert sha(mapping_bytes)=='3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf'
    mapping=json.loads(gzip.decompress(mapping_bytes));prices=[x for x in mapping['matches'] if x['currentShopUnitCents']!=x['targetUnitCents']]
    labels=[x for x in mapping['matches'] if x['displayLabelChanges']]
    def value(name,cell):return after[name][cell][1]
    assert len(prices)==158 and len(labels)==30 and len(mapping['residualVariants'])==30
    for row,item in enumerate(prices,8):
        assert value('Preisabgleich158','A'+str(row))=='ID '+item['shopifyVariantId'].split('/')[-1]
        assert value('Preisabgleich158','B'+str(row))==item['sku']
        for col,key in [('E','currentShopUnitCents'),('F','targetUnitCents')]:assert value('Preisabgleich158',col+str(row))*100==item[key]
        assert (value('Preisabgleich158','G'+str(row))*100).quantize(Decimal('1'))==item['targetUnitCents']-item['currentShopUnitCents']
    for row,item in enumerate(labels,8):
        assert value('Groessenlabels30','A'+str(row))=='ID '+item['shopifyVariantId'].split('/')[-1]
        assert value('Groessenlabels30','C'+str(row))==item['currentShopSelectedOptions'][0]['value']
        assert value('Groessenlabels30','D'+str(row))==item['proposedSelectedOptions'][0]['value']
    for row,item in enumerate(mapping['residualVariants'],8):
        assert value('Erhalten30','A'+str(row))=='ID '+item['id'].split('/')[-1]
        assert value('Erhalten30','B'+str(row))==item['sku']
        assert value('Erhalten30','D'+str(row))==Decimal(item['price'])
        assert value('Erhalten30','E'+str(row))==1
    result={'schema':'gravuru-main-v7-preservation-check/v1','allPassed':True,'sourceSha256':g.SOURCE_SHA,'xlsxSha256':manifest['xlsxSha256'],
      'reviewHash':manifest['reviewHash'],'previousSheets':len(before),'newSheets':6,'previousCellsAndFormulasUnchanged':True,
      'previousCellCount':sum(map(len,before.values())),'preservedPartCount':len(preserved),'previousSheetTableRelationBytesUnchanged':True,
      'newCellsCompared':new_cells,'priceRows':158,'labelRows':30,'preservedVariantRows':30,'approved':False,'executed':False}
    with (build/'Inhaltspruefung.json').open('x',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps(result))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source-xlsx',type=Path,required=True);p.add_argument('--build-dir',type=Path,required=True);p.add_argument('--mapping',type=Path,required=True)
    a=p.parse_args();check(a.source_xlsx,a.build_dir,a.mapping)
