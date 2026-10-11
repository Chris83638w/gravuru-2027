import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createFormCustomerStore} from './form-customer-store.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument,resolveProduct} from './product-model.mjs';
import {createMerchantTestCart,MEMORIAL_TEST_CART,assertMemorialTestReview} from './merchant-test-cart.mjs';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
function fixture() {
  const c = makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  delete c.acrylic;
  const p = c.profile, text = structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
  Object.assign(text,{id:'name',text:'Test',size:5,x:110,y:70,w:20,h:8,rotation:0,customerEditable:true,acrylicFixed:false});
  p.material={kind:'slate',color:'#41494b',thicknessMm:6};
  p.processing={profileId:'slate-engraving'};
  p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
  p.features={...p.features,orderEnabled:false,productionConfirmed:false};
  p.designs=[{id:'test',name:'Synthetisches Prüfdesign',objects:[text]}];p.defaultDesignId='test';
  p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[
    {id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]},
    {id:'two',label:'Zwei Bohrungen',priceCents:299,currency:'EUR',holes:[{x:12,y:70,diameter:5},{x:208,y:70,diameter:5}]}
  ]}];
  c.basePriceCents=2299;c.extraMotifCents=169;c.photo={enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:999};
  c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
  return c;
}

function setup(t,patch={},settings=MEMORIAL_TEST_CART){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-merchant-cart-')),filename=path.join(dir,'private.sqlite');
 let store=createFormCustomerStore({filename}),calls=0,duringSend,unit='22.99',line;
 const config=fixture();
 const record={id:MEMORIAL_TEST_CART.productId,revision:settings.productRevision,status:'draft',document:makeProductDocument(config,{kind:'product'})};
 const resolved=resolveProduct(record.document,{quantity:1});
 const bytes=Buffer.from('synthetic review package'),manifest={schema:'gravuru-native-review/v1',id:'review_synthetic',createdAt:new Date().toISOString(),source:{draftId:'synthetic-source',draftRevision:1,designId:resolved.design.id},product:{id:record.id,revision:2,method:'engraving',material:{kind:'slate'},currency:'EUR',basePriceCents:2299},selection:{options:{mounting:'none'},price:resolved.price},status:'review-only',productionReady:false,order:null,payment:null,capabilities:{cart:false},blockers:['Gravurparameter und Probegravur sind nicht freigegeben.','Shopify-Bestellbindung und echte Maschinenabnahme sind nicht bestätigt.'],packageSha256:createHash('sha256').update(bytes).digest('hex'),...patch};
 const bundle={manifest,package:bytes,preview:Buffer.from('<svg/>'),contourPdf:bytes,photos:bytes};
 manifest.product.revision=settings.productRevision;
 const draft=store.acrylicDrafts.create(bundle),binding=store.orderIntake.bind({shopDomain:MEMORIAL_TEST_CART.shopDomain,variantId:'57509812633980',record,options:{mounting:'none'}});
 const repository={get:()=>record};
 const fetchImpl=async(url,options)=>{
  calls++;assert.equal(url,'https://gravuru-design.myshopify.com/api/2026-07/graphql.json');
  assert.equal(options.headers['Shopify-Storefront-Buyer-IP'],undefined);assert.equal(options.headers['Shopify-Storefront-Private-Token'],undefined);
  line=JSON.parse(options.body).variables.input.lines[0];assert.equal(line.merchandiseId,'gid://shopify/ProductVariant/57509812633980');assert.equal(line.quantity,1);
  if(duringSend)await duringSend();
  return Response.json({data:{cartCreate:{userErrors:[],warnings:[],cart:{id:'gid://shopify/Cart/synthetic',checkoutUrl:'https://gravuru-design.myshopify.com/checkout/synthetic?key=synthetic',lines:{pageInfo:{hasNextPage:false},nodes:[{quantity:1,attributes:line.attributes,merchandise:{id:line.merchandiseId},cost:{amountPerQuantity:{amount:unit,currencyCode:'EUR'},totalAmount:{amount:unit,currencyCode:'EUR'}}}]}}}}});
 };
 const submit=(input={draftId:draft.id,expectedRevision:1},context={draftToken:draft.token})=>createMerchantTestCart({drafts:store,repository,settings},{fetchImpl})(input,context);
 t.after(()=>{store.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {draft,record,manifest,bundle,binding,submit,filename,get store(){return store;},get calls(){return calls;},get line(){return line;},during(fn){duringSend=fn;},wrongPrice(){unit='0.01';},reopen(){store.close();store=createFormCustomerStore({filename});}};
}
test('merchant test cart preserves production blockers and reuses one offer and cart after restart',async t=>{
 const f=setup(t),before=structuredClone(f.manifest),result=await f.submit();
 assert.equal(result.totalCents,2299);assert.equal(result.testOnly,true);assert.equal(result.productionReady,false);assert.equal(result.paymentConfirmed,false);
 f.reopen();assert.deepEqual(await f.submit(),{...result,duplicate:true});assert.equal(f.calls,1);assert.deepEqual(f.store.review(f.manifest.id).manifest,before);
 const db=new DatabaseSync(f.filename,{readOnly:true});try{assert.equal(db.prepare('SELECT count(*) AS n FROM form_order_offers').get().n,1);assert.ok(!JSON.stringify(db.prepare('SELECT * FROM form_order_offers').all()).includes(f.draft.token));}finally{db.close();}
});
test('capability, revision, request fields and archived product are enforced before sending',async t=>{
 const f=setup(t);
 for(const draftToken of [undefined,'','f'.repeat(64),['f'.repeat(64)]])await assert.rejects(f.submit(undefined,{draftToken}),e=>e.status===404);
 await assert.rejects(f.submit({draftId:f.draft.id,expectedRevision:2}),e=>e.code==='test_cart_stale');
 for(const field of ['quantity','unitCents','variantId','shopDomain','reviewPolicy','buyerIp','offerToken'])await assert.rejects(f.submit({draftId:f.draft.id,expectedRevision:1,[field]:'override'}),e=>e.code==='test_cart_fields');
 f.record.status='archived';await assert.rejects(f.submit(),e=>e.code==='test_cart_product');assert.equal(f.calls,0);
});
test('unknown blockers or different product, material and release claims never qualify',()=>{
 const base={schema:'gravuru-native-review/v1',product:{id:MEMORIAL_TEST_CART.productId,revision:2,method:'engraving',material:{kind:'slate'},currency:'EUR'},status:'review-only',productionReady:false,order:null,payment:null,capabilities:{cart:false},blockers:['Gravurparameter und Probegravur sind nicht freigegeben.','Shopify-Bestellbindung und echte Maschinenabnahme sind nicht bestätigt.']};
 assert.doesNotThrow(()=>assertMemorialTestReview(base));
 for(const patch of [{blockers:[]},{blockers:[...base.blockers,'Other failure']},{product:{...base.product,revision:1}},{product:{...base.product,material:{kind:'acrylic'}}},{productionReady:true},{order:{}},{capabilities:{cart:true}}])assert.throws(()=>assertMemorialTestReview({...base,...patch}),e=>e.code==='test_cart_review');
 assert.throws(()=>createMerchantTestCart({settings:{...MEMORIAL_TEST_CART,mode:'public'}}),e=>e.code==='test_cart_disabled');
});
test('default draft handoff still blocks this test-only manufacturing review',async t=>{
 const f=setup(t),offer=f.store.orderIntake.offer({bindingId:f.binding.id,snapshotId:f.manifest.id,quantity:1});
 const submit=createDraftCartHandoff({drafts:f.store,config:{shopDomain:MEMORIAL_TEST_CART.shopDomain,apiVersion:'2026-07',authentication:'tokenless'}},{fetchImpl:()=>{throw Error('must not send');}});
 await assert.rejects(submit({draftId:f.draft.id,expectedRevision:1,snapshotId:f.manifest.id,offerId:offer.id,offerToken:offer.property.value},{draftToken:f.draft.token,buyerIp:'192.0.2.1'}),e=>e.code==='cart_blocked');
});
test('network uncertainty and price mismatch stay blocked across restart without a second cart',async t=>{
 for(const failure of ['network','price']){
  const f=setup(t);if(failure==='network')f.during(()=>{throw Error('synthetic transport failure');});else f.wrongPrice();
  await assert.rejects(f.submit());f.reopen();await assert.rejects(f.submit(),e=>e.code==='cart_review');assert.equal(f.calls,1);
 }
});
test('draft changes during transport suppress the stale checkout capability',async t=>{
 const f=setup(t);f.during(()=>f.store.acrylicDrafts.save(f.draft.id,f.draft.token,1,{...f.bundle,manifest:{...f.manifest,id:'review_synthetic_new',source:{...f.manifest.source,draftRevision:2}}}));
 await assert.rejects(f.submit(),e=>e.code==='cart_stale');assert.equal(f.calls,1);
});
test('signed paid test order consumes the offer while production and customer downloads remain blocked',async t=>{
 const f=setup(t);await f.submit();const secret='synthetic-webhook-secret';
 const raw=Buffer.from(JSON.stringify({id:123,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:234,variant_id:57509812633980,quantity:1,price:'22.99',properties:f.line.attributes.map(a=>({name:a.key,value:a.value}))}]}));
 const result=f.store.orderIntake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':MEMORIAL_TEST_CART.shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'synthetic-merchant-cart-event'},{...MEMORIAL_TEST_CART,secret});
 assert.equal(result.lines.length,1);assert.equal(result.lines[0].productionReady,false);assert.equal(result.lines[0].customerDownloadAllowed,false);
 await assert.rejects(f.submit(),/bereits zu einer Bestellung/);assert.equal(f.calls,1);
});

test('explicit revision pin enables only the checked product revision and survives restart',async t=>{
 const settings={...MEMORIAL_TEST_CART,productRevision:4},f=setup(t,{},settings);
 assert.throws(()=>assertMemorialTestReview(f.manifest),e=>e.code==='test_cart_review');
 assert.doesNotThrow(()=>assertMemorialTestReview(f.manifest,4));
 const result=await f.submit();assert.equal(result.testOnly,true);assert.equal(result.totalCents,2299);
 f.reopen();assert.equal((await f.submit()).duplicate,true);assert.equal(f.calls,1);
 settings.productRevision=5;await assert.rejects(f.submit(),e=>e.code==='test_cart_product');assert.equal(f.calls,1);
 for(const productRevision of [undefined,null,'4',0,1,2.5,Infinity,Number.MAX_SAFE_INTEGER+1])
  assert.throws(()=>createMerchantTestCart({settings:{...MEMORIAL_TEST_CART,productRevision}}),e=>e.code==='test_cart_disabled');
 for(const patch of [{shopDomain:'other.myshopify.com'},{apiVersion:'2026-10'},{productId:'other'},{anything:true}])
  assert.throws(()=>createMerchantTestCart({settings:{...MEMORIAL_TEST_CART,productRevision:4,...patch}}),e=>e.code==='test_cart_disabled');
});
