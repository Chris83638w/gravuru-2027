"""One narrow ZIP/XML regression; no product review, approval or final XLSX is created."""
from pathlib import Path
import argparse, tempfile, zipfile, re
import xml.etree.ElementTree as ET
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('graft',Path(__file__).with_name('graft-appendices.py'));g=module_from_spec(spec);spec.loader.exec_module(g)
p=argparse.ArgumentParser();p.add_argument('--source-xlsx',type=Path,required=True);a=p.parse_args()
assert g.sha(a.source_xlsx.read_bytes())==g.SOURCE_SHA
with zipfile.ZipFile(a.source_xlsx) as z:original={n:z.read(n) for n in z.namelist()}
styles=f'<styleSheet xmlns="{g.SS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts><fonts count="1"><font><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'.encode()
extra={'xl/styles.xml':styles,'xl/sharedStrings.xml':f'<sst xmlns="{g.SS}"><si><t>New only</t></si></sst>'.encode()}
extra['xl/workbook.xml']=(f'<workbook xmlns="{g.SS}" xmlns:r="{g.REL}"><sheets>'+''.join(f'<sheet name="{n}" sheetId="{i}" r:id="rId{i}"/>'for i,n in enumerate(g.SHEETS,1))+'</sheets></workbook>').encode()
extra['xl/_rels/workbook.xml.rels']=(f'<Relationships xmlns="{g.PKG}">'+''.join(f'<Relationship Id="rId{i}" Type="{g.REL}/worksheet" Target="worksheets/sheet{i}.xml"/>'for i in range(1,7))+'</Relationships>').encode()
for i in range(1,7):extra[f'xl/worksheets/sheet{i}.xml']=f'<worksheet xmlns="{g.SS}"><cols><col min="1" max="1" style="0"/></cols><sheetData><row r="1" s="0"><c r="A1" t="s" s="0"><v>0</v></c><c r="B1" s="0"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>'.encode()
changed,added=g.combine(original,extra)
assert [n for n,_ in g.sheet_parts({**original,**changed,**added})]==g.SHEETS+[n for n,_ in g.sheet_parts(original)]
old_styles=ET.fromstring(original['xl/styles.xml']);new_styles=ET.fromstring(changed['xl/styles.xml'])
for tag in ['numFmts','fonts','fills','borders','cellStyleXfs','cellXfs']:
    old=list(old_styles.find(g.Q(tag)));new=list(new_styles.find(g.Q(tag)))
    assert [ET.tostring(x)for x in new[:len(old)]]==[ET.tostring(x)for x in old]
offset=len(old_styles.find(g.Q('cellXfs')))
for value in added.values():
    s=ET.fromstring(value);cells=list(s.iter(g.Q('c')))
    assert cells[0].get('t')=='inlineStr' and cells[0].find(g.Q('is')).find(g.Q('t')).text=='New only'
    assert all(c.get('s')==str(offset)for c in cells)
    assert cells[1].find(g.Q('f')).text=='1+1'
    assert next(s.iter(g.Q('col'))).get('style')==str(offset)
    assert next(s.iter(g.Q('row'))).get('s')==str(offset)
named=dict(original);text=original['xl/workbook.xml'].decode();text=text.replace('</workbook>','<definedNames><definedName name="localTest" localSheetId="2">A1</definedName></definedNames></workbook>');named['xl/workbook.xml']=text.encode()
modified,_=g.combine(named,extra);assert 'localSheetId="8"' in modified['xl/workbook.xml'].decode()
with tempfile.TemporaryDirectory(prefix='issue230-v7-xml-') as folder:
    folder=Path(folder);appendix=folder/'new-sheets.zip';result=folder/'combined.zip'
    with zipfile.ZipFile(appendix,'x') as z:
        for name,value in extra.items():z.writestr(name,value)
    proof=g.graft(a.source_xlsx,appendix,result);before=g.sha(result.read_bytes())
    try:g.graft(a.source_xlsx,appendix,result);raise AssertionError('Overwrite accepted')
    except FileExistsError:pass
    assert g.sha(result.read_bytes())==before
assert g.sha(a.source_xlsx.read_bytes())==g.SOURCE_SHA
print('PASS: six-sheet order; old parts/style records; shared strings; style/formula remapping; localSheetId+6; exclusive output; source unchanged. No review/approval/final XLSX generated.')
