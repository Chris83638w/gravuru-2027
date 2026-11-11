from pathlib import Path
import hashlib, json, gzip, zipfile, posixpath
import xml.etree.ElementTree as ET
from decimal import Decimal

BASE=Path.cwd(); RUN=BASE/'work/product-plans-run-v9'; OLD=BASE/'work/product-plans-run-v8'
OUT=BASE/'outputs/Produktplaene-230-v9/Excel-Nachtraege'; PREV=BASE/'outputs/Produktplaene-230/Excel-Nachtraege'
SS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'; REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'; Q=lambda x:'{'+SS+'}'+x
sha=lambda b:hashlib.sha256(b).hexdigest()
load=lambda p:json.loads(p.read_text('utf-8'))
def readbook(p):
 with zipfile.ZipFile(p) as z:
  files={n:z.read(n) for n in z.namelist()}
 strings=[]
 if 'xl/sharedStrings.xml' in files:
  strings=[''.join(e.itertext()) for e in ET.fromstring(files['xl/sharedStrings.xml'])]
 rels={r.get('Id'):r.get('Target') for r in ET.fromstring(files['xl/_rels/workbook.xml.rels'])}
 sheets={}
 for s in ET.fromstring(files['xl/workbook.xml']).find(Q('sheets')):
  target=rels[s.get('{'+REL+'}id')]; target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
  cells={}
  for c in ET.fromstring(files[target]).iter(Q('c')):
   kind=c.get('t','n');v=c.find(Q('v'));f=c.find(Q('f')); raw=None if v is None else v.text
   if kind=='s': value=strings[int(raw)];kind='str'
   elif kind=='inlineStr': value='' if c.find(Q('is')) is None else ''.join(c.find(Q('is')).itertext());kind='str'
   elif kind=='n' and raw is not None:value=Decimal(raw)
   elif kind=='b':value=raw=='1'
   else:value=raw
   if value is not None or f is not None:cells[c.get('r')]=(kind,value,None if f is None else (f.attrib,f.text or ''))
  sheets[s.get('name')]=cells
 return sheets,{n:sha(b) for n,b in files.items() if n.startswith(('xl/worksheets/','xl/tables/'))}
summary=load(RUN/'summary.json');manifest=load(OUT/'Manifest.json');decisions=load(RUN/'decisions.json')
inputs=json.loads(gzip.decompress((BASE/'work/search-material-final/docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz').read_bytes()))
rows=[]
assert manifest['summarySha256']==sha((RUN/'summary.json').read_bytes())
assert manifest['decisionsFileSha256']==sha((RUN/'decisions.json').read_bytes())
assert manifest['decisionsManifestSha256']==summary['decisionsManifestSha256']
for pair in summary['results']:
 r=next(x for x in manifest['records'] if x['original']==pair['workbook']);original=OLD/'excel'/pair['workbook'];previous=PREV/r['previous'];final=OUT/r['output']
 before,before_parts=readbook(original);prev,prev_parts=readbook(previous);after,after_parts=readbook(final)
 assert sha(original.read_bytes())==pair['excelSha256']==r['originalSha256']
 assert sha(previous.read_bytes())==r['previousSha256'];assert sha(final.read_bytes())==r['xlsxSha256']
 assert set(after)-set(prev)=={'PlanstandV9'} and next(iter(after))=='PlanstandV9'
 assert all(after[k]==v for k,v in before.items()),'original values/formulas changed'
 assert all(after[k]==v for k,v in prev.items()),'previous values/formulas changed'
 assert all(after_parts[k]==v for k,v in before_parts.items()),'original XML changed'
 assert all(after_parts[k]==v for k,v in prev_parts.items()),'previous XML changed'
 value=lambda c:after['PlanstandV9'][c][1]
 module=pair['moduleProfilePins'][0];main='-3mm_v4' in pair['workbook'];stem=pair['workbook'].removesuffix('.xlsx')
 plan=load(RUN/stem/'plan.json'); oldplan=load(OLD/stem/'plan.json')
 expected={'B8':'AN' if main else 'AUS','B9':999 if main else 'nicht angeboten','B10':'AN' if main else 'AUS','B11':1299 if main else 'nicht angeboten','B12':169,'B14':pair['proposedStart']['defaultDesignId'],'B15':pair['proposedStart']['sizeKey'],'B16':Decimal('.19'),'C16':'bestätigt 11.11.2026','C17':'bestätigt 20.10.2026','C18':'OFFEN','B21':pair['workbook'],'B22':pair['excelSha256'],'B24':pair['planId'],'B25':pair['planHash'],'B26':pair['source']['id'],'B27':2,'B28':pair['source']['sha256'],'B29':pair['template']['id'],'B30':2,'B31':pair['template']['sha256'],'B32':module['id'],'B33':module['revision'],'B34':module['sha256'],'B39':sha((RUN/stem/'plan.json').read_bytes()),'B40':sha((RUN/stem/'source-document.json').read_bytes()),'B41':r['previous'],'B42':r['previousSha256'],'B43':sha((RUN/'decisions.json').read_bytes()),'B44':True,'B45':pair['designs']['native'],'B49':summary['decisionsManifestSha256'],'B57':pair['source']['metadataSha256']}
 for c,e in expected.items():assert value(c)==e,(pair['workbook'],c,value(c),e)
 assert value('B17')==' / '.join('ab '+str(x['minQuantity'])+' Stück: '+str(x['percentOff'])+' %' for x in decisions['quantityDiscount']['tiers'])
 assert value('B46')==(', '.join(pair['designs']['fitExcludedIds']) if main else 'Keine dieser neun Ausnahmen im Kleinprodukt')
 assert value('B47')==(', '.join(pair['designs']['hiddenIds']) if main else 'Keine')
 assert plan['valid'] and not plan['issues'];assert plan['products'][0]['document']==oldplan['products'][0]['document']
 inp=next(x for x in inputs['workbooks'] if x['name']==pair['workbook'])
 actual={(v['form']['id'],float(v['widthMm']),float(v['heightMm']),v['options'].get('color',''),v['options']['mounting']):v['unitCents'] for v in plan['products'][0]['variantReview']}
 assert len(actual)==len(plan['products'][0]['variantReview'])
 for item in inp['analysisCombinations']:
  v=next(v for v in inp['variants'] if v['variantKey']==item['variantKey']);key=(v['form'].split('/')[-1].strip(),float(v['dimensions']['widthMm']),float(v['dimensions']['heightMm']),item.get('color') or '',item['optionId'])
  assert actual[key]==item['totalCents'],(key,actual[key],item['totalCents'])
 assert len(actual)==len(inp['analysisCombinations'])
 rows.append({'original':pair['workbook'],'output':r['output'],'originalCells':sum(map(len,before.values())),'previousCells':sum(map(len,prev.values())),'originalCellsAndFormulasUnchanged':True,'previousCellsAndFormulasUnchanged':True,'originalWorksheetTableRelationBytesUnchanged':True,'previousWorksheetTableRelationBytesUnchanged':True,'exactV9Pins':True,'v9DocumentEqualsV8':True,'variantsCompared':len(actual),'priceDifferences':0,'vat19Confirmed':True,'startsPreserved':True,'tiersConfirmed':True,'exclusionsPreserved':True,'executionStillOpen':True,'xlsxSha256':sha(final.read_bytes())})
result={'schema':'issue230-v9-excel-independent-structure-check/v1','readOnly':True,'method':'Direct standard-library OOXML parse and all-original-cell/formula comparison, exact original/previous worksheet-table-relationship bytes, v9 summary pins, 823 actual native variant prices against original normalized Excel inputs. Separate from Artifact authoring and reimport.', 'rows':rows,'originalCellsCompared':sum(r['originalCells'] for r in rows),'previousCellsCompared':sum(r['previousCells'] for r in rows),'variantsCompared':sum(r['variantsCompared'] for r in rows),'allPassed':True}
assert result['originalCellsCompared']==17968;assert result['variantsCompared']==823
(OUT/'Inhaltspruefung.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k not in ['rows','method']},ensure_ascii=False))
