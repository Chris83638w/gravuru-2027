// Local v9 only. Preserve v8, use native revision/plan APIs, never confirm/execute.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {DatabaseSync,backup} from 'node:sqlite';

const [previousArg,codeArg,catalogArg,outArg]=process.argv.slice(2);
if(!outArg)throw Error('Usage: node finalize-product-plans-v9.mjs PREVIOUS_V8 CODE_64e026e CATALOG_PIN NEW_V9');
const [previous,code,catalog,out]=[previousArg,codeArg,catalogArg,outArg].map(p=>path.resolve(p));
const CODE='64e026e8fd15b129a16cc97189b28506aa9e8ac2';
if(fs.existsSync(out))throw Error('Output must be a NEW directory.');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const sha=b=>createHash('sha256').update(b).digest('hex');
const digest=v=>sha(JSON.stringify(canonical(v)));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:64*1024*1024});
if(git(code,'rev-parse','HEAD').toString().trim()!==CODE)throw Error('Code commit must be 64e026e.');
for(const args of [['diff','--quiet','--','app','scripts/issue230-native-plans.mjs','scripts/issue230-product-plan-audit.mjs'],['diff','--cached','--quiet','--','app','scripts/issue230-native-plans.mjs','scripts/issue230-product-plan-audit.mjs']])git(code,...args);
const load=relative=>import(pathToFileURL(path.join(code,relative)).href);
const {createProductRepository}=await load('app/workshop/repository.mjs');
const {validateProductDocument}=await load('app/workshop/product-model.mjs');
const {createConfiguratorModuleManagement}=await load('app/workshop/configurator-module-http.mjs');
const {createProfileLibrary}=await load('app/workshop/profile-library.mjs');
const {compareNativeVariants}=await load('scripts/issue230-native-plans.mjs');
const {planExistingTemplate,INPUT_SHA,EXCEL_COMMIT,CATALOG_COMMIT}=await load('scripts/issue230-product-plan-audit.mjs');
if(git(catalog,'rev-parse','HEAD').toString().trim()!==CATALOG_COMMIT)throw Error('Catalogue pin mismatch.');
const old=read(path.join(previous,'summary.json'));
if(old.actualNativePlans!==7||old.confirmations!==0||old.executions!==0||old.priceDifferences!==0)throw Error('Expected verified unconfirmed v8.');
const inputZip=fs.readFileSync(path.join(previous,'sources/normalized-inputs.json.gz'));
const inputBytes=gunzipSync(inputZip);if(sha(inputBytes)!==INPUT_SHA)throw Error('Original extraction changed.');
const inputs=JSON.parse(inputBytes);
const protectedFiles=['summary.json','workshop.sqlite','profiles.sqlite','manifest.json',...old.results.flatMap(r=>{const stem=r.workbook.replace('.xlsx','');return [stem+'/source-document.json',stem+'/plan.json',stem+'/pair.json','excel/'+r.workbook];})];
const previousHashes=Object.fromEntries(protectedFiles.map(p=>[p,sha(fs.readFileSync(path.join(previous,p)))]));
const motifCatalog=JSON.parse(git(catalog,'show',CATALOG_COMMIT+':motive/motive.json')).motifs;
const decisions={
 schema:'gravuru-issue230-business-decisions/v1',recordedAt:new Date().toISOString(),codeCommit:CODE,
 scope:{products:old.results.map(r=>r.workbook),baseAndSurcharges:true,amountsUnchanged:true,currency:'EUR'},
 tax:{pricePresentation:'gross',vatPercent:19,country:'DE',confirmed:true,date:'2026-11-11',quote:'Ja, inklusive 19 % MwSt.',source:'Explicit user reply in the current Codex chat, relayed by coordinator to product_plans; all seven base prices and surcharges.',storage:'Revision metadata and external decision manifest only; no unsupported product-config tax field.'},
 quantityDiscount:{confirmed:true,decisionDate:'2026-10-20',tiers:[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}],scope:'complete-unit',basis:'Full unit price including mounting, additional/changed motifs, photo and SVG logo; existing line-item quantity contract, highest attained tier, one half-up rounding to integer cents.',sources:[{commit:CODE,path:'ENTSCHEIDUNGEN.md',section:'4.16'},{commit:CODE,path:'docs/plans/STAFFEL-SHOP-BESTAND-20261019.md',section:'Entscheidung 20.10.2026 (Chris)'},{commit:CODE,path:'docs/handoffs/2026-10-22-entscheidungen-und-funktionserhalt.md',section:'Abschluss, Warenkorb und Preise'}],supersedes:'Historical Excel wording treating the already confirmed tier as a new operator proposal.'},
 starts:{confirmedKeepExisting:true,date:'2026-11-11',quotes:['ach so bei den designs kann es so bleiben. Ich bin vom Hauptprodukt ausgegangen.','Produktbild im Shop'],source:{commit:CODE,path:'docs/handoffs/2026-11-11-issue230-shop-image-clarification.md'},noNewDesignSelection:true,noDefaultChange:true,defaults:old.results.map(r=>({workbook:r.workbook,...r.proposedStart}))},
 uploads:read(path.join(previous,'upload-decision.json')),
 motifs:{count:13,sourceComment:'https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6772716646',excluded:'motive-kleine-schilder/schmetterlinge-1.svg',preservedOriginalResources:true,unchangedProfilePins:read(path.join(previous,'motif-profile-pins.json')).profiles},
 geometry:{policy:'Keep nine native-fit exclusions and two deliberately hidden originals unchanged; informational review findings, no forced acceptance or tolerance change.',source:'design-exclusions.json',noApprovalForExcludedDesigns:true},
 release:{station3Confirmed:false,executeAuthorized:false,shopifyWrites:0,serverWrites:0,note:'A valid local plan is ready for review, not approved for execution or publication.'}
};
const decisionHash=digest(decisions);
fs.mkdirSync(out,{recursive:true});write(path.join(out,'decisions.json'),decisions);
for(const name of ['workshop.sqlite','profiles.sqlite']){const db=new DatabaseSync(path.join(previous,name),{readOnly:true});try{await backup(db,path.join(out,name));}finally{db.close();}}
const previousDb=new DatabaseSync(path.join(previous,'workshop.sqlite'),{readOnly:true});
const filename=path.join(out,'workshop.sqlite');
const profiles=createProfileLibrary({filename:path.join(out,'profiles.sqlite'),tenantId:'gravuru',catalog:{fonts:[],motifs:motifCatalog.map(m=>({id:m.key,name:m.name}))}});
const repository=createProductRepository({filename,tenantId:'gravuru',validateDocument:d=>{const value=validateProductDocument(d);profiles.resolve(value);return value;},snapshotMetadata:d=>({profiles:profiles.resolve(d),businessDecisions:{schema:decisions.schema,manifestSha256:decisionHash,tax:decisions.tax,quantityDiscount:{confirmed:true,decisionDate:'2026-10-20',scope:'complete-unit',tiers:decisions.quantityDiscount.tiers},startsKept:true,uploadsConfirmed:true,station3Confirmed:false}})});
const manager=createConfiguratorModuleManagement({filename,repository,tenantId:'gravuru'}),results=[];
try{
 for(const prior of old.results){
  const stem=prior.workbook.replace('.xlsx',''),dir=path.join(out,stem),source=read(path.join(previous,stem,'source-document.json'));
  if(digest(source)!==prior.source.sha256)throw Error('v8 source hash mismatch: '+stem);
  const before=repository.get(prior.source.id);if(before.revision!==prior.source.revision||digest(before.document)!==prior.source.sha256)throw Error('Backup source mismatch.');
  const oldPlan=manager.groups.getPlan(prior.planId);if(oldPlan.planHash!==prior.planHash||oldPlan.valid!==false||oldPlan.issues.some(i=>i.code!=='open_question'))throw Error('Unexpected prior native issue.');
  console.log(JSON.stringify({stage:'revision',workbook:prior.workbook}));
  // A native new revision records the now confirmed business metadata without
  // modifying price/config/schema/design bytes or adding an unsupported tax key.
  const saved=repository.save(before.id,before.document,before.revision);
  if(saved.revision!==before.revision+1||digest(saved.document)!==prior.source.sha256||digest(saved.document.config)!==digest(before.document.config))throw Error('Source data changed.');
  if(Object.keys(saved.document.config).some(k=>/^(tax|vat|taxRate|taxIncluded)$/i.test(k)))throw Error('Unexpected tax config field.');
  const currentTemplate=manager.groups.get(prior.template.id);if(currentTemplate.revision!==prior.template.revision||currentTemplate.sha256!==prior.template.sha256)throw Error('Template mismatch.');
  const next=structuredClone(currentTemplate.document),removed=[];
  for(const question of next.openQuestions){
   let evidence;
   if(question.startsWith('Startdesign '))evidence='decisions.starts: explicit user instruction to retain existing designs/start templates';
   else if(question.startsWith('Steuerkontext/'))evidence='decisions.tax + quantityDiscount + starts + uploads: all substantiated, no new prices';
   else if(question==='9 Originaldesigns haben native Kontur-/Randfehler (family-report.json). 2 weitere Katalogdesigns sind bewusst hidden und bleiben ausgeblendet; keine Wiederfreigabe beantragt.')evidence='decisions.geometry: exclusions remain unchanged in source and review evidence; informational fact, not an unresolved choice';
   else throw Error('Unresolved unknown question: '+question);
   removed.push({question,evidence});
  }
  next.openQuestions=[];
  for(const target of next.targets){if(target.source.productId!==saved.id||target.source.revision!==before.revision)throw Error('Unexpected template source.');target.source.revision=saved.revision;}
  const template=manager.groups.save(currentTemplate.id,next,currentTemplate.revision,{actor:'Astra v9: confirmed DE gross 19%; existing designs/tier/uploads retained'});
  const workbook=inputs.workbooks.find(w=>w.name===prior.workbook);
  const paired=planExistingTemplate({groups:manager.groups,templateId:template.id,templateRevision:template.revision,product:oldPlan.requestedProducts[0],excel:workbook});
  if(!paired.plan.valid||paired.plan.issues.length)throw Error('Native v9 plan is not valid.');
  if(digest(paired.plan.products[0].document)!==digest(oldPlan.products[0].document))throw Error('Compiled product changed despite metadata-only finalization.');
  const comparison=compareNativeVariants(workbook,paired.plan);if(comparison.differences.length)throw Error('823-price comparison failed.');
  const result={...prior,source:{id:saved.id,revision:saved.revision,sha256:digest(saved.document),status:saved.status,publishedRevision:saved.publishedRevision,metadataSha256:digest(saved.metadata)},registry:manager.overview().sources.find(s=>s.productId===saved.id),template:{id:template.id,revision:template.revision,sha256:template.sha256},planId:paired.planId,planHash:paired.planHash,valid:true,approvalReady:true,approvalScope:'Ready for explicit review only; not confirmed, executed or published',comparison,openQuestions:[],removedOpenQuestions:removed,decisions:{manifestSha256:decisionHash,tax:decisions.tax,quantityDiscount:decisions.quantityDiscount,startsKept:true},profileSelections:saved.metadata.profiles,previousPreparation:{run:'v8',sourceRevision:before.revision,sourceHash:prior.source.sha256,templateRevision:currentTemplate.revision,templateHash:currentTemplate.sha256,planId:prior.planId,planHash:prior.planHash},confirmations:0,executions:0,shopifyWrites:0};
  write(path.join(dir,'source-document.json'),saved.document);write(path.join(dir,'source-metadata.json'),saved.metadata);write(path.join(dir,'template.json'),template);write(path.join(dir,'plan.json'),paired.plan);write(path.join(dir,'pair.json'),result);
  fs.copyFileSync(path.join(previous,stem,'family-report.json'),path.join(dir,'family-report.json'),fs.constants.COPYFILE_EXCL);
  results.push(result);console.log(JSON.stringify({stage:'planned',workbook:prior.workbook,planId:paired.planId,valid:true,variants:comparison.actual,sourceRevision:saved.revision,templateRevision:template.revision}));
 }
}finally{manager.close();repository.close();profiles.close();previousDb.close();}
const db=new DatabaseSync(filename,{readOnly:true});
const counts={sourceRecords:db.prepare('SELECT COUNT(*) n FROM products WHERE tenant_id=?').get('gravuru').n,sourceRevisions:db.prepare('SELECT COUNT(*) n FROM product_revisions WHERE tenant_id=?').get('gravuru').n,persistedPlans:db.prepare('SELECT COUNT(*) n FROM product_group_creation_plans WHERE tenant_id=?').get('gravuru').n,confirmations:db.prepare('SELECT COUNT(*) n FROM product_group_confirmations WHERE tenant_id=?').get('gravuru').n,executions:db.prepare('SELECT COUNT(*) n FROM product_group_creation_results WHERE tenant_id=?').get('gravuru').n};db.close();
if(counts.sourceRecords!==7||counts.sourceRevisions!==14||counts.persistedPlans!==14||counts.confirmations!==0||counts.executions!==0)throw Error('Unexpected persisted counts.');
const summary={schema:'gravuru-issue230-local-native-plan-batch/v2',run:'v9',codeCommit:CODE,catalogCommit:CATALOG_COMMIT,excelCommit:EXCEL_COMMIT,actualNativePlans:7,currentValidPlans:7,historicalPlans:7,approvalReady:7,approvalScope:'Ready for concrete Station-3 review only',...counts,shopifyWrites:0,serverWrites:0,comparedVariants:results.reduce((n,r)=>n+r.comparison.actual,0),priceDifferences:0,decisionsManifestSha256:decisionHash,catalogList:old.catalogList,results};
if(summary.comparedVariants!==823)throw Error('Expected 823 variants.');
write(path.join(out,'summary.json'),summary);
fs.mkdirSync(path.join(out,'sources'));fs.writeFileSync(path.join(out,'sources/normalized-inputs.json.gz'),inputZip,{flag:'wx'});
for(const name of ['design-exclusions.json','upload-decision.json'])fs.copyFileSync(path.join(previous,name),path.join(out,name),fs.constants.COPYFILE_EXCL);
fs.mkdirSync(path.join(out,'excel'));for(const r of results)fs.copyFileSync(path.join(previous,'excel',r.workbook),path.join(out,'excel',r.workbook),fs.constants.COPYFILE_EXCL);
const pins=read(path.join(previous,'motif-profile-pins.json'));pins.databaseSha256=sha(fs.readFileSync(path.join(out,'profiles.sqlite')));pins.executionRequirement='Separate motif-profile revision/document/database pins must be rechecked before later confirmation/execution. Native ProductGroupTemplate guards module profiles and source revisions, not motif-library revisions.';write(path.join(out,'motif-profile-pins.json'),pins);
const retained=Object.fromEntries(protectedFiles.map(p=>[p,sha(fs.readFileSync(path.join(previous,p)))]));
if(digest(previousHashes)!==digest(retained))throw Error('Protected v8 bytes changed.');
write(path.join(out,'v8-preservation.json'),{readOnlyOriginal:true,originalRun:previous,files:previousHashes,allUnchanged:true});
write(path.join(out,'verification.json'),{nativePlansValid:results.every(r=>r.valid&&r.openQuestions.length===0),compiledDocumentsUnchanged:true,sourceDocumentsUnchanged:true,newSourceRevisionMetadataOnly:true,prices:{expected:823,matched:summary.comparedVariants,differences:0},taxMetadataOnly:true,designCounts:results.map(r=>({workbook:r.workbook,native:r.designs.native,excluded:r.designs.fitExcludedIds.length,hidden:r.designs.hiddenIds.length})),persistedCounts:counts,decisionManifestSha256:decisionHash,previousRunUnchanged:true});
console.log(JSON.stringify({stage:'complete',out,validPlans:7,variants:823,...counts}));
