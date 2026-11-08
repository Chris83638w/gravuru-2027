// Cross-PR integration against the actual, explicitly selected Plesk gallery
// host. The second checkout is a test dependency; no server or live DB is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {nativeModuleAvailability,applyModuleProfile,MODULE_PROFILE_SCHEMA} from '../../app/configurator/variant-m/module-profile.mjs';
import {validateProductDocument} from '../../app/workshop/product-model.mjs';

const hostRoot=process.env.GRAVURU_PLESK_MODULE_HOST_ROOT;
test('actual Plesk routes share gallery scopes, profile assignment, confirmation, source conflict and draft replay',{skip:!hostRoot},async t=>{
 assert.ok(path.isAbsolute(hostRoot),'Choose the reviewed Plesk checkout explicitly');
 const load=relative=>import(pathToFileURL(path.join(hostRoot,relative)).href);
 const [{createGalleryManagementFixture},{attachConfiguredSlateReviewGallery,SLATE_REVIEW_MARKER},{createPrivateTestProxy},{markerValue},{OUTPUT}]=await Promise.all([
  load('scripts/fixtures/gallery-management.mjs'),load('ops/plesk/slate-review-runtime.mjs'),load('ops/plesk/runtime.mjs'),load('ops/plesk/config.mjs'),load('app/configurator/variant-m/build.mjs')]);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-shared-plesk-'));
 let workshop,gallery,inner,proxy,galleryReadRepository,galleryCatalogue;
 t.after(async()=>{if(proxy)await new Promise(r=>proxy.close(r));if(inner)await new Promise(r=>inner.close(r));gallery?.close();workshop?.close();galleryReadRepository?.close();galleryCatalogue?.close();assert.equal(path.dirname(root),os.tmpdir());assert.ok(path.basename(root).startsWith('g27-shared-plesk-'));fs.rmSync(root,{recursive:true,force:true});});
 const fixture=await createGalleryManagementFixture(path.join(root,'data'));
 const sourceIds=fixture.products.map(p=>p.record.id),filename=fixture.filename;
 await fixture.close(); // Reopen the same isolated native DB with PR202 + fix.
 const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
 workshop=createWorkshop({filename,katalogDir:path.join(root,'data','catalogue'),seedConfig:seed.universal,legacy:seed.legacy});
 // PR194 adds these read APIs to the repository; PR202 adds moduleSources.
 // Use PR194's real implementations against the same isolated SQLite file.
 // This models their combined API without copying or replacing either branch's
 // repository writes, schema, import guards or revision validation.
 const {createProductRepository}=await load('app/workshop/repository.mjs');
 galleryReadRepository=createProductRepository({filename,tenantId:workshop.tenantId});
 for(const key of ['importItems','head','cacheIdentity']){
  assert.equal(typeof galleryReadRepository[key],'function');
  if(!workshop.repository[key])workshop.repository[key]=galleryReadRepository[key].bind(galleryReadRepository);
 }
 const {createCatalogStructure}=await load('app/workshop/catalog-structure.mjs');
 galleryCatalogue=createCatalogStructure({filename,tenantId:workshop.tenantId,katalogDir:path.join(root,'data','catalogue')});
 workshop.catalogStructure=galleryCatalogue; // Actual PR194 family-offering reader.
 const config={origin:'https://module-private.example',host:'module-private.example',username:'synthetic',password:'synthetic-shared-module-password',data:path.dirname(filename),slateReviewPackage:path.join(root,'data','package'),galleryManagementConfig:path.join(root,'host.mjs')};
 fs.writeFileSync(path.join(config.slateReviewPackage,SLATE_REVIEW_MARKER),JSON.stringify(markerValue(config,'slate-review-gallery')));
 if(process.platform==='win32'){const original=fs.statSync;t.mock.method(fs,'statSync',(name,...args)=>{const stat=original(name,...args);if(name===config.slateReviewPackage)Object.defineProperty(stat,'mode',{value:stat.mode&~0o077});return stat;});}
 const hostModule=new URL('./gallery-module-management-host.mjs',import.meta.url).href;
 fs.writeFileSync(config.galleryManagementConfig,`import {createGalleryModuleManagementHost} from ${JSON.stringify(hostModule)};
export const state={reads:0};
export function configureGalleryManagement(){return {connect(context){state.context=context;state.host=createGalleryModuleManagementHost({...context,targetWorkshop:context.sourceWorkshop,shopDomain:'synthetic-modules.myshopify.com',journalFilename:${JSON.stringify(path.join(root,'sync.sqlite'))},targets:()=>[],graphql:async()=>{state.reads++;throw Error('No network in local integration');}});return state.host;}};}`);
 inner=createPreviewServer({outputDirectory:root,workshop});
 const csrf='synthetic-gallery-csrf-token';
 gallery=await attachConfiguredSlateReviewGallery(inner,config,{csrfToken:csrf,workshop});
 const {state}=await import(pathToFileURL(config.galleryManagementConfig).href);
 await new Promise(r=>inner.listen(0,'127.0.0.1',r));proxy=createPrivateTestProxy(config,inner);await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+proxy.address().port;
 const request=(route,body,token,headers={})=>new Promise((resolve,reject)=>{
  const req=http.request(base+route,{method:body===undefined?'GET':'POST',headers:{Host:config.host,'X-Forwarded-Proto':'https',Origin:config.origin,Authorization:'Basic '+Buffer.from(config.username+':'+config.password).toString('base64'),...(body===undefined?{}:{'Content-Type':'application/json','X-Slate-Review-CSRF':csrf,'X-Gravuru-CSRF':token||'missing'}),...headers}},response=>{
   let text='';response.on('data',chunk=>text+=chunk);response.on('end',()=>{let data;try{data=JSON.parse(text);}catch{data={error:{message:'Non-JSON response for '+route+' status '+response.statusCode}};}resolve({status:response.statusCode,data});});
  });req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
 });
 const ok=async(...args)=>{const r=await request(...args);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
 const api='/api/workshop/configurator-modules',g='/originale/verwaltung/api/';
 const context=await ok(g+'context'),initial=await ok(api),session=await ok('/api/workshop/session');
 assert.deepEqual(initial.sources.map(s=>s.key),context.sources.map(s=>s.key));assert.equal(initial.sources.length,2);
 const scope=initial.scopes.find(s=>s.lineId==='test-linie'&&s.subcategoryId==='namensschilder');assert.ok(scope,JSON.stringify(initial.scopes));assert.equal(scope.sourceKeys.length,2);
 const modulePost=(action,args)=>ok(api,{action,...args},session.csrfToken);
 const draft=await ok(g+'template-draft',{name:'Gemeinsame Testgruppe',scope:{lineId:scope.lineId,subcategoryId:scope.subcategoryId},sourceKeys:[scope.sourceKeys[0]]});
 const template=await ok(g+'template-create',draft),modules=nativeModuleAvailability(workshop.repository.get(draft.targets[0].source.productId).document.config);
 const profile=await modulePost('profile-create',{document:{name:'Vorhandene Module',modules}});
 const fromModule=(await ok(api)).templates.find(x=>x.id===template.id);assert.deepEqual(fromModule,template);
 fromModule.document.targets[0].moduleProfile={id:profile.id,revision:profile.revision};
 const saved=await modulePost('template-save',{id:template.id,expectedRevision:1,document:fromModule.document});
 const fromGallery=(await ok(g+'templates')).templates.find(x=>x.id===saved.id);assert.deepEqual(fromGallery,saved);
 const makePlan=key=>modulePost('plan',{templateId:saved.id,templateRevision:saved.revision,creationKey:key,products:[{key:'one',targetKey:scope.sourceKeys[0],name:'Bestätigter gemeinsamer Entwurf'}]});
 const plan=await makePlan('shared-success');assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.ok(plan.products[0].variantReview.length>1);
 assert.equal((await request(api,{action:'execute',planId:plan.id,planHash:plan.planHash,confirmationId:'missing'},session.csrfToken)).status,409);
 assert.equal((await request(api,{action:'confirm',planId:plan.id,planHash:plan.planHash,accepted:false},session.csrfToken)).status,422);
 const confirmation=await modulePost('confirm',{planId:plan.id,planHash:plan.planHash,accepted:true});
 const result=await ok(g+'creation-execute',{planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.confirmationId});
 assert.equal(result.created,1);assert.equal(result.shopifyWrites,0);assert.equal((await modulePost('execute',{planId:plan.id,planHash:plan.planHash,confirmationId:confirmation.confirmationId})).replayed,true);
 const created=workshop.repository.get(result.products[0].productId);assert.equal(created.status,'draft');assert.equal(created.publishedRevision,null);assert.deepEqual(created.document.config.moduleProfile.modules,modules);
 const stale=await makePlan('shared-source-stale'),staleConfirmation=await modulePost('confirm',{planId:stale.id,planHash:stale.planHash,accepted:true});
 const source=workshop.repository.get(saved.document.targets[0].source.productId),changed=structuredClone(source.document);changed.name+=' · neuer Quellstand';workshop.repository.save(source.id,changed,source.revision);
 const rejected=await request(api,{action:'execute',planId:stale.id,planHash:stale.planHash,confirmationId:staleConfirmation.confirmationId},session.csrfToken);assert.equal(rejected.status,409);assert.match(rejected.data.error.code,/source/);
 assert.equal((await request(api,{action:'profile-save',id:profile.id,expectedRevision:0,document:profile.document},session.csrfToken)).status,422);
 assert.equal((await request(api,{action:'profile-create',document:{name:'No CSRF',modules}},'wrong')).status,403);
 assert.equal((await request(api,undefined,undefined,{Authorization:''})).status,401);
 assert.throws(()=>workshop.configureModuleManagement({filename,sourceRegistry:{...state.context.sourceRegistry}}),{code:'module_management_initialized'});
 assert.equal(workshop.configureModuleManagement({filename,sourceRegistry:state.context.sourceRegistry}),state.host.management);
 assert.equal(state.reads,0);assert.equal(workshop.repository.get(sourceIds[1]).revision,1);
 // Closing the gallery connection must not close the workshop-owned API store.
 gallery.close();gallery=null;assert.ok((await ok(api)).profiles.some(p=>p.id===profile.id));
});

const candidateFile=process.env.GRAVURU_MODULE_NATIVE_CANDIDATE;
test('real native r4 module toggle preserves all 251 designs and all format data',{skip:!candidateFile},()=>{
 const original=JSON.parse(fs.readFileSync(candidateFile)),before=structuredClone(original);
 assert.equal(original.config.familyFormats.designs.length,251);
 for(const logo of [false,true]){
  const profile={schema:MODULE_PROFILE_SCHEMA,id:'local-r4-proof',revision:1,modules:{...nativeModuleAvailability(original.config),logo}};
  const candidate=validateProductDocument({...original,config:applyModuleProfile(original.config,profile)});
  assert.deepEqual(candidate.config.familyFormats,before.config.familyFormats);assert.deepEqual(candidate.config.profile.designs,before.config.profile.designs);
  assert.deepEqual(candidate.config.localResources,before.config.localResources);assert.deepEqual(candidate.elementRights,before.elementRights);
 }
 assert.deepEqual(original,before);
});
