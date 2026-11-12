"""Six-sheet specialization of the proven v9 byte-preserving OOXML graft."""
from pathlib import Path
import argparse, copy, hashlib, json, posixpath, re, zipfile
import xml.etree.ElementTree as ET

SS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG='http://schemas.openxmlformats.org/package/2006/relationships'
Q=lambda name:'{'+SS+'}'+name
ET.register_namespace('',SS); ET.register_namespace('r',REL)
sha=lambda data:hashlib.sha256(data).hexdigest()
SHEETS=['HauptzielV7','Preisabgleich158','Groessenlabels30','Erhalten30','BelegeV7','AblaufV7']
SOURCE_SHA='37a704d892b0f24fffdd87c7c5090652e5a949f3091dd8117ff83567e49d1429'
CHANGED=['xl/styles.xml','xl/workbook.xml','xl/_rels/workbook.xml.rels','[Content_Types].xml']

# The existing v9 append-only style remapping is retained.
def append_collection(original_xml,tag,children):
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

def sheet_parts(entries):
    rels={r.get('Id'):r.get('Target') for r in ET.fromstring(entries['xl/_rels/workbook.xml.rels'])}
    result=[]
    for s in ET.fromstring(entries['xl/workbook.xml']).find(Q('sheets')):
        target=rels[s.get('{'+REL+'}id')]
        target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
        assert target.startswith('xl/worksheets/') and target in entries
        result.append((s.get('name'),target))
    return result

def combine(entries,extra,names=SHEETS):
    old_names=[n for n,_ in sheet_parts(entries)]
    assert not set(old_names)&set(names),'new sheet name already present'
    assert [n for n,_ in sheet_parts(extra)]==names,'exact six-sheet order required'
    assert not any(n.startswith(('xl/worksheets/_rels/','xl/tables/','xl/drawings/','xl/media/')) for n in extra),'unsupported appendix relationships'
    stylesheet,offset=make_styles(entries['xl/styles.xml'],extra['xl/styles.xml'])
    shared=list(ET.fromstring(extra['xl/sharedStrings.xml'])) if 'xl/sharedStrings.xml' in extra else []
    wb=entries['xl/workbook.xml'].decode('utf-8'); rels=entries['xl/_rels/workbook.xml.rels'].decode('utf-8'); types=entries['[Content_Types].xml'].decode('utf-8')
    tree=ET.fromstring(wb); rel_tree=ET.fromstring(rels)
    sheet_id=max(int(x.get('sheetId')) for x in tree.find(Q('sheets')))
    relation_id=max(int(x.get('Id')[3:]) for x in rel_tree if re.fullmatch(r'rId\d+',x.get('Id','')))
    added={}; sheet_tags=[]; relationships=[]; content_types=[]
    for i,(name,source_part) in enumerate(sheet_parts(extra),1):
        sheet=ET.fromstring(extra[source_part])
        assert sheet.find(Q('conditionalFormatting')) is None,'appendix differential styles unsupported'
        for cell in sheet.iter(Q('c')):
            cell.set('s',str(int(cell.get('s','0'))+offset))
            if cell.get('t')=='s':
                si=shared[int(cell.find(Q('v')).text)];cell.remove(cell.find(Q('v')));cell.set('t','inlineStr')
                inline=ET.SubElement(cell,Q('is'))
                for child in si:inline.append(copy.deepcopy(child))
        for col in sheet.iter(Q('col')):
            if 'style' in col.attrib:col.set('style',str(int(col.get('style'))+offset))
        for row in sheet.iter(Q('row')):
            if 's' in row.attrib:row.set('s',str(int(row.get('s'))+offset))
        part=f'xl/worksheets/sheet{sheet_id+i}.xml';rid=f'rId{relation_id+i}'
        assert part not in entries and part not in added
        added[part]=ET.tostring(sheet,encoding='utf-8',xml_declaration=True)
        sheet_tags.append(f'<sheet xmlns:r="{REL}" name="{name}" sheetId="{sheet_id+i}" state="visible" r:id="{rid}"/>')
        relationships.append(f'<Relationship Type="{REL}/worksheet" Target="/{part}" Id="{rid}"/>')
        content_types.append(f'<Override PartName="/{part}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
    assert wb.count('<sheets>')==1 and rels.count('</Relationships>')==1 and types.count('</Types>')==1
    wb=wb.replace('<sheets>','<sheets>'+''.join(sheet_tags),1)
    wb=re.sub(r'localSheetId="(\d+)"',lambda m:f'localSheetId="{int(m.group(1))+len(names)}"',wb)
    wb=re.sub(r'activeTab="\d+"','activeTab="0"',wb)
    rels=rels.replace('</Relationships>',''.join(relationships)+'</Relationships>')
    types=types.replace('</Types>',''.join(content_types)+'</Types>')
    changed={'xl/styles.xml':stylesheet,'xl/workbook.xml':wb.encode(),'xl/_rels/workbook.xml.rels':rels.encode(),'[Content_Types].xml':types.encode()}
    for value in [*changed.values(),*added.values()]:ET.fromstring(value)
    return changed,added

def graft(source,appendix,result):
    with zipfile.ZipFile(source) as original,zipfile.ZipFile(appendix) as extra:
        entries={i.filename:original.read(i.filename) for i in original.infolist()}
        assert len(entries)==len(original.infolist()),'duplicate source part'
        additions={i.filename:extra.read(i.filename) for i in extra.infolist()}
        assert len(additions)==len(extra.infolist()),'duplicate appendix part'
        changed,added=combine(entries,additions)
        with zipfile.ZipFile(result,'x',compression=zipfile.ZIP_DEFLATED) as output:
            for info in original.infolist():output.writestr(info,changed.get(info.filename,entries[info.filename]))
            for name,data in added.items():output.writestr(name,data)
    with zipfile.ZipFile(result) as output:
        assert output.testzip() is None
        assert len(output.namelist())==len(entries)+6
        preserved=[n for n in entries if n not in changed]
        assert all(output.read(n)==entries[n] for n in preserved),'existing part changed'
        assert [n for n,_ in sheet_parts({n:output.read(n) for n in output.namelist()})]==SHEETS+[n for n,_ in sheet_parts(entries)]
    return {'changedPackageParts':list(changed),'addedParts':list(added),'preservedParts':[{ 'path':n,'sha256':sha(entries[n])} for n in preserved]}

def main():
    p=argparse.ArgumentParser();p.add_argument('--source-xlsx',type=Path,required=True);p.add_argument('--build-dir',type=Path,required=True)
    a=p.parse_args();index_path=a.build_dir/'appendix-index.json'; index=json.loads(index_path.read_text('utf-8'))
    assert index['schema']=='gravuru-main-v7-appendix-build/v1'
    assert index['approved'] is False and index['executed'] is False
    assert index['purpose']=='copy-pilot-review-only' and index['approvalHash'] is None
    assert re.fullmatch('[0-9a-f]{64}',index['reviewHash']) and index['reviewHash']!='0'*64
    assert [x['name'] for x in index['sheets']]==SHEETS
    assert sha(a.source_xlsx.read_bytes())==SOURCE_SHA==index['sourceSha256']
    assert index['output']=='Tuerschild-Acrylglas-3mm_v7.xlsx'
    appendix=a.build_dir/'six-new-sheets.appendix.xlsx';assert sha(appendix.read_bytes())==index['appendixSha256']
    result=a.build_dir/index['output'];manifest_path=a.build_dir/'Manifest.json'
    assert not result.exists() and not manifest_path.exists(),'new output paths required'
    preserved=graft(a.source_xlsx,appendix,result)
    assert sha(a.source_xlsx.read_bytes())==SOURCE_SHA
    manifest={'schema':'gravuru-main-v7-xlsx-manifest/v1','output':result.name,'xlsxSha256':sha(result.read_bytes()),'xlsxBytes':result.stat().st_size,
       'sourceSha256':SOURCE_SHA,'reviewHash':index['reviewHash'],'importFingerprint':index['importFingerprint'],'inputPins':index['inputPins'],
       'indexSha256':sha(index_path.read_bytes()),'newSheets':SHEETS,**preserved,'purpose':'copy-pilot-review-only','approvalHash':None,'approved':False,'executed':False}
    with manifest_path.open('x',encoding='utf-8',newline='\n') as f:json.dump(manifest,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps({'xlsx':result.name,'newSheets':6,'preservedParts':len(preserved['preservedParts']),'xlsxSha256':manifest['xlsxSha256']}))
if __name__=='__main__':main()
