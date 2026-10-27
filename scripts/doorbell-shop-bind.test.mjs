import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac,randomUUID} from 'node:crypto';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';
import {prepareShopProduct} from '../app/workshop/shop-preparation.mjs';
import {doorbellFixture} from '../app/workshop/test-fixtures/doorbell-config.mjs';
import {createOrderIntake,verifyPaidWebhook} from '../app/workshop/order-intake.mjs';
import {openWorkshopDb} from './shop-bind.mjs';
import {DOORBELL_BIND_SCHEMA,validateDoorbellManifest,validateDoorbellExport,validateDoorbellRecords,createDoorbellLiveReader,applyDoorbellBindings} from './doorbell-shop-bind.mjs';
const SHOP='gravuru-design.myshopify.com',formatKeys=['16x28','24x20','35x18'];
const price=c=>(c/100).toFixed(2);
const shopLabels=o=>[{name:'Acrylfarbe',value:o.color},{name:'Edelstahlrahmen',value:o.format+' / '+o.frame},{name:'Befestigung',value:o.mounting}];
function catalog(){
 const products=[];
 for(let m=0;m<42;m++)for(const [f,formatKey]of formatKeys.entries()){
  const p=m*3+f,variants=[];
  for(const format of formatKeys)for(const color of ['black','anthracite'])for(const frame of ['narrow','wide','double','none'])for(const mounting of ['K00','GWS','KRA','SIL','B04S']){
   const i=p*120+variants.length,options={format,color,frame,mounting};
   variants.push({shopifyVariantId:'gid://shopify/ProductVariant/'+(57000000000000+i),sku:'SYNTH-FK-'+i,priceCents:4999+f*1000,options,selectedOptions:shopLabels(options)});
  }
  products.push({modelKey:'synthetic-'+m,formatKey,productId:'cfg_'+randomUUID(),productRevision:1,shopifyProductId:'gid://shopify/Product/'+(16000000000000+p),variants});
 }
 return {schema:DOORBELL_BIND_SCHEMA,shopDomain:SHOP,products};
}
function exportOf(manifest){return {schema:'gravuru-shop-export/v1',shopDomain:SHOP,complete:true,exportedAt:new Date().toISOString(),products:manifest.products.map(p=>({id:p.shopifyProductId,status:'ACTIVE',variants:{nodes:p.variants.map(v=>({id:v.shopifyVariantId,sku:v.sku,price:price(v.priceCents),selectedOptions:v.selectedOptions}))}}))};}
test('126 independent products preserve all 15,120 exact four-group choices; position never becomes a variant',()=>{
 const m=catalog();assert.equal(validateDoorbellManifest(m).length,15120);assert.equal(validateDoorbellExport(exportOf(m),m).variants,15120);
 for(const change of [
  d=>d.products.pop(),
  d=>d.products[1].productId=d.products[0].productId,
  d=>d.products[1].shopifyProductId=d.products[0].shopifyProductId,
  d=>d.products[0].variants.pop(),
  d=>d.products[0].variants[1].options=d.products[0].variants[0].options,
  d=>d.products[0].variants[0].options.position='opposite',
  d=>d.products[0].variants[0].priceCents=49.99,
  d=>d.products[1].variants[0].sku=d.products[0].variants[0].sku,
  d=>d.products[0].variants[0].selectedOptions.push({name:'Position',value:'oben'})
 ]){const copy=structuredClone(m);change(copy);assert.throws(()=>validateDoorbellManifest(copy));}
});
test('complete export catches missing variants, SKU collisions, price and combined frame/format label mismatches',()=>{
 const m=catalog();
 for(const change of [
  d=>d.complete=false,
  d=>d.products[0].variants.nodes.pop(),
  d=>d.products[0].variants.nodes[0].price='0.01',
  d=>d.products[0].variants.nodes[0].selectedOptions[1].value='falsches Format',
  d=>d.products.push({id:'gid://shopify/Product/999',status:'ACTIVE',variants:{nodes:[{id:'gid://shopify/ProductVariant/999',sku:d.products[0].variants.nodes[0].sku,price:'49.99',selectedOptions:[]} ]}})
 ]){const copy=exportOf(structuredClone(m));change(copy);assert.throws(()=>validateDoorbellExport(copy,m));}
});
test('fresh Shopify evidence verifies SKU and options as well as numeric IDs, prices and all 120 variants',async()=>{
 const m=catalog(),selections=validateDoorbellManifest(m).slice(0,2);
 let patch=v=>v;
 const client={async graphql(query,{ids}){assert.match(query,/variantsCount/);return {data:{shop:{myshopifyDomain:SHOP,currencyCode:'EUR'},nodes:ids.map(id=>{const e=selections.find(s=>s.shopifyVariantId===id);return patch({id,sku:e.sku,price:price(e.expectedUnitCents),selectedOptions:structuredClone(e.selectedOptions),product:{id:e.shopifyProductId,status:'ACTIVE',variantsCount:{count:120}}});})}};}};
 const reader=createDoorbellLiveReader(client,selections);
 assert.equal((await reader.inspectVariants(selections.map(s=>s.shopifyVariantId))).variants.length,2);
 for(const alter of [v=>({...v,sku:'OTHER'}),v=>({...v,price:'0.01'}),v=>({...v,selectedOptions:[]}),v=>({...v,product:{...v.product,variantsCount:{count:121}}})]){
  patch=alter;await assert.rejects(()=>reader.inspectVariants([selections[0].shopifyVariantId]));
 }
 await assert.rejects(()=>reader.inspectVariants(['gid://shopify/ProductVariant/999']));
});
function signed(payload,config,event='synthetic-paid-event-1'){
 const raw=Buffer.from(JSON.stringify(payload));
 return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':SHOP,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':event}};
}
test('real binding registry and explicit persisted approval admit only the fixed native doorbell revision; test and production release stay separate',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-doorbell-bind-')),filename=path.join(dir,'workshop.sqlite');
 const repository=createProductRepository({filename,tenantId:'gravuru'});
 const config=doorbellFixture(),record=repository.create(makeProductDocument(config,{name:'Synthetic doorbell',kind:'product'}));
 const prepared=prepareShopProduct(record);
 assert.equal(prepared.variants.length,120);
 const p={modelKey:config.doorbell.modelKey,formatKey:config.doorbell.defaultFormatKey,productId:record.id,productRevision:record.revision,shopifyProductId:'gid://shopify/Product/16000000000999',variants:prepared.variants.map((v,i)=>({shopifyVariantId:'gid://shopify/ProductVariant/'+(57000000000999+i),sku:'SYNTH-FK-TEST-'+i,priceCents:v.priceCents,options:v.options,selectedOptions:shopLabels(v.options)}))};
 const manifest={schema:DOORBELL_BIND_SCHEMA,shopDomain:SHOP,products:[p]};
 validateDoorbellRecords(manifest,id=>repository.get(id));repository.close();
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',storeId:'acryl',shopDomain:SHOP});
 t.after(()=>{ws.close();fs.rmSync(dir,{recursive:true,force:true});});
 const selections=p.variants.map(v=>({konfiProductId:p.productId,productId:p.productId,productRevision:p.productRevision,shopifyProductId:p.shopifyProductId,shopifyVariantId:v.shopifyVariantId,sku:v.sku,options:v.options,selectedOptions:v.selectedOptions,expectedUnitCents:v.priceCents}));
 const reader={async inspectVariants(ids){return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const v=p.variants.find(v=>v.shopifyVariantId===id);return {id,found:true,productId:p.shopifyProductId,status:'ACTIVE',priceCents:v.priceCents,options:v.selectedOptions};})};}};
 const result=await applyDoorbellBindings({manifest,selections,workshop:ws,reader});
 assert.equal(result.blocks.reduce((n,b)=>n+b.createdBindings,0),120);assert.equal(result.liveRelease,null);
 assert.equal(ws.db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='doorbell_live_order_approvals'").get().n,0);
 const chosen=p.variants[0],binding=ws.orderIntake.bindings().find(b=>b.variantId===chosen.shopifyVariantId.split('/').at(-1));
 const proof={schema:'gravuru-native-review/v1',id:'proof_synthetic_doorbell',packageSha256:'a'.repeat(64),product:{id:p.productId,revision:p.productRevision,name:'Synthetic doorbell',basePriceCents:chosen.priceCents,currency:'EUR'},selection:{options:chosen.options,fields:[{label:'Klingelposition',display:'Entgegengesetzt',value:'opposite'}],price:{unitCents:chosen.priceCents,quantity:2}}};
 const intake=createOrderIntake({database:ws.db,tenantId:'gravuru',snapshot:()=>structuredClone(proof)});
 assert.equal(intake.bind({shopDomain:SHOP,variantId:binding.variantId,record:ws.repository.get(p.productId),snapshotId:proof.id}).id,binding.id);
 const offer=intake.offer({bindingId:binding.id,snapshotId:proof.id,quantity:2});
 const payload={id:901,test:false,financial_status:'paid',currency:'EUR',line_items:[{id:902,product_id:Number(p.shopifyProductId.split('/').at(-1)),variant_id:Number(binding.variantId),quantity:2,price:price(chosen.priceCents),properties:[{name:'_gravuru_offer',value:offer.property.value}]}]};
 const auth={shopDomain:SHOP,apiVersion:'2026-07',secret:'synthetic_secret_more_than_16'},live={...auth,mode:'doorbell-live-approved'};
 let event=signed(payload,auth);
 assert.throws(()=>verifyPaidWebhook(event.raw,event.headers,auth),/Live-Bestellungen/);
 assert.throws(()=>verifyPaidWebhook(Buffer.concat([event.raw,Buffer.from(' ')]),event.headers,live),/nicht bestätigt/);
 const blocked=intake.receive(event.raw,event.headers,live);assert.equal(blocked.lines.length,0);assert.match(blocked.errors[0].intakeError,/Live-Freigabe/);
 const registry=ws.orderIntake.idBindings({storeId:'acryl',shopDomain:SHOP,adapter:ws.adapter});
 const releaseArgs={shopDomain:SHOP,approvalId:'user-synthetic-fk-release',registry,products:[{productId:p.productId,productRevision:p.productRevision,shopifyProductId:p.shopifyProductId}]};
 const lookup={shopDomain:SHOP,shopifyProductId:p.shopifyProductId,shopifyVariantId:chosen.shopifyVariantId,productId:p.productId,productRevision:p.productRevision};
 assert.equal(intake.doorbellLiveApproval(lookup),null);
 assert.equal(intake.approveDoorbellLiveProducts(releaseArgs).created,1);
 assert.equal(intake.approveDoorbellLiveProducts(releaseArgs).created,0);
 assert.equal(intake.doorbellLiveApproval(lookup).id,releaseArgs.approvalId);
 assert.equal(intake.doorbellLiveApproval({...lookup,productRevision:2}),null);
 assert.equal(intake.doorbellLiveApproval({...lookup,shopifyProductId:'gid://shopify/Product/16000000000998'}),null);
 assert.throws(()=>intake.approveDoorbellLiveProducts({...releaseArgs,approvalId:'other-release'}),/Freigabenachweis/);
 assert.throws(()=>intake.approveDoorbellLiveProducts({...releaseArgs,products:[{...releaseArgs.products[0],productRevision:2}]}),/nicht aktuell/);
 const wrong=signed({...payload,id:903,line_items:[{...payload.line_items[0],id:904,product_id:16000000000998}]},auth,'synthetic-wrong-product');
 assert.equal(intake.receive(wrong.raw,wrong.headers,live).lines.length,0);
 event=signed(payload,auth,'synthetic-paid-event-2');
 const paid=intake.receive(event.raw,event.headers,live);
 assert.equal(paid.lines.length,1);assert.equal(paid.lines[0].test,false);assert.equal(paid.lines[0].status,'paid-event-recorded');
 assert.equal(paid.lines[0].productionReady,false);assert.equal(paid.lines[0].customerDownloadAllowed,false);assert.equal(paid.lines[0].liveApproval.id,releaseArgs.approvalId);
 assert.equal(intake.status(paid.lines[0].id).test,false);assert.equal(paid.lines[0].selection.fields[0].value,'opposite');
 assert.equal(intake.receive(event.raw,event.headers,live).duplicate,true);
 assert.throws(()=>ws.db.exec("UPDATE doorbell_live_order_approvals SET approval_id='changed'"),/immutable/);
 assert.throws(()=>ws.db.exec("DELETE FROM doorbell_live_order_approvals"),/retention/);
});

