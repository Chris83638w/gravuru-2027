import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const [runArg,priorArg,codeArg,outArg]=process.argv.slice(2);if(!outArg)throw Error('RUN PRIOR CODE OUT required');
const [run,prior,code,out]=[runArg,priorArg,codeArg,outArg].map(p=>path.resolve(p));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const sha=b=>createHash('sha256').update(b).digest('hex'),digest=v=>sha(JSON.stringify(canonical(v))),same=(a,b)=>digest(a)===digest(b);
const hashFile=async p=>{const h=createHash('sha256');for await(const chunk of fs.createReadStream(p))h.update(chunk);return h.digest('hex');};
const pin='64e026e8fd15b129a16cc97189b28506aa9e8ac2';
const {quantityTierFor,applyQuantityTier}=await import(pathToFileURL(path.join(code,'app/configurator/variant-m/quantity-tiers.mjs')).href);
const codePaths=['app/configurator/variant-m/quantity-tiers.mjs','app/configurator/variant-m/contract.mjs','app/configurator/variant-m/module-profile.mjs','app/workshop/product-model.mjs','app/workshop/product-group-templates.mjs','app/workshop/configurator-module-profiles.mjs'];
const codeChecks=codePaths.map(p=>{const git=execFileSync('git',['-C',code,'show',pin+':'+p],{maxBuffer:20*1024*1024}),disk=fs.readFileSync(path.join(code,p));return {path:p,commit:pin,gitSha256:sha(git),workingTreeLFMatches:disk.toString().replace(/\r\n/g,'\n')===git.toString().replace(/\r\n/g,'\n')};});
const summary=read(path.join(run,'summary.json')),oldSummary=read(path.join(prior,'summary.json')),decisions=read(path.join(run,'decisions.json')),decisionHash=digest(decisions),expectedTiers=[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}];
const db=new DatabaseSync(path.join(run,'workshop.sqlite'),{readOnly:true}),profileDb=new DatabaseSync(path.join(run,'profiles.sqlite'),{readOnly:true});
db.exec('PRAGMA query_only=ON; BEGIN;');profileDb.exec('PRAGMA query_only=ON; BEGIN;');
const results=[];let removedCount=0;
for(const p of summary.results){
 const stem=p.workbook.replace(/\.xlsx$/,''),old=oldSummary.results.find(x=>x.workbook===p.workbook),folder=path.join(run,stem);
 const source=read(path.join(folder,'source-document.json')),plan=read(path.join(folder,'plan.json')),metadata=read(path.join(folder,'source-metadata.json')),template=read(path.join(folder,'template.json'));
 const priorSource=read(path.join(prior,stem,'source-document.json')),priorPlan=read(path.join(prior,stem,'plan.json'));
 const current=db.prepare('SELECT * FROM products WHERE tenant_id=? AND id=?').get('gravuru',p.source.id),rev=db.prepare('SELECT * FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get('gravuru',p.source.id,2),oldRev=db.prepare('SELECT * FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get('gravuru',p.source.id,1);
 const templateHead=db.prepare('SELECT * FROM product_group_templates WHERE tenant_id=? AND id=?').get('gravuru',p.template.id),oldTemplate=JSON.parse(db.prepare('SELECT document FROM product_group_template_revisions WHERE tenant_id=? AND id=? AND revision=?').get('gravuru',p.template.id,1).document);
 const expectedTemplate=structuredClone(oldTemplate);expectedTemplate.openQuestions=[];for(const target of expectedTemplate.targets)target.source.revision=2;
 const meta=JSON.parse(rev.metadata),config=plan.products[0].document.config,main=p.workbook==='Tuerschild-Acrylglas-3mm_v4.xlsx';
 const historical=db.prepare('SELECT document,sha256 FROM product_group_creation_plans WHERE tenant_id=? AND id=?').get('gravuru',old.planId);
 const tierExamples=[1,2,3,4,5,9,10,11].map(quantity=>{const rate=quantity>=10?15:quantity>=5?10:quantity>=3?5:0,list=3201;return {quantity,expected:Math.floor((list*(100-rate)+50)/100),actual:applyQuantityTier(list,quantityTierFor(config,quantity))};});
 const checks={
  sourceRevision2:p.source.revision===2&&current.revision===2&&plan.sources[0].revision===2&&plan.products[0].sourceRevision===2,
  templateRevision2:p.template.revision===2&&templateHead.revision===2&&template.revision===2&&plan.templateRevision===2,
  nativeValidNoIssues:plan.valid===true&&plan.issues.length===0&&template.document.openQuestions.length===0,
  sourceCanonicalUnchanged:same(source,priorSource)&&same(source,JSON.parse(rev.document))&&same(source,JSON.parse(oldRev.document))&&p.source.sha256===old.source.sha256,
  compiledDocumentUnchanged:same(plan.products[0].document,priorPlan.products[0].document),
  variantReviewUnchanged:same(plan.products[0].variantReview,priorPlan.products[0].variantReview),
  sourceMetadataExact:same(metadata,meta)&&digest(meta)===p.source.metadataSha256&&same(meta.profiles,JSON.parse(oldRev.metadata).profiles),
  decisionManifestPinned:decisionHash===summary.decisionsManifestSha256&&decisionHash===p.decisions.manifestSha256&&decisionHash===meta.businessDecisions.manifestSha256,
  taxMetadataOnly:meta.businessDecisions.tax.confirmed===true&&meta.businessDecisions.tax.vatPercent===19&&meta.businessDecisions.tax.country==='DE'&&meta.businessDecisions.tax.pricePresentation==='gross'&&!Object.keys(source.config).some(k=>/^(tax|vat|taxRate|taxIncluded)$/i.test(k)),
  unchangedTierPins:same(source.config.quantityTiers,expectedTiers)&&same(config.quantityTiers,expectedTiers)&&same(meta.businessDecisions.quantityDiscount.tiers,expectedTiers)&&same(decisions.quantityDiscount.tiers,expectedTiers)&&config.quantityTierScope==='complete-unit'&&meta.businessDecisions.quantityDiscount.scope==='complete-unit',
  tierThresholdsAndRounding:tierExamples.every(x=>x.actual===x.expected),
  onlySourceRevisionAndQuestionsChangedInTemplate:same(template.document,expectedTemplate),
  removedQuestionsRecorded:same(p.removedOpenQuestions.map(x=>x.question),oldTemplate.openQuestions)&&p.removedOpenQuestions.every(x=>typeof x.evidence==='string'&&x.evidence.length>10),
  oldPlanStillStored:historical.sha256===old.planHash&&JSON.parse(historical.document).valid===false,
  effectiveUploads:config.moduleProfile.modules.photo===main&&config.moduleProfile.modules.logo===main&&config.photo.enabled===main&&config.logo.enabled===main,
  modulePinsUnchanged:same(plan.moduleProfiles,priorPlan.moduleProfiles),
  notPublished:plan.published===false&&plan.shopifyWrites===0&&plan.localOnly===true,
  originalWorkbookSame:await hashFile(path.join(run,'excel',p.workbook))===await hashFile(path.join(prior,'excel',p.workbook))
 };
 removedCount+=p.removedOpenQuestions.length;results.push({workbook:p.workbook,planId:p.planId,planHash:p.planHash,checks,allPassed:Object.values(checks).every(Boolean),tierExamples});
}
const pins=read(path.join(run,'motif-profile-pins.json')),oldPins=read(path.join(prior,'motif-profile-pins.json'));
const motifPins=pins.profiles.map(pin=>{const r=profileDb.prepare('SELECT document FROM profile_revisions WHERE tenant_id=? AND profile_id=? AND revision=?').get('gravuru',pin.profile_id,pin.revision);return {id:pin.profile_id,revision:pin.revision,exact:r&&same(JSON.parse(r.document),pin.document)&&sha(r.document)===pin.documentSha256,count:pin.document.items.length};});
const counts={products:db.prepare('SELECT COUNT(*) n FROM products WHERE tenant_id=?').get('gravuru').n,revisions:db.prepare('SELECT COUNT(*) n FROM product_revisions WHERE tenant_id=?').get('gravuru').n,plans:db.prepare('SELECT COUNT(*) n FROM product_group_creation_plans WHERE tenant_id=?').get('gravuru').n,confirmations:db.prepare('SELECT COUNT(*) n FROM product_group_confirmations WHERE tenant_id=?').get('gravuru').n,executions:db.prepare('SELECT COUNT(*) n FROM product_group_creation_results WHERE tenant_id=?').get('gravuru').n};
db.exec('ROLLBACK');profileDb.exec('ROLLBACK');db.close();profileDb.close();
const preservation=read(path.join(run,'v8-preservation.json')),v8Files=[];for(const [file,expected] of Object.entries(preservation.files)){const actual=await hashFile(path.join(prior,file));v8Files.push({file,expected,actual,unchanged:actual===expected});}
const checks={sevenCurrentValid:results.length===7&&results.every(r=>r.allPassed),countsExact:counts.products===7&&counts.revisions===14&&counts.plans===14&&counts.confirmations===0&&counts.executions===0,exactly15QuestionsRemoved:removedCount===15,motifPinsUnchanged:same(pins.profiles,oldPins.profiles)&&motifPins.every(x=>x.exact&&x.count===13),motifDbHash:await hashFile(path.join(run,'profiles.sqlite'))===pins.databaseSha256,v8ProtectedFilesUnchanged:v8Files.every(x=>x.unchanged),codeMatchesPinnedCommit:codeChecks.every(x=>x.workingTreeLFMatches),noExecutionDecision:decisions.release.station3Confirmed===false&&decisions.release.executeAuthorized===false};
const result={schema:'issue230-independent-v9-finalization-review/v1',readOnly:true,run,prior,codeCommit:pin,decisionHash,counts,removedCount,checks,allPassed:Object.values(checks).every(Boolean),results,motifPins,codeChecks,v8Files,limits:['No confirmation, execution, Shopify or server mutation.','Motif-profile revision remains an external pin to recheck at execution; native template plan does not enforce that separate library revision.','Tax is explicit metadata, not an invented configurator tax field.']};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({allPassed:result.allPassed,counts,checks,failed:results.filter(r=>!r.allPassed).map(r=>({workbook:r.workbook,checks:r.checks}))}));if(!result.allPassed)process.exitCode=1;
