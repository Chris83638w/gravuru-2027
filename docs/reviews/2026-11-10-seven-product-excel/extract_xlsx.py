"""Read-only extraction of the seven explicitly named product approval sources.

Uses only Python's standard library. No workbook writer, calculation, approval,
native product import, Shopify call or runtime service is involved.
"""
from pathlib import Path
import hashlib, io, json, posixpath, subprocess, zipfile
import xml.etree.ElementTree as ET

PIN = 'bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd'
BRANCH = 'dev/claude-kette-pilot-acryl-20261110'
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'outputs' / 'seven-product-excel-20261110'
NAMES = ['Tuerschild-Acrylglas-3mm_v4.xlsx'] + [f'Tuerschild-Acrylglas-3mm-{s}x2_v2.xlsx' for s in (5,6,8)] + [f'Tuerschild-Edelstahl-{s}x2_v1.xlsx' for s in (5,6,8)]
NS = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

def git_blob(path):
    return subprocess.check_output(['git','show',f'{PIN}:{path}'], cwd=ROOT)

def parse(name, data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            shared = [''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)]
        rels = {n.attrib['Id']:n.attrib['Target'] for n in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        sheets = []
        for sn in wb.findall('s:sheets/s:sheet',NS):
            target = rels[sn.attrib['{'+NS['r']+'}id']]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
            xml = ET.fromstring(z.read(target))
            rows = []
            for row in xml.findall('s:sheetData/s:row',NS):
                cells = []
                for c in row.findall('s:c',NS):
                    kind = c.attrib.get('t','n'); v=c.find('s:v',NS); f=c.find('s:f',NS)
                    raw = v.text if v is not None else None
                    if kind == 'inlineStr': value=''.join(c.find('s:is',NS).itertext()) if c.find('s:is',NS) is not None else None
                    elif kind == 's': value=shared[int(raw)] if raw is not None else None
                    elif kind == 'b': value=(raw=='1') if raw is not None else None
                    else: value=raw
                    if value is not None or f is not None:
                        cells.append({'cell':c.attrib['r'],'type':kind,'value':value,**({'formula':f.text,'formulaAttributes':f.attrib} if f is not None else {})})
                if cells: rows.append({'row':int(row.attrib['r']),'hidden':row.attrib.get('hidden')=='1','cells':cells})
            dim=xml.find('s:dimension',NS)
            sheets.append({'name':sn.attrib['name'],'state':sn.attrib.get('state','visible'),'range':dim.attrib.get('ref') if dim is not None else None,'populatedRows':len(rows),'rows':rows,'merges':[m.attrib['ref'] for m in xml.findall('s:mergeCells/s:mergeCell',NS)],'validations':[ET.tostring(v,encoding='unicode') for v in xml.findall('s:dataValidations/s:dataValidation',NS)]})
        return {'path':'docs/produktfreigaben/'+name,'localPath':str(OUT/'sources'/name),'sourceCommit':PIN,'sourceBranch':BRANCH,'sha256':hashlib.sha256(data).hexdigest(),'gitBlob':subprocess.check_output(['git','rev-parse',f'{PIN}:docs/produktfreigaben/{name}'],cwd=ROOT,text=True).strip(),'bytes':len(data),'sheets':sheets,'definedNames':[dict(n.attrib,text=n.text) for n in wb.findall('s:definedNames/s:definedName',NS)],'externalLinks':[p for p in z.namelist() if p.startswith('xl/externalLinks/')], 'formulaCount':sum('formula' in c for s in sheets for r in s['rows'] for c in r['cells'])}

OUT.mkdir(parents=True,exist_ok=True); (OUT/'sources').mkdir(exist_ok=True)
books=[]
for name in NAMES:
    data=git_blob('docs/produktfreigaben/'+name)
    dest=OUT/'sources'/name
    dest.write_bytes(data)
    assert dest.read_bytes()==data
    books.append(parse(name,data))
mdname='Aenderungsplan-Tuerschild-Edelstahl-Kleinformate_v1.md'
md=git_blob('docs/produktfreigaben/'+mdname)
(OUT/'sources'/mdname).write_bytes(md)
result={'kind':'read-only-xlsx-extraction','sourceCommit':PIN,'sourceBranch':BRANCH,'workbooks':books,'changePlan':{'path':'docs/produktfreigaben/'+mdname,'sha256':hashlib.sha256(md).hexdigest(),'bytes':len(md)},'noWorkbookChanges':True,'noRecalculation':True,'noConfirmationOrExecution':True}
(OUT/'extracted-inputs.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
compact=[]
for b in books:
    compact.append({'file':Path(b['path']).name,'sha256':b['sha256'],'sheets':[{'name':s['name'],'range':s['range'],'populatedRows':s['populatedRows'],'firstRows':s['rows'][:5]} for s in b['sheets']],'formulaCount':b['formulaCount']})
(OUT/'sheet-inventory.json').write_text(json.dumps(compact,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'output':str(OUT),'sourceCommit':PIN,'files':len(books),'unchangedSourceHashes':True,'sheets':[{ 'file':Path(b['path']).name,'sha256':b['sha256'],'sheets':[(s['name'],s['range'],s['populatedRows']) for s in b['sheets']], 'formulas':b['formulaCount']} for b in books]},ensure_ascii=False,indent=2))
