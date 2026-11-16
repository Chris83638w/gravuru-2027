import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
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
import {createGalleryModuleManagementHost} from './gallery-module-management-host.mjs';
import {createProductionModulePreflight,createProductionModuleLibraryConfig} from './gallery-production-connection.mjs';
import {openProductionModuleReadonlyTarget} from './gallery-production-readonly-target.mjs';
import {seedApprovedSteelModuleProfiles,APPROVED_STEEL_DOCUMENT_SHA} from '../../ops/plesk/seed-approved-steel-module-profiles.mjs';

const candidate=process.env.GRAVURU_MODULE_NATIVE_CANDIDATE;
test('one actual production library mounts and plans through native Plesk auth, restarts with shared profiles, preserves 251/404',{skip:!candidate},async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g27-production-mount-')),state=path.join(root,'module-state'),moduleFile=path.join(state,'module-management.sqlite');
 const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 assert.equal(sha(candidate),APPROVED_STEEL_DOCUMENT_SHA);
 assert.equal(seedApprovedSteelModuleProfiles({documentFilename:candidate,filename:moduleFile}).mode,'preview');assert.equal(fs.existsSync(moduleFile),false);
 const seeded=seedApprovedSteelModuleProfiles({documentFilename:candidate,filename:moduleFile,apply:true});assert.equal(seeded.created,2);
 assert.equal(seedApprovedSteelModuleProfiles({documentFilename:candidate,filename:moduleFile,apply:true}).created,0);
 const document=JSON.parse(fs.readFileSync(candidate));let f,target,workshop,inner,proxy,gallery;
 t.after(async()=>{proxy?.closeAllConnections();if(proxy)await new Promise(r=>proxy.close(r));inner?.closeAllConnections();if(inner)await new Promise(r=>inner.close(r));gallery?.close();workshop?.close();target?.close();f?.close();assert.equal(path.dirname(root),os.tmpdir());fs.rmSync(root,{recursive:true,force:true});});
 let pricing;
 f=await createGallerySyncTestFixture({directory:path.join(root,'native'),documentTransform:()=>structuredClone(document),initialPricingFor:({record,variants})=>{
  const config=record.document.config;
  pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:PRODUCT,revision:2,currency:'EUR',variants:Object.fromEntries(variants.map(v=>[v.id.split('/').at(-1),v.priceCents])),extraMotifCents:config.extraMotifCents,extraPhotoCents:config.photo.extraPriceCents,extraLogoCents:1299,...(config.quantityTiers?{quantityTiers:config.quantityTiers,quantityTierScope:config.quantityTierScope}:{})};
  return pricing;
 }});
 const targetId=f.target.id,variants=f.variants;
 const expected={tenantId:'gravuru',storeId:'acryl',shopDomain,shopifyProductId:PRODUCT,productId:targetId,revision:1,documentSha256:syncHash(f.target.document),shopifyVariantIds:variants.map(v=>v.id),originalIds:document.config.familyFormats.designs.map(d=>d.katalog.designId),originalCount:251,sizeCount:80,variantCount:404};
 f.close();f=null;
 const targetFile=path.join(root,'native','target','workshop.sqlite'),beforeTarget=sha(targetFile);
 const sourceFixture=await createGalleryManagementFixture(path.join(root,'source-fixture'));await sourceFixture.close();
 const data=path.join(root,'source-data');fs.mkdirSync(data,{mode:0o700});
 for(const name of ['workshop.sqlite','profiles.sqlite','design-assets.sqlite','local-review-import.json']){const from=path.join(root,'source-fixture',name);if(fs.existsSync(from))fs.copyFileSync(from,path.join(data,name));}
 const privateConfig={origin:'https://isolated-production.example',host:'isolated-production.example',username:'synthetic',password:'synthetic-production-test-password',data,slateReviewPackage:path.join(root,'source-fixture','package')};
 fs.writeFileSync(path.join(data,DATA_MARKER),JSON.stringify(markerValue(privateConfig,'private-test-data')));
 if(process.platform==='win32'){const original=fs.statSync;t.mock.method(fs,'statSync',(name,...args)=>{const stat=original(name,...args);if(String(name)===data||String(name).startsWith(data+path.sep))Object.defineProperty(stat,'mode',{value:stat.mode&~0o077});return stat;});}
 const nodes=variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2),sku:'synthetic',selectedOptions:[],inventoryItem:{id:'synthetic',tracked:false}})),network=[];
 const shopify={shopDomain,apiVersion:'2026-07',getAccessToken:async()=> 'synthetic-fixture-only',fetchImpl:async(url,request)=>{
  const {query}=JSON.parse(request.body);assert.ok(query.startsWith('query '));network.push(query);
  const next=query.startsWith('query GallerySyncVariants');return new Response(JSON.stringify({data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:PRODUCT,updatedAt:'2026-11-08T14:00:00Z',title:'Synthetic',handle:'synthetic',status:'ACTIVE',descriptionHtml:'',seo:{},options:[],variants:{nodes:next?nodes.slice(250):nodes.slice(0,250),pageInfo:{hasNextPage:!next,endCursor:next?null:'page-2'}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:null,pricing:{jsonValue:pricing}}}}),{status:200,headers:{'Content-Type':'application/json','x-shopify-api-version':'2026-07'}});
 }};
 const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0],csrf='synthetic-production-gallery-csrf';let mounted,originalRegistry;
 for(let cycle=0;cycle<2;cycle++){
  verifyStorage(privateConfig);
  target=openProductionModuleReadonlyTarget({filename:targetFile,expected});
  workshop=createWorkshop({filename:path.join(data,'workshop.sqlite'),katalogDir:path.join(root,'source-fixture','catalogue'),seedConfig:seed.universal,legacy:seed.legacy});
  const management=await createProductionModuleLibraryConfig({preflight:createProductionModulePreflight({...target,shopify,expected}),targetWorkshop:target.targetWorkshop,createHost:args=>{originalRegistry=args.sourceRegistry;mounted=createGalleryModuleManagementHost(args);return mounted;},sourceRevision:1,journalFilename:path.join(state,'module-shop-sync-preview.sqlite')});
  gallery=createSlateGalleryHandler(privateConfig.slateReviewPackage,path.join(data,'local-review-import.json'),{workshop,csrfToken:csrf,management:{filename:moduleFile,...management}});
  assert.equal(workshop.configureModuleManagement({filename:moduleFile,sourceRegistry:originalRegistry}),mounted.management);
  assert.throws(()=>workshop.configureModuleManagement({filename:path.join(state,'another.sqlite'),sourceRegistry:originalRegistry}),{code:'module_management_initialized'});
  assert.throws(()=>workshop.configureModuleManagement({filename:'relative.sqlite',sourceRegistry:originalRegistry}),{code:'module_management_registry'});
  inner=createPreviewServer({workshop});const handlers=inner.listeners('request');inner.removeAllListeners('request');inner.on('request',(req,res)=>{if(!gallery(req,res))for(const handler of handlers)handler.call(inner,req,res);});
  await new Promise(r=>inner.listen(0,'127.0.0.1',r));proxy=createPrivateTestProxy(privateConfig,inner);await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
  const request=(route,body)=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:proxy.address().port,path:route,method:body?'POST':'GET',headers:{Host:privateConfig.host,'X-Forwarded-Proto':'https',Origin:privateConfig.origin,Authorization:'Basic '+Buffer.from(privateConfig.username+':'+privateConfig.password).toString('base64'),...(body?{'Content-Type':'application/json','X-Slate-Review-CSRF':csrf}:{})}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(text)}));});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);});
  const context=await request('/originale/verwaltung/api/context');assert.equal(context.status,200);assert.equal(context.data.targets.targets.length,2);assert.equal(context.data.sync.executionEnabled,false);
  const modules=await request('/api/workshop/configurator-modules');assert.equal(modules.status,200);assert.deepEqual(modules.data.sources.map(s=>s.key),context.data.sources.map(s=>s.key));assert.equal(modules.data.profiles.length,2);
  const plan=await request('/originale/verwaltung/api/sync-plan',{targetIds:[context.data.targets.targets[0].id]});assert.equal(plan.status,200);assert.equal(plan.data.ready,true,JSON.stringify(plan.data.entries[0].issues));assert.equal(plan.data.entries[0].beforeSvg,null);assert.equal(target.targetWorkshop.repository.get(targetId).revision,1);
  const confirmed=await request('/originale/verwaltung/api/sync-confirm',{...plan.data,accepted:true});assert.equal(confirmed.status,200);
  const blocked=await request('/originale/verwaltung/api/sync-execute',{...plan.data,...confirmed.data});assert.equal(blocked.status,403);assert.equal(blocked.data.error.code,'gallery_sync_disabled');
  proxy.closeAllConnections();await new Promise(r=>proxy.close(r));proxy=null;inner.closeAllConnections();await new Promise(r=>inner.close(r));inner=null;gallery.close();gallery=null;workshop.close();workshop=null;target.close();target=null;
  verifyStorage(privateConfig);assert.equal(fs.readdirSync(data).some(n=>n.startsWith('module-')),false);assert.equal(sha(targetFile),beforeTarget);
 }
 assert.ok(network.length>=8);assert.equal(seedApprovedSteelModuleProfiles({documentFilename:candidate,filename:moduleFile,apply:true}).created,0);
});
