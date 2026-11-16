import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createProductRepository} from './repository.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {openWorkshopDb,checkSelections} from '../../scripts/shop-bind.mjs';

const SHOP='gravuru-design.myshopify.com';
test('100 exact native bindings share one large checked record, while changed later evidence rolls back',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-bind-retention-')),filename=path.join(dir,'workshop.sqlite');
 // Existing records can contain sizable immutable manufacturing metadata.
 const repository=createProductRepository({filename,tenantId:'gravuru',snapshotMetadata:()=>({syntheticPayload:'x'.repeat(512*1024)})});
 const record=repository.create(makeProductDocument(doorbellFixture(),{name:'Synthetic large binding record',kind:'product'}));
 const prepared=prepareShopProduct(record);repository.close();
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',storeId:'acryl',shopDomain:SHOP});
 t.after(()=>{ws.close();fs.rmSync(dir,{recursive:true,force:true});});
 const selections=prepared.variants.slice(0,100).map((v,i)=>({productId:record.id,productRevision:1,shopifyProductId:'gid://shopify/Product/16000000000001',shopifyVariantId:'gid://shopify/ProductVariant/'+(57000000000001+i),options:v.options,expectedUnitCents:v.priceCents}));
 const reader={async inspectVariants(ids){return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const s=selections.find(s=>s.shopifyVariantId===id);return {id,found:true,productId:s.shopifyProductId,status:'ACTIVE',priceCents:s.expectedUnitCents};})};}};
 const block=(await checkSelections(selections,{adapter:ws.adapter,reader}))[0];
 assert.equal(block.error,null);assert.equal(block.result.status,'id-plan-ready');
 const expectedHeads=selections.map(s=>({shopifyVariantId:s.shopifyVariantId,revision:null}));
 // Change an adapter record only at the second explicit DB equality check.
 // This must not be hidden by reuse of the first record.
 let reads=0,changedEvidence=false;
 const changed={...ws.adapter,getCurrentProduct(id){
  const r=ws.adapter.getCurrentProduct(id);
  if(++reads===4){
   // The guarded adapter snapshot is intentionally immutable. Supply a distinct
   // inconsistent record to exercise the writer's equality check, not a TypeError.
   assert.equal(Object.isFrozen(r.metadata),true);
   const different=structuredClone(r);different.metadata.syntheticPayload='changed';changedEvidence=true;
   assert.equal(r.metadata.syntheticPayload.length,512*1024);return different;
  }
  return r;
 }};
 const bad=ws.orderIntake.idBindings({storeId:'acryl',shopDomain:SHOP,adapter:changed});
 assert.throws(()=>bad.persist({plan:block.result.plan,expectedHeads}),{code:'shop_binding_cfg_changed'});
 assert.equal(changedEvidence,true,'the deliberately different record reached the native guard');
 assert.equal(ws.db.prepare('SELECT count(*) AS n FROM shop_product_binding_revisions').get().n,0);
 assert.equal(ws.orderIntake.bindings().length,0);
 // Observe the records passed to the real existing order-intake writer.
 const records=new Set(),bind=ws.orderIntake.bindVariants.bind(ws.orderIntake);
 ws.orderIntake.bindVariants=input=>{records.add(input.record);return bind(input);};
 const registry=ws.orderIntake.idBindings({storeId:'acryl',shopDomain:SHOP,adapter:ws.adapter});
 const saved=registry.persist({plan:block.result.plan,expectedHeads});
 assert.equal(saved.createdBindings,100);assert.equal(saved.assignments.length,100);
 assert.equal(records.size,1,'all variants of one persisted revision retain one record');
 assert.equal([...records][0].metadata.syntheticPayload.length,512*1024);
 for(const item of saved.assignments){const resolved=registry.resolve({shopifyProductId:item.shopifyProductId,shopifyVariantId:item.shopifyVariantId});assert.equal(resolved.productRevision,1);assert.deepEqual(resolved.options,item.options);assert.equal(resolved.unitCents,item.unitCents);}
});

test('fresh readiness indexes preserve cross-product and same-selection conflicts among 15120 bindings',async()=>{
 const {createShopBindingReadAdapter}=await import('./shop-product-binding-adapter.mjs');
 const id='cfg_00000000-0000-4000-8000-000000000001',other='cfg_00000000-0000-4000-8000-000000000002';
 const record={id,revision:1,status:'draft',document:makeProductDocument(doorbellFixture(),{name:'Synthetic readiness',kind:'product'}),metadata:{}};
 const choices=prepareShopProduct(record).variants;
 const rows=Array.from({length:15000},(_,i)=>({id:'prior-'+i,shopDomain:SHOP,variantId:String(800000+i),productId:other,productRevision:1,unitCents:4999,options:{other:String(i)}}));
 for(let i=0;i<120;i++)rows.push({id:'current-'+i,shopDomain:SHOP,variantId:String(900000+i),productId:id,productRevision:1,unitCents:choices[i].priceCents,options:choices[i].options});
 const repository={tenantId:'gravuru',get:()=>structuredClone(record)},orderIntake={tenantId:'gravuru',bindings:()=>rows},productionProfiles={resolve:()=>null};
 const workshop={tenantId:'gravuru',repository,orderIntake,productionProfiles,sessionContext:{shopDomain:SHOP}};
 const adapter=createShopBindingReadAdapter({storeId:'acryl',tenantId:'gravuru',shopDomain:SHOP,workshop,productionProfileScope:{storeId:'acryl',tenantId:'gravuru'}});
 const conflictCodes=()=>adapter.readiness(id).blockers.map(b=>b.code).filter(v=>v.startsWith('binding_')).sort();
 assert.deepEqual(conflictCodes(),[]);
 rows.push({...rows[15000],id:'cross-product',productId:other});
 rows.push({...rows[15000],id:'same-choice',variantId:'999999'});
 assert.deepEqual(conflictCodes(),['binding_selection_ambiguous','binding_variant_product_conflict']);
 rows.splice(-2);
 assert.deepEqual(conflictCodes(),[],'the next evaluation re-reads all current bindings');
});
