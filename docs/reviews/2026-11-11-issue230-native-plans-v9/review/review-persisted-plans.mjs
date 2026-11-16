import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
const codeRoot=path.resolve(process.argv[4]||'work/product-plans-final');
const {applyModuleProfile,MODULE_PROFILE_SCHEMA}=await import(pathToFileURL(path.join(codeRoot,'app/configurator/variant-m/module-profile.mjs')));
const {validateProductDocument}=await import(pathToFileURL(path.join(codeRoot,'app/workshop/product-model.mjs')));
const db=new DatabaseSync(path.join(root,'workshop.sqlite'),{readOnly:true});
db.exec('PRAGMA query_only=ON; BEGIN;');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const pairs=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()&&fs.existsSync(path.join(root,x.name,'pair.json'))).map(x=>({dir:x.name,pair:JSON.parse(fs.readFileSync(path.join(root,x.name,'pair.json')))}));
const results=pairs.map(({dir,pair:p})=>{
 const plan=JSON.parse(fs.readFileSync(path.join(root,dir,'plan.json')));
 const source=JSON.parse(fs.readFileSync(path.join(root,dir,'source-document.json')));
 const row=db.prepare('SELECT * FROM product_group_creation_plans WHERE tenant_id=? AND id=?').get('gravuru',p.planId);
 const template=db.prepare('SELECT * FROM product_group_template_revisions WHERE tenant_id=? AND id=? AND revision=?').get('gravuru',p.template.id,p.template.revision);
 const revision=db.prepare('SELECT * FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get('gravuru',p.source.id,p.source.revision);
 const stored=JSON.parse(row.document),storedTemplate=JSON.parse(template.document),storedSource=JSON.parse(revision.document);
 const {id,planHash,createdAt,...planDocument}=plan;
 const nativeProducts=stored.products,combinationKeys=nativeProducts.flatMap(p=>p.variantReview.map(v=>JSON.stringify(canonical(v.options))));
 const modulePins=stored.moduleProfiles||[],moduleRecords=modulePins.map(pin=>db.prepare('SELECT * FROM configurator_module_profile_revisions WHERE tenant_id=? AND id=? AND revision=?').get('gravuru',pin.id,pin.revision));
 const moduleHashesMatch=modulePins.every((pin,i)=>!!moduleRecords[i]&&moduleRecords[i].sha256===pin.sha256&&hash(JSON.parse(moduleRecords[i].document))===pin.sha256);
 let expectedCompiled=structuredClone(source);
 const targetModule=storedTemplate.targets[0]?.moduleProfile;
 if(targetModule){const mr=moduleRecords.find(r=>r?.id===targetModule.id&&r.revision===targetModule.revision);if(!mr)throw Error('Pinned module missing');expectedCompiled.config=applyModuleProfile(source.config,{schema:MODULE_PROFILE_SCHEMA,id:mr.id,revision:mr.revision,modules:JSON.parse(mr.document).modules});expectedCompiled=validateProductDocument(expectedCompiled);}
 const checks={
  storedPlanShaMatches:hash(stored)===row.sha256&&row.sha256===p.planHash&&planHash===p.planHash,
  exportedPlanEqualsStored:hash(planDocument)===hash(stored),
  sourceFileEqualsPersisted:hash(source)===hash(storedSource)&&hash(source)===p.source.sha256,
  sourceRefMatches:stored.sources.length===1&&stored.sources[0].productId===p.source.id&&stored.sources[0].revision===p.source.revision&&stored.sources[0].sha256===hash(storedSource),
  templateHashMatches:hash(storedTemplate)===template.sha256&&template.sha256===p.template.sha256&&stored.templateHash===template.sha256,
  excelHashPaired:stored.creationKey==='issue230-'+p.excelSha256,
  expectedNativeProductCount:nativeProducts.length===1,
  uniqueCombinations:new Set(combinationKeys).size===combinationKeys.length,
  compiledSourceWithPinnedModulesSame:hash(nativeProducts[0].document)===hash(expectedCompiled),
  pinnedModuleHashesMatch:moduleHashesMatch,
  moduleProposalMatchesPlan:!p.effectiveModuleProposal||hash(p.effectiveModuleProposal)===hash(nativeProducts[0].document.config.moduleProfile?.modules??p.effectiveModuleProposal),
  moduleDecisionMatchesPlan:!p.effectiveModules||hash(p.effectiveModules)===hash(nativeProducts[0].document.config.moduleProfile?.modules),
  openQuestionsIncluded:stored.issues.filter(i=>i.code==='open_question').length===storedTemplate.openQuestions.length,
  stillUnconfirmed:db.prepare('SELECT COUNT(*) n FROM product_group_confirmations WHERE tenant_id=? AND plan_id=?').get('gravuru',p.planId).n===0,
  stillUnexecuted:db.prepare('SELECT COUNT(*) n FROM product_group_creation_results WHERE tenant_id=? AND plan_id=?').get('gravuru',p.planId).n===0
 };
 return {workbook:p.workbook,planId:p.planId,planHash:p.planHash,variants:combinationKeys.length,valid:stored.valid,checks,allPassed:Object.values(checks).every(Boolean),issues:stored.issues};
});
const counts={products:db.prepare('SELECT COUNT(*) n FROM products WHERE tenant_id=?').get('gravuru').n,plans:db.prepare('SELECT COUNT(*) n FROM product_group_creation_plans WHERE tenant_id=?').get('gravuru').n,confirmations:db.prepare('SELECT COUNT(*) n FROM product_group_confirmations WHERE tenant_id=?').get('gravuru').n,executions:db.prepare('SELECT COUNT(*) n FROM product_group_creation_results WHERE tenant_id=?').get('gravuru').n};
db.exec('ROLLBACK;');db.close();
const review={schema:'issue230-independent-persisted-plan-review/v1',readOnly:true,root,counts,results,allPassed:results.every(r=>r.allPassed)};
fs.writeFileSync(out,JSON.stringify(review,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(review,null,2));

