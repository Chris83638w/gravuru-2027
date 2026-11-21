// Chris 21.11.2026, 15:22 Uhr: Die sichtbare Zeilenangabe „Bearbeitbarer Entwurf: gravuru:proof_…“ soll für Kunden
// verschwinden. Der Entwurfsnachweis steht dafür unter dem privaten Schlüssel `_gravuru_entwurf`; der Wert bleibt derselbe.
// Geprüft wird hier der Server: Schreiben (nur mit Schalter und nur für Speicher, deren Bestelleingang es annimmt),
// Rücklesen im Bestelleingang (beide Schlüssel), der Schalter am Start und die Übereinstimmung mit den Funktionsquellen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHmac} from 'node:crypto';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {commercePrice} from '../configurator/variant-m/commerce-model.mjs';
import {makeProductDocument} from './product-model.mjs';
import {capturePersonalization,personalizationForSnapshot,personalizationAttributes,personalizationAttributesMatch,DESIGN_REFERENCE_KEY,PRIVATE_DESIGN_REFERENCE_KEY} from './cart-personalization.mjs';
import {createOrderIntake} from './order-intake.mjs';
import {prepareCartRequest,verifyCartResponse,cartLineInput,fieldAttributes} from './storefront-cart.mjs';
import {writesPrivateDesignReference} from './theme-cart.mjs';
import {createShopEntry} from './shop-entry.mjs';
import {customerIntegrationFromEnv} from './acryl-employee-host.mjs';
import {createConfiguratorIntegration} from './configurator-integration.mjs';
import {cartTransformRun,rejectedPricingLines} from '../../ops/shopify/entwurf-privat-release/preis/src/master-release/cart_transform_run.mjs';
import {cartValidationsGenerateRun} from '../../ops/shopify/entwurf-privat-release/pruefung/src/cart_validation_run.mjs';

const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const metadata={version:'svg-black-v1',sourceSha256:'a'.repeat(64),outputSha256:'b'.repeat(64)};
// Synthetisches Edelstahlprodukt mit Logoaufpreis wie in customer-vector-logo-pricing.test.mjs (Preisvertrag V2).
function fixture(){
 const c=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));delete c.acrylic;
 const p=c.profile;p.material={kind:'steel',color:'#a0a0a0',thicknessMm:1.5};p.processing={profileId:'steel-engraving'};
 p.geometry={width:220,height:140,shape:'rect',cornerRadiusMm:0,safeMarginMm:0,holes:[]};
 const text=structuredClone(p.designs[0].objects.find(o=>o.type==='text'));Object.assign(text,{id:'name',text:'Synthetic',size:5,x:110,y:70,w:30,h:8,rotation:0,acrylicFixed:false});
 p.designs=[{id:'test',name:'Synthetic',objects:[text]}];p.defaultDesignId='test';
 p.optionGroups=[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'none',values:[{id:'none',label:'Ohne',priceCents:0,currency:'EUR',holes:[]}]}];
 c.basePriceCents=2299;c.extraMotifCents=169;c.photo={enabled:false,mode:'upload-only',includedCount:1,extraPriceCents:999};c.logo={enabled:true,vectorUpload:true,extraPriceCents:1299};
 c.localResources.photoExamples=[];c.localResources.photoPlaceholders=[];
 const record={id:'cfg_private_reference',revision:2,status:'draft',document:makeProductDocument(c)},config=record.document.config;
 const state={designId:'test',objects:[...structuredClone(config.profile.designs[0].objects),{id:'logo-1',type:'image',x:110,y:70,w:20,h:20,rotation:0,uxUploadId:'logo-1',uxUploadKind:'logo',uxVectorLogo:{...metadata}}],mOptions:{mounting:'none'}};
 const pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId:'gid://shopify/Product/101',revision:31,currency:'EUR',variants:{301:2299},extraMotifCents:169,extraPhotoCents:999,extraLogoCents:1299};
 const price=commercePrice(config,state,2),manifest={id:'proof_private_reference',schema:'gravuru-native-review/v1',packageSha256:'c'.repeat(64),product:{id:record.id,revision:2,basePriceCents:price.unitCents,currency:'EUR'},selection:{options:{mounting:'none'},price},productionReady:false,productionProfile:null};
 return {record,pricing,manifest};
}
const reference='gravuru:proof_private_reference:'+'c'.repeat(64),shopDomain='gravuru-synthetic.myshopify.com';
const personalization=()=>{const f=fixture();return personalizationForSnapshot(capturePersonalization(f.pricing,{variantId:'301',baseCents:2299,document:f.record.document}),f.manifest).personalization;};

test('schreiben: ohne Angabe der bisherige sichtbare Schlüssel, mit ausdrücklichem true der private – Wert und alle übrigen Angaben gleich',()=>{
 const value=personalization(),visible=personalizationAttributes(value),hidden=personalizationAttributes(value,{privateDesignReference:true});
 assert.deepEqual([DESIGN_REFERENCE_KEY,PRIVATE_DESIGN_REFERENCE_KEY],['Bearbeitbarer Entwurf','_gravuru_entwurf']);
 assert.deepEqual(visible.at(-1),{key:'Bearbeitbarer Entwurf',value:reference});assert.deepEqual(hidden.at(-1),{key:'_gravuru_entwurf',value:reference});
 assert.deepEqual(hidden.slice(0,-1),visible.slice(0,-1));assert.deepEqual(visible.map(a=>a.key),['_gravuru_motifs','_gravuru_uploads','_gravuru_logos','_gravuru_revision','Bearbeitbarer Entwurf']);
 assert.deepEqual(personalizationAttributes(value,{}),visible);assert.deepEqual(personalizationAttributes(value,{privateDesignReference:false}),visible);
 // Kein stilles Einschalten durch einen beliebigen Wert; ohne Aufpreisangaben bleibt die Liste in beiden Fällen leer.
 for(const bad of ['enabled',1,null,{}])assert.throws(()=>personalizationAttributes(value,{privateDesignReference:bad}),{code:'cart_personalization'});
 assert.deepEqual(personalizationAttributes(undefined,{privateDesignReference:true}),[]);
 // Mit privatem Schlüssel trägt die Zeile aus dieser Liste keinen einzigen für Kunden sichtbaren Schlüssel mehr.
 assert.deepEqual(hidden.filter(a=>!a.key.startsWith('_')),[]);
 // Der sichtbare Name bleibt für Zusatzangaben gesperrt, der private ist es über die Unterstrich-Regel.
 for(const label of ['Bearbeitbarer Entwurf','_gravuru_entwurf'])assert.throws(()=>fieldAttributes([{label,value:reference}]),/Ungültige Zusatzangaben/);
});

test('rücklesen: der Nachweis gilt unter dem privaten oder dem sichtbaren Schlüssel; jeder vorhandene Wert muss der erwartete sein',()=>{
 const value=personalization(),base=Object.fromEntries(personalizationAttributes(value).slice(0,-1).map(a=>[a.key,[a.value]]));
 const match=extra=>{const line={...base,...extra};return personalizationAttributesMatch(value,key=>line[key]||[]);};
 assert.equal(match({'Bearbeitbarer Entwurf':[reference]}),true,'ältere Zeile');
 assert.equal(match({_gravuru_entwurf:[reference]}),true,'neue Zeile');
 assert.equal(match({'Bearbeitbarer Entwurf':[reference],_gravuru_entwurf:[reference]}),true,'beide gleich');
 const other='gravuru:proof_other:'+'d'.repeat(64);
 for(const [extra,why] of [[{},'kein Nachweis'],[{_gravuru_entwurf:[other]},'falscher Wert privat'],[{'Bearbeitbarer Entwurf':[other]},'falscher Wert sichtbar'],
   [{'Bearbeitbarer Entwurf':[reference],_gravuru_entwurf:[other]},'beide verschieden'],[{'Bearbeitbarer Entwurf':[other],_gravuru_entwurf:[reference]},'beide verschieden'],
   [{_gravuru_entwurf:[reference,reference]},'doppelt'],[{'Bearbeitbarer Entwurf':[reference,reference]},'doppelt'],[{_gravuru_entwurf:['']},'leer'],
   [{_gravuru_entwurf:[reference],_gravuru_logos:[]},'andere Angabe fehlt'],[{_gravuru_entwurf:[reference],_gravuru_revision:['30']},'andere Angabe geändert'],[{_gravuru_entwurf:[reference],_gravuru_motifs:['0','0']},'andere Angabe doppelt']])
  assert.equal(match(extra),false,why);
 assert.equal(personalizationAttributesMatch(undefined,()=>[]),true,'ohne Aufpreisvertrag wird hier nichts verlangt (wie bisher)');
 assert.throws(()=>personalizationAttributesMatch({...value,designReference:'x'},()=>[]),{code:'cart_personalization'});
});

function signedOrder(properties){
 const f=fixture(),db=new DatabaseSync(':memory:');
 const intake=createOrderIntake({database:db,snapshot:()=>structuredClone(f.manifest)});
 const binding=intake.bind({record:f.record,shopDomain,variantId:'301',options:{mounting:'none'},personalizationPricing:f.pricing});
 const offer=intake.offer({bindingId:binding.id,snapshotId:f.manifest.id,quantity:2});
 const webhook={shopDomain,apiVersion:'2026-07',secret:'synthetic-private-reference-secret'};
 const payload={id:101,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:201,variant_id:301,quantity:2,price:'35.98',properties:properties(offer).map(a=>({name:a.key,value:a.value}))}]};
 const raw=Buffer.from(JSON.stringify(payload));
 try{return {intake,offer,result:intake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',webhook.secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':webhook.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':'private-reference'},webhook),lines:intake.list().length};}
 finally{db.close();}
}
test('Bestelleingang: nimmt neue Zeilen (privat), ältere (sichtbar) und beide gleich an; lehnt jede Abweichung wie bisher ab',()=>{
 const hidden=offer=>cartLineInput(offer,{privateDesignReference:true}).attributes,visible=offer=>cartLineInput(offer).attributes;
 for(const [name,properties] of [['privat',hidden],['sichtbar',visible],['beide gleich',offer=>[...hidden(offer),{key:'Bearbeitbarer Entwurf',value:offer.personalization.designReference}]]]){
  const {result,lines,intake}=signedOrder(properties);
  assert.deepEqual(result.errors,[],name);assert.equal(result.lines.length,1,name);assert.equal(result.lines[0].totalCents,7196,name);assert.equal(lines,1,name);
  assert.equal(intake.acceptsPrivateDesignReference,true);
 }
 const other='gravuru:proof_other:'+'d'.repeat(64),drop=key=>list=>list.filter(a=>a.key!==key);
 for(const [name,properties] of [
   ['kein Nachweis',offer=>drop('_gravuru_entwurf')(hidden(offer))],['kein Nachweis (alt)',offer=>drop('Bearbeitbarer Entwurf')(visible(offer))],
   ['privat mit anderem Wert',offer=>[...drop('_gravuru_entwurf')(hidden(offer)),{key:'_gravuru_entwurf',value:other}]],
   ['beide verschieden',offer=>[...hidden(offer),{key:'Bearbeitbarer Entwurf',value:other}]],['beide verschieden (umgekehrt)',offer=>[...visible(offer),{key:'_gravuru_entwurf',value:other}]],
   ['privat doppelt',offer=>[...hidden(offer),{key:'_gravuru_entwurf',value:offer.personalization.designReference}]],
   ['privat, aber Logoangabe entfernt',offer=>drop('_gravuru_logos')(hidden(offer))]]){
  const {result,lines}=signedOrder(properties);
  assert.equal(result.errors.length,1,name);assert.match(result.errors[0].intakeError,/gesicherte Entwurfs- oder Aufpreiszuordnung verändert/,name);assert.equal(result.lines.length,0,name);assert.equal(lines,0,name);
 }
});

test('Warenkorb: der private Schlüssel nur mit Schalter UND passendem Bestelleingang; der Speicher-API-Weg bleibt beim sichtbaren',()=>{
 const current={orderIntake:{acceptsPrivateDesignReference:true}},older={orderIntake:{receive(){}}};
 assert.equal(writesPrivateDesignReference(current,true),true);
 // Die ältere Händler-Laufzeit prüft Bestellungen mit ihrem eigenen Code und kennt nur den sichtbaren Schlüssel.
 assert.equal(writesPrivateDesignReference(older,true),false);
 for(const enabled of [false,undefined,'enabled',1])assert.equal(writesPrivateDesignReference(current,enabled),false,String(enabled));
 for(const workshop of [undefined,null,{},{orderIntake:{acceptsPrivateDesignReference:'yes'}}])assert.equal(writesPrivateDesignReference(workshop,true),false);
 const {offer}=signedOrder(o=>cartLineInput(o).attributes);
 const keys=input=>input.attributes.map(a=>a.key);
 assert.ok(keys(cartLineInput(offer,{privateDesignReference:true})).includes('_gravuru_entwurf'));assert.ok(!keys(cartLineInput(offer,{privateDesignReference:true})).includes('Bearbeitbarer Entwurf'));
 assert.ok(keys(cartLineInput(offer)).includes('Bearbeitbarer Entwurf'));assert.ok(!keys(cartLineInput(offer)).includes('_gravuru_entwurf'));
 const line=prepareCartRequest(offer).variables.input.lines[0];
 assert.ok(keys(line).includes('Bearbeitbarer Entwurf'));assert.ok(!keys(line).includes('_gravuru_entwurf'));
 const response={data:{cartCreate:{userErrors:[],warnings:[],cart:{id:'gid://shopify/Cart/synthetic',checkoutUrl:`https://${shopDomain}/checkout/synthetic`,lines:{pageInfo:{hasNextPage:false},nodes:[{quantity:2,attributes:line.attributes,merchandise:{id:line.merchandiseId},cost:{amountPerQuantity:{amount:'35.98',currencyCode:'EUR'},totalAmount:{amount:'71.96',currencyCode:'EUR'}}}]}}}}};
 assert.equal(verifyCartResponse(response,offer,shopDomain).totalCents,7196);
});

test('Schalter: nur GRAVURU_PRIVATE_DESIGN_REFERENCE=enabled schaltet ein, nur mit Kundeneinstieg, Standard aus',()=>{
 const base={GRAVURU_CUSTOMER_INTEGRATION:'merchant-test-only'};
 assert.deepEqual(customerIntegrationFromEnv(base).shopEntry,{proxyPath:'/apps/konfigurator'});
 assert.deepEqual(customerIntegrationFromEnv({...base,GRAVURU_PRIVATE_DESIGN_REFERENCE:''}).shopEntry,{proxyPath:'/apps/konfigurator'});
 assert.deepEqual(customerIntegrationFromEnv({...base,GRAVURU_PRIVATE_DESIGN_REFERENCE:'enabled'}).shopEntry,{proxyPath:'/apps/konfigurator',privateDesignReference:true});
 for(const value of ['true','1','on','yes','Enabled','enabled ','disabled'])for(const env of [base,{}])assert.throws(()=>customerIntegrationFromEnv({...env,GRAVURU_PRIVATE_DESIGN_REFERENCE:value}),{code:'private_design_reference_env'},value);
 assert.throws(()=>customerIntegrationFromEnv({GRAVURU_PRIVATE_DESIGN_REFERENCE:'enabled'}),{code:'private_design_reference_env'},'ohne Kundeneinstieg');
 assert.equal(customerIntegrationFromEnv({}),null);
 // Die Anbindung und der Einstieg selbst nehmen nur ein ausdrückliches true an.
 const stub={orderIntake:{idBindings:()=>({resolve(){throw Error('nicht im Test');}})},repository:{},customerDrafts:{}};
 const attempt=value=>createConfiguratorIntegration({settings:{mode:'merchant-test-only',legacyStoreId:'legacy',acrylStoreId:'acryl',shopEntry:{proxyPath:'/apps/konfigurator',privateDesignReference:value}},legacy:{...stub,repository:{a:1},customerDrafts:{a:1}},acryl:{...stub,repository:{b:1},customerDrafts:{b:1}},origin:'https://app.example',shopifySessions:{shopDomain:'x.myshopify.com',secret:'s'.repeat(32),clientId:'c'}});
 for(const bad of [false,'enabled',1,{},null])assert.throws(()=>attempt(bad),/Kundeneinstieg ist nicht eindeutig eingerichtet/,String(bad));
 const entry=value=>()=>createShopEntry({origin:'https://app.example',shopDomain:'x.myshopify.com',secret:'s'.repeat(32),stores:[{}],proxyPath:'/apps/konfigurator',privateDesignReference:value});
 for(const bad of ['enabled',1,null,{}])assert.throws(entry(bad),{code:'shop_entry_config'},String(bad));
 // Eine gültige Einstellung wird nicht beanstandet: erst der (hier leere) Datenbereich fällt auf.
 for(const good of [true,false,undefined])assert.throws(entry(good),{code:'shop_entry_stores'},String(good));
});

test('Server und Funktionen passen zusammen: was der Server privat schreibt, bepreist die Folgefassung wie die sichtbare Angabe',()=>{
 const f=fixture(),value=personalization(),query=fs.readFileSync(new URL('../../ops/shopify/entwurf-privat-release/preis/src/cart_transform_run.graphql',import.meta.url),'utf8');
 // Eingabe genau nach den Schlüsseln der Abfrage bilden; ein Schlüssel, den die Zeile nicht trägt, ist bei Shopify `null`.
 const aliases=[...query.matchAll(/(\w+): attribute\(key: "([^"]+)"\)/g)].map(m=>[m[1],m[2]]);
 const input=attributes=>{const map=new Map(attributes.map(a=>[a.key,a.value]));return {presentmentCurrencyRate:'1',cart:{lines:[{id:'synthetic',quantity:2,...Object.fromEntries(aliases.map(([alias,key])=>[alias,map.has(key)?{value:map.get(key)}:null])),merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/301',product:{id:f.pricing.productId,pricing:{jsonValue:f.pricing}}}}]}};};
 const visible=input(personalizationAttributes(value)),hidden=input(personalizationAttributes(value,{privateDesignReference:true}));
 assert.equal(hidden.cart.lines[0].designFile,null);assert.deepEqual(hidden.cart.lines[0].designPrivate,{value:reference});assert.equal(visible.cart.lines[0].designPrivate,null);
 assert.deepEqual(cartTransformRun(structuredClone(hidden)),cartTransformRun(structuredClone(visible)));
 assert.equal(cartTransformRun(structuredClone(hidden)).operations[0].lineUpdate.price.adjustment.fixedPricePerUnit.amount,'35.98');
 assert.deepEqual(rejectedPricingLines(structuredClone(hidden)),[]);
 assert.deepEqual(cartValidationsGenerateRun({buyerJourney:{step:'CHECKOUT_COMPLETION'},cart:hidden.cart}).operations,[]);
 // Ohne Nachweis bleibt die Zeile ohne Preis und an der Kasse gesperrt.
 const none=input(personalizationAttributes(value).slice(0,-1));
 assert.equal(rejectedPricingLines(structuredClone(none)).length,1);
 assert.equal(cartValidationsGenerateRun({buyerJourney:{step:'CHECKOUT_COMPLETION'},cart:none.cart}).operations[0].validationAdd.errors.length,1);
});
