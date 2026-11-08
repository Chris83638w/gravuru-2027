import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createConfiguratorModuleProfiles} from './configurator-module-profiles.mjs';
import {createGalleryModuleSync} from './gallery-module-sync.mjs';
import {createGallerySyncActivation} from './gallery-shop-sync-activation.mjs';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain,GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from './gallery-shop-sync-test-fixture.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {vectorLogoAllowed} from '../configurator/variant-m/contract.mjs';
import {planFamilyFormats,blankDesignId} from './katalog-family-formats.mjs';
import {makeProductDocument} from './product-model.mjs';
const modules=logo=>({options:true,designs:true,text:true,motifs:true,photo:false,logo,colors:false});
const result=r=>r.operations[0];
async function fixture(t,options={}){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-module-sync-'));
 const f=await createGallerySyncTestFixture({directory,...options});
 const library=createConfiguratorModuleProfiles({filename:path.join(directory,'modules.sqlite'),tenantId:'gravuru'});
 t.after(()=>{library.close();f.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'gallery-module-sync-'));fs.rmSync(directory,{recursive:true,force:true});});
 // Synthetic fixtures only: these prices are never sent to Shopify. A host must
 // inject its owning app's checked immutable pricing evidence, not this helper.
 const pricingFor=({record})=>{
  const c=record.document.config;
  return {schema:'gravuru-personalization-pricing/v2',enabled:true,productId:PRODUCT,revision:2,currency:'EUR',variants:Object.fromEntries(f.variants.map(v=>[v.id.split('/').at(-1),v.priceCents])),extraMotifCents:c.extraMotifCents,extraPhotoCents:c.photo.extraPriceCents,extraLogoCents:1299,...(c.quantityTiers?{quantityTiers:c.quantityTiers,quantityTierScope:c.quantityTierScope}:{})};
 };
 const activation=createGallerySyncActivation({workshop:f.targetWorkshop,tenantId:'gravuru',shopDomain,personalizationPricingFor:pricingFor});
 function configure(logo=true){
  const profile=library.create({name:'Synthetisches Profil '+logo,modules:modules(logo)});
  const mapping={...f.mapping,media:[],mediaRequired:false,moduleUpdate:{id:profile.id,revision:1,sourceRevision:1}};
  const service=createGalleryModuleSync({...f.args,targets:()=>[mapping],moduleProfiles:library,activation});
  return {profile,mapping,service};
 }
 return {...f,library,activation,pricingFor,configure};
}
async function approvedRun(s,mapping){const plan=await s.plan({targetIds:[mapping.id]});assert.equal(plan.ready,true,JSON.stringify(plan.entries[0].issues));const confirmation=s.confirm({...plan,accepted:true});return {plan,request:{...plan,...confirmation}};}

test('one existing product can switch its logo module off/on with explicit confirmation; no artwork, variants or historical revisions change',async t=>{
 const f=await fixture(t),before=structuredClone(f.target),native=prepareShopProduct(before),ids=f.variants.map(v=>v.id);
 for(const logo of [false,true]){
  const {mapping,service}=f.configure(logo),{plan,request}=await approvedRun(service,mapping);
  assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,logo?2:1,'preview and confirmation do not save a product');
  assert.throws(()=>service.execute(plan),e=>e.code==='gallery_sync_confirmation');
  assert.throws(()=>service.confirm({...plan,accepted:false}),e=>e.code==='gallery_sync_confirmation');
  assert.equal(result(await service.execute(request)).state,'completed');
  assert.equal(result(await service.execute(request)).state,'completed','idempotent replay');
  const next=f.targetWorkshop.repository.get(f.target.id);assert.equal(next.document.config.moduleProfile.modules.logo,logo);assert.equal(vectorLogoAllowed(next.document.config),logo);
  assert.deepEqual(next.document.config.profile,before.document.config.profile);assert.deepEqual(next.document.config.familyFormats,before.document.config.familyFormats);
  assert.deepEqual(prepareShopProduct(next).variants,native.variants);assert.deepEqual(f.activation.capture(mapping).heads.map(h=>h.shopifyVariantId),ids);
  assert.equal(f.activation.capture(mapping).approved,true);assert.ok(f.activation.capture(mapping).heads.every(h=>h.personalization.moduleProfile.modules.logo===logo));
 }
 assert.deepEqual(f.targetWorkshop.repository.get(f.target.id,{revision:1}),before);assert.equal(f.transport.writes.length,2);assert.ok(f.transport.writes.every(w=>w.images.length===0));
});

test('profile changes invalidate the exact confirmed plan before any local revision or outbound write',async t=>{
 const f=await fixture(t),{profile,mapping,service}=f.configure(false),{request}=await approvedRun(service,mapping);
 f.library.save(profile.id,{name:'Geändert',modules:modules(true)},1);
 const outcome=result(await service.execute(request));assert.equal(outcome.state,'conflict');assert.ok(['gallery_module_profile_changed','gallery_sync_source_changed'].includes(outcome.error.code));
 assert.equal(f.transport.writes.length,0);assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);
});

test('a missing or incompatible checked pricing contract blocks module activation; no silently dropped logo surcharge',async t=>{
 const f=await fixture(t),{mapping}=f.configure(false);
 const missing=createGalleryModuleSync({...f.args,moduleProfiles:f.library,targets:[mapping]});
 const blocked=await missing.plan({targetIds:[mapping.id]});assert.equal(blocked.ready,false);assert.equal(blocked.entries[0].issues[0].code,'gallery_sync_pricing_provider');
 const activation=createGallerySyncActivation({workshop:f.targetWorkshop,tenantId:'gravuru',shopDomain,personalizationPricingFor:({record})=>({...f.pricingFor({record}),extraLogoCents:1})});
 const wrong=createGalleryModuleSync({...f.args,moduleProfiles:f.library,targets:[mapping],activation});
 assert.equal((await wrong.plan({targetIds:[mapping.id]})).ready,false);assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,1);assert.equal(f.transport.writes.length,0);
});

test('an explicit two-design group updates both existing cards with separate previews and keeps its original starter',async t=>{
 const f=await fixture(t,{documentTransform(document){
  const c=document.config,first=c.profile.designs[0],second=structuredClone(first);second.id='secondary-test';second.name='Zweite vorhandene Karte';second.objects[0].text='Zweiter alter Text';second.katalog.designId='TEST-AB-D169';if(second.katalog.originalId)second.katalog.originalId='TEST-AB-D169';
  c.profile.designs.push(second);c.familyFormats.designs.push(structuredClone(second));for(const format of c.familyFormats.formats)for(const variant of format.variants)variant.designIds.push(second.id);
  document.elementRights[second.id]=structuredClone(document.elementRights[first.id]);return document;
 }});
 const source=structuredClone(f.source.document);for(const designs of [source.config.profile.designs,source.config.familyFormats.designs])designs.find(d=>d.id==='secondary-test').objects[0].text='Zweiter neuer Text';f.sourceWorkshop.repository.save(f.source.id,source,1);
 const mapping={...f.mapping,media:[],mediaRequired:false,designs:[{source:f.mapping.source,target:{designId:f.mapping.target.designId}},{source:{productId:f.source.id,designId:'secondary-test',originalId:'TEST-AB-D169'},target:{designId:'secondary-test'}}]};
 const service=createGalleryModuleSync({...f.args,targets:[mapping],moduleProfiles:f.library});
 const {plan,request}=await approvedRun(service,mapping);assert.equal(plan.entries[0].designPreviews.length,2);assert.ok(plan.entries[0].designPreviews.every(p=>p.beforeSvg!==p.afterSvg));
 assert.equal(result(await service.execute(request)).state,'completed');const next=f.targetWorkshop.repository.get(f.target.id);
 assert.equal(next.document.config.profile.defaultDesignId,f.target.document.config.profile.defaultDesignId);assert.equal(next.document.config.profile.designs.length,2);assert.equal(next.document.config.profile.designs[1].objects[0].text,'Zweiter neuer Text');assert.equal(next.document.config.profile.designs[0].objects[0].text,'Neu aus Galerie');
 assert.deepEqual(prepareShopProduct(next).variants,prepareShopProduct(f.target).variants);assert.equal(f.transport.writes.length,1);
});

test('owning app compressed V2 evidence is expanded, pinned and reused without changing its historical price table',async t=>{
 const f=await fixture(t),{mapping}=f.configure(false),raw=f.pricingFor({record:f.target});
 raw.variantSequence={first:f.variants[0].id.split('/').at(-1),step:1,prices:f.variants.map(v=>v.priceCents)};delete raw.variants;
 raw.history=[{...structuredClone(raw),schema:'gravuru-personalization-pricing/v1',revision:1,variantsFromRevision:2}];delete raw.history[0].variantSequence;delete raw.history[0].extraLogoCents;
 f.transport.changeForTest(PRODUCT,p=>p.commerce.personalizationPricing=structuredClone(raw));
 // No injected provider: the existing authenticated transport supplies app-owned evidence.
 const service=createGalleryModuleSync({...f.args,moduleProfiles:f.library,targets:[mapping]});
 const {request}=await approvedRun(service,mapping);assert.equal(result(await service.execute(request)).state,'completed');
 assert.ok(f.activation.capture(mapping).heads.every(h=>h.personalization.extraLogoCents===1299&&h.personalization.revision==='2'&&h.personalization.moduleProfile.modules.logo===false));
 assert.deepEqual((await f.transport.inspect(mapping)).commerce.personalizationPricing,raw);
 const on=f.configure(true),next=createGalleryModuleSync({...f.args,moduleProfiles:f.library,targets:[on.mapping]}),confirmed=await approvedRun(next,on.mapping);
 f.transport.changeForTest(PRODUCT,p=>p.commerce.personalizationPricing.history[0].extraMotifCents+=1);
 assert.equal(result(await next.execute(confirmed.request)).state,'conflict');assert.equal(f.targetWorkshop.repository.get(f.target.id).revision,2);assert.equal(f.transport.writes.length,1);
});

test('the sixty-second activation evidence limit remains enforced and rolls back without advancing any binding',async t=>{
 const f=await fixture(t),plan=await f.service.plan({targetIds:[f.mapping.id]});assert.equal(plan.ready,true);
 const stored=JSON.parse(f.journal.prepare('SELECT document FROM gallery_shop_sync_plans WHERE id=?').get(plan.planId).document),entry=stored.entries[0],before=f.activation.capture(f.mapping);
 f.targetWorkshop.repository.save(f.target.id,entry.document,1);entry.remote=await f.transport.inspect(f.mapping);
 const stale=createGallerySyncActivation({workshop:f.targetWorkshop,tenantId:'gravuru',shopDomain,clock:()=>Date.parse(entry.remote.readAt)+60001});
 assert.throws(()=>stale.activate({entries:[entry],operationId:'synthetic-expired-evidence'}),e=>e.code==='gallery_sync_remote_stale');
 assert.deepEqual(f.activation.capture(f.mapping),before);assert.equal(f.transport.writes.length,0);
});

async function allSteel(){
 const family=JSON.parse(fs.readFileSync(new URL('../../scripts/fixtures/steel-shopify-options/family.json',import.meta.url))),fonts=JSON.parse(fs.readFileSync(new URL('../designs/aosu-labrador/assets/michroma-vectors.json',import.meta.url))),size=family.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
 const katalog={families:new Map([[family.id,family]]),lines:new Map([['sync-proof',{id:'sync-proof',name:'Isolierte Prüfung',families:[family.id],subcategories:[{id:'normal',name:'Türschilder',themeId:'familie'}]}]]),designs:{masters:[]},theme:()=>null,fontResources:async ids=>({fonts:Object.fromEntries(ids.map(id=>[id,fonts[id]])),missing:ids.filter(id=>!fonts[id])})};
 const {config,report}=await planFamilyFormats(katalog,'sync-proof','normal',{shopProduct:{sizeKey:size.key,themeId:'familie',defaultDesignId:blankDesignId(size),groessenWahl:'alle',vorlagen:'leer'}});
 assert.deepEqual(report.blocked,[]);return makeProductDocument(JSON.parse(JSON.stringify(config)),{name:'Alle Formen – synthetischer Syncnachweis'});
}

test('actual native steel family: all 404 existing IDs switch atomically, 8 forms/80 sizes survive; late approval failure rolls every binding back',async t=>{
 const f=await fixture(t,{documentTransform:allSteel}),{mapping,service}=f.configure(true),old=f.activation.capture(mapping),original=structuredClone(f.target.document);
 assert.equal(f.variants.length,404);assert.equal(new Set(original.config.familyFormats.formats.map(x=>x.form)).size,8);assert.equal(original.config.familyFormats.formats.length,80);
 const {request}=await approvedRun(service,mapping),orders=f.targetWorkshop.orderIntake,approve=orders.approveCatalogLiveProducts;
 orders.approveCatalogLiveProducts=()=>{throw Error('Synthetischer Fehler nach letztem Variantenblock');};
 const failed=result(await service.execute(request));assert.equal(failed.state,'conflict');assert.deepEqual(f.activation.capture(mapping),old);
 orders.approveCatalogLiveProducts=approve;
 const completed=result(await service.execute(request));assert.equal(completed.state,'completed',JSON.stringify(completed));
 const now=f.activation.capture(mapping);assert.equal(now.heads.length,404);assert.equal(now.boundRevision,2);assert.equal(now.approved,true);assert.ok(now.heads.every(h=>h.personalization.extraLogoCents===1299));
 assert.deepEqual(now.heads.map(h=>({id:h.shopifyVariantId,options:h.options,cents:h.unitCents})),old.heads.map(h=>({id:h.shopifyVariantId,options:h.options,cents:h.unitCents})));
 const latest=f.targetWorkshop.repository.get(f.target.id);assert.deepEqual(latest.document.config.familyFormats,original.config.familyFormats);assert.deepEqual(latest.document.config.profile,original.config.profile);assert.equal(f.transport.writes.length,1);
});
