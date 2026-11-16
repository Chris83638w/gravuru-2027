"""Append artifact-authored worksheet while preserving all original worksheets verbatim."""
from pathlib import Path
import copy, hashlib, json, re, zipfile
import xml.etree.ElementTree as ET

BASE=Path.cwd()
WORK=BASE/'work/product-plans-sheets'
PREVIOUS=BASE/'outputs/Produktplaene-230/Excel-Nachtraege'
OUT=BASE/'outputs/Produktplaene-230-v9/Excel-Nachtraege'
OUT.mkdir(parents=True,exist_ok=True)
SS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG='http://schemas.openxmlformats.org/package/2006/relationships'
CT='http://schemas.openxmlformats.org/package/2006/content-types'
ET.register_namespace('',SS); ET.register_namespace('r',REL)
Q=lambda name:'{'+SS+'}'+name
sha=lambda data:hashlib.sha256(data).hexdigest()

def append_collection(original_xml,tag,children):
    """Append entries without reserializing existing style records."""
    if not children:return original_xml
    pattern=rf'<{tag}\b([^>]*)>(.*?)</{tag}>'
    match=re.search(pattern,original_xml,re.S)
    assert match,tag
    count=int(re.search(r'count="(\d+)"',match.group(1)).group(1))
    attrs=re.sub(r'count="\d+"',f'count="{count+len(children)}"',match.group(1))
    serialized=''.join(ET.tostring(x,encoding='unicode') for x in children)
    replacement=f'<{tag}{attrs}>{match.group(2)}{serialized}</{tag}>'
    return original_xml[:match.start()]+replacement+original_xml[match.end():]

def make_styles(original_bytes,extra_bytes):
    original=ET.fromstring(original_bytes); extra=ET.fromstring(extra_bytes)
    xml=original_bytes.decode('utf-8')
    offsets={tag:len(original.find(Q(tag))) for tag in ['fonts','fills','borders','cellStyleXfs','cellXfs']}
    old_num=original.find(Q('numFmts')); new_num=extra.find(Q('numFmts'))
    num_map={}; next_num=max([163]+[int(x.get('numFmtId')) for x in old_num]) + 1
    new_nums=[]
    if new_num is not None:
        for old in new_num:
            c=copy.deepcopy(old); previous=int(c.get('numFmtId')); num_map[previous]=next_num
            c.set('numFmtId',str(next_num));next_num+=1;new_nums.append(c)
    xml=append_collection(xml,'numFmts',new_nums)
    for tag in ['fonts','fills','borders','cellStyleXfs','cellXfs']:
        additions=[]
        for old in extra.find(Q(tag)):
            c=copy.deepcopy(old)
            if tag in ['cellStyleXfs','cellXfs']:
                for attr,col in [('fontId','fonts'),('fillId','fills'),('borderId','borders')]:
                    if attr in c.attrib:c.set(attr,str(int(c.get(attr))+offsets[col]))
                if 'numFmtId' in c.attrib:
                    n=int(c.get('numFmtId'))
                    if n>=164:c.set('numFmtId',str(num_map[n]))
                if 'xfId' in c.attrib:c.set('xfId',str(int(c.get('xfId'))+offsets['cellStyleXfs']))
            additions.append(c)
        xml=append_collection(xml,tag,additions)
    return xml.encode('utf-8'),offsets['cellXfs']

index=json.loads((WORK/'appendix-index.json').read_text('utf-8'))
manifest={'schema':'gravuru-issue230-excel-appendices/v2','planRun':'v9','summarySha256':index['summarySha256'],
    'decisionsManifestSha256':index['decisionsManifestSha256'],'decisionsFileSha256':index['decisionsFileSha256'],
    'scope':'Seven versioned copies of the v8 appendices. Exactly one new sheet per workbook; all existing worksheet and table bytes preserved.',
    'provenance':'Native plans bind the original XLSX SHA. The new appendix references the final plan. This external manifest hashes the new XLSX; no self-hash or circular hash claim.',
    'newSheet':'PlanstandV9','sourceWorkbooksUnchanged':True,'records':[]}
for item in index['records']:
    original_path=PREVIOUS/item['previous']; appendix_path=WORK/(item['output']+'.appendix.xlsx')
    original_bytes=original_path.read_bytes();assert sha(original_bytes)==item['previousSha256']
    with zipfile.ZipFile(original_path) as original,zipfile.ZipFile(appendix_path) as appendix:
        entries={i.filename:original.read(i.filename) for i in original.infolist()}
        assert not any(n.startswith('xl/worksheets/_rels/') for n in appendix.namelist()),'appendix has relationships'
        stylesheet,style_offset=make_styles(entries['xl/styles.xml'],appendix.read('xl/styles.xml'))
        sheet=ET.fromstring(appendix.read('xl/worksheets/sheet1.xml'))
        shared=[]
        if 'xl/sharedStrings.xml' in appendix.namelist():shared=list(ET.fromstring(appendix.read('xl/sharedStrings.xml')))
        for cell in sheet.iter(Q('c')):
            cell.set('s',str(int(cell.get('s','0'))+style_offset))
            if cell.get('t')=='s':
                si=shared[int(cell.find(Q('v')).text)];cell.remove(cell.find(Q('v')));cell.set('t','inlineStr')
                inline=ET.SubElement(cell,Q('is'))
                for child in si:inline.append(copy.deepcopy(child))
        for col in sheet.iter(Q('col')):
            if 'style' in col.attrib:col.set('style',str(int(col.get('style'))+style_offset))
        for row in sheet.iter(Q('row')):
            if 's' in row.attrib:row.set('s',str(int(row.get('s'))+style_offset))
        workbook_xml=entries['xl/workbook.xml'].decode('utf-8')
        wb_tree=ET.fromstring(workbook_xml)
        sheet_id=max(int(x.get('sheetId')) for x in wb_tree.find(Q('sheets')))+1
        rels_xml=entries['xl/_rels/workbook.xml.rels'].decode('utf-8')
        rel_tree=ET.fromstring(rels_xml)
        rel_id='rId'+str(max(int(x.get('Id')[3:]) for x in rel_tree if x.get('Id','').startswith('rId'))+1)
        new_sheet_path=f'xl/worksheets/sheet{sheet_id}.xml'
        assert new_sheet_path not in entries
        sheet_tag=f'<sheet xmlns:r="{REL}" name="PlanstandV9" sheetId="{sheet_id}" state="visible" r:id="{rel_id}"/>'
        # Insert the new current appendix first; original tabs retain their relative order and bytes.
        workbook_xml=workbook_xml.replace('<sheets>','<sheets>'+sheet_tag,1)
        # Shift sheet-local named ranges because a leading sheet was added.
        workbook_xml=re.sub(r'localSheetId="(\d+)"',lambda m:f'localSheetId="{int(m.group(1))+1}"',workbook_xml)
        workbook_xml=re.sub(r'activeTab="\d+"','activeTab="0"',workbook_xml)
        relation=f'<Relationship Type="{REL}/worksheet" Target="/{new_sheet_path}" Id="{rel_id}"/>'
        rels_xml=rels_xml.replace('</Relationships>',relation+'</Relationships>')
        types_xml=entries['[Content_Types].xml'].decode('utf-8')
        types_xml=types_xml.replace('</Types>',f'<Override PartName="/{new_sheet_path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
        changed={'xl/styles.xml':stylesheet,'xl/workbook.xml':workbook_xml.encode('utf-8'),
                 'xl/_rels/workbook.xml.rels':rels_xml.encode('utf-8'),'[Content_Types].xml':types_xml.encode('utf-8')}
        for value in changed.values():ET.fromstring(value)
        result_path=OUT/item['output']
        with zipfile.ZipFile(result_path,'w',compression=zipfile.ZIP_DEFLATED) as target:
            for info in original.infolist():target.writestr(info,changed.get(info.filename,entries[info.filename]))
            target.writestr(new_sheet_path,ET.tostring(sheet,encoding='utf-8',xml_declaration=True))
        with zipfile.ZipFile(result_path) as final:
            assert final.testzip() is None
            preserved=[name for name in entries if name not in changed]
            assert all(final.read(name)==entries[name] for name in preserved)
            assert len(final.namelist())==len(entries)+1
            records=[{'path':n,'sha256':sha(entries[n])} for n in preserved if n.startswith(('xl/worksheets/','xl/tables/'))]
        item.update({'xlsxSha256':sha(result_path.read_bytes()),'size':result_path.stat().st_size,
                     'modifiedPackageParts':list(changed),'addedPackagePart':new_sheet_path,
                     'unchangedOriginalParts':len(preserved),'preservedSheetAndTableParts':records})
        manifest['records'].append(item)
        print(item['output'],len(records),'original worksheet/table parts byte-identical')
(OUT/'Manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Seven versioned appendices written with an external SHA manifest.')
