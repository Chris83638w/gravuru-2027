import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain,GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from '../../app/workshop/gallery-shop-sync-test-fixture.mjs';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {OUTPUT} from '../../app/configurator/variant-m/build.mjs';
import {createPrivateTestProxy} from '../../ops/plesk/runtime.mjs';
import {DATA_MARKER,markerValue,verifyStorage} from '../../ops/plesk/config.mjs';
import {createGalleryManagementFixture} from '../fixtures/gallery-management.mjs';
import {createSlateGalleryHandler} from './slate-review-gallery.mjs';
import {createProductionModulePreviewMount} from './gallery-production-preview-mount.mjs';
import {PREVIEW_PROFILE_PINS,configureGalleryManagement} from '../../ops/plesk/module-activation-preview-config.mjs';
import {seedApprovedSteelModuleProfiles,APPROVED_STEEL_DOCUMENT_SHA} from '../../ops/plesk/seed-approved-steel-module-profiles.mjs';

const candidate=process.env.GRAVURU_MODULE_NATIVE_CANDIDATE;
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('external preview configuration rejects the wrong host before reading identity or credentials',()=>{
 assert.throws(()=>configureGalleryManagement({workshop:{tenantId:'foreign'}}),{code:'module_preview_host_identity'});
 assert.equal(PREVIEW_PROFILE_PINS.length,2);assert.ok(PREVIEW_PROFILE_PINS.every(p=>p.revision===1));
});

test('actual HTTP mount: existing profile library + journal, selection/plan/confirmation, writes blocked, restart preserves the plan',{skip:!candidate},async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-activation-preview-'));
 const state=path.join(root,'module-state'),moduleFile=path.join(state,'module-management.sqlite'),journalFilename=path.join(state,'module-shop-sync-preview.sqlite');
 let fixture,workshop,inner,proxy,gallery,host;
 const close=async()=>{proxy?.closeAllConnections();if(proxy)await new Promise(r=>proxy.close(r));proxy=null;inner?.closeAllConnections();if(inner)await new Promise(r=>inner.close(r));inner=null;gallery?.close();gallery=null;host=null;workshop?.close();workshop=null;};
 t.after(async()=>{await close();fixture?.close();assert.equal(path.dirname(root),os.tmpdir());fs.rmSync(root,{recursive:true,force:true});});
 assert.equal(sha(candidate),APPROVED_STEEL_DOCUMENT_SHA);
 const seeded=seedApprovedSteelModuleProfiles({documentFilename:candidate,filename:moduleFile,apply:true});assert.equal(seeded.created,2);
 assert.deepEqual(seeded.profiles.map(p=>p.sha256).sort(),PREVIEW_PROFILE_PINS.map(p=>p.sha256).sort());
 new DatabaseSync(journalFilename).close();
 const profilePins=seeded.profiles.map(({id,revision,sha256})=>({id,revision,sha256}));
 const document=JSON.parse(fs.readFileSync(candidate));let pricing;
 fixture=await createGallerySyncTestFixture({directory:path.join(root,'native'),documentTransform:()=>structuredClone(document),initialPricingFor:({record,variants})=>{
  const c=record.document.config;
  pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:PRODUCT,revision:2,currency:'EUR',variants:Object.fromEntries(variants.map(v=>[v.id.split('/').at(-1),v.priceCents])),extraMotifCents:c.extraMotifCents,extraPhotoCents:c.photo.extraPriceCents,extraLogoCents:1299,...(c.quantityTiers?{quantityTiers:c.quantityTiers,quantityTierScope:c.quantityTierScope}:{})};return pricing;
 }});
 const targetId=fixture.target.id,variants=fixture.variants;
 const expected={tenantId:'gravuru',storeId:'acryl',shopDomain,shopifyProductId:PRODUCT,productId:targetId,revision:1,documentSha256:syncHash(fixture.target.document),shopifyVariantIds:variants.map(v=>v.id),originalIds:document.config.familyFormats.designs.map(d=>d.katalog.designId),originalCount:251,sizeCount:80,variantCount:404};
 fixture.close();fixture=null;
 const targetFilename=path.join(root,'native','target','workshop.sqlite'),beforeTarget=sha(targetFilename);
 const sourceFixture=await createGalleryManagementFixture(path.join(root,'source-fixture'));await sourceFixture.close();
 const data=path.join(root,'source-data');fs.mkdirSync(data,{mode:0o700});
 for(const name of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite','local-review-import.json']){const from=path.join(root,'source-fixture',name);if(fs.existsSync(from))fs.copyFileSync(from,path.join(data,name));}
 const sourceIdentity={dataDirectory:data,galleryDirectory:path.join(root,'source-fixture','package'),filename:path.join(data,'workshop.sqlite'),importsFile:path.join(data,'local-review-import.json')};
 const privateConfig={origin:'https://isolated-preview.example',host:'isolated-preview.example',username:'synthetic',password:'synthetic-preview-test-password',data,slateReviewPackage:sourceIdentity.galleryDirectory};
 fs.writeFileSync(path.join(data,DATA_MARKER),JSON.stringify(markerValue(privateConfig,'private-test-data')));
 if(process.platform==='win32'){const original=fs.statSync;t.mock.method(fs,'statSync',(name,...args)=>{const stat=original(name,...args);if(String(name)===data||String(name).startsWith(data+path.sep))Object.defineProperty(stat,'mode',{value:stat.mode&~0o077});return stat;});}
 const nodes=variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2),sku:'synthetic',selectedOptions:[],inventoryItem:{id:'synthetic',tracked:false}})),network=[];
 const shopify={shopDomain,apiVersion:'2026-07',getAccessToken:async()=> 'synthetic-fixture-only',fetchImpl:async(url,request)=>{
  const {query}=JSON.parse(request.body);assert.ok(query.startsWith('query '),'No mutation is permitted');network.push(query);
  const next=query.startsWith('query GallerySyncVariants');return new Response(JSON.stringify({data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:PRODUCT,updatedAt:'2026-11-08T14:00:00Z',title:'Synthetic',handle:'synthetic',status:'ACTIVE',descriptionHtml:'',seo:{},options:[],variants:{nodes:next?nodes.slice(250):nodes.slice(0,250),pageInfo:{hasNextPage:!next,endCursor:next?null:'page-2'}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:null,pricing:{jsonValue:pricing}}}}),{status:200,headers:{'Content-Type':'application/json','x-shopify-api-version':'2026-07'}});
 }};
 const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0],csrf='synthetic-preview-gallery-csrf';
 const request=(route,body,{authenticated=true,token=csrf}={})=>new Promise((resolve,reject)=>{
  const headers={Host:privateConfig.host,'X-Forwarded-Proto':'https',Origin:privateConfig.origin,...(authenticated?{Authorization:'Basic '+Buffer.from(privateConfig.username+':'+privateConfig.password).toString('base64')}:{}),...(body?{'Content-Type':'application/json','X-Slate-Review-CSRF':token}:{})};
  const req=http.request({host:'127.0.0.1',port:proxy.address().port,path:route,method:body?'POST':'GET',headers},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>{let data;try{data=JSON.parse(text);}catch{data=text;}resolve({status:res.statusCode,data});});});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
 let savedPlan,savedConfirmation;
 for(let cycle=0;cycle<2;cycle++){
  verifyStorage(privateConfig);
  workshop=createWorkshop({filename:sourceIdentity.filename,katalogDir:path.join(root,'source-fixture','catalogue'),seedConfig:seed.universal,legacy:seed.legacy});
  const context={workshop,...sourceIdentity};
  const args={context,sourceIdentity,filename:moduleFile,targetFilename,journalFilename,expected,shopify,profilePins};
  assert.throws(()=>createProductionModulePreviewMount({...args,journalFilename:path.join(state,'new-journal.sqlite')}),{code:'module_preview_existing_stores'});
  const config=createProductionModulePreviewMount({...args,executionEnabled:true,writesEnabled:true}); // Extra input cannot enable either gate.
  let registry;
  gallery=createSlateGalleryHandler(sourceIdentity.galleryDirectory,sourceIdentity.importsFile,{workshop,csrfToken:csrf,management:{filename:config.filename,connect(nativeContext){
   registry=nativeContext.sourceRegistry;
   assert.throws(()=>createProductionModulePreviewMount({...args,profilePins:profilePins.map((p,i)=>i? p:{...p,sha256:'0'.repeat(64)})}).connect(nativeContext),{code:'module_preview_profile_changed'});
   host=config.connect(nativeContext);return host;
  }}});
  assert.equal(workshop.configureModuleManagement({filename:moduleFile,sourceRegistry:registry}),host.management);
  inner=createPreviewServer({workshop});const handlers=inner.listeners('request');inner.removeAllListeners('request');inner.on('request',(req,res)=>{if(!gallery(req,res))for(const handle of handlers)handle.call(inner,req,res);});
  await new Promise(r=>inner.listen(0,'127.0.0.1',r));proxy=createPrivateTestProxy(privateConfig,inner);await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
  assert.equal((await request('/originale/verwaltung/api/context',undefined,{authenticated:false})).status,401);
  const contextResult=await request('/originale/verwaltung/api/context');assert.equal(contextResult.status,200);assert.equal(contextResult.data.sync.executionEnabled,false);
  const modules=await request('/api/workshop/configurator-modules');assert.equal(modules.status,200);assert.deepEqual(modules.data.profiles.map(p=>({id:p.id,revision:p.revision,sha256:p.sha256})).sort((a,b)=>a.id.localeCompare(b.id)),profilePins.toSorted((a,b)=>a.id.localeCompare(b.id)));
  assert.deepEqual(modules.data.sources.map(s=>s.key),contextResult.data.sources.map(s=>s.key));
  const sync=await request('/originale/verwaltung/api/sync');assert.equal(sync.status,200);assert.equal(sync.data.status.executionEnabled,false);assert.equal(sync.data.targets.targets.length,2);
  const disabled=modules.data.profiles.find(p=>p.document.modules.logo===false),targetIdInUi=sync.data.targets.targets.find(p=>p.id.endsWith(':'+disabled.id)).id;
  if(cycle===0){
   assert.equal((await request('/originale/verwaltung/api/sync-plan',{targetIds:[targetIdInUi]},{token:'wrong'})).status,403);
   const plan=await request('/originale/verwaltung/api/sync-plan',{targetIds:[targetIdInUi]});assert.equal(plan.status,200);assert.equal(plan.data.ready,true,JSON.stringify(plan.data.issues));savedPlan=plan.data;
   assert.equal(savedPlan.entries[0].kind,'module-profile');assert.equal(savedPlan.entries[0].beforeSvg,null);
   assert.deepEqual(savedPlan.entries[0].changes.filter(c=>c.kind==='module').map(({key,before,after})=>({key,before,after})),[{key:'logo',before:true,after:false}]);
  }else{
   const reopened=await request('/originale/verwaltung/api/sync-open',{planId:savedPlan.planId});assert.equal(reopened.status,200);assert.deepEqual(reopened.data,savedPlan);
  }
  const exact={planId:savedPlan.planId,planSha256:savedPlan.planSha256};
  assert.equal((await request('/originale/verwaltung/api/sync-confirm',{...exact,accepted:false})).status,422);
  const confirmed=await request('/originale/verwaltung/api/sync-confirm',{...exact,accepted:true});assert.equal(confirmed.status,200);
  if(savedConfirmation)assert.deepEqual(confirmed.data,savedConfirmation);savedConfirmation=confirmed.data;
  const blocked=await request('/originale/verwaltung/api/sync-execute',{...exact,confirmationId:savedConfirmation.confirmationId});assert.equal(blocked.status,403);assert.equal(blocked.data.error.code,'gallery_sync_disabled');
  assert.equal(host.targetWorkshop.repository.get(targetId).revision,1);
  assert.throws(()=>host.targetWorkshop.repository.save(targetId,document,1),{code:'module_target_write_disabled'});
  await close();assert.equal(sha(targetFilename),beforeTarget);verifyStorage(privateConfig);
 }
 const moduleDb=new DatabaseSync(moduleFile,{readOnly:true}),journalDb=new DatabaseSync(journalFilename,{readOnly:true});
 try{assert.equal(moduleDb.prepare('SELECT count(*) AS n FROM configurator_module_profile_revisions').get().n,2);assert.equal(journalDb.prepare('SELECT count(*) AS n FROM gallery_shop_sync_operations').get().n,0);assert.equal(journalDb.prepare('SELECT count(*) AS n FROM gallery_shop_sync_confirmations').get().n,1);}finally{moduleDb.close();journalDb.close();}
 assert.ok(network.length>0);assert.equal(network.some(q=>q.startsWith('mutation ')),false);
});
