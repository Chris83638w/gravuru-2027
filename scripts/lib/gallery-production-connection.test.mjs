import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {planFamilyFormats,blankDesignId} from '../../app/workshop/katalog-family-formats.mjs';
import {makeProductDocument} from '../../app/workshop/product-model.mjs';
import {prepareShopProduct} from '../../app/workshop/shop-preparation.mjs';
import {syncHash} from '../../app/workshop/gallery-shop-sync-native.mjs';
import {createProductionModulePreflight,createProductionModuleManagementConfig,createProductionModuleLibraryConfig,moduleOnlyProductionMapping} from './gallery-production-connection.mjs';
import {createGalleryProductionShopifyRead} from './gallery-production-shopify-read.mjs';
import {capturePersonalization} from '../../app/workshop/cart-personalization.mjs';

let source;
async function fixture(){
 if(!source){
  const family=JSON.parse(fs.readFileSync(new URL('../fixtures/steel-shopify-options/family.json',import.meta.url))),fonts=JSON.parse(fs.readFileSync(new URL('../../app/designs/aosu-labrador/assets/michroma-vectors.json',import.meta.url))),size=family.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
  const katalog={families:new Map([[family.id,family]]),lines:new Map([['proof',{id:'proof',name:'Test',families:[family.id],subcategories:[{id:'normal',name:'Test',themeId:'familie'}]}]]),designs:{masters:[]},theme:()=>null,fontResources:async ids=>({fonts:Object.fromEntries(ids.map(id=>[id,fonts[id]])),missing:ids.filter(id=>!fonts[id])})};
  const {config,report}=await planFamilyFormats(katalog,'proof','normal',{shopProduct:{sizeKey:size.key,themeId:'familie',defaultDesignId:blankDesignId(size),groessenWahl:'alle',vorlagen:'leer'}});
  assert.deepEqual(report.blocked,[]);source=makeProductDocument(JSON.parse(JSON.stringify(config)),{name:'Synthetic production connection test'});
 }
 const document=structuredClone(source),record={id:'cfg_00000000-0000-4000-8000-000000000001',revision:4,status:'draft',document,metadata:{}};
 const shopDomain='test-module-connection.myshopify.com',shopifyProductId='gid://shopify/Product/900001',prepared=prepareShopProduct(record);
 const documentSha256=syncHash(document);
 const heads=prepared.variants.map((variant,i)=>({tenantId:'test',storeId:'acryl',shopDomain,shopifyProductId,shopifyVariantId:`gid://shopify/ProductVariant/${910000+i}`,assignmentRevision:2,bindingId:`binding-${i}`,productId:record.id,productRevision:4,options:variant.options,unitCents:variant.priceCents,documentSha256}));
 const expected={tenantId:'test',storeId:'acryl',shopDomain,shopifyProductId,productId:record.id,revision:4,documentSha256:syncHash(document),originalIds:document.config.familyFormats.designs.map(d=>d.katalog.designId),originalCount:80,sizeCount:80,variantCount:404,shopifyVariantIds:heads.map(h=>h.shopifyVariantId)};
 const state={record,heads,approvals:Array(404).fill(true),calls:[],hook:null,time:Date.parse('2026-11-08T15:00:00Z')};
 const pricing=JSON.parse(JSON.stringify({schema:'gravuru-personalization-pricing/v2',enabled:true,productId:shopifyProductId,revision:2,currency:'EUR',variants:Object.fromEntries(heads.map(h=>[h.shopifyVariantId.split('/').at(-1),h.unitCents])),extraMotifCents:document.config.extraMotifCents,extraPhotoCents:document.config.photo.extraPriceCents,extraLogoCents:1299,quantityTiers:document.config.quantityTiers,quantityTierScope:document.config.quantityTierScope}));
 const nodes=heads.map(h=>({id:h.shopifyVariantId,price:(h.unitCents/100).toFixed(2),sku:'synthetic',selectedOptions:[],inventoryItem:{id:'synthetic',tracked:false}}));
 const fetchImpl=async(url,request)=>{
  const {query,variables}=JSON.parse(request.body);state.calls.push({url,query,variables});await state.hook?.();
  const next=query.startsWith('query GallerySyncVariants');
  const product={id:shopifyProductId,updatedAt:'2026-11-08T14:00:00Z',title:'Synthetic',handle:'synthetic',status:'ACTIVE',descriptionHtml:'',seo:{},options:[],variants:{nodes:next?nodes.slice(250):nodes.slice(0,250),pageInfo:{hasNextPage:!next,endCursor:next?null:'page-2'}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:null,pricing:{jsonValue:pricing}};
  return new Response(JSON.stringify({data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product}}),{status:200,headers:{'Content-Type':'application/json','x-shopify-api-version':'2026-07'}});
 };
 state.contracts=heads.map(h=>capturePersonalization(pricing,{variantId:h.shopifyVariantId.split('/').at(-1),baseCents:h.unitCents,document}));
 const workshop={tenantId:'test',sessionContext:{shopDomain},repository:{tenantId:'test',get:()=>state.record},orderIntake:{bindingPricing:id=>state.contracts[heads.findIndex(h=>h.bindingId===id)]}};
 const options={targetWorkshop:workshop,readBindings:()=>state.heads,readApprovals:()=>state.approvals,shopify:{shopDomain,apiVersion:'2026-07',getAccessToken:async()=> 'synthetic-token-not-real',fetchImpl},expected,clock:()=>state.time};
 return {state,options,pricing,nodes,workshop};
}

test('read-only real native 404 preparation uses existing GraphQL pagination and preserves all formats',async()=>{
 const f=await fixture(),before=JSON.stringify(f.state.record),api=createProductionModulePreflight(f.options),proof=await api.run();
 assert.deepEqual(proof.counts,{originals:80,sizes:80,bindings:404});assert.equal(proof.shopifyWrites,0);assert.equal(proof.nativeWrites,0);
 assert.equal(f.state.calls.length,2);assert.ok(f.state.calls.every(c=>c.query.startsWith('query ')));assert.equal(JSON.stringify(f.state.record),before);
 const external=api.expected;external.shopifyVariantIds=[];assert.equal(api.expected.shopifyVariantIds.length,404);
});
test('preflight rejects a native head change during the actual remote read phase',async()=>{
 const f=await fixture();let changed=false;f.state.hook=()=>{if(!changed){f.state.heads[0].assignmentRevision++;changed=true;}};
 await assert.rejects(createProductionModulePreflight(f.options).run(),{code:'module_connection_source_changed'});
});
test('preflight rejects changed prices, missing approval and wrong document revision',async()=>{
 const f=await fixture();f.nodes[0].price='0.01';await assert.rejects(createProductionModulePreflight(f.options).run(),{code:'module_connection_remote_price'});
 f.state.approvals[0]=false;await assert.rejects(createProductionModulePreflight(f.options).run(),{code:'module_connection_catalog_approval'});
 f.state.record.revision=5;await assert.rejects(createProductionModulePreflight(f.options).run(),{code:'module_connection_target_changed'});
});
test('private module-only mount uses exact original source registry, no design alias, no writes',async()=>{
 const f=await fixture(),api=createProductionModulePreflight(f.options),profile={id:'saved-existing-profile',revision:2,sha256:'a'.repeat(64)},sourceRegistry={targets(){return[];},scopes(){return[];},offeringFor(){}};
 const context={sourceWorkshop:{tenantId:'test',configureModuleManagement(args){assert.equal(args.sourceRegistry,sourceRegistry);return{profiles:{get:()=>profile}};}},sourceRegistry,sourceApproval:()=>({approved:false}),csrfToken:'synthetic'};let captured;
 const config=await createProductionModuleManagementConfig({preflight:api,targetWorkshop:f.workshop,createHost:args=>(captured=args,{handle(){},close(){}}),mappingId:'existing-steel-modules',label:'Steel modules',moduleUpdate:{id:profile.id,revision:2,sourceRevision:4},journalFilename:path.resolve('not-created-test-journal.sqlite'),clock:()=>f.state.time});
 config.connect(context);assert.equal(captured.sourceRegistry,sourceRegistry);assert.equal(captured.executionEnabled,false);assert.equal(captured.writesEnabled,false);
 assert.equal(captured.targets[0].kind,'module-profile');for(const key of ['source','designs','media'])assert.equal(key in captured.targets[0],false);
 assert.equal(captured.targets[0].shopifyVariantIds.length,404);assert.equal(captured.targets[0].target.designId,f.state.record.document.config.profile.defaultDesignId);
 profile.revision=3;assert.throws(()=>config.connect(context),{code:'module_connection_profile_changed'});
});
test('read adapter blocks a mutation before credentials/network and redacts transport errors',async()=>{
 let reads=0;const connection=createGalleryProductionShopifyRead({shopDomain:'test.myshopify.com',apiVersion:'2026-07',getAccessToken:async()=>{reads++;return'secret';},fetchImpl:async()=>{throw Error('secret');}});
 await assert.rejects(connection.graphql('mutation GallerySyncRelease($x:ID!){x}',{id:'gid://shopify/Product/1'}),{code:'gallery_connection_read_only'});assert.equal(reads,0);
 for(const query of ['query GallerySyncProduct($id:ID!){orders(first:1){nodes{email}}}',
   'query GallerySyncVariants($id:ID!){customers(first:1){nodes{email}}}',
   'query GallerySyncProduct($id:ID!){__schema{types{name}}}']){
  await assert.rejects(connection.graphql(query,{id:'gid://shopify/Product/1'}),{code:'gallery_connection_read_only'});
  assert.equal(reads,0,'an allowed operation name never authorizes a different query');
 }
 await assert.rejects(connection.transport.inspect({shopifyProductId:'gid://shopify/Product/1'}),error=>error.code==='gallery_connection_read_failed'&&!error.message.includes('secret'));
});
test('module-only mapping rejects invented or duplicated variant identities',async()=>{
 const f=await fixture();assert.throws(()=>moduleOnlyProductionMapping({id:'test',label:'test',targetRecord:f.state.record,shopifyProductId:f.options.expected.shopifyProductId,shopifyVariantIds:['unknown'],moduleUpdate:{id:'profile',revision:1,sourceRevision:4}}),{code:'module_connection_mapping'});
});

test('production library reads actual profiles only after the real registry is connected',async()=>{
 const f=await fixture(),api=createProductionModulePreflight(f.options),profiles=[],sourceRegistry={targets(){return[];},scopes(){return[];},offeringFor(){}};
 let registrations=0,captured;
 const context={sourceWorkshop:{tenantId:'test',configureModuleManagement(args){registrations++;assert.equal(args.sourceRegistry,sourceRegistry);return{profiles:{list:()=>structuredClone(profiles)}};}},sourceRegistry,sourceApproval:()=>({approved:false})};
 const config=await createProductionModuleLibraryConfig({preflight:api,targetWorkshop:f.workshop,createHost:args=>(captured=args,{handle(){},close(){}}),sourceRevision:4,journalFilename:path.resolve('not-created-test-journal.sqlite'),clock:()=>f.state.time});
 assert.equal(registrations,0);config.connect(context);assert.equal(registrations,1);assert.deepEqual(captured.targets(),[]);
 profiles.push({id:'actual-saved-profile',revision:3,document:{name:'Mit Logo'}});
 const [mapping]=captured.targets();assert.equal(mapping.moduleUpdate.id,'actual-saved-profile');assert.equal(mapping.moduleUpdate.revision,3);assert.equal(mapping.shopifyVariantIds.length,404);
 assert.equal(mapping.source,undefined);assert.equal(mapping.designs,undefined);assert.equal(captured.writesEnabled,false);assert.equal(captured.executionEnabled,false);
});

test('preflight compares immutable native personalization, including changes during remote reads',async()=>{
 const missing=await fixture();missing.state.contracts[0]=null;
 await assert.rejects(createProductionModulePreflight(missing.options).run(),{code:'module_connection_native_pricing_missing'});
 const changed=await fixture();changed.state.contracts[0].extraLogoCents=999;
 await assert.rejects(createProductionModulePreflight(changed.options).run(),{code:'module_connection_native_pricing_changed'});
 const racing=await fixture();let changedOnce=false;racing.state.hook=()=>{if(!changedOnce){racing.state.contracts[0].revision='1';changedOnce=true;}};
 await assert.rejects(createProductionModulePreflight(racing.options).run(),{code:'module_connection_source_changed'});
 const history=await fixture();history.pricing.history=[{...structuredClone(history.pricing),revision:1}];history.state.contracts[0].revision='1';
 await createProductionModulePreflight(history.options).run();
});
