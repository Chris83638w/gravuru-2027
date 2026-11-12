// Read-only reference extraction from the frozen, independently checked v9 run.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const hash=x=>sha(JSON.stringify(canonical(x)));
const normalized=d=>{d=structuredClone(d);d.profileAssignments.motifs.profileId=null;if(d.config.moduleProfile)d.config.moduleProfile.id=null;return d;};
const root=path.resolve(process.argv[2]??'.'),output=process.argv[3];
if(!output)throw Error('Usage: node reference.mjs WORKSPACE NEW_REFERENCE_JSON');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const manifestPath='outputs/Produktplaene-230-v9/Excel-Nachtraege/Manifest.json';
const manifest=await read(manifestPath),rows=manifest.records.filter(r=>!r.main),records=[];
if(rows.length!==6)throw Error('Exactly six existing small-workbook records required');
for(const r of rows){
 const stem=r.original.replace(/\.xlsx$/,''),dir='work/product-plans-run-v9/'+stem;
 const plan=await read(dir+'/plan.json'),source=await read(dir+'/source-document.json'),pair=await read(dir+'/pair.json'),p=plan.products[0];
 const original='work/product-plans-run-v8/excel/'+r.original,previous='outputs/Produktplaene-230-v9/Excel-Nachtraege/'+r.output;
 if(sha(await fs.readFile(path.join(root,original)))!==r.originalSha256||sha(await fs.readFile(path.join(root,previous)))!==r.xlsxSha256)throw Error('Frozen workbook differs');
 if(plan.planHash!==r.planHash||plan.id!==r.planId||pair.excelSha256!==r.originalSha256)throw Error('Frozen plan differs');
 const version=Number(r.output.match(/_v(\d+)\.xlsx$/)[1])+1;
 records.push({key:stem,original,originalSha256:r.originalSha256,previous,previousSha256:r.xlsxSha256,output:r.output.replace(/_v\d+\.xlsx$/,`_v${version}.xlsx`),
  v9PlanId:plan.id,v9PlanHash:plan.planHash,creationKey:plan.creationKey,importKey:p.importKey,name:p.name,variantReview:p.variantReview,
  geometry:p.geometry,material:p.material,optionGroups:p.optionGroups,optionFields:p.optionFields,price:p.price,options:p.options,
  sourceNormalizedSha256:hash(normalized(source)),compiledNormalizedSha256:hash(normalized(p.document)),
  moduleDocument:{name:p.moduleProfile.name,modules:p.moduleProfile.modules},moduleSha256:p.moduleProfile.sha256,
  motifProfile:source.profileAssignments.motifs,defaultDesignId:source.config.profile.defaultDesignId,defaultSize:source.config.familyFormats.defaultSize,
  designs:source.config.profile.designs.map(d=>d.id),quantityTiers:source.config.quantityTiers,quantityTierScope:source.config.quantityTierScope,
  files:Object.fromEntries(await Promise.all(['plan.json','source-document.json','pair.json'].map(async f=>[f,{path:dir+'/'+f,sha256:sha(await fs.readFile(path.join(root,dir,f)))}])))
 });
}
const motif=await read('work/product-plans-run-v9/motif-profile-pins.json');
const result={schema:'gravuru-six-plan-excel-reference/v1',source:'frozen-v9-local-provenance-only',manifestSha256:sha(await fs.readFile(path.join(root,manifestPath))),
 motifDocument:motif.profiles[0].document,motifStoredDocumentSha256:motif.profiles[0].documentSha256,records};
await fs.writeFile(path.resolve(output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({referenceWritten:true,groups:6,variantRows:records.reduce((n,r)=>n+r.variantReview.length,0),xlsxWritten:false}));
