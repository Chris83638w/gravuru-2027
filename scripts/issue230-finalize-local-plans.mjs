// Reuses verified, expensive native source conversion. Produces a NEW isolated
// persisted planning package, preserving source originals and previous runs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {createConfiguratorModuleManagement} from '../app/workshop/configurator-module-http.mjs';
import {createProfileLibrary} from '../app/workshop/profile-library.mjs';
import {nativeModuleAvailability} from '../app/configurator/variant-m/module-profile.mjs';
import {compareNativeVariants} from './issue230-native-plans.mjs';
import {planExistingTemplate,INPUT_SHA,EXCEL_COMMIT,CATALOG_COMMIT,sha} from './issue230-product-plan-audit.mjs';
const [previous,catalogRoot,out]=process.argv.slice(2).map(p=>p&&path.resolve(p));
if(!previous||!catalogRoot||!out||fs.existsSync(out))throw Error('Previous verified run, pinned catalogue and NEW output required.');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>sha(JSON.stringify(canonical(v)));
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
const git=(...args)=>execFileSync('git',['-C',catalogRoot,...args],{maxBuffer:64*1024*1024});
if(git('rev-parse','HEAD').toString().trim()!==CATALOG_COMMIT)throw Error('Wrong catalogue pin.');
git('diff','--quiet');git('diff','--cached','--quiet');
const inputsBytes=gunzipSync(fs.readFileSync('docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz'));
if(sha(inputsBytes)!==INPUT_SHA)throw Error('Excel extraction changed.');
const inputs=JSON.parse(inputsBytes),old=read(path.join(previous,'summary.json'));
if(old.actualNativePlans!==7||old.confirmations||old.executions)throw Error('Exactly seven previous unconfirmed native plans required.');
const previousDb=new DatabaseSync(path.join(previous,'workshop.sqlite'),{readOnly:true});
const list=JSON.parse(git('show',CATALOG_COMMIT+':auftraege/2026-11-10-tuerschild-designs-namensschilder/designs.json')).designs;
const sorted=list.map((d,index)=>({...d,index})).sort((a,b)=>a.rang-b.rang||a.index-b.index),order=new Map();
for(const d of sorted)if(!order.has(d.id))order.set(d.id,order.size);
const motifCatalog=JSON.parse(git('show',CATALOG_COMMIT+':motive/motive.json')).motifs;
const smallMotifs=motifCatalog.filter(m=>m.file.startsWith('motive-kleine-schilder/')&&m.file!=='motive-kleine-schilder/schmetterlinge-1.svg');
if(smallMotifs.length!==13)throw Error('Exactly thirteen original motifs required.');
for(const m of smallMotifs){const bytes=git('show',CATALOG_COMMIT+':motive/'+m.file);if(sha(bytes)!==m.sha256)throw Error('Motif source checksum mismatch: '+m.key);}
fs.mkdirSync(out,{recursive:true});
const profiles=createProfileLibrary({filename:path.join(out,'profiles.sqlite'),tenantId:'gravuru',catalog:{fonts:[],motifs:motifCatalog.map(m=>({id:m.key,name:m.name}))}});
const motifProfile=profiles.create({name:'Kleinformate: bestätigte 13 Motive (10.11.2026)',type:'motifs',items:smallMotifs.map(m=>m.key)});
const filename=path.join(out,'workshop.sqlite');
const repository=createProductRepository({filename,tenantId:'gravuru',validateDocument:d=>{const value=validateProductDocument(d);profiles.resolve(value);return value;},snapshotMetadata:d=>({profiles:profiles.resolve(d)})});
const manager=createConfiguratorModuleManagement({filename,repository,tenantId:'gravuru'}),results=[];
const uploadDecision={date:'2026-11-11',source:'Explicit user response in current Codex chat, relayed by root to product_plans',mainAcrylic:{photo:true,svgLogo:true,photoCents:999,logoCents:1299},sixSmallProducts:{photo:false,logo:false},scope:'Upload modules only; no product confirmation or execution'};
const smallModuleProfile=manager.profiles.create({name:'Kleinformate: Foto/Logo aus (Chris, 11.11.2026)',modules:{options:true,designs:true,text:true,motifs:true,photo:false,logo:false,colors:false}},{actor:'Astra recording explicit upload decision, 11.11.2026'});
const mainModuleProfile=manager.profiles.create({name:'Acryl-Hauptprodukt: Foto und SVG-Logo an (Chris, 11.11.2026)',modules:{options:true,designs:true,text:true,motifs:true,photo:true,logo:true,colors:false}},{actor:'Astra recording explicit upload decision, 11.11.2026'});
try{
 for(const prior of old.results){
  const workbook=inputs.workbooks.find(w=>w.name===prior.workbook),label=prior.workbook.replace(/\.xlsx$/,''),dir=path.join(out,label),small=workbook.counts.sizeRows===1;
  const source=read(path.join(previous,label,'source-document.json'));
  if(digest(source)!==prior.source.sha256)throw Error('Previous source changed: '+label);
  const stored=previousDb.prepare('SELECT document FROM product_revisions WHERE product_id=? AND revision=? AND tenant_id=?').get(prior.source.id,prior.source.revision,'gravuru');
  if(!stored||digest(JSON.parse(stored.document))!==prior.source.sha256)throw Error('Previous persisted source changed: '+label);
  const hiddenIds=prior.designs.missing.filter(id=>{const row=list.find(d=>d.id===id);return JSON.parse(git('show',CATALOG_COMMIT+':designs/'+row.reihe+'/'+id+'/design.json')).hidden===true;});
  const fitExcludedIds=prior.designs.missing.filter(id=>!hiddenIds.includes(id));
  const beforeIds=source.config.familyFormats.designs.map(d=>d.id).sort(),originalMotifs=digest(source.config.localResources.motifs);
  const nativeOrder=new Map(source.config.familyFormats.designs.map(d=>[d.id,order.get(d.katalog.designId)]));
  source.config.familyFormats.designs.sort((a,b)=>nativeOrder.get(a.id)-nativeOrder.get(b.id));
  for(const f of source.config.familyFormats.formats)for(const v of f.variants)v.designIds.sort((a,b)=>nativeOrder.get(a)-nativeOrder.get(b));
  if(small)source.profileAssignments.motifs={mode:'override',profileId:motifProfile.id};
  else {source.config.photo={...source.config.photo,enabled:true,includedCount:0,extraPriceCents:999};source.config.logo={...source.config.logo,enabled:true,vectorUpload:true,extraPriceCents:1299};}
  if(digest(source.config.localResources.motifs)!==originalMotifs||JSON.stringify(source.config.familyFormats.designs.map(d=>d.id).sort())!==JSON.stringify(beforeIds))throw Error('Original resources changed.');
  const record=repository.create(source),saved=repository.get(record.id),scope=manager.overview().scopes.find(s=>s.subcategoryId===record.id);
  const draft=manager.groups.draft({name:label,scope:{lineId:scope.lineId,subcategoryId:scope.subcategoryId},sourceKeys:scope.sourceKeys});
  const selectedModules=small?smallModuleProfile:mainModuleProfile;
  draft.targets[0].moduleProfile={id:selectedModules.id,revision:selectedModules.revision};
  draft.openQuestions=prior.openQuestions.filter(q=>!q.startsWith('Station 3:')&&!q.startsWith('Offene Module')&&!q.includes('13-Motiv-Auswahl')&&!q.includes('13 Kleinformatmotive')).map(q=>q.startsWith('Steuerkontext/')?'Steuerkontext/Mengenstaffeln und Start-/Designreferenzen der unveränderten Excel bleiben zu prüfen. Foto-/Logo-Auswahl wurde am 11.11.2026 ausdrücklich bestätigt und ist keine offene Nutzerentscheidung.':q.includes('13 Kleinformatmotive')?'Die bestätigte 13-Motiv-Auswahl ist als echtes natives Motivprofil gespeichert; automatische Platzierung rechts/links neben Text (Strich-Ausnahmen) muss noch im vorhandenen Kundenadapter geprüft/angeschlossen werden.':q.includes('vom nativen Konverter ausgeschlossen')?`${fitExcludedIds.length} Originaldesigns haben native Kontur-/Randfehler (family-report.json). ${hiddenIds.length} weitere Katalogdesigns sind bewusst hidden und bleiben ausgeblendet; keine Wiederfreigabe beantragt.`:q);
  const template=manager.groups.create(draft,{actor:'Astra #230 local planning; starts explicitly proposed'});
  const paired=planExistingTemplate({groups:manager.groups,templateId:template.id,templateRevision:template.revision,product:{key:label,targetKey:scope.sourceKeys[0],name:source.name},excel:workbook});
  const comparison=compareNativeVariants(workbook,paired.plan);if(comparison.differences.length)throw Error('Native Excel prices differ.');
  const output={...prior,source:{id:record.id,revision:saved.revision,sha256:digest(saved.document),status:saved.status,publishedRevision:saved.publishedRevision},registry:manager.overview().sources.find(s=>s.productId===record.id),template:{id:template.id,revision:template.revision,sha256:template.sha256},planId:paired.planId,planHash:paired.planHash,valid:paired.plan.valid,approvalReady:false,comparison,openQuestions:draft.openQuestions,profileSelections:saved.metadata.profiles,smallMotifProfile:small?{id:motifProfile.id,revision:motifProfile.revision,count:13}:null,nativeModules:nativeModuleAvailability(saved.document.config),designs:{...prior.designs,requestedUnique:new Set(list.filter(d=>small?d.produkt===`Kleinformat ${Number(workbook.variants[0].dimensions.widthMm)/10} × 2`:!d.produkt.startsWith('Kleinformat')).map(d=>d.id)).size,hiddenIds,fitExcludedIds,duplicatePolicy:'first occurrence after rank ascending; rank 0 retained'},previousPreparation:{sourceHash:prior.source.sha256,planId:prior.planId,planHash:prior.planHash},confirmations:0,executions:0,shopifyWrites:0};
  delete output.effectiveModuleProposal;
  output.effectiveModules=paired.plan.products[0].document.config.moduleProfile.modules;output.moduleProfilePins=paired.plan.moduleProfiles;output.uploadDecision=uploadDecision;
  write(path.join(dir,'source-document.json'),saved.document);write(path.join(dir,'plan.json'),paired.plan);write(path.join(dir,'pair.json'),output);
  fs.copyFileSync(path.join(previous,label,'family-report.json'),path.join(dir,'family-report.json'),fs.constants.COPYFILE_EXCL);
  results.push(output);console.log(JSON.stringify({workbook:workbook.name,planId:paired.planId,variants:comparison.actual,motifs:small?13:null}));
 }
}finally{manager.close();repository.close();profiles.close();previousDb.close();}
const db=new DatabaseSync(filename,{readOnly:true});
const counts={sourceRecords:db.prepare('SELECT COUNT(*) n FROM products WHERE tenant_id=?').get('gravuru').n,persistedPlans:db.prepare('SELECT COUNT(*) n FROM product_group_creation_plans WHERE tenant_id=?').get('gravuru').n,confirmations:db.prepare('SELECT COUNT(*) n FROM product_group_confirmations WHERE tenant_id=?').get('gravuru').n,executions:db.prepare('SELECT COUNT(*) n FROM product_group_creation_results WHERE tenant_id=?').get('gravuru').n};db.close();
write(path.join(out,'summary.json'),{schema:'gravuru-issue230-local-native-plan-batch/v1',catalogCommit:CATALOG_COMMIT,excelCommit:EXCEL_COMMIT,actualNativePlans:results.length,approvalReady:0,...counts,shopifyWrites:0,comparedVariants:results.reduce((n,r)=>n+r.comparison.actual,0),priceDifferences:results.reduce((n,r)=>n+r.comparison.differences.length,0),catalogList:{rows:list.length,uniqueIds:order.size,duplicates:list.filter((d,i)=>list.findIndex(x=>x.id===d.id)!==i)},results});
