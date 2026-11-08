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
import {APPROVED_STEEL_DOCUMENT_SHA} from '../../ops/plesk/seed-approved-steel-module-profiles.mjs';

import {installActivationProbe} from './gallery-activation-probe.mjs';
const candidate=process.env.GRAVURU_MODULE_NATIVE_CANDIDATE;
test('isolated 404 activation timing preserves actual freshness guard',{skip:!candidate},async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'module-production-write-'));
 assert.equal(createHash('sha256').update(fs.readFileSync(candidate)).digest('hex'),APPROVED_STEEL_DOCUMENT_SHA);
 const document=JSON.parse(fs.readFileSync(candidate));let pricing,host;
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

 host=open({executionEnabled:true,writesEnabled:true});
 const probe=installActivationProbe(host.targetWorkshop);
 t.after(()=>probe.finish());
 const plan=await createPlan(enabled),confirmation=confirm(plan);
 const result=await host.synchronizer.execute(confirmation);
 const report={state:result.operations[0].state,error:result.operations[0].error,metrics:probe.finish()};
 if(process.env.GRAVURU_ACTIVATION_PROBE_OUTPUT)fs.writeFileSync(process.env.GRAVURU_ACTIVATION_PROBE_OUTPUT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
 assert.equal(result.operations[0].state,'completed',JSON.stringify(result.operations[0].error));
 assert.equal(active().length,404);assert.ok(active().every(h=>h.cfg_revision===2));
});
