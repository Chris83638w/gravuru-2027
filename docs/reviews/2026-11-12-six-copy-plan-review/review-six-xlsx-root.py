import json, hashlib, zipfile, pathlib, xml.etree.ElementTree as ET

root = pathlib.Path.cwd()
out = root / 'outputs/Produktplaene-230-sechs-Kopienreview'
manifest = json.loads((out / 'Manifest.json').read_text(encoding='utf-8-sig'))
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
allowed = {'xl/styles.xml', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', '[Content_Types].xml'}
sha = lambda b: hashlib.sha256(b).hexdigest()
results = []
for rec in manifest['records']:
    previous = (root / rec['previous']).read_bytes()
    current = (out / rec['output']).read_bytes()
    assert sha(previous) == rec['previousSha256']
    assert sha(current) == rec['xlsxSha256']
    with zipfile.ZipFile(root / rec['previous']) as old, zipfile.ZipFile(out / rec['output']) as new:
        untouched = [name for name in old.namelist() if name not in allowed]
        assert all(new.read(name) == old.read(name) for name in untouched)
        old_sheets = ET.fromstring(old.read('xl/workbook.xml')).find('m:sheets', ns)
        new_sheets = ET.fromstring(new.read('xl/workbook.xml')).find('m:sheets', ns)
        assert new_sheets[0].attrib['name'] == 'Kopienplan'
        assert [s.attrib for s in new_sheets][1:] == [s.attrib for s in old_sheets]
        appended_parts = set(new.namelist()) - set(old.namelist())
        text = '\n'.join(new.read(p).decode('utf-8') for p in appended_parts if p.endswith('.xml'))
        assert rec['planId'] in text and rec['planHash'] in text
        assert rec['creationKey'] in text
        results.append({'file': rec['output'], 'sha256': sha(current), 'unchangedOldParts': len(untouched), 'previousSheetsPreserved': len(old_sheets), 'copyPlanAndCreationPinsPresent': True})
report = {'scope': 'Independent ZIP byte and workbook relationship review; no Excel runtime rerun', 'allPassed': True, 'records': results}
(root / 'work/restabschluss/six-plan-root-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'books': len(results), 'allPassed': True, 'unchangedOldPartsPerBook': [r['unchangedOldParts'] for r in results]}))
