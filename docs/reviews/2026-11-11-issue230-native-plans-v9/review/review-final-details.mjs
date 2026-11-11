import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const [runArg,catalogArg,codeArg,priorArg,outArg]=process.argv.slice(2);
if(![runArg,catalogArg,codeArg,priorArg,outArg].every(Boolean))throw Error('Usage: node review-final-details.mjs RUN CATALOG CODE FIRST_SOURCE_RUN NEW_REVIEW_JSON');
const root=path.resolve(runArg),catalog=path.resolve(catalogArg),codeRoot=path.resolve(codeArg),priorRoot=path.resolve(priorArg),output=path.resolve(outArg),pin='8236b8bfab7322447ec46661c116fa526331af3d';
const read=p=>JSON.parse(fs.readFileSync(p)),blob=p=>execFileSync('git',['-C',catalog,'show',pin+':'+p],{maxBuffer:64*1024*1024});
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const list=JSON.parse(blob('auftraege/2026-11-10-tuerschild-designs-namensschilder/designs.json')).designs,rank=new Map();
for(const d of list)rank.set(d.id,Math.min(rank.get(d.id)??Infinity,d.rang));
const motifs=JSON.parse(blob('motive/motive.json')).motifs,expected=motifs.filter(m=>m.file.startsWith('motive-kleine-schilder/')&&m.file!=='motive-kleine-schilder/schmetterlinge-1.svg').map(m=>m.key).sort();
const workbookData=JSON.parse(gunzipSync(fs.readFileSync(path.join(codeRoot,'docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz'))));
const profiledb=new DatabaseSync(path.join(root,'profiles.sqlite'),{readOnly:true}),db=new DatabaseSync(path.join(root,'workshop.sqlite'),{readOnly:true});
const summary=read(path.join(root,'summary.json'));
const rows=summary.results.map(p=>{
 const dir=path.join(root,p.workbook.replace(/\.xlsx$/,'')),source=read(path.join(dir,'source-document.json')),plan=read(path.join(dir,'plan.json')),bank=source.config.familyFormats.designs,byNative=new Map(bank.map(d=>[d.id,d.katalog.designId]));
 const monotone=ids=>ids.every((x,i)=>i===0||rank.get(ids[i-1])<=rank.get(x));
 const assignments=source.profileAssignments.motifs,profile=assignments.mode==='override'?profiledb.prepare('SELECT p.id,p.revision,r.document FROM profiles p JOIN profile_revisions r ON r.profile_id=p.id AND r.revision=p.revision AND r.tenant_id=p.tenant_id WHERE p.tenant_id=? AND p.id=?').get('gravuru',assignments.profileId):null;
 const record=db.prepare('SELECT metadata FROM product_revisions WHERE tenant_id=? AND product_id=? AND revision=?').get('gravuru',p.source.id,p.source.revision),metadata=JSON.parse(record.metadata);
 const prior=read(path.join(priorRoot,p.workbook.replace(/\.xlsx$/,''),'source-document.json'));
 const workbook=workbookData.workbooks.find(w=>w.name===p.workbook),variantMap=new Map(plan.products[0].variantReview.map(v=>[[v.form.id,v.widthMm,v.heightMm,v.options.color??'',v.options.mounting].join('|'),v.unitCents]));
 let priceMatches=0;const priceErrors=[];
 for(const e of workbook.analysisCombinations){const v=workbook.variants.find(v=>v.variantKey===e.variantKey),key=[v.form.split('/').at(-1).trim(),Number(v.dimensions.widthMm),Number(v.dimensions.heightMm),e.color??'',e.optionId].join('|'); if(variantMap.get(key)===e.totalCents)priceMatches++;else priceErrors.push({key,expected:e.totalCents,actual:variantMap.get(key)});}
 const checks={bankRank0Before1:monotone(bank.map(d=>d.katalog.designId)),allFormatRanks0Before1:source.config.familyFormats.formats.every(f=>f.variants.every(v=>monotone(v.designIds.map(id=>byNative.get(id))))),embeddedResourcesPreserved:digest(source.config.localResources.motifs)===digest(prior.config.localResources.motifs),noStation3CircularQuestion:!p.openQuestions.some(q=>q.startsWith('Station 3:')),profileMetadataReadback:digest(metadata.profiles)===digest(p.profileSelections),motifProfileExact:!p.smallMotifProfile||!!profile&&JSON.parse(profile.document).type==='motifs'&&JSON.stringify([...JSON.parse(profile.document).items].sort())===JSON.stringify(expected)&&profile.revision===p.smallMotifProfile.revision&&profile.id===p.smallMotifProfile.id,motifSelectionExact:!p.smallMotifProfile||JSON.stringify([...metadata.profiles.selections.motifs].sort())===JSON.stringify(expected),priceMatch:priceErrors.length===0&&priceMatches===plan.products[0].variantReview.length};
 return {workbook:p.workbook,checks,allPassed:Object.values(checks).every(Boolean),priceMatches,priceErrors,smallMotifCount:p.smallMotifProfile?expected.length:null,duplicatedD34Count:bank.filter(d=>d.katalog.designId==='TRE-V2A-7x2-D34').length,hiddenAbsent:['TQ-V2A-8x8-D14','TO-V2A-9x6-D38'].every(id=>!bank.some(d=>d.katalog.designId===id))};
});
profiledb.close();db.close();const result={readOnly:true,rows,allPassed:rows.every(r=>r.allPassed),comparedPrices:rows.reduce((n,r)=>n+r.priceMatches,0),profileBindingLimit:'Document assignment contains profileId, revision evidence is separate and must be rechecked before any later execution.'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));

