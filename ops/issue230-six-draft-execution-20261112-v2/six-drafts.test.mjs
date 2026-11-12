import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {loadNativeFunctions,prepareSixDrafts,executeSixDrafts,SHOP,TENANT,STORE,loadReferences} from './six-drafts.mjs';
import {createSixDraftShopSteps,READ_PRODUCT,SET_META,SET_TEMPLATE} from './shopify-steps.mjs';

const workspace=path.resolve(import.meta.dirname,'../../..');
const nativeRoot=path.resolve(process.env.GRAVURU_NATIVE_ROOT||path.join(workspace,'work/issue230-integration-candidate'));
const copyRecords=path.resolve(process.env.GRAVURU_SIX_COPY_RECORDS||path.join(workspace,'work/restabschluss/claude-75a304eb/ops/plesk/sechsgruppen-20261112/records'));
const native=await loadNativeFunctions(nativeRoot),imp=f=>import(pathToFileURL(path.join(nativeRoot,f)).href);
const {createProductRepository}=await imp('app/workshop/repository.mjs');
const {createOrderIntake}=await imp('app/workshop/order-intake.mjs');
const {createShopBindingReadAdapter}=await imp('app/workshop/shop-product-binding-adapter.mjs');
const fetchOriginal=globalThis.fetch;globalThis.fetch=()=>{throw Error('No network allowed in this fixture');};
const copy=v=>structuredClone(v);

test('productUpdate selects only official UserError fields; the former code selection is invalid',()=>{
 // Actual readonly connector schema evidence; its API version was not reported.
 // Host 2026-07 diagnosis is separate. MetafieldsSetUserError is a different type.
 const schema=JSON.parse(fs.readFileSync(new URL('./schema-evidence.json',import.meta.url)));
 assert.equal(schema.productUpdateUserErrors.namedType,'UserError');assert.equal(schema.userError.type,'UserError');assert.equal(schema.userError.kind,'OBJECT');
 const allowed=new Set(schema.userError.fields.map(field=>field.name));
 const check=query=>{const selection=query.match(/\buserErrors\s*\{([^{}]+)\}/);assert.ok(selection,'one explicit UserError selection required');const fields=selection[1].match(/[_A-Za-z][_0-9A-Za-z]*/g);for(const field of fields)assert.ok(allowed.has(field),'Unknown UserError field: '+field);return fields;};
 assert.deepEqual(check(SET_TEMPLATE),['field','message']);
 const oldQuery=SET_TEMPLATE.replace(/userErrors\s*\{[^{}]+\}/,'userErrors{field code message}');
 assert.notEqual(oldQuery,SET_TEMPLATE);assert.throws(()=>check(oldQuery),/Unknown UserError field: code/);
 assert.match(SET_META,/userErrors\{field code message\}/);
});

test('six real content contracts through native transfer/bindings with an injected Shopify service',async t=>{
 const privateDir=fs.mkdtempSync(path.join(import.meta.dirname,'.test-private-')),filename=path.join(privateDir,'workshop.sqlite');
 const repository=createProductRepository({filename,tenantId:TENANT}),db=new DatabaseSync(filename);
 const orders=createOrderIntake({database:db,tenantId:TENANT,snapshot:()=>{throw Error('No customer snapshot');}});
 const workshop={tenantId:TENANT,repository,orderIntake:orders,productionProfiles:{resolve(){return null;}},sessionContext:{shopDomain:SHOP}};
 const adapter=createShopBindingReadAdapter({storeId:STORE,tenantId:TENANT,shopDomain:SHOP,workshop,productionProfileScope:{storeId:STORE,tenantId:TENANT}});
 const transferJournal=native.createShopDraftJournal({database:db,tenantId:TENANT});
 const entries=loadReferences().groups.map(ref=>{
  const plan=JSON.parse(gunzipSync(fs.readFileSync(path.join(copyRecords,ref.group,'plan.json.gz'))));
  const record=repository.create(plan.products[0].document);
  // Explicitly SYNTHETIC execution-shaped fixture: no real approval or groups.execute.
  const execution={planId:plan.id,planHash:plan.planHash,confirmationId:'pgc_'+randomUUID(),localOnly:true,published:false,shopifyWrites:0,products:[{key:plan.products[0].key,productId:record.id,revision:1,created:true}]};
  return {group:ref.group,plan,execution,record};
 });
 const review=prepareSixDrafts(entries,{native}),products=new Map(),events=[],writes=[];let seq=0,loseCreate=true,failTemplate=true,partial=null;
 const jsonResponse=data=>Response.json({data},{headers:{'x-shopify-api-version':'2026-07'}});
 const fetchImpl=async(url,opts)=>{
  const {query,variables}=JSON.parse(opts.body);
  if(query===native.SHOP_DRAFT_CREATE){
   const input=variables.input;assert.equal(input.status,'DRAFT');assert.equal(input.id,undefined);assert.equal(input.files,undefined);
   const n=++seq,id='gid://shopify/Product/'+(910000+n);
   const p={id,handle:input.handle,title:input.title,status:'DRAFT',publishedAt:null,templateSuffix:null,tags:copy(input.tags),seo:copy(input.seo),pricing:null,customizationId:null,
    variants:{pageInfo:{hasNextPage:false},nodes:input.variants.map((v,i)=>({id:'gid://shopify/ProductVariant/'+(920000+n*100+i),price:v.price,selectedOptions:v.optionValues.map(o=>({name:o.optionName,value:o.name}))}))}};
   products.set(id,p);writes.push({kind:'create',id});events.push('created:'+id);
   if(loseCreate){loseCreate=false;throw Error('Synthetic lost response after remote creation');}
   return jsonResponse({productSet:{product:copy(p),userErrors:[]}});
  }
  assert.equal(query,native.SHOP_DRAFT_LOOKUP);
  const handle=variables.query.match(/^handle:([^ ]+) /)[1];return jsonResponse({shop:{myshopifyDomain:SHOP,currencyCode:'EUR'},products:{nodes:[...products.values()].filter(p=>p.handle===handle).map(copy),pageInfo:{hasNextPage:false}}});
 };
 const draftTransport=native.createShopDraftTransport({shopDomain:SHOP,apiVersion:'2026-07',accessToken:'synthetic-only-not-a-real-token'},{fetchImpl});
 const client={async graphql(query,variables){
  if(query===READ_PRODUCT){const p=products.get(variables.id);events.push('read:'+variables.id);return {data:{shop:{myshopifyDomain:SHOP,currencyCode:'EUR'},currentAppInstallation:{app:{id:'gid://shopify/App/423276544001'},accessScopes:[{handle:'write_products'}]},product:copy(p)}};}
  if(query===SET_META){assert.equal(variables.metafields.length,1);const m=variables.metafields[0],p=products.get(m.ownerId);assert.equal(p.status,'DRAFT');assert.equal(m.compareDigest,null);
   if(m.namespace==='$app'){assert.equal(m.key,'personalization');assert.equal(p.pricing,null);p.pricing={jsonValue:JSON.parse(m.value),value:m.value,compareDigest:'pricing-digest'};events.push('pricing:'+p.id);}
   else{assert.equal(m.namespace,'custom');assert.equal(m.key,'customization_id');assert.equal(p.customizationId,null);p.customizationId={value:m.value,compareDigest:'entry-digest'};events.push('entry:'+p.id);}
   writes.push({kind:m.key,id:p.id});return {data:{metafieldsSet:{metafields:[m],userErrors:[]}}};
  }
  assert.equal(query,SET_TEMPLATE);assert.deepEqual(Object.keys(variables.product).sort(),['id','templateSuffix']);const p=products.get(variables.product.id);assert.equal(p.status,'DRAFT');assert.equal(variables.product.templateSuffix,'konfi');
  if(failTemplate){failTemplate=false;return {errors:[{message:"Field 'code' doesn't exist on type 'UserError'",extensions:{code:'undefinedField',typeName:'UserError',fieldName:'code'}}]};}
  p.templateSuffix='konfi';writes.push({kind:'template',id:p.id});return {data:{productUpdate:{product:copy(p),userErrors:[]}}};
 }};
 const readonlyReader={async inspectVariants(ids){return {installation:{shopDomain:SHOP,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const p=[...products.values()].find(p=>p.variants.nodes.some(v=>v.id===id)),v=p.variants.nodes.find(v=>v.id===id);return {id,found:true,productId:p.id,status:p.status,priceCents:Math.round(Number(v.price)*100),options:copy(v.selectedOptions)};})};}};
 const shop=createSixDraftShopSteps({client,readonlyReader,native});
 const bind=orders.bindVariants;orders.bindVariants=function(input){
  assert.ok(input.personalizationPricing,'contract is present before immutable legacy binding');
  const p=products.get(input.personalizationPricing.productId);assert.deepEqual(p.pricing.jsonValue,input.personalizationPricing);events.push('bind:'+p.id);return bind.call(this,input);
 };
 const context={native,repository,orders,transferJournal,draftTransport,shop,adapter,principal:{role:'merchant',shopDomain:SHOP,subject:'synthetic-fixture'},approval:{id:'TEST-ONLY-no-user-approval',reviewHash:review.reviewHash},checkpoint:e=>{events.push(e.phase);}};
 t.after(()=>{db.close();repository.close();globalThis.fetch=fetchOriginal;assert.ok(path.resolve(privateDir).startsWith(path.resolve(import.meta.dirname)+path.sep));fs.rmSync(privateDir,{recursive:true,force:true});});

 await t.test('preparation pins exact six requests and rejects a plan tamper',()=>{
  assert.equal(review.rows.reduce((n,r)=>n+r.request.input.variants.length,0),45);assert.equal(new Set(review.rows.map(r=>r.productId)).size,6);
  const bad=copy(entries);bad[0].plan.planHash='0'.repeat(64);assert.throws(()=>prepareSixDrafts(bad,{native}),{code:'six_drafts_plan'});assert.equal(writes.length,0);
 });
 await t.test('lost create response stops with no bindings and never blindly creates again',async()=>{
  await assert.rejects(executeSixDrafts(review,context));assert.equal(writes.filter(w=>w.kind==='create').length,1);assert.equal(orders.bindings().length,0);
  await assert.rejects(executeSixDrafts(review,context),/bereits begonnen/);assert.equal(writes.filter(w=>w.kind==='create').length,1);
 });
 await t.test('template GraphQL failure stops after first price, ten bindings and catalog approval; transfer stays completed',async()=>{
  await assert.rejects(executeSixDrafts(review,{...context,action:'reconcile'}),{code:'six_drafts_unknown_reconcile_only'});
  const p=[...products.values()][0],row=review.rows[0];assert.equal(products.size,1);assert.equal(writes.filter(w=>w.kind==='create').length,1);
  assert.equal(p.status,'DRAFT');assert.equal(p.publishedAt,null);assert.equal(p.templateSuffix,null);assert.equal(p.customizationId,null);assert.ok(p.pricing?.jsonValue);
  assert.equal(transferJournal.get(row.request.identity).state,'completed');assert.equal(transferJournal.get(row.request.identity).result.shopifyProductId,p.id);
  assert.equal(orders.bindings().length,10);assert.equal(db.prepare('SELECT count(*) AS n FROM shop_product_binding_heads').get().n,10);assert.equal(db.prepare('SELECT count(*) AS n FROM form_shop_binding_personalization').get().n,10);assert.equal(db.prepare('SELECT count(*) AS n FROM catalog_live_order_approvals').get().n,1);
  assert.equal(events.at(-1),'template-unknown');assert.equal(writes.filter(w=>w.kind==='template'||w.kind==='customization_id').length,0);
  partial={id:p.id,pricing:copy(p.pricing),bindings:copy(orders.bindings()),heads:db.prepare('SELECT * FROM shop_product_binding_revisions WHERE cfg_id=? ORDER BY variant_gid').all(row.productId),catalog:db.prepare('SELECT * FROM catalog_live_order_approvals WHERE cfg_id=?').all(row.productId)};
 });
 await t.test('explicit reconcile completes six DRAFTs, 45 exact heads/prices and stored contracts before entry',async()=>{
  const result=await executeSixDrafts(review,{...context,action:'reconcile'});assert.equal(result.products.length,6);assert.equal(result.variants,45);assert.equal(products.size,6);
  assert.equal(db.prepare('SELECT count(*) AS n FROM shop_product_binding_heads').get().n,45);assert.equal(orders.bindings().length,45);
  assert.equal(db.prepare('SELECT count(*) AS n FROM form_shop_binding_personalization').get().n,45);assert.equal(db.prepare('SELECT count(*) AS n FROM catalog_live_order_approvals').get().n,6);
  assert.equal(writes.filter(w=>w.kind==='create').length,6);
  assert.ok(partial);assert.equal(result.products[0].shopifyProductId,partial.id);assert.equal(writes.filter(w=>w.kind==='create'&&w.id===partial.id).length,1);assert.deepEqual(products.get(partial.id).pricing,partial.pricing);
  assert.deepEqual(orders.bindings().filter(b=>b.productId===review.rows[0].productId),partial.bindings);
  assert.deepEqual(db.prepare('SELECT * FROM shop_product_binding_revisions WHERE cfg_id=? ORDER BY variant_gid').all(review.rows[0].productId),partial.heads);
  assert.deepEqual(db.prepare('SELECT * FROM catalog_live_order_approvals WHERE cfg_id=?').all(review.rows[0].productId),partial.catalog);
  assert.equal(result.products[0].bindingsCreated,0);assert.equal(result.products[0].assignmentsChanged,0);
  for(const p of products.values()){assert.equal(p.status,'DRAFT');assert.equal(p.publishedAt,null);assert.equal(p.templateSuffix,'konfi');assert.ok(events.indexOf('pricing:'+p.id)<events.indexOf('bind:'+p.id));assert.ok(events.indexOf('bind:'+p.id)<events.indexOf('entry:'+p.id));}
 });
 await t.test('completed replay performs no remote mutation and creates no new heads',async()=>{
  const before=writes.length,result=await executeSixDrafts(review,{...context,action:'reconcile'});assert.equal(writes.length,before);assert.equal(result.products.every(p=>p.bindingsCreated===0&&p.assignmentsChanged===0),true);
 });
 await t.test('changed remote price or ACTIVE status stops before writes',async()=>{
  const p=[...products.values()][0],before=writes.length,price=p.variants.nodes[0].price;p.variants.nodes[0].price='0.01';await assert.rejects(executeSixDrafts(review,{...context,action:'reconcile'}));p.variants.nodes[0].price=price;
  p.status='ACTIVE';await assert.rejects(executeSixDrafts(review,{...context,action:'reconcile'}));p.status='DRAFT';assert.equal(writes.length,before);
 });
 await t.test('existing conflicting price contract and unauthenticated principal cannot change products',async()=>{
  const p=[...products.values()][0],before=writes.length,old=p.pricing.jsonValue.extraMotifCents;p.pricing.jsonValue.extraMotifCents=170;
  await assert.rejects(executeSixDrafts(review,{...context,action:'reconcile'}),{code:'six_drafts_pricing_conflict'});p.pricing.jsonValue.extraMotifCents=old;
  await assert.rejects(executeSixDrafts(review,{...context,principal:{role:'customer',shopDomain:SHOP}}),{code:'six_drafts_principal'});assert.equal(writes.length,before);
 });
 await t.test('all six native heads are checked before the first remote write',async()=>{
  const before=writes.length,last=entries.at(-1).record;repository.save(last.id,{...last.document,name:last.document.name+' changed'},1);
  await assert.rejects(executeSixDrafts(review,context),{code:'six_drafts_drift'});assert.equal(writes.length,before);
 });
});
