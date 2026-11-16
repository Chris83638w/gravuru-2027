// Optional local acceptance using the backed-up 251-original candidate. No live
// DB/network is opened; a new isolated database and synthetic shop IDs only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
const runtime=process.env.GRAVURU_BINDING_RUNTIME?pathToFileURL(path.resolve(process.env.GRAVURU_BINDING_RUNTIME)+path.sep):new URL('../../',import.meta.url);
const load=name=>import(new URL('app/workshop/'+name+'.mjs',runtime));
const {createProductRepository}=await load('repository'),{validateProductDocument}=await load('product-model'),{prepareShopProduct}=await load('shop-preparation'),{createOrderIntake}=await load('order-intake'),{createShopBindingReadAdapter}=await load('shop-product-binding-adapter'),{planShopProductBindings}=await load('shop-product-binding-plan'),{createShopProductBindingCheck}=await load('shop-product-binding-check'),{createCatalogLiveOrders}=await load('catalog-live-orders');

const file=new URL('../../../../outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json',import.meta.url);
const reference=new URL('../../../../outputs/steel-design-bank-repair-20261108/verification-report.json',import.meta.url);
const key=value=>JSON.stringify(Object.entries(value).sort());
test('real 251-original bank: all 404 original prices, fresh checks, late rollback and atomic retry', {skip:!fs.existsSync(file)||!fs.existsSync(reference)},async t=>{
 const raw=fs.readFileSync(file),document=JSON.parse(raw),expected=JSON.parse(fs.readFileSync(reference)).prices;
 assert.equal(createHash('sha256').update(raw).digest('hex'),'2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0');
 assert.equal(document.config.familyFormats.designs.length,251);
 const root=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(root,'module-full-bank-')),filename=path.join(dir,'workshop.sqlite');
 const tenantId='gravuru',shopDomain='full-bank-test.myshopify.com',shopifyProductId='gid://shopify/Product/700001';
 const repository=createProductRepository({filename,tenantId,validateDocument:validateProductDocument}),db=new DatabaseSync(filename),orderIntake=createOrderIntake({database:db,tenantId,snapshot:()=>{throw Error('No customer snapshot in this isolated test');}});
 t.after(()=>{db.close();repository.close();const resolved=fs.realpathSync(dir);assert.equal(path.dirname(resolved),root);assert.ok(path.basename(resolved).startsWith('module-full-bank-'));fs.rmSync(resolved,{recursive:true,force:true});});
 const record=repository.create(document),started=performance.now(),prepared=prepareShopProduct(record),prepareMs=performance.now()-started;
 console.log(JSON.stringify({phase:'prepare404',elapsedMs:prepareMs,runtime:runtime.href}));
 assert.equal(prepared.variants.length,404);const prices=new Map(expected.map(p=>[key(p.options),p.unitCents]));
 for(const variant of prepared.variants)assert.equal(variant.priceCents,prices.get(key(variant.options)));
 const variants=prepared.variants.map((v,i)=>({...v,id:'gid://shopify/ProductVariant/'+(710000+i)}));
 const pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:shopifyProductId,revision:2,currency:'EUR',extraMotifCents:document.config.extraMotifCents,extraPhotoCents:document.config.photo.extraPriceCents,extraLogoCents:1299,variants:Object.fromEntries(variants.map(v=>[v.id.split('/').at(-1),v.priceCents])),...(document.config.quantityTiers?{quantityTiers:document.config.quantityTiers,quantityTierScope:document.config.quantityTierScope}:{})};
 const adapter=createShopBindingReadAdapter({storeId:'acryl',tenantId,shopDomain,productionProfileScope:{storeId:'acryl',tenantId},workshop:{tenantId,repository,orderIntake,productionProfiles:{resolve:()=>null},sessionContext:{shopDomain}}});
 const registry=orderIntake.idBindings({storeId:'acryl',shopDomain,adapter,personalizationPricingFor:()=>pricing});
 const selections=variants.map(v=>({shopifyProductId,shopifyVariantId:v.id,productId:record.id,productRevision:record.revision,options:v.options}));
 const reader={async inspectVariants(ids){assert.equal(db.isTransaction,false,'no lock spans the network await');return {installation:{shopDomain,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>({id,found:true,productId:shopifyProductId,status:'ACTIVE',priceCents:variants.find(v=>v.id===id).priceCents}))};}};
 const checker=createShopProductBindingCheck({adapter,reader}),checkStart=performance.now(),checkBatches=[];
 for(let offset=0;offset<404;offset+=100){const at=performance.now(),checked=await checker.check({selections:selections.slice(offset,offset+100)});assert.equal(checked.status,'id-plan-ready');checkBatches.push(performance.now()-at);console.log(JSON.stringify({phase:'checker',offset,elapsedMs:checkBatches.at(-1)}));}
 const check404Ms=performance.now()-checkStart;
 function activate(failLate){
  const readAt=new Date().toISOString(),start=performance.now();
  db.exec('BEGIN IMMEDIATE');let result;
  try{result=(()=>{
   for(let offset=0;offset<404;offset+=100)registry.withReadSnapshot(()=>{
    const batch=selections.slice(offset,offset+100),plan=planShopProductBindings({tenantId,shopDomain,adapter,purpose:'id-binding',now:Date.now(),maxEvidenceAgeMs:60000,selections:batch,shopifyEvidence:{tenantId,shopDomain,readAt,complete:true,products:[{id:shopifyProductId,variants:variants.map(v=>({id:v.id,productId:shopifyProductId,priceCents:v.priceCents}))}]}});
    registry.persist({plan,expectedHeads:batch.map(v=>({shopifyVariantId:v.shopifyVariantId,revision:null}))});
    console.log(JSON.stringify({phase:failLate?'rollback-batch':'activate-batch',offset,elapsedMs:performance.now()-start}));
   });
   assert.equal(db.prepare('SELECT count(*) AS n FROM shop_product_binding_heads').get().n,404);
   if(failLate)throw Error('synthetic after-404 failure');
   return orderIntake.approveCatalogLiveProducts({shopDomain,approvalId:'full-bank-atomic-test',registry,products:[{productId:record.id,productRevision:record.revision,shopifyProductId}]});
  })();db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  return {result,elapsedMs:performance.now()-start};
 }
 const faultStarted=performance.now();assert.throws(()=>activate(true),/synthetic after-404 failure/);const rollback404Ms=performance.now()-faultStarted;
 for(const table of ['shop_product_binding_heads','shop_product_binding_revisions','form_shop_bindings','form_shop_binding_personalization'])assert.equal(db.prepare('SELECT count(*) AS n FROM '+table).get().n,0);
 const complete=activate(false);assert.equal(complete.result.created,1);
 const resolveStart=performance.now(),heads=registry.resolveMany(selections.map(({shopifyProductId,shopifyVariantId})=>({shopifyProductId,shopifyVariantId}))),resolve404Ms=performance.now()-resolveStart;
 assert.equal(heads.length,404);for(const head of heads){
  assert.equal(head.unitCents,prices.get(key(head.options)));
  const contract=typeof orderIntake.bindingPricing==='function'?orderIntake.bindingPricing(head.bindingId):JSON.parse(db.prepare('SELECT document FROM form_shop_binding_personalization WHERE binding_id=? AND tenant_id=?').get(head.bindingId,tenantId).document);
  assert.equal(contract.extraLogoCents,1299);
 }
 assert.ok(createCatalogLiveOrders({database:db,tenantId}).approvals(heads.map(h=>({shopDomain,shopifyProductId,shopifyVariantId:h.shopifyVariantId,productId:h.productId,productRevision:h.productRevision}))).every(Boolean));
 assert.deepEqual(repository.get(record.id).document,record.document);
 const output=new URL('../../../../outputs/module-sync-performance-20261108/',import.meta.url);fs.mkdirSync(output,{recursive:true});
 const report={schema:'gravuru-module-full-bank-performance/v1',runtime:runtime.href,candidateSha256:createHash('sha256').update(raw).digest('hex'),designs:251,variants:404,referencePriceComparisons:404,prepareMs,checkBatchesMs:checkBatches,check404Ms,rollback404Ms,activate404Ms:complete.elapsedMs,resolve404Ms,expiredEvidenceAccepted:false,lateFailureRolledBack:true,shopifyWrites:0,liveWrites:0};
 fs.writeFileSync(new URL(process.env.GRAVURU_BINDING_RUNTIME?'full-bank-live-reference-report.json':'full-bank-report.json',output),JSON.stringify(report,null,2)+'\n');t.diagnostic(JSON.stringify(report));
});
