// Local persisted source preparation for #230. No network, confirmations,
// execution, bindings, shop writes, or changes to source workbooks/catalogue.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {planFamilyFormats} from '../app/workshop/katalog-family-formats.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createConfiguratorModuleManagement} from '../app/workshop/configurator-module-http.mjs';
import {nativeModuleAvailability} from '../app/configurator/variant-m/module-profile.mjs';
import {planExistingTemplate,INPUT_SHA,EXCEL_COMMIT,CATALOG_COMMIT,sha} from './issue230-product-plan-audit.mjs';

const copy=structuredClone;
const git=(root,...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:64*1024*1024});
const blob=(root,pin,file)=>git(root,'show',`${pin}:${file}`);
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const save=(root,name,value)=>{const f=path.join(root,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>sha(JSON.stringify(canonical(v)));
const form=v=>v.form.split('/').at(-1).trim();
const match=(s,v)=>s.groupKey===form(v)&&s.widthMm===Number(v.dimensions.widthMm)&&s.heightMm===Number(v.dimensions.heightMm);

export function compareNativeVariants(workbook,plan){
 const rows=plan.products[0]?.variantReview||[],differences=[];
 for(const expected of workbook.analysisCombinations){
  const v=workbook.variants.find(v=>v.variantKey===expected.variantKey);
  const found=rows.filter(r=>r.widthMm===Number(v.dimensions.widthMm)&&r.heightMm===Number(v.dimensions.heightMm)&&r.form?.id===form(v)&&r.options.mounting===expected.optionId&&(!expected.color||r.options.color===expected.color));
  if(found.length!==1)differences.push({code:'variant_cardinality',expected,found:found.length});
  else if(found[0].unitCents!==expected.totalCents)differences.push({code:'price',expected,actual:found[0].unitCents});
 }
 if(rows.length!==workbook.analysisCombinations.length)differences.push({code:'variant_count',expected:workbook.analysisCombinations.length,actual:rows.length});
 return {compared:workbook.analysisCombinations.length,actual:rows.length,differences};
}

export async function run({catalogRoot,codeRoot,outputRoot,only=null}){
 if(fs.existsSync(outputRoot))throw Error('New output directory required.');
 if(git(catalogRoot,'rev-parse','HEAD').toString().trim()!==CATALOG_COMMIT)throw Error('Catalogue HEAD must equal pinned source.');
 git(catalogRoot,'diff','--quiet');git(catalogRoot,'diff','--cached','--quiet');
 if(git(catalogRoot,'ls-files','--others','--exclude-standard','familien','linien','designs','schriften','motive','themen.json').toString().trim())throw Error('Untracked catalogue input files.');
 const inputBytes=gunzipSync(fs.readFileSync(path.join(codeRoot,'docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz')));
 if(sha(inputBytes)!==INPUT_SHA)throw Error('Workbook extraction changed.');
 const input=JSON.parse(inputBytes),designList=JSON.parse(blob(catalogRoot,CATALOG_COMMIT,'auftraege/2026-11-10-tuerschild-designs-namensschilder/designs.json'));
 for(const w of input.workbooks)if(sha(blob(codeRoot,EXCEL_COMMIT,w.workbookPath))!==w.workbookSha256)throw Error('Workbook source changed: '+w.name);
 fs.mkdirSync(outputRoot,{recursive:true});
 const catalog=openKatalog(catalogRoot),results=[],filename=path.join(outputRoot,'workshop.sqlite');
 const repository=createProductRepository({filename,tenantId:'gravuru',validateDocument:validateProductDocument});
 let management;
 try{
  management=createConfiguratorModuleManagement({filename,repository,tenantId:'gravuru'});
  for(const workbook of input.workbooks.filter(w=>!only||w.name.includes(only))){
   const label=workbook.name.replace(/\.xlsx$/,''),small=workbook.counts.sizeRows===1,acrylic=workbook.name.includes('Acrylglas'),lineId=acrylic?'acryl-tuerschilder':'edelstahl-tuerschilder',subId='familienschilder';
   console.log(JSON.stringify({stage:'source',workbook:workbook.name}));
   try{
    const line=copy(catalog.lines.get(lineId));if(!line)throw Error('Catalogue line missing: '+lineId);
    const familyIds=line.families.filter(id=>acrylic?id.startsWith('acryl-3mm-tuerschilder-'):id==='steel-door-signs');
    const families=new Map(catalog.families),priceOverrides=[];
    for(const familyId of familyIds){
     const f=copy(catalog.families.get(familyId));
     const selectedSizes=f.sizes.filter(s=>workbook.variants.some(v=>match(s,v)));
     if(selectedSizes.length!==workbook.variants.length)throw Error('Exact workbook sizes not found.');
     if(!small)f.sizes=selectedSizes;
     for(const m of f.mountingRules){
      const values=[...new Set(workbook.analysisCombinations.filter(x=>x.optionId===m.skuSuffix).map(x=>x.surchargeCents))];
      if(values.length>1)throw Error('Per-size surcharge needs existing native adapter.');
      if(values.length===1&&m.priceCents!==values[0]){priceOverrides.push({familyId,rule:m.id,skuSuffix:m.skuSuffix,before:m.priceCents,after:values[0],source:'Confirmed Excel and Issue 230 comment 6766806272'});m.priceCents=values[0];}
     }
     families.set(familyId,f);
    }
    const smallLabel=small?`Kleinformat ${Number(workbook.variants[0].dimensions.widthMm)/10} × 2`:null;
    const selectedRows=designList.designs.filter(d=>small?d.produkt===smallLabel:!d.produkt.startsWith('Kleinformat')).sort((a,b)=>a.rang-b.rang);
    const allowed=new Set(selectedRows.map(d=>d.id)),masters=catalog.designs.masters.filter(d=>allowed.has(d.id));
    if(masters.length!==allowed.size)throw Error('Design source missing from pinned catalogue.');
    const first=small?selectedRows.find(d=>d.rang===0):selectedRows.find(d=>d.id==='TAE-V2A-8x5-D1');
    if(!first)throw Error('No real proposed starter.');
    const sourceFamily=families.get(familyIds[0]),startSize=small?sourceFamily.sizes.find(s=>match(s,workbook.variants[0])):sourceFamily.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
    const view={...catalog,families,lines:new Map(catalog.lines),designs:{...catalog.designs,masters}};
    view.lines.set(lineId,line);
    const cut={sizeKey:startSize.key,themeId:line.subcategories.find(s=>s.id===subId).themeId,defaultDesignId:first.id,...(!small?{groessenWahl:'alle'}:{})};
    const source=await planFamilyFormats(view,lineId,subId,{converter:convertFont,shopProduct:cut});
    save(outputRoot,label+'/family-report.json',source.report);
    if(!source.config)throw Error('Native family source failed: '+JSON.stringify(source.report.blocked));
    const config=source.config,rank=new Map();
    for(const d of selectedRows)if(!rank.has(d.id))rank.set(d.id,rank.size);
    config.familyFormats.designs.sort((a,b)=>rank.get(a.katalog.designId)-rank.get(b.katalog.designId));
    for(const f of config.familyFormats.formats)for(const v of f.variants)v.designIds.sort((a,b)=>rank.get(config.familyFormats.designs.find(d=>d.id===a)?.katalog.designId)-rank.get(config.familyFormats.designs.find(d=>d.id===b)?.katalog.designId));
    // Data projection of already confirmed price decisions; no source JSON edits.
    config.extraMotifCents=169;
    if(acrylic&&!small)config.photo={...config.photo,enabled:true,includedCount:0,extraPriceCents:999};
    const document=makeProductDocument(config,{name:workbook.sourceReferences.name.value});
    save(outputRoot,label+'/source-document.json',document);
    const record=repository.create(document),readback=repository.get(record.id);
    if(digest(document)!==digest(readback.document))throw Error('Persisted source differs.');
    const overview=management.overview(),scope=overview.scopes.find(s=>s.subcategoryId===record.id);
    const draft=management.groups.draft({name:label,scope:{lineId:scope.lineId,subcategoryId:scope.subcategoryId},sourceKeys:scope.sourceKeys});
    const actualDesigns=config.familyFormats.designs.map(d=>d.katalog.designId),missingDesigns=selectedRows.filter(d=>!actualDesigns.includes(d.id)).map(d=>d.id);
    draft.openQuestions=[
     `Startdesign ${first.id} / ${startSize.label}${acrylic?' / Schwarz':''} ist ein technisch geprüfter Vorschlag, keine neue Nutzerentscheidung.`,
     'Offene Module gemäß unveränderter Excel: '+workbook.modules.filter(m=>m.confirmation!=='bestätigt').map(m=>m.key+'='+m.requested).join(', ')+'. Modulprofil noch nicht bestätigt.',
     'Steuerkontext/Mengenstaffeln und Freigaben der unveränderten Excel sind vollständig offen zu prüfen; keine zusätzliche Entscheidung abgeleitet.',
     ...(small?['Die 13 Kleinformatmotive ohne schmetterlinge-1 sind belegt; Auswahl-/Platzierungsregel noch nicht in dieser nativen Quellkonfiguration angeschlossen.']:[]),
     ...(missingDesigns.length?[`${missingDesigns.length} der ${selectedRows.length} beauftragten Designs vom nativen Konverter ausgeschlossen; family-report.json nennt Gründe. Keine Vollständigkeit behauptet.`]:[])
    ];
    const template=management.groups.create(draft,{actor:'Astra local source preparation #230'});
    const paired=planExistingTemplate({groups:management.groups,templateId:template.id,templateRevision:template.revision,product:{key:label,targetKey:scope.sourceKeys[0],name:document.name},excel:workbook});
    const comparison=compareNativeVariants(workbook,paired.plan);
    const result={workbook:workbook.name,excelSha256:workbook.workbookSha256,catalogCommit:CATALOG_COMMIT,source:{id:record.id,revision:readback.revision,sha256:digest(readback.document),status:readback.status,publishedRevision:readback.publishedRevision},registry:overview.sources.find(s=>s.productId===record.id),template:{id:template.id,revision:template.revision,sha256:template.sha256},planId:paired.planId,planHash:paired.planHash,valid:paired.plan.valid,approvalReady:false,proposedStart:cut,priceOverrides,comparison,designs:{requested:selectedRows.length,native:actualDesigns.length,missing:missingDesigns},nativeModules:nativeModuleAvailability(config),requestedModules:workbook.modules.map(m=>({key:m.key,requested:m.requested,confirmation:m.confirmation})),openQuestions:draft.openQuestions,confirmations:0,executions:0,shopifyWrites:0};
    save(outputRoot,label+'/plan.json',paired.plan);save(outputRoot,label+'/pair.json',result);results.push(result);
    console.log(JSON.stringify({stage:'planned',workbook:workbook.name,planId:paired.planId,valid:paired.plan.valid,variants:comparison.actual,differences:comparison.differences.length,designs:actualDesigns.length,missingDesigns:missingDesigns.length}));
   }catch(e){const failed={workbook:workbook.name,status:'blocked-before-plan',error:e.stack};save(outputRoot,label+'/failure.json',failed);results.push(failed);console.log(JSON.stringify({stage:'failed',workbook:workbook.name,error:e.message}));}
  }
 }finally{management?.close();repository.close();}
 const db=new DatabaseSync(filename,{readOnly:true});
 const counts={sourceRecords:db.prepare('SELECT COUNT(*) n FROM products WHERE tenant_id=?').get('gravuru').n,persistedPlans:db.prepare('SELECT COUNT(*) n FROM product_group_creation_plans WHERE tenant_id=?').get('gravuru').n,confirmations:db.prepare('SELECT COUNT(*) n FROM product_group_confirmations WHERE tenant_id=?').get('gravuru').n,executions:db.prepare('SELECT COUNT(*) n FROM product_group_creation_results WHERE tenant_id=?').get('gravuru').n};
 db.close();
 const summary={schema:'gravuru-issue230-local-native-plan-batch/v1',sourceCode:git(codeRoot,'rev-parse','HEAD').toString().trim(),catalogCommit:CATALOG_COMMIT,excelCommit:EXCEL_COMMIT,actualNativePlans:results.filter(r=>r.planId).length,approvalReady:0,...counts,shopifyWrites:0,results};
 save(outputRoot,'summary.json',summary);return summary;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const [catalogRoot,outputRoot,only]=process.argv.slice(2);if(!catalogRoot||!outputRoot)throw Error('Usage: node script CATALOG NEW_OUTPUT [workbook substring]');
 await run({catalogRoot:path.resolve(catalogRoot),codeRoot:path.resolve('.'),outputRoot:path.resolve(outputRoot),only});
}
