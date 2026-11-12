// Read-only data/hash review. No application imports, database access or plan execution.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const here=import.meta.dirname,root=path.resolve(here,'../../..');
const input=JSON.parse(fs.readFileSync(path.join(here,'sg-eingaben.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const hash=v=>sha(JSON.stringify(canon(v)));
const same=(a,b)=>hash(a)===hash(b);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const transport=path.join(root,'work/restabschluss/v9-plan-transport');
const code=path.join(root,'work/issue230-integration-candidate');
const source=fs.readFileSync(path.join(here,'sg-plaene.mjs'),'utf8');
const sourcePins=[...source.matchAll(/'((?:app|scripts)\/[^']+)':'([a-f0-9]{64})'/g)].map(([,file,expected])=>({file,expected,actual:sha(fs.readFileSync(path.join(code,file)))}));
const motif=read(path.join(root,'work/product-plans-run-v9/motif-profile-pins.json'));
const rows=[];let expectedOffset=0;
for(const g of input.gruppen){
 const dir=path.join(root,'work/product-plans-run-v9',g.ordner);
 const pair=read(path.join(dir,'pair.json')),template=read(path.join(dir,'template.json')),plan=read(path.join(dir,'plan.json'));
 const p=plan.products[0],d=p.document,cfg=d.config,prof=cfg.profile,t=template.document.targets[0];
 const sourceBytes=fs.readFileSync(path.join(dir,'source-document.json'));
 const sourceDoc=JSON.parse(sourceBytes),transportGzip=fs.readFileSync(path.join(transport,g.ordner,'source-document.json.gz'));
 const normalized={...d,profileAssignments:{...d.profileAssignments,motifs:{...d.profileAssignments.motifs,profileId:null}},config:{...cfg,moduleProfile:{...cfg.moduleProfile,id:null}}};
 const checks={
  pairSource:same(g.v9.quelle,pair.source),pairTemplate:same(g.v9.vorlage,pair.template),
  planId:g.v9.planId===plan.id&&plan.id===pair.planId,planHash:g.v9.planHash===plan.planHash&&plan.planHash===pair.planHash,
  excel:g.workbook===pair.workbook&&g.excelSha256===pair.excelSha256,
  productKey:g.produkt.key===plan.requestedProducts[0].key,productName:g.produkt.name===plan.requestedProducts[0].name,
  sourceNativeHash:hash(sourceDoc)===g.dokument.kanonischSha256&&hash(sourceDoc)===pair.source.sha256,
  sourceTransport:sha(transportGzip)===g.dokument.gzSha256&&sha(gunzipSync(transportGzip))===g.dokument.sha256,
  sourceTransportLength:gunzipSync(transportGzip).length===g.dokument.bytes,sourceContent:same(sourceDoc,JSON.parse(gunzipSync(transportGzip))),
  offset:g.dokument.offset===expectedOffset,
  combinations:p.combinationCount===g.erwartet.kombinationen,variantReview:hash(p.variantReview)===g.erwartet.variantReviewSha256&&p.variantReview.length===g.erwartet.variantReview,
  options:same(p.options,g.erwartet.optionen),price:same(p.price,g.erwartet.preis),optionGroups:hash(p.optionGroups)===g.erwartet.optionGroupsSha256,
  templateTarget:hash({material:t.material,optionGroups:t.optionGroups,optionFields:t.optionFields})===g.erwartet.zielInhaltSha256,
  designIds:hash(prof.designs.map(x=>x.id))===g.erwartet.designIdsSha256,designCount:prof.designs.length===27&&g.erwartet.designs===27,
  start:prof.defaultDesignId===g.erwartet.defaultDesignId,theme:prof.themeId===g.erwartet.themeId,
  modules:same(cfg.moduleProfile.modules,g.erwartet.module)&&same(cfg.moduleProfile.modules,input.modulprofil.modules),uploads:cfg.photo.enabled===false&&cfg.logo.enabled===false,
  compiledOnlyTwoIdsNormalized:hash(normalized)===g.erwartet.kompiliertOhneKennungenSha256,fingerprint:p.fingerprint===g.erwartet.fingerprint,
  creationKey:plan.creationKey===g.erwartet.creationKey&&plan.creationKey==='issue230-'+pair.excelSha256,
  motives:same(pair.profileSelections.selections.motifs,input.motivprofil.items)&&input.motivprofil.items.length===13,
  modulePin:pair.moduleProfilePins.length===1&&pair.moduleProfilePins[0].sha256===input.modulprofil.sha256
 };
 expectedOffset+=g.dokument.bytes;
 rows.push({group:g.ordner,checks,allPassed:Object.values(checks).every(Boolean),variants:p.variantReview.length,designs:prof.designs.length,sourceCanonicalSha256:hash(sourceDoc),normalizedCompiledSha256:hash(normalized)});
}
const result={scope:'read-only existing v9 files and received expectation input; no application execution or actual operator outputs',
 inputSha256:sha(fs.readFileSync(path.join(here,'sg-eingaben.json'))),runnerSha256:sha(Buffer.from(source)),
 transportManifestMatches:sha(fs.readFileSync(path.join(transport,'manifest.json')))===input.quelle.manifestSha256,
 sourcePins:sourcePins.map(p=>({...p,match:p.expected===p.actual})),
 moduleDocumentHashMatches:hash({name:input.modulprofil.name,modules:input.modulprofil.modules})===input.modulprofil.sha256,
 // Native motif pin is the stored JSON byte hash, not product-group canonicalization.
 motifDocumentHashMatches:sha(JSON.stringify({name:input.motivprofil.name,type:input.motivprofil.type,items:input.motivprofil.items}))===input.motivprofil.documentSha256&&same(motif.profiles[0].document,{name:input.motivprofil.name,type:input.motivprofil.type,items:input.motivprofil.items}),
 motifStoredDocumentSha256:sha(JSON.stringify({name:input.motivprofil.name,type:input.motivprofil.type,items:input.motivprofil.items})),
 motifCanonicalSha256:hash({name:input.motivprofil.name,type:input.motivprofil.type,items:input.motivprofil.items}),
 motifPinsFileMatches:sha(fs.readFileSync(path.join(root,'work/product-plans-run-v9/motif-profile-pins.json')))===input.motivprofil.pinsDateiSha256,
 totalBytesMatches:expectedOffset===input.dokumente.bytes,rows,variants:rows.reduce((n,r)=>n+r.variants,0),
 actualOperatorRawResultAvailable:false,actualOperatorCompiledDocumentsAvailable:false};
result.allInputChecksPassed=result.transportManifestMatches&&sourcePins.length===14&&sourcePins.every(p=>p.actual===p.expected)&&result.moduleDocumentHashMatches&&result.motifDocumentHashMatches&&result.motifPinsFileMatches&&result.totalBytesMatches&&rows.length===6&&rows.every(r=>r.allPassed);
fs.writeFileSync(path.join(here,'input-v9-review-final.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({allInputChecksPassed:result.allInputChecksPassed,groups:rows.length,variants:result.variants,sourcePins:sourcePins.length,failures:rows.map(r=>({group:r.group,failed:Object.keys(r.checks).filter(k=>!r.checks[k])})).filter(r=>r.failed.length)}));
