import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]||'.');
const here=path.join(root,'work/restabschluss/final-execution-excel');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const load=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const pin=async p=>{const b=await fs.readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:sha(b)};};
const need=(x,m)=>{if(!x)throw Error(m);};
const receiptPath='work/restabschluss/six-draft-final-f33942d9/received/2b-sechsdraft-ergebnis.json';
const entryPath='work/restabschluss/live-readbacks-20261112/six-final-entry-read.json';
const productPath='work/restabschluss/live-readbacks-20261112/six-final-products.json';
const expectedPath='work/restabschluss/six-draft-actual-readback-20261112/expected-readback.json';
const preparationPath='work/restabschluss/six-draft-partial-0389cd6e/received/2a-sechsgruppen-vorbereitung.json';
const [receipt,entry,products,expected,preparation,assignment,inventory]=await Promise.all([
 receiptPath,entryPath,productPath,expectedPath,preparationPath,
 'work/restabschluss/final-execution-excel/workbook-assignment.json',
 'work/restabschluss/small-products-duplicate-review/inventory.json'
].map(load));
need(sha(await fs.readFile(path.join(root,receiptPath)))==='9033e653ec7eb6472a110d8468f3fc516b2c64205461503174d9f60ecd78cc23','Receipt changed');
need(receipt.bestanden===true&&receipt.pruefungenGruen===14&&receipt.produkte.length===6,'Actual receipt not complete');
need(receipt.katalogFreigabeId==='chris-168-6829898414-gesamtpaket','Approval mismatch');
const nodes=entry.response.data.nodes,oldIds=new Set(inventory.products.map(p=>p.id));
need(nodes.length===6&&!entry.response.errors&&products.errors.length===0,'Incomplete connector read');
const optionKey=x=>JSON.stringify([...x].map(v=>[v.name,v.value]).sort(([a],[b])=>a.localeCompare(b)));
const cents=s=>{need(/^\d+\.\d{2}$/.test(s),'Invalid exact decimal');const [a,b]=s.split('.');return Number(a)*100+Number(b);};
const rows=[];
for(const exp of expected.groups){
 const match=(a,p,n)=>{const v=a.filter(p);need(v.length===1,'Ambiguous '+n);return v[0];};
 const actual=match(receipt.produkte,p=>p.gruppe===exp.group,'receipt group');
 const prep=match(preparation.gruppen,p=>p.gruppe===exp.group,'preparation group');
 const prev=match(assignment.records,p=>p.group===exp.group,'workbook');
 const shop=match(nodes,p=>p.id===actual.shopifyProductId,'shop product');
 const product=match(products.products,p=>p.id===shop.id,'product read');
 need(actual.planId===prep.plan&&actual.revision===1&&/^pgc_/.test(actual.confirmationId),'Native plan/confirmation/revision mismatch');
 need(actual.cfg!==prep.quelle&&/^cfg_/.test(actual.cfg),'Execute target confused with preparation source');
 need(!oldIds.has(shop.id),'Shop product already in old inventory');
 need(shop.status==='DRAFT'&&shop.publishedAt===null&&shop.templateSuffix==='konfi'&&shop.customizationId?.value===actual.cfg,'Shop entry mismatch');
 need(product.status==='DRAFT'&&product.images.length===0&&product.currencyCode==='EUR','Product status/media/currency mismatch');
 need(shop.variants.pageInfo.hasNextPage===false&&shop.variants.nodes.length===exp.expectedVariants||shop.variants.pageInfo.hasNextPage===false&&shop.variants.nodes.length===exp.approvedReference.variants,'Variants incomplete');
 const variantIds=shop.variants.nodes.map(v=>v.id.split('/').at(-1));
 need(JSON.stringify([...variantIds].sort())===JSON.stringify([...actual.variantenIds].sort()),'Operator/connector variant IDs differ');
 const variantRows=shop.variants.nodes.map(v=>{
  const spec=match(exp.approvedReference.variantReview,r=>optionKey(r.choices.map(c=>({name:c.label,value:c.display})))===optionKey(v.selectedOptions),'native options');
  need(cents(v.price)===spec.unitCents,'Price differs for '+v.id);
  return {variantId:v.id,selectedOptions:v.selectedOptions,options:spec.options,unitCents:spec.unitCents,widthMm:spec.widthMm,heightMm:spec.heightMm,choices:spec.choices};
 });
 need(new Set(variantRows.map(v=>optionKey(v.selectedOptions))).size===exp.approvedReference.variants,'Duplicate option combination');
 const previous=await pin(prev.approvedWorkbook.path);
 need(previous.sha256===prev.approvedWorkbook.sha256,'Previous workbook changed');
 rows.push({group:exp.group,title:actual.titel,output:prev.newVersionFile,previous,originalExcel:prev.originalExcel,creationKey:prev.creationKey,
  preparation:{sourceId:prep.quelle,templateId:prep.vorlage,planId:prep.plan,planHash:prep.planHash},
  execution:{confirmationId:actual.confirmationId,productId:actual.cfg,revision:actual.revision},
  shop:{productId:shop.id,handle:shop.handle,status:shop.status,publishedAt:shop.publishedAt,templateSuffix:shop.templateSuffix,customizationId:shop.customizationId.value,createdAt:shop.createdAt,images:product.images.length},
  variantRows,pricing:exp.approvedReference.pricing,moduleProfile:preparation.modulprofil,motifProfile:preparation.motivprofil,
  copyProvenance:exp.copyOnlyProvenance,originalVariantReviewHash:exp.approvedReference.variantReviewSha256});
}
need(new Set(rows.map(r=>r.execution.productId)).size===6&&new Set(rows.map(r=>r.execution.confirmationId)).size===6&&new Set(rows.map(r=>r.shop.productId)).size===6,'Duplicate target identities');
need(new Set(rows.flatMap(r=>r.variantRows.map(v=>v.variantId))).size===45,'Expected exactly 45 unique variants');
const before=receipt.zaehlerRegistry.vorErstlauf,end=receipt.zaehlerRegistry.ende;
need(end.produkte-before.produkte===6&&end.bestaetigungen===6&&end.ausfuehrungen===6,'Native counts differ');
for(const k of ['formbindungen','preisvertraege','bindungskoepfe','bindungsrevisionen'])need(end[k]-before[k]===45,'Binding delta differs '+k);
need(end.katalogfreigaben-before.katalogfreigaben===6&&end.transfers-before.transfers===6,'Release/transfer count differs');
need(receipt.shopifyAufrufe.erstlauf.creates===1&&receipt.shopifyAufrufe.reconcile.creates===5,'Create count differs');
const input={schema:'issue230-six-execution-workbooks/v1',purpose:'completion-evidence-only-not-import',approval:{id:receipt.katalogFreigabeId,quote:'Ja, Gesamtpaket ausführen',source:'https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6829898414'},receipt:{source:'https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6830922986',commit:'f33942d9',reviewHash:receipt.reviewHash,reportedNativeChecks:14,reportedFullReceipt:receipt.belege.reconcile},sources:await Promise.all([receiptPath,entryPath,productPath,expectedPath,preparationPath].map(pin)),rows,verification:{actualGroups:6,actualVariantRows:45,allExactOptionPricesMatch:true,operatorAndConnectorIdsMatch:true,allDraft:true,allUnpublished:true,allEntryFieldsMatch:true,noMedia:true,nativeCounterDeltasMatch:true,actualOwnerAppPricingRead:'operator report; independent connector cannot resolve separate owner-app field',individualBindingRecordsReceived:false,fullOriginalServerReceiptReceived:false},protectedActiveProducts:'Separate root before/after check; no full metafield claim',mainWorkbookUnchanged:true};
await fs.writeFile(path.join(here,'final-six-inputs.json'),JSON.stringify(input,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(here,'input-verification.json'),JSON.stringify({schema:'issue230-six-execution-input-check/v1',allPassed:true,scope:input.verification,inputsSha256:sha(Buffer.from(JSON.stringify(input,null,2)+'\n')),sources:input.sources},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({groups:rows.length,variants:45,exactOptionPriceMatches:45,allPassed:true,newWorkbooks:0}));
