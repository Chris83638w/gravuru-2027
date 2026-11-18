// Isolated, reproducible before/after comparison. No production DB or network.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {createGallerySyncTestFixture, GALLERY_SYNC_TEST_SHOP as shopDomain} from '../../app/workshop/gallery-shop-sync-test-fixture.mjs';
import {createFontGroupConnection} from '../../app/workshop/font-group-connection.mjs';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'font-connection-measure-'));
const f=await createGallerySyncTestFixture({directory,historicalMetadata:{},activationOptions:{approvalMode:'preserve'}});
try{
 const w=f.targetWorkshop,fonts=['Allura','Montserrat'],profile=w.profiles.syncCatalogFontSet('synthetic-fonts',fonts);
 const service=createFontGroupConnection({workshop:w,tenantId:'gravuru',shopDomain,activation:f.activation,transport:f.transport,executionEnabled:true,
  targets:[{id:'synthetic',setId:'synthetic-fonts',reviewedRevision:1,mapping:f.mapping}],approvedSets:[{id:'synthetic-fonts',fonts}],
  catalogFontSets:{list:()=>({sets:[{id:'synthetic-fonts',fonts,synchronized:true,profile}]})}});
 const snapshot=()=>{
  const record=w.repository.get(f.target.id),binding=f.activation.capture(f.mapping),model=w.model(record.id,record.revision).universal;
  const svg=w.editorPreview(record.document,f.mapping.target.designId).svg;
  return {revision:record.revision,boundRevision:binding.boundRevision,approved:binding.approved,variants:binding.heads.length,
   fonts:model.workshopProfiles.selections.fonts,otherSelections:Object.fromEntries(['motifs','colors','bestsellers'].map(k=>[k,model.workshopProfiles.selections[k]])),
   documentConfigSha256:syncHash(record.document.config),svgSha256:syncHash(Buffer.from(svg)),
   bindingCommercialSha256:syncHash(binding.heads.map(h=>({id:h.shopifyVariantId,options:h.options,cents:h.unitCents,personalization:h.personalization}))),
   modelResourceFontCount:Object.keys(model.localResources.fonts).length,storedDocumentBytes:Buffer.byteLength(JSON.stringify(record.document))};
 };
 const before=snapshot(),start=performance.now(),plan=await service.plan({targetId:'synthetic'}),planned=performance.now();
 await service.execute(plan);const completed=performance.now(),after=snapshot();
 for(const key of ['documentConfigSha256','svgSha256','bindingCommercialSha256','otherSelections','variants','approved'])assert.deepEqual(after[key],before[key],key);
 const report={at:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch},
  profile:'Same isolated native steel sign, same design, all existing variants, synthetic two-font set; old metadata {}.',
  before,after,planMs:Math.round((planned-start)*10)/10,executeMs:Math.round((completed-planned)*10)/10,shopifyWrites:f.transport.writes.length,
  limits:['One local synthetic sample, not a mobile/network/customer-cart speed measurement.','Synthetic fonts test connection mechanics, not completeness of Chris’s real 29-font catalogue.','RSS/production capacity and the original performance task are not resolved by this comparison.']};
 const output=process.argv[2];if(!output)throw Error('Explicit report path required');fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({beforeRevision:before.boundRevision,afterRevision:after.boundRevision,variants:after.variants,unchangedSvg:true,unchangedPrices:true,planMs:report.planMs,executeMs:report.executeMs,shopifyWrites:report.shopifyWrites}));
}finally{f.close();assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));assert.ok(path.basename(directory).startsWith('font-connection-measure-'));fs.rmSync(directory,{recursive:true,force:true});}
