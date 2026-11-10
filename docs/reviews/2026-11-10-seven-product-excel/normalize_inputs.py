"""Analysis-only projection of pinned XLSX cells; not an importer or approval.

The enumerated combinations are arithmetic proposals from explicit per-size
rows. Open approval/default/module values remain open. No runtime IDs are made.
"""
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
from collections import Counter
import json, re, hashlib

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'outputs' / 'seven-product-excel-20261110'
data = json.loads((OUT/'extracted-inputs.json').read_text(encoding='utf-8'))
money_normalizations = []

def rows(book, name):
    sheet = next((s for s in book['sheets'] if s['name']==name), None)
    return sheet['rows'] if sheet else []

def values(row):
    return {re.sub(r'\d+$','',c['cell']):c.get('value') for c in row['cells']}

def cell(book, sheet, address):
    return next((c for r in rows(book,sheet) for c in r['cells'] if c['cell']==address),{'cell':address,'value':None})

def cents(raw, source):
    if raw is None or raw == '': return None
    n=Decimal(str(raw)); rounded=n.quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
    if abs(n-rounded)>Decimal('.00000001'):
        raise ValueError(f'Non-cent monetary input {source}: {raw}')
    if n!=rounded: money_normalizations.append({'source':source,'rawEur':raw,'normalizedCents':int(rounded*100),'reason':'binary-floating serialization within 0.00000001 EUR of exact cents'})
    return int(rounded*100)

books=[]; steel_delta=[]
for book in data['workbooks']:
    filename=Path(book['path']).name
    assert hashlib.sha256((OUT/'sources'/filename).read_bytes()).hexdigest()==book['sha256']
    variants=[]
    for row in rows(book,'Varianten'):
        v=values(row); r=row['row']
        if r<7 or v.get('H') is None or v.get('E') is None: continue
        base=cents(v['H'],f'{filename}!Varianten!H{r}'); extra=cents(v.get('I'),f'{filename}!Varianten!I{r}')
        variants.append({'variantKey':v['A'],'sourceRow':r,'dimensions':{'widthMm':v['E'],'heightMm':v['F'],'label':v['D']},'form':v['B'],'material':v['C'],'series':v.get('N'),'fixedOptionJson':v.get('G'),'baseCents':base,'fixedSurchargeCents':extra,'totalCents':None if extra is None else base+extra,'totalCentsSource':'analysis of H+I, not cached workbook J','workbookTotalCell':cell(book,'Varianten',f'J{r}'),'shopifyVariantReference':v.get('K'),'confirmation':v.get('M'),'priceSource':v.get('L')})
    keys={v['variantKey'] for v in variants}; assert len(keys)==len(variants)
    options=[]
    for row in rows(book,'Optionen'):
        v=values(row); r=row['row']
        if r<7 or v.get('A') not in keys: continue
        options.append({'sourceRow':r,'variantKey':v['A'],'group':v.get('B'),'optionId':v.get('C'),'label':v.get('D'),'availability':v.get('E'),'surchargeCents':cents(v.get('F'),f'{filename}!Optionen!F{r}'),'chargeBasis':v.get('G'),'defaultStatus':v.get('H'),'configuration':v.get('I'),'source':v.get('J'),'confirmation':v.get('K')})
    modules=[]
    for row in rows(book,'Module'):
        v=values(row); r=row['row']
        if not 7<=r<=13: continue
        modules.append({'sourceRow':r,'key':v['A'],'label':v.get('B'),'requested':v.get('C'),'technicalAvailability':v.get('D'),'validity':v.get('E'),'configuration':v.get('F'),'pricing':v.get('G'),'source':v.get('H'),'confirmation':v.get('I')})
    assert {m['key'] for m in modules}=={'options','designs','text','motifs','photo','logo','colors'}
    combinations=[]
    for v in variants:
        mounts=[o for o in options if o['variantKey']==v['variantKey'] and o['group']=='befestigung' and o['availability']=='ja']
        colors=[o for o in options if o['variantKey']==v['variantKey'] and o['group']=='farbe' and o['availability']=='ja'] or [None]
        for m in mounts:
            for c in colors:
                amounts=[v['totalCents'],m['surchargeCents'],c['surchargeCents'] if c else 0]
                combinations.append({'variantKey':v['variantKey'],'dimensions':v['dimensions'],'baseCents':v['baseCents'],'optionId':m['optionId'],'surchargeCents':m['surchargeCents'],'color':c['optionId'] if c else None,'colorSurchargeCents':c['surchargeCents'] if c else None,'totalCents':None if None in amounts else sum(amounts),'evidenceCells':[f'Varianten!H{v["sourceRow"]}',f'Varianten!I{v["sourceRow"]}',f'Optionen!F{m["sourceRow"]}']+([f'Optionen!F{c["sourceRow"]}'] if c else []),'approval':{'sizeAndBase':v['confirmation'],'mounting':m['confirmation'],'color':c['confirmation'] if c else 'not a color option'},'analysisOnly':True})
    refs={key:{'cell':'Freigabe!'+address,'value':cell(book,'Freigabe',address).get('value')} for key,address in {'proposedProductKey':'C7','name':'C8','group':'C9','workbookRevision':'C10','nativeSource':'C11','shopTenant':'C14','shopifyProduct':'C15','designGroup':'C16','startDesign':'C17','currency':'C18','taxContext':'C19','sourceFingerprint':'C21','scope':'C22','planId':'C23','planHash':'C24','templateId':'C25','templateRevision':'C26','moduleProfileId':'C27','moduleProfileRevision':'C28'}.items()}
    approvals=[{'row':r['row'],'values':values(r)} for r in rows(book,'Freigabe') if 33<=r['row']<=47]
    questions=[{'row':r['row'],'values':values(r)} for r in rows(book,'Offene Fragen') if r['row']>1]
    source_rows=[{'row':r['row'],'values':values(r)} for r in rows(book,'Quellen')]
    for r in rows(book,'Preisabgleich'):
        v=values(r)
        if r['row']<2:continue
        assert v['B'] in (OUT/'sources'/Path(data['changePlan']['path']).name).read_text(encoding='utf-8')
        steel_delta.append({'workbook':filename,'sourceRow':r['row'],'existingParentShopifyProductId':'16190784438652','existingVariantId':v['B'],'existingSku':v['A'],'historicalShopifyPriceCents':cents(v['C'],f'{filename}!Preisabgleich!C{r["row"]}'),'catalogCombinationPriceCents':cents(v['D'],f'{filename}!Preisabgleich!D{r["row"]}'),'differenceCents':cents(v['E'],f'{filename}!Preisabgleich!E{r["row"]}'),'proposedRemovalOnly':True,'approvedRemoval':False,'newProductId':None,'newSku':None})
    books.append({'name':filename,'workbookPath':book['path'],'workbookSha256':book['sha256'],'sourceCommit':data['sourceCommit'],'gitBlob':book['gitBlob'],'sourceReferences':refs,'nativeSourceProductId':None,'nativeSourceRevision':None,'nativeSourceDocumentHash':None,'registryMapping':None,'planId':None,'planHash':None,'variants':variants,'options':options,'modules':modules,'analysisCombinations':combinations,'counts':{'sizeRows':len(variants),'forms':dict(Counter(v['form'] for v in variants)),'explicitOptionRows':len(options),'mountingRows':sum(o['group']=='befestigung' for o in options),'analysisCombinations':len(combinations)},'approvalRows':approvals,'openQuestions':questions,'sourceRows':source_rows,'designRows':[{'sheet':n,'row':r['row'],'values':values(r)} for n in ['Designbasis'] for r in rows(book,n)],'sheetSummary':[{'name':s['name'],'range':s['range'],'populatedRows':s['populatedRows']} for s in book['sheets']],'cachedFormulaValuesAvailable':all(c.get('value') is not None for s in book['sheets'] for r in s['rows'] for c in r['cells'] if 'formula' in c),'externalLinks':book['externalLinks'],'sourceWorkbookUnchanged':True})

result={'kind':'analysis-only-excel-inputs-not-runtime-contract','sourceCommit':data['sourceCommit'],'sourceBranch':data['sourceBranch'],'workbooks':books,'steelChangePlan':{**data['changePlan'],'status':'draft, explicit implementation approval missing','oldSizeRows':80,'proposedSizeRows':77,'oldVariantCount':404,'proposedVariantCount':389,'existing15VariantRows':steel_delta,'historical15PriceSumCents':sum(r['historicalShopifyPriceCents'] for r in steel_delta)},'laterInstructionsNotAppliedToWorkbooks':{'source':'Parent task #230 B; later pinned catalog/adaptation review separate','catalogCommitPrefix':'8236b8bfa','catalogOriginalCountReported':1298,'priority':'rang 0 before rang 1','smallSizesCm':['5x2','6x2','8x2'],'smallMotifCountReported':13,'excludedMotif':'schmetterlinge-1','designAdaptationPr':'Chris83638w/gravuru-katalog.#187','approvalNote':'These later instructions were not merged into XLSX; referenced source must be verified separately by plan coordinator.'},'numericNormalization':money_normalizations,'safety':{'notAnImporter':True,'noRuntimeRecordsCreated':True,'noConfirmation':True,'noExecution':True,'noShopifyWrites':True,'noSourceEdits':True,'noInventedSourceIds':True,'openDoesNotMeanFalse':True}}
assert len(books)==7 and len(steel_delta)==15
assert books[0]['counts']['sizeRows']==77 and books[0]['counts']['analysisCombinations']==778
assert [b['counts']['analysisCombinations'] for b in books[1:]]==[10,10,10,5,5,5]
assert all(b['sourceReferences'][k]['value'] is None for b in books for k in ('planId','planHash','templateId','templateRevision','moduleProfileId','moduleProfileRevision'))
path=OUT/'normalized-inputs.json'
path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'products':[{'name':b['name'],'counts':b['counts'],'baseCents':[v['baseCents'] for v in b['variants']] if len(b['variants'])==1 else {'min':min(v['baseCents'] for v in b['variants']),'max':max(v['baseCents'] for v in b['variants'])}} for b in books],'steelDeltaCount':len(steel_delta),'historical15PriceSumCents':result['steelChangePlan']['historical15PriceSumCents'],'numericNormalizations':len(money_normalizations)},ensure_ascii=False,indent=2))
