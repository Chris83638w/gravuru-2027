// #230 B only: inspect pinned local inputs. Never create native sources,
// confirm a plan, execute an import, access Shopify or infer missing approvals.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

export const CODE_BASE='f4645189c3dd8e5ba6f2aa2a3c11c16c604f33d5';
export const EXCEL_COMMIT='bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd';
export const CATALOG_COMMIT='8236b8bfab7322447ec46661c116fa526331af3d';
export const INPUT_SHA='2218e5d9e6917016e59526781e2f57c650c59b449f00f979d6a0d0605bfb61e9';
export const STEEL_SHA='2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0';
const DESIGN_LIST='auftraege/2026-11-10-tuerschild-designs-namensschilder/designs.json';
const MOTIF_DIR='motive/motive-kleine-schilder/';
const expectedNames=['Tuerschild-Acrylglas-3mm_v4.xlsx',...['5x2','6x2','8x2'].map(s=>`Tuerschild-Acrylglas-3mm-${s}_v2.xlsx`),...['5x2','6x2','8x2'].map(s=>`Tuerschild-Edelstahl-${s}_v1.xlsx`)];
const fail=(code,message)=>{throw Object.assign(Error(message),{code});};
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:64*1024*1024});
const blob=(root,commit,file)=>git(root,'show',`${commit}:${file}`);
export const readPinned=(filename,expected)=>{const file=fs.readFileSync(filename),bytes=String(filename).endsWith('.gz')?gunzipSync(file):file;if(sha(bytes)!==expected)fail('input_hash','Der gespeicherte Eingabestand wurde geändert.');return JSON.parse(bytes);};
const rowValue=(w,name)=>w.sourceReferences?.[name]?.value??null;

/** The only plan entry point: an ALREADY REGISTERED native template/service.
 * It neither synthesizes source IDs nor calls create/confirm/execute. The Excel
 * digest is inside creationKey, and getPlan verifies the actual persisted pair.
 * Used by the private operator after the missing source handoff is supplied. */
export function planExistingTemplate({groups,templateId,templateRevision,product,excel}){
 if(!excel||excel.sourceCommit!==EXCEL_COMMIT||!/^([a-f0-9]{64})$/.test(excel.workbookSha256||''))fail('excel_pin','Die konkrete Excel-Version fehlt.');
 if(!templateId||!Number.isSafeInteger(templateRevision)||templateRevision<1)fail('template_missing','Keine gespeicherte Produktgruppen-Vorlage zugeordnet.');
 if(!groups||!['get','plan','getPlan'].every(k=>typeof groups[k]==='function'))fail('source_service_missing','Der vorhandene native Planservice ist nicht verbunden.');
 const saved=groups.get(templateId,{revision:templateRevision});
 if(saved?.revision!==templateRevision||saved.document?.schema!=='gravuru-product-group-template/v1')fail('template_mismatch','Der Vorlagenstand stimmt nicht überein.');
 const plan=groups.plan({templateId,templateRevision,creationKey:'issue230-'+excel.workbookSha256,products:[product]});
 const readback=groups.getPlan(plan.id);
 if(plan.schema!=='gravuru-product-group-creation-plan/v1'||!/^pgp_/.test(plan.id)||!/^([a-f0-9]{64})$/.test(plan.planHash)||readback?.planHash!==plan.planHash||plan.confirmationId||plan.localOnly!==true||plan.shopifyWrites!==0)fail('plan_readback','Keine echte unveränderte lokale Planantwort.');
 return {excel:{path:excel.workbookPath,sourceCommit:excel.sourceCommit,sha256:excel.workbookSha256},planId:plan.id,planHash:plan.planHash,plan,
  confirmed:false,executed:false,approvalReady:false,note:'Plan vorhanden; Excel-Abweichungen, offene Freigaben und Quellenfrische sind vor einer späteren ausdrücklichen Bestätigung zu prüfen.'};
}

export function auditMissingSources(input){
 if(input.sourceCommit!==EXCEL_COMMIT||input.workbooks?.length!==7||new Set(input.workbooks.map(w=>w.name)).size!==7||expectedNames.some(n=>!input.workbooks.some(w=>w.name===n)))fail('excel_scope','Genau die sieben beauftragten Excel-Versionen sind erforderlich.');
 return input.workbooks.map(w=>{
  if(w.nativeSourceProductId||w.nativeSourceRevision||w.nativeSourceDocumentHash||w.registryMapping||w.planId||w.planHash)fail('source_handoff_changed','Neue echte Quellzuordnung vorhanden: nicht mit diesem Fehlquellenaudit übergehen, sondern den nativen Planservice anschließen.');
  const differences=[
   {code:'native_source_missing',cells:['Freigabe!C11'],excel:rowValue(w,'nativeSource'),required:'Echter nativer Produktdatensatz mit Produkt-ID, Revision und Dokumenthash; keine Arbeitskennung.'},
   {code:'registry_and_template_missing',cells:['Freigabe!C9','Freigabe!C25','Freigabe!C26'],required:'Autoritative Zielzuordnung (key, productId, familyId, sizeKey), konkreter Linien-/Unterkategorienumfang und gespeicherte ProductGroupTemplate-Revision.'},
   {code:'module_profile_missing',cells:['Freigabe!C27','Freigabe!C28'],required:'Tatsächlich gespeichertes, versionsgebundenes Modulprofil; Wunschstatus ist keine Fähigkeit/Freigabe.'},
   {code:'excel_catalog_pin_old',cells:['Freigabe!C21'],excel:rowValue(w,'sourceFingerprint'),required:CATALOG_COMMIT},
   {code:'design_group_not_paired',cells:['Freigabe!C16','Freigabe!C17'],excel:{group:rowValue(w,'designGroup'),start:rowValue(w,'startDesign')},required:'Katalog #185: 1.298 insgesamt, davon 1.217 Hauptprodukt und 27 je Kleinformat; rang 0 vor 1. Originalzuordnung und tatsächliches Startdesign nativ belegen.'},
  ];
  if(w.counts.sizeRows===1)differences.push({code:'small_design_revision_open',required:'13 Motive ohne schmetterlinge-1; Katalog-PR187 ist offen, Anpassungen sind nicht Bestandteil des gepinnten main 8236b8bfa.'});
  return {workbook:{path:w.workbookPath,sha256:w.workbookSha256,gitBlob:w.gitBlob,sourceCommit:w.sourceCommit,revision:rowValue(w,'workbookRevision')},productName:rowValue(w,'name'),
   status:'blocked-before-native-plan',planId:null,planHash:null,templateId:null,templateRevision:null,counts:w.counts,
   moduleRequests:w.modules.map(m=>({key:m.key,requested:m.requested,confirmation:m.confirmation,sourceRow:m.sourceRow})),
   openApprovalRows:w.approvalRows.filter(r=>r.values?.B!=='bestätigt'),differences,confirmed:false,executed:false,approvalReady:false};
 });
}

function catalogueEvidence(root){
 const bytes=blob(root,CATALOG_COMMIT,DESIGN_LIST),list=JSON.parse(bytes),rows=list.designs;
 if(rows.length!==1298)fail('catalog_scope','Designliste ist nicht die beauftragte 1.298er Gruppe.');
 const rankCounts={},products={};
 for(const d of rows){if(![0,1].includes(d.rang))fail('catalog_rank','Unbekannter Vorrang in der Designliste.');rankCounts[d.rang]=(rankCounts[d.rang]||0)+1;products[d.produkt]=(products[d.produkt]||0)+1;}
 // Keep order inside each rank, do not rewrite designs or their metadata.
 const ordered=rows.map((d,i)=>({id:d.id,rank:d.rang,position:i})).sort((a,b)=>a.rank-b.rank||a.position-b.position);
 const names=git(root,'ls-tree','-r','--name-only',CATALOG_COMMIT,MOTIF_DIR).toString('utf8').trim().split(/\r?\n/).filter(n=>n.endsWith('.svg'));
 const allowed=names.filter(n=>n!==MOTIF_DIR+'schmetterlinge-1.svg');
 if(names.length!==14||allowed.length!==13)fail('motif_scope','Die beauftragten 13 Motive sind nicht eindeutig vorhanden.');
 return {commit:CATALOG_COMMIT,designList:{path:DESIGN_LIST,sha256:sha(bytes),total:rows.length,rankCounts,products,orderedIdsSha256:sha(JSON.stringify(ordered.map(d=>d.id))),ordering:'rank ascending; original list order within each rank',orderAppliedToCustomer:false},
  smallMotifs:{excluded:MOTIF_DIR+'schmetterlinge-1.svg',allowed:allowed.map(file=>({path:file,sha256:sha(blob(root,CATALOG_COMMIT,file))})),placement:{sourceComment:6772716646,default:'left or right beside the text',exceptions:['strich-horizontal','feine-trennlinie'],exceptionPlacement:'centered or text offset on the line'},filterAppliedToCustomer:false},
  openDesignAdaptation:{pr:'https://github.com/Chris83638w/gravuru-katalog./pull/187',observedHead:'69bf6448fb2bde47b2da3e1616f854786f1f65ee',stateAtRead:'open',mergedIntoPinnedCatalog:false,applied:false}};
}

function compareCatalogPrices(root,input){
 const familyPaths=['familien/acryl/acryl-3mm-tuerschilder-schwarz.json','familien/acryl/acryl-3mm-tuerschilder-anthrazit.json','familien/edelstahl/steel-door-signs.json'];
 const families=familyPaths.map(file=>{const bytes=blob(root,CATALOG_COMMIT,file);return {file,sha256:sha(bytes),document:JSON.parse(bytes)};});
 const comparisons=[];
 for(const w of input.workbooks){
  const material=w.name.includes('Acrylglas')?'acrylic':'steel';
  for(const f of families.filter(f=>material==='acrylic'?f.file.includes('/acryl/'):!f.file.includes('/acryl/'))){
   let matched=0;const differences=[];
   for(const v of w.variants){
    const form=v.form.split('/').at(-1).trim(),matches=f.document.sizes.filter(s=>s.groupKey===form&&s.widthMm===Number(v.dimensions.widthMm)&&s.heightMm===Number(v.dimensions.heightMm));
    if(matches.length!==1){differences.push({variantKey:v.variantKey,code:'catalog_size_not_unique',matches:matches.map(s=>s.key)});continue;}
    const s=matches[0];matched++;
    if(s.baseCents!==v.baseCents)differences.push({variantKey:v.variantKey,code:'base_price',excelCents:v.baseCents,catalogCents:s.baseCents});
    // Match the existing familyProductConfig representation: K00 is the
    // explicit withoutMounting flag; remaining runtime IDs are skuSuffix.
    const offered=[...(f.document.withoutMounting?[{id:'K00',priceCents:0}]:[]),...f.document.mountingRules.filter(m=>s.mounting.includes(m.id)).map(m=>({id:m.skuSuffix,priceCents:m.priceCents,sourceRuleId:m.id}))];
    for(const x of w.analysisCombinations.filter(x=>x.variantKey===v.variantKey&&(material==='steel'||x.color===f.document.material.variant))){
     const option=offered.find(m=>m.id===x.optionId);
     if(!option)differences.push({variantKey:v.variantKey,optionId:x.optionId,code:'mounting_not_offered'});
     else if(option.priceCents!==x.surchargeCents&&!differences.some(d=>d.variantKey===v.variantKey&&d.optionId===x.optionId))differences.push({variantKey:v.variantKey,optionId:x.optionId,code:'mounting_price',excelCents:x.surchargeCents,catalogCents:option.priceCents});
    }
   }
   comparisons.push({workbook:w.name,family:{id:f.document.id,path:f.file,sha256:f.sha256},matchedSizes:matched,differences});
  }
 }
 return comparisons;
}

export function steelDifference(input,document){
 const c=input.steelChangePlan,formats=document.config.familyFormats.formats;
 const allCount=formats.reduce((n,f)=>n+f.variants.reduce((a,v)=>a+v.mounting.length,0),0);
 const removedKeys=new Set(c.existing15VariantRows.map(r=>r.existingSku.replace(/^156-/,'').replace(/-(K00|KGL|KRA|B02S|B02)$/,'')));
 const removed=formats.filter(f=>removedKeys.has(f.key));
 const removedCount=removed.reduce((n,f)=>n+f.variants.reduce((a,v)=>a+v.mounting.length,0),0);
 if(formats.length!==80||allCount!==404||removed.length!==3||removedCount!==15)fail('steel_scope','Historischer 80/404-Quellstand passt nicht zum 15er Änderungsplan.');
 const verified=c.existing15VariantRows.map(r=>{
  const key=r.existingSku.replace(/^156-/,''),f=removed.find(f=>key.startsWith(f.key+'-')),mountingId=key.slice(f.key.length+1),v=f.variants[0],m=v.mounting.find(m=>m.id===mountingId);
  if(!m||v.basePriceCents+m.priceCents!==r.historicalShopifyPriceCents)fail('steel_price','Historische Variantenpreise widersprechen dem Änderungsplan.');
  return {...r,nativeHistoricalPriceCents:v.basePriceCents+m.priceCents};
 });
 return {status:'difference-only-not-approved-not-applied',documentSha256:STEEL_SHA,sourceRevision:4,sourceIsHistoricalNotFresh:true,existingProductId:'16190784438652',
  before:{sizes:80,variants:404},proposed:{sizes:77,variants:389},unchangedDefault:{size:document.config.familyFormats.defaultSize,color:document.config.familyFormats.defaultColor},
  removedSizeKeys:[...removedKeys],proposedVariantRemovals:verified,priceSumCents:verified.reduce((n,r)=>n+r.nativeHistoricalPriceCents,0),
  preservesExistingHistory:true,skuReuseAllowed:false,planId:null,planHash:null,
  open:['Frischen Iststand und aktuelle Bindungen vor einem Änderungsplan prüfen.','Rücknahme/Bestell- und Warenkorb-Historie sowie Umleitungsstrategie bestätigen.','Eigene neue SKUs erst nach Prüfung, keine Wiederverwendung bestehender 15 SKUs.','Explizite Freigabe des 80→77-Änderungsplans fehlt.'],confirmed:false,executed:false};
}

export function runAudit({inputsFile,codeRepo,catalogRepo,steelDocument}){
 const input=readPinned(inputsFile,INPUT_SHA),products=auditMissingSources(input);
 for(const w of input.workbooks){if(sha(blob(codeRepo,EXCEL_COMMIT,w.workbookPath))!==w.workbookSha256)fail('workbook_hash','Excel-Datei stimmt nicht mit der Extraktion überein: '+w.name);}
 if(sha(blob(codeRepo,EXCEL_COMMIT,input.steelChangePlan.path))!==input.steelChangePlan.sha256)fail('steel_md_hash','Änderungsplan-Datei stimmt nicht mit der Extraktion überein.');
 return {schema:'gravuru-issue230-plan-readiness/v1',scope:'B-local-plan-only',inputs:{excelCommit:EXCEL_COMMIT,extractionSha256:INPUT_SHA,codeBase:CODE_BASE},
  operatorInstructions:{issue:230,scopeComments:[6772867984,6772914392],fastLaneApprovalComment:6773693287,latestScopeAcknowledgement:6774617558,priceApprovalComment:6766806272,notes:['Confirmed prices are not asked again. Acrylic mounting catalogue needs the confirmed 269/329-cent correction in the candidate source package.','The fast-lane workflow approval is not confirmation of these seven nonexistent native plans.']},
  summary:{requestedProducts:7,actualNativePlans:0,blockedBeforePlan:7,confirms:0,executions:0,productWrites:0,shopifyWrites:0,bindingWrites:0},
  products,catalogue:catalogueEvidence(catalogRepo),cataloguePriceComparison:compareCatalogPrices(catalogRepo,input),
  steelChange:steelDifference(input,readPinned(steelDocument,STEEL_SHA)),
  prerequisite:'Vorhandenen planFamilyFormats-Pfad für vollständige Produktpakete nutzen. Erst nach realer review-only Quellregistrierung, echten Registry-/Profilständen und Versionsübergabe den unveränderten ProductGroupTemplate.plan-Service aufrufen. Keine flüchtigen Testquellen als Freigabeplan.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.length!==5)throw Error('Aufruf: node scripts/issue230-product-plan-audit.mjs INPUTS_JSON CODE_REPO KATALOG_REPO HISTORICAL_STEEL_JSON NEW_OUTPUT_JSON');
 const [inputsFile,codeRepo,catalogRepo,steelDocument,out]=args;
 const report=runAudit({inputsFile,codeRepo,catalogRepo,steelDocument});fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 process.stdout.write(JSON.stringify({output:path.resolve(out),sha256:sha(fs.readFileSync(out)),...report.summary})+'\n');
}
