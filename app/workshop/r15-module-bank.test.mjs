import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateProductDocument} from './product-model.mjs';
import {variantCombinations,selectedProfile,quote,vectorLogoAllowed} from '../configurator/variant-m/contract.mjs';
import {MODULE_PROFILE_SCHEMA,applyModuleProfile} from '../configurator/variant-m/module-profile.mjs';

const filename=process.env.GRAVURU_REAL_STEEL_DOCUMENT;
test('exact approved r4 bank: both logo profiles preserve 251 originals, 80 sizes and all 404 native prices', {skip:!filename},()=>{
 const bytes=fs.readFileSync(filename),sha=createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha,'2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0');
 const original=JSON.parse(bytes),before=JSON.stringify(original),source=validateProductDocument(original).config;
 assert.equal(source.familyFormats.designs.length,251);
 assert.equal(source.familyFormats.formats.length,80);
 assert.equal(new Set(source.familyFormats.formats.map(f=>f.form)).size,8);
 assert.equal(source.profile.defaultDesignId,'katalog-TAE-V2A-8x5-D1');
 const combinations=variantCombinations(source);assert.equal(combinations.length,404);
 for(const logo of [true,false]){
  const moduleProfile={schema:MODULE_PROFILE_SCHEMA,id:logo?'steel-with-logo':'steel-without-logo',revision:1,
   modules:{options:true,designs:true,text:true,motifs:true,photo:false,logo,colors:false}};
  const candidate=validateProductDocument({...structuredClone(original),config:applyModuleProfile(source,moduleProfile)}).config;
  assert.deepEqual(candidate.familyFormats,source.familyFormats);
  assert.deepEqual(candidate.profile,source.profile);
  assert.deepEqual(candidate.localResources,source.localResources);
  assert.equal(vectorLogoAllowed(candidate),logo);assert.equal(candidate.logo.extraPriceCents,1299);
  assert.equal(candidate.photo.enabled,false);assert.deepEqual(variantCombinations(candidate),combinations);
  for(const options of combinations){
   const expected=selectedProfile(source,options),actual=selectedProfile(candidate,options);
   assert.deepEqual(actual.geometry,expected.geometry);
   assert.deepEqual(actual.designs,expected.designs);
   assert.deepEqual(quote(candidate,[],actual.defaultDesignId,options),quote(source,[],expected.defaultDesignId,options));
  }
 }
 assert.equal(JSON.stringify(original),before,'No source artwork/product mutation');
 assert.equal(createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),sha);
});
