import test from 'node:test';
import assert from 'node:assert/strict';
import {mapProductionGallerySources} from './gallery-production-source-map.mjs';
const original='ORIGINAL-1',family='steel-door-signs',size='SIZE-1',sha='1'.repeat(64),manifest='2'.repeat(64),imports='3'.repeat(64);
function fixture(){return {role:'prepared',expectedManifestSha256:manifest,expectedImportsSha256:imports,
 provenance:{designs:[{originalId:original,nativeDesignId:'real-target-design-id',originalSha256:sha,approval:{familie:family},compatibleSizes:[size]}]},
 metadata:{schema:'gravuru-module-gallery-source-metadata/v1',readOnly:true,manifestSha256:manifest,importsSha256:imports,requestedOriginalIds:[original],
 originals:[{id:original,files:[{name:'design.json',sha256:sha}],targets:[{status:'prepared',productKey:`${family}:${size}`,nativeDesignId:'actual-native-id',sizeKey:size,mm:[90,60]}]}],
 products:[{key:`${family}:${size}`,designIds:[original]}],imports:[{key:`${family}:${size}`,productId:'cfg_00000000-0000-4000-8000-000000000001',revision:1,designIds:[original],reviewOnly:true,documentHash:'4'.repeat(64)}]}};}
test('maps actual IDs only and distinguishes a source card from native approval',()=>{
 const f=fixture(),result=mapProductionGallerySources(f),native=result.originals[0].nativeTargets[0];assert.equal(native.source.designId,'actual-native-id');assert.equal(native.approval,'not_read');assert.equal(result.designSyncEnabled,false);assert.equal(result.sourceActivated,false);
});
test('missing native ID does not fall back to default or catalogue prefix',()=>{
 const f=fixture();delete f.metadata.originals[0].targets[0].nativeDesignId;f.metadata.imports[0].defaultDesignId='katalog-'+original;const result=mapProductionGallerySources(f);assert.equal(result.counts.cardsMatched,1);assert.equal(result.counts.withNativeTargets,0);assert.deepEqual(result.openOriginalIds,[original]);
});
test('changed original, unprepared target and foreign family stay open without rewriting anything',()=>{
 for(const change of [f=>f.metadata.originals[0].files[0].sha256='5'.repeat(64),f=>f.metadata.originals[0].targets[0].status='blocked',f=>f.metadata.originals[0].targets[0].familyId='acrylic']){
  const f=fixture();change(f);const before=JSON.stringify(f);assert.equal(mapProductionGallerySources(f).counts.withNativeTargets,0);assert.equal(JSON.stringify(f),before);
 }
});
test('source hashes and requested allowlist cannot be switched silently',()=>{
 const f=fixture();f.metadata.manifestSha256='6'.repeat(64);assert.throws(()=>mapProductionGallerySources(f),{code:'gallery_source_pin'});f.metadata.manifestSha256=manifest;f.metadata.requestedOriginalIds=['other'];assert.throws(()=>mapProductionGallerySources(f),{code:'gallery_source_allowlist'});
});
