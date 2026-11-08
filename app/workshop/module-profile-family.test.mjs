import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planFamilyFormats,blankDesignId} from './katalog-family-formats.mjs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {createConfiguratorModuleProfiles} from './configurator-module-profiles.mjs';
import {createProductGroupTemplates} from './product-group-templates.mjs';
import {variantCombinations,selectedProfile,quote,vectorLogoAllowed} from '../configurator/variant-m/contract.mjs';
import {MODULE_PROFILE_SCHEMA,applyModuleProfile,moduleEnabled} from '../configurator/variant-m/module-profile.mjs';

// Actual checked-in catalogue geometry, prices and fastening restrictions.
// Artwork is deliberately the existing blank-sign test generator, not a claim
// that the customer catalogue's original designs have received visual approval.
const family=JSON.parse(fs.readFileSync(new URL('../../scripts/fixtures/steel-shopify-options/family.json',import.meta.url)));
const fonts=JSON.parse(fs.readFileSync(new URL('../designs/aosu-labrador/assets/michroma-vectors.json',import.meta.url)));
const modules=logo=>({options:true,designs:true,text:true,motifs:true,photo:false,logo,colors:false});
let fixturePromise;
function fixture(){
 return fixturePromise??=Promise.resolve().then(async()=>{
  const selected=family.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
  const katalog={families:new Map([[family.id,structuredClone(family)]]),lines:new Map([['module-proof',{id:'module-proof',name:'Isolierte Modulprüfung',families:[family.id],subcategories:[{id:'normal',name:'Edelstahl-Türschilder',themeId:'familie'}]}]]),designs:{masters:[]},theme:()=>null,
   fontResources:async ids=>({fonts:Object.fromEntries(ids.map(id=>[id,fonts[id]])),missing:ids.filter(id=>!fonts[id])})};
  const {config,report}=await planFamilyFormats(katalog,'module-proof','normal',{shopProduct:{sizeKey:selected.key,themeId:'familie',defaultDesignId:blankDesignId(selected),groessenWahl:'alle',vorlagen:'leer'}});
  assert.ok(config);assert.deepEqual(report.blocked,[]);assert.equal(report.shopify.plannedVariants,404);assert.equal(report.shopify.variantIdsCreated,0);
  // The blank generator has no catalogue artwork file (`katalog.source` is
  // undefined in memory). Use its JSON transport representation, as imported.
  return makeProductDocument(JSON.parse(JSON.stringify(config)),{name:'Edelstahl · alle bestätigten Formen · lokale Prüfung'});
 });
}

function assertFamilyPreserved(actual,original){
 assert.deepEqual(actual.familyFormats,original.familyFormats);
 assert.deepEqual(actual.profile,original.profile);
 assert.deepEqual(actual.localResources,original.localResources);
 assert.equal(actual.familyFormats.formats.length,80);
 assert.equal(new Set(actual.familyFormats.formats.map(f=>f.form)).size,8);
 assert.deepEqual([...new Set(actual.familyFormats.formats.map(f=>f.form))].sort(),['AB','EL','OV','QU','R','RE','RT1','RT2']);
 assert.equal(actual.familyFormats.designs.length,80);
 assert.deepEqual(variantCombinations(actual),variantCombinations(original));
 assert.equal(variantCombinations(actual).length,404);
}

test('actual steel family: logo on/off preserves all 8 forms, 80 sizes, 404 fastenings and every template',async()=>{
 const document=await fixture(),original=structuredClone(document),source=document.config;
 assert.equal(family.groups.length,8);assert.equal(family.sizes.length,80);
 for(const logo of [true,false]){
  const profile={schema:MODULE_PROFILE_SCHEMA,id:logo?'steel-with-logo':'steel-without-logo',revision:1,modules:modules(logo)};
  const result=validateProductDocument({...structuredClone(document),config:applyModuleProfile(source,profile)}).config;
  assertFamilyPreserved(result,source);assert.equal(moduleEnabled(result,'logo'),logo);assert.equal(vectorLogoAllowed(result),logo);
  for(const options of variantCombinations(source)){
   const selected=selectedProfile(source,options),actual=selectedProfile(result,options);
   assert.deepEqual(actual.geometry,selected.geometry,'No changed contour or hole geometry for '+JSON.stringify(options));
   assert.deepEqual(actual.designs,selected.designs,'No lost/replaced design for '+JSON.stringify(options));
   assert.deepEqual(quote(result,[],actual.defaultDesignId,options),quote(source,[],selected.defaultDesignId,options));
  }
 }
 assert.deepEqual(document,original,'Profile selection must never mutate the source');
});

test('confirmed local creation of both steel profiles retains the complete native family after database reopen',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-family-module-proof-')),filename=path.join(directory,'workshop.sqlite'),connections=[];
 t.after(()=>{for(const c of connections.reverse())c.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'gravuru-family-module-proof-'));fs.rmSync(directory,{recursive:true,force:true});});
 const repository=createProductRepository({filename,validateDocument:validateProductDocument});connections.push(repository);
 const source=repository.create(structuredClone(await fixture())),sourceBefore=structuredClone(source.document);
 const library=createConfiguratorModuleProfiles({filename,tenantId:repository.tenantId});connections.push(library);
 const groups=createProductGroupTemplates({filename,repository,moduleProfiles:library,targets:()=>[{key:'all-steel',productId:source.id,familyId:family.id,sizeKey:'all-confirmed-sizes'}],offeringFor:()=>({familyIds:[family.id],fingerprint:'checked-in-steel-options-20261108'})});connections.push(groups);
 const created=[];
 for(const logo of [true,false]){
  const label=logo?'mit Logo':'ohne Logo',savedProfile=library.create({name:'Türschilder '+label,modules:modules(logo)});
  const draft=groups.draft({name:'Alle Edelstahl-Türschilder '+label,scope:{lineId:'steel-door-signs',subcategoryId:'normal'},sourceKeys:['all-steel']});
  draft.targets[0].moduleProfile={id:savedProfile.id,revision:savedProfile.revision};const template=groups.create(draft);
  const plan=groups.plan({templateId:template.id,templateRevision:template.revision,creationKey:'family-'+(logo?'with':'without'),products:[{key:'first',targetKey:'all-steel',name:'Edelstahl-Türschilder '+label}]});
  assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.products[0].combinationCount,404);
  assert.throws(()=>groups.execute({planId:plan.id,planHash:plan.planHash,confirmationId:'unconfirmed'}),e=>e.code==='group_confirmation_required');
  const confirmation=groups.confirm({planId:plan.id,planHash:plan.planHash,accepted:true});
  const request={planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.confirmationId},result=groups.execute(request);
  assert.equal(result.created,1);assert.equal(result.shopifyWrites,0);assert.equal(result.published,false);assert.equal(groups.execute(request).replayed,true);
  created.push({id:result.products[0].productId,logo,profile:savedProfile.profile});
 }
 assert.equal(new Set(created.map(p=>p.id)).size,2);assert.deepEqual(repository.get(source.id).document,sourceBefore);
 const reopened=createProductRepository({filename,validateDocument:validateProductDocument});connections.push(reopened);
 for(const item of created){
  const record=reopened.get(item.id),c=record.document.config;
  assert.equal(record.status,'draft');assert.equal(record.publishedRevision,null);assert.deepEqual(c.moduleProfile,item.profile);assert.equal(vectorLogoAllowed(c),item.logo);
  // Product name changes are intentional; every physical/artwork option stays exact.
  const reference=structuredClone(sourceBefore.config);reference.profile.name=record.document.name;
  assertFamilyPreserved(c,reference);
 }
});
