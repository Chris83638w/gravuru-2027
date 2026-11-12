// Read/hash only: no native constructors, database, network or plan execution.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=path.resolve(import.meta.dirname,'../../..');
const received=path.join(root,'work/restabschluss/claude-75a304eb/ops/plesk/sechsgruppen-20261112/records');
const old=path.join(root,'work/product-plans-run-v9');
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
const json=v=>JSON.stringify(canon(v)),hash=v=>sha(json(v)),same=(a,b)=>json(a)===json(b);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),gz=f=>JSON.parse(gunzipSync(fs.readFileSync(f)));
const pins=read(path.join(received,'PINS.json')),k=read(path.join(received,'kompakt-serverwerte.json'));
const input=read(path.join(import.meta.dirname,'sg-eingaben.json'));
const mod=read(path.join(received,'module-profile.get-record.json')),mot=read(path.join(received,'motif-profile.get-record.json'));
const motifDocument={name:mot.name,type:mot.type,items:mot.items};
const hashes=[{kind:'moduleDocument',sha256:hash(mod.document)},{kind:'motifDocument',sha256:hash(motifDocument)}],rows=[];
const fileChecks=fs.readFileSync(path.join(received,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/).map(line=>{
 const m=line.match(/^([a-f0-9]{64})  (.+)$/);if(!m)throw Error('Malformed SHA row');
 const f=path.resolve(received,m[2]);if(!f.startsWith(received+path.sep))throw Error('Unsafe SHA path');
 const actual=sha(fs.readFileSync(f));return {file:m[2],expected:m[1],actual,match:actual===m[1]};
});
for(const pin of pins.zuordnung){
 const dir=path.join(received,pin.gruppe),v9=path.join(old,pin.gruppe),g=k.g.find(x=>x.o===pin.gruppe),e=input.gruppen.find(x=>x.ordner===pin.gruppe);
 const plan=gz(path.join(dir,'plan.json.gz')),source=gz(path.join(dir,'source-document.json.gz'));
 const metadata=read(path.join(dir,'source-metadata.json')).revisionMetadata,template=read(path.join(dir,'template.json'));
 const oldPlan=read(path.join(v9,'plan.json')),oldSource=read(path.join(v9,'source-document.json')),oldPair=read(path.join(v9,'pair.json')),oldTemplate=read(path.join(v9,'template.json'));
 const oldMetadata=read(path.join(v9,'source-metadata.json'));
 const {id,planHash,createdAt,...body}=plan,p=body.products[0],oldP=oldPlan.products[0];
 const nativeHash=hash(body),nativeBytes=Buffer.byteLength(json(body));
 const norm=d=>({...d,profileAssignments:{...d.profileAssignments,motifs:{...d.profileAssignments.motifs,profileId:null}},config:{...d.config,moduleProfile:{...d.config.moduleProfile,id:null}}});
 const sourceNormalized={...source,profileAssignments:{...source.profileAssignments,motifs:{...source.profileAssignments.motifs,profileId:oldSource.profileAssignments.motifs.profileId}}};
 const expectedMetadata={profiles:structuredClone(oldMetadata.profiles),productionProfile:null};expectedMetadata.profiles.sources.motifs.profileId=mot.id;
 const expectedTemplate=structuredClone(oldTemplate.document),t=expectedTemplate.targets[0];expectedTemplate.scope.subcategoryId=g.q.id;t.key=g.q.id;t.familyId=g.q.id;t.sizeKey=g.q.id;t.source={productId:g.q.id,revision:1};t.moduleProfile={id:mod.id,revision:1};
 const checks={
  planHash:nativeHash===planHash&&planHash===g.p.planHash&&planHash===pin.kopie.plan.planHash,
  planBytes:nativeBytes===g.p.dokumentBytes&&nativeBytes===pin.kopie.plan.dokumentBytes,
  planIdentity:id===g.p.id&&id===pin.kopie.plan.id&&createdAt===g.p.createdAt,
  planValid:body.valid===true&&body.issues.length===0&&body.products.length===1&&body.localOnly===true&&body.published===false&&body.shopifyWrites===0,
  noExecution:body.confirmationId==null&&p.existingProductId===null&&pins.confirm===0&&pins.execute===0&&k.confirm===0&&k.execute===0,
  creationKey:body.creationKey==='issue230-'+oldPair.excelSha256&&body.creationKey===pin.creationKey,
  originalExcel:pin.originalWorkbookSha256===oldPair.excelSha256&&pin.workbook===oldPair.workbook&&pin.sourceCommit===input.quelle.excelCommit,
  productKey:p.key===oldP.key&&p.key===pin.productKey&&body.requestedProducts[0].key===p.key,
  sourceIdentity:body.sources.length===1&&body.sources[0].productId===g.q.id&&body.sources[0].revision===1&&body.sources[0].sha256===hash(source)&&pin.kopie.quelle.sha256===hash(source),
  sourceOnlyMotifId:same(sourceNormalized,oldSource),
  templateIdentity:template.id===g.t.id&&template.revision===1&&body.templateId===template.id&&body.templateRevision===1&&hash(template.document)===template.sha256&&body.templateHash===template.sha256&&pin.kopie.vorlage.sha256===template.sha256,
  templateOnlyRegistryMapping:same(template.document,expectedTemplate),
  metadataNativeProjection:same(metadata,expectedMetadata)&&!Object.hasOwn(metadata,'businessDecisions'),
  compiledOnlyTwoIds:same(norm(p.document),norm(oldP.document)),
  fingerprint:hash(p.document)===p.fingerprint,
  offering:same(body.offering,{familyIds:[g.q.id],fingerprint:sha(JSON.stringify([g.q.id,1]))}),
  modulePin:body.moduleProfiles.length===1&&same(body.moduleProfiles[0],{id:mod.id,revision:1,sha256:mod.sha256})&&p.document.config.moduleProfile.id===mod.id,
  motifPin:p.document.profileAssignments.motifs.profileId===mot.id&&source.profileAssignments.motifs.profileId===mot.id&&metadata.profiles.sources.motifs.profileId===mot.id&&same(metadata.profiles.selections.motifs,mot.items),
  variants:same(p.variantReview,oldP.variantReview)&&p.variantReview.length===e.erwartet.variantReview&&p.combinationCount===e.erwartet.kombinationen,
  options:same(p.options,oldP.options)&&same(p.optionGroups,oldP.optionGroups)&&same(p.price,oldP.price),
  designs:p.document.config.profile.designs.length===27&&same(p.document.config.profile.designs,oldP.document.config.profile.designs),
  modulesUploads:same(p.document.config.moduleProfile.modules,input.modulprofil.modules)&&p.document.config.photo.enabled===false&&p.document.config.logo.enabled===false,
  startTheme:p.document.config.profile.defaultDesignId===e.erwartet.defaultDesignId&&p.document.config.profile.themeId===e.erwartet.themeId,
  motifs13:mot.items.length===13&&same(mot.items,input.motivprofil.items),
  minimumPrice:Math.min(...p.variantReview.map(v=>v.unitCents))===pin.preisAbCents
 };
 for(const [kind,value] of [['sourceDocument',hash(source)],['sourceMetadata',hash(metadata)],['template',hash(template.document)],['offering',body.offering.fingerprint],['compiledDocument',hash(p.document)],['fingerprint',p.fingerprint],['planHash',nativeHash]])hashes.push({group:pin.gruppe,kind,sha256:value});
 rows.push({group:pin.gruppe,checks,passed:Object.values(checks).every(Boolean),source:pin.kopie.quelle,template:pin.kopie.vorlage,plan:{id,planHash:nativeHash,bodyBytes:nativeBytes},variants:p.variantReview.length,minimumCents:pin.preisAbCents});
}
const aggregate=sha(hashes.map(x=>x.sha256).join('|'));
const pilotPath=path.join(root,'work/restabschluss/claude-75a304eb/ops/plesk/update-beobachtung-20261112/TESTBELEG-updatepilot.json');
const pilot=fs.readFileSync(pilotPath);
const globalChecks={fileManifest:fileChecks.length===27&&fileChecks.every(x=>x.match),
 compactFilePin:sha(fs.readFileSync(path.join(received,'kompakt-serverwerte.json')))===pins.herkunft.kompaktSha256,
 module:hash(mod.document)===mod.sha256&&mod.sha256===input.modulprofil.sha256&&mod.id===k.mod.id&&mod.revision===1&&same(mod.document,k.mod.dokument),
 motifCanonical:hash(motifDocument)===k.mot.dokumentKanonischSha256&&hash(motifDocument)===mot.documentKanonischSha256,
 motifNativeStored:sha(JSON.stringify(motifDocument))===input.motivprofil.documentSha256,
 context:pins.herkunft.tenant==='gravuru'&&k.tenant==='gravuru'&&pins.herkunft.register.quellenVorher===261&&pins.herkunft.register.vertrag===k.register.vertrag,
 aggregate44:hashes.length===44&&aggregate==='41b7c1e4abb59cfeebd1b6a0f9444e8421d331ad5570f020abe69c6bde7dfd37',
 groups6Variants45:rows.length===6&&rows.reduce((n,r)=>n+r.variants,0)===45,
 mainPilotBytes:pilot.length===5862&&sha(pilot)==='26bab5af2766026958c9d8793ea32a923268263d360c32b02ed0cefd8d80761b'};
const out={schema:'independent-six-groups-receipt-review/v1',commit:'75a304ebfa86ce3a5302c5940107a6e010be8322',scope:'Local read/hash review of reconstructed records; no native execution',
 provenance:{largeRecords:'Reconstructed from v9, not byteexported from server',receivedCompactBytes:fs.statSync(path.join(received,'kompakt-serverwerte.json')).size,originalServerCompactBytes:17662,originalServerCompactAvailable:false,rawSixGroupsTestbelegAvailable:false,serverAggregateSource:'operator issue 168 comment 6819660449',individualSourceMetadataServerHashesAvailable:false,completePlanHashesAvailable:true},
 passed:Object.values(globalChecks).every(Boolean)&&rows.every(r=>r.passed),globalChecks,rows,hashes,aggregateSha256:aggregate,fileChecks};
fs.writeFileSync(path.join(import.meta.dirname,'received-records-review.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:out.passed,globalChecks,failedGroups:rows.filter(r=>!r.passed).map(r=>({group:r.group,failed:Object.entries(r.checks).filter(([,v])=>!v).map(([k])=>k)})),aggregate,hashes:hashes.length}));
