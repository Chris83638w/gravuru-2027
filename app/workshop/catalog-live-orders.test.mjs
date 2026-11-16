import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import {planFamilyFormats} from './katalog-family-formats.mjs';
import {workshopResources} from './catalog.mjs';
import {makeProductDocument} from './product-model.mjs';
import {createProductRepository} from './repository.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {createCatalogLiveOrders} from './catalog-live-orders.mjs';
import {DatabaseSync} from 'node:sqlite';
import {openWorkshopDb,checkSelections,applyChecks} from '../../scripts/shop-bind.mjs';
import {customerIntegrationFromEnv} from './acryl-employee-host.mjs';
const SHOP='synthetic-catalog.myshopify.com',PRODUCT='gid://shopify/Product/139001';
const auth={shopDomain:SHOP,apiVersion:'2026-07',secret:'synthetic-catalog-secret-not-live'},live={...auth,mode:'catalog-live-approved'};
function signed(payload,event,topic='orders/paid'){
 const raw=Buffer.from(JSON.stringify(payload));return {raw,headers:{'x-shopify-hmac-sha256':createHmac('sha256',auth.secret).update(raw).digest('base64'),'x-shopify-shop-domain':SHOP,'x-shopify-api-version':auth.apiVersion,'x-shopify-topic':topic,'x-shopify-webhook-id':event}};
}
async function fixture(t){
 const family=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),size=family.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
 const master={id:'TEST-AB-D139',name:'Test',themes:['familie'],fonts:['Montserrat'],plateMm:[120,80],fields:{},json:{form:'Rechteck abgerundete Ecken',sizes:[size.key],ziele:[{familie:family.id,freigabe:{status:'freigegeben',von:'Test',am:'2026-11-01'}}]},svg:()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><text id="text-1" x="60" y="40" text-anchor="middle" font-family="Montserrat" font-size="8">Name</text></svg>'};
 master.source='synthetic-test';
 const fonts=workshopResources().fonts,katalog={families:new Map([[family.id,family]]),lines:new Map([['test',{id:'test',name:'Test',families:[family.id],subcategories:[{id:'familie',name:'Familie',themeId:'familie'}]}]]),designs:{masters:[master]},theme:()=>null,fontResources:async()=>({fonts:{Montserrat:fonts.Montserrat},missing:[]})};
 const {config}=await planFamilyFormats(katalog,'test','familie',{shopProduct:{sizeKey:size.key,themeId:'familie',defaultDesignId:master.id}});
 const invalid=[];function inspect(value,trail='config'){if(value===undefined)invalid.push(trail);else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))inspect(v,trail+'.'+k);}inspect(config);assert.deepEqual(invalid,[]);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'catalog-live-')),filename=path.join(dir,'workshop.sqlite');
 const initial=createProductRepository({filename,tenantId:'gravuru'});initial.close();
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',storeId:'acryl',shopDomain:SHOP});
 t.after(()=>{ws.close();fs.rmSync(dir,{recursive:true,force:true});});
 const record=ws.repository.create(makeProductDocument(config,{name:'Synthetic fixed steel sign',kind:'product'})),plan=prepareShopProduct(record);
 const variants=plan.variants.map((v,i)=>({...v,id:'gid://shopify/ProductVariant/'+(139100+i)}));
 const selections=variants.map(v=>({shopifyProductId:PRODUCT,shopifyVariantId:v.id,productId:record.id,productRevision:1,options:v.options,expectedUnitCents:v.priceCents}));
 const reader={async inspectVariants(ids){return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const v=variants.find(v=>v.id===id);return {id,found:true,productId:PRODUCT,status:'ACTIVE',priceCents:v.priceCents,options:Object.entries(v.options).map(([name,value])=>({name,value}))};})};}};
 const blocks=await checkSelections(selections,{adapter:ws.adapter,reader});
 const result=applyChecks(blocks,{orderIntake:ws.orderIntake,storeId:'acryl',shopDomain:SHOP,adapter:ws.adapter});
 assert.equal(result[0].createdBindings,5,JSON.stringify(result));
 const registry=ws.orderIntake.idBindings({storeId:'acryl',shopDomain:SHOP,adapter:ws.adapter});
 const args={shopDomain:SHOP,approvalId:'synthetic-issue139',registry,products:[{productId:record.id,productRevision:1,shopifyProductId:PRODUCT}]};
 const chosen=variants[0],binding=ws.orderIntake.bindings().find(b=>b.variantId===chosen.id.split('/').at(-1));
 const proof={schema:'gravuru-native-review/v1',id:'proof_synthetic_catalog',packageSha256:'a'.repeat(64),product:{id:record.id,revision:1,name:'Synthetic fixed steel sign',basePriceCents:chosen.priceCents,currency:'EUR'},selection:{options:chosen.options,price:{unitCents:chosen.priceCents,quantity:1}}};
 const intake=createOrderIntake({database:ws.db,tenantId:'gravuru',snapshot:()=>structuredClone(proof)});
 const offer=intake.offer({bindingId:binding.id,snapshotId:proof.id,quantity:1});
 const payload={id:139501,test:false,financial_status:'paid',currency:'EUR',line_items:[{id:139601,product_id:139001,variant_id:Number(binding.variantId),quantity:1,price:(chosen.priceCents/100).toFixed(2),properties:[{name:'_gravuru_offer',value:offer.property.value}]}]};
 const lookup={shopDomain:SHOP,shopifyProductId:PRODUCT,shopifyVariantId:chosen.id,productId:record.id,productRevision:1};
 return {ws,intake,record,args,payload,lookup,variants};
}
test('catalog paid intake requires every exact binding and immutable explicit release, preserving its own five sign options',async t=>{
 const f=await fixture(t),send=(payload,event,mode=live)=>{const s=signed(payload,event);return f.intake.receive(s.raw,s.headers,mode);};
 assert.deepEqual(f.record.document.config.profile.optionGroups.map(g=>g.id),['mounting']);
 assert.equal(f.intake.catalogLiveApproval(f.lookup),null);
 assert.equal(send(f.payload,'catalog-before-release').lines.length,0);
 assert.throws(()=>f.intake.approveCatalogLiveProducts({...f.args,registry:{resolve:id=>({...f.args.registry.resolve(id),unitCents:1})}}),/Preis/);
 assert.equal(f.ws.db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='catalog_live_order_approvals'").get().n,0);
 assert.equal(f.intake.approveCatalogLiveProducts(f.args).created,1);
 assert.equal(f.intake.approveCatalogLiveProducts(f.args).created,0);
 assert.equal(f.intake.catalogLiveApproval(f.lookup).kind,'catalog');
 assert.equal(f.intake.doorbellLiveApproval(f.lookup),null,'no sign is registered as a bell');
 assert.equal(f.intake.catalogLiveApproval({...f.lookup,shopifyProductId:'gid://shopify/Product/999'}),null);
 assert.equal(f.intake.catalogLiveApproval({...f.lookup,productRevision:2}),null);
 assert.throws(()=>send(f.payload,'catalog-test-mode',auth),/Live-Bestellungen/);
 assert.equal(send(f.payload,'catalog-bell-only',{...auth,mode:'doorbell-live-approved'}).lines.length,0);
 assert.equal(f.intake.catalogLiveOrderScope({shopDomain:SHOP,orderId:f.payload.id,lines:f.payload.line_items}),'pending');
 assert.equal(f.intake.doorbellLiveOrderScope({shopDomain:SHOP,orderId:f.payload.id,lines:f.payload.line_items}),'unrelated');
 const wrong=structuredClone(f.payload);wrong.id++;wrong.line_items[0].product_id=999;
 assert.equal(send(wrong,'catalog-wrong-product').lines.length,0);
 const paid=send(f.payload,'catalog-paid-event');assert.equal(paid.lines.length,1);assert.equal(paid.lines[0].test,false);assert.equal(paid.lines[0].productionReady,false);assert.equal(paid.lines[0].liveApproval.kind,'catalog');
 assert.equal(send(f.payload,'catalog-paid-event').duplicate,true);
 assert.equal(f.intake.catalogLiveOrderScope({shopDomain:SHOP,orderId:f.payload.id,lines:f.payload.line_items}),'known');
 const next=f.ws.repository.save(f.record.id,{...f.record.document,name:'New unpublished revision'},1);assert.equal(next.revision,2);
 assert(f.intake.catalogLiveApproval(f.lookup),'historical paid revision remains immutable and approved');
 assert.throws(()=>f.intake.approveCatalogLiveProducts(f.args),/nicht aktuell/);
 const refund=signed({...f.payload,financial_status:'refunded',updated_at:'2026-11-02T14:00:00Z'},'catalog-refund-event','orders/updated');
 assert.throws(()=>f.intake.receive(refund.raw,refund.headers,{...auth,mode:'doorbell-live-approved'}),/Statusnachricht/);
 assert.equal(f.intake.receive(refund.raw,refund.headers,live).matchedLines,1);
 assert.equal(f.intake.status(paid.lines[0].id).state,'refunded');
 assert.throws(()=>f.ws.db.exec("UPDATE catalog_live_order_approvals SET approval_id='changed'"),/immutable/);
 assert.throws(()=>f.ws.db.exec('DELETE FROM catalog_live_order_approvals'),/retention/);
});
test('catalog activation is explicit and does not change doorbell activation',()=>{
 const base={GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'};
 assert.equal(customerIntegrationFromEnv(base).catalogLiveOrders,undefined);
 assert.equal(customerIntegrationFromEnv({...base,GRAVURU_CATALOG_LIVE_ORDERS:'approved-issue139-20261102'}).catalogLiveOrders,true);
 assert.equal(customerIntegrationFromEnv({...base,GRAVURU_CATALOG_LIVE_ORDERS:'approved-issue139-20261102'}).doorbellLiveOrders,undefined);
 for(const flag of ['true',true,'approved','approved-20261027'])assert.throws(()=>customerIntegrationFromEnv({...base,GRAVURU_CATALOG_LIVE_ORDERS:flag}),{code:'catalog_live_orders_env'});
 assert.throws(()=>customerIntegrationFromEnv({GRAVURU_CATALOG_LIVE_ORDERS:'approved-issue139-20261102'}),{code:'catalog_live_orders_env'});
});

test('approval batch reads each revision once, rechecks own writes and ends its cache with the transaction',async t=>{
 const f=await fixture(t);f.intake.approveCatalogLiveProducts(f.args);
 let reads=0;const db=f.ws.db,service=createCatalogLiveOrders({tenantId:'gravuru',database:{
  get isTransaction(){return db.isTransaction;},exec:sql=>db.exec(sql),prepare(sql){if(sql.startsWith('SELECT document FROM product_revisions'))reads++;return db.prepare(sql);}
 }});
 assert.equal(service.approvals([f.lookup,f.lookup]).length,2);assert.equal(reads,1);
 assert.equal(service.approvals([f.lookup]).length,1);assert.equal(reads,2,'no cached document survives a call or await boundary');
 const altered={...f.lookup};Object.defineProperty(altered,'productRevision',{get(){
  db.exec('DROP TRIGGER immutable_revision_update');db.prepare('UPDATE product_revisions SET document=? WHERE product_id=? AND revision=1').run(JSON.stringify({...f.record.document,name:'Unzulässiger Austausch'}),f.record.id);return 1;
 }});
 assert.throws(()=>service.approvals([f.lookup,altered]),/innerhalb der Prüfung geändert/);
 assert.equal(db.isTransaction,false);assert.deepEqual(f.ws.repository.get(f.record.id).document,f.record.document,'failed batch rolls its own mutation back');
 assert.equal(service.approvals([f.lookup])[0].kind,'catalog');
});

test('external revision mutation is isolated within the read snapshot and detected by the next approval batch',async t=>{
 const f=await fixture(t);f.intake.approveCatalogLiveProducts(f.args);
 const db=f.ws.db,file=db.prepare('PRAGMA database_list').all().find(x=>x.name==='main').file,other=new DatabaseSync(file);
 try{
 const service=createCatalogLiveOrders({tenantId:'gravuru',database:db}),changed={...f.lookup};let wrote=false;
 Object.defineProperty(changed,'productRevision',{get(){if(!wrote){wrote=true;other.exec('DROP TRIGGER immutable_revision_update');other.prepare('UPDATE product_revisions SET document=? WHERE product_id=? AND revision=1').run(JSON.stringify({...f.record.document,name:'Externer Austausch'}),f.record.id);}return 1;}});
 assert.ok(service.approvals([f.lookup,changed]).every(Boolean),'one read transaction sees its original immutable snapshot');
 assert.throws(()=>service.approvals([f.lookup]),/stimmt nicht mehr/,'fresh transaction must read and reject the changed source');
 }finally{other.close();}
});

test('schema replacement cannot reuse a cached revision when total_changes is unchanged',async t=>{
 const f=await fixture(t);f.intake.approveCatalogLiveProducts(f.args);const db=f.ws.db;
 const service=createCatalogLiveOrders({tenantId:'gravuru',database:db}),changed={...f.lookup};
 Object.defineProperty(changed,'productRevision',{get(){
  const before=db.prepare('SELECT total_changes() AS n').get().n;
  db.exec("ALTER TABLE product_revisions RENAME TO old_product_revisions; CREATE TABLE product_revisions AS SELECT product_id,revision,json_set(document,'$.name','Schema replacement') AS document,metadata,tenant_id,status FROM old_product_revisions");
  assert.equal(db.prepare('SELECT total_changes() AS n').get().n,before);return 1;
 }});
 assert.throws(()=>service.approvals([f.lookup,changed]),/innerhalb der Prüfung geändert/);
 assert.equal(service.approvals([f.lookup])[0].kind,'catalog');
});
