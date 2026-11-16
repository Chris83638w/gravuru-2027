import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain,GALLERY_SYNC_TEST_PRODUCT as PRODUCT} from '../../app/workshop/gallery-shop-sync-test-fixture.mjs';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
import {nativeModuleAvailability} from '../../app/configurator/variant-m/module-profile.mjs';
import {GALLERY_SYNC_OPERATIONS} from '../../app/workshop/gallery-shop-sync-transport.mjs';
import {createProductionModuleActivationConfig} from './gallery-production-activation.mjs';
import {createGalleryProductionShopifyRelease} from './gallery-production-shopify-read.mjs';
import {APPROVED_STEEL_DOCUMENT_SHA} from '../../ops/plesk/seed-approved-steel-module-profiles.mjs';
import {installActivationProbe} from './gallery-activation-probe.mjs';

const candidate=process.env.GRAVURU_MODULE_NATIVE_CANDIDATE;
test('real 251/404 native bank: confirmed module activation, atomic failure, restart recovery, replay and reversible logo',{skip:!candidate},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'module-production-write-'));
 assert.equal(createHash('sha256').update(fs.readFileSync(candidate)).digest('hex'),APPROVED_STEEL_DOCUMENT_SHA);
 const document=JSON.parse(fs.readFileSync(candidate));let pricing,host;
 const phaseTimings=[],measured=async(label,run)=>{
  if(!process.env.GRAVURU_ACTIVATION_PROBE_OUTPUT)return run();
  const probe=installActivationProbe(host.targetWorkshop);let value;
  try{return value=await run();}finally{phaseTimings.push({label,state:value?.operations?.[0]?.state??'thrown',metrics:probe.finish()});fs.writeFileSync(process.env.GRAVURU_ACTIVATION_PROBE_OUTPUT,JSON.stringify(phaseTimings,null,2)+'\n');}
 };
 const f=await createGallerySyncTestFixture({directory:dir,documentTransform:()=>structuredClone(document),initialPricingFor:({record,variants})=>{
  pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:PRODUCT,revision:2,currency:'EUR',variants:Object.fromEntries(variants.map(v=>[v.id.split('/').at(-1),v.priceCents])),extraMotifCents:record.document.config.extraMotifCents,extraPhotoCents:record.document.config.photo.extraPriceCents,extraLogoCents:1299,...(record.document.config.quantityTiers?{quantityTiers:record.document.config.quantityTiers,quantityTierScope:record.document.config.quantityTierScope}:{})};return pricing;
 }});
 const db=new DatabaseSync(path.join(dir,'target/workshop.sqlite'));
 t.after(()=>{host?.close();db.close();f.close();assert.equal(path.dirname(dir),os.tmpdir());fs.rmSync(dir,{recursive:true,force:true});});
 const sourceRegistry={targets:()=>[],scopes:()=>[],offeringFor:()=>null};
 const filename=path.join(dir,'management.sqlite'),management=f.sourceWorkshop.configureModuleManagement({filename,sourceRegistry});
 const available=nativeModuleAvailability(f.target.document.config);
 const enabled=management.profiles.create({name:'Steel with logo',modules:available}),disabled=management.profiles.create({name:'Steel without logo',modules:{...available,logo:false}});
 const expected={tenantId:'gravuru',storeId:'acryl',shopDomain,shopifyProductId:PRODUCT,productId:f.target.id,revision:f.target.revision,documentSha256:syncHash(f.target.document),shopifyVariantIds:f.variants.map(v=>v.id),originalIds:document.config.familyFormats.designs.map(d=>d.katalog.designId),originalCount:251,sizeCount:80,variantCount:404};
 const nodes=f.variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2),sku:'synthetic',selectedOptions:[],inventoryItem:{id:'synthetic',tracked:false}}));
 const state={release:null,writes:0,loseResponse:false,tokenHook:null};
 const shopify={shopDomain,apiVersion:'2026-07',getAccessToken:async()=>{await state.tokenHook?.();return'synthetic-fixture-only';},fetchImpl:async(url,request)=>{
  const {query,variables}=JSON.parse(request.body);let data;
  if(query===GALLERY_SYNC_OPERATIONS.release){
   assert.equal(variables.metafields.length,1);const m=variables.metafields[0];assert.equal(m.compareDigest,state.release?.compareDigest??null);
   state.release={value:m.value,compareDigest:createHash('sha256').update(m.value).digest('hex')};state.writes++;
   if(state.loseResponse){state.loseResponse=false;throw Error('Synthetic lost response after accepted mutation');}
   data={metafieldsSet:{metafields:[state.release],userErrors:[]}};
  }else{
   assert.ok([GALLERY_SYNC_OPERATIONS.product,GALLERY_SYNC_OPERATIONS.variants].includes(query));
   const next=query===GALLERY_SYNC_OPERATIONS.variants;
   data={shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:PRODUCT,updatedAt:'2026-11-08T14:00:00Z',title:'Synthetic',handle:'synthetic',status:'ACTIVE',descriptionHtml:'',seo:{},options:[],variants:{nodes:next?nodes.slice(250):nodes.slice(0,250),pageInfo:{hasNextPage:!next,endCursor:next?null:'second-page'}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:state.release,pricing:{jsonValue:pricing}}};
  }
  return new Response(JSON.stringify({data}),{status:200,headers:{'Content-Type':'application/json','x-shopify-api-version':'2026-07'}});
 }};
 const context={sourceWorkshop:f.sourceWorkshop,filename,sourceRegistry,sourceApproval:()=>({approved:false}),csrfToken:'synthetic-module-activation-csrf'};
 const args={targetFilename:path.join(dir,'target/workshop.sqlite'),expected,shopify,allowedProfileIds:[enabled.id,disabled.id],journalFilename:path.join(dir,'module-sync.sqlite')};
 const open=(gates={})=>createProductionModuleActivationConfig({...args,...gates}).connect(context);
 const createPlan=async profile=>{const plan=await host.synchronizer.plan({targetIds:[`module-profile:${f.target.id}:${profile.id}`]});assert.equal(plan.ready,true,JSON.stringify(plan.entries[0].issues));return plan;};
 const confirm=plan=>host.synchronizer.confirm({planId:plan.planId,planSha256:plan.planSha256,accepted:true});
 const active=()=>db.prepare('SELECT r.cfg_revision,b.unit_cents,r.variant_gid FROM shop_product_binding_revisions r JOIN shop_product_binding_heads h ON r.tenant_id=h.tenant_id AND r.shop=h.shop AND r.variant_gid=h.variant_gid AND r.revision=h.revision JOIN form_shop_bindings b ON b.id=r.binding_id ORDER BY r.variant_gid').all();
 const initialHeads=active(),oldRevision=db.prepare('SELECT document,metadata FROM product_revisions WHERE product_id=? AND revision=?').get(f.target.id,f.target.revision);
 const oldBindings=db.prepare('SELECT * FROM form_shop_bindings WHERE product_id=? ORDER BY id').all(f.target.id),oldContracts=db.prepare('SELECT * FROM form_shop_binding_personalization ORDER BY binding_id').all();
 host=open();const plan=await createPlan(disabled),confirmation=confirm(plan);
 await assert.rejects(host.synchronizer.execute(confirmation),{code:'gallery_sync_disabled'});assert.deepEqual(active(),initialHeads);assert.equal(state.writes,0);host.close();host=null;
 host=open({executionEnabled:true,writesEnabled:true});
 await assert.rejects(host.synchronizer.execute({...confirmation,confirmationId:'foreign'}),{code:'gallery_sync_confirmation'});assert.equal(state.writes,0);
 const stale=await createPlan(enabled),staleConfirmation=confirm(stale);management.profiles.save(enabled.id,{name:'Renamed, same approved modules',modules:available},1);
 const staleResult=await host.synchronizer.execute(staleConfirmation);assert.equal(staleResult.operations[0].state,'conflict');assert.equal(state.writes,0);assert.deepEqual(active(),initialHeads);
 nodes[0].price='0.01';await assert.rejects(createPlan(disabled),{code:'module_connection_remote_price'});nodes[0].price=(f.variants[0].priceCents/100).toFixed(2);
 state.loseResponse=true;
 const uncertain=await host.synchronizer.execute(confirmation),op=uncertain.operations[0];assert.equal(op.state,'reconciliation-needed',JSON.stringify(op.error));assert.equal(state.writes,1);assert.deepEqual(active(),initialHeads);
 assert.equal(host.targetWorkshop.repository.get(f.target.id).revision,2);assert.equal(host.targetWorkshop.repository.get(f.target.id).document.config.moduleProfile.modules.logo,false);
 host.close();host=null;host=open({executionEnabled:true,writesEnabled:true});
 const approve=host.targetWorkshop.orderIntake.approveCatalogLiveProducts;
 host.targetWorkshop.orderIntake.approveCatalogLiveProducts=args=>{approve(args);throw Error('Synthetic failure AFTER all 404 heads and approval');};
 const failed=await measured('fault-after-all-heads-and-approval',()=>host.synchronizer.reconcile({operationId:op.id}));assert.equal(failed.operations[0].state,'conflict');assert.deepEqual(active(),initialHeads);
 assert.equal(db.prepare('SELECT count(*) AS n FROM form_shop_bindings WHERE product_id=? AND product_revision=2').get(f.target.id).n,0);
 host.targetWorkshop.orderIntake.approveCatalogLiveProducts=approve;
 const recovered=await measured('restart-reconcile-logo-off',()=>host.synchronizer.reconcile({operationId:op.id}));assert.equal(recovered.operations[0].state,'completed',JSON.stringify(recovered.operations[0].error));assert.equal(state.writes,1);
 assert.equal(active().length,404);assert.ok(active().every(h=>h.cfg_revision===2));
 const afterCount=db.prepare('SELECT count(*) AS n FROM form_shop_bindings').get().n;
 assert.equal((await host.synchronizer.execute(confirmation)).operations[0].state,'completed');assert.equal(state.writes,1);assert.equal(db.prepare('SELECT count(*) AS n FROM form_shop_bindings').get().n,afterCount);
 const back=await createPlan(management.profiles.get(enabled.id)),backConfirmation=confirm(back);
 const restored=await measured('confirmed-logo-on-new-revision',()=>host.synchronizer.execute(backConfirmation));assert.equal(restored.operations[0].state,'completed',JSON.stringify(restored.operations[0].error));assert.equal(state.writes,2);
 const current=host.targetWorkshop.repository.get(f.target.id);assert.equal(current.revision,3);assert.equal(current.document.config.moduleProfile.modules.logo,true);
 for(const key of ['familyFormats','localResources','workshopElementRights'])assert.deepEqual(current.document.config[key],f.target.document.config[key]);
 assert.deepEqual(active().map(({cfg_revision,...h})=>h),initialHeads.map(({cfg_revision,...h})=>h));
 assert.deepEqual(db.prepare('SELECT document,metadata FROM product_revisions WHERE product_id=? AND revision=?').get(f.target.id,f.target.revision),oldRevision);
 assert.deepEqual(db.prepare('SELECT * FROM form_shop_bindings WHERE product_id=? AND product_revision=? ORDER BY id').all(f.target.id,f.target.revision),oldBindings);
 for(const row of oldContracts)assert.deepEqual(db.prepare('SELECT * FROM form_shop_binding_personalization WHERE binding_id=?').get(row.binding_id),row);
 const illicit=structuredClone(current.document);illicit.config.familyFormats.designs[0].name='Unapproved artwork';assert.throws(()=>host.targetWorkshop.repository.save(f.target.id,illicit,3),{code:'module_target_artwork_or_commerce'});
});

test('release writer defaults off, admits only exact one-product release CAS and rechecks after token await',async()=>{
 const expected={productId:'cfg_00000000-0000-4000-8000-000000000001',shopifyProductId:'gid://shopify/Product/100001',revision:4},profile='cmp_00000000-0000-4000-8000-000000000002';let tokenReads=0,requests=0;
 const options={shopDomain:'module-release-test.myshopify.com',apiVersion:'2026-07',expected,allowedProfileIds:[profile],getAccessToken:async()=>{tokenReads++;return'synthetic';},fetchImpl:async()=>{requests++;return new Response(JSON.stringify({data:{metafieldsSet:{userErrors:[]}}}),{headers:{'Content-Type':'application/json','x-shopify-api-version':'2026-07'}});}};
 const value=JSON.stringify({schema:'gravuru-gallery-shop-sync/v1',kind:'module-profile',nativeSource:{productId:expected.productId,revision:4},moduleProfile:{id:profile,revision:1,sha256:'a'.repeat(64)},sourceRevision:4,sourceFingerprint:'b'.repeat(64),productId:expected.productId,productRevision:5,designId:'D1',documentSha256:'c'.repeat(64)});
 const variables={metafields:[{ownerId:expected.shopifyProductId,namespace:'gravuru',key:'gallery_release',type:'json',value,compareDigest:null}]};
 await assert.rejects(createGalleryProductionShopifyRelease(options).graphql(GALLERY_SYNC_OPERATIONS.release,variables,()=>{}),{code:'gallery_connection_release_scope'});assert.equal(tokenReads,0);
 const writer=createGalleryProductionShopifyRelease({...options,writesEnabled:true});
 for(const changed of [{...variables,extra:true},{metafields:[{...variables.metafields[0],key:'personalization'}]},{metafields:[{...variables.metafields[0],ownerId:'gid://shopify/Product/100002'}]}])await assert.rejects(writer.graphql(GALLERY_SYNC_OPERATIONS.release,changed,()=>{}),{code:'gallery_connection_release_scope'});
 await assert.rejects(writer.graphql('mutation ProductCreate { productCreate { id } }',variables,()=>{}),{code:'gallery_connection_read_only'});assert.equal(tokenReads,0);assert.equal(requests,0);
 await assert.rejects(writer.graphql(GALLERY_SYNC_OPERATIONS.release,variables,()=>{assert.equal(tokenReads,1);throw Object.assign(Error('changed during token retrieval'),{code:'gallery_sync_target_changed'});}),{code:'gallery_sync_target_changed'});assert.equal(requests,0);
 await writer.graphql(GALLERY_SYNC_OPERATIONS.release,variables,()=>{});assert.equal(requests,1);
});

test('last transport await rechecks actual source/target state before any release write',async t=>{
 for(const changedSide of ['source','target']){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'module-last-write-'));let f;
  f=await createGallerySyncTestFixture({directory:dir,transportOptions:{async beforeWrite(){
   await Promise.resolve();
   const workshop=changedSide==='source'?f.sourceWorkshop:f.targetWorkshop,id=changedSide==='source'?f.source.id:f.target.id;
   const current=workshop.repository.get(id),changed=structuredClone(current.document);changed.name+=' parallel';
   workshop.repository.save(id,changed,current.revision);
  }}});
  try{
   const plan=await f.service.plan({targetIds:[f.mapping.id]});assert.equal(plan.ready,true);
   const result=await f.service.execute({planId:plan.planId,planSha256:plan.planSha256});
   assert.equal(result.operations[0].state,'reconciliation-needed');
   assert.equal(result.operations[0].error.code,changedSide==='source'?'gallery_sync_source_changed':'gallery_sync_target_changed');
   assert.equal(f.transport.writes.length,0);assert.equal(f.activation.capture(f.mapping).boundRevision,1);
  }finally{f.close();assert.equal(path.dirname(dir),os.tmpdir());fs.rmSync(dir,{recursive:true,force:true});}
 }
});
