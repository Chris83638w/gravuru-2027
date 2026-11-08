import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {makeProductDocument} from './product-model.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {prepareCartRequest,verifyCartResponse} from './storefront-cart.mjs';
import {capturePersonalization,personalizationAttributes} from './cart-personalization.mjs';
import {createStorefrontCartTransport} from './storefront-transport.mjs';
import {createCartHandoffJournal,createPersistentCartHandoff} from './cart-handoff-journal.mjs';
import {commercePrice} from '../configurator/variant-m/commerce-model.mjs';
import {personalizationForSnapshot} from './cart-personalization.mjs';
import {applyQuantityTier} from '../configurator/variant-m/contract.mjs';
import {MODULE_PROFILE_SCHEMA} from '../configurator/variant-m/module-profile.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

const shop='gravuru-synthetic.myshopify.com';
const modules=overrides=>({schema:MODULE_PROFILE_SCHEMA,id:'checked-module-policy',revision:1,modules:{options:true,designs:true,text:true,motifs:true,photo:true,logo:true,colors:false,...overrides}});
function fixture(t) {
  const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  delete config.acrylic;
  const p=config.profile;
  p.material={kind:'slate',color:'#41494b',thicknessMm:6}; p.processing={profileId:'slate-engraving'};
  p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
  const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));
  Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:70,w:30,h:8,rotation:0,acrylicFixed:false});
  p.designs=[{id:'test',name:'Synthetic',objects:[text]}];p.defaultDesignId='test';
  p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[
    {id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]},
    {id:'feet',label:'Silikon',priceCents:499,currency:'EUR',holes:[]}
  ]}];
  config.basePriceCents=2299;config.extraMotifCents=169;
  config.photo={enabled:true,mode:'upload-only',includedCount:0,extraPriceCents:999};
  config.localResources.photoExamples=[];config.localResources.photoPlaceholders=[];
  const record={id:'cfg_slate_synthetic',revision:1,status:'draft',document:makeProductDocument(config)};
  const m={id:'proof_slate',schema:'gravuru-native-review/v1',packageSha256:'b'.repeat(64),
    product:{id:record.id,revision:1,basePriceCents:3636,currency:'EUR'},
    selection:{options:{mounting:'none'},price:{additionalMotifs:2,chargedUploads:1,unitCents:3636,quantity:2,totalCents:7272}},
    productionReady:false,productionProfile:null};
  const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:'gid://shopify/Product/101',revision:30,currency:'EUR',variants:{301:2299},extraMotifCents:169,extraPhotoCents:999};
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const reopen=()=>createOrderIntake({database:db,snapshot:id=>{assert.equal(id,m.id);return structuredClone(m);}});
  const intake=reopen(),args={record,shopDomain:shop,variantId:'301',snapshotId:m.id,personalizationPricing:pricing};
  return {record,m,pricing,db,intake,args,reopen};
}
function response(offer) {
  const line=prepareCartRequest(offer).variables.input.lines[0];
  return {data:{cartCreate:{userErrors:[],warnings:[],cart:{id:'gid://shopify/Cart/synthetic',checkoutUrl:`https://${shop}/checkout/synthetic`,
    lines:{pageInfo:{hasNextPage:false},nodes:[{quantity:line.quantity,attributes:line.attributes,merchandise:{id:line.merchandiseId},
      cost:{amountPerQuantity:{amount:(offer.unitCents/100).toFixed(2),currencyCode:'EUR'},totalAmount:{amount:(offer.unitCents*offer.quantity/100).toFixed(2),currencyCode:'EUR'}}}]}}}}};
}
function offer(f) {const binding=f.intake.bind(f.args);return f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2});}

test('disabled motif choice retains all-motif source charges in native quote, cart and shop preparation',t=>{
 const f=fixture(t),config=f.record.document.config;
 config.moduleProfile=modules({motifs:false,photo:false,logo:false});config.motifCharge='all';
 const motif={id:'original-motif',type:'motif',motif:config.localResources.motifs.find(m=>!m.embeddedOnly).key,x:170,y:100,w:20,h:20,rotation:0,color:'#e8e9e4',customerEditable:true};
 config.profile.designs[0].objects.push(motif);
 f.record.document.elementRights.test[motif.id]={content:false,color:false,replace:true,move:true,scale:true,delete:true};
 const captured=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
 const state={designId:'test',objects:structuredClone(config.profile.designs[0].objects),mOptions:{mounting:'none'}};
 const price=commercePrice(config,state);assert.equal(price.additionalMotifs,0);assert.equal(price.chargedMotifs,1);assert.equal(price.unitCents,2468);
 const manifest={...f.m,product:{...f.m.product,basePriceCents:price.unitCents},selection:{price}};
 assert.equal(personalizationForSnapshot(captured,manifest).unitCents,2468);
 const preview=prepareShopProduct(f.record);assert.equal(preview.extras.motifCents,169);assert.match(preview.checks.find(c=>c.id==='pricingConnection').message,/Aufpreisbindung/);
 assert.throws(()=>personalizationForSnapshot(captured,{...manifest,selection:{price:{...price,additionalMotifs:1}}}),{code:'cart_personalization'});
 state.objects.pop();const removed=commercePrice(config,state);assert.equal(removed.chargedMotifs,0);assert.equal(removed.unitCents,2299);
});

test('legacy raster-logo charges remain orderable with photos off; disabling both uploads still rejects them',t=>{
 const f=fixture(t),config=f.record.document.config;
 config.photo.enabled=false;config.logo={enabled:true};config.moduleProfile=modules({photo:false});
 const state={designId:'test',objects:[...structuredClone(config.profile.designs[0].objects),{id:'local-logo',type:'image',x:170,y:100,w:20,h:20,rotation:0,uxUploadKind:'logo',uxUploadId:'logo-file'}],mOptions:{mounting:'none'}};
 const price=commercePrice(config,state);assert.equal(price.chargedUploads,1);assert.equal(price.chargedLogos,undefined);assert.equal(price.unitCents,3298);
 const manifest={...f.m,product:{...f.m.product,basePriceCents:price.unitCents},selection:{price}};
 const captured=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
 assert.equal(personalizationForSnapshot(captured,manifest).unitCents,3298);
 assert.equal(prepareShopProduct(f.record).extras.photoCents,999,'legacy combined-upload price remains visible for the connector');
 const off=structuredClone(captured);off.moduleProfile.modules.logo=false;assert.throws(()=>personalizationForSnapshot(off,manifest),{code:'cart_personalization'});
 config.moduleProfile.modules.logo=false;assert.equal(prepareShopProduct(f.record).extras.photoCents,0);
});

test('explicit logo-off module retains V2 revision and tariff while native zero-logo checkout survives binding/reopen',t=>{
 const f=fixture(t),c=f.record.document.config;
 c.profile.material.kind='steel';c.profile.material.thicknessMm=1.5;c.profile.processing.profileId='steel-engraving';c.photo.enabled=false;c.logo={enabled:false,vectorUpload:false,extraPriceCents:1299};c.moduleProfile=modules({photo:false,logo:false});
 Object.assign(f.pricing,{schema:'gravuru-personalization-pricing/v2',extraLogoCents:1299});
 const immutablePricing=structuredClone(f.pricing),price=commercePrice(c,{designId:'test',objects:structuredClone(c.profile.designs[0].objects),mOptions:{mounting:'none'}},2);
 assert.equal(price.chargedLogos,undefined);assert.equal(price.unitCents,2299);f.m.product.basePriceCents=price.unitCents;f.m.selection.price=price;
 const binding=f.intake.bind(f.args),order=f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2});
 assert.equal(order.unitCents,2299);assert.equal(order.personalization.logos,0);assert.equal(order.personalization.revision,'30');verifyCartResponse(response(order),order,shop);
 assert.equal(f.reopen().offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2}).personalization.logos,0);assert.deepEqual(f.pricing,immutablePricing);
 const captured=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
 for(const chargedLogos of [1,2,-1,'0',null])assert.throws(()=>personalizationForSnapshot(captured,{...f.m,selection:{price:{...price,chargedLogos}}}),{code:'cart_personalization'});
});

test('retained V2 is limited to explicit valid logo-off profiles; legacy and historical logo pricing stay strict',t=>{
 const f=fixture(t),c=f.record.document.config;c.profile.material.kind='steel';c.profile.processing.profileId='steel-engraving';c.photo.enabled=false;c.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 Object.assign(f.pricing,{schema:'gravuru-personalization-pricing/v2',extraLogoCents:1299});
 const historical=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
 const manifest={...f.m,product:{...f.m.product,basePriceCents:3598},selection:{price:{additionalMotifs:0,chargedUploads:0,chargedLogos:1,unitCents:3598,quantity:1,totalCents:3598}}};
 assert.equal(personalizationForSnapshot(historical,manifest).unitCents,3598);
 c.logo.enabled=false;c.logo.vectorUpload=false;assert.throws(()=>capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document}),{code:'cart_personalization'});
 c.moduleProfile=modules({photo:false,logo:false});const disabled=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});assert.equal(disabled.extraLogoCents,1299);assert.throws(()=>personalizationForSnapshot(disabled,manifest),{code:'cart_personalization'});
 assert.equal(personalizationForSnapshot(historical,manifest).unitCents,3598,'old snapshot remains independently orderable');
 for(const mutate of [p=>p.modules.logo='false',p=>delete p.modules.logo,p=>p.revision=0]){const bad=structuredClone(f.record.document);mutate(bad.config.moduleProfile);assert.throws(()=>capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:bad}));}
 for(const value of [0,1298,1300])assert.throws(()=>capturePersonalization({...f.pricing,extraLogoCents:value},{variantId:'301',baseCents:2299,document:f.record.document}),{code:'cart_personalization'});
});

test('enabled photos retain included-slot credit and charge only additional photos under a module profile',t=>{
 const f=fixture(t),config=f.record.document.config;config.moduleProfile=modules({logo:false});config.photo.includedCount=1;
 const original={id:'photo-slot',type:'photoSlot',fieldKey:'photo-original',x:170,y:100,w:20,h:20,rotation:0,photoShape:'rect',required:false};config.profile.designs[0].objects.push(original);
 const state={designId:'test',objects:[...structuredClone(config.profile.designs[0].objects.slice(0,-1)),{...original,uxUploadKind:'photo',uxUploadId:'included-photo'}],mOptions:{mounting:'none'}};
 const captured=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
 for(const expected of [0,1]){
  if(expected)state.objects.push({...original,id:'extra-photo',fieldKey:'photo-extra',uxUploadKind:'photo',uxUploadId:'extra-file'});
  const price=commercePrice(config,state);assert.equal(price.chargedUploads,expected);
  const manifest={...f.m,product:{...f.m.product,basePriceCents:price.unitCents},selection:{price}};
  assert.equal(personalizationForSnapshot(captured,manifest).unitCents,2299+expected*999);
 }
});

test('native shop path keeps an included design orderable and explains unbound extras without weakening binding checks',t=>{
 const f=fixture(t),binding=f.intake.bind({...f.args,snapshotId:undefined,personalizationPricing:undefined,options:{mounting:'none'}});
 assert.throws(()=>f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2}),error=>error.status===422&&error.code==='order_intake'&&/kostenpflichtige Änderung.*derzeit noch nicht bestellbar.*Gestaltung bleibt erhalten/.test(error.message));
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_offers').get().n,0);
 const original=structuredClone(f.m);f.m.product.id='cfg_foreign';
 assert.throws(()=>f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2}),/Prüfstand und Shop-\/Preisbindung/);
 Object.assign(f.m,original);f.m.product.basePriceCents=2299;Object.assign(f.m.selection.price,{additionalMotifs:0,chargedUploads:0,unitCents:2299,totalCents:4598});
 const o=f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2});assert.equal(o.unitCents,2299);assert.equal(o.personalization,undefined);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM form_order_offers').get().n,1);
});
test('V3 accessory price survives the real order-intake offer, persisted reopen and storefront verification',t=>{
 const f=fixture(t);f.record.document.config.profile.optionFields=[{id:'silikon',kind:'checkbox',label:'Silikon',priceCents:699}];
 f.pricing.schema='gravuru-personalization-pricing/v3';f.pricing.optionPrices={silikon:699};
 f.m.selection.fields=[{id:'silikon',kind:'checkbox',label:'Silikon',value:true,display:'ja',priceCents:699}];
 f.m.selection.price.fieldCents=699;f.m.selection.price.unitCents+=699;f.m.selection.price.totalCents+=1398;f.m.product.basePriceCents+=699;
 const binding=f.intake.bind(f.args),o=f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2});assert.equal(o.unitCents,4335);assert.equal(o.personalization.options,'silikon');
 const line=prepareCartRequest(o).variables.input.lines[0];assert(line.attributes.some(a=>a.key==='_gravuru_options'&&a.value==='silikon'));
 verifyCartResponse(response(o),o,shop);
 const again=f.reopen().offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2});assert.equal(again.unitCents,4335);assert.equal(again.personalization.options,'silikon');
});

test('complete-unit tiers use actual catalog prices, include photo, motif and mounting once, and round half a cent upwards',t=>{
 const f=fixture(t),config=f.record.document.config,tiers=[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}];
 config.quantityTiers=tiers;config.quantityTierScope='complete-unit';f.pricing.quantityTiers=structuredClone(tiers);f.pricing.quantityTierScope='complete-unit';
 const objects=[...config.profile.designs[0].objects,{id:'upload',type:'photoSlot',uxUploadId:'one',uxUploadKind:'photo'}];
 const state={objects,designId:'test',mOptions:{mounting:'none'}};
 const contract=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
 for(const [quantity,unit] of [[1,3298],[2,3100],[3,2968],[4,2968],[99,2968]]){
  const price=commercePrice(config,state,quantity);assert.equal(price.unitCents,unit);assert.equal(price.totalCents,unit*quantity);
  const m={...f.m,product:{...f.m.product,basePriceCents:unit},selection:{price}};assert.equal(personalizationForSnapshot(contract,m).unitCents,unit);
 }
 const withExtras={...state,objects:[...objects,{id:'added',type:'motif',motif:'synthetic'}],mOptions:{mounting:'feet'}};
 const p=commercePrice(config,withExtras,2);assert.equal(p.listUnitCents,2299+499+169+999);assert.equal(p.unitCents,3728);
 assert.equal(applyQuantityTier(5,{minQuantity:2,percentOff:10}),5);
 config.basePriceCents=5199;const actual=commercePrice(config,state,2);assert.equal(actual.listUnitCents,6198);assert.equal(actual.unitCents,5826,'no pilot base fallback');
 for(const n of [Infinity,Number.MAX_SAFE_INTEGER,-1])assert.throws(()=>applyQuantityTier(n,{minQuantity:2,percentOff:6}));
});
test('binding rejects missing scope, open tiers, different product rules and forged snapshot discount',t=>{
 const f=fixture(t),rules=[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}];
 Object.assign(f.record.document.config,{quantityTiers:rules,quantityTierScope:'complete-unit'});Object.assign(f.pricing,{quantityTiers:structuredClone(rules),quantityTierScope:'complete-unit'});
 const args={variantId:'301',baseCents:2299,document:f.record.document};
 for(const patch of [{quantityTierScope:undefined},{quantityTierScope:'before-photo'},{quantityTiers:[{minQuantity:2,percentOff:null}]},{quantityTiers:[{minQuantity:2,percentOff:5}]},{quantityTiers:[{minQuantity:2,unitCents:2000}]}])assert.throws(()=>capturePersonalization({...f.pricing,...patch},args));
 const c=capturePersonalization(f.pricing,args),price=commercePrice(f.record.document.config,{objects:[],designId:'test',mOptions:{mounting:'none'}},2),manifest={...f.m,product:{...f.m.product,basePriceCents:price.unitCents},selection:{price}};
 for(const patch of [{quantityTierScope:undefined},{quantityTier:{minQuantity:2,percentOff:5}},{listUnitCents:1},{quantityTierDiscountCents:1},{fieldCents:100},{backCents:100}])assert.throws(()=>personalizationForSnapshot(c,{...manifest,selection:{price:{...price,...patch}}}));
});

test('complete-unit uses each saved product family tier and keeps field/back charges in the editor calculation',t=>{
 const f=fixture(t),config=f.record.document.config,state={designId:'test',mOptions:{mounting:'none'},objects:[{id:'photo',type:'photoSlot',uxUploadId:'one',uxUploadKind:'photo'}]};config.quantityTierScope='complete-unit';
 config.quantityTiers=[{minQuantity:3,percentOff:5},{minQuantity:5,percentOff:10},{minQuantity:10,percentOff:15}];
 for(const [q,unit] of [[2,3298],[3,3133],[4,3133],[5,2968],[9,2968],[10,2803]])assert.equal(commercePrice(config,state,q).unitCents,unit);
 config.quantityTiers=[{minQuantity:5,percentOff:5},{minQuantity:10,percentOff:10},{minQuantity:25,percentOff:15}];
 for(const [q,unit] of [[3,3298],[5,3133],[10,2968],[25,2803]])assert.equal(commercePrice(config,state,q).unitCents,unit);
 config.quantityTiers=[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}];
 config.profile.optionFields=[{id:'extra',kind:'checkbox',label:'Zusatz',priceCents:700}];config.profile.surfaces=[{id:'front'},{id:'back',priceCents:350}];
 const p=commercePrice(config,{...state,mOptions:{...state.mOptions,extra:true},objects:[...state.objects,{id:'back-text',type:'text',surfaceId:'back'}]},2);
 assert.equal(p.fieldCents,700);assert.equal(p.backCents,350);assert.equal(p.listUnitCents,4348);assert.equal(p.unitCents,4087);assert.equal(p.totalCents,8174);
});

test('native slate offer pins shop revision, extras and private proof through reopening and signed test order',t=>{
  const f=fixture(t),o=offer(f),attributes=prepareCartRequest(o).variables.input.lines[0].attributes;
  assert.equal(o.unitCents,3636);assert.equal(o.personalization.revision,'30');assert.equal(attributes.length,5);
  assert.equal(verifyCartResponse(response(o),o,shop).totalCents,7272);
  const intake=f.reopen();assert.deepEqual(intake.resolveCartOffer({offerId:o.id,offerToken:o.property.value,snapshotId:f.m.id,shopDomain:shop}),o);
  const cfg={shopDomain:shop,apiVersion:'2026-07',secret:'synthetic-webhook-secret-only'};
  const payload={id:101,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:201,variant_id:301,quantity:2,price:'36.36',properties:attributes.map(a=>({name:a.key,value:a.value}))}]};
  const receive=(p,eventId='synthetic-slate-payment')=>{const raw=Buffer.from(JSON.stringify(p));return intake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',cfg.secret).update(raw).digest('base64'),'x-shopify-shop-domain':shop,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':eventId},cfg);};
  // E3: a changed price or a removed surcharge attribute rejects that position alone; a live order is still refused as a whole.
  for(const [i,change] of [p=>p.line_items[0].price='22.99',p=>p.line_items[0].properties.pop()].entries()){
    const copy=structuredClone(payload);change(copy);const r=receive(copy,'synthetic-slate-change-'+i);assert.equal(r.lines.length,0);assert.equal(r.errors[0].status,'fehler');assert.equal(intake.list().length,0);
  }
  assert.throws(()=>receive({...payload,test:false}),/Live/);assert.equal(intake.list().length,0);
  const result=receive(payload);assert.equal(result.lines[0].sourceSchema,'gravuru-native-review/v1');assert.equal(result.lines[0].totalCents,7272);
  assert.equal(result.lines[0].productionReady,false);assert.equal(result.lines[0].customerDownloadAllowed,false);assert.equal(receive(payload).duplicate,true);
  assert.throws(()=>f.db.exec("UPDATE form_offer_personalization SET document='{}'"),/immutable/);
  assert.throws(()=>f.db.exec('DELETE FROM form_shop_binding_personalization'),/immutable/);
});

test('native selection, quantity, contract and snapshot cannot drift even if prices match',t=>{
  const f=fixture(t),o=offer(f);
  assert.throws(()=>f.intake.bind({...f.args,personalizationPricing:{...f.pricing,revision:31}}),/anderen Preisvertrag/);
  assert.throws(()=>f.intake.bind({...f.args,personalizationPricing:undefined}),/Aufpreisbindung/);
  const binding=f.intake.bindings()[0];
  assert.throws(()=>f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:1}),/Menge/);
  f.m.selection.options.mounting='feet';assert.throws(()=>f.intake.offer({bindingId:binding.id,snapshotId:f.m.id,quantity:2}),/Ausführung/);
  f.m.selection.options.mounting='none';f.m.selection.price.additionalMotifs=3;
  assert.throws(()=>f.intake.resolveCartOffer({offerId:o.id,offerToken:o.property.value,snapshotId:f.m.id,shopDomain:shop}),/Aufpreisbindung/);
});

test('unverified prices, malformed counts and private URLs cannot become cart attributes',t=>{
  const f=fixture(t);
  for(const patch of [{enabled:false},{currency:'USD'},{revision:0},{extraMotifCents:170},{extraPhotoCents:998},{variants:{301:1}},{productId:'https://foreign.invalid'}]){
    assert.throws(()=>capturePersonalization({...f.pricing,...patch},{variantId:'301',baseCents:2299,document:f.record.document}));
  }
  const o=offer(f);
  for(const patch of [{motifs:201},{motifs:-1},{uploads:5},{uploads:1.5},{revision:'30\n'},{designReference:'https://private.invalid/token'},{secret:'no'}]){
    assert.throws(()=>personalizationAttributes({...o.personalization,...patch}));
  }
  for(const change of [r=>r.data.cartCreate.cart.lines.nodes[0].attributes.pop(),r=>r.data.cartCreate.cart.lines.nodes[0].attributes[1].value='0',r=>r.data.cartCreate.cart.lines.nodes[0].attributes.push(r.data.cartCreate.cart.lines.nodes[0].attributes[1])]){
    const r=response(o);change(r);assert.throws(()=>verifyCartResponse(r,o,shop));
  }
});

test('explicit tokenless transport preserves personalization through the persistent journal without resending',async t=>{
  const f=fixture(t),o=offer(f);let calls=0;
  const transport=createStorefrontCartTransport({shopDomain:shop,apiVersion:'2026-07',authentication:'tokenless'},{fetchImpl:async(_url,init)=>{
    calls++;assert.equal('Shopify-Storefront-Private-Token' in init.headers,false);
    assert.equal(init.headers['Shopify-Storefront-Buyer-IP'],'192.0.2.5');
    assert.deepEqual(JSON.parse(init.body).variables.input.lines[0].attributes,prepareCartRequest(o).variables.input.lines[0].attributes);
    return Response.json(response(o));
  }});
  const handoff=createPersistentCartHandoff({journal:createCartHandoffJournal({database:f.db}),transport,shopDomain:shop,apiVersion:'2026-07'});
  const context={principalId:'draft:synthetic',buyerIp:'192.0.2.5'};
  assert.equal((await handoff(o,context)).duplicate,false);assert.equal((await handoff(o,context)).duplicate,true);assert.equal(calls,1);
  await assert.rejects(handoff({...o,personalization:{...o.personalization,revision:'31'}},context),e=>e.code==='cart_changed');assert.equal(calls,1);
  for(const cfg of [{authentication:'tokenless',privateToken:'synthetic-token'},{authentication:'private-token'},{authentication:'automatic'},{}]){
    assert.throws(()=>createStorefrontCartTransport({shopDomain:shop,apiVersion:'2026-07',...cfg}),e=>e.code==='storefront_config');
  }
});

test('all-motif revision prices template motifs through the secured snapshot and rejects count drift',t=>{
 const f=fixture(t),config=f.record.document.config;config.motifCharge='all';
 const original={id:'template-motif',type:'motif',motif:'test-motif',x:50,y:50,w:10,h:10};config.profile.designs[0].objects.push(original);
 const contract=capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
 const price=commercePrice(config,{designId:'test',objects:[original],mOptions:{mounting:'none'}},2);
 assert.equal(price.additionalMotifs,0);assert.equal(price.chargedMotifs,1);assert.equal(price.unitCents,2468);
 const manifest={...f.m,product:{...f.m.product,basePriceCents:price.unitCents},selection:{price}};
 assert.equal(personalizationForSnapshot(contract,manifest).personalization.motifs,1);
 for(const chargedMotifs of [undefined,-1,0,1.5,201])assert.throws(()=>personalizationForSnapshot(contract,{...manifest,selection:{price:{...price,chargedMotifs}}}));
 const legacy={...contract};delete legacy.motifCharge;assert.throws(()=>personalizationForSnapshot(legacy,manifest));
});
