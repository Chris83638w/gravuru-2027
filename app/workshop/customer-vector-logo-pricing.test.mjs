import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {prepareConfig,saveDraft,readDraft,vectorLogoAllowed} from '../configurator/variant-m/contract.mjs';
import {commercePrice,selectCommerceVariant,variantKey} from '../configurator/variant-m/commerce-model.mjs';
import {uploadQuote,uploadAllowed,photoAvailableForDesign} from '../configurator/variant-m/ux-model.mjs';
import {makeProductDocument} from './product-model.mjs';
import {capturePersonalization,personalizationForSnapshot,personalizationAttributes} from './cart-personalization.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {prepareCartRequest,verifyCartResponse} from './storefront-cart.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {cartTransformRun} from '../../ops/shopify/checkout-image/cart_transform_run.mjs';
import {MODULE_PROFILE_SCHEMA,nativeModuleAvailability,applyModuleProfile} from '../configurator/variant-m/module-profile.mjs';
import {decisionHelp} from '../configurator/variant-m/decision-help.mjs';
import {asAcrylicUploadFamily} from './test-fixtures/acrylic-upload-source.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const metadata={version:'svg-black-v1',sourceSha256:'a'.repeat(64),outputSha256:'b'.repeat(64)};
const logo=(id='logo-1')=>({id,type:'image',x:110,y:70,w:20,h:20,rotation:0,uxUploadId:id,uxUploadKind:'logo',uxVectorLogo:{...metadata}});
const photo=id=>({id,type:'photoSlot',uxUploadId:id,uxUploadKind:'photo'});
function fixture(material='steel'){
 const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete c.acrylic;
 const p=c.profile;p.material={kind:'steel',color:'#a0a0a0',thicknessMm:1.5};p.processing={profileId:'steel-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
 const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:70,w:30,h:8,rotation:0,acrylicFixed:false});
 p.designs=[{id:'test',name:'Synthetic',objects:[text]}];p.defaultDesignId='test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]}]}];
 c.basePriceCents=2299;c.extraMotifCents=169;c.photo={enabled:false,mode:'upload-only',includedCount:1,extraPriceCents:999};c.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
 if(material==='acrylic')asAcrylicUploadFamily(c);
 const record={id:'cfg_logo_synthetic',revision:2,status:'draft',document:makeProductDocument(c)},config=record.document.config;
 const state={designId:'test',objects:[...structuredClone(config.profile.designs[0].objects),logo()],mOptions:{mounting:'none'}};
 const pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:'gid://shopify/Product/101',revision:31,currency:'EUR',variants:{301:2299},extraMotifCents:169,extraPhotoCents:999,extraLogoCents:1299};
 const price=commercePrice(config,state,2),manifest={id:'proof_logo',schema:'gravuru-native-review/v1',packageSha256:'c'.repeat(64),product:{id:record.id,revision:2,basePriceCents:price.unitCents,currency:'EUR'},selection:{options:{mounting:'none'},price},productionReady:false,productionProfile:null};
 return {record,config,state,pricing,manifest};
}
const capture=f=>capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document});
function transformInput(pricing,attributes,quantity=2){return {presentmentCurrencyRate:'1',cart:{lines:[{id:'synthetic',quantity,motifs:{value:attributes._gravuru_motifs},uploads:{value:attributes._gravuru_uploads},logos:{value:attributes._gravuru_logos},revision:{value:attributes._gravuru_revision},designFile:{value:attributes['Bearbeitbarer Entwurf']},merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/301',product:{id:pricing.productId,pricing:{jsonValue:pricing}}}}]}};}

test('new logo price is per visible upload, independent of included photos; old revisions retain their exact result',()=>{
 const f=fixture(),policy={includedCount:1,extraPriceCents:999},objects=[photo('photo-1'),photo('photo-2'),logo(),logo('logo-2')];
 assert.deepEqual(uploadQuote(objects,2,false,policy),{count:4,unitCents:2997,totalCents:5994});
 assert.deepEqual(uploadQuote(objects,2,false,policy,f.config.logo),{count:4,unitCents:3597,totalCents:7194,chargedUploads:1,chargedLogos:2,logoUnitCents:2598});
 const noPhotoCharge={includedCount:4,extraPriceCents:0};assert.equal(uploadQuote([logo()],1,false,noPhotoCharge,f.config.logo).unitCents,1299);
 objects[3].uxHidden=true;assert.equal(uploadQuote(objects,1,false,policy,f.config.logo).unitCents,2298);
 assert.equal(uploadQuote(objects,1,true,policy,f.config.logo).unitCents,3597);
 assert.throws(()=>uploadQuote([...objects,logo('five')],1,false,policy,f.config.logo),/Maximal vier/);
 assert.throws(()=>uploadQuote([logo('same'),photo('same')],1,false,policy,f.config.logo),/zugleich/);
 assert.throws(()=>uploadQuote([logo()],1,false,policy,{...f.config.logo,extraPriceCents:0}),/Preisregel/);
});

test('approved acrylic photo and SVG logo coexist through module, draft, price and checkout contracts',()=>{
 const f=fixture('acrylic'),before=structuredClone(f.config);
 const profile={schema:MODULE_PROFILE_SCHEMA,id:'approved-acrylic-uploads',revision:1,modules:{options:true,designs:true,text:true,motifs:true,photo:true,logo:true,colors:false}};
 const config=applyModuleProfile(f.config,profile);
 assert.equal(nativeModuleAvailability(config).photo,true);assert.equal(vectorLogoAllowed(config),true);
 assert.equal(uploadAllowed(config,'photo'),true);assert.equal(uploadAllowed(config,'logo'),true);assert.equal(photoAvailableForDesign(config,'test'),true);
 assert.equal(decisionHelp('photo',config).title,'Foto / Logo');assert.match(decisionHelp('photo',config).text,/Fotos kannst du separat/);
 const s=structuredClone(f.state);s.objects.push({...photo('own-photo'),x:40,y:70,w:20,h:20,rotation:0,photoShape:'rect',fieldKey:'photo-personal',required:false});
 const saved=saveDraft(config,s,s.mOptions,resources.fonts,resources.motifs),restored=readDraft(config,saved,resources.fonts,resources.motifs);
 assert.equal(restored.design.objects.filter(o=>o.uxUploadId).length,2);
 const price=commercePrice(config,s,2);assert.equal(price.chargedUploads,1);assert.equal(price.chargedLogos,1);assert.equal(price.unitCents,4597);
 const manifest={...f.manifest,product:{...f.manifest.product,basePriceCents:price.unitCents},selection:{...f.manifest.selection,price}};
 const result=personalizationForSnapshot(capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:{...f.record.document,config}}),manifest);
 const attrs=Object.fromEntries(personalizationAttributes(result.personalization).map(a=>[a.key,a.value]));
 const transformed=cartTransformRun(transformInput(f.pricing,attrs));assert.equal(transformed.operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'45.97');
 assert.deepEqual(f.config,before);
 const print=structuredClone(config);print.profile.processing.profileId='color-print';assert.throws(()=>prepareConfig(print),/Foto.*Produktquelle|Vektorlogos/);
 const small=applyModuleProfile(f.config,{...profile,modules:{...profile.modules,photo:false,logo:false}});
 assert.equal(uploadAllowed(small,'photo'),false);assert.equal(uploadAllowed(small,'logo'),false);assert.throws(()=>saveDraft(small,s,s.mOptions,resources.fonts,resources.motifs),/Fotomodul|Logomodul|Fotobereich|Vektorlogo/);
});

test('explicit steel revision preserves confirmed logo metadata in drafts and refuses raster/forged logos',()=>{
 const f=fixture(),before=structuredClone(f.config);
 assert.equal(vectorLogoAllowed(f.config),true);assert.deepEqual(prepareConfig(f.config),before);
 const saved=saveDraft(f.config,f.state,f.state.mOptions,resources.fonts,resources.motifs);
 assert.deepEqual(readDraft(f.config,saved,resources.fonts,resources.motifs).design.objects.at(-1).uxVectorLogo,metadata);
 for(const patch of [{extraPriceCents:999},{enabled:false},{extraPriceCents:12.99}])assert.throws(()=>prepareConfig({...f.config,logo:{...f.config.logo,...patch}}),/12,99/);
 const wrongMaterial=structuredClone(f.config);wrongMaterial.profile.material.kind='slate';wrongMaterial.profile.processing.profileId='slate-engraving';assert.throws(()=>prepareConfig(wrongMaterial),/Edelstahlgravur/);
 for(const mutate of [o=>delete o.uxVectorLogo,o=>o.uxVectorLogo.version='unknown',o=>o.uxVectorLogo.sourceSha256='no',o=>o.uxVectorLogo.extra='no',o=>o.uxLogoTint=true]){
  const state=structuredClone(f.state);mutate(state.objects.at(-1));assert.throws(()=>saveDraft(f.config,state,state.mOptions,resources.fonts,resources.motifs),/Vektorlogo|Gravurfassung/);
 }
 const legacy=structuredClone(f.config);delete legacy.logo.vectorUpload;delete legacy.logo.extraPriceCents;
 assert.throws(()=>saveDraft(legacy,f.state,f.state.mOptions,resources.fonts,resources.motifs),/Gravurfassung/);
 const oldState=structuredClone(f.state);delete oldState.objects.at(-1).uxVectorLogo;oldState.objects.at(-1).uxLogoTint=true;
 assert.doesNotThrow(()=>saveDraft(legacy,oldState,oldState.mOptions,resources.fonts,resources.motifs));
});

test('new product cannot use an old price contract or an unbound legacy checkout',()=>{
 const f=fixture(),before=structuredClone(f.record),contract=capture(f);
 assert.equal(contract.extraLogoCents,1299);assert.deepEqual(f.record,before);
 for(const patch of [{schema:'gravuru-personalization-pricing/v1'},{extraLogoCents:999},{extraLogoCents:undefined},{extraPhotoCents:0}])assert.throws(()=>capturePersonalization({...f.pricing,...patch},{variantId:'301',baseCents:2299,document:f.record.document}));
 const old=structuredClone(f.record);delete old.document.config.logo.vectorUpload;delete old.document.config.logo.extraPriceCents;
 assert.throws(()=>capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:old.document}));
 const b={priceMode:'base-only',variants:[{id:'301',key:variantKey({mounting:'none'}),priceCents:2299}]};
 assert.throws(()=>selectCommerceVariant(f.config,b,f.state),/derzeit noch nicht bestellbar/);
 const plan=prepareShopProduct(f.record);assert.equal(plan.extras.logoCents,1299);assert.equal(plan.shopReady,false);
});

test('new steel logo revisions cannot enable or sneak in customer photos; old photo contracts remain readable',()=>{
 const f=fixture(),forged={...f.config,photo:{...f.config.photo,enabled:true}};
 assert.equal(vectorLogoAllowed(forged),false);assert.throws(()=>prepareConfig(forged),/ohne Fotoupload/);
 assert.equal(uploadAllowed(forged,'photo'),false);assert.equal(photoAvailableForDesign(forged,'test'),false);
 const s=structuredClone(f.state);s.objects.push({id:'forbidden-photo',type:'photoSlot',x:80,y:80,w:20,h:20,rotation:0,photoShape:'rect',fieldKey:'photo-raster',required:false,uxUploadId:'raster',uxUploadKind:'photo'});
 assert.throws(()=>saveDraft(f.config,s,s.mOptions,resources.fonts,resources.motifs),/Fotobereich nicht freigegeben/);
 const old={...forged,logo:{enabled:true}};assert.equal(uploadAllowed(old,'photo'),true);assert.equal(photoAvailableForDesign(old,'test'),true);assert.doesNotThrow(()=>prepareConfig(old));
});

test('server snapshot and proposed transform agree on separate logo, photo and motif counts, including new complete-unit tiers',()=>{
 const f=fixture();f.config.photo.includedCount=1;
 const s={...f.state,objects:[...f.state.objects,photo('photo-1'),photo('photo-2'),{id:'motif',type:'motif',motif:'synthetic'}]};
 f.config.quantityTiers=[{minQuantity:2,percentOff:6}];f.config.quantityTierScope='complete-unit';f.pricing.quantityTiers=structuredClone(f.config.quantityTiers);f.pricing.quantityTierScope='complete-unit';
 for(const quantity of [1,2,3,99]){
  const price=commercePrice(f.config,s,quantity);assert.equal(price.chargedUploads,1);assert.equal(price.chargedLogos,1);assert.equal(price.listUnitCents,4766);
  const manifest={...f.manifest,product:{...f.manifest.product,basePriceCents:price.unitCents},selection:{price}},result=personalizationForSnapshot(capture(f),manifest);
  const attributes=Object.fromEntries(personalizationAttributes(result.personalization).map(a=>[a.key,a.value]));
  assert.equal(attributes._gravuru_logos,'1');assert.equal(attributes._gravuru_uploads,'1');
  const transformed=cartTransformRun(transformInput(f.pricing,attributes,quantity));assert.equal(transformed.operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,(price.unitCents/100).toFixed(2));
 }
});

test('malformed logo counts, stale contracts and silently omitted new attributes fail closed',()=>{
 const f=fixture(),contract=capture(f),result=personalizationForSnapshot(contract,f.manifest);
 for(const chargedLogos of [undefined,-1,0,1.5,5])assert.throws(()=>personalizationForSnapshot(contract,{...f.manifest,selection:{...f.manifest.selection,price:{...f.manifest.selection.price,chargedLogos}}}));
 const old={...contract};delete old.extraLogoCents;assert.throws(()=>personalizationForSnapshot(old,f.manifest));
 for(const logos of [undefined,-1,1.5,5])assert.throws(()=>personalizationAttributes({...result.personalization,logos}));
 const attrs=Object.fromEntries(personalizationAttributes(result.personalization).map(a=>[a.key,a.value])),input=transformInput(f.pricing,attrs);
 for(const logos of [undefined,'-1','1.5','5','01']){const copy=structuredClone(input);copy.cart.lines[0].logos={value:logos};assert.throws(()=>cartTransformRun(copy));}
 const stale=structuredClone(input);stale.cart.lines[0].merchandise.product.pricing.jsonValue.schema='gravuru-personalization-pricing/v1';assert.throws(()=>cartTransformRun(stale),/logo pricing/);
});

test('secured logo offer persists 12.99 surcharge and storefront response must preserve it',t=>{
 const f=fixture(),db=new DatabaseSync(':memory:');t.after(()=>db.close());
 const intake=createOrderIntake({database:db,snapshot:id=>{assert.equal(id,f.manifest.id);return structuredClone(f.manifest);}}),shopDomain='gravuru-synthetic.myshopify.com';
 const binding=intake.bind({record:f.record,shopDomain,variantId:'301',options:{mounting:'none'},personalizationPricing:f.pricing});
 const offer=intake.offer({bindingId:binding.id,snapshotId:f.manifest.id,quantity:2});assert.equal(offer.unitCents,3598);assert.equal(offer.personalization.logos,1);
 const line=prepareCartRequest(offer).variables.input.lines[0],response={data:{cartCreate:{userErrors:[],warnings:[],cart:{id:'gid://shopify/Cart/synthetic',checkoutUrl:`https://${shopDomain}/checkout/synthetic`,lines:{pageInfo:{hasNextPage:false},nodes:[{quantity:2,attributes:line.attributes,merchandise:{id:line.merchandiseId},cost:{amountPerQuantity:{amount:'35.98',currencyCode:'EUR'},totalAmount:{amount:'71.96',currencyCode:'EUR'}}}]}}}}};
 assert.equal(verifyCartResponse(response,offer,shopDomain).totalCents,7196);
 const changed=structuredClone(response);changed.data.cartCreate.cart.lines.nodes[0].cost.amountPerQuantity.amount='22.99';assert.throws(()=>verifyCartResponse(changed,offer,shopDomain));
 const missing=structuredClone(response);missing.data.cartCreate.cart.lines.nodes[0].attributes=missing.data.cartCreate.cart.lines.nodes[0].attributes.filter(a=>a.key!=='_gravuru_logos');assert.throws(()=>verifyCartResponse(missing,offer,shopDomain));
 const webhook={shopDomain,apiVersion:'2026-07',secret:'synthetic-logo-webhook-secret'},payload={id:101,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:201,variant_id:301,quantity:2,price:'35.98',properties:line.attributes.map(a=>({name:a.key,value:a.value}))}]};
 const receive=(value,id)=>{const raw=Buffer.from(JSON.stringify(value));return intake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',webhook.secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':webhook.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':id},webhook);};
 const removedLogo=structuredClone(payload);removedLogo.line_items[0].properties=removedLogo.line_items[0].properties.filter(p=>p.name!=='_gravuru_logos');assert.equal(receive(removedLogo,'logo-removed').errors.length,1);assert.equal(intake.list().length,0);
 const accepted=receive(payload,'logo-valid');assert.equal(accepted.lines[0].totalCents,7196);assert.equal(accepted.lines[0].productionReady,false);
});
